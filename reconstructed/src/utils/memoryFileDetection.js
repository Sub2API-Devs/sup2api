/**
 * utils/memoryFileDetection.ts
 *
 * 判断路径/命令/模式是否指向记忆目录或会话转录，以及记忆作用域（team/personal）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/memoryFileDetection.ts
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: affinity 1, file-local 3, fingerprint 5, layout 3
 */
import {
  win32,
  win32 as win32_2,
  win32 as win32_3,
  win32 as win32_4,
  win32 as win32_5,
  win32 as win32_6,
  win32 as win32_7,
  win32 as win32_8,
  posix,
  posix as posix_2,
  posix as posix_3,
  posix as posix_4,
  posix as posix_5,
  posix as posix_6,
  posix as posix_7,
  posix as posix_8,
  posix as posix_9,
  posix as posix_10,
  posix as posix_11,
  posix as posix_12,
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
  normalize as normalize_4,
  normalize as normalize_5,
  normalize as normalize_6,
  normalize as normalize_7,
  normalize as normalize_8,
  normalize as normalize_9,
} from "path";
import { getClaudeConfigDirOrNull } from "./envUtils.js";
import {
  isAutoMemoryEnabled,
  isAutoMemPath,
  getMemoryBaseDirOrNull,
  getAutoMemPath,
} from "../memdir/paths.js";
import { SPe } from "../memdir/teamMemPrompts.js";
import { isInsideAgentMemoryDir } from "../tools/AgentTool/agentMemory.js";
import { a4, isTeamMemPath } from "../memdir/teamMemPaths.js";
import { windowsPathToPosixPath, B8 } from "./path.js";

//@ chunk-e6aww6q8.js:1463431-1463442 affinity
var memoryFileDetectionDisabled = !1;
//@ chunk-e6aww6q8.js:1463442-1463496 file-local
function toPosix(p) {
  return p.split(win32_3.sep).join(posix_7.sep);
}
//@ chunk-e6aww6q8.js:1463496-1463553 file-local
function toComparable(p) {
  let posixForm = toPosix(p);
  return memoryFileDetectionDisabled ? posixForm.toLowerCase() : posixForm;
}
//@ chunk-e6aww6q8.js:1463553-1463744 fingerprint = detectSessionFileType (0.887)
function detectSessionFileType_2(filePath) {
  let configDir = getClaudeConfigDirOrNull();
  if (configDir === null) return null;
  let normalized = toComparable(filePath),
    configDirCmp = toComparable(configDir);
  if (!normalized.startsWith(configDirCmp)) return null;
  if (normalized.includes("/projects/") && normalized.endsWith(".jsonl")) return "session_transcript";
  return null;
}
/**
 * glob 模式是否指向会话转录（projects/**\/*.jsonl）。
 */
//@ chunk-e6aww6q8.js:1463744-1463907 fingerprint = detectSessionPatternType (0.922)
function detectSessionPatternType(pattern) {
  let normalized = pattern.split(win32_3.sep).join(posix_7.sep);
  if (normalized.includes(".jsonl") || (normalized.includes("projects") && normalized.includes("*.jsonl")))
    return "session_transcript";
  return null;
}
//@ chunk-e6aww6q8.js:1463907-1463952 layout
function isAutoMemFilePath(e) {
  if (isAutoMemoryEnabled()) return isAutoMemPath(e);
  return !1;
}
/**
 * 记忆路径的作用域：team 或 personal。
 */
//@ chunk-e6aww6q8.js:1463952-1464029 fingerprint = memoryScopeForPath (1)
function memoryScopeForPath(filePath) {
  if (SPe(filePath)) return "team";
  if (isAutoMemFilePath(filePath)) return "personal";
  return null;
}
//@ chunk-e6aww6q8.js:1464029-1464076 layout
function isAutoMemPattern(e) {
  if (isAutoMemoryEnabled()) return isInsideAgentMemoryDir(e);
  return !1;
}
/**
 * 路径是否属于记忆或会话文件（自动记忆、agent memory、会话转录或匹配模式）。
 */
//@ chunk-e6aww6q8.js:1464076-1464181 layout
function isMemoryOrSessionFile(e) {
  if (isAutoMemFilePath(e)) return !0;
  if (SPe(e)) return !0;
  if (detectSessionFileType_2(e) !== null) return !0;
  if (isAutoMemPattern(e)) return !0;
  return !1;
}
/**
 * 路径是否为记忆目录（agent-memory、agent-memory-local、projects/*\/memory 等）。
 */
//@ chunk-e6aww6q8.js:1464181-1464635 fingerprint = isMemoryDirectory (1)
function isMemoryDirectory(dirPath) {
  let n = getClaudeConfigDirOrNull(),
    r = getMemoryBaseDirOrNull();
  if (n === null || r === null) return !1;
  let normalizedPath = normalize_6(dirPath),
    normalizedCmp = toComparable(normalizedPath);
  if (
    isAutoMemoryEnabled() &&
    (normalizedCmp.includes("/agent-memory/") || normalizedCmp.includes("/agent-memory-local/"))
  )
    return !0;
  if (a4() && isTeamMemPath(normalizedPath)) return !0;
  if (isAutoMemoryEnabled()) {
    let autoMemPath = getAutoMemPath(),
      autoMemDirCmp = toComparable(autoMemPath.replace(/[/\\]+$/, "")),
      autoMemPathCmp = toComparable(autoMemPath);
    if (normalizedCmp === autoMemDirCmp || normalizedCmp.startsWith(autoMemPathCmp)) return !0;
  }
  let configDirCmp = toComparable(n),
    memoryBaseCmp = toComparable(r),
    underConfig = normalizedCmp.startsWith(configDirCmp),
    underMemoryBase = normalizedCmp.startsWith(memoryBaseCmp);
  if (!underConfig && !underMemoryBase) return !1;
  if (underConfig && normalizedCmp.includes("/projects/")) return !0;
  if (isAutoMemoryEnabled() && normalizedCmp.includes("/memory/")) return !0;
  return !1;
}
/**
 * 判断 shell 命令是否操作记忆目录（用于遥测/权限）。
 */
//@ chunk-e6aww6q8.js:1464635-1465045 file-local
function isShellCommandTargetingMemory(command) {
  let configDir = getClaudeConfigDirOrNull(),
    memoryBase = getMemoryBaseDirOrNull();
  if (configDir === null || memoryBase === null) return !1;
  let s = isAutoMemoryEnabled() ? getAutoMemPath().replace(/[/\\]+$/, "") : "",
    commandCmp = toComparable(command);
  if (
    ![configDir, memoryBase, s].filter(Boolean).some((L) => {
      if (commandCmp.includes(toComparable(L))) return !0;
      if (memoryFileDetectionDisabled) return commandCmp.includes(windowsPathToPosixPath(L).toLowerCase());
      return !1;
    })
  )
    return !1;
  let matches = command.match(/(?:[A-Za-z]:[/\\]|\/)[^\s'"]+/g);
  if (!matches) return !1;
  for (let match of matches) {
    let cleanPath = match.replace(/[,;|&>]+$/, ""),
      q = memoryFileDetectionDisabled ? B8(cleanPath) : cleanPath;
    if (isMemoryOrSessionFile(q) || isMemoryDirectory(q)) return !0;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1465045-1465221 fingerprint = isAutoManagedMemoryPattern (1)
function isAutoManagedMemoryPattern(pattern) {
  if (detectSessionPatternType(pattern) !== null) return !0;
  if (
    isAutoMemoryEnabled() &&
    (pattern.replaceAll("\\", "/").includes("agent-memory/") ||
      pattern.replaceAll("\\", "/").includes("agent-memory-local/"))
  )
    return !0;
  return !1;
}

export {
  isAutoMemFilePath,
  detectSessionFileType_2,
  detectSessionPatternType,
  isMemoryOrSessionFile,
  isMemoryDirectory,
  isAutoManagedMemoryPattern,
  isShellCommandTargetingMemory,
  memoryScopeForPath,
};
