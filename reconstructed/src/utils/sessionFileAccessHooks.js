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
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import { FileReadTool } from "../tools/FileReadTool/FileReadTool.js";
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";
import { fileEditInputSchema } from "../../vendor/diff/lib/index.mjs";
import { FILE_EDIT_TOOL_NAME } from "../tools/FileEditTool/constants.js";
import { FileWriteTool } from "../tools/FileWriteTool/FileWriteTool.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { MEMORY_READ, MEMORY_WRITE } from "../tools/MemoryTool/memoryToolNames.js";
import { MemoryReadTool, personalMemoryReadPath } from "../tools/MemoryReadTool/MemoryReadTool.js";
import { MemoryWriteTool, personalMemoryReadResult } from "../tools/MemoryTool/memoryWrite.js";
import { PERSONAL, xVe } from "../services/memoryStore/memoryDocumentFs.js";
import { Pk } from "../services/orgMemory/storeApi.js";
import {
  detectSessionFileType_2,
  detectSessionPatternType,
  isAutoMemFilePath,
} from "./memoryFileDetection.js";
import { GrepTool } from "../tools/GrepTool/GrepTool.js";
import { GREP_TOOL_NAME } from "../tools/GrepTool/prompt.js";
import { GlobTool } from "../tools/GlobTool/GlobTool.js";
import { GLOB_TOOL_NAME } from "../tools/GlobTool/prompt.js";
import { SPe } from "../memdir/teamMemPrompts.js";
import { isOutsideAllowedRoot, getPersonalMemoryDir } from "../services/memoryStore/memoryKeys.js";
import { MEMORY_INDEX_FILENAME, nfcLower as nfcLower_2 } from "../memdir/memdir.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { memoryWatchers } from "../services/memorySync/memoryWatcher.js";
import { bgr } from "./cwd.js";
import { getSubagentLogName, isSubagentContext } from "./agentContext.js";
import { truncateUntrustedFrontmatter } from "../memdir/memoryTypes.js";
import { ICe } from "./instructionFileAccess.js";
import { sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import {
  checkTeamMemoryIndexReadSize,
  checkMemoryIndexReadSize,
  checkMemoryRecallLimit,
} from "../memdir/memoryRecall.js";
import { getMemoryDirNfc } from "../memdir/teamMemPaths.js";
import { buildPostToolUseContextOutput } from "../entrypoints/sdk/coreSchemas.js";
import { isDiskless, registerHookCallbacks } from "../bootstrap/state.js";

//@ chunk-e6aww6q8.js:1465221-1465635 fingerprint = getFilePathFromInput (0.802)
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
      let safeParse = (toolName === MEMORY_READ ? MemoryReadTool : MemoryWriteTool).inputSchema.safeParse(
        toolInput,
      );
      return safeParse.success && safeParse.data.store === PERSONAL ? xVe(Pk(safeParse.data.path)) : null;
    }
    default:
      return null;
  }
}
//@ chunk-e6aww6q8.js:1465635-1466140 fingerprint = getSessionFileTypeFromInput (1)
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
function isMemoryFileAccess(e, n) {
  let r = getFilePathFromInput(e, n);
  if (r && (isAutoMemFilePath(r) || SPe(r))) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:1466213-1466275 layout = isSessionPlanFile (1)
function isMemoryTopicFile(absolutePath) {
  return (
    absolutePath.endsWith(".md") &&
    isOutsideAllowedRoot(absolutePath) &&
    basename_30(absolutePath) !== MEMORY_INDEX_FILENAME
  );
}
/**
 * 记忆路径分类（topic/entrypoint/reserved/other）。
 */
//@ chunk-e6aww6q8.js:1466275-1466472 layout
function classifyMemoryPath(e) {
  if (isMemoryTopicFile(e)) return "topic";
  let n = nfcLower_2(resolve_25(getPersonalMemoryDir()));
  if (!nfcLower_2(resolve_25(e)).startsWith(n + sep_35)) return "other";
  if (!isOutsideAllowedRoot(e)) return "reserved";
  return basename_30(e) === MEMORY_INDEX_FILENAME && nfcLower_2(resolve_25(dirname_35(e))) === n
    ? "entrypoint"
    : "other";
}
//@ chunk-e6aww6q8.js:1466472-1466555 layout
function W9t(e, n, r) {
  if (!isMemoryTopicFile(n)) return;
  logEvent("tengu_memdir_pin_write", { tool: fromEnum(e), ...r });
}
/**
 * PostToolUse 回调：模型读写会话转录或记忆目录时打 tengu_transcript_accessed / tengu_memdir_accessed。
 */
//@ chunk-e6aww6q8.js:1466555-1468907 fingerprint = handleSessionFileAccess (0.59)
async function handleSessionFileAccess(e, n, r, s, h) {
  if (e.hook_event_name !== "PostToolUse" || h === void 0) return {};
  let of = memoryWatchers.of(h.session.host),
    fileType = getSessionFileTypeFromInput(e.tool_name, e.tool_input),
    store = bgr.getStore(),
    L = store ? getSubagentLogName(store) : void 0,
    G = L ? { subagent_name: L } : {};
  if (fileType === "session_transcript") logEvent("tengu_transcript_accessed", { ...G });
  let q = e.tool_name === MEMORY_WRITE ? personalMemoryReadResult(e.tool_response) : null,
    Z =
      e.tool_name === MEMORY_WRITE
        ? (q?.filePath ?? null)
        : e.tool_name === MEMORY_READ
          ? personalMemoryReadPath(e.tool_response)
          : getFilePathFromInput(e.tool_name, e.tool_input),
    Se = e.tool_name === FILE_READ_TOOL_NAME || e.tool_name === MEMORY_READ,
    ke =
      e.tool_name === FILE_EDIT_TOOL_NAME ||
      e.tool_name === FILE_WRITE_TOOL_NAME ||
      e.tool_name === MEMORY_WRITE,
    we =
      Z && isAutoMemFilePath(Z)
        ? e.tool_name === MEMORY_WRITE
          ? truncateUntrustedFrontmatter(q?.content ?? "")
          : e.tool_name === FILE_WRITE_TOOL_NAME
            ? truncateUntrustedFrontmatter(
                FileWriteTool.inputSchema.safeParse(e.tool_input).data?.content ?? "",
              )
            : void 0
        : void 0;
  if (Z && isAutoMemFilePath(Z)) {
    let of_2 = ICe.of(h.session),
      Ae = {
        file_class: fromEnum(classifyMemoryPath(Z)),
        prior_access: fromEnum(of_2.priorAccess(Z)),
        injected: fromEnum(of_2.injection(Z)),
        ...G,
      };
    switch (
      (logEvent("tengu_memdir_accessed", { tool: sanitizeToolNameForAnalytics(e.tool_name), ...Ae }),
      e.tool_name)
    ) {
      case FILE_READ_TOOL_NAME:
      case MEMORY_READ:
        (logEvent("tengu_memdir_file_read", Ae), of_2.recordAccess(Z, "read"));
        break;
      case FILE_EDIT_TOOL_NAME:
        (logEvent("tengu_memdir_file_edit", Ae),
          W9t(FILE_EDIT_TOOL_NAME, Z, G),
          of_2.recordAccess(Z, "write"),
          of.notifyWrite(Z));
        break;
      case FILE_WRITE_TOOL_NAME:
      case MEMORY_WRITE:
        (logEvent("tengu_memdir_file_write", Ae),
          W9t(e.tool_name, Z, G),
          of_2.recordAccess(Z, "write"),
          of.notifyWrite(Z));
        break;
    }
  }
  if (Z && SPe(Z))
    switch (
      (logEvent("tengu_team_mem_accessed", { tool: sanitizeToolNameForAnalytics(e.tool_name), ...G }),
      e.tool_name)
    ) {
      case FILE_READ_TOOL_NAME:
        logEvent("tengu_team_mem_file_read", { ...G });
        break;
      case FILE_EDIT_TOOL_NAME:
        logEvent("tengu_team_mem_file_edit", { ...G });
        break;
      case FILE_WRITE_TOOL_NAME:
        logEvent("tengu_team_mem_file_write", { ...G });
        break;
    }
  if (Z && (Se || ke) && isAutoMemFilePath(Z)) {
    let scope = Boolean(store && isSubagentContext(store)),
      take = of.notices.take(scope ? Z : void 0, scope && Se ? { peek: !0 } : void 0);
    if (take !== null)
      return (
        logEvent("tengu_team_mem_conflict_notice_delivered", { ...G }),
        { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: take } }
      );
  }
  if (Z && ke && isAutoMemFilePath(Z)) {
    let persistenceWarning = await of.getPersistenceWarning(Z);
    if (persistenceWarning !== null)
      return (
        logEvent("tengu_memory_sync_persistence_warning", { ...G }),
        { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: persistenceWarning } }
      );
  }
  if (Z && ke && SPe(Z)) {
    let Ee = await checkTeamMemoryIndexReadSize(Z, getMemoryDirNfc());
    if (Ee !== null) return buildPostToolUseContextOutput("tengu_team_mem_prompt_index_near_cap", Ee, G);
  }
  if (Z && ke) {
    let Ee = await checkMemoryIndexReadSize(Z);
    if (Ee !== null) return buildPostToolUseContextOutput("tengu_memdir_entrypoint_near_cap", Ee, G);
  }
  if (Z && ke && isAutoMemFilePath(Z)) {
    let Ee = await checkMemoryRecallLimit(Z, we);
    if (Ee !== null)
      switch (Ee.kind) {
        case "size":
          return buildPostToolUseContextOutput("tengu_memdir_file_near_cap", Ee, G);
        case "lint":
          return (
            logEvent("tengu_memdir_file_lint", { kind: fromEnum(Ee.lint), ...G }),
            { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: Ee.text } }
          );
      }
  }
  return {};
}
//@ chunk-e6aww6q8.js:1469041-1469310 facade-exports = registerSessionFileAccessHooks (1)
function registerSessionFileAccessHooks() {
  if (isDiskless()) return;
  let hook = { type: "callback", callback: handleSessionFileAccess, timeout: 1, internal: !0 };
  registerHookCallbacks({
    PostToolUse: [
      { matcher: FILE_READ_TOOL_NAME, hooks: [hook] },
      { matcher: GREP_TOOL_NAME, hooks: [hook] },
      { matcher: GLOB_TOOL_NAME, hooks: [hook] },
      { matcher: FILE_EDIT_TOOL_NAME, hooks: [hook] },
      { matcher: FILE_WRITE_TOOL_NAME, hooks: [hook] },
      { matcher: MEMORY_READ, hooks: [hook] },
      { matcher: MEMORY_WRITE, hooks: [hook] },
    ],
  });
}

export { isMemoryFileAccess };
