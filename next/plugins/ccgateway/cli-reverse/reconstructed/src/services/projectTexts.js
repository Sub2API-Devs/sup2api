/**
 * services/projectTexts.ts
 *
 * 2.1.316 新增：Projects 文本附件的截断与分页提示（local_file 读取方式说明、只读）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wjj5jbkz.js (14)
 * attribution: placement 14
 */
import { matchesToolName } from "../Tool.js";
import { READ } from "../tools/FileReadTool/constants.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "./analytics/growthbook.js";
import { GREP_TOOL_NAME } from "../tools/GrepTool/prompt.js";
import { getModelContextInfo } from "../utils/model/modelContextInfo.js";
import { getAutoCompactThresholdTokens } from "./compact/autoCompact.js";
import { hasNoUserPromptSinceCompact } from "../utils/messages.js";
import { isAutoCompactEnabled } from "./compact/compactSettings.js";
import { logFeatureSad, logFeatureOk } from "./analytics/featureTelemetry.js";
import { truncateUtf8Bytes, firstLineOf } from "../utils/stringUtils.js";
import { builtProjectBlocks, formatProjectContext } from "./projects/projectContext.js";
import { getMainLoopModel } from "../utils/permissions/toolPermissionContext.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { PROJECTS_TOOL_NAME } from "../tools/ProjectsTool/prompt.js";
import { deniedBashRules, askedBashRules, toolMatchesRule } from "../utils/permissions/permissions.js";
import { hasToolHookMatching, hasSettingsHookForEvent } from "../utils/hooks.js";
import { registerAgent } from "../utils/telemetry/perfettoTracing.js";
import {
  hasModuleHookingSite,
  getLoadedModulesForSite,
} from "../plugins/hooksModules/loadedModuleFilters.js";
import { dispatchClassicEvent } from "../plugins/functionHooks/modAdmission.js";

//@ chunk-wjj5jbkz.js:808-868 placement
/**
 * 判定长行用的比例阈值。
 */
var TENGU_BREEZY_PELICAN = "tengu_breezy_pelican";
var LONG_LINE_NOTE_RATIO = 0.16666666666666666;
var MAX_PROJECT_TEXT_BYTES = 200000;
//@ chunk-wjj5jbkz.js:868-2511 placement
/**
 * 说明某行过长时如何用 grep/offset 读取 local_file。
 */
function formatLongLineNote(tools, hasLongLine) {
  let hasTool = (toolName) => tools.some((tool) => matchesToolName(tool, toolName));
  if (!hasTool(READ) || !hasTool(BASH_TOOL_NAME)) return;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BREEZY_PELICAN, null);
  if (
    featureValue_CACHED_MAY_BE_STALE?.copy_hint !== true ||
    (hasLongLine && (featureValue_CACHED_MAY_BE_STALE.long_lines !== true || !hasTool(GREP_TOOL_NAME)))
  )
    return;
  let searchHint = hasTool(GREP_TOOL_NAME) ? GREP_TOOL_NAME : "`grep`";
  return `local_file is for reading only${hasLongLine ? `. One of its lines is too long for ${READ} to page through, because ${READ}'s offset and limit count lines. ${READ} with no offset or limit gives only the first part of the file. ${READ} with an offset and limit gives whole lines, or an error if those lines do not fit. The file is too large for project_read to return inline. ${GREP_TOOL_NAME} shows a line or a match of over 500 characters as [Omitted long matching line]. With output_mode \`content\`, \`-o\` true and a pattern such as \`.{0,200}term.{0,200}\`, ${GREP_TOOL_NAME} shows each match of term with up to 200 characters on each side. In ${BASH_TOOL_NAME}, \`grep -ob 'term' /path/of/local_file | head\` gives the byte offset of each match of term, counted from 0. \`tail -c +START /path/of/local_file | head -c 20000\` gives 20000 bytes from byte START, counted from 1: START is an offset plus 1, or any number from 1 to size_bytes.` : `: read the parts you need with ${READ}'s offset and limit, or search it with ${searchHint}.`} Edits to ${hasLongLine ? "local_file" : "it"} never reach the project, and project_write rejects it as local_path. To change the document or make a file from it, run \`cat /path/of/local_file > new-name\` in the working directory, where new-name is a name that no file there has, and work on that file. To save a change, call project_write with the document's path and that file as local_path. If the document is an upload such as a PDF, that saves a new text document and leaves the upload as it is.`;
}
//@ chunk-wjj5jbkz.js:2511-3101 placement
function shouldCutProjectTexts({ model, configuredWindow, messages, room }) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BREEZY_PELICAN, null);
  if (
    featureValue_CACHED_MAY_BE_STALE?.mode !== "always" &&
    featureValue_CACHED_MAY_BE_STALE?.mode !== "after_compaction"
  )
    return;
  let modelContextInfo = getModelContextInfo(model);
  let autoCompactThresholdTokens = getAutoCompactThresholdTokens(modelContextInfo, configuredWindow);
  if (!(autoCompactThresholdTokens > 0)) return;
  if (autoCompactThresholdTokens > MAX_PROJECT_TEXT_BYTES) {
    let stepShare = featureValue_CACHED_MAY_BE_STALE.step_share;
    if (room === undefined || !(typeof stepShare === "number" && stepShare > 0 && stepShare <= 1)) return;
    let thresholdTokens =
      modelContextInfo.longContextWindowWithoutOptIn > 0
        ? autoCompactThresholdTokens
        : Math.min(autoCompactThresholdTokens, room.threshold);
    return {
      maxTokens: Math.max(0, Math.floor(thresholdTokens * stepShare) - room.claimed()),
      bytesPerToken: modelContextInfo.bytesPerToken,
      claim: room.claim,
    };
  }
  if (featureValue_CACHED_MAY_BE_STALE.mode === "after_compaction" && !hasNoUserPromptSinceCompact(messages))
    return;
  let { fraction } = featureValue_CACHED_MAY_BE_STALE;
  return {
    maxTokens: Math.round(
      autoCompactThresholdTokens *
        (typeof fraction === "number" && fraction > 0 && fraction <= 1 ? fraction : LONG_LINE_NOTE_RATIO),
    ),
    bytesPerToken: modelContextInfo.bytesPerToken,
  };
}
//@ chunk-wjj5jbkz.js:3101-3140 placement
/**
 * 截断文本时保留的字节数。
 */
var TENGU_IMPERATIVE_WHISTLE = "tengu_imperative_whistle";
var MAX_TRUNCATED_TEXT_BYTES = 200;
//@ chunk-wjj5jbkz.js:3140-3417 placement
function formatTruncatedTextNote(shownBytes, totalBytes) {
  return `

[Only the first ${shownBytes} of ${totalBytes} bytes of this text are shown. To see the rest, call \`project_info\`: it can give a file that holds all of this text. \`project_search\` does not search it. Read or search only the parts of that file that the task needs.]`;
}
//@ chunk-wjj5jbkz.js:3417-3983 placement
function cutProjectText(text, model, configuredWindow) {
  let modelContextInfo = getModelContextInfo(model);
  let autoCompactThresholdTokens = getAutoCompactThresholdTokens(modelContextInfo, configuredWindow);
  if (
    !(autoCompactThresholdTokens > 0) ||
    autoCompactThresholdTokens > MAX_PROJECT_TEXT_BYTES ||
    !isAutoCompactEnabled()
  )
    return;
  let maxBytes =
    Math.round(autoCompactThresholdTokens * LONG_LINE_NOTE_RATIO) * modelContextInfo.bytesPerToken;
  let description = text.description ?? "";
  let promptTemplate = text.prompt_template ?? "";
  let promptBytes = Buffer.byteLength(promptTemplate, "utf8");
  if (Buffer.byteLength(text.name, "utf8") + Buffer.byteLength(description, "utf8") + promptBytes <= maxBytes)
    return;
  if (!getFeatureValue_SESSION_PINNED(TENGU_IMPERATIVE_WHISTLE, false)) {
    logFeatureSad("projects_texts_cut", "sent_whole");
    return;
  }
  let shortName =
    Buffer.byteLength(text.name, "utf8") <= MAX_TRUNCATED_TEXT_BYTES
      ? text.name
      : `${truncateUtf8Bytes(text.name, MAX_TRUNCATED_TEXT_BYTES - 3)}\u2026`;
  let remainingBytes = maxBytes - Buffer.byteLength(shortName, "utf8");
  let shortDescription = truncateUtf8WithNote(
    description,
    Math.max(Math.floor(remainingBytes / 4), remainingBytes - promptBytes),
  );
  logFeatureOk("projects_texts_cut");
  return {
    name: shortName,
    description: shortDescription,
    prompt_template: truncateUtf8WithNote(
      promptTemplate,
      remainingBytes - Buffer.byteLength(shortDescription, "utf8"),
    ),
  };
}
//@ chunk-wjj5jbkz.js:3983-4400 placement
function logProjectTextCutFailure(attachments, context) {
  try {
    let builtBlock =
      attachments.attachedProject === undefined
        ? undefined
        : builtProjectBlocks.peek(context.session)?.get(attachments.attachedProject);
    let { mainLoopModel } = context.options;
    if (builtBlock === undefined || mainLoopModel === undefined) return attachments;
    let [textEntry, ...otherEntries] = builtBlock;
    let cut = cutProjectText(
      textEntry,
      getMainLoopModel({
        options: {
          mainLoopModel,
        },
        permissionLayers: context.permissionLayers,
      }),
      context.options.autoCompactWindow,
    );
    return cut === undefined
      ? attachments
      : {
          ...attachments,
          attachedProject: formatProjectContext(
            {
              ...textEntry,
              ...cut,
            },
            ...otherEntries,
          ),
        };
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "project texts could not be cut"));
    return attachments;
  }
}
//@ chunk-wjj5jbkz.js:4400-4556 placement
function truncateUtf8WithNote(text, maxBytes) {
  let totalBytes = Buffer.byteLength(text, "utf8");
  if (totalBytes <= maxBytes) return text;
  let truncated = truncateUtf8Bytes(
    text,
    maxBytes - Buffer.byteLength(formatTruncatedTextNote(maxBytes, totalBytes), "utf8"),
  );
  return truncated + formatTruncatedTextNote(Buffer.byteLength(truncated, "utf8"), totalBytes);
}
//@ chunk-wjj5jbkz.js:4556-4620 placement
/**
 * 取项目的工具别名表与权限层的别名表。
 */
function projectToolAliasSources(appState) {
  return [appState.toolAliases, appState.permissions().toolAliases];
}
//@ chunk-wjj5jbkz.js:4620-4801 placement
/**
 * 列出 Projects 工具的所有名称：本身、工具别名表里与它互为别名的名字，以及这些别名的别名。
 */
function getProjectsToolAliases(appState) {
  let flattened = projectToolAliasSources(appState).flatMap((aliasMap) => Object.entries(aliasMap ?? {}));
  let flattened_2 = flattened.flatMap(([from, to]) => [
    ...(to === PROJECTS_TOOL_NAME ? [from] : []),
    ...(from === PROJECTS_TOOL_NAME ? [to] : []),
  ]);
  return [
    PROJECTS_TOOL_NAME,
    ...flattened_2,
    ...flattened.flatMap(([from, to]) => (flattened_2.includes(to) ? [from] : [])),
  ];
}
//@ chunk-wjj5jbkz.js:4801-4966 placement
function hasProjectsPathRule(appState) {
  let permissions = appState.permissions();
  let projectsToolAliases = getProjectsToolAliases(appState);
  return [...deniedBashRules(permissions), ...askedBashRules(permissions)].some(
    (rule) =>
      firstLineOf(rule.ruleValue.ruleContent ?? "", ":").trim() === "path" &&
      projectsToolAliases.some((name) =>
        toolMatchesRule(
          permissions,
          {
            name,
          },
          rule,
        ),
      ),
  );
}
//@ chunk-wjj5jbkz.js:4966-5145 placement
function hasProjectsToolHook(hookEvent, toolInput, context) {
  return projectToolAliasSources(context).some((toolAliases) =>
    hasToolHookMatching({
      hookEvent,
      toolName: PROJECTS_TOOL_NAME,
      toolInput,
      tools: context.tools,
      toolAliases,
      sessionHooks: context.sessionHooksRegistry,
      sessionId: registerAgent(context, hookEvent, context.session.id),
    }),
  );
}
//@ chunk-wjj5jbkz.js:5145-5503 placement
function buildProjectTextHooks(toolInput, context) {
  if (
    getProjectsToolAliases(context).some(
      (tool) =>
        hasModuleHookingSite("tool.call", {
          tool,
        }) ||
        hasModuleHookingSite(
          "tool.check",
          {
            tool,
          },
          getLoadedModulesForSite("tool.check"),
        ),
    ) ||
    dispatchClassicEvent("PostToolBatch") ||
    hasSettingsHookForEvent(
      "PostToolBatch",
      context.sessionHooksRegistry,
      registerAgent(context, "PostToolBatch", context.session.id),
    ) ||
    hasProjectsToolHook("PostToolUse", toolInput, context)
  )
    return "hook";
  let hasPathRule = hasProjectsPathRule(context);
  if (hasProjectsToolHook("PreToolUse", toolInput, context))
    return hasPathRule || getProjectsToolAliases(context).length > 1 ? "hook" : "pre_tool_use_hook";
  return hasPathRule ? "path_rule" : undefined;
}
//@ chunk-wjj5jbkz.js:5503-5576 placement
/**
 * 把 pre_tool_use_hook 归一成 hook。
 */
function projectTextHooksKind(toolInput, context) {
  let projectTextHooks = buildProjectTextHooks(toolInput, context);
  return projectTextHooks === "pre_tool_use_hook" ? "hook" : projectTextHooks;
}
export {
  logProjectTextCutFailure,
  buildProjectTextHooks,
  shouldCutProjectTexts,
  formatLongLineNote,
  getProjectsToolAliases,
  projectTextHooksKind,
  cutProjectText,
};
