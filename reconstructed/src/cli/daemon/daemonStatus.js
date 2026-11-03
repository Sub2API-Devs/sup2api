/**
 * cli/daemon/daemonStatus.ts
 *
 * 2.1.316 新增：claude daemon status：探测守护进程（ping）、列出后台会话/租约/作业
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-czxapneg.js (6)
 * attribution: placement 6
 */
import { stat, readFile } from "fs/promises";
import { readLiveServerLock } from "../../utils/daemon/daemonLock.js";
import { Fye, jL, getDaemonRuntimeDir } from "../../services/daemon/paths.js";
import { controlRequest } from "../../services/daemon/controlClient.js";
import { BG_PROTO, LeaseClientSchema } from "../../services/daemon/leaseProtocol.js";
import { readRoster, rosterKey } from "../../services/daemon/roster.js";
import { daemonServiceStatus } from "../../services/daemon/serviceInstall.js";
import { Z6, $A, Q6 } from "../../utils/sandbox/userNamespace.js";
import { getPlatform } from "../../utils/platform.js";
import { count } from "../../utils/collections.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { readDaemonConfigFromStorage, jJe } from "../../daemon/scheduledWorker.js";
import { safeParseJSON } from "../../utils/json.js";
import { plural } from "../../utils/stringUtils.js";

/**
 * 探测守护进程是否可达（ping），返回会话、租约、作业列表。
 */
//@ chunk-czxapneg.js:3920-5644 placement
async function pingDaemon(e) {
  let r = await readLiveServerLock(1, e).catch(() => null),
    t = r?.logPath ?? Fye(),
    [n, a, o, i, b, h] = await Promise.all([
      controlRequest({ op: "ping", proto: BG_PROTO }, { timeoutMs: 1000 }).catch((l) => ({
        ok: !1,
        code: "ENOCONN",
        error: String(l),
      })),
      readRoster({ silent: !0 }, e),
      statRosterMeta(e),
      statDaemonLog(t, e),
      daemonServiceStatus().catch(() => !1),
      readDaemonState(jL(), e),
    ]),
    u;
  try {
    u = Z6();
  } catch {
    u = getPlatform() === "windows" ? "\\\\.\\pipe\\cc-daemon-*" : "<unavailable>";
  }
  let g = null,
    p = null,
    k = [];
  if (n.ok) {
    let l = { ok: !1 },
      [c, m] = await Promise.all([
        controlRequest({ op: "list", proto: BG_PROTO }, { timeoutMs: 1000 }).catch(() => l),
        controlRequest({ op: "leases", proto: BG_PROTO }, { timeoutMs: 1000 }).catch(() => l),
      ]);
    if (c.ok && "jobs" in c) {
      g = count(c.jobs, (s) => !s.outcome);
      let f =
        r?.version ??
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION;
      p = count(c.jobs, (s) => !s.outcome && s.cliVersion !== void 0 && s.cliVersion !== f);
    }
    if (m.ok && "clients" in m)
      k = m.clients.flatMap((client) => LeaseClientSchema().safeParse(client).data ?? []);
  }
  return {
    supervisor: r
      ? { pid: r.pid, version: r.version, uptimeSec: Math.floor((Date.now() - r.startedAt) / 1000) }
      : null,
    sockDir: getPlatform() === "windows" ? "\\\\.\\pipe\\cc-daemon-*" : getDaemonRuntimeDir(),
    controlSock: u,
    controlReachable: n.ok,
    controlError: n.ok ? void 0 : $A(n.error),
    workersLive: g,
    workersSkewed: p,
    workersRoster: Object.keys(a.workers).length,
    rosterAgeSec: o ? Math.floor((Date.now() - o.mtimeMs) / 1000) : null,
    bgDisabled: r?.bgDisabled === !0,
    logPath: t,
    logSizeBytes: i?.size ?? null,
    serviceInstalled: b,
    configuredWorkers: h,
    leaseClients: k,
  };
}
//@ chunk-czxapneg.js:5644-5795 placement
async function statRosterMeta(e) {
  if (e) {
    let r = await e.statMeta(rosterKey()).catch(() => {
      return;
    });
    return r?.ok ? { mtimeMs: r.value.mtimeMs } : null;
  }
  return stat(Q6()).catch(() => null);
}
//@ chunk-czxapneg.js:5795-5967 placement
async function statDaemonLog(e, r) {
  if (r && e === Fye()) {
    let t = await r.statMeta(STORAGE_SPACES.state("daemon-log")).catch(() => {
      return;
    });
    return t?.ok ? { size: t.value.size } : null;
  }
  return stat(e).catch(() => null);
}
//@ chunk-czxapneg.js:5967-6329 placement
async function readDaemonState(e, r) {
  let t;
  if (r && e === jL()) {
    let o = await readDaemonConfigFromStorage(r);
    if (o.kind !== "text") return 0;
    t = o.text;
  } else
    try {
      let o = await stat(e);
      if (!o.isFile() || o.size > jJe) return 0;
      t = await readFile(e, "utf8");
    } catch {
      return 0;
    }
  let n = safeParseJSON(t, !1);
  if (n === null || typeof n !== "object") return 0;
  let a = 0;
  for (let [o, i] of Object.entries(n)) {
    if (o === "$schema") continue;
    a += Array.isArray(i) ? i.length : 1;
  }
  return a;
}
//@ chunk-czxapneg.js:6329-7626 placement
function formatDaemonStatus(e) {
  let r = ["", "bg sessions:"];
  if (
    (r.push(`  sock dir:     ${e.sockDir}`),
    r.push(
      `  control.sock: ${e.controlReachable ? "reachable" : `unreachable (${e.controlError ?? "unknown"})`}`,
    ),
    e.bgDisabled)
  )
    r.push(
      "  bg sessions:  disabled (start failure \u2014 see daemon.log; restart the service after fixing)",
    );
  if (e.workersLive !== null) {
    if (
      (r.push(`  bg workers:   ${e.workersLive} running (control.sock), ${e.workersRoster} in roster.json`),
      e.workersSkewed && e.workersSkewed > 0)
    )
      r.push(
        `                ${e.workersSkewed} from a different CLI version (most stay attachable and upgrade automatically once idle \u2014 exec runs never respawn)`,
      );
  } else
    r.push(
      `  bg workers:   ${e.workersRoster} in roster.json (${e.controlReachable ? "live count unavailable" : "control unreachable"})`,
    );
  if (
    (r.push(`  roster.json:  ${e.rosterAgeSec === null ? "absent" : `updated ${e.rosterAgeSec}s ago`}`),
    r.push(
      `  daemon.log:   ${e.logSizeBytes === null ? "absent" : `${formatByteSize(e.logSizeBytes)} at ${e.logPath}`}`,
    ),
    !e.supervisor && !e.controlReachable && e.workersRoster > 0)
  )
    r.push(
      `  warning:      supervisor not running but ${e.workersRoster} ${plural(e.workersRoster, "worker")} in roster \u2014 running \`claude agents\` restarts the daemon and re-adopts still-running sessions; run \`claude daemon stop --any\` to reap them instead`,
    );
  return r.join(`
`);
}
//@ chunk-czxapneg.js:7626-7748 placement
function formatByteSize(e) {
  if (e < 1024) return `${e}B`;
  if (e < 1048576) return `${(e / 1024).toFixed(1)}KB`;
  return `${(e / 1024 / 1024).toFixed(1)}MB`;
}
