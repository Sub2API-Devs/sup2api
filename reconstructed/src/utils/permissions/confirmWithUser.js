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
import { ebe } from "./permissions.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { logError } from "../log.js";
import { gn } from "../shortHash.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { AskUserQuestionTool } from "../../tools/AskUserQuestionTool/AskUserQuestionTool.js";
import { transportStateByHost } from "../../cli/transportState.js";
import { createAssistantMessage } from "../messages.js";
import { clearToolUsePermissionState } from "../../components/permissions/hooks.js";
import { isSameDecision, isRequestFailedReason, isCanUseToolFailureReason } from "./decisionIdentity.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, pe, o, oe, M } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-jns1cm6f.js:755-774 placement
var CONFIRM = "confirm_";
//@ chunk-jns1cm6f.js:774-872 placement
function oZe(e) {
  let r = getToolPermissionContext(e);
  return ebe() && r.shouldAvoidPermissionPrompts !== !0 && r.mode !== "dontAsk";
}
/**
 * 用 AskUserQuestion 的形式向用户发问并返回选择（dontAsk、无人可问时直接返回）。
 */
//@ chunk-jns1cm6f.js:872-1478 placement
async function confirmWithUser(e) {
  let { toolUseContext: toolUseContext, source: source } = e;
  if (!oZe(toolUseContext)) return { kind: "unanswered", reason: "no_one_to_ask" };
  let n;
  try {
    n = await validateConfirmQuestion(e);
  } catch (error) {
    if (toolUseContext.abortController.signal.aborted)
      (logForDebugging(`confirmWithUser(${source}): ask aborted with the turn: ${errorMessage(error)}`),
        (n = { kind: "aborted" }));
    else (logError(error), (n = { kind: "unanswered", reason: "error" }));
  }
  let a = { source_hash: gn(source) };
  switch (n.kind) {
    case "chose":
    case "declined":
    case "aborted":
      logFeatureOk("permission_confirm_with_user", { ...a, answer: fromEnum(n.kind) });
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
  canUseTool: canUseTool,
  toolUseContext: toolUseContext,
  source: source,
  header: header,
  question: question,
  choices: choices,
  personOnly: personOnly,
}) {
  let safeParse = AskUserQuestionTool.inputSchema.safeParse({
    questions: [
      {
        question: question,
        header: header,
        options: choices.map(({ label: label, description: description }) => ({
          label: label,
          description: description ?? "",
        })),
        multiSelect: !1,
      },
    ],
    metadata: { source: source },
  });
  if (!safeParse.success)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `confirmWithUser(${source}): the question does not satisfy the AskUserQuestion schema: ${safeParse.error.message}`,
      "confirmWithUser: the question does not satisfy the AskUserQuestion schema",
    );
  let checkPermissions = await AskUserQuestionTool.checkPermissions(safeParse.data, toolUseContext);
  if (checkPermissions.behavior !== "ask")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `confirmWithUser(${source}): AskUserQuestion.checkPermissions answered ${checkPermissions.behavior}, not ask`,
      "confirmWithUser: AskUserQuestion.checkPermissions did not answer ask",
    );
  let A = { ...checkPermissions, forcedByCaller: !0, ...(personOnly === !0 && { personOnly: !0 }) },
    w = `${CONFIRM}${randomUUID()}`,
    active = transportStateByHost.of(toolUseContext.session).active;
  active?.watchConfirmAnswerEvent(w);
  let _,
    b = await canUseTool(
      AskUserQuestionTool,
      safeParse.data,
      toolUseContext,
      createAssistantMessage({ content: [] }),
      w,
      A,
    ).finally(() => {
      (clearToolUsePermissionState(toolUseContext.session, w), (_ = active?.takeConfirmAnswerEventId(w)));
    }),
    y = describeConfirmOutcome(b, A, toolUseContext.abortController.signal, question, choices);
  return y.kind === "chose" && _ !== void 0 ? { ...y, answerEventId: _ } : y;
}
//@ chunk-jns1cm6f.js:2546-3377 placement
function describeConfirmOutcome(e, r, i, n, a) {
  if (isSameDecision(e, r)) return { kind: "unanswered", reason: "no_one_to_ask" };
  if (i.aborted) return { kind: "aborted" };
  switch (e.behavior) {
    case "allow": {
      let safeParse = E().safeParse(e.updatedInput);
      if (!safeParse.success) return { kind: "unanswered", reason: "no_selection" };
      if (safeParse.data.followUp === !0) return { kind: "declined" };
      let k = formatAnswerValue(safeParse.data.answers?.[n]);
      if (k === "") return { kind: "unanswered", reason: "no_selection" };
      let found = a.find((U) => W(U.label) === k);
      return found !== void 0 ? { kind: "chose", value: found.value } : { kind: "declined", typedAnswer: k };
    }
    case "deny":
      if (e.decisionReason.type === "other" && isRequestFailedReason(e.decisionReason.reason))
        return { kind: "unanswered", reason: "host_closed" };
      if (
        e.decisionReason.type === "asyncAgent" ||
        (e.decisionReason.type === "other" && isCanUseToolFailureReason(e.decisionReason.reason))
      )
        return { kind: "unanswered", reason: "no_one_to_ask" };
      return { kind: "declined" };
    case "ask":
      return { kind: "declined" };
  }
}
//@ chunk-jns1cm6f.js:3377-3451 placement
var E = DoctorLazy(() => u({ answers: pe(o(), oe()).optional(), followUp: M().optional() }));
//@ chunk-jns1cm6f.js:3451-3585 placement
function formatAnswerValue(e) {
  if (typeof e === "string") return W(e);
  if (Array.isArray(e)) return W(e.filter((r) => typeof r === "string").join(", "));
  return "";
}
//@ chunk-jns1cm6f.js:3585-3635 placement
function W(e) {
  return e.replace(/\s+/g, " ").trim();
}

export { confirmWithUser, oZe, CONFIRM };
