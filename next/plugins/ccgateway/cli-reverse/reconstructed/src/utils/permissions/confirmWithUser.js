/**
 * utils/permissions/confirmWithUser.ts
 *
 * 2.1.316 新增：confirmWithUser：工具在执行中经 AskUserQuestion 向用户确认（无人可问、超时、中止）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-evz6wa5s.js (8)
 * attribution: placement 8
 */
import { randomUUID } from "crypto";
import { getToolPermissionContext } from "./toolPermissionContext.js";
import { canPromptUserForPermission } from "./permissions.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { logError } from "../log.js";
import { shortHash } from "../shortHash.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { AskUserQuestionTool } from "../../tools/AskUserQuestionTool/AskUserQuestionTool.js";
import { transportStateByHost } from "../../cli/transportState.js";
import { createAssistantMessage } from "../messages.js";
import { clearToolUsePermissionState } from "../../components/permissions/hooks.js";
import { isSameDecision, isRequestFailedReason, isCanUseToolFailureReason } from "./decisionIdentity.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  record,
  stringSchema,
  unknown,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-evz6wa5s.js:754-773 placement
var CONFIRM = "confirm_";
//@ chunk-evz6wa5s.js:773-871 placement
/**
 * canPromptForConfirmation：可经 AskUserQuestion 向用户确认。
 */
function canPromptForConfirmation(toolUseContext) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  return (
    canPromptUserForPermission() &&
    toolPermissionContext.shouldAvoidPermissionPrompts !== true &&
    toolPermissionContext.mode !== "dontAsk"
  );
}
//@ chunk-evz6wa5s.js:871-1477 placement
/**
 * 用 AskUserQuestion 的形式向用户发问并返回选择（dontAsk、无人可问时直接返回）。
 */
async function confirmWithUser(request) {
  let { toolUseContext, source } = request;
  if (!canPromptForConfirmation(toolUseContext))
    return {
      kind: "unanswered",
      reason: "no_one_to_ask",
    };
  let outcome;
  try {
    outcome = await validateConfirmQuestion(request);
  } catch (error) {
    if (toolUseContext.abortController.signal.aborted) {
      logForDebugging(`confirmWithUser(${source}): ask aborted with the turn: ${errorMessage(error)}`);
      outcome = {
        kind: "aborted",
      };
    } else {
      logError(error);
      outcome = {
        kind: "unanswered",
        reason: "error",
      };
    }
  }
  let sourceFields = {
    source_hash: shortHash(source),
  };
  switch (outcome.kind) {
    case "chose":
    case "declined":
    case "aborted":
      logFeatureOk("permission_confirm_with_user", {
        ...sourceFields,
        answer: fromEnum(outcome.kind),
      });
      break;
    case "unanswered":
      if (outcome.reason === "error") logFeatureBad("permission_confirm_with_user", "error", sourceFields);
      else logFeatureSad("permission_confirm_with_user", outcome.reason, sourceFields);
      break;
  }
  return outcome;
}
//@ chunk-evz6wa5s.js:1477-2542 placement
async function validateConfirmQuestion({
  canUseTool,
  toolUseContext,
  source,
  header,
  question,
  choices,
  personOnly,
}) {
  let parsed = AskUserQuestionTool.inputSchema.safeParse({
    questions: [
      {
        question,
        header,
        options: choices.map(({ label, description }) => ({
          label,
          description: description ?? "",
        })),
        multiSelect: false,
      },
    ],
    metadata: {
      source,
    },
  });
  if (!parsed.success)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `confirmWithUser(${source}): the question does not satisfy the AskUserQuestion schema: ${parsed.error.message}`,
      "confirmWithUser: the question does not satisfy the AskUserQuestion schema",
    );
  let permission = await AskUserQuestionTool.checkPermissions(parsed.data, toolUseContext);
  if (permission.behavior !== "ask")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `confirmWithUser(${source}): AskUserQuestion.checkPermissions answered ${permission.behavior}, not ask`,
      "confirmWithUser: AskUserQuestion.checkPermissions did not answer ask",
    );
  let forcedDecision = {
    ...permission,
    forcedByCaller: true,
    ...(personOnly === true && {
      personOnly: true,
    }),
  };
  let toolUseId = `${CONFIRM}${randomUUID()}`;
  let active = transportStateByHost.of(toolUseContext.session).active;
  active?.watchConfirmAnswerEvent(toolUseId);
  let answerEventId;
  let decision = await canUseTool(
    AskUserQuestionTool,
    parsed.data,
    toolUseContext,
    createAssistantMessage({
      content: [],
    }),
    toolUseId,
    forcedDecision,
  ).finally(() => {
    clearToolUsePermissionState(toolUseContext.session, toolUseId);
    answerEventId = active?.takeConfirmAnswerEventId(toolUseId);
  });
  let described = describeConfirmOutcome(
    decision,
    forcedDecision,
    toolUseContext.abortController.signal,
    question,
    choices,
  );
  return described.kind === "chose" && answerEventId !== undefined
    ? {
        ...described,
        answerEventId,
      }
    : described;
}
//@ chunk-evz6wa5s.js:2542-3373 placement
function describeConfirmOutcome(decision, forcedDecision, signal, question, choices) {
  if (isSameDecision(decision, forcedDecision))
    return {
      kind: "unanswered",
      reason: "no_one_to_ask",
    };
  if (signal.aborted)
    return {
      kind: "aborted",
    };
  switch (decision.behavior) {
    case "allow": {
      let updatedInput = confirmUpdatedInputSchema().safeParse(decision.updatedInput);
      if (!updatedInput.success)
        return {
          kind: "unanswered",
          reason: "no_selection",
        };
      if (updatedInput.data.followUp === true)
        return {
          kind: "declined",
        };
      let answer = formatAnswerValue(updatedInput.data.answers?.[question]);
      if (answer === "")
        return {
          kind: "unanswered",
          reason: "no_selection",
        };
      let found = choices.find((choice) => collapseWhitespace(choice.label) === answer);
      return found !== undefined
        ? {
            kind: "chose",
            value: found.value,
          }
        : {
            kind: "declined",
            typedAnswer: answer,
          };
    }
    case "deny":
      if (decision.decisionReason.type === "other" && isRequestFailedReason(decision.decisionReason.reason))
        return {
          kind: "unanswered",
          reason: "host_closed",
        };
      if (
        decision.decisionReason.type === "asyncAgent" ||
        (decision.decisionReason.type === "other" &&
          isCanUseToolFailureReason(decision.decisionReason.reason))
      )
        return {
          kind: "unanswered",
          reason: "no_one_to_ask",
        };
      return {
        kind: "declined",
      };
    case "ask":
      return {
        kind: "declined",
      };
  }
}
//@ chunk-evz6wa5s.js:3373-3447 placement
var confirmUpdatedInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-evz6wa5s.js:3373", () => {
  confirmUpdatedInputSchema = DoctorLazy(() =>
    objectSchema({
      answers: record(stringSchema(), unknown()).optional(),
      followUp: booleanSchema().optional(),
    }),
  );
});
//@ chunk-evz6wa5s.js:3447-3581 placement
function formatAnswerValue(answer) {
  if (typeof answer === "string") return collapseWhitespace(answer);
  if (Array.isArray(answer))
    return collapseWhitespace(answer.filter((part) => typeof part === "string").join(", "));
  return "";
}
//@ chunk-evz6wa5s.js:3581-3631 placement
function collapseWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}
export { CONFIRM, confirmWithUser, canPromptForConfirmation };
