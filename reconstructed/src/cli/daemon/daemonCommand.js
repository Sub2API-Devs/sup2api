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
import { P6 } from "../../services/remoteTools/backgroundCommands.js";
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
import { jL } from "../../services/daemon/paths.js";

//@ chunk-7904g3ks.js:4615-4657 placement
function f(e) {
  process.stdout.write(
    e +
      `
`,
  );
}
//@ chunk-7904g3ks.js:4657-4699 placement
function F(e) {
  process.stderr.write(
    e +
      `
`,
  );
}
//@ chunk-7904g3ks.js:4699-4734 placement
function d(e) {
  (F(e), process.exit(1));
}
//@ chunk-7904g3ks.js:4734-5602 placement
function parseDaemonArgs(e, t) {
  let n,
    s = new Map(),
    r = !1,
    o = -1;
  for (let a = 0; a < t.length; a++) {
    let c = t[a];
    if (!c.startsWith("-")) {
      o = a;
      break;
    }
    if (c !== "--json" && c.startsWith("--") && !c.includes("=")) a++;
  }
  let i = o === -1 ? void 0 : t[o],
    m;
  if (i === void 0 || i === "list") m = "list";
  else if (i === "add" || i === "remove") m = i;
  else d(`unknown action '${i}' \u2014 expected: claude daemon ${e} <add|remove|list>`);
  let u = o === -1 ? t : [...t.slice(0, o), ...t.slice(o + 1)];
  for (let a = 0; a < u.length; a++) {
    let c = u[a];
    if (c === "--json") r = !0;
    else if (c.startsWith("--")) {
      let index = c.indexOf("="),
        h = index !== -1 ? c.slice(2, index) : c.slice(2);
      if (h === "add" || h === "remove")
        d(`'${c}' is no longer supported \u2014 use: claude daemon ${e} <add|remove|list>`);
      s.set(h, index !== -1 ? c.slice(index + 1) : (u[++a] ?? ""));
    } else if (m === "remove" && n === void 0) n = c;
    else d(`unknown option '${c}' \u2014 expected: claude daemon ${e} <add|remove|list>`);
  }
  return { action: m, removeTarget: n, flags: s, json: r };
}
//@ chunk-7904g3ks.js:5602-5747 placement
async function warnDaemonServiceNotInstalled() {
  if (!(await daemonServiceStatus()))
    d(
      "daemon service is not installed (service install is disabled in this version; the daemon runs on demand)",
    );
}
//@ chunk-7904g3ks.js:5747-5826 placement
async function T(e, t) {
  let n = await readJsonConfigFile(e, t);
  if (!n.ok) d(n.error);
  return n.config;
}
//@ chunk-7904g3ks.js:5914-6064 placement
function attachServingTools(e, t) {
  return e.map((n) => {
    let s = n.kind === "scheduled" ? void 0 : t.find((r) => r.dir === n.dir)?.sessions;
    return s === void 0 ? n : { ...n, servingTools: s };
  });
}
//@ chunk-7904g3ks.js:6064-6103 placement
function B(e) {
  for (let t of servingToolsLines(e)) f(t);
}
//@ chunk-7904g3ks.js:6103-6410 placement
async function DAEMON_ENTRY_KINDS(e, t) {
  let n = await T(e, t),
    s = [],
    r = n.remoteControl ?? [];
  for (let i of r)
    s.push({
      kind: "remote-control",
      dir: i.dir,
      name: i.name ?? basename(i.dir),
      spawnMode: i.spawnMode ?? "same-dir",
    });
  let o = await listScheduledTasks(e, t);
  for (let i of o)
    s.push({ kind: "scheduled", id: i.id, dir: i.directory, enabled: i.enabled, cron: i.cron });
  return s;
}
//@ chunk-7904g3ks.js:6410-6847 placement
function formatDaemonEntries(e) {
  if (e.length === 0) {
    f("(no entries)");
    return;
  }
  let t = ["kind", "name/id", "dir", "extra"],
    mapped = e.map((o) => [
      o.kind,
      o.id ?? o.name ?? "",
      o.dir,
      o.kind === "scheduled"
        ? `${o.cron ?? ""}${o.enabled === !1 ? " (disabled)" : ""}`
        : o.kind === "remote-control"
          ? (o.spawnMode ?? "")
          : "",
    ]),
    mapped_2 = t.map((o, i) => Math.max(o.length, ...mapped.map((m) => m[i].length))),
    r = (o) => o.map((i, m) => i.padEnd(mapped_2[m])).join("  ");
  (f(r(t)), f(mapped_2.map((o) => "-".repeat(o)).join("  ")));
  for (let o of mapped) f(r(o));
}
/**
 * claude daemon scheduled list/remove/add（--prompt、--cron、--model、--permission-mode）。
 */
//@ chunk-7904g3ks.js:6847-8608 placement
async function handleScheduledCommand(e, t, n) {
  if (e.action === "list") {
    let p = await listScheduledTasks(t, n);
    if (e.json) {
      f(jsonStringify(p, null, 2));
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
  if (e.action === "remove") {
    if (!e.removeTarget) d("usage: claude daemon scheduled remove <task-id>");
    if ((await warnDaemonServiceNotInstalled(), !(await removeScheduledTask(e.removeTarget, t, n))))
      d(`No scheduled task with id "${e.removeTarget}"`);
    f(`removed ${e.removeTarget}`);
    return;
  }
  if ((await warnDaemonServiceNotInstalled(), e.flags.has("id") && !e.flags.get("id")))
    d("--id requires a non-empty value");
  if (e.flags.has("model") && !e.flags.get("model")) d("--model requires a non-empty value");
  function s(p) {
    return SCHEDULED_PERMISSION_MODES.includes(p);
  }
  let r = normalizePermissionModeAlias(e.flags.get("permission-mode"));
  if (e.flags.has("permission-mode") && !s(r ?? "")) {
    let mapped = SCHEDULED_PERMISSION_MODES.map((k) => (k === "default" ? PERMISSION_MODE_MANUAL_ALIAS : k));
    d(`--permission-mode must be one of ${mapped.join(", ")}`);
  }
  let o = e.flags.get("prompt"),
    i = e.flags.get("id"),
    m = e.flags.get("dir"),
    u = resolve(m ?? getCwd());
  if (!i && !o) d("--prompt is required (or pass --id to update an existing task)");
  let a = i ?? slugifyTaskName(u, o),
    found = (await listScheduledTasks(t, n)).find((p) => p.id === a),
    h = o ?? found?.prompt,
    w = e.flags.get("cron") ?? found?.cron;
  if (!h) d("--prompt is required");
  if (!w) d("--cron is required");
  let g = parseScheduleInput(w);
  if (g.error !== void 0) d(`invalid --cron '${w}': ${g.error}`);
  let cron = g.cron,
    M = m ? resolve(m) : (found?.directory ?? resolve(getCwd())),
    P = r ?? normalizePermissionModeAlias(found?.permissionMode) ?? "dontAsk",
    E = e.flags.get("model") ?? found?.model ?? void 0,
    { isPathTrusted: isPathTrusted } = await import("./chunk-eesswvbz.js");
  if (!isPathTrusted(M))
    d(`${M} is not a trusted directory \u2014 run \`claude\` there once and accept the trust dialog.`);
  let q = {
    ...(found && {
      enabled: found.enabled,
      runTimeoutMinutes: found.runTimeoutMinutes,
      maxQueued: found.maxQueued,
    }),
    id: a,
    cron: cron,
    prompt: h,
    directory: M,
    permissionMode: P,
    ...(E && { model: E }),
  };
  if ((await addScheduledTask(q, t, n), found)) f(`updated scheduled task '${a}'`);
  else f(`added scheduled task '${a}'`);
}
//@ chunk-7904g3ks.js:8608-8810 placement
function slugifyTaskName(e, t) {
  let n = (i) =>
      i
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40),
    s = n(basename(e)),
    r = n(t.split(/\s+/).slice(0, 4).join(" "));
  return [s, r].filter(Boolean).join("-") || "task";
}
//@ chunk-7904g3ks.js:8810-10207 placement
async function handleRemoteControlCommand(e, t, n) {
  if (e.action === "list") {
    let a = (await T(t, n)).remoteControl ?? [],
      c = await tryAcquireComputerUseLock(n);
    if (e.json) {
      f(jsonStringify(attachServingTools(a, c), null, 2));
      return;
    }
    (formatDaemonEntries(
      a.map((l) => ({
        kind: "remote-control",
        dir: l.dir,
        name: l.name ?? basename(l.dir),
        spawnMode: l.spawnMode ?? "same-dir",
      })),
    ),
      B(c));
    return;
  }
  if (e.action === "remove") {
    if (!e.removeTarget) d("usage: claude daemon remote-control remove <name-or-dir>");
    await warnDaemonServiceNotInstalled();
    let u = await resolveRemoteControlServer(e.removeTarget, t, n),
      a = 0;
    if (P6()) {
      let mapped = (await DAEMON_ENTRY_KINDS(t, n))
          .filter((g) => g.kind === "remote-control")
          .map((g) => g.dir),
        sliced = mapped.slice(Math.max(0, mapped.indexOf(u))),
        h = await tryAcquireComputerUseLock(n),
        { servedBackgroundShellsIn: servedBackgroundShellsIn } = await import("./chunk-rskr11sp.js");
      a = await servedBackgroundShellsIn(h.map((g) => g.dir).filter((g) => sliced.includes(g)));
    }
    if ((await removeRemoteControlDir(u, t, n), f(`removed ${u}`), a > 0))
      f(
        `note: cloud sessions had ${a} background ${plural(a, "command")} running in that folder or one listed after it; the ones this daemon was serving are stopped too`,
      );
    return;
  }
  if ((await warnDaemonServiceNotInstalled(), !isDaemonWorkerRegistryEnabled())) {
    let u = await checkRemoteControlWorkerEligibility();
    if (u !== void 0) d(u.reason);
  }
  let s = await canonicalizePath(resolve(e.flags.get("dir") ?? getCwd()), getRealPathOptions(n)),
    { isPathTrusted: isPathTrusted } = await import("./chunk-eesswvbz.js");
  if (!isPathTrusted(s))
    d(`${s} is not a trusted directory \u2014 run \`claude\` there once and accept the trust dialog.`);
  let o = e.flags.get("name"),
    i = e.flags.get("spawn-mode");
  if (i !== void 0 && i !== "same-dir" && i !== "worktree")
    d(`--spawn-mode must be same-dir or worktree, got '${i}'`);
  let m = await upsertRemoteControlDir({ dir: s, name: o, spawnMode: i }, t, n);
  f(`${m} remote-control server for ${s}`);
}
//@ chunk-7904g3ks.js:10207-10604 placement
async function resolveRemoteControlServer(e, t, n) {
  let r = (await T(t, n)).remoteControl ?? [],
    filtered = r.filter((a) => (a.name ?? basename(a.dir)) === e);
  if (filtered.length === 1) return filtered[0].dir;
  if (filtered.length > 1)
    d(`ambiguous: multiple remote-control servers match name '${e}'. Use a dir instead.`);
  let i = getRealPathOptions(n),
    m = await canonicalizePath(resolve(e), i),
    u = [];
  for (let a of r) if ((await canonicalizePath(a.dir, i)) === m) u.push(a);
  if (u.length >= 1) return u[0].dir;
  d(`no remote-control server matched '${e}'`);
}
//@ chunk-7904g3ks.js:10604-11921 placement
async function handleStopShell(e) {
  let {
      SERVED_BACKGROUND_SHELL_ID: SERVED_BACKGROUND_SHELL_ID,
      lookUpServedBackgroundShell: lookUpServedBackgroundShell,
      stopServedBackgroundShell: stopServedBackgroundShell,
    } = await import("./chunk-rskr11sp.js"),
    r = e[0];
  if (r === void 0 || e.length > 1 || !SERVED_BACKGROUND_SHELL_ID.test(r))
    d("usage: claude daemon remote-control stop-shell <id> (`claude daemon status` lists the ids)");
  let o = await lookUpServedBackgroundShell(r);
  if (o === "ended")
    return (
      f(
        `${r} had already ended: the process that served it is gone and nothing of the command is still running`,
      ),
      await logFeatureOkAsync("daemon_rc_stop_shell"),
      exitAfterAnalyticsFlush(0)
    );
  if (o === void 0) d(`no background command ${r} is running for a cloud session on this computer`);
  if (o.ownerGone)
    d(
      `${r} was left behind by a serving process that is gone, so nothing can be asked to stop it. If pid ${o.pid} is still that command, stop it and what it started yourself: kill -- -${o.pid}`,
    );
  let i = await stopServedBackgroundShell(r);
  if (i === "stopped") (f(`stopped ${r}`), await logFeatureOkAsync("daemon_rc_stop_shell"));
  else
    (F(
      `${r} ${{ unanswered: "has not stopped: the process that owns it did not answer within 10 seconds, and the request is withdrawn", pending: "had not stopped after 10 seconds and the request could not be withdrawn: it may stop yet. `claude daemon status` shows whether it is still running", not_asked: "was not stopped: the request could not be written to ~/.claude/state/served-calls" }[i]}`,
    ),
      await logFeatureBadAsync("daemon_rc_stop_shell", i));
  return exitAfterAnalyticsFlush(i === "stopped" ? 0 : 1);
}
//@ chunk-7904g3ks.js:11921-12026 placement
async function printDaemonList(e, t = jL(), n) {
  let s = await DAEMON_ENTRY_KINDS(t, n),
    r = await tryAcquireComputerUseLock(n);
  if (e) {
    f(jsonStringify(attachServingTools(s, r), null, 2));
    return;
  }
  (formatDaemonEntries(s), B(r));
}
//@ chunk-7904g3ks.js:12026-12194 placement
async function runDaemonSubcommand(e, t, n = jL(), s) {
  if (e === "remote-control" && t[0] === "stop-shell" && P6()) return handleStopShell(t.slice(1));
  let r = parseDaemonArgs(e, t);
  if (e === "scheduled") return handleScheduledCommand(r, n, s);
  return handleRemoteControlCommand(r, n, s);
}
