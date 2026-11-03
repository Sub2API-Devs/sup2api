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
import {
  readFileSync,
  readFileSync as readFileSync_2,
  mkdirSync,
  writeFileSync,
  rmdirSync,
  statSync,
} from "fs";
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
import { w0 } from "./which.js";
import { kI, statPpid } from "./procStat.js";
import { shellQuoteArgs } from "./bash/bashPipeCommand.js";

/**
 * 解析 /proc/self/cgroup：优先返回 cgroup v1 的 memory 层级（挂载点与路径），否则返回 v2 统一层级（0::路径）；都没有时返回 undefined。
 */
//@ chunk-m4p5zn6n.js:31106-31417 placement
function parseMemoryCgroup(e) {
  let n;
  for (let r of e.split(`
`)) {
    let [o, s, ...u] = r.split(":");
    if (s === void 0 || u.length === 0) continue;
    let joined = u.join(":");
    if (s.split(",").includes("memory")) return { mountRoot: "/sys/fs/cgroup/memory", path: joined, v2: !1 };
    if (o === "0" && s === "") n = joined;
  }
  return n === void 0 ? void 0 : { mountRoot: "/sys/fs/cgroup", path: n, v2: !0 };
}
//@ chunk-m4p5zn6n.js:31417-31545 placement
var CLAUDE_CODE_BASH = "claude-code-bash",
  CLAUDE_CODE_KEEPER = "claude-code-keeper",
  Nn = 1073741824,
  qo = Nn,
  Ve = ["mcp", "lsp", "hooks", "plugin", "tmux", "helper", "agent"];
//@ chunk-m4p5zn6n.js:31545-31690 placement
class FeatureFlagReaderSlot {
  reader = null;
  subscribeRefresh = null;
  register(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
  read(e, n) {
    return this.reader ? this.reader(e, n) : n;
  }
}
//@ chunk-m4p5zn6n.js:31690-31703 placement
var N = new FeatureFlagReaderSlot();
//@ chunk-m4p5zn6n.js:31703-31777 placement
function tMi(e, n) {
  if (n !== void 0) N.subscribeRefresh = n;
  return N.register(e);
}
//@ chunk-m4p5zn6n.js:31777-31910 placement
class ToolCgroupState {
  dir = void 0;
  layout = void 0;
  limit = 0;
  activatedClasses = new Set();
  pendingPids = new Map();
  pendingUnsubscribe = void 0;
  oomKillsSeen = void 0;
}
//@ chunk-m4p5zn6n.js:31910-31934 placement
var P = new HostScoped(() => new ToolCgroupState());
/**
 * 初始化工具内存 cgroup（只在 Linux/WSL）：环境变量或功能开关决定是否启用；解析当前 cgroup 布局，按内存上限创建子 cgroup（嵌套时复用），记录状态并打点；失败则禁用。
 */
//@ chunk-m4p5zn6n.js:31934-32944 placement
function initToolCgroup() {
  let state = onProcessRootHost(P);
  if (state.dir !== void 0) return state.dir ?? void 0;
  if (isDisklessProcess()) {
    state.dir = null;
    return;
  }
  let n = getPlatform();
  if (n !== "linux" && n !== "wsl") {
    state.dir = null;
    return;
  }
  let limitSetting = env.CLAUDE_CODE_TOOL_MEMORY_LIMIT?.trim().toLowerCase();
  if (limitSetting && (isEnvDefinedFalsy(limitSetting) || limitSetting === "none")) {
    state.dir = null;
    return;
  }
  let explicitLimit = parseMemorySize(limitSetting);
  if (explicitLimit === void 0 && N.read("tengu_tool_memory_cgroup", !1) !== !0) return;
  try {
    let layout = resolveCgroupLayout(readFileSync_2("/proc/self/cgroup", "utf8"));
    if (!layout) throw Error("no memory cgroup hierarchy");
    let limitBytes = ui(explicitLimit, totalmem());
    if (limitBytes === void 0) {
      ((state.dir = null),
        logForDebugging("tool cgroup: disabled (host too small for the default cap)"),
        logEvent("tengu_tool_cgroup", { status: lit("host_too_small") }));
      return;
    }
    (createCgroupWithLimit(layout, limitBytes),
      (state.dir = layout.dir),
      (state.layout = layout),
      (state.limit = limitBytes),
      logForDebugging(
        `tool cgroup: ${layout.dir} ${layout.reuse ? "(nested: already capped, reusing our own)" : `limit=${limitBytes}`}`,
      ),
      logFeatureOk("shell_memory_cgroup"),
      logEvent(
        "tengu_tool_cgroup",
        layout.reuse ? { status: lit("nested") } : { status: lit("enabled"), limit_bytes: limitBytes },
      ));
  } catch (error) {
    ((state.dir = null),
      logForDebugging(`tool cgroup: disabled (${getErrnoCode(error) ?? error})`),
      logFeatureBad("shell_memory_cgroup", sanitizeErrnoForTelemetry(error) ?? "no_hierarchy"),
      logEvent("tengu_tool_cgroup", { status: lit("disabled") }));
  }
  return state.dir ?? void 0;
}
//@ chunk-m4p5zn6n.js:32944-33191 placement
function getToolCgroupDirForClass(e) {
  if (initToolCgroup() === void 0) return;
  if (e !== "shell" && getExcludedToolClasses().has(e)) return;
  let n = onProcessRootHost(P),
    r = ensureToolCgroupDir(n);
  if (r === void 0) return;
  if ((checkOomKills(n), !n.activatedClasses.has(e)))
    (n.activatedClasses.add(e),
      logEvent("tengu_tool_cgroup", { status: lit("class_enabled"), class: fromEnum(e) }));
  return r;
}
//@ chunk-m4p5zn6n.js:33191-33271 placement
function nMi(e) {
  return typeof onProcessRootHost(P).dir === "string" && (e === "shell" || !getExcludedToolClasses().has(e));
}
/**
 * 确认工具 cgroup 目录仍存在，被删除时按布局重新创建；无法恢复时禁用并打点。
 */
//@ chunk-m4p5zn6n.js:33271-33759 placement
function ensureToolCgroupDir(
  e,
  n = { exists: Vo, mkdirSync: mkdirSync, writeFileSync: writeFileSync, rmdirSync: rmdirSync },
) {
  if (e.dir === void 0 || e.dir === null) return;
  try {
    if (n.exists(e.dir)) return e.dir;
    if (e.layout === void 0 || e.layout.reuse) throw Error("enclosing tool cgroup is gone");
    return (
      createCgroupWithLimit(e.layout, e.limit, n),
      logForDebugging(`tool cgroup: ${e.dir} vanished; re-created`),
      logEvent("tengu_tool_cgroup", { status: lit("recreated") }),
      e.dir
    );
  } catch (error) {
    ((e.dir = null),
      logForDebugging(`tool cgroup: disabled (dir vanished: ${getErrnoCode(error) ?? error})`),
      logEvent("tengu_tool_cgroup", { status: lit("vanished") }));
    return;
  }
}
//@ chunk-m4p5zn6n.js:33759-33816 placement
function Vo(e) {
  return statSync(e, { throwIfNoEntry: !1 }) !== void 0;
}
//@ chunk-m4p5zn6n.js:33816-33956 placement
function getExcludedToolClasses() {
  let e = env.CLAUDE_CODE_TOOL_MEMORY_CGROUP_EXCLUDE?.trim(),
    n = parseExcludedToolClasses(e);
  if (n.has("mcp") || !isMcpCgroupDisabled(!e)) return n;
  return new Set([...n, "mcp"]);
}
//@ chunk-m4p5zn6n.js:33956-34107 placement
function parseExcludedToolClasses(e) {
  if (e) return toToolClassSet(e.split(","));
  let read = N.read("tengu_tool_cgroup_exclude_classes", null);
  if (Array.isArray(read)) return toToolClassSet(read);
  return new Set(Ve);
}
//@ chunk-m4p5zn6n.js:34107-34271 placement
function isMcpCgroupDisabled(e) {
  let n = env.CLAUDE_CODE_MCP_MEMORY_CGROUP?.trim().toLowerCase();
  if (n && (isEnvDefinedFalsy(n) || n === "none")) return !0;
  return e && N.read("tengu_mcp_memory_cgroup", null) === !1;
}
//@ chunk-m4p5zn6n.js:34271-34479 placement
function toToolClassSet(e) {
  let n = new Set();
  for (let r of e) {
    let o = typeof r === "string" ? r.trim().toLowerCase() : "";
    if (o === "all-new") {
      Ve.forEach((u) => n.add(u));
      continue;
    }
    let found = Ve.find((u) => u === o);
    if (found !== void 0) n.add(found);
  }
  return n;
}
//@ chunk-m4p5zn6n.js:34479-34537 placement
function Nd(e) {
  let n = getToolCgroupDirForClass(e);
  return n === void 0 ? {} : { cgroup: n };
}
/**
 * 把工具命令包装为先把自身写入 cgroup.procs 再 exec 的 /bin/sh 调用；cgroup 不可用时原样返回并标记是否待定。
 */
//@ chunk-m4p5zn6n.js:34537-34828 placement
function wrapCommandInCgroup(e, n, r) {
  let o = getToolCgroupDirForClass(e);
  if (o === void 0) return { command: n, args: [...r], pending: GMt(), capped: !1 };
  if (w0(n) === null) return { command: n, args: [...r], pending: !0, capped: !1 };
  return {
    pending: !1,
    capped: !0,
    command: "/bin/sh",
    args: ["-c", '{ echo 0 > "$0"/cgroup.procs; } 2>/dev/null; exec "$@"', o, n, ...r],
  };
}
//@ chunk-m4p5zn6n.js:34828-34869 placement
function GMt() {
  return onProcessRootHost(P).dir === void 0;
}
//@ chunk-m4p5zn6n.js:34869-34957 placement
var Zo = 64,
  KSr = {
    readStarttime: Jo,
    writeFileSync: writeFileSync,
    readCgroupPids: readCgroupPids,
    readProcIdentity: readProcIdentity,
  };
/**
 * 在 cgroup 尚未就绪时暂存进程（记录类别、启动时间与是否保持不受限），待开关刷新后再晚绑定；已就绪则直接绑定；暂存数量有上限。
 */
//@ chunk-m4p5zn6n.js:34957-35399 placement
function parkPendingPid(e, n, r, o = KSr) {
  try {
    if (!n) return;
    initToolCgroup();
    let state = onProcessRootHost(P);
    if (state.dir === null) return;
    let starttime = o.readStarttime(n);
    if (starttime === void 0) return;
    let pendingInfo = { cls: e, starttime: starttime, shouldStayUncapped: r };
    if (state.dir !== void 0) {
      lateAttachPid(n, pendingInfo, o);
      return;
    }
    if ((dropRecycledPendingPids(state, o), state.pendingPids.size >= Zo)) {
      logForDebugging(`tool cgroup: pending pid ${n} not parked (full)`);
      return;
    }
    (state.pendingPids.set(n, pendingInfo),
      (state.pendingUnsubscribe ??= N.subscribeRefresh?.(() => attachPendingPids())));
  } catch (error) {
    logForDebugging(`tool cgroup: pending pid not parked (${error})`);
  }
}
//@ chunk-m4p5zn6n.js:35399-35657 placement
function attachPendingPids(e = KSr) {
  let n = onProcessRootHost(P);
  try {
    if ((initToolCgroup(), n.dir === void 0)) {
      dropRecycledPendingPids(n, e);
      return;
    }
    if (n.dir !== null) for (let [r, o] of n.pendingPids) lateAttachPid(r, o, e);
  } catch (error) {
    logForDebugging(`tool cgroup: late attach skipped (${error})`);
  }
  (n.pendingPids.clear(), n.pendingUnsubscribe?.(), (n.pendingUnsubscribe = void 0));
}
/**
 * 把暂存的进程晚绑定到其类别的工具 cgroup（启动时间不符或应保持不受限时跳过），并一并移动其后代进程。
 */
//@ chunk-m4p5zn6n.js:35657-36128 placement
function lateAttachPid(e, { cls: cls, starttime: starttime, shouldStayUncapped: shouldStayUncapped }, s) {
  let cgroupDir = getToolCgroupDirForClass(cls);
  if (cgroupDir === void 0 || s.readStarttime(e) !== starttime) return;
  try {
    if (shouldStayUncapped?.()) {
      logForDebugging(`tool cgroup: ${cls} pid ${e} left uncapped`);
      return;
    }
    let procsFile = posix.join(cgroupDir, "cgroup.procs");
    s.writeFileSync(procsFile, String(e));
    let movedCount = 1,
      layout = onProcessRootHost(P).layout;
    if (layout !== void 0 && !layout.reuse)
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
function Jo(e) {
  try {
    return kI(readFileSync_2(`/proc/${e}/stat`, "utf8"));
  } catch {
    return;
  }
}
//@ chunk-m4p5zn6n.js:36308-36450 placement
function readProcIdentity(e) {
  try {
    let n = readFileSync_2(`/proc/${e}/stat`, "utf8"),
      r = statPpid(n),
      o = kI(n);
    return r === void 0 || o === void 0 ? void 0 : { ppid: r, starttime: o };
  } catch {
    return;
  }
}
//@ chunk-m4p5zn6n.js:36450-36580 placement
function readCgroupPids(e) {
  return readFileSync_2(posix.join(e, "cgroup.procs"), "utf8")
    .split(
      `
`,
    )
    .map((n) => Number.parseInt(n, 10))
    .filter((n) => !Number.isNaN(n));
}
//@ chunk-m4p5zn6n.js:36580-36670 placement
function ni(e) {
  let match = /^oom_kill (\d+)$/m.exec(e);
  return match ? Number.parseInt(match[1], 10) : void 0;
}
//@ chunk-m4p5zn6n.js:36670-36748 placement
function Ze(e) {
  return posix.join(e.dir, e.v2 ? "memory.events" : "memory.oom_control");
}
//@ chunk-m4p5zn6n.js:36748-36781 placement
function z(e) {
  return readFileSync_2(e, "utf8");
}
//@ chunk-m4p5zn6n.js:36781-36834 placement
function Qe(e, n = z) {
  try {
    return ni(n(e));
  } catch {
    return;
  }
}
//@ chunk-m4p5zn6n.js:36834-36922 placement
function gDn(e = z) {
  let { dir: dir, layout: layout } = onProcessRootHost(P);
  if (!dir || layout === void 0) return;
  return Qe(Ze(layout), e);
}
/**
 * 检查自上次以来工具 cgroup 是否发生过 OOM kill。
 */
//@ chunk-m4p5zn6n.js:36922-37034 placement
function hasNewOomKills(e, n = z) {
  let r = onProcessRootHost(P),
    o = e ?? r.oomKillsSeen,
    s = gDn(n);
  return (checkOomKills(r, n, s), o === void 0 || s === void 0 ? void 0 : s > o);
}
/**
 * 读取工具 cgroup 的 OOM kill 计数，有新增时记日志并打点。
 */
//@ chunk-m4p5zn6n.js:37034-37431 placement
function checkOomKills(e, n = z, r) {
  try {
    let layout = e.layout;
    if (!e.dir || layout === void 0 || layout.reuse) return;
    let oomKills = r ?? Qe(Ze(layout), n);
    if (oomKills === void 0) return;
    let oomKillsSeen = e.oomKillsSeen;
    if (((e.oomKillsSeen = oomKills), oomKillsSeen === void 0 || oomKills <= oomKillsSeen)) return;
    (logForDebugging(
      `tool cgroup: OOM killer fired ${oomKills - oomKillsSeen} time(s) in ${layout.dir} since last check`,
    ),
      logEvent("tengu_tool_cgroup", {
        status: lit("oom_kill"),
        oom_kills: oomKills - oomKillsSeen,
        cgroup_v2: layout.v2,
      }));
  } catch (error) {
    logForDebugging(`tool cgroup: oom_kill check skipped (${error})`);
  }
}
/**
 * 返回读取指定类别工具 cgroup OOM kill 计数的函数，cgroup 不可用时返回 undefined。
 */
//@ chunk-m4p5zn6n.js:37431-37540 placement
function getOomKillCounter(e, n = z) {
  let r = getToolCgroupDirForClass(e),
    layout = onProcessRootHost(P).layout;
  if (r === void 0 || layout === void 0) return;
  let s = Ze(layout);
  return () => Qe(s, n);
}
/**
 * 在 shell 命令前加上把自身加入工具 cgroup 的前缀，cgroup 不可用时原样返回。
 */
//@ chunk-m4p5zn6n.js:37540-37676 placement
function prefixCgroupJoinCommand(e, n) {
  let r = getToolCgroupDirForClass(e);
  if (r === void 0) return n;
  return `sh -c '{ echo $PPID > "$1"/cgroup.procs; } 2>/dev/null' sh ${shellQuoteArgs([r])}; ${n}`;
}
/**
 * 把进程（及其后代）从工具 cgroup 移回本进程的 cgroup：cgroup 尚未初始化时只是取消暂存；启动时间不符（进程已回收）时不处理。
 */
//@ chunk-m4p5zn6n.js:37676-38299 placement
function releasePidFromCgroup(e, n, r = KSr) {
  try {
    let state = onProcessRootHost(P);
    if (state.dir === void 0) {
      if (state.pendingPids.get(e)?.starttime !== n) return !1;
      return (
        state.pendingPids.delete(e),
        logForDebugging(`tool cgroup: unparked pid ${e}; it stays uncapped`),
        !0
      );
    }
    let layout = state.layout;
    if (!state.dir || layout === void 0 || layout.reuse) return !1;
    if (r.readStarttime(e) !== n) return !1;
    let procsFile = posix.join(layout.selfDir, "cgroup.procs");
    r.writeFileSync(procsFile, String(e));
    let movedCount = 1 + moveDescendants(e, layout.dir, procsFile, r, "released");
    return (
      logForDebugging(
        `tool cgroup: released pid ${e} (${movedCount} process${movedCount === 1 ? "" : "es"}) to ${layout.selfDir}`,
      ),
      logEvent("tengu_tool_cgroup", { status: lit("released"), released_count: movedCount }),
      !0
    );
  } catch (error) {
    return (logForDebugging(`tool cgroup: release of pid ${e} failed (${getErrnoCode(error) ?? error})`), !1);
  }
}
/**
 * 把进程的后代逐个写入目标 cgroup（跳过已退出或 pid 被复用的），返回移动数量。
 */
//@ chunk-m4p5zn6n.js:38299-38608 placement
function moveDescendants(e, n, r, o, s) {
  let u = 0;
  for (let { pid: pid, starttime: starttime } of listDescendantPids(e, n, o)) {
    if (o.readStarttime(pid) !== starttime) {
      logForDebugging(`tool cgroup: descendant ${pid} of pid ${e} exited or was recycled; skipped`);
      continue;
    }
    try {
      (o.writeFileSync(r, String(pid)), u++);
    } catch (error) {
      logForDebugging(
        `tool cgroup: descendant ${pid} of pid ${e} not ${s} (${getErrnoCode(error) ?? error})`,
      );
    }
  }
  return u;
}
/**
 * 读取 cgroup 成员并按父子关系建立进程树，返回指定进程的所有后代（pid 与启动时间）；成员无法读取时返回空列表。
 */
//@ chunk-m4p5zn6n.js:38608-39073 placement
function listDescendantPids(e, n, r) {
  let memberPids;
  try {
    memberPids = r.readCgroupPids(n);
  } catch (pid) {
    return (
      logForDebugging(
        `tool cgroup: members of ${n} unreadable (${getErrnoCode(pid) ?? pid}); moving pid ${e} alone`,
      ),
      []
    );
  }
  let childrenByParent = new Map();
  for (let l of memberPids) {
    if (l === e) continue;
    let identity;
    try {
      identity = r.readProcIdentity(l);
    } catch {
      identity = void 0;
    }
    if (identity === void 0) continue;
    let entry = { pid: l, starttime: identity.starttime },
      siblings = childrenByParent.get(identity.ppid);
    if (siblings) siblings.push(entry);
    else childrenByParent.set(identity.ppid, [entry]);
  }
  let descendants = [],
    queue = [e];
  for (let l = 0; l < queue.length; l++)
    for (let f of childrenByParent.get(queue[l]) ?? []) (descendants.push(f), queue.push(f.pid));
  return descendants;
}
//@ chunk-m4p5zn6n.js:39073-39370 placement
function createCgroupWithLimit(
  e,
  n,
  r = { mkdirSync: mkdirSync, writeFileSync: writeFileSync, rmdirSync: rmdirSync },
) {
  if (e.reuse) return;
  let o = !0;
  try {
    r.mkdirSync(e.dir);
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") throw error;
    o = !1;
  }
  try {
    r.writeFileSync(posix.join(e.dir, e.v2 ? "memory.max" : "memory.limit_in_bytes"), String(n));
  } catch (error) {
    if (o)
      try {
        r.rmdirSync?.(e.dir);
      } catch {}
    throw error;
  }
}
//@ chunk-m4p5zn6n.js:39370-39476 placement
function resolveCgroupLayout(e) {
  let n = parseMemoryCgroup(e);
  if (!n) return;
  return buildCgroupLayout(n.mountRoot, n.path, n.v2 ? posix.dirname(n.path) : n.path, n.v2);
}
//@ chunk-m4p5zn6n.js:39476-39672 placement
function getKeeperCgroupDir(e) {
  let n = parseMemoryCgroup(e);
  if (!n) return;
  let parts = n.path.split("/"),
    index = parts.indexOf(CLAUDE_CODE_BASH);
  if (index < 0) return;
  let joined = posix.join(n.mountRoot, ...parts.slice(0, index));
  return n.v2 ? { dir: posix.join(joined, CLAUDE_CODE_KEEPER), create: !0 } : { dir: joined, create: !1 };
}
//@ chunk-m4p5zn6n.js:39672-39760 placement
var zn = {
  readSelfCgroup: () => readFileSync_2("/proc/self/cgroup", "utf8"),
  mkdirSync: mkdirSync,
  writeFileSync: writeFileSync,
};
//@ chunk-m4p5zn6n.js:39760-40027 placement
function ensureKeeperCgroupDir(e) {
  let n = getPlatform();
  if (n !== "linux" && n !== "wsl") return;
  try {
    let r = getKeeperCgroupDir(e.readSelfCgroup());
    if (r === void 0) return;
    if (r.create)
      try {
        e.mkdirSync(r.dir);
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
    return r.dir;
  } catch (error) {
    logForDebugging(`tool cgroup: keeper dir unavailable (${getErrnoCode(error) ?? error})`);
    return;
  }
}
/**
 * 把 keeper 进程移入 keeper cgroup 目录，失败只记日志。
 */
//@ chunk-m4p5zn6n.js:40027-40264 placement
function moveKeeperPid(e, n = zn) {
  if (!e) return;
  let r = ensureKeeperCgroupDir(n);
  if (r === void 0) return;
  try {
    (n.writeFileSync(posix.join(r, "cgroup.procs"), String(e)),
      logForDebugging(`tool cgroup: keeper pid ${e} moved to ${r}`));
  } catch (error) {
    logForDebugging(`tool cgroup: keeper pid ${e} not moved (${getErrnoCode(error) ?? error})`);
  }
}
//@ chunk-m4p5zn6n.js:40264-40327 placement
function cdo(e = zn) {
  let n = ensureKeeperCgroupDir(e);
  return n === void 0 ? {} : { cgroup: n };
}
//@ chunk-m4p5zn6n.js:40327-40484 placement
function buildCgroupLayout(e, n, r, o) {
  let included = n.split("/").includes(CLAUDE_CODE_BASH),
    joined = posix.join(e, n, ".");
  return included
    ? { dir: joined, v2: o, reuse: !0, selfDir: joined }
    : { dir: posix.join(e, r, CLAUDE_CODE_BASH), v2: o, reuse: !1, selfDir: joined };
}
//@ chunk-m4p5zn6n.js:40484-40542 placement
function ai(e) {
  return Math.floor(e - Math.max(2 * Nn, e * 0.15));
}
//@ chunk-m4p5zn6n.js:40542-40616 placement
function ui(e, n) {
  if (e !== void 0) return e;
  let r = ai(n);
  return r >= qo ? r : void 0;
}
//@ chunk-m4p5zn6n.js:40616-40812 placement
function parseMemorySize(e) {
  let match = /^(\d+(?:\.\d+)?)\s*([kmgt]?)(?:i?b)?$/i.exec(e?.trim() ?? "");
  if (!match) return;
  let floored = Math.floor(Number(match[1]) * 1024 ** " kmgt".indexOf((match[2] || " ").toLowerCase()));
  return floored >= 1 ? floored : void 0;
}
//@ chunk-m4p5zn6n.js:40812-40896 placement
function q({ useToolMemoryCgroup: useToolMemoryCgroup = !0, toolCgroupClass: toolCgroupClass = "helper" }) {
  return useToolMemoryCgroup ? Nd(toolCgroupClass) : {};
}
//@ chunk-m4p5zn6n.js:40896-40919 placement
function Je() {
  return !1;
}

export {
  moveKeeperPid,
  cdo,
  wrapCommandInCgroup,
  parkPendingPid,
  Nd,
  prefixCgroupJoinCommand,
  getOomKillCounter,
  tMi,
  hasNewOomKills,
  gDn,
  GMt,
  parseMemoryCgroup,
  q,
  Je,
  KSr,
  releasePidFromCgroup,
  nMi,
};
