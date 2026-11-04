/**
 * tools/EndConversationTool/EndConversationTool.ts
 *
 * 结束对话工具（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t1kwhq0j.js (2)
 * attribution: placement 2
 */
import { END_CONVERSATION_TOOL_NAME } from "./constants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  objectSchema,
  booleanSchema,
  stringSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  DESCRIPTION,
  isEndConversationToolEnabled,
  END_CONVERSATION_FORK_REFLECTION_PROMPT,
  END_CONVERSATION_REFLECTION_PROMPT,
  END_CONVERSATION_FINAL_MESSAGE,
  END_CONVERSATION_TOOL_RESULT,
} from "./prompt.js";
import { mainLoopCanonicalModel } from "../../utils/model/telemetryModelName.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { markSessionEndedByModel } from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-t1kwhq0j.js:11958-12351 placement (2.1.88 match: countToolCallsSince, 1)
function countToolCallsSince(messages, sinceUuid, force = false) {
  let toolCallCount = sinceUuid !== undefined || force;
  let sawAssistantMessage = false;
  let unusedFlag = false;
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
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
      continue;
    }
  }
  return false;
}
//@ chunk-t1kwhq0j.js:12351-13861 placement
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
      async call(input, callOptions) {
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
        let unusedFlag = false;
        if (!countToolCallsSince(toolContext.messages(), undefined, false) || unusedFlag) {
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
        try {
          await markSessionEndedByModel(getSessionId(), toolContext.storageV5);
        } catch (error) {
          logForDebugging(`[EndConversation] marker write failed: ${errorMessage(error)}`);
        }
        callOptions.abort("end_conversation");
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
