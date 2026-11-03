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
import { ALL_ELEMENT_TYPES, UI_ELEMENT_TYPES } from "../ui/elements.js";
import { matcherLog } from "../../../utils/hooks/functionHookMatchers.js";
import {
  isAbortError,
  errorMessage,
  sanitizeErrorName,
  withTelemetryMessage,
  AbortError,
} from "../../../utils/errors.js";
import {
  abortReasonText,
  HooksError,
  unwrapPlainDataError,
  readWeakTag,
  isPlainDataError,
  PlainDataError,
} from "../hooksErrors.js";
import {
  tierIndex,
  createUnappliedReporter,
  LINGER_GRACE_MS,
  endDownstreamWait,
  normalizeNextArgument,
  findBypassingFloor,
  outsideBudget,
  VALUE_NODE_SLACK,
  budgetPauseStorage,
  warnOversizedPluginText,
} from "./valueSizing.js";
import { nfcLower } from "../../../utils/stringUtils.js";
import { isBuiltinPluginId } from "../../builtinPlugins.js";
import { hasSimilarMarketplaceName } from "../../../utils/plugins/marketplaceNames.js";
import { tiersBeneath, isAbovePrepend } from "../builtinHooksModule.js";
import {
  SLOW_HOOK_REPORT_INTERVAL_MS_2,
  createSlowHookReportMap,
  reportPluginHookWithoutNext,
} from "./slowHookReports.js";
import { scrubLine } from "../ui/textScrub.js";
import { streamChainSlot, describeStreamHookOverrun, DEFAULT_HOOK_TIMEOUT_MS } from "./streamChain.js";
import { matchesEventPattern } from "../eventPatterns.js";
import { uniq } from "../../../utils/collections.js";
import { pu } from "../../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { isUntrustedObject } from "../../../utils/untrustedValues.js";
import { identity } from "../../../utils/identity.js";
import { createValueSlot } from "../../../utils/valueSlot.js";

//@ chunk-4121qate.js:71251-71293 placement
/**
 * surface:component
 */
var uiElementKey = (e) => `${e.surface}:${e.component}`;
//@ chunk-4121qate.js:71293-71521 placement
/**
 * 生成警告器：ui.resolve 钩子扣留某 UI 元素时，每种元素只警告一次。
 */
function createWithheldElementWarner(e) {
  let o = new Set();
  return (r) => {
    let n = r === undefined ? ALL_ELEMENT_TYPES : UI_ELEMENT_TYPES[r];
    return (s) => {
      if (!n.includes(s) || o.has(s)) return;
      o.add(s);
      matcherLog().log(
        `${e}: $.ui.resolve: <${s}> was withheld by a ui.resolve hook; it draws a fragment`,
        "warn",
      );
    };
  };
}
//@ chunk-4121qate.js:71521-71622 placement
/**
 * 钩子处理器所在层：core 为 core，托管为 prepend，其余取 tier（默认 user）。
 */
function handlerTier(handler) {
  let o = handler.isCore === true;
  let r = o ? "core" : "prepend";
  return o || handler.isManaged === true ? r : (handler.tier ?? "user");
}
//@ chunk-4121qate.js:71622-71669 placement
/**
 * 尝试执行，抛错返回 undefined
 */
function attempt(e, o) {
  try {
    return o(e);
  } catch {
    return;
  }
}
//@ chunk-4121qate.js:71669-71732 placement
/**
 * 是否因给定信号中止而抛错
 */
var isAbortOf = (error, o) =>
  o.aborted && attempt(error, (r) => isAbortError(r) || errorMessage(r) === abortReasonText(o)) === true;
//@ chunk-4121qate.js:71732-71776 placement
/**
 * 核心或托管步骤
 */
var isCoreOrManaged = (handler) => handler.isCore === true || handler.isManaged === true;
//@ chunk-4121qate.js:76361-76514 placement
/**
 * 在 next.to 链上追加一步（冻结），to 取链中最远的目标。
 */
function appendNextToStep(e, o) {
  return Object.freeze([
    ...e,
    Object.freeze({
      ...o,
      ...(o.to === "user" && {
        isPastPeers: true,
      }),
      to: e.reduce((acc, n) => (tierIndex(n.to) > tierIndex(acc) ? n.to : acc), o.to),
    }),
  ]);
}
//@ chunk-4121qate.js:76514-76542 placement
/**
 * 把层级名格式化成 next.to:<tier> 标签，作为分发链里「下一层」的键。
 */
var nextToLabel = (e) => `next.to:${e}`;
//@ chunk-4121qate.js:76542-76568 placement
var Y6t = Object.freeze([]);
//@ chunk-4121qate.js:76568-76818 placement
/**
 * 判断插件属于哪一层：内置插件为 builtin（列在最外层时为 prepend），其他按 prepend/append 配置与是否同名市场决定。
 */
function pluginTier(e, o, managedPluginOrder) {
  let n = nfcLower(e);
  if (isBuiltinPluginId(e)) return managedPluginOrder.outermost.includes(n) ? "prepend" : "builtin";
  let s = hasSimilarMarketplaceName(e, o);
  let i = (a) => managedPluginOrder[a].includes(n) && (managedPluginOrder.from[a] === "user" ? !s : s);
  let p = s ? "prepend" : "user";
  let f = i("prepend") ? "prepend" : "append";
  return i("prepend") || i("append") ? f : p;
}
//@ chunk-4121qate.js:76818-77456 placement
/**
 * 解析 next.to() 指向的层（user/append…），只允许托管插件使用
 */
function resolveNextTier(floors, o, r) {
  if (o.length === 0) throw new HooksError(`${r.plugin}: next.to() names no tier`);
  let n = tiersBeneath(r.tier);
  return o.toReversed().reduce((acc, i) => {
    if (!isAbovePrepend(i))
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
    return appendNextToStep(acc, {
      from: r.tier,
      to: i,
      plugin: r.plugin,
    });
  }, floors);
}
//@ chunk-4121qate.js:77456-77514 placement
/**
 * 毫秒或秒
 */
function formatDuration(e) {
  return e >= SLOW_HOOK_REPORT_INTERVAL_MS_2 && e % SLOW_HOOK_REPORT_INTERVAL_MS_2 === 0
    ? `${e / SLOW_HOOK_REPORT_INTERVAL_MS_2}s`
    : `${e}ms`;
}
//@ chunk-4121qate.js:77514-77553 placement
/**
 * 调用被替代拒绝
 */
var REFUSED_IN_PLACE = "the call refused in its place";
//@ chunk-4121qate.js:77553-77598 placement
/**
 * .catch 兜底后的失败
 */
var FAILED_CLOSED = "failed closed: its .catch answered";
//@ chunk-4121qate.js:77598-77628 placement
/**
 * 无文本的值
 */
var NO_TEXT_VALUE = "a value with no text";
//@ chunk-4121qate.js:77628-77668 placement
/**
 * 错误文本
 */
var errorTextOf = (error) => attempt(error, (o) => String(errorMessage(o))) ?? NO_TEXT_VALUE;
//@ chunk-4121qate.js:77668-77801 placement
function errorKindOf(e) {
  let r =
    e instanceof HooksError && e.thrownName !== undefined
      ? {
          name: e.thrownName,
        }
      : e;
  return e instanceof Error ? (sanitizeErrorName(r) ?? "Error") : "unknown";
}
//@ chunk-4121qate.js:77801-77875 placement
/**
 * 错误种类与长度摘要
 */
var errorSummary = (error) =>
  `errorKind=${attempt(error, errorKindOf) ?? "unknown"} errorChars=${errorTextOf(error).length}`;
//@ chunk-4121qate.js:77875-77965 placement
/**
 * 钩子以 .catch 兜底的失败说明
 */
function failedClosedText(name, o, event) {
  return `hook failed closed: ${name}: ${errorSummary(o)} (${event}; its .catch answered)`;
}
//@ chunk-4121qate.js:77965-78027 placement
/**
 * 钩子失败说明
 */
function hookFailedText(name, error, r) {
  return `hook failed: ${name}: ${errorSummary(error)} (${r})`;
}
//@ chunk-4121qate.js:78027-78089 placement
/**
 * 加钩子名前缀
 */
var withHookPrefix = (handler, o) => (o.startsWith(`${handler.name}: `) ? o : `${handler.name}: ${o}`);
//@ chunk-4121qate.js:78089-78158 placement
/**
 * 中断导致未执行
 */
var INTERRUPTED_LEFT_OUT = "left out; the call was interrupted, so the dispatch rejects";
//@ chunk-4121qate.js:78158-78291 placement
/**
 * 钩子已结算后再调用 next() 时记警告并返回错误。
 */
function nextAfterSettledError(name) {
  matcherLog().log(`hooks module ${name}: next() after it settled; refused`, "warn");
  return new HooksError(`${name}: next() after it settled`);
}
//@ chunk-4121qate.js:78291-78371 placement
/**
 * 中途离开流
 */
var LEFT_MID_STREAM = "left mid-stream; what it yielded stands, the rest came from beneath it";
//@ chunk-4121qate.js:78371-78428 placement
/**
 * 结果被扣留
 */
var RESULT_WITHHELD = "what ran beneath it stands; its result withheld";
//@ chunk-4121qate.js:79046-79171 placement
function errorNamePrefix(e) {
  let o = e instanceof HooksError;
  let r = !o && e instanceof Error;
  let n = o ? e.thrownName : r ? e.name : undefined;
  return n === undefined ? "" : `${n}: `;
}
//@ chunk-4121qate.js:79171-79214 placement
/**
 * 清洗后的错误文本
 */
var scrubErrorText = (error) => scrubLine(`${attempt(error, errorNamePrefix) ?? ""}${errorTextOf(error)}`);
//@ chunk-4121qate.js:79214-79698 placement
function describeHookOverrun(error, cause) {
  let { expiredMs, lingeredMs, shape, refusedSubject, caught } = cause;
  let f = caught === undefined ? "" : `; ${caught}`;
  let a =
    refusedSubject === undefined
      ? {}
      : {
          subject: refusedSubject,
        };
  if (expiredMs !== undefined)
    return {
      kind: "budget",
      why: `ran past its ${formatDuration(expiredMs)} budget${f}`,
      ...a,
    };
  if (lingeredMs !== undefined)
    return {
      kind: "lingered",
      why: `did not stop within ${formatDuration(lingeredMs)} of the turn being interrupted`,
      ...a,
    };
  return shape !== undefined
    ? {
        kind: "shape",
        why: `returned the wrong shape (${scrubLine(shape)})`,
        ...(refusedSubject !== undefined && {
          refusedSubject,
        }),
        ...a,
      }
    : {
        kind: "threw",
        why: `threw ${scrubErrorText(error)}${f}`,
        ...a,
      };
}
//@ chunk-4121qate.js:79698-80101 placement
/**
 * 记录钩子处理器失败（日志 + hookFailed 事件，含效果分类）；返回带插件名的原因文本。
 */
function reportHandlerFailure({ error, handler, site, effect, cause }) {
  let i = withHookPrefix(handler, errorTextOf(error));
  matcherLog().log(hookFailedText(handler.name, error, `${site.event}; ${effect}`), "error");
  if (!isCoreOrManaged(handler)) {
    let p = handler.isHop === true;
    let f = effect === INTERRUPTED_LEFT_OUT;
    let a = effect === REFUSED_IN_PLACE;
    let m = effect === RESULT_WITHHELD;
    matcherLog().hookFailed({
      plugin: handler.name,
      environmentId: handler.environmentId,
      event: site.event,
      reason: i,
      effect,
      hasOverrun: false,
      skip: p
        ? undefined
        : {
            ...describeHookOverrun(error, cause),
            ...(f && {
              isCallRejected: f,
            }),
            ...(a && {
              isCallRefused: a,
            }),
            ...(m && {
              isResultWithheld: m,
            }),
          },
    });
  }
  return i;
}
//@ chunk-4121qate.js:80101-80132 placement
/**
 * 其答案仍生效
 */
var unappliedAnswerStands = createUnappliedReporter("its answer stands");
//@ chunk-4121qate.js:80132-80184 placement
/**
 * 跳过，下层代替
 */
var SKIPPED_BELOW_RAN = "skipped; what is below it ran in its place";
//@ chunk-4121qate.js:80184-80238 placement
/**
 * 跳过，用最后一次 next 结果
 */
var SKIPPED_LAST_NEXT = "skipped; its last next() run's result stands";
//@ chunk-4121qate.js:80238-80606 placement
/**
 * 钩子超出预算后仍在运行一段时间则记录"失控"错误与事件。
 */
function watchOverrun(e, handler, site) {
  let n = false;
  let s = () => {
    n = true;
  };
  e.then(s, s);
  let lingerMs = streamChainSlot.get()?.lingerMs ?? LINGER_GRACE_MS;
  setTimeout(() => {
    if (n || isCoreOrManaged(handler)) return;
    let f = withHookPrefix(
      handler,
      `still running ${lingerMs}ms after its budget ran out; ignores its signal`,
    );
    matcherLog().log(`hook overran: ${f} (${site.event})`, "error");
    matcherLog().hookFailed({
      plugin: handler.name,
      event: site.event,
      reason: f,
      effect: "counted toward a runaway",
      hasOverrun: true,
    });
  }, lingerMs).unref?.();
}
//@ chunk-4121qate.js:80606-80649 placement
/**
 * 空的链节点状态
 */
var emptyEntryState = () => ({
  entry: undefined,
  beneath: undefined,
});
//@ chunk-4121qate.js:80649-80691 placement
/**
 * 冻结链节点
 */
function freezeEntry(run, o) {
  run.entry = Object.freeze(o);
}
//@ chunk-4121qate.js:80691-80780 placement
/**
 * 取错误与是否调用过
 */
function pickErrorState(e) {
  let { error } = e;
  if (error === undefined) return;
  return {
    error,
    called: e.called === true,
  };
}
//@ chunk-4121qate.js:80780-80797 placement
var CLIENT = "client";
//@ chunk-4121qate.js:80797-80823 placement
var Hbi = Object.freeze([]);
//@ chunk-4121qate.js:80823-80840 placement
var ENGINE = "engine";
//@ chunk-4121qate.js:80840-80888 placement
var N5e = Object.freeze({
  plugin: ENGINE,
  tier: "core",
});
//@ chunk-4121qate.js:80888-81042 placement
/**
 * 冻结 $ 接口对象：函数成员与对象本身的原型置为 null 后 Object.freeze。被函数钩子各处广泛使用。
 */
function freezeApiObject(e) {
  for (let o of Object.values(e)) if (typeof o === "function") Object.setPrototypeOf(o, null);
  Object.setPrototypeOf(e, null);
  return Object.freeze(e);
}
//@ chunk-4121qate.js:81042-81096 placement
/**
 * 原型为 null 的函数
 */
function nullPrototypeFunction(e) {
  Object.setPrototypeOf(e, null);
  return e;
}
//@ chunk-4121qate.js:81096-81127 placement
/**
 * 生成事件匹配器
 */
var eventPatternMatcher = (event) => nullPrototypeFunction((o, r) => matchesEventPattern(o, event));
//@ chunk-4121qate.js:81127-81193 placement
var UNLIMITED_BUDGET = Object.freeze({
  ms: 0,
  remainingMs: Number.POSITIVE_INFINITY,
});
//@ chunk-4121qate.js:81193-81526 placement = CONSOLE_STDERR_METHODS (0.333)
function freezeHookCall(e) {
  let { call: o, signal, event, origin } = e;
  let i = nullPrototypeFunction(o);
  i.to = nullPrototypeFunction(e.to);
  i.signal = signal;
  i.is = e.is;
  i.event = event;
  i.origin = origin;
  if (e.caught !== undefined) Object.assign(i, e.caught);
  Object.defineProperty(i, "trace", {
    get: nullPrototypeFunction(e.trace),
    enumerable: true,
  });
  Object.defineProperty(i, "budget", {
    get: nullPrototypeFunction(e.budget ?? (() => UNLIMITED_BUDGET)),
    enumerable: true,
  });
  return Object.freeze(i);
}
//@ chunk-4121qate.js:81526-81546 placement
var makeHookCall = (e) => freezeHookCall(e);
//@ chunk-4121qate.js:81546-81576 placement
/**
 * 转发 next
 */
var forwardNext = (e, o, r) => o.to(e, ...r);
//@ chunk-4121qate.js:81576-81606 placement
/**
 * 带参数调用 next
 */
var callNextWith = (e, o, r) => o.to(e, ...r);
//@ chunk-4121qate.js:81606-81729 placement
/**
 * 从 hook call 中复制上下文字段（signal、is、event、origin、trace、budget、caught）。
 */
var hookCallContext = (e) => ({
  signal: e.signal,
  is: e.is,
  event: e.event,
  origin: e.origin,
  trace: () => e.trace,
  budget: () => e.budget,
  caught: pickErrorState(e),
});
//@ chunk-4121qate.js:81729-81865 placement
/**
 * 沿 beneath 链收集运行轨迹条目，冻结返回。
 */
function traceOfRun(beneath) {
  let o = [];
  for (let r = beneath; r !== undefined; r = r.beneath) if (r.entry !== undefined) o.push(r.entry);
  return o.length === 0 ? Hbi : Object.freeze(o);
}
//@ chunk-4121qate.js:81865-82126 placement
var createBottomStep =
  ({ bottom, index, event }) =>
  async (n, s, { run, floors }) => {
    let startTime = performance.now();
    let outcome = "rejected";
    let m;
    try {
      m = await bottom(n, s, floors);
      outcome = "returned";
      return m;
    } finally {
      freezeEntry(run, {
        index,
        plugin: ENGINE,
        tier: "core",
        event,
        outcome,
        ms: performance.now() - startTime,
        received: n,
        returned: m,
      });
    }
  };
//@ chunk-4121qate.js:82126-82327 placement = createCapacityWake (0.799)
/**
 * 把源 AbortSignal 的中止转发到目标 controller，返回解除函数。
 */
function forwardAbort(sourceSignal, targetController) {
  if (sourceSignal === undefined) return () => {};
  if (sourceSignal.aborted) {
    targetController.abort(sourceSignal.reason);
    return () => {};
  }
  let abort = () => targetController.abort(sourceSignal.reason);
  sourceSignal.addEventListener("abort", abort, {
    once: true,
  });
  return () => sourceSignal.removeEventListener("abort", abort);
}
//@ chunk-4121qate.js:82327-83248 placement
/**
 * 插件调用链里"向下调用"助手（runBelow/call/to/replay），带预算暂停与中止转发。与 bridge 无关。
 */
function createBelowCaller({
  handler,
  below,
  site,
  e: n,
  budget,
  downstreamSignal,
  state,
  run,
  floors,
  tier,
}) {
  async function c(y, g, floors_2 = floors) {
    let T = site.raiseArgument?.(y) ?? y;
    if (state.pendingDownstream++ === 0) {
      budget.pause();
      state.beneathSince = performance.now();
    }
    let abortController = new AbortController();
    let v = forwardAbort(downstreamSignal, abortController);
    let R = forwardAbort(g, abortController);
    let I = emptyEntryState();
    if (!downstreamSignal.aborted) run.beneath = I;
    let V = below(T, abortController.signal, {
      run: I,
      floors: floors_2,
    }).then(
      (Q) => {
        let S = site.carry === undefined ? Q : site.carry(Q, T, n);
        state.belowRejected = undefined;
        state.fromBelow = [...state.fromBelow, S];
        return S;
      },
      (error) => {
        state.belowRejected = {
          error,
        };
        throw error;
      },
    );
    state.inFlight = V;
    try {
      return await V;
    } finally {
      v();
      R();
      endDownstreamWait(state, budget);
    }
  }
  function u(y) {
    let g = normalizeNextArgument(
      {
        handler,
        site,
        e: n,
      },
      y,
    );
    if (state.settled) throw nextAfterSettledError(handler.name);
    return g;
  }
  let l = (y) =>
    resolveNextTier(floors, y, {
      plugin: handler.name,
      tier,
    });
  return {
    runBelow: c,
    call: async (y, g, x) => c(u(y), g, x),
    to: async (y, g) => c(u(y), undefined, l(g)),
    replay: async (y, g, x) =>
      state.inFlight ??
      c(
        normalizeNextArgument(
          {
            handler,
            site,
            e: n,
          },
          y,
        ),
        g,
        x,
      ),
    replayTo: async (y, g) =>
      state.inFlight ??
      c(
        normalizeNextArgument(
          {
            handler,
            site,
            e: n,
          },
          y,
        ),
        undefined,
        l(g),
      ),
  };
}
//@ chunk-4121qate.js:83248-83320 placement
/**
 * 无实现的拒绝
 */
var missingImplementation = (site) => Promise.reject(new HooksError(`no implementation for ${site.event}`));
//@ chunk-4121qate.js:83320-83375 placement
/**
 * 转发中止
 */
var forwardAbortWith = (signal, abortController) =>
  forwardAbort(signal, {
    abort: (r) => abortController.abort(attempt(r, unwrapPlainDataError) ?? r),
  });
//@ chunk-4121qate.js:83375-83723 layout
/**
 * 把同一跳的多个插件处理器合并为一个链节点（名字相连、层级与插件列表）。
 */
var createHopHandler = (e, members) => ({
  name: members.map((r) => r.name).join("+"),
  tier: members[0]?.tier,
  tiers: uniq(members.map(handlerTier)),
  plugins: members.map((r) => r.name),
  ...(members.at(-1)?.answersForEngine && {
    answersForEngine: true,
  }),
  budgetMs: 0,
  isHop: true,
  ...(members[0]?.withheld && {
    withheld: members[0].withheld,
  }),
  run: (r, n, { call: s, floors, cutAt }) =>
    e.run({
      members,
      e: r,
      call: s,
      signal: n.signal,
      origin: n.origin,
      floors,
      cutAt,
    }),
});
//@ chunk-4121qate.js:83723-83906 placement = generateUniqueTeammateName (0.611)
var groupByHop = (e) =>
  e.reduce((acc, r) => {
    let last = acc.at(-1);
    return r.hop !== undefined && last?.hop?.key === r.hop.key
      ? [
          ...acc.slice(0, -1),
          {
            hop: last.hop,
            members: [...last.members, r],
          },
        ]
      : [
          ...acc,
          {
            hop: r.hop,
            members: [r],
          },
        ];
  }, []);
//@ chunk-4121qate.js:83906-84042 layout
/**
 * 把插件钩子成员列表按 hop 合并成执行阶段（切分误归 spawnMultiAgent）。
 */
var groupIntoHops = (handlers, isUnfolded = false) =>
  (isUnfolded
    ? handlers.map((r) => ({
        hop: r.hop,
        members: [r],
      }))
    : groupByHop(handlers)
  ).map((r) => {
    let hop = r.hop;
    return hop === undefined ? r.members[0] : createHopHandler(hop, r.members);
  });
//@ chunk-4121qate.js:84042-84053 placement
/**
 * 10000
 */
var SLOW_HOOK_REPORT_INTERVAL_MS = 1e4;
//@ chunk-4121qate.js:84053-84065 placement
/**
 * 慢钩子上报表
 */
var slowHookReports = createSlowHookReportMap();
//@ chunk-4121qate.js:84065-84078 placement
/**
 * 钩子作用域存储
 */
var hookScopeStore = pu();
//@ chunk-4121qate.js:84078-84217 placement
function recordPassedBy(e) {
  try {
    hookScopeStore.get()?.(e);
  } catch (error) {
    matcherLog().log(
      `passed-by: a sighting of ${e.link} on ${e.event} was not recorded: ${errorMessage(error)}`,
      "error",
    );
  }
}
//@ chunk-4121qate.js:84217-84356 placement
function flushBypassCount(e, o, r) {
  let count = slowHookReports.get(e)?.count ?? 0;
  slowHookReports.delete(e);
  if (count > 0) {
    matcherLog().log(
      `${o} ${count} more times in the last ${SLOW_HOOK_REPORT_INTERVAL_MS / SLOW_HOOK_REPORT_INTERVAL_MS_2}s`,
    );
    recordPassedBy({
      ...r,
      count,
    });
  }
}
//@ chunk-4121qate.js:84356-84368 placement
/**
 * 跳过提示（skipped）跟踪表最多保留 256 个键，超过后不再新增条目，避免长会话里无限增长。
 */
var MAX_TRACKED_SKIP_KEYS = 256;
//@ chunk-4121qate.js:84368-84623 placement
/**
 * 记录被跳过的插件钩子（按事件/插件/原因计数，有上限），返回首次出现的插件列表。
 */
function recordSkipNotices(e, o) {
  let { plugins, event, by, count } = o;
  let p = [];
  if (e === undefined) return p;
  for (let plugin of plugins) {
    let a = `${event} ${plugin} ${by}`;
    let m = e.get(a);
    let c = m !== undefined || e.size < MAX_TRACKED_SKIP_KEYS;
    if (c)
      e.set(a, {
        plugin,
        event,
        by,
        count: (m?.count ?? 0) + count,
      });
    if (c && m === undefined) p.push(plugin);
  }
  return p;
}
//@ chunk-4121qate.js:84623-84636 placement
/**
 * 跳过钩子的上报器
 */
var skippedHookReporter = pu();
//@ chunk-4121qate.js:84636-84695 placement
/**
 * 取跳过报告
 */
function skippedHookReport() {
  try {
    return skippedHookReporter.get()?.() ?? "";
  } catch {
    return "";
  }
}
//@ chunk-4121qate.js:84695-84976 placement
function noteBypass(e) {
  let { link, tier, event, by, session } = e;
  let p = `${session} ${event} ${link} ${by}`;
  let f = slowHookReports.get(p);
  if (f !== undefined) {
    f.count += 1;
    return;
  }
  let a = `${link}: ${event} bypassed by ${by} (tier ${tier})`;
  matcherLog().log(`${a}; beneath runs`);
  recordPassedBy(e);
  let timer = setTimeout(flushBypassCount, SLOW_HOOK_REPORT_INTERVAL_MS, p, a, e);
  timer.unref();
  slowHookReports.set(p, {
    count: 0,
    timer,
  });
}
//@ chunk-4121qate.js:84976-85491 placement
/**
 * 若该层已被更高层的 next.to 越过，记录"被绕过"并返回新的下降状态，否则 undefined。
 */
function maybeBypassHandler({ handler, tier, index, site, e: s, descent }) {
  let { run, floors } = descent;
  if (floors.length === 0 || isCoreOrManaged(handler)) return;
  let mapped = (handler.isHop === true ? (handler.tiers ?? []) : [tier]).map((g) =>
    findBypassingFloor(floors, g, handler.name),
  );
  let l = mapped.length > 0 && mapped.every((g) => g !== undefined) ? mapped[0] : undefined;
  if (l === undefined) return;
  noteBypass({
    link: handler.name,
    plugins: handler.plugins ?? [handler.name],
    tier,
    event: site.event,
    by: l,
    count: 1,
    session: skippedHookReport(),
  });
  freezeEntry(run, {
    index,
    plugin: handler.name,
    tier,
    event: site.event,
    outcome: "skipped",
    reason: `bypassed by ${l}`,
    ms: 0,
    received: s,
    returned: undefined,
  });
  let y = emptyEntryState();
  run.beneath = y;
  return {
    run: y,
    floors,
  };
}
//@ chunk-4121qate.js:85491-85542 placement
/**
 * 未冻结则冻结
 */
function freezeUnlessFrozen(e) {
  if (!isUntrustedObject(e)) Object.freeze(e);
  return e;
}
//@ chunk-4121qate.js:85542-85741 placement
var createChainHookCall = ({ call: e, to, signal, event, origin, run, budget, caught }) =>
  freezeHookCall({
    call: e,
    to: (a, ...m) => to(a, m),
    signal,
    is: eventPatternMatcher(event),
    event,
    origin,
    trace: () => traceOfRun(run.beneath),
    budget: () => budget.reading(),
    caught,
  });
//@ chunk-4121qate.js:85741-85864 placement
var createChainState = () => ({
  pendingDownstream: 0,
  settled: false,
  inFlight: undefined,
  fromBelow: [],
  belowRejected: undefined,
  beneathMs: 0,
  beneathSince: 0,
});
//@ chunk-4121qate.js:85864-86080 placement
/**
 * 为被中止的钩子调用生成 AbortError：优先使用现成的中止错误，否则包装中止原因（遥测里不带插件细节）。
 */
function abortErrorFor(e, error) {
  return (
    [error, e.reason].find((r) => attempt(r, (n) => n instanceof Error && isAbortError(n)) === true) ??
    attempt(e, (r) =>
      withTelemetryMessage(
        new AbortError(abortReasonText(r)),
        "function hooks call aborted (reason not reported: it may contain plugin details)",
      ),
    ) ??
    new AbortError(NO_TEXT_VALUE)
  );
}
//@ chunk-4121qate.js:86080-86388 placement
/**
 * 应用站点的 keptResult 规则：结果被部分保留时记录原因，出错时写入插件日志。
 */
function applyKeptResult({ handler, site, e: r, fromBelow }, s) {
  let i = s;
  try {
    let p = site.keptResult?.(s, r, fromBelow);
    if (p !== undefined) {
      i = p.kept;
      unappliedAnswerStands(handler, site.event, p.why);
    }
  } catch (error) {
    try {
      matcherLog().log(
        `${handler.name}: what the engine keeps of its ${site.event} answer could not be settled or said (${errorTextOf(error)}); the answer stands`,
        "error",
      );
    } catch {
      return i;
    }
  }
  return i;
}
//@ chunk-4121qate.js:86388-86452 placement
/**
 * .catch 返回值说明
 */
function catchReturnedText(problem, problem_2) {
  return problem_2 !== undefined ? `its .catch returned ${problem_2}` : problem;
}
//@ chunk-4121qate.js:86452-86561 placement
function catchFailureText({ kind, error, rejection }) {
  let n = kind === "throw";
  let s = rejection === undefined ? undefined : errorTextOf(rejection.error);
  return n ? errorTextOf(error) : s;
}
//@ chunk-4121qate.js:86561-87600 placement
async function runHookCatch({ handler, e: o, signal, state, handle, site, origin, run, cutAt, kind, error }) {
  let u = handler.catch;
  if (u === undefined)
    return {
      answer: undefined,
      problem: undefined,
    };
  let called = state.inFlight !== undefined;
  await state.inFlight?.then(undefined, () => {
    return;
  });
  let y = catchFailureText({
    kind,
    error,
    rejection: state.belowRejected,
  });
  let abortController = new AbortController();
  let x = forwardAbort(signal, abortController);
  let T = false;
  let h = `${handler.name}: next() after its .catch settled`;
  let v = (Q) => (T ? Promise.reject(new HooksError(h)) : outsideBudget(Q));
  let R = describeStreamHookOverrun(VALUE_NODE_SLACK, signal, cutAt);
  let chainHookCall = createChainHookCall({
    call: (Q, S, L) => v(() => handle.replay(Q, S, L)),
    to: (Q, S) => v(() => handle.replayTo(Q, S)),
    signal: abortController.signal,
    event: site.event,
    origin,
    run,
    budget: R,
    caught: {
      error: Object.freeze({
        kind,
        ...(y === undefined
          ? {}
          : {
              message: y,
            }),
        budget: VALUE_NODE_SLACK,
      }),
      called,
    },
  });
  let V;
  try {
    V = budgetPauseStorage.run(R, () => u(o, chainHookCall));
    return {
      answer: R.expired === undefined ? await V : await Promise.race([V, R.expired]),
      problem: undefined,
    };
  } catch (error) {
    if (isAbortOf(error, signal)) throw abortErrorFor(signal, error);
    let S = formatDuration(VALUE_NODE_SLACK);
    let L = R.isExpired();
    let B = L ? `its .catch ran past its ${S} grace` : `its .catch threw ${scrubErrorText(error)}`;
    abortController.abort(new HooksError(`${handler.name}: ${B}`));
    if (L && V !== undefined) watchOverrun(V, handler, site);
    return {
      answer: undefined,
      problem: B,
      thrown: error,
    };
  } finally {
    T = true;
    R.clear();
    x();
  }
}
//@ chunk-4121qate.js:87600-91403 placement
/**
 * 按层运行函数钩子链：next() 传递、拒绝向上传递、超时告警
 */
var runHookChain =
  ({ handler, index, below, site, budgetMs, cutAt, origin, nothingBelow, answersForEngine }) =>
  async (m, c, u) => {
    let { run, floors } = u;
    let tier = handlerTier(handler);
    let x = maybeBypassHandler({
      handler,
      tier,
      index,
      site,
      e: m,
      descent: u,
    });
    if (x !== undefined) return below(m, c, x);
    let startTime = performance.now();
    let chainState = createChainState();
    let abortController = new AbortController();
    let R = forwardAbort(c, abortController);
    let abortController_2 = new AbortController();
    let V = forwardAbort(c, abortController_2);
    let budgetMs_2 = handler.budgetMs ?? budgetMs;
    let S = describeStreamHookOverrun(budgetMs_2, c, cutAt);
    let L = freezeUnlessFrozen(m);
    let belowCaller = createBelowCaller({
      handler,
      below,
      site,
      e: m,
      budget: S,
      downstreamSignal: abortController.signal,
      state: chainState,
      run,
      floors,
      tier,
    });
    let { call: j, to, runBelow } = belowCaller;
    let chainHookCall = createChainHookCall({
      call: j,
      to,
      signal: abortController_2.signal,
      event: site.event,
      origin,
      run,
      budget: S,
    });
    function Ne(error) {
      matcherLog().log(
        `${handler.name}: its next() rejected below it (${site.event}); the rejection passes up`,
      );
      return error;
    }
    function Ve(ee) {
      let settle = site.settle;
      let de = isCoreOrManaged(handler) || settle === undefined;
      try {
        let pe = de ? ee : settle(ee);
        let fe = isCoreOrManaged(handler)
          ? pe
          : (site.restoreResult?.(pe, chainState.fromBelow, m, handler) ?? pe);
        let ke =
          isCoreOrManaged(handler) || answersForEngine
            ? fe
            : (site.stripResult?.(fe, chainState.fromBelow, handler) ?? fe);
        let Pe = handler.isHop === true && site.checkHop !== undefined;
        let Oe = isCoreOrManaged(handler)
          ? undefined
          : Pe
            ? site.checkHop?.(ke, m)
            : site.check?.(ke, m, chainState.fromBelow);
        let be = Oe === undefined && !isCoreOrManaged(handler) && handler.isHop !== true;
        if (be)
          warnOversizedPluginText(handler.name, site.event, site.measure?.(ke, m, chainState.fromBelow));
        if (be && site.isLateRefusal?.(ke, chainState.fromBelow) === true)
          matcherLog().log(
            `${handler.name}: ${site.event} hook refused after its next() was answered: what ran beneath it is not undone`,
            "warn",
          );
        return {
          settled: be
            ? applyKeptResult(
                {
                  handler,
                  site,
                  e: m,
                  fromBelow: chainState.fromBelow,
                },
                ke,
              )
            : ke,
          problem: Oe,
        };
      } catch (error) {
        let problem = `a result the site cannot read (${errorTextOf(error)})`;
        return {
          settled: ee,
          problem,
        };
      }
    }
    function Me(ee) {
      let weakTag = readWeakTag(ee);
      let de = chainState.inFlight !== undefined;
      let pe = de ? weakTag?.afterNext : weakTag?.answer;
      let fe = pe === undefined ? undefined : Ve(pe);
      let Ee = de && weakTag?.isWithholding === true;
      if (weakTag?.isNoted === true) handler.withheld?.();
      return fe?.problem === undefined && fe !== undefined
        ? {
            settled: fe.settled,
            effect: Ee ? RESULT_WITHHELD : REFUSED_IN_PLACE,
          }
        : undefined;
    }
    let E;
    let Z;
    let z = "rejected";
    let Ke = false;
    let ce;
    let Te;
    try {
      ce = budgetPauseStorage.run(S, () =>
        handler.run(L, chainHookCall, {
          call: j,
          floors,
          cutAt,
        }),
      );
      let Y = S.expired === undefined ? await ce : await Promise.race([ce, S.expired]);
      if (Y === undefined) {
        Te = "no result";
        throw new HooksError("returned no result");
      }
      let { settled, problem } = Ve(Y);
      if (problem !== undefined) {
        Te = problem;
        throw new HooksError(`returned ${problem}`);
      }
      E = settled;
      Z = settled;
      z = Y === chainState.fromBelow.at(-1) ? "passed" : "returned";
      Ke = chainState.inFlight === undefined && !isCoreOrManaged(handler) && handler.isHop !== true;
    } catch (error) {
      if (isAbortOf(error, c)) throw abortErrorFor(c, error);
      let Y = S.isExpired();
      let belowRejected = Y ? undefined : chainState.belowRejected;
      if (belowRejected !== undefined && handler.catch === undefined) throw Ne(belowRejected.error);
      let pe = withHookPrefix(handler, errorTextOf(error));
      chainState.settled = true;
      if (Y && ce !== undefined) {
        abortController_2.abort(new HooksError(pe));
        watchOverrun(ce, handler, site);
      }
      let fe = chainState.inFlight !== undefined;
      let Ee = Y ? undefined : Me(error);
      let Pe =
        c.aborted || Ee !== undefined
          ? {
              answer: undefined,
              problem: undefined,
              thrown: undefined,
            }
          : await runHookCatch({
              handler,
              e: L,
              signal: c,
              state: chainState,
              handle: belowCaller,
              site,
              origin,
              run,
              cutAt,
              kind: Y ? "timeout" : "throw",
              error,
            });
      let Oe = Pe.answer === undefined ? undefined : Ve(Pe.answer);
      let be = Oe !== undefined && Oe.problem === undefined;
      let De = Ee ?? (be ? undefined : Me(Pe.thrown));
      if (De !== undefined) {
        reportHandlerFailure({
          error,
          handler,
          site,
          effect: De.effect,
          cause: {
            expiredMs: undefined,
            lingeredMs: undefined,
            shape: Te,
            caught: catchReturnedText(Pe.problem, Oe?.problem),
          },
        });
        E = De.settled;
        Z = De.settled;
      } else if (be) {
        matcherLog().log(failedClosedText(handler.name, error, site.event), "warn");
        matcherLog().hookFailed({
          plugin: handler.name,
          environmentId: handler.environmentId,
          event: site.event,
          reason: pe,
          effect: FAILED_CLOSED,
          hasOverrun: false,
        });
        E = Oe.settled;
        Z = Oe.settled;
        z = "caught";
      } else if (belowRejected === undefined) {
        let ft = fe && c.aborted && attempt(c, isPlainDataError) !== true;
        reportHandlerFailure({
          error,
          handler,
          site,
          effect: ft ? INTERRUPTED_LEFT_OUT : fe ? SKIPPED_LAST_NEXT : SKIPPED_BELOW_RAN,
          cause: {
            expiredMs: Y ? budgetMs_2 : undefined,
            lingeredMs: S.hasGraceExpired() ? LINGER_GRACE_MS : undefined,
            shape: Te,
            refusedSubject: site.refusedSubject?.(m),
            caught: catchReturnedText(Pe.problem, Oe?.problem),
          },
        });
        if (ft) throw abortErrorFor(c);
        if (chainState.inFlight === undefined && nothingBelow) throw error;
        E = await (chainState.inFlight ?? runBelow(m));
        Z = fe ? E : undefined;
        z = Y ? "expired" : fe ? "kept" : "skipped";
      } else throw Ne(belowRejected.error);
    } finally {
      chainState.settled = true;
      S.clear();
      V();
      R();
      let startTime_2 = performance.now();
      let ms =
        startTime_2 -
        startTime -
        chainState.beneathMs -
        (chainState.pendingDownstream > 0 ? startTime_2 - chainState.beneathSince : 0);
      freezeEntry(run, {
        index,
        plugin: handler.isCore === true ? ENGINE : handler.name,
        tier,
        event: site.event,
        outcome: z,
        ms,
        received: m,
        returned: Z,
      });
      if (Ke)
        reportPluginHookWithoutNext({
          plugin: handler.name,
          tier,
          event: site.event,
          ms,
        });
      if (chainState.pendingDownstream > 0)
        abortController.abort(new PlainDataError(`${handler.name} settled the call`));
    }
    return E;
  };
//@ chunk-4121qate.js:91403-91578 placement
/**
 * 记录钩子链各步的输入与产出：keep 追加，of/last/all/ran 查询。
 */
function createStepRecorder() {
  let e = [];
  return {
    keep: (input, made) =>
      e.push({
        input,
        made,
      }),
    of: (o) => (o === undefined ? undefined : e[o - 1]),
    last: (o) => (o === undefined ? e.at(-1) : e.findLast(o)),
    all: () => e,
    ran: () => e.length > 0,
  };
}
//@ chunk-4121qate.js:91578-91614 placement
/**
 * 当前分发槽
 */
var currentDispatchSlot = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-4121qate.js:91614-91636 placement
/**
 * 取当前分发
 */
var currentDispatch = () => currentDispatchSlot.get();
//@ chunk-4121qate.js:91636-91663 placement
/**
 * 是否有当前分发
 */
var hasCurrentDispatch = () => currentDispatch() !== undefined;
//@ chunk-4121qate.js:91663-92357 placement
async function reportChainFailure({
  e,
  handlers,
  site,
  signal = new AbortController().signal,
  isHopFold,
  isUnfolded,
  cutAt,
  budgetMs = site.budgetMs ?? streamChainSlot.get()?.ms ?? DEFAULT_HOOK_TIMEOUT_MS,
  bottom,
  origin = N5e,
  floors = Y6t,
  trace,
}) {
  let l = groupIntoHops(handlers, isUnfolded);
  let bottomStep = createBottomStep({
    bottom: bottom ?? (() => missingImplementation(site)),
    index: l.length,
    event: site.event,
  });
  let g = emptyEntryState();
  let x = hasCurrentDispatch();
  let abortController = new AbortController();
  let h = isHopFold === true ? undefined : forwardAbortWith(signal, abortController);
  return l
    .reduceRight((below, R, I) => {
      let V = I === l.length - 1;
      return runHookChain({
        handler: R,
        index: I,
        below,
        site,
        budgetMs,
        cutAt,
        origin,
        nothingBelow: bottom === undefined && V,
        answersForEngine: x && V && R.answersForEngine === true,
      });
    }, bottomStep)(e, isHopFold === true ? signal : abortController.signal, {
      run: g,
      floors,
    })
    .then((v) => {
      trace?.(traceOfRun(g));
      return v;
    })
    .catch((error) => {
      if (!isAbortOf(error, signal)) matcherLog().log(`hooks chain failed: ${errorSummary(error)}`, "error");
      throw error;
    })
    .finally(h);
}
export {
  ENGINE,
  nullPrototypeFunction,
  freezeApiObject,
  reportChainFailure,
  createStepRecorder,
  missingImplementation,
  currentDispatchSlot,
  nextToLabel,
  freezeHookCall,
  callNextWith,
  pickErrorState,
  makeHookCall,
  hookCallContext,
  forwardNext,
  Y6t,
  isCoreOrManaged,
  UNLIMITED_BUDGET,
  forwardAbort,
  errorTextOf,
  nextAfterSettledError,
  handlerTier,
  maybeBypassHandler,
  freezeUnlessFrozen,
  emptyEntryState,
  resolveNextTier,
  eventPatternMatcher,
  traceOfRun,
  isAbortOf,
  abortErrorFor,
  scrubErrorText,
  withHookPrefix,
  watchOverrun,
  failedClosedText,
  FAILED_CLOSED,
  attempt,
  INTERRUPTED_LEFT_OUT,
  SKIPPED_LAST_NEXT,
  LEFT_MID_STREAM,
  SKIPPED_BELOW_RAN,
  reportHandlerFailure,
  freezeEntry,
  N5e,
  forwardAbortWith,
  errorSummary,
  uiElementKey,
  createWithheldElementWarner,
  hasCurrentDispatch,
  pluginTier,
  currentDispatch,
  Hbi,
  skippedHookReporter,
  hookScopeStore,
  recordSkipNotices,
  MAX_TRACKED_SKIP_KEYS,
  CLIENT,
  appendNextToStep,
};
