/**
 * utils/processUserInput/processTextPrompt.ts
 *
 * 普通文本提示转为用户消息（附件、图片、遥测）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/processUserInput/processTextPrompt.ts
 * pieces: chunk-xx1vmpsq.js (1)
 * attribution: fingerprint 1
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
} from "crypto";
import { kCe, Hwt, createUserMessage } from "../messages.js";
import { logSlashPromptEvent, cloneContent } from "../slashCommandParsing.js";
import { hasFrustrationLanguage } from "../../query/goalCheckIn.js";
import { matchesKeepGoingKeyword } from "../userPromptKeywords.js";
import { isPresencePing } from "../../query/presenceCheck.js";
import { getLastCancelledAPIMessageId, incrementPromptIndex } from "../../bootstrap/state.js";
import { promptTelemetryFields } from "../promptSource.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { getOriginKindLabel } from "../messages/promptOrigin.js";
import { dCt } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { ye } from "../startupMarks.js";
import { isGlimmeringFinchGateOn } from "../messages/untrustedArtifactContent.js";
import { Bbt, a3n, Z1t, TZ } from "../agentListing.js";
import { wrapNonUserMessage } from "../messages/nonUserMessages.js";

/**
 * processTextPrompt：普通文本提示转为用户消息并上报 tengu_input_prompt。
 */
//@ chunk-xx1vmpsq.js:36221-37461 fingerprint = processTextPrompt (0.523)
function processTextPrompt(e, s, n, y, r, w, T, C, I, M, R, E, A, v, U, Q, re, z) {
  let fe = typeof e === "string" ? e : e.find((block) => block.type === "text")?.text || "",
    ee = w || randomUUID_4(),
    Y = typeof e === "string" ? e : e.findLast((block) => block.type === "text")?.text || "",
    ue = kCe(e) ? void 0 : r;
  if (Y)
    logSlashPromptEvent({ text: Y, attributes: { ...(ue && { "prompt.id": ue }), "message.uuid": ee } }, U);
  let isNegative = hasFrustrationLanguage(fe),
    isKeepGoing = matchesKeepGoingKeyword(fe),
    Ve = isPresencePing(fe),
    nt = C ? null : getLastCancelledAPIMessageId(),
    Qe = C ? void 0 : incrementPromptIndex(),
    userMessage = promptTelemetryFields({
      wakeupSource: E,
      hostInitiator: A,
      artifactCommentTurn: v,
      inboundOrigin: Q,
    });
  logEvent("tengu_input_prompt", {
    is_negative: isNegative,
    is_keep_going: isKeepGoing,
    is_wakeup: Ve,
    ...!1,
    prompt_index: Qe,
    prompt_length: Y.length,
    ...(M && { prompt_source: fromEnum(M) }),
    ...(I && { effort_level: fromEnum(I) }),
    turn_origin: fromEnum(getOriginKindLabel(R)),
    ...userMessage,
    ...dCt(),
    ...(userMessage.artifact_comment_turn && ue && { turn_prompt_id: ye(ue) }),
    ...(nt && { interrupted_message_id: ye(nt) }),
  });
  let at = isGlimmeringFinchGateOn(),
    St = re === void 0 || !at ? void 0 : Bbt(re, z ?? []),
    jt = St === void 0 ? [] : [Hwt(createUserMessage(a3n(St)))],
    de = typeof e === "string" && re !== void 0 && !at ? Z1t(e, TZ(re, z ?? [])) : e,
    gt = de;
  if (s.length > 0)
    gt = [...(typeof de === "string" ? (de.trim() ? [{ type: "text", text: de }] : []) : de), ...s];
  let userMessage_2 = createUserMessage({
      content: gt,
      uuid: ee,
      imagePasteIds: n.length > 0 ? n : void 0,
      permissionMode: T,
      isMeta: C || void 0,
      promptSource: M,
      promptId: ue,
      origin: R,
    }),
    dt = cloneContent(gt);
  if (R) wrapNonUserMessage(userMessage_2, R);
  return {
    messages: [...jt, userMessage_2, ...y],
    shouldQuery: !0,
    promptRow: { message: userMessage_2, unframed: dt },
  };
}

export { processTextPrompt };
