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
function printLine(line) {
  process.stdout.write(
    line +
      `
`,
  );
}
//@ chunk-7904g3ks.js:4657-4699 placement
function printErrLine(line) {
  process.stderr.write(
    line +
      `
`,
  );
}
//@ chunk-7904g3ks.js:4699-4734 placement
function failWithError(message) {
  printErrLine(message);
  process.exit(1);
}
//@ chunk-7904g3ks.js:4734-5602 placement
function parseDaemonArgs(group, argv) {
  let removeTarget;
  let flags = new Map();
  let json = false;
  let actionIndex = -1;
  for (let k = 0; k < argv.length; k++) {
    let arg = argv[k];
    if (!arg.startsWith("-")) {
      actionIndex = k;
      break;
    }
    if (arg !== "--json" && arg.startsWith("--") && !arg.includes("=")) k++;
  }
  let actionArg = actionIndex === -1 ? undefined : argv[actionIndex];
  let action;
  if (actionArg === undefined || actionArg === "list") action = "list";
  else if (actionArg === "add" || actionArg === "remove") action = actionArg;
  else
    failWithError(`unknown action '${actionArg}' \u2014 expected: claude daemon ${group} <add|remove|list>`);
  let rest = actionIndex === -1 ? argv : [...argv.slice(0, actionIndex), ...argv.slice(actionIndex + 1)];
  for (let k = 0; k < rest.length; k++) {
    let arg = rest[k];
    if (arg === "--json") json = true;
    else if (arg.startsWith("--")) {
      let index = arg.indexOf("=");
      let flagName = index !== -1 ? arg.slice(2, index) : arg.slice(2);
      if (flagName === "add" || flagName === "remove")
        failWithError(`'${arg}' is no longer supported \u2014 use: claude daemon ${group} <add|remove|list>`);
      flags.set(flagName, index !== -1 ? arg.slice(index + 1) : (rest[++k] ?? ""));
    } else if (action === "remove" && removeTarget === undefined) removeTarget = arg;
    else failWithError(`unknown option '${arg}' \u2014 expected: claude daemon ${group} <add|remove|list>`);
  }
  return {
    action,
    removeTarget,
    flags,
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
async function readDaemonConfig(group, options) {
  let jsonConfigFile = await readJsonConfigFile(group, options);
  if (!jsonConfigFile.ok) failWithError(jsonConfigFile.error);
  return jsonConfigFile.config;
}
//@ chunk-7904g3ks.js:5914-6064 placement
function attachServingTools(entries, servedShells) {
  return entries.map((entry) => {
    let sessions =
      entry.kind === "scheduled"
        ? undefined
        : servedShells.find((served) => served.dir === entry.dir)?.sessions;
    return sessions === undefined
      ? entry
      : {
          ...entry,
          servingTools: sessions,
        };
  });
}
//@ chunk-7904g3ks.js:6064-6103 placement
function printServingTools(servedShells) {
  for (let line of servingToolsLines(servedShells)) printLine(line);
}
//@ chunk-7904g3ks.js:6103-6410 placement
async function DAEMON_ENTRY_KINDS(group, options) {
  let daemonConfig = await readDaemonConfig(group, options);
  let entries = [];
  let remoteControl = daemonConfig.remoteControl ?? [];
  for (let entry of remoteControl)
    entries.push({
      kind: "remote-control",
      dir: entry.dir,
      name: entry.name ?? basename(entry.dir),
      spawnMode: entry.spawnMode ?? "same-dir",
    });
  let tasks = await listScheduledTasks(group, options);
  for (let task of tasks)
    entries.push({
      kind: "scheduled",
      id: task.id,
      dir: task.directory,
      enabled: task.enabled,
      cron: task.cron,
    });
  return entries;
}
//@ chunk-7904g3ks.js:6410-6847 placement
function formatDaemonEntries(entries) {
  if (entries.length === 0) {
    printLine("(no entries)");
    return;
  }
  let headers = ["kind", "name/id", "dir", "extra"];
  let mapped = entries.map((entry) => [
    entry.kind,
    entry.id ?? entry.name ?? "",
    entry.dir,
    entry.kind === "scheduled"
      ? `${entry.cron ?? ""}${entry.enabled === false ? " (disabled)" : ""}`
      : entry.kind === "remote-control"
        ? (entry.spawnMode ?? "")
        : "",
  ]);
  let mapped_2 = headers.map((header, column) =>
    Math.max(header.length, ...mapped.map((row) => row[column].length)),
  );
  let formatRow = (cells) => cells.map((cell, index) => cell.padEnd(mapped_2[index])).join("  ");
  printLine(formatRow(headers));
  printLine(mapped_2.map((width) => "-".repeat(width)).join("  "));
  for (let row of mapped) printLine(formatRow(row));
}
//@ chunk-7904g3ks.js:6847-8608 placement
/**
 * claude daemon scheduled list/remove/add（--prompt、--cron、--model、--permission-mode）。
 */
async function handleScheduledCommand(daemonArgs, group, options) {
  if (daemonArgs.action === "list") {
    let tasks = await listScheduledTasks(group, options);
    if (daemonArgs.json) {
      printLine(jsonStringify(tasks, null, 2));
      return;
    }
    let entries = tasks.map((task) => ({
      kind: "scheduled",
      id: task.id,
      dir: task.directory,
      enabled: task.enabled,
      cron: task.cron,
    }));
    formatDaemonEntries(entries);
    return;
  }
  if (daemonArgs.action === "remove") {
    if (!daemonArgs.removeTarget) failWithError("usage: claude daemon scheduled remove <task-id>");
    await warnDaemonServiceNotInstalled();
    if (!(await removeScheduledTask(daemonArgs.removeTarget, group, options)))
      failWithError(`No scheduled task with id "${daemonArgs.removeTarget}"`);
    printLine(`removed ${daemonArgs.removeTarget}`);
    return;
  }
  await warnDaemonServiceNotInstalled();
  if (daemonArgs.flags.has("id") && !daemonArgs.flags.get("id"))
    failWithError("--id requires a non-empty value");
  if (daemonArgs.flags.has("model") && !daemonArgs.flags.get("model"))
    failWithError("--model requires a non-empty value");
  function isAllowedMode(mode) {
    return SCHEDULED_PERMISSION_MODES.includes(mode);
  }
  let permissionMode = normalizePermissionModeAlias(daemonArgs.flags.get("permission-mode"));
  if (daemonArgs.flags.has("permission-mode") && !isAllowedMode(permissionMode ?? "")) {
    let mapped = SCHEDULED_PERMISSION_MODES.map((mode) =>
      mode === "default" ? PERMISSION_MODE_MANUAL_ALIAS : mode,
    );
    failWithError(`--permission-mode must be one of ${mapped.join(", ")}`);
  }
  let prompt = daemonArgs.flags.get("prompt");
  let taskId = daemonArgs.flags.get("id");
  let dir = daemonArgs.flags.get("dir");
  let directory = resolve(dir ?? getCwd());
  if (!taskId && !prompt) failWithError("--prompt is required (or pass --id to update an existing task)");
  let id = taskId ?? slugifyTaskName(directory, prompt);
  let found = (await listScheduledTasks(group, options)).find((task) => task.id === id);
  let taskPrompt = prompt ?? found?.prompt;
  let cronExpr = daemonArgs.flags.get("cron") ?? found?.cron;
  if (!taskPrompt) failWithError("--prompt is required");
  if (!cronExpr) failWithError("--cron is required");
  let scheduleInput = parseScheduleInput(cronExpr);
  if (scheduleInput.error !== undefined)
    failWithError(`invalid --cron '${cronExpr}': ${scheduleInput.error}`);
  let cron = scheduleInput.cron;
  let taskDir = dir ? resolve(dir) : (found?.directory ?? resolve(getCwd()));
  let permissionMode_2 = permissionMode ?? normalizePermissionModeAlias(found?.permissionMode) ?? "dontAsk";
  let model = daemonArgs.flags.get("model") ?? found?.model ?? undefined;
  let { isPathTrusted } = await import("../../utils/config.js");
  if (!isPathTrusted(taskDir))
    failWithError(
      `${taskDir} is not a trusted directory \u2014 run \`claude\` there once and accept the trust dialog.`,
    );
  let task = {
    ...(found && {
      enabled: found.enabled,
      runTimeoutMinutes: found.runTimeoutMinutes,
      maxQueued: found.maxQueued,
    }),
    id,
    cron,
    prompt: taskPrompt,
    directory: taskDir,
    permissionMode: permissionMode_2,
    ...(model && {
      model,
    }),
  };
  await addScheduledTask(task, group, options);
  if (found) printLine(`updated scheduled task '${id}'`);
  else printLine(`added scheduled task '${id}'`);
}
//@ chunk-7904g3ks.js:8608-8810 placement
function slugifyTaskName(dir, prompt) {
  let slug = (text) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  let dirSlug = slug(basename(dir));
  let promptSlug = slug(prompt.split(/\s+/).slice(0, 4).join(" "));
  return [dirSlug, promptSlug].filter(Boolean).join("-") || "task";
}
//@ chunk-7904g3ks.js:8810-10207 placement
async function handleRemoteControlCommand(daemonArgs, group, options) {
  if (daemonArgs.action === "list") {
    let remoteControl = (await readDaemonConfig(group, options)).remoteControl ?? [];
    let servedShells = await tryAcquireComputerUseLock(options);
    if (daemonArgs.json) {
      printLine(jsonStringify(attachServingTools(remoteControl, servedShells), null, 2));
      return;
    }
    formatDaemonEntries(
      remoteControl.map((entry) => ({
        kind: "remote-control",
        dir: entry.dir,
        name: entry.name ?? basename(entry.dir),
        spawnMode: entry.spawnMode ?? "same-dir",
      })),
    );
    printServingTools(servedShells);
    return;
  }
  if (daemonArgs.action === "remove") {
    if (!daemonArgs.removeTarget) failWithError("usage: claude daemon remote-control remove <name-or-dir>");
    await warnDaemonServiceNotInstalled();
    let entry = await resolveRemoteControlServer(daemonArgs.removeTarget, group, options);
    let runningShellCount = 0;
    if (isViolinVarnishOn()) {
      let mapped = (await DAEMON_ENTRY_KINDS(group, options))
        .filter((entry) => entry.kind === "remote-control")
        .map((entry) => entry.dir);
      let sliced = mapped.slice(Math.max(0, mapped.indexOf(entry)));
      let servedShells = await tryAcquireComputerUseLock(options);
      let { servedBackgroundShellsIn } = await import("../../remote/tools/serve/servedBackgroundShells.js");
      runningShellCount = await servedBackgroundShellsIn(
        servedShells.map((shell) => shell.dir).filter((dir) => sliced.includes(dir)),
      );
    }
    await removeRemoteControlDir(entry, group, options);
    printLine(`removed ${entry}`);
    if (runningShellCount > 0)
      printLine(
        `note: cloud sessions had ${runningShellCount} background ${plural(runningShellCount, "command")} running in that folder or one listed after it; the ones this daemon was serving are stopped too`,
      );
    return;
  }
  await warnDaemonServiceNotInstalled();
  if (!isDaemonWorkerRegistryEnabled()) {
    let ineligible = await checkRemoteControlWorkerEligibility();
    if (ineligible !== undefined) failWithError(ineligible.reason);
  }
  let dir = await canonicalizePath(
    resolve(daemonArgs.flags.get("dir") ?? getCwd()),
    getRealPathOptions(options),
  );
  let { isPathTrusted } = await import("../../utils/config.js");
  if (!isPathTrusted(dir))
    failWithError(
      `${dir} is not a trusted directory \u2014 run \`claude\` there once and accept the trust dialog.`,
    );
  let name = daemonArgs.flags.get("name");
  let spawnMode = daemonArgs.flags.get("spawn-mode");
  if (spawnMode !== undefined && spawnMode !== "same-dir" && spawnMode !== "worktree")
    failWithError(`--spawn-mode must be same-dir or worktree, got '${spawnMode}'`);
  let result = await upsertRemoteControlDir(
    {
      dir,
      name,
      spawnMode,
    },
    group,
    options,
  );
  printLine(`${result} remote-control server for ${dir}`);
}
//@ chunk-7904g3ks.js:10207-10604 placement
async function resolveRemoteControlServer(removeTarget, group, options) {
  let remoteControl = (await readDaemonConfig(group, options)).remoteControl ?? [];
  let filtered = remoteControl.filter((entry) => (entry.name ?? basename(entry.dir)) === removeTarget);
  if (filtered.length === 1) return filtered[0].dir;
  if (filtered.length > 1)
    failWithError(
      `ambiguous: multiple remote-control servers match name '${removeTarget}'. Use a dir instead.`,
    );
  let realPathOptions = getRealPathOptions(options);
  let targetPath = await canonicalizePath(resolve(removeTarget), realPathOptions);
  let pathMatches = [];
  for (let entry of remoteControl)
    if ((await canonicalizePath(entry.dir, realPathOptions)) === targetPath) pathMatches.push(entry);
  if (pathMatches.length >= 1) return pathMatches[0].dir;
  failWithError(`no remote-control server matched '${removeTarget}'`);
}
//@ chunk-7904g3ks.js:10604-11921 placement
async function handleStopShell(args) {
  let { SERVED_BACKGROUND_SHELL_ID, lookUpServedBackgroundShell, stopServedBackgroundShell } =
    await import("../../remote/tools/serve/servedBackgroundShells.js");
  let shellId = args[0];
  if (shellId === undefined || args.length > 1 || !SERVED_BACKGROUND_SHELL_ID.test(shellId))
    failWithError(
      "usage: claude daemon remote-control stop-shell <id> (`claude daemon status` lists the ids)",
    );
  let lookup = await lookUpServedBackgroundShell(shellId);
  if (lookup === "ended") {
    printLine(
      `${shellId} had already ended: the process that served it is gone and nothing of the command is still running`,
    );
    await logFeatureOkAsync("daemon_rc_stop_shell");
    return exitAfterAnalyticsFlush(0);
  }
  if (lookup === undefined)
    failWithError(`no background command ${shellId} is running for a cloud session on this computer`);
  if (lookup.ownerGone)
    failWithError(
      `${shellId} was left behind by a serving process that is gone, so nothing can be asked to stop it. If pid ${lookup.pid} is still that command, stop it and what it started yourself: kill -- -${lookup.pid}`,
    );
  let stopResult = await stopServedBackgroundShell(shellId);
  if (stopResult === "stopped") {
    printLine(`stopped ${shellId}`);
    await logFeatureOkAsync("daemon_rc_stop_shell");
  } else {
    printErrLine(
      `${shellId} ${
        {
          unanswered:
            "has not stopped: the process that owns it did not answer within 10 seconds, and the request is withdrawn",
          pending:
            "had not stopped after 10 seconds and the request could not be withdrawn: it may stop yet. `claude daemon status` shows whether it is still running",
          not_asked: "was not stopped: the request could not be written to ~/.claude/state/served-calls",
        }[stopResult]
      }`,
    );
    await logFeatureBadAsync("daemon_rc_stop_shell", stopResult);
  }
  return exitAfterAnalyticsFlush(stopResult === "stopped" ? 0 : 1);
}
//@ chunk-7904g3ks.js:11921-12026 placement
async function printDaemonList(isJson, configPath = daemonJsonPath(), options) {
  let entries = await DAEMON_ENTRY_KINDS(configPath, options);
  let servedShells = await tryAcquireComputerUseLock(options);
  if (isJson) {
    printLine(jsonStringify(attachServingTools(entries, servedShells), null, 2));
    return;
  }
  formatDaemonEntries(entries);
  printServingTools(servedShells);
}
//@ chunk-7904g3ks.js:12026-12194 placement
async function runDaemonSubcommand(subcommand, group, configPath = daemonJsonPath(), options) {
  if (subcommand === "remote-control" && group[0] === "stop-shell" && isViolinVarnishOn())
    return handleStopShell(group.slice(1));
  let daemonArgs = parseDaemonArgs(subcommand, group);
  if (subcommand === "scheduled") return handleScheduledCommand(daemonArgs, configPath, options);
  return handleRemoteControlCommand(daemonArgs, configPath, options);
}
export { runDaemonSubcommand, printDaemonList };
