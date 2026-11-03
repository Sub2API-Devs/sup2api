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
import { randomUUID } from "crypto";
import { isDiskless } from "../../bootstrap/state.js";
import { getAgentTranscriptPath, getTranscriptPath } from "../sessionStorage.js";
import { safeResolvePath, getFsImplementation } from "../fsOperations.js";
import { shortHash } from "../shortHash.js";
import { substituteArguments } from "../argumentSubstitution.js";
import { logForDebugging, createAttachmentMessage_2 } from "../debug.js";
import { createUserMessage, isNonRenderableSystemMessage, isResendableClientApiError } from "../messages.js";
import { hookTimeoutMs } from "./hookConcurrency.js";
import { createAbortController } from "../abortController.js";
import { createCombinedAbortSignal } from "../combinedAbortSignal.js";
import {
  createStructuredOutputTool,
  HOOK_OK_SEMANTICS,
  hookResponseSchema,
  nonBlockingHookErrorResult,
} from "./hookHelpers.js";
import { memoryModeForSession } from "../../services/accountMemory/memoryContext.js";
import { filterNonGuardTools, denyDestructiveForHookAgent } from "./servedHooks/destructiveCommands.js";
import { isCoordinatorBashToolUse } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { isServedAccountMemoryTool } from "../../services/accountMemory/accountMemoryServer.js";
import { asSystemPrompt } from "../systemPromptType.js";
import { STRUCTUREDOUTPUT } from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { unlessManagedDeniedModel, getSmallFastModel } from "../model/smallFastModel.js";
import { resolveModelAliasSpelling } from "../model/model.js";
import { getMainLoopModel as getMainLoopModel_2 } from "../permissions/toolPermissionContext.js";
import { getAPIProvider } from "../model/providers.js";
import { env } from "../env.js";
import { isSameModelSettings, withoutSessionLevel } from "../effort.js";
import { identityAgentId2, HOOK_AGENT_ID_PREFIX } from "../agentId.js";
import { createStickyBetaLatches } from "../../bootstrap/stateSlices.js";
import { stripHostToolMeta } from "../../plugins/functionHooks/sites/toolSites.js";
import { stripMemoryCallMeta } from "../../memdir/memoryTool.js";
import { cloneFileStateCache } from "../fileStateCache.js";
import { withClassifiedWebCalls, hasPermissionsToUseTool } from "../permissions/permissions.js";
import { jsonStringify } from "../slowOperations.js";
import { isNoModelFallbackEnabled } from "../model/modelFallback.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { promptEndingFields } from "../../entrypoints/sdk/coreSchemas.js";
import { errorMessage } from "../errors.js";

//@ chunk-e6aww6q8.js:3396429-3401496 fingerprint = execAgentHook (0.656)
/**
 * 执行 agent 钩子：用 $ARGUMENTS 替换后的提示词启动一个最多 50 轮的验证子代理（工具集去掉危险工具并加 StructuredOutput，dontAsk 权限，可读 transcript），超时默认 60s；返回 ok 成功、not ok 阻断、未给结构化输出视为取消；模型被拒时回退主模型。
 */
async function execAgentHook(hook, hookName, r, jsonInput, h, y, toolUseID, w) {
  let effectiveToolUseID = toolUseID || `hook-${randomUUID()}`;
  let G = y.remoteCall !== undefined;
  let q = isDiskless() ? undefined : y.agentId ? getAgentTranscriptPath(y.agentId) : getTranscriptPath();
  let resolvedPath =
    G || q === undefined ? undefined : safeResolvePath(getFsImplementation(), q).resolvedPath;
  let hookStartTime = Date.now();
  let agentName = w ? shortHash(w) : undefined;
  try {
    let processedPrompt = substituteArguments(hook.prompt, jsonInput);
    logForDebugging(`Hooks: Processing agent hook with prompt: ${processedPrompt}`);
    let agentMessages = [
      createUserMessage({
        content: processedPrompt,
      }),
    ];
    logForDebugging(`Hooks: Starting agent query with ${agentMessages.length} messages`);
    let hookTimeoutMs_2 = hookTimeoutMs(hook, 60000);
    let hookAbortController = createAbortController();
    let { signal: parentTimeoutSignal, cleanup: cleanupCombinedSignal } = createCombinedAbortSignal(h, {
      timeoutMs: hookTimeoutMs_2,
    });
    let onParentTimeout = () => hookAbortController.abort();
    parentTimeoutSignal.addEventListener("abort", onParentTimeout);
    let combinedSignal = hookAbortController.signal;
    try {
      let structuredOutputTool = createStructuredOutputTool();
      let memoryCaller = y.memoryCaller ?? "worker";
      let mode = memoryModeForSession(y).mode;
      let tools = [
        ...filterNonGuardTools(y.options.tools).filter(
          (tool) => !isCoordinatorBashToolUse(tool, y) && !isServedAccountMemoryTool(tool, mode),
        ),
        structuredOutputTool,
      ];
      let At =
        r === "Stop" || r === "SubagentStop"
          ? "You are verifying a stop condition in Claude Code. Your task is to verify that the agent completed the given plan."
          : `You are evaluating a ${r} hook in Claude Code. Your task is to evaluate the condition described in the user message.`;
      let systemPrompt = asSystemPrompt([
        `${At} ${
          resolvedPath !== undefined
            ? `The conversation transcript is available at: ${resolvedPath}
You can read this file to analyze the conversation history if needed.`
            : G
              ? "This call is being served for another machine's session; there is no local conversation transcript to read."
              : "There is no conversation transcript file to read here."
        }

Use the available tools to inspect the codebase and verify the condition.
Use as few steps as possible - be efficient and direct.

When done, return your result using the ${STRUCTUREDOUTPUT} tool, always with a reason.

${HOOK_OK_SEMANTICS}`,
      ]);
      let Yt = unlessManagedDeniedModel(hook.model ?? getSmallFastModel());
      let qt = hook.model === undefined ? Yt : resolveModelAliasSpelling(Yt);
      let mainLoopModel = getMainLoopModel_2(y);
      let rn =
        hook.model === undefined &&
        getAPIProvider() === "gateway" &&
        env.ANTHROPIC_DEFAULT_HAIKU_MODEL === undefined &&
        env.ANTHROPIC_SMALL_FAST_MODEL === undefined
          ? mainLoopModel
          : qt;
      let pn = isSameModelSettings(rn, mainLoopModel);
      let MAX_AGENT_TURNS = 50;
      let hookAgentId = identityAgentId2(`${HOOK_AGENT_ID_PREFIX}${randomUUID()}`);
      let stickyBetas = createStickyBetaLatches();
      let agentToolUseContext = {
        ...y,
        agentId: hookAgentId,
        memoryCaller,
        mcpRequestMeta: stripHostToolMeta(stripMemoryCallMeta(y.mcpRequestMeta)),
        stickyBetas,
        abortController: hookAbortController,
        forPromptShellCommand: undefined,
        permissionModeAtRequest: undefined,
        synthesizedBy: undefined,
        promptShellHandOff: undefined,
        gateIgnoresSwitch: undefined,
        clientRequestedToolUseId: undefined,
        namesShownToApi: undefined,
        permissionLayers: (y.permissionLayers ?? [])
          .filter((vn) => pn || vn.kind !== "effort")
          .concat({
            kind: "model",
            mainLoopModel: rn,
          }),
        readFileState: cloneFileStateCache(y.readFileState, {
          stripSeededFromContext: true,
        }),
        options: {
          ...y.options,
          tools,
          mainLoopModel: rn,
          isNonInteractiveSession: true,
          requiresStructuredOutput: true,
          structuredOutputIsHandback: undefined,
          thinkingConfig: {
            type: "disabled",
            mechanical: true,
          },
          activeMcpServer: undefined,
          activeMcpTool: undefined,
          refreshTools: undefined,
          refreshMcpClients: undefined,
        },
        getAppState() {
          let appState = pn ? y.getAppState() : withoutSessionLevel(y.getAppState());
          let existingSessionRules = appState.toolPermissionContext.alwaysAllowRules.session ?? [];
          return {
            ...appState,
            toolPermissionContext: {
              ...withClassifiedWebCalls(appState.toolPermissionContext, "dontAsk"),
              alwaysAllowRules: {
                ...appState.toolPermissionContext.alwaysAllowRules,
                session:
                  resolvedPath !== undefined
                    ? [...existingSessionRules, `Read(/${resolvedPath})`]
                    : existingSessionRules,
              },
            },
          };
        },
      };
      let structuredOutputResult = null;
      let turnCount = 0;
      let fo = false;
      let To = false;
      let canUseTool = G ? denyDestructiveForHookAgent(hasPermissionsToUseTool) : hasPermissionsToUseTool;
      for await (let message of agentToolUseContext.options.runQuery({
        messages: agentMessages,
        systemPrompt,
        userContext: {},
        systemContext: {},
        canUseTool,
        toolUseContext: agentToolUseContext,
        querySource: "hook_agent",
        stickyBetas,
      })) {
        isNonRenderableSystemMessage(message, {
          onMessage: () => {},
          onUpdateLength: () => {},
          onSetStreamMode: () => {},
          onStreamingToolUses: () => {},
        });
        if (message.type === "stream_event" || message.type === "stream_request_start") continue;
        if (message.type === "assistant") {
          if (turnCount === 0) To = isResendableClientApiError(message);
          turnCount++;
          if (turnCount >= 50) {
            fo = true;
            logForDebugging(`Hooks: Agent turn ${turnCount} hit max turns, aborting`);
            hookAbortController.abort();
            break;
          }
        }
        if (message.type === "attachment" && message.attachment.type === "structured_output") {
          let parsed = hookResponseSchema().safeParse(message.attachment.data);
          if (parsed.success) {
            structuredOutputResult = parsed.data;
            logForDebugging(`Hooks: Got structured output: ${jsonStringify(structuredOutputResult)}`);
            hookAbortController.abort();
            break;
          }
        }
      }
      parentTimeoutSignal.removeEventListener("abort", onParentTimeout);
      cleanupCombinedSignal();
      if (!structuredOutputResult) {
        if (
          To &&
          rn !== mainLoopModel &&
          hook.model !== mainLoopModel &&
          !h.aborted &&
          !isNoModelFallbackEnabled()
        ) {
          logForDebugging(`Hooks: ${rn} was refused, running the agent hook on ${mainLoopModel}`);
          return {
            ...(await execAgentHook(
              {
                ...hook,
                model: mainLoopModel,
              },
              hookName,
              r,
              jsonInput,
              h,
              y,
              toolUseID,
              w,
            )),
            hook,
          };
        }
        if (fo) {
          logForDebugging("Hooks: Agent hook did not complete within 50 turns");
          logEvent("tengu_agent_stop_hook_max_turns", {
            durationMs: Date.now() - hookStartTime,
            turnCount,
            hookEvent: fromEnum(r),
            agentName,
          });
          return {
            hook,
            outcome: "cancelled",
          };
        }
        logForDebugging("Hooks: Agent hook did not return structured output");
        logEvent("tengu_agent_stop_hook_error", {
          durationMs: Date.now() - hookStartTime,
          turnCount,
          errorType: 1,
          hookEvent: fromEnum(r),
          agentName,
        });
        return {
          hook,
          outcome: "cancelled",
        };
      }
      if (!structuredOutputResult.ok) {
        logForDebugging(`Hooks: Agent hook condition was not met: ${structuredOutputResult.reason}`);
        logEvent("tengu_agent_stop_hook_blocking", {
          durationMs: Date.now() - hookStartTime,
          turnCount,
          hookEvent: fromEnum(r),
          agentName,
        });
        return {
          hook,
          outcome: "blocking",
          blockingError: {
            blockingError: `Agent hook condition was not met: ${structuredOutputResult.reason}`,
            command: hook.prompt,
            ...promptEndingFields(r, {
              reason: structuredOutputResult.reason,
            }),
          },
        };
      }
      logForDebugging("Hooks: Agent hook condition was met");
      logEvent("tengu_agent_stop_hook_success", {
        durationMs: Date.now() - hookStartTime,
        turnCount,
        hookEvent: fromEnum(r),
        agentName,
      });
      return {
        hook,
        outcome: "success",
        message: createAttachmentMessage_2({
          type: "hook_success",
          hookName,
          toolUseID: effectiveToolUseID,
          hookEvent: r,
          content: "",
        }),
      };
    } catch (error) {
      parentTimeoutSignal.removeEventListener("abort", onParentTimeout);
      cleanupCombinedSignal();
      if (combinedSignal.aborted)
        return {
          hook,
          outcome: "cancelled",
        };
      throw error;
    }
  } catch (error) {
    let errorMsg = errorMessage(error);
    logForDebugging(`Hooks: Agent hook error: ${errorMsg}`);
    logEvent("tengu_agent_stop_hook_error", {
      durationMs: Date.now() - hookStartTime,
      errorType: 2,
      hookEvent: fromEnum(r),
      agentName,
    });
    return nonBlockingHookErrorResult(hook, {
      hookName,
      toolUseID: effectiveToolUseID,
      hookEvent: r,
      stderr: `Error executing agent hook: ${errorMsg}`,
      stdout: "",
    });
  }
}
export { execAgentHook };
