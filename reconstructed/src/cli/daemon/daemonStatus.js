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
import { daemonLogPath, daemonJsonPath, getDaemonRuntimeDir } from "../../services/daemon/paths.js";
import { controlRequest } from "../../services/daemon/controlClient.js";
import { BG_PROTO, LeaseClientSchema } from "../../services/daemon/leaseProtocol.js";
import { readRoster, rosterKey } from "../../services/daemon/roster.js";
import { daemonServiceStatus } from "../../services/daemon/serviceInstall.js";
import {
  daemonControlSocket,
  redactDaemonPipeKey,
  daemonRosterFile,
} from "../../utils/sandbox/userNamespace.js";
import { getPlatform } from "../../utils/platform.js";
import { count } from "../../utils/collections.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { readDaemonConfigFromStorage, MAX_DAEMON_CONFIG_BYTES } from "../../daemon/scheduledWorker.js";
import { safeParseJSON } from "../../utils/json.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-czxapneg.js:3920-5644 placement
/**
 * 探测守护进程是否可达（ping），返回会话、租约、作业列表。
 */
async function pingDaemon(e) {
  let r = await readLiveServerLock(1, e).catch(() => null);
  let t = r?.logPath ?? daemonLogPath();
  let [n, roster, o, i, b, daemonState] = await Promise.all([
    controlRequest(
      {
        op: "ping",
        proto: BG_PROTO,
      },
      {
        timeoutMs: 1000,
      },
    ).catch((error) => ({
      ok: false,
      code: "ENOCONN",
      error: String(error),
    })),
    readRoster(
      {
        silent: true,
      },
      e,
    ),
    statRosterMeta(e),
    statDaemonLog(t, e),
    daemonServiceStatus().catch(() => false),
    readDaemonState(daemonJsonPath(), e),
  ]);
  let u;
  try {
    u = daemonControlSocket();
  } catch {
    u = getPlatform() === "windows" ? "\\\\.\\pipe\\cc-daemon-*" : "<unavailable>";
  }
  let workersLive = null;
  let workersSkewed = null;
  let leaseClients = [];
  if (n.ok) {
    let l = {
      ok: false,
    };
    let [c, m] = await Promise.all([
      controlRequest(
        {
          op: "list",
          proto: BG_PROTO,
        },
        {
          timeoutMs: 1000,
        },
      ).catch(() => l),
      controlRequest(
        {
          op: "leases",
          proto: BG_PROTO,
        },
        {
          timeoutMs: 1000,
        },
      ).catch(() => l),
    ]);
    if (c.ok && "jobs" in c) {
      workersLive = count(c.jobs, (s) => !s.outcome);
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
      workersSkewed = count(c.jobs, (s) => !s.outcome && s.cliVersion !== undefined && s.cliVersion !== f);
    }
    if (m.ok && "clients" in m)
      leaseClients = m.clients.flatMap((client) => LeaseClientSchema().safeParse(client).data ?? []);
  }
  return {
    supervisor: r
      ? {
          pid: r.pid,
          version: r.version,
          uptimeSec: Math.floor((Date.now() - r.startedAt) / 1000),
        }
      : null,
    sockDir: getPlatform() === "windows" ? "\\\\.\\pipe\\cc-daemon-*" : getDaemonRuntimeDir(),
    controlSock: u,
    controlReachable: n.ok,
    controlError: n.ok ? undefined : redactDaemonPipeKey(n.error),
    workersLive,
    workersSkewed,
    workersRoster: Object.keys(roster.workers).length,
    rosterAgeSec: o ? Math.floor((Date.now() - o.mtimeMs) / 1000) : null,
    bgDisabled: r?.bgDisabled === true,
    logPath: t,
    logSizeBytes: i?.size ?? null,
    serviceInstalled: b,
    configuredWorkers: daemonState,
    leaseClients,
  };
}
//@ chunk-czxapneg.js:5644-5795 placement
async function statRosterMeta(e) {
  if (e) {
    let r = await e.statMeta(rosterKey()).catch(() => {
      return;
    });
    return r?.ok
      ? {
          mtimeMs: r.value.mtimeMs,
        }
      : null;
  }
  return stat(daemonRosterFile()).catch(() => null);
}
//@ chunk-czxapneg.js:5795-5967 placement
async function statDaemonLog(e, r) {
  if (r && e === daemonLogPath()) {
    let t = await r.statMeta(STORAGE_SPACES.state("daemon-log")).catch(() => {
      return;
    });
    return t?.ok
      ? {
          size: t.value.size,
        }
      : null;
  }
  return stat(e).catch(() => null);
}
//@ chunk-czxapneg.js:5967-6329 placement
async function readDaemonState(e, r) {
  let t;
  if (r && e === daemonJsonPath()) {
    let daemonConfigFromStorage = await readDaemonConfigFromStorage(r);
    if (daemonConfigFromStorage.kind !== "text") return 0;
    t = daemonConfigFromStorage.text;
  } else
    try {
      let o = await stat(e);
      if (!o.isFile() || o.size > MAX_DAEMON_CONFIG_BYTES) return 0;
      t = await readFile(e, "utf8");
    } catch {
      return 0;
    }
  let n = safeParseJSON(t, false);
  if (n === null || typeof n !== "object") return 0;
  let a = 0;
  for (let [key, value] of Object.entries(n)) {
    if (key === "$schema") continue;
    a += Array.isArray(value) ? value.length : 1;
  }
  return a;
}
//@ chunk-czxapneg.js:6329-7626 placement
function formatDaemonStatus(e) {
  let r = ["", "bg sessions:"];
  r.push(`  sock dir:     ${e.sockDir}`);
  r.push(
    `  control.sock: ${e.controlReachable ? "reachable" : `unreachable (${e.controlError ?? "unknown"})`}`,
  );
  if (e.bgDisabled)
    r.push(
      "  bg sessions:  disabled (start failure \u2014 see daemon.log; restart the service after fixing)",
    );
  if (e.workersLive !== null) {
    r.push(`  bg workers:   ${e.workersLive} running (control.sock), ${e.workersRoster} in roster.json`);
    if (e.workersSkewed && e.workersSkewed > 0)
      r.push(
        `                ${e.workersSkewed} from a different CLI version (most stay attachable and upgrade automatically once idle \u2014 exec runs never respawn)`,
      );
  } else
    r.push(
      `  bg workers:   ${e.workersRoster} in roster.json (${e.controlReachable ? "live count unavailable" : "control unreachable"})`,
    );
  r.push(`  roster.json:  ${e.rosterAgeSec === null ? "absent" : `updated ${e.rosterAgeSec}s ago`}`);
  r.push(
    `  daemon.log:   ${e.logSizeBytes === null ? "absent" : `${formatByteSize(e.logSizeBytes)} at ${e.logPath}`}`,
  );
  if (!e.supervisor && !e.controlReachable && e.workersRoster > 0)
    r.push(
      `  warning:      supervisor not running but ${e.workersRoster} ${plural(e.workersRoster, "worker")} in roster \u2014 running \`claude agents\` restarts the daemon and re-adopts still-running sessions; run \`claude daemon stop --any\` to reap them instead`,
    );
  return r.join(`
`);
}
//@ chunk-czxapneg.js:7626-7748 placement
function formatByteSize(logSizeBytes) {
  if (logSizeBytes < 1024) return `${logSizeBytes}B`;
  if (logSizeBytes < 1048576) return `${(logSizeBytes / 1024).toFixed(1)}KB`;
  return `${(logSizeBytes / 1024 / 1024).toFixed(1)}MB`;
}
