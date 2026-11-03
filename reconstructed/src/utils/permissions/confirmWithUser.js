/**
 * utils/permissions/confirmWithUser.ts
 *
 * 2.1.316 新增：confirmWithUser：工具在执行中经 AskUserQuestion 向用户确认（无人可问、超时、中止）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jns1cm6f.js (8)
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
import { u, record, string, unknown, M } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-jns1cm6f.js:755-774 placement
var CONFIRM = "confirm_";
//@ chunk-jns1cm6f.js:774-872 placement
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
//@ chunk-jns1cm6f.js:872-1478 placement
/**
 * 用 AskUserQuestion 的形式向用户发问并返回选择（dontAsk、无人可问时直接返回）。
 */
async function confirmWithUser(e) {
  let { toolUseContext, source } = e;
  if (!canPromptForConfirmation(toolUseContext))
    return {
      kind: "unanswered",
      reason: "no_one_to_ask",
    };
  let n;
  try {
    n = await validateConfirmQuestion(e);
  } catch (error) {
    if (toolUseContext.abortController.signal.aborted) {
      logForDebugging(`confirmWithUser(${source}): ask aborted with the turn: ${errorMessage(error)}`);
      n = {
        kind: "aborted",
      };
    } else {
      logError(error);
      n = {
        kind: "unanswered",
        reason: "error",
      };
    }
  }
  let a = {
    source_hash: shortHash(source),
  };
  switch (n.kind) {
    case "chose":
    case "declined":
    case "aborted":
      logFeatureOk("permission_confirm_with_user", {
        ...a,
        answer: fromEnum(n.kind),
      });
      break;
    case "unanswered":
      if (n.reason === "error") logFeatureBad("permission_confirm_with_user", "error", a);
      else logFeatureSad("permission_confirm_with_user", n.reason, a);
      break;
  }
  return n;
}
//@ chunk-jns1cm6f.js:1478-2546 placement
async function validateConfirmQuestion({
  canUseTool,
  toolUseContext,
  source,
  header,
  question,
  choices,
  personOnly,
}) {
  let h = AskUserQuestionTool.inputSchema.safeParse({
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
  if (!h.success)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `confirmWithUser(${source}): the question does not satisfy the AskUserQuestion schema: ${h.error.message}`,
      "confirmWithUser: the question does not satisfy the AskUserQuestion schema",
    );
  let U = await AskUserQuestionTool.checkPermissions(h.data, toolUseContext);
  if (U.behavior !== "ask")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `confirmWithUser(${source}): AskUserQuestion.checkPermissions answered ${U.behavior}, not ask`,
      "confirmWithUser: AskUserQuestion.checkPermissions did not answer ask",
    );
  let A = {
    ...U,
    forcedByCaller: true,
    ...(personOnly === true && {
      personOnly: true,
    }),
  };
  let w = `${CONFIRM}${randomUUID()}`;
  let active = transportStateByHost.of(toolUseContext.session).active;
  active?.watchConfirmAnswerEvent(w);
  let _;
  let b = await canUseTool(
    AskUserQuestionTool,
    h.data,
    toolUseContext,
    createAssistantMessage({
      content: [],
    }),
    w,
    A,
  ).finally(() => {
    clearToolUsePermissionState(toolUseContext.session, w);
    _ = active?.takeConfirmAnswerEventId(w);
  });
  let y = describeConfirmOutcome(b, A, toolUseContext.abortController.signal, question, choices);
  return y.kind === "chose" && _ !== undefined
    ? {
        ...y,
        answerEventId: _,
      }
    : y;
}
//@ chunk-jns1cm6f.js:2546-3377 placement
function describeConfirmOutcome(e, r, signal, question, choices) {
  if (isSameDecision(e, r))
    return {
      kind: "unanswered",
      reason: "no_one_to_ask",
    };
  if (signal.aborted)
    return {
      kind: "aborted",
    };
  switch (e.behavior) {
    case "allow": {
      let s = confirmUpdatedInputSchema().safeParse(e.updatedInput);
      if (!s.success)
        return {
          kind: "unanswered",
          reason: "no_selection",
        };
      if (s.data.followUp === true)
        return {
          kind: "declined",
        };
      let k = formatAnswerValue(s.data.answers?.[question]);
      if (k === "")
        return {
          kind: "unanswered",
          reason: "no_selection",
        };
      let found = choices.find((U) => collapseWhitespace(U.label) === k);
      return found !== undefined
        ? {
            kind: "chose",
            value: found.value,
          }
        : {
            kind: "declined",
            typedAnswer: k,
          };
    }
    case "deny":
      if (e.decisionReason.type === "other" && isRequestFailedReason(e.decisionReason.reason))
        return {
          kind: "unanswered",
          reason: "host_closed",
        };
      if (
        e.decisionReason.type === "asyncAgent" ||
        (e.decisionReason.type === "other" && isCanUseToolFailureReason(e.decisionReason.reason))
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
//@ chunk-jns1cm6f.js:3377-3451 placement
var confirmUpdatedInputSchema = DoctorLazy(() =>
  u({
    answers: record(string(), unknown()).optional(),
    followUp: M().optional(),
  }),
);
//@ chunk-jns1cm6f.js:3451-3585 placement
function formatAnswerValue(e) {
  if (typeof e === "string") return collapseWhitespace(e);
  if (Array.isArray(e)) return collapseWhitespace(e.filter((r) => typeof r === "string").join(", "));
  return "";
}
//@ chunk-jns1cm6f.js:3585-3635 placement
function collapseWhitespace(e) {
  return e.replace(/\s+/g, " ").trim();
}
export { confirmWithUser, canPromptForConfirmation, CONFIRM };
