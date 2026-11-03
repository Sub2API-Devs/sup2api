/**
 * utils/permissions/serverClassifier/context.ts
 *
 * 2.1.316 新增：服务端分类器上下文
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (34)
 * attribution: placement 34
 */
import { HostScoped } from "../../hostScoped.js";
import { getRootSession } from "../../../bootstrap/state.js";
import { antEnv } from "../../env.js";
import { logError } from "../../log.js";
import { toError } from "../../errors.js";
import { createKeyedQueue } from "../../promiseQueue.js";
import {
  MAX_ARTIFACT_SLUG_LENGTH,
  MAX_ARTIFACT_TEXT_LENGTH,
  MAX_CONTEXT_ENTRY_LENGTH,
  MAX_TOOL_USE_IDS,
} from "./schemas.js";
import { countCodePoints } from "../../stringUtils.js";
import { parseClassifierRequest } from "../../messages/apiNormalization.js";
import { uniq } from "../../collections.js";
import { wireName } from "../../../services/mcp/serverIdentity.js";
import { jsonByteLength } from "./clamp.js";
import { logEvent } from "../../../services/analytics/index.js";
import { lit as lit_2 } from "../../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../debug.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { TENGU_SNUG_WALL } from "../../../services/api/withRetry.js";

//@ chunk-e6aww6q8.js:129356-129404 placement
/**
 * metaJsonLine：生成 {meta} 的 JSON 行。
 */
function metaJsonLine(meta) {
  return JSON.stringify({
    meta,
  });
}
//@ chunk-e6aww6q8.js:129404-129556 placement
class ServerClassifierContextLines {
  lines = new Map();
  record(e, n) {
    this.lines.set(e, n);
  }
  linesFor(e) {
    return this.lines.get(e);
  }
  forget(e) {
    this.lines.delete(e);
  }
  reset() {
    this.lines.clear();
  }
}
//@ chunk-e6aww6q8.js:129556-129583 placement
var classifierContextLinesSlot = new HostScoped(() => new ServerClassifierContextLines());
//@ chunk-e6aww6q8.js:129583-129622 placement
function classifierContextLines() {
  return classifierContextLinesSlot.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:129622-129658 placement
/**
 * recordClassifierContext：记录分类器上下文中。
 */
function recordClassifierContext(e, n) {
  classifierContextLines().record(e, n);
}
//@ chunk-e6aww6q8.js:129658-129690 placement
/**
 * forgetClassifierContext：丢弃分类器上下文行。
 */
function forgetClassifierContext(toolUseId) {
  classifierContextLines().forget(toolUseId);
}
//@ chunk-e6aww6q8.js:129690-129730 placement
/**
 * classifierContextLinesFor：取某请求的上下文行。
 */
function classifierContextLinesFor(e) {
  return classifierContextLines().linesFor(e);
}
//@ chunk-e6aww6q8.js:129730-129764 placement
function classifierOverlapEnabled() {
  return resolveClassifierOverlapFlag().value;
}
//@ chunk-e6aww6q8.js:129764-129900 placement
function resolveClassifierOverlapFlag() {
  let CLAUDE_CODE_AUTO_MODE_CLASSIFIER_OVERLAP = antEnv.CLAUDE_CODE_AUTO_MODE_CLASSIFIER_OVERLAP;
  if (CLAUDE_CODE_AUTO_MODE_CLASSIFIER_OVERLAP !== undefined)
    return {
      value: CLAUDE_CODE_AUTO_MODE_CLASSIFIER_OVERLAP,
      src: "env",
    };
  return {
    value: false,
    src: "default",
  };
}
//@ chunk-e6aww6q8.js:129900-129910 placement
var MAX_QUEUED_CLASSIFIER_SLOTS = 4;
//@ chunk-e6aww6q8.js:129910-130256 placement
/**
 * 分类器结果提交的排队位：place 设定前序位置与放弃回调，runInTurn 等前序完成后执行并释放；未交接时 dispose 释放。
 */
class CommitTurnSlot {
  earlierPlaces;
  giveUpPlace;
  handedOff = false;
  place(earlierPlaces, giveUpPlace) {
    this.earlierPlaces = earlierPlaces;
    this.giveUpPlace = giveUpPlace;
  }
  reached() {
    return this.earlierPlaces;
  }
  runInTurn(e) {
    let earlierPlaces = this.earlierPlaces;
    let giveUpPlace = this.giveUpPlace;
    if (earlierPlaces === undefined || giveUpPlace === undefined) {
      e();
      return;
    }
    this.handedOff = true;
    earlierPlaces.then(e).then(giveUpPlace, (error) => {
      giveUpPlace();
      logError(toError(error));
    });
  }
  [Symbol.dispose]() {
    if (!this.handedOff) this.giveUpPlace?.();
  }
}
//@ chunk-e6aww6q8.js:130256-130318 placement
var CLASSIFIER_QUEUE_NOOP_HOOKS = {
  transcriptStatePublished: () => {},
  stageOneDone: () => {},
};
//@ chunk-e6aww6q8.js:130318-132869 placement
/**
 * 分类器请求排队器：同一键默认串行；开启重叠时按"车道"并发，跟踪未发布、第一阶段中、已过第一阶段的请求，缓存前缀已热时允许有限并发，并记录已分类的调用 id。
 */
class ClassifierRequestQueue {
  serializer = createKeyedQueue();
  pending = new Map();
  lanes = new Map();
  classifiedCallIds = new Set();
  enqueue(key, run, telemetry, options) {
    let pendingCount = this.pending.get(key) ?? 0;
    if (pendingCount === 0 && classifierOverlapEnabledSafe())
      this.lanes.set(key, {
        waiting: [],
        running: 0,
        unpublished: 0,
        inStageOne: 0,
        pastStageOne: 0,
        warmPrefixes: new Set(),
        commitLine: Promise.resolve(),
      });
    this.pending.set(key, pendingCount + 1);
    let lane = this.lanes.get(key);
    let now = Date.now();
    let result =
      lane === undefined
        ? this.serializer.run(key, () => {
            callSafely(telemetry, {
              queueDepth: pendingCount,
              queueWaitMs: Date.now() - now,
            });
            return run(CLASSIFIER_QUEUE_NOOP_HOOKS);
          })
        : this.runOverlapping(
            lane,
            run,
            telemetry,
            {
              queueDepth: pendingCount,
              enqueuedAt: now,
            },
            options,
          );
    result
      .then(
        () => {
          return;
        },
        () => {
          return;
        },
      )
      .then(() => {
        let L = (this.pending.get(key) ?? 1) - 1;
        if (L <= 0) {
          this.pending.delete(key);
          if (this.lanes.get(key) === lane) this.lanes.delete(key);
        } else this.pending.set(key, L);
      });
    return result;
  }
  runOverlapping(e, n, r, s, h) {
    let cachePrefix = h?.cachePrefix ?? "";
    let promise = new Promise((resolve, reject) => {
      e.waiting.push({
        cachePrefix,
        start: () => this.startCall(e, cachePrefix, n, r, s, resolve, reject),
      });
    });
    let commitLine = e.commitLine;
    let L = () => {};
    let promise_2 = new Promise((resolve) => {
      L = resolve;
    });
    e.commitLine = commitLine.then(() => promise_2);
    if (h?.commitTurn === undefined) promise.then(L, L);
    else h.commitTurn.place(commitLine, L);
    this.startReadySoon(e);
    return promise;
  }
  startCall(e, cachePrefix, r, s, h, y, S) {
    callSafely(s, {
      queueDepth: h.queueDepth,
      queueWaitMs: Date.now() - h.enqueuedAt,
      overlap: {
        inFlightAtStart: e.running,
        overlapped: e.running > 0,
        releasedByEscalation: e.pastStageOne > 0,
      },
    });
    let w = {
      lane: e,
      cachePrefix,
      published: false,
      inStageOne: true,
      pastStageOne: false,
    };
    e.running++;
    e.unpublished++;
    e.inStageOne++;
    let promise = new Promise((resolve) =>
      resolve(
        r({
          transcriptStatePublished: () => this.reportPublished(w),
          stageOneDone: () => this.reportStageOneDone(w),
        }),
      ),
    );
    promise.then(y, S);
    let G = () => this.settle(w);
    promise.then(G, G);
  }
  reportPublished(e) {
    this.publish(e);
    this.startReadySoon(e.lane);
  }
  reportStageOneDone(e) {
    this.leaveStageOne(e, true);
    this.startReadySoon(e.lane);
  }
  settle(e) {
    this.leaveStageOne(e, false);
    if (e.pastStageOne) e.lane.pastStageOne--;
    e.lane.running--;
    this.startReady(e.lane);
  }
  publish(e) {
    if (!e.published) {
      e.published = true;
      e.lane.unpublished--;
    }
  }
  leaveStageOne(e, n) {
    this.publish(e);
    if (e.inStageOne) {
      e.inStageOne = false;
      e.lane.inStageOne--;
      if (n) {
        e.pastStageOne = true;
        e.lane.pastStageOne++;
        e.lane.warmPrefixes.add(e.cachePrefix);
      }
    }
  }
  startReadySoon(e) {
    Promise.resolve().then(() => this.startReady(e));
  }
  startReady(e) {
    while (this.headMayStart(e)) e.waiting.shift()?.start();
  }
  headMayStart(e) {
    let n = e.waiting[0];
    if (n === undefined || e.unpublished > 0) return false;
    return (
      e.inStageOne === 0 || (e.warmPrefixes.has(n.cachePrefix) && e.inStageOne < MAX_QUEUED_CLASSIFIER_SLOTS)
    );
  }
  recordClassifiedCall(e) {
    this.classifiedCallIds.add(e);
  }
  isRecordedClassifiedCall(e) {
    return this.classifiedCallIds.has(e);
  }
  get size() {
    return this.serializer.size + this.lanes.size;
  }
  reset() {
    this.serializer.clearForTest();
    this.pending.clear();
    this.lanes.clear();
    this.classifiedCallIds.clear();
  }
}
//@ chunk-e6aww6q8.js:132869-132896 placement
var classifierRequestQueueSlot = new HostScoped(() => new ClassifierRequestQueue());
//@ chunk-e6aww6q8.js:132896-132935 placement
function classifierRequestQueue() {
  return classifierRequestQueueSlot.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:132935-132987 placement
/**
 * enqueueClassifierRequest：入队分类器请求。
 */
function enqueueClassifierRequest(e, n, r, s) {
  return classifierRequestQueue().enqueue(e, n, r, s);
}
//@ chunk-e6aww6q8.js:132987-133033 placement
/**
 * recordClassifiedCall：记录已分类的工具调用。
 */
function recordClassifiedCall(id) {
  classifierRequestQueue().recordClassifiedCall(id);
}
//@ chunk-e6aww6q8.js:133033-133090 placement
/**
 * isClassifiedCall：该调用是否已分类。
 */
function isClassifiedCall(e) {
  return classifierRequestQueue().isRecordedClassifiedCall(e);
}
//@ chunk-e6aww6q8.js:133090-133150 placement
function classifierOverlapEnabledSafe() {
  try {
    return classifierOverlapEnabled();
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-e6aww6q8.js:133150-133187 placement
function callSafely(e, n) {
  try {
    e?.(n);
  } catch {}
}
//@ chunk-e6aww6q8.js:135297-135360 placement
/**
 * fitsContextLimits：上下文行数与长度是否超限。
 */
function fitsContextLimits(e) {
  return (
    e.length <= MAX_ARTIFACT_SLUG_LENGTH && e.every((n) => countCodePoints(n) <= MAX_ARTIFACT_TEXT_LENGTH)
  );
}
//@ chunk-e6aww6q8.js:143633-144004 placement
/**
 * 记录在途的服务端分类请求上下文，结算后把每个工具调用 id 映射到对应的 {request, context}。
 */
class ClassifierRequestHistory {
  inFlight = new Map();
  judged = new Map();
  recordRequest(e, n) {
    this.inFlight.set(e, n);
  }
  settleRequest(e, n) {
    let r = this.inFlight.get(e);
    if (r === undefined) return;
    this.inFlight.delete(e);
    let s = {
      request: e,
      context: r,
    };
    for (let h of n) this.judged.set(h, s);
  }
  forgetRequest(e) {
    this.inFlight.delete(e);
  }
  historyFor(e) {
    return this.judged.get(e);
  }
  reset() {
    this.inFlight.clear();
    this.judged.clear();
  }
}
//@ chunk-e6aww6q8.js:144004-144031 placement
var classifierHistorySlot = new HostScoped(() => new ClassifierRequestHistory());
//@ chunk-e6aww6q8.js:144031-144070 placement
function classifierHistory() {
  return classifierHistorySlot.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:144070-144113 placement
/**
 * recordClassifierRequest：记录分类请求。
 */
function recordClassifierRequest(key, n) {
  classifierHistory().recordRequest(key, n);
}
//@ chunk-e6aww6q8.js:144113-144156 placement
/**
 * settleClassifierRequest：结算分类请求。
 */
function settleClassifierRequest(key, n) {
  classifierHistory().settleRequest(key, n);
}
//@ chunk-e6aww6q8.js:144156-144195 placement
/**
 * forgetClassifierRequest：丢弃分类请求。
 */
function forgetClassifierRequest(key) {
  classifierHistory().forgetRequest(key);
}
//@ chunk-e6aww6q8.js:144195-144238 placement
/**
 * classifierHistoryFor：取某调用的历史。
 */
function classifierHistoryFor(toolUseId) {
  return classifierHistory().historyFor(toolUseId);
}
//@ chunk-e6aww6q8.js:144238-144825 placement
/**
 * 从用户消息的 serverClassifierContext 中收集先前请求的上下文，按请求分组并汇总对应的 tool_use_id（每组有上限）。
 */
function collectPriorServerContexts(messages) {
  let groups = [];
  let byRequest = new Map();
  for (let s of messages) {
    if (s.type !== "user") continue;
    let serverClassifierContext = s.serverClassifierContext;
    if (serverClassifierContext === undefined) continue;
    let content = s.message.content;
    if (!Array.isArray(content)) continue;
    let filtered = content.filter((q) => typeof q === "object" && q !== null && q.type === "tool_result");
    if (filtered.length !== 1) continue;
    let toolUseId = filtered[0].tool_use_id;
    if (typeof toolUseId !== "string" || toolUseId.length > MAX_CONTEXT_ENTRY_LENGTH) continue;
    let parsed = parseClassifierRequest(serverClassifierContext);
    if (parsed === undefined) continue;
    let group = byRequest.get(parsed.request);
    if (group === undefined) {
      group = {
        tool_use_ids: [],
        context: parsed.context,
      };
      byRequest.set(parsed.request, group);
      groups.push(group);
    }
    if (group.tool_use_ids.length < MAX_TOOL_USE_IDS && !group.tool_use_ids.includes(toolUseId))
      group.tool_use_ids.push(toolUseId);
  }
  return groups;
}
//@ chunk-e6aww6q8.js:2512602-2512721 placement
var SERVER_CONTEXT_FIELD_MAX_BYTES = 256000;
var SERVER_CONTEXT_MAX_BYTES = 1040000;
var TOOL_HOST_ATTACHED = "tool_host_attached";
var STRUCTURED_OUTPUT_IS_HANDBACK = "structured_output_is_handback";
var JUDGE_ONLY_TOOLS = "judge_only_tools";
var MAX_JUDGE_ONLY_TOOL_NAME_LENGTH = 200;
//@ chunk-e6aww6q8.js:2512721-2512906 placement
function pickPriorTurnContext(e) {
  return {
    git_state: e.git_state,
    ...(e.chrome_navigation !== undefined && {
      chrome_navigation: e.chrome_navigation,
    }),
    ...(e.live_cwd !== undefined && {
      live_cwd: e.live_cwd,
    }),
    platform: e.platform,
  };
}
//@ chunk-e6aww6q8.js:2512906-2513380 placement
/**
 * 组装服务端分类器请求上下文：judge-only 工具名规整排序（名字过长则放弃），加上上一轮、系统提醒与文本来源；超过大小上限时记 tengu_auto_mode_context_withheld 并放弃。
 */
function buildServerClassifierRequestContext({
  autoModeServerContext,
  priorTurnContext,
  systemReminders,
  textProvenance,
}) {
  let h =
    autoModeServerContext.judgeOnlyTools &&
    uniq([...autoModeServerContext.judgeOnlyTools].map(wireName)).sort();
  if (h?.length === 0 || h?.some((w) => w.length > MAX_JUDGE_ONLY_TOOL_NAME_LENGTH)) return;
  let serverClassifierContext = buildServerClassifierContext(
    autoModeServerContext.context,
    autoModeServerContext.git,
    priorTurnContext ?? [],
    systemReminders ?? [],
    autoModeServerContext.artifacts,
    autoModeServerContext.computerAttached === true,
    autoModeServerContext.structuredOutputIsHandback === true,
    h,
  );
  if (textProvenance !== undefined) serverClassifierContext.text_provenance = textProvenance;
  let S = jsonByteLength(serverClassifierContext);
  if (S > SERVER_CONTEXT_MAX_BYTES) {
    logEvent("tengu_auto_mode_context_withheld", {
      reason: lit_2("field_over_ceiling"),
      bytes: S,
    });
    return;
  }
  return serverClassifierContext;
}
//@ chunk-e6aww6q8.js:2513380-2515571 placement
/**
 * 构造发给服务端分类器的上下文（上一轮、浏览器标签、git 状态、系统提醒等）。
 */
function buildServerClassifierContext(context, n, r, s, artifacts, y, S, w) {
  let L = (gitState, Me, We, ze, lt, Je) => {
    let chromeNavigation = context.chrome_navigation;
    return {
      v: 1,
      ...context,
      ...(chromeNavigation !== undefined && {
        chrome_navigation: Me
          ? chromeNavigation
          : {
              enabled: chromeNavigation.enabled,
              baselines: chromeNavigation.baselines,
            },
      }),
      git_state: gitState,
      ...(We.length > 0 && {
        prior_turn_context: We,
      }),
      ...(ze.length > 0 && {
        system_reminders: ze,
      }),
      ...(lt !== undefined && {
        artifacts: lt,
      }),
      ...(Je.length > 0 && {
        shed: Je,
      }),
      ...(y && {
        [TOOL_HOST_ATTACHED]: true,
      }),
      ...(S && {
        [STRUCTURED_OUTPUT_IS_HANDBACK]: true,
      }),
      ...(w !== undefined && {
        [JUDGE_ONLY_TOOLS]: w,
      }),
    };
  };
  let G = n;
  let q = context.chrome_navigation?.tabs !== undefined;
  let Z = r;
  let Se = s;
  let ke = artifacts;
  let we = [];
  let Ee = () => jsonByteLength(L(G, q, Z, Se, ke, we)) <= SERVER_CONTEXT_FIELD_MAX_BYTES;
  if (Ee()) return L(G, q, Z, Se, ke, we);
  if (Z.length > 0) {
    let Ie = Z.length;
    while (Ie > 0) {
      Ie = Math.floor(Ie / 2);
      Z = Ie > 0 ? r.slice(r.length - Ie) : [];
      if (Ie === 0) we.push("prior_turn_context");
      if (Ee()) return L(G, q, Z, Se, ke, we);
    }
  }
  if (q) {
    q = false;
    we.push("chrome_navigation.tabs");
    if (Ee()) return L(G, q, Z, Se, ke, we);
  }
  if (G.visibility !== null && G.visibility.visibility_cache.length > 0) {
    G = {
      ...G,
      visibility: {
        ...G.visibility,
        visibility_cache: [],
      },
      truncated: true,
    };
    we.push("git_state.visibility.visibility_cache");
    if (Ee()) return L(G, q, Z, Se, ke, we);
  }
  if (G.visibility !== null && G.visibility.remotes.length > 0) {
    G = {
      ...G,
      visibility: {
        ...G.visibility,
        remotes: [],
      },
      truncated: true,
    };
    we.push("git_state.visibility.remotes");
    if (Ee()) return L(G, q, Z, Se, ke, we);
  }
  if (G.status !== null && G.status.porcelain !== null) {
    G = {
      ...G,
      status: {
        ...G.status,
        porcelain: null,
        truncated: false,
      },
      truncated: true,
    };
    we.push("git_state.status.porcelain");
    if (Ee()) return L(G, q, Z, Se, ke, we);
  }
  if (Se.length > 0) {
    let Ie = Se.length;
    while (Ie > 0) {
      Ie = Math.floor(Ie / 2);
      Se = Ie > 0 ? s.slice(s.length - Ie) : [];
      if (Ie === 0) we.push("system_reminders");
      if (Ee()) return L(G, q, Z, Se, ke, we);
    }
  }
  if (ke !== undefined) {
    ke = undefined;
    we.push("artifacts");
  }
  let Ae = L(G, q, Z, Se, ke, we);
  if (jsonByteLength(Ae) > SERVER_CONTEXT_FIELD_MAX_BYTES) {
    logForDebugging(
      `[server-classifier] the permission rule lists alone exceed the auto-mode context budget (${SERVER_CONTEXT_FIELD_MAX_BYTES} bytes): every variable part (git state, repository visibility, Chrome tabs, prior-turn history, system-reminder ids, artifact state) was left out of this request's classifier context \u2014 trim the deny/ask rules or settings.autoMode entries`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_auto_mode_context_static_over_budget", {
      bytes: jsonByteLength(Ae),
      deny_rules: context.rules.deny.length,
      ask_rules: context.rules.ask.length,
      auto_mode_entries: context.auto_mode.soft_deny.length + context.auto_mode.hard_deny.length,
    });
  }
  return Ae;
}
//@ chunk-e6aww6q8.js:2515609-2515646 placement
/**
 * isSnugWallOn：开关 tengu_snug_wall。
 */
function isSnugWallOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SNUG_WALL, false) === true;
}
export {
  classifierContextLinesFor,
  isClassifiedCall,
  classifierHistoryFor,
  CommitTurnSlot,
  enqueueClassifierRequest,
  buildServerClassifierRequestContext,
  collectPriorServerContexts,
  recordClassifierRequest,
  pickPriorTurnContext,
  metaJsonLine,
  recordClassifierContext,
  recordClassifiedCall,
  forgetClassifierContext,
  fitsContextLimits,
  isSnugWallOn,
  settleClassifierRequest,
  forgetClassifierRequest,
};
