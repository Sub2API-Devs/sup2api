/**
 * utils/hooks/execAgentHook.ts
 *
 * agent 型钩子：启动最多 50 轮的验证子代理，以 StructuredOutput {ok, reason} 作答。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/execAgentHook.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { isDiskless } from "../../bootstrap/state.js";
import { getAgentTranscriptPath, getTranscriptPath } from "../sessionStorage.js";
import { safeResolvePath, getFsImplementation } from "../fsOperations.js";
import { gn } from "../shortHash.js";
import { substituteArguments } from "../argumentSubstitution.js";
import { logForDebugging, createAttachmentMessage_2 } from "../debug.js";
import { createUserMessage, isNonRenderableSystemMessage, isResendableClientApiError } from "../messages.js";
import { aO } from "./hookConcurrency.js";
import { createAbortController } from "../abortController.js";
import { createCombinedAbortSignal } from "../combinedAbortSignal.js";
import {
  createStructuredOutputTool,
  HOOK_OK_SEMANTICS,
  hookResponseSchema,
  nonBlockingHookErrorResult,
} from "./hookHelpers.js";
import { bN } from "../../services/accountMemory/memoryContext.js";
import { kMr, denyDestructiveForHookAgent } from "./servedHooks/destructiveCommands.js";
import { Bnr } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { Y2t } from "../../services/accountMemory/accountMemoryServer.js";
import { asSystemPrompt } from "../systemPromptType.js";
import { STRUCTUREDOUTPUT } from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { unlessManagedDeniedModel, getSmallFastModel } from "../model/smallFastModel.js";
import { resolveModelAliasSpelling } from "../model/model.js";
import { getMainLoopModel as getMainLoopModel_2 } from "../permissions/toolPermissionContext.js";
import { getAPIProvider } from "../model/providers.js";
import { env } from "../env.js";
import { pcr, QZo } from "../effort.js";
import { Mr, HOOK_AGENT_ID_PREFIX } from "../agentId.js";
import { createStickyBetaLatches } from "../../bootstrap/stateSlices.js";
import { stripHostToolMeta } from "../../plugins/functionHooks/sites/toolSites.js";
import { Jro } from "../../memdir/memoryTool.js";
import { cloneFileStateCache } from "../fileStateCache.js";
import { withClassifiedWebCalls, hasPermissionsToUseTool } from "../permissions/permissions.js";
import { jsonStringify } from "../slowOperations.js";
import { isNoModelFallbackEnabled } from "../model/modelFallback.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { promptEndingFields } from "../../entrypoints/sdk/coreSchemas.js";
import { errorMessage } from "../errors.js";

/**
 * 执行 agent 钩子：用 $ARGUMENTS 替换后的提示词启动一个最多 50 轮的验证子代理（工具集去掉危险工具并加 StructuredOutput，dontAsk 权限，可读 transcript），超时默认 60s；返回 ok 成功、not ok 阻断、未给结构化输出视为取消；模型被拒时回退主模型。
 */
//@ chunk-e6aww6q8.js:3396429-3401496 fingerprint = execAgentHook (0.656)
async function execAgentHook(e, n, r, s, h, y, S, w) {
  let L = S || `hook-${randomUUID_34()}`,
    G = y.remoteCall !== void 0,
    q = isDiskless() ? void 0 : y.agentId ? getAgentTranscriptPath(y.agentId) : getTranscriptPath(),
    Z = G || q === void 0 ? void 0 : safeResolvePath(getFsImplementation(), q).resolvedPath,
    hookStartTime = Date.now(),
    ke = w ? gn(w) : void 0;
  try {
    let processedPrompt = substituteArguments(e.prompt, s);
    logForDebugging(`Hooks: Processing agent hook with prompt: ${processedPrompt}`);
    let agentMessages = [createUserMessage({ content: processedPrompt })];
    logForDebugging(`Hooks: Starting agent query with ${agentMessages.length} messages`);
    let Ie = aO(e, 60000),
      hookAbortController = createAbortController(),
      { signal: parentTimeoutSignal, cleanup: cleanupCombinedSignal } = createCombinedAbortSignal(h, {
        timeoutMs: Ie,
      }),
      onParentTimeout = () => hookAbortController.abort();
    parentTimeoutSignal.addEventListener("abort", onParentTimeout);
    let combinedSignal = hookAbortController.signal;
    try {
      let structuredOutputTool = createStructuredOutputTool(),
        pt = y.memoryCaller ?? "worker",
        mode = bN(y).mode,
        tools = [
          ...kMr(y.options.tools).filter((tool) => !Bnr(tool, y) && !Y2t(tool, mode)),
          structuredOutputTool,
        ],
        At =
          r === "Stop" || r === "SubagentStop"
            ? "You are verifying a stop condition in Claude Code. Your task is to verify that the agent completed the given plan."
            : `You are evaluating a ${r} hook in Claude Code. Your task is to evaluate the condition described in the user message.`,
        systemPrompt = asSystemPrompt([
          `${At} ${
            Z !== void 0
              ? `The conversation transcript is available at: ${Z}
You can read this file to analyze the conversation history if needed.`
              : G
                ? "This call is being served for another machine's session; there is no local conversation transcript to read."
                : "There is no conversation transcript file to read here."
          }

Use the available tools to inspect the codebase and verify the condition.
Use as few steps as possible - be efficient and direct.

When done, return your result using the ${STRUCTUREDOUTPUT} tool, always with a reason.

${HOOK_OK_SEMANTICS}`,
        ]),
        Yt = unlessManagedDeniedModel(e.model ?? getSmallFastModel()),
        qt = e.model === void 0 ? Yt : resolveModelAliasSpelling(Yt),
        Zt = getMainLoopModel_2(y),
        rn =
          e.model === void 0 &&
          getAPIProvider() === "gateway" &&
          env.ANTHROPIC_DEFAULT_HAIKU_MODEL === void 0 &&
          env.ANTHROPIC_SMALL_FAST_MODEL === void 0
            ? Zt
            : qt,
        pn = pcr(rn, Zt),
        MAX_AGENT_TURNS = 50,
        hookAgentId = Mr(`${HOOK_AGENT_ID_PREFIX}${randomUUID_34()}`),
        ho = createStickyBetaLatches(),
        yn = {
          ...y,
          agentId: hookAgentId,
          memoryCaller: pt,
          mcpRequestMeta: stripHostToolMeta(Jro(y.mcpRequestMeta)),
          stickyBetas: ho,
          abortController: hookAbortController,
          forPromptShellCommand: void 0,
          permissionModeAtRequest: void 0,
          synthesizedBy: void 0,
          promptShellHandOff: void 0,
          gateIgnoresSwitch: void 0,
          clientRequestedToolUseId: void 0,
          namesShownToApi: void 0,
          permissionLayers: (y.permissionLayers ?? [])
            .filter((vn) => pn || vn.kind !== "effort")
            .concat({ kind: "model", mainLoopModel: rn }),
          readFileState: cloneFileStateCache(y.readFileState, { stripSeededFromContext: !0 }),
          options: {
            ...y.options,
            tools: tools,
            mainLoopModel: rn,
            isNonInteractiveSession: !0,
            requiresStructuredOutput: !0,
            structuredOutputIsHandback: void 0,
            thinkingConfig: { type: "disabled", mechanical: !0 },
            activeMcpServer: void 0,
            activeMcpTool: void 0,
            refreshTools: void 0,
            refreshMcpClients: void 0,
          },
          getAppState() {
            let vn = pn ? y.getAppState() : QZo(y.getAppState()),
              co = vn.toolPermissionContext.alwaysAllowRules.session ?? [];
            return {
              ...vn,
              toolPermissionContext: {
                ...withClassifiedWebCalls(vn.toolPermissionContext, "dontAsk"),
                alwaysAllowRules: {
                  ...vn.toolPermissionContext.alwaysAllowRules,
                  session: Z !== void 0 ? [...co, `Read(/${Z})`] : co,
                },
              },
            };
          },
        },
        structuredOutputResult = null,
        turnCount = 0,
        fo = !1,
        To = !1,
        bo = G ? denyDestructiveForHookAgent(hasPermissionsToUseTool) : hasPermissionsToUseTool;
      for await (let message of yn.options.runQuery({
        messages: agentMessages,
        systemPrompt: systemPrompt,
        userContext: {},
        systemContext: {},
        canUseTool: bo,
        toolUseContext: yn,
        querySource: "hook_agent",
        stickyBetas: ho,
      })) {
        if (
          (isNonRenderableSystemMessage(message, {
            onMessage: () => {},
            onUpdateLength: () => {},
            onSetStreamMode: () => {},
            onStreamingToolUses: () => {},
          }),
          message.type === "stream_event" || message.type === "stream_request_start")
        )
          continue;
        if (message.type === "assistant") {
          if (turnCount === 0) To = isResendableClientApiError(message);
          if ((turnCount++, turnCount >= 50)) {
            ((fo = !0),
              logForDebugging(`Hooks: Agent turn ${turnCount} hit max turns, aborting`),
              hookAbortController.abort());
            break;
          }
        }
        if (message.type === "attachment" && message.attachment.type === "structured_output") {
          let parsed = hookResponseSchema().safeParse(message.attachment.data);
          if (parsed.success) {
            ((structuredOutputResult = parsed.data),
              logForDebugging(`Hooks: Got structured output: ${jsonStringify(structuredOutputResult)}`),
              hookAbortController.abort());
            break;
          }
        }
      }
      if (
        (parentTimeoutSignal.removeEventListener("abort", onParentTimeout),
        cleanupCombinedSignal(),
        !structuredOutputResult)
      ) {
        if (To && rn !== Zt && e.model !== Zt && !h.aborted && !isNoModelFallbackEnabled())
          return (
            logForDebugging(`Hooks: ${rn} was refused, running the agent hook on ${Zt}`),
            { ...(await execAgentHook({ ...e, model: Zt }, n, r, s, h, y, S, w)), hook: e }
          );
        if (fo)
          return (
            logForDebugging("Hooks: Agent hook did not complete within 50 turns"),
            logEvent("tengu_agent_stop_hook_max_turns", {
              durationMs: Date.now() - hookStartTime,
              turnCount: turnCount,
              hookEvent: fromEnum(r),
              agentName: ke,
            }),
            { hook: e, outcome: "cancelled" }
          );
        return (
          logForDebugging("Hooks: Agent hook did not return structured output"),
          logEvent("tengu_agent_stop_hook_error", {
            durationMs: Date.now() - hookStartTime,
            turnCount: turnCount,
            errorType: 1,
            hookEvent: fromEnum(r),
            agentName: ke,
          }),
          { hook: e, outcome: "cancelled" }
        );
      }
      if (!structuredOutputResult.ok)
        return (
          logForDebugging(`Hooks: Agent hook condition was not met: ${structuredOutputResult.reason}`),
          logEvent("tengu_agent_stop_hook_blocking", {
            durationMs: Date.now() - hookStartTime,
            turnCount: turnCount,
            hookEvent: fromEnum(r),
            agentName: ke,
          }),
          {
            hook: e,
            outcome: "blocking",
            blockingError: {
              blockingError: `Agent hook condition was not met: ${structuredOutputResult.reason}`,
              command: e.prompt,
              ...promptEndingFields(r, { reason: structuredOutputResult.reason }),
            },
          }
        );
      return (
        logForDebugging("Hooks: Agent hook condition was met"),
        logEvent("tengu_agent_stop_hook_success", {
          durationMs: Date.now() - hookStartTime,
          turnCount: turnCount,
          hookEvent: fromEnum(r),
          agentName: ke,
        }),
        {
          hook: e,
          outcome: "success",
          message: createAttachmentMessage_2({
            type: "hook_success",
            hookName: n,
            toolUseID: L,
            hookEvent: r,
            content: "",
          }),
        }
      );
    } catch (error) {
      if (
        (parentTimeoutSignal.removeEventListener("abort", onParentTimeout),
        cleanupCombinedSignal(),
        combinedSignal.aborted)
      )
        return { hook: e, outcome: "cancelled" };
      throw error;
    }
  } catch (error) {
    let errorMsg = errorMessage(error);
    return (
      logForDebugging(`Hooks: Agent hook error: ${errorMsg}`),
      logEvent("tengu_agent_stop_hook_error", {
        durationMs: Date.now() - hookStartTime,
        errorType: 2,
        hookEvent: fromEnum(r),
        agentName: ke,
      }),
      nonBlockingHookErrorResult(e, {
        hookName: n,
        toolUseID: L,
        hookEvent: r,
        stderr: `Error executing agent hook: ${errorMsg}`,
        stdout: "",
      })
    );
  }
}

export { execAgentHook };
