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
import { isManagedOrVirtualPath } from "../../utils/claudemd.js";
import { getDisplayPath } from "../../utils/file.js";
import { repeatString } from "../../utils/stringUtils.js";
import { getAutoMemPath, isAutoMemoryEnabledIgnoringPause } from "../../memdir/paths.js";
import { hasTeamStore, getMemoryDirNfc } from "../../memdir/teamMemPaths.js";
import { getAgentMemoryDir } from "../../tools/AgentTool/agentMemory.js";
import {
  memorySyncPolicyClosedStub,
  getMemorySyncPolicyState,
} from "../../services/accountMemory/memoryContext.js";
import { isEligibleDecisionSurface } from "../../services/orgMemory/orgMemoryDecision.js";
import { formatRelativeTimeAgo } from "../../utils/format.js";

//@ chunk-tx768c80.js:567-601 placement
function isInGitRepo(cwd) {
  return findGitRoot(cwd) !== null;
}
//@ chunk-tx768c80.js:601-1568 placement
/**
 * 生成 /memory 的文件选项：已有记忆文件（排除自动记忆）加上缺失的用户/项目 CLAUDE.md，按导入层级缩进，标出类型、标签与说明。
 */
function buildMemoryFileChoices(memoryFiles, cwd, indent = "  ") {
  let userPath = join(getClaudeConfigDir(), "CLAUDE.md");
  let projectPath = join(cwd, "CLAUDE.md");
  let altProjectPath = join(cwd, ".claude", "CLAUDE.md");
  let localPath = join(cwd, "CLAUDE.local.md");
  let any = memoryFiles.some((memoryFile) => memoryFile.path === userPath);
  let any_2 = memoryFiles.some((memoryFile) => memoryFile.path === projectPath);
  let entries = [
    ...memoryFiles
      .filter((memoryFile) => memoryFile.type !== "AutoMem" && !isManagedOrVirtualPath(memoryFile.path))
      .map((memoryFile) => ({
        ...memoryFile,
        exists: true,
      })),
    ...(any
      ? []
      : [
          {
            path: userPath,
            type: "User",
            content: "",
            exists: false,
          },
        ]),
    ...(any_2
      ? []
      : [
          {
            path: projectPath,
            type: "Project",
            content: "",
            exists: false,
          },
        ]),
  ];
  let isTracked = isInGitRepo(cwd);
  let depthByPath = new Map();
  return entries.map((entry) => {
    let displayPath = getDisplayPath(entry.path);
    let depth = entry.parent ? (depthByPath.get(entry.parent) ?? 0) + 1 : 0;
    depthByPath.set(entry.path, depth);
    let prefix = depth > 0 ? repeatString(indent, depth - 1) : "";
    let kind =
      entry.type === "User" && entry.path === userPath
        ? "user"
        : entry.type === "Project" && entry.path === projectPath
          ? "project"
          : depth === 0 && entry.type === "Project" && entry.path === altProjectPath
            ? "project-alt"
            : depth === 0 && entry.type === "Local" && entry.path === localPath
              ? "local"
              : "other";
    let label =
      kind === "user"
        ? "User instructions"
        : kind === "project"
          ? "Project instructions"
          : depth > 0
            ? `${prefix}L ${displayPath}`
            : displayPath;
    let description =
      entry.type === "User"
        ? "Saved in ~/.claude/CLAUDE.md"
        : kind === "project"
          ? `${isTracked ? "Checked in at" : "Saved in"} ./CLAUDE.md`
          : entry.parent
            ? "@-imported"
            : "";
    return {
      kind,
      path: entry.path,
      label,
      description,
      exists: entry.exists,
    };
  });
}
//@ chunk-tx768c80.js:1568-1765 placement
/**
 * /memory 的自动记忆文件夹选项，团队记忆可用时加上团队记忆文件夹。
 */
function getAutoMemoryChoices() {
  let t = [
    {
      kind: "auto",
      path: getAutoMemPath(),
      label: "Open auto-memory folder",
      description: "",
    },
  ];
  if (isAutoMemoryEnabledIgnoringPause() && hasTeamStore())
    t.push({
      kind: "team",
      path: getMemoryDirNfc(),
      label: "Open team memory folder",
      description: "",
    });
  return t;
}
//@ chunk-tx768c80.js:1765-1965 placement
/**
 * 为声明了 memory 的代理生成"打开代理记忆"选项。
 */
function getAgentMemoryChoices(activeAgents, o = (n) => n) {
  let n = [];
  for (let r of activeAgents)
    if (r.memory)
      n.push({
        kind: "agent",
        path: getAgentMemoryDir(r.agentType, r.memory),
        label: `Open ${o(r.agentType)} agent memory`,
        description: `${r.memory} scope`,
      });
  return n;
}
//@ chunk-tx768c80.js:1965-2134 placement
/**
 * 记忆同步开关状态：open/pending 直接返回，账号或本地关闭时取同意状态（拒绝视为 closed）。
 */
function getMemorySyncState() {
  let t = memorySyncPolicyClosedStub();
  if (t === "open" || t === "pending") return t;
  if (t === "account_off" || t === "local_memory_off") {
    let memorySyncPolicyState = getMemorySyncPolicyState();
    return memorySyncPolicyState === "denied" ? "closed" : memorySyncPolicyState;
  }
  return "closed";
}
//@ chunk-tx768c80.js:2134-2162 placement
/**
 * 自动记忆开关的显示状态（由 J4e 计算当前模型/安全模式/组织策略）。
 */
function autoMemoryToggleState() {
  return isEligibleDecisionSurface();
}
//@ chunk-tx768c80.js:2162-2186 placement
/**
 * 恒返回 false 的占位判断（记忆文件选项的一个构建期开关）。
 */
function alwaysFalse() {
  return false;
}
//@ chunk-tx768c80.js:2186-2263 placement
/**
 * "can't be turned on here; use a session started outside Claude Code"：自动记忆在此会话无法开启的说明。
 */
var CANNOT_ENABLE_HERE_DETAIL = "can't be turned on here; use a session started outside Claude Code";
//@ chunk-tx768c80.js:2263-2630 placement
/**
 * 自动记忆开关的显示状态：当前模型不支持、安全模式、组织不允许开启或正常 on/off。
 */
function describeAutoMemoryToggle({ enabled, modelDisabled, safeMode, raiseAllowed }) {
  if (modelDisabled && !enabled)
    return {
      status: "unavailable for current model",
      detail: "",
      dim: true,
      toggleable: false,
    };
  if (safeMode)
    return {
      status: "off in safe mode",
      detail: `${getSafeModeExitHint()} to re-enable`,
      dim: true,
      toggleable: false,
    };
  if (!enabled && !raiseAllowed)
    return {
      status: "off",
      detail: CANNOT_ENABLE_HERE_DETAIL,
      dim: true,
      toggleable: false,
    };
  return {
    status: enabled ? "on" : "off",
    detail: "",
    dim: false,
    toggleable: !modelDisabled,
  };
}
//@ chunk-tx768c80.js:2630-3073 placement
/**
 * 记忆整理（dream）开关的显示状态：自动记忆关闭、被挂起、组织不允许，或显示运行中/上次运行时间。
 */
function describeAutoDreamToggle({ autoMemoryOn, enabled, running, lastDreamAt, raiseAllowed, heldDetail }) {
  if (!autoMemoryOn)
    return {
      status: "off while auto-memory is off",
      detail: "",
      dim: true,
      toggleable: false,
    };
  if (heldDetail !== undefined)
    return {
      status: enabled ? "on" : "off",
      detail: heldDetail,
      dim: true,
      toggleable: false,
    };
  if (!enabled && !raiseAllowed)
    return {
      status: "off",
      detail: CANNOT_ENABLE_HERE_DETAIL,
      dim: true,
      toggleable: false,
    };
  let detail = running
    ? "running"
    : lastDreamAt === null
      ? ""
      : lastDreamAt === 0
        ? "never"
        : `last ran ${formatRelativeTimeAgo(new Date(lastDreamAt))}`;
  return {
    status: enabled ? "on" : "off",
    detail,
    dim: false,
    toggleable: true,
  };
}
export {
  getMemorySyncState,
  autoMemoryToggleState,
  buildMemoryFileChoices,
  getAutoMemoryChoices,
  getAgentMemoryChoices,
  alwaysFalse,
  describeAutoMemoryToggle,
  describeAutoDreamToggle,
  CANNOT_ENABLE_HERE_DETAIL,
};
