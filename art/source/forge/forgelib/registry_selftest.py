"""Model registry commercial-status and provenance selftests (C35 / Proposal 006).

uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p registry_selftest.py
"""
from __future__ import annotations

import sys
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import forge  # noqa: E402
from forgelib import core  # noqa: E402


class RegistryCommercialStatusTest(unittest.TestCase):
    def test_doctor_rejects_string_restrictions_and_unverified_reference_aliases(self):
        reg = core.load_model_registry()
        reg["models"][0]["territoryRestrictions"] = "none"
        with patch.object(core, "load_model_registry", return_value=reg):
            lines = [row for row in forge.registry_checks() if "commercialStatus=" in row[0]]
        self.assertFalse(lines[0][1])
        aliases = [ok for name, ok, _ in lines if "gemma4-abliterated:" in name]
        self.assertEqual(aliases, [False, False])

    def test_load_model_registry_enriches_all_models_with_commercial_fields(self):
        reg = core.load_model_registry()
        self.assertGreaterEqual(len(reg.get("models", [])), 6)
        for m in reg["models"]:
            mid = m["id"]
            self.assertIn(m.get("commercialStatus"), core.COMMERCIAL_STATUSES, f"{mid} missing valid commercialStatus")
            self.assertIsInstance(m.get("territoryRestrictions"), list, f"{mid} missing territoryRestrictions array")
            self.assertTrue(all(isinstance(t, str) and t for t in m["territoryRestrictions"]))
            self.assertIsInstance(m.get("licenseName"), str, f"{mid} missing licenseName")
            self.assertTrue(m.get("licenseName"), f"{mid} empty licenseName")
            self.assertTrue(str(m.get("licenseUrl", "")).startswith("https://"), f"{mid} missing https licenseUrl")

    def test_hunyuan3d_and_flux_klein_commercial_classifications(self):
        reg = core.load_model_registry()
        by_id = {m["id"]: m for m in reg["models"]}
        self.assertEqual(by_id["hunyuan-2mv"]["commercialStatus"], "commercial-licensed")
        self.assertEqual(by_id["hunyuan-2mv"]["territoryRestrictions"], ["European Union", "United Kingdom", "South Korea"])
        self.assertEqual(by_id["flux2-klein-4b"]["commercialStatus"], "apache-2.0")
        self.assertEqual(by_id["flux2-klein-4b"]["territoryRestrictions"], [])
        self.assertEqual(by_id["klein9b"]["commercialStatus"], "dev-only-noncommercial")
        # A verified base licence does not establish the terms of a third-party GGUF derivative.
        for alias in ("gemma4-abliterated:e4b", "gemma4-abliterated:26b"):
            self.assertEqual(by_id[alias]["commercialStatus"], "unverified")
            self.assertEqual(by_id[alias]["licenseUrl"], "https://ai.google.dev/gemma/apache_2")

    def test_registry_checks_print_commercial_status_and_territory_restrictions(self):
        checks = forge.registry_checks()
        model_lines = [(name, ok, fix) for name, ok, fix in checks if "commercialStatus=" in name]
        self.assertEqual(len(model_lines), len(core.load_model_registry()["models"]))
        for name, ok, fix in model_lines:
            self.assertEqual(ok, "commercialStatus=unverified" not in name, fix)
            self.assertIn("commercialStatus=", name)
            self.assertIn("territoryRestrictions=", name)
            self.assertIn("licenseName=", name)
            self.assertIn("licenseUrl=https://", name)


if __name__ == "__main__":
    unittest.main()
