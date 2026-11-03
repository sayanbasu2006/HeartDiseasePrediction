"""Build a reproducible, patient-data-free release for Railway's Python image."""

from pathlib import Path
import base64, hashlib, io, json, tarfile

ROOT = Path(__file__).resolve().parents[1]


def bundle():
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:xz", preset=6) as archive:
        for path in sorted((ROOT / "backend").rglob("*")):
            if (
                not path.is_file()
                or any(
                    p in {"__pycache__", "tests", ".pytest_cache"} for p in path.parts
                )
                or path.name.startswith("history.sqlite")
                or path.name == "Dockerfile"
            ):
                continue
            info = archive.gettarinfo(str(path), arcname=str(path.relative_to(ROOT)))
            info.mtime = 0
            info.uid = 0
            info.gid = 0
            info.uname = ""
            info.gname = ""
            with path.open("rb") as f:
                archive.addfile(info, f)
    packed = buffer.getvalue()
    encoded = base64.b64encode(packed).decode()
    variables = {
        f"CARDIOLENS_SOURCE_{i//24000:02d}": encoded[i : i + 24000]
        for i in range(0, len(encoded), 24000)
    }
    variables["CARDIOLENS_RELEASE_SHA256"] = hashlib.sha256(packed).hexdigest()
    return variables


if __name__ == "__main__":
    print(json.dumps(bundle()))
