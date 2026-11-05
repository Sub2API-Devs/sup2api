/**
 * remote/tools/serve/callOutcomeText.ts
 *
 * 2.1.316 新增：服务端调用结果/未运行信封与 PostToolUse 钩子
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nvm0wye1.js (12)
 * attribution: placement 11, layout 1
 */
import { failedEnvelope } from "./callStatusQuery.js";
import { stoppedBeforeStartMessage } from "../../../services/remoteTools/hostRefusals.js";
import { resultNotes, shapeServedResult, resultSizeLimitsFor } from "./resultShaping.js";
import { refusedEnvelope } from "./backgroundCommands.js";
import { isShellToolName } from "../../../tools/shared/textSearchTools.js";
import { getDefaultAppState_2 } from "../../../state/AppStateStore.js";
import { getMainLoopModel } from "../../../utils/model/model.js";
import { getProcessQueue } from "../../../utils/messageQueueManager.js";
import { getRootSession } from "../../../bootstrap/state.js";
import { makeSaltedName } from "../../../utils/agentId.js";
import { TOOL_CATALOG } from "../../../tools.js";
import { query } from "../../../query.js";
import { UNLIMITED_RATE_LIMITER } from "../../../tasks/taskLoopRegistry.js";
import { NOOP_NOTIFICATION_DRAIN } from "../../../services/queuedNotifications/queuedNotifications.js";
import { NOOP_FUNCTION_HOOK_REGISTRY } from "../../../utils/hooks/functionHookNoop.js";
import { artifactReadObservationIn } from "../../../services/artifacts/readObservation.js";
import { createEmptyArtifactSessionStores } from "../../../services/artifacts/artifactReadConsent.js";
import { NOOP_AGENT_NAME_REGISTRY } from "../../../utils/agentNameRegistry.js";
import { NO_OP_COLOR_ASSIGNER } from "../../../tools/AgentTool/agentColorManager.js";
import { NO_BRIDGE_CONSENT } from "../../../screens/repl/bridgeChannelSlot.js";
import { READ } from "../../../tools/FileReadTool/constants.js";
import { GLOB_TOOL_NAME } from "../../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../../tools/GrepTool/prompt.js";
import { FILE_EDITING_TOOL_NAMES } from "../../../tools/AgentTool/agentLaunch.js";
import { buildMcpToolName } from "../../../services/mcp/mcpStringUtils.js";
import { REMOTE_DEVICES } from "../../../services/mcp/firstPartyServerIds.js";
import { isUnattendedOwnRecord } from "./servedPermissionDecision.js";
import { unattendedStanceKind } from "./servedSafetyChecks.js";
import { unattendedServingConsented } from "../../../services/remoteTools/unattendedConsentStore.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { getHooksForEvent, hookMatcherMatches } from "../../../utils/hooks.js";
import { dispatchClassicEvent } from "../../../plugins/functionHooks/modAdmission.js";
import { hasModuleHookingSite } from "../../../plugins/hooksModules/loadedModuleFilters.js";
import { clipFullOutput } from "./servedShellSettings.js";
import { unreadableSpillNote } from "./outputSpill.js";
import { logError } from "../../../utils/log.js";
import { violinFholeEnabled } from "../../../utils/sandbox/sandboxDefaultPolicy.js";
import { beginDeferredInits } from "../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 3 modules closed by ./serveCall.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/remote/tools/serve/serveCall.js");
//@ chunk-nvm0wye1.js:30071-30152 placement
function stoppedBeforeStartReason(clock) {
  return clock.timedOut ? "deadline" : clock.shuttingDown() ? "shutdown" : "cancel";
}
//@ chunk-nvm0wye1.js:30152-30343 placement
function timedOutOrCancelled(context) {
  let { target, facts, targetName, clock, notes } = context;
  return {
    ...failedEnvelope(
      target,
      facts,
      clock.timedOut ? "timed_out" : "cancelled",
      stoppedBeforeStartMessage({
        stoppedBy: stoppedBeforeStartReason(clock),
        targetName,
      }),
      {
        notes: notes.lines(),
      },
    ),
    ranNothing: true,
  };
}
//@ chunk-nvm0wye1.js:30343-30516 placement
function stoppedBeforeStart(request) {
  let { target, facts, targetName, clock } = request;
  let stopReason = stoppedBeforeStartReason(clock);
  return {
    ...failedEnvelope(
      target,
      facts,
      stopReason === "deadline" ? "timed_out" : "cancelled",
      stoppedBeforeStartMessage({
        stoppedBy: stopReason,
        targetName,
      }),
    ),
    ranNothing: true,
  };
}
//@ chunk-nvm0wye1.js:30516-31551 placement
function callNotRunEnvelope(request) {
  let { target, facts, targetName, clock } = request;
  let envelopeOptions = {
    notes: request.notes.lines(),
  };
  if (!isPermissionGranted(request)) {
    let envelope = clock.timedOut
      ? failedEnvelope(
          target,
          facts,
          "timed_out",
          `The call was stopped on ${targetName} at its deadline before the command started (a hook or an approval was still pending) \u2014 nothing ran.`,
          envelopeOptions,
        )
      : failedEnvelope(
          target,
          facts,
          "cancelled",
          clock.shuttingDown()
            ? `The call was stopped because Claude Code on ${targetName} is shutting down, before the command started \u2014 nothing ran.`
            : `The call was cancelled on ${targetName} before the command started (a hook or an approval was still pending) \u2014 nothing ran.`,
          envelopeOptions,
        );
    return request.controller.signal.aborted
      ? {
          ...envelope,
          ranNothing: true,
        }
      : envelope;
  }
  return clock.timedOut
    ? failedEnvelope(
        target,
        facts,
        "timed_out",
        `The call did not finish within its deadline on ${targetName} and was stopped \u2014 it may have partially run. Do not retry non-idempotent commands blindly.`,
        envelopeOptions,
      )
    : failedEnvelope(
        target,
        facts,
        "cancelled",
        clock.shuttingDown()
          ? `The call was stopped while it ran because Claude Code on ${targetName} is shutting down \u2014 it may have partially run.`
          : `The call was cancelled while it ran on ${targetName} \u2014 it may have partially run.`,
        envelopeOptions,
      );
}
//@ chunk-nvm0wye1.js:31551-31662 placement
function isPermissionGranted(outcome) {
  return (
    outcome.permissionOutcome?.kind === "allowed" || outcome.permissionOutcome?.kind === "approved_by_session"
  );
}
//@ chunk-nvm0wye1.js:31662-33119 placement
function callResultEnvelope(request, outcome) {
  let { target, facts, targetName, callId, controller, clock, toolVerdict, notes } = request;
  if (outcome === undefined) return callNotRunEnvelope(request);
  if (outcome.result === undefined)
    return controller.signal.aborted
      ? callNotRunEnvelope(request)
      : failedEnvelope(
          target,
          facts,
          "tool_error",
          `The call produced no result on ${targetName} (one of your hooks there deferred it or returned no result) \u2014 it did not run.`,
          {
            notes: [...notes.lines(), ...resultNotes(outcome, targetName)],
          },
        );
  let ranToEnd = !outcome.settledBeforeStop && outcome.ranToEnd;
  if (!outcome.settledBeforeStop && !ranToEnd) return callNotRunEnvelope(request);
  if (toolVerdict !== undefined) {
    let envelopeOptions = {
      notes: [...notes.lines(), ...resultNotes(outcome, targetName)],
    };
    return toolVerdict.verdict.kind === "refused"
      ? refusedEnvelope(target, facts, toolVerdict.verdict.code, toolVerdict.message, envelopeOptions)
      : failedEnvelope(target, facts, toolVerdict.verdict.code, toolVerdict.message, envelopeOptions);
  }
  let stopCause = clock.timedOut
    ? "at the call's deadline"
    : clock.shuttingDown()
      ? "because Claude Code here is shutting down"
      : "when the call was cancelled";
  let withheldText = `(output withheld: the command COMPLETED on ${targetName} and was not interrupted. What ran after it here \u2014 a PostToolUse hook, most likely \u2014 was stopped ${stopCause} before it finished, and it may have been meant to check this output, so only the output is withheld. Do not re-run the command just to see the output unless it is safe to repeat.)`;
  let shaped = shapeServedResult({
    run: ranToEnd
      ? {
          ...outcome,
          result: {
            ...outcome.result,
            content: withheldText,
          },
          output: isShellToolName(facts.toolName)
            ? toBashStyleOutput(outcome.output, withheldText)
            : undefined,
          extra: [],
          hookExtra: [],
          notes: [...notes.lines()],
        }
      : {
          ...outcome,
          result: outcome.result,
          notes: [...notes.lines(), ...outcome.notes],
        },
    toolName: facts.toolName,
    target,
    callId,
    targetName,
    permissionOutcome: request.permissionOutcome,
    budget: resultSizeLimitsFor(facts.arrivedOver),
  });
  facts.truncated = shaped.truncated;
  return {
    envelope: shaped.envelope,
    content: shaped.content,
  };
}
//@ chunk-nvm0wye1.js:33119-33321 placement
function toBashStyleOutput(output, text) {
  if (typeof output !== "object" || output === null) return text;
  let interp = Reflect.get(output, "returnCodeInterpretation");
  return {
    stdout: text,
    stderr: "",
    interrupted: false,
    ...(typeof interp === "string" && {
      returnCodeInterpretation: interp,
    }),
  };
}
//@ chunk-nvm0wye1.js:33321-34870 placement
function servedToolUseContext(served) {
  let appState = {
    ...getDefaultAppState_2(),
    toolPermissionContext: served.permissionContext,
  };
  let mainLoopModel = getMainLoopModel();
  return {
    requestDialog: undefined,
    abortController: served.abortController,
    messageQueue: getProcessQueue(),
    session: getRootSession().withProject({
      cwd: served.cwd,
    }),
    agentContext: {
      agentType: "main",
      agentId: makeSaltedName(),
    },
    options: {
      commands: [],
      tools: served.servedTools,
      toolCatalog: TOOL_CATALOG,
      mainLoopModel,
      thinkingConfig: {
        type: "disabled",
        mechanical: true,
      },
      mcpClients: [],
      mcpResources: {},
      isNonInteractiveSession: true,
      runQuery: query,
      debug: false,
      verbose: false,
      agentDefinitions: {
        activeAgents: [],
        allAgents: [],
      },
    },
    getAppState: () => appState,
    setAppState: () => {},
    markPrResolvedThisSession: () => {},
    isUltrareviewOverageConfirmed: () => false,
    markUltrareviewOverageConfirmed: () => {},
    getAdvisorSetting: () => appState.advisorModel,
    getMcp: () => appState.mcp,
    getProactivityLevel: () => appState.proactivityLevel,
    getWebBrowser: () => appState.webBrowser,
    setToolPermissionContext: () => {},
    setSessionToolPermissionContext: () => {},
    taskRegistry: UNLIMITED_RATE_LIMITER,
    queuedNotificationsRegistry: NOOP_NOTIFICATION_DRAIN,
    sessionHooksRegistry: NOOP_FUNCTION_HOOK_REGISTRY,
    setWebBrowserSlice: () => {},
    setArtifactReadVersion: () => {},
    getArtifactReadObservation: artifactReadObservationIn(() => appState),
    artifactRegistries: createEmptyArtifactSessionStores(),
    setArtifactContractTarget: () => {},
    getArtifactContractTarget: () => ({
      targetSlug: undefined,
      pins: {},
    }),
    enqueuePendingMemoryUpdate: () => {},
    agentLifecycle: NOOP_AGENT_NAME_REGISTRY,
    teammateColors: NO_OP_COLOR_ASSIGNER,
    rootToolSurface: {
      tools: served.servedTools,
      mainLoopModel,
    },
    messages: [],
    turnStartIndex: 0,
    readFileState: served.session.readFileState,
    toolState: served.session.toolState,
    toolDecisions: new Map(),
    permissionRelays: NO_BRIDGE_CONSENT,
    getFileHistoryState: () => {
      return;
    },
    applyFileHistoryOp: () => {},
    applyAttributionOp: () => {},
    remoteCall: served.remoteCall,
    requireCanUseTool: true,
    storageV5: served.storageV5,
  };
}
//@ chunk-nvm0wye1.js:34870-34922 layout
var flattened = [READ, GLOB_TOOL_NAME, GREP_TOOL_NAME, ...FILE_EDITING_TOOL_NAMES].flatMap((tool) => [
  tool,
  buildMcpToolName(REMOTE_DEVICES, tool),
]);
//@ chunk-nvm0wye1.js:34922-34992 placement
function servingConsentRequirement(stanceValue) {
  if (!isUnattendedOwnRecord(stanceValue)) return unattendedStanceKind(stanceValue);
  return unattendedServingConsented() ? undefined : "consent";
}
//@ chunk-nvm0wye1.js:34992-35107 placement
function isServedPostToolHookEnabled() {
  try {
    let { value: flagValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_violin_endpin",
      false,
    );
    return flagValue === true && source !== "override";
  } catch {
    return false;
  }
}
//@ chunk-nvm0wye1.js:35107-35654 placement
function runServedPostToolHook({ toolName, toolInput, toolAliases, targetName, keep }) {
  let hookInput = {
    session_id: "",
    transcript_path: "",
    cwd: "",
    hook_event_name: "PostToolUse",
    tool_name: toolName,
    tool_input: toolInput,
    tool_response: undefined,
    tool_use_id: "",
  };
  let latestOutput;
  let hookFailed = false;
  let keepForHook = () => {
    if (hookFailed || latestOutput === undefined) return;
    let [content, meta] = latestOutput;
    try {
      return getHooksForEvent("PostToolUse").some(
        ({ matcher, hooks }) =>
          hooks.some((hook) => hook.type !== "callback") &&
          hookMatcherMatches(hookInput, matcher, toolAliases),
      ) ||
        dispatchClassicEvent("PostToolUse") ||
        hasModuleHookingSite("tool.call", {
          tool: toolName,
        })
        ? undefined
        : clipFullOutput(
            content,
            unreadableSpillNote({
              targetName,
              shellToolName: toolName,
              ...meta,
            }),
          );
    } catch (error) {
      hookFailed = true;
      logError(error);
      return;
    }
  };
  return (content, meta) => {
    if (hookFailed || !violinFholeEnabled()) {
      latestOutput = undefined;
      return;
    }
    latestOutput = [content, meta];
    keep(keepForHook);
  };
}
export {
  servingConsentRequirement,
  callResultEnvelope,
  stoppedBeforeStart,
  timedOutOrCancelled,
  callNotRunEnvelope,
  isPermissionGranted,
  isServedPostToolHookEnabled,
  servedToolUseContext,
  runServedPostToolHook,
};
