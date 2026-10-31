"""Worldforge command boundary. Only the canonical project is writable."""

import argparse
import json
import sys
from pathlib import Path
from .project import (
    PROJECT,
    WORLD,
    WORK,
    REPO,
    SPEC,
    atomic_write,
    canonical,
    fields,
    new_project,
    official,
    read,
    sha,
    WorldError,
    project_lock,
)
from .passes import apply_pass
from .checks import check
from .review import render, packet, draw_level, PreviewArt, dependencies, require_viewed


def layout_approval(project, level):
    """Operator guidance only: existing director records, exact source digest.

    Never writes approvals or authorizes artwork, runtime activation or new geometry.
    """
    for path in sorted(
        (REPO / "docs/team/comms/director/approvals").glob("world-*.md")
    ):
        text = path.read_text(encoding="utf-8")
        if not text.startswith("---\n"):
            continue
        header = text.split("---", 2)[1]
        metadata = dict(
            line.split(":", 1) for line in header.splitlines() if ":" in line
        )
        metadata = {key.strip(): val.strip() for key, val in metadata.items()}
        scope = [s.strip() for s in metadata.get("scope", "").strip("[]").split(",")]
        if (
            metadata.get("asset") == f"world:{level}"
            and metadata.get("decision") == "director-approved"
            and metadata.get("packetDigest") == sha(project)
            and "layout" in scope
        ):
            return path.relative_to(REPO).as_posix()
    return None


def main(argv):
    parser = argparse.ArgumentParser(
        description="Worldforge: validated LDtk authoring and candidate review"
    )
    subs = parser.add_subparsers(dest="command", required=True)
    subs.add_parser("doctor")
    n = subs.add_parser("new")
    n.add_argument("region")
    n = subs.add_parser(
        "example", help="write the inspectable village bring-up pass; does not apply it"
    )
    n.add_argument("region")
    a = subs.add_parser("apply")
    a.add_argument("file")
    for name in ("next", "render", "check", "packet"):
        p = subs.add_parser(name)
        p.add_argument("--region", required=True)
        p.add_argument("--level")
        if name == "check":
            p.add_argument("--project", help="Read-only alternate project; receipts remain isolated")
        if name == "packet":
            p.add_argument("--revision", type=int, default=1)
    args = parser.parse_args(argv)
    try:
        import worldforge

        if args.command == "doctor":
            official()
            problems = worldforge.check_plan(read(WORLD / "regions/aqualia.plan.json"))
            print(
                json.dumps(
                    {
                        "dependencies": "ok",
                        "ldtkSchema": "1.5.3",
                        "planProblems": problems,
                        "commands": ["new", "apply", "render", "check", "packet"],
                        "runtimeImporter": "C7 candidate compiler/loader; new-game activation pending",
                    }
                )
            )
            return 1 if problems else 0
        edit = read(args.file) if args.command == "apply" else None
        region = edit["region"] if edit else args.region
        if region != "aqualia":
            raise WorldError("Only protected Aqualia plan is currently authored")
        plan = read(WORLD / f"regions/{region}.plan.json")
        problems = worldforge.check_plan(plan)
        if problems:
            raise WorldError("Plan invalid: " + "; ".join(problems))
        if args.command == "new":
            project = new_project(plan)
            with project_lock(PROJECT):
                atomic_write(PROJECT, project, create=True)
            atomic_write(
                WORK / "authoring-receipt.json",
                {"projectSha256": sha(PROJECT.read_bytes()), "command": "new"},
            )
            work = WORK / region / "aqualia_village"
            work.mkdir(parents=True, exist_ok=True)
            art = PreviewArt()
            image = draw_level(project["levels"][0], art)
            before = image.resize((image.width // 4, image.height // 4))
            before.save(work / "before-overview.png")
            image.close()
            before.close()
            art.close()
            print(
                f"Created draft {PROJECT}; both levels need authoring. digest={sha(project)}"
            )
            return 0
        if args.command == "next" and not PROJECT.exists():
            print("NEXT: new " + region)
            return 0
        alternate = getattr(args, "project", None)
        project = read(Path(alternate)) if alternate else read(PROJECT)
        if args.command == "example":
            from .golden import example

            print(example(project, plan))
            return 0
        level = edit["level"] if edit else args.level
        if args.command in ("render", "packet") and not level:
            raise WorldError(
                "Select a level explicitly; draft levels cannot be silently included"
            )
        work = WORK / region / (level or "region")
        if alternate:
            work = WORK / "validation" / sha(project) / (level or "region")
        work.mkdir(parents=True, exist_ok=True)
        if args.command == "apply":
            source = __import__("pathlib").Path(args.file).resolve()
            if not source.is_relative_to((WORLD / "passes" / region).resolve()):
                raise WorldError("Commit authoring passes under world/passes/<region>")
            with project_lock(PROJECT):
                result = apply_pass(read(PROJECT), edit)
                atomic_write(PROJECT, result)
            atomic_write(
                WORK / "authoring-receipt.json",
                {
                    "projectSha256": sha(PROJECT.read_bytes()),
                    "command": "apply",
                    "passDigest": sha(edit),
                },
            )
            print(f"Applied {edit['id']}; digest={sha(result)}")
        elif args.command == "render":
            manifest = render(project, plan, level, work)
            print(
                f"Rendered {len(manifest['images'])} images in {work}; inspect all before packet"
            )
        elif args.command == "check":
            report = check(project, plan, level)
            atomic_write(work / "qa_report.json", report)
            print(
                json.dumps(
                    {
                        "status": report["status"],
                        "scope": level or "region",
                        "findings": report["findings"],
                    }
                )
            )
            return 0 if report["status"] == "candidate" else 1
        elif args.command == "packet":
            if args.revision < 1:
                raise WorldError("Revision must be positive")
            output = REPO / f"art/review/world-{region}-{level}-{args.revision}"
            report = read(work / "qa_report.json")
            print(packet(project, plan, level, work, output, report))
        else:
            report = check(project, plan, level)
            approval = layout_approval(project, level)
            if approval and not report["findings"]:
                unfinished = (
                    ", ".join(report.get("unfinishedLevels", []))
                    or "remaining dressing passes"
                )
                print(
                    f"NEXT: continue {unfinished}; current village layout has exact-digest approval at {approval}. No repeat layout export required; artwork and runtime activation remain separate."
                )
                return 0
            published = None
            for path in sorted(
                (REPO / "art/review").glob(f"world-{region}-{level}-*/packet.json")
            ):
                try:
                    candidate = read(path)
                    if (
                        candidate.get("status") == "candidate"
                        and candidate.get("sourceDigest") == sha(project)
                        and candidate.get("dependenciesDigest") == dependencies()
                        and all(
                            sha((path.parent / name).read_bytes()) == digest
                            for name, digest in candidate["files"].items()
                        )
                    ):
                        published = path
                        break
                except (OSError, ValueError, KeyError):
                    continue
            if published and not report["findings"]:
                print(
                    f"NEXT: director review of {published.relative_to(REPO).as_posix()}; no repeat export required"
                )
            elif report["findings"]:
                print(
                    "NEXT: apply authoring passes, then check; first issue: "
                    + report["findings"][0]["detail"]
                )
            elif (
                not (work / "qa_report.json").exists()
                or read(work / "qa_report.json").get("dependenciesDigest")
                != dependencies()
                or read(work / "qa_report.json").get("projectDigest") != sha(project)
            ):
                print("NEXT: check current project and dependencies")
            elif (
                not (work / "render.json").exists()
                or read(work / "render.json")["projectDigest"] != sha(project)
                or read(work / "render.json")["dependenciesDigest"] != dependencies()
            ):
                print(
                    "NEXT: render, inspect every image, record SHA-bound viewed receipts, then packet"
                )
            else:
                try:
                    require_viewed(work, read(work / "render.json"))
                    print("NEXT: packet; director approval is separate")
                except WorldError as e:
                    print("NEXT: " + str(e))
        return 0
    except (WorldError, KeyError, OSError, TypeError, json.JSONDecodeError) as e:
        print(f"WORLDFORGE ERROR: {e}", file=sys.stderr)
        return 2
