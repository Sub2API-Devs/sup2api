/**
 * plugins/functionHooks/ui/desktopSurface.ts
 *
 * 桌面 Client 表面运行时（claude:surface-runtime）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (52)
 * attribution: placement 52
 */
import {
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
} from "path";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
} from "crypto";
import { siteVersionOf, currentVersion } from "./renderDispatch.js";
import { JB } from "./renderInstances.js";
import { logForDebugging } from "../../../utils/debug.js";
import { UI_ENV_SITE_RULES } from "../sites/siteRules.js";
import { zS, renderInstanceKey, rf, HS } from "../api/state.js";
import { modulesHookingEvent, hookMembersFor, hookOriginFromStack } from "../hookDispatch.js";
import { rpr } from "../../../utils/hooks/functionHookMatchers.js";
import { errorMessage } from "../../../utils/errors.js";
import { Km } from "../dispatch/dispatchScope.js";
import { reportChainFailure, CLIENT } from "../dispatch/chain.js";
import { createPerPluginQueues, Op, Cp, Ap, Mp, Ip } from "./interactions.js";
import { LINE_SCRUB } from "./textScrub.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { walkAst } from "../moduleScan.js";
import { fos, SSi, CLAUDE_CODE } from "../moduleLoader.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { VM_BOOTSTRAP_SOURCE } from "../vm/vmBootstrapSource.js";
import { Weo } from "../eventPatterns.js";
import { MAX_NODES, MAX_DEPTH, AZr, Z6t, lEe } from "../sites/plainData.js";
import { MAX_TREE_TEXT_CHARS } from "./treeConstants.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import { isModuleAdmitted } from "../../../utils/plugins/functionHooks/admission.js";
import { HooksError } from "../hooksErrors.js";

//@ chunk-s61vbvea.js:642484-642502 placement
var DESKTOP = "desktop";
//@ chunk-s61vbvea.js:642502-642608 placement
var desktopClientAddress = (e) => ({
  plugin: e.plugin,
  element: e.element,
  component: e.component,
  requestId: e.requestId,
  surface: DESKTOP,
});
//@ chunk-s61vbvea.js:642608-642690 placement
var Wi = ({ component: component, requestId: requestId }) => ({
  surface: "desktop",
  component: component,
  requestId: requestId,
});
//@ chunk-s61vbvea.js:642690-642741 placement
var hc = (e) => [e.plugin, e.module, e.key].join("\x00");
//@ chunk-s61vbvea.js:642741-642770 placement
var yc = (e, n) => `${e}\x00${n}`;
//@ chunk-s61vbvea.js:642770-642782 placement
var _R = 1024;
//@ chunk-s61vbvea.js:642782-642809 placement
var bR = (e, n) => () => siteVersionOf(e, n);
/**
 * 记录各 (component, requestId) 渲染中画出的桌面 Client 及其版本、已报告失败的 Client（最多 1024 条，LRU）。
 */
//@ chunk-s61vbvea.js:642809-643837 placement
function createDrawnClientLedger() {
  let e = new Map(),
    n = 0;
  function r(s, h) {
    (e.delete(s), e.set(s, h));
    let [y] = e.keys();
    if (e.size > _R && y !== void 0) e.delete(y);
  }
  return {
    begin(s, h) {
      let y = yc(s, h),
        { keys: keys = new Map(), failed: failed = new Map() } = e.get(y) ?? {};
      return (
        (n += 1),
        r(y, { generation: n, keys: keys, failed: failed }),
        { instance: y, generation: n, version: bR(JB().getState(), Wi({ component: s, requestId: h })) }
      );
    },
    record({ instance: s, generation: h, version: y }, S) {
      let w = e.get(s);
      if (w?.generation !== h) return;
      if (S.length === 0) {
        e.delete(s);
        return;
      }
      let R = y(),
        mapped = S.map(hc);
      r(s, {
        generation: h,
        keys: new Map(mapped.map((P) => [P, w.failed.has(P) ? R : (w.keys.get(P) ?? R)])),
        failed: new Map(mapped.filter((P) => w.failed.get(P) === R).map((P) => [P, R])),
      });
    },
    isDrawn({ component: s, requestId: h, ...y }) {
      let S = yc(s, h),
        w = e.get(S),
        R = w?.keys.has(hc(y)) === !0;
      if (R) r(S, w);
      return R;
    },
    toldFailed({ component: s, requestId: h, ...y }) {
      let S = yc(s, h),
        w = e.get(S),
        R = hc(y),
        x = Wi({ component: s, requestId: h }),
        P = w?.keys.get(R);
      if (w === void 0 || P === void 0) return;
      if (w.failed.has(R)) return () => currentVersion(x);
      return (r(S, { ...w, failed: new Map([...w.failed, [R, currentVersion(x)]]) }), () => P);
    },
    count: () => e.size,
  };
}
//@ chunk-s61vbvea.js:643837-643849 placement
var _r = createDrawnClientLedger();
//@ chunk-s61vbvea.js:643849-644013 placement
function requireDrawnClient(e, n, r) {
  let s = r(n);
  if (!s)
    logForDebugging(
      `${e}: no desktop Client ${n.plugin}/${n.key} (${n.module}) is drawn in ${n.component} ${n.requestId}; nothing ran`,
    );
  return s;
}
//@ chunk-s61vbvea.js:644013-644098 placement
var freeze_5 = Object.freeze({ name: "core", isCore: !0, budgetMs: 0, run: () => Promise.resolve({}) });
//@ chunk-s61vbvea.js:644098-644120 placement
var RR = UI_ENV_SITE_RULES["ui.fault"];
//@ chunk-s61vbvea.js:644120-644227 placement
function isNewFaultForSite({ site: site, bornAt: bornAt }) {
  let r = zS().faultRuns.get(renderInstanceKey(site))?.versions;
  return !(r?.has(bornAt) && r.has(currentVersion(site)));
}
//@ chunk-s61vbvea.js:644227-644466 placement
var faultIsHeard = (e, n) =>
  modulesHookingEvent("ui.fault", void 0, { only: e }).some((r) => {
    let matcherFor = r.matcherFor("ui.fault");
    try {
      return matcherFor === void 0 || rpr(matcherFor, n);
    } catch (error) {
      return (
        logForDebugging(
          `hooks module ${r.label}: on('ui.fault') matcher threw on the host (${errorMessage(error)}); taken as heard`,
        ),
        !0
      );
    }
  });
//@ chunk-s61vbvea.js:644466-644478 placement
var vR = 4096;
//@ chunk-s61vbvea.js:644478-644727 placement
function recordFaultRun(e, n = rf) {
  let { faultRuns: faultRuns } = zS(),
    s = renderInstanceKey(e),
    h = faultRuns.get(s),
    y = h?.versions.has(currentVersion(e)) === !0;
  try {
    n(e);
  } finally {
    (faultRuns.delete(s),
      faultRuns.set(s, { site: e, versions: new Set([...(y ? h.versions : []), currentVersion(e)]) }));
    let [S] = faultRuns;
    if (faultRuns.size > vR && S !== void 0) (faultRuns.delete(S[0]), HS(S[1].site));
  }
}
//@ chunk-s61vbvea.js:644727-644859 placement
var rerenderFaultSites = ({ plugin: plugin, fault: fault, sites: sites }, s) =>
  Km(() => {
    for (let h of faultIsHeard(plugin, fault) ? sites() : [])
      Km(() => {
        if (h.site.requestId !== "" && isNewFaultForSite(h)) recordFaultRun(h.site, s);
      });
  });
/**
 * 运行 ui.fault 钩子链（只限出错插件），记录耗时，结束后对仍画着该 Client 的站点重新渲染。
 */
//@ chunk-s61vbvea.js:644859-645198 placement
async function dispatchUiFault(e, n) {
  let { plugin: plugin, fault: fault } = e,
    startTime = performance.now();
  try {
    let y = await reportChainFailure({
        e: fault,
        handlers: [...hookMembersFor("ui.fault", void 0, { only: plugin }), freeze_5],
        site: RR,
      }),
      toFixed = (performance.now() - startTime).toFixed(1);
    return (
      logForDebugging(
        `ui.fault ${plugin}/${fault.element} (${fault.module}) in ${fault.component} from ${fault.surface}, ${fault.phase}: dispatched, settled in ${toFixed}ms`,
      ),
      y ?? {}
    );
  } finally {
    rerenderFaultSites(e, n);
  }
}
//@ chunk-s61vbvea.js:645198-645264 placement
function A4r(e = rf) {
  let n = createPerPluginQueues();
  return (r) => n(r.plugin)(() => dispatchUiFault(r, e));
}
//@ chunk-s61vbvea.js:645264-645275 placement
var Dp = 500;
//@ chunk-s61vbvea.js:645275-645355 placement
function IR(e) {
  let replaced = e.replace(LINE_SCRUB, " ");
  return replaced.length > Dp ? `${truncateToLength(replaced, Dp)}\u2026` : replaced;
}
//@ chunk-s61vbvea.js:645355-645401 placement
var C4r = "the module failed without a message";
/**
 * 规范化 Client 模块失败原因：去掉插件名与 "Client 模块:" 前缀，空则用默认文字。
 */
//@ chunk-s61vbvea.js:645401-645565 placement
function describeClientFailure(e, n, r) {
  let s = `${e}: `,
    h = `Client ${n}: `,
    y = IR(r),
    w = y.startsWith(s) ? y.slice(s.length) : y,
    x = w.startsWith(h) ? w.slice(h.length) : w;
  return x.trim() === "" ? C4r : x;
}
//@ chunk-s61vbvea.js:645565-645581 placement
var Np = "\u2026";
//@ chunk-s61vbvea.js:645581-645636 placement
var regExp_16 = new RegExp(String.raw`[\u{2028}\u{2029}]`, "gu");
//@ chunk-s61vbvea.js:645636-645647 placement
var Lp = 200;
//@ chunk-s61vbvea.js:645647-645754 placement
function shortFaultReason(e, n) {
  let replaced = describeClientFailure(e.plugin, e.module, n).replace(regExp_16, " ");
  return replaced.length > Lp ? truncateToLength(replaced, Lp - Np.length) + Np : replaced;
}
/**
 * 构造 ui.fault 事件：界面、组件、请求、元素、模块、阶段与简短原因，附带受影响站点。
 */
//@ chunk-s61vbvea.js:645754-645933 placement
var toUiFaultEvent = (e, n, r) => ({
  plugin: e.plugin,
  fault: {
    surface: n,
    component: e.component,
    requestId: e.requestId,
    element: e.key,
    module: e.module,
    phase: r.phase,
    reason: shortFaultReason(e, r.reason),
  },
  sites: r.sites,
});
/**
 * 处理桌面端 Client 报告的故障：仅对已画出且未报告过的 Client 分发 ui.fault。
 */
//@ chunk-s61vbvea.js:645933-646160 placement
function createDesktopFaultHandler(e = _r, n = A4r()) {
  return async ({ address: address, report: report }) => {
    let h = requireDrawnClient("ui.fault", address, e.isDrawn) ? e.toldFailed(address) : void 0;
    if (h === void 0) return;
    return n(
      toUiFaultEvent(address, "desktop", {
        ...report,
        sites: () => (e.isDrawn(address) ? [{ site: Wi(address), bornAt: h() }] : []),
      }),
    );
  };
}
//@ chunk-s61vbvea.js:646240-646261 placement
var SURFACE = "surface:///";
//@ chunk-s61vbvea.js:646261-646341 placement
var xs = (e, n) => SURFACE + relative_8(n.pluginRoot, e).split(sep_9).map(encodeURIComponent).join("/");
//@ chunk-s61vbvea.js:646341-646818 placement
function collectModuleImports(e) {
  let n = [];
  return (
    walkAst(e, ({ node: node }) => {
      let h =
        node.type === "ImportDeclaration" ||
        node.type === "ExportAllDeclaration" ||
        node.type === "ExportNamedDeclaration" ||
        node.type === "ImportExpression"
          ? node.source
          : void 0;
      if (h === void 0 || h === null) return;
      if (h.type === "Literal" && typeof h.value === "string") {
        let { start: start, end: end } = h;
        n.push({ kind: "literal", spelled: h.value, start: start, end: end });
      } else if (node.type === "ImportExpression") n.push({ kind: "computed", start: h.start, end: h.end });
    }),
    n.toSorted((r, s) => r.start - s.start)
  );
}
//@ chunk-s61vbvea.js:646818-646848 placement
var SURFACE_UNLINKED = "surface-unlinked:///";
/**
 * 把界面模块源码中的导入说明符改写为 surface:/// 或未链接的占位地址（动态导入改为拼接）。
 */
//@ chunk-s61vbvea.js:646848-647256 placement
function rewriteSurfaceImports(e, n) {
  let parse = fos().parse(e, { ecmaVersion: "latest", sourceType: "module" }),
    s = jsonStringify(`${SURFACE_UNLINKED}computed#`),
    h = [],
    y = e;
  for (let S of collectModuleImports(parse).toReversed()) {
    let w =
        S.end +
        h.filter((j) => j.span.start >= S.start && j.span.end <= S.end).reduce((j, G) => j + G.grewBy, 0),
      sliced = y.slice(S.start, w),
      P = S.kind === "literal" ? jsonStringify(n(S.spelled)) : `(${s} + String(${sliced}))`;
    ((y = y.slice(0, S.start) + P + y.slice(w)), h.push({ span: S, grewBy: P.length - sliced.length }));
  }
  return y;
}
//@ chunk-s61vbvea.js:647256-647284 placement
var CLAUDE_HOOKS_TYPES = "claude:hooks-types";
//@ chunk-s61vbvea.js:647284-647321 placement
var HR = (e) => SURFACE_UNLINKED + encodeURIComponent(e);
//@ chunk-s61vbvea.js:647321-647567 placement
function toSurfaceFile(e, n, r) {
  let s = new Map(r.filter((S) => S.from === e.file).map((S) => [S.spelled, S.file])),
    h = SSi(e.file, e.source, n.pluginName);
  function y(S) {
    let w = s.get(S),
      x = S === CLAUDE_CODE ? CLAUDE_HOOKS_TYPES : HR(S);
    return w === void 0 ? x : xs(w, n);
  }
  return { key: xs(e.file, n), source: rewriteSurfaceImports(h, y) };
}
//@ chunk-s61vbvea.js:647567-647599 placement
var CLAUDE_SURFACE_RUNTIME = "claude:surface-runtime";
/**
 * 桌面 Client 表面的运行时源码（claude:surface-runtime），注入到 VM
 */
//@ chunk-s61vbvea.js:647599-660442 placement
var DESKTOP_SURFACE_RUNTIME_SOURCE = String.raw`((host, limits) => {
  const { freeze, defineProperty, defineProperties, keys: _keys } = Object
  const _isArray = Array.isArray
  const _Map = Map
  const _stringify = JSON.stringify
  const _Error = Error
  const _TypeError = TypeError
  const _isFinite = Number.isFinite
  const _String = String
  const _Promise = Promise
  const _resolve = _Promise.resolve.bind(_Promise)
  const _then = _Promise.prototype.then
  const _h = h
  const instances = new _Map()
  let pending = null

  // surface.elements (types/ ClientElements), the one table every
  // instance's surface hands out: the terminal's names less Client (nothing
  // nests in a Client), Raster and Image, each a constructor over this
  // environment's h, so <Box> from it and h('Box', ...) are one tree. What
  // $.ui.resolve(e) is to a hooks module, with no $ and no hook between. A
  // Markdown draws here without onLinkPress: a surface module answers its
  // own pointer (surface.onPointer), and exportTree refuses one that has it.
  const ELEMENT_NAMES =
    ['Box', 'Text', 'Button', 'Input', 'Select', 'Link', 'Code', 'Markdown']
  const elements = { __proto__: null }
  for (const name of ELEMENT_NAMES) {
    elements[name] = freeze(props => {
      const { children, ...rest } = props ?? {}
      const childList = children === undefined
        ? []
        : _isArray(children) ? children : [children]
      return _h(name, rest, ...childList)
    })
  }
  freeze(elements)

  // The trampoline. Client code that calls it finds nothing staged.
  defineProperty(globalThis, '__surface__', {
    value: freeze({
      __proto__: null,
      run: () => {
        const staged = pending
        pending = null
        return staged === null ? undefined : staged()
      },
    }),
    enumerable: false,
    writable: false,
    configurable: false,
  })

  const fail = (message, Ctor = _Error) => { throw new Ctor(message) }
  const instanceOf = id => instances.get(id) ?? fail('no client instance ' + id)
  const listener = (fn, what) =>
    typeof fn === 'function' ? fn : fail(what + ' takes a function', _TypeError)

  function surfaceOf(id, instance) {
    const surface = { __proto__: null }
    defineProperties(surface, {
      elements: { value: elements, enumerable: true },
      state: { get: () => instance.state, enumerable: true },
      columns: { get: () => instance.columns, enumerable: true },
      rows: { get: () => instance.rows, enumerable: true },
      setState: {
        value: next => {
          instance.state = next
          if (!instance.scheduled) {
            host.schedule(id)
            instance.scheduled = true
          }
        },
        enumerable: true,
      },
      every: {
        value: (ms, fn) => {
          listener(fn, 'every')
          const interval =
            typeof ms === 'number' && _isFinite(ms) && ms > 0 ? ms : 0
          const timer = host.startTimer(id, interval)
          instance.timers.set(timer, fn)
          return () => {
            if (instance.timers.delete(timer)) host.stopTimer(id, timer)
          }
        },
        enumerable: true,
      },
      onPointer: {
        value: fn => {
          instance.pointer = listener(fn, 'onPointer')
          return () => { if (instance.pointer === fn) instance.pointer = null }
        },
        enumerable: true,
      },
      onKey: {
        value: fn => {
          instance.key = listener(fn, 'onKey')
          return () => { if (instance.key === fn) instance.key = null }
        },
        enumerable: true,
      },
      post: {
        value: data => {
          let text
          try { text = _stringify(data) } catch (error) {
            fail('post takes plain data (' + error.message + ')', _TypeError)
          }
          if (typeof text !== 'string') {
            fail('post takes plain data, not ' + typeof data, _TypeError)
          }
          host.post(id, text)
        },
        enumerable: true,
      },
    })
    return freeze(surface)
  }

  const PRESSABLE = {
    __proto__: null, Button: 'onPress', Input: 'onEvent', Select: 'onEvent',
  }

  // The module's tree read HERE, never by the host: every node, every
  // props value and every hover rebuilt into fresh plain structures of ours
  // (getters run here, under the call budget; a toJSON is never consulted,
  // functions and undefined drop), each element closure held under a number
  // of the instance's in its place, then one JSON text of those fresh
  // structures alone. The host parses that text; nothing of the module's
  // crosses.
  function exportTree(instance, tree) {
    const budget = { nodes: 0, values: 0 }
    const tooMany = () =>
      fail('props of more than ' + limits.values + ' values')
    // Mirrors the host's plainDataProblem, one props payload at a time (the
    // count restarts per element; the tree's own bound is limits.nodes):
    // every value counts, an array by its length up front, a hole refused,
    // so an oversize or sparse array fails by name at once.
    const propsOf = value => {
      budget.values = 0
      return plain(value, 0)
    }
    const plain = (value, depth) => {
      if (++budget.values > limits.values) tooMany()
      if (value === null) return null
      const kind = typeof value
      if (kind === 'string' || kind === 'boolean') return value
      if (kind === 'number') return _isFinite(value) ? value : null
      if (kind !== 'object') return undefined
      if (depth > limits.dataDepth) {
        fail('props nesting deeper than ' + limits.dataDepth)
      }
      if (_isArray(value)) {
        if (value.length > limits.values - budget.values) tooMany()
        const out = []
        for (let i = 0; i < value.length; i++) {
          if (!(i in value)) fail('props with a hole in an array')
          const item = plain(value[i], depth + 1)
          out.push(item === undefined ? null : item)
        }
        return out
      }
      const out = {}
      for (const key of _keys(value)) {
        const item = plain(value[key], depth + 1)
        if (item !== undefined) {
          defineProperty(out, key, {
            value: item, enumerable: true, writable: true, configurable: true,
          })
        }
      }
      return out
    }
    const walk = (node, depth) => {
      if (typeof node === 'string') return node
      if (typeof node !== 'object' || node === null || _isArray(node)) {
        fail('a child that is neither a string nor an element')
      }
      if (++budget.nodes > limits.nodes) {
        fail('a tree of more than ' + limits.nodes + ' nodes')
      }
      if (depth > limits.depth) fail('a tree deeper than ' + limits.depth)
      const tag = node.type
      if (typeof tag !== 'string') fail('an element without a type')
      if (tag === 'Client') {
        fail('a Client inside the tree; a surface module draws elements, ' +
          'not nested Clients')
      }
      if (tag === 'Raster') {
        fail('a Raster inside the tree; a hooks module draws a Raster and ' +
          'repaints it with $.ui.blit, a surface module draws elements')
      }
      if (tag === 'Image') {
        fail('an Image inside the tree; a hooks module draws an Image, a ' +
          'surface module draws elements')
      }
      if (tag === 'engine') {
        fail('an engine node inside the tree; nothing of the engine draws ' +
          'inside a Client')
      }
      if (tag === 'Markdown' && node.press !== undefined) {
        fail('a Markdown with onLinkPress inside the tree; a surface ' +
          'module answers its own pointer with surface.onPointer')
      }
      const out = { type: tag }
      if (node.props !== undefined) out.props = propsOf(node.props)
      if (node.hover !== undefined) out.hover = propsOf(node.hover)
      const closureKey = PRESSABLE[tag]
      if (closureKey !== undefined) {
        const closure = node[closureKey]
        if (typeof closure !== 'function') {
          fail('a ' + tag + ' without its handler (build it with ' +
            'surface.elements.' + tag + ')')
        }
        const handle = ++instance.heldCounter
        instance.held.set(handle, closure)
        out.held = handle
        if (tag !== 'Button') return out
      }
      const children = node.children
      if (children !== undefined) {
        if (!_isArray(children)) fail('children that are not an array')
        const copied = []
        for (let i = 0; i < children.length; i++) {
          copied.push(walk(children[i], depth + 1))
        }
        out.children = copied
      }
      return out
    }
    const text = _stringify(walk(tree, 0))
    if (text.length > limits.chars) {
      fail('a tree serializing to more than ' + limits.chars + ' characters')
    }
    return text
  }

  // What a rejection says, read here and handed to the host as text.
  const reasonText = error => {
    try {
      const isError = typeof error === 'object' && error !== null
      const message = isError ? error.message : error
      return typeof message === 'string' ? message : _String(message)
    } catch {
      return 'a rejection that could not be read'
    }
  }

  // Tells the host a fault. A desktop frame is served this script as it is,
  // and one shipped before \`fault\` hands over a host without it: there the
  // reason is thrown on whole, as it came out when nobody heard.
  const faulted = (id, error) => {
    if (typeof host.fault !== 'function') throw error
    host.fault(id, reasonText(error))
  }

  // What a user function returned, heard when it is a promise: an async
  // handler that throws rejects one, and a rejection nobody hears is the
  // process's to end a session over. Heard, it is the instance's fault.
  const heard = (id, out) => {
    const isHeld =
      (typeof out === 'object' && out !== null) || typeof out === 'function'
    if (!isHeld) return out
    try {
      _then.call(_resolve(out), undefined, error => faulted(id, error))
    } catch (error) {
      faulted(id, error)
    }
    return out
  }

  // Every user function is called bare (no receiver): its \`this\` is
  // undefined, never the instance record. Only render answers anything: the
  // tree's JSON text; a listener's return value stays here, heard.
  function act(id, instance, kind, payload) {
    switch (kind) {
      case 'render': {
        instance.scheduled = false
        const render = instance.fn
        return exportTree(
          instance,
          heard(id, render(instance.props, instance.surface)),
        )
      }
      case 'pointer': {
        const listener = instance.pointer
        if (listener !== null) heard(id, listener(payload))
        return undefined
      }
      case 'key': {
        const listener = instance.key
        if (listener !== null) heard(id, listener(payload))
        return undefined
      }
      case 'tick': {
        const fn = instance.timers.get(payload)
        if (fn !== undefined) heard(id, fn())
        return undefined
      }
      case 'held': {
        const fn = instance.held.get(payload.handle)
        if (fn !== undefined) heard(id, fn(payload.event))
        return undefined
      }
      default:
        return fail('unknown surface call ' + kind)
    }
  }

  return freeze({
    __proto__: null,
    mount: (id, fn, props) => {
      if (typeof fn !== 'function') {
        fail('the surface module export is not a function', _TypeError)
      }
      const instance = {
        fn, props, state: undefined, columns: 0, rows: 0, scheduled: false,
        pointer: null, key: null, timers: new _Map(), surface: null,
        held: new _Map(), heldCounter: 0,
      }
      instance.surface = surfaceOf(id, instance)
      instances.set(id, instance)
    },
    setProps: (id, props) => { instanceOf(id).props = props },
    resize: (id, columns, rows) => {
      const instance = instanceOf(id)
      instance.columns = columns
      instance.rows = rows
    },
    stage: (id, kind, payload) => {
      const instance = instanceOf(id)
      pending = () => act(id, instance, kind, payload)
    },
    // The closures exportTree held for elements a redraw retired.
    dropHeld: (id, handles) => {
      const instance = instances.get(id)
      if (instance === undefined) return
      for (let i = 0; i < handles.length; i++) instance.held.delete(handles[i])
    },
    hasListener: (id, kind) => {
      const instance = instances.get(id)
      if (instance === undefined) return false
      const listener = kind === 'pointer' ? instance.pointer : instance.key
      return listener !== null
    },
    unmount: id => {
      const instance = instances.get(id)
      if (instance === undefined) return
      instances.delete(id)
      instance.timers.clear()
      instance.held.clear()
      instance.pointer = null
      instance.key = null
    },
  })
})`;
//@ chunk-s61vbvea.js:660442-660561 placement
var SURFACE_RUNTIME_MODULE_SOURCE = `const jsx = ${VM_BOOTSTRAP_SOURCE}
export const h = jsx.h
export const Fragment = jsx.Fragment
export const install = ${DESKTOP_SURFACE_RUNTIME_SOURCE}
`;
//@ chunk-s61vbvea.js:660561-660572 placement
var BR = Weo;
//@ chunk-s61vbvea.js:660572-660643 placement
var P4r = () => ({
  nodes: MAX_NODES,
  depth: MAX_DEPTH,
  chars: MAX_TREE_TEXT_CHARS,
  values: AZr,
  dataDepth: Z6t,
});
/**
 * 为插件的界面模块构建桌面运行包：运行时与类型模块、各模块文件（改写导入）、入口与组件、限额，并计算内容哈希。
 */
//@ chunk-s61vbvea.js:660643-661120 placement
function buildDesktopSurfaceBundle(e, n) {
  let r = P4r(),
    s = new Map([
      [CLAUDE_SURFACE_RUNTIME, { key: CLAUDE_SURFACE_RUNTIME, source: SURFACE_RUNTIME_MODULE_SOURCE }],
      [CLAUDE_HOOKS_TYPES, { key: CLAUDE_HOOKS_TYPES, source: BR }],
    ]);
  for (let S of n) {
    let w = [{ file: S.modulePath, source: S.source }, ...S.linked];
    for (let R of w) {
      let x = xs(R.file, e);
      if (!s.has(x)) s.set(x, toSurfaceFile(R, e, S.links));
    }
  }
  let h = [...s.values()],
    mapped = n.map((S) => ({ module: S.module, entry: xs(S.modulePath, e), component: S.component }));
  return {
    plugin: e.pluginName,
    hash: createHash_4("sha256")
      .update(jsonStringify({ files: h, modules: mapped, limits: r }))
      .digest("hex"),
    modules: mapped,
    runtime: CLAUDE_SURFACE_RUNTIME,
    limits: r,
    files: h,
  };
}
/**
 * 界面运行包缓存：插件模块变化时重建，按插件取包。
 */
//@ chunk-s61vbvea.js:661120-661480 placement
function createSurfaceBundleCache() {
  let e = new Map();
  return {
    moduleFor(n) {
      let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === n),
        s = found?.args.surfaceModules;
      if (!found || !s || !isModuleAdmitted(found)) {
        e.delete(n);
        return;
      }
      let h = e.get(n);
      if (h?.environmentId === found.environmentId) return h.built;
      let { pluginRoot: pluginRoot, pluginName: pluginName } = found.args,
        w = buildDesktopSurfaceBundle({ pluginRoot: pluginRoot, pluginName: pluginName }, s);
      return (e.set(n, { environmentId: found.environmentId, built: w }), w);
    },
  };
}
//@ chunk-s61vbvea.js:661480-661492 placement
var Fp = createSurfaceBundleCache();
//@ chunk-s61vbvea.js:661492-661504 placement
var zR = createPerPluginQueues();
/**
 * 为一组 Client 所属的插件返回其界面运行包哈希。
 */
//@ chunk-s61vbvea.js:661504-661642 placement
function surfaceBundleHashes(e, n = (r) => Fp.moduleFor(r)?.hash) {
  let r = {};
  for (let s of new Set(e.map((h) => h.plugin))) {
    let h = n(s);
    if (h !== void 0) r[s] = h;
  }
  return r;
}
/**
 * 构造 ui.message 事件：界面、组件、请求、元素、模块与数据。
 */
//@ chunk-s61vbvea.js:661642-661780 placement
var toUiMessageEvent = (e, n, r) => ({
  plugin: e.plugin,
  message: {
    surface: n,
    component: e.component,
    requestId: e.requestId,
    element: e.key,
    module: e.module,
    data: r,
  },
});
//@ chunk-s61vbvea.js:661780-661804 placement
var KR = UI_ENV_SITE_RULES["ui.message"];
/**
 * 运行 ui.message 钩子链（只限该插件）并记录耗时，返回结果。
 */
//@ chunk-s61vbvea.js:661804-662202 placement
async function dispatchUiMessage({ plugin: plugin, message: message }) {
  let startTime = performance.now(),
    s = await reportChainFailure({
      e: message,
      handlers: [
        ...hookMembersFor("ui.message", void 0, { only: plugin }),
        { name: "core", isCore: !0, budgetMs: 0, run: () => Promise.resolve({}) },
      ],
      site: KR,
      origin: { plugin: CLIENT, tier: hookOriginFromStack([plugin]).tier },
    });
  return (
    logForDebugging(
      `ui.message ${plugin}/${message.element} (${message.module}) in ${message.component} from ${message.surface}: dispatched, settled in ${(performance.now() - startTime).toFixed(1)}ms`,
    ),
    s ?? {}
  );
}
/**
 * 桌面端 Client 发来消息：确认已画出、校验数据为纯数据后，按插件串行分发 ui.message。
 */
//@ chunk-s61vbvea.js:662202-662436 placement
async function postDesktopClientMessage(e, n = _r.isDrawn) {
  let { data: r, ...s } = e;
  if (!requireDrawnClient("ui.message", s, n)) return;
  let h = lEe(r);
  if (h !== void 0) throw new HooksError(`${s.plugin}: Client ${s.module}: post: the data ${h}; not sent`);
  return zR(s.plugin)(() => dispatchUiMessage(toUiMessageEvent(s, DESKTOP, r)));
}
//@ chunk-s61vbvea.js:662436-663451 placement
async function dispatchDesktopClient(e, n = _r.isDrawn) {
  let { element: element, event: event, ...h } = e;
  if (!n(h)) {
    logForDebugging(
      `ui.${event.type}: no desktop Client ${h.plugin}/${h.key} (${h.module}) is drawn in ${h.component} ${h.requestId}; nothing ran`,
    );
    return;
  }
  let y = desktopClientAddress(e),
    startTime = performance.now(),
    w;
  async function R() {
    return {
      result: await reportChainFailure({
        e: y,
        handlers: hookMembersFor("ui.press"),
        site: Op,
        bottom: (q) => ((w = q), Promise.resolve({ element: q.element })),
      }),
      ...(w !== void 0 && { reached: w }),
    };
  }
  async function x(L, q) {
    return {
      result: await reportChainFailure({
        e: q,
        handlers: hookMembersFor(L.event),
        site: L,
        bottom: (Z) => {
          w = Z;
          let ee = { element: Z.element, value: Z.value };
          return Promise.resolve(ee);
        },
      }),
      ...(w !== void 0 && { reached: w }),
    };
  }
  function P() {
    switch (event.type) {
      case "press":
        return R();
      case "input":
        return Cp(h.plugin)(() => x(Ap, { ...y, kind: event.kind, value: event.value }));
      case "select":
        return Mp(h.plugin)(() => x(Ip, { ...y, value: event.value }));
    }
  }
  let j = await P(),
    G = j.reached === void 0 ? "withheld" : "reached";
  return (
    logForDebugging(
      `ui.${event.type} ${h.plugin}/${element} in Client ${h.key} (${h.module}) of ${h.component} from desktop: settled in ${(performance.now() - startTime).toFixed(1)}ms, ${G}`,
    ),
    j
  );
}

export {
  toUiMessageEvent,
  dispatchUiMessage,
  describeClientFailure,
  A4r,
  C4r,
  DESKTOP_SURFACE_RUNTIME_SOURCE,
  P4r,
  toUiFaultEvent,
  _r,
  surfaceBundleHashes,
  Fp,
  dispatchDesktopClient,
  postDesktopClientMessage,
  createDesktopFaultHandler,
  DESKTOP,
};
