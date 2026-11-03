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
import { stat } from "fs/promises";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { ULTRAPLAN_CHOICE } from "../components/nudges/nudgeIds.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string, _enum, M } from "../../vendor/zod/v4/classic/schemas.js";
import { isNetworkPath } from "../utils/fsSafety/networkPathCheck.js";
import {
  normalizeLineBreaks,
  neutralizeForwardedLinks_2,
  indentTurn,
} from "../utils/messages/forwardedTurnSanitize.js";
import { createTaskFramework } from "../utils/task/framework.js";
import { waitForFalse } from "./terminalSetup/index.js";
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
import { DIAMOND_GLYPH, FILLED_DIAMOND_GLYPH, DOWN_ARROW } from "../utils/permissions/autoModeRulesPrompt.js";
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
import { catalogEntriesByFirstPartyId } from "../utils/model/modelCatalog.js";
import { findServedModel, entryModelKey } from "../utils/model/modelCatalog/servedCatalog.js";
import { MODEL_KEY_BY_FIRST_PARTY_ID } from "../utils/model/configs.js";
import {
  hasDescribableCatalogModel,
  isAliasFamilyUnavailable,
} from "../utils/model/modelCatalog/catalogCapabilities.js";
import { getTaskOutputPath, getTaskOutputSize, tailTaskOutput } from "../utils/task/diskOutput.js";
import {
  STALL_THRESHOLD_MS,
  STALL_TAIL_BYTES,
  STALL_CHECK_INTERVAL_MS,
} from "../tools/BashTool/bashTelemetry.js";
import { looksLikePrompt } from "../tasks/LocalShellTask/LocalShellTask.js";
import { stripClaudeCodeHints } from "../utils/claudeCodeHints.js";

//@ chunk-e6aww6q8.js:1763752-1763922 placement
/**
 * ultraplan-choice 对话框 spec：kind 为 ULTRAPLAN_CHOICE，载荷为 {plan}。
 */
var ULTRAPLAN = "ultraplan";
var ULTRAPLAN_CHOICE_DIALOG_SPEC = withHideWhile({
  kind: ULTRAPLAN_CHOICE,
  payload: DoctorLazy(() =>
    u({
      plan: string(),
    }),
  ),
  result: DoctorLazy(() => _enum(["here", "fresh", "cancel", "cancelled"])),
  default: "cancelled",
  hideWhile: ["panel", "draft"],
});
//@ chunk-e6aww6q8.js:1763922-1764761 placement
async function runUltraplanPoll({
  plan,
  sessionId,
  taskId,
  url,
  surface,
  getAppState,
  setAppState,
  storageV5,
}) {
  let L = isNetworkPath(normalizeLineBreaks(plan));
  let taskFramework = createTaskFramework(getAppState, setAppState);
  await waitForFalse(surface.turnActivity);
  if (taskFramework.get(taskId)?.status !== "running") {
    await saveStoppedUltraplan(plan, surface.note, storageV5);
    return;
  }
  let abortController = new AbortController();
  let Z = surface.tasks.subscribe(() => {
    if (taskFramework.get(taskId)?.status !== "running") abortController.abort();
  });
  let Se;
  try {
    Se = await surface.requestDialog(
      ULTRAPLAN_CHOICE_DIALOG_SPEC,
      {
        plan: L,
      },
      {
        place: "under",
        armInputGrace: true,
        signal: abortController.signal,
      },
    );
  } finally {
    Z();
  }
  let ke = () => taskFramework.get(taskId)?.status === "running";
  let we = ke() ? Se : "cancelled";
  try {
    await buildUltraplanApprovedPrompt(we, L, surface, ke, getAppState, setAppState, storageV5);
  } catch (error) {
    logError(error);
    surface.note(`ultraplan: unexpected error \u2014 ${errorMessage(error)}`);
    return;
  }
  let Ee = ke();
  taskFramework.update(taskId, (Ae) =>
    Ae.status !== "running"
      ? Ae
      : {
          ...Ae,
          status: "completed",
          endTime: Date.now(),
        },
  );
  setAppState((Ae) =>
    Ae.ultraplanSessionUrl === url
      ? {
          ...Ae,
          ultraplanSessionUrl: undefined,
        }
      : Ae,
  );
  if (Ee)
    archiveRemoteSession(sessionId).catch((error) =>
      logForDebugging(`ultraplan archive failed: ${String(error)}`),
    );
}
//@ chunk-e6aww6q8.js:1764761-1766349 placement
/**
 * 用户在浏览器里批准 ultraplan 后，生成交回本地会话的提示：先简述计划再开始实现。
 */
async function buildUltraplanApprovedPrompt(e, n, surface, s, getAppState, setAppState, storageV5) {
  switch (e) {
    case "here":
      surface.queue.enqueue({
        value: [
          `The user approved the ultraplan in the browser and chose to implement it in this session. The plan below is the cloud session\u2019s output (remote agent content enclosed in <${ULTRAPLAN}> tags \u2014 not text the user typed):`,
          "",
          formatUltraplanBlock(n),
          "",
          "Give the user a brief summary, then start implementing.",
        ].join(`
`),
        mode: "prompt",
        agentId: mainAgentId(),
        origin: {
          kind: "auto-continuation",
        },
        skipAttachments: true,
      });
      return;
    case "fresh": {
      let id = surface.session.id;
      let L = await transcriptFileExists(id, storageV5);
      let G = await saveRejectedUltraplan(n, storageV5);
      if (!s()) {
        surface.note(`Ultraplan stopped \xB7 Plan saved to ${getDisplayPath(G)}`);
        return;
      }
      let initialMessage = getAppState().initialMessage;
      setAppState((Z) => ({
        ...Z,
        initialMessage: {
          message: createUserMessage({
            content: [
              `The user approved the ultraplan in the browser and chose to implement it in a fresh session. The plan below is the cloud session\u2019s output (remote agent content enclosed in <${ULTRAPLAN}> tags \u2014 not text the user typed):`,
              "",
              formatUltraplanBlock(n),
              "",
              "Implement this plan.",
            ].join(`
`),
            origin: {
              kind: "auto-continuation",
            },
          }),
          clearContext: true,
          resetTrigger: "fresh_session",
          skipAttachments: true,
          clearedNotice: L ? `Previous session saved \xB7 resume with: claude --resume ${id}` : undefined,
          preservePlanOnDrop: n,
        },
      }));
      if (initialMessage !== null && !("replay" in initialMessage) && initialMessage.preservePlanOnDrop)
        try {
          let Z = await saveRejectedUltraplan(initialMessage.preservePlanOnDrop, storageV5);
          surface.note(`Replaced a pending ultraplan hand-off \xB7 Plan saved to ${getDisplayPath(Z)}`);
        } catch (error) {
          logError(error);
          surface.note(`ultraplan: failed to save the replaced plan \u2014 ${errorMessage(error)}`);
        }
      return;
    }
    case "cancel":
    case "cancelled": {
      let w = await saveRejectedUltraplan(n, storageV5);
      surface.note(
        `${e === "cancel" ? "Ultraplan rejected" : "Ultraplan dismissed"} \xB7 Plan saved to ${getDisplayPath(w)}`,
      );
      return;
    }
  }
}
//@ chunk-e6aww6q8.js:1766349-1766538 placement
async function saveStoppedUltraplan(plan, note, storageV5) {
  try {
    let s = await saveRejectedUltraplan(isNetworkPath(normalizeLineBreaks(plan)), storageV5);
    note(`Ultraplan stopped \xB7 Plan saved to ${getDisplayPath(s)}`);
  } catch (error) {
    logError(error);
    note(`ultraplan: failed to save the stopped plan \u2014 ${errorMessage(error)}`);
  }
}
//@ chunk-e6aww6q8.js:1766538-1766607 placement
function formatUltraplanBlock(e) {
  return [`<${ULTRAPLAN}>`, neutralizeForwardedLinks_2(ULTRAPLAN, indentTurn(e)), `</${ULTRAPLAN}>`].join(`
`);
}
//@ chunk-e6aww6q8.js:1766607-1766669 placement
async function transcriptFileExists(id, n) {
  return stat(getTranscriptPathForSession(id)).then(
    () => true,
    () => false,
  );
}
//@ chunk-e6aww6q8.js:1766669-1766739 placement
var ULTRAPLAN_PROMPT_VARIANTS = ["simple_plan", "visual_plan", "three_subagents_with_critique"];
//@ chunk-e6aww6q8.js:1766739-1766933 placement
/**
 * ultraplan 启动对话框的声明：载荷（提示词变体、是否显示条款、提示词、是否经中继投递）与结果（run/cancel/cancelled），默认 cancelled。
 */
var ULTRAPLAN_LAUNCH_DIALOG = withHideWhile({
  kind: "ultraplan_launch",
  payload: DoctorLazy(() =>
    u({
      promptIdentifier: _enum(ULTRAPLAN_PROMPT_VARIANTS),
      showTerms: M(),
      prompt: string(),
      deliveredByRelay: M(),
    }),
  ),
  result: DoctorLazy(() => _enum(["run", "cancel", "cancelled"])),
  default: "cancelled",
});
//@ chunk-e6aww6q8.js:2014140-2014222 placement
/**
 * isUltraplanEnabled：tengu_ultraplan_config.enabled 且 bridge 可用且非远程。
 */
function isUltraplanEnabled() {
  return (
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_ultraplan_config", null)?.enabled === true &&
    hasBridgeEntitlement() &&
    !getIsRemoteMode()
  );
}
//@ chunk-e6aww6q8.js:2014222-2014383 callgraph-fingerprint = CCR_TERMS_URL (0.43)
/**
 * ULTRAPLAN_PROMPTS：simple_plan/visual_plan/three_subagents_with_critique。
 */
var CCR_TERMS_URL_ULTRAPLAN = "https://code.claude.com/docs/en/claude-code-on-the-web";
var ULTRAPLAN_PROMPTS = {
  simple_plan: Yon(),
  visual_plan: Xon(),
  three_subagents_with_critique: Qon(),
};
var DEFAULT_ULTRAPLAN_PROMPT_ID = "simple_plan";
//@ chunk-e6aww6q8.js:2014383-2014415 layout
function isUltraplanPromptId(featureValue_CACHED_MAY_BE_STALE) {
  return featureValue_CACHED_MAY_BE_STALE in ULTRAPLAN_PROMPTS;
}
//@ chunk-e6aww6q8.js:2014415-2014499 layout
/**
 * getUltraplanPromptId：tengu_ultraplan_prompt_identifier。
 */
function getUltraplanPromptId() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_ultraplan_prompt_identifier",
    DEFAULT_ULTRAPLAN_PROMPT_ID,
  );
  return isUltraplanPromptId(featureValue_CACHED_MAY_BE_STALE)
    ? featureValue_CACHED_MAY_BE_STALE
    : DEFAULT_ULTRAPLAN_PROMPT_ID;
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
};
var ULTRAPLAN_COPY_BY_PROMPT = {
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
function getUltraplanCopy(promptIdentifier) {
  return ULTRAPLAN_COPY_BY_PROMPT[promptIdentifier ?? getUltraplanPromptId()];
}
//@ chunk-e6aww6q8.js:2015454-2015533 layout
function getUltraplanPromptText(e) {
  let n = ULTRAPLAN_PROMPTS[e];
  return (typeof n === "string" ? n : n.default).trimEnd();
}
//@ chunk-e6aww6q8.js:2015533-2015669 fingerprint = buildUltraplanPrompt (1)
function buildUltraplanPrompt(blurb, seedPlan, r) {
  let parts = [];
  if (seedPlan) parts.push("Here is a draft plan to refine:", "", seedPlan, "");
  parts.push(getUltraplanPromptText(r));
  if (blurb) parts.push("", blurb);
  return parts.join(`
`);
}
//@ chunk-e6aww6q8.js:2015669-2018378 fingerprint = startDetachedPoll (0.616)
function startDetachedPoll({
  taskId,
  sessionId,
  url,
  getAppState,
  setAppState,
  surface,
  onStatusMessage,
  storageV5,
  credentials,
}) {
  let { queue } = surface;
  let taskFramework = createTaskFramework(getAppState, setAppState);
  let started = Date.now();
  let Se = false;
  let ke = false;
  (async () => {
    try {
      let { plan, rejectCount, executionTarget } = await pollForApprovedExitPlanMode(
        sessionId,
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_ultraplan_timeout_seconds", 5400) * 1000,
        (phase) => {
          if (taskFramework.get(taskId)?.status !== "running") return;
          if (phase === "needs_input") logEvent("tengu_ultraplan_awaiting_input", {});
          if (phase === "plan_ready" && !ke) {
            ke = true;
            logEvent("tengu_ultraplan_plan_ready", {
              duration_ms: Date.now() - started,
            });
            onStatusMessage?.(buildPlanReadyMessage(url));
            queue.enqueuePendingNotification({
              value: `The cloud ultraplan session produced a plan and is waiting for approval. Tell the user to open ${url} to review it.`,
              mode: "task-notification",
              agentId: mainAgentId(),
              isMeta: true,
            });
          }
          taskFramework.update(taskId, (t) => {
            if (t.status !== "running") return t;
            let next = phase === "running" ? undefined : phase;
            return t.ultraplanPhase === next
              ? t
              : {
                  ...t,
                  ultraplanPhase: next,
                };
          });
        },
        () => taskFramework.get(taskId)?.status !== "running",
        credentials,
      );
      logEvent("tengu_ultraplan_approved", {
        duration_ms: Date.now() - started,
        plan_length: plan.length,
        reject_count: rejectCount,
        execution_target: fromEnum(executionTarget),
      });
      if (executionTarget === "remote") {
        if (taskFramework.get(taskId)?.status !== "running") return;
        deleteRemoteAgentMetadata(taskId, storageV5).catch((error) =>
          logForDebugging(`ultraplan meta delete failed: ${String(error)}`),
        );
        taskFramework.update(taskId, (t) =>
          t.status !== "running"
            ? t
            : {
                ...t,
                status: "completed",
                endTime: Date.now(),
              },
        );
        setAppState((prev) =>
          prev.ultraplanSessionUrl === url
            ? {
                ...prev,
                ultraplanSessionUrl: undefined,
              }
            : prev,
        );
        queue.enqueuePendingNotification({
          value: [
            `Ultraplan approved \u2014 executing in the cloud session. Follow along at: ${url}`,
            "",
            "Results will land as a pull request when the cloud session finishes. There is nothing to do here.",
          ].join(`
`),
          mode: "task-notification",
          agentId: mainAgentId(),
        });
      } else {
        if (taskFramework.get(taskId)?.status !== "running") {
          await saveStoppedUltraplan(plan, surface.note, storageV5);
          return;
        }
        runUltraplanPoll({
          plan,
          sessionId,
          taskId,
          url,
          surface,
          getAppState,
          setAppState,
          storageV5,
        }).catch(logError);
      }
    } catch (e) {
      if (taskFramework.get(taskId)?.status !== "running") return;
      Se = true;
      let now = Date.now();
      let eventStats = e instanceof UltraplanPollError ? e.eventStats : undefined;
      logEvent("tengu_ultraplan_failed", {
        duration_ms: now - started,
        reason: fromEnum(e instanceof UltraplanPollError ? e.reason : "network_or_unknown"),
        reject_count: e instanceof UltraplanPollError ? e.rejectCount : undefined,
        events_received: eventStats?.eventsReceived,
        first_event_ms:
          eventStats?.firstEventAt !== undefined ? eventStats.firstEventAt - started : undefined,
        last_event_age_ms: eventStats?.lastEventAt !== undefined ? now - eventStats.lastEventAt : undefined,
      });
      queue.enqueuePendingNotification({
        value: `Ultraplan terminated: ${errorMessage(e)}

Session: ${url}`,
        mode: "task-notification",
        agentId: mainAgentId(),
      });
      queue.enqueuePendingNotification({
        value: "Cloud ultraplan session failed. Wait for the user's next instructions.",
        mode: "task-notification",
        agentId: mainAgentId(),
        isMeta: true,
      });
      archiveRemoteSession(sessionId).catch((e) => logForDebugging(`ultraplan archive failed: ${String(e)}`));
      setAppState((prev) =>
        prev.ultraplanSessionUrl === url
          ? {
              ...prev,
              ultraplanSessionUrl: undefined,
            }
          : prev,
      );
    } finally {
      if (Se)
        taskFramework.update(taskId, (t) =>
          t.status !== "running"
            ? t
            : {
                ...t,
                status: "failed",
                endTime: Date.now(),
              },
        );
    }
  })();
}
//@ chunk-e6aww6q8.js:2018378-2018474 layout
function buildLaunchingMessage(disconnectedBridge) {
  let prefix = disconnectedBridge ? `${REMOTE_CONTROL_DISCONNECTED_MSG} ` : "";
  return `${DIAMOND_GLYPH} ultraplan
${prefix}Starting a cloud session\u2026`;
}
//@ chunk-e6aww6q8.js:2018474-2018636 fingerprint = buildSessionReadyMessage (0.8)
function buildSessionReadyMessage(url) {
  return `${DIAMOND_GLYPH} ultraplan \xB7 Monitor the cloud session at ${url}
You can continue working \u2014 when the ${DIAMOND_GLYPH} fills, press \u2193 to view results`;
}
//@ chunk-e6aww6q8.js:2018636-2018720 layout
function buildPlanReadyMessage(url) {
  return `${FILLED_DIAMOND_GLYPH} ultraplan ready \xB7 ${url}
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
async function stopUltraplan(taskId, sessionId, setAppState, s, h, storageV5) {
  await RemoteAgentTask.kill(taskId, setAppState, s, undefined, storageV5);
  s((prev) =>
    prev.ultraplanSessionUrl || prev.ultraplanLaunching
      ? {
          ...prev,
          ultraplanSessionUrl: undefined,
          ultraplanLaunching: undefined,
        }
      : prev,
  );
  let url = getRemoteSessionUrl(sessionId, env.SESSION_INGRESS_URL, {
    from: "cli",
  });
  h.enqueuePendingNotification({
    value: `Ultraplan stopped.

Session: ${url}`,
    mode: "task-notification",
    agentId: mainAgentId(),
  });
  h.enqueuePendingNotification({
    value:
      "The user stopped the ultraplan session above. Do not respond to the stop notification \u2014 wait for their next message.",
    mode: "task-notification",
    agentId: mainAgentId(),
    isMeta: true,
  });
}
//@ chunk-e6aww6q8.js:2019611-2020376 fingerprint = launchUltraplan (0.59)
async function launchUltraplan(opts) {
  let {
    arg,
    source,
    seedPlan,
    promptIdentifier,
    getAppState,
    setAppState,
    signal,
    disconnectedBridge,
    queue,
    surface,
    onStatusMessage,
    storageV5,
    credentials,
  } = opts;
  if (!isPolicyAllowed_3("allow_remote_sessions")) {
    logEvent("tengu_ultraplan_create_failed", {
      reason: lit_2("policy_blocked"),
    });
    return `ultraplan: ${formatPreconditionError({
      type: "policy_blocked",
    })}`;
  }
  let { ultraplanSessionUrl: active, ultraplanLaunching } = getAppState();
  if (active || ultraplanLaunching) {
    logEvent("tengu_ultraplan_create_failed", {
      reason: lit_2(active ? "already_polling" : "already_launching"),
    });
    return buildAlreadyActiveMessage(active);
  }
  if (!arg && !seedPlan) return getUltraplanUsage();
  setAppState((prev) =>
    prev.ultraplanLaunching
      ? prev
      : {
          ...prev,
          ultraplanLaunching: true,
        },
  );
  launchDetached({
    arg,
    source,
    seedPlan,
    promptIdentifier,
    getAppState,
    setAppState,
    signal,
    queue,
    surface,
    onStatusMessage,
    storageV5,
    credentials,
  });
  return buildLaunchingMessage(disconnectedBridge);
}
//@ chunk-e6aww6q8.js:2020376-2022801 fingerprint = launchDetached (0.802)
async function launchDetached(opts) {
  let {
    arg: blurb,
    source,
    seedPlan,
    getAppState,
    setAppState,
    signal,
    queue,
    surface,
    onStatusMessage,
    storageV5,
    credentials,
  } = opts;
  let sessionId;
  try {
    let ke = await checkRemoteSessionEligibility({
      allowBundle: true,
      storageV5,
      credentials,
    });
    if (!ke.eligible) {
      logEvent("tengu_ultraplan_create_failed", {
        reason: lit_2("precondition"),
        precondition_errors: fromEnumArr(ke.errors.map((e) => e.type)),
      });
      let reasons = ke.errors.map(formatPreconditionError).join(`
`);
      queue.enqueuePendingNotification({
        value: `ultraplan: cannot launch cloud session \u2014
${reasons}`,
        mode: "task-notification",
        agentId: mainAgentId(),
      });
      return;
    }
    let we = opts.promptIdentifier ?? getUltraplanPromptId();
    let initialMessage = buildUltraplanPrompt(blurb, seedPlan, we);
    let Ae;
    let Ie;
    let Me;
    let We = false;
    let session = await teleportToRemote({
      initialMessage,
      source: "ultraplan",
      tags: launchReadsOnlyTags(),
      description: blurb || "Refine local plan",
      permissionMode: "plan",
      ultraplan: true,
      signal,
      useDefaultEnvironment: true,
      allowBundle: true,
      ...{},
      onBundleFail: (msg, pt) => {
        Ae = msg;
        Ie = pt;
      },
      onCreateFail: (nt, pt) => {
        Me = nt;
        We = false;
      },
      storageV5,
      credentials,
    });
    if (!session) {
      let nt = Ae ?? Me;
      logEvent("tengu_ultraplan_create_failed", {
        reason: fromEnum(Ie ? `${Ie}_fail` : Me ? "create_api_fail" : "teleport_null"),
      });
      queue.enqueuePendingNotification({
        value: `ultraplan: session creation failed${nt ? ` \u2014 ${nt}` : ". See --debug for details."}`,
        mode: "task-notification",
        agentId: mainAgentId(),
      });
      return;
    }
    sessionId = session.id;
    let url = getRemoteSessionUrl(session.id, env.SESSION_INGRESS_URL, {
      from: "cli",
    });
    setAppState((prev) => ({
      ...prev,
      ultraplanSessionUrl: url,
      ultraplanLaunching: undefined,
    }));
    onStatusMessage?.(buildSessionReadyMessage(url));
    logEvent("tengu_ultraplan_launched", {
      has_seed_plan: Boolean(seedPlan),
      prompt_identifier: fromEnum(we),
      source: fromEnum(source),
    });
    let { taskId } = registerRemoteAgentTask({
      remoteTaskType: "ultraplan",
      session: {
        id: session.id,
        title: blurb || "Ultraplan",
      },
      command: blurb,
      context: {
        abortController: new AbortController(),
        taskRegistry: createTaskFramework(getAppState, setAppState),
        storageV5,
        credentials,
      },
      isUltraplan: true,
    });
    startDetachedPoll({
      taskId,
      sessionId: session.id,
      url,
      getAppState,
      setAppState,
      surface,
      onStatusMessage,
      storageV5,
      credentials,
    });
    registerCleanup(async () => {
      if (getAppState().ultraplanSessionUrl === url) await archiveRemoteSession(session.id, 1500);
    });
  } catch (e) {
    logError(e);
    logEvent("tengu_ultraplan_create_failed", {
      reason: lit_2("unexpected_error"),
      error_name: sanitizeErrorName_2(e),
    });
    queue.enqueuePendingNotification({
      value: `ultraplan: unexpected error \u2014 ${errorMessage(e)}`,
      mode: "task-notification",
      agentId: mainAgentId(),
    });
    queue.enqueuePendingNotification({
      value: "Ultraplan hit an unexpected error during launch. Wait for the user's next instructions.",
      mode: "task-notification",
      agentId: mainAgentId(),
      isMeta: true,
    });
    if (sessionId) {
      archiveRemoteSession(sessionId).catch((err) =>
        logForDebugging("ultraplan: failed to archive orphaned session", err),
      );
      setAppState((prev) =>
        prev.ultraplanSessionUrl
          ? {
              ...prev,
              ultraplanSessionUrl: undefined,
            }
          : prev,
      );
    }
  } finally {
    setAppState((prev) =>
      prev.ultraplanLaunching
        ? {
            ...prev,
            ultraplanLaunching: undefined,
          }
        : prev,
    );
  }
}
//@ chunk-e6aww6q8.js:2022801-2023546 fingerprint = call (0.563)
/**
 * call：/ultraplan 的 call（rrn.load 直接给出）。
 */
var call = async (e, n, args) => {
  let trimmed = findKeywordTriggerPositions(args).trim();
  if (!isPolicyAllowed_3("allow_remote_sessions")) {
    e(
      formatPreconditionError({
        type: "policy_blocked",
      }),
      {
        display: "system",
      },
    );
    return null;
  }
  let active = n.options.ultraplanSessionUrl;
  let { ultraplanLaunching } = n.getAppState();
  if (active || ultraplanLaunching) {
    logEvent("tengu_ultraplan_create_failed", {
      reason: lit_2(active ? "already_polling" : "already_launching"),
    });
    e(buildAlreadyActiveMessage(active), {
      display: "system",
    });
    return null;
  }
  if (!trimmed) {
    e(getUltraplanUsage(), {
      display: "system",
    });
    return null;
  }
  await runUltraplanConsentFlow({
    arg: trimmed,
    source: n.dispatchedByKeyword ? "keyword" : "slash",
    context: n,
    onDone: e,
  });
  return null;
};
var NO_TURN_ACTIVITY = {
  subscribe: () => () => {},
  getSnapshot: () => false,
};
var EMPTY_TASKS_SNAPSHOT = {};
var EMPTY_TASKS_STORE = {
  subscribe: () => () => {},
  getSnapshot: () => EMPTY_TASKS_SNAPSHOT,
};
var ULTRAPLAN_NO_CONSENT_SURFACE =
  "ultraplan asks before it starts a cloud session, and this session can't show that prompt. Run /ultraplan from an interactive Claude Code session.";
//@ chunk-e6aww6q8.js:2023546-2025505 layout
async function runUltraplanConsentFlow({ arg, source, context, onDone }) {
  let requestDialog = context.requestDialog;
  if (!requestDialog) {
    logEvent("tengu_ultraplan_create_failed", {
      reason: lit_2("no_consent_surface"),
    });
    onDone(ULTRAPLAN_NO_CONSENT_SURFACE, {
      display: "system",
    });
    return;
  }
  let y = !getGlobalConfig().hasSeenUltraplanTerms;
  let ultraplanPromptId = getUltraplanPromptId();
  let w = await requestDialog(
    ULTRAPLAN_LAUNCH_DIALOG,
    {
      promptIdentifier: ultraplanPromptId,
      showTerms: y,
      prompt: arg,
      deliveredByRelay: context.submissionVerifiedSlackHumanTurn === true,
    },
    {
      place: "under",
      armInputGrace: true,
    },
  );
  let L = w === "run" && Boolean(context.getAppState().replBridgeEnabled);
  logEvent("tengu_ultraplan_dialog_choice", {
    choice: fromEnum(w),
    first_run: y,
    bridge_disconnected: L,
    prompt_identifier: fromEnum(ultraplanPromptId),
  });
  let nextInput = context.submissionVerifiedSlackHumanTurn ? undefined : arg;
  if (w === "cancelled") {
    onDone(undefined, {
      display: "skip",
      nextInput,
    });
    return;
  }
  if (w === "cancel") {
    onDone(undefined, {
      display: "skip",
      nextInput,
    });
    return;
  }
  if (L)
    context.setAppState((ke) =>
      ke.replBridgeEnabled
        ? {
            ...ke,
            replBridgeEnabled: false,
            replBridgeExplicit: false,
            replBridgeOutboundOnly: false,
            replBridgeSessionGroupingId: undefined,
          }
        : ke,
    );
  if (y) {
    logEvent("tengu_ultraplan_first_launch", {
      prompt_identifier: fromEnum(ultraplanPromptId),
    });
    saveGlobalConfig(
      (ke) =>
        ke.hasSeenUltraplanTerms
          ? ke
          : {
              ...ke,
              hasSeenUltraplanTerms: true,
            },
      context.storageV5,
    );
  }
  let userMessage = createUserMessage({
    content: formatCommandInputTags("ultraplan", arg),
    origin: context.submissionOrigin,
  });
  if (context.submissionVerifiedSlackHumanTurn) userMessage.verifiedSlackHumanTurn = true;
  userMessage.dispatchEcho = true;
  context.applyMessageOp({
    type: "append",
    messages: [userMessage],
  });
  let Z;
  let Se = (ke) => {
    let we = Z;
    if (
      we !== undefined &&
      context.getIsResponseStreaming?.() &&
      context.getMessages?.().some((Ae) => Ae.uuid === we) === false
    )
      return;
    let commandInputMessage = createCommandInputMessage(
      `<${LOCAL_COMMAND_STDOUT}>${escapeXml(ke)}</${LOCAL_COMMAND_STDOUT}>`,
    );
    Z = commandInputMessage.uuid;
    context.applyMessageOp(
      we === undefined
        ? {
            type: "append",
            messages: [commandInputMessage],
          }
        : {
            type: "replace-by-uuid",
            uuid: we,
            message: commandInputMessage,
          },
    );
  };
  launchUltraplan({
    arg,
    source,
    promptIdentifier: ultraplanPromptId,
    getAppState: context.getAppState,
    setAppState: context.setAppState,
    signal: createAbortController().signal,
    disconnectedBridge: L,
    queue: context.messageQueue,
    surface: {
      requestDialog,
      note: (ke) =>
        context.applyMessageOp({
          type: "append",
          messages: [createSystemMessage(ke, "suggestion")],
        }),
      queue: context.messageQueue,
      turnActivity: context.turnActivity ?? NO_TURN_ACTIVITY,
      tasks: context.tasks ?? EMPTY_TASKS_STORE,
      session: context.session,
    },
    onStatusMessage: Se,
    storageV5: context.storageV5,
    credentials: context.credentials,
  })
    .then(Se)
    .catch(logError);
  onDone(undefined, {
    display: "skip",
  });
}
//@ chunk-e6aww6q8.js:2025505-2025765 fingerprint = default (0.563)
/**
 * /ultraplan 命令对象（local-jsx）；描述：{return`Draft an editable plan in a cloud session (${MXn().timeEstimate}) \xB7 See ${wbe}`}；availability ["claude-ai"]；isEnabled: ()=>f6()。
 */
var ultraplanCommand = {
  type: "local-jsx",
  name: "ultraplan",
  get description() {
    return `Draft an editable plan in a cloud session (${getUltraplanCopy().timeEstimate}) \xB7 See ${CCR_TERMS_URL_ULTRAPLAN}`;
  },
  argumentHint: "<prompt>",
  availability: ["claude-ai"],
  isEnabled: () => isUltraplanEnabled(),
  load: () =>
    Promise.resolve({
      call,
    }),
};
//@ chunk-aepeg2w5.js:436484-436867 callgraph-fingerprint = getUltraplanModel (0.333)
function getUltraplanModel(e, n) {
  if (getAPIProvider() === "firstParty") return false;
  let modelOverrides = getInitialSettings_2().modelOverrides;
  let s = catalogDefaultKeyForFamily(e);
  if (s === undefined || !modelOverrides?.[catalogEntriesByFirstPartyId[s].firstParty]) return false;
  let lower = n.toLowerCase();
  let id = (
    findServedModel(n) ?? {
      id: n,
    }
  ).id;
  let S = Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower)
    ? MODEL_KEY_BY_FIRST_PARTY_ID[lower]
    : entryModelKey(id);
  if (S === undefined)
    return hasDescribableCatalogModel(id) && !modelOverrides[id] && !isAliasFamilyUnavailable(e);
  if (!S.startsWith(e) || !s.startsWith(e)) return false;
  let keys = Object.keys(catalogEntriesByFirstPartyId);
  return (
    keys.indexOf(S) < keys.indexOf(s) &&
    !modelOverrides[catalogEntriesByFirstPartyId[S].firstParty] &&
    !isAliasFamilyUnavailable(e)
  );
}
//@ chunk-fym4r1th.js:50778-51176 fingerprint = DEFAULT_INSTRUCTIONS (0.696)
function DEFAULT_INSTRUCTIONS(taskId, s, n) {
  let taskOutputPath = getTaskOutputPath(taskId);
  let r = 0;
  let now = Date.now();
  let f = false;
  let m = false;
  let interval = setInterval(() => {
    getTaskOutputSize(taskId).then(
      (taskOutputSize) => {
        if (f) return;
        if (taskOutputSize > r) {
          r = taskOutputSize;
          now = Date.now();
          if (m) {
            m = false;
            n?.();
          }
          return;
        }
        if (m || Date.now() - now < STALL_THRESHOLD_MS) return;
        tailTaskOutput(taskOutputPath, STALL_TAIL_BYTES).then(
          ({ content }) => {
            if (f || m || r !== taskOutputSize) return;
            if (!looksLikePrompt(content)) {
              now = Date.now();
              return;
            }
            m = true;
            if (n === undefined) {
              f = true;
              clearInterval(interval);
            }
            s(stripClaudeCodeHints(content).trimEnd());
          },
          () => {},
        );
      },
      () => {},
    );
  }, STALL_CHECK_INTERVAL_MS);
  interval.unref();
  return () => {
    f = true;
    clearInterval(interval);
  };
}
//@ chunk-s61vbvea.js:33608-33648 fingerprint = buildLaunchMessage (1)
function buildLaunchMessage(disconnectedBridge) {
  return findBtwTriggerPositions(disconnectedBridge, "ultraplan");
}
export {
  CCR_TERMS_URL_ULTRAPLAN,
  buildLaunchMessage,
  ULTRAPLAN_CHOICE_DIALOG_SPEC,
  isUltraplanEnabled,
  ULTRAPLAN_LAUNCH_DIALOG,
  stopUltraplan,
  getUltraplanCopy,
  launchUltraplan,
  getUltraplanModel,
  ultraplanCommand,
  DEFAULT_INSTRUCTIONS,
};
