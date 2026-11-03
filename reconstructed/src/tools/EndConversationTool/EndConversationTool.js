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
import { zodStrictObject, u, M, o } from "../../../vendor/zod/v4/classic/schemas.js";
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
function countToolCallsSince(e, m, f = !1) {
  let foundStart = m !== void 0 || f,
    l = !1,
    y = !1;
  for (let c = e.length - 1; c >= 0; c--) {
    let r = e[c];
    if (r?.type === "assistant") {
      l = !0;
      let content = r.message.content;
      if (
        Array.isArray(content) &&
        content.some((g) => g.type === "tool_use" && g.name === END_CONVERSATION_TOOL_NAME)
      )
        return !0;
      continue;
    }
    if (r?.type === "user") {
      let content = r.message.content;
      if (!(
        Array.isArray(content) &&
        content.length > 0 &&
        content.every((block) => block.type === "tool_result")
      ))
        return !1;
      if (l) return !1;
      continue;
    }
  }
  return !1;
}
//@ chunk-t1kwhq0j.js:12351-13861 placement
var EndConversationTool = DoctorLazy(() => zodStrictObject({})),
  E = DoctorLazy(() => u({ ended: M(), message: o() })),
  q = buildTool({
    name: END_CONVERSATION_TOOL_NAME,
    shouldDefer: !0,
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
      return EndConversationTool();
    },
    get outputSchema() {
      return E();
    },
    userFacingName() {
      return END_CONVERSATION_TOOL_NAME;
    },
    isEnabled() {
      let e = mainLoopCanonicalModel();
      return e !== void 0 && isEndConversationToolEnabled(e);
    },
    isReadOnly() {
      return !0;
    },
    isConcurrencySafe() {
      return !1;
    },
    toAutoClassifierInput() {
      return "";
    },
    renderToolUseMessage() {
      return null;
    },
    mapToolResultToToolResultBlockParam(e, m) {
      return { tool_use_id: m, type: "tool_result", content: e.message };
    },
    create(e) {
      return {
        async call(m, f) {
          let isNonInteractiveSession = e.isNonInteractiveSession,
            l = e.agentId ? "fork" : isNonInteractiveSession ? "print" : "repl";
          if (e.agentId)
            return (
              logEvent("tengu_end_conversation_tool_call", {
                surface: lit(l),
                is_non_interactive: isNonInteractiveSession,
                phase: lit("reflect"),
              }),
              { data: { ended: !1, message: END_CONVERSATION_FORK_REFLECTION_PROMPT } }
            );
          let y = !1;
          if (!countToolCallsSince(e.messages(), void 0, !1) || y)
            return (
              logEvent("tengu_end_conversation_tool_call", {
                surface: lit(l),
                is_non_interactive: isNonInteractiveSession,
                phase: lit("reflect"),
              }),
              { data: { ended: !1, message: END_CONVERSATION_REFLECTION_PROMPT } }
            );
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
          if ((f.abort("end_conversation"), isNonInteractiveSession)) {
            let { gracefulShutdown: gracefulShutdown } = await import("./chunk-r3wdn2dp.js");
            return (
              gracefulShutdown(1, "other", { finalMessage: END_CONVERSATION_FINAL_MESSAGE }),
              { data: { ended: !0, message: END_CONVERSATION_TOOL_RESULT } }
            );
          }
          return (e.markEndedByModel(), { data: { ended: !0, message: END_CONVERSATION_TOOL_RESULT } });
        },
      };
    },
  });
