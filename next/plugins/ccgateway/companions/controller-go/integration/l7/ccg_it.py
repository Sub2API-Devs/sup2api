#!/usr/bin/env python3
"""L7 driver entry point: python3 ccg_it.py IT-M01 [IT-M02 ...] | list
(05-test-plan.md §4; the helpers and the safety rules are in itlib.py)."""
import sys
import time

import itlib
from itlib import CURRENT, Fail, SCENARIOS, record, save_state, ST
import scenarios_m  # noqa: F401  registers IT-M*
import scenarios_f  # noqa: F401  registers IT-F*
import scenarios_s  # noqa: F401  registers IT-S*
import scenarios_x  # noqa: F401  registers IT-X*
import scenarios_p  # noqa: F401  registers IT-P*


def main(argv):
    if not argv or argv[0] == 'list':
        print('\n'.join(sorted(SCENARIOS)))
        return 0
    rc = 0
    for sid in argv:
        CURRENT['id'] = sid
        t = time.time()
        try:
            SCENARIOS[sid]()
            record('scenario', True, seconds=round(time.time() - t, 1))
        except Fail as e:
            record('scenario', False, reason=str(e)[:500], seconds=round(time.time() - t, 1))
            rc = 1
        except Exception as e:  # noqa: BLE001 - every outcome is recorded
            record('scenario', False, reason='%s: %s' % (type(e).__name__, str(e)[:500]),
                   seconds=round(time.time() - t, 1))
            rc = 1
        save_state(ST)
    return rc


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
