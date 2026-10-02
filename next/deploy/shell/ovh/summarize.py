#!/usr/bin/env python3
"""Turns an upgrade log into per-node timelines."""
import json, sys
rows = [json.loads(l) for l in open(sys.argv[1])]
nodes = ["sup2api-1", "sup2api-2", "sup2api-3", "sup2api-4"]
print("== notes"); [print(f"{r['t']:7.2f}s {r['msg']}") for r in rows if r["kind"] == "note"]
print("== entrance status segments (start-end s: code xN)")
for n in nodes:
    segs = []
    for r in (r for r in rows if r["kind"] == "http" and r["node"] == n):
        if segs and segs[-1][2] == r["code"]:
            segs[-1][1] = r["t"]; segs[-1][3] += 1
        else:
            segs.append([r["t"], r["t"], r["code"], 1])
    print(n + ": " + "  ".join(f"{a:.1f}-{b:.1f}:{c}x{k}" for a, b, c, k in segs))
print("== core/plugin processes inside each container")
for r in rows:
    if r["kind"] == "proc":
        print(f"{r['t']:7.2f}s {r['node']}: container={r['container']} core={r['core_pids'] or '-'} plugins={r['plugins']}")
print("== cluster state changes (node|mode|ready|stopped|release|shell boot|core boot ; plan status|cursor|step)")
for r in rows:
    if r["kind"] == "cluster":
        print(f"{r['t']:7.2f}s plan={r['plan']}")
        for n in r["nodes"]:
            print("          " + n)
for r in rows:
    if r["kind"] == "events":
        print("== plan events"); [print("  " + e) for e in r["rows"]]
