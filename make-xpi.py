from __future__ import annotations

import os
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


def _iter_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if path.is_file():
            files.append(path)
    return sorted(files)


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    root_dir = Path(__file__).resolve().parent
    src_dir = root_dir / "src"
    build_dir = root_dir / "build"
    out_xpi = build_dir / "mineru-cli-zotero.xpi"

    if argv:
        out_xpi = Path(argv[0]).expanduser().resolve()

    if not src_dir.is_dir():
        print(f"ERROR: src directory not found: {src_dir}", file=sys.stderr)
        return 1

    build_dir.mkdir(parents=True, exist_ok=True)

    tmp_out = out_xpi.with_suffix(out_xpi.suffix + ".tmp")
    if tmp_out.exists():
        tmp_out.unlink()

    files = _iter_files(src_dir)
    if not files:
        print(f"ERROR: no files under: {src_dir}", file=sys.stderr)
        return 1

    with ZipFile(tmp_out, "w", compression=ZIP_DEFLATED) as zf:
        for file_path in files:
            arcname = file_path.relative_to(src_dir).as_posix()
            zf.write(file_path, arcname)

    os.replace(tmp_out, out_xpi)

    with ZipFile(out_xpi) as zf:
        names = set(zf.namelist())
    if "manifest.json" not in names:
        print("ERROR: manifest.json not found at XPI root (your XPI would be un-installable)", file=sys.stderr)
        return 1

    print(f"Built: {out_xpi}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

