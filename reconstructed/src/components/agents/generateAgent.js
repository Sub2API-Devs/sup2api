/**
 * components/agents/generateAgent.ts
 *
 * 用模型根据描述生成子代理定义（名称、描述、系统提示），支持取消与超时。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/generateAgent.ts
 * pieces: chunk-eavynfj6.js (1)
 * attribution: fingerprint 1
 */
import { queryModelWithoutStreaming } from "../../services/api/claude.js";
import { createUserMessage } from "../../utils/messages.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { MEDIUM } from "../../services/artifacts/comments/autoEditPatch.js";
import { forkStickyBetaLatches } from "../../bootstrap/stateSlices.js";
import { getStickyBetas } from "../../bootstrap/state.js";
import { mainAgentContext } from "../../utils/agentContext.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";

/**
 * 根据用户描述调用模型生成子代理配置（identifier、whenToUse、systemPrompt），支持中止与超时。
 */
//@ chunk-eavynfj6.js:25822-26912 fingerprint = generateAgent (0.37)
async function generateAgent(userPrompt, model, existingIdentifiers, abortSignal) {
  let abortController = new AbortController(),
    signal = abortSignal.context.abortController.signal,
    s = () => abortController.abort();
  if (signal.aborted) return { kind: "canceled" };
  signal.addEventListener("abort", s, { once: !0 });
  let l = !1,
    messagesWithContext = setTimeout(
      () => {
        ((l = !0), abortController.abort());
      },
      Math.max(0, existingIdentifiers),
    );
  try {
    let response = await queryModelWithoutStreaming({
      messages: [createUserMessage({ content: model })],
      systemPrompt: asSystemPrompt([userPrompt]),
      thinkingConfig: abortSignal.thinkingConfig,
      tools: [],
      signal: abortController.signal,
      options: {
        model: abortSignal.model,
        querySource: "artifact_patch_edit",
        requestClass: abortSignal.sideCallClass,
        isNonInteractiveSession: abortSignal.context.options.isNonInteractiveSession,
        agents: [],
        hasAppendSystemPrompt: !1,
        mcpTools: [],
        enablePromptCaching: !1,
        hookEffortValue: MEDIUM,
        stickyBetas: forkStickyBetaLatches(getStickyBetas()),
        agentContext: mainAgentContext(),
        async getToolPermissionContext() {
          return getEmptyToolPermissionContext();
        },
      },
    });
    if (signal.aborted) return { kind: "canceled" };
    if (l) return { kind: "timeout" };
    if (response.isApiErrorMessage) return { kind: "error" };
    return {
      kind: "ok",
      text: response.message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(""),
      stopReason: response.message.stop_reason ?? null,
      messageId: response.message.id,
    };
  } catch {
    return signal.aborted ? { kind: "canceled" } : l ? { kind: "timeout" } : { kind: "error" };
  } finally {
    (clearTimeout(messagesWithContext), signal.removeEventListener("abort", s));
  }
}

export { generateAgent };
