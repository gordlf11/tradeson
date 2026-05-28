#!/usr/bin/env python3
"""List every AcroForm field in the TechGuard application PDF."""
import sys
from pypdf import PdfReader

src = sys.argv[1]
r = PdfReader(src)
fields = r.get_form_text_fields() or {}
print(f"=== Text fields ({len(fields)}) ===")
for name, val in fields.items():
    print(f"  {name!r:50s} -> {val!r}")

print()
all_fields = r.get_fields() or {}
print(f"=== All fields ({len(all_fields)}) ===")
for name, info in all_fields.items():
    ft = info.get("/FT", "?")
    val = info.get("/V", "")
    kids = info.get("/Kids", [])
    print(f"  {name!r:60s} FT={ft} V={val!r} kids={len(kids) if kids else 0}")
