/**
 * commands/memory/memoryFileChoices.ts
 *
 * 2.1.316 新增：/memory 的文件选项。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tx768c80.js (10)
 * attribution: placement 10
 */
import { join } from "path";
import { findGitRoot } from "../../utils/git.js";
import { getClaudeConfigDir, getSafeModeExitHint } from "../../utils/envUtils.js";
import { oEt } from "../../utils/claudemd.js";
import { getDisplayPath } from "../../utils/file.js";
import { repeatString } from "../../utils/stringUtils.js";
import { getAutoMemPath, isAutoMemoryEnabledIgnoringPause } from "../../memdir/paths.js";
import { AJo, getMemoryDirNfc } from "../../memdir/teamMemPaths.js";
import { getAgentMemoryDir } from "../../tools/AgentTool/agentMemory.js";
import { vyn, getMemorySyncPolicyState } from "../../services/accountMemory/memoryContext.js";
import { J4e } from "../../services/orgMemory/orgMemoryDecision.js";
import { formatRelativeTimeAgo } from "../../utils/format.js";

//@ chunk-tx768c80.js:567-601 placement
function c(t) {
  return findGitRoot(t) !== null;
}
/**
 * 生成 /memory 的文件选项：已有记忆文件（排除自动记忆）加上缺失的用户/项目 CLAUDE.md，按导入层级缩进，标出类型、标签与说明。
 */
//@ chunk-tx768c80.js:601-1568 placement
function buildMemoryFileChoices(memoryFiles, cwd, indent = "  ") {
  let userPath = join(getClaudeConfigDir(), "CLAUDE.md"),
    projectPath = join(cwd, "CLAUDE.md"),
    altProjectPath = join(cwd, ".claude", "CLAUDE.md"),
    localPath = join(cwd, "CLAUDE.local.md"),
    any = memoryFiles.some((e) => e.path === userPath),
    any_2 = memoryFiles.some((e) => e.path === projectPath),
    entries = [
      ...memoryFiles.filter((e) => e.type !== "AutoMem" && !oEt(e.path)).map((e) => ({ ...e, exists: !0 })),
      ...(any ? [] : [{ path: userPath, type: "User", content: "", exists: !1 }]),
      ...(any_2 ? [] : [{ path: projectPath, type: "Project", content: "", exists: !1 }]),
    ],
    isTracked = c(cwd),
    depthByPath = new Map();
  return entries.map((e) => {
    let displayPath = getDisplayPath(e.path),
      depth = e.parent ? (depthByPath.get(e.parent) ?? 0) + 1 : 0;
    depthByPath.set(e.path, depth);
    let prefix = depth > 0 ? repeatString(indent, depth - 1) : "",
      kind =
        e.type === "User" && e.path === userPath
          ? "user"
          : e.type === "Project" && e.path === projectPath
            ? "project"
            : depth === 0 && e.type === "Project" && e.path === altProjectPath
              ? "project-alt"
              : depth === 0 && e.type === "Local" && e.path === localPath
                ? "local"
                : "other",
      label =
        kind === "user"
          ? "User instructions"
          : kind === "project"
            ? "Project instructions"
            : depth > 0
              ? `${prefix}L ${displayPath}`
              : displayPath,
      description =
        e.type === "User"
          ? "Saved in ~/.claude/CLAUDE.md"
          : kind === "project"
            ? `${isTracked ? "Checked in at" : "Saved in"} ./CLAUDE.md`
            : e.parent
              ? "@-imported"
              : "";
    return { kind: kind, path: e.path, label: label, description: description, exists: e.exists };
  });
}
/**
 * /memory 的自动记忆文件夹选项，团队记忆可用时加上团队记忆文件夹。
 */
//@ chunk-tx768c80.js:1568-1765 placement
function getAutoMemoryChoices() {
  let t = [{ kind: "auto", path: getAutoMemPath(), label: "Open auto-memory folder", description: "" }];
  if (isAutoMemoryEnabledIgnoringPause() && AJo())
    t.push({ kind: "team", path: getMemoryDirNfc(), label: "Open team memory folder", description: "" });
  return t;
}
/**
 * 为声明了 memory 的代理生成"打开代理记忆"选项。
 */
//@ chunk-tx768c80.js:1765-1965 placement
function getAgentMemoryChoices(t, o = (n) => n) {
  let n = [];
  for (let r of t)
    if (r.memory)
      n.push({
        kind: "agent",
        path: getAgentMemoryDir(r.agentType, r.memory),
        label: `Open ${o(r.agentType)} agent memory`,
        description: `${r.memory} scope`,
      });
  return n;
}
/**
 * 记忆同步开关状态：open/pending 直接返回，账号或本地关闭时取同意状态（拒绝视为 closed）。
 */
//@ chunk-tx768c80.js:1965-2134 placement
function getMemorySyncState() {
  let t = vyn();
  if (t === "open" || t === "pending") return t;
  if (t === "account_off" || t === "local_memory_off") {
    let o = getMemorySyncPolicyState();
    return o === "denied" ? "closed" : o;
  }
  return "closed";
}
//@ chunk-tx768c80.js:2134-2162 placement
function OXe() {
  return J4e();
}
//@ chunk-tx768c80.js:2162-2186 placement
function GRs() {
  return !1;
}
//@ chunk-tx768c80.js:2186-2263 placement
var $$n = "can't be turned on here; use a session started outside Claude Code";
/**
 * 自动记忆开关的显示状态：当前模型不支持、安全模式、组织不允许开启或正常 on/off。
 */
//@ chunk-tx768c80.js:2263-2630 placement
function describeAutoMemoryToggle({
  enabled: enabled,
  modelDisabled: modelDisabled,
  safeMode: safeMode,
  raiseAllowed: raiseAllowed,
}) {
  if (modelDisabled && !enabled)
    return { status: "unavailable for current model", detail: "", dim: !0, toggleable: !1 };
  if (safeMode)
    return {
      status: "off in safe mode",
      detail: `${getSafeModeExitHint()} to re-enable`,
      dim: !0,
      toggleable: !1,
    };
  if (!enabled && !raiseAllowed) return { status: "off", detail: $$n, dim: !0, toggleable: !1 };
  return { status: enabled ? "on" : "off", detail: "", dim: !1, toggleable: !modelDisabled };
}
/**
 * 记忆整理（dream）开关的显示状态：自动记忆关闭、被挂起、组织不允许，或显示运行中/上次运行时间。
 */
//@ chunk-tx768c80.js:2630-3073 placement
function describeAutoDreamToggle({
  autoMemoryOn: autoMemoryOn,
  enabled: enabled,
  running: running,
  lastDreamAt: lastDreamAt,
  raiseAllowed: raiseAllowed,
  heldDetail: heldDetail,
}) {
  if (!autoMemoryOn) return { status: "off while auto-memory is off", detail: "", dim: !0, toggleable: !1 };
  if (heldDetail !== void 0)
    return { status: enabled ? "on" : "off", detail: heldDetail, dim: !0, toggleable: !1 };
  if (!enabled && !raiseAllowed) return { status: "off", detail: $$n, dim: !0, toggleable: !1 };
  let p = running
    ? "running"
    : lastDreamAt === null
      ? ""
      : lastDreamAt === 0
        ? "never"
        : `last ran ${formatRelativeTimeAgo(new Date(lastDreamAt))}`;
  return { status: enabled ? "on" : "off", detail: p, dim: !1, toggleable: !0 };
}

export {
  getMemorySyncState,
  OXe,
  buildMemoryFileChoices,
  getAutoMemoryChoices,
  getAgentMemoryChoices,
  GRs,
  describeAutoMemoryToggle,
  describeAutoDreamToggle,
  $$n,
};
