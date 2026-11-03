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
function describeToolActivity(e, n) {
  let question =
    Array.isArray(e?.questions) && typeof e.questions[0]?.question === "string"
      ? e.questions[0].question
      : undefined;
  let description = typeof e?.description === "string" ? e.description : "";
  let o = question ?? inflectKnownVerbText(description)?.running ?? (description || (n() ?? ""));
  return o ? truncateWithEllipsis(redactSecrets(o).replace(/\s+/g, " ").trim(), MAX_HEADLINE_LENGTH) : "";
}
//@ chunk-wd9kxbpn.js:13102-13199 placement
async function writeStateAndBroadcast(jobDir, n, r, storageV5) {
  await writeStateAtomic(jobDir, n, storageV5);
  if (Object.keys(r).length > 0)
    sendRv({
      type: "state",
      patch: r,
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
function createJobClassifierState(e = {}) {
  return {
    storageV5: e.storageV5,
    credentials: e.credentials,
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
function getThreadRecapPrompt(e) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_projects_thread_recap_prompt",
    "",
  );
  return typeof featureValue_CACHED_MAY_BE_STALE === "string" &&
    featureValue_CACHED_MAY_BE_STALE.trim() !== ""
    ? featureValue_CACHED_MAY_BE_STALE
    : e;
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
function surfaceFlags(e) {
  let n = {};
  for (let r of e) n[`surface_${r}`] = true;
  return n;
}
//@ chunk-wd9kxbpn.js:14635-14703 placement
function agentKindForDispatch(e) {
  return e === undefined || e.agentType === "bg" ? lit("bg") : agentTypeForAnalyticsFromDefinition(e);
}
//@ chunk-wd9kxbpn.js:14703-14959 placement
/**
 * 后台会话首次派发代理时上报 tengu_bg_agent_dispatch（代理与来源），每个任务只报一次。
 */
function logBgAgentDispatch(e, n, r) {
  if (!isBgSession() || e.dispatchEmitted) return;
  e.dispatchEmitted = true;
  if (isResumeLaunch()) return;
  let CLAUDE_BG_SOURCE = env.CLAUDE_BG_SOURCE;
  logEvent("tengu_bg_agent_dispatch", {
    agent: agentKindForDispatch(n),
    source:
      CLAUDE_BG_SOURCE === undefined
        ? lit("shell")
        : isLeaseSource(CLAUDE_BG_SOURCE)
          ? fromEnum(CLAUDE_BG_SOURCE)
          : lit("other"),
    intentLength: e.capturedIntent.length,
    ...surfaceFlags(r),
  });
}
//@ chunk-wd9kxbpn.js:14959-15089 placement
function captureJobIntent(e, n) {
  if (e.capturedIntent || !n) return e.capturedIntent;
  e.capturedIntent = truncateCodePoints(redactAndTruncate(SYSTEM_REMINDER_CLOSE(n), 1000), 500);
  return e.capturedIntent;
}
//@ chunk-wd9kxbpn.js:15089-15358 placement
function findLastUserPrompt(e) {
  let last = e.findLast(
    (r) =>
      r.type === "user" &&
      !r.isMeta &&
      r.isCompactSummary !== true &&
      typeof r.message.content === "string" &&
      !isLocalCommandMarkup(r.message.content) &&
      !inputStartsWithMatchingCommand(r.message.content, () => true),
  );
  return last?.type === "user" && typeof last.message.content === "string" ? last.message.content : undefined;
}
//@ chunk-wd9kxbpn.js:15358-15515 placement
function captureLatestAsk(e, n) {
  if (!n) return;
  let lastCapturedAsk = e.lastCapturedAsk;
  if (lastCapturedAsk?.text !== n) {
    lastCapturedAsk = {
      text: n,
      latestAsk: truncateCodePoints(redactAndTruncate(SYSTEM_REMINDER_CLOSE(n), 600), 300),
    };
    e.lastCapturedAsk = lastCapturedAsk;
  }
  e.latestAsk = lastCapturedAsk.latestAsk;
}
//@ chunk-wd9kxbpn.js:15608-15801 placement
function kickJobOnTurnStart(e, n, r) {
  classifyJobCleanliness(e);
  disarmStartupWedgeWatchdog();
  if (e.kicked) return;
  e.kicked = true;
  e.bridgeWriteChain = e.bridgeWriteChain
    .then(() => markJobActive(n, r, e.storageV5, e.lastBridgeNeeds))
    .then(() => parsePermissionModeFlag(e.storageV5))
    .catch(logJobWriteError);
  syncPermissionNeeds(e, n);
}
//@ chunk-wd9kxbpn.js:15801-16069 placement
/**
 * 作为后台任务运行时，把当前的权限需求串行同步到 bridge。
 */
function syncPermissionNeeds(e, n) {
  if (!isActingAsBgJob()) return;
  let r = attentionRegistryStore.current();
  if (!r) return;
  e.bridgeWriteChain = e.bridgeWriteChain
    .then(() => e.inFlight ?? undefined)
    .catch(() => {})
    .then(() => {
      let lastBridgeNeeds = e.lastBridgeNeeds;
      e.lastBridgeNeeds = r.text;
      return writeJobNeeds(n, r, e.storageV5, lastBridgeNeeds, true).catch((error) => {
        if (!isENOENT(error)) logJobWriteError(error);
      });
    });
}
//@ chunk-wd9kxbpn.js:16069-16367 placement
function maybeClassifyJob(e, n, r, u, o, d, s) {
  if (isActingAsBgJob() && !e.kicked) {
    e.kicked = true;
    markJobActive(
      n,
      {
        userText: undefined,
        isTurnStart: false,
      },
      e.storageV5,
      e.lastBridgeNeeds,
    ).catch(logJobWriteError);
  }
  let now = Date.now();
  let p = s.has("repl") ? REPL_THROTTLE_MS : DEFAULT_THROTTLE_MS;
  if (now - e.lastClassifyAt < p) return;
  if (e.inFlight) return;
  e.lastClassifyAt = now;
  runJobClassification(e, n, r, e.capturedIntent, u, o, d, s, true, false).catch(logJobWriteError);
}
//@ chunk-wd9kxbpn.js:16367-16742 placement
function appendJobTimeline(storageV5, n, r) {
  let u =
    jsonStringify(r) +
    `
`;
  if (storageV5 !== undefined && isValidKeySegment(n)) {
    storageV5
      .append(STORAGE_SPACES.jobTimeline(n), [
        {
          data: u,
        },
      ])
      .then((o) => {
        if (!o.ok) {
          let error = o.error;
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
  appendFile(join(getJobDir(n), "timeline.jsonl"), u, "utf-8").catch(logJobWriteError);
}
//@ chunk-wd9kxbpn.js:16742-17412 placement
/**
 * 回合开始或用户输入时把作业置为 active：清除需要处理的提示与阻塞，用户文本不同于意图时作为新 detail 写入并追加时间线。
 */
async function markJobActive(e, { userText, isTurnStart }, storageV5, lastBridgeNeeds) {
  let jobDir = getJobDir(e);
  let jobState = await readJobState(jobDir, storageV5);
  if (!jobState) return;
  if (jobState.tempo === "active") return;
  if (isSettled(jobState) && !userText && !isTurnStart) return;
  let h = attentionRegistryStore.current();
  if (
    jobState.tempo === "blocked" &&
    h !== null &&
    (h.text === jobState.needs || lastBridgeNeeds === jobState.needs)
  )
    return;
  let iso = new Date().toISOString();
  let w = userText ? redactSecrets(SYSTEM_REMINDER_CLOSE(userText)).replace(/\s+/g, " ").trim() : "";
  let any = [jobState.intent, jobState.initialPrompt].some(
    (A) => !!A && redactSecrets(A).replace(/\s+/g, " ").trim() === w,
  );
  let y = w && !any ? truncateWithEllipsis(w, MAX_HEADLINE_LENGTH) : undefined;
  await writeStateAndBroadcast(
    jobDir,
    {
      ...jobState,
      ...(y !== undefined && {
        detail: y,
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
      ...(y !== undefined && {
        detail: y,
      }),
    },
    storageV5,
  );
  if (y)
    appendJobTimeline(storageV5, e, {
      at: iso,
      state: jobState.state,
      detail: y,
      text: "",
    });
}
//@ chunk-wd9kxbpn.js:17412-18162 placement
/**
 * 根据当前权限请求把作业置为 blocked（写入 needs/overlay/questions），或在请求消失时恢复为 active/idle；读两次状态以避免覆盖更新。
 */
async function writeJobNeeds(e, n, storageV5, lastBridgeNeeds, o = false) {
  let jobDir = getJobDir(e);
  let text = n?.text ?? null;
  let h = n?.overlay === true;
  let jobState = await readJobState(jobDir, storageV5);
  if (!jobState) return;
  let w = (O) =>
    O.tempo === "blocked" &&
    O.needs !== undefined &&
    O.needs !== IDLE_NEEDS &&
    !isOverlayNeeds(O) &&
    O.needs !== lastBridgeNeeds;
  let E = (O) => O.tempo !== "blocked" || (lastBridgeNeeds !== undefined && O.needs !== lastBridgeNeeds);
  if (text) {
    if (isTerminal(jobState.state)) return;
    if (jobState.tempo === "blocked" && jobState.needs === text) return;
    if ((h || o) && w(jobState)) return;
  } else if (E(jobState)) return;
  let y = (await readJobState(jobDir, storageV5)) ?? jobState;
  if (text) {
    if (isTerminal(y.state)) return;
    if (y.tempo === "blocked" && y.needs === text) return;
    if ((h || o) && w(y)) return;
  } else if (E(y)) return;
  let tempo = text ? "blocked" : isSessionActive() ? "active" : "idle";
  await writeStateAndBroadcast(
    jobDir,
    {
      ...y,
      tempo,
      inFlight: getInFlightSnapshot(),
      needs: text ?? undefined,
      needsOverlay: text && h ? text : undefined,
      block: n?.questions
        ? {
            questions: n.questions,
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
};
