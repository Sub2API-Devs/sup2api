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
import { randomUUID } from "crypto";
import { hasToolResultBlock, markToolSummaryMessage, createUserMessage } from "../messages.js";
import { logSlashPromptEvent, cloneContent } from "../slashCommandParsing.js";
import { hasFrustrationLanguage } from "../../query/goalCheckIn.js";
import { matchesKeepGoingKeyword } from "../userPromptKeywords.js";
import { isPresencePing } from "../../query/presenceCheck.js";
import { getLastCancelledAPIMessageId, incrementPromptIndex } from "../../bootstrap/state.js";
import { promptTelemetryFields } from "../promptSource.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { getOriginKindLabel } from "../messages/promptOrigin.js";
import { emptyObjectFactory } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { sanitizeMarkName } from "../startupMarks.js";
import { isGlimmeringFinchGateOn } from "../messages/untrustedArtifactContent.js";
import {
  unreadableToolsUsed,
  summaryCompanionMessage,
  joinWithNewlineIfAny,
  unreadableToolsLine,
} from "../agentListing.js";
import { wrapNonUserMessage } from "../messages/nonUserMessages.js";

//@ chunk-xx1vmpsq.js:36221-37461 fingerprint = processTextPrompt (0.523)
/**
 * processTextPrompt：普通文本提示转为用户消息并上报 tengu_input_prompt。
 */
function processTextPrompt(
  e,
  imageContentBlocks,
  imagePasteIds,
  attachmentMessages,
  r,
  w,
  permissionMode,
  C,
  effortLevelIfSupported,
  M,
  R,
  wakeupSource,
  hostInitiator,
  artifactCommentTurn,
  U,
  inboundOrigin,
  re,
  z,
) {
  let userPromptText = typeof e === "string" ? e : e.find((block) => block.type === "text")?.text || "";
  let ee = w || randomUUID();
  let Y = typeof e === "string" ? e : e.findLast((block) => block.type === "text")?.text || "";
  let ue = hasToolResultBlock(e) ? undefined : r;
  if (Y)
    logSlashPromptEvent(
      {
        text: Y,
        attributes: {
          ...(ue && {
            "prompt.id": ue,
          }),
          "message.uuid": ee,
        },
      },
      U,
    );
  let isNegative = hasFrustrationLanguage(userPromptText);
  let isKeepGoing = matchesKeepGoingKeyword(userPromptText);
  let isWakeup = isPresencePing(userPromptText);
  let nt = C ? null : getLastCancelledAPIMessageId();
  let promptIndex = C ? undefined : incrementPromptIndex();
  let userMessage = promptTelemetryFields({
    wakeupSource,
    hostInitiator,
    artifactCommentTurn,
    inboundOrigin,
  });
  logEvent("tengu_input_prompt", {
    is_negative: isNegative,
    is_keep_going: isKeepGoing,
    is_wakeup: isWakeup,
    ...false,
    prompt_index: promptIndex,
    prompt_length: Y.length,
    ...(M && {
      prompt_source: fromEnum(M),
    }),
    ...(effortLevelIfSupported && {
      effort_level: fromEnum(effortLevelIfSupported),
    }),
    turn_origin: fromEnum(getOriginKindLabel(R)),
    ...userMessage,
    ...emptyObjectFactory(),
    ...(userMessage.artifact_comment_turn &&
      ue && {
        turn_prompt_id: sanitizeMarkName(ue),
      }),
    ...(nt && {
      interrupted_message_id: sanitizeMarkName(nt),
    }),
  });
  let at = isGlimmeringFinchGateOn();
  let St = re === undefined || !at ? undefined : unreadableToolsUsed(re, z ?? []);
  let jt = St === undefined ? [] : [markToolSummaryMessage(createUserMessage(summaryCompanionMessage(St)))];
  let de =
    typeof e === "string" && re !== undefined && !at
      ? joinWithNewlineIfAny(e, unreadableToolsLine(re, z ?? []))
      : e;
  let gt = de;
  if (imageContentBlocks.length > 0)
    gt = [
      ...(typeof de === "string"
        ? de.trim()
          ? [
              {
                type: "text",
                text: de,
              },
            ]
          : []
        : de),
      ...imageContentBlocks,
    ];
  let userMessage_2 = createUserMessage({
    content: gt,
    uuid: ee,
    imagePasteIds: imagePasteIds.length > 0 ? imagePasteIds : undefined,
    permissionMode,
    isMeta: C || undefined,
    promptSource: M,
    promptId: ue,
    origin: R,
  });
  let unframed = cloneContent(gt);
  if (R) wrapNonUserMessage(userMessage_2, R);
  return {
    messages: [...jt, userMessage_2, ...attachmentMessages],
    shouldQuery: true,
    promptRow: {
      message: userMessage_2,
      unframed,
    },
  };
}
export { processTextPrompt };
