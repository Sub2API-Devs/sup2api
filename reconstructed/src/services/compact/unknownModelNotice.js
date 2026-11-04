/**
 * services/compact/unknownModelNotice.ts
 *
 * 2.1.316 新增：未知模型（不在目录中）时上下文窗口假设的提示（[1m]、CLAUDE_CODE_MAX_CONTEXT_TOKENS）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ck9j9jgt.js (4)
 * attribution: placement 4
 */
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { getAutoCompactWindow } from "./autoCompact.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { isCompactDisabledOrCustom, is1mContextDisabled } from "../../utils/model/contextWindow1m.js";
import { env } from "../../utils/env.js";
import { displayModelName } from "../../utils/model/validateModel.js";
import { formatTokens } from "../../utils/format.js";

//@ chunk-ck9j9jgt.js:452-572 placement
/**
 * 模型配置文档链接。
 */
var MODEL_CONFIG_DOCS_URL = "https://code.claude.com/docs/en/model-config";
var MODEL_WINDOW_DOCS_URL = `${MODEL_CONFIG_DOCS_URL}#correct-the-window-for-a-gateway-or-custom-model-id`;
//@ chunk-ck9j9jgt.js:572-693 placement
/**
 * 记录未知模型提示；无头模式直接输出，交互模式返回提示。
 */
function emitUnknownModelNotice(unknownModelNotice, mode) {
  logForDebugging(`[autocompact] ${unknownModelNotice.detail}`, {
    level: "warn",
  });
  if (mode.interactive) return unknownModelNotice;
  mode.headless(unknownModelNotice.text);
  return null;
}
//@ chunk-ck9j9jgt.js:693-797 placement
function buildUnknownModelNotice(model, autoCompactWindow, info) {
  try {
    return buildUnknownModelNoticeText(model, autoCompactWindow, info);
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "unknown-model notice failed"));
    return null;
  }
}
//@ chunk-ck9j9jgt.js:797-1801 placement
/**
 * 模型不在目录中时，说明假设的上下文窗口与如何修正（[1m] 或 CLAUDE_CODE_MAX_CONTEXT_TOKENS）。
 */
function buildUnknownModelNoticeText(model, autoCompactWindow, facts) {
  let { source, window: contextWindow } = getAutoCompactWindow(
    getModelContextInfo(model, facts),
    autoCompactWindow,
    facts,
  );
  if (source !== "unknown-model") return null;
  let compactDisabled = isCompactDisabledOrCustom(model);
  let CLAUDE_CODE_MAX_CONTEXT_TOKENS = env.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
  if (compactDisabled && CLAUDE_CODE_MAX_CONTEXT_TOKENS !== undefined && CLAUDE_CODE_MAX_CONTEXT_TOKENS > 0)
    return null;
  let belowOneMillion = contextWindow < 1e6;
  let hints = [];
  if (!is1mContextDisabled() && belowOneMillion) hints.push("append [1m] to the model name for 1M");
  if (compactDisabled) hints.push("set CLAUDE_CODE_MAX_CONTEXT_TOKENS to its real window");
  let hintSuffix =
    hints.length > 0
      ? `; if the model accepts ${belowOneMillion ? "more" : "less"}, ${hints.join(", or ")}`
      : "";
  return {
    model,
    window: contextWindow,
    text: `Claude Code doesn't recognize the model "${displayModelName(model)}", so it assumes a context window of ${formatTokens(contextWindow)} tokens. Update Claude Code, or see ${MODEL_WINDOW_DOCS_URL} to set the window.`,
    detail: `"${model}" isn't described by this version's model catalog; update Claude Code, or map it with behavesAs on a modelPicker row (or modelOverrides, if it is a provider id of a model this version knows). Until then auto-compact keeps this session within ${formatTokens(contextWindow)} tokens (the context window it assumes)${hintSuffix}; CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT=1 restores the previous wait-for-the-API behavior.`,
  };
}
export { MODEL_WINDOW_DOCS_URL, MODEL_CONFIG_DOCS_URL, buildUnknownModelNotice, emitUnknownModelNotice };
