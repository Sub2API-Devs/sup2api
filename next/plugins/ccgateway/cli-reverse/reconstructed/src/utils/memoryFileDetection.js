/**
 * utils/memoryFileDetection.ts
 *
 * 判断路径/命令/模式是否指向记忆目录或会话转录，以及记忆作用域（team/personal）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/memoryFileDetection.ts
 * pieces: chunk-5xgkngpb.js (12)
 * attribution: affinity 1, file-local 3, fingerprint 5, layout 3
 */
import { win32, posix, normalize } from "path";
import { getClaudeConfigDirOrNull } from "./envUtils.js";
import {
  isAutoMemoryEnabled,
  isAutoMemPath,
  getMemoryBaseDirOrNull,
  getAutoMemPath,
} from "../memdir/paths.js";
import { isTeamMemoryPath } from "../memdir/teamMemPrompts.js";
import { isInsideAgentMemoryDir } from "../tools/AgentTool/agentMemory.js";
import { canUseTeamMemory, isTeamMemPath } from "../memdir/teamMemPaths.js";
import { windowsPathToPosixPath, posixPathToWindowsPath } from "./path.js";

//@ chunk-5xgkngpb.js:1464030-1464041 affinity
var memoryFileDetectionDisabled = false;
//@ chunk-5xgkngpb.js:1464041-1464095 file-local
function toPosix(p) {
  return p.split(win32.sep).join(posix.sep);
}
//@ chunk-5xgkngpb.js:1464095-1464152 file-local
function toComparable(p) {
  let posixForm = toPosix(p);
  return memoryFileDetectionDisabled ? posixForm.toLowerCase() : posixForm;
}
//@ chunk-5xgkngpb.js:1464152-1464344 fingerprint (2.1.88 match: detectSessionFileType, 0.887)
function detectSessionFileType_2(filePath) {
  let configDir = getClaudeConfigDirOrNull();
  if (configDir === null) return null;
  let normalized = toComparable(filePath);
  let configDirCmp = toComparable(configDir);
  if (!normalized.startsWith(configDirCmp)) return null;
  if (normalized.includes("/projects/") && normalized.endsWith(".jsonl")) return "session_transcript";
  return null;
}
//@ chunk-5xgkngpb.js:1464344-1464507 fingerprint (2.1.88 match: detectSessionPatternType, 0.921)
/**
 * glob 模式是否指向会话转录（projects/**\/*.jsonl）。
 */
function detectSessionPatternType(pattern) {
  let normalized = pattern.split(win32.sep).join(posix.sep);
  if (normalized.includes(".jsonl") || (normalized.includes("projects") && normalized.includes("*.jsonl")))
    return "session_transcript";
  return null;
}
//@ chunk-5xgkngpb.js:1464507-1464552 layout
function isAutoMemFilePath(filePath) {
  if (isAutoMemoryEnabled()) return isAutoMemPath(filePath);
  return false;
}
//@ chunk-5xgkngpb.js:1464552-1464629 fingerprint (2.1.88 match: memoryScopeForPath, 1)
/**
 * 记忆路径的作用域：team 或 personal。
 */
function memoryScopeForPath(filePath) {
  if (isTeamMemoryPath(filePath)) return "team";
  if (isAutoMemFilePath(filePath)) return "personal";
  return null;
}
//@ chunk-5xgkngpb.js:1464629-1464676 layout
function isAutoMemPattern(filePath) {
  if (isAutoMemoryEnabled()) return isInsideAgentMemoryDir(filePath);
  return false;
}
//@ chunk-5xgkngpb.js:1464676-1464782 layout
/**
 * 路径是否属于记忆或会话文件（自动记忆、agent memory、会话转录或匹配模式）。
 */
function isMemoryOrSessionFile(filePath) {
  if (isAutoMemFilePath(filePath)) return true;
  if (isTeamMemoryPath(filePath)) return true;
  if (detectSessionFileType_2(filePath) !== null) return true;
  if (isAutoMemPattern(filePath)) return true;
  return false;
}
//@ chunk-5xgkngpb.js:1464782-1465238 fingerprint (2.1.88 match: isMemoryDirectory, 1)
/**
 * 路径是否为记忆目录（agent-memory、agent-memory-local、projects/*\/memory 等）。
 */
function isMemoryDirectory(dirPath) {
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  let memoryBaseDirOrNull = getMemoryBaseDirOrNull();
  if (claudeConfigDirOrNull === null || memoryBaseDirOrNull === null) return false;
  let normalizedPath = normalize(dirPath);
  let normalizedCmp = toComparable(normalizedPath);
  if (
    isAutoMemoryEnabled() &&
    (normalizedCmp.includes("/agent-memory/") || normalizedCmp.includes("/agent-memory-local/"))
  )
    return true;
  if (canUseTeamMemory() && isTeamMemPath(normalizedPath)) return true;
  if (isAutoMemoryEnabled()) {
    let autoMemPath = getAutoMemPath();
    let autoMemDirCmp = toComparable(autoMemPath.replace(/[/\\]+$/, ""));
    let autoMemPathCmp = toComparable(autoMemPath);
    if (normalizedCmp === autoMemDirCmp || normalizedCmp.startsWith(autoMemPathCmp)) return true;
  }
  let configDirCmp = toComparable(claudeConfigDirOrNull);
  let memoryBaseCmp = toComparable(memoryBaseDirOrNull);
  let underConfig = normalizedCmp.startsWith(configDirCmp);
  let underMemoryBase = normalizedCmp.startsWith(memoryBaseCmp);
  if (!underConfig && !underMemoryBase) return false;
  if (underConfig && normalizedCmp.includes("/projects/")) return true;
  if (isAutoMemoryEnabled() && normalizedCmp.includes("/memory/")) return true;
  return false;
}
//@ chunk-5xgkngpb.js:1465238-1465648 file-local
/**
 * 判断 shell 命令是否操作记忆目录（用于遥测/权限）。
 */
function isShellCommandTargetingMemory(command) {
  let configDir = getClaudeConfigDirOrNull();
  let memoryBase = getMemoryBaseDirOrNull();
  if (configDir === null || memoryBase === null) return false;
  let autoMemDir = isAutoMemoryEnabled() ? getAutoMemPath().replace(/[/\\]+$/, "") : "";
  let commandCmp = toComparable(command);
  if (
    ![configDir, memoryBase, autoMemDir].filter(Boolean).some((dir) => {
      if (commandCmp.includes(toComparable(dir))) return true;
      if (memoryFileDetectionDisabled) return commandCmp.includes(windowsPathToPosixPath(dir).toLowerCase());
      return false;
    })
  )
    return false;
  let matches = command.match(/(?:[A-Za-z]:[/\\]|\/)[^\s'"]+/g);
  if (!matches) return false;
  for (let match of matches) {
    let cleanPath = match.replace(/[,;|&>]+$/, "");
    let nativePath = memoryFileDetectionDisabled ? posixPathToWindowsPath(cleanPath) : cleanPath;
    if (isMemoryOrSessionFile(nativePath) || isMemoryDirectory(nativePath)) return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:1465648-1465824 fingerprint (2.1.88 match: isAutoManagedMemoryPattern, 1)
function isAutoManagedMemoryPattern(pattern) {
  if (detectSessionPatternType(pattern) !== null) return true;
  if (
    isAutoMemoryEnabled() &&
    (pattern.replaceAll("\\", "/").includes("agent-memory/") ||
      pattern.replaceAll("\\", "/").includes("agent-memory-local/"))
  )
    return true;
  return false;
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
