/**
 * utils/toolCgroup.ts
 *
 * 2.1.316 新增：工具子进程的 cgroup 资源限制（Linux）：探测、创建与写入限制。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-t889g22j.js (52)
 * attribution: placement 52
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readFileSync, mkdirSync, writeFileSync, rmdirSync, statSync } from "fs";
import { totalmem } from "os";
import { posix } from "path";
import { HostScoped } from "./hostScoped.js";
import { onProcessRootHost, isDisklessProcess } from "../bootstrap/state.js";
import { getPlatform } from "./platform.js";
import { env } from "./env.js";
import { isEnvDefinedFalsy } from "./envUtils.js";
import { logForDebugging } from "./debug.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { getErrnoCode, sanitizeErrnoForTelemetry } from "./errors.js";
import { bunWhichSync } from "./which.js";
import { procStatField, statPpid } from "./procStat.js";
import { shellQuoteArgs } from "./bash/bashPipeCommand.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-t889g22j.js:31105-31416 placement
/**
 * 解析 /proc/self/cgroup：优先返回 cgroup v1 的 memory 层级（挂载点与路径），否则返回 v2 统一层级（0::路径）；都没有时返回 undefined。
 */
function parseMemoryCgroup(text) {
  let stat;
  for (let line of text.split(`
`)) {
    let [entry, controller, ...path] = line.split(":");
    if (controller === undefined || path.length === 0) continue;
    let joined = path.join(":");
    if (controller.split(",").includes("memory"))
      return {
        mountRoot: "/sys/fs/cgroup/memory",
        path: joined,
        v2: false,
      };
    if (entry === "0" && controller === "") stat = joined;
  }
  return stat === undefined
    ? undefined
    : {
        mountRoot: "/sys/fs/cgroup",
        path: stat,
        v2: true,
      };
}
//@ chunk-t889g22j.js:31416-31544 placement
var CLAUDE_CODE_BASH = "claude-code-bash";
var CLAUDE_CODE_KEEPER = "claude-code-keeper";
var RESERVED_CGROUP_BYTES = 1073741824;
var MIN_CGROUP_LIMIT_BYTES = RESERVED_CGROUP_BYTES;
var EXCLUDED_TOOL_CLASS_NAMES = ["mcp", "lsp", "hooks", "plugin", "tmux", "helper", "agent"];
//@ chunk-t889g22j.js:31544-31689 placement
class FeatureFlagReaderSlot {
  reader = null;
  subscribeRefresh = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
  read(target, extra) {
    return this.reader ? this.reader(target, extra) : extra;
  }
}
//@ chunk-t889g22j.js:31689-31702 placement
var featureFlagReaderSlot; // deferred: uses FeatureFlagReaderSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-t889g22j.js:31689", () => {
  featureFlagReaderSlot = new FeatureFlagReaderSlot();
});
//@ chunk-t889g22j.js:31702-31776 placement
/**
 * 注册特性开关读取器（带刷新订阅）。
 */
function registerFeatureFlagReader(getFeatureValue_CACHED_MAY_BE_STALE, onGrowthBookRefresh) {
  if (onGrowthBookRefresh !== undefined) featureFlagReaderSlot.subscribeRefresh = onGrowthBookRefresh;
  return featureFlagReaderSlot.register(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-t889g22j.js:31776-31909 placement
class ToolCgroupState {
  dir = undefined;
  layout = undefined;
  limit = 0;
  activatedClasses = new Set();
  pendingPids = new Map();
  pendingUnsubscribe = undefined;
  oomKillsSeen = undefined;
}
//@ chunk-t889g22j.js:31909-31935 placement
var toolCgroupStateByHost; // deferred: uses ToolCgroupState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-t889g22j.js:31909", () => {
  toolCgroupStateByHost = new HostScoped(() => new ToolCgroupState());
});
//@ chunk-t889g22j.js:31935-32947 placement
/**
 * 初始化工具内存 cgroup（只在 Linux/WSL）：环境变量或功能开关决定是否启用；解析当前 cgroup 布局，按内存上限创建子 cgroup（嵌套时复用），记录状态并打点；失败则禁用。
 */
function initToolCgroup() {
  let state = onProcessRootHost(toolCgroupStateByHost);
  if (state.dir !== undefined) return state.dir ?? undefined;
  if (isDisklessProcess()) {
    state.dir = null;
    return;
  }
  let platform = getPlatform();
  if (platform !== "linux" && platform !== "wsl") {
    state.dir = null;
    return;
  }
  let limitSetting = env.CLAUDE_CODE_TOOL_MEMORY_LIMIT?.trim().toLowerCase();
  if (limitSetting && (isEnvDefinedFalsy(limitSetting) || limitSetting === "none")) {
    state.dir = null;
    return;
  }
  let explicitLimit = parseMemorySize(limitSetting);
  if (explicitLimit === undefined && featureFlagReaderSlot.read("tengu_tool_memory_cgroup", false) !== true)
    return;
  try {
    let layout = resolveCgroupLayout(readFileSync("/proc/self/cgroup", "utf8"));
    if (!layout) throw Error("no memory cgroup hierarchy");
    let limitBytes = resolveCgroupLimit(explicitLimit, totalmem());
    if (limitBytes === undefined) {
      state.dir = null;
      logForDebugging("tool cgroup: disabled (host too small for the default cap)");
      logEvent("tengu_tool_cgroup", {
        status: lit("host_too_small"),
      });
      return;
    }
    createCgroupWithLimit(layout, limitBytes);
    state.dir = layout.dir;
    state.layout = layout;
    state.limit = limitBytes;
    logForDebugging(
      `tool cgroup: ${layout.dir} ${layout.reuse ? "(nested: already capped, reusing our own)" : `limit=${limitBytes}`}`,
    );
    logFeatureOk("shell_memory_cgroup");
    logEvent(
      "tengu_tool_cgroup",
      layout.reuse
        ? {
            status: lit("nested"),
          }
        : {
            status: lit("enabled"),
            limit_bytes: limitBytes,
          },
    );
  } catch (error) {
    state.dir = null;
    logForDebugging(`tool cgroup: disabled (${getErrnoCode(error) ?? error})`);
    logFeatureBad("shell_memory_cgroup", sanitizeErrnoForTelemetry(error) ?? "no_hierarchy");
    logEvent("tengu_tool_cgroup", {
      status: lit("disabled"),
    });
  }
  return state.dir ?? undefined;
}
//@ chunk-t889g22j.js:32947-33196 placement
function getToolCgroupDirForClass(cls) {
  if (initToolCgroup() === undefined) return;
  if (cls !== "shell" && getExcludedToolClasses().has(cls)) return;
  let dir = onProcessRootHost(toolCgroupStateByHost);
  let toolCgroupDir = ensureToolCgroupDir(dir);
  if (toolCgroupDir === undefined) return;
  checkOomKills(dir);
  if (!dir.activatedClasses.has(cls)) {
    dir.activatedClasses.add(cls);
    logEvent("tengu_tool_cgroup", {
      status: lit("class_enabled"),
      class: fromEnum(cls),
    });
  }
  return toolCgroupDir;
}
//@ chunk-t889g22j.js:33196-33278 placement
/**
 * 该工具类别是否可使用内存 cgroup。
 */
function isToolCgroupDirUsable(cls) {
  return (
    typeof onProcessRootHost(toolCgroupStateByHost).dir === "string" &&
    (cls === "shell" || !getExcludedToolClasses().has(cls))
  );
}
//@ chunk-t889g22j.js:33278-33766 placement
/**
 * 确认工具 cgroup 目录仍存在，被删除时按布局重新创建；无法恢复时禁用并打点。
 */
function ensureToolCgroupDir(
  dir,
  deps = {
    exists: pathExistsSync,
    mkdirSync,
    writeFileSync,
    rmdirSync,
  },
) {
  if (dir.dir === undefined || dir.dir === null) return;
  try {
    if (deps.exists(dir.dir)) return dir.dir;
    if (dir.layout === undefined || dir.layout.reuse) throw Error("enclosing tool cgroup is gone");
    createCgroupWithLimit(dir.layout, dir.limit, deps);
    logForDebugging(`tool cgroup: ${dir.dir} vanished; re-created`);
    logEvent("tengu_tool_cgroup", {
      status: lit("recreated"),
    });
    return dir.dir;
  } catch (error) {
    dir.dir = null;
    logForDebugging(`tool cgroup: disabled (dir vanished: ${getErrnoCode(error) ?? error})`);
    logEvent("tengu_tool_cgroup", {
      status: lit("vanished"),
    });
    return;
  }
}
//@ chunk-t889g22j.js:33766-33823 placement
function pathExistsSync(path) {
  return (
    statSync(path, {
      throwIfNoEntry: false,
    }) !== undefined
  );
}
//@ chunk-t889g22j.js:33823-33963 placement
function getExcludedToolClasses() {
  let flagValue = env.CLAUDE_CODE_TOOL_MEMORY_CGROUP_EXCLUDE?.trim();
  let excludedToolClasses = parseExcludedToolClasses(flagValue);
  if (excludedToolClasses.has("mcp") || !isMcpCgroupDisabled(!flagValue)) return excludedToolClasses;
  return new Set([...excludedToolClasses, "mcp"]);
}
//@ chunk-t889g22j.js:33963-34114 placement
function parseExcludedToolClasses(flagValue) {
  if (flagValue) return toToolClassSet(flagValue.split(","));
  let featureValue = featureFlagReaderSlot.read("tengu_tool_cgroup_exclude_classes", null);
  if (Array.isArray(featureValue)) return toToolClassSet(featureValue);
  return new Set(EXCLUDED_TOOL_CLASS_NAMES);
}
//@ chunk-t889g22j.js:34114-34278 placement
function isMcpCgroupDisabled(lower) {
  let lower_2 = env.CLAUDE_CODE_MCP_MEMORY_CGROUP?.trim().toLowerCase();
  if (lower_2 && (isEnvDefinedFalsy(lower_2) || lower_2 === "none")) return true;
  return lower && featureFlagReaderSlot.read("tengu_mcp_memory_cgroup", null) === false;
}
//@ chunk-t889g22j.js:34278-34486 placement
function toToolClassSet(values) {
  let set = new Set();
  for (let value of values) {
    let text = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (text === "all-new") {
      EXCLUDED_TOOL_CLASS_NAMES.forEach((part) => set.add(part));
      continue;
    }
    let found = EXCLUDED_TOOL_CLASS_NAMES.find((part_2) => part_2 === text);
    if (found !== undefined) set.add(found);
  }
  return set;
}
//@ chunk-t889g22j.js:34486-34544 placement
/**
 * 生成带 cgroup 的 spawn 选项。
 */
function cgroupSpawnOptions(toolCgroupClass) {
  let toolCgroupDirForClass = getToolCgroupDirForClass(toolCgroupClass);
  return toolCgroupDirForClass === undefined
    ? {}
    : {
        cgroup: toolCgroupDirForClass,
      };
}
//@ chunk-t889g22j.js:34544-34835 placement
/**
 * 把工具命令包装为先把自身写入 cgroup.procs 再 exec 的 /bin/sh 调用；cgroup 不可用时原样返回并标记是否待定。
 */
function wrapCommandInCgroup(cls, command, extra) {
  let toolCgroupDirForClass = getToolCgroupDirForClass(cls);
  if (toolCgroupDirForClass === undefined)
    return {
      command,
      args: [...extra],
      pending: isToolCgroupPending(),
      capped: false,
    };
  if (bunWhichSync(command) === null)
    return {
      command,
      args: [...extra],
      pending: true,
      capped: false,
    };
  return {
    pending: false,
    capped: true,
    command: "/bin/sh",
    args: [
      "-c",
      '{ echo 0 > "$0"/cgroup.procs; } 2>/dev/null; exec "$@"',
      toolCgroupDirForClass,
      command,
      ...extra,
    ],
  };
}
//@ chunk-t889g22j.js:34835-34878 placement
/**
 * 工具 cgroup 目录是否尚未就绪。
 */
function isToolCgroupPending() {
  return onProcessRootHost(toolCgroupStateByHost).dir === undefined;
}
//@ chunk-t889g22j.js:34878-34966 placement
var MAX_PENDING_PIDS = 64;
var CGROUP_IO_DEPS = {
  readStarttime: readStatStartTime,
  writeFileSync,
  readCgroupPids,
  readProcIdentity,
};
//@ chunk-t889g22j.js:34966-35410 placement
/**
 * 在 cgroup 尚未就绪时暂存进程（记录类别、启动时间与是否保持不受限），待开关刷新后再晚绑定；已就绪则直接绑定；暂存数量有上限。
 */
function parkPendingPid(cls, pid, shouldStayUncapped, deps = CGROUP_IO_DEPS) {
  try {
    if (!pid) return;
    initToolCgroup();
    let state = onProcessRootHost(toolCgroupStateByHost);
    if (state.dir === null) return;
    let starttime = deps.readStarttime(pid);
    if (starttime === undefined) return;
    let pendingInfo = {
      cls,
      starttime,
      shouldStayUncapped,
    };
    if (state.dir !== undefined) {
      lateAttachPid(pid, pendingInfo, deps);
      return;
    }
    dropRecycledPendingPids(state, deps);
    if (state.pendingPids.size >= MAX_PENDING_PIDS) {
      logForDebugging(`tool cgroup: pending pid ${pid} not parked (full)`);
      return;
    }
    state.pendingPids.set(pid, pendingInfo);
    state.pendingUnsubscribe ??= featureFlagReaderSlot.subscribeRefresh?.(() => attachPendingPids());
  } catch (error) {
    logForDebugging(`tool cgroup: pending pid not parked (${error})`);
  }
}
//@ chunk-t889g22j.js:35410-35670 placement
function attachPendingPids(deps = CGROUP_IO_DEPS) {
  let state = onProcessRootHost(toolCgroupStateByHost);
  try {
    initToolCgroup();
    if (state.dir === undefined) {
      dropRecycledPendingPids(state, deps);
      return;
    }
    if (state.dir !== null)
      for (let [pid, starttime] of state.pendingPids) lateAttachPid(pid, starttime, deps);
  } catch (error) {
    logForDebugging(`tool cgroup: late attach skipped (${error})`);
  }
  state.pendingPids.clear();
  state.pendingUnsubscribe?.();
  state.pendingUnsubscribe = undefined;
}
//@ chunk-t889g22j.js:35670-36143 placement
/**
 * 把暂存的进程晚绑定到其类别的工具 cgroup（启动时间不符或应保持不受限时跳过），并一并移动其后代进程。
 */
function lateAttachPid(pid, { cls, starttime, shouldStayUncapped }, deps) {
  let cgroupDir = getToolCgroupDirForClass(cls);
  if (cgroupDir === undefined || deps.readStarttime(pid) !== starttime) return;
  try {
    if (shouldStayUncapped?.()) {
      logForDebugging(`tool cgroup: ${cls} pid ${pid} left uncapped`);
      return;
    }
    let procsFile = posix.join(cgroupDir, "cgroup.procs");
    deps.writeFileSync(procsFile, String(pid));
    let movedCount = 1;
    let layout = onProcessRootHost(toolCgroupStateByHost).layout;
    if (layout !== undefined && !layout.reuse)
      movedCount += moveDescendants(pid, layout.selfDir, procsFile, deps, "attached");
    logForDebugging(
      `tool cgroup: late-attached ${cls} pid ${pid} (${movedCount} process${movedCount === 1 ? "" : "es"})`,
    );
  } catch (error) {
    logForDebugging(`tool cgroup: late attach of pid ${pid} failed (${getErrnoCode(error) ?? error})`);
  }
}
//@ chunk-t889g22j.js:36143-36251 placement
function dropRecycledPendingPids(pending, deps) {
  for (let [pid, { starttime }] of pending.pendingPids)
    if (deps.readStarttime(pid) !== starttime) pending.pendingPids.delete(pid);
}
//@ chunk-t889g22j.js:36251-36323 placement
function readStatStartTime(pid) {
  try {
    return procStatField(readFileSync(`/proc/${pid}/stat`, "utf8"));
  } catch {
    return;
  }
}
//@ chunk-t889g22j.js:36323-36465 placement
function readProcIdentity(pid) {
  try {
    let statText = readFileSync(`/proc/${pid}/stat`, "utf8");
    let ppid = statPpid(statText);
    let starttime = procStatField(statText);
    return ppid === undefined || starttime === undefined
      ? undefined
      : {
          ppid,
          starttime,
        };
  } catch {
    return;
  }
}
//@ chunk-t889g22j.js:36465-36595 placement
function readCgroupPids(dir) {
  return readFileSync(posix.join(dir, "cgroup.procs"), "utf8")
    .split(
      `
`,
    )
    .map((line) => Number.parseInt(line, 10))
    .filter((pid) => !Number.isNaN(pid));
}
//@ chunk-t889g22j.js:36595-36685 placement
function oomKillCountFromText(text) {
  let match = /^oom_kill (\d+)$/m.exec(text);
  return match ? Number.parseInt(match[1], 10) : undefined;
}
//@ chunk-t889g22j.js:36685-36763 placement
function oomEventsPath(layout) {
  return posix.join(layout.dir, layout.v2 ? "memory.events" : "memory.oom_control");
}
//@ chunk-t889g22j.js:36763-36796 placement
function readFileText(path) {
  return readFileSync(path, "utf8");
}
//@ chunk-t889g22j.js:36796-36849 placement
function readOomKillCount(path, readFile = readFileText) {
  try {
    return oomKillCountFromText(readFile(path));
  } catch {
    return;
  }
}
//@ chunk-t889g22j.js:36849-36939 placement
/**
 * 取当前工具 cgroup 的 OOM kill 计数。
 */
function currentOomKillCount(readFile = readFileText) {
  let { dir, layout } = onProcessRootHost(toolCgroupStateByHost);
  if (!dir || layout === undefined) return;
  return readOomKillCount(oomEventsPath(layout), readFile);
}
//@ chunk-t889g22j.js:36939-37053 placement
/**
 * 检查自上次以来工具 cgroup 是否发生过 OOM kill。
 */
function hasNewOomKills(deps, state = readFileText) {
  let hostState = onProcessRootHost(toolCgroupStateByHost);
  let seenCount = deps ?? hostState.oomKillsSeen;
  let currentCount = currentOomKillCount(state);
  checkOomKills(hostState, state, currentCount);
  return seenCount === undefined || currentCount === undefined ? undefined : currentCount > seenCount;
}
//@ chunk-t889g22j.js:37053-37450 placement
/**
 * 读取工具 cgroup 的 OOM kill 计数，有新增时记日志并打点。
 */
function checkOomKills(state, readFile = readFileText, extra) {
  try {
    let layout = state.layout;
    if (!state.dir || layout === undefined || layout.reuse) return;
    let oomKills = extra ?? readOomKillCount(oomEventsPath(layout), readFile);
    if (oomKills === undefined) return;
    let oomKillsSeen = state.oomKillsSeen;
    state.oomKillsSeen = oomKills;
    if (oomKillsSeen === undefined || oomKills <= oomKillsSeen) return;
    logForDebugging(
      `tool cgroup: OOM killer fired ${oomKills - oomKillsSeen} time(s) in ${layout.dir} since last check`,
    );
    logEvent("tengu_tool_cgroup", {
      status: lit("oom_kill"),
      oom_kills: oomKills - oomKillsSeen,
      cgroup_v2: layout.v2,
    });
  } catch (error) {
    logForDebugging(`tool cgroup: oom_kill check skipped (${error})`);
  }
}
//@ chunk-t889g22j.js:37450-37561 placement
/**
 * 返回读取指定类别工具 cgroup OOM kill 计数的函数，cgroup 不可用时返回 undefined。
 */
function getOomKillCounter(cls, readFile = readFileText) {
  let toolCgroupDirForClass = getToolCgroupDirForClass(cls);
  let layout = onProcessRootHost(toolCgroupStateByHost).layout;
  if (toolCgroupDirForClass === undefined || layout === undefined) return;
  let eventsPath = oomEventsPath(layout);
  return () => readOomKillCount(eventsPath, readFile);
}
//@ chunk-t889g22j.js:37561-37697 placement
/**
 * 在 shell 命令前加上把自身加入工具 cgroup 的前缀，cgroup 不可用时原样返回。
 */
function prefixCgroupJoinCommand(cls, command) {
  let toolCgroupDirForClass = getToolCgroupDirForClass(cls);
  if (toolCgroupDirForClass === undefined) return command;
  return `sh -c '{ echo $PPID > "$1"/cgroup.procs; } 2>/dev/null' sh ${shellQuoteArgs([toolCgroupDirForClass])}; ${command}`;
}
//@ chunk-t889g22j.js:37697-38322 placement
/**
 * 把进程（及其后代）从工具 cgroup 移回本进程的 cgroup：cgroup 尚未初始化时只是取消暂存；启动时间不符（进程已回收）时不处理。
 */
function releasePidFromCgroup(root, starttime, deps = CGROUP_IO_DEPS) {
  try {
    let state = onProcessRootHost(toolCgroupStateByHost);
    if (state.dir === undefined) {
      if (state.pendingPids.get(root)?.starttime !== starttime) return false;
      state.pendingPids.delete(root);
      logForDebugging(`tool cgroup: unparked pid ${root}; it stays uncapped`);
      return true;
    }
    let layout = state.layout;
    if (!state.dir || layout === undefined || layout.reuse) return false;
    if (deps.readStarttime(root) !== starttime) return false;
    let procsFile = posix.join(layout.selfDir, "cgroup.procs");
    deps.writeFileSync(procsFile, String(root));
    let movedCount = 1 + moveDescendants(root, layout.dir, procsFile, deps, "released");
    logForDebugging(
      `tool cgroup: released pid ${root} (${movedCount} process${movedCount === 1 ? "" : "es"}) to ${layout.selfDir}`,
    );
    logEvent("tengu_tool_cgroup", {
      status: lit("released"),
      released_count: movedCount,
    });
    return true;
  } catch (error) {
    logForDebugging(`tool cgroup: release of pid ${root} failed (${getErrnoCode(error) ?? error})`);
    return false;
  }
}
//@ chunk-t889g22j.js:38322-38631 placement
/**
 * 把进程的后代逐个写入目标 cgroup（跳过已退出或 pid 被复用的），返回移动数量。
 */
function moveDescendants(root, procsFile, procsFile_2, deps, actionLabel) {
  let moved = 0;
  for (let { pid, starttime } of listDescendantPids(root, procsFile, deps)) {
    if (deps.readStarttime(pid) !== starttime) {
      logForDebugging(`tool cgroup: descendant ${pid} of pid ${root} exited or was recycled; skipped`);
      continue;
    }
    try {
      deps.writeFileSync(procsFile_2, String(pid));
      moved++;
    } catch (error) {
      logForDebugging(
        `tool cgroup: descendant ${pid} of pid ${root} not ${actionLabel} (${getErrnoCode(error) ?? error})`,
      );
    }
  }
  return moved;
}
//@ chunk-t889g22j.js:38631-39096 placement
/**
 * 读取 cgroup 成员并按父子关系建立进程树，返回指定进程的所有后代（pid 与启动时间）；成员无法读取时返回空列表。
 */
function listDescendantPids(deps, procsFile, procDeps) {
  let memberPids;
  try {
    memberPids = procDeps.readCgroupPids(procsFile);
  } catch (pid) {
    logForDebugging(
      `tool cgroup: members of ${procsFile} unreadable (${getErrnoCode(pid) ?? pid}); moving pid ${deps} alone`,
    );
    return [];
  }
  let childrenByParent = new Map();
  for (let memberPid of memberPids) {
    if (memberPid === deps) continue;
    let identity;
    try {
      identity = procDeps.readProcIdentity(memberPid);
    } catch {
      identity = undefined;
    }
    if (identity === undefined) continue;
    let entry = {
      pid: memberPid,
      starttime: identity.starttime,
    };
    let siblings = childrenByParent.get(identity.ppid);
    if (siblings) siblings.push(entry);
    else childrenByParent.set(identity.ppid, [entry]);
  }
  let descendants = [];
  let queue = [deps];
  for (let idx = 0; idx < queue.length; idx++)
    for (let child of childrenByParent.get(queue[idx]) ?? []) {
      descendants.push(child);
      queue.push(child.pid);
    }
  return descendants;
}
//@ chunk-t889g22j.js:39096-39393 placement
function createCgroupWithLimit(
  layout,
  deps,
  fs = {
    mkdirSync,
    writeFileSync,
    rmdirSync,
  },
) {
  if (layout.reuse) return;
  let createdDir = true;
  try {
    fs.mkdirSync(layout.dir);
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") throw error;
    createdDir = false;
  }
  try {
    fs.writeFileSync(
      posix.join(layout.dir, layout.v2 ? "memory.max" : "memory.limit_in_bytes"),
      String(deps),
    );
  } catch (error) {
    if (createdDir)
      try {
        fs.rmdirSync?.(layout.dir);
      } catch {}
    throw error;
  }
}
//@ chunk-t889g22j.js:39393-39499 placement
function resolveCgroupLayout(text) {
  let memoryCgroup = parseMemoryCgroup(text);
  if (!memoryCgroup) return;
  return buildCgroupLayout(
    memoryCgroup.mountRoot,
    memoryCgroup.path,
    memoryCgroup.v2 ? posix.dirname(memoryCgroup.path) : memoryCgroup.path,
    memoryCgroup.v2,
  );
}
//@ chunk-t889g22j.js:39499-39695 placement
function getKeeperCgroupDir(text) {
  let memoryCgroup = parseMemoryCgroup(text);
  if (!memoryCgroup) return;
  let parts = memoryCgroup.path.split("/");
  let index = parts.indexOf(CLAUDE_CODE_BASH);
  if (index < 0) return;
  let joined = posix.join(memoryCgroup.mountRoot, ...parts.slice(0, index));
  return memoryCgroup.v2
    ? {
        dir: posix.join(joined, CLAUDE_CODE_KEEPER),
        create: true,
      }
    : {
        dir: joined,
        create: false,
      };
}
//@ chunk-t889g22j.js:39695-39783 placement
var KEEPER_CGROUP_IO_DEPS = {
  readSelfCgroup: () => readFileSync("/proc/self/cgroup", "utf8"),
  mkdirSync,
  writeFileSync,
};
//@ chunk-t889g22j.js:39783-40050 placement
function ensureKeeperCgroupDir(deps) {
  let platform = getPlatform();
  if (platform !== "linux" && platform !== "wsl") return;
  try {
    let keeperCgroupDir = getKeeperCgroupDir(deps.readSelfCgroup());
    if (keeperCgroupDir === undefined) return;
    if (keeperCgroupDir.create)
      try {
        deps.mkdirSync(keeperCgroupDir.dir);
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
    return keeperCgroupDir.dir;
  } catch (error) {
    logForDebugging(`tool cgroup: keeper dir unavailable (${getErrnoCode(error) ?? error})`);
    return;
  }
}
//@ chunk-t889g22j.js:40050-40287 placement
/**
 * 把 keeper 进程移入 keeper cgroup 目录，失败只记日志。
 */
function moveKeeperPid(pid, deps = KEEPER_CGROUP_IO_DEPS) {
  if (!pid) return;
  let keeperCgroupDir = ensureKeeperCgroupDir(deps);
  if (keeperCgroupDir === undefined) return;
  try {
    deps.writeFileSync(posix.join(keeperCgroupDir, "cgroup.procs"), String(pid));
    logForDebugging(`tool cgroup: keeper pid ${pid} moved to ${keeperCgroupDir}`);
  } catch (error) {
    logForDebugging(`tool cgroup: keeper pid ${pid} not moved (${getErrnoCode(error) ?? error})`);
  }
}
//@ chunk-t889g22j.js:40287-40350 placement
/**
 * 生成 keeper cgroup 的 spawn 选项。
 */
function keeperCgroupSpawnOptions(deps = KEEPER_CGROUP_IO_DEPS) {
  let keeperCgroupDir = ensureKeeperCgroupDir(deps);
  return keeperCgroupDir === undefined
    ? {}
    : {
        cgroup: keeperCgroupDir,
      };
}
//@ chunk-t889g22j.js:40350-40507 placement
function buildCgroupLayout(mountRoot, path, classDir, v2) {
  let included = path.split("/").includes(CLAUDE_CODE_BASH);
  let joined = posix.join(mountRoot, path, ".");
  return included
    ? {
        dir: joined,
        v2,
        reuse: true,
        selfDir: joined,
      }
    : {
        dir: posix.join(mountRoot, classDir, CLAUDE_CODE_BASH),
        v2,
        reuse: false,
        selfDir: joined,
      };
}
//@ chunk-t889g22j.js:40507-40565 placement
function defaultCgroupLimit(totalBytes) {
  return Math.floor(totalBytes - Math.max(2 * RESERVED_CGROUP_BYTES, totalBytes * 0.15));
}
//@ chunk-t889g22j.js:40565-40639 placement
function resolveCgroupLimit(explicitLimit, totalBytes) {
  if (explicitLimit !== undefined) return explicitLimit;
  let limit = defaultCgroupLimit(totalBytes);
  return limit >= MIN_CGROUP_LIMIT_BYTES ? limit : undefined;
}
//@ chunk-t889g22j.js:40639-40835 placement
function parseMemorySize(limitSetting) {
  let match = /^(\d+(?:\.\d+)?)\s*([kmgt]?)(?:i?b)?$/i.exec(limitSetting?.trim() ?? "");
  if (!match) return;
  let floored = Math.floor(Number(match[1]) * 1024 ** " kmgt".indexOf((match[2] || " ").toLowerCase()));
  return floored >= 1 ? floored : undefined;
}
//@ chunk-t889g22j.js:40835-40919 placement
function helperCgroupSpawnOptions({ useToolMemoryCgroup = true, toolCgroupClass = "helper" }) {
  return useToolMemoryCgroup ? cgroupSpawnOptions(toolCgroupClass) : {};
}
//@ chunk-t889g22j.js:40919-40942 placement
function isToolMemoryCgroupDisabled() {
  return false;
}
export {
  wrapCommandInCgroup,
  parkPendingPid,
  cgroupSpawnOptions,
  isToolCgroupPending,
  moveKeeperPid,
  keeperCgroupSpawnOptions,
  hasNewOomKills,
  currentOomKillCount,
  parseMemoryCgroup,
  toolCgroupStateByHost,
  CGROUP_IO_DEPS,
  releasePidFromCgroup,
  registerFeatureFlagReader,
  isToolCgroupDirUsable,
  prefixCgroupJoinCommand,
  helperCgroupSpawnOptions,
  isToolMemoryCgroupDisabled,
  getOomKillCounter,
};
