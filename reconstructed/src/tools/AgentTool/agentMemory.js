/**
 * tools/AgentTool/agentMemory.ts
 *
 * 代理持久记忆：user/project/local 三种 scope 的目录、路径判定与记忆提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/agentMemory.ts
 * pieces: chunk-82kqcve8.js (18)
 * attribution: file-local 1, fingerprint 4, layout 11, callgraph-fingerprint 1, placement 1
 */
import { join, sep, dirname, basename, normalize } from "path";
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
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";

//@ chunk-82kqcve8.js:152284-152365 file-local
/**
 * 代理类型名转为安全目录名（非 [A-Za-z0-9-_] 换成 -）。
 */
function sanitizeAgentTypeForPath(agentType) {
  let replaced = agentType.replace(/[^a-zA-Z0-9\-_]/g, "-");
  return replaced === "" ? "unknown" : replaced;
}
//@ chunk-82kqcve8.js:152365-152586 fingerprint = getLocalAgentMemoryDir (1)
/**
 * local scope 的代理记忆目录。
 */
function getLocalAgentMemoryDir(dirName) {
  if (process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR)
    return (
      join(
        process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR,
        "projects",
        sanitizePath(storageRootFor(getProjectRoot()) ?? getProjectRoot()),
        "agent-memory-local",
        dirName,
      ) + sep
    );
  return join(getCwd(), ".claude", "agent-memory-local", dirName) + sep;
}
//@ chunk-82kqcve8.js:152586-152760 fingerprint = getAgentMemoryDir (1)
/**
 * 代理持久记忆目录：project → <cwd>/.claude/agent-memory/<type>/，local → .claude/agent-memory-local/（或 CLAUDE_CODE_REMOTE_MEMORY_DIR 下），user → <记忆根>/agent-memory/<type>/。
 */
function getAgentMemoryDir(agentType, scope) {
  let dirName = sanitizeAgentTypeForPath(agentType);
  switch (scope) {
    case "project":
      return join(getCwd(), ".claude", "agent-memory", dirName) + sep;
    case "local":
      return getLocalAgentMemoryDir(dirName);
    case "user":
      return join(getMemoryBaseDir(), "agent-memory", dirName) + sep;
  }
}
//@ chunk-82kqcve8.js:152760-152793 layout
function isNonUserMemoryScope(e) {
  return e !== "user";
}
//@ chunk-82kqcve8.js:152793-153253 layout
/**
 * 决定代理记忆目录的 MEMORY.md 入口如何读取：用户范围直接 follow；项目/本地范围在工作目录内或不存在时只读普通文件；指向工作目录外或无法解析时不读并记 tengu_agent_memory_entrypoint_skipped。
 */
function resolveMemoryEntrypointMode(scope, memoryDir) {
  if (!isNonUserMemoryScope(scope)) return "follow";
  if (!isPathWithinDir(memoryDir, getCwd())) return "regular-file";
  let r = classifyPathAgainstDir(memoryDir, getCwd());
  if (r === "beneath" || r === "absent") return "regular-file";
  logEvent("tengu_agent_memory_entrypoint_skipped", {
    reason: fromEnum(r === "elsewhere" ? "folder_link" : "folder_unresolved"),
  });
  logForDebugging(
    r === "elsewhere"
      ? `agent memory: ${memoryDir} leads out of the working copy or through a dangling link; its MEMORY.md is not read`
      : `agent memory: ${memoryDir} could not be resolved; its MEMORY.md is not read`,
  );
  return "none";
}
//@ chunk-82kqcve8.js:153253-153496 layout
/**
 * 为回忆解析代理记忆目录：用户范围直接返回；项目/本地范围要求实路径仍在工作目录内（防软链逃逸），返回 {dir, regularFilesOnly:true, containedIn}，否则 null。
 */
async function resolveAgentMemoryDirForRecall(agentType, scope) {
  let agentMemoryDir = getAgentMemoryDir(agentType, scope);
  if (!isNonUserMemoryScope(scope))
    return {
      dir: agentMemoryDir,
      regularFilesOnly: false,
    };
  let s = await realpathForRecall(agentMemoryDir);
  if (s === null) return null;
  if (isPathWithinDir(agentMemoryDir, getCwd())) {
    let h = await realpathForRecall(getCwd());
    if (h === null || !isPathWithinDir(s, h)) return null;
  }
  return {
    dir: agentMemoryDir,
    regularFilesOnly: true,
    containedIn: s,
  };
}
//@ chunk-82kqcve8.js:153496-153563 layout
async function isRealpathWithin(filePath, containedIn) {
  let r = await realpathForRecall(filePath);
  return r !== null && isPathWithinDir(r, containedIn);
}
//@ chunk-82kqcve8.js:153563-153736 layout
async function realpathForRecall(e) {
  try {
    return await getFsImplementation()
      .realpath(e)
      .catch((error) => resolveOnPermissionError(e, error));
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`agent memory: ${e} could not be resolved; not read for recall`);
    return null;
  }
}
//@ chunk-82kqcve8.js:153736-153783 layout
function isPathWithinDir(e, n) {
  return e.startsWith(join(n, sep));
}
//@ chunk-82kqcve8.js:153783-153867 layout
function resolveOnPermissionError(e, error) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode !== "EPERM" && errnoCode !== "EACCES") throw error;
  return realpathExaminedSync(getFsImplementation(), e);
}
//@ chunk-82kqcve8.js:153867-154263 layout
/**
 * 判断路径相对目录的位置：beneath（实路径在目录下）、absent（尚不存在但最近存在的祖先在目录下）、elsewhere、unresolved。
 */
function classifyPathAgainstDir(e, cwd) {
  let fsImplementation = getFsImplementation();
  let replaced = e.replace(/[\\/]+$/, "");
  let h;
  try {
    h = realpathExaminedSync(fsImplementation, cwd);
  } catch {
    return "unresolved";
  }
  try {
    return isPathWithinDir(realpathExaminedSync(fsImplementation, replaced), h) ? "beneath" : "elsewhere";
  } catch (error) {
    if (!isMissingOrNotDirError(error)) return "unresolved";
  }
  try {
    fsImplementation.lstatSync(replaced);
    return "elsewhere";
  } catch (error) {
    if (!isMissingOrNotDirError(error)) return "unresolved";
  }
  let { existing, missing } = splitExistingPathPrefix(fsImplementation, replaced);
  try {
    return isPathWithinDir(join(realpathExaminedSync(fsImplementation, existing), ...missing), h)
      ? "absent"
      : "elsewhere";
  } catch (error) {
    return isMissingOrNotDirError(error) ? "elsewhere" : "unresolved";
  }
}
//@ chunk-82kqcve8.js:154263-154398 layout
function splitExistingPathPrefix(e, n, r = []) {
  try {
    e.lstatSync(n);
  } catch (error) {
    let h = dirname(n);
    if (isMissingOrNotDirError(error) && h !== n) return splitExistingPathPrefix(e, h, [basename(n), ...r]);
  }
  return {
    existing: n,
    missing: r,
  };
}
//@ chunk-82kqcve8.js:154398-154443 layout = isRealPathWithinTeamDir (1)
/**
 * realpath 后判断是否在团队记忆目录内；团队目录尚不存在时视为在内。
 */
function isMissingOrNotDirError(realCandidate) {
  return isENOENT(realCandidate) || getErrnoCode(realCandidate) === "ENOTDIR";
}
//@ chunk-82kqcve8.js:154443-154893 fingerprint = isAgentMemoryPath (1)
/**
 * 路径属于某个代理记忆目录时返回该记忆根前缀。
 */
function isAgentMemoryPath(absolutePath) {
  let memoryBase = getMemoryBaseDirOrNull();
  if (memoryBase !== null) {
    let h = join(memoryBase, "agent-memory") + sep;
    if (absolutePath.startsWith(h)) return h;
  }
  let r = join(getCwd(), ".claude", "agent-memory") + sep;
  if (absolutePath.startsWith(r)) return r;
  if (process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR) {
    let h = join(process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR, "projects") + sep;
    if (absolutePath.includes(sep + "agent-memory-local" + sep) && absolutePath.startsWith(h)) return h;
    return null;
  }
  let s = join(getCwd(), ".claude", "agent-memory-local") + sep;
  if (absolutePath.startsWith(s)) return s;
  return null;
}
//@ chunk-82kqcve8.js:154893-154956 layout
/**
 * 路径位于代理记忆目录内部（权限系统据此放行记忆读写）。
 */
function isInsideAgentMemoryDir(e) {
  let absolutePath = normalize(e);
  let r = isAgentMemoryPath(absolutePath);
  return r !== null && !isProtectedDirPath(absolutePath, r);
}
//@ chunk-82kqcve8.js:154956-155665 fingerprint = loadAgentMemoryPrompt (0.929)
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
//@ chunk-82kqcve8.js:155665-155789 callgraph-fingerprint = getMemoryScopeDisplay (0.358)
/**
 * user scope 且记忆根为默认位置时，返回记忆目录的显示信息。
 */
function getMemoryScopeDisplay(agentType, memory) {
  if (
    memory !== "user" ||
    join(getMemoryBaseDir(), "agent-memory") !== join(getClaudeConfigDir(), "agent-memory")
  )
    return;
  return STORAGE_SPACES.agentMemory(sanitizeAgentTypeForPath(agentType), [MEMORY_INDEX_FILENAME]);
}
//@ chunk-82kqcve8.js:155789-156030 placement
/**
 * 读取 agent 的记忆范围内容（自动记忆开启且 agent 配置了 memory 时），找不到时返回空串；与工作流脚本文件无关，疑似放错文件。
 */
async function readAgentMemoryScope(e, storageV5) {
  if (storageV5 === undefined || e.memory === undefined || !isAutoMemoryEnabled()) return;
  let memoryScopeDisplay = getMemoryScopeDisplay(e.agentType, e.memory);
  if (memoryScopeDisplay === undefined) return;
  let s = await storageV5.readText([memoryScopeDisplay]).catch(() => {
    return;
  });
  let h = s?.ok ? s.value.items[0] : undefined;
  return h !== undefined && h.found ? h.value : "";
}
export {
  readAgentMemoryScope,
  loadAgentMemoryPrompt,
  isInsideAgentMemoryDir,
  resolveAgentMemoryDirForRecall,
  isRealpathWithin,
  getAgentMemoryDir,
};
