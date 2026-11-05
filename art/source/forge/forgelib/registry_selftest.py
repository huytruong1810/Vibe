"""Model registry commercial-status and provenance selftests (C35 / Proposal 006).

uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p registry_selftest.py
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import forge  # noqa: E402
from forgelib import core  # noqa: E402


class RegistryCommercialStatusTest(unittest.TestCase):
    def test_load_model_registry_enriches_all_models_with_commercial_fields(self):
        reg = core.load_model_registry()
        self.assertGreaterEqual(len(reg.get("models", [])), 6)
        for m in reg["models"]:
            mid = m["id"]
            self.assertIn(m.get("commercialStatus"), core.COMMERCIAL_STATUSES, f"{mid} missing valid commercialStatus")
            self.assertIsInstance(m.get("territoryRestrictions"), str, f"{mid} missing territoryRestrictions")
            self.assertTrue(m.get("territoryRestrictions"), f"{mid} empty territoryRestrictions")
            self.assertIsInstance(m.get("licenseName"), str, f"{mid} missing licenseName")
            self.assertTrue(m.get("licenseName"), f"{mid} empty licenseName")
            self.assertTrue(str(m.get("licenseUrl", "")).startswith("https://"), f"{mid} missing https licenseUrl")

    def test_hunyuan3d_and_flux_klein_commercial_classifications(self):
        reg = core.load_model_registry()
        by_id = {m["id"]: m for m in reg["models"]}
        self.assertEqual(by_id["hunyuan-2mv"]["commercialStatus"], "commercial-licensed")
        self.assertIn("EU/UK/South Korea", by_id["hunyuan-2mv"]["territoryRestrictions"])
        self.assertEqual(by_id["flux2-klein-4b"]["commercialStatus"], "apache-2.0")
        self.assertEqual(by_id["flux2-klein-4b"]["territoryRestrictions"], "none")
        self.assertEqual(by_id["klein9b"]["commercialStatus"], "dev-only-noncommercial")

    def test_registry_checks_print_commercial_status_and_territory_restrictions(self):
        checks = forge.registry_checks()
        model_lines = [(name, ok, fix) for name, ok, fix in checks if "commercialStatus=" in name]
        self.assertGreaterEqual(len(model_lines), 4)
        for name, ok, fix in model_lines:
            self.assertTrue(ok, fix)
            self.assertIn("commercialStatus=", name)
            self.assertIn("territoryRestrictions=", name)
            self.assertIn("licenseName=", name)
            self.assertIn("licenseUrl=https://", name)


if __name__ == "__main__":
    unittest.main()
