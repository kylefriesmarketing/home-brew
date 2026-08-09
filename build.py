#!/usr/bin/env python3
import os, re, sys, glob
root = os.path.dirname(os.path.abspath(__file__))
shell = open(os.path.join(root, "shell.html")).read()
three = open(os.path.join(root, "lib", "three.global.js")).read()
parts = sorted(glob.glob(os.path.join(root, "parts", "*.js")))
tags = []
for p in parts:
    src = open(p).read()
    name = os.path.basename(p)
    tags.append(f"<script>/* ===== {name} ===== */\n{src}\n</script>")
out = shell.replace("<script>/*__THREE__*/</script>", "<script>\n" + three + "\n</script>")
out = out.replace("<!--__PARTS__-->", "\n".join(tags))
dst = os.path.join(root, "my-brew.html")
open(dst, "w").write(out)
print(f"built my-brew.html  ({len(out)//1024} KB, {len(parts)} parts: {', '.join(os.path.basename(p) for p in parts)})")
