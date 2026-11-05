/**
 * tools/AgentTool/agentMemory.ts
 *
 * 代理持久记忆：user/project/local 三种 scope 的目录、路径判定与记忆提示词
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/agentMemory.ts
 * pieces: chunk-a2q0x549.js (18)
 * attribution: file-local 1, fingerprint 4, layout 11, callgraph-fingerprint 1, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join as join_2, sep as sep_2, dirname as dirname_2, basename, normalize as normalize_2 } from "path";
import { sanitizePath } from "../../utils/sessionStoragePortable.js";
import { storageRootFor } from "../../utils/settings/settingsStorage.js";
import { getProjectRoot } from "../../bootstrap/state.js";
import { getCwd } from "../../utils/cwd.js";
import { getMemoryBaseDir, getMemoryBaseDirOrNull, isAutoMemoryEnabled } from "../../memdir/paths.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { getFsImplementation, realpathExaminedSync } from "../../utils/fsOperations.js";
import { isENOENT, getErrnoCode } from "../../utils/errors.js";
import { isProtectedDirPath } from "../../utils/permissions/protectedDirNames.js";
import { ensureMemoryDirExists, buildMemoryPrompt, MEMORY_INDEX_FILENAME } from "../../memdir/memdir.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";

//@ chunk-a2q0x549.js:150367-150448 file-local
/**
 * 代理类型名转为安全目录名（非 [A-Za-z0-9-_] 换成 -）。
 */
function sanitizeAgentTypeForPath(agentType) {
  let replaced = agentType.replace(/[^a-zA-Z0-9\-_]/g, "-");
  return replaced === "" ? "unknown" : replaced;
}
//@ chunk-a2q0x549.js:150448-150669 fingerprint (2.1.88 match: getLocalAgentMemoryDir, 1)
/**
 * local scope 的代理记忆目录。
 */
function getLocalAgentMemoryDir(dirName) {
  if (process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR)
    return (
      join_2(
        process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR,
        "projects",
        sanitizePath(storageRootFor(getProjectRoot()) ?? getProjectRoot()),
        "agent-memory-local",
        dirName,
      ) + sep_2
    );
  return join_2(getCwd(), ".claude", "agent-memory-local", dirName) + sep_2;
}
//@ chunk-a2q0x549.js:150669-150843 fingerprint (2.1.88 match: getAgentMemoryDir, 1)
/**
 * 代理持久记忆目录：project → <cwd>/.claude/agent-memory/<type>/，local → .claude/agent-memory-local/（或 CLAUDE_CODE_REMOTE_MEMORY_DIR 下），user → <记忆根>/agent-memory/<type>/。
 */
function getAgentMemoryDir(agentType, scope) {
  let dirName = sanitizeAgentTypeForPath(agentType);
  switch (scope) {
    case "project":
      return join_2(getCwd(), ".claude", "agent-memory", dirName) + sep_2;
    case "local":
      return getLocalAgentMemoryDir(dirName);
    case "user":
      return join_2(getMemoryBaseDir(), "agent-memory", dirName) + sep_2;
  }
}
//@ chunk-a2q0x549.js:150843-150876 layout
function isNonUserMemoryScope(scope) {
  return scope !== "user";
}
//@ chunk-a2q0x549.js:150876-151336 layout
/**
 * 决定代理记忆目录的 MEMORY.md 入口如何读取：用户范围直接 follow；项目/本地范围在工作目录内或不存在时只读普通文件；指向工作目录外或无法解析时不读并记 tengu_agent_memory_entrypoint_skipped。
 */
function resolveMemoryEntrypointMode(scope, dir) {
  if (!isNonUserMemoryScope(scope)) return "follow";
  if (!isPathWithinDir(dir, getCwd())) return "regular-file";
  let pathRelation = classifyPathAgainstDir(dir, getCwd());
  if (pathRelation === "beneath" || pathRelation === "absent") return "regular-file";
  logEvent("tengu_agent_memory_entrypoint_skipped", {
    reason: fromEnum(pathRelation === "elsewhere" ? "folder_link" : "folder_unresolved"),
  });
  logForDebugging(
    pathRelation === "elsewhere"
      ? `agent memory: ${dir} leads out of the working copy or through a dangling link; its MEMORY.md is not read`
      : `agent memory: ${dir} could not be resolved; its MEMORY.md is not read`,
  );
  return "none";
}
//@ chunk-a2q0x549.js:151336-151579 layout
/**
 * 为回忆解析代理记忆目录：用户范围直接返回；项目/本地范围要求实路径仍在工作目录内（防软链逃逸），返回 {dir, regularFilesOnly:true, containedIn}，否则 null。
 */
async function resolveAgentMemoryDirForRecall(agentType, scope) {
  let path = getAgentMemoryDir(agentType, scope);
  if (!isNonUserMemoryScope(scope))
    return {
      dir: path,
      regularFilesOnly: false,
    };
  let resolvedMemoryDir = await realpathForRecall(path);
  if (resolvedMemoryDir === null) return null;
  if (isPathWithinDir(path, getCwd())) {
    let resolvedCwd = await realpathForRecall(getCwd());
    if (resolvedCwd === null || !isPathWithinDir(resolvedMemoryDir, resolvedCwd)) return null;
  }
  return {
    dir: path,
    regularFilesOnly: true,
    containedIn: resolvedMemoryDir,
  };
}
//@ chunk-a2q0x549.js:151579-151646 layout
async function isRealpathWithin(path, containedIn) {
  let resolvedFilePath = await realpathForRecall(path);
  return resolvedFilePath !== null && isPathWithinDir(resolvedFilePath, containedIn);
}
//@ chunk-a2q0x549.js:151646-151819 layout
async function realpathForRecall(path) {
  try {
    return await getFsImplementation()
      .realpath(path)
      .catch((error) => resolveOnPermissionError(path, error));
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`agent memory: ${path} could not be resolved; not read for recall`);
    return null;
  }
}
//@ chunk-a2q0x549.js:151819-151866 layout
function isPathWithinDir(path, dir) {
  return path.startsWith(join_2(dir, sep_2));
}
//@ chunk-a2q0x549.js:151866-151950 layout
function resolveOnPermissionError(path, error) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode !== "EPERM" && errnoCode !== "EACCES") throw error;
  return realpathExaminedSync(getFsImplementation(), path);
}
//@ chunk-a2q0x549.js:151950-152346 layout
/**
 * 判断路径相对目录的位置：beneath（实路径在目录下）、absent（尚不存在但最近存在的祖先在目录下）、elsewhere、unresolved。
 */
function classifyPathAgainstDir(dir, cwd) {
  let fsImplementation = getFsImplementation();
  let path = dir.replace(/[\\/]+$/, "");
  let resolvedCwd;
  try {
    resolvedCwd = realpathExaminedSync(fsImplementation, cwd);
  } catch {
    return "unresolved";
  }
  try {
    return isPathWithinDir(realpathExaminedSync(fsImplementation, path), resolvedCwd)
      ? "beneath"
      : "elsewhere";
  } catch (error) {
    if (!isMissingOrNotDirError(error)) return "unresolved";
  }
  try {
    fsImplementation.lstatSync(path);
    return "elsewhere";
  } catch (error) {
    if (!isMissingOrNotDirError(error)) return "unresolved";
  }
  let { existing, missing } = splitExistingPathPrefix(fsImplementation, path);
  try {
    return isPathWithinDir(join_2(realpathExaminedSync(fsImplementation, existing), ...missing), resolvedCwd)
      ? "absent"
      : "elsewhere";
  } catch (error) {
    return isMissingOrNotDirError(error) ? "elsewhere" : "unresolved";
  }
}
//@ chunk-a2q0x549.js:152346-152481 layout
function splitExistingPathPrefix(fs, path, missingParts = []) {
  try {
    fs.lstatSync(path);
  } catch (error) {
    let parentPath = dirname_2(path);
    if (isMissingOrNotDirError(error) && parentPath !== path)
      return splitExistingPathPrefix(fs, parentPath, [basename(path), ...missingParts]);
  }
  return {
    existing: path,
    missing: missingParts,
  };
}
//@ chunk-a2q0x549.js:152481-152526 layout (2.1.88 match: isRealPathWithinTeamDir, 1)
/**
 * realpath 后判断是否在团队记忆目录内；团队目录尚不存在时视为在内。
 */
function isMissingOrNotDirError(realCandidate) {
  return isENOENT(realCandidate) || getErrnoCode(realCandidate) === "ENOTDIR";
}
//@ chunk-a2q0x549.js:152526-152976 fingerprint (2.1.88 match: isAgentMemoryPath, 1)
/**
 * 路径属于某个代理记忆目录时返回该记忆根前缀。
 */
function isAgentMemoryPath(absolutePath) {
  let memoryBase = getMemoryBaseDirOrNull();
  if (memoryBase !== null) {
    let projectMemoryPrefix = join_2(memoryBase, "agent-memory") + sep_2;
    if (absolutePath.startsWith(projectMemoryPrefix)) return projectMemoryPrefix;
  }
  let localMemoryPrefix = join_2(getCwd(), ".claude", "agent-memory") + sep_2;
  if (absolutePath.startsWith(localMemoryPrefix)) return localMemoryPrefix;
  if (process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR) {
    let remoteProjectsPrefix = join_2(process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR, "projects") + sep_2;
    if (
      absolutePath.includes(sep_2 + "agent-memory-local" + sep_2) &&
      absolutePath.startsWith(remoteProjectsPrefix)
    )
      return remoteProjectsPrefix;
    return null;
  }
  let localAgentMemoryPrefix = join_2(getCwd(), ".claude", "agent-memory-local") + sep_2;
  if (absolutePath.startsWith(localAgentMemoryPrefix)) return localAgentMemoryPrefix;
  return null;
}
//@ chunk-a2q0x549.js:152976-153039 layout
/**
 * 路径位于代理记忆目录内部（权限系统据此放行记忆读写）。
 */
function isInsideAgentMemoryDir(path) {
  let absolutePath = normalize_2(path);
  let memoryRoot = isAgentMemoryPath(absolutePath);
  return memoryRoot !== null && !isProtectedDirPath(absolutePath, memoryRoot);
}
//@ chunk-a2q0x549.js:153039-153748 fingerprint (2.1.88 match: loadAgentMemoryPrompt, 0.929)
/**
 * 生成代理记忆提示词（Persistent Agent Memory）：按 scope 给出写作指引，必要时创建目录，附加 CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES。
 */
function loadAgentMemoryPrompt(agentType, scope, storageV5, primedAgentMemory) {
  let scopeNote;
  switch (scope) {
    case "user":
      scopeNote =
        "- Since this memory is user-scope, keep learnings general since they apply across all projects";
      break;
    case "project":
      scopeNote =
        "- Since this memory is project-scope and shared with your team via version control, tailor your memories to this project";
      break;
    case "local":
      scopeNote =
        "- Since this memory is local-scope (not checked into version control), tailor your memories to this project and machine";
      break;
  }
  let memoryDir = getAgentMemoryDir(agentType, scope);
  let memoryEntrypointMode = resolveMemoryEntrypointMode(scope, memoryDir);
  if (memoryEntrypointMode !== "none") ensureMemoryDirExists(memoryDir, storageV5);
  let coworkExtraGuidelines = process.env.CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES;
  return buildMemoryPrompt(
    {
      displayName: "Persistent Agent Memory",
      memoryDir,
      extraGuidelines:
        coworkExtraGuidelines && coworkExtraGuidelines.trim().length > 0
          ? [scopeNote, coworkExtraGuidelines]
          : [scopeNote],
      ...(primedAgentMemory !== undefined && {
        primedEntrypoint: primedAgentMemory,
      }),
      entrypointRead: memoryEntrypointMode,
    },
    storageV5,
  );
}
//@ chunk-a2q0x549.js:153748-153872 callgraph-fingerprint (2.1.88 match: getMemoryScopeDisplay, 0.358)
/**
 * user scope 且记忆根为默认位置时，返回记忆目录的显示信息。
 */
function getMemoryScopeDisplay(agentType, memory) {
  if (
    memory !== "user" ||
    join_2(getMemoryBaseDir(), "agent-memory") !== join_2(getClaudeConfigDir(), "agent-memory")
  )
    return;
  return STORAGE_SPACES.agentMemory(sanitizeAgentTypeForPath(agentType), [MEMORY_INDEX_FILENAME]);
}
//@ chunk-a2q0x549.js:153872-154113 placement
/**
 * 读取 agent 的记忆范围内容（自动记忆开启且 agent 配置了 memory 时），找不到时返回空串；与工作流脚本文件无关，疑似放错文件。
 */
async function readAgentMemoryScope(agent, storageV5) {
  if (storageV5 === undefined || agent.memory === undefined || !isAutoMemoryEnabled()) return;
  let memoryScopeDisplay = getMemoryScopeDisplay(agent.agentType, agent.memory);
  if (memoryScopeDisplay === undefined) return;
  let readResult = await storageV5.readText([memoryScopeDisplay]).catch(() => {
    return;
  });
  let item = readResult?.ok ? readResult.value.items[0] : undefined;
  return item !== undefined && item.found ? item.value : "";
}
export {
  isInsideAgentMemoryDir,
  resolveAgentMemoryDirForRecall,
  isRealpathWithin,
  readAgentMemoryScope,
  loadAgentMemoryPrompt,
  getAgentMemoryDir,
};
