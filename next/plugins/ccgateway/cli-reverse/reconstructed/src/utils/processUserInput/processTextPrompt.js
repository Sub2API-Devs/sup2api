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

//@ chunk-xx1vmpsq.js:36221-37461 fingerprint (2.1.88 match: processTextPrompt, 0.523)
/**
 * processTextPrompt：普通文本提示转为用户消息并上报 tengu_input_prompt。
 */
function processTextPrompt(
  inputContent,
  imageContentBlocks,
  imagePasteIds,
  attachmentMessages,
  promptId,
  uuid,
  permissionMode,
  isMeta,
  effortLevelIfSupported,
  promptSource,
  origin,
  wakeupSource,
  hostInitiator,
  artifactCommentTurn,
  userPromptHold,
  inboundOrigin,
  toolsUsed,
  knownTools,
) {
  let userPromptText =
    typeof inputContent === "string"
      ? inputContent
      : inputContent.find((block) => block.type === "text")?.text || "";
  let messageUuid = uuid || randomUUID();
  let promptText =
    typeof inputContent === "string"
      ? inputContent
      : inputContent.findLast((block) => block.type === "text")?.text || "";
  let existingPromptId = hasToolResultBlock(inputContent) ? undefined : promptId;
  if (promptText)
    logSlashPromptEvent(
      {
        text: promptText,
        attributes: {
          ...(existingPromptId && {
            "prompt.id": existingPromptId,
          }),
          "message.uuid": messageUuid,
        },
      },
      userPromptHold,
    );
  let isNegative = hasFrustrationLanguage(userPromptText);
  let isKeepGoing = matchesKeepGoingKeyword(userPromptText);
  let isWakeup = isPresencePing(userPromptText);
  let cancelledMessageId = isMeta ? null : getLastCancelledAPIMessageId();
  let promptIndex = isMeta ? undefined : incrementPromptIndex();
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
    prompt_length: promptText.length,
    ...(promptSource && {
      prompt_source: fromEnum(promptSource),
    }),
    ...(effortLevelIfSupported && {
      effort_level: fromEnum(effortLevelIfSupported),
    }),
    turn_origin: fromEnum(getOriginKindLabel(origin)),
    ...userMessage,
    ...emptyObjectFactory(),
    ...(userMessage.artifact_comment_turn &&
      existingPromptId && {
        turn_prompt_id: sanitizeMarkName(existingPromptId),
      }),
    ...(cancelledMessageId && {
      interrupted_message_id: sanitizeMarkName(cancelledMessageId),
    }),
  });
  let summaryEnabled = isGlimmeringFinchGateOn();
  let unreadable =
    toolsUsed === undefined || !summaryEnabled ? undefined : unreadableToolsUsed(toolsUsed, knownTools ?? []);
  let summaryMessages =
    unreadable === undefined
      ? []
      : [markToolSummaryMessage(createUserMessage(summaryCompanionMessage(unreadable)))];
  let content =
    typeof inputContent === "string" && toolsUsed !== undefined && !summaryEnabled
      ? joinWithNewlineIfAny(inputContent, unreadableToolsLine(toolsUsed, knownTools ?? []))
      : inputContent;
  let finalContent = content;
  if (imageContentBlocks.length > 0)
    finalContent = [
      ...(typeof content === "string"
        ? content.trim()
          ? [
              {
                type: "text",
                text: content,
              },
            ]
          : []
        : content),
      ...imageContentBlocks,
    ];
  let userMessage_2 = createUserMessage({
    content: finalContent,
    uuid: messageUuid,
    imagePasteIds: imagePasteIds.length > 0 ? imagePasteIds : undefined,
    permissionMode,
    isMeta: isMeta || undefined,
    promptSource,
    promptId: existingPromptId,
    origin,
  });
  let unframed = cloneContent(finalContent);
  if (origin) wrapNonUserMessage(userMessage_2, origin);
  return {
    messages: [...summaryMessages, userMessage_2, ...attachmentMessages],
    shouldQuery: true,
    promptRow: {
      message: userMessage_2,
      unframed,
    },
  };
}
export { processTextPrompt };
