/**
 * services/plugins/devMods/devModsConsent.ts
 *
 * 2.1.316 新增：请求开启 dev mods 的同意
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c3nwd9gm.js (12)
 * attribution: placement 8, sole-consumer 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import {
  DEV_MODS_CONSENT_QUESTION,
  devModsExplainerLines,
  MODS_DIALOG_TITLE,
  DEV_MODS_CONSENT_OPTIONS,
  devModsConsentQuestionFor,
  consentOutcomeToChoice,
} from "./DevModsConsentDialog.js";
import { createAssistantMessage, createUserMessage } from "../../../utils/messages.js";
import { ASKUSERQUESTION } from "../../../tools/AskUserQuestionTool/prompt.js";
import { AskUserQuestionTool } from "../../../tools/AskUserQuestionTool/AskUserQuestionTool.js";
import { currentSurfaceBinding } from "../../../plugins/functionHooks/surfaceBinding.js";
import { uiLog } from "../../../plugins/functionHooks/hooksWorkerClient.js";
import { MODS } from "../../../plugins/functionHooks/devModsNotices.js";
import { logFeatureSad, logFeatureOk } from "../../analytics/featureTelemetry.js";
import { logError } from "../../../utils/log.js";
import { TURN_STATE_PROBE } from "../../../plugins/functionHooks/devModsWatch.js";
import { confirmWithUser, canPromptForConfirmation } from "../../../utils/permissions/confirmWithUser.js";
import { lit, fromEnum } from "../../analytics/safeMetadata.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";
import { devModsDir } from "../../../plugins/functionHooks/devModsName.js";

//@ chunk-c3nwd9gm.js:2654-2679 placement
var MOD_HOT_RELOAD = "mod_hot_reload";
//@ chunk-c3nwd9gm.js:2679-2708 placement
/**
 * 拼出完整的同意询问文本。
 */
var consentQuestionText = (options) => `${DEV_MODS_CONSENT_QUESTION}

${devModsExplainerLines(options)}`;
//@ chunk-c3nwd9gm.js:2708-3126 sole-consumer
function buildConsentDisplayRows(toolUseId, answerText) {
  let questions = [
    {
      question: DEV_MODS_CONSENT_QUESTION,
      header: MODS_DIALOG_TITLE,
      options: DEV_MODS_CONSENT_OPTIONS.filter((option) => option.value !== "explain").map((option) => ({
        label: option.label,
        description: "",
      })),
      multiSelect: false,
    },
  ];
  let toolUseResult = {
    questions,
    answers: {
      [DEV_MODS_CONSENT_QUESTION]: answerText,
    },
  };
  let assistantMessage = createAssistantMessage({
    content: [
      {
        type: "tool_use",
        id: toolUseId,
        name: ASKUSERQUESTION,
        input: {
          questions,
        },
      },
    ],
    isVirtual: true,
  });
  let userMessage = createUserMessage({
    content: [AskUserQuestionTool.mapToolResultToToolResultBlockParam(toolUseResult, toolUseId)],
    toolUseResult,
    isVirtual: true,
  });
  return [
    {
      ...assistantMessage,
      message: {
        ...assistantMessage.message,
        stop_reason: "tool_use",
      },
    },
    userMessage,
  ];
}
//@ chunk-c3nwd9gm.js:3138-3162 sole-consumer
var NOT_TURNED_ON_TEXT = "Not turned on.";
//@ chunk-c3nwd9gm.js:3162-3455 sole-consumer
function reportConsentOutcome(outcome, toolUseId) {
  safeUiLog(() => {
    let binding = currentSurfaceBinding();
    let label =
      outcome.kind === "chose"
        ? DEV_MODS_CONSENT_OPTIONS.find((option) => option.value === outcome.value)?.label
        : undefined;
    let answerText = outcome.kind === "declined" ? outcome.typedAnswer : label;
    if (answerText !== undefined) binding?.sendDisplayRows?.(buildConsentDisplayRows(toolUseId, answerText));
    if (label !== undefined && binding?.surface === "terminal")
      uiLog(MODS, `${DEV_MODS_CONSENT_QUESTION} \u2192 ${label}`);
  });
  if (outcome.kind === "declined") safeUiLog(() => uiLog(MODS, NOT_TURNED_ON_TEXT));
}
//@ chunk-c3nwd9gm.js:3455-3533 sole-consumer
function safeUiLog(show) {
  try {
    show();
  } catch (error) {
    logFeatureSad("plugin_dev_mods", "answer_not_shown");
    logError(error);
  }
}
//@ chunk-c3nwd9gm.js:3533-3542 placement
/**
 * 最多询问次数（3）。
 */
var MAX_CONSENT_ASKS = 3;
//@ chunk-c3nwd9gm.js:3542-4082 placement
/**
 * 询问用户是否开启本会话中 Claude 写的 mod（本轮结束时或立即），返回用户的选择。
 */
async function askDevModsConsent(binding, attempt) {
  let loadTiming = TURN_STATE_PROBE.isRunning() ? "turn-end" : "now";
  let question = attempt === 0 ? devModsConsentQuestionFor(loadTiming) : consentQuestionText(loadTiming);
  let toolUseIdRef = {
    id: "",
  };
  let outcome = await confirmWithUser({
    canUseTool: (...args) => {
      toolUseIdRef.id = args[4];
      return binding.binding.canUseTool(...args);
    },
    toolUseContext: binding.binding.toolContext(binding.abortController),
    source: MOD_HOT_RELOAD,
    header: MODS_DIALOG_TITLE,
    question,
    choices: DEV_MODS_CONSENT_OPTIONS,
    personOnly: true,
  });
  let choice = consentOutcomeToChoice(outcome);
  let hasTypedAnswer =
    outcome.kind === "declined" &&
    outcome.typedAnswer !== undefined &&
    !/^\[.*\]$/u.test(outcome.typedAnswer);
  if (choice !== "explain" && !hasTypedAnswer) {
    reportConsentOutcome(outcome, toolUseIdRef.id);
    return choice;
  }
  if (choice === "explain")
    logFeatureOk("plugin_dev_mods", {
      answer: lit("explain"),
    });
  if (attempt < MAX_CONSENT_ASKS) return askDevModsConsent(binding, attempt + 1);
  reportConsentOutcome(
    hasTypedAnswer
      ? outcome
      : {
          kind: "declined",
        },
    toolUseIdRef.id,
  );
  return "decline";
}
//@ chunk-c3nwd9gm.js:4082-4166 placement
/**
 * 结果原因映射。
 */
var OUTCOME_REASON_MAP = {
  no_one_to_ask: "no_one_to_ask",
  closed: "host_closed",
  unpicked: "no_selection",
};
//@ chunk-c3nwd9gm.js:4166-4596 placement
async function requestDevModsConsent(folder, signal) {
  let binding = currentSurfaceBinding();
  if (binding === undefined) {
    logFeatureSad("plugin_dev_mods", "no_session");
    return "no_one_to_ask";
  }
  let abortController = new AbortController();
  signal?.addEventListener("abort", () => abortController.abort(), {
    once: true,
  });
  try {
    let outcome = await askDevModsConsent(
      {
        binding,
        folder,
        abortController,
      },
      0,
    );
    let reasonCode = OUTCOME_REASON_MAP[outcome];
    if (reasonCode === undefined)
      logFeatureOk("plugin_dev_mods", {
        answer: fromEnum(outcome),
      });
    else logFeatureSad("plugin_dev_mods", reasonCode);
    return outcome;
  } catch (error) {
    logForDebugging(`dev mods: the ask failed, asked again later: ${errorMessage(error)}`, {
      level: "error",
    });
    return "retry";
  }
}
//@ chunk-c3nwd9gm.js:4596-4779 placement
function canAskForConsent() {
  let binding = currentSurfaceBinding();
  if (binding === undefined) return true;
  try {
    return canPromptForConfirmation(binding.toolContext(new AbortController()));
  } catch (error) {
    logForDebugging(`dev mods: no context to ask in yet: ${errorMessage(error)}`, {
      level: "error",
    });
    return true;
  }
}
//@ chunk-c3nwd9gm.js:4808-4831 placement
var devModsFolderFor = (sessionId) => join(devModsDir(), sessionId);
export { canAskForConsent, requestDevModsConsent, devModsFolderFor, MOD_HOT_RELOAD };
