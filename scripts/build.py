#!/usr/bin/env python3
"""Build the uploadable plugin ZIP from an explicit list of release files."""

from pathlib import Path
import re
from zipfile import ZIP_DEFLATED, ZipFile

project = Path(__file__).resolve().parent.parent
slug = "scrollable-list-tables"
source = project
main = source / (slug + ".php")
version = re.search(r"^ \* Version: (.+)$", main.read_text(), re.MULTILINE).group(1)
output = project / "dist" / f"{slug}-{version}.zip"
files = [slug + ".php", "readme.txt", "LICENSE", "assets/list-tables.css", "assets/list-tables.js"]

for name in files:
    if not (source / name).is_file():
        raise SystemExit(f"Missing release file: {name}")

output.parent.mkdir(exist_ok=True)
with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(source / name, f"{slug}/{name}")

print(output)
