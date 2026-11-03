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
import { truncateWithEllipsis, Hg, NX } from "../sessionStatus/sessionStateClassifier.js";
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
import { m7s } from "../daemon/leaseProtocol.js";
import { truncateCodePoints } from "../../utils/stringUtils.js";
import { SYSTEM_REMINDER_CLOSE } from "../../utils/transcriptSearch.js";
import { isLocalCommandMarkup } from "../../utils/messages/localCommandTags.js";
import { inputStartsWithMatchingCommand } from "../../commands.js";
import { classifyJobCleanliness, runJobClassification } from "./jobClassifier.js";
import { parsePermissionModeFlag } from "../../cli/permissionModeFlags.js";
import { KE } from "../../components/fleet/sessionAttention.js";
import { isENOENT, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isValidKeySegment, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { formatStorageError, wft } from "../../utils/storage/storageErrors.js";
import { getInFlightSnapshot } from "../daemon/sessionCron.js";
import { isSessionActive } from "../../utils/sessionActivity.js";

/**
 * 生成工具活动的简短描述（问题、描述或回退文本），去掉密钥并压缩空白、截断。
 */
//@ chunk-wd9kxbpn.js:12835-13102 placement
function describeToolActivity(e, n) {
  let r =
      Array.isArray(e?.questions) && typeof e.questions[0]?.question === "string"
        ? e.questions[0].question
        : void 0,
    u = typeof e?.description === "string" ? e.description : "",
    o = r ?? inflectKnownVerbText(u)?.running ?? (u || (n() ?? ""));
  return o ? truncateWithEllipsis(redactSecrets(o).replace(/\s+/g, " ").trim(), Hg) : "";
}
//@ chunk-wd9kxbpn.js:13102-13199 placement
async function q(e, n, r, u) {
  if ((await writeStateAtomic(e, n, u), Object.keys(r).length > 0)) sendRv({ type: "state", patch: r });
}
//@ chunk-wd9kxbpn.js:13199-13245 placement
function Bn(e) {
  NX().pendingStructuredResult = e;
}
/**
 * 创建后台作业分类器的运行时状态（上次状态、累积输出、意图、在途分类、最近请求、桥写入链、中途 LLM 节流等）。
 */
//@ chunk-wd9kxbpn.js:13245-13768 placement
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
    nameInFlight: !1,
    dispatchEmitted: !1,
    latestAsk: "",
    lastCapturedAsk: null,
    kicked: !1,
    lastBridgeNeeds: void 0,
    lastMsgCount: 0,
    scriptPosts: [],
    quietTurnKeepsAsk: !1,
    permissionBridgeSubscribed: !1,
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
var De = 15000,
  Ke = 5000,
  ze = 8000,
  Ye = 240000,
  Te = 2048,
  Xe = 1e4;
/**
 * 读取后台分类器配置开关（默认用小模型、关闭思考、轮中去抖 60 秒）。
 */
//@ chunk-wd9kxbpn.js:13822-13944 placement
function getBgClassifierConfig() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_classifier_config", {
    useSmallFastModel: !0,
    disableThinking: !0,
    midTurnLlmDebounceMs: 60000,
  });
}
/**
 * 读取开关中的线程回顾提示词，为空时用默认值。
 */
//@ chunk-wd9kxbpn.js:13944-14054 placement
function getThreadRecapPrompt(e) {
  let n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_projects_thread_recap_prompt", "");
  return typeof n === "string" && n.trim() !== "" ? n : e;
}
//@ chunk-wd9kxbpn.js:14054-14108 placement
function Ze() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_shimmering_firefly", !1);
}
//@ chunk-wd9kxbpn.js:14108-14158 placement
function et() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvety_aurora", !0);
}
/**
 * 选择后台分类器模型：Projects 用配置或默认 Sonnet（受组织策略约束），否则用小模型或主模型。
 */
//@ chunk-wd9kxbpn.js:14158-14321 placement
function getClassifierModel(e = !1) {
  if (e) {
    let n = getBgClassifierConfig()?.projectsModel;
    if (n && isPermittedByOrgModelPolicy(n)) return n;
    let r = getDefaultSonnetModel();
    return classifierFlagshipRerouteTarget(isPermittedByOrgModelPolicy(r) ? r : getMainLoopModel());
  }
  if (getBgClassifierConfig()?.useSmallFastModel) return getSmallFastModel();
  return classifierFlagshipRerouteTarget(getMainLoopModel());
}
//@ chunk-wd9kxbpn.js:14321-14420 placement
function Fe(e) {
  if (modelRejectsDisabledThinking(e)) return [void 0, Te];
  if (getBgClassifierConfig()?.disableThinking) return [!1, 0];
  return [void 0, Te];
}
//@ chunk-wd9kxbpn.js:14420-14566 placement
function isResumeLaunch() {
  return process.argv.some(
    (e) =>
      e === "-c" ||
      e === "--continue" ||
      e === "-r" ||
      e === "--resume" ||
      e.startsWith("--resume=") ||
      e.startsWith("-r="),
  );
}
//@ chunk-wd9kxbpn.js:14566-14635 placement
function _e(e) {
  let n = {};
  for (let r of e) n[`surface_${r}`] = !0;
  return n;
}
//@ chunk-wd9kxbpn.js:14635-14703 placement
function Ne(e) {
  return e === void 0 || e.agentType === "bg" ? lit("bg") : agentTypeForAnalyticsFromDefinition(e);
}
/**
 * 后台会话首次派发代理时上报 tengu_bg_agent_dispatch（代理与来源），每个任务只报一次。
 */
//@ chunk-wd9kxbpn.js:14703-14959 placement
function logBgAgentDispatch(e, n, r) {
  if (!isBgSession() || e.dispatchEmitted) return;
  if (((e.dispatchEmitted = !0), isResumeLaunch())) return;
  let CLAUDE_BG_SOURCE = env.CLAUDE_BG_SOURCE;
  logEvent("tengu_bg_agent_dispatch", {
    agent: Ne(n),
    source:
      CLAUDE_BG_SOURCE === void 0
        ? lit("shell")
        : m7s(CLAUDE_BG_SOURCE)
          ? fromEnum(CLAUDE_BG_SOURCE)
          : lit("other"),
    intentLength: e.capturedIntent.length,
    ..._e(r),
  });
}
//@ chunk-wd9kxbpn.js:14959-15089 placement
function captureJobIntent(e, n) {
  if (e.capturedIntent || !n) return e.capturedIntent;
  return (
    (e.capturedIntent = truncateCodePoints(redactAndTruncate(SYSTEM_REMINDER_CLOSE(n), 1000), 500)),
    e.capturedIntent
  );
}
//@ chunk-wd9kxbpn.js:15089-15358 placement
function findLastUserPrompt(e) {
  let last = e.findLast(
    (r) =>
      r.type === "user" &&
      !r.isMeta &&
      r.isCompactSummary !== !0 &&
      typeof r.message.content === "string" &&
      !isLocalCommandMarkup(r.message.content) &&
      !inputStartsWithMatchingCommand(r.message.content, () => !0),
  );
  return last?.type === "user" && typeof last.message.content === "string" ? last.message.content : void 0;
}
//@ chunk-wd9kxbpn.js:15358-15515 placement
function captureLatestAsk(e, n) {
  if (!n) return;
  let lastCapturedAsk = e.lastCapturedAsk;
  if (lastCapturedAsk?.text !== n)
    ((lastCapturedAsk = {
      text: n,
      latestAsk: truncateCodePoints(redactAndTruncate(SYSTEM_REMINDER_CLOSE(n), 600), 300),
    }),
      (e.lastCapturedAsk = lastCapturedAsk));
  e.latestAsk = lastCapturedAsk.latestAsk;
}
//@ chunk-wd9kxbpn.js:15608-15801 placement
function kickJobOnTurnStart(e, n, r) {
  if ((classifyJobCleanliness(e), disarmStartupWedgeWatchdog(), e.kicked)) return;
  ((e.kicked = !0),
    (e.bridgeWriteChain = e.bridgeWriteChain
      .then(() => markJobActive(n, r, e.storageV5, e.lastBridgeNeeds))
      .then(() => parsePermissionModeFlag(e.storageV5))
      .catch(logJobWriteError)),
    syncPermissionNeeds(e, n));
}
/**
 * 作为后台任务运行时，把当前的权限需求串行同步到 bridge。
 */
//@ chunk-wd9kxbpn.js:15801-16069 placement
function syncPermissionNeeds(e, n) {
  if (!isActingAsBgJob()) return;
  let r = KE.current();
  if (!r) return;
  e.bridgeWriteChain = e.bridgeWriteChain
    .then(() => e.inFlight ?? void 0)
    .catch(() => {})
    .then(() => {
      let lastBridgeNeeds = e.lastBridgeNeeds;
      return (
        (e.lastBridgeNeeds = r.text),
        writeJobNeeds(n, r, e.storageV5, lastBridgeNeeds, !0).catch((o) => {
          if (!isENOENT(o)) logJobWriteError(o);
        })
      );
    });
}
//@ chunk-wd9kxbpn.js:16069-16367 placement
function maybeClassifyJob(e, n, r, u, o, d, s) {
  if (isActingAsBgJob() && !e.kicked)
    ((e.kicked = !0),
      markJobActive(n, { userText: void 0, isTurnStart: !1 }, e.storageV5, e.lastBridgeNeeds).catch(
        logJobWriteError,
      ));
  let now = Date.now(),
    p = s.has("repl") ? Ke : De;
  if (now - e.lastClassifyAt < p) return;
  if (e.inFlight) return;
  ((e.lastClassifyAt = now),
    runJobClassification(e, n, r, e.capturedIntent, u, o, d, s, !0, !1).catch(logJobWriteError));
}
//@ chunk-wd9kxbpn.js:16367-16742 placement
function appendJobTimeline(e, n, r) {
  let u =
    jsonStringify(r) +
    `
`;
  if (e !== void 0 && isValidKeySegment(n)) {
    e.append(STORAGE_SPACES.jobTimeline(n), [{ data: u }])
      .then((o) => {
        if (!o.ok) {
          let error = o.error;
          logJobWriteError(
            Object.assign(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `[jobs] v5 timeline append failed: ${formatStorageError(error)}`,
                "[jobs] v5 timeline append failed",
              ),
              { code: wft(error) ? "ENOENT" : "telemetryCode" in error ? error.telemetryCode : void 0 },
            ),
          );
        }
      })
      .catch(logJobWriteError);
    return;
  }
  appendFile(join(getJobDir(n), "timeline.jsonl"), u, "utf-8").catch(logJobWriteError);
}
/**
 * 回合开始或用户输入时把作业置为 active：清除需要处理的提示与阻塞，用户文本不同于意图时作为新 detail 写入并追加时间线。
 */
//@ chunk-wd9kxbpn.js:16742-17412 placement
async function markJobActive(e, { userText: userText, isTurnStart: isTurnStart }, u, o) {
  let d = getJobDir(e),
    s = await readJobState(d, u);
  if (!s) return;
  if (s.tempo === "active") return;
  if (isSettled(s) && !userText && !isTurnStart) return;
  let h = KE.current();
  if (s.tempo === "blocked" && h !== null && (h.text === s.needs || o === s.needs)) return;
  let iso = new Date().toISOString(),
    w = userText ? redactSecrets(SYSTEM_REMINDER_CLOSE(userText)).replace(/\s+/g, " ").trim() : "",
    any = [s.intent, s.initialPrompt].some((A) => !!A && redactSecrets(A).replace(/\s+/g, " ").trim() === w),
    y = w && !any ? truncateWithEllipsis(w, Hg) : void 0;
  if (
    (await q(
      d,
      {
        ...s,
        ...(y !== void 0 && { detail: y, output: null }),
        tempo: "active",
        inFlight: getInFlightSnapshot(),
        needs: void 0,
        block: void 0,
        suggestedReply: void 0,
        updatedAt: iso,
      },
      { tempo: "active", needs: "", ...(y !== void 0 && { detail: y }) },
      u,
    ),
    y)
  )
    appendJobTimeline(u, e, { at: iso, state: s.state, detail: y, text: "" });
}
/**
 * 根据当前权限请求把作业置为 blocked（写入 needs/overlay/questions），或在请求消失时恢复为 active/idle；读两次状态以避免覆盖更新。
 */
//@ chunk-wd9kxbpn.js:17412-18162 placement
async function writeJobNeeds(e, n, r, u, o = !1) {
  let d = getJobDir(e),
    s = n?.text ?? null,
    h = n?.overlay === !0,
    p = await readJobState(d, r);
  if (!p) return;
  let w = (O) =>
      O.tempo === "blocked" &&
      O.needs !== void 0 &&
      O.needs !== IDLE_NEEDS &&
      !isOverlayNeeds(O) &&
      O.needs !== u,
    E = (O) => O.tempo !== "blocked" || (u !== void 0 && O.needs !== u);
  if (s) {
    if (isTerminal(p.state)) return;
    if (p.tempo === "blocked" && p.needs === s) return;
    if ((h || o) && w(p)) return;
  } else if (E(p)) return;
  let y = (await readJobState(d, r)) ?? p;
  if (s) {
    if (isTerminal(y.state)) return;
    if (y.tempo === "blocked" && y.needs === s) return;
    if ((h || o) && w(y)) return;
  } else if (E(y)) return;
  let A = s ? "blocked" : isSessionActive() ? "active" : "idle";
  await q(
    d,
    {
      ...y,
      tempo: A,
      inFlight: getInFlightSnapshot(),
      needs: s ?? void 0,
      needsOverlay: s && h ? s : void 0,
      block: n?.questions ? { questions: n.questions } : void 0,
      suggestedReply: void 0,
      updatedAt: new Date().toISOString(),
    },
    { tempo: A, needs: s ?? "" },
    r,
  );
}

export {
  q,
  Xe,
  writeJobNeeds,
  appendJobTimeline,
  syncPermissionNeeds,
  getClassifierModel,
  Fe,
  logBgAgentDispatch,
  describeToolActivity,
  getBgClassifierConfig,
  De,
  Ye,
  ze,
  Ne,
  _e,
  et,
  Ze,
  getThreadRecapPrompt,
};
