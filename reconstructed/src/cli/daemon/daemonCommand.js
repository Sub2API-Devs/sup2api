/**
 * cli/daemon/daemonCommand.ts
 *
 * 2.1.316 新增：claude daemon 子命令：add/remove/list、scheduled（定时任务）与 remote-control 服务器管理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7904g3ks.js (17)
 * attribution: placement 17
 */
import { basename, resolve } from "path";
import { daemonServiceStatus } from "../../services/daemon/serviceInstall.js";
import { readJsonConfigFile } from "../../utils/jsonConfigFile.js";
import { servingToolsLines } from "../../daemon/daemonStatus.js";
import {
  listScheduledTasks,
  removeScheduledTask,
  SCHEDULED_PERMISSION_MODES,
  addScheduledTask,
} from "../../daemon/scheduledWorker.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { normalizePermissionModeAlias, PERMISSION_MODE_MANUAL_ALIAS } from "../../types/permissions.js";
import { getCwd } from "../../utils/cwd.js";
import { parseScheduleInput } from "../../utils/cron.js";
import { tryAcquireComputerUseLock } from "../../utils/daemon/daemonLock.js";
import { isViolinVarnishOn } from "../../services/remoteTools/backgroundCommands.js";
import {
  removeRemoteControlDir,
  checkRemoteControlWorkerEligibility,
  upsertRemoteControlDir,
} from "../../daemon/daemonAuth.js";
import { plural } from "../../utils/stringUtils.js";
import { isDaemonWorkerRegistryEnabled } from "../../utils/fleetGates.js";
import { canonicalizePath } from "../../utils/sessionStoragePortable.js";
import { getRealPathOptions } from "../../utils/sessionStorage.js";
import { logFeatureOkAsync, logFeatureBadAsync } from "../../services/analytics/featureTelemetry.js";
import { exitAfterAnalyticsFlush } from "../exit.js";
import { daemonJsonPath } from "../../services/daemon/paths.js";

//@ chunk-7904g3ks.js:4615-4657 placement
function printLine(e) {
  process.stdout.write(
    e +
      `
`,
  );
}
//@ chunk-7904g3ks.js:4657-4699 placement
function printErrLine(e) {
  process.stderr.write(
    e +
      `
`,
  );
}
//@ chunk-7904g3ks.js:4699-4734 placement
function failWithError(e) {
  printErrLine(e);
  process.exit(1);
}
//@ chunk-7904g3ks.js:4734-5602 placement
function parseDaemonArgs(e, t) {
  let n;
  let s = new Map();
  let json = false;
  let o = -1;
  for (let k = 0; k < t.length; k++) {
    let c = t[k];
    if (!c.startsWith("-")) {
      o = k;
      break;
    }
    if (c !== "--json" && c.startsWith("--") && !c.includes("=")) k++;
  }
  let i = o === -1 ? undefined : t[o];
  let m;
  if (i === undefined || i === "list") m = "list";
  else if (i === "add" || i === "remove") m = i;
  else failWithError(`unknown action '${i}' \u2014 expected: claude daemon ${e} <add|remove|list>`);
  let u = o === -1 ? t : [...t.slice(0, o), ...t.slice(o + 1)];
  for (let k = 0; k < u.length; k++) {
    let c = u[k];
    if (c === "--json") json = true;
    else if (c.startsWith("--")) {
      let index = c.indexOf("=");
      let h = index !== -1 ? c.slice(2, index) : c.slice(2);
      if (h === "add" || h === "remove")
        failWithError(`'${c}' is no longer supported \u2014 use: claude daemon ${e} <add|remove|list>`);
      s.set(h, index !== -1 ? c.slice(index + 1) : (u[++k] ?? ""));
    } else if (m === "remove" && n === undefined) n = c;
    else failWithError(`unknown option '${c}' \u2014 expected: claude daemon ${e} <add|remove|list>`);
  }
  return {
    action: m,
    removeTarget: n,
    flags: s,
    json,
  };
}
//@ chunk-7904g3ks.js:5602-5747 placement
async function warnDaemonServiceNotInstalled() {
  if (!(await daemonServiceStatus()))
    failWithError(
      "daemon service is not installed (service install is disabled in this version; the daemon runs on demand)",
    );
}
//@ chunk-7904g3ks.js:5747-5826 placement
async function readDaemonConfig(e, t) {
  let jsonConfigFile = await readJsonConfigFile(e, t);
  if (!jsonConfigFile.ok) failWithError(jsonConfigFile.error);
  return jsonConfigFile.config;
}
//@ chunk-7904g3ks.js:5914-6064 placement
function attachServingTools(e, t) {
  return e.map((n) => {
    let sessions = n.kind === "scheduled" ? undefined : t.find((r) => r.dir === n.dir)?.sessions;
    return sessions === undefined
      ? n
      : {
          ...n,
          servingTools: sessions,
        };
  });
}
//@ chunk-7904g3ks.js:6064-6103 placement
function printServingTools(e) {
  for (let t of servingToolsLines(e)) printLine(t);
}
//@ chunk-7904g3ks.js:6103-6410 placement
async function DAEMON_ENTRY_KINDS(e, t) {
  let daemonConfig = await readDaemonConfig(e, t);
  let s = [];
  let remoteControl = daemonConfig.remoteControl ?? [];
  for (let i of remoteControl)
    s.push({
      kind: "remote-control",
      dir: i.dir,
      name: i.name ?? basename(i.dir),
      spawnMode: i.spawnMode ?? "same-dir",
    });
  let o = await listScheduledTasks(e, t);
  for (let i of o)
    s.push({
      kind: "scheduled",
      id: i.id,
      dir: i.directory,
      enabled: i.enabled,
      cron: i.cron,
    });
  return s;
}
//@ chunk-7904g3ks.js:6410-6847 placement
function formatDaemonEntries(e) {
  if (e.length === 0) {
    printLine("(no entries)");
    return;
  }
  let t = ["kind", "name/id", "dir", "extra"];
  let mapped = e.map((o) => [
    o.kind,
    o.id ?? o.name ?? "",
    o.dir,
    o.kind === "scheduled"
      ? `${o.cron ?? ""}${o.enabled === false ? " (disabled)" : ""}`
      : o.kind === "remote-control"
        ? (o.spawnMode ?? "")
        : "",
  ]);
  let mapped_2 = t.map((o, i) => Math.max(o.length, ...mapped.map((m) => m[i].length)));
  let r = (o) => o.map((i, m) => i.padEnd(mapped_2[m])).join("  ");
  printLine(r(t));
  printLine(mapped_2.map((o) => "-".repeat(o)).join("  "));
  for (let o of mapped) printLine(r(o));
}
//@ chunk-7904g3ks.js:6847-8608 placement
/**
 * claude daemon scheduled list/remove/add（--prompt、--cron、--model、--permission-mode）。
 */
async function handleScheduledCommand(daemonArgs, t, n) {
  if (daemonArgs.action === "list") {
    let p = await listScheduledTasks(t, n);
    if (daemonArgs.json) {
      printLine(jsonStringify(p, null, 2));
      return;
    }
    let mapped = p.map((y) => ({
      kind: "scheduled",
      id: y.id,
      dir: y.directory,
      enabled: y.enabled,
      cron: y.cron,
    }));
    formatDaemonEntries(mapped);
    return;
  }
  if (daemonArgs.action === "remove") {
    if (!daemonArgs.removeTarget) failWithError("usage: claude daemon scheduled remove <task-id>");
    await warnDaemonServiceNotInstalled();
    if (!(await removeScheduledTask(daemonArgs.removeTarget, t, n)))
      failWithError(`No scheduled task with id "${daemonArgs.removeTarget}"`);
    printLine(`removed ${daemonArgs.removeTarget}`);
    return;
  }
  await warnDaemonServiceNotInstalled();
  if (daemonArgs.flags.has("id") && !daemonArgs.flags.get("id"))
    failWithError("--id requires a non-empty value");
  if (daemonArgs.flags.has("model") && !daemonArgs.flags.get("model"))
    failWithError("--model requires a non-empty value");
  function s(p) {
    return SCHEDULED_PERMISSION_MODES.includes(p);
  }
  let r = normalizePermissionModeAlias(daemonArgs.flags.get("permission-mode"));
  if (daemonArgs.flags.has("permission-mode") && !s(r ?? "")) {
    let mapped = SCHEDULED_PERMISSION_MODES.map((k) => (k === "default" ? PERMISSION_MODE_MANUAL_ALIAS : k));
    failWithError(`--permission-mode must be one of ${mapped.join(", ")}`);
  }
  let o = daemonArgs.flags.get("prompt");
  let i = daemonArgs.flags.get("id");
  let m = daemonArgs.flags.get("dir");
  let u = resolve(m ?? getCwd());
  if (!i && !o) failWithError("--prompt is required (or pass --id to update an existing task)");
  let a = i ?? slugifyTaskName(u, o);
  let found = (await listScheduledTasks(t, n)).find((p) => p.id === a);
  let h = o ?? found?.prompt;
  let w = daemonArgs.flags.get("cron") ?? found?.cron;
  if (!h) failWithError("--prompt is required");
  if (!w) failWithError("--cron is required");
  let scheduleInput = parseScheduleInput(w);
  if (scheduleInput.error !== undefined) failWithError(`invalid --cron '${w}': ${scheduleInput.error}`);
  let cron = scheduleInput.cron;
  let M = m ? resolve(m) : (found?.directory ?? resolve(getCwd()));
  let permissionMode = r ?? normalizePermissionModeAlias(found?.permissionMode) ?? "dontAsk";
  let E = daemonArgs.flags.get("model") ?? found?.model ?? undefined;
  let { isPathTrusted } = await import("./chunk-eesswvbz.js");
  if (!isPathTrusted(M))
    failWithError(
      `${M} is not a trusted directory \u2014 run \`claude\` there once and accept the trust dialog.`,
    );
  let q = {
    ...(found && {
      enabled: found.enabled,
      runTimeoutMinutes: found.runTimeoutMinutes,
      maxQueued: found.maxQueued,
    }),
    id: a,
    cron,
    prompt: h,
    directory: M,
    permissionMode,
    ...(E && {
      model: E,
    }),
  };
  await addScheduledTask(q, t, n);
  if (found) printLine(`updated scheduled task '${a}'`);
  else printLine(`added scheduled task '${a}'`);
}
//@ chunk-7904g3ks.js:8608-8810 placement
function slugifyTaskName(e, t) {
  let n = (i) =>
    i
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  let s = n(basename(e));
  let r = n(t.split(/\s+/).slice(0, 4).join(" "));
  return [s, r].filter(Boolean).join("-") || "task";
}
//@ chunk-7904g3ks.js:8810-10207 placement
async function handleRemoteControlCommand(daemonArgs, t, n) {
  if (daemonArgs.action === "list") {
    let remoteControl = (await readDaemonConfig(t, n)).remoteControl ?? [];
    let c = await tryAcquireComputerUseLock(n);
    if (daemonArgs.json) {
      printLine(jsonStringify(attachServingTools(remoteControl, c), null, 2));
      return;
    }
    formatDaemonEntries(
      remoteControl.map((l) => ({
        kind: "remote-control",
        dir: l.dir,
        name: l.name ?? basename(l.dir),
        spawnMode: l.spawnMode ?? "same-dir",
      })),
    );
    printServingTools(c);
    return;
  }
  if (daemonArgs.action === "remove") {
    if (!daemonArgs.removeTarget) failWithError("usage: claude daemon remote-control remove <name-or-dir>");
    await warnDaemonServiceNotInstalled();
    let remoteControlServer = await resolveRemoteControlServer(daemonArgs.removeTarget, t, n);
    let a = 0;
    if (isViolinVarnishOn()) {
      let mapped = (await DAEMON_ENTRY_KINDS(t, n))
        .filter((g) => g.kind === "remote-control")
        .map((g) => g.dir);
      let sliced = mapped.slice(Math.max(0, mapped.indexOf(remoteControlServer)));
      let h = await tryAcquireComputerUseLock(n);
      let { servedBackgroundShellsIn } = await import("./chunk-rskr11sp.js");
      a = await servedBackgroundShellsIn(h.map((g) => g.dir).filter((g) => sliced.includes(g)));
    }
    await removeRemoteControlDir(remoteControlServer, t, n);
    printLine(`removed ${remoteControlServer}`);
    if (a > 0)
      printLine(
        `note: cloud sessions had ${a} background ${plural(a, "command")} running in that folder or one listed after it; the ones this daemon was serving are stopped too`,
      );
    return;
  }
  await warnDaemonServiceNotInstalled();
  if (!isDaemonWorkerRegistryEnabled()) {
    let u = await checkRemoteControlWorkerEligibility();
    if (u !== undefined) failWithError(u.reason);
  }
  let s = await canonicalizePath(resolve(daemonArgs.flags.get("dir") ?? getCwd()), getRealPathOptions(n));
  let { isPathTrusted } = await import("./chunk-eesswvbz.js");
  if (!isPathTrusted(s))
    failWithError(
      `${s} is not a trusted directory \u2014 run \`claude\` there once and accept the trust dialog.`,
    );
  let name = daemonArgs.flags.get("name");
  let i = daemonArgs.flags.get("spawn-mode");
  if (i !== undefined && i !== "same-dir" && i !== "worktree")
    failWithError(`--spawn-mode must be same-dir or worktree, got '${i}'`);
  let m = await upsertRemoteControlDir(
    {
      dir: s,
      name,
      spawnMode: i,
    },
    t,
    n,
  );
  printLine(`${m} remote-control server for ${s}`);
}
//@ chunk-7904g3ks.js:10207-10604 placement
async function resolveRemoteControlServer(removeTarget, t, n) {
  let remoteControl = (await readDaemonConfig(t, n)).remoteControl ?? [];
  let filtered = remoteControl.filter((a) => (a.name ?? basename(a.dir)) === removeTarget);
  if (filtered.length === 1) return filtered[0].dir;
  if (filtered.length > 1)
    failWithError(
      `ambiguous: multiple remote-control servers match name '${removeTarget}'. Use a dir instead.`,
    );
  let realPathOptions = getRealPathOptions(n);
  let m = await canonicalizePath(resolve(removeTarget), realPathOptions);
  let u = [];
  for (let a of remoteControl) if ((await canonicalizePath(a.dir, realPathOptions)) === m) u.push(a);
  if (u.length >= 1) return u[0].dir;
  failWithError(`no remote-control server matched '${removeTarget}'`);
}
//@ chunk-7904g3ks.js:10604-11921 placement
async function handleStopShell(e) {
  let { SERVED_BACKGROUND_SHELL_ID, lookUpServedBackgroundShell, stopServedBackgroundShell } =
    await import("./chunk-rskr11sp.js");
  let r = e[0];
  if (r === undefined || e.length > 1 || !SERVED_BACKGROUND_SHELL_ID.test(r))
    failWithError(
      "usage: claude daemon remote-control stop-shell <id> (`claude daemon status` lists the ids)",
    );
  let o = await lookUpServedBackgroundShell(r);
  if (o === "ended") {
    printLine(
      `${r} had already ended: the process that served it is gone and nothing of the command is still running`,
    );
    await logFeatureOkAsync("daemon_rc_stop_shell");
    return exitAfterAnalyticsFlush(0);
  }
  if (o === undefined)
    failWithError(`no background command ${r} is running for a cloud session on this computer`);
  if (o.ownerGone)
    failWithError(
      `${r} was left behind by a serving process that is gone, so nothing can be asked to stop it. If pid ${o.pid} is still that command, stop it and what it started yourself: kill -- -${o.pid}`,
    );
  let i = await stopServedBackgroundShell(r);
  if (i === "stopped") {
    printLine(`stopped ${r}`);
    await logFeatureOkAsync("daemon_rc_stop_shell");
  } else {
    printErrLine(
      `${r} ${
        {
          unanswered:
            "has not stopped: the process that owns it did not answer within 10 seconds, and the request is withdrawn",
          pending:
            "had not stopped after 10 seconds and the request could not be withdrawn: it may stop yet. `claude daemon status` shows whether it is still running",
          not_asked: "was not stopped: the request could not be written to ~/.claude/state/served-calls",
        }[i]
      }`,
    );
    await logFeatureBadAsync("daemon_rc_stop_shell", i);
  }
  return exitAfterAnalyticsFlush(i === "stopped" ? 0 : 1);
}
//@ chunk-7904g3ks.js:11921-12026 placement
async function printDaemonList(e, t = daemonJsonPath(), n) {
  let s = await DAEMON_ENTRY_KINDS(t, n);
  let r = await tryAcquireComputerUseLock(n);
  if (e) {
    printLine(jsonStringify(attachServingTools(s, r), null, 2));
    return;
  }
  formatDaemonEntries(s);
  printServingTools(r);
}
//@ chunk-7904g3ks.js:12026-12194 placement
async function runDaemonSubcommand(e, t, n = daemonJsonPath(), s) {
  if (e === "remote-control" && t[0] === "stop-shell" && isViolinVarnishOn())
    return handleStopShell(t.slice(1));
  let daemonArgs = parseDaemonArgs(e, t);
  if (e === "scheduled") return handleScheduledCommand(daemonArgs, n, s);
  return handleRemoteControlCommand(daemonArgs, n, s);
}
