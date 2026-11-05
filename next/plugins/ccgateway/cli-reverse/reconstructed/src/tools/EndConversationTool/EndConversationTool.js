/**
 * tools/EndConversationTool/EndConversationTool.ts
 *
 * 结束对话工具（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vafj8wka.js (6)
 * attribution: affinity 1, placement 2, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { END_CONVERSATION_TOOL_NAME } from "./constants.js";
import { isProjectsRelay, isLegacyHearthRelayMessage } from "../../utils/messageProvenance.js";
import { isUserQueuedCommandAttachment } from "../../utils/messages.js";
import {
  END_CONVERSATION_REFLECTION_PROMPT,
  DESCRIPTION,
  isEndConversationToolEnabled,
  END_CONVERSATION_FORK_REFLECTION_PROMPT,
  END_CONVERSATION_FINAL_MESSAGE,
  END_CONVERSATION_TOOL_RESULT,
} from "./prompt.js";
import { TurnRegistry } from "../../query/replTurnLedger.js";
import { isDrainableMainThreadCommand } from "../../utils/messageQueueManager.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  objectSchema,
  booleanSchema,
  stringSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { mainLoopCanonicalModel } from "../../utils/model/telemetryModelName.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { markSessionEndedByModel } from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-vafj8wka.js:13164-13188 affinity
class CarriedMarkers {
  issuedBy = undefined;
}
//@ chunk-vafj8wka.js:13188-14230 placement
function conversationEnded(messages, sinceUuid, force = false) {
  let includeAttachments = sinceUuid !== undefined || force;
  let sawAssistantMessage = false;
  let unusedFlag = false;
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (codeModeAccepted() && message !== undefined && "isVirtual" in message && message.isVirtual === true)
      continue;
    if (message?.type === "assistant") {
      sawAssistantMessage = true;
      let content = message.message.content;
      if (
        Array.isArray(content) &&
        content.some(
          (contentBlock) =>
            contentBlock.type === "tool_use" && contentBlock.name === END_CONVERSATION_TOOL_NAME,
        )
      )
        return true;
      if (codeModeAccepted() && unusedFlag && sinceUuid !== undefined && message.uuid === sinceUuid)
        return true;
      continue;
    }
    if (message?.type === "user") {
      let content = message.message.content;
      if (!(
        Array.isArray(content) &&
        content.length > 0 &&
        content.every((block) => block.type === "tool_result")
      ))
        return false;
      if (sawAssistantMessage) return false;
      if (codeModeAccepted() && sinceUuid !== undefined)
        unusedFlag ||= content.some((block) => hasReflectionPrompt(toolResultText(block)));
      continue;
    }
    if (
      codeModeAccepted() &&
      includeAttachments &&
      message?.type === "attachment" &&
      ((message.attachment.type === "queued_command" &&
        (((message.attachment.commandMode === "prompt" || message.attachment.commandMode === "bash") &&
          message.attachment.isMeta !== true) ||
          (isProjectsRelay(message.attachment.origin) && !isLegacyHearthRelayMessage(message.attachment)) ||
          isUserQueuedCommandAttachment(message))) ||
        (message.attachment.type === "poll_events" &&
          (message.attachment.provenance ?? []).some(
            (envelope) => envelope?.authority === "human-principal" || envelope?.authority === "human-other",
          )))
    )
      return false;
    if (
      codeModeAccepted() &&
      sinceUuid !== undefined &&
      !sawAssistantMessage &&
      message?.type === "attachment" &&
      message.attachment.type === "poll_events"
    )
      unusedFlag ||= message.attachment.envelopes.some(hasReflectionPrompt);
  }
  return false;
}
//@ chunk-vafj8wka.js:14230-14364 layout
function hasReflectionPrompt(envelope) {
  let stripQuotes = (envelope) => envelope.replace(/['"\\]/g, "");
  let text = stripQuotes(envelope);
  return END_CONVERSATION_REFLECTION_PROMPT.split(
    `
`,
  )
    .filter((line) => line.trim() !== "")
    .every((line) => text.includes(stripQuotes(line)));
}
//@ chunk-vafj8wka.js:14364-14620 layout
function toolResultText(block) {
  if (typeof block !== "object" || block === null || block.type !== "tool_result") return "";
  let content = block.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) =>
    typeof part === "object" && part !== null && part.type === "text" ? String(part.text ?? "") : "",
  ).join(`
`);
}
//@ chunk-vafj8wka.js:14620-14805 layout
function canQueueInput(toolContext, inputBlock) {
  let id = inputBlock.parentMessage?.message.id;
  let turn = id === undefined ? undefined : toolContext.toolState.get(TurnRegistry).turnOf.get(id);
  if (turn === undefined || turn.signal.aborted) return false;
  return toolContext.messageQueue.peek(isDrainableMainThreadCommand) === undefined;
}
//@ chunk-vafj8wka.js:14805-16688 placement
/**
 * EndConversation 的输出 schema：ended 与 message。
 */
var EndConversationTool_2 = DoctorLazy(() => zodStrictObject({}));
var END_CONVERSATION_OUTPUT_SCHEMA = DoctorLazy(() =>
  objectSchema({
    ended: booleanSchema(),
    message: stringSchema(),
  }),
);
var EndConversationTool = buildTool({
  name: END_CONVERSATION_TOOL_NAME,
  shouldDefer: true,
  searchHint:
    "end the conversation \u2014 only for sustained user abuse, or when the user explicitly asks to see it demonstrated",
  backgrounding: "never",
  maxResultSizeChars: 1e4,
  async description() {
    return DESCRIPTION;
  },
  async prompt() {
    return DESCRIPTION;
  },
  get inputSchema() {
    return EndConversationTool_2();
  },
  get outputSchema() {
    return END_CONVERSATION_OUTPUT_SCHEMA();
  },
  userFacingName() {
    return END_CONVERSATION_TOOL_NAME;
  },
  isEnabled() {
    let model = mainLoopCanonicalModel();
    return model !== undefined && isEndConversationToolEnabled(model);
  },
  isReadOnly() {
    return true;
  },
  isConcurrencySafe() {
    return false;
  },
  toAutoClassifierInput() {
    return "";
  },
  renderToolUseMessage() {
    return null;
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: result.message,
    };
  },
  create(toolContext) {
    return {
      async call(input, copyOverride) {
        let isNonInteractiveSession = toolContext.isNonInteractiveSession;
        let surface = toolContext.agentId ? "fork" : isNonInteractiveSession ? "print" : "repl";
        if (toolContext.agentId) {
          logEvent("tengu_end_conversation_tool_call", {
            surface: lit(surface),
            is_non_interactive: isNonInteractiveSession,
            phase: lit("reflect"),
          });
          return {
            data: {
              ended: false,
              message: END_CONVERSATION_FORK_REFLECTION_PROMPT,
            },
          };
        }
        let innerCallCannotQueue =
          codeModeAccepted() && copyOverride.innerCall === true && !canQueueInput(toolContext, copyOverride);
        if (
          !conversationEnded(
            toolContext.messages(),
            codeModeAccepted() ? toolContext.toolState.get(CarriedMarkers).issuedBy : undefined,
            codeModeAccepted() && copyOverride.innerCall === true,
          ) ||
          innerCallCannotQueue
        ) {
          if (codeModeAccepted() && !innerCallCannotQueue)
            toolContext.toolState.get(CarriedMarkers).issuedBy =
              copyOverride.innerCall === true ? copyOverride.parentMessage?.uuid : undefined;
          logEvent("tengu_end_conversation_tool_call", {
            surface: lit(surface),
            is_non_interactive: isNonInteractiveSession,
            phase: lit("reflect"),
          });
          return {
            data: {
              ended: false,
              message: END_CONVERSATION_REFLECTION_PROMPT,
            },
          };
        }
        logEvent("tengu_end_conversation_tool_call", {
          surface: lit(surface),
          is_non_interactive: isNonInteractiveSession,
          phase: lit("end"),
        });
        let unusedValue;
        if (codeModeAccepted() && copyOverride.innerCall === true) {
          toolContext.markEndedByModel();
          unusedValue = toolContext.toolState
            .get(TurnRegistry)
            .end(copyOverride.parentMessage?.message.id, toolContext.agentId);
        }
        try {
          await markSessionEndedByModel(getSessionId(), toolContext.storageV5);
        } catch (error) {
          logForDebugging(`[EndConversation] marker write failed: ${errorMessage(error)}`);
        }
        if (codeModeAccepted() && copyOverride.innerCall === true) {
          unusedValue?.abort("end_conversation");
          copyOverride.abortTurn("end_conversation");
        } else copyOverride.abort("end_conversation");
        if (isNonInteractiveSession) {
          let { gracefulShutdown } = await import("../../utils/gracefulShutdown.js");
          gracefulShutdown(1, "other", {
            finalMessage: END_CONVERSATION_FINAL_MESSAGE,
          });
          return {
            data: {
              ended: true,
              message: END_CONVERSATION_TOOL_RESULT,
            },
          };
        }
        toolContext.markEndedByModel();
        return {
          data: {
            ended: true,
            message: END_CONVERSATION_TOOL_RESULT,
          },
        };
      },
    };
  },
});
export { EndConversationTool };
