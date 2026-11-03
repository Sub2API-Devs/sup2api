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
import { Us } from "../../services/projects/threadRows.js";
import { O7s } from "../../utils/promptSubmissionOrigin.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { generateAwaySummary } from "../../services/awaySummary.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";

/**
 * /recap：用当前对话生成一段回顾摘要（需要有实际助手输出）。
 */
//@ chunk-z9nn3hxt.js:11906-13208 placement
async function generateRecap(e) {
  if (
    !e.messages.some(
      (message) =>
        (message.type === "assistant" && !message.isApiErrorMessage && !isSyntheticMessage(message)) ||
        (message.type === "user" && message.isCompactSummary) ||
        (isUserTextPrompt(message) && !isLocalCommandMarkup(getUserMessageText(message) ?? "")),
    )
  )
    return null;
  let [
      { fetchSystemPromptParts: a },
      { getToolPermissionContext: l },
      { getMainLoopModel: s, getRuntimeMainLoopModel: o },
      { asSystemPrompt: c },
      { baseSystemPromptOf: u },
      { withCliSections: d },
    ] = await Promise.all([
      import("./chunk-cqycffet.js"),
      import("./chunk-bvy3yerb.js"),
      import("./chunk-gqemcfsb.js"),
      import("./chunk-xpgm632z.js"),
      import("./chunk-dtmdbzw0.js"),
      import("./chunk-n5p5ppmp.js"),
    ]),
    y = l(e),
    i = o({ permissionMode: y.mode, mainLoopModel: s() }),
    { customSystemPrompt: customSystemPrompt, appendSystemPrompt: appendSystemPrompt } = e.options,
    {
      defaultSystemPrompt: defaultSystemPrompt,
      userContext: userContext,
      systemContext: systemContext,
    } = await a({
      session: e.session,
      tools: e.options.tools,
      mainLoopModel: i,
      customSystemPrompt: customSystemPrompt,
      excludeDynamicSections: e.options.excludeDynamicSections,
      cacheBreakerPhrase: e.options.cacheBreakerPhrase,
      analysisOnly: !0,
      storageV5: e.storageV5,
      credentials: e.credentials,
    }),
    k = c(
      d(u(customSystemPrompt, defaultSystemPrompt), {
        tools: e.options.tools,
        appendSystemPrompt: appendSystemPrompt,
      }),
    ),
    at = e.messages.at(-1),
    P = Us(
      at?.type === "assistant" && at.message.stop_reason === null ? e.messages.slice(0, -1) : e.messages,
    );
  return {
    systemPrompt: k,
    userContext: userContext,
    systemContext: systemContext,
    toolUseContext: { ...e, options: { ...e.options, mainLoopModel: i } },
    forkContextMessages: P,
    advisorModel: e.getAdvisorSetting(),
  };
}
/**
 * /recap 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-z9nn3hxt.js:13208-14319 placement
var RECAP_USER_ONLY_MESSAGE =
    "/recap only runs when you ask for it yourself in this session: from the terminal, the Claude app or claude.ai/code, or over Remote Control. A message relayed from Slack, Teams or a project thread, or sent by a routine or another program, can't request it.",
  E = async (args, context) => {
    if (!O7s(context) && getFeatureValue_CACHED_MAY_BE_STALE("tengu_playful_hare", !0))
      return { type: "text", value: RECAP_USER_ONLY_MESSAGE };
    let a = !1,
      l = !1,
      s = await generateAwaySummary(context.abortController.signal, async () => {
        try {
          let o = await generateRecap(context);
          return ((a = o !== null), o);
        } catch (error) {
          throw ((l = !0), error);
        }
      });
    switch (s.kind) {
      case "ok":
        if (s.capped) logFeatureSad("recap_command", "capped", { fallback_params: a });
        else logFeatureOk("recap_command", { fallback_params: a });
        return { type: "text", value: s.text };
      case "api-error":
        return (
          logFeatureBad("recap_command", "api_error", { fallback_params: a }),
          { type: "text", value: s.text, outcome: { kind: "failed" } }
        );
      case "no-turn":
        return { type: "text", value: "Nothing to recap yet \u2014 send a message first." };
      case "aborted":
        return { type: "text", value: "Recap cancelled." };
      case "failed":
        return (
          logFeatureBad("recap_command", l ? "fallback_rebuild_failed" : "failed", { fallback_params: a }),
          {
            type: "text",
            value: "Couldn't generate a recap. Run with --debug for details.",
            outcome: { kind: "failed" },
          }
        );
    }
  };
