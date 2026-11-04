/**
 * services/agentStatus/jobState.ts
 *
 * 后台作业状态与时间线（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wd9kxbpn.js (24)
 * attribution: placement 24
 */
import { appendFile } from "fs/promises";
import { join } from "path";
import { inflectKnownVerbText } from "../../utils/verbInflection.js";
import {
  truncateWithEllipsis,
  MAX_HEADLINE_LENGTH,
  currentSessionStatusState,
} from "../sessionStatus/sessionStateClassifier.js";
import { redactSecrets, redactAndTruncate } from "../teamMemorySync/secretScanner.js";
import {
  writeStateAtomic,
  logJobWriteError,
  getJobDir,
  readJobState,
  isSettled,
  IDLE_NEEDS,
  isOverlayNeeds,
  isTerminal,
} from "../daemon/jobState.js";
import { sendRv, disarmStartupWedgeWatchdog } from "../daemon/rendezvous.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isPermittedByOrgModelPolicy } from "../../utils/model/defaultModel.js";
import { getDefaultSonnetModel, getMainLoopModel } from "../../utils/model/model.js";
import { classifierFlagshipRerouteTarget } from "../../utils/model/classifierModel.js";
import { getSmallFastModel } from "../../utils/model/smallFastModel.js";
import { modelRejectsDisabledThinking } from "../../utils/thinking.js";
import { lit, agentTypeForAnalyticsFromDefinition, fromEnum } from "../analytics/safeMetadata.js";
import { isBgSession, isActingAsBgJob } from "../../utils/concurrentSessions.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../analytics/index.js";
import { isLeaseSource } from "../daemon/leaseProtocol.js";
import { truncateCodePoints } from "../../utils/stringUtils.js";
import { SYSTEM_REMINDER_CLOSE } from "../../utils/transcriptSearch.js";
import { isLocalCommandMarkup } from "../../utils/messages/localCommandTags.js";
import { inputStartsWithMatchingCommand } from "../../commands.js";
import { classifyJobCleanliness, runJobClassification } from "./jobClassifier.js";
import { parsePermissionModeFlag } from "../../cli/permissionModeFlags.js";
import { attentionRegistryStore } from "../../components/fleet/sessionAttention.js";
import { isENOENT, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { formatStorageError, isAbsentParentError } from "../../utils/storage/storageErrors.js";
import { getInFlightSnapshot } from "../daemon/sessionCron.js";
import { isSessionActive } from "../../utils/sessionActivity.js";

//@ chunk-wd9kxbpn.js:12835-13102 placement
/**
 * 生成工具活动的简短描述（问题、描述或回退文本），去掉密钥并压缩空白、截断。
 */
function describeToolActivity(input, fallbackText) {
  let question =
    Array.isArray(input?.questions) && typeof input.questions[0]?.question === "string"
      ? input.questions[0].question
      : undefined;
  let description = typeof input?.description === "string" ? input.description : "";
  let verbText =
    question ?? inflectKnownVerbText(description)?.running ?? (description || (fallbackText() ?? ""));
  return verbText
    ? truncateWithEllipsis(redactSecrets(verbText).replace(/\s+/g, " ").trim(), MAX_HEADLINE_LENGTH)
    : "";
}
//@ chunk-wd9kxbpn.js:13102-13199 placement
async function writeStateAndBroadcast(jobDir, state, patch, storageV5) {
  await writeStateAtomic(jobDir, state, storageV5);
  if (Object.keys(patch).length > 0)
    sendRv({
      type: "state",
      patch,
    });
}
//@ chunk-wd9kxbpn.js:13199-13245 placement
/**
 * 导出函数 `setPendingStructuredResult`：参数 e。
 */
function setPendingStructuredResult(pendingStructuredResult) {
  currentSessionStatusState().pendingStructuredResult = pendingStructuredResult;
}
//@ chunk-wd9kxbpn.js:13245-13768 placement
/**
 * 创建后台作业分类器的运行时状态（上次状态、累积输出、意图、在途分类、最近请求、桥写入链、中途 LLM 节流等）。
 */
function createJobClassifierState(options = {}) {
  return {
    storageV5: options.storageV5,
    credentials: options.credentials,
    prevState: "",
    prevStateSince: Date.now(),
    accumulatedOutputs: {},
    lastClassifyAt: 0,
    capturedIntent: "",
    inFlight: null,
    nameInFlight: false,
    dispatchEmitted: false,
    latestAsk: "",
    lastCapturedAsk: null,
    kicked: false,
    lastBridgeNeeds: undefined,
    lastMsgCount: 0,
    scriptPosts: [],
    quietTurnKeepsAsk: false,
    permissionBridgeSubscribed: false,
    bridgeWriteChain: Promise.resolve(),
    lastEmittedDetail: "",
    lastMidturnLlmAt: 0,
    lastMidturnLlmDetail: "",
    midturnLlmIntervalMs: 0,
    midturnLlmEpoch: 0,
    lastResult: null,
  };
}
//@ chunk-wd9kxbpn.js:13768-13822 placement
/**
 * 后台分类器的节流参数：默认 15 s、REPL 5 s、两次分类最短间隔 8 s、最大年龄 240 s、禁用思考时预算 2048、缓存 1 万条。
 */
var DEFAULT_THROTTLE_MS = 15000;
var REPL_THROTTLE_MS = 5000;
var MIN_CLASSIFY_INTERVAL_MS = 8000;
var MAX_CLASSIFY_AGE_MS = 240000;
var DISABLED_THINKING_BUDGET = 2048;
var MAX_CACHED_CLASSIFICATIONS = 1e4;
//@ chunk-wd9kxbpn.js:13822-13944 placement
/**
 * 读取后台分类器配置开关（默认用小模型、关闭思考、轮中去抖 60 秒）。
 */
function getBgClassifierConfig() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_classifier_config", {
    useSmallFastModel: true,
    disableThinking: true,
    midTurnLlmDebounceMs: 60000,
  });
}
//@ chunk-wd9kxbpn.js:13944-14054 placement
/**
 * 读取开关中的线程回顾提示词，为空时用默认值。
 */
function getThreadRecapPrompt(defaultPrompt) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_projects_thread_recap_prompt",
    "",
  );
  return typeof featureValue_CACHED_MAY_BE_STALE === "string" &&
    featureValue_CACHED_MAY_BE_STALE.trim() !== ""
    ? featureValue_CACHED_MAY_BE_STALE
    : defaultPrompt;
}
//@ chunk-wd9kxbpn.js:14054-14108 placement
function isShimmeringFireflyEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_shimmering_firefly", false);
}
//@ chunk-wd9kxbpn.js:14108-14158 placement
function isVelvetyAuroraEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvety_aurora", true);
}
//@ chunk-wd9kxbpn.js:14158-14321 placement
/**
 * 选择后台分类器模型：Projects 用配置或默认 Sonnet（受组织策略约束），否则用小模型或主模型。
 */
function getClassifierModel(projectsRecap = false) {
  if (projectsRecap) {
    let projectsModel = getBgClassifierConfig()?.projectsModel;
    if (projectsModel && isPermittedByOrgModelPolicy(projectsModel)) return projectsModel;
    let defaultSonnetModel = getDefaultSonnetModel();
    return classifierFlagshipRerouteTarget(
      isPermittedByOrgModelPolicy(defaultSonnetModel) ? defaultSonnetModel : getMainLoopModel(),
    );
  }
  if (getBgClassifierConfig()?.useSmallFastModel) return getSmallFastModel();
  return classifierFlagshipRerouteTarget(getMainLoopModel());
}
//@ chunk-wd9kxbpn.js:14321-14420 placement
function thinkingBudgetFor(classifierModel) {
  if (modelRejectsDisabledThinking(classifierModel)) return [undefined, DISABLED_THINKING_BUDGET];
  if (getBgClassifierConfig()?.disableThinking) return [false, 0];
  return [undefined, DISABLED_THINKING_BUDGET];
}
//@ chunk-wd9kxbpn.js:14420-14566 placement
function isResumeLaunch() {
  return process.argv.some(
    (arg) =>
      arg === "-c" ||
      arg === "--continue" ||
      arg === "-r" ||
      arg === "--resume" ||
      arg.startsWith("--resume=") ||
      arg.startsWith("-r="),
  );
}
//@ chunk-wd9kxbpn.js:14566-14635 placement
function surfaceFlags(surfaces) {
  let flags = {};
  for (let surface of surfaces) flags[`surface_${surface}`] = true;
  return flags;
}
//@ chunk-wd9kxbpn.js:14635-14703 placement
function agentKindForDispatch(agentDefinition) {
  return agentDefinition === undefined || agentDefinition.agentType === "bg"
    ? lit("bg")
    : agentTypeForAnalyticsFromDefinition(agentDefinition);
}
//@ chunk-wd9kxbpn.js:14703-14959 placement
/**
 * 后台会话首次派发代理时上报 tengu_bg_agent_dispatch（代理与来源），每个任务只报一次。
 */
function logBgAgentDispatch(classifier, agentDefinition, surfaces) {
  if (!isBgSession() || classifier.dispatchEmitted) return;
  classifier.dispatchEmitted = true;
  if (isResumeLaunch()) return;
  let CLAUDE_BG_SOURCE = env.CLAUDE_BG_SOURCE;
  logEvent("tengu_bg_agent_dispatch", {
    agent: agentKindForDispatch(agentDefinition),
    source:
      CLAUDE_BG_SOURCE === undefined
        ? lit("shell")
        : isLeaseSource(CLAUDE_BG_SOURCE)
          ? fromEnum(CLAUDE_BG_SOURCE)
          : lit("other"),
    intentLength: classifier.capturedIntent.length,
    ...surfaceFlags(surfaces),
  });
}
//@ chunk-wd9kxbpn.js:14959-15089 placement
function captureJobIntent(classifier, prompt) {
  if (classifier.capturedIntent || !prompt) return classifier.capturedIntent;
  classifier.capturedIntent = truncateCodePoints(redactAndTruncate(SYSTEM_REMINDER_CLOSE(prompt), 1000), 500);
  return classifier.capturedIntent;
}
//@ chunk-wd9kxbpn.js:15089-15358 placement
function findLastUserPrompt(messages) {
  let last = messages.findLast(
    (message) =>
      message.type === "user" &&
      !message.isMeta &&
      message.isCompactSummary !== true &&
      typeof message.message.content === "string" &&
      !isLocalCommandMarkup(message.message.content) &&
      !inputStartsWithMatchingCommand(message.message.content, () => true),
  );
  return last?.type === "user" && typeof last.message.content === "string" ? last.message.content : undefined;
}
//@ chunk-wd9kxbpn.js:15358-15515 placement
function captureLatestAsk(classifier, askText) {
  if (!askText) return;
  let lastCapturedAsk = classifier.lastCapturedAsk;
  if (lastCapturedAsk?.text !== askText) {
    lastCapturedAsk = {
      text: askText,
      latestAsk: truncateCodePoints(redactAndTruncate(SYSTEM_REMINDER_CLOSE(askText), 600), 300),
    };
    classifier.lastCapturedAsk = lastCapturedAsk;
  }
  classifier.latestAsk = lastCapturedAsk.latestAsk;
}
//@ chunk-wd9kxbpn.js:15608-15801 placement
function kickJobOnTurnStart(classifier, jobId, bridgeJob) {
  classifyJobCleanliness(classifier);
  disarmStartupWedgeWatchdog();
  if (classifier.kicked) return;
  classifier.kicked = true;
  classifier.bridgeWriteChain = classifier.bridgeWriteChain
    .then(() => markJobActive(jobId, bridgeJob, classifier.storageV5, classifier.lastBridgeNeeds))
    .then(() => parsePermissionModeFlag(classifier.storageV5))
    .catch(logJobWriteError);
  syncPermissionNeeds(classifier, jobId);
}
//@ chunk-wd9kxbpn.js:15801-16069 placement
/**
 * 作为后台任务运行时，把当前的权限需求串行同步到 bridge。
 */
function syncPermissionNeeds(classifier, jobId) {
  if (!isActingAsBgJob()) return;
  let needs = attentionRegistryStore.current();
  if (!needs) return;
  classifier.bridgeWriteChain = classifier.bridgeWriteChain
    .then(() => classifier.inFlight ?? undefined)
    .catch(() => {})
    .then(() => {
      let lastBridgeNeeds = classifier.lastBridgeNeeds;
      classifier.lastBridgeNeeds = needs.text;
      return writeJobNeeds(jobId, needs, classifier.storageV5, lastBridgeNeeds, true).catch((error) => {
        if (!isENOENT(error)) logJobWriteError(error);
      });
    });
}
//@ chunk-wd9kxbpn.js:16069-16367 placement
function maybeClassifyJob(classifier, jobId, agentDefinition, messages, sessions, asks, surfaces) {
  if (isActingAsBgJob() && !classifier.kicked) {
    classifier.kicked = true;
    markJobActive(
      jobId,
      {
        userText: undefined,
        isTurnStart: false,
      },
      classifier.storageV5,
      classifier.lastBridgeNeeds,
    ).catch(logJobWriteError);
  }
  let now = Date.now();
  let throttleMs = surfaces.has("repl") ? REPL_THROTTLE_MS : DEFAULT_THROTTLE_MS;
  if (now - classifier.lastClassifyAt < throttleMs) return;
  if (classifier.inFlight) return;
  classifier.lastClassifyAt = now;
  runJobClassification(
    classifier,
    jobId,
    agentDefinition,
    classifier.capturedIntent,
    messages,
    sessions,
    asks,
    surfaces,
    true,
    false,
  ).catch(logJobWriteError);
}
//@ chunk-wd9kxbpn.js:16367-16742 placement
function appendJobTimeline(storageV5, jobId, record) {
  let line =
    jsonStringify(record) +
    `
`;
  if (storageV5 !== undefined && isValidKeySegment(jobId)) {
    storageV5
      .append(STORAGE_SPACES.jobTimeline(jobId), [
        {
          data: line,
        },
      ])
      .then((result) => {
        if (!result.ok) {
          let error = result.error;
          logJobWriteError(
            Object.assign(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `[jobs] v5 timeline append failed: ${formatStorageError(error)}`,
                "[jobs] v5 timeline append failed",
              ),
              {
                code: isAbsentParentError(error)
                  ? "ENOENT"
                  : "telemetryCode" in error
                    ? error.telemetryCode
                    : undefined,
              },
            ),
          );
        }
      })
      .catch(logJobWriteError);
    return;
  }
  appendFile(join(getJobDir(jobId), "timeline.jsonl"), line, "utf-8").catch(logJobWriteError);
}
//@ chunk-wd9kxbpn.js:16742-17412 placement
/**
 * 回合开始或用户输入时把作业置为 active：清除需要处理的提示与阻塞，用户文本不同于意图时作为新 detail 写入并追加时间线。
 */
async function markJobActive(jobId, { userText, isTurnStart }, storageV5, lastBridgeNeeds) {
  let jobDir = getJobDir(jobId);
  let jobState = await readJobState(jobDir, storageV5);
  if (!jobState) return;
  if (jobState.tempo === "active") return;
  if (isSettled(jobState) && !userText && !isTurnStart) return;
  let attention = attentionRegistryStore.current();
  if (
    jobState.tempo === "blocked" &&
    attention !== null &&
    (attention.text === jobState.needs || lastBridgeNeeds === jobState.needs)
  )
    return;
  let iso = new Date().toISOString();
  let headline = userText ? redactSecrets(SYSTEM_REMINDER_CLOSE(userText)).replace(/\s+/g, " ").trim() : "";
  let any = [jobState.intent, jobState.initialPrompt].some(
    (existing) => !!existing && redactSecrets(existing).replace(/\s+/g, " ").trim() === headline,
  );
  let detail = headline && !any ? truncateWithEllipsis(headline, MAX_HEADLINE_LENGTH) : undefined;
  await writeStateAndBroadcast(
    jobDir,
    {
      ...jobState,
      ...(detail !== undefined && {
        detail,
        output: null,
      }),
      tempo: "active",
      inFlight: getInFlightSnapshot(),
      needs: undefined,
      block: undefined,
      suggestedReply: undefined,
      updatedAt: iso,
    },
    {
      tempo: "active",
      needs: "",
      ...(detail !== undefined && {
        detail,
      }),
    },
    storageV5,
  );
  if (detail)
    appendJobTimeline(storageV5, jobId, {
      at: iso,
      state: jobState.state,
      detail,
      text: "",
    });
}
//@ chunk-wd9kxbpn.js:17412-18162 placement
/**
 * 根据当前权限请求把作业置为 blocked（写入 needs/overlay/questions），或在请求消失时恢复为 active/idle；读两次状态以避免覆盖更新。
 */
async function writeJobNeeds(jobId, needs, storageV5, lastBridgeNeeds, fromSweep = false) {
  let jobDir = getJobDir(jobId);
  let text = needs?.text ?? null;
  let isOverlay = needs?.overlay === true;
  let state = await readJobState(jobDir, storageV5);
  if (!state) return;
  let isOverlayBlocked = (state) =>
    state.tempo === "blocked" &&
    state.needs !== undefined &&
    state.needs !== IDLE_NEEDS &&
    !isOverlayNeeds(state) &&
    state.needs !== lastBridgeNeeds;
  let isStaleUnblocked = (state) =>
    state.tempo !== "blocked" || (lastBridgeNeeds !== undefined && state.needs !== lastBridgeNeeds);
  if (text) {
    if (isTerminal(state.state)) return;
    if (state.tempo === "blocked" && state.needs === text) return;
    if ((isOverlay || fromSweep) && isOverlayBlocked(state)) return;
  } else if (isStaleUnblocked(state)) return;
  let latest = (await readJobState(jobDir, storageV5)) ?? state;
  if (text) {
    if (isTerminal(latest.state)) return;
    if (latest.tempo === "blocked" && latest.needs === text) return;
    if ((isOverlay || fromSweep) && isOverlayBlocked(latest)) return;
  } else if (isStaleUnblocked(latest)) return;
  let tempo = text ? "blocked" : isSessionActive() ? "active" : "idle";
  await writeStateAndBroadcast(
    jobDir,
    {
      ...latest,
      tempo,
      inFlight: getInFlightSnapshot(),
      needs: text ?? undefined,
      needsOverlay: text && isOverlay ? text : undefined,
      block: needs?.questions
        ? {
            questions: needs.questions,
          }
        : undefined,
      suggestedReply: undefined,
      updatedAt: new Date().toISOString(),
    },
    {
      tempo,
      needs: text ?? "",
    },
    storageV5,
  );
}
export {
  writeStateAndBroadcast,
  MAX_CACHED_CLASSIFICATIONS,
  writeJobNeeds,
  appendJobTimeline,
  syncPermissionNeeds,
  getClassifierModel,
  thinkingBudgetFor,
  logBgAgentDispatch,
  describeToolActivity,
  getBgClassifierConfig,
  DEFAULT_THROTTLE_MS,
  MAX_CLASSIFY_AGE_MS,
  MIN_CLASSIFY_INTERVAL_MS,
  agentKindForDispatch,
  surfaceFlags,
  isVelvetyAuroraEnabled,
  isShimmeringFireflyEnabled,
  getThreadRecapPrompt,
  captureJobIntent,
  captureLatestAsk,
  maybeClassifyJob,
  createJobClassifierState,
  findLastUserPrompt,
  kickJobOnTurnStart,
  setPendingStructuredResult,
};
