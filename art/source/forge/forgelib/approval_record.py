"""Write and check director approval records so a packet digest is never retyped (PRD-9).

`write` fills `packetDigest` from the packet's review.json `sourceDigest`; `check` lists every record
whose digest no longer matches its packet. The tool records a decision someone else made: it does not
decide, and `recordedBy` is required (TEAM-4.1, no self-approval).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

DECISIONS = ("director-approved", "changes-requested", "rejected", "superseded")


class RecordError(Exception):
    pass


def slug(asset: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", asset.lower()).strip("-")


def parse_meta(text: str) -> dict[str, str]:
    if not text.startswith("---"):
        return {}
    meta = {}
    for line in text.split("---")[1].strip().splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta


def source_digest(repo: Path, packet: str) -> str:
    base = repo / packet.strip().rstrip("/")
    review = base / "review.json"
    if not review.exists():
        review = base / "faces.json"  # face sidecar packets carry their digest here
    if not review.exists():
        raise RecordError(f"{base} has neither review.json nor faces.json; build the packet first")
    digest = json.loads(review.read_text()).get("sourceDigest")
    if not digest:
        raise RecordError(f"{review.name} has no sourceDigest")
    return digest


def write(repo: Path, approvals: Path, asset: str, packet: str, decision: str, scope: list[str],
          recorded_by: str, note: str, date: str, suffix: str = "") -> Path:
    if decision not in DECISIONS:
        raise RecordError(f"decision must be one of {', '.join(DECISIONS)}")
    if not recorded_by.strip():
        raise RecordError("--recorded-by is required, e.g. \"claude under directive 016\"")
    if not scope:
        raise RecordError("--scope is required, e.g. body,clips")
    digest = source_digest(repo, packet)
    packet = packet.strip().rstrip("/") + "/"
    out = approvals / f"{slug(asset)}--{Path(packet.rstrip('/')).name}{suffix}.md"
    if out.exists():
        raise RecordError(f"{out.name} exists; pass --suffix (e.g. -faces) or edit it by hand")
    out.write_text(
        f"---\nasset: {asset}\npacket: {packet}\npacketDigest: {digest}\ndecision: {decision}\n"
        f"scope: [{', '.join(scope)}]\ndate: {date}\nrecordedBy: {recorded_by}\n---\n\n{note.strip()}\n")
    return out


def check(repo: Path, approvals: Path) -> tuple[list[str], list[str]]:
    """(mismatches, unverifiable) among director-approved records; other decisions and records with `superseded-by` are not bound.
    Unverifiable = the packet has no review.json here (face packets not yet built, world or doc records)."""
    problems, unverifiable = [], []
    for rec in sorted(approvals.glob("*--*.md")):
        meta = parse_meta(rec.read_text())
        if meta.get("decision") != "director-approved" or not meta.get("packet") or meta.get("superseded-by"):
            continue
        try:
            current = source_digest(repo, meta["packet"])
        except RecordError:
            unverifiable.append(rec.name)
            continue
        if current != meta.get("packetDigest"):
            problems.append(f"{rec.name}: packetDigest {meta.get('packetDigest', '')[:12]}... but review.json has {current[:12]}...")
    return problems, unverifiable
