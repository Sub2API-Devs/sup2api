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
import { zodStrictObject, u, M, string } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-t1kwhq0j.js:11958-12351 placement = countToolCallsSince (1)
function countToolCallsSince(e, m, f = false) {
  let toolCallCount = m !== undefined || f;
  let l = false;
  let y = false;
  for (let j = e.length - 1; j >= 0; j--) {
    let r = e[j];
    if (r?.type === "assistant") {
      l = true;
      let content = r.message.content;
      if (
        Array.isArray(content) &&
        content.some((g) => g.type === "tool_use" && g.name === END_CONVERSATION_TOOL_NAME)
      )
        return true;
      continue;
    }
    if (r?.type === "user") {
      let content = r.message.content;
      if (!(
        Array.isArray(content) &&
        content.length > 0 &&
        content.every((block) => block.type === "tool_result")
      ))
        return false;
      if (l) return false;
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
  u({
    ended: M(),
    message: string(),
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
    let e = mainLoopCanonicalModel();
    return e !== undefined && isEndConversationToolEnabled(e);
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
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: e.message,
    };
  },
  create(e) {
    return {
      async call(m, f) {
        let isNonInteractiveSession = e.isNonInteractiveSession;
        let l = e.agentId ? "fork" : isNonInteractiveSession ? "print" : "repl";
        if (e.agentId) {
          logEvent("tengu_end_conversation_tool_call", {
            surface: lit(l),
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
        let y = false;
        if (!countToolCallsSince(e.messages(), undefined, false) || y) {
          logEvent("tengu_end_conversation_tool_call", {
            surface: lit(l),
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
          surface: lit(l),
          is_non_interactive: isNonInteractiveSession,
          phase: lit("end"),
        });
        let c;
        try {
          await markSessionEndedByModel(getSessionId(), e.storageV5);
        } catch (error) {
          logForDebugging(`[EndConversation] marker write failed: ${errorMessage(error)}`);
        }
        f.abort("end_conversation");
        if (isNonInteractiveSession) {
          let { gracefulShutdown } = await import("./chunk-r3wdn2dp.js");
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
        e.markEndedByModel();
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
