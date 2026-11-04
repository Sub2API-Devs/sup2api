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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:642484-642502 placement
var DESKTOP = "desktop";
//@ chunk-s61vbvea.js:642502-642608 placement
var desktopClientAddress = (held) => ({
  plugin: held.plugin,
  element: held.element,
  component: held.component,
  requestId: held.requestId,
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
var drawnClientKey = (client) => [client.plugin, client.module, client.key].join("\x00");
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
var siteVersionThunk = (state, site) => () => siteVersionOf(state, site);
//@ chunk-s61vbvea.js:642809-643837 placement
/**
 * 记录各 (component, requestId) 渲染中画出的桌面 Client 及其版本、已报告失败的 Client（最多 1024 条，LRU）。
 */
function createDrawnClientLedger() {
  let byInstance = new Map();
  let generation = 0;
  function storeEntry(instanceKey, entry) {
    byInstance.delete(instanceKey);
    byInstance.set(instanceKey, entry);
    let [oldest] = byInstance.keys();
    if (byInstance.size > MAX_DRAWN_CLIENTS && oldest !== undefined) byInstance.delete(oldest);
  }
  return {
    begin(component, requestId) {
      let instanceKey = surfaceRefKey(component, requestId);
      let { keys = new Map(), failed = new Map() } = byInstance.get(instanceKey) ?? {};
      generation += 1;
      storeEntry(instanceKey, {
        generation,
        keys,
        failed,
      });
      return {
        instance: instanceKey,
        generation,
        version: siteVersionThunk(
          renderVersions().getState(),
          desktopSurfaceRef({
            component,
            requestId,
          }),
        ),
      };
    },
    record({ instance, generation, version }, clients) {
      let current = byInstance.get(instance);
      if (current?.generation !== generation) return;
      if (clients.length === 0) {
        byInstance.delete(instance);
        return;
      }
      let currentVersion = version();
      let mapped = clients.map(drawnClientKey);
      storeEntry(instance, {
        generation,
        keys: new Map(
          mapped.map((key) => [
            key,
            current.failed.has(key) ? currentVersion : (current.keys.get(key) ?? currentVersion),
          ]),
        ),
        failed: new Map(
          mapped
            .filter((key) => current.failed.get(key) === currentVersion)
            .map((key) => [key, currentVersion]),
        ),
      });
    },
    isDrawn({ component, requestId, ...address }) {
      let instanceKey = surfaceRefKey(component, requestId);
      let entry = byInstance.get(instanceKey);
      let isDrawn = entry?.keys.has(drawnClientKey(address)) === true;
      if (isDrawn) storeEntry(instanceKey, entry);
      return isDrawn;
    },
    toldFailed({ component, requestId, ...address }) {
      let instanceKey = surfaceRefKey(component, requestId);
      let entry = byInstance.get(instanceKey);
      let clientKey = drawnClientKey(address);
      let siteRef = desktopSurfaceRef({
        component,
        requestId,
      });
      let version = entry?.keys.get(clientKey);
      if (entry === undefined || version === undefined) return;
      if (entry.failed.has(clientKey)) return () => currentVersion(siteRef);
      storeEntry(instanceKey, {
        ...entry,
        failed: new Map([...entry.failed, [clientKey, currentVersion(siteRef)]]),
      });
      return () => version;
    },
    count: () => byInstance.size,
  };
}
//@ chunk-s61vbvea.js:643837-643849 placement
/**
 * 已绘制客户端账本
 */
var drawnClientLedger; // deferred: uses createDrawnClientLedger of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:643837", () => {
  drawnClientLedger = createDrawnClientLedger();
});
//@ chunk-s61vbvea.js:643849-644013 placement
function requireDrawnClient(caller, address, isDrawn) {
  let found = isDrawn(address);
  if (!found)
    logForDebugging(
      `${caller}: no desktop Client ${address.plugin}/${address.key} (${address.module}) is drawn in ${address.component} ${address.requestId}; nothing ran`,
    );
  return found;
}
//@ chunk-s61vbvea.js:644013-644098 placement
var CORE_FAULT_BOTTOM; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:644013", () => {
  CORE_FAULT_BOTTOM = Object.freeze({
    name: "core",
    isCore: true,
    budgetMs: 0,
    run: () => Promise.resolve({}),
  });
});
//@ chunk-s61vbvea.js:644098-644120 placement
/**
 * ui.fault 站点规则
 */
var UI_FAULT_RULES; // deferred: uses UI_ENV_SITE_RULES (../sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:644098", () => {
  UI_FAULT_RULES = UI_ENV_SITE_RULES["ui.fault"];
});
//@ chunk-s61vbvea.js:644120-644227 placement
function isNewFaultForSite({ site, bornAt }) {
  let versions = pluginStateRegistry().faultRuns.get(renderInstanceKey(site))?.versions;
  return !(versions?.has(bornAt) && versions.has(currentVersion(site)));
}
//@ chunk-s61vbvea.js:644227-644466 placement
var faultIsHeard = (only, fault) =>
  modulesHookingEvent("ui.fault", undefined, {
    only,
  }).some((mod) => {
    let matcher = mod.matcherFor("ui.fault");
    try {
      return matcher === undefined || matchesLiteralMatcher(matcher, fault);
    } catch (error) {
      logForDebugging(
        `hooks module ${mod.label}: on('ui.fault') matcher threw on the host (${errorMessage(error)}); taken as heard`,
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
function recordFaultRun(site, redraw = burstRedrawSite) {
  let { faultRuns } = pluginStateRegistry();
  let siteKey = renderInstanceKey(site);
  let run = faultRuns.get(siteKey);
  let hadVersion = run?.versions.has(currentVersion(site)) === true;
  try {
    redraw(site);
  } finally {
    faultRuns.delete(siteKey);
    faultRuns.set(siteKey, {
      site,
      versions: new Set([...(hadVersion ? run.versions : []), currentVersion(site)]),
    });
    let [oldest] = faultRuns;
    if (faultRuns.size > MAX_FAULT_RUNS && oldest !== undefined) {
      faultRuns.delete(oldest[0]);
      dropUnheldRenderVersions(oldest[1].site);
    }
  }
}
//@ chunk-s61vbvea.js:644727-644859 placement
var rerenderFaultSites = ({ plugin, fault, sites }, redraw) =>
  runIgnoringAbort(() => {
    for (let entry of faultIsHeard(plugin, fault) ? sites() : [])
      runIgnoringAbort(() => {
        if (entry.site.requestId !== "" && isNewFaultForSite(entry)) recordFaultRun(entry.site, redraw);
      });
  });
//@ chunk-s61vbvea.js:644859-645198 placement
/**
 * 运行 ui.fault 钩子链（只限出错插件），记录耗时，结束后对仍画着该 Client 的站点重新渲染。
 */
async function dispatchUiFault(request, redraw) {
  let { plugin, fault } = request;
  let startTime = performance.now();
  try {
    let outcome = await reportChainFailure({
      e: fault,
      handlers: [
        ...hookMembersFor("ui.fault", undefined, {
          only: plugin,
        }),
        CORE_FAULT_BOTTOM,
      ],
      site: UI_FAULT_RULES,
    });
    let elapsedText = (performance.now() - startTime).toFixed(1);
    logForDebugging(
      `ui.fault ${plugin}/${fault.element} (${fault.module}) in ${fault.component} from ${fault.surface}, ${fault.phase}: dispatched, settled in ${elapsedText}ms`,
    );
    return outcome ?? {};
  } finally {
    rerenderFaultSites(request, redraw);
  }
}
//@ chunk-s61vbvea.js:645198-645264 placement
/**
 * 按插件排队分发故障
 */
function desktopFaultDispatcher(redraw = burstRedrawSite) {
  let perPluginQueues = createPerPluginQueues();
  return (request) => perPluginQueues(request.plugin)(() => dispatchUiFault(request, redraw));
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
function scrubFaultText(text) {
  let replaced = text.replace(LINE_SCRUB, " ");
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
function describeClientFailure(caller, moduleName, reason) {
  let callerPrefix = `${caller}: `;
  let modulePrefix = `Client ${moduleName}: `;
  let scrubbed = scrubFaultText(reason);
  let withoutCaller = scrubbed.startsWith(callerPrefix) ? scrubbed.slice(callerPrefix.length) : scrubbed;
  let withoutModule = withoutCaller.startsWith(modulePrefix)
    ? withoutCaller.slice(modulePrefix.length)
    : withoutCaller;
  return withoutModule.trim() === "" ? DEFAULT_MODULE_FAILURE : withoutModule;
}
//@ chunk-s61vbvea.js:645565-645581 placement
/**
 * "…"
 */
var ELLIPSIS = "\u2026";
//@ chunk-s61vbvea.js:645581-645636 placement
var regExp_16; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:645581", () => {
  regExp_16 = new RegExp(String.raw`[\u{2028}\u{2029}]`, "gu");
});
//@ chunk-s61vbvea.js:645636-645647 placement
/**
 * 200
 */
var MAX_VISIBLE_TEXT = 200;
//@ chunk-s61vbvea.js:645647-645754 placement
function shortFaultReason(address, reason) {
  let replaced = describeClientFailure(address.plugin, address.module, reason).replace(regExp_16, " ");
  return replaced.length > MAX_VISIBLE_TEXT
    ? truncateToLength(replaced, MAX_VISIBLE_TEXT - ELLIPSIS.length) + ELLIPSIS
    : replaced;
}
//@ chunk-s61vbvea.js:645754-645933 placement
/**
 * 构造 ui.fault 事件：界面、组件、请求、元素、模块、阶段与简短原因，附带受影响站点。
 */
var toUiFaultEvent = (address, surface, report) => ({
  plugin: address.plugin,
  fault: {
    surface,
    component: address.component,
    requestId: address.requestId,
    element: address.key,
    module: address.module,
    phase: report.phase,
    reason: shortFaultReason(address, report.reason),
  },
  sites: report.sites,
});
//@ chunk-s61vbvea.js:645933-646160 placement
/**
 * 处理桌面端 Client 报告的故障：仅对已画出且未报告过的 Client 分发 ui.fault。
 */
function createDesktopFaultHandler(ledger = drawnClientLedger, dispatch = desktopFaultDispatcher()) {
  return async ({ address, report }) => {
    let toldFailed = requireDrawnClient("ui.fault", address, ledger.isDrawn)
      ? ledger.toldFailed(address)
      : undefined;
    if (toldFailed === undefined) return;
    return dispatch(
      toUiFaultEvent(address, "desktop", {
        ...report,
        sites: () =>
          ledger.isDrawn(address)
            ? [
                {
                  site: desktopSurfaceRef(address),
                  bornAt: toldFailed(),
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
var surfaceModuleKey = (modulePath, plugin) =>
  SURFACE + relative(plugin.pluginRoot, modulePath).split(sep).map(encodeURIComponent).join("/");
//@ chunk-s61vbvea.js:646341-646818 placement
function collectModuleImports(program) {
  let imports = [];
  walkAst(program, ({ node }) => {
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
      imports.push({
        kind: "literal",
        spelled: source.value,
        start,
        end,
      });
    } else if (node.type === "ImportExpression")
      imports.push({
        kind: "computed",
        start: source.start,
        end: source.end,
      });
  });
  return imports.toSorted((a, b) => a.start - b.start);
}
//@ chunk-s61vbvea.js:646818-646848 placement
var SURFACE_UNLINKED = "surface-unlinked:///";
//@ chunk-s61vbvea.js:646848-647256 placement
/**
 * 把界面模块源码中的导入说明符改写为 surface:/// 或未链接的占位地址（动态导入改为拼接）。
 */
function rewriteSurfaceImports(source, specifierFor) {
  let program = acornParser().parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
  });
  let computedPrefix = jsonStringify(`${SURFACE_UNLINKED}computed#`);
  let edits = [];
  let current = source;
  for (let entry of collectModuleImports(program).toReversed()) {
    let end =
      entry.end +
      edits
        .filter((edit) => edit.span.start >= entry.start && edit.span.end <= entry.end)
        .reduce((acc, edit) => acc + edit.grewBy, 0);
    let sliced = current.slice(entry.start, end);
    let replacement =
      entry.kind === "literal"
        ? jsonStringify(specifierFor(entry.spelled))
        : `(${computedPrefix} + String(${sliced}))`;
    current = current.slice(0, entry.start) + replacement + current.slice(end);
    edits.push({
      span: entry,
      grewBy: replacement.length - sliced.length,
    });
  }
  return current;
}
//@ chunk-s61vbvea.js:647256-647284 placement
var CLAUDE_HOOKS_TYPES = "claude:hooks-types";
//@ chunk-s61vbvea.js:647284-647321 placement
/**
 * 未链接模块的键
 */
var unlinkedSurfaceKey = (specifier) => SURFACE_UNLINKED + encodeURIComponent(specifier);
//@ chunk-s61vbvea.js:647321-647567 placement
function toSurfaceFile(file, plugin, links) {
  let linkedBySpelled = new Map(
    links.filter((link) => link.from === file.file).map((link) => [link.spelled, link.file]),
  );
  let transpiled = transpileModule(file.file, file.source, plugin.pluginName);
  function specifierFor(specifier) {
    let linkedFile = linkedBySpelled.get(specifier);
    let unlinked = specifier === CLAUDE_CODE ? CLAUDE_HOOKS_TYPES : unlinkedSurfaceKey(specifier);
    return linkedFile === undefined ? unlinked : surfaceModuleKey(linkedFile, plugin);
  }
  return {
    key: surfaceModuleKey(file.file, plugin),
    source: rewriteSurfaceImports(transpiled, specifierFor),
  };
}
//@ chunk-s61vbvea.js:647567-647599 placement
var CLAUDE_SURFACE_RUNTIME = "claude:surface-runtime";
//@ chunk-s61vbvea.js:647599-660442 placement
/**
 * 桌面 Client 表面的运行时源码（claude:surface-runtime），注入到 VM
 */
var DESKTOP_SURFACE_RUNTIME_SOURCE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:647599", () => {
  DESKTOP_SURFACE_RUNTIME_SOURCE = String.raw`((host, limits) => {
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
});
//@ chunk-s61vbvea.js:660442-660561 placement
var SURFACE_RUNTIME_MODULE_SOURCE; // deferred: uses DESKTOP_SURFACE_RUNTIME_SOURCE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:660442", () => {
  SURFACE_RUNTIME_MODULE_SOURCE = `const jsx = ${VM_BOOTSTRAP_SOURCE}
export const h = jsx.h
export const Fragment = jsx.Fragment
export const install = ${DESKTOP_SURFACE_RUNTIME_SOURCE}
`;
});
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
function buildDesktopSurfaceBundle(plugin, surfaceModules) {
  let limits = surfaceLimits();
  let filesByKey = new Map([
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
  for (let surface of surfaceModules) {
    let fileList = [
      {
        file: surface.modulePath,
        source: surface.source,
      },
      ...surface.linked,
    ];
    for (let file of fileList) {
      let key = surfaceModuleKey(file.file, plugin);
      if (!filesByKey.has(key)) filesByKey.set(key, toSurfaceFile(file, plugin, surface.links));
    }
  }
  let files = [...filesByKey.values()];
  let modules = surfaceModules.map((surface) => ({
    module: surface.module,
    entry: surfaceModuleKey(surface.modulePath, plugin),
    component: surface.component,
  }));
  return {
    plugin: plugin.pluginName,
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
  let cache = new Map();
  return {
    moduleFor(pluginName) {
      let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === pluginName);
      let surfaceModules = found?.args.surfaceModules;
      if (!found || !surfaceModules || !isModuleAdmitted(found)) {
        cache.delete(pluginName);
        return;
      }
      let cached = cache.get(pluginName);
      if (cached?.environmentId === found.environmentId) return cached.built;
      let { pluginRoot, pluginName: pluginName_2 } = found.args;
      let desktopSurfaceBundle = buildDesktopSurfaceBundle(
        {
          pluginRoot,
          pluginName: pluginName_2,
        },
        surfaceModules,
      );
      cache.set(pluginName, {
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
var surfaceBundleCache; // deferred: uses createSurfaceBundleCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:661480", () => {
  surfaceBundleCache = createSurfaceBundleCache();
});
//@ chunk-s61vbvea.js:661492-661504 placement
/**
 * 各插件消息队列
 */
var messageQueues; // deferred: uses createPerPluginQueues (./interactions.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:661492", () => {
  messageQueues = createPerPluginQueues();
});
//@ chunk-s61vbvea.js:661504-661642 placement
/**
 * 为一组 Client 所属的插件返回其界面运行包哈希。
 */
function surfaceBundleHashes(
  clientElements,
  hashOf = (pluginName) => surfaceBundleCache.moduleFor(pluginName)?.hash,
) {
  let hashes = {};
  for (let pluginName of new Set(clientElements.map((element) => element.plugin))) {
    let hash = hashOf(pluginName);
    if (hash !== undefined) hashes[pluginName] = hash;
  }
  return hashes;
}
//@ chunk-s61vbvea.js:661642-661780 placement
/**
 * 构造 ui.message 事件：界面、组件、请求、元素、模块与数据。
 */
var toUiMessageEvent = (address, surface, data) => ({
  plugin: address.plugin,
  message: {
    surface,
    component: address.component,
    requestId: address.requestId,
    element: address.key,
    module: address.module,
    data,
  },
});
//@ chunk-s61vbvea.js:661780-661804 placement
/**
 * ui.message 站点规则
 */
var UI_MESSAGE_RULES; // deferred: uses UI_ENV_SITE_RULES (../sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:661780", () => {
  UI_MESSAGE_RULES = UI_ENV_SITE_RULES["ui.message"];
});
//@ chunk-s61vbvea.js:661804-662202 placement
/**
 * 运行 ui.message 钩子链（只限该插件）并记录耗时，返回结果。
 */
async function dispatchUiMessage({ plugin, message }) {
  let startTime = performance.now();
  let outcome = await reportChainFailure({
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
  return outcome ?? {};
}
//@ chunk-s61vbvea.js:662202-662436 placement
/**
 * 桌面端 Client 发来消息：确认已画出、校验数据为纯数据后，按插件串行分发 ui.message。
 */
async function postDesktopClientMessage(request, isDrawn = drawnClientLedger.isDrawn) {
  let { data, ...address } = request;
  if (!requireDrawnClient("ui.message", address, isDrawn)) return;
  let dataProblem = checkPlainData(data);
  if (dataProblem !== undefined)
    throw new HooksError(
      `${address.plugin}: Client ${address.module}: post: the data ${dataProblem}; not sent`,
    );
  return messageQueues(address.plugin)(() => dispatchUiMessage(toUiMessageEvent(address, DESKTOP, data)));
}
//@ chunk-s61vbvea.js:662436-663451 placement
async function dispatchDesktopClient(request, isDrawn = drawnClientLedger.isDrawn) {
  let { element, event, ...address } = request;
  if (!isDrawn(address)) {
    logForDebugging(
      `ui.${event.type}: no desktop Client ${address.plugin}/${address.key} (${address.module}) is drawn in ${address.component} ${address.requestId}; nothing ran`,
    );
    return;
  }
  let pressAddress = desktopClientAddress(request);
  let startTime = performance.now();
  let reached;
  async function runPress() {
    return {
      result: await reportChainFailure({
        e: pressAddress,
        handlers: hookMembersFor("ui.press"),
        site: UI_PRESS_RULES,
        bottom: (request) => {
          reached = request;
          return Promise.resolve({
            element: request.element,
          });
        },
      }),
      ...(reached !== undefined && {
        reached,
      }),
    };
  }
  async function runChain(site, input) {
    return {
      result: await reportChainFailure({
        e: input,
        handlers: hookMembersFor(site.event),
        site,
        bottom: (request) => {
          reached = request;
          let stoppedAt = {
            element: request.element,
            value: request.value,
          };
          return Promise.resolve(stoppedAt);
        },
      }),
      ...(reached !== undefined && {
        reached,
      }),
    };
  }
  function runEvent() {
    switch (event.type) {
      case "press":
        return runPress();
      case "input":
        return inputQueues(address.plugin)(() =>
          runChain(UI_INPUT_RULES, {
            ...pressAddress,
            kind: event.kind,
            value: event.value,
          }),
        );
      case "select":
        return selectQueues(address.plugin)(() =>
          runChain(UI_SELECT_RULES, {
            ...pressAddress,
            value: event.value,
          }),
        );
    }
  }
  let outcome = await runEvent();
  let statusText = outcome.reached === undefined ? "withheld" : "reached";
  logForDebugging(
    `ui.${event.type} ${address.plugin}/${element} in Client ${address.key} (${address.module}) of ${address.component} from desktop: settled in ${(performance.now() - startTime).toFixed(1)}ms, ${statusText}`,
  );
  return outcome;
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
