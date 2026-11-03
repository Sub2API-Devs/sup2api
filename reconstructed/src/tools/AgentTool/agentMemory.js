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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
} from "path";
import { sanitizePath } from "../../utils/sessionStoragePortable.js";
import { GD } from "../../utils/settings/settingsStorage.js";
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

/**
 * 代理类型名转为安全目录名（非 [A-Za-z0-9-_] 换成 -）。
 */
//@ chunk-82kqcve8.js:152284-152365 file-local
function sanitizeAgentTypeForPath(agentType) {
  let replaced = agentType.replace(/[^a-zA-Z0-9\-_]/g, "-");
  return replaced === "" ? "unknown" : replaced;
}
/**
 * local scope 的代理记忆目录。
 */
//@ chunk-82kqcve8.js:152365-152586 fingerprint = getLocalAgentMemoryDir (1)
function getLocalAgentMemoryDir(dirName) {
  if (process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR)
    return (
      join_2(
        process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR,
        "projects",
        sanitizePath(GD(getProjectRoot()) ?? getProjectRoot()),
        "agent-memory-local",
        dirName,
      ) + sep_2
    );
  return join_2(getCwd(), ".claude", "agent-memory-local", dirName) + sep_2;
}
/**
 * 代理持久记忆目录：project → <cwd>/.claude/agent-memory/<type>/，local → .claude/agent-memory-local/（或 CLAUDE_CODE_REMOTE_MEMORY_DIR 下），user → <记忆根>/agent-memory/<type>/。
 */
//@ chunk-82kqcve8.js:152586-152760 fingerprint = getAgentMemoryDir (1)
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
//@ chunk-82kqcve8.js:152760-152793 layout
function isNonUserMemoryScope(e) {
  return e !== "user";
}
/**
 * 决定代理记忆目录的 MEMORY.md 入口如何读取：用户范围直接 follow；项目/本地范围在工作目录内或不存在时只读普通文件；指向工作目录外或无法解析时不读并记 tengu_agent_memory_entrypoint_skipped。
 */
//@ chunk-82kqcve8.js:152793-153253 layout
function resolveMemoryEntrypointMode(e, n) {
  if (!isNonUserMemoryScope(e)) return "follow";
  if (!isPathWithinDir(n, getCwd())) return "regular-file";
  let r = classifyPathAgainstDir(n, getCwd());
  if (r === "beneath" || r === "absent") return "regular-file";
  return (
    logEvent("tengu_agent_memory_entrypoint_skipped", {
      reason: fromEnum(r === "elsewhere" ? "folder_link" : "folder_unresolved"),
    }),
    logForDebugging(
      r === "elsewhere"
        ? `agent memory: ${n} leads out of the working copy or through a dangling link; its MEMORY.md is not read`
        : `agent memory: ${n} could not be resolved; its MEMORY.md is not read`,
    ),
    "none"
  );
}
/**
 * 为回忆解析代理记忆目录：用户范围直接返回；项目/本地范围要求实路径仍在工作目录内（防软链逃逸），返回 {dir, regularFilesOnly:true, containedIn}，否则 null。
 */
//@ chunk-82kqcve8.js:153253-153496 layout
async function resolveAgentMemoryDirForRecall(e, n) {
  let r = getAgentMemoryDir(e, n);
  if (!isNonUserMemoryScope(n)) return { dir: r, regularFilesOnly: !1 };
  let s = await realpathForRecall(r);
  if (s === null) return null;
  if (isPathWithinDir(r, getCwd())) {
    let h = await realpathForRecall(getCwd());
    if (h === null || !isPathWithinDir(s, h)) return null;
  }
  return { dir: r, regularFilesOnly: !0, containedIn: s };
}
//@ chunk-82kqcve8.js:153496-153563 layout
async function isRealpathWithin(e, n) {
  let r = await realpathForRecall(e);
  return r !== null && isPathWithinDir(r, n);
}
//@ chunk-82kqcve8.js:153563-153736 layout
async function realpathForRecall(e) {
  try {
    return await getFsImplementation()
      .realpath(e)
      .catch((n) => resolveOnPermissionError(e, n));
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`agent memory: ${e} could not be resolved; not read for recall`);
    return null;
  }
}
//@ chunk-82kqcve8.js:153736-153783 layout
function isPathWithinDir(e, n) {
  return e.startsWith(join_2(n, sep_2));
}
//@ chunk-82kqcve8.js:153783-153867 layout
function resolveOnPermissionError(e, n) {
  let r = getErrnoCode(n);
  if (r !== "EPERM" && r !== "EACCES") throw n;
  return realpathExaminedSync(getFsImplementation(), e);
}
/**
 * 判断路径相对目录的位置：beneath（实路径在目录下）、absent（尚不存在但最近存在的祖先在目录下）、elsewhere、unresolved。
 */
//@ chunk-82kqcve8.js:153867-154263 layout
function classifyPathAgainstDir(e, n) {
  let r = getFsImplementation(),
    replaced = e.replace(/[\\/]+$/, ""),
    h;
  try {
    h = realpathExaminedSync(r, n);
  } catch {
    return "unresolved";
  }
  try {
    return isPathWithinDir(realpathExaminedSync(r, replaced), h) ? "beneath" : "elsewhere";
  } catch (error) {
    if (!isMissingOrNotDirError(error)) return "unresolved";
  }
  try {
    return (r.lstatSync(replaced), "elsewhere");
  } catch (error) {
    if (!isMissingOrNotDirError(error)) return "unresolved";
  }
  let { existing: existing, missing: missing } = splitExistingPathPrefix(r, replaced);
  try {
    return isPathWithinDir(join_2(realpathExaminedSync(r, existing), ...missing), h) ? "absent" : "elsewhere";
  } catch (error) {
    return isMissingOrNotDirError(error) ? "elsewhere" : "unresolved";
  }
}
//@ chunk-82kqcve8.js:154263-154398 layout
function splitExistingPathPrefix(e, n, r = []) {
  try {
    e.lstatSync(n);
  } catch (error) {
    let h = dirname_2(n);
    if (isMissingOrNotDirError(error) && h !== n) return splitExistingPathPrefix(e, h, [basename_2(n), ...r]);
  }
  return { existing: n, missing: r };
}
/**
 * realpath 后判断是否在团队记忆目录内；团队目录尚不存在时视为在内。
 */
//@ chunk-82kqcve8.js:154398-154443 layout = isRealPathWithinTeamDir (1)
function isMissingOrNotDirError(realCandidate) {
  return isENOENT(realCandidate) || getErrnoCode(realCandidate) === "ENOTDIR";
}
/**
 * 路径属于某个代理记忆目录时返回该记忆根前缀。
 */
//@ chunk-82kqcve8.js:154443-154893 fingerprint = isAgentMemoryPath (1)
function isAgentMemoryPath(absolutePath) {
  let memoryBase = getMemoryBaseDirOrNull();
  if (memoryBase !== null) {
    let h = join_2(memoryBase, "agent-memory") + sep_2;
    if (absolutePath.startsWith(h)) return h;
  }
  let r = join_2(getCwd(), ".claude", "agent-memory") + sep_2;
  if (absolutePath.startsWith(r)) return r;
  if (process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR) {
    let h = join_2(process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR, "projects") + sep_2;
    if (absolutePath.includes(sep_2 + "agent-memory-local" + sep_2) && absolutePath.startsWith(h)) return h;
    return null;
  }
  let s = join_2(getCwd(), ".claude", "agent-memory-local") + sep_2;
  if (absolutePath.startsWith(s)) return s;
  return null;
}
/**
 * 路径位于代理记忆目录内部（权限系统据此放行记忆读写）。
 */
//@ chunk-82kqcve8.js:154893-154956 layout
function isInsideAgentMemoryDir(e) {
  let n = normalize_2(e),
    r = isAgentMemoryPath(n);
  return r !== null && !isProtectedDirPath(n, r);
}
/**
 * 生成代理记忆提示词（Persistent Agent Memory）：按 scope 给出写作指引，必要时创建目录，附加 CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES。
 */
//@ chunk-82kqcve8.js:154956-155665 fingerprint = loadAgentMemoryPrompt (0.929)
function loadAgentMemoryPrompt(e, n, r, s) {
  let scopeNote;
  switch (n) {
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
  let memoryDir = getAgentMemoryDir(e, n),
    w = resolveMemoryEntrypointMode(n, memoryDir);
  if (w !== "none") ensureMemoryDirExists(memoryDir, r);
  let coworkExtraGuidelines = process.env.CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES;
  return buildMemoryPrompt(
    {
      displayName: "Persistent Agent Memory",
      memoryDir: memoryDir,
      extraGuidelines:
        coworkExtraGuidelines && coworkExtraGuidelines.trim().length > 0
          ? [scopeNote, coworkExtraGuidelines]
          : [scopeNote],
      ...(s !== void 0 && { primedEntrypoint: s }),
      entrypointRead: w,
    },
    r,
  );
}
/**
 * user scope 且记忆根为默认位置时，返回记忆目录的显示信息。
 */
//@ chunk-82kqcve8.js:155665-155789 callgraph-fingerprint = getMemoryScopeDisplay (0.358)
function getMemoryScopeDisplay(e, n) {
  if (
    n !== "user" ||
    join_2(getMemoryBaseDir(), "agent-memory") !== join_2(getClaudeConfigDir(), "agent-memory")
  )
    return;
  return STORAGE_SPACES.agentMemory(sanitizeAgentTypeForPath(e), [MEMORY_INDEX_FILENAME]);
}
/**
 * 读取 agent 的记忆范围内容（自动记忆开启且 agent 配置了 memory 时），找不到时返回空串；与工作流脚本文件无关，疑似放错文件。
 */
//@ chunk-82kqcve8.js:155789-156030 placement
async function readAgentMemoryScope(e, n) {
  if (n === void 0 || e.memory === void 0 || !isAutoMemoryEnabled()) return;
  let r = getMemoryScopeDisplay(e.agentType, e.memory);
  if (r === void 0) return;
  let s = await n.readText([r]).catch(() => {
      return;
    }),
    h = s?.ok ? s.value.items[0] : void 0;
  return h !== void 0 && h.found ? h.value : "";
}

export {
  readAgentMemoryScope,
  loadAgentMemoryPrompt,
  isInsideAgentMemoryDir,
  resolveAgentMemoryDirForRecall,
  isRealpathWithin,
  getAgentMemoryDir,
};
