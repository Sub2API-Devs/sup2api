/**
 * commands/recap/recap.ts
 *
 * 2.1.316 新增：/recap：用当前对话生成回顾摘要
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z9nn3hxt.js (2)
 * attribution: placement 2
 */
import { isSyntheticMessage, isUserTextPrompt, getUserMessageText } from "../../utils/messages.js";
import { isLocalCommandMarkup } from "../../utils/messages/localCommandTags.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import { isHumanSubmittedTurn } from "../../utils/promptSubmissionOrigin.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { generateAwaySummary } from "../../services/awaySummary.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-z9nn3hxt.js:11906-13208 placement
/**
 * /recap：用当前对话生成一段回顾摘要（需要有实际助手输出）。
 */
async function generateRecap(context) {
  if (
    !context.messages.some(
      (message) =>
        (message.type === "assistant" && !message.isApiErrorMessage && !isSyntheticMessage(message)) ||
        (message.type === "user" && message.isCompactSummary) ||
        (isUserTextPrompt(message) && !isLocalCommandMarkup(getUserMessageText(message) ?? "")),
    )
  )
    return null;
  let [
    { fetchSystemPromptParts },
    { getToolPermissionContext },
    { getMainLoopModel, getRuntimeMainLoopModel },
    { asSystemPrompt },
    { baseSystemPromptOf },
    { withCliSections },
  ] = await Promise.all([
    import("../../utils/queryContext.js"),
    import("../../utils/permissions/toolPermissionContext.js"),
    import("../../utils/model/DEFAULT_3P_FABLE_KEY.lazy.js"),
    import("../../utils/systemPromptType.js"),
    import("../../utils/systemPromptBoundary.js"),
    import("../../constants/promptSections.js"),
  ]);
  let permissionContext = getToolPermissionContext(context);
  let mainLoopModel = getRuntimeMainLoopModel({
    permissionMode: permissionContext.mode,
    mainLoopModel: getMainLoopModel(),
  });
  let { customSystemPrompt, appendSystemPrompt } = context.options;
  let { defaultSystemPrompt, userContext, systemContext } = await fetchSystemPromptParts({
    session: context.session,
    tools: context.options.tools,
    mainLoopModel,
    customSystemPrompt,
    excludeDynamicSections: context.options.excludeDynamicSections,
    cacheBreakerPhrase: context.options.cacheBreakerPhrase,
    analysisOnly: true,
    storageV5: context.storageV5,
    credentials: context.credentials,
  });
  let systemPrompt = asSystemPrompt(
    withCliSections(baseSystemPromptOf(customSystemPrompt, defaultSystemPrompt), {
      tools: context.options.tools,
      appendSystemPrompt,
    }),
  );
  let last = context.messages.at(-1);
  let forkContextMessages = messagesSinceCompactBoundary(
    last?.type === "assistant" && last.message.stop_reason === null
      ? context.messages.slice(0, -1)
      : context.messages,
  );
  return {
    systemPrompt,
    userContext,
    systemContext,
    toolUseContext: {
      ...context,
      options: {
        ...context.options,
        mainLoopModel,
      },
    },
    forkContextMessages,
    advisorModel: context.getAdvisorSetting(),
  };
}
//@ chunk-z9nn3hxt.js:13208-14319 placement
/**
 * /recap 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var RECAP_USER_ONLY_MESSAGE =
  "/recap only runs when you ask for it yourself in this session: from the terminal, the Claude app or claude.ai/code, or over Remote Control. A message relayed from Slack, Teams or a project thread, or sent by a routine or another program, can't request it.";
var recapCommandCall = async (args, context) => {
  if (!isHumanSubmittedTurn(context) && getFeatureValue_CACHED_MAY_BE_STALE("tengu_playful_hare", true))
    return {
      type: "text",
      value: RECAP_USER_ONLY_MESSAGE,
    };
  let fallbackParams = false;
  let fallbackFailed = false;
  let awaySummary = await generateAwaySummary(context.abortController.signal, async () => {
    try {
      let recap = await generateRecap(context);
      fallbackParams = recap !== null;
      return recap;
    } catch (error) {
      fallbackFailed = true;
      throw error;
    }
  });
  switch (awaySummary.kind) {
    case "ok":
      if (awaySummary.capped)
        logFeatureSad("recap_command", "capped", {
          fallback_params: fallbackParams,
        });
      else
        logFeatureOk("recap_command", {
          fallback_params: fallbackParams,
        });
      return {
        type: "text",
        value: awaySummary.text,
      };
    case "api-error":
      logFeatureBad("recap_command", "api_error", {
        fallback_params: fallbackParams,
      });
      return {
        type: "text",
        value: awaySummary.text,
        outcome: {
          kind: "failed",
        },
      };
    case "no-turn":
      return {
        type: "text",
        value: "Nothing to recap yet \u2014 send a message first.",
      };
    case "aborted":
      return {
        type: "text",
        value: "Recap cancelled.",
      };
    case "failed":
      logFeatureBad("recap_command", fallbackFailed ? "fallback_rebuild_failed" : "failed", {
        fallback_params: fallbackParams,
      });
      return {
        type: "text",
        value: "Couldn't generate a recap. Run with --debug for details.",
        outcome: {
          kind: "failed",
        },
      };
  }
};
export { recapCommandCall };
