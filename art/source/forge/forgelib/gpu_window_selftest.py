"""gpu_window PAUSE protocol: owner PID, stale takeover, foreign PAUSE untouched. No GPU needed.

uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p gpu_window_selftest.py
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib import core  # noqa: E402


class GpuWindowTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        base = Path(self.tmp.name)
        self.saved = core.GPU_PAUSE, core.GPU_BUSY
        core.GPU_PAUSE, core.GPU_BUSY = base / "PAUSE", base / "GPU_BUSY"

    def tearDown(self):
        core.GPU_PAUSE, core.GPU_BUSY = self.saved
        self.tmp.cleanup()

    def test_creates_pause_with_pid_and_removes_it(self):
        with core.gpu_window():
            self.assertEqual(core._pause_owner(core.GPU_PAUSE), __import__("os").getpid())
        self.assertFalse(core.GPU_PAUSE.exists())

    def test_removed_after_exception(self):
        with self.assertRaises(RuntimeError):
            with core.gpu_window():
                raise RuntimeError("boom")
        self.assertFalse(core.GPU_PAUSE.exists())

    def test_stale_pause_with_dead_pid_is_taken_over(self):
        dead = subprocess.Popen([sys.executable, "-c", "pass"])
        dead.wait()
        core.GPU_PAUSE.write_text(f"{dead.pid}\n")
        with core.gpu_window():
            self.assertNotEqual(core._pause_owner(core.GPU_PAUSE), dead.pid)
        self.assertFalse(core.GPU_PAUSE.exists())

    def test_live_forge_owner_makes_us_wait_and_keeps_its_pause(self):
        live = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"])
        try:
            core.GPU_PAUSE.write_text(f"{live.pid}\n")
            with self.assertRaises(core.ForgeError):
                with core.gpu_window(wait_s=-1):
                    pass
            self.assertEqual(core._pause_owner(core.GPU_PAUSE), live.pid, "the other job's PAUSE must survive")
        finally:
            live.kill()
            live.wait()

    def test_foreign_pause_without_pid_is_kept(self):
        core.GPU_PAUSE.touch()
        with core.gpu_window():
            pass
        self.assertTrue(core.GPU_PAUSE.exists())

    def test_timeout_when_busy_cleans_up(self):
        core.GPU_BUSY.touch()
        with self.assertRaises(core.ForgeError):
            with core.gpu_window(wait_s=-1):
                pass
        self.assertFalse(core.GPU_PAUSE.exists())


if __name__ == "__main__":
    unittest.main()
