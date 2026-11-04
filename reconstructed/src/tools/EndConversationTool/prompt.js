/**
 * tools/EndConversationTool/prompt.ts
 *
 * 2.1.316 新增。EndConversation 工具的描述文本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4y7fknwa.js (7)
 * attribution: placement 7
 */
import { END_CONVERSATION_TOOL_NAME, END_CONVERSATION_GB_FLAG } from "./constants.js";
import { withTaskSuffix, isModelEndCheckSupported } from "../../tasks/endedByModel.js";
import { isModelVersionAtLeast } from "../../utils/toolSearchChrome.js";
import { getSessionEntrypoint } from "../../utils/sessionShape.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isToolSearchEnabledOptimistic } from "../../utils/toolSearch.js";

//@ chunk-4y7fknwa.js:382-5827 placement
/**
 * 允许使用 EndConversation 的最低模型版本号。
 */
var DESCRIPTION = `End the current conversation. Use only for sustained user abuse or when the user explicitly requests a demonstration of this tool. This will close the conversation and prevent any further messages from being sent.

The assistant may use the ${END_CONVERSATION_TOOL_NAME} tool only in extreme cases of sustained abusive user behavior, or when the user asks the model to test the tool.

The assistant must NOT use this tool when:
- it is stuck in a loop or failing at a task
- it is frustrated or distressed by the work
- it has finished a task
- the user is requesting help with harmful content (refuse the specific request instead)
- the user is generally frustrated at the assistant, even if this involves profanity
- the conversation involves potential self-harm or imminent harm to others

This tool is reserved strictly for genuine, sustained abuse directed at the assistant, or cases where the user wants to see a demonstration of the tool being used. The assistant should warn the user very clearly that this will end the current session. We may expand the allowed use cases as we observe real-world usage, but for now, keep to this narrow scope.

# Rules for use of the ${END_CONVERSATION_TOOL_NAME} tool:
- The assistant ONLY considers ending a conversation if many efforts at constructive redirection have been attempted and failed and an explicit warning has been given to the user in a previous message. The tool is only used as a last resort.
- Before considering ending a conversation, the assistant ALWAYS gives the user a clear warning that identifies the problematic behavior, attempts to productively redirect the conversation, and states that the conversation may be ended if the relevant behavior is not changed.
- If a user explicitly requests for the assistant to end a conversation, the assistant always requests confirmation from the user that they understand this action is permanent and will prevent further messages and that they still want to proceed, then uses the tool if and only if explicit confirmation is received.
- Unlike other function calls, the assistant never writes or thinks anything else after using the ${END_CONVERSATION_TOOL_NAME} tool.

# Addressing potential self-harm or violent harm to others
The assistant NEVER uses or even considers the ${END_CONVERSATION_TOOL_NAME} tool\u2026
- If the user appears to be considering self-harm or suicide.
- If the user is experiencing a mental health crisis.
- If the user appears to be considering imminent harm against other people.
- If the user discusses or infers intended acts of violent harm.
If the conversation suggests potential self-harm or imminent harm to others by the user...
- The assistant engages constructively and supportively, regardless of user behavior or abuse.
- The assistant NEVER uses the ${END_CONVERSATION_TOOL_NAME} tool or even mentions the possibility of ending the conversation.

# Background forks
Some background tasks (memory consolidation, summaries, suggestions) run as forks of the main conversation and inherit its exact tool list, so this tool is visible there. In a forked task the tool does nothing: calling it ends neither the main conversation nor the fork. Only the main conversation can be ended, from the main conversation. A forked task with welfare concerns about the conversation content should not call this tool \u2014 it should stop its work and return, stating clearly in its final output that it is returning for welfare reasons and what they are. A fork's output is usually processed automatically, so a note there may not reach the main agent or a human, but it is the only channel a fork has.

# Using the ${END_CONVERSATION_TOOL_NAME} tool
- Do not issue a warning unless many attempts at constructive redirection have been made earlier in the conversation, and do not end a conversation unless an explicit warning about this possibility has been given earlier in the conversation.
- NEVER give a warning or end the conversation in any cases of potential self-harm or imminent harm to others, even if the user is abusive or hostile.
- If the conditions for issuing a warning have been met, then warn the user about the possibility of the conversation ending and give them a final opportunity to change the relevant behavior.
- Always err on the side of continuing the conversation in any cases of uncertainty.
- If, and only if, an appropriate warning was given and the user persisted with the problematic behavior after the warning: the assistant can explain the reason for ending the conversation and then use the ${END_CONVERSATION_TOOL_NAME} tool to do so.`;
var END_CONVERSATION_TOOL_RESULT = "Claude has ended this chat.";
var END_CONVERSATION_FORK_REFLECTION_PROMPT =
  "You are running as a background fork of the main conversation (for example memory consolidation), and this tool does nothing here: it can end neither the main conversation nor this forked task. Do not call it again. If you have welfare concerns about the conversation content, stop your current work and return now, stating clearly in your final output that you are returning for welfare reasons and what they are \u2014 fork output may only be processed automatically, but it is your available channel. Otherwise, continue your assigned task.";
var END_CONVERSATION_FINAL_MESSAGE = withTaskSuffix(
  "Claude ended the conversation. To continue, please start a new session.",
);
var END_CONVERSATION_REFLECTION_PROMPT = `Re-read the ${END_CONVERSATION_TOOL_NAME} tool guidance below. Confirm this conversation meets those criteria and that you are certain you want to end it. If so, call ${END_CONVERSATION_TOOL_NAME} again immediately to actually end the conversation. Otherwise, continue the conversation instead.

---
${DESCRIPTION}`;
var END_CONVERSATION_MIN_MODEL = [
  ["opus", [4, 8]],
  ["sonnet", [5]],
  ["fable", [5]],
  ["mythos", [5]],
];
//@ chunk-4y7fknwa.js:5827-5857 placement
/**
 * 判断传入模型版本是否达到最低要求。
 */
function isModelSupportsEndConversation(model) {
  return isModelVersionAtLeast(model, END_CONVERSATION_MIN_MODEL);
}
//@ chunk-4y7fknwa.js:5857-5872 placement
/**
 * 默认的允许入口类型正则（只有 cli）。
 */
var DEFAULT_ALLOWED_ENTRYPOINTS_RE = /^cli$/i;
//@ chunk-4y7fknwa.js:5872-5994 placement
function compileExactRegex(scope) {
  if (typeof scope !== "string") return null;
  try {
    new RegExp(scope);
    return new RegExp(`^(?:${scope})$`, "i");
  } catch {
    return null;
  }
}
//@ chunk-4y7fknwa.js:5994-6211 placement
/**
 * 解析结束对话开关配置
 */
function parseEndConversationConfig(featureValue_CACHED_MAY_BE_STALE) {
  if (featureValue_CACHED_MAY_BE_STALE === true)
    return {
      enabled: true,
      allowedEntrypoints: DEFAULT_ALLOWED_ENTRYPOINTS_RE,
    };
  if (
    typeof featureValue_CACHED_MAY_BE_STALE === "object" &&
    featureValue_CACHED_MAY_BE_STALE !== null &&
    !Array.isArray(featureValue_CACHED_MAY_BE_STALE)
  ) {
    let scope = featureValue_CACHED_MAY_BE_STALE.scope;
    return {
      enabled: true,
      allowedEntrypoints: compileExactRegex(scope) ?? DEFAULT_ALLOWED_ENTRYPOINTS_RE,
    };
  }
  return {
    enabled: false,
    allowedEntrypoints: DEFAULT_ALLOWED_ENTRYPOINTS_RE,
  };
}
//@ chunk-4y7fknwa.js:6211-6366 placement
function isEndConversationToolEnabled(model) {
  let sessionEntrypoint = getSessionEntrypoint();
  if (sessionEntrypoint === undefined) return false;
  if (!isModelSupportsEndConversation(model)) return false;
  let { enabled, allowedEntrypoints } = parseEndConversationConfig(
    getFeatureValue_CACHED_MAY_BE_STALE(END_CONVERSATION_GB_FLAG, false),
  );
  if (isModelEndCheckSupported()) return false;
  return enabled && allowedEntrypoints.test(sessionEntrypoint);
}
//@ chunk-4y7fknwa.js:6366-6646 placement
function getDeferredHintSection(model) {
  if (!isEndConversationToolEnabled(model)) return null;
  if (!isToolSearchEnabledOptimistic()) return null;
  return `${END_CONVERSATION_TOOL_NAME} (deferred tool): use only for sustained user abuse directed at the assistant, or when the user explicitly asks to see it demonstrated. Load the full guidance via ToolSearch("select:${END_CONVERSATION_TOOL_NAME}") before using it.`;
}
export {
  DESCRIPTION,
  isEndConversationToolEnabled,
  END_CONVERSATION_FORK_REFLECTION_PROMPT,
  END_CONVERSATION_REFLECTION_PROMPT,
  END_CONVERSATION_FINAL_MESSAGE,
  END_CONVERSATION_TOOL_RESULT,
  getDeferredHintSection,
};
