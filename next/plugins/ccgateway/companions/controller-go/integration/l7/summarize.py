#!/usr/bin/env python3
"""Summarise $GT_WORK/results.jsonl: one line per scenario (last run of it),
the failed checks, and the performance numbers kept in it-state.json."""
import json
import os
import sys

WORK = os.environ.get('GT_WORK', os.path.expanduser('~/ccg-gt-l7'))
path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(WORK, 'results.jsonl')
rows = [json.loads(l) for l in open(path) if l.strip()]
last_start = {}
for i, r in enumerate(rows):
    if r['check'] == 'scenario':
        last_start[r['scenario']] = i
by = {}
for i, r in enumerate(rows):
    by.setdefault(r['scenario'], []).append((i, r))
order = sorted(last_start, key=lambda s: (s.split('-')[1][0], s))
counts = {}
for sid in order:
    end = last_start[sid]
    # the checks of this scenario's last run: after its previous 'scenario' line
    runs = [i for i, r in by[sid] if r['check'] == 'scenario']
    lo = runs[-2] if len(runs) > 1 else -1
    checks = [r for i, r in by[sid] if lo < i < runs[-1] and r['check'] != 'scenario']
    res = rows[end]['result']
    cat = sid.split('-')[1][0]
    counts.setdefault(cat, {}).setdefault(res, 0)
    counts[cat][res] += 1
    fails = [c['check'] for c in checks if c['result'] == 'fail']
    print('%-14s %-4s %3d checks %5.1fs %s' % (sid, res, len(checks), rows[end].get('seconds', 0),
                                              ('FAILED: ' + '; '.join(fails)) if fails else rows[end].get('reason', '')))
print(json.dumps(counts, sort_keys=True))
try:
    st = json.load(open(os.path.join(WORK, 'it-state.json')))
    print(json.dumps(st.get('perf', {}), indent=1, sort_keys=True))
except FileNotFoundError:
    pass
