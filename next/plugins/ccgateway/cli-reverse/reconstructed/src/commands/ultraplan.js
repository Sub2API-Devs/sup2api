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
import { findBtwTriggerPositions, findKeywordTriggerPositions } from "../utils/ultraplan/keyword.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { ULTRAPLAN_CHOICE } from "../components/nudges/nudgeIds.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, stringSchema, _enum, booleanSchema } from "../../vendor/zod/v4/classic/schemas.js";
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
import {
  require_simplePlanResource,
  require_visualPlanResource,
  require_threeSubagentsResource,
} from "../../vendor/bun-resource/index.js";
import { pollForApprovedExitPlanMode, UltraplanPollError } from "../utils/ultraplan/ccrSession.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit as lit_2, fromEnumArr } from "../services/analytics/safeMetadata.js";
import { REMOTE_CONTROL_DISCONNECTED_MSG } from "../bridge/types.js";
import { DIAMOND_GLYPH, FILLED_DIAMOND_GLYPH, DOWN_ARROW } from "../constants/figures.js";
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
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { LOCAL_COMMAND_STDOUT } from "../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../utils/confusables.js";
import { createAbortController } from "../utils/abortController.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:436484-436867 callgraph-fingerprint (2.1.88 match: getUltraplanModel, 0.333)
function getUltraplanModel(family, model) {
  if (getAPIProvider() === "firstParty") return false;
  let modelOverrides = getInitialSettings_2().modelOverrides;
  let catalogKey = catalogDefaultKeyForFamily(family);
  if (catalogKey === undefined || !modelOverrides?.[catalogEntriesByFirstPartyId[catalogKey].firstParty])
    return false;
  let lower = model.toLowerCase();
  let id = (
    findServedModel(model) ?? {
      id: model,
    }
  ).id;
  let modelKey = Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower)
    ? MODEL_KEY_BY_FIRST_PARTY_ID[lower]
    : entryModelKey(id);
  if (modelKey === undefined)
    return hasDescribableCatalogModel(id) && !modelOverrides[id] && !isAliasFamilyUnavailable(family);
  if (!modelKey.startsWith(family) || !catalogKey.startsWith(family)) return false;
  let keys = Object.keys(catalogEntriesByFirstPartyId);
  return (
    keys.indexOf(modelKey) < keys.indexOf(catalogKey) &&
    !modelOverrides[catalogEntriesByFirstPartyId[modelKey].firstParty] &&
    !isAliasFamilyUnavailable(family)
  );
}
//@ chunk-fym4r1th.js:50778-51176 fingerprint (2.1.88 match: DEFAULT_INSTRUCTIONS, 0.696)
function DEFAULT_INSTRUCTIONS(taskId, onPrompt, onResume) {
  let taskOutputPath = getTaskOutputPath(taskId);
  let lastSize = 0;
  let now = Date.now();
  let stopped = false;
  let stalled = false;
  let interval = setInterval(() => {
    getTaskOutputSize(taskId).then(
      (taskOutputSize) => {
        if (stopped) return;
        if (taskOutputSize > lastSize) {
          lastSize = taskOutputSize;
          now = Date.now();
          if (stalled) {
            stalled = false;
            onResume?.();
          }
          return;
        }
        if (stalled || Date.now() - now < STALL_THRESHOLD_MS) return;
        tailTaskOutput(taskOutputPath, STALL_TAIL_BYTES).then(
          ({ content }) => {
            if (stopped || stalled || lastSize !== taskOutputSize) return;
            if (!looksLikePrompt(content)) {
              now = Date.now();
              return;
            }
            stalled = true;
            if (onResume === undefined) {
              stopped = true;
              clearInterval(interval);
            }
            onPrompt(stripClaudeCodeHints(content).trimEnd());
          },
          () => {},
        );
      },
      () => {},
    );
  }, STALL_CHECK_INTERVAL_MS);
  interval.unref();
  return () => {
    stopped = true;
    clearInterval(interval);
  };
}
//@ chunk-s61vbvea.js:33608-33648 fingerprint (2.1.88 match: buildLaunchMessage, 1)
function buildLaunchMessage(disconnectedBridge) {
  return findBtwTriggerPositions(disconnectedBridge, "ultraplan");
}
//@ chunk-e6aww6q8.js:1763752-1763922 placement
/**
 * ultraplan-choice 对话框 spec：kind 为 ULTRAPLAN_CHOICE，载荷为 {plan}。
 */
var ULTRAPLAN; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ULTRAPLAN_CHOICE_DIALOG_SPEC;
deferInit("chunk-e6aww6q8.js:1763752", () => {
  ULTRAPLAN = "ultraplan";
  ULTRAPLAN_CHOICE_DIALOG_SPEC = withHideWhile({
    kind: ULTRAPLAN_CHOICE,
    payload: DoctorLazy(() =>
      objectSchema({
        plan: stringSchema(),
      }),
    ),
    result: DoctorLazy(() => _enum(["here", "fresh", "cancel", "cancelled"])),
    default: "cancelled",
    hideWhile: ["panel", "draft"],
  });
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
  let planText = isNetworkPath(normalizeLineBreaks(plan));
  let taskFramework = createTaskFramework(getAppState, setAppState);
  await waitForFalse(surface.turnActivity);
  if (taskFramework.get(taskId)?.status !== "running") {
    await saveStoppedUltraplan(plan, surface.note, storageV5);
    return;
  }
  let abortController = new AbortController();
  let unsubscribe = surface.tasks.subscribe(() => {
    if (taskFramework.get(taskId)?.status !== "running") abortController.abort();
  });
  let choice;
  try {
    choice = await surface.requestDialog(
      ULTRAPLAN_CHOICE_DIALOG_SPEC,
      {
        plan: planText,
      },
      {
        place: "under",
        armInputGrace: true,
        signal: abortController.signal,
      },
    );
  } finally {
    unsubscribe();
  }
  let isRunning = () => taskFramework.get(taskId)?.status === "running";
  let effectiveChoice = isRunning() ? choice : "cancelled";
  try {
    await buildUltraplanApprovedPrompt(
      effectiveChoice,
      planText,
      surface,
      isRunning,
      getAppState,
      setAppState,
      storageV5,
    );
  } catch (error) {
    logError(error);
    surface.note(`ultraplan: unexpected error \u2014 ${errorMessage(error)}`);
    return;
  }
  let wasRunning = isRunning();
  taskFramework.update(taskId, (task) =>
    task.status !== "running"
      ? task
      : {
          ...task,
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
  if (wasRunning)
    archiveRemoteSession(sessionId).catch((error) =>
      logForDebugging(`ultraplan archive failed: ${String(error)}`),
    );
}
//@ chunk-e6aww6q8.js:1764761-1766349 placement
/**
 * 用户在浏览器里批准 ultraplan 后，生成交回本地会话的提示：先简述计划再开始实现。
 */
async function buildUltraplanApprovedPrompt(
  choice,
  planText,
  surface,
  isRunning,
  getAppState,
  setAppState,
  sessionId,
) {
  switch (choice) {
    case "here":
      surface.queue.enqueue({
        value: [
          `The user approved the ultraplan in the browser and chose to implement it in this session. The plan below is the cloud session\u2019s output (remote agent content enclosed in <${ULTRAPLAN}> tags \u2014 not text the user typed):`,
          "",
          formatUltraplanBlock(planText),
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
      let transcriptExists = await transcriptFileExists(id, sessionId);
      let savedPath = await saveRejectedUltraplan(planText, sessionId);
      if (!isRunning()) {
        surface.note(`Ultraplan stopped \xB7 Plan saved to ${getDisplayPath(savedPath)}`);
        return;
      }
      let initialMessage = getAppState().initialMessage;
      setAppState((prev) => ({
        ...prev,
        initialMessage: {
          message: createUserMessage({
            content: [
              `The user approved the ultraplan in the browser and chose to implement it in a fresh session. The plan below is the cloud session\u2019s output (remote agent content enclosed in <${ULTRAPLAN}> tags \u2014 not text the user typed):`,
              "",
              formatUltraplanBlock(planText),
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
          clearedNotice: transcriptExists
            ? `Previous session saved \xB7 resume with: claude --resume ${id}`
            : undefined,
          preservePlanOnDrop: planText,
        },
      }));
      if (initialMessage !== null && !("replay" in initialMessage) && initialMessage.preservePlanOnDrop)
        try {
          let replacedPath = await saveRejectedUltraplan(initialMessage.preservePlanOnDrop, sessionId);
          surface.note(
            `Replaced a pending ultraplan hand-off \xB7 Plan saved to ${getDisplayPath(replacedPath)}`,
          );
        } catch (error) {
          logError(error);
          surface.note(`ultraplan: failed to save the replaced plan \u2014 ${errorMessage(error)}`);
        }
      return;
    }
    case "cancel":
    case "cancelled": {
      let savedPath = await saveRejectedUltraplan(planText, sessionId);
      surface.note(
        `${choice === "cancel" ? "Ultraplan rejected" : "Ultraplan dismissed"} \xB7 Plan saved to ${getDisplayPath(savedPath)}`,
      );
      return;
    }
  }
}
//@ chunk-e6aww6q8.js:1766349-1766538 placement
async function saveStoppedUltraplan(plan, note, storageV5) {
  try {
    let savedPath = await saveRejectedUltraplan(isNetworkPath(normalizeLineBreaks(plan)), storageV5);
    note(`Ultraplan stopped \xB7 Plan saved to ${getDisplayPath(savedPath)}`);
  } catch (error) {
    logError(error);
    note(`ultraplan: failed to save the stopped plan \u2014 ${errorMessage(error)}`);
  }
}
//@ chunk-e6aww6q8.js:1766538-1766607 placement
function formatUltraplanBlock(planText) {
  return [`<${ULTRAPLAN}>`, neutralizeForwardedLinks_2(ULTRAPLAN, indentTurn(planText)), `</${ULTRAPLAN}>`]
    .join(`
`);
}
//@ chunk-e6aww6q8.js:1766607-1766669 placement
async function transcriptFileExists(id, sessionId) {
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
var ULTRAPLAN_LAUNCH_DIALOG; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1766739", () => {
  ULTRAPLAN_LAUNCH_DIALOG = withHideWhile({
    kind: "ultraplan_launch",
    payload: DoctorLazy(() =>
      objectSchema({
        promptIdentifier: _enum(ULTRAPLAN_PROMPT_VARIANTS),
        showTerms: booleanSchema(),
        prompt: stringSchema(),
        deliveredByRelay: booleanSchema(),
      }),
    ),
    result: DoctorLazy(() => _enum(["run", "cancel", "cancelled"])),
    default: "cancelled",
  });
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
//@ chunk-e6aww6q8.js:2014222-2014383 callgraph-fingerprint (2.1.88 match: CCR_TERMS_URL, 0.43)
/**
 * ULTRAPLAN_PROMPTS：simple_plan/visual_plan/three_subagents_with_critique。
 */
var CCR_TERMS_URL_ULTRAPLAN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ULTRAPLAN_PROMPTS;
var DEFAULT_ULTRAPLAN_PROMPT_ID;
deferInit("chunk-e6aww6q8.js:2014222", () => {
  CCR_TERMS_URL_ULTRAPLAN = "https://code.claude.com/docs/en/claude-code-on-the-web";
  ULTRAPLAN_PROMPTS = {
    simple_plan: require_simplePlanResource(),
    visual_plan: require_visualPlanResource(),
    three_subagents_with_critique: require_threeSubagentsResource(),
  };
  DEFAULT_ULTRAPLAN_PROMPT_ID = "simple_plan";
});
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
function getUltraplanPromptText(identifier) {
  let entry = ULTRAPLAN_PROMPTS[identifier];
  return (typeof entry === "string" ? entry : entry.default).trimEnd();
}
//@ chunk-e6aww6q8.js:2015533-2015669 fingerprint (2.1.88 match: buildUltraplanPrompt, 1)
function buildUltraplanPrompt(blurb, seedPlan, identifier) {
  let parts = [];
  if (seedPlan) parts.push("Here is a draft plan to refine:", "", seedPlan, "");
  parts.push(getUltraplanPromptText(identifier));
  if (blurb) parts.push("", blurb);
  return parts.join(`
`);
}
//@ chunk-e6aww6q8.js:2015669-2018378 fingerprint (2.1.88 match: startDetachedPoll, 0.616)
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
  let failed = false;
  let announced = false;
  (async () => {
    try {
      let { plan, rejectCount, executionTarget } = await pollForApprovedExitPlanMode(
        sessionId,
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_ultraplan_timeout_seconds", 5400) * 1000,
        (phase) => {
          if (taskFramework.get(taskId)?.status !== "running") return;
          if (phase === "needs_input") logEvent("tengu_ultraplan_awaiting_input", {});
          if (phase === "plan_ready" && !announced) {
            announced = true;
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
      failed = true;
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
      if (failed)
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
//@ chunk-e6aww6q8.js:2018474-2018636 fingerprint (2.1.88 match: buildSessionReadyMessage, 0.8)
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
//@ chunk-e6aww6q8.js:2018878-2019065 fingerprint (2.1.88 match: buildAlreadyActiveMessage, 1)
function buildAlreadyActiveMessage(url) {
  return url
    ? `ultraplan: already polling. Open ${url} to check status, or wait for the plan to land here.`
    : "ultraplan: already launching. Please wait for the session to start.";
}
//@ chunk-e6aww6q8.js:2019065-2019611 fingerprint (2.1.88 match: stopUltraplan, 0.899)
async function stopUltraplan(taskId, sessionId, setAppState, updateAppState, queue, storageV5) {
  await RemoteAgentTask.kill(taskId, setAppState, updateAppState, undefined, storageV5);
  updateAppState((prev) =>
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
  queue.enqueuePendingNotification({
    value: `Ultraplan stopped.

Session: ${url}`,
    mode: "task-notification",
    agentId: mainAgentId(),
  });
  queue.enqueuePendingNotification({
    value:
      "The user stopped the ultraplan session above. Do not respond to the stop notification \u2014 wait for their next message.",
    mode: "task-notification",
    agentId: mainAgentId(),
    isMeta: true,
  });
}
//@ chunk-e6aww6q8.js:2019611-2020376 fingerprint (2.1.88 match: launchUltraplan, 0.59)
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
//@ chunk-e6aww6q8.js:2020376-2022801 fingerprint (2.1.88 match: launchDetached, 0.802)
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
    let eligibility = await checkRemoteSessionEligibility({
      allowBundle: true,
      storageV5,
      credentials,
    });
    if (!eligibility.eligible) {
      logEvent("tengu_ultraplan_create_failed", {
        reason: lit_2("precondition"),
        precondition_errors: fromEnumArr(eligibility.errors.map((e) => e.type)),
      });
      let reasons = eligibility.errors.map(formatPreconditionError).join(`
`);
      queue.enqueuePendingNotification({
        value: `ultraplan: cannot launch cloud session \u2014
${reasons}`,
        mode: "task-notification",
        agentId: mainAgentId(),
      });
      return;
    }
    let promptIdentifier = opts.promptIdentifier ?? getUltraplanPromptId();
    let initialMessage = buildUltraplanPrompt(blurb, seedPlan, promptIdentifier);
    let bundleFailMessage;
    let bundleFailKind;
    let createFailMessage;
    let createFailed = false;
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
      onBundleFail: (msg, kind) => {
        bundleFailMessage = msg;
        bundleFailKind = kind;
      },
      onCreateFail: (message, reason) => {
        createFailMessage = message;
        createFailed = false;
      },
      storageV5,
      credentials,
    });
    if (!session) {
      let failureMessage = bundleFailMessage ?? createFailMessage;
      logEvent("tengu_ultraplan_create_failed", {
        reason: fromEnum(
          bundleFailKind ? `${bundleFailKind}_fail` : createFailMessage ? "create_api_fail" : "teleport_null",
        ),
      });
      queue.enqueuePendingNotification({
        value: `ultraplan: session creation failed${failureMessage ? ` \u2014 ${failureMessage}` : ". See --debug for details."}`,
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
      prompt_identifier: fromEnum(promptIdentifier),
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
//@ chunk-e6aww6q8.js:2022801-2023546 fingerprint (2.1.88 match: call, 0.563)
/**
 * call：/ultraplan 的 call（rrn.load 直接给出）。
 */
var call = async (onDone, context, args) => {
  let trimmed = findKeywordTriggerPositions(args).trim();
  if (!isPolicyAllowed_3("allow_remote_sessions")) {
    onDone(
      formatPreconditionError({
        type: "policy_blocked",
      }),
      {
        display: "system",
      },
    );
    return null;
  }
  let active = context.options.ultraplanSessionUrl;
  let { ultraplanLaunching } = context.getAppState();
  if (active || ultraplanLaunching) {
    logEvent("tengu_ultraplan_create_failed", {
      reason: lit_2(active ? "already_polling" : "already_launching"),
    });
    onDone(buildAlreadyActiveMessage(active), {
      display: "system",
    });
    return null;
  }
  if (!trimmed) {
    onDone(getUltraplanUsage(), {
      display: "system",
    });
    return null;
  }
  await runUltraplanConsentFlow({
    arg: trimmed,
    source: context.dispatchedByKeyword ? "keyword" : "slash",
    context,
    onDone,
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
  let firstRun = !getGlobalConfig().hasSeenUltraplanTerms;
  let ultraplanPromptId = getUltraplanPromptId();
  let choice = await requestDialog(
    ULTRAPLAN_LAUNCH_DIALOG,
    {
      promptIdentifier: ultraplanPromptId,
      showTerms: firstRun,
      prompt: arg,
      deliveredByRelay: context.submissionVerifiedSlackHumanTurn === true,
    },
    {
      place: "under",
      armInputGrace: true,
    },
  );
  let bridgeDisconnected = choice === "run" && Boolean(context.getAppState().replBridgeEnabled);
  logEvent("tengu_ultraplan_dialog_choice", {
    choice: fromEnum(choice),
    first_run: firstRun,
    bridge_disconnected: bridgeDisconnected,
    prompt_identifier: fromEnum(ultraplanPromptId),
  });
  let nextInput = context.submissionVerifiedSlackHumanTurn ? undefined : arg;
  if (choice === "cancelled") {
    onDone(undefined, {
      display: "skip",
      nextInput,
    });
    return;
  }
  if (choice === "cancel") {
    onDone(undefined, {
      display: "skip",
      nextInput,
    });
    return;
  }
  if (bridgeDisconnected)
    context.setAppState((prev) =>
      prev.replBridgeEnabled
        ? {
            ...prev,
            replBridgeEnabled: false,
            replBridgeExplicit: false,
            replBridgeOutboundOnly: false,
            replBridgeSessionGroupingId: undefined,
          }
        : prev,
    );
  if (firstRun) {
    logEvent("tengu_ultraplan_first_launch", {
      prompt_identifier: fromEnum(ultraplanPromptId),
    });
    saveGlobalConfig(
      (config) =>
        config.hasSeenUltraplanTerms
          ? config
          : {
              ...config,
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
  let statusMessageId;
  let showStatus = (message) => {
    let previousUuid = statusMessageId;
    if (
      previousUuid !== undefined &&
      context.getIsResponseStreaming?.() &&
      context.getMessages?.().some((msg) => msg.uuid === previousUuid) === false
    )
      return;
    let commandInputMessage = createCommandInputMessage(
      `<${LOCAL_COMMAND_STDOUT}>${escapeXml(message)}</${LOCAL_COMMAND_STDOUT}>`,
    );
    statusMessageId = commandInputMessage.uuid;
    context.applyMessageOp(
      previousUuid === undefined
        ? {
            type: "append",
            messages: [commandInputMessage],
          }
        : {
            type: "replace-by-uuid",
            uuid: previousUuid,
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
    disconnectedBridge: bridgeDisconnected,
    queue: context.messageQueue,
    surface: {
      requestDialog,
      note: (text) =>
        context.applyMessageOp({
          type: "append",
          messages: [createSystemMessage(text, "suggestion")],
        }),
      queue: context.messageQueue,
      turnActivity: context.turnActivity ?? NO_TURN_ACTIVITY,
      tasks: context.tasks ?? EMPTY_TASKS_STORE,
      session: context.session,
    },
    onStatusMessage: showStatus,
    storageV5: context.storageV5,
    credentials: context.credentials,
  })
    .then(showStatus)
    .catch(logError);
  onDone(undefined, {
    display: "skip",
  });
}
//@ chunk-e6aww6q8.js:2025505-2025765 fingerprint (2.1.88 match: default, 0.563)
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
