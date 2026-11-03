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
import { relative, sep } from "path";
import { createHash } from "crypto";
import { siteVersionOf, currentVersion } from "./renderDispatch.js";
import { renderVersions } from "./renderInstances.js";
import { logForDebugging } from "../../../utils/debug.js";
import { UI_ENV_SITE_RULES } from "../sites/siteRules.js";
import {
  pluginStateRegistry,
  renderInstanceKey,
  burstRedrawSite,
  dropUnheldRenderVersions,
} from "../api/state.js";
import { modulesHookingEvent, hookMembersFor, hookOriginFromStack } from "../hookDispatch.js";
import { matchesLiteralMatcher } from "../../../utils/hooks/functionHookMatchers.js";
import { errorMessage } from "../../../utils/errors.js";
import { runIgnoringAbort } from "../dispatch/dispatchScope.js";
import { reportChainFailure, CLIENT } from "../dispatch/chain.js";
import {
  createPerPluginQueues,
  UI_PRESS_RULES,
  inputQueues,
  UI_INPUT_RULES,
  selectQueues,
  UI_SELECT_RULES,
} from "./interactions.js";
import { LINE_SCRUB } from "./textScrub.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { walkAst } from "../moduleScan.js";
import { acornParser, transpileModule, CLAUDE_CODE } from "../moduleLoader.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { VM_BOOTSTRAP_SOURCE } from "../vm/vmBootstrapSource.js";
import { STATE_RESOURCE } from "../eventPatterns.js";
import { MAX_NODES, MAX_DEPTH, MAX_NODES_2, MAX_DEPTH_2, checkPlainData } from "../sites/plainData.js";
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
/**
 * 桌面界面引用
 */
var desktopSurfaceRef = ({ component, requestId }) => ({
  surface: "desktop",
  component,
  requestId,
});
//@ chunk-s61vbvea.js:642690-642741 placement
/**
 * plugin\0module\0key
 */
var drawnClientKey = (e) => [e.plugin, e.module, e.key].join("\x00");
//@ chunk-s61vbvea.js:642741-642770 placement
/**
 * component\0requestId
 */
var surfaceRefKey = (component, requestId) => `${component}\x00${requestId}`;
//@ chunk-s61vbvea.js:642770-642782 placement
/**
 * 1024
 */
var MAX_DRAWN_CLIENTS = 1024;
//@ chunk-s61vbvea.js:642782-642809 placement
/**
 * 站点版本取值函数
 */
var siteVersionThunk = (state, n) => () => siteVersionOf(state, n);
//@ chunk-s61vbvea.js:642809-643837 placement
/**
 * 记录各 (component, requestId) 渲染中画出的桌面 Client 及其版本、已报告失败的 Client（最多 1024 条，LRU）。
 */
function createDrawnClientLedger() {
  let e = new Map();
  let generation = 0;
  function r(s, h) {
    e.delete(s);
    e.set(s, h);
    let [y] = e.keys();
    if (e.size > MAX_DRAWN_CLIENTS && y !== undefined) e.delete(y);
  }
  return {
    begin(s, h) {
      let y = surfaceRefKey(s, h);
      let { keys = new Map(), failed = new Map() } = e.get(y) ?? {};
      generation += 1;
      r(y, {
        generation,
        keys,
        failed,
      });
      return {
        instance: y,
        generation,
        version: siteVersionThunk(
          renderVersions().getState(),
          desktopSurfaceRef({
            component: s,
            requestId: h,
          }),
        ),
      };
    },
    record({ instance, generation, version }, S) {
      let w = e.get(instance);
      if (w?.generation !== generation) return;
      if (S.length === 0) {
        e.delete(instance);
        return;
      }
      let R = version();
      let mapped = S.map(drawnClientKey);
      r(instance, {
        generation,
        keys: new Map(mapped.map((P) => [P, w.failed.has(P) ? R : (w.keys.get(P) ?? R)])),
        failed: new Map(mapped.filter((P) => w.failed.get(P) === R).map((P) => [P, R])),
      });
    },
    isDrawn({ component, requestId, ...y }) {
      let S = surfaceRefKey(component, requestId);
      let w = e.get(S);
      let R = w?.keys.has(drawnClientKey(y)) === true;
      if (R) r(S, w);
      return R;
    },
    toldFailed({ component, requestId, ...y }) {
      let S = surfaceRefKey(component, requestId);
      let w = e.get(S);
      let R = drawnClientKey(y);
      let x = desktopSurfaceRef({
        component,
        requestId,
      });
      let P = w?.keys.get(R);
      if (w === undefined || P === undefined) return;
      if (w.failed.has(R)) return () => currentVersion(x);
      r(S, {
        ...w,
        failed: new Map([...w.failed, [R, currentVersion(x)]]),
      });
      return () => P;
    },
    count: () => e.size,
  };
}
//@ chunk-s61vbvea.js:643837-643849 placement
/**
 * 已绘制客户端账本
 */
var drawnClientLedger = createDrawnClientLedger();
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
var ER = Object.freeze({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: () => Promise.resolve({}),
});
//@ chunk-s61vbvea.js:644098-644120 placement
/**
 * ui.fault 站点规则
 */
var UI_FAULT_RULES = UI_ENV_SITE_RULES["ui.fault"];
//@ chunk-s61vbvea.js:644120-644227 placement
function isNewFaultForSite({ site, bornAt }) {
  let versions = pluginStateRegistry().faultRuns.get(renderInstanceKey(site))?.versions;
  return !(versions?.has(bornAt) && versions.has(currentVersion(site)));
}
//@ chunk-s61vbvea.js:644227-644466 placement
var faultIsHeard = (only, fault) =>
  modulesHookingEvent("ui.fault", undefined, {
    only,
  }).some((r) => {
    let s = r.matcherFor("ui.fault");
    try {
      return s === undefined || matchesLiteralMatcher(s, fault);
    } catch (error) {
      logForDebugging(
        `hooks module ${r.label}: on('ui.fault') matcher threw on the host (${errorMessage(error)}); taken as heard`,
      );
      return true;
    }
  });
//@ chunk-s61vbvea.js:644466-644478 placement
/**
 * 4096
 */
var MAX_FAULT_RUNS = 4096;
//@ chunk-s61vbvea.js:644478-644727 placement
function recordFaultRun(site, n = burstRedrawSite) {
  let { faultRuns } = pluginStateRegistry();
  let s = renderInstanceKey(site);
  let h = faultRuns.get(s);
  let y = h?.versions.has(currentVersion(site)) === true;
  try {
    n(site);
  } finally {
    faultRuns.delete(s);
    faultRuns.set(s, {
      site,
      versions: new Set([...(y ? h.versions : []), currentVersion(site)]),
    });
    let [S] = faultRuns;
    if (faultRuns.size > MAX_FAULT_RUNS && S !== undefined) {
      faultRuns.delete(S[0]);
      dropUnheldRenderVersions(S[1].site);
    }
  }
}
//@ chunk-s61vbvea.js:644727-644859 placement
var rerenderFaultSites = ({ plugin, fault, sites }, s) =>
  runIgnoringAbort(() => {
    for (let h of faultIsHeard(plugin, fault) ? sites() : [])
      runIgnoringAbort(() => {
        if (h.site.requestId !== "" && isNewFaultForSite(h)) recordFaultRun(h.site, s);
      });
  });
//@ chunk-s61vbvea.js:644859-645198 placement
/**
 * 运行 ui.fault 钩子链（只限出错插件），记录耗时，结束后对仍画着该 Client 的站点重新渲染。
 */
async function dispatchUiFault(e, n) {
  let { plugin, fault } = e;
  let startTime = performance.now();
  try {
    let y = await reportChainFailure({
      e: fault,
      handlers: [
        ...hookMembersFor("ui.fault", undefined, {
          only: plugin,
        }),
        ER,
      ],
      site: UI_FAULT_RULES,
    });
    let S = (performance.now() - startTime).toFixed(1);
    logForDebugging(
      `ui.fault ${plugin}/${fault.element} (${fault.module}) in ${fault.component} from ${fault.surface}, ${fault.phase}: dispatched, settled in ${S}ms`,
    );
    return y ?? {};
  } finally {
    rerenderFaultSites(e, n);
  }
}
//@ chunk-s61vbvea.js:645198-645264 placement
/**
 * 按插件排队分发故障
 */
function desktopFaultDispatcher(e = burstRedrawSite) {
  let perPluginQueues = createPerPluginQueues();
  return (r) => perPluginQueues(r.plugin)(() => dispatchUiFault(r, e));
}
//@ chunk-s61vbvea.js:645264-645275 placement
/**
 * 500
 */
var MAX_FAULT_TEXT = 500;
//@ chunk-s61vbvea.js:645275-645355 placement
/**
 * 去换行并截断
 */
function scrubFaultText(e) {
  let replaced = e.replace(LINE_SCRUB, " ");
  return replaced.length > MAX_FAULT_TEXT ? `${truncateToLength(replaced, MAX_FAULT_TEXT)}\u2026` : replaced;
}
//@ chunk-s61vbvea.js:645355-645401 placement
/**
 * 模块失败无消息
 */
var DEFAULT_MODULE_FAILURE = "the module failed without a message";
//@ chunk-s61vbvea.js:645401-645565 placement
/**
 * 规范化 Client 模块失败原因：去掉插件名与 "Client 模块:" 前缀，空则用默认文字。
 */
function describeClientFailure(e, n, r) {
  let s = `${e}: `;
  let h = `Client ${n}: `;
  let y = scrubFaultText(r);
  let w = y.startsWith(s) ? y.slice(s.length) : y;
  let x = w.startsWith(h) ? w.slice(h.length) : w;
  return x.trim() === "" ? DEFAULT_MODULE_FAILURE : x;
}
//@ chunk-s61vbvea.js:645565-645581 placement
/**
 * "…"
 */
var ELLIPSIS = "\u2026";
//@ chunk-s61vbvea.js:645581-645636 placement
var regExp_16 = new RegExp(String.raw`[\u{2028}\u{2029}]`, "gu");
//@ chunk-s61vbvea.js:645636-645647 placement
/**
 * 200
 */
var MAX_VISIBLE_TEXT = 200;
//@ chunk-s61vbvea.js:645647-645754 placement
function shortFaultReason(e, reason) {
  let replaced = describeClientFailure(e.plugin, e.module, reason).replace(regExp_16, " ");
  return replaced.length > MAX_VISIBLE_TEXT
    ? truncateToLength(replaced, MAX_VISIBLE_TEXT - ELLIPSIS.length) + ELLIPSIS
    : replaced;
}
//@ chunk-s61vbvea.js:645754-645933 placement
/**
 * 构造 ui.fault 事件：界面、组件、请求、元素、模块、阶段与简短原因，附带受影响站点。
 */
var toUiFaultEvent = (e, surface, r) => ({
  plugin: e.plugin,
  fault: {
    surface,
    component: e.component,
    requestId: e.requestId,
    element: e.key,
    module: e.module,
    phase: r.phase,
    reason: shortFaultReason(e, r.reason),
  },
  sites: r.sites,
});
//@ chunk-s61vbvea.js:645933-646160 placement
/**
 * 处理桌面端 Client 报告的故障：仅对已画出且未报告过的 Client 分发 ui.fault。
 */
function createDesktopFaultHandler(e = drawnClientLedger, n = desktopFaultDispatcher()) {
  return async ({ address, report }) => {
    let h = requireDrawnClient("ui.fault", address, e.isDrawn) ? e.toldFailed(address) : undefined;
    if (h === undefined) return;
    return n(
      toUiFaultEvent(address, "desktop", {
        ...report,
        sites: () =>
          e.isDrawn(address)
            ? [
                {
                  site: desktopSurfaceRef(address),
                  bornAt: h(),
                },
              ]
            : [],
      }),
    );
  };
}
//@ chunk-s61vbvea.js:646240-646261 placement
var SURFACE = "surface:///";
//@ chunk-s61vbvea.js:646261-646341 placement
/**
 * 界面模块在包里的路径键
 */
var surfaceModuleKey = (e, n) =>
  SURFACE + relative(n.pluginRoot, e).split(sep).map(encodeURIComponent).join("/");
//@ chunk-s61vbvea.js:646341-646818 placement
function collectModuleImports(e) {
  let n = [];
  walkAst(e, ({ node }) => {
    let source =
      node.type === "ImportDeclaration" ||
      node.type === "ExportAllDeclaration" ||
      node.type === "ExportNamedDeclaration" ||
      node.type === "ImportExpression"
        ? node.source
        : undefined;
    if (source === undefined || source === null) return;
    if (source.type === "Literal" && typeof source.value === "string") {
      let { start, end } = source;
      n.push({
        kind: "literal",
        spelled: source.value,
        start,
        end,
      });
    } else if (node.type === "ImportExpression")
      n.push({
        kind: "computed",
        start: source.start,
        end: source.end,
      });
  });
  return n.toSorted((r, s) => r.start - s.start);
}
//@ chunk-s61vbvea.js:646818-646848 placement
var SURFACE_UNLINKED = "surface-unlinked:///";
//@ chunk-s61vbvea.js:646848-647256 placement
/**
 * 把界面模块源码中的导入说明符改写为 surface:/// 或未链接的占位地址（动态导入改为拼接）。
 */
function rewriteSurfaceImports(e, n) {
  let r = acornParser().parse(e, {
    ecmaVersion: "latest",
    sourceType: "module",
  });
  let s = jsonStringify(`${SURFACE_UNLINKED}computed#`);
  let h = [];
  let y = e;
  for (let S of collectModuleImports(r).toReversed()) {
    let w =
      S.end +
      h.filter((j) => j.span.start >= S.start && j.span.end <= S.end).reduce((acc, G) => acc + G.grewBy, 0);
    let sliced = y.slice(S.start, w);
    let P = S.kind === "literal" ? jsonStringify(n(S.spelled)) : `(${s} + String(${sliced}))`;
    y = y.slice(0, S.start) + P + y.slice(w);
    h.push({
      span: S,
      grewBy: P.length - sliced.length,
    });
  }
  return y;
}
//@ chunk-s61vbvea.js:647256-647284 placement
var CLAUDE_HOOKS_TYPES = "claude:hooks-types";
//@ chunk-s61vbvea.js:647284-647321 placement
/**
 * 未链接模块的键
 */
var unlinkedSurfaceKey = (e) => SURFACE_UNLINKED + encodeURIComponent(e);
//@ chunk-s61vbvea.js:647321-647567 placement
function toSurfaceFile(e, n, links) {
  let s = new Map(links.filter((S) => S.from === e.file).map((S) => [S.spelled, S.file]));
  let h = transpileModule(e.file, e.source, n.pluginName);
  function y(S) {
    let w = s.get(S);
    let x = S === CLAUDE_CODE ? CLAUDE_HOOKS_TYPES : unlinkedSurfaceKey(S);
    return w === undefined ? x : surfaceModuleKey(w, n);
  }
  return {
    key: surfaceModuleKey(e.file, n),
    source: rewriteSurfaceImports(h, y),
  };
}
//@ chunk-s61vbvea.js:647567-647599 placement
var CLAUDE_SURFACE_RUNTIME = "claude:surface-runtime";
//@ chunk-s61vbvea.js:647599-660442 placement
/**
 * 桌面 Client 表面的运行时源码（claude:surface-runtime），注入到 VM
 */
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
/**
 * 类型声明源码
 */
var hooksTypesSource = STATE_RESOURCE;
//@ chunk-s61vbvea.js:660572-660643 placement
/**
 * 界面树/数据的限额
 */
var surfaceLimits = () => ({
  nodes: MAX_NODES,
  depth: MAX_DEPTH,
  chars: MAX_TREE_TEXT_CHARS,
  values: MAX_NODES_2,
  dataDepth: MAX_DEPTH_2,
});
//@ chunk-s61vbvea.js:660643-661120 placement
/**
 * 为插件的界面模块构建桌面运行包：运行时与类型模块、各模块文件（改写导入）、入口与组件、限额，并计算内容哈希。
 */
function buildDesktopSurfaceBundle(e, surfaceModules) {
  let limits = surfaceLimits();
  let s = new Map([
    [
      CLAUDE_SURFACE_RUNTIME,
      {
        key: CLAUDE_SURFACE_RUNTIME,
        source: SURFACE_RUNTIME_MODULE_SOURCE,
      },
    ],
    [
      CLAUDE_HOOKS_TYPES,
      {
        key: CLAUDE_HOOKS_TYPES,
        source: hooksTypesSource,
      },
    ],
  ]);
  for (let S of surfaceModules) {
    let w = [
      {
        file: S.modulePath,
        source: S.source,
      },
      ...S.linked,
    ];
    for (let R of w) {
      let x = surfaceModuleKey(R.file, e);
      if (!s.has(x)) s.set(x, toSurfaceFile(R, e, S.links));
    }
  }
  let files = [...s.values()];
  let modules = surfaceModules.map((S) => ({
    module: S.module,
    entry: surfaceModuleKey(S.modulePath, e),
    component: S.component,
  }));
  return {
    plugin: e.pluginName,
    hash: createHash("sha256")
      .update(
        jsonStringify({
          files,
          modules,
          limits,
        }),
      )
      .digest("hex"),
    modules,
    runtime: CLAUDE_SURFACE_RUNTIME,
    limits,
    files,
  };
}
//@ chunk-s61vbvea.js:661120-661480 placement
/**
 * 界面运行包缓存：插件模块变化时重建，按插件取包。
 */
function createSurfaceBundleCache() {
  let e = new Map();
  return {
    moduleFor(n) {
      let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === n);
      let surfaceModules = found?.args.surfaceModules;
      if (!found || !surfaceModules || !isModuleAdmitted(found)) {
        e.delete(n);
        return;
      }
      let h = e.get(n);
      if (h?.environmentId === found.environmentId) return h.built;
      let { pluginRoot, pluginName } = found.args;
      let desktopSurfaceBundle = buildDesktopSurfaceBundle(
        {
          pluginRoot,
          pluginName,
        },
        surfaceModules,
      );
      e.set(n, {
        environmentId: found.environmentId,
        built: desktopSurfaceBundle,
      });
      return desktopSurfaceBundle;
    },
  };
}
//@ chunk-s61vbvea.js:661480-661492 placement
/**
 * 界面运行包缓存
 */
var surfaceBundleCache = createSurfaceBundleCache();
//@ chunk-s61vbvea.js:661492-661504 placement
/**
 * 各插件消息队列
 */
var messageQueues = createPerPluginQueues();
//@ chunk-s61vbvea.js:661504-661642 placement
/**
 * 为一组 Client 所属的插件返回其界面运行包哈希。
 */
function surfaceBundleHashes(clientElements, n = (r) => surfaceBundleCache.moduleFor(r)?.hash) {
  let r = {};
  for (let s of new Set(clientElements.map((h) => h.plugin))) {
    let h = n(s);
    if (h !== undefined) r[s] = h;
  }
  return r;
}
//@ chunk-s61vbvea.js:661642-661780 placement
/**
 * 构造 ui.message 事件：界面、组件、请求、元素、模块与数据。
 */
var toUiMessageEvent = (e, surface, data) => ({
  plugin: e.plugin,
  message: {
    surface,
    component: e.component,
    requestId: e.requestId,
    element: e.key,
    module: e.module,
    data,
  },
});
//@ chunk-s61vbvea.js:661780-661804 placement
/**
 * ui.message 站点规则
 */
var UI_MESSAGE_RULES = UI_ENV_SITE_RULES["ui.message"];
//@ chunk-s61vbvea.js:661804-662202 placement
/**
 * 运行 ui.message 钩子链（只限该插件）并记录耗时，返回结果。
 */
async function dispatchUiMessage({ plugin, message }) {
  let startTime = performance.now();
  let s = await reportChainFailure({
    e: message,
    handlers: [
      ...hookMembersFor("ui.message", undefined, {
        only: plugin,
      }),
      {
        name: "core",
        isCore: true,
        budgetMs: 0,
        run: () => Promise.resolve({}),
      },
    ],
    site: UI_MESSAGE_RULES,
    origin: {
      plugin: CLIENT,
      tier: hookOriginFromStack([plugin]).tier,
    },
  });
  logForDebugging(
    `ui.message ${plugin}/${message.element} (${message.module}) in ${message.component} from ${message.surface}: dispatched, settled in ${(performance.now() - startTime).toFixed(1)}ms`,
  );
  return s ?? {};
}
//@ chunk-s61vbvea.js:662202-662436 placement
/**
 * 桌面端 Client 发来消息：确认已画出、校验数据为纯数据后，按插件串行分发 ui.message。
 */
async function postDesktopClientMessage(e, n = drawnClientLedger.isDrawn) {
  let { data: r, ...s } = e;
  if (!requireDrawnClient("ui.message", s, n)) return;
  let h = checkPlainData(r);
  if (h !== undefined) throw new HooksError(`${s.plugin}: Client ${s.module}: post: the data ${h}; not sent`);
  return messageQueues(s.plugin)(() => dispatchUiMessage(toUiMessageEvent(s, DESKTOP, r)));
}
//@ chunk-s61vbvea.js:662436-663451 placement
async function dispatchDesktopClient(e, n = drawnClientLedger.isDrawn) {
  let { element, event, ...h } = e;
  if (!n(h)) {
    logForDebugging(
      `ui.${event.type}: no desktop Client ${h.plugin}/${h.key} (${h.module}) is drawn in ${h.component} ${h.requestId}; nothing ran`,
    );
    return;
  }
  let y = desktopClientAddress(e);
  let startTime = performance.now();
  let w;
  async function R() {
    return {
      result: await reportChainFailure({
        e: y,
        handlers: hookMembersFor("ui.press"),
        site: UI_PRESS_RULES,
        bottom: (q) => {
          w = q;
          return Promise.resolve({
            element: q.element,
          });
        },
      }),
      ...(w !== undefined && {
        reached: w,
      }),
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
          let ee = {
            element: Z.element,
            value: Z.value,
          };
          return Promise.resolve(ee);
        },
      }),
      ...(w !== undefined && {
        reached: w,
      }),
    };
  }
  function P() {
    switch (event.type) {
      case "press":
        return R();
      case "input":
        return inputQueues(h.plugin)(() =>
          x(UI_INPUT_RULES, {
            ...y,
            kind: event.kind,
            value: event.value,
          }),
        );
      case "select":
        return selectQueues(h.plugin)(() =>
          x(UI_SELECT_RULES, {
            ...y,
            value: event.value,
          }),
        );
    }
  }
  let j = await P();
  let G = j.reached === undefined ? "withheld" : "reached";
  logForDebugging(
    `ui.${event.type} ${h.plugin}/${element} in Client ${h.key} (${h.module}) of ${h.component} from desktop: settled in ${(performance.now() - startTime).toFixed(1)}ms, ${G}`,
  );
  return j;
}
export {
  toUiMessageEvent,
  dispatchUiMessage,
  describeClientFailure,
  desktopFaultDispatcher,
  DEFAULT_MODULE_FAILURE,
  DESKTOP_SURFACE_RUNTIME_SOURCE,
  surfaceLimits,
  toUiFaultEvent,
  drawnClientLedger,
  surfaceBundleHashes,
  surfaceBundleCache,
  dispatchDesktopClient,
  postDesktopClientMessage,
  createDesktopFaultHandler,
  DESKTOP,
};
