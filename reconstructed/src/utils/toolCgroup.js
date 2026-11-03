/**
 * utils/toolCgroup.ts
 *
 * 2.1.316 新增：工具子进程的 cgroup 资源限制（Linux）：探测、创建与写入限制。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m4p5zn6n.js (52)
 * attribution: placement 52
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

//@ chunk-m4p5zn6n.js:31106-31417 placement
/**
 * 解析 /proc/self/cgroup：优先返回 cgroup v1 的 memory 层级（挂载点与路径），否则返回 v2 统一层级（0::路径）；都没有时返回 undefined。
 */
function parseMemoryCgroup(e) {
  let n;
  for (let line of e.split(`
`)) {
    let [o, s, ...u] = line.split(":");
    if (s === undefined || u.length === 0) continue;
    let joined = u.join(":");
    if (s.split(",").includes("memory"))
      return {
        mountRoot: "/sys/fs/cgroup/memory",
        path: joined,
        v2: false,
      };
    if (o === "0" && s === "") n = joined;
  }
  return n === undefined
    ? undefined
    : {
        mountRoot: "/sys/fs/cgroup",
        path: n,
        v2: true,
      };
}
//@ chunk-m4p5zn6n.js:31417-31545 placement
var CLAUDE_CODE_BASH = "claude-code-bash";
var CLAUDE_CODE_KEEPER = "claude-code-keeper";
var RESERVED_CGROUP_BYTES = 1073741824;
var MIN_CGROUP_LIMIT_BYTES = RESERVED_CGROUP_BYTES;
var EXCLUDED_TOOL_CLASS_NAMES = ["mcp", "lsp", "hooks", "plugin", "tmux", "helper", "agent"];
//@ chunk-m4p5zn6n.js:31545-31690 placement
class FeatureFlagReaderSlot {
  reader = null;
  subscribeRefresh = null;
  register(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
  read(e, n) {
    return this.reader ? this.reader(e, n) : n;
  }
}
//@ chunk-m4p5zn6n.js:31690-31703 placement
var featureFlagReaderSlot = new FeatureFlagReaderSlot();
//@ chunk-m4p5zn6n.js:31703-31777 placement
/**
 * 注册特性开关读取器（带刷新订阅）。
 */
function registerFeatureFlagReader(getFeatureValue_CACHED_MAY_BE_STALE, onGrowthBookRefresh) {
  if (onGrowthBookRefresh !== undefined) featureFlagReaderSlot.subscribeRefresh = onGrowthBookRefresh;
  return featureFlagReaderSlot.register(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-m4p5zn6n.js:31777-31910 placement
class ToolCgroupState {
  dir = undefined;
  layout = undefined;
  limit = 0;
  activatedClasses = new Set();
  pendingPids = new Map();
  pendingUnsubscribe = undefined;
  oomKillsSeen = undefined;
}
//@ chunk-m4p5zn6n.js:31910-31934 placement
var toolCgroupStateByHost = new HostScoped(() => new ToolCgroupState());
//@ chunk-m4p5zn6n.js:31934-32944 placement
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
//@ chunk-m4p5zn6n.js:32944-33191 placement
function getToolCgroupDirForClass(e) {
  if (initToolCgroup() === undefined) return;
  if (e !== "shell" && getExcludedToolClasses().has(e)) return;
  let n = onProcessRootHost(toolCgroupStateByHost);
  let toolCgroupDir = ensureToolCgroupDir(n);
  if (toolCgroupDir === undefined) return;
  checkOomKills(n);
  if (!n.activatedClasses.has(e)) {
    n.activatedClasses.add(e);
    logEvent("tengu_tool_cgroup", {
      status: lit("class_enabled"),
      class: fromEnum(e),
    });
  }
  return toolCgroupDir;
}
//@ chunk-m4p5zn6n.js:33191-33271 placement
/**
 * 该工具类别是否可使用内存 cgroup。
 */
function isToolCgroupDirUsable(e) {
  return (
    typeof onProcessRootHost(toolCgroupStateByHost).dir === "string" &&
    (e === "shell" || !getExcludedToolClasses().has(e))
  );
}
//@ chunk-m4p5zn6n.js:33271-33759 placement
/**
 * 确认工具 cgroup 目录仍存在，被删除时按布局重新创建；无法恢复时禁用并打点。
 */
function ensureToolCgroupDir(
  e,
  n = {
    exists: pathExistsSync,
    mkdirSync,
    writeFileSync,
    rmdirSync,
  },
) {
  if (e.dir === undefined || e.dir === null) return;
  try {
    if (n.exists(e.dir)) return e.dir;
    if (e.layout === undefined || e.layout.reuse) throw Error("enclosing tool cgroup is gone");
    createCgroupWithLimit(e.layout, e.limit, n);
    logForDebugging(`tool cgroup: ${e.dir} vanished; re-created`);
    logEvent("tengu_tool_cgroup", {
      status: lit("recreated"),
    });
    return e.dir;
  } catch (error) {
    e.dir = null;
    logForDebugging(`tool cgroup: disabled (dir vanished: ${getErrnoCode(error) ?? error})`);
    logEvent("tengu_tool_cgroup", {
      status: lit("vanished"),
    });
    return;
  }
}
//@ chunk-m4p5zn6n.js:33759-33816 placement
function pathExistsSync(e) {
  return (
    statSync(e, {
      throwIfNoEntry: false,
    }) !== undefined
  );
}
//@ chunk-m4p5zn6n.js:33816-33956 placement
function getExcludedToolClasses() {
  let trimmed = env.CLAUDE_CODE_TOOL_MEMORY_CGROUP_EXCLUDE?.trim();
  let excludedToolClasses = parseExcludedToolClasses(trimmed);
  if (excludedToolClasses.has("mcp") || !isMcpCgroupDisabled(!trimmed)) return excludedToolClasses;
  return new Set([...excludedToolClasses, "mcp"]);
}
//@ chunk-m4p5zn6n.js:33956-34107 placement
function parseExcludedToolClasses(e) {
  if (e) return toToolClassSet(e.split(","));
  let n = featureFlagReaderSlot.read("tengu_tool_cgroup_exclude_classes", null);
  if (Array.isArray(n)) return toToolClassSet(n);
  return new Set(EXCLUDED_TOOL_CLASS_NAMES);
}
//@ chunk-m4p5zn6n.js:34107-34271 placement
function isMcpCgroupDisabled(e) {
  let lower = env.CLAUDE_CODE_MCP_MEMORY_CGROUP?.trim().toLowerCase();
  if (lower && (isEnvDefinedFalsy(lower) || lower === "none")) return true;
  return e && featureFlagReaderSlot.read("tengu_mcp_memory_cgroup", null) === false;
}
//@ chunk-m4p5zn6n.js:34271-34479 placement
function toToolClassSet(e) {
  let n = new Set();
  for (let r of e) {
    let o = typeof r === "string" ? r.trim().toLowerCase() : "";
    if (o === "all-new") {
      EXCLUDED_TOOL_CLASS_NAMES.forEach((u) => n.add(u));
      continue;
    }
    let found = EXCLUDED_TOOL_CLASS_NAMES.find((u) => u === o);
    if (found !== undefined) n.add(found);
  }
  return n;
}
//@ chunk-m4p5zn6n.js:34479-34537 placement
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
//@ chunk-m4p5zn6n.js:34537-34828 placement
/**
 * 把工具命令包装为先把自身写入 cgroup.procs 再 exec 的 /bin/sh 调用；cgroup 不可用时原样返回并标记是否待定。
 */
function wrapCommandInCgroup(e, n, r) {
  let toolCgroupDirForClass = getToolCgroupDirForClass(e);
  if (toolCgroupDirForClass === undefined)
    return {
      command: n,
      args: [...r],
      pending: isToolCgroupPending(),
      capped: false,
    };
  if (bunWhichSync(n) === null)
    return {
      command: n,
      args: [...r],
      pending: true,
      capped: false,
    };
  return {
    pending: false,
    capped: true,
    command: "/bin/sh",
    args: ["-c", '{ echo 0 > "$0"/cgroup.procs; } 2>/dev/null; exec "$@"', toolCgroupDirForClass, n, ...r],
  };
}
//@ chunk-m4p5zn6n.js:34828-34869 placement
/**
 * 工具 cgroup 目录是否尚未就绪。
 */
function isToolCgroupPending() {
  return onProcessRootHost(toolCgroupStateByHost).dir === undefined;
}
//@ chunk-m4p5zn6n.js:34869-34957 placement
var MAX_PENDING_PIDS = 64;
var CGROUP_IO_DEPS = {
  readStarttime: readStatStartTime,
  writeFileSync,
  readCgroupPids,
  readProcIdentity,
};
//@ chunk-m4p5zn6n.js:34957-35399 placement
/**
 * 在 cgroup 尚未就绪时暂存进程（记录类别、启动时间与是否保持不受限），待开关刷新后再晚绑定；已就绪则直接绑定；暂存数量有上限。
 */
function parkPendingPid(cls, pid, shouldStayUncapped, o = CGROUP_IO_DEPS) {
  try {
    if (!pid) return;
    initToolCgroup();
    let state = onProcessRootHost(toolCgroupStateByHost);
    if (state.dir === null) return;
    let starttime = o.readStarttime(pid);
    if (starttime === undefined) return;
    let pendingInfo = {
      cls,
      starttime,
      shouldStayUncapped,
    };
    if (state.dir !== undefined) {
      lateAttachPid(pid, pendingInfo, o);
      return;
    }
    dropRecycledPendingPids(state, o);
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
//@ chunk-m4p5zn6n.js:35399-35657 placement
function attachPendingPids(e = CGROUP_IO_DEPS) {
  let n = onProcessRootHost(toolCgroupStateByHost);
  try {
    initToolCgroup();
    if (n.dir === undefined) {
      dropRecycledPendingPids(n, e);
      return;
    }
    if (n.dir !== null) for (let [r, o] of n.pendingPids) lateAttachPid(r, o, e);
  } catch (error) {
    logForDebugging(`tool cgroup: late attach skipped (${error})`);
  }
  n.pendingPids.clear();
  n.pendingUnsubscribe?.();
  n.pendingUnsubscribe = undefined;
}
//@ chunk-m4p5zn6n.js:35657-36128 placement
/**
 * 把暂存的进程晚绑定到其类别的工具 cgroup（启动时间不符或应保持不受限时跳过），并一并移动其后代进程。
 */
function lateAttachPid(e, { cls, starttime, shouldStayUncapped }, s) {
  let cgroupDir = getToolCgroupDirForClass(cls);
  if (cgroupDir === undefined || s.readStarttime(e) !== starttime) return;
  try {
    if (shouldStayUncapped?.()) {
      logForDebugging(`tool cgroup: ${cls} pid ${e} left uncapped`);
      return;
    }
    let procsFile = posix.join(cgroupDir, "cgroup.procs");
    s.writeFileSync(procsFile, String(e));
    let movedCount = 1;
    let layout = onProcessRootHost(toolCgroupStateByHost).layout;
    if (layout !== undefined && !layout.reuse)
      movedCount += moveDescendants(e, layout.selfDir, procsFile, s, "attached");
    logForDebugging(
      `tool cgroup: late-attached ${cls} pid ${e} (${movedCount} process${movedCount === 1 ? "" : "es"})`,
    );
  } catch (error) {
    logForDebugging(`tool cgroup: late attach of pid ${e} failed (${getErrnoCode(error) ?? error})`);
  }
}
//@ chunk-m4p5zn6n.js:36128-36236 placement
function dropRecycledPendingPids(e, n) {
  for (let [r, { starttime: o }] of e.pendingPids) if (n.readStarttime(r) !== o) e.pendingPids.delete(r);
}
//@ chunk-m4p5zn6n.js:36236-36308 placement
function readStatStartTime(e) {
  try {
    return procStatField(readFileSync(`/proc/${e}/stat`, "utf8"));
  } catch {
    return;
  }
}
//@ chunk-m4p5zn6n.js:36308-36450 placement
function readProcIdentity(e) {
  try {
    let file = readFileSync(`/proc/${e}/stat`, "utf8");
    let r = statPpid(file);
    let o = procStatField(file);
    return r === undefined || o === undefined
      ? undefined
      : {
          ppid: r,
          starttime: o,
        };
  } catch {
    return;
  }
}
//@ chunk-m4p5zn6n.js:36450-36580 placement
function readCgroupPids(e) {
  return readFileSync(posix.join(e, "cgroup.procs"), "utf8")
    .split(
      `
`,
    )
    .map((line) => Number.parseInt(line, 10))
    .filter((n) => !Number.isNaN(n));
}
//@ chunk-m4p5zn6n.js:36580-36670 placement
function oomKillCountFromText(e) {
  let match = /^oom_kill (\d+)$/m.exec(e);
  return match ? Number.parseInt(match[1], 10) : undefined;
}
//@ chunk-m4p5zn6n.js:36670-36748 placement
function oomEventsPath(layout) {
  return posix.join(layout.dir, layout.v2 ? "memory.events" : "memory.oom_control");
}
//@ chunk-m4p5zn6n.js:36748-36781 placement
function readFileText(e) {
  return readFileSync(e, "utf8");
}
//@ chunk-m4p5zn6n.js:36781-36834 placement
function readOomKillCount(e, n = readFileText) {
  try {
    return oomKillCountFromText(n(e));
  } catch {
    return;
  }
}
//@ chunk-m4p5zn6n.js:36834-36922 placement
/**
 * 取当前工具 cgroup 的 OOM kill 计数。
 */
function currentOomKillCount(e = readFileText) {
  let { dir, layout } = onProcessRootHost(toolCgroupStateByHost);
  if (!dir || layout === undefined) return;
  return readOomKillCount(oomEventsPath(layout), e);
}
//@ chunk-m4p5zn6n.js:36922-37034 placement
/**
 * 检查自上次以来工具 cgroup 是否发生过 OOM kill。
 */
function hasNewOomKills(e, n = readFileText) {
  let r = onProcessRootHost(toolCgroupStateByHost);
  let o = e ?? r.oomKillsSeen;
  let s = currentOomKillCount(n);
  checkOomKills(r, n, s);
  return o === undefined || s === undefined ? undefined : s > o;
}
//@ chunk-m4p5zn6n.js:37034-37431 placement
/**
 * 读取工具 cgroup 的 OOM kill 计数，有新增时记日志并打点。
 */
function checkOomKills(e, n = readFileText, r) {
  try {
    let layout = e.layout;
    if (!e.dir || layout === undefined || layout.reuse) return;
    let oomKills = r ?? readOomKillCount(oomEventsPath(layout), n);
    if (oomKills === undefined) return;
    let oomKillsSeen = e.oomKillsSeen;
    e.oomKillsSeen = oomKills;
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
//@ chunk-m4p5zn6n.js:37431-37540 placement
/**
 * 返回读取指定类别工具 cgroup OOM kill 计数的函数，cgroup 不可用时返回 undefined。
 */
function getOomKillCounter(e, n = readFileText) {
  let toolCgroupDirForClass = getToolCgroupDirForClass(e);
  let layout = onProcessRootHost(toolCgroupStateByHost).layout;
  if (toolCgroupDirForClass === undefined || layout === undefined) return;
  let s = oomEventsPath(layout);
  return () => readOomKillCount(s, n);
}
//@ chunk-m4p5zn6n.js:37540-37676 placement
/**
 * 在 shell 命令前加上把自身加入工具 cgroup 的前缀，cgroup 不可用时原样返回。
 */
function prefixCgroupJoinCommand(e, command) {
  let toolCgroupDirForClass = getToolCgroupDirForClass(e);
  if (toolCgroupDirForClass === undefined) return command;
  return `sh -c '{ echo $PPID > "$1"/cgroup.procs; } 2>/dev/null' sh ${shellQuoteArgs([toolCgroupDirForClass])}; ${command}`;
}
//@ chunk-m4p5zn6n.js:37676-38299 placement
/**
 * 把进程（及其后代）从工具 cgroup 移回本进程的 cgroup：cgroup 尚未初始化时只是取消暂存；启动时间不符（进程已回收）时不处理。
 */
function releasePidFromCgroup(pid, starttime, r = CGROUP_IO_DEPS) {
  try {
    let state = onProcessRootHost(toolCgroupStateByHost);
    if (state.dir === undefined) {
      if (state.pendingPids.get(pid)?.starttime !== starttime) return false;
      state.pendingPids.delete(pid);
      logForDebugging(`tool cgroup: unparked pid ${pid}; it stays uncapped`);
      return true;
    }
    let layout = state.layout;
    if (!state.dir || layout === undefined || layout.reuse) return false;
    if (r.readStarttime(pid) !== starttime) return false;
    let procsFile = posix.join(layout.selfDir, "cgroup.procs");
    r.writeFileSync(procsFile, String(pid));
    let movedCount = 1 + moveDescendants(pid, layout.dir, procsFile, r, "released");
    logForDebugging(
      `tool cgroup: released pid ${pid} (${movedCount} process${movedCount === 1 ? "" : "es"}) to ${layout.selfDir}`,
    );
    logEvent("tengu_tool_cgroup", {
      status: lit("released"),
      released_count: movedCount,
    });
    return true;
  } catch (error) {
    logForDebugging(`tool cgroup: release of pid ${pid} failed (${getErrnoCode(error) ?? error})`);
    return false;
  }
}
//@ chunk-m4p5zn6n.js:38299-38608 placement
/**
 * 把进程的后代逐个写入目标 cgroup（跳过已退出或 pid 被复用的），返回移动数量。
 */
function moveDescendants(e, n, procsFile, o, s) {
  let u = 0;
  for (let { pid, starttime } of listDescendantPids(e, n, o)) {
    if (o.readStarttime(pid) !== starttime) {
      logForDebugging(`tool cgroup: descendant ${pid} of pid ${e} exited or was recycled; skipped`);
      continue;
    }
    try {
      o.writeFileSync(procsFile, String(pid));
      u++;
    } catch (error) {
      logForDebugging(
        `tool cgroup: descendant ${pid} of pid ${e} not ${s} (${getErrnoCode(error) ?? error})`,
      );
    }
  }
  return u;
}
//@ chunk-m4p5zn6n.js:38608-39073 placement
/**
 * 读取 cgroup 成员并按父子关系建立进程树，返回指定进程的所有后代（pid 与启动时间）；成员无法读取时返回空列表。
 */
function listDescendantPids(e, n, r) {
  let memberPids;
  try {
    memberPids = r.readCgroupPids(n);
  } catch (pid) {
    logForDebugging(
      `tool cgroup: members of ${n} unreadable (${getErrnoCode(pid) ?? pid}); moving pid ${e} alone`,
    );
    return [];
  }
  let childrenByParent = new Map();
  for (let memberPid of memberPids) {
    if (memberPid === e) continue;
    let identity;
    try {
      identity = r.readProcIdentity(memberPid);
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
  let queue = [e];
  for (let idx = 0; idx < queue.length; idx++)
    for (let f of childrenByParent.get(queue[idx]) ?? []) {
      descendants.push(f);
      queue.push(f.pid);
    }
  return descendants;
}
//@ chunk-m4p5zn6n.js:39073-39370 placement
function createCgroupWithLimit(
  layout,
  n,
  r = {
    mkdirSync,
    writeFileSync,
    rmdirSync,
  },
) {
  if (layout.reuse) return;
  let o = true;
  try {
    r.mkdirSync(layout.dir);
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") throw error;
    o = false;
  }
  try {
    r.writeFileSync(posix.join(layout.dir, layout.v2 ? "memory.max" : "memory.limit_in_bytes"), String(n));
  } catch (error) {
    if (o)
      try {
        r.rmdirSync?.(layout.dir);
      } catch {}
    throw error;
  }
}
//@ chunk-m4p5zn6n.js:39370-39476 placement
function resolveCgroupLayout(file) {
  let memoryCgroup = parseMemoryCgroup(file);
  if (!memoryCgroup) return;
  return buildCgroupLayout(
    memoryCgroup.mountRoot,
    memoryCgroup.path,
    memoryCgroup.v2 ? posix.dirname(memoryCgroup.path) : memoryCgroup.path,
    memoryCgroup.v2,
  );
}
//@ chunk-m4p5zn6n.js:39476-39672 placement
function getKeeperCgroupDir(selfCgroup) {
  let memoryCgroup = parseMemoryCgroup(selfCgroup);
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
//@ chunk-m4p5zn6n.js:39672-39760 placement
var KEEPER_CGROUP_IO_DEPS = {
  readSelfCgroup: () => readFileSync("/proc/self/cgroup", "utf8"),
  mkdirSync,
  writeFileSync,
};
//@ chunk-m4p5zn6n.js:39760-40027 placement
function ensureKeeperCgroupDir(e) {
  let platform = getPlatform();
  if (platform !== "linux" && platform !== "wsl") return;
  try {
    let keeperCgroupDir = getKeeperCgroupDir(e.readSelfCgroup());
    if (keeperCgroupDir === undefined) return;
    if (keeperCgroupDir.create)
      try {
        e.mkdirSync(keeperCgroupDir.dir);
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
    return keeperCgroupDir.dir;
  } catch (error) {
    logForDebugging(`tool cgroup: keeper dir unavailable (${getErrnoCode(error) ?? error})`);
    return;
  }
}
//@ chunk-m4p5zn6n.js:40027-40264 placement
/**
 * 把 keeper 进程移入 keeper cgroup 目录，失败只记日志。
 */
function moveKeeperPid(pid, n = KEEPER_CGROUP_IO_DEPS) {
  if (!pid) return;
  let keeperCgroupDir = ensureKeeperCgroupDir(n);
  if (keeperCgroupDir === undefined) return;
  try {
    n.writeFileSync(posix.join(keeperCgroupDir, "cgroup.procs"), String(pid));
    logForDebugging(`tool cgroup: keeper pid ${pid} moved to ${keeperCgroupDir}`);
  } catch (error) {
    logForDebugging(`tool cgroup: keeper pid ${pid} not moved (${getErrnoCode(error) ?? error})`);
  }
}
//@ chunk-m4p5zn6n.js:40264-40327 placement
/**
 * 生成 keeper cgroup 的 spawn 选项。
 */
function keeperCgroupSpawnOptions(e = KEEPER_CGROUP_IO_DEPS) {
  let keeperCgroupDir = ensureKeeperCgroupDir(e);
  return keeperCgroupDir === undefined
    ? {}
    : {
        cgroup: keeperCgroupDir,
      };
}
//@ chunk-m4p5zn6n.js:40327-40484 placement
function buildCgroupLayout(mountRoot, path, r, v2) {
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
        dir: posix.join(mountRoot, r, CLAUDE_CODE_BASH),
        v2,
        reuse: false,
        selfDir: joined,
      };
}
//@ chunk-m4p5zn6n.js:40484-40542 placement
function defaultCgroupLimit(e) {
  return Math.floor(e - Math.max(2 * RESERVED_CGROUP_BYTES, e * 0.15));
}
//@ chunk-m4p5zn6n.js:40542-40616 placement
function resolveCgroupLimit(explicitLimit, n) {
  if (explicitLimit !== undefined) return explicitLimit;
  let r = defaultCgroupLimit(n);
  return r >= MIN_CGROUP_LIMIT_BYTES ? r : undefined;
}
//@ chunk-m4p5zn6n.js:40616-40812 placement
function parseMemorySize(limitSetting) {
  let match = /^(\d+(?:\.\d+)?)\s*([kmgt]?)(?:i?b)?$/i.exec(limitSetting?.trim() ?? "");
  if (!match) return;
  let floored = Math.floor(Number(match[1]) * 1024 ** " kmgt".indexOf((match[2] || " ").toLowerCase()));
  return floored >= 1 ? floored : undefined;
}
//@ chunk-m4p5zn6n.js:40812-40896 placement
function helperCgroupSpawnOptions({ useToolMemoryCgroup = true, toolCgroupClass = "helper" }) {
  return useToolMemoryCgroup ? cgroupSpawnOptions(toolCgroupClass) : {};
}
//@ chunk-m4p5zn6n.js:40896-40919 placement
function isToolMemoryCgroupDisabled() {
  return false;
}
export {
  moveKeeperPid,
  keeperCgroupSpawnOptions,
  wrapCommandInCgroup,
  parkPendingPid,
  cgroupSpawnOptions,
  prefixCgroupJoinCommand,
  getOomKillCounter,
  registerFeatureFlagReader,
  hasNewOomKills,
  currentOomKillCount,
  isToolCgroupPending,
  parseMemoryCgroup,
  helperCgroupSpawnOptions,
  isToolMemoryCgroupDisabled,
  CGROUP_IO_DEPS,
  releasePidFromCgroup,
  isToolCgroupDirUsable,
};
