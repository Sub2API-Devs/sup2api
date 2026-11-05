/**
 * cli/daemon/daemonStatus.ts
 *
 * 2.1.316 新增：claude daemon status：探测守护进程（ping）、列出后台会话/租约/作业
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-t6nrrfy6.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stat } from "fs/promises";
import { readLiveServerLock } from "../../utils/daemon/daemonLock.js";
import {
  daemonLogPath,
  getDaemonRuntimeDir,
  redactDaemonPipeKey,
  daemonRosterFile,
} from "../../services/daemon/paths.js";
import { controlRequest } from "../../services/daemon/controlClient.js";
import { BG_PROTO, LeaseClientSchema } from "../../services/daemon/leaseProtocol.js";
import { readRoster, rosterKey } from "../../services/daemon/roster.js";
import { countWhere } from "../../utils/collections.js";
import { getPlatform } from "../../utils/platform.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-t6nrrfy6.js:4122-5605 placement
/**
 * 探测守护进程是否可达（ping），返回会话、租约、作业列表。
 */
async function pingDaemon(storage) {
  let lock = await readLiveServerLock(1, storage).catch(() => null);
  let logPath = lock?.logPath ?? daemonLogPath();
  let [ping, roster, rosterMeta, logStat] = await Promise.all([
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
      storage,
    ),
    statRosterMeta(storage),
    statDaemonLog(logPath, storage),
  ]);
  let workersLive = null;
  let workersSkewed = null;
  let leaseClients = [];
  if (ping.ok) {
    let failed = {
      ok: false,
    };
    let [listResponse, leasesResponse] = await Promise.all([
      controlRequest(
        {
          op: "list",
          proto: BG_PROTO,
        },
        {
          timeoutMs: 1000,
        },
      ).catch(() => failed),
      controlRequest(
        {
          op: "leases",
          proto: BG_PROTO,
        },
        {
          timeoutMs: 1000,
        },
      ).catch(() => failed),
    ]);
    if (listResponse.ok && "jobs" in listResponse) {
      workersLive = countWhere(listResponse.jobs, (job) => !job.outcome);
      let runningVersion =
        lock?.version ??
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION;
      workersSkewed = countWhere(
        listResponse.jobs,
        (job) => !job.outcome && job.cliVersion !== undefined && job.cliVersion !== runningVersion,
      );
    }
    if (leasesResponse.ok && "clients" in leasesResponse)
      leaseClients = leasesResponse.clients.flatMap(
        (client) => LeaseClientSchema().safeParse(client).data ?? [],
      );
  }
  return {
    supervisor: lock
      ? {
          pid: lock.pid,
        }
      : null,
    sockDir: getPlatform() === "windows" ? "\\\\.\\pipe\\cc-daemon-*" : getDaemonRuntimeDir(),
    controlReachable: ping.ok,
    controlError: ping.ok ? undefined : redactDaemonPipeKey(ping.error),
    workersLive,
    workersSkewed,
    workersRoster: Object.keys(roster.workers).length,
    rosterAgeSec: rosterMeta ? Math.floor((Date.now() - rosterMeta.mtimeMs) / 1000) : null,
    bgDisabled: lock?.bgDisabled === true,
    logPath,
    logSizeBytes: logStat?.size ?? null,
    leaseClients,
  };
}
//@ chunk-t6nrrfy6.js:5605-5756 placement
async function statRosterMeta(storage) {
  if (storage) {
    let meta = await storage.statMeta(rosterKey()).catch(() => {
      return;
    });
    return meta?.ok
      ? {
          mtimeMs: meta.value.mtimeMs,
        }
      : null;
  }
  return stat(daemonRosterFile()).catch(() => null);
}
//@ chunk-t6nrrfy6.js:5756-5928 placement
async function statDaemonLog(logPath, storage) {
  if (storage && logPath === daemonLogPath()) {
    let meta = await storage.statMeta(STORAGE_SPACES.state("daemon-log")).catch(() => {
      return;
    });
    return meta?.ok
      ? {
          size: meta.value.size,
        }
      : null;
  }
  return stat(logPath).catch(() => null);
}
//@ chunk-t6nrrfy6.js:5928-7225 placement
function formatDaemonStatus(status) {
  let lines = ["", "bg sessions:"];
  lines.push(`  sock dir:     ${status.sockDir}`);
  lines.push(
    `  control.sock: ${status.controlReachable ? "reachable" : `unreachable (${status.controlError ?? "unknown"})`}`,
  );
  if (status.bgDisabled)
    lines.push(
      "  bg sessions:  disabled (start failure \u2014 see daemon.log; restart the service after fixing)",
    );
  if (status.workersLive !== null) {
    lines.push(
      `  bg workers:   ${status.workersLive} running (control.sock), ${status.workersRoster} in roster.json`,
    );
    if (status.workersSkewed && status.workersSkewed > 0)
      lines.push(
        `                ${status.workersSkewed} from a different CLI version (most stay attachable and upgrade automatically once idle \u2014 exec runs never respawn)`,
      );
  } else
    lines.push(
      `  bg workers:   ${status.workersRoster} in roster.json (${status.controlReachable ? "live count unavailable" : "control unreachable"})`,
    );
  lines.push(
    `  roster.json:  ${status.rosterAgeSec === null ? "absent" : `updated ${status.rosterAgeSec}s ago`}`,
  );
  lines.push(
    `  daemon.log:   ${status.logSizeBytes === null ? "absent" : `${formatByteSize(status.logSizeBytes)} at ${status.logPath}`}`,
  );
  if (!status.supervisor && !status.controlReachable && status.workersRoster > 0)
    lines.push(
      `  warning:      supervisor not running but ${status.workersRoster} ${plural(status.workersRoster, "worker")} in roster \u2014 running \`claude agents\` restarts the daemon and re-adopts still-running sessions; run \`claude daemon stop --any\` to reap them instead`,
    );
  return lines.join(`
`);
}
//@ chunk-t6nrrfy6.js:7225-7347 placement
function formatByteSize(logSizeBytes) {
  if (logSizeBytes < 1024) return `${logSizeBytes}B`;
  if (logSizeBytes < 1048576) return `${(logSizeBytes / 1024).toFixed(1)}KB`;
  return `${(logSizeBytes / 1024 / 1024).toFixed(1)}MB`;
}
export { formatDaemonStatus, pingDaemon };
