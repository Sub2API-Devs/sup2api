"""IT-MEM: controller memory during paired activations (2026-11-01 OOM).

The production Go controller (ccgateway-controller:0.1.119, mem_limit 1g)
was OOM-killed by one Worker+CLI activation of every runtime. These
scenarios replay it on the isolated instance: IT-MEM00 creates a3 (IT-M05
without its activation), IT-MEM01 activates a1, a2 and a3 at the same time
(image $GT_PAIR_IMAGE, CLI 2.1.312, about 306 MiB) while a sampler reads the
controller's cgroup (memory.current, memory.peak, anon/file, oom_kill) and
the process's VmRSS/VmHWM every 100 ms, across restarts; then activates them
again one after another ($GT_PAIR_IMAGE2), as the core does.
"""
import os
import threading
import time

from itlib import (A1, A2, A3, CLI_VERSION, CONTROLLER, ST, api, check, desired_for, inspect, jbody, proxy_for,
                   put_config, record, save_state, scenario, sh, sudo)

PAIR_IMAGE = os.environ.get('GT_PAIR_IMAGE', 'ccgateway-app:0.1.119')
OTHER_IMAGE = os.environ.get('GT_PAIR_IMAGE2', 'ccgateway-app:0.1.117')


@scenario('IT-MEM00')
def mem00():
    s, b, dt = put_config(A3, desired_for(A3, 'a3-go', proxy=proxy_for('ccg-gt-fixture-p2')))
    check(s == 200 and b.get('status') == 'ready', 'Go creates a3 via P2', status=s, seconds=round(dt, 1),
          answer=b if s != 200 else None)


def _cat(path):
    try:
        return sudo('cat', path, check=False).strip()
    except Exception:  # noqa: BLE001 - the process may be gone between reads
        return ''


class Sampler(threading.Thread):
    def __init__(self):
        super().__init__(daemon=True)
        self.stop = threading.Event()
        self.max = {'current': 0, 'peak': 0, 'anon': 0, 'file': 0, 'rss': 0, 'hwm': 0}
        self.oom_kills = 0
        self.pids = set()
        self.samples = 0

    def run(self):
        while not self.stop.is_set():
            pid = inspect(CONTROLLER, '{{.State.Pid}}') or '0'
            if pid != '0':
                self.pids.add(pid)
                cg = _cat('/proc/%s/cgroup' % pid).split('::')[-1]
                if cg:
                    base = '/sys/fs/cgroup' + cg
                    vals = {'current': _cat(base + '/memory.current'), 'peak': _cat(base + '/memory.peak')}
                    for line in _cat(base + '/memory.stat').splitlines():
                        k, _, v = line.partition(' ')
                        if k in ('anon', 'file'):
                            vals[k] = v
                    for line in _cat(base + '/memory.events').splitlines():
                        if line.startswith('oom_kill '):
                            self.oom_kills = max(self.oom_kills, int(line.split()[1]))
                    for line in _cat('/proc/%s/status' % pid).splitlines():
                        if line.startswith('VmRSS:'):
                            vals['rss'] = int(line.split()[1]) * 1024
                        elif line.startswith('VmHWM:'):
                            vals['hwm'] = int(line.split()[1]) * 1024
                    for k, v in vals.items():
                        try:
                            self.max[k] = max(self.max[k], int(v))
                        except (TypeError, ValueError):
                            pass
                    self.samples += 1
            self.stop.wait(0.1)

    def mib(self):
        return {k: round(v / 2**20, 1) for k, v in self.max.items()}


def activate(aid, image, results):
    t = time.time()
    try:
        s, _, b = api('POST', '/accounts/%s/worker' % aid,
                      {'image': image, 'components': ['worker', 'cli'], 'cli_version': CLI_VERSION}, timeout=900)
        results[aid] = {'http': s, 'answer': jbody(b), 'seconds': round(time.time() - t, 1)}
    except Exception as e:  # noqa: BLE001 - a killed controller drops the connection
        results[aid] = {'error': repr(e)[:200], 'seconds': round(time.time() - t, 1)}


def phase(label, image, concurrent):
    """Activate a1, a2, a3 (at once or one after another, as the core does)."""
    keys = [A1, A2, A3]
    ctl_image = inspect(CONTROLLER, '{{.Config.Image}}')
    restarts0 = int(inspect(CONTROLLER, '{{.RestartCount}}') or 0)
    limit = inspect(CONTROLLER, '{{.HostConfig.Memory}}')
    since = time.strftime('%Y-%m-%d %H:%M:%S')
    sampler = Sampler()
    sampler.start()
    time.sleep(1)
    results = {}
    if concurrent:
        threads = [threading.Thread(target=activate, args=(k, image, results)) for k in keys]
        [t.start() for t in threads]
        [t.join(1000) for t in threads]
    else:
        for k in keys:
            activate(k, image, results)
    time.sleep(3)
    sampler.stop.set()
    sampler.join(10)
    restarts = int(inspect(CONTROLLER, '{{.RestartCount}}') or 0) - restarts0
    kernel = sudo('journalctl', '-k', '--since', since, '--no-pager', check=False)
    oom_lines = [l for l in kernel.splitlines() if 'ccg-controller' in l and ('out of memory' in l.lower() or 'Killed process' in l)]
    _, logs = sh(['docker', 'logs', '--since', '10m', '--tail', '40', CONTROLLER], check=False)
    ST.setdefault('mem', {}).setdefault(ctl_image, {})[label] = {
        'peak_mib': sampler.mib(), 'oom_kills': sampler.oom_kills, 'restarts': restarts, 'results': results,
        'kernel': oom_lines[-4:]}
    save_state(ST)
    record('paired activation of a1, a2, a3 (%s)' % label, True, controller_image=ctl_image, mem_limit=limit,
           pair_image=image, samples=sampler.samples, pids=sorted(sampler.pids), max_mib=sampler.mib(),
           oom_kill_events=sampler.oom_kills, restarts=restarts, kernel_oom=oom_lines[-4:], results=results,
           controller_log=[l[:300] for l in logs.splitlines()][-15:])
    return results, restarts, oom_lines


@scenario('IT-MEM01')
def mem01():
    """Concurrent: a1, a2 and a3 at once; then sequential, as the core does,
    to the other image (a pair activation always stages and switches)."""
    failures = []
    for label, image, concurrent in (('concurrent', PAIR_IMAGE, True), ('sequential', OTHER_IMAGE, False)):
        results, restarts, oom_lines = phase(label, image, concurrent)
        ok = all(r.get('http') == 200 and r['answer'].get('status') == 'updated' for r in results.values())
        record('%s: all three updated, no OOM kill, no restart' % label, ok and restarts == 0 and not oom_lines,
               results={k: (v.get('http'), v.get('answer', {}).get('status') or v.get('answer', {}).get('error'),
                            v.get('error')) for k, v in results.items()})
        if not (ok and restarts == 0 and not oom_lines):
            failures.append(label)
        if restarts:
            time.sleep(20)  # the restarted controller recovers the runtimes first
    check(not failures, 'every phase updated all three without an OOM kill', failed=failures)
