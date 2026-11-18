"""Prepare a hosted API release from the repository's tracked backend files."""

import argparse
from pathlib import Path
import subprocess
from shutil import copy2

ROOT = Path(__file__).resolve().parents[1]


def stage(output):
    output.mkdir(parents=True, exist_ok=True)
    files = subprocess.check_output(
        ["git", "ls-files", "-z", "backend"], cwd=ROOT
    ).decode().split("\0")
    for filename in filter(None, files):
        relative = Path(filename)
        if "tests" in relative.parts or relative.name == "Dockerfile":
            continue
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        copy2(ROOT / relative, target)
    for name in ("app.py", ".python-version", "vercel.json"):
        copy2(ROOT / "deployment/vercel-api" / name, output / name)
    copy2(ROOT / "backend/requirements-lock.txt", output / "requirements.txt")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    stage(parser.parse_args().output)
