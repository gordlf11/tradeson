#!/usr/bin/env python3
"""For every Btn field, list its valid /AP /N (appearance) keys (those are the on-state values)."""
import sys
from pypdf import PdfReader
from pypdf.generic import NameObject, IndirectObject

src = sys.argv[1]
r = PdfReader(src)

def field_states(annot_obj):
    """Return list of valid 'on-state' names for a button field annotation."""
    obj = annot_obj.get_object() if isinstance(annot_obj, IndirectObject) else annot_obj
    ap = obj.get('/AP')
    if not ap:
        return []
    n = ap.get('/N')
    if not n:
        return []
    n_obj = n.get_object() if isinstance(n, IndirectObject) else n
    return list(n_obj.keys())

all_fields = r.get_fields() or {}
for name, info in all_fields.items():
    ft = info.get('/FT', '?')
    if ft != '/Btn':
        continue
    v = info.get('/V', '')
    kids = info.get('/Kids') or []
    states_per_kid = []
    if kids:
        for k in kids:
            states_per_kid.append(field_states(k))
    else:
        states_per_kid.append(field_states(info))
    print(f"  {name!r:55s} V={v!r:8s} kids_states={states_per_kid}")
