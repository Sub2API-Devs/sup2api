/**
 * plugins/functionHooks/dispatch/chain.ts
 *
 * 函数钩子按层（core/prepend/user/append）分发链（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (83)
 * attribution: placement 81, layout 2
 */
import { Lt, UI_ELEMENT_TYPES } from "../ui/elements.js";
import { pd } from "../../../utils/hooks/functionHookMatchers.js";
import {
  isAbortError,
  errorMessage,
  sanitizeErrorName,
  withTelemetryMessage,
  AbortError,
} from "../../../utils/errors.js";
import { abortReasonText, HooksError, tBi, Ros, BSi, fEe } from "../hooksErrors.js";
import {
  zRt,
  createUnappliedReporter,
  H5e,
  endDownstreamWait,
  normalizeNextArgument,
  findBypassingFloor,
  outsideBudget,
  Dt,
  TAn,
  warnOversizedPluginText,
} from "./valueSizing.js";
import { nfcLower } from "../../../utils/stringUtils.js";
import { isBuiltinPluginId } from "../../builtinPlugins.js";
import { hasSimilarMarketplaceName } from "../../../utils/plugins/marketplaceNames.js";
import { tiersBeneath, Jfr } from "../builtinHooksModule.js";
import {
  SLOW_HOOK_REPORT_INTERVAL_MS,
  createSlowHookReportMap,
  reportPluginHookWithoutNext,
} from "./slowHookReports.js";
import { scrubLine } from "../ui/textScrub.js";
import { Oa, describeStreamHookOverrun, cEe } from "./streamChain.js";
import { matchesEventPattern } from "../eventPatterns.js";
import { uniq } from "../../../utils/collections.js";
import { pu } from "../../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { Pf } from "../../../utils/untrustedValues.js";
import { ge } from "../../../utils/identity.js";
import { to } from "../../../utils/valueSlot.js";

//@ chunk-4121qate.js:71251-71293 placement
var oa = (e) => `${e.surface}:${e.component}`;
/**
 * 生成警告器：ui.resolve 钩子扣留某 UI 元素时，每种元素只警告一次。
 */
//@ chunk-4121qate.js:71293-71521 placement
function createWithheldElementWarner(e) {
  let o = new Set();
  return (r) => {
    let n = r === void 0 ? Lt : UI_ELEMENT_TYPES[r];
    return (s) => {
      if (!n.includes(s) || o.has(s)) return;
      (o.add(s),
        pd().log(
          `${e}: $.ui.resolve: <${s}> was withheld by a ui.resolve hook; it draws a fragment`,
          "warn",
        ));
    };
  };
}
/**
 * 钩子处理器所在层：core 为 core，托管为 prepend，其余取 tier（默认 user）。
 */
//@ chunk-4121qate.js:71521-71622 placement
function handlerTier(e) {
  let o = e.isCore === !0,
    r = o ? "core" : "prepend";
  return o || e.isManaged === !0 ? r : (e.tier ?? "user");
}
//@ chunk-4121qate.js:71622-71669 placement
function QJ(e, o) {
  try {
    return o(e);
  } catch {
    return;
  }
}
//@ chunk-4121qate.js:71669-71732 placement
var _Ue = (e, o) =>
  o.aborted && QJ(e, (r) => isAbortError(r) || errorMessage(r) === abortReasonText(o)) === !0;
//@ chunk-4121qate.js:71732-71776 placement
var Se = (e) => e.isCore === !0 || e.isManaged === !0;
/**
 * 在 next.to 链上追加一步（冻结），to 取链中最远的目标。
 */
//@ chunk-4121qate.js:76361-76514 placement
function appendNextToStep(e, o) {
  return Object.freeze([
    ...e,
    Object.freeze({
      ...o,
      ...(o.to === "user" && { isPastPeers: !0 }),
      to: e.reduce((r, n) => (zRt(n.to) > zRt(r) ? n.to : r), o.to),
    }),
  ]);
}
//@ chunk-4121qate.js:76514-76542 placement
var frs = (e) => `next.to:${e}`;
//@ chunk-4121qate.js:76542-76568 placement
var freeze_4 = Object.freeze([]);
/**
 * 判断插件属于哪一层：内置插件为 builtin（列在最外层时为 prepend），其他按 prepend/append 配置与是否同名市场决定。
 */
//@ chunk-4121qate.js:76568-76818 placement
function pluginTier(e, o, r) {
  let n = nfcLower(e);
  if (isBuiltinPluginId(e)) return r.outermost.includes(n) ? "prepend" : "builtin";
  let s = hasSimilarMarketplaceName(e, o),
    i = (a) => r[a].includes(n) && (r.from[a] === "user" ? !s : s),
    p = s ? "prepend" : "user",
    f = i("prepend") ? "prepend" : "append";
  return i("prepend") || i("append") ? f : p;
}
/**
 * 解析 next.to() 指向的层（user/append…），只允许托管插件使用
 */
//@ chunk-4121qate.js:76818-77456 placement
function resolveNextTier(e, o, r) {
  if (o.length === 0) throw new HooksError(`${r.plugin}: next.to() names no tier`);
  let n = tiersBeneath(r.tier);
  return o.toReversed().reduce((s, i) => {
    if (!Jfr(i))
      throw new HooksError(
        `${r.plugin}: next.to names "${String(i)}", which is not a tier a dispatch continues at (user, append, builtin, core)`,
      );
    if (n.length === 0)
      throw new HooksError(
        `${r.plugin}: next.to is available to managed plugins (prependPlugins / appendPlugins) only, not to a ${r.tier} hook`,
      );
    if (!n.includes(i))
      throw new HooksError(
        `${r.plugin}: next.to("${i}") skips nothing from ${r.tier}; a ${r.tier} hook may continue at ` +
          tiersBeneath(r.tier).join(", "),
      );
    return appendNextToStep(s, { from: r.tier, to: i, plugin: r.plugin });
  }, e);
}
//@ chunk-4121qate.js:77456-77514 placement
function ur(e) {
  return e >= SLOW_HOOK_REPORT_INTERVAL_MS && e % SLOW_HOOK_REPORT_INTERVAL_MS === 0
    ? `${e / SLOW_HOOK_REPORT_INTERVAL_MS}s`
    : `${e}ms`;
}
//@ chunk-4121qate.js:77514-77553 placement
var Vn = "the call refused in its place";
//@ chunk-4121qate.js:77553-77598 placement
var prs = "failed closed: its .catch answered";
//@ chunk-4121qate.js:77598-77628 placement
var cr = "a value with no text";
//@ chunk-4121qate.js:77628-77668 placement
var Re = (e) => QJ(e, (o) => String(errorMessage(o))) ?? cr;
//@ chunk-4121qate.js:77668-77801 placement
function errorKindOf(e) {
  let r = e instanceof HooksError && e.thrownName !== void 0 ? { name: e.thrownName } : e;
  return e instanceof Error ? (sanitizeErrorName(r) ?? "Error") : "unknown";
}
//@ chunk-4121qate.js:77801-77875 placement
var xt = (e) => `errorKind=${QJ(e, errorKindOf) ?? "unknown"} errorChars=${Re(e).length}`;
//@ chunk-4121qate.js:77875-77965 placement
function ha(e, o, r) {
  return `hook failed closed: ${e}: ${xt(o)} (${r}; its .catch answered)`;
}
//@ chunk-4121qate.js:77965-78027 placement
function ka(e, o, r) {
  return `hook failed: ${e}: ${xt(o)} (${r})`;
}
//@ chunk-4121qate.js:78027-78089 placement
var Kt = (e, o) => (o.startsWith(`${e.name}: `) ? o : `${e.name}: ${o}`);
//@ chunk-4121qate.js:78089-78158 placement
var dr = "left out; the call was interrupted, so the dispatch rejects";
/**
 * 钩子已结算后再调用 next() 时记警告并返回错误。
 */
//@ chunk-4121qate.js:78158-78291 placement
function nextAfterSettledError(e) {
  return (
    pd().log(`hooks module ${e}: next() after it settled; refused`, "warn"),
    new HooksError(`${e}: next() after it settled`)
  );
}
//@ chunk-4121qate.js:78291-78371 placement
var Vg = "left mid-stream; what it yielded stands, the rest came from beneath it";
//@ chunk-4121qate.js:78371-78428 placement
var zn = "what ran beneath it stands; its result withheld";
//@ chunk-4121qate.js:79046-79171 placement
function errorNamePrefix(e) {
  let o = e instanceof HooksError,
    r = !o && e instanceof Error,
    n = o ? e.thrownName : r ? e.name : void 0;
  return n === void 0 ? "" : `${n}: `;
}
//@ chunk-4121qate.js:79171-79214 placement
var lr = (e) => scrubLine(`${QJ(e, errorNamePrefix) ?? ""}${Re(e)}`);
//@ chunk-4121qate.js:79214-79698 placement
function describeHookOverrun(e, o) {
  let {
      expiredMs: expiredMs,
      lingeredMs: lingeredMs,
      shape: shape,
      refusedSubject: refusedSubject,
      caught: caught,
    } = o,
    f = caught === void 0 ? "" : `; ${caught}`,
    a = refusedSubject === void 0 ? {} : { subject: refusedSubject };
  if (expiredMs !== void 0) return { kind: "budget", why: `ran past its ${ur(expiredMs)} budget${f}`, ...a };
  if (lingeredMs !== void 0)
    return {
      kind: "lingered",
      why: `did not stop within ${ur(lingeredMs)} of the turn being interrupted`,
      ...a,
    };
  return shape !== void 0
    ? {
        kind: "shape",
        why: `returned the wrong shape (${scrubLine(shape)})`,
        ...(refusedSubject !== void 0 && { refusedSubject: refusedSubject }),
        ...a,
      }
    : { kind: "threw", why: `threw ${lr(e)}${f}`, ...a };
}
/**
 * 记录钩子处理器失败（日志 + hookFailed 事件，含效果分类）；返回带插件名的原因文本。
 */
//@ chunk-4121qate.js:79698-80101 placement
function reportHandlerFailure({ error: error, handler: handler, site: site, effect: effect, cause: cause }) {
  let i = Kt(handler, Re(error));
  if ((pd().log(ka(handler.name, error, `${site.event}; ${effect}`), "error"), !Se(handler))) {
    let p = handler.isHop === !0,
      f = effect === dr,
      a = effect === Vn,
      m = effect === zn;
    pd().hookFailed({
      plugin: handler.name,
      environmentId: handler.environmentId,
      event: site.event,
      reason: i,
      effect: effect,
      hasOverrun: !1,
      skip: p
        ? void 0
        : {
            ...describeHookOverrun(error, cause),
            ...(f && { isCallRejected: f }),
            ...(a && { isCallRefused: a }),
            ...(m && { isResultWithheld: m }),
          },
    });
  }
  return i;
}
//@ chunk-4121qate.js:80101-80132 placement
var ba = createUnappliedReporter("its answer stands");
//@ chunk-4121qate.js:80132-80184 placement
var Sa = "skipped; what is below it ran in its place";
//@ chunk-4121qate.js:80184-80238 placement
var Ea = "skipped; its last next() run's result stands";
/**
 * 钩子超出预算后仍在运行一段时间则记录"失控"错误与事件。
 */
//@ chunk-4121qate.js:80238-80606 placement
function watchOverrun(e, o, r) {
  let n = !1,
    s = () => {
      n = !0;
    };
  e.then(s, s);
  let i = Oa.get()?.lingerMs ?? H5e;
  setTimeout(() => {
    if (n || Se(o)) return;
    let f = Kt(o, `still running ${i}ms after its budget ran out; ignores its signal`);
    (pd().log(`hook overran: ${f} (${r.event})`, "error"),
      pd().hookFailed({
        plugin: o.name,
        event: r.event,
        reason: f,
        effect: "counted toward a runaway",
        hasOverrun: !0,
      }));
  }, i).unref?.();
}
//@ chunk-4121qate.js:80606-80649 placement
var ko = () => ({ entry: void 0, beneath: void 0 });
//@ chunk-4121qate.js:80649-80691 placement
function Wt(e, o) {
  e.entry = Object.freeze(o);
}
//@ chunk-4121qate.js:80691-80780 placement
function nfr(e) {
  let { error: error } = e;
  if (error === void 0) return;
  return { error: error, called: e.called === !0 };
}
//@ chunk-4121qate.js:80780-80797 placement
var CLIENT = "client";
//@ chunk-4121qate.js:80797-80823 placement
var freeze_5 = Object.freeze([]);
//@ chunk-4121qate.js:80823-80840 placement
var ENGINE = "engine";
//@ chunk-4121qate.js:80840-80888 placement
var freeze_6 = Object.freeze({ plugin: ENGINE, tier: "core" });
/**
 * 冻结 $ 接口对象：函数成员与对象本身的原型置为 null 后 Object.freeze。被函数钩子各处广泛使用。
 */
//@ chunk-4121qate.js:80888-81042 placement
function freezeApiObject(e) {
  for (let o of Object.values(e)) if (typeof o === "function") Object.setPrototypeOf(o, null);
  return (Object.setPrototypeOf(e, null), Object.freeze(e));
}
//@ chunk-4121qate.js:81042-81096 placement
function NH(e) {
  return (Object.setPrototypeOf(e, null), e);
}
//@ chunk-4121qate.js:81096-81127 placement
var Zn = (e) => NH((o, r) => matchesEventPattern(o, e));
//@ chunk-4121qate.js:81127-81193 placement
var UNLIMITED_BUDGET = Object.freeze({ ms: 0, remainingMs: Number.POSITIVE_INFINITY });
//@ chunk-4121qate.js:81193-81526 placement = CONSOLE_STDERR_METHODS (0.333)
function freezeHookCall(e) {
  let { call: o, signal: signal, event: event, origin: origin } = e,
    i = NH(o);
  if (
    ((i.to = NH(e.to)),
    (i.signal = signal),
    (i.is = e.is),
    (i.event = event),
    (i.origin = origin),
    e.caught !== void 0)
  )
    Object.assign(i, e.caught);
  return (
    Object.defineProperty(i, "trace", { get: NH(e.trace), enumerable: !0 }),
    Object.defineProperty(i, "budget", { get: NH(e.budget ?? (() => UNLIMITED_BUDGET)), enumerable: !0 }),
    Object.freeze(i)
  );
}
//@ chunk-4121qate.js:81526-81546 placement
var makeHookCall = (e) => freezeHookCall(e);
//@ chunk-4121qate.js:81546-81576 placement
var mrs = (e, o, r) => o.to(e, ...r);
//@ chunk-4121qate.js:81576-81606 placement
var CAn = (e, o, r) => o.to(e, ...r);
/**
 * 从 hook call 中复制上下文字段（signal、is、event、origin、trace、budget、caught）。
 */
//@ chunk-4121qate.js:81606-81729 placement
var hookCallContext = (e) => ({
  signal: e.signal,
  is: e.is,
  event: e.event,
  origin: e.origin,
  trace: () => e.trace,
  budget: () => e.budget,
  caught: nfr(e),
});
/**
 * 沿 beneath 链收集运行轨迹条目，冻结返回。
 */
//@ chunk-4121qate.js:81729-81865 placement
function traceOfRun(e) {
  let o = [];
  for (let r = e; r !== void 0; r = r.beneath) if (r.entry !== void 0) o.push(r.entry);
  return o.length === 0 ? freeze_5 : Object.freeze(o);
}
//@ chunk-4121qate.js:81865-82126 placement
var createBottomStep =
  ({ bottom: bottom, index: index, event: event }) =>
  async (n, s, { run: run, floors: floors }) => {
    let startTime = performance.now(),
      a = "rejected",
      m;
    try {
      return ((m = await bottom(n, s, floors)), (a = "returned"), m);
    } finally {
      Wt(run, {
        index: index,
        plugin: ENGINE,
        tier: "core",
        event: event,
        outcome: a,
        ms: performance.now() - startTime,
        received: n,
        returned: m,
      });
    }
  };
/**
 * 把源 AbortSignal 的中止转发到目标 controller，返回解除函数。
 */
//@ chunk-4121qate.js:82126-82327 placement = createCapacityWake (0.799)
function forwardAbort(sourceSignal, targetController) {
  if (sourceSignal === void 0) return () => {};
  if (sourceSignal.aborted) return (targetController.abort(sourceSignal.reason), () => {});
  let abort = () => targetController.abort(sourceSignal.reason);
  return (
    sourceSignal.addEventListener("abort", abort, { once: !0 }),
    () => sourceSignal.removeEventListener("abort", abort)
  );
}
/**
 * 插件调用链里"向下调用"助手（runBelow/call/to/replay），带预算暂停与中止转发。与 bridge 无关。
 */
//@ chunk-4121qate.js:82327-83248 placement
function createBelowCaller({
  handler: handler,
  below: below,
  site: site,
  e: n,
  budget: budget,
  downstreamSignal: downstreamSignal,
  state: state,
  run: run,
  floors: floors,
  tier: tier,
}) {
  async function c(y, g, x = floors) {
    let T = site.raiseArgument?.(y) ?? y;
    if (state.pendingDownstream++ === 0) (budget.pause(), (state.beneathSince = performance.now()));
    let abortController = new AbortController(),
      v = forwardAbort(downstreamSignal, abortController),
      R = forwardAbort(g, abortController),
      I = ko();
    if (!downstreamSignal.aborted) run.beneath = I;
    let V = below(T, abortController.signal, { run: I, floors: x }).then(
      (Q) => {
        let S = site.carry === void 0 ? Q : site.carry(Q, T, n);
        return ((state.belowRejected = void 0), (state.fromBelow = [...state.fromBelow, S]), S);
      },
      (Q) => {
        throw ((state.belowRejected = { error: Q }), Q);
      },
    );
    state.inFlight = V;
    try {
      return await V;
    } finally {
      (v(), R(), endDownstreamWait(state, budget));
    }
  }
  function u(y) {
    let g = normalizeNextArgument({ handler: handler, site: site, e: n }, y);
    if (state.settled) throw nextAfterSettledError(handler.name);
    return g;
  }
  let l = (y) => resolveNextTier(floors, y, { plugin: handler.name, tier: tier });
  return {
    runBelow: c,
    call: async (y, g, x) => c(u(y), g, x),
    to: async (y, g) => c(u(y), void 0, l(g)),
    replay: async (y, g, x) =>
      state.inFlight ?? c(normalizeNextArgument({ handler: handler, site: site, e: n }, y), g, x),
    replayTo: async (y, g) =>
      state.inFlight ?? c(normalizeNextArgument({ handler: handler, site: site, e: n }, y), void 0, l(g)),
  };
}
//@ chunk-4121qate.js:83248-83320 placement
var grs = (e) => Promise.reject(new HooksError(`no implementation for ${e.event}`));
//@ chunk-4121qate.js:83320-83375 placement
var Ra = (e, o) => forwardAbort(e, { abort: (r) => o.abort(QJ(r, tBi) ?? r) });
/**
 * 把同一跳的多个插件处理器合并为一个链节点（名字相连、层级与插件列表）。
 */
//@ chunk-4121qate.js:83375-83723 layout
var createHopHandler = (e, o) => ({
  name: o.map((r) => r.name).join("+"),
  tier: o[0]?.tier,
  tiers: uniq(o.map(handlerTier)),
  plugins: o.map((r) => r.name),
  ...(o.at(-1)?.answersForEngine && { answersForEngine: !0 }),
  budgetMs: 0,
  isHop: !0,
  ...(o[0]?.withheld && { withheld: o[0].withheld }),
  run: (r, n, { call: s, floors: floors, cutAt: cutAt }) =>
    e.run({ members: o, e: r, call: s, signal: n.signal, origin: n.origin, floors: floors, cutAt: cutAt }),
});
//@ chunk-4121qate.js:83723-83906 placement = generateUniqueTeammateName (0.611)
var groupByHop = (e) =>
  e.reduce((o, r) => {
    let at = o.at(-1);
    return r.hop !== void 0 && at?.hop?.key === r.hop.key
      ? [...o.slice(0, -1), { hop: at.hop, members: [...at.members, r] }]
      : [...o, { hop: r.hop, members: [r] }];
  }, []);
/**
 * 把插件钩子成员列表按 hop 合并成执行阶段（切分误归 spawnMultiAgent）。
 */
//@ chunk-4121qate.js:83906-84042 layout
var groupIntoHops = (e, o = !1) =>
  (o ? e.map((r) => ({ hop: r.hop, members: [r] })) : groupByHop(e)).map((r) => {
    let hop = r.hop;
    return hop === void 0 ? r.members[0] : createHopHandler(hop, r.members);
  });
//@ chunk-4121qate.js:84042-84053 placement
var gr = 1e4;
//@ chunk-4121qate.js:84053-84065 placement
var Gt = createSlowHookReportMap();
//@ chunk-4121qate.js:84065-84078 placement
var rfr = pu();
//@ chunk-4121qate.js:84078-84217 placement
function recordPassedBy(e) {
  try {
    rfr.get()?.(e);
  } catch (error) {
    pd().log(
      `passed-by: a sighting of ${e.link} on ${e.event} was not recorded: ${errorMessage(error)}`,
      "error",
    );
  }
}
//@ chunk-4121qate.js:84217-84356 placement
function flushBypassCount(e, o, r) {
  let n = Gt.get(e)?.count ?? 0;
  if ((Gt.delete(e), n > 0))
    (pd().log(`${o} ${n} more times in the last ${gr / SLOW_HOOK_REPORT_INTERVAL_MS}s`),
      recordPassedBy({ ...r, count: n }));
}
//@ chunk-4121qate.js:84356-84368 placement
var hrs = 256;
/**
 * 记录被跳过的插件钩子（按事件/插件/原因计数，有上限），返回首次出现的插件列表。
 */
//@ chunk-4121qate.js:84368-84623 placement
function recordSkipNotices(e, o) {
  let { plugins: plugins, event: event, by: by, count: count } = o,
    p = [];
  if (e === void 0) return p;
  for (let f of plugins) {
    let a = `${event} ${f} ${by}`,
      m = e.get(a),
      c = m !== void 0 || e.size < hrs;
    if (c) e.set(a, { plugin: f, event: event, by: by, count: (m?.count ?? 0) + count });
    if (c && m === void 0) p.push(f);
  }
  return p;
}
//@ chunk-4121qate.js:84623-84636 placement
var yrs = pu();
//@ chunk-4121qate.js:84636-84695 placement
function Dx() {
  try {
    return yrs.get()?.() ?? "";
  } catch {
    return "";
  }
}
//@ chunk-4121qate.js:84695-84976 placement
function noteBypass(e) {
  let { link: link, tier: tier, event: event, by: by, session: session } = e,
    p = `${session} ${event} ${link} ${by}`,
    f = Gt.get(p);
  if (f !== void 0) {
    f.count += 1;
    return;
  }
  let a = `${link}: ${event} bypassed by ${by} (tier ${tier})`;
  (pd().log(`${a}; beneath runs`), recordPassedBy(e));
  let m = setTimeout(flushBypassCount, gr, p, a, e);
  (m.unref(), Gt.set(p, { count: 0, timer: m }));
}
/**
 * 若该层已被更高层的 next.to 越过，记录"被绕过"并返回新的下降状态，否则 undefined。
 */
//@ chunk-4121qate.js:84976-85491 placement
function maybeBypassHandler({
  handler: handler,
  tier: tier,
  index: index,
  site: site,
  e: s,
  descent: descent,
}) {
  let { run: run, floors: floors } = descent;
  if (floors.length === 0 || Se(handler)) return;
  let mapped = (handler.isHop === !0 ? (handler.tiers ?? []) : [tier]).map((g) =>
      findBypassingFloor(floors, g, handler.name),
    ),
    l = mapped.length > 0 && mapped.every((g) => g !== void 0) ? mapped[0] : void 0;
  if (l === void 0) return;
  (noteBypass({
    link: handler.name,
    plugins: handler.plugins ?? [handler.name],
    tier: tier,
    event: site.event,
    by: l,
    count: 1,
    session: Dx(),
  }),
    Wt(run, {
      index: index,
      plugin: handler.name,
      tier: tier,
      event: site.event,
      outcome: "skipped",
      reason: `bypassed by ${l}`,
      ms: 0,
      received: s,
      returned: void 0,
    }));
  let y = ko();
  return ((run.beneath = y), { run: y, floors: floors });
}
//@ chunk-4121qate.js:85491-85542 placement
function os(e) {
  if (!Pf(e)) Object.freeze(e);
  return e;
}
//@ chunk-4121qate.js:85542-85741 placement
var createChainHookCall = ({
  call: e,
  to: to,
  signal: signal,
  event: event,
  origin: origin,
  run: run,
  budget: budget,
  caught: caught,
}) =>
  freezeHookCall({
    call: e,
    to: (a, ...m) => to(a, m),
    signal: signal,
    is: Zn(event),
    event: event,
    origin: origin,
    trace: () => traceOfRun(run.beneath),
    budget: () => budget.reading(),
    caught: caught,
  });
//@ chunk-4121qate.js:85741-85864 placement
var createChainState = () => ({
  pendingDownstream: 0,
  settled: !1,
  inFlight: void 0,
  fromBelow: [],
  belowRejected: void 0,
  beneathMs: 0,
  beneathSince: 0,
});
/**
 * 为被中止的钩子调用生成 AbortError：优先使用现成的中止错误，否则包装中止原因（遥测里不带插件细节）。
 */
//@ chunk-4121qate.js:85864-86080 placement
function abortErrorFor(e, o) {
  return (
    [o, e.reason].find((r) => QJ(r, (n) => n instanceof Error && isAbortError(n)) === !0) ??
    QJ(e, (r) =>
      withTelemetryMessage(
        new AbortError(abortReasonText(r)),
        "function hooks call aborted (reason not reported: it may contain plugin details)",
      ),
    ) ??
    new AbortError(cr)
  );
}
/**
 * 应用站点的 keptResult 规则：结果被部分保留时记录原因，出错时写入插件日志。
 */
//@ chunk-4121qate.js:86080-86388 placement
function applyKeptResult({ handler: handler, site: site, e: r, fromBelow: fromBelow }, s) {
  let i = s;
  try {
    let p = site.keptResult?.(s, r, fromBelow);
    if (p !== void 0) ((i = p.kept), ba(handler, site.event, p.why));
  } catch (error) {
    try {
      pd().log(
        `${handler.name}: what the engine keeps of its ${site.event} answer could not be settled or said (${Re(error)}); the answer stands`,
        "error",
      );
    } catch {
      return i;
    }
  }
  return i;
}
//@ chunk-4121qate.js:86388-86452 placement
function Na(e, o) {
  return o !== void 0 ? `its .catch returned ${o}` : e;
}
//@ chunk-4121qate.js:86452-86561 placement
function catchFailureText({ kind: kind, error: error, rejection: rejection }) {
  let n = kind === "throw",
    s = rejection === void 0 ? void 0 : Re(rejection.error);
  return n ? Re(error) : s;
}
//@ chunk-4121qate.js:86561-87600 placement
async function runHookCatch({
  handler: handler,
  e: o,
  signal: signal,
  state: state,
  handle: handle,
  site: site,
  origin: origin,
  run: run,
  cutAt: cutAt,
  kind: kind,
  error: error,
}) {
  let u = handler.catch;
  if (u === void 0) return { answer: void 0, problem: void 0 };
  let l = state.inFlight !== void 0;
  await state.inFlight?.then(void 0, () => {
    return;
  });
  let y = catchFailureText({ kind: kind, error: error, rejection: state.belowRejected }),
    abortController = new AbortController(),
    x = forwardAbort(signal, abortController),
    T = !1,
    h = `${handler.name}: next() after its .catch settled`,
    v = (Q) => (T ? Promise.reject(new HooksError(h)) : outsideBudget(Q)),
    R = describeStreamHookOverrun(Dt, signal, cutAt),
    I = createChainHookCall({
      call: (Q, S, L) => v(() => handle.replay(Q, S, L)),
      to: (Q, S) => v(() => handle.replayTo(Q, S)),
      signal: abortController.signal,
      event: site.event,
      origin: origin,
      run: run,
      budget: R,
      caught: {
        error: Object.freeze({ kind: kind, ...(y === void 0 ? {} : { message: y }), budget: Dt }),
        called: l,
      },
    }),
    V;
  try {
    return (
      (V = TAn.run(R, () => u(o, I))),
      { answer: R.expired === void 0 ? await V : await Promise.race([V, R.expired]), problem: void 0 }
    );
  } catch (error) {
    if (_Ue(error, signal)) throw abortErrorFor(signal, error);
    let S = ur(Dt),
      isExpired = R.isExpired(),
      B = isExpired ? `its .catch ran past its ${S} grace` : `its .catch threw ${lr(error)}`;
    if ((abortController.abort(new HooksError(`${handler.name}: ${B}`)), isExpired && V !== void 0))
      watchOverrun(V, handler, site);
    return { answer: void 0, problem: B, thrown: error };
  } finally {
    ((T = !0), R.clear(), x());
  }
}
/**
 * 按层运行函数钩子链：next() 传递、拒绝向上传递、超时告警
 */
//@ chunk-4121qate.js:87600-91403 placement
var runHookChain =
  ({
    handler: handler,
    index: index,
    below: below,
    site: site,
    budgetMs: budgetMs,
    cutAt: cutAt,
    origin: origin,
    nothingBelow: nothingBelow,
    answersForEngine: answersForEngine,
  }) =>
  async (m, c, u) => {
    let { run: run, floors: floors } = u,
      g = handlerTier(handler),
      x = maybeBypassHandler({ handler: handler, tier: g, index: index, site: site, e: m, descent: u });
    if (x !== void 0) return below(m, c, x);
    let startTime = performance.now(),
      h = createChainState(),
      abortController = new AbortController(),
      R = forwardAbort(c, abortController),
      abortController_2 = new AbortController(),
      V = forwardAbort(c, abortController_2),
      Q = handler.budgetMs ?? budgetMs,
      S = describeStreamHookOverrun(Q, c, cutAt),
      L = os(m),
      B = createBelowCaller({
        handler: handler,
        below: below,
        site: site,
        e: m,
        budget: S,
        downstreamSignal: abortController.signal,
        state: h,
        run: run,
        floors: floors,
        tier: g,
      }),
      { call: j, to: to, runBelow: runBelow } = B,
      te = createChainHookCall({
        call: j,
        to: to,
        signal: abortController_2.signal,
        event: site.event,
        origin: origin,
        run: run,
        budget: S,
      });
    function Ne(ee) {
      return (
        pd().log(`${handler.name}: its next() rejected below it (${site.event}); the rejection passes up`),
        ee
      );
    }
    function Ve(ee) {
      let settle = site.settle,
        de = Se(handler) || settle === void 0;
      try {
        let pe = de ? ee : settle(ee),
          fe = Se(handler) ? pe : (site.restoreResult?.(pe, h.fromBelow, m, handler) ?? pe),
          ke = Se(handler) || answersForEngine ? fe : (site.stripResult?.(fe, h.fromBelow, handler) ?? fe),
          Pe = handler.isHop === !0 && site.checkHop !== void 0,
          Oe = Se(handler) ? void 0 : Pe ? site.checkHop?.(ke, m) : site.check?.(ke, m, h.fromBelow),
          be = Oe === void 0 && !Se(handler) && handler.isHop !== !0;
        if (be) warnOversizedPluginText(handler.name, site.event, site.measure?.(ke, m, h.fromBelow));
        if (be && site.isLateRefusal?.(ke, h.fromBelow) === !0)
          pd().log(
            `${handler.name}: ${site.event} hook refused after its next() was answered: what ran beneath it is not undone`,
            "warn",
          );
        return {
          settled: be
            ? applyKeptResult({ handler: handler, site: site, e: m, fromBelow: h.fromBelow }, ke)
            : ke,
          problem: Oe,
        };
      } catch (error) {
        let Ee = `a result the site cannot read (${Re(error)})`;
        return { settled: ee, problem: Ee };
      }
    }
    function Me(ee) {
      let Y = Ros(ee),
        de = h.inFlight !== void 0,
        pe = de ? Y?.afterNext : Y?.answer,
        fe = pe === void 0 ? void 0 : Ve(pe),
        Ee = de && Y?.isWithholding === !0;
      if (Y?.isNoted === !0) handler.withheld?.();
      return fe?.problem === void 0 && fe !== void 0 ? { settled: fe.settled, effect: Ee ? zn : Vn } : void 0;
    }
    let E,
      Z,
      z = "rejected",
      Ke = !1,
      ce,
      Te;
    try {
      ce = TAn.run(S, () => handler.run(L, te, { call: j, floors: floors, cutAt: cutAt }));
      let Y = S.expired === void 0 ? await ce : await Promise.race([ce, S.expired]);
      if (Y === void 0) throw ((Te = "no result"), new HooksError("returned no result"));
      let { settled: settled, problem: problem } = Ve(Y);
      if (problem !== void 0) throw ((Te = problem), new HooksError(`returned ${problem}`));
      ((E = settled),
        (Z = settled),
        (z = Y === h.fromBelow.at(-1) ? "passed" : "returned"),
        (Ke = h.inFlight === void 0 && !Se(handler) && handler.isHop !== !0));
    } catch (error) {
      if (_Ue(error, c)) throw abortErrorFor(c, error);
      let isExpired = S.isExpired(),
        de = isExpired ? void 0 : h.belowRejected;
      if (de !== void 0 && handler.catch === void 0) throw Ne(de.error);
      let pe = Kt(handler, Re(error));
      if (((h.settled = !0), isExpired && ce !== void 0))
        (abortController_2.abort(new HooksError(pe)), watchOverrun(ce, handler, site));
      let fe = h.inFlight !== void 0,
        Ee = isExpired ? void 0 : Me(error),
        Pe =
          c.aborted || Ee !== void 0
            ? { answer: void 0, problem: void 0, thrown: void 0 }
            : await runHookCatch({
                handler: handler,
                e: L,
                signal: c,
                state: h,
                handle: B,
                site: site,
                origin: origin,
                run: run,
                cutAt: cutAt,
                kind: isExpired ? "timeout" : "throw",
                error: error,
              }),
        Oe = Pe.answer === void 0 ? void 0 : Ve(Pe.answer),
        be = Oe !== void 0 && Oe.problem === void 0,
        De = Ee ?? (be ? void 0 : Me(Pe.thrown));
      if (De !== void 0)
        (reportHandlerFailure({
          error: error,
          handler: handler,
          site: site,
          effect: De.effect,
          cause: { expiredMs: void 0, lingeredMs: void 0, shape: Te, caught: Na(Pe.problem, Oe?.problem) },
        }),
          (E = De.settled),
          (Z = De.settled));
      else if (be)
        (pd().log(ha(handler.name, error, site.event), "warn"),
          pd().hookFailed({
            plugin: handler.name,
            environmentId: handler.environmentId,
            event: site.event,
            reason: pe,
            effect: prs,
            hasOverrun: !1,
          }),
          (E = Oe.settled),
          (Z = Oe.settled),
          (z = "caught"));
      else if (de === void 0) {
        let ft = fe && c.aborted && QJ(c, BSi) !== !0;
        if (
          (reportHandlerFailure({
            error: error,
            handler: handler,
            site: site,
            effect: ft ? dr : fe ? Ea : Sa,
            cause: {
              expiredMs: isExpired ? Q : void 0,
              lingeredMs: S.hasGraceExpired() ? H5e : void 0,
              shape: Te,
              refusedSubject: site.refusedSubject?.(m),
              caught: Na(Pe.problem, Oe?.problem),
            },
          }),
          ft)
        )
          throw abortErrorFor(c);
        if (h.inFlight === void 0 && nothingBelow) throw error;
        ((E = await (h.inFlight ?? runBelow(m))),
          (Z = fe ? E : void 0),
          (z = isExpired ? "expired" : fe ? "kept" : "skipped"));
      } else throw Ne(de.error);
    } finally {
      ((h.settled = !0), S.clear(), V(), R());
      let startTime_2 = performance.now(),
        Y =
          startTime_2 -
          startTime -
          h.beneathMs -
          (h.pendingDownstream > 0 ? startTime_2 - h.beneathSince : 0);
      if (
        (Wt(run, {
          index: index,
          plugin: handler.isCore === !0 ? ENGINE : handler.name,
          tier: g,
          event: site.event,
          outcome: z,
          ms: Y,
          received: m,
          returned: Z,
        }),
        Ke)
      )
        reportPluginHookWithoutNext({ plugin: handler.name, tier: g, event: site.event, ms: Y });
      if (h.pendingDownstream > 0) abortController.abort(new fEe(`${handler.name} settled the call`));
    }
    return E;
  };
/**
 * 记录钩子链各步的输入与产出：keep 追加，of/last/all/ran 查询。
 */
//@ chunk-4121qate.js:91403-91578 placement
function createStepRecorder() {
  let e = [];
  return {
    keep: (o, r) => e.push({ input: o, made: r }),
    of: (o) => (o === void 0 ? void 0 : e[o - 1]),
    last: (o) => (o === void 0 ? e.at(-1) : e.findLast(o)),
    all: () => e,
    ran: () => e.length > 0,
  };
}
//@ chunk-4121qate.js:91578-91614 placement
var gZr = ge(to(), (e) => e.set(void 0));
//@ chunk-4121qate.js:91614-91636 placement
var hZr = () => gZr.get();
//@ chunk-4121qate.js:91636-91663 placement
var jme = () => hZr() !== void 0;
//@ chunk-4121qate.js:91663-92357 placement
async function reportChainFailure({
  e,
  handlers: handlers,
  site: site,
  signal: signal = new AbortController().signal,
  isHopFold: isHopFold,
  isUnfolded: isUnfolded,
  cutAt: cutAt,
  budgetMs: budgetMs = site.budgetMs ?? Oa.get()?.ms ?? cEe,
  bottom: bottom,
  origin: origin = freeze_6,
  floors: floors = freeze_4,
  trace: trace,
}) {
  let l = groupIntoHops(handlers, isUnfolded),
    y = createBottomStep({ bottom: bottom ?? (() => grs(site)), index: l.length, event: site.event }),
    g = ko(),
    x = jme(),
    abortController = new AbortController(),
    h = isHopFold === !0 ? void 0 : Ra(signal, abortController);
  return l
    .reduceRight((v, R, I) => {
      let V = I === l.length - 1;
      return runHookChain({
        handler: R,
        index: I,
        below: v,
        site: site,
        budgetMs: budgetMs,
        cutAt: cutAt,
        origin: origin,
        nothingBelow: bottom === void 0 && V,
        answersForEngine: x && V && R.answersForEngine === !0,
      });
    }, y)(e, isHopFold === !0 ? signal : abortController.signal, { run: g, floors: floors })
    .then((v) => (trace?.(traceOfRun(g)), v))
    .catch((v) => {
      if (!_Ue(v, signal)) pd().log(`hooks chain failed: ${xt(v)}`, "error");
      throw v;
    })
    .finally(h);
}

export {
  ENGINE,
  NH,
  freezeApiObject,
  reportChainFailure,
  createStepRecorder,
  grs,
  gZr,
  frs,
  freezeHookCall,
  CAn,
  nfr,
  makeHookCall,
  hookCallContext,
  mrs,
  freeze_4,
  Se,
  UNLIMITED_BUDGET,
  forwardAbort,
  Re,
  nextAfterSettledError,
  handlerTier,
  maybeBypassHandler,
  os,
  ko,
  resolveNextTier,
  Zn,
  traceOfRun,
  _Ue,
  abortErrorFor,
  lr,
  Kt,
  watchOverrun,
  ha,
  prs,
  QJ,
  dr,
  Ea,
  Vg,
  Sa,
  reportHandlerFailure,
  Wt,
  freeze_6,
  Ra,
  xt,
  oa,
  createWithheldElementWarner,
  pluginTier,
  jme,
  hZr,
  freeze_5,
  yrs,
  rfr,
  recordSkipNotices,
  hrs,
  CLIENT,
  appendNextToStep,
};
