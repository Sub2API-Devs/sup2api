/**
 * remote/tools/serve/callOutcomeText.ts
 *
 * 2.1.316 新增：服务端调用结果/未运行信封与 PostToolUse 钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ad2e1aj6.js (11)
 * attribution: placement 11
 */
import { failedEnvelope } from "./callStatusQuery.js";
import { stoppedBeforeStartMessage } from "../../../services/remoteTools/hostRefusals.js";
import { resultNotes, shapeServedResult, resultSizeLimitsFor } from "./resultShaping.js";
import { refusedEnvelope } from "./backgroundCommands.js";
import { xTe } from "../../../tools/shared/textSearchTools.js";
import { getDefaultAppState_2 } from "../../../state/AppStateStore.js";
import { getMainLoopModel } from "../../../utils/model/model.js";
import { mg } from "../../../utils/messageQueueManager.js";
import { getRootSession } from "../../../bootstrap/state.js";
import { makeSaltedName } from "../../../utils/agentId.js";
import { TOOL_CATALOG } from "../../../tools.js";
import { query } from "../../../query.js";
import { u2 } from "../../../tasks/taskLoopRegistry.js";
import { NOOP_NOTIFICATION_DRAIN } from "../../../services/queuedNotifications/queuedNotifications.js";
import { NOOP_FUNCTION_HOOK_REGISTRY } from "../../../utils/hooks/functionHookNoop.js";
import { artifactReadObservationIn } from "../../../services/artifacts/readObservation.js";
import { Uht, Bht, freeze_2 } from "../../../services/artifacts/artifactReadConsent.js";
import { NOOP_AGENT_NAME_REGISTRY } from "../../../utils/agentNameRegistry.js";
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
import { Aye } from "../../../utils/sandbox/sandboxDefaultPolicy.js";

//@ chunk-ad2e1aj6.js:29729-29810 placement
function io(e) {
  return e.timedOut ? "deadline" : e.shuttingDown() ? "shutdown" : "cancel";
}
//@ chunk-ad2e1aj6.js:29810-30000 placement
function timedOutOrCancelled(e) {
  let { target: target, facts: facts, targetName: targetName, clock: clock, notes: notes } = e;
  return {
    ...failedEnvelope(
      target,
      facts,
      clock.timedOut ? "timed_out" : "cancelled",
      stoppedBeforeStartMessage({ stoppedBy: io(clock), targetName: targetName }),
      { notes: notes.lines() },
    ),
    ranNothing: !0,
  };
}
//@ chunk-ad2e1aj6.js:30000-30172 placement
function stoppedBeforeStart(e) {
  let { target: target, facts: facts, targetName: targetName, clock: clock } = e,
    i = io(clock);
  return {
    ...failedEnvelope(
      target,
      facts,
      i === "deadline" ? "timed_out" : "cancelled",
      stoppedBeforeStartMessage({ stoppedBy: i, targetName: targetName }),
    ),
    ranNothing: !0,
  };
}
//@ chunk-ad2e1aj6.js:30172-31203 placement
function callNotRunEnvelope(e) {
  let { target: target, facts: facts, targetName: targetName, clock: clock } = e,
    i = { notes: e.notes.lines() };
  if (!isPermissionGranted(e)) {
    let y = clock.timedOut
      ? failedEnvelope(
          target,
          facts,
          "timed_out",
          `The call was stopped on ${targetName} at its deadline before the command started (a hook or an approval was still pending) \u2014 nothing ran.`,
          i,
        )
      : failedEnvelope(
          target,
          facts,
          "cancelled",
          clock.shuttingDown()
            ? `The call was stopped because Claude Code on ${targetName} is shutting down, before the command started \u2014 nothing ran.`
            : `The call was cancelled on ${targetName} before the command started (a hook or an approval was still pending) \u2014 nothing ran.`,
          i,
        );
    return e.controller.signal.aborted ? { ...y, ranNothing: !0 } : y;
  }
  return clock.timedOut
    ? failedEnvelope(
        target,
        facts,
        "timed_out",
        `The call did not finish within its deadline on ${targetName} and was stopped \u2014 it may have partially run. Do not retry non-idempotent commands blindly.`,
        i,
      )
    : failedEnvelope(
        target,
        facts,
        "cancelled",
        clock.shuttingDown()
          ? `The call was stopped while it ran because Claude Code on ${targetName} is shutting down \u2014 it may have partially run.`
          : `The call was cancelled while it ran on ${targetName} \u2014 it may have partially run.`,
        i,
      );
}
//@ chunk-ad2e1aj6.js:31203-31314 placement
function isPermissionGranted(e) {
  return e.permissionOutcome?.kind === "allowed" || e.permissionOutcome?.kind === "approved_by_session";
}
//@ chunk-ad2e1aj6.js:31314-32769 placement
function callResultEnvelope(e, n) {
  let {
    target: target,
    facts: facts,
    targetName: targetName,
    callId: callId,
    controller: controller,
    clock: clock,
    toolVerdict: toolVerdict,
    notes: notes,
  } = e;
  if (n === void 0) return callNotRunEnvelope(e);
  if (n.result === void 0)
    return controller.signal.aborted
      ? callNotRunEnvelope(e)
      : failedEnvelope(
          target,
          facts,
          "tool_error",
          `The call produced no result on ${targetName} (one of your hooks there deferred it or returned no result) \u2014 it did not run.`,
          { notes: [...notes.lines(), ...resultNotes(n, targetName)] },
        );
  let C = !n.settledBeforeStop && n.ranToEnd;
  if (!n.settledBeforeStop && !C) return callNotRunEnvelope(e);
  if (toolVerdict !== void 0) {
    let F = { notes: [...notes.lines(), ...resultNotes(n, targetName)] };
    return toolVerdict.verdict.kind === "refused"
      ? refusedEnvelope(target, facts, toolVerdict.verdict.code, toolVerdict.message, F)
      : failedEnvelope(target, facts, toolVerdict.verdict.code, toolVerdict.message, F);
  }
  let P = clock.timedOut
      ? "at the call's deadline"
      : clock.shuttingDown()
        ? "because Claude Code here is shutting down"
        : "when the call was cancelled",
    x = `(output withheld: the command COMPLETED on ${targetName} and was not interrupted. What ran after it here \u2014 a PostToolUse hook, most likely \u2014 was stopped ${P} before it finished, and it may have been meant to check this output, so only the output is withheld. Do not re-run the command just to see the output unless it is safe to repeat.)`,
    Y = shapeServedResult({
      run: C
        ? {
            ...n,
            result: { ...n.result, content: x },
            output: xTe(facts.toolName) ? toBashStyleOutput(n.output, x) : void 0,
            extra: [],
            hookExtra: [],
            notes: [...notes.lines()],
          }
        : { ...n, result: n.result, notes: [...notes.lines(), ...n.notes] },
      toolName: facts.toolName,
      target: target,
      callId: callId,
      targetName: targetName,
      permissionOutcome: e.permissionOutcome,
      budget: resultSizeLimitsFor(facts.arrivedOver),
    });
  return ((facts.truncated = Y.truncated), { envelope: Y.envelope, content: Y.content });
}
//@ chunk-ad2e1aj6.js:32769-32971 placement
function toBashStyleOutput(e, n) {
  if (typeof e !== "object" || e === null) return n;
  let s = Reflect.get(e, "returnCodeInterpretation");
  return {
    stdout: n,
    stderr: "",
    interrupted: !1,
    ...(typeof s === "string" && { returnCodeInterpretation: s }),
  };
}
//@ chunk-ad2e1aj6.js:32971-34520 placement
function servedToolUseContext(e) {
  let n = { ...getDefaultAppState_2(), toolPermissionContext: e.permissionContext },
    s = getMainLoopModel();
  return {
    requestDialog: void 0,
    abortController: e.abortController,
    messageQueue: mg(),
    session: getRootSession().withProject({ cwd: e.cwd }),
    agentContext: { agentType: "main", agentId: makeSaltedName() },
    options: {
      commands: [],
      tools: e.servedTools,
      toolCatalog: TOOL_CATALOG,
      mainLoopModel: s,
      thinkingConfig: { type: "disabled", mechanical: !0 },
      mcpClients: [],
      mcpResources: {},
      isNonInteractiveSession: !0,
      runQuery: query,
      debug: !1,
      verbose: !1,
      agentDefinitions: { activeAgents: [], allAgents: [] },
    },
    getAppState: () => n,
    setAppState: () => {},
    markPrResolvedThisSession: () => {},
    isUltrareviewOverageConfirmed: () => !1,
    markUltrareviewOverageConfirmed: () => {},
    getAdvisorSetting: () => n.advisorModel,
    getMcp: () => n.mcp,
    getProactivityLevel: () => n.proactivityLevel,
    getWebBrowser: () => n.webBrowser,
    setToolPermissionContext: () => {},
    setSessionToolPermissionContext: () => {},
    taskRegistry: u2,
    queuedNotificationsRegistry: NOOP_NOTIFICATION_DRAIN,
    sessionHooksRegistry: NOOP_FUNCTION_HOOK_REGISTRY,
    setWebBrowserSlice: () => {},
    setArtifactReadVersion: () => {},
    getArtifactReadObservation: artifactReadObservationIn(() => n),
    artifactRegistries: Uht(),
    setArtifactContractTarget: () => {},
    getArtifactContractTarget: () => ({ targetSlug: void 0, pins: {} }),
    enqueuePendingMemoryUpdate: () => {},
    agentLifecycle: NOOP_AGENT_NAME_REGISTRY,
    teammateColors: Bht,
    rootToolSurface: { tools: e.servedTools, mainLoopModel: s },
    messages: [],
    turnStartIndex: 0,
    readFileState: e.session.readFileState,
    toolState: e.session.toolState,
    toolDecisions: new Map(),
    permissionRelays: freeze_2,
    getFileHistoryState: () => {
      return;
    },
    applyFileHistoryOp: () => {},
    applyAttributionOp: () => {},
    remoteCall: e.remoteCall,
    requireCanUseTool: !0,
    storageV5: e.storageV5,
  };
}
//@ chunk-ad2e1aj6.js:34520-34590 placement
function servingConsentRequirement(e) {
  if (!isUnattendedOwnRecord(e)) return unattendedStanceKind(e);
  return unattendedServingConsented() ? void 0 : "consent";
}
//@ chunk-ad2e1aj6.js:34590-34705 placement
function isServedPostToolHookEnabled() {
  try {
    let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_violin_endpin",
      !1,
    );
    return e === !0 && source !== "override";
  } catch {
    return !1;
  }
}
//@ chunk-ad2e1aj6.js:34705-35252 placement
function runServedPostToolHook({
  toolName: toolName,
  toolInput: toolInput,
  toolAliases: toolAliases,
  targetName: targetName,
  keep: keep,
}) {
  let i = {
      session_id: "",
      transcript_path: "",
      cwd: "",
      hook_event_name: "PostToolUse",
      tool_name: toolName,
      tool_input: toolInput,
      tool_response: void 0,
      tool_use_id: "",
    },
    y,
    O = !1,
    R = () => {
      if (O || y === void 0) return;
      let [w, C] = y;
      try {
        return getHooksForEvent("PostToolUse").some(
          ({ matcher: matcher, hooks: hooks }) =>
            hooks.some((F) => F.type !== "callback") && hookMatcherMatches(i, matcher, toolAliases),
        ) ||
          dispatchClassicEvent("PostToolUse") ||
          hasModuleHookingSite("tool.call", { tool: toolName })
          ? void 0
          : clipFullOutput(w, unreadableSpillNote({ targetName: targetName, shellToolName: toolName, ...C }));
      } catch (error) {
        ((O = !0), logError(error));
        return;
      }
    };
  return (w, C) => {
    if (O || !Aye()) {
      y = void 0;
      return;
    }
    ((y = [w, C]), keep(R));
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
