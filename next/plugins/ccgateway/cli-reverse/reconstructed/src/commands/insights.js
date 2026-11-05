/**
 * commands/insights.ts
 *
 * /insights 实现：扫描历史会话生成使用报告（语言统计、摘要、HTML 报告）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/insights.ts
 * pieces: chunk-f2v3cjkz.js (63), chunk-n5rwkt40.js (5), chunk-pc3x100t.js (1), chunk-vvzj896g.js (1), chunk-wjygkcr4.js (1)
 * attribution: sole-consumer 5, fingerprint 31, layout 26, callgraph-fingerprint 2, affinity 3, file-local 2, placement 2
 */
import { join, extname } from "path";
import * as fsPromisesModule from "fs/promises";
import { mkdir, writeFile, readFile, unlink, readdir } from "fs/promises";
import {
  sanitizePathForGit,
  buildSafeGitEnv,
  SAFE_GIT_ENV,
  C_LOCALE_ENV,
  DISABLED_SSH_ENV,
} from "../utils/git/gitSafeEnv.js";
import { ARTIFACT_BLOCK_TAGS } from "../constants/xml.js";
import {
  isUserQueuedCommandAttachment,
  isRealUserPromptMessage,
  extractTextContent_2,
} from "../utils/messages.js";
import { truncateToLength, countCharInString, firstLineOf } from "../utils/stringUtils.js";
import { areBuiltinModelsKnownHosted } from "../utils/model/smallFastModel.js";
import { getDefaultOpusModel, getMainLoopModel } from "../utils/model/model.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  numberSchema,
  record,
  array,
  booleanSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../utils/markdownConfigLoader.js";
import { STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { logForDebugging } from "../utils/debug.js";
import { formatStorageError } from "../utils/storage/storageErrors.js";
import { createJsonStore } from "../utils/jsonStore.js";
import { isCcsTenant, isDiskless, getSessionId } from "../bootstrap/state.js";
import { AGENT, TASK } from "../tools/AgentTool/constants.js";
import { EDIT } from "../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../tools/NotebookEditTool/constants.js";
import { countLineChanges } from "../native-ts/color-diff/index.js";
import { diffLines } from "../../vendor/diff/libesm/diff/line.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { getDestructiveTargetCategory } from "../tools/BashTool/destructiveTargets.js";
import { checkReadOnlyConstraints } from "../tools/BashTool/readOnlyValidation.js";
import { commandHasAnyCd } from "../tools/BashTool/bashPermissions.js";
import { SPLIT_MAX_LEN } from "../utils/bash/commands.js";
import {
  getSessionIdFromLog,
  getProjectsDir,
  getSessionFilesWithMtime,
  loadAllLogsFromSessionFile,
} from "../utils/sessionStorage.js";
import { queryHaiku } from "../services/api/claude.js";
import { asSystemPrompt } from "../utils/systemPromptType.js";
import { mainAgentContext } from "../utils/agentContext.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { jsonParse, jsonStringify } from "../utils/slowOperations.js";
import { batchReadWithFallback } from "../utils/plugins/pluginStartupCheck.js";
import { logError } from "../utils/log.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isFsInaccessible,
  toError,
  withTelemetryMessage,
} from "../utils/errors.js";
import { tagAndManifestArtifactContent } from "../utils/messages/untrustedArtifactContent.js";
import { isAutoModeSetupNotOverridden } from "./auto-mode-setup/index.js";
import { getAutoModeConfig } from "../utils/settings/settings.js";
import { escapeXmlAttr } from "../utils/xml.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "../utils/pagedRead.js";
import { normalizeUuidOrNull } from "../utils/agentId.js";
import { recordToolUsed } from "../services/compact/keptTools.js";
import { UNREADABLE_TOOLS_USED_BEFORE_SUMMARY } from "../bootstrap/stateSlices.js";
import { getToolPermissionContext } from "../utils/permissions/toolPermissionContext.js";
import { canCycleToAuto } from "../utils/permissions/getNextPermissionMode.js";
import { SandboxManager } from "../utils/sandbox/sandbox-adapter.js";
import { isAutoClassifierActive } from "../utils/permissions/autoModeState.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromNumber } from "../services/analytics/safeMetadata.js";
import { builtinToolNameForMcp } from "../services/analytics/metadata.js";
import { roundToMinute } from "../utils/cronTasks.js";
import { formatBriefTimestamp } from "../utils/formatBriefTimestamp.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-vvzj896g.js:1462-1599 fingerprint (2.1.88 match: getRemoteHostSessionCount, 0.406)
function getRemoteHostSessionCount(env, options = {}) {
  let allowsSsh = env?.GIT_ALLOW_PROTOCOL?.split(":").includes("ssh") ?? false;
  return sanitizePathForGit(
    buildSafeGitEnv(
      {
        ...SAFE_GIT_ENV,
        ...(options.userLocale !== true && C_LOCALE_ENV),
        ...(!allowsSsh && DISABLED_SSH_ENV),
      },
      env,
      options,
    ),
  );
}
//@ chunk-n5rwkt40.js:304-473 placement
/**
 * 字符串或数组规整为内容块数组
 */
function toContentBlocks(content) {
  if (typeof content === "string")
    return [
      {
        type: "text",
        text: content,
      },
    ];
  if (!Array.isArray(content)) return [];
  return content.filter((entry) => entry !== null && typeof entry === "object" && !Array.isArray(entry));
}
//@ chunk-n5rwkt40.js:473-540 placement
var regExp; // deferred: uses COMMAND_NAME (../constants/xml.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-n5rwkt40.js:473", () => {
  regExp = new RegExp(`<(${ARTIFACT_BLOCK_TAGS.join("|")})>[\\s\\S]*?(?:</\\1>|$)`, "g");
});
//@ chunk-n5rwkt40.js:540-584 layout
function stripXmlTags(text) {
  return text.replace(regExp, "").trim();
}
//@ chunk-n5rwkt40.js:584-707 layout
function textBlocksOf(content) {
  return toContentBlocks(content)
    .flatMap((block) => (block.type === "text" && typeof block.text === "string" ? [block.text] : []))
    .map(stripXmlTags)
    .filter((text) => text !== "");
}
//@ chunk-n5rwkt40.js:707-1637 fingerprint (2.1.88 match: formatTranscriptForFacets, 0.363)
function formatTranscriptForFacets(messages, options) {
  let lines = [];
  let seen = new Set();
  for (let block of messages) {
    if (
      block.type === "attachment" &&
      typeof block.attachment === "object" &&
      block.attachment !== null &&
      isUserQueuedCommandAttachment(block)
    ) {
      let prompt = block.attachment.type === "queued_command" ? block.attachment.prompt : "";
      let sourceUuid = block.attachment.source_uuid;
      if (typeof sourceUuid === "string") {
        if (seen.has(sourceUuid)) continue;
        seen.add(sourceUuid);
      }
      for (let line of textBlocksOf(prompt))
        lines.push(`[User]: ${truncateToLength(line, options.userTextChars)}`);
      continue;
    }
    if (block.type === "user" && block.message) {
      if (block.isCompactSummary) {
        for (let text of textBlocksOf(block.message.content))
          lines.push(`[Summary of earlier conversation]: ${truncateToLength(text, options.userTextChars)}`);
        continue;
      }
      if (!isRealUserPromptMessage(block) || (typeof block.uuid === "string" && seen.has(block.uuid)))
        continue;
      for (let text of textBlocksOf(block.message.content))
        lines.push(`[User]: ${truncateToLength(text, options.userTextChars)}`);
    } else if (block.type === "assistant" && block.message) {
      for (let contentBlock of toContentBlocks(block.message.content))
        if (contentBlock.type === "text" && typeof contentBlock.text === "string")
          lines.push(`[Assistant]: ${truncateToLength(contentBlock.text, options.assistantTextChars)}`);
        else if (contentBlock.type === "tool_use" && typeof contentBlock.name === "string")
          lines.push(`[Tool: ${contentBlock.name}]`);
    }
  }
  return lines;
}
//@ chunk-f2v3cjkz.js:13686-13723 sole-consumer
function insightsModel() {
  return areBuiltinModelsKnownHosted() ? getDefaultOpusModel() : getMainLoopModel();
}
//@ chunk-f2v3cjkz.js:13723-16751 fingerprint (2.1.88 match: LABEL_MAP, 0.741)
/**
 * /insights 会话元数据缓存的 zod 结构（消息数、工具计数、语言、git 提交、token、代码行变化、权限模式等）；Ve 是扩展名到语言名表，qe 是分面键到显示名的表。
 */
var sessionMetaSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var EXTENSION_TO_LANGUAGE;
var FACET_LABELS;
deferInit("chunk-f2v3cjkz.js:13723", () => {
  sessionMetaSchema = DoctorLazy(() =>
    objectSchema({
      session_id: stringSchema(),
      transcript_mtime: numberSchema().optional(),
      project_path: stringSchema(),
      start_time: stringSchema(),
      duration_minutes: numberSchema(),
      user_message_count: numberSchema(),
      assistant_message_count: numberSchema(),
      tool_counts: record(stringSchema(), numberSchema()).optional(),
      languages: record(stringSchema(), numberSchema()).optional(),
      git_commits: numberSchema(),
      git_pushes: numberSchema(),
      input_tokens: numberSchema(),
      output_tokens: numberSchema(),
      first_prompt: stringSchema(),
      summary: stringSchema().optional(),
      user_interruptions: numberSchema().optional(),
      user_response_times: array(numberSchema()).optional(),
      tool_errors: numberSchema().optional(),
      tool_error_categories: record(stringSchema(), numberSchema()).optional(),
      uses_task_agent: booleanSchema().optional(),
      uses_mcp: booleanSchema().optional(),
      uses_web_search: booleanSchema().optional(),
      uses_web_fetch: booleanSchema().optional(),
      lines_added: numberSchema().optional(),
      lines_removed: numberSchema().optional(),
      files_modified: numberSchema().optional(),
      message_hours: array(numberSchema()).optional(),
      user_message_timestamps: array(stringSchema()).optional(),
      permission_mode: stringSchema().optional(),
      bash_would_prompt_count: numberSchema().optional(),
      file_edit_tool_count: numberSchema().optional(),
      destructive_command_count: numberSchema().optional(),
    }),
  );
  EXTENSION_TO_LANGUAGE = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".py": "Python",
    ".rb": "Ruby",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".c": "C",
    ".h": "C",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".hpp": "C++",
    ".hh": "C++",
    ".hxx": "C++",
    ".ipp": "C++",
    ".md": "Markdown",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".sh": "Shell",
    ".css": "CSS",
    ".html": "HTML",
  };
  FACET_LABELS = {
    debug_investigate: "Debug/Investigate",
    implement_feature: "Implement Feature",
    fix_bug: "Fix Bug",
    write_script_tool: "Write Script/Tool",
    refactor_code: "Refactor Code",
    configure_system: "Configure System",
    create_pr_commit: "Create PR/Commit",
    analyze_data: "Analyze Data",
    understand_codebase: "Understand Codebase",
    write_tests: "Write Tests",
    write_docs: "Write Docs",
    deploy_infra: "Deploy/Infra",
    warmup_minimal: "Cache Warmup",
    fast_accurate_search: "Fast/Accurate Search",
    correct_code_edits: "Correct Code Edits",
    good_explanations: "Good Explanations",
    proactive_help: "Proactive Help",
    multi_file_changes: "Multi-file Changes",
    handled_complexity: "Multi-file Changes",
    good_debugging: "Good Debugging",
    misunderstood_request: "Misunderstood Request",
    wrong_approach: "Wrong Approach",
    buggy_code: "Buggy Code",
    user_rejected_action: "User Rejected Action",
    claude_got_blocked: "Claude Got Blocked",
    user_stopped_early: "User Stopped Early",
    wrong_file_or_location: "Wrong File/Location",
    excessive_changes: "Excessive Changes",
    slow_or_verbose: "Slow/Verbose",
    tool_failed: "Tool Failed",
    user_unclear: "User Unclear",
    external_issue: "External Issue",
    frustrated: "Frustrated",
    dissatisfied: "Dissatisfied",
    likely_satisfied: "Likely Satisfied",
    satisfied: "Satisfied",
    happy: "Happy",
    unsure: "Unsure",
    neutral: "Neutral",
    delighted: "Delighted",
    single_task: "Single Task",
    multi_task: "Multi Task",
    iterative_refinement: "Iterative Refinement",
    exploration: "Exploration",
    quick_question: "Quick Question",
    fully_achieved: "Fully Achieved",
    mostly_achieved: "Mostly Achieved",
    partially_achieved: "Partially Achieved",
    not_achieved: "Not Achieved",
    unclear_from_transcript: "Unclear",
    unhelpful: "Unhelpful",
    slightly_helpful: "Slightly Helpful",
    moderately_helpful: "Moderately Helpful",
    very_helpful: "Very Helpful",
    essential: "Essential",
  };
});
//@ chunk-f2v3cjkz.js:16751-16794 fingerprint (2.1.88 match: getDataDir, 1)
function getDataDir() {
  return join(getClaudeConfigDir(), "usage-data");
}
//@ chunk-f2v3cjkz.js:16794-16833 fingerprint (2.1.88 match: getFacetsDir, 1)
function getFacetsDir() {
  return join(getDataDir(), "facets");
}
//@ chunk-f2v3cjkz.js:16833-16878 fingerprint (2.1.88 match: getSessionMetaDir, 1)
function getSessionMetaDir() {
  return join(getDataDir(), "session-meta");
}
//@ chunk-f2v3cjkz.js:16878-16954 layout
function facetsStorePath(sessionId) {
  return STORAGE_SPACES.userConfigDir("usage-data", ["facets", `${sessionId}.json`]);
}
//@ chunk-f2v3cjkz.js:16954-17036 layout
function sessionMetaStorePath(sessionId) {
  return STORAGE_SPACES.userConfigDir("usage-data", ["session-meta", `${sessionId}.json`]);
}
//@ chunk-f2v3cjkz.js:17036-17093 layout (2.1.88 match: getDataDir, 0.8)
function getDataDir_2(name) {
  return STORAGE_SPACES.userConfigDir("usage-data", [name]);
}
//@ chunk-f2v3cjkz.js:17093-17568 callgraph-fingerprint (2.1.88 match: saveSessionMeta, 0.26)
async function saveSessionMeta(htmlReport, sessionId, storageV5) {
  let metaPath = join(getDataDir(), `report-${sessionId}.html`);
  if (isStorageV5Enabled() && storageV5) {
    for (let fileName of [`report-${sessionId}.html`, "report.html"]) {
      let written = await storageV5.write(getDataDir_2(fileName), htmlReport, {
        mode: 384,
        keepExistingMode: true,
      });
      if (!written.ok) {
        logForDebugging(`insights: report write failed: ${formatStorageError(written.error)}`);
        throw Error("insights: report write through the storage backend failed");
      }
    }
    return metaPath;
  }
  try {
    await mkdir(getDataDir(), {
      recursive: true,
    });
  } catch {}
  await writeFile(metaPath, htmlReport, {
    encoding: "utf-8",
    mode: 384,
  });
  await writeFile(join(getDataDir(), "report.html"), htmlReport, {
    encoding: "utf-8",
    mode: 384,
  });
  return metaPath;
}
//@ chunk-f2v3cjkz.js:17568-17748 layout
function isExpectedCacheWriteFailure(error) {
  if (error.code !== "Failed") return false;
  return (
    error.failureClass === "permission" ||
    error.failureClass === "environment" ||
    error.telemetryCode === "UnexpectedAbsent" ||
    error.telemetryCode === "ENOENT"
  );
}
//@ chunk-f2v3cjkz.js:17748-17758 layout
var INSIGHTS_MCP_AUTH_BATCH = 50;
//@ chunk-f2v3cjkz.js:17758-17844 layout
function chunkArray(items, size) {
  let chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}
//@ chunk-f2v3cjkz.js:17844-17963 callgraph-fingerprint (2.1.88 match: loadCachedSessionMeta, 0.327)
function loadCachedSessionMeta(sessionId) {
  return createJsonStore(
    join(getSessionMetaDir(), `${sessionId}.json`),
    () => sessionMetaSchema().nullable(),
    {
      defaultValue: null,
      ensureDir: true,
      indent: 2,
      mode: 384,
    },
  );
}
//@ chunk-f2v3cjkz.js:17963-19111 layout
/**
 * 让模型从单个会话里提取结构化分面（目标类别、满意度、摩擦类型等）的提示词前缀。
 */
var FACET_EXTRACTION_PROMPT = `Analyze this Claude Code session and extract structured facets.

CRITICAL GUIDELINES:

1. **goal_categories**: Count ONLY what the USER explicitly asked for.
   - DO NOT count Claude's autonomous codebase exploration
   - DO NOT count work Claude decided to do on its own
   - ONLY count when user says "can you...", "please...", "I need...", "let's..."

2. **user_satisfaction_counts**: Base ONLY on explicit user signals.
   - "Yay!", "great!", "perfect!" \u2192 happy
   - "thanks", "looks good", "that works" \u2192 satisfied
   - "ok, now let's..." (continuing without complaint) \u2192 likely_satisfied
   - "that's not right", "try again" \u2192 dissatisfied
   - "this is broken", "I give up" \u2192 frustrated

3. **friction_counts**: Be specific about what went wrong.
   - misunderstood_request: Claude interpreted incorrectly
   - wrong_approach: Right goal, wrong solution method
   - buggy_code: Code didn't work correctly
   - user_rejected_action: User said no/stop to a tool call
   - excessive_changes: Over-engineered or changed too much

4. If very short or just warmup, use warmup_minimal for goal_category

SESSION:
`;
//@ chunk-f2v3cjkz.js:19111-19158 layout
function stringOrEmpty(value) {
  return typeof value === "string" ? value : "";
}
//@ chunk-f2v3cjkz.js:19158-19454 layout
var TOOL_ERROR_CATEGORY_RULES = [
  [["exit code"], "Command Failed"],
  [["rejected", "doesn't want"], "User Rejected"],
  [["string to replace not found", "no changes"], "Edit Failed"],
  [["modified since read"], "File Changed"],
  [["exceeds maximum", "too large"], "File Too Large"],
  [["file not found", "does not exist"], "File Not Found"],
];
//@ chunk-f2v3cjkz.js:19454-19592 layout
function categorizeToolError(content) {
  if (typeof content !== "string") return "Other";
  let lower = content.toLowerCase();
  return (
    TOOL_ERROR_CATEGORY_RULES.find(([keywords]) =>
      keywords.some((keyword) => lower.includes(keyword)),
    )?.[1] ?? "Other"
  );
}
//@ chunk-f2v3cjkz.js:19592-21781 fingerprint (2.1.88 match: extractToolStats, 0.704)
function extractToolStats(log) {
  let toolCounts = {};
  let languages = {};
  let gitCommits = 0;
  let gitPushes = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let userInterruptions = 0;
  let userResponseTimes = [];
  let toolErrors = 0;
  let toolErrorCategories = {};
  let usesTaskAgent = false;
  let linesAdded = 0;
  let linesRemoved = 0;
  let filesModified = new Set();
  let messageHours = [];
  let userMessageTimestamps = [];
  let toolCalls = 0;
  let errors = 0;
  let mcpCalls = 0;
  let usesMcp = false;
  let usesWebSearch = false;
  let usesWebFetch = false;
  let lastAssistantTimestamp = null;
  let isCcs = isCcsTenant();
  for (let msg of log.messages) {
    let msgTimestamp = msg.timestamp;
    if (msg.type === "assistant" && msg.message) {
      if (msgTimestamp) lastAssistantTimestamp = msgTimestamp;
      let usage = msg.message.usage;
      if (usage) {
        inputTokens += usage.input_tokens || 0;
        outputTokens += usage.output_tokens || 0;
      }
      let content = msg.message.content;
      if (Array.isArray(content)) {
        for (let block of content)
          if (block.type === "tool_use" && "name" in block) {
            let toolName = block.name;
            toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
            if (toolName === AGENT || toolName === TASK) usesTaskAgent = true;
            if (toolName.startsWith("mcp__")) usesMcp = true;
            if (toolName === "WebSearch") usesWebSearch = true;
            if (toolName === "WebFetch") usesWebFetch = true;
            let input = block.input;
            if (input) {
              let filePath = stringOrEmpty(input.file_path);
              if (filePath) {
                let lang = EXTENSION_TO_LANGUAGE[extname(filePath).toLowerCase()];
                if (lang) languages[lang] = (languages[lang] || 0) + 1;
                if (toolName === "Edit" || toolName === "Write") filesModified.add(filePath);
              }
              if (
                toolName === EDIT ||
                toolName === FILE_WRITE_TOOL_NAME ||
                toolName === NOTEBOOK_EDIT_TOOL_NAME
              )
                errors++;
              if (toolName === "Edit") {
                let oldString = stringOrEmpty(input.old_string);
                let newString = stringOrEmpty(input.new_string);
                if (isCcs) {
                  let changes = countLineChanges(oldString, newString);
                  linesAdded += changes.added;
                  linesRemoved += changes.removed;
                } else
                  for (let change of diffLines(oldString, newString)) {
                    if (change.added) linesAdded += change.count || 0;
                    if (change.removed) linesRemoved += change.count || 0;
                  }
              }
              if (toolName === "Write") {
                let writeContent = stringOrEmpty(input.content);
                if (writeContent)
                  linesAdded +=
                    countCharInString(
                      writeContent,
                      `
`,
                    ) + 1;
              }
              let command = stringOrEmpty(input.command);
              if (command.includes("git commit")) gitCommits++;
              if (command.includes("git push")) gitPushes++;
              if (toolName === BASH_TOOL_NAME && command && !isCcs) {
                if (!isReadOnlyBashCommandCached(command)) {
                  toolCalls++;
                  if (getDestructiveTargetCategory(command) !== null) mcpCalls++;
                }
              }
            }
          }
      }
    }
    if (msg.type === "user" && msg.message) {
      let content = msg.message.content;
      let isHumanMessage = false;
      if (typeof content === "string" && content.trim()) isHumanMessage = true;
      else if (Array.isArray(content)) {
        for (let block of content)
          if (block.type === "text" && "text" in block) {
            isHumanMessage = true;
            break;
          }
      }
      if (isHumanMessage) {
        if (msgTimestamp) {
          let msgDate = new Date(msgTimestamp);
          if (Number.isFinite(msgDate.getTime())) {
            let hour = msgDate.getHours();
            messageHours.push(hour);
            userMessageTimestamps.push(msgTimestamp);
          }
        }
        if (lastAssistantTimestamp && msgTimestamp) {
          let assistantTime = new Date(lastAssistantTimestamp).getTime();
          let responseTimeSec = (new Date(msgTimestamp).getTime() - assistantTime) / 1000;
          if (responseTimeSec > 2 && responseTimeSec < 3600) userResponseTimes.push(responseTimeSec);
        }
      }
      if (Array.isArray(content)) {
        for (let block of content)
          if (block.type === "tool_result" && "content" in block) {
            if (block.is_error) {
              toolErrors++;
              let category = categorizeToolError(block.content);
              toolErrorCategories[category] = (toolErrorCategories[category] || 0) + 1;
            }
          }
      }
      if (typeof content === "string") {
        if (content.includes("[Request interrupted by user")) userInterruptions++;
      } else if (Array.isArray(content)) {
        for (let block of content)
          if (
            block.type === "text" &&
            "text" in block &&
            block.text.includes("[Request interrupted by user")
          ) {
            userInterruptions++;
            break;
          }
      }
    }
  }
  return {
    toolCounts,
    languages,
    gitCommits,
    gitPushes,
    inputTokens,
    outputTokens,
    userInterruptions,
    userResponseTimes,
    toolErrors,
    toolErrorCategories,
    usesTaskAgent,
    usesMcp,
    usesWebSearch,
    usesWebFetch,
    linesAdded,
    linesRemoved,
    filesModified,
    messageHours,
    userMessageTimestamps,
    bashWouldPromptCount: toolCalls,
    fileEditToolCount: errors,
    destructiveCommandCount: mcpCalls,
  };
}
//@ chunk-f2v3cjkz.js:22026-22049 sole-consumer
var INSIGHTS_CACHE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_INSIGHTS_CACHE_ENTRIES;
deferInit("chunk-f2v3cjkz.js:22026", () => {
  INSIGHTS_CACHE = new Map();
  MAX_INSIGHTS_CACHE_ENTRIES = 5000;
});
//@ chunk-f2v3cjkz.js:22049-22254 sole-consumer
function isReadOnlyBashCommandCached(command) {
  let cached = INSIGHTS_CACHE.get(command);
  if (cached !== undefined) return cached;
  let fresh;
  try {
    fresh =
      checkReadOnlyConstraints(
        {
          command,
        },
        commandHasAnyCd(command),
        {
          offlineEstimate: true,
        },
      ).behavior === "allow";
  } catch {
    fresh = false;
  }
  if (command.length <= SPLIT_MAX_LEN) {
    if (INSIGHTS_CACHE.size >= MAX_INSIGHTS_CACHE_ENTRIES) INSIGHTS_CACHE.clear();
    INSIGHTS_CACHE.set(command, fresh);
  }
  return fresh;
}
//@ chunk-f2v3cjkz.js:22254-23593 fingerprint (2.1.88 match: logToSessionMeta, 0.918)
function logToSessionMeta(log) {
  let stats = extractToolStats(log);
  let sessionId = getSessionIdFromLog(log) || "unknown";
  let startTime = log.created.toISOString();
  let durationMinutes = Math.round((log.modified.getTime() - log.created.getTime()) / 1000 / 60);
  let userMessageCount = 0;
  let assistantMessageCount = 0;
  for (let msg of log.messages) {
    if (msg.type === "assistant") assistantMessageCount++;
    if (msg.type === "user" && msg.message) {
      let content = msg.message.content;
      let isHumanMessage = false;
      if (typeof content === "string" && content.trim()) isHumanMessage = true;
      else if (Array.isArray(content)) {
        for (let block of content)
          if (block.type === "text" && "text" in block) {
            isHumanMessage = true;
            break;
          }
      }
      if (isHumanMessage) userMessageCount++;
    }
  }
  return {
    session_id: sessionId,
    project_path: log.relocatedCwd ?? log.projectPath ?? "",
    start_time: startTime,
    duration_minutes: durationMinutes,
    user_message_count: userMessageCount,
    assistant_message_count: assistantMessageCount,
    tool_counts: stats.toolCounts,
    languages: stats.languages,
    git_commits: stats.gitCommits,
    git_pushes: stats.gitPushes,
    input_tokens: stats.inputTokens,
    output_tokens: stats.outputTokens,
    first_prompt: log.firstPrompt || "",
    summary: log.summary,
    user_interruptions: stats.userInterruptions,
    user_response_times: stats.userResponseTimes,
    tool_errors: stats.toolErrors,
    tool_error_categories: stats.toolErrorCategories,
    uses_task_agent: stats.usesTaskAgent,
    uses_mcp: stats.usesMcp,
    uses_web_search: stats.usesWebSearch,
    uses_web_fetch: stats.usesWebFetch,
    lines_added: stats.linesAdded,
    lines_removed: stats.linesRemoved,
    files_modified: stats.filesModified.size,
    message_hours: stats.messageHours,
    user_message_timestamps: stats.userMessageTimestamps,
    permission_mode: log.permissionMode,
    bash_would_prompt_count: stats.bashWouldPromptCount,
    file_edit_tool_count: stats.fileEditToolCount,
    destructive_command_count: stats.destructiveCommandCount,
  };
}
//@ chunk-f2v3cjkz.js:23593-23766 fingerprint (2.1.88 match: deduplicateSessionBranches, 0.759)
function deduplicateSessionBranches(meta, otherMeta) {
  if (!otherMeta) return true;
  if (meta.user_message_count !== otherMeta.user_message_count)
    return meta.user_message_count > otherMeta.user_message_count;
  return meta.duration_minutes > otherMeta.duration_minutes;
}
//@ chunk-f2v3cjkz.js:23766-24071 layout (2.1.88 match: formatTranscriptWithSummarization, 0.799)
function formatTranscriptWithSummarization_2(log) {
  let chunks = [];
  let meta = logToSessionMeta(log);
  chunks.push(`Session: ${meta.session_id.slice(0, 8)}`);
  chunks.push(`Date: ${meta.start_time}`);
  chunks.push(`Project: ${meta.project_path}`);
  chunks.push(`Duration: ${meta.duration_minutes} min`);
  chunks.push("");
  for (let facet of formatTranscriptForFacets(log.messages, {
    userTextChars: 500,
    assistantTextChars: 300,
  }))
    chunks.push(facet);
  return chunks.join(`
`);
}
//@ chunk-f2v3cjkz.js:24071-24398 fingerprint (2.1.88 match: SUMMARIZE_CHUNK_PROMPT, 1)
var SUMMARIZE_CHUNK_PROMPT = `Summarize this portion of a Claude Code session transcript. Focus on:
1. What the user asked for
2. What Claude did (tools used, files modified)
3. Any friction or issues
4. The outcome

Keep it concise - 3-5 sentences. Preserve specific details like file names, error messages, and user feedback.

TRANSCRIPT CHUNK:
`;
//@ chunk-f2v3cjkz.js:24398-24849 fingerprint (2.1.88 match: summarizeTranscriptChunk, 0.873)
async function summarizeTranscriptChunk(chunk, credentials, sectionTitle = "", options) {
  try {
    let result = await queryHaiku({
      systemPrompt: asSystemPrompt([]),
      userPrompt: sectionTitle + SUMMARIZE_CHUNK_PROMPT + chunk,
      signal: options ?? new AbortController().signal,
      options: {
        model: insightsModel(),
        querySource: "insights",
        sendSideQueryBeta: true,
        agents: [],
        isNonInteractiveSession: true,
        hasAppendSystemPrompt: false,
        mcpTools: [],
        maxOutputTokensOverride: 500,
        agentContext: mainAgentContext(),
        credentials,
      },
    });
    if (result.isApiErrorMessage) return chunk.slice(0, 2000);
    return extractTextContent_2(result.message.content) || chunk.slice(0, 2000);
  } catch {
    return chunk.slice(0, 2000);
  }
}
//@ chunk-f2v3cjkz.js:24849-24888 layout
var CCS_INSIGHTS_SESSION_LIMIT; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var INSIGHTS_RUNNING_SLOT;
deferInit("chunk-f2v3cjkz.js:24849", () => {
  CCS_INSIGHTS_SESSION_LIMIT = 5;
  INSIGHTS_RUNNING_SLOT = new SessionRootSlot(() => ({
    running: false,
  }));
});
//@ chunk-f2v3cjkz.js:24888-25374 fingerprint (2.1.88 match: formatTranscriptWithSummarization, 0.939)
async function formatTranscriptWithSummarization(log, credentials, sectionTitle, options) {
  let fullTranscript = formatTranscriptWithSummarization_2(log);
  if (fullTranscript.length <= 30000) return fullTranscript;
  let CHUNK_SIZE = 25000;
  let chunks = [];
  for (let i = 0; i < fullTranscript.length; i += CHUNK_SIZE)
    chunks.push(fullTranscript.slice(i, i + CHUNK_SIZE));
  let batchSize = isCcsTenant() ? CCS_INSIGHTS_SESSION_LIMIT : chunks.length;
  let summaries = [];
  for (let batch of chunkArray(chunks, batchSize)) {
    options?.throwIfAborted();
    summaries.push(
      ...(await Promise.all(
        batch.map((part) => summarizeTranscriptChunk(part, credentials, sectionTitle, options)),
      )),
    );
  }
  let meta = logToSessionMeta(log);
  return (
    [
      `Session: ${meta.session_id.slice(0, 8)}`,
      `Date: ${meta.start_time}`,
      `Project: ${meta.project_path}`,
      `Duration: ${meta.duration_minutes} min`,
      `[Long session - ${chunks.length} parts summarized]`,
      "",
    ].join(`
`) +
    summaries.join(`

---

`)
  );
}
//@ chunk-f2v3cjkz.js:25374-25591 fingerprint (2.1.88 match: loadCachedFacets, 1)
async function loadCachedFacets(sessionId, storageV5) {
  if (storageV5) {
    let [facet] = await getMcpAuthCache([sessionId], storageV5);
    return facet ?? null;
  }
  let facetPath = join(getFacetsDir(), `${sessionId}.json`);
  try {
    let content = await readFile(facetPath, {
      encoding: "utf-8",
    });
    let parsed = jsonParse(content);
    if (!isValidSessionFacets(parsed)) {
      try {
        await unlink(facetPath);
      } catch {}
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
//@ chunk-f2v3cjkz.js:25591-25760 layout (2.1.88 match: getMcpAuthCache, 1)
function getMcpAuthCache(sessionIds, storageV5) {
  return batchReadWithFallback(sessionIds, facetsStorePath, storageV5, async (key, file) => {
    let parsed;
    try {
      parsed = jsonParse(Buffer.from(key).toString("utf-8"));
    } catch {
      return null;
    }
    if (!isValidSessionFacets(parsed)) {
      await storageV5.delete(facetsStorePath(file));
      return null;
    }
    return parsed;
  });
}
//@ chunk-f2v3cjkz.js:25760-26164 fingerprint (2.1.88 match: saveFacets, 0.557)
async function saveFacets(facets, storageV5) {
  if (!isDiskless())
    try {
      await mkdir(getFacetsDir(), {
        recursive: true,
      });
    } catch {}
  if (isStorageV5Enabled() && storageV5) {
    let written = await storageV5.write(facetsStorePath(facets.session_id), jsonStringify(facets, null, 2), {
      publishDiscipline: "inPlace",
      mode: 384,
    });
    if (!written.ok) {
      logForDebugging(`saveFacets: cache write failed: ${formatStorageError(written.error)}`);
      throw Error("saveFacets: cache write through the storage backend failed");
    }
    return;
  }
  let facetPath = join(getFacetsDir(), `${facets.session_id}.json`);
  await writeFile(facetPath, jsonStringify(facets, null, 2), {
    encoding: "utf-8",
    mode: 384,
  });
}
//@ chunk-f2v3cjkz.js:26164-26306 affinity
async function loadSessionMeta(sessionId, storageV5) {
  if (storageV5) {
    let [meta] = await getMcpAuthCache_2([sessionId], storageV5);
    return meta ?? null;
  }
  try {
    let meta = await loadCachedSessionMeta(sessionId).read();
    return meta === null ? null : withSessionMetaDefaults(meta);
  } catch {
    return null;
  }
}
//@ chunk-f2v3cjkz.js:26306-26489 affinity (2.1.88 match: getMcpAuthCache, 0.764)
function getMcpAuthCache_2(sessionIds, storageV5) {
  return batchReadWithFallback(sessionIds, sessionMetaStorePath, storageV5, (data) => {
    try {
      let schema = sessionMetaSchema()
        .nullable()
        .safeParse(jsonParse(Buffer.from(data).toString("utf-8")));
      return schema.success && schema.data !== null ? withSessionMetaDefaults(schema.data) : null;
    } catch {
      return null;
    }
  });
}
//@ chunk-f2v3cjkz.js:26774-27347 sole-consumer
/**
 * 给缓存读出的会话元数据补默认值（空对象、空数组、0、false），兼容旧版缓存缺字段。
 */
function withSessionMetaDefaults(meta) {
  return {
    ...meta,
    tool_counts: meta.tool_counts ?? {},
    languages: meta.languages ?? {},
    tool_error_categories: meta.tool_error_categories ?? {},
    user_response_times: meta.user_response_times ?? [],
    message_hours: meta.message_hours ?? [],
    user_message_timestamps: meta.user_message_timestamps ?? [],
    user_interruptions: meta.user_interruptions ?? 0,
    tool_errors: meta.tool_errors ?? 0,
    lines_added: meta.lines_added ?? 0,
    lines_removed: meta.lines_removed ?? 0,
    files_modified: meta.files_modified ?? 0,
    uses_task_agent: meta.uses_task_agent ?? false,
    uses_mcp: meta.uses_mcp ?? false,
    uses_web_search: meta.uses_web_search ?? false,
    uses_web_fetch: meta.uses_web_fetch ?? false,
  };
}
//@ chunk-f2v3cjkz.js:27347-27749 sole-consumer
/**
 * 写会话元数据缓存：有 v5 存储时写存储（权限/环境类失败只记调试日志，其他上报错误），否则写本地缓存文件；文件系统不可访问时静默。
 */
async function writeSessionMetaCache(meta, storageV5) {
  try {
    if (storageV5) {
      let written = await storageV5.write(
        sessionMetaStorePath(meta.session_id),
        jsonStringify(meta, null, 2),
        {
          mode: 384,
        },
      );
      if (!written.ok) {
        let error = written.error;
        if (isExpectedCacheWriteFailure(error))
          logForDebugging(`saveSessionMeta: cache write failed: ${formatStorageError(error)}`);
        else
          logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `saveSessionMeta: cache write failed: ${formatStorageError(error)}`,
              "insights session-meta cache write failed",
            ),
          );
      }
      return;
    }
    await loadCachedSessionMeta(meta.session_id).write(meta);
  } catch (error) {
    if (isFsInaccessible(error)) {
      logForDebugging(`saveSessionMeta: cache write failed: ${error}`);
      return;
    }
    logError(error);
  }
}
//@ chunk-f2v3cjkz.js:27749-29228 fingerprint (2.1.88 match: extractFacetsFromAPI, 0.901)
async function extractFacetsFromAPI(log, sessionId, credentials, sectionTitle, options) {
  try {
    let sectionTitle_2 =
      sectionTitle ?? tagAndManifestArtifactContent(log.messages, [], [...(log.toolsUsed ?? []), ""]);
    let transcript = await formatTranscriptWithSummarization(log, credentials, sectionTitle_2, options);
    let jsonPrompt = `${FACET_EXTRACTION_PROMPT}${transcript}

RESPOND WITH ONLY A VALID JSON OBJECT matching this schema:
{
  "underlying_goal": "What the user fundamentally wanted to achieve",
  "goal_categories": {"category_name": count, ...},
  "outcome": "fully_achieved|mostly_achieved|partially_achieved|not_achieved|unclear_from_transcript",
  "user_satisfaction_counts": {"level": count, ...},
  "claude_helpfulness": "unhelpful|slightly_helpful|moderately_helpful|very_helpful|essential",
  "session_type": "single_task|multi_task|iterative_refinement|exploration|quick_question",
  "friction_counts": {"friction_type": count, ...},
  "friction_detail": "One sentence describing friction or empty",
  "primary_success": "none|fast_accurate_search|correct_code_edits|good_explanations|proactive_help|multi_file_changes|good_debugging",
  "brief_summary": "One sentence: what user wanted and whether they got it"
}`;
    let result = await queryHaiku({
      systemPrompt: asSystemPrompt([]),
      userPrompt: sectionTitle_2 + jsonPrompt,
      signal: options ?? new AbortController().signal,
      options: {
        model: insightsModel(),
        querySource: "insights",
        sendSideQueryBeta: true,
        agents: [],
        isNonInteractiveSession: true,
        hasAppendSystemPrompt: false,
        mcpTools: [],
        maxOutputTokensOverride: 4096,
        agentContext: mainAgentContext(),
        credentials,
      },
    });
    let jsonMatch = extractTextContent_2(result.message.content).match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    let parsed = jsonParse(jsonMatch[0]);
    if (!isValidSessionFacets(parsed)) return null;
    return {
      ...parsed,
      session_id: sessionId,
    };
  } catch (err) {
    logForDebugging(`Facet extraction failed: ${toError(err).message}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-f2v3cjkz.js:29228-30054 fingerprint (2.1.88 match: detectMultiClauding, 1)
function detectMultiClauding(sessions) {
  let allSessionMessages = [];
  for (let session of sessions)
    for (let timestamp of session.user_message_timestamps) {
      let ts = new Date(timestamp).getTime();
      if (!Number.isFinite(ts)) continue;
      allSessionMessages.push({
        ts,
        sessionId: session.session_id,
      });
    }
  allSessionMessages.sort((a, b) => a.ts - b.ts);
  let multiClaudeSessionPairs = new Set();
  let messagesDuringMulticlaude = new Set();
  let windowStart = 0;
  let sessionLastIndex = new Map();
  for (let i_2 = 0; i_2 < allSessionMessages.length; i_2++) {
    let msg = allSessionMessages[i_2];
    while (windowStart < i_2 && msg.ts - allSessionMessages[windowStart].ts > 1800000) {
      let expiring = allSessionMessages[windowStart];
      if (sessionLastIndex.get(expiring.sessionId) === windowStart)
        sessionLastIndex.delete(expiring.sessionId);
      windowStart++;
    }
    let prevIndex = sessionLastIndex.get(msg.sessionId);
    if (prevIndex !== undefined)
      for (let j = prevIndex + 1; j < i_2; j++) {
        let between = allSessionMessages[j];
        if (between.sessionId !== msg.sessionId) {
          let pair = [msg.sessionId, between.sessionId].sort().join(":");
          multiClaudeSessionPairs.add(pair);
          messagesDuringMulticlaude.add(`${allSessionMessages[prevIndex].ts}:${msg.sessionId}`);
          messagesDuringMulticlaude.add(`${between.ts}:${between.sessionId}`);
          messagesDuringMulticlaude.add(`${msg.ts}:${msg.sessionId}`);
          break;
        }
      }
    sessionLastIndex.set(msg.sessionId, i_2);
  }
  let sessionsWithOverlaps = new Set();
  for (let pair of multiClaudeSessionPairs) {
    let [left, right] = pair.split(":");
    if (left) sessionsWithOverlaps.add(left);
    if (right) sessionsWithOverlaps.add(right);
  }
  return {
    overlap_events: multiClaudeSessionPairs.size,
    sessions_involved: sessionsWithOverlaps.size,
    user_messages_during: messagesDuringMulticlaude.size,
  };
}
//@ chunk-f2v3cjkz.js:30054-33982 fingerprint (2.1.88 match: aggregateData, 0.891)
function aggregateData(sessions, facets) {
  let result = {
    total_sessions: sessions.length,
    sessions_with_facets: facets.size,
    date_range: {
      start: "",
      end: "",
    },
    total_messages: 0,
    total_duration_hours: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    tool_counts: {},
    languages: {},
    git_commits: 0,
    git_pushes: 0,
    projects: {},
    goal_categories: {},
    outcomes: {},
    satisfaction: {},
    helpfulness: {},
    session_types: {},
    friction: {},
    success: {},
    session_summaries: [],
    total_interruptions: 0,
    total_tool_errors: 0,
    tool_error_categories: {},
    user_response_times: [],
    median_response_time: 0,
    avg_response_time: 0,
    sessions_using_task_agent: 0,
    sessions_using_mcp: 0,
    sessions_using_web_search: 0,
    sessions_using_web_fetch: 0,
    total_lines_added: 0,
    total_lines_removed: 0,
    total_files_modified: 0,
    days_active: 0,
    messages_per_day: 0,
    message_hours: [],
    multi_clauding: {
      overlap_events: 0,
      sessions_involved: 0,
      user_messages_during: 0,
    },
    auto_mode_stats: {
      auto_sessions: 0,
      non_auto_sessions: 0,
      estimated_prompts_in_non_auto: 0,
      destructive_in_non_auto: 0,
      recent_all_auto: false,
    },
  };
  let dates = [];
  let allResponseTimes = [];
  let sortedSessions = [];
  let responseTimes = [];
  for (let session of sessions) {
    dates.push(session.start_time);
    result.total_messages += session.user_message_count;
    result.total_duration_hours += session.duration_minutes / 60;
    result.total_input_tokens += session.input_tokens;
    result.total_output_tokens += session.output_tokens;
    result.git_commits += session.git_commits;
    result.git_pushes += session.git_pushes;
    result.total_interruptions += session.user_interruptions;
    result.total_tool_errors += session.tool_errors;
    for (let [cat, count] of Object.entries(session.tool_error_categories))
      result.tool_error_categories[cat] = (result.tool_error_categories[cat] || 0) + count;
    allResponseTimes.push(...session.user_response_times);
    if (session.uses_task_agent) result.sessions_using_task_agent++;
    if (session.uses_mcp) result.sessions_using_mcp++;
    if (session.uses_web_search) result.sessions_using_web_search++;
    if (session.uses_web_fetch) result.sessions_using_web_fetch++;
    result.total_lines_added += session.lines_added;
    result.total_lines_removed += session.lines_removed;
    result.total_files_modified += session.files_modified;
    sortedSessions.push(...session.message_hours);
    if (session.bash_would_prompt_count !== undefined) {
      let permissionMode = session.permission_mode;
      if (permissionMode === "auto" || permissionMode === "default" || permissionMode === "acceptEdits")
        responseTimes.push({
          start_time: session.start_time,
          auto: permissionMode === "auto",
          prompts:
            permissionMode === "auto"
              ? 0
              : session.bash_would_prompt_count +
                (permissionMode === "default" ? (session.file_edit_tool_count ?? 0) : 0),
          destructive: permissionMode === "auto" ? 0 : (session.destructive_command_count ?? 0),
        });
    }
    for (let [tool, count] of Object.entries(session.tool_counts))
      result.tool_counts[tool] = (result.tool_counts[tool] || 0) + count;
    for (let [lang, count] of Object.entries(session.languages))
      result.languages[lang] = (result.languages[lang] || 0) + count;
    if (session.project_path)
      result.projects[session.project_path] = (result.projects[session.project_path] || 0) + 1;
    let sessionFacets = facets.get(session.session_id);
    if (sessionFacets) {
      for (let [cat, count] of safeEntries(sessionFacets.goal_categories))
        if (count > 0) result.goal_categories[cat] = (result.goal_categories[cat] || 0) + count;
      result.outcomes[sessionFacets.outcome] = (result.outcomes[sessionFacets.outcome] || 0) + 1;
      for (let [level, count] of safeEntries(sessionFacets.user_satisfaction_counts))
        if (count > 0) result.satisfaction[level] = (result.satisfaction[level] || 0) + count;
      result.helpfulness[sessionFacets.claude_helpfulness] =
        (result.helpfulness[sessionFacets.claude_helpfulness] || 0) + 1;
      result.session_types[sessionFacets.session_type] =
        (result.session_types[sessionFacets.session_type] || 0) + 1;
      for (let [type, count] of safeEntries(sessionFacets.friction_counts))
        if (count > 0) result.friction[type] = (result.friction[type] || 0) + count;
      if (sessionFacets.primary_success !== "none")
        result.success[sessionFacets.primary_success] =
          (result.success[sessionFacets.primary_success] || 0) + 1;
    }
    if (result.session_summaries.length < 50)
      result.session_summaries.push({
        id: session.session_id.slice(0, 8),
        date: firstLineOf(session.start_time, "T"),
        summary: session.summary || session.first_prompt.slice(0, 100),
        goal: sessionFacets?.underlying_goal,
      });
  }
  dates.sort();
  result.date_range.start = firstLineOf(dates[0] ?? "", "T");
  result.date_range.end = firstLineOf(dates.at(-1) ?? "", "T");
  result.user_response_times = allResponseTimes;
  if (allResponseTimes.length > 0) {
    let sorted = [...allResponseTimes].sort((a, b) => a - b);
    result.median_response_time = sorted[Math.floor(sorted.length / 2)] || 0;
    result.avg_response_time =
      allResponseTimes.reduce((acc, responseTime) => acc + responseTime, 0) / allResponseTimes.length;
  }
  let uniqueDays = new Set(dates.map((date) => firstLineOf(date, "T")));
  result.days_active = uniqueDays.size;
  result.messages_per_day =
    result.days_active > 0 ? Math.round((result.total_messages / result.days_active) * 10) / 10 : 0;
  result.message_hours = sortedSessions;
  result.multi_clauding = detectMultiClauding(sessions);
  responseTimes.sort((a, b) => b.start_time.localeCompare(a.start_time));
  let sliced = responseTimes.slice(0, MAX_GLANCE_SESSIONS);
  for (let session of sliced)
    if (session.auto) result.auto_mode_stats.auto_sessions++;
    else {
      result.auto_mode_stats.non_auto_sessions++;
      result.auto_mode_stats.estimated_prompts_in_non_auto += session.prompts;
      result.auto_mode_stats.destructive_in_non_auto += session.destructive;
    }
  result.auto_mode_stats.recent_all_auto =
    sliced.length >= 3 && sliced.slice(0, 3).every((session) => session.auto);
  return result;
}
//@ chunk-f2v3cjkz.js:33982-34018 layout
var MAX_GLANCE_SESSIONS = 20;
var BASH_PROMPT_LOOKBACK_SESSIONS = 3 * MAX_GLANCE_SESSIONS;
var MIN_SESSIONS_FOR_GLANCE = 5;
var GLANCE_BASH_PROMPT_MARGIN = 0.25;
var GLANCE_MIN_BASH_PROMPTS = 3;
//@ chunk-f2v3cjkz.js:34018-34655 layout
/**
 * 根据近期会话的自动模式统计给出建议：自动模式用得少且非自动会话中估计权限提示足够多时建议切到 auto；已在用 auto 但没配环境时建议运行 setup。
 */
function autoModeRecommendation(report, context) {
  if (!context.autoModeAvailable) return null;
  let autoStats = report.auto_mode_stats;
  let totalSessions = autoStats.auto_sessions + autoStats.non_auto_sessions;
  if (totalSessions < MIN_SESSIONS_FOR_GLANCE) return null;
  if (!(
    context.currentSessionIsAuto ||
    autoStats.recent_all_auto ||
    autoStats.auto_sessions / totalSessions >= GLANCE_BASH_PROMPT_MARGIN
  )) {
    if (context.sandboxAutoAllowActive) return null;
    if (context.currentSessionSeesNoDialogs) return null;
    if (context.liveArbiterIsAutoClassifier) return null;
    if (autoStats.estimated_prompts_in_non_auto < GLANCE_MIN_BASH_PROMPTS) return null;
    return {
      kind: "switch_to_auto",
      estimatedPrompts: autoStats.estimated_prompts_in_non_auto,
      nonAutoSessions: autoStats.non_auto_sessions,
      destructiveCommands: autoStats.destructive_in_non_auto,
    };
  }
  if (!context.hasAutoModeEnvironment && context.setupSkillAvailable)
    return {
      kind: "run_setup",
    };
  return null;
}
//@ chunk-f2v3cjkz.js:34655-34753 layout
function roundToTwoSigFigs(estimatedPrompts) {
  if (estimatedPrompts < 100) return estimatedPrompts;
  let step = 10 ** (Math.floor(Math.log10(estimatedPrompts)) - 1);
  return Math.round(estimatedPrompts / step) * step;
}
//@ chunk-f2v3cjkz.js:34753-35146 layout
/**
 * 读取生成自动模式建议所需的上下文开关（是否可用、当前会话是否 auto、沙箱自动放行、无对话框、仲裁器是分类器、setup 技能、已配置环境）。
 */
function readAutoModeContext(permissionGates) {
  let gates = permissionGates?.();
  return {
    autoModeAvailable: gates?.autoModeAvailable === true,
    currentSessionIsAuto: gates?.currentSessionIsAuto === true,
    sandboxAutoAllowActive: gates?.sandboxAutoAllowActive === true,
    currentSessionSeesNoDialogs: gates?.currentSessionSeesNoDialogs === true,
    liveArbiterIsAutoClassifier: gates?.liveArbiterIsAutoClassifier === true,
    setupSkillAvailable: isAutoModeSetupNotOverridden(),
    hasAutoModeEnvironment: (getAutoModeConfig()?.environment?.length ?? 0) > 0,
  };
}
//@ chunk-f2v3cjkz.js:35146-35582 layout
/**
 * 把自动模式建议转成一行提示文字（切换到 auto 可省多少次权限提示，或运行 /auto-mode-setup）。
 */
function autoModeTipText(autoModeReco) {
  switch (autoModeReco.kind) {
    case "switch_to_auto":
      return `Tip: auto mode could have handled up to ~${roundToTwoSigFigs(autoModeReco.estimatedPrompts).toLocaleString()} permission prompts across ${autoModeReco.nonAutoSessions.toLocaleString()} of your recent sessions \u2014 press Shift+Tab until the mode indicator shows auto.`;
    case "run_setup":
      return "Tip: you already use auto mode \u2014 run /auto-mode-setup once to teach it your environment and improve its decisions.";
  }
}
//@ chunk-f2v3cjkz.js:35582-41183 fingerprint (2.1.88 match: INSIGHT_SECTIONS, 0.937)
var INSIGHT_SECTIONS = [
  {
    name: "project_areas",
    prompt: `Analyze this Claude Code usage data and identify project areas.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "areas": [
    {"name": "Area name", "session_count": N, "description": "2-3 sentences about what was worked on and how Claude Code was used."}
  ]
}

Include 4-5 areas. Skip internal CC operations.`,
    maxTokens: 8192,
  },
  {
    name: "interaction_style",
    prompt: `Analyze this Claude Code usage data and describe the user's interaction style.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "narrative": "2-3 paragraphs analyzing HOW the user interacts with Claude Code. Use second person 'you'. Describe patterns: iterate quickly vs detailed upfront specs? Interrupt often or let Claude run? Include specific examples. Use **bold** for key insights.",
  "key_pattern": "One sentence summary of most distinctive interaction style"
}`,
    maxTokens: 8192,
  },
  {
    name: "what_works",
    prompt: `Analyze this Claude Code usage data and identify what's working well for this user. Use second person ("you").

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "intro": "1 sentence of context",
  "impressive_workflows": [
    {"title": "Short title (3-6 words)", "description": "2-3 sentences describing the impressive workflow or approach. Use 'you' not 'the user'."}
  ]
}

Include 3 impressive workflows.`,
    maxTokens: 8192,
  },
  {
    name: "friction_analysis",
    prompt: `Analyze this Claude Code usage data and identify friction points for this user. Use second person ("you").

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "intro": "1 sentence summarizing friction patterns",
  "categories": [
    {"category": "Concrete category name", "description": "1-2 sentences explaining this category and what could be done differently. Use 'you' not 'the user'.", "examples": ["Specific example with consequence", "Another example"]}
  ]
}

Include 3 friction categories with 2 examples each.`,
    maxTokens: 8192,
  },
  {
    name: "suggestions",
    prompt: `Analyze this Claude Code usage data and suggest improvements.

## CC FEATURES REFERENCE (pick from these for features_to_try):
1. **MCP Servers**: Connect Claude to external tools, databases, and APIs via Model Context Protocol.
   - How to use: Run \`claude mcp add <server-name> -- <command>\`
   - Good for: database queries, Slack integration, GitHub issue lookup, connecting to internal APIs

2. **Custom Skills**: Reusable prompts you define as markdown files that run with a single /command.
   - How to use: Create \`.claude/skills/commit/SKILL.md\` with instructions. Then type \`/commit\` to run it.
   - Good for: repetitive workflows - /commit, /review, /test, /deploy, /pr, or complex multi-step workflows

3. **Hooks**: Shell commands that auto-run at specific lifecycle events.
   - How to use: Add to \`.claude/settings.json\` under "hooks" key.
   - Good for: auto-formatting code, running type checks, enforcing conventions

4. **Headless Mode**: Run Claude non-interactively from scripts and CI/CD.
   - How to use: \`claude -p "fix lint errors" --allowedTools "Edit,Read,Bash"\`
   - Good for: CI/CD integration, batch code fixes, automated reviews

5. **Task Agents**: Claude spawns focused subagents for complex exploration or parallel work.
   - How to use: Claude auto-invokes when helpful, or ask "use an agent to explore X"
   - Good for: codebase exploration, understanding complex systems

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "claude_md_additions": [
    {"addition": "A specific line or block to add to CLAUDE.md based on workflow patterns. E.g., 'Always run tests after modifying auth-related files'", "why": "1 sentence explaining why this would help based on actual sessions", "prompt_scaffold": "Instructions for where to add this in CLAUDE.md. E.g., 'Add under ## Testing section'"}
  ],
  "features_to_try": [
    {"feature": "Feature name from CC FEATURES REFERENCE above", "one_liner": "What it does", "why_for_you": "Why this would help YOU based on your sessions", "example_code": "Actual command or config to copy"}
  ],
  "usage_patterns": [
    {"title": "Short title", "suggestion": "1-2 sentence summary", "detail": "3-4 sentences explaining how this applies to YOUR work", "copyable_prompt": "A specific prompt to copy and try"}
  ]
}

IMPORTANT for claude_md_additions: PRIORITIZE instructions that appear MULTIPLE TIMES in the user data. If user told Claude the same thing in 2+ sessions (e.g., 'always run tests', 'use TypeScript'), that's a PRIME candidate - they shouldn't have to repeat themselves.

IMPORTANT for features_to_try: Pick 2-3 from the CC FEATURES REFERENCE above. Include 2-3 items for each category.`,
    maxTokens: 8192,
  },
  {
    name: "on_the_horizon",
    prompt: `Analyze this Claude Code usage data and identify future opportunities.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "intro": "1 sentence about evolving AI-assisted development",
  "opportunities": [
    {"title": "Short title (4-8 words)", "whats_possible": "2-3 ambitious sentences about autonomous workflows", "how_to_try": "1-2 sentences mentioning relevant tooling", "copyable_prompt": "Detailed prompt to try"}
  ]
}

Include 3 opportunities. Think BIG - autonomous workflows, parallel agents, iterating against tests.`,
    maxTokens: 8192,
  },
  ...[],
  {
    name: "fun_ending",
    prompt: `Analyze this Claude Code usage data and find a memorable moment.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "headline": "A memorable QUALITATIVE moment from the transcripts - not a statistic. Something human, funny, or surprising.",
  "detail": "Brief context about when/where this happened"
}

Find something genuinely interesting or amusing from the session summaries.`,
    maxTokens: 8192,
  },
];
//@ chunk-f2v3cjkz.js:41183-41849 fingerprint (2.1.88 match: generateSectionInsight, 0.772)
async function generateSectionInsight(section, dataContext, credentials, storageV5, options) {
  try {
    let result = await queryHaiku({
      systemPrompt: asSystemPrompt([]),
      userPrompt:
        storageV5 +
        section.prompt +
        `

DATA:
` +
        dataContext,
      signal: options ?? new AbortController().signal,
      options: {
        model: insightsModel(),
        querySource: "insights",
        sendSideQueryBeta: true,
        agents: [],
        isNonInteractiveSession: true,
        hasAppendSystemPrompt: false,
        mcpTools: [],
        maxOutputTokensOverride: section.maxTokens,
        agentContext: mainAgentContext(),
        credentials,
      },
    });
    let text = extractTextContent_2(result.message.content);
    if (text) {
      let jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch)
        try {
          return {
            name: section.name,
            result: jsonParse(jsonMatch[0]),
          };
        } catch {
          return {
            name: section.name,
            result: null,
          };
        }
    }
    return {
      name: section.name,
      result: null,
    };
  } catch (err) {
    if (!options?.aborted)
      logError(
        withTelemetryMessage(
          Error(`${section.name} failed: ${toError(err).message}`),
          "insight section query failed",
        ),
      );
    return {
      name: section.name,
      result: null,
    };
  }
}
//@ chunk-f2v3cjkz.js:41849-45674 fingerprint (2.1.88 match: generateParallelInsights, 0.942)
async function generateParallelInsights(data, facets, credentials, storageV5, options) {
  let facetSummaries = Array.from(facets.values())
    .slice(0, 50)
    .map((item) => `- ${item.brief_summary} (${item.outcome}, ${item.claude_helpfulness})`).join(`
`);
  let frictionDetails = Array.from(facets.values())
    .filter((item) => item.friction_detail)
    .slice(0, 20)
    .map((item) => `- ${item.friction_detail}`).join(`
`);
  let userInstructions = Array.from(facets.values())
    .flatMap((item) => item.user_instructions_to_claude || [])
    .slice(0, 15)
    .map((i) => `- ${i}`).join(`
`);
  let dataContext =
    jsonStringify(
      {
        sessions: data.total_sessions,
        analyzed: data.sessions_with_facets,
        date_range: data.date_range,
        messages: data.total_messages,
        hours: Math.round(data.total_duration_hours),
        commits: data.git_commits,
        top_tools: Object.entries(data.tool_counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8),
        top_goals: Object.entries(data.goal_categories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8),
        outcomes: data.outcomes,
        satisfaction: data.satisfaction,
        friction: data.friction,
        success: data.success,
        languages: data.languages,
      },
      null,
      2,
    ) +
    `

SESSION SUMMARIES:
` +
    facetSummaries +
    `

FRICTION DETAILS:
` +
    frictionDetails +
    `

USER INSTRUCTIONS TO CLAUDE:
` +
    (userInstructions || "None captured");
  let results = await Promise.all(
    INSIGHT_SECTIONS.map((section) =>
      generateSectionInsight(section, dataContext, credentials, storageV5, options),
    ),
  );
  options?.throwIfAborted();
  let insights = {};
  for (let { name, result } of results) if (result) insights[name] = result;
  let projectAreasText =
    insights.project_areas?.areas?.map((area) => `- ${area.name}: ${area.description}`).join(`
`) || "";
  let bigWinsText =
    insights.what_works?.impressive_workflows?.map((item) => `- ${item.title}: ${item.description}`).join(`
`) || "";
  let frictionText =
    insights.friction_analysis?.categories?.map(
      (category) => `- ${category.category}: ${category.description}`,
    ).join(`
`) || "";
  let featuresText =
    insights.suggestions?.features_to_try?.map((feature) => `- ${feature.feature}: ${feature.one_liner}`)
      .join(`
`) || "";
  let patternsText =
    insights.suggestions?.usage_patterns?.map(
      (usagePattern) => `- ${usagePattern.title}: ${usagePattern.suggestion}`,
    ).join(`
`) || "";
  let horizonText =
    insights.on_the_horizon?.opportunities?.map(
      (opportunity) => `- ${opportunity.title}: ${opportunity.whats_possible}`,
    ).join(`
`) || "";
  let atAGlanceSection = {
    name: "at_a_glance",
    prompt: `You're writing an "At a Glance" summary for a Claude Code usage insights report for Claude Code users. The goal is to help them understand their usage and improve how they can use Claude better, especially as models improve.

Use this 4-part structure:

1. **What's working** - What is the user's unique style of interacting with Claude and what are some impactful things they've done? You can include one or two details, but keep it high level since things might not be fresh in the user's memory. Don't be fluffy or overly complimentary. Also, don't focus on the tool calls they use.

2. **What's hindering you** - Split into (a) Claude's fault (misunderstandings, wrong approaches, bugs) and (b) user-side friction (not providing enough context, environment issues -- ideally more general than just one project). Be honest but constructive.

3. **Quick wins to try** - Specific Claude Code features they could try from the examples below, or a workflow technique if you think it's really compelling. (Avoid stuff like "Ask Claude to confirm before taking actions" or "Type out more context up front" which are less compelling.)

4. **Ambitious workflows for better models** - As we move to much more capable models over the next 3-6 months, what should they prepare for? What workflows that seem impossible now will become possible? Draw from the appropriate section below.

Keep each section to 2-3 not-too-long sentences. Don't overwhelm the user. Don't mention specific numerical stats or underlined_categories from the session data below. Use a coaching tone.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "whats_working": "(refer to instructions above)",
  "whats_hindering": "(refer to instructions above)",
  "quick_wins": "(refer to instructions above)",
  "ambitious_workflows": "(refer to instructions above)"
}

SESSION DATA:
${dataContext}

## Project Areas (what user works on)
${projectAreasText}

## Big Wins (impressive accomplishments)
${bigWinsText}

## Friction Categories (where things go wrong)
${frictionText}

## Features to Try
${featuresText}

## Usage Patterns to Adopt
${patternsText}

## On the Horizon (ambitious workflows for better models)
${horizonText}`,
    maxTokens: 8192,
  };
  let atAGlanceResult = await generateSectionInsight(atAGlanceSection, "", credentials, storageV5, options);
  if (atAGlanceResult.result) insights.at_a_glance = atAGlanceResult.result;
  return insights;
}
//@ chunk-f2v3cjkz.js:45674-45750 fingerprint (2.1.88 match: escapeHtmlWithBold, 1)
function escapeHtmlWithBold(text) {
  return escapeXmlAttr(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
//@ chunk-f2v3cjkz.js:45750-45937 fingerprint (2.1.88 match: SATISFACTION_ORDER, 0.699)
var SATISFACTION_ORDER = ["frustrated", "dissatisfied", "likely_satisfied", "satisfied", "happy", "unsure"];
var OUTCOME_ORDER = [
  "not_achieved",
  "partially_achieved",
  "mostly_achieved",
  "fully_achieved",
  "unclear_from_transcript",
];
//@ chunk-f2v3cjkz.js:45937-46531 fingerprint (2.1.88 match: generateBarChart, 1)
function generateBarChart(data, color, maxItems = 6, fixedOrder) {
  let entries;
  if (fixedOrder)
    entries = fixedOrder
      .filter((key) => key in data && (data[key] ?? 0) > 0)
      .map((key) => [key, data[key] ?? 0]);
  else
    entries = Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxItems);
  if (entries.length === 0) return '<p class="empty">No data</p>';
  let maxVal = Math.max(...entries.map((e) => e[1]));
  return entries.map(([label, count]) => {
    let pct = (count / maxVal) * 100;
    let cleanLabel =
      FACET_LABELS[label] || label.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
    return `<div class="bar-row">
        <div class="bar-label">${escapeXmlAttr(cleanLabel)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="bar-value">${count}</div>
      </div>`;
  }).join(`
`);
}
//@ chunk-f2v3cjkz.js:46531-47380 fingerprint (2.1.88 match: generateResponseTimeHistogram, 1)
function generateResponseTimeHistogram(times) {
  if (times.length === 0) return '<p class="empty">No response time data</p>';
  let buckets = {
    "2-10s": 0,
    "10-30s": 0,
    "30s-1m": 0,
    "1-2m": 0,
    "2-5m": 0,
    "5-15m": 0,
    ">15m": 0,
  };
  for (let t of times)
    if (t < 10) buckets["2-10s"] = (buckets["2-10s"] ?? 0) + 1;
    else if (t < 30) buckets["10-30s"] = (buckets["10-30s"] ?? 0) + 1;
    else if (t < 60) buckets["30s-1m"] = (buckets["30s-1m"] ?? 0) + 1;
    else if (t < 120) buckets["1-2m"] = (buckets["1-2m"] ?? 0) + 1;
    else if (t < 300) buckets["2-5m"] = (buckets["2-5m"] ?? 0) + 1;
    else if (t < 900) buckets["5-15m"] = (buckets["5-15m"] ?? 0) + 1;
    else buckets[">15m"] = (buckets[">15m"] ?? 0) + 1;
  let maxVal = Math.max(...Object.values(buckets));
  if (maxVal === 0) return '<p class="empty">No response time data</p>';
  return Object.entries(buckets).map(([label, count]) => {
    let pct = (count / maxVal) * 100;
    return `<div class="bar-row">
        <div class="bar-label">${label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:#6366f1"></div></div>
        <div class="bar-value">${count}</div>
      </div>`;
  }).join(`
`);
}
//@ chunk-f2v3cjkz.js:47380-48131 fingerprint (2.1.88 match: generateTimeOfDayChart, 1)
function generateTimeOfDayChart(messageHours) {
  if (messageHours.length === 0) return '<p class="empty">No time data</p>';
  let periods = [
    {
      label: "Morning (6-12)",
      range: [6, 7, 8, 9, 10, 11],
    },
    {
      label: "Afternoon (12-18)",
      range: [12, 13, 14, 15, 16, 17],
    },
    {
      label: "Evening (18-24)",
      range: [18, 19, 20, 21, 22, 23],
    },
    {
      label: "Night (0-6)",
      range: [0, 1, 2, 3, 4, 5],
    },
  ];
  let hourCounts = {};
  for (let messageHour of messageHours) hourCounts[messageHour] = (hourCounts[messageHour] || 0) + 1;
  let periodCounts = periods.map((period) => ({
    label: period.label,
    count: period.range.reduce((sum, hour) => sum + (hourCounts[hour] || 0), 0),
  }));
  let maxVal = Math.max(...periodCounts.map((periodCount) => periodCount.count)) || 1;
  return `<div id="hour-histogram">${periodCounts.map(
    (periodCount) => `
      <div class="bar-row">
        <div class="bar-label">${periodCount.label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(periodCount.count / maxVal) * 100}%;background:#8b5cf6"></div></div>
        <div class="bar-value">${periodCount.count}</div>
      </div>`,
  ).join(`
`)}</div>`;
}
//@ chunk-f2v3cjkz.js:48131-48199 layout
function countValues(messageHours) {
  let hourCounts = {};
  for (let messageHour of messageHours) hourCounts[messageHour] = (hourCounts[messageHour] || 0) + 1;
  return jsonStringify(hourCounts);
}
//@ chunk-f2v3cjkz.js:48199-90871 fingerprint (2.1.88 match: generateHtmlReport, 0.967)
function generateHtmlReport(data, insights, htmlReport) {
  let markdownToHtml = (md) => {
    if (!md) return "";
    return md
      .split(
        `

`,
      )
      .map((row) => {
        let html = escapeXmlAttr(row);
        html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/^- /gm, "\u2022 ");
        html = html.replaceAll(
          `
`,
          "<br>",
        );
        return `<p>${html}</p>`;
      }).join(`
`);
  };
  let atAGlance = insights.at_a_glance;
  let atAGlanceHtml = atAGlance
    ? `
    <div class="at-a-glance">
      <div class="glance-title">At a Glance</div>
      <div class="glance-sections">
        ${atAGlance.whats_working ? `<div class="glance-section"><strong>What's working:</strong> ${escapeHtmlWithBold(atAGlance.whats_working)} <a href="#section-wins" class="see-more">Impressive Things You Did \u2192</a></div>` : ""}
        ${atAGlance.whats_hindering ? `<div class="glance-section"><strong>What's hindering you:</strong> ${escapeHtmlWithBold(atAGlance.whats_hindering)} <a href="#section-friction" class="see-more">Where Things Go Wrong \u2192</a></div>` : ""}
        ${atAGlance.quick_wins ? `<div class="glance-section"><strong>Quick wins to try:</strong> ${escapeHtmlWithBold(atAGlance.quick_wins)} <a href="#section-features" class="see-more">Features to Try \u2192</a></div>` : ""}
        ${atAGlance.ambitious_workflows ? `<div class="glance-section"><strong>Ambitious workflows:</strong> ${escapeHtmlWithBold(atAGlance.ambitious_workflows)} <a href="#section-horizon" class="see-more">On the Horizon \u2192</a></div>` : ""}
      </div>
    </div>
    `
    : "";
  let cell = !htmlReport
    ? ""
    : htmlReport.kind === "switch_to_auto"
      ? `
    <div class="auto-mode-card" id="section-auto-mode">
      <div class="auto-mode-title">Auto mode could have handled up to ~${roundToTwoSigFigs(htmlReport.estimatedPrompts).toLocaleString()} permission prompts for you</div>
      <div class="auto-mode-desc">Across ${htmlReport.nonAutoSessions.toLocaleString()} recent sessions, roughly that many tool calls fell outside Claude Code's always-safe set \u2014 each one a potential "can I run this?" interruption. Auto mode approves routine actions automatically and only checks in on risky ones. Press <code>Shift+Tab</code> in any session until the mode indicator shows auto.</div>
      ${htmlReport.destructiveCommands > 0 ? `<div class="auto-mode-note">It stays careful: ${htmlReport.destructiveCommands.toLocaleString()} of those commands looked potentially destructive (force-deletes, history rewrites, and the like) \u2014 auto mode reviews actions like these instead of waving them through.</div>` : ""}
      <div class="auto-mode-fineprint">Estimated from your local session history; the actual number depends on your allowlist rules.</div>
    </div>
    `
      : `
    <div class="auto-mode-card" id="section-auto-mode">
      <div class="auto-mode-title">Make auto mode smarter: run /auto-mode-setup</div>
      <div class="auto-mode-desc">You already use auto mode, but it doesn't know your environment yet. <code>/auto-mode-setup</code> spends a few minutes mapping your repos, trusted services, and routine commands, then writes the result to your settings \u2014 auto mode's decisions get noticeably better. One approval at the end, and you can re-run it anytime.</div>
    </div>
    `;
  let projectAreas = insights.project_areas?.areas || [];
  let projectAreasHtml =
    projectAreas.length > 0
      ? `
    <h2 id="section-work">What You Work On</h2>
    <div class="project-areas">
      ${projectAreas
        .map(
          (area) => `
        <div class="project-area">
          <div class="area-header">
            <span class="area-name">${escapeXmlAttr(area.name)}</span>
            <span class="area-count">~${area.session_count} sessions</span>
          </div>
          <div class="area-desc">${escapeXmlAttr(area.description)}</div>
        </div>
      `,
        )
        .join("")}
    </div>
    `
      : "";
  let interactionStyle = insights.interaction_style;
  let interactionHtml = interactionStyle?.narrative
    ? `
    <h2 id="section-usage">How You Use Claude Code</h2>
    <div class="narrative">
      ${markdownToHtml(interactionStyle.narrative)}
      ${interactionStyle.key_pattern ? `<div class="key-insight"><strong>Key pattern:</strong> ${escapeXmlAttr(interactionStyle.key_pattern)}</div>` : ""}
    </div>
    `
    : "";
  let whatWorks = insights.what_works;
  let whatWorksHtml =
    whatWorks?.impressive_workflows && whatWorks.impressive_workflows.length > 0
      ? `
    <h2 id="section-wins">Impressive Things You Did</h2>
    ${whatWorks.intro ? `<p class="section-intro">${escapeXmlAttr(whatWorks.intro)}</p>` : ""}
    <div class="big-wins">
      ${whatWorks.impressive_workflows
        .map(
          (wf) => `
        <div class="big-win">
          <div class="big-win-title">${escapeXmlAttr(wf.title || "")}</div>
          <div class="big-win-desc">${escapeXmlAttr(wf.description || "")}</div>
        </div>
      `,
        )
        .join("")}
    </div>
    `
      : "";
  let frictionAnalysis = insights.friction_analysis;
  let frictionHtml =
    frictionAnalysis?.categories && frictionAnalysis.categories.length > 0
      ? `
    <h2 id="section-friction">Where Things Go Wrong</h2>
    ${frictionAnalysis.intro ? `<p class="section-intro">${escapeXmlAttr(frictionAnalysis.intro)}</p>` : ""}
    <div class="friction-categories">
      ${frictionAnalysis.categories
        .map(
          (cat) => `
        <div class="friction-category">
          <div class="friction-title">${escapeXmlAttr(cat.category || "")}</div>
          <div class="friction-desc">${escapeXmlAttr(cat.description || "")}</div>
          ${cat.examples ? `<ul class="friction-examples">${cat.examples.map((ex) => `<li>${escapeXmlAttr(ex)}</li>`).join("")}</ul>` : ""}
        </div>
      `,
        )
        .join("")}
    </div>
    `
      : "";
  let suggestions = insights.suggestions;
  let suggestionsHtml = suggestions
    ? `
    ${
      suggestions.claude_md_additions && suggestions.claude_md_additions.length > 0
        ? `
    <h2 id="section-features">Existing CC Features to Try</h2>
    <div class="claude-md-section">
      <h3>Suggested CLAUDE.md Additions</h3>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Just copy this into Claude Code to add it to your CLAUDE.md.</p>
      <div class="claude-md-actions">
        <button class="copy-all-btn" onclick="copyAllCheckedClaudeMd()">Copy All Checked</button>
      </div>
      ${suggestions.claude_md_additions
        .map(
          (add, i) => `
        <div class="claude-md-item">
          <input type="checkbox" id="cmd-${i}" class="cmd-checkbox" checked data-text="${escapeXmlAttr(add.prompt_scaffold || add.where || "Add to CLAUDE.md")}\\n\\n${escapeXmlAttr(add.addition)}">
          <label for="cmd-${i}">
            <code class="cmd-code">${escapeXmlAttr(add.addition)}</code>
            <button class="copy-btn" onclick="copyCmdItem(${i})">Copy</button>
          </label>
          <div class="cmd-why">${escapeXmlAttr(add.why)}</div>
        </div>
      `,
        )
        .join("")}
    </div>
    `
        : ""
    }
    ${
      suggestions.features_to_try && suggestions.features_to_try.length > 0
        ? `
    <p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">Just copy this into Claude Code and it'll set it up for you.</p>
    <div class="features-section">
      ${suggestions.features_to_try
        .map(
          (feat) => `
        <div class="feature-card">
          <div class="feature-title">${escapeXmlAttr(feat.feature || "")}</div>
          <div class="feature-oneliner">${escapeXmlAttr(feat.one_liner || "")}</div>
          <div class="feature-why"><strong>Why for you:</strong> ${escapeXmlAttr(feat.why_for_you || "")}</div>
          ${
            feat.example_code
              ? `
          <div class="feature-examples">
            <div class="feature-example">
              <div class="example-code-row">
                <code class="example-code">${escapeXmlAttr(feat.example_code)}</code>
                <button class="copy-btn" onclick="copyText(this)">Copy</button>
              </div>
            </div>
          </div>
          `
              : ""
          }
        </div>
      `,
        )
        .join("")}
    </div>
    `
        : ""
    }
    ${
      suggestions.usage_patterns && suggestions.usage_patterns.length > 0
        ? `
    <h2 id="section-patterns">New Ways to Use Claude Code</h2>
    <p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">Just copy this into Claude Code and it'll walk you through it.</p>
    <div class="patterns-section">
      ${suggestions.usage_patterns
        .map(
          (pat) => `
        <div class="pattern-card">
          <div class="pattern-title">${escapeXmlAttr(pat.title || "")}</div>
          <div class="pattern-summary">${escapeXmlAttr(pat.suggestion || "")}</div>
          ${pat.detail ? `<div class="pattern-detail">${escapeXmlAttr(pat.detail)}</div>` : ""}
          ${
            pat.copyable_prompt
              ? `
          <div class="copyable-prompt-section">
            <div class="prompt-label">Paste into Claude Code:</div>
            <div class="copyable-prompt-row">
              <code class="copyable-prompt">${escapeXmlAttr(pat.copyable_prompt)}</code>
              <button class="copy-btn" onclick="copyText(this)">Copy</button>
            </div>
          </div>
          `
              : ""
          }
        </div>
      `,
        )
        .join("")}
    </div>
    `
        : ""
    }
    `
    : "";
  let horizonData = insights.on_the_horizon;
  let horizonHtml =
    horizonData?.opportunities && horizonData.opportunities.length > 0
      ? `
    <h2 id="section-horizon">On the Horizon</h2>
    ${horizonData.intro ? `<p class="section-intro">${escapeXmlAttr(horizonData.intro)}</p>` : ""}
    <div class="horizon-section">
      ${horizonData.opportunities
        .map(
          (opp) => `
        <div class="horizon-card">
          <div class="horizon-title">${escapeXmlAttr(opp.title || "")}</div>
          <div class="horizon-possible">${escapeXmlAttr(opp.whats_possible || "")}</div>
          ${opp.how_to_try ? `<div class="horizon-tip"><strong>Getting started:</strong> ${escapeXmlAttr(opp.how_to_try)}</div>` : ""}
          ${opp.copyable_prompt ? `<div class="pattern-prompt"><div class="prompt-label">Paste into Claude Code:</div><code>${escapeXmlAttr(opp.copyable_prompt)}</code><button class="copy-btn" onclick="copyText(this)">Copy</button></div>` : ""}
        </div>
      `,
        )
        .join("")}
    </div>
    `
      : "";
  let ccImprovements = [];
  let modelImprovements = [];
  let teamFeedbackHtml =
    ccImprovements.length > 0 || modelImprovements.length > 0
      ? `
    <h2 id="section-feedback" class="feedback-header">Closing the Loop: Feedback for Other Teams</h2>
    <p class="feedback-intro">Suggestions for the CC product and model teams based on your usage patterns. Click to expand.</p>
    ${
      ccImprovements.length > 0
        ? `
    <div class="collapsible-section">
      <div class="collapsible-header" onclick="toggleCollapsible(this)">
        <span class="collapsible-arrow">\u25B6</span>
        <h3>Product Improvements for CC Team</h3>
      </div>
      <div class="collapsible-content">
        <div class="suggestions-section">
          ${ccImprovements
            .map(
              (imp) => `
            <div class="feedback-card team-card">
              <div class="feedback-title">${escapeXmlAttr(imp.title || "")}</div>
              <div class="feedback-detail">${escapeXmlAttr(imp.detail || "")}</div>
              ${imp.evidence ? `<div class="feedback-evidence"><em>Evidence:</em> ${escapeXmlAttr(imp.evidence)}</div>` : ""}
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    </div>
    `
        : ""
    }
    ${
      modelImprovements.length > 0
        ? `
    <div class="collapsible-section">
      <div class="collapsible-header" onclick="toggleCollapsible(this)">
        <span class="collapsible-arrow">\u25B6</span>
        <h3>Model Behavior Improvements</h3>
      </div>
      <div class="collapsible-content">
        <div class="suggestions-section">
          ${modelImprovements
            .map(
              (imp) => `
            <div class="feedback-card model-card">
              <div class="feedback-title">${escapeXmlAttr(imp.title || "")}</div>
              <div class="feedback-detail">${escapeXmlAttr(imp.detail || "")}</div>
              ${imp.evidence ? `<div class="feedback-evidence"><em>Evidence:</em> ${escapeXmlAttr(imp.evidence)}</div>` : ""}
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    </div>
    `
        : ""
    }
    `
      : "";
  let funEnding = insights.fun_ending;
  let funEndingHtml = funEnding?.headline
    ? `
    <div class="fun-ending">
      <div class="fun-headline">"${escapeXmlAttr(funEnding.headline)}"</div>
      ${funEnding.detail ? `<div class="fun-detail">${escapeXmlAttr(funEnding.detail)}</div>` : ""}
    </div>
    `
    : "";
  let css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; color: #334155; line-height: 1.65; padding: 48px 24px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 32px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    h2 { font-size: 20px; font-weight: 600; color: #0f172a; margin-top: 48px; margin-bottom: 16px; }
    .subtitle { color: #64748b; font-size: 15px; margin-bottom: 32px; }
    .nav-toc { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0 32px 0; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; }
    .nav-toc a { font-size: 12px; color: #64748b; text-decoration: none; padding: 6px 12px; border-radius: 6px; background: #f1f5f9; transition: all 0.15s; }
    .nav-toc a:hover { background: #e2e8f0; color: #334155; }
    .stats-row { display: flex; gap: 24px; margin-bottom: 40px; padding: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: #0f172a; }
    .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
    .at-a-glance { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
    .glance-title { font-size: 16px; font-weight: 700; color: #92400e; margin-bottom: 16px; }
    .glance-sections { display: flex; flex-direction: column; gap: 12px; }
    .glance-section { font-size: 14px; color: #78350f; line-height: 1.6; }
    .glance-section strong { color: #92400e; }
    .see-more { color: #b45309; text-decoration: none; font-size: 13px; white-space: nowrap; }
    .see-more:hover { text-decoration: underline; }
    .auto-mode-card { background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%); border: 1px solid #60a5fa; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
    .auto-mode-title { font-size: 16px; font-weight: 700; color: #1e40af; margin-bottom: 10px; }
    .auto-mode-desc { font-size: 14px; color: #1e3a8a; line-height: 1.6; }
    .auto-mode-desc code { background: rgba(255,255,255,0.7); padding: 1px 6px; border-radius: 4px; font-size: 13px; }
    .auto-mode-note { font-size: 13px; color: #1e3a8a; background: rgba(255,255,255,0.6); padding: 8px 12px; border-radius: 6px; margin-top: 10px; }
    .auto-mode-fineprint { font-size: 11px; color: #3b82f6; margin-top: 10px; }
    .project-areas { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
    .project-area { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .area-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .area-name { font-weight: 600; font-size: 15px; color: #0f172a; }
    .area-count { font-size: 12px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; }
    .area-desc { font-size: 14px; color: #475569; line-height: 1.5; }
    .narrative { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .narrative p { margin-bottom: 12px; font-size: 14px; color: #475569; line-height: 1.7; }
    .key-insight { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-top: 12px; font-size: 14px; color: #166534; }
    .section-intro { font-size: 14px; color: #64748b; margin-bottom: 16px; }
    .big-wins { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
    .big-win { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; }
    .big-win-title { font-weight: 600; font-size: 15px; color: #166534; margin-bottom: 8px; }
    .big-win-desc { font-size: 14px; color: #15803d; line-height: 1.5; }
    .friction-categories { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .friction-category { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; }
    .friction-title { font-weight: 600; font-size: 15px; color: #991b1b; margin-bottom: 6px; }
    .friction-desc { font-size: 13px; color: #7f1d1d; margin-bottom: 10px; }
    .friction-examples { margin: 0 0 0 20px; font-size: 13px; color: #334155; }
    .friction-examples li { margin-bottom: 4px; }
    .claude-md-section { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .claude-md-section h3 { font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 12px 0; }
    .claude-md-actions { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #dbeafe; }
    .copy-all-btn { background: #2563eb; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
    .copy-all-btn:hover { background: #1d4ed8; }
    .copy-all-btn.copied { background: #16a34a; }
    .claude-md-item { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; padding: 10px 0; border-bottom: 1px solid #dbeafe; }
    .claude-md-item:last-child { border-bottom: none; }
    .cmd-checkbox { margin-top: 2px; }
    .cmd-code { background: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #1e40af; border: 1px solid #bfdbfe; font-family: monospace; display: block; white-space: pre-wrap; word-break: break-word; flex: 1; }
    .cmd-why { font-size: 12px; color: #64748b; width: 100%; padding-left: 24px; margin-top: 4px; }
    .features-section, .patterns-section { display: flex; flex-direction: column; gap: 12px; margin: 16px 0; }
    .feature-card { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; }
    .pattern-card { background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px; padding: 16px; }
    .feature-title, .pattern-title { font-weight: 600; font-size: 15px; color: #0f172a; margin-bottom: 6px; }
    .feature-oneliner { font-size: 14px; color: #475569; margin-bottom: 8px; }
    .pattern-summary { font-size: 14px; color: #475569; margin-bottom: 8px; }
    .feature-why, .pattern-detail { font-size: 13px; color: #334155; line-height: 1.5; }
    .feature-examples { margin-top: 12px; }
    .feature-example { padding: 8px 0; border-top: 1px solid #d1fae5; }
    .feature-example:first-child { border-top: none; }
    .example-code-row { display: flex; align-items: flex-start; gap: 8px; }
    .example-code { flex: 1; background: #f1f5f9; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #334155; overflow-x: auto; white-space: pre-wrap; }
    .copyable-prompt-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
    .copyable-prompt-row { display: flex; align-items: flex-start; gap: 8px; }
    .copyable-prompt { flex: 1; background: #f8fafc; padding: 10px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #334155; border: 1px solid #e2e8f0; white-space: pre-wrap; line-height: 1.5; }
    .pattern-prompt { background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 12px; border: 1px solid #e2e8f0; }
    .pattern-prompt code { font-family: monospace; font-size: 12px; color: #334155; display: block; white-space: pre-wrap; margin-bottom: 8px; }
    .prompt-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    .copy-btn { background: #e2e8f0; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; color: #475569; flex-shrink: 0; }
    .copy-btn:hover { background: #cbd5e1; }
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
    .chart-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .chart-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 12px; }
    .bar-row { display: flex; align-items: center; margin-bottom: 6px; }
    .bar-label { width: 100px; font-size: 11px; color: #475569; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-track { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; margin: 0 8px; }
    .bar-fill { height: 100%; border-radius: 3px; }
    .bar-value { width: 28px; font-size: 11px; font-weight: 500; color: #64748b; text-align: right; }
    .empty { color: #94a3b8; font-size: 13px; }
    .horizon-section { display: flex; flex-direction: column; gap: 16px; }
    .horizon-card { background: linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%); border: 1px solid #c4b5fd; border-radius: 8px; padding: 16px; }
    .horizon-title { font-weight: 600; font-size: 15px; color: #5b21b6; margin-bottom: 8px; }
    .horizon-possible { font-size: 14px; color: #334155; margin-bottom: 10px; line-height: 1.5; }
    .horizon-tip { font-size: 13px; color: #6b21a8; background: rgba(255,255,255,0.6); padding: 8px 12px; border-radius: 4px; }
    .feedback-header { margin-top: 48px; color: #64748b; font-size: 16px; }
    .feedback-intro { font-size: 13px; color: #94a3b8; margin-bottom: 16px; }
    .feedback-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .feedback-card.team-card { background: #eff6ff; border-color: #bfdbfe; }
    .feedback-card.model-card { background: #faf5ff; border-color: #e9d5ff; }
    .feedback-title { font-weight: 600; font-size: 14px; color: #0f172a; margin-bottom: 6px; }
    .feedback-detail { font-size: 13px; color: #475569; line-height: 1.5; }
    .feedback-evidence { font-size: 12px; color: #64748b; margin-top: 8px; }
    .fun-ending { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #fbbf24; border-radius: 12px; padding: 24px; margin-top: 40px; text-align: center; }
    .fun-headline { font-size: 18px; font-weight: 600; color: #78350f; margin-bottom: 8px; }
    .fun-detail { font-size: 14px; color: #92400e; }
    .collapsible-section { margin-top: 16px; }
    .collapsible-header { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
    .collapsible-header h3 { margin: 0; font-size: 14px; font-weight: 600; color: #475569; }
    .collapsible-arrow { font-size: 12px; color: #94a3b8; transition: transform 0.2s; }
    .collapsible-content { display: none; padding-top: 16px; }
    .collapsible-content.open { display: block; }
    .collapsible-header.open .collapsible-arrow { transform: rotate(90deg); }
    @media (max-width: 640px) { .charts-row { grid-template-columns: 1fr; } .stats-row { justify-content: center; } }
  `;
  let js = `
    function toggleCollapsible(header) {
      header.classList.toggle('open');
      const content = header.nextElementSibling;
      content.classList.toggle('open');
    }
    function copyText(btn) {
      const code = btn.previousElementSibling;
      navigator.clipboard.writeText(code.textContent).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      });
    }
    function copyCmdItem(idx) {
      const checkbox = document.getElementById('cmd-' + idx);
      if (checkbox) {
        const text = checkbox.dataset.text;
        navigator.clipboard.writeText(text).then(() => {
          const btn = checkbox.nextElementSibling.querySelector('.copy-btn');
          if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy'; }, 2000); }
        });
      }
    }
    function copyAllCheckedClaudeMd() {
      const checkboxes = document.querySelectorAll('.cmd-checkbox:checked');
      const texts = [];
      checkboxes.forEach(cb => {
        if (cb.dataset.text) { texts.push(cb.dataset.text); }
      });
      const combined = texts.join('\\n');
      const btn = document.querySelector('.copy-all-btn');
      if (btn) {
        navigator.clipboard.writeText(combined).then(() => {
          btn.textContent = 'Copied ' + texts.length + ' items!';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = 'Copy All Checked'; btn.classList.remove('copied'); }, 2000);
        });
      }
    }
    // Timezone selector for time of day chart (data is from our own analytics, not user input)
    const rawHourCounts = ${countValues(data.message_hours)};
    function updateHourHistogram(offsetFromPT) {
      const periods = [
        { label: "Morning (6-12)", range: [6,7,8,9,10,11] },
        { label: "Afternoon (12-18)", range: [12,13,14,15,16,17] },
        { label: "Evening (18-24)", range: [18,19,20,21,22,23] },
        { label: "Night (0-6)", range: [0,1,2,3,4,5] }
      ];
      const adjustedCounts = {};
      for (const [hour, count] of Object.entries(rawHourCounts)) {
        const newHour = (parseInt(hour) + offsetFromPT + 24) % 24;
        adjustedCounts[newHour] = (adjustedCounts[newHour] || 0) + count;
      }
      const periodCounts = periods.map(p => ({
        label: p.label,
        count: p.range.reduce((sum, h) => sum + (adjustedCounts[h] || 0), 0)
      }));
      const maxCount = Math.max(...periodCounts.map(p => p.count)) || 1;
      const container = document.getElementById('hour-histogram');
      container.textContent = '';
      periodCounts.forEach(p => {
        const row = document.createElement('div');
        row.className = 'bar-row';
        const label = document.createElement('div');
        label.className = 'bar-label';
        label.textContent = p.label;
        const track = document.createElement('div');
        track.className = 'bar-track';
        const fill = document.createElement('div');
        fill.className = 'bar-fill';
        fill.style.width = (p.count / maxCount) * 100 + '%';
        fill.style.background = '#8b5cf6';
        track.appendChild(fill);
        const value = document.createElement('div');
        value.className = 'bar-value';
        value.textContent = p.count;
        row.appendChild(label);
        row.appendChild(track);
        row.appendChild(value);
        container.appendChild(row);
      });
    }
    document.getElementById('timezone-select').addEventListener('change', function() {
      const customInput = document.getElementById('custom-offset');
      if (this.value === 'custom') {
        customInput.style.display = 'inline-block';
        customInput.focus();
      } else {
        customInput.style.display = 'none';
        updateHourHistogram(parseInt(this.value));
      }
    });
    document.getElementById('custom-offset').addEventListener('change', function() {
      const parsed = parseInt(this.value, 10);
      if (isNaN(parsed)) return;
      updateHourHistogram(parsed + 8);
    });
  `;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Claude Code Insights</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; color: #334155; line-height: 1.65; padding: 48px 24px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 32px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    h2 { font-size: 20px; font-weight: 600; color: #0f172a; margin-top: 48px; margin-bottom: 16px; }
    .subtitle { color: #64748b; font-size: 15px; margin-bottom: 32px; }
    .nav-toc { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0 32px 0; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; }
    .nav-toc a { font-size: 12px; color: #64748b; text-decoration: none; padding: 6px 12px; border-radius: 6px; background: #f1f5f9; transition: all 0.15s; }
    .nav-toc a:hover { background: #e2e8f0; color: #334155; }
    .stats-row { display: flex; gap: 24px; margin-bottom: 40px; padding: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: #0f172a; }
    .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
    .at-a-glance { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
    .glance-title { font-size: 16px; font-weight: 700; color: #92400e; margin-bottom: 16px; }
    .glance-sections { display: flex; flex-direction: column; gap: 12px; }
    .glance-section { font-size: 14px; color: #78350f; line-height: 1.6; }
    .glance-section strong { color: #92400e; }
    .see-more { color: #b45309; text-decoration: none; font-size: 13px; white-space: nowrap; }
    .see-more:hover { text-decoration: underline; }
    .auto-mode-card { background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%); border: 1px solid #60a5fa; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
    .auto-mode-title { font-size: 16px; font-weight: 700; color: #1e40af; margin-bottom: 10px; }
    .auto-mode-desc { font-size: 14px; color: #1e3a8a; line-height: 1.6; }
    .auto-mode-desc code { background: rgba(255,255,255,0.7); padding: 1px 6px; border-radius: 4px; font-size: 13px; }
    .auto-mode-note { font-size: 13px; color: #1e3a8a; background: rgba(255,255,255,0.6); padding: 8px 12px; border-radius: 6px; margin-top: 10px; }
    .auto-mode-fineprint { font-size: 11px; color: #3b82f6; margin-top: 10px; }
    .project-areas { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
    .project-area { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .area-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .area-name { font-weight: 600; font-size: 15px; color: #0f172a; }
    .area-count { font-size: 12px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; }
    .area-desc { font-size: 14px; color: #475569; line-height: 1.5; }
    .narrative { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .narrative p { margin-bottom: 12px; font-size: 14px; color: #475569; line-height: 1.7; }
    .key-insight { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-top: 12px; font-size: 14px; color: #166534; }
    .section-intro { font-size: 14px; color: #64748b; margin-bottom: 16px; }
    .big-wins { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
    .big-win { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; }
    .big-win-title { font-weight: 600; font-size: 15px; color: #166534; margin-bottom: 8px; }
    .big-win-desc { font-size: 14px; color: #15803d; line-height: 1.5; }
    .friction-categories { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .friction-category { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; }
    .friction-title { font-weight: 600; font-size: 15px; color: #991b1b; margin-bottom: 6px; }
    .friction-desc { font-size: 13px; color: #7f1d1d; margin-bottom: 10px; }
    .friction-examples { margin: 0 0 0 20px; font-size: 13px; color: #334155; }
    .friction-examples li { margin-bottom: 4px; }
    .claude-md-section { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .claude-md-section h3 { font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 12px 0; }
    .claude-md-actions { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #dbeafe; }
    .copy-all-btn { background: #2563eb; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
    .copy-all-btn:hover { background: #1d4ed8; }
    .copy-all-btn.copied { background: #16a34a; }
    .claude-md-item { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; padding: 10px 0; border-bottom: 1px solid #dbeafe; }
    .claude-md-item:last-child { border-bottom: none; }
    .cmd-checkbox { margin-top: 2px; }
    .cmd-code { background: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #1e40af; border: 1px solid #bfdbfe; font-family: monospace; display: block; white-space: pre-wrap; word-break: break-word; flex: 1; }
    .cmd-why { font-size: 12px; color: #64748b; width: 100%; padding-left: 24px; margin-top: 4px; }
    .features-section, .patterns-section { display: flex; flex-direction: column; gap: 12px; margin: 16px 0; }
    .feature-card { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; }
    .pattern-card { background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px; padding: 16px; }
    .feature-title, .pattern-title { font-weight: 600; font-size: 15px; color: #0f172a; margin-bottom: 6px; }
    .feature-oneliner { font-size: 14px; color: #475569; margin-bottom: 8px; }
    .pattern-summary { font-size: 14px; color: #475569; margin-bottom: 8px; }
    .feature-why, .pattern-detail { font-size: 13px; color: #334155; line-height: 1.5; }
    .feature-examples { margin-top: 12px; }
    .feature-example { padding: 8px 0; border-top: 1px solid #d1fae5; }
    .feature-example:first-child { border-top: none; }
    .example-code-row { display: flex; align-items: flex-start; gap: 8px; }
    .example-code { flex: 1; background: #f1f5f9; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #334155; overflow-x: auto; white-space: pre-wrap; }
    .copyable-prompt-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
    .copyable-prompt-row { display: flex; align-items: flex-start; gap: 8px; }
    .copyable-prompt { flex: 1; background: #f8fafc; padding: 10px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #334155; border: 1px solid #e2e8f0; white-space: pre-wrap; line-height: 1.5; }
    .pattern-prompt { background: #f8fafc; padding: 12px; border-radius: 6px; margin-top: 12px; border: 1px solid #e2e8f0; }
    .pattern-prompt code { font-family: monospace; font-size: 12px; color: #334155; display: block; white-space: pre-wrap; margin-bottom: 8px; }
    .prompt-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
    .copy-btn { background: #e2e8f0; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; color: #475569; flex-shrink: 0; }
    .copy-btn:hover { background: #cbd5e1; }
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
    .chart-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .chart-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 12px; }
    .bar-row { display: flex; align-items: center; margin-bottom: 6px; }
    .bar-label { width: 100px; font-size: 11px; color: #475569; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-track { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; margin: 0 8px; }
    .bar-fill { height: 100%; border-radius: 3px; }
    .bar-value { width: 28px; font-size: 11px; font-weight: 500; color: #64748b; text-align: right; }
    .empty { color: #94a3b8; font-size: 13px; }
    .horizon-section { display: flex; flex-direction: column; gap: 16px; }
    .horizon-card { background: linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%); border: 1px solid #c4b5fd; border-radius: 8px; padding: 16px; }
    .horizon-title { font-weight: 600; font-size: 15px; color: #5b21b6; margin-bottom: 8px; }
    .horizon-possible { font-size: 14px; color: #334155; margin-bottom: 10px; line-height: 1.5; }
    .horizon-tip { font-size: 13px; color: #6b21a8; background: rgba(255,255,255,0.6); padding: 8px 12px; border-radius: 4px; }
    .feedback-header { margin-top: 48px; color: #64748b; font-size: 16px; }
    .feedback-intro { font-size: 13px; color: #94a3b8; margin-bottom: 16px; }
    .feedback-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .feedback-card.team-card { background: #eff6ff; border-color: #bfdbfe; }
    .feedback-card.model-card { background: #faf5ff; border-color: #e9d5ff; }
    .feedback-title { font-weight: 600; font-size: 14px; color: #0f172a; margin-bottom: 6px; }
    .feedback-detail { font-size: 13px; color: #475569; line-height: 1.5; }
    .feedback-evidence { font-size: 12px; color: #64748b; margin-top: 8px; }
    .fun-ending { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #fbbf24; border-radius: 12px; padding: 24px; margin-top: 40px; text-align: center; }
    .fun-headline { font-size: 18px; font-weight: 600; color: #78350f; margin-bottom: 8px; }
    .fun-detail { font-size: 14px; color: #92400e; }
    .collapsible-section { margin-top: 16px; }
    .collapsible-header { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
    .collapsible-header h3 { margin: 0; font-size: 14px; font-weight: 600; color: #475569; }
    .collapsible-arrow { font-size: 12px; color: #94a3b8; transition: transform 0.2s; }
    .collapsible-content { display: none; padding-top: 16px; }
    .collapsible-content.open { display: block; }
    .collapsible-header.open .collapsible-arrow { transform: rotate(90deg); }
    @media (max-width: 640px) { .charts-row { grid-template-columns: 1fr; } .stats-row { justify-content: center; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>Claude Code Insights</h1>
    <p class="subtitle">${data.total_messages.toLocaleString()} messages across ${data.total_sessions} sessions${data.total_sessions_scanned && data.total_sessions_scanned > data.total_sessions ? ` (${data.total_sessions_scanned.toLocaleString()} total)` : ""} | ${data.date_range.start} to ${data.date_range.end}</p>

    ${atAGlanceHtml}

    ${cell}

    <nav class="nav-toc">
      <a href="#section-work">What You Work On</a>
      <a href="#section-usage">How You Use CC</a>
      <a href="#section-wins">Impressive Things</a>
      <a href="#section-friction">Where Things Go Wrong</a>
      <a href="#section-features">Features to Try</a>
      <a href="#section-patterns">New Usage Patterns</a>
      <a href="#section-horizon">On the Horizon</a>
      <a href="#section-feedback">Team Feedback</a>
    </nav>

    <div class="stats-row">
      <div class="stat"><div class="stat-value">${data.total_messages.toLocaleString()}</div><div class="stat-label">Messages</div></div>
      <div class="stat"><div class="stat-value">+${data.total_lines_added.toLocaleString()}/-${data.total_lines_removed.toLocaleString()}</div><div class="stat-label">Lines</div></div>
      <div class="stat"><div class="stat-value">${data.total_files_modified}</div><div class="stat-label">Files</div></div>
      <div class="stat"><div class="stat-value">${data.days_active}</div><div class="stat-label">Days</div></div>
      <div class="stat"><div class="stat-value">${data.messages_per_day}</div><div class="stat-label">Msgs/Day</div></div>
    </div>

    ${projectAreasHtml}

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">What You Wanted</div>
        ${generateBarChart(data.goal_categories, "#2563eb")}
      </div>
      <div class="chart-card">
        <div class="chart-title">Top Tools Used</div>
        ${generateBarChart(data.tool_counts, "#0891b2")}
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Languages</div>
        ${generateBarChart(data.languages, "#10b981")}
      </div>
      <div class="chart-card">
        <div class="chart-title">Session Types</div>
        ${generateBarChart(data.session_types || {}, "#8b5cf6")}
      </div>
    </div>

    ${interactionHtml}

    <!-- Response Time Distribution -->
    <div class="chart-card" style="margin: 24px 0;">
      <div class="chart-title">User Response Time Distribution</div>
      ${generateResponseTimeHistogram(data.user_response_times)}
      <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
        Median: ${data.median_response_time.toFixed(1)}s &bull; Average: ${data.avg_response_time.toFixed(1)}s
      </div>
    </div>

    <!-- Multi-clauding Section (matching Python reference) -->
    <div class="chart-card" style="margin: 24px 0;">
      <div class="chart-title">Multi-Clauding (Parallel Sessions)</div>
      ${
        data.multi_clauding.overlap_events === 0
          ? `
        <p style="font-size: 14px; color: #64748b; padding: 8px 0;">
          No parallel session usage detected. You typically work with one Claude Code session at a time.
        </p>
      `
          : `
        <div style="display: flex; gap: 24px; margin: 12px 0;">
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #7c3aed;">${data.multi_clauding.overlap_events}</div>
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Overlap Events</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #7c3aed;">${data.multi_clauding.sessions_involved}</div>
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Sessions Involved</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #7c3aed;">${data.total_messages > 0 ? Math.round((100 * data.multi_clauding.user_messages_during) / data.total_messages) : 0}%</div>
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Of Messages</div>
          </div>
        </div>
        <p style="font-size: 13px; color: #475569; margin-top: 12px;">
          You run multiple Claude Code sessions simultaneously. Multi-clauding is detected when sessions
          overlap in time, suggesting parallel workflows.
        </p>
      `
      }
    </div>

    <!-- Time of Day & Tool Errors -->
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title" style="display: flex; align-items: center; gap: 12px;">
          User Messages by Time of Day
          <select id="timezone-select" style="font-size: 12px; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <option value="0">PT (UTC-8)</option>
            <option value="3">ET (UTC-5)</option>
            <option value="8">London (UTC)</option>
            <option value="9">CET (UTC+1)</option>
            <option value="17">Tokyo (UTC+9)</option>
            <option value="custom">Custom offset...</option>
          </select>
          <input type="number" id="custom-offset" placeholder="UTC offset" style="display: none; width: 80px; font-size: 12px; padding: 4px; border-radius: 4px; border: 1px solid #e2e8f0;">
        </div>
        ${generateTimeOfDayChart(data.message_hours)}
      </div>
      <div class="chart-card">
        <div class="chart-title">Tool Errors Encountered</div>
        ${Object.keys(data.tool_error_categories).length > 0 ? generateBarChart(data.tool_error_categories, "#dc2626") : '<p class="empty">No tool errors</p>'}
      </div>
    </div>

    ${whatWorksHtml}

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">What Helped Most (Claude's Capabilities)</div>
        ${generateBarChart(data.success, "#16a34a")}
      </div>
      <div class="chart-card">
        <div class="chart-title">Outcomes</div>
        ${generateBarChart(data.outcomes, "#8b5cf6", 6, OUTCOME_ORDER)}
      </div>
    </div>

    ${frictionHtml}

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Primary Friction Types</div>
        ${generateBarChart(data.friction, "#dc2626")}
      </div>
      <div class="chart-card">
        <div class="chart-title">Inferred Satisfaction (model-estimated)</div>
        ${generateBarChart(data.satisfaction, "#eab308", 6, SATISFACTION_ORDER)}
      </div>
    </div>

    ${suggestionsHtml}

    ${horizonHtml}

    ${funEndingHtml}

    ${teamFeedbackHtml}
  </div>
  <script>${js}</script>
</body>
</html>`;
}
//@ chunk-f2v3cjkz.js:90871-92579 layout
/**
 * 列出要分析的会话：有 v5 存储时分页列出 transcript 命名空间下的项目和会话（受页数预算限制，截断时告警），否则扫描本地 projects 目录；结果按修改时间倒序。
 */
async function listSessionFilesForInsights(storage) {
  if (storage) {
    let results = [];
    switch (
      (
        await readAllPages(
          (kind) =>
            storage.listEntries(
              {
                namespace: "transcript",
              },
              kind
                ? {
                    cursor: kind,
                  }
                : undefined,
            ),
          (entries) => {
            for (let entry of entries)
              if (
                entry.kind === "scope" &&
                entry.scope.namespace === "transcript" &&
                entry.scope.projectKey !== undefined
              )
                results.push(entry.scope.projectKey);
          },
        )
      ).status
    ) {
      case "done":
        break;
      case "error":
        return [];
      case "capped":
        logForDebugging(
          `insights: project listing truncated at ${DEFAULT_MAX_PAGES} pages; scanning the ${results.length} projects seen`,
          {
            level: "warn",
          },
        );
        break;
    }
    let sessions = [];
    let budget = {
      pagesLeft: DEFAULT_MAX_PAGES,
    };
    let page = 0;
    for (let j = 0; j < results.length; j++) {
      let result = results[j];
      switch (
        (
          await readAllPages(
            (page) =>
              storage.listEntries(
                {
                  namespace: "transcript",
                  projectKey: result,
                },
                page
                  ? {
                      cursor: page,
                    }
                  : undefined,
              ),
            (entries) => {
              for (let entry of entries) {
                if (entry.kind !== "key" || entry.key.namespace !== "transcript") continue;
                if (
                  entry.key.agentId !== undefined ||
                  entry.key.journal === true ||
                  entry.key.projectKey !== result
                )
                  continue;
                let sessionId = normalizeUuidOrNull(entry.key.sessionId);
                if (!sessionId) continue;
                sessions.push({
                  sessionId,
                  key: STORAGE_SPACES.transcript(result, sessionId),
                  mtime: entry.mtimeMs ?? 0,
                  size: entry.size ?? 0,
                });
              }
            },
            {
              budget,
            },
          )
        ).status
      ) {
        case "done":
          break;
        case "error":
          break;
        case "capped":
          if (page === 0)
            logForDebugging(
              `insights: session listing for project ${result} truncated (the scan's ${DEFAULT_MAX_PAGES}-page session-listing budget is spent); keeping the sessions seen`,
              {
                level: "warn",
              },
            );
          page++;
          break;
      }
      if (j % 10 === 9) await new Promise((resolve) => setImmediate(resolve));
    }
    if (page > 1)
      logForDebugging(
        `insights: ${page - 1} more ${page === 2 ? "project was" : "projects were"} left without a session listing after the scan's budget ran out`,
        {
          level: "warn",
        },
      );
    sessions.sort((a, b) => b.mtime - a.mtime);
    return sessions;
  }
  let projectsDir = getProjectsDir();
  let entries;
  try {
    entries = await readdir(projectsDir, {
      withFileTypes: true,
    });
  } catch {
    return [];
  }
  let projectDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(projectsDir, entry.name));
  let sessions = [];
  for (let i = 0; i < projectDirs.length; i++) {
    let sessionFilesWithMtime = await getSessionFilesWithMtime(projectDirs[i]);
    for (let [sessionId, mtime] of sessionFilesWithMtime)
      sessions.push({
        sessionId,
        path: mtime.path,
        mtime: mtime.mtime,
        size: mtime.size,
      });
    if (i % 10 === 9) await new Promise((resolve) => setImmediate(resolve));
  }
  sessions.sort((a, b) => b.mtime - a.mtime);
  return sessions;
}
//@ chunk-f2v3cjkz.js:92579-96212 fingerprint (2.1.88 match: generateUsageReport, 0.579)
async function generateUsageReport(options) {
  let remoteStats;
  let sessionFiles =
    options?.liveSession === undefined ? await listSessionFilesForInsights(options?.storageV5) : [];
  let totalSessionsScanned =
    options?.liveSession === undefined ? sessionFiles.length : options.liveSession === null ? 0 : 1;
  let MAX_SESSIONS_TO_LOAD = 200;
  let logs = [];
  let failures = [];
  let scannedCount = 0;
  let skippedCount = 0;
  let offset = 0;
  for (let batch of chunkArray(sessionFiles, INSIGHTS_MCP_AUTH_BATCH)) {
    let storageV5 = options?.storageV5;
    let cached = storageV5
      ? await getMcpAuthCache_2(
          batch.map((info) => info.sessionId),
          storageV5,
        )
      : await Promise.all(batch.map((sessionInfo) => loadSessionMeta(sessionInfo.sessionId)));
    let mapped = batch.map((sessionInfo, index) => ({
      sessionInfo,
      cached: cached[index] ?? null,
    }));
    for (let [index, { sessionInfo: info, cached }] of mapped.entries()) {
      let globalIndex = offset + index;
      let batchResults =
        cached?.bash_would_prompt_count !== undefined || globalIndex >= BASH_PROMPT_LOOKBACK_SESSIONS;
      if (
        cached &&
        batchResults &&
        (cached.transcript_mtime === undefined || cached.transcript_mtime >= info.mtime)
      )
        logs.push(cached);
      else if (!cached) {
        if (scannedCount < MAX_SESSIONS_TO_LOAD) {
          failures.push({
            sessionInfo: info,
            cached,
          });
          scannedCount++;
        }
      } else if (skippedCount < MAX_SESSIONS_TO_LOAD) {
        failures.push({
          sessionInfo: info,
          cached,
        });
        skippedCount++;
      } else logs.push(cached);
    }
    offset += batch.length;
  }
  let privacyLabels = options?.privacyLabels ?? "";
  let logsForFacets = new Map();
  if (options?.liveSession) {
    let liveMeta = logToSessionMeta(options.liveSession);
    logs.push(liveMeta);
    logsForFacets.set(liveMeta.session_id, options.liveSession);
  }
  let isMetaSession = (log) => {
    for (let msg of log.messages.slice(0, 5))
      if (msg.type === "user" && msg.message) {
        let content = msg.message.content;
        if (typeof content === "string") {
          if (content.includes("RESPOND WITH ONLY A VALID JSON OBJECT") || content.includes("record_facets"))
            return true;
        }
      }
    return false;
  };
  let LOAD_BATCH_SIZE = 10;
  for (let i = 0; i < failures.length; i += LOAD_BATCH_SIZE) {
    let batch = failures.slice(i, i + LOAD_BATCH_SIZE);
    let batchResults = await Promise.all(
      batch.map(async ({ sessionInfo, cached }) => {
        try {
          return {
            sessionInfo,
            cached,
            logs:
              options?.storageV5 && sessionInfo.key
                ? await loadAllLogsFromSessionFile(`${sessionInfo.sessionId}.jsonl`, undefined, {
                    backend: options.storageV5,
                    key: sessionInfo.key,
                  })
                : await loadAllLogsFromSessionFile(sessionInfo.path ?? ""),
          };
        } catch {
          return {
            sessionInfo,
            cached,
            logs: [],
          };
        }
      }),
    );
    let facets = new Map();
    for (let { sessionInfo, cached, logs: logs_2 } of batchResults) {
      let failed = false;
      for (let log of logs_2) {
        if (isMetaSession(log) || Number.isNaN(log.created.getTime()) || Number.isNaN(log.modified.getTime()))
          continue;
        let meta = logToSessionMeta(log);
        meta.transcript_mtime = sessionInfo.mtime;
        logs.push(meta);
        failed = true;
        if (deduplicateSessionBranches(meta, facets.get(meta.session_id))) facets.set(meta.session_id, meta);
        logsForFacets.set(meta.session_id, log);
      }
      if (!failed && cached) logs.push(cached);
    }
    await Promise.all([...facets.values()].map((meta) => writeSessionMetaCache(meta, options?.storageV5)));
  }
  let bestBySession = new Map();
  for (let meta of logs)
    if (deduplicateSessionBranches(meta, bestBySession.get(meta.session_id)))
      bestBySession.set(meta.session_id, meta);
  let keptSessionIds = new Set(bestBySession.keys());
  logs = [...bestBySession.values()];
  for (let sessionId of logsForFacets.keys())
    if (!keptSessionIds.has(sessionId)) logsForFacets.delete(sessionId);
  logs.sort((a, b) => b.start_time.localeCompare(a.start_time));
  let isSubstantiveSession = (meta) => {
    if (meta.user_message_count < 2) return false;
    if (meta.duration_minutes < 1) return false;
    return true;
  };
  let substantiveMetas = logs.filter(isSubstantiveSession);
  let facets = new Map();
  let toExtract = [];
  let MAX_FACET_EXTRACTIONS = 50;
  let storageV5 = options?.storageV5;
  let substantiveIds =
    options?.liveSession === undefined ? substantiveMetas.map((meta) => meta.session_id) : [];
  let substantiveFacets = storageV5
    ? (
        await Promise.all(
          chunkArray(substantiveIds, INSIGHTS_MCP_AUTH_BATCH).map((batch) =>
            getMcpAuthCache(batch, storageV5),
          ),
        )
      ).flat()
    : await Promise.all(substantiveIds.map((meta) => loadCachedFacets(meta)));
  let mapped = substantiveMetas.map((meta, index) => ({
    sessionId: meta.session_id,
    cached: substantiveFacets[index] ?? null,
  }));
  for (let { sessionId, cached } of mapped)
    if (cached) facets.set(sessionId, cached);
    else {
      let log = logsForFacets.get(sessionId);
      if (log && toExtract.length < MAX_FACET_EXTRACTIONS)
        toExtract.push({
          log,
          sessionId,
        });
    }
  let CONCURRENCY = 50;
  for (let i = 0; i < toExtract.length; i += CONCURRENCY) {
    let batch = toExtract.slice(i, i + CONCURRENCY);
    let results = await Promise.all(
      batch.map(async ({ log, sessionId }) => {
        let newFacets = await extractFacetsFromAPI(
          log,
          sessionId,
          options?.credentials,
          options?.liveSession === undefined ? undefined : privacyLabels,
          options?.signal,
        );
        return {
          sessionId,
          newFacets,
        };
      }),
    );
    let facetsToSave = [];
    for (let { sessionId, newFacets } of results)
      if (newFacets) {
        facets.set(sessionId, newFacets);
        facetsToSave.push(newFacets);
      }
    if (options?.liveSession === undefined)
      await Promise.all(facetsToSave.map((facet) => saveFacets(facet, options?.storageV5)));
  }
  INSIGHTS_CACHE.clear();
  let isMinimalSession = (sessionId) => {
    let sessionFacets = facets.get(sessionId);
    if (!sessionFacets) return false;
    let cats = sessionFacets.goal_categories;
    let catKeys = safeKeys(cats).filter((k) => (cats[k] ?? 0) > 0);
    return catKeys.length === 1 && catKeys[0] === "warmup_minimal";
  };
  let substantiveSessions = substantiveMetas.filter((meta) => !isMinimalSession(meta.session_id));
  let substantiveFacets_2 = new Map();
  for (let [sessionId, value] of facets)
    if (!isMinimalSession(sessionId)) substantiveFacets_2.set(sessionId, value);
  let aggregated = aggregateData(substantiveSessions, substantiveFacets_2);
  aggregated.total_sessions_scanned = totalSessionsScanned;
  options?.signal?.throwIfAborted();
  let insights = await generateParallelInsights(
    aggregated,
    facets,
    options?.credentials,
    options?.liveSession === undefined ? tagAndManifestArtifactContent([], [], [""]) : privacyLabels,
    options?.signal,
  );
  let htmlReport = autoModeRecommendation(aggregated, readAutoModeContext(options?.permissionGates));
  if (options?.liveSession !== undefined)
    return {
      insights,
      htmlPath: "",
      data: aggregated,
      remoteStats,
      facets: substantiveFacets_2,
      autoModeReco: htmlReport,
    };
  let htmlReport_2 = generateHtmlReport(aggregated, insights, htmlReport);
  let date = new Date();
  let pad2 = (n) => String(n).padStart(2, "0");
  let stamp = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
  let htmlPath = await saveSessionMeta(htmlReport_2, stamp, options?.storageV5);
  return {
    insights,
    htmlPath,
    data: aggregated,
    remoteStats,
    facets: substantiveFacets_2,
    autoModeReco: htmlReport,
  };
}
//@ chunk-f2v3cjkz.js:96212-96257 file-local
function safeEntries(obj) {
  return obj ? Object.entries(obj) : [];
}
//@ chunk-f2v3cjkz.js:96257-96299 file-local
function safeKeys(obj) {
  return obj ? Object.keys(obj) : [];
}
//@ chunk-f2v3cjkz.js:96299-98829 fingerprint (2.1.88 match: usageReport, 0.684)
/**
 * /insights 命令对象（prompt）；描述：Generate a report analyzing your Claude Code sessions。
 */
var insightsCommandDefinition = {
  type: "prompt",
  name: "insights",
  description: "Generate a report analyzing your Claude Code sessions",
  contentLength: 0,
  progressMessage: "analyzing your sessions",
  source: "builtin",
  async getPromptForCommand(args, context) {
    if (context.options?.isSkillPreload)
      return [
        {
          type: "text",
          text: "The /insights report is generated only when the command is invoked directly.",
        },
      ];
    let collectRemote = false;
    let warnings = [];
    let alreadyRunning = false;
    let lock = INSIGHTS_RUNNING_SLOT.of(context.session);
    if (isCcsTenant() && lock.running)
      return [
        {
          type: "text",
          text: "An earlier /insights in this session is still stopping. Tell the user to run it again in a moment.",
        },
      ];
    let liveSession = isCcsTenant() ? currentSessionAsLog(context.messages) : undefined;
    let privacyLabels = isCcsTenant() ? tagAndManifestArtifactContent(context.messages) : "";
    lock.running = isCcsTenant();
    recordToolUsed(UNREADABLE_TOOLS_USED_BEFORE_SUMMARY);
    let { insights, htmlPath, data, remoteStats, autoModeReco } = await generateUsageReport({
      collectRemote,
      liveSession,
      privacyLabels,
      signal: isCcsTenant() ? context.abortController.signal : undefined,
      storageV5: context.storageV5,
      credentials: context.credentials,
      permissionGates: () => {
        let toolPermissionContext = getToolPermissionContext(context);
        return {
          autoModeAvailable: canCycleToAuto(toolPermissionContext),
          currentSessionIsAuto: toolPermissionContext.mode === "auto",
          sandboxAutoAllowActive:
            SandboxManager.isSandboxingEnabled() && SandboxManager.isAutoAllowBashIfSandboxedEnabled(),
          currentSessionSeesNoDialogs:
            toolPermissionContext.mode === "bypassPermissions" || toolPermissionContext.mode === "dontAsk",
          liveArbiterIsAutoClassifier: isAutoClassifierActive(toolPermissionContext.mode),
        };
      },
    }).finally(() => {
      lock.running = false;
    });
    if (autoModeReco && !isCcsTenant())
      logEvent("tengu_insights_auto_mode_recommendation", {
        kind: fromEnum(autoModeReco.kind),
        ...(autoModeReco.kind === "switch_to_auto" && {
          estimated_prompts: fromNumber(autoModeReco.estimatedPrompts),
          non_auto_sessions: fromNumber(autoModeReco.nonAutoSessions),
          destructive_commands: fromNumber(autoModeReco.destructiveCommands),
        }),
      });
    let reportUrl = `file://${htmlPath}`;
    let joined = [
      data.total_sessions_scanned && data.total_sessions_scanned > data.total_sessions
        ? `${data.total_sessions_scanned.toLocaleString()} sessions total \xB7 ${data.total_sessions} analyzed`
        : `${data.total_sessions} sessions`,
      `${data.total_messages.toLocaleString()} messages`,
      `${Math.round(data.total_duration_hours)}h`,
      `${data.git_commits} commits`,
    ].join(" \xB7 ");
    let remoteInfo = "";
    let atAGlance = insights.at_a_glance;
    let summaryText = atAGlance
      ? `## At a Glance

${atAGlance.whats_working ? `**What's working:** ${atAGlance.whats_working} See _Impressive Things You Did_.` : ""}

${atAGlance.whats_hindering ? `**What's hindering you:** ${atAGlance.whats_hindering} See _Where Things Go Wrong_.` : ""}

${atAGlance.quick_wins ? `**Quick wins to try:** ${atAGlance.quick_wins} See _Features to Try_.` : ""}

${atAGlance.ambitious_workflows ? `**Ambitious workflows:** ${atAGlance.ambitious_workflows} See _On the Horizon_.` : ""}`
      : "_No insights generated_";
    let header = `# Claude Code Insights

${joined}
${data.date_range.start} to ${data.date_range.end}
${remoteInfo}
`;
    if (isCcsTenant())
      return [
        {
          type: "text",
          text: insightsSessionPrompt({
            insightsJson: jsonStringify(insights, null, 2),
            header,
            summaryText,
          }),
        },
      ];
    return [
      {
        type: "text",
        text: insightsReportPrompt({
          insightsJson: jsonStringify(insights, null, 2),
          reportUrl,
          htmlPath,
          facetsDir: getFacetsDir(),
          header,
          summaryText,
          recommendationLine: autoModeReco ? autoModeTipText(autoModeReco) : undefined,
        }),
      },
    ];
  },
};
//@ chunk-f2v3cjkz.js:98829-99450 layout
/**
 * 生成 /insights 完成后给模型的提示：附上完整数据与报告地址，要求逐字回复报告链接与建议行。
 */
function insightsReportPrompt({
  insightsJson,
  reportUrl,
  htmlPath,
  facetsDir,
  header,
  summaryText,
  recommendationLine,
}) {
  return `The user just ran /insights to generate a usage report analyzing their Claude Code sessions.

Here is the full insights data:
${insightsJson}

Report URL: ${reportUrl}
HTML file: ${htmlPath}
Facets directory: ${facetsDir}

At-a-glance summary (for your context only \u2014 the user has not seen any output yet):
${header}${summaryText}

Respond with exactly the following, and nothing else. Do not add, omit, or reword any line:

Your shareable insights report is ready:
${reportUrl}
${
  recommendationLine
    ? `
${recommendationLine}
`
    : ""
}
Want to dig into any section or try one of the suggestions?`;
}
//@ chunk-f2v3cjkz.js:99450-99860 layout
/**
 * 只分析当前会话（无报告文件）时给模型的提示：附上数据与摘要，让模型用自己的话总结。
 */
function insightsSessionPrompt({ insightsJson, header, summaryText }) {
  return `The user just ran /insights to generate a usage report analyzing this Claude Code session.

Here is the full insights data:
${insightsJson}

At-a-glance summary:
${header}${summaryText}

Give the user this summary in your own words. There is no report file to open, so don't mention one. End by asking whether they want to dig into any section or try one of the suggestions.`;
}
//@ chunk-f2v3cjkz.js:99860-100069 layout
function normalizeToolUseNames(names) {
  if (names.type !== "assistant" || !Array.isArray(names.message.content)) return names;
  return {
    ...names,
    message: {
      ...names.message,
      content: names.message.content.map((contentBlock) =>
        contentBlock.type === "tool_use"
          ? {
              ...contentBlock,
              name: builtinToolNameForMcp(contentBlock.name) ?? contentBlock.name,
            }
          : contentBlock,
      ),
    },
  };
}
//@ chunk-f2v3cjkz.js:100069-100532 layout
/**
 * 把当前会话的消息整理成一条日志记录（取首尾时间戳作创建/修改时间），用于只分析当前会话；没有有效时间戳时返回 null。
 */
function currentSessionAsLog(messages) {
  let sessionId = getSessionId();
  let flattened = messages.flatMap((message) =>
    message.type === "user" || message.type === "assistant" || message.type === "attachment"
      ? [
          {
            ...normalizeToolUseNames(message),
            sessionId,
            userType: "",
          },
        ]
      : [],
  );
  let filtered = flattened
    .map((message) => Date.parse(message.timestamp))
    .filter((time) => !Number.isNaN(time));
  if (filtered.length === 0) return null;
  let created = new Date(filtered.reduce((acc, time) => Math.min(acc, time)));
  let date = new Date(filtered.reduce((acc, time) => Math.max(acc, time)));
  return {
    date: date.toISOString(),
    messages: flattened,
    value: 0,
    created,
    modified: date,
    firstPrompt: "",
    messageCount: flattened.length,
    isSidechain: false,
    sessionId,
  };
}
//@ chunk-f2v3cjkz.js:100532-100905 fingerprint (2.1.88 match: isValidSessionFacets, 1)
function isValidSessionFacets(obj) {
  if (!obj || typeof obj !== "object") return false;
  let value = obj;
  return (
    typeof value.underlying_goal === "string" &&
    typeof value.outcome === "string" &&
    typeof value.brief_summary === "string" &&
    value.goal_categories !== null &&
    typeof value.goal_categories === "object" &&
    value.user_satisfaction_counts !== null &&
    typeof value.user_satisfaction_counts === "object" &&
    value.friction_counts !== null &&
    typeof value.friction_counts === "object"
  );
}
//@ chunk-f2v3cjkz.js:100905-100915 affinity
var insightsCommandAlias = insightsCommandDefinition;
//@ chunk-pc3x100t.js:39858-40124 fingerprint (2.1.88 match: scanAllSessions, 0.666)
async function scanAllSessions(dir, options, onEntry) {
  if (options === null) return true;
  let entries = await fsPromisesModule
    .readdir(dir, {
      withFileTypes: true,
    })
    .catch(() => []);
  for (let entry of entries) {
    let path = join(dir, entry.name);
    let stat = await fsPromisesModule.lstat(path).catch(() => null);
    if (stat !== null && stat.mtime > options) return true;
    if (onEntry > 1 && entry.isDirectory() && (await scanAllSessions(path, options, onEntry - 1)))
      return true;
  }
  return false;
}
//@ chunk-wjygkcr4.js:36907-37020 fingerprint (2.1.88 match: hasValidDates, 0.342)
function hasValidDates(log) {
  let minute = roundToMinute(log ?? Number.NaN);
  return Number.isNaN(minute.getTime()) ? "" : `, next run ${formatBriefTimestamp(minute.toISOString())}`;
}
export {
  getRemoteHostSessionCount,
  scanAllSessions,
  hasValidDates,
  toContentBlocks,
  formatTranscriptForFacets,
  insightsCommandAlias,
};
