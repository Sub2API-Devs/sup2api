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
import { Lao, Nao, a$e, bTt } from "./schemas.js";
import { countCodePoints } from "../../stringUtils.js";
import { parseClassifierRequest } from "../../messages/apiNormalization.js";
import { uniq } from "../../collections.js";
import { wireName } from "../../../services/mcp/serverIdentity.js";
import { W_e } from "./clamp.js";
import { logEvent } from "../../../services/analytics/index.js";
import { lit as lit_2 } from "../../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../debug.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { TENGU_SNUG_WALL } from "../../../services/api/withRetry.js";

//@ chunk-e6aww6q8.js:129356-129404 placement
function Hbt(e) {
  return JSON.stringify({ meta: e });
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
var Sao = new HostScoped(() => new ServerClassifierContextLines());
//@ chunk-e6aww6q8.js:129583-129622 placement
function QFe() {
  return Sao.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:129622-129658 placement
function JFe(e, n) {
  QFe().record(e, n);
}
//@ chunk-e6aww6q8.js:129658-129690 placement
function Fbt(e) {
  QFe().forget(e);
}
//@ chunk-e6aww6q8.js:129690-129730 placement
function c9(e) {
  return QFe().linesFor(e);
}
//@ chunk-e6aww6q8.js:129730-129764 placement
function nTt() {
  return resolveClassifierOverlapFlag().value;
}
//@ chunk-e6aww6q8.js:129764-129900 placement
function resolveClassifierOverlapFlag() {
  let CLAUDE_CODE_AUTO_MODE_CLASSIFIER_OVERLAP = antEnv.CLAUDE_CODE_AUTO_MODE_CLASSIFIER_OVERLAP;
  if (CLAUDE_CODE_AUTO_MODE_CLASSIFIER_OVERLAP !== void 0)
    return { value: CLAUDE_CODE_AUTO_MODE_CLASSIFIER_OVERLAP, src: "env" };
  return { value: !1, src: "default" };
}
//@ chunk-e6aww6q8.js:129900-129910 placement
var bao = 4;
/**
 * 分类器结果提交的排队位：place 设定前序位置与放弃回调，runInTurn 等前序完成后执行并释放；未交接时 dispose 释放。
 */
//@ chunk-e6aww6q8.js:129910-130256 placement
class CommitTurnSlot {
  earlierPlaces;
  giveUpPlace;
  handedOff = !1;
  place(e, n) {
    ((this.earlierPlaces = e), (this.giveUpPlace = n));
  }
  reached() {
    return this.earlierPlaces;
  }
  runInTurn(e) {
    let earlierPlaces = this.earlierPlaces,
      giveUpPlace = this.giveUpPlace;
    if (earlierPlaces === void 0 || giveUpPlace === void 0) {
      e();
      return;
    }
    ((this.handedOff = !0),
      earlierPlaces.then(e).then(giveUpPlace, (s) => {
        (giveUpPlace(), logError(toError(s)));
      }));
  }
  [Symbol.dispose]() {
    if (!this.handedOff) this.giveUpPlace?.();
  }
}
//@ chunk-e6aww6q8.js:130256-130318 placement
var wao = { transcriptStatePublished: () => {}, stageOneDone: () => {} };
/**
 * 分类器请求排队器：同一键默认串行；开启重叠时按"车道"并发，跟踪未发布、第一阶段中、已过第一阶段的请求，缓存前缀已热时允许有限并发，并记录已分类的调用 id。
 */
//@ chunk-e6aww6q8.js:130318-132869 placement
class ClassifierRequestQueue {
  serializer = createKeyedQueue();
  pending = new Map();
  lanes = new Map();
  classifiedCallIds = new Set();
  enqueue(key, run, telemetry, options) {
    let pendingCount = this.pending.get(key) ?? 0;
    if (pendingCount === 0 && vao())
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
    let lane = this.lanes.get(key),
      now = Date.now(),
      result =
        lane === void 0
          ? this.serializer.run(
              key,
              () => (oTt(telemetry, { queueDepth: pendingCount, queueWaitMs: Date.now() - now }), run(wao)),
            )
          : this.runOverlapping(lane, run, telemetry, { queueDepth: pendingCount, enqueuedAt: now }, options);
    return (
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
            if ((this.pending.delete(key), this.lanes.get(key) === lane)) this.lanes.delete(key);
          } else this.pending.set(key, L);
        }),
      result
    );
  }
  runOverlapping(e, n, r, s, h) {
    let y = h?.cachePrefix ?? "",
      promise = new Promise((q, Z) => {
        e.waiting.push({ cachePrefix: y, start: () => this.startCall(e, y, n, r, s, q, Z) });
      }),
      commitLine = e.commitLine,
      L = () => {},
      promise_2 = new Promise((q) => {
        L = q;
      });
    if (((e.commitLine = commitLine.then(() => promise_2)), h?.commitTurn === void 0)) promise.then(L, L);
    else h.commitTurn.place(commitLine, L);
    return (this.startReadySoon(e), promise);
  }
  startCall(e, n, r, s, h, y, S) {
    oTt(s, {
      queueDepth: h.queueDepth,
      queueWaitMs: Date.now() - h.enqueuedAt,
      overlap: {
        inFlightAtStart: e.running,
        overlapped: e.running > 0,
        releasedByEscalation: e.pastStageOne > 0,
      },
    });
    let w = { lane: e, cachePrefix: n, published: !1, inStageOne: !0, pastStageOne: !1 };
    (e.running++, e.unpublished++, e.inStageOne++);
    let promise = new Promise((q) =>
      q(
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
    (this.publish(e), this.startReadySoon(e.lane));
  }
  reportStageOneDone(e) {
    (this.leaveStageOne(e, !0), this.startReadySoon(e.lane));
  }
  settle(e) {
    if ((this.leaveStageOne(e, !1), e.pastStageOne)) e.lane.pastStageOne--;
    (e.lane.running--, this.startReady(e.lane));
  }
  publish(e) {
    if (!e.published) ((e.published = !0), e.lane.unpublished--);
  }
  leaveStageOne(e, n) {
    if ((this.publish(e), e.inStageOne)) {
      if (((e.inStageOne = !1), e.lane.inStageOne--, n))
        ((e.pastStageOne = !0), e.lane.pastStageOne++, e.lane.warmPrefixes.add(e.cachePrefix));
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
    if (n === void 0 || e.unpublished > 0) return !1;
    return e.inStageOne === 0 || (e.warmPrefixes.has(n.cachePrefix) && e.inStageOne < bao);
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
    (this.serializer.clearForTest(),
      this.pending.clear(),
      this.lanes.clear(),
      this.classifiedCallIds.clear());
  }
}
//@ chunk-e6aww6q8.js:132869-132896 placement
var Tao = new HostScoped(() => new ClassifierRequestQueue());
//@ chunk-e6aww6q8.js:132896-132935 placement
function ZFe() {
  return Tao.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:132935-132987 placement
function o3n(e, n, r, s) {
  return ZFe().enqueue(e, n, r, s);
}
//@ chunk-e6aww6q8.js:132987-133033 placement
function sTt(e) {
  ZFe().recordClassifiedCall(e);
}
//@ chunk-e6aww6q8.js:133033-133090 placement
function aue(e) {
  return ZFe().isRecordedClassifiedCall(e);
}
//@ chunk-e6aww6q8.js:133090-133150 placement
function vao() {
  try {
    return nTt();
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-e6aww6q8.js:133150-133187 placement
function oTt(e, n) {
  try {
    e?.(n);
  } catch {}
}
//@ chunk-e6aww6q8.js:135297-135360 placement
function w$o(e) {
  return e.length <= Lao && e.every((n) => countCodePoints(n) <= Nao);
}
/**
 * 记录在途的服务端分类请求上下文，结算后把每个工具调用 id 映射到对应的 {request, context}。
 */
//@ chunk-e6aww6q8.js:143633-144004 placement
class ClassifierRequestHistory {
  inFlight = new Map();
  judged = new Map();
  recordRequest(e, n) {
    this.inFlight.set(e, n);
  }
  settleRequest(e, n) {
    let r = this.inFlight.get(e);
    if (r === void 0) return;
    this.inFlight.delete(e);
    let s = { request: e, context: r };
    for (let h of n) this.judged.set(h, s);
  }
  forgetRequest(e) {
    this.inFlight.delete(e);
  }
  historyFor(e) {
    return this.judged.get(e);
  }
  reset() {
    (this.inFlight.clear(), this.judged.clear());
  }
}
//@ chunk-e6aww6q8.js:144004-144031 placement
var Hao = new HostScoped(() => new ClassifierRequestHistory());
//@ chunk-e6aww6q8.js:144031-144070 placement
function lue() {
  return Hao.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:144070-144113 placement
function vTt(e, n) {
  lue().recordRequest(e, n);
}
//@ chunk-e6aww6q8.js:144113-144156 placement
function ETt(e, n) {
  lue().settleRequest(e, n);
}
//@ chunk-e6aww6q8.js:144156-144195 placement
function RTt(e) {
  lue().forgetRequest(e);
}
//@ chunk-e6aww6q8.js:144195-144238 placement
function CTt(e) {
  return lue().historyFor(e);
}
/**
 * 从用户消息的 serverClassifierContext 中收集先前请求的上下文，按请求分组并汇总对应的 tool_use_id（每组有上限）。
 */
//@ chunk-e6aww6q8.js:144238-144825 placement
function collectPriorServerContexts(e) {
  let groups = [],
    byRequest = new Map();
  for (let s of e) {
    if (s.type !== "user") continue;
    let serverClassifierContext = s.serverClassifierContext;
    if (serverClassifierContext === void 0) continue;
    let content = s.message.content;
    if (!Array.isArray(content)) continue;
    let filtered = content.filter((q) => typeof q === "object" && q !== null && q.type === "tool_result");
    if (filtered.length !== 1) continue;
    let tool_use_id = filtered[0].tool_use_id;
    if (typeof tool_use_id !== "string" || tool_use_id.length > a$e) continue;
    let parsed = parseClassifierRequest(serverClassifierContext);
    if (parsed === void 0) continue;
    let group = byRequest.get(parsed.request);
    if (group === void 0)
      ((group = { tool_use_ids: [], context: parsed.context }),
        byRequest.set(parsed.request, group),
        groups.push(group));
    if (group.tool_use_ids.length < bTt && !group.tool_use_ids.includes(tool_use_id))
      group.tool_use_ids.push(tool_use_id);
  }
  return groups;
}
//@ chunk-e6aww6q8.js:2512602-2512721 placement
var SERVER_CONTEXT_FIELD_MAX_BYTES = 256000,
  SERVER_CONTEXT_MAX_BYTES = 1040000,
  TOOL_HOST_ATTACHED = "tool_host_attached",
  STRUCTURED_OUTPUT_IS_HANDBACK = "structured_output_is_handback",
  JUDGE_ONLY_TOOLS = "judge_only_tools",
  MAX_JUDGE_ONLY_TOOL_NAME_LENGTH = 200;
//@ chunk-e6aww6q8.js:2512721-2512906 placement
function pickPriorTurnContext(e) {
  return {
    git_state: e.git_state,
    ...(e.chrome_navigation !== void 0 && { chrome_navigation: e.chrome_navigation }),
    ...(e.live_cwd !== void 0 && { live_cwd: e.live_cwd }),
    platform: e.platform,
  };
}
/**
 * 组装服务端分类器请求上下文：judge-only 工具名规整排序（名字过长则放弃），加上上一轮、系统提醒与文本来源；超过大小上限时记 tengu_auto_mode_context_withheld 并放弃。
 */
//@ chunk-e6aww6q8.js:2512906-2513380 placement
function buildServerClassifierRequestContext({
  autoModeServerContext: autoModeServerContext,
  priorTurnContext: priorTurnContext,
  systemReminders: systemReminders,
  textProvenance: textProvenance,
}) {
  let h =
    autoModeServerContext.judgeOnlyTools &&
    uniq([...autoModeServerContext.judgeOnlyTools].map(wireName)).sort();
  if (h?.length === 0 || h?.some((w) => w.length > MAX_JUDGE_ONLY_TOOL_NAME_LENGTH)) return;
  let y = buildServerClassifierContext(
    autoModeServerContext.context,
    autoModeServerContext.git,
    priorTurnContext ?? [],
    systemReminders ?? [],
    autoModeServerContext.artifacts,
    autoModeServerContext.computerAttached === !0,
    autoModeServerContext.structuredOutputIsHandback === !0,
    h,
  );
  if (textProvenance !== void 0) y.text_provenance = textProvenance;
  let S = W_e(y);
  if (S > SERVER_CONTEXT_MAX_BYTES) {
    logEvent("tengu_auto_mode_context_withheld", { reason: lit_2("field_over_ceiling"), bytes: S });
    return;
  }
  return y;
}
/**
 * 构造发给服务端分类器的上下文（上一轮、浏览器标签、git 状态、系统提醒等）。
 */
//@ chunk-e6aww6q8.js:2513380-2515571 placement
function buildServerClassifierContext(e, n, r, s, h, y, S, w) {
  let L = (Ie, Me, We, ze, lt, Je) => {
      let chrome_navigation = e.chrome_navigation;
      return {
        v: 1,
        ...e,
        ...(chrome_navigation !== void 0 && {
          chrome_navigation: Me
            ? chrome_navigation
            : { enabled: chrome_navigation.enabled, baselines: chrome_navigation.baselines },
        }),
        git_state: Ie,
        ...(We.length > 0 && { prior_turn_context: We }),
        ...(ze.length > 0 && { system_reminders: ze }),
        ...(lt !== void 0 && { artifacts: lt }),
        ...(Je.length > 0 && { shed: Je }),
        ...(y && { [TOOL_HOST_ATTACHED]: !0 }),
        ...(S && { [STRUCTURED_OUTPUT_IS_HANDBACK]: !0 }),
        ...(w !== void 0 && { [JUDGE_ONLY_TOOLS]: w }),
      };
    },
    G = n,
    q = e.chrome_navigation?.tabs !== void 0,
    Z = r,
    Se = s,
    ke = h,
    we = [],
    Ee = () => W_e(L(G, q, Z, Se, ke, we)) <= SERVER_CONTEXT_FIELD_MAX_BYTES;
  if (Ee()) return L(G, q, Z, Se, ke, we);
  if (Z.length > 0) {
    let Ie = Z.length;
    while (Ie > 0) {
      if (((Ie = Math.floor(Ie / 2)), (Z = Ie > 0 ? r.slice(r.length - Ie) : []), Ie === 0))
        we.push("prior_turn_context");
      if (Ee()) return L(G, q, Z, Se, ke, we);
    }
  }
  if (q) {
    if (((q = !1), we.push("chrome_navigation.tabs"), Ee())) return L(G, q, Z, Se, ke, we);
  }
  if (G.visibility !== null && G.visibility.visibility_cache.length > 0) {
    if (
      ((G = { ...G, visibility: { ...G.visibility, visibility_cache: [] }, truncated: !0 }),
      we.push("git_state.visibility.visibility_cache"),
      Ee())
    )
      return L(G, q, Z, Se, ke, we);
  }
  if (G.visibility !== null && G.visibility.remotes.length > 0) {
    if (
      ((G = { ...G, visibility: { ...G.visibility, remotes: [] }, truncated: !0 }),
      we.push("git_state.visibility.remotes"),
      Ee())
    )
      return L(G, q, Z, Se, ke, we);
  }
  if (G.status !== null && G.status.porcelain !== null) {
    if (
      ((G = { ...G, status: { ...G.status, porcelain: null, truncated: !1 }, truncated: !0 }),
      we.push("git_state.status.porcelain"),
      Ee())
    )
      return L(G, q, Z, Se, ke, we);
  }
  if (Se.length > 0) {
    let Ie = Se.length;
    while (Ie > 0) {
      if (((Ie = Math.floor(Ie / 2)), (Se = Ie > 0 ? s.slice(s.length - Ie) : []), Ie === 0))
        we.push("system_reminders");
      if (Ee()) return L(G, q, Z, Se, ke, we);
    }
  }
  if (ke !== void 0) ((ke = void 0), we.push("artifacts"));
  let Ae = L(G, q, Z, Se, ke, we);
  if (W_e(Ae) > SERVER_CONTEXT_FIELD_MAX_BYTES)
    (logForDebugging(
      `[server-classifier] the permission rule lists alone exceed the auto-mode context budget (${SERVER_CONTEXT_FIELD_MAX_BYTES} bytes): every variable part (git state, repository visibility, Chrome tabs, prior-turn history, system-reminder ids, artifact state) was left out of this request's classifier context \u2014 trim the deny/ask rules or settings.autoMode entries`,
      { level: "warn" },
    ),
      logEvent("tengu_auto_mode_context_static_over_budget", {
        bytes: W_e(Ae),
        deny_rules: e.rules.deny.length,
        ask_rules: e.rules.ask.length,
        auto_mode_entries: e.auto_mode.soft_deny.length + e.auto_mode.hard_deny.length,
      }));
  return Ae;
}
//@ chunk-e6aww6q8.js:2515609-2515646 placement
function tQe() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SNUG_WALL, !1) === !0;
}

export {
  c9,
  aue,
  CTt,
  CommitTurnSlot,
  o3n,
  buildServerClassifierRequestContext,
  collectPriorServerContexts,
  vTt,
  pickPriorTurnContext,
  Hbt,
  JFe,
  sTt,
  Fbt,
  w$o,
  tQe,
  ETt,
  RTt,
};
