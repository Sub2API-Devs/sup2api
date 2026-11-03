/**
 * commands/ultraplan.tsx
 *
 * /ultraplan：云端计划会话的提示词变体、文案、启动与同意流程
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/ultraplan.tsx
 * pieces: chunk-aepeg2w5.js (1), chunk-e6aww6q8.js (28), chunk-fym4r1th.js (1), chunk-s61vbvea.js (1)
 * attribution: callgraph-fingerprint 2, placement 9, layout 9, fingerprint 11
 */
import {
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
} from "fs/promises";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { ULTRAPLAN_CHOICE } from "../components/nudges/nudgeIds.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o, U, M } from "../../vendor/zod/v4/classic/schemas.js";
import { isNetworkPath } from "../utils/fsSafety/networkPathCheck.js";
import { t4e, neutralizeForwardedLinks, VF } from "../utils/messages/forwardedTurnSanitize.js";
import { createTaskFramework } from "../utils/task/framework.js";
import { lmn } from "./terminalSetup/index.js";
import { logError } from "../utils/log.js";
import { errorMessage, sanitizeErrorName as sanitizeErrorName_2 } from "../utils/errors.js";
import { archiveRemoteSession } from "../utils/teleport/api.js";
import { logForDebugging } from "../utils/debug.js";
import { mainAgentId, getIsRemoteMode } from "../bootstrap/state.js";
import { saveRejectedUltraplan } from "../utils/plans.js";
import { getDisplayPath } from "../utils/file.js";
import {
  createUserMessage,
  formatCommandInputTags,
  createCommandInputMessage,
  createSystemMessage,
} from "../utils/messages.js";
import { getTranscriptPathForSession, deleteRemoteAgentMetadata } from "../utils/sessionStorage.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { hasBridgeEntitlement } from "../bridge/bridgeEnabled.js";
import { Yon, Xon, Qon } from "../../vendor/bun-resource/index.js";
import { pollForApprovedExitPlanMode, UltraplanPollError } from "../utils/ultraplan/ccrSession.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit as lit_2, fromEnumArr } from "../services/analytics/safeMetadata.js";
import { REMOTE_CONTROL_DISCONNECTED_MSG } from "../bridge/types.js";
import { DIAMOND_GLYPH, Wx, DOWN_ARROW } from "../utils/permissions/autoModeRulesPrompt.js";
import {
  RemoteAgentTask,
  formatPreconditionError,
  checkRemoteSessionEligibility,
  registerRemoteAgentTask,
} from "../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { getRemoteSessionUrl } from "../constants/product.js";
import { env } from "../utils/env.js";
import { isPolicyAllowed as isPolicyAllowed_3 } from "../services/policyLimits/policyEvidence.js";
import { teleportToRemote, launchReadsOnlyTags } from "../utils/teleport.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import { findKeywordTriggerPositions, findBtwTriggerPositions } from "../utils/ultraplan/keyword.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { LOCAL_COMMAND_STDOUT } from "../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../utils/confusables.js";
import { createAbortController } from "../utils/abortController.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { catalogDefaultKeyForFamily } from "../utils/model/classifierModel.js";
import { No } from "../utils/model/modelCatalog.js";
import { findServedModel, Yte } from "../utils/model/modelCatalog/servedCatalog.js";
import { MODEL_KEY_BY_FIRST_PARTY_ID } from "../utils/model/configs.js";
import { fn, qc } from "../utils/model/modelCatalog/catalogCapabilities.js";
import { getTaskOutputPath, getTaskOutputSize, tailTaskOutput } from "../utils/task/diskOutput.js";
import {
  STALL_THRESHOLD_MS,
  STALL_TAIL_BYTES,
  STALL_CHECK_INTERVAL_MS,
} from "../tools/BashTool/bashTelemetry.js";
import { looksLikePrompt } from "../tasks/LocalShellTask/LocalShellTask.js";
import { stripClaudeCodeHints } from "../utils/claudeCodeHints.js";

//@ chunk-e6aww6q8.js:1763752-1763922 placement
var ULTRAPLAN = "ultraplan",
  IKe = withHideWhile({
    kind: ULTRAPLAN_CHOICE,
    payload: DoctorLazy(() => u({ plan: o() })),
    result: DoctorLazy(() => U(["here", "fresh", "cancel", "cancelled"])),
    default: "cancelled",
    hideWhile: ["panel", "draft"],
  });
//@ chunk-e6aww6q8.js:1763922-1764761 placement
async function runUltraplanPoll({
  plan: plan,
  sessionId: sessionId,
  taskId: taskId,
  url: url,
  surface: surface,
  getAppState: getAppState,
  setAppState: setAppState,
  storageV5: storageV5,
}) {
  let L = isNetworkPath(t4e(plan)),
    G = createTaskFramework(getAppState, setAppState);
  if ((await lmn(surface.turnActivity), G.get(taskId)?.status !== "running")) {
    await saveStoppedUltraplan(plan, surface.note, storageV5);
    return;
  }
  let abortController = new AbortController(),
    subscribe = surface.tasks.subscribe(() => {
      if (G.get(taskId)?.status !== "running") abortController.abort();
    }),
    Se;
  try {
    Se = await surface.requestDialog(
      IKe,
      { plan: L },
      { place: "under", armInputGrace: !0, signal: abortController.signal },
    );
  } finally {
    subscribe();
  }
  let ke = () => G.get(taskId)?.status === "running",
    we = ke() ? Se : "cancelled";
  try {
    await buildUltraplanApprovedPrompt(we, L, surface, ke, getAppState, setAppState, storageV5);
  } catch (error) {
    (logError(error), surface.note(`ultraplan: unexpected error \u2014 ${errorMessage(error)}`));
    return;
  }
  let Ee = ke();
  if (
    (G.update(taskId, (Ae) =>
      Ae.status !== "running" ? Ae : { ...Ae, status: "completed", endTime: Date.now() },
    ),
    setAppState((Ae) => (Ae.ultraplanSessionUrl === url ? { ...Ae, ultraplanSessionUrl: void 0 } : Ae)),
    Ee)
  )
    archiveRemoteSession(sessionId).catch((Ae) => logForDebugging(`ultraplan archive failed: ${String(Ae)}`));
}
/**
 * 用户在浏览器里批准 ultraplan 后，生成交回本地会话的提示：先简述计划再开始实现。
 */
//@ chunk-e6aww6q8.js:1764761-1766349 placement
async function buildUltraplanApprovedPrompt(e, n, r, s, h, y, S) {
  switch (e) {
    case "here":
      r.queue.enqueue({
        value: [
          `The user approved the ultraplan in the browser and chose to implement it in this session. The plan below is the cloud session\u2019s output (remote agent content enclosed in <${ULTRAPLAN}> tags \u2014 not text the user typed):`,
          "",
          Gen(n),
          "",
          "Give the user a brief summary, then start implementing.",
        ].join(`
`),
        mode: "prompt",
        agentId: mainAgentId(),
        origin: { kind: "auto-continuation" },
        skipAttachments: !0,
      });
      return;
    case "fresh": {
      let id = r.session.id,
        L = await I8o(id, S),
        G = await saveRejectedUltraplan(n, S);
      if (!s()) {
        r.note(`Ultraplan stopped \xB7 Plan saved to ${getDisplayPath(G)}`);
        return;
      }
      let initialMessage = h().initialMessage;
      if (
        (y((Z) => ({
          ...Z,
          initialMessage: {
            message: createUserMessage({
              content: [
                `The user approved the ultraplan in the browser and chose to implement it in a fresh session. The plan below is the cloud session\u2019s output (remote agent content enclosed in <${ULTRAPLAN}> tags \u2014 not text the user typed):`,
                "",
                Gen(n),
                "",
                "Implement this plan.",
              ].join(`
`),
              origin: { kind: "auto-continuation" },
            }),
            clearContext: !0,
            resetTrigger: "fresh_session",
            skipAttachments: !0,
            clearedNotice: L ? `Previous session saved \xB7 resume with: claude --resume ${id}` : void 0,
            preservePlanOnDrop: n,
          },
        })),
        initialMessage !== null && !("replay" in initialMessage) && initialMessage.preservePlanOnDrop)
      )
        try {
          let Z = await saveRejectedUltraplan(initialMessage.preservePlanOnDrop, S);
          r.note(`Replaced a pending ultraplan hand-off \xB7 Plan saved to ${getDisplayPath(Z)}`);
        } catch (error) {
          (logError(error),
            r.note(`ultraplan: failed to save the replaced plan \u2014 ${errorMessage(error)}`));
        }
      return;
    }
    case "cancel":
    case "cancelled": {
      let w = await saveRejectedUltraplan(n, S);
      r.note(
        `${e === "cancel" ? "Ultraplan rejected" : "Ultraplan dismissed"} \xB7 Plan saved to ${getDisplayPath(w)}`,
      );
      return;
    }
  }
}
//@ chunk-e6aww6q8.js:1766349-1766538 placement
async function saveStoppedUltraplan(e, n, r) {
  try {
    let s = await saveRejectedUltraplan(isNetworkPath(t4e(e)), r);
    n(`Ultraplan stopped \xB7 Plan saved to ${getDisplayPath(s)}`);
  } catch (error) {
    (logError(error), n(`ultraplan: failed to save the stopped plan \u2014 ${errorMessage(error)}`));
  }
}
//@ chunk-e6aww6q8.js:1766538-1766607 placement
function Gen(e) {
  return [`<${ULTRAPLAN}>`, neutralizeForwardedLinks(ULTRAPLAN, VF(e)), `</${ULTRAPLAN}>`].join(`
`);
}
//@ chunk-e6aww6q8.js:1766607-1766669 placement
async function I8o(e, n) {
  return stat_14(getTranscriptPathForSession(e)).then(
    () => !0,
    () => !1,
  );
}
//@ chunk-e6aww6q8.js:1766669-1766739 placement
var qen = ["simple_plan", "visual_plan", "three_subagents_with_critique"];
/**
 * ultraplan 启动对话框的声明：载荷（提示词变体、是否显示条款、提示词、是否经中继投递）与结果（run/cancel/cancelled），默认 cancelled。
 */
//@ chunk-e6aww6q8.js:1766739-1766933 placement
var ULTRAPLAN_LAUNCH_DIALOG = withHideWhile({
  kind: "ultraplan_launch",
  payload: DoctorLazy(() =>
    u({ promptIdentifier: U(qen), showTerms: M(), prompt: o(), deliveredByRelay: M() }),
  ),
  result: DoctorLazy(() => U(["run", "cancel", "cancelled"])),
  default: "cancelled",
});
/**
 * isUltraplanEnabled：tengu_ultraplan_config.enabled 且 bridge 可用且非远程。
 */
//@ chunk-e6aww6q8.js:2014140-2014222 placement
function isUltraplanEnabled() {
  return (
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_ultraplan_config", null)?.enabled === !0 &&
    hasBridgeEntitlement() &&
    !getIsRemoteMode()
  );
}
/**
 * ULTRAPLAN_PROMPTS：simple_plan/visual_plan/three_subagents_with_critique。
 */
//@ chunk-e6aww6q8.js:2014222-2014383 callgraph-fingerprint = CCR_TERMS_URL (0.43)
var CCR_TERMS_URL_ULTRAPLAN = "https://code.claude.com/docs/en/claude-code-on-the-web",
  ULTRAPLAN_PROMPTS = { simple_plan: Yon(), visual_plan: Xon(), three_subagents_with_critique: Qon() },
  DEFAULT_ULTRAPLAN_PROMPT_ID = "simple_plan";
//@ chunk-e6aww6q8.js:2014383-2014415 layout
function isUltraplanPromptId(e) {
  return e in ULTRAPLAN_PROMPTS;
}
/**
 * getUltraplanPromptId：tengu_ultraplan_prompt_identifier。
 */
//@ chunk-e6aww6q8.js:2014415-2014499 layout
function getUltraplanPromptId() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_ultraplan_prompt_identifier",
    DEFAULT_ULTRAPLAN_PROMPT_ID,
  );
  return isUltraplanPromptId(e) ? e : DEFAULT_ULTRAPLAN_PROMPT_ID;
}
//@ chunk-e6aww6q8.js:2014499-2015417 layout
var DEFAULT_ULTRAPLAN_COPY = {
    timeEstimate: "a few minutes",
    dialogBody:
      "Interactive planning on the web where you can edit and leave targeted comments on Claude's plan.",
    dialogPipeline: "Plan \u2192 Edit \u2192 Execute",
    usageBlurb: [
      "Remote plan mode with rich web editing experience.",
      "Runs in a cloud session. When the plan is ready,",
      "you can execute it there or send it back here.",
      "You can continue to work while the plan is generated remotely.",
    ],
  },
  ULTRAPLAN_COPY_BY_PROMPT = {
    simple_plan: DEFAULT_ULTRAPLAN_COPY,
    visual_plan: DEFAULT_ULTRAPLAN_COPY,
    three_subagents_with_critique: {
      timeEstimate: "~10\u201330 min",
      dialogBody:
        "Interactive planning on the web where you can edit and leave targeted comments on Claude's plan.",
      dialogPipeline: "Scope \u2192 Critique \u2192 Edit \u2192 Execute",
      usageBlurb: [
        "Advanced multi-agent plan mode.",
        "Runs in a cloud session. When the plan is ready,",
        "you can execute it there or send it back here.",
        "You can continue to work while the plan is generated remotely.",
      ],
    },
  };
//@ chunk-e6aww6q8.js:2015417-2015454 layout
function getUltraplanCopy(e) {
  return ULTRAPLAN_COPY_BY_PROMPT[e ?? getUltraplanPromptId()];
}
//@ chunk-e6aww6q8.js:2015454-2015533 layout
function getUltraplanPromptText(e) {
  let n = ULTRAPLAN_PROMPTS[e];
  return (typeof n === "string" ? n : n.default).trimEnd();
}
//@ chunk-e6aww6q8.js:2015533-2015669 fingerprint = buildUltraplanPrompt (1)
function buildUltraplanPrompt(e, n, r) {
  let parts = [];
  if (n) parts.push("Here is a draft plan to refine:", "", n, "");
  if ((parts.push(getUltraplanPromptText(r)), e)) parts.push("", e);
  return parts.join(`
`);
}
//@ chunk-e6aww6q8.js:2015669-2018378 fingerprint = startDetachedPoll (0.616)
function startDetachedPoll({
  taskId: taskId,
  sessionId: sessionId,
  url: url,
  getAppState: getAppState,
  setAppState: setAppState,
  surface: surface,
  onStatusMessage: onStatusMessage,
  storageV5: storageV5,
  credentials: credentials,
}) {
  let { queue: queue } = surface,
    q = createTaskFramework(getAppState, setAppState),
    started = Date.now(),
    Se = !1,
    ke = !1;
  (async () => {
    try {
      let {
        plan: plan,
        rejectCount: rejectCount,
        executionTarget: executionTarget,
      } = await pollForApprovedExitPlanMode(
        sessionId,
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_ultraplan_timeout_seconds", 5400) * 1000,
        (phase) => {
          if (q.get(taskId)?.status !== "running") return;
          if (phase === "needs_input") logEvent("tengu_ultraplan_awaiting_input", {});
          if (phase === "plan_ready" && !ke)
            ((ke = !0),
              logEvent("tengu_ultraplan_plan_ready", { duration_ms: Date.now() - started }),
              onStatusMessage?.(buildPlanReadyMessage(url)),
              queue.enqueuePendingNotification({
                value: `The cloud ultraplan session produced a plan and is waiting for approval. Tell the user to open ${url} to review it.`,
                mode: "task-notification",
                agentId: mainAgentId(),
                isMeta: !0,
              }));
          q.update(taskId, (Me) => {
            if (Me.status !== "running") return Me;
            let We = phase === "running" ? void 0 : phase;
            return Me.ultraplanPhase === We ? Me : { ...Me, ultraplanPhase: We };
          });
        },
        () => q.get(taskId)?.status !== "running",
        credentials,
      );
      if (
        (logEvent("tengu_ultraplan_approved", {
          duration_ms: Date.now() - started,
          plan_length: plan.length,
          reject_count: rejectCount,
          execution_target: fromEnum(executionTarget),
        }),
        executionTarget === "remote")
      ) {
        if (q.get(taskId)?.status !== "running") return;
        (deleteRemoteAgentMetadata(taskId, storageV5).catch((Me) =>
          logForDebugging(`ultraplan meta delete failed: ${String(Me)}`),
        ),
          q.update(taskId, (prev) =>
            prev.status !== "running" ? prev : { ...prev, status: "completed", endTime: Date.now() },
          ),
          setAppState((prev) =>
            prev.ultraplanSessionUrl === url ? { ...prev, ultraplanSessionUrl: void 0 } : prev,
          ),
          queue.enqueuePendingNotification({
            value: [
              `Ultraplan approved \u2014 executing in the cloud session. Follow along at: ${url}`,
              "",
              "Results will land as a pull request when the cloud session finishes. There is nothing to do here.",
            ].join(`
`),
            mode: "task-notification",
            agentId: mainAgentId(),
          }));
      } else {
        if (q.get(taskId)?.status !== "running") {
          await saveStoppedUltraplan(plan, surface.note, storageV5);
          return;
        }
        runUltraplanPoll({
          plan: plan,
          sessionId: sessionId,
          taskId: taskId,
          url: url,
          surface: surface,
          getAppState: getAppState,
          setAppState: setAppState,
          storageV5: storageV5,
        }).catch(logError);
      }
    } catch (error) {
      if (q.get(taskId)?.status !== "running") return;
      Se = !0;
      let now = Date.now(),
        Ie = error instanceof UltraplanPollError ? error.eventStats : void 0;
      (logEvent("tengu_ultraplan_failed", {
        duration_ms: now - started,
        reason: fromEnum(error instanceof UltraplanPollError ? error.reason : "network_or_unknown"),
        reject_count: error instanceof UltraplanPollError ? error.rejectCount : void 0,
        events_received: Ie?.eventsReceived,
        first_event_ms: Ie?.firstEventAt !== void 0 ? Ie.firstEventAt - started : void 0,
        last_event_age_ms: Ie?.lastEventAt !== void 0 ? now - Ie.lastEventAt : void 0,
      }),
        queue.enqueuePendingNotification({
          value: `Ultraplan terminated: ${errorMessage(error)}

Session: ${url}`,
          mode: "task-notification",
          agentId: mainAgentId(),
        }),
        queue.enqueuePendingNotification({
          value: "Cloud ultraplan session failed. Wait for the user's next instructions.",
          mode: "task-notification",
          agentId: mainAgentId(),
          isMeta: !0,
        }),
        archiveRemoteSession(sessionId).catch((Me) =>
          logForDebugging(`ultraplan archive failed: ${String(Me)}`),
        ),
        setAppState((prev) =>
          prev.ultraplanSessionUrl === url ? { ...prev, ultraplanSessionUrl: void 0 } : prev,
        ));
    } finally {
      if (Se)
        q.update(taskId, (we) =>
          we.status !== "running" ? we : { ...we, status: "failed", endTime: Date.now() },
        );
    }
  })();
}
//@ chunk-e6aww6q8.js:2018378-2018474 layout
function buildLaunchingMessage(e) {
  let n = e ? `${REMOTE_CONTROL_DISCONNECTED_MSG} ` : "";
  return `${DIAMOND_GLYPH} ultraplan
${n}Starting a cloud session\u2026`;
}
//@ chunk-e6aww6q8.js:2018474-2018636 fingerprint = buildSessionReadyMessage (0.8)
function buildSessionReadyMessage(url) {
  return `${DIAMOND_GLYPH} ultraplan \xB7 Monitor the cloud session at ${url}
You can continue working \u2014 when the ${DIAMOND_GLYPH} fills, press \u2193 to view results`;
}
//@ chunk-e6aww6q8.js:2018636-2018720 layout
function buildPlanReadyMessage(e) {
  return `${Wx} ultraplan ready \xB7 ${e}
Press ${DOWN_ARROW} to view results`;
}
//@ chunk-e6aww6q8.js:2018720-2018878 layout
function getUltraplanUsage() {
  return [
    'Usage: /ultraplan \\<prompt\\>, or include "ultraplan" anywhere',
    "in your prompt",
    "",
    ...getUltraplanCopy().usageBlurb,
    "",
    `Terms: ${CCR_TERMS_URL_ULTRAPLAN}`,
  ].join(`
`);
}
//@ chunk-e6aww6q8.js:2018878-2019065 fingerprint = buildAlreadyActiveMessage (1)
function buildAlreadyActiveMessage(url) {
  return url
    ? `ultraplan: already polling. Open ${url} to check status, or wait for the plan to land here.`
    : "ultraplan: already launching. Please wait for the session to start.";
}
//@ chunk-e6aww6q8.js:2019065-2019611 fingerprint = stopUltraplan (0.899)
async function stopUltraplan(e, n, r, s, h, y) {
  (await RemoteAgentTask.kill(e, r, s, void 0, y),
    s((prev) =>
      prev.ultraplanSessionUrl || prev.ultraplanLaunching
        ? { ...prev, ultraplanSessionUrl: void 0, ultraplanLaunching: void 0 }
        : prev,
    ));
  let S = getRemoteSessionUrl(n, env.SESSION_INGRESS_URL, { from: "cli" });
  (h.enqueuePendingNotification({
    value: `Ultraplan stopped.

Session: ${S}`,
    mode: "task-notification",
    agentId: mainAgentId(),
  }),
    h.enqueuePendingNotification({
      value:
        "The user stopped the ultraplan session above. Do not respond to the stop notification \u2014 wait for their next message.",
      mode: "task-notification",
      agentId: mainAgentId(),
      isMeta: !0,
    }));
}
//@ chunk-e6aww6q8.js:2019611-2020376 fingerprint = launchUltraplan (0.59)
async function launchUltraplan(opts) {
  let {
    arg: arg,
    source: source,
    seedPlan: seedPlan,
    promptIdentifier: promptIdentifier,
    getAppState: getAppState,
    setAppState: setAppState,
    signal: signal,
    disconnectedBridge: disconnectedBridge,
    queue: queue,
    surface: surface,
    onStatusMessage: onStatusMessage,
    storageV5: storageV5,
    credentials: credentials,
  } = opts;
  if (!isPolicyAllowed_3("allow_remote_sessions"))
    return (
      logEvent("tengu_ultraplan_create_failed", { reason: lit_2("policy_blocked") }),
      `ultraplan: ${formatPreconditionError({ type: "policy_blocked" })}`
    );
  let { ultraplanSessionUrl: active, ultraplanLaunching: ultraplanLaunching } = getAppState();
  if (active || ultraplanLaunching)
    return (
      logEvent("tengu_ultraplan_create_failed", {
        reason: lit_2(active ? "already_polling" : "already_launching"),
      }),
      buildAlreadyActiveMessage(active)
    );
  if (!arg && !seedPlan) return getUltraplanUsage();
  return (
    setAppState((prev) => (prev.ultraplanLaunching ? prev : { ...prev, ultraplanLaunching: !0 })),
    launchDetached({
      arg: arg,
      source: source,
      seedPlan: seedPlan,
      promptIdentifier: promptIdentifier,
      getAppState: getAppState,
      setAppState: setAppState,
      signal: signal,
      queue: queue,
      surface: surface,
      onStatusMessage: onStatusMessage,
      storageV5: storageV5,
      credentials: credentials,
    }),
    buildLaunchingMessage(disconnectedBridge)
  );
}
//@ chunk-e6aww6q8.js:2020376-2022801 fingerprint = launchDetached (0.802)
async function launchDetached(opts) {
  let {
      arg: arg,
      source: source,
      seedPlan: seedPlan,
      getAppState: getAppState,
      setAppState: setAppState,
      signal: signal,
      queue: queue,
      surface: surface,
      onStatusMessage: onStatusMessage,
      storageV5: storageV5,
      credentials: credentials,
    } = opts,
    Se;
  try {
    let ke = await checkRemoteSessionEligibility({
      allowBundle: !0,
      storageV5: storageV5,
      credentials: credentials,
    });
    if (!ke.eligible) {
      logEvent("tengu_ultraplan_create_failed", {
        reason: lit_2("precondition"),
        precondition_errors: fromEnumArr(ke.errors.map((error) => error.type)),
      });
      let joined = ke.errors.map(formatPreconditionError).join(`
`);
      queue.enqueuePendingNotification({
        value: `ultraplan: cannot launch cloud session \u2014
${joined}`,
        mode: "task-notification",
        agentId: mainAgentId(),
      });
      return;
    }
    let we = opts.promptIdentifier ?? getUltraplanPromptId(),
      Ee = buildUltraplanPrompt(arg, seedPlan, we),
      Ae,
      Ie,
      Me,
      We = !1,
      session = await teleportToRemote({
        initialMessage: Ee,
        source: "ultraplan",
        tags: launchReadsOnlyTags(),
        description: arg || "Refine local plan",
        permissionMode: "plan",
        ultraplan: !0,
        signal: signal,
        useDefaultEnvironment: !0,
        allowBundle: !0,
        ...{},
        onBundleFail: (nt, pt) => {
          ((Ae = nt), (Ie = pt));
        },
        onCreateFail: (nt, pt) => {
          ((Me = nt), (We = !1));
        },
        storageV5: storageV5,
        credentials: credentials,
      });
    if (!session) {
      let nt = Ae ?? Me;
      (logEvent("tengu_ultraplan_create_failed", {
        reason: fromEnum(Ie ? `${Ie}_fail` : Me ? "create_api_fail" : "teleport_null"),
      }),
        queue.enqueuePendingNotification({
          value: `ultraplan: session creation failed${nt ? ` \u2014 ${nt}` : ". See --debug for details."}`,
          mode: "task-notification",
          agentId: mainAgentId(),
        }));
      return;
    }
    Se = session.id;
    let lt = getRemoteSessionUrl(session.id, env.SESSION_INGRESS_URL, { from: "cli" });
    (setAppState((msg) => ({ ...msg, ultraplanSessionUrl: lt, ultraplanLaunching: void 0 })),
      onStatusMessage?.(buildSessionReadyMessage(lt)),
      logEvent("tengu_ultraplan_launched", {
        has_seed_plan: Boolean(seedPlan),
        prompt_identifier: fromEnum(we),
        source: fromEnum(source),
      }));
    let { taskId: taskId } = registerRemoteAgentTask({
      remoteTaskType: "ultraplan",
      session: { id: session.id, title: arg || "Ultraplan" },
      command: arg,
      context: {
        abortController: new AbortController(),
        taskRegistry: createTaskFramework(getAppState, setAppState),
        storageV5: storageV5,
        credentials: credentials,
      },
      isUltraplan: !0,
    });
    (startDetachedPoll({
      taskId: taskId,
      sessionId: session.id,
      url: lt,
      getAppState: getAppState,
      setAppState: setAppState,
      surface: surface,
      onStatusMessage: onStatusMessage,
      storageV5: storageV5,
      credentials: credentials,
    }),
      registerCleanup(async () => {
        if (getAppState().ultraplanSessionUrl === lt) await archiveRemoteSession(session.id, 1500);
      }));
  } catch (error) {
    if (
      (logError(error),
      logEvent("tengu_ultraplan_create_failed", {
        reason: lit_2("unexpected_error"),
        error_name: sanitizeErrorName_2(error),
      }),
      queue.enqueuePendingNotification({
        value: `ultraplan: unexpected error \u2014 ${errorMessage(error)}`,
        mode: "task-notification",
        agentId: mainAgentId(),
      }),
      queue.enqueuePendingNotification({
        value: "Ultraplan hit an unexpected error during launch. Wait for the user's next instructions.",
        mode: "task-notification",
        agentId: mainAgentId(),
        isMeta: !0,
      }),
      Se)
    )
      (archiveRemoteSession(Se).catch((err) =>
        logForDebugging("ultraplan: failed to archive orphaned session", err),
      ),
        setAppState((prev) => (prev.ultraplanSessionUrl ? { ...prev, ultraplanSessionUrl: void 0 } : prev)));
  } finally {
    setAppState((prev) => (prev.ultraplanLaunching ? { ...prev, ultraplanLaunching: void 0 } : prev));
  }
}
/**
 * call：/ultraplan 的 call（rrn.load 直接给出）。
 */
//@ chunk-e6aww6q8.js:2022801-2023546 fingerprint = call (0.563)
var call = async (e, n, r) => {
    let trimmed = findKeywordTriggerPositions(r).trim();
    if (!isPolicyAllowed_3("allow_remote_sessions"))
      return (e(formatPreconditionError({ type: "policy_blocked" }), { display: "system" }), null);
    let ultraplanSessionUrl = n.options.ultraplanSessionUrl,
      { ultraplanLaunching: ultraplanLaunching } = n.getAppState();
    if (ultraplanSessionUrl || ultraplanLaunching)
      return (
        logEvent("tengu_ultraplan_create_failed", {
          reason: lit_2(ultraplanSessionUrl ? "already_polling" : "already_launching"),
        }),
        e(buildAlreadyActiveMessage(ultraplanSessionUrl), { display: "system" }),
        null
      );
    if (!trimmed) return (e(getUltraplanUsage(), { display: "system" }), null);
    return (
      await runUltraplanConsentFlow({
        arg: trimmed,
        source: n.dispatchedByKeyword ? "keyword" : "slash",
        context: n,
        onDone: e,
      }),
      null
    );
  },
  Vnr = { subscribe: () => () => {}, getSnapshot: () => !1 },
  Ynr = {},
  Xnr = { subscribe: () => () => {}, getSnapshot: () => Ynr },
  ULTRAPLAN_NO_CONSENT_SURFACE =
    "ultraplan asks before it starts a cloud session, and this session can't show that prompt. Run /ultraplan from an interactive Claude Code session.";
//@ chunk-e6aww6q8.js:2023546-2025505 layout
async function runUltraplanConsentFlow({ arg: arg, source: source, context: context, onDone: onDone }) {
  let requestDialog = context.requestDialog;
  if (!requestDialog) {
    (logEvent("tengu_ultraplan_create_failed", { reason: lit_2("no_consent_surface") }),
      onDone(ULTRAPLAN_NO_CONSENT_SURFACE, { display: "system" }));
    return;
  }
  let y = !getGlobalConfig().hasSeenUltraplanTerms,
    S = getUltraplanPromptId(),
    w = await requestDialog(
      ULTRAPLAN_LAUNCH_DIALOG,
      {
        promptIdentifier: S,
        showTerms: y,
        prompt: arg,
        deliveredByRelay: context.submissionVerifiedSlackHumanTurn === !0,
      },
      { place: "under", armInputGrace: !0 },
    ),
    L = w === "run" && Boolean(context.getAppState().replBridgeEnabled);
  logEvent("tengu_ultraplan_dialog_choice", {
    choice: fromEnum(w),
    first_run: y,
    bridge_disconnected: L,
    prompt_identifier: fromEnum(S),
  });
  let G = context.submissionVerifiedSlackHumanTurn ? void 0 : arg;
  if (w === "cancelled") {
    onDone(void 0, { display: "skip", nextInput: G });
    return;
  }
  if (w === "cancel") {
    onDone(void 0, { display: "skip", nextInput: G });
    return;
  }
  if (L)
    context.setAppState((ke) =>
      ke.replBridgeEnabled
        ? {
            ...ke,
            replBridgeEnabled: !1,
            replBridgeExplicit: !1,
            replBridgeOutboundOnly: !1,
            replBridgeSessionGroupingId: void 0,
          }
        : ke,
    );
  if (y)
    (logEvent("tengu_ultraplan_first_launch", { prompt_identifier: fromEnum(S) }),
      saveGlobalConfig(
        (ke) => (ke.hasSeenUltraplanTerms ? ke : { ...ke, hasSeenUltraplanTerms: !0 }),
        context.storageV5,
      ));
  let q = createUserMessage({
    content: formatCommandInputTags("ultraplan", arg),
    origin: context.submissionOrigin,
  });
  if (context.submissionVerifiedSlackHumanTurn) q.verifiedSlackHumanTurn = !0;
  ((q.dispatchEcho = !0), context.applyMessageOp({ type: "append", messages: [q] }));
  let Z,
    Se = (ke) => {
      let we = Z;
      if (
        we !== void 0 &&
        context.getIsResponseStreaming?.() &&
        context.getMessages?.().some((Ae) => Ae.uuid === we) === !1
      )
        return;
      let Ee = createCommandInputMessage(
        `<${LOCAL_COMMAND_STDOUT}>${escapeXml(ke)}</${LOCAL_COMMAND_STDOUT}>`,
      );
      ((Z = Ee.uuid),
        context.applyMessageOp(
          we === void 0
            ? { type: "append", messages: [Ee] }
            : { type: "replace-by-uuid", uuid: we, message: Ee },
        ));
    };
  (launchUltraplan({
    arg: arg,
    source: source,
    promptIdentifier: S,
    getAppState: context.getAppState,
    setAppState: context.setAppState,
    signal: createAbortController().signal,
    disconnectedBridge: L,
    queue: context.messageQueue,
    surface: {
      requestDialog: requestDialog,
      note: (ke) =>
        context.applyMessageOp({ type: "append", messages: [createSystemMessage(ke, "suggestion")] }),
      queue: context.messageQueue,
      turnActivity: context.turnActivity ?? Vnr,
      tasks: context.tasks ?? Xnr,
      session: context.session,
    },
    onStatusMessage: Se,
    storageV5: context.storageV5,
    credentials: context.credentials,
  })
    .then(Se)
    .catch(logError),
    onDone(void 0, { display: "skip" }));
}
/**
 * /ultraplan 命令对象（local-jsx）；描述：{return`Draft an editable plan in a cloud session (${MXn().timeEstimate}) \xB7 See ${wbe}`}；availability ["claude-ai"]；isEnabled: ()=>f6()。
 */
//@ chunk-e6aww6q8.js:2025505-2025765 fingerprint = default (0.563)
var ultraplanCommand = {
  type: "local-jsx",
  name: "ultraplan",
  get description() {
    return `Draft an editable plan in a cloud session (${getUltraplanCopy().timeEstimate}) \xB7 See ${CCR_TERMS_URL_ULTRAPLAN}`;
  },
  argumentHint: "<prompt>",
  availability: ["claude-ai"],
  isEnabled: () => isUltraplanEnabled(),
  load: () => Promise.resolve({ call: call }),
};
//@ chunk-aepeg2w5.js:436484-436867 callgraph-fingerprint = getUltraplanModel (0.333)
function getUltraplanModel(e, n) {
  if (getAPIProvider() === "firstParty") return !1;
  let modelOverrides = getInitialSettings_2().modelOverrides,
    s = catalogDefaultKeyForFamily(e);
  if (s === void 0 || !modelOverrides?.[No[s].firstParty]) return !1;
  let lower = n.toLowerCase(),
    id = (findServedModel(n) ?? { id: n }).id,
    S = Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower) ? MODEL_KEY_BY_FIRST_PARTY_ID[lower] : Yte(id);
  if (S === void 0) return fn(id) && !modelOverrides[id] && !qc(e);
  if (!S.startsWith(e) || !s.startsWith(e)) return !1;
  let keys = Object.keys(No);
  return keys.indexOf(S) < keys.indexOf(s) && !modelOverrides[No[S].firstParty] && !qc(e);
}
//@ chunk-fym4r1th.js:50778-51176 fingerprint = DEFAULT_INSTRUCTIONS (0.696)
function DEFAULT_INSTRUCTIONS(e, s, n) {
  let a = getTaskOutputPath(e),
    r = 0,
    now = Date.now(),
    f = !1,
    m = !1,
    h = setInterval(() => {
      getTaskOutputSize(e).then(
        (g) => {
          if (f) return;
          if (g > r) {
            if (((r = g), (now = Date.now()), m)) ((m = !1), n?.());
            return;
          }
          if (m || Date.now() - now < STALL_THRESHOLD_MS) return;
          tailTaskOutput(a, STALL_TAIL_BYTES).then(
            ({ content: content }) => {
              if (f || m || r !== g) return;
              if (!looksLikePrompt(content)) {
                now = Date.now();
                return;
              }
              if (((m = !0), n === void 0)) ((f = !0), clearInterval(h));
              s(stripClaudeCodeHints(content).trimEnd());
            },
            () => {},
          );
        },
        () => {},
      );
    }, STALL_CHECK_INTERVAL_MS);
  return (
    h.unref(),
    () => {
      ((f = !0), clearInterval(h));
    }
  );
}
//@ chunk-s61vbvea.js:33608-33648 fingerprint = buildLaunchMessage (1)
function buildLaunchMessage(disconnectedBridge) {
  return findBtwTriggerPositions(disconnectedBridge, "ultraplan");
}

export {
  CCR_TERMS_URL_ULTRAPLAN,
  buildLaunchMessage,
  IKe,
  isUltraplanEnabled,
  ULTRAPLAN_LAUNCH_DIALOG,
  stopUltraplan,
  getUltraplanCopy,
  launchUltraplan,
  getUltraplanModel,
  ultraplanCommand,
  DEFAULT_INSTRUCTIONS,
};
