/**
 * services/projectTexts.ts
 *
 * 2.1.316 新增：Projects 文本附件的截断与分页提示（local_file 读取方式说明、只读）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dtckr4w3.js (14)
 * attribution: placement 14
 */
import { toolMatchesName } from "../Tool.js";
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";
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
import { getDenyRules, getAskRules, toolMatchesRule } from "../utils/permissions/permissions.js";
import { hasToolHookMatching, hasSettingsHookForEvent } from "../utils/hooks.js";
import { registerAgent } from "../utils/telemetry/perfettoTracing.js";
import {
  hasModuleHookingSite,
  getLoadedModulesForSite,
} from "../plugins/hooksModules/loadedModuleFilters.js";
import { dispatchClassicEvent } from "../plugins/functionHooks/modAdmission.js";

//@ chunk-dtckr4w3.js:808-868 placement
var TENGU_BREEZY_PELICAN = "tengu_breezy_pelican",
  T = 0.16666666666666666,
  k = 200000;
/**
 * 说明某行过长时如何用 grep/offset 读取 local_file。
 */
//@ chunk-dtckr4w3.js:868-2511 placement
function formatLongLineNote(o, e) {
  let t = (r) => o.some((a) => toolMatchesName(a, r));
  if (!t(FILE_READ_TOOL_NAME) || !t(BASH_TOOL_NAME)) return;
  let n = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BREEZY_PELICAN, null);
  if (n?.copy_hint !== !0 || (e && (n.long_lines !== !0 || !t(GREP_TOOL_NAME)))) return;
  let s = t(GREP_TOOL_NAME) ? GREP_TOOL_NAME : "`grep`";
  return `local_file is for reading only${e ? `. One of its lines is too long for ${FILE_READ_TOOL_NAME} to page through, because ${FILE_READ_TOOL_NAME}'s offset and limit count lines. ${FILE_READ_TOOL_NAME} with no offset or limit gives only the first part of the file. ${FILE_READ_TOOL_NAME} with an offset and limit gives whole lines, or an error if those lines do not fit. The file is too large for project_read to return inline. ${GREP_TOOL_NAME} shows a line or a match of over 500 characters as [Omitted long matching line]. With output_mode \`content\`, \`-o\` true and a pattern such as \`.{0,200}term.{0,200}\`, ${GREP_TOOL_NAME} shows each match of term with up to 200 characters on each side. In ${BASH_TOOL_NAME}, \`grep -ob 'term' /path/of/local_file | head\` gives the byte offset of each match of term, counted from 0. \`tail -c +START /path/of/local_file | head -c 20000\` gives 20000 bytes from byte START, counted from 1: START is an offset plus 1, or any number from 1 to size_bytes.` : `: read the parts you need with ${FILE_READ_TOOL_NAME}'s offset and limit, or search it with ${s}.`} Edits to ${e ? "local_file" : "it"} never reach the project, and project_write rejects it as local_path. To change the document or make a file from it, run \`cat /path/of/local_file > new-name\` in the working directory, where new-name is a name that no file there has, and work on that file. To save a change, call project_write with the document's path and that file as local_path. If the document is an upload such as a PDF, that saves a new text document and leaves the upload as it is.`;
}
//@ chunk-dtckr4w3.js:2511-3101 placement
function shouldCutProjectTexts({
  model: model,
  configuredWindow: configuredWindow,
  messages: messages,
  room: room,
}) {
  let s = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BREEZY_PELICAN, null);
  if (s?.mode !== "always" && s?.mode !== "after_compaction") return;
  let i = getModelContextInfo(model),
    r = getAutoCompactThresholdTokens(i, configuredWindow);
  if (!(r > 0)) return;
  if (r > k) {
    let step_share = s.step_share;
    if (room === void 0 || !(typeof step_share === "number" && step_share > 0 && step_share <= 1)) return;
    let u = i.longContextWindowWithoutOptIn > 0 ? r : Math.min(r, room.threshold);
    return {
      maxTokens: Math.max(0, Math.floor(u * step_share) - room.claimed()),
      bytesPerToken: i.bytesPerToken,
      claim: room.claim,
    };
  }
  if (s.mode === "after_compaction" && !hasNoUserPromptSinceCompact(messages)) return;
  let { fraction: fraction } = s;
  return {
    maxTokens: Math.round(r * (typeof fraction === "number" && fraction > 0 && fraction <= 1 ? fraction : T)),
    bytesPerToken: i.bytesPerToken,
  };
}
//@ chunk-dtckr4w3.js:3101-3140 placement
var TENGU_IMPERATIVE_WHISTLE = "tengu_imperative_whistle",
  h = 200;
//@ chunk-dtckr4w3.js:3140-3417 placement
function formatTruncatedTextNote(o, e) {
  return `

[Only the first ${o} of ${e} bytes of this text are shown. To see the rest, call \`project_info\`: it can give a file that holds all of this text. \`project_search\` does not search it. Read or search only the parts of that file that the task needs.]`;
}
//@ chunk-dtckr4w3.js:3417-3983 placement
function cutProjectText(o, e, t) {
  let n = getModelContextInfo(e),
    s = getAutoCompactThresholdTokens(n, t);
  if (!(s > 0) || s > k || !isAutoCompactEnabled()) return;
  let i = Math.round(s * T) * n.bytesPerToken,
    r = o.description ?? "",
    a = o.prompt_template ?? "",
    byteLength = Buffer.byteLength(a, "utf8");
  if (Buffer.byteLength(o.name, "utf8") + Buffer.byteLength(r, "utf8") + byteLength <= i) return;
  if (!getFeatureValue_SESSION_PINNED(TENGU_IMPERATIVE_WHISTLE, !1)) {
    logFeatureSad("projects_texts_cut", "sent_whole");
    return;
  }
  let u = Buffer.byteLength(o.name, "utf8") <= h ? o.name : `${truncateUtf8Bytes(o.name, h - 3)}\u2026`,
    m = i - Buffer.byteLength(u, "utf8"),
    p = truncateUtf8WithNote(r, Math.max(Math.floor(m / 4), m - byteLength));
  return (
    logFeatureOk("projects_texts_cut"),
    { name: u, description: p, prompt_template: truncateUtf8WithNote(a, m - Buffer.byteLength(p, "utf8")) }
  );
}
//@ chunk-dtckr4w3.js:3983-4400 placement
function logProjectTextCutFailure(o, e) {
  try {
    let t =
        o.attachedProject === void 0 ? void 0 : builtProjectBlocks.peek(e.session)?.get(o.attachedProject),
      { mainLoopModel: mainLoopModel } = e.options;
    if (t === void 0 || mainLoopModel === void 0) return o;
    let [s, ...i] = t,
      r = cutProjectText(
        s,
        getMainLoopModel({ options: { mainLoopModel: mainLoopModel }, permissionLayers: e.permissionLayers }),
        e.options.autoCompactWindow,
      );
    return r === void 0 ? o : { ...o, attachedProject: formatProjectContext({ ...s, ...r }, ...i) };
  } catch (error) {
    return (logError(withTelemetryMessage(toError(error), "project texts could not be cut")), o);
  }
}
//@ chunk-dtckr4w3.js:4400-4556 placement
function truncateUtf8WithNote(o, e) {
  let byteLength = Buffer.byteLength(o, "utf8");
  if (byteLength <= e) return o;
  let n = truncateUtf8Bytes(o, e - Buffer.byteLength(formatTruncatedTextNote(e, byteLength), "utf8"));
  return n + formatTruncatedTextNote(Buffer.byteLength(n, "utf8"), byteLength);
}
//@ chunk-dtckr4w3.js:4556-4620 placement
function w(o) {
  return [o.toolAliases, o.permissions().toolAliases];
}
/**
 * 列出 Projects 工具的所有名称：本身、工具别名表里与它互为别名的名字，以及这些别名的别名。
 */
//@ chunk-dtckr4w3.js:4620-4801 placement
function getProjectsToolAliases(o) {
  let flattened = w(o).flatMap((n) => Object.entries(n ?? {})),
    flattened_2 = flattened.flatMap(([n, s]) => [
      ...(s === PROJECTS_TOOL_NAME ? [n] : []),
      ...(n === PROJECTS_TOOL_NAME ? [s] : []),
    ]);
  return [
    PROJECTS_TOOL_NAME,
    ...flattened_2,
    ...flattened.flatMap(([n, s]) => (flattened_2.includes(s) ? [n] : [])),
  ];
}
//@ chunk-dtckr4w3.js:4801-4966 placement
function hasProjectsPathRule(o) {
  let permissions = o.permissions(),
    t = getProjectsToolAliases(o);
  return [...getDenyRules(permissions), ...getAskRules(permissions)].some(
    (n) =>
      firstLineOf(n.ruleValue.ruleContent ?? "", ":").trim() === "path" &&
      t.some((s) => toolMatchesRule(permissions, { name: s }, n)),
  );
}
//@ chunk-dtckr4w3.js:4966-5145 placement
function hasProjectsToolHook(o, e, t) {
  return w(t).some((n) =>
    hasToolHookMatching({
      hookEvent: o,
      toolName: PROJECTS_TOOL_NAME,
      toolInput: e,
      tools: t.tools,
      toolAliases: n,
      sessionHooks: t.sessionHooksRegistry,
      sessionId: registerAgent(t, o, t.session.id),
    }),
  );
}
//@ chunk-dtckr4w3.js:5145-5503 placement
function buildProjectTextHooks(o, e) {
  if (
    getProjectsToolAliases(e).some(
      (n) =>
        hasModuleHookingSite("tool.call", { tool: n }) ||
        hasModuleHookingSite("tool.check", { tool: n }, getLoadedModulesForSite("tool.check")),
    ) ||
    dispatchClassicEvent("PostToolBatch") ||
    hasSettingsHookForEvent(
      "PostToolBatch",
      e.sessionHooksRegistry,
      registerAgent(e, "PostToolBatch", e.session.id),
    ) ||
    hasProjectsToolHook("PostToolUse", o, e)
  )
    return "hook";
  let t = hasProjectsPathRule(e);
  if (hasProjectsToolHook("PreToolUse", o, e))
    return t || getProjectsToolAliases(e).length > 1 ? "hook" : "pre_tool_use_hook";
  return t ? "path_rule" : void 0;
}
//@ chunk-dtckr4w3.js:5503-5576 placement
function CHs(o, e) {
  let t = buildProjectTextHooks(o, e);
  return t === "pre_tool_use_hook" ? "hook" : t;
}

export {
  shouldCutProjectTexts,
  formatLongLineNote,
  getProjectsToolAliases,
  CHs,
  cutProjectText,
  logProjectTextCutFailure,
  buildProjectTextHooks,
};
