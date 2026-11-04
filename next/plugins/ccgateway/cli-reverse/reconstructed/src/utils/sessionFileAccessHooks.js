/**
 * utils/sessionFileAccessHooks.ts
 *
 * PostToolUse 回调：统计模型读写会话转录/记忆目录的行为。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionFileAccessHooks.ts
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: fingerprint 3, facade-exports 2, layout 3
 */
import { basename, resolve as resolve_2, sep, dirname } from "path";
import { FileReadTool } from "../tools/FileReadTool/FileReadTool.js";
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";
import { fileEditInputSchema } from "../../vendor/diff/lib/index.mjs";
import { FILE_EDIT_TOOL_NAME } from "../tools/FileEditTool/constants.js";
import { FileWriteTool } from "../tools/FileWriteTool/FileWriteTool.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { MEMORY_READ, MEMORY_WRITE } from "../tools/MemoryTool/memoryToolNames.js";
import { MemoryReadTool, personalMemoryReadPath } from "../tools/MemoryReadTool/MemoryReadTool.js";
import { MemoryWriteTool, personalMemoryReadResult } from "../tools/MemoryTool/memoryWrite.js";
import { PERSONAL, autoMemFilePath } from "../services/memoryStore/memoryDocumentFs.js";
import { normalizePathPrefix } from "../services/orgMemory/storeApi.js";
import {
  detectSessionFileType_2,
  detectSessionPatternType,
  isAutoMemFilePath,
} from "./memoryFileDetection.js";
import { GrepTool } from "../tools/GrepTool/GrepTool.js";
import { GREP_TOOL_NAME } from "../tools/GrepTool/prompt.js";
import { GlobTool } from "../tools/GlobTool/GlobTool.js";
import { GLOB_TOOL_NAME } from "../tools/GlobTool/prompt.js";
import { isTeamMemoryPath } from "../memdir/teamMemPrompts.js";
import { isOutsideAllowedRoot, getPersonalMemoryDir } from "../services/memoryStore/memoryKeys.js";
import { MEMORY_INDEX_FILENAME, nfcLower as nfcLower_2 } from "../memdir/memdir.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { memoryWatchers } from "../services/memorySync/memoryWatcher.js";
import { contextKeyStorage } from "./cwd.js";
import { getSubagentLogName, isSubagentContext } from "./agentContext.js";
import { truncateUntrustedFrontmatter } from "../memdir/memoryTypes.js";
import { claudeMdAccessTrackerSlot } from "./instructionFileAccess.js";
import { sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import {
  checkTeamMemoryIndexReadSize,
  checkMemoryIndexReadSize,
  checkMemoryRecallLimit,
} from "../memdir/memoryRecall.js";
import { getMemoryDirNfc } from "../memdir/teamMemPaths.js";
import { buildPostToolUseContextOutput } from "../entrypoints/sdk/coreSchemas.js";
import { isDiskless, registerHookCallbacks } from "../bootstrap/state.js";

//@ chunk-e6aww6q8.js:1465221-1465635 fingerprint (2.1.88 match: getFilePathFromInput, 0.802)
function getFilePathFromInput(toolName, toolInput) {
  switch (toolName) {
    case FILE_READ_TOOL_NAME: {
      let parsed = FileReadTool.inputSchema.safeParse(toolInput);
      return parsed.success ? parsed.data.file_path : null;
    }
    case FILE_EDIT_TOOL_NAME: {
      let parsed = fileEditInputSchema().safeParse(toolInput);
      return parsed.success ? parsed.data.file_path : null;
    }
    case FILE_WRITE_TOOL_NAME: {
      let parsed = FileWriteTool.inputSchema.safeParse(toolInput);
      return parsed.success ? parsed.data.file_path : null;
    }
    case MEMORY_READ:
    case MEMORY_WRITE: {
      let parsed = (toolName === MEMORY_READ ? MemoryReadTool : MemoryWriteTool).inputSchema.safeParse(
        toolInput,
      );
      return parsed.success && parsed.data.store === PERSONAL
        ? autoMemFilePath(normalizePathPrefix(parsed.data.path))
        : null;
    }
    default:
      return null;
  }
}
//@ chunk-e6aww6q8.js:1465635-1466140 fingerprint (2.1.88 match: getSessionFileTypeFromInput, 1)
function getSessionFileTypeFromInput(toolName, toolInput) {
  switch (toolName) {
    case FILE_READ_TOOL_NAME: {
      let parsed = FileReadTool.inputSchema.safeParse(toolInput);
      if (!parsed.success) return null;
      return detectSessionFileType_2(parsed.data.file_path);
    }
    case GREP_TOOL_NAME: {
      let parsed = GrepTool.inputSchema.safeParse(toolInput);
      if (!parsed.success) return null;
      if (parsed.data.path) {
        let pathType = detectSessionFileType_2(parsed.data.path);
        if (pathType) return pathType;
      }
      if (parsed.data.glob) {
        let globType = detectSessionPatternType(parsed.data.glob);
        if (globType) return globType;
      }
      return null;
    }
    case GLOB_TOOL_NAME: {
      let parsed = GlobTool.inputSchema.safeParse(toolInput);
      if (!parsed.success) return null;
      if (parsed.data.path) {
        let pathType = detectSessionFileType_2(parsed.data.path);
        if (pathType) return pathType;
      }
      let patternType = detectSessionPatternType(parsed.data.pattern);
      if (patternType) return patternType;
      return null;
    }
    default:
      return null;
  }
}
//@ chunk-e6aww6q8.js:1466140-1466213 facade-exports
function isMemoryFileAccess(toolName, toolInput) {
  let filePathFromInput = getFilePathFromInput(toolName, toolInput);
  if (filePathFromInput && (isAutoMemFilePath(filePathFromInput) || isTeamMemoryPath(filePathFromInput)))
    return true;
  return false;
}
//@ chunk-e6aww6q8.js:1466213-1466275 layout (2.1.88 match: isSessionPlanFile, 1)
function isMemoryTopicFile(absolutePath) {
  return (
    absolutePath.endsWith(".md") &&
    isOutsideAllowedRoot(absolutePath) &&
    basename(absolutePath) !== MEMORY_INDEX_FILENAME
  );
}
//@ chunk-e6aww6q8.js:1466275-1466472 layout
/**
 * 记忆路径分类（topic/entrypoint/reserved/other）。
 */
function classifyMemoryPath(path) {
  if (isMemoryTopicFile(path)) return "topic";
  let memoryRoot = nfcLower_2(resolve_2(getPersonalMemoryDir()));
  if (!nfcLower_2(resolve_2(path)).startsWith(memoryRoot + sep)) return "other";
  if (!isOutsideAllowedRoot(path)) return "reserved";
  return basename(path) === MEMORY_INDEX_FILENAME && nfcLower_2(resolve_2(dirname(path))) === memoryRoot
    ? "entrypoint"
    : "other";
}
//@ chunk-e6aww6q8.js:1466472-1466555 layout
function queuedSessionFileAccessHook(toolName, absolutePath, extra) {
  if (!isMemoryTopicFile(absolutePath)) return;
  logEvent("tengu_memdir_pin_write", {
    tool: fromEnum(toolName),
    ...extra,
  });
}
//@ chunk-e6aww6q8.js:1466555-1468907 fingerprint (2.1.88 match: handleSessionFileAccess, 0.59)
/**
 * PostToolUse 回调：模型读写会话转录或记忆目录时打 tengu_transcript_accessed / tengu_memdir_accessed。
 */
async function handleSessionFileAccess(hookInput, toolUseId, toolName, toolInput, context) {
  if (hookInput.hook_event_name !== "PostToolUse" || context === undefined) return {};
  let watchers = memoryWatchers.of(context.session.host);
  let fileType = getSessionFileTypeFromInput(hookInput.tool_name, hookInput.tool_input);
  let agentContext = contextKeyStorage.getStore();
  let subagentName = agentContext ? getSubagentLogName(agentContext) : undefined;
  let subagentFields = subagentName
    ? {
        subagent_name: subagentName,
      }
    : {};
  if (fileType === "session_transcript")
    logEvent("tengu_transcript_accessed", {
      ...subagentFields,
    });
  let writeResult =
    hookInput.tool_name === MEMORY_WRITE ? personalMemoryReadResult(hookInput.tool_response) : null;
  let filePath =
    hookInput.tool_name === MEMORY_WRITE
      ? (writeResult?.filePath ?? null)
      : hookInput.tool_name === MEMORY_READ
        ? personalMemoryReadPath(hookInput.tool_response)
        : getFilePathFromInput(hookInput.tool_name, hookInput.tool_input);
  let isRead = hookInput.tool_name === FILE_READ_TOOL_NAME || hookInput.tool_name === MEMORY_READ;
  let isWrite =
    hookInput.tool_name === FILE_EDIT_TOOL_NAME ||
    hookInput.tool_name === FILE_WRITE_TOOL_NAME ||
    hookInput.tool_name === MEMORY_WRITE;
  let writtenContent =
    filePath && isAutoMemFilePath(filePath)
      ? hookInput.tool_name === MEMORY_WRITE
        ? truncateUntrustedFrontmatter(writeResult?.content ?? "")
        : hookInput.tool_name === FILE_WRITE_TOOL_NAME
          ? truncateUntrustedFrontmatter(
              FileWriteTool.inputSchema.safeParse(hookInput.tool_input).data?.content ?? "",
            )
          : undefined
      : undefined;
  if (filePath && isAutoMemFilePath(filePath)) {
    let tracker = claudeMdAccessTrackerSlot.of(context.session);
    let fields = {
      file_class: fromEnum(classifyMemoryPath(filePath)),
      prior_access: fromEnum(tracker.priorAccess(filePath)),
      injected: fromEnum(tracker.injection(filePath)),
      ...subagentFields,
    };
    switch (
      (logEvent("tengu_memdir_accessed", {
        tool: sanitizeToolNameForAnalytics(hookInput.tool_name),
        ...fields,
      }),
      hookInput.tool_name)
    ) {
      case FILE_READ_TOOL_NAME:
      case MEMORY_READ:
        logEvent("tengu_memdir_file_read", fields);
        tracker.recordAccess(filePath, "read");
        break;
      case FILE_EDIT_TOOL_NAME:
        logEvent("tengu_memdir_file_edit", fields);
        queuedSessionFileAccessHook(FILE_EDIT_TOOL_NAME, filePath, subagentFields);
        tracker.recordAccess(filePath, "write");
        watchers.notifyWrite(filePath);
        break;
      case FILE_WRITE_TOOL_NAME:
      case MEMORY_WRITE:
        logEvent("tengu_memdir_file_write", fields);
        queuedSessionFileAccessHook(hookInput.tool_name, filePath, subagentFields);
        tracker.recordAccess(filePath, "write");
        watchers.notifyWrite(filePath);
        break;
    }
  }
  if (filePath && isTeamMemoryPath(filePath))
    switch (
      (logEvent("tengu_team_mem_accessed", {
        tool: sanitizeToolNameForAnalytics(hookInput.tool_name),
        ...subagentFields,
      }),
      hookInput.tool_name)
    ) {
      case FILE_READ_TOOL_NAME:
        logEvent("tengu_team_mem_file_read", {
          ...subagentFields,
        });
        break;
      case FILE_EDIT_TOOL_NAME:
        logEvent("tengu_team_mem_file_edit", {
          ...subagentFields,
        });
        break;
      case FILE_WRITE_TOOL_NAME:
        logEvent("tengu_team_mem_file_write", {
          ...subagentFields,
        });
        break;
    }
  if (filePath && (isRead || isWrite) && isAutoMemFilePath(filePath)) {
    let scope = Boolean(agentContext && isSubagentContext(agentContext));
    let notice = watchers.notices.take(
      scope ? filePath : undefined,
      scope && isRead
        ? {
            peek: true,
          }
        : undefined,
    );
    if (notice !== null) {
      logEvent("tengu_team_mem_conflict_notice_delivered", {
        ...subagentFields,
      });
      return {
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: notice,
        },
      };
    }
  }
  if (filePath && isWrite && isAutoMemFilePath(filePath)) {
    let persistenceWarning = await watchers.getPersistenceWarning(filePath);
    if (persistenceWarning !== null) {
      logEvent("tengu_memory_sync_persistence_warning", {
        ...subagentFields,
      });
      return {
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: persistenceWarning,
        },
      };
    }
  }
  if (filePath && isWrite && isTeamMemoryPath(filePath)) {
    let warning = await checkTeamMemoryIndexReadSize(filePath, getMemoryDirNfc());
    if (warning !== null)
      return buildPostToolUseContextOutput("tengu_team_mem_prompt_index_near_cap", warning, subagentFields);
  }
  if (filePath && isWrite) {
    let warning = await checkMemoryIndexReadSize(filePath);
    if (warning !== null)
      return buildPostToolUseContextOutput("tengu_memdir_entrypoint_near_cap", warning, subagentFields);
  }
  if (filePath && isWrite && isAutoMemFilePath(filePath)) {
    let limit = await checkMemoryRecallLimit(filePath, writtenContent);
    if (limit !== null)
      switch (limit.kind) {
        case "size":
          return buildPostToolUseContextOutput("tengu_memdir_file_near_cap", limit, subagentFields);
        case "lint":
          logEvent("tengu_memdir_file_lint", {
            kind: fromEnum(limit.lint),
            ...subagentFields,
          });
          return {
            hookSpecificOutput: {
              hookEventName: "PostToolUse",
              additionalContext: limit.text,
            },
          };
      }
  }
  return {};
}
//@ chunk-e6aww6q8.js:1469041-1469310 facade-exports (2.1.88 match: registerSessionFileAccessHooks, 1)
function registerSessionFileAccessHooks() {
  if (isDiskless()) return;
  let hook = {
    type: "callback",
    callback: handleSessionFileAccess,
    timeout: 1,
    internal: true,
  };
  registerHookCallbacks({
    PostToolUse: [
      {
        matcher: FILE_READ_TOOL_NAME,
        hooks: [hook],
      },
      {
        matcher: GREP_TOOL_NAME,
        hooks: [hook],
      },
      {
        matcher: GLOB_TOOL_NAME,
        hooks: [hook],
      },
      {
        matcher: FILE_EDIT_TOOL_NAME,
        hooks: [hook],
      },
      {
        matcher: FILE_WRITE_TOOL_NAME,
        hooks: [hook],
      },
      {
        matcher: MEMORY_READ,
        hooks: [hook],
      },
      {
        matcher: MEMORY_WRITE,
        hooks: [hook],
      },
    ],
  });
}
export { isMemoryFileAccess, registerSessionFileAccessHooks };
