/**
 * plugins/functionHooks/surfaceClients.ts
 *
 * 2.1.316 新增：函数钩子插件的"surface"客户端：在沙箱环境运行界面模块、测量与重绘、焦点、故障上报
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv2zdrd7.js (41)
 * attribution: placement 41
 */
import * as vmModule from "vm";
import { Ar } from "../../../runtime/bun-runtime.js";
import {
  dispatchUiMessage,
  describeClientFailure,
  desktopFaultDispatcher,
  DEFAULT_MODULE_FAILURE,
  DESKTOP_SURFACE_RUNTIME_SOURCE,
  surfaceLimits,
  toUiFaultEvent,
  toUiMessageEvent,
} from "./ui/desktopSurface.js";
import { SCROLL_JUMP_LINES } from "../../ink/scrollConstants.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { identity } from "../../utils/identity.js";
import { createStore } from "../../state/store.js";
import { ONE_ENGINE_NODE_COMPONENT, surfaceRowLedger } from "./ui/treeConstants.js";
import { currentVersion, sayPlainCode, logLine, unknownBorderNote } from "./ui/renderDispatch.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { isHoverableType, elementScope } from "./ui/elements.js";
import { deepFreezeInPlace, matcherLog } from "../../utils/hooks/functionHookMatchers.js";
import {
  wellFormed,
  validateTree,
  withPlainLinks,
  withPlainCode,
  withKnownBorders,
  plainCodeFinding,
  plainCodeNote,
  plainLinkFinding,
  plainLinkNote,
} from "./ui/validateTree.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { paneHostSlot } from "./panes.js";
import {
  isVmError,
  inboundCopier,
  runVmPrelude,
  createVmInstanceofObject,
  createErrorConverters,
  createVmConsole,
} from "./vm/vmGlobals.js";
import { claimPendingWriteLine, isUntrustedObject } from "../../utils/shutdown/pendingWrites.js";
import { rejectionText, newVmHostContext, runInVmWithTrace, linkHooksModule } from "./vm/moduleLoader.js";
import { tellOnce } from "./ui/renderNotices.js";
import { createVmErrorDescriber, timeoutOption } from "./vm/vmRealm.js";
import { HooksError, envUnloadedError } from "./hooksErrors.js";
import { MAX_TREE_TEXT_CHARS_2, checkPlainData } from "./sites/plainData.js";
import { freezeApiObject, nullPrototypeFunction } from "./dispatch/chain.js";
import { withUseStrict } from "./vm/vmBootstrapSource.js";
import { HOOKS_READY_TIMEOUT_MS } from "./hooksModuleLoader.js";
import { withTimeout } from "../../utils/sleep.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { createSignal } from "../../utils/signal.js";
import { heldRunners, hostDrawnPresses } from "./ui/interactions.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { findLoadedModule } from "../hooksModules/loadedModuleFilters.js";
import { subscribe_2 } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { moveToCloudTrash } from "../../utils/cloudTrash.js";
import { reportPluginProblem } from "./hooksWorkerClient.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";

//@ chunk-jv2zdrd7.js:1178-1189 placement
/**
 * 空对象
 */
var EMPTY_SURFACE_CLIENTS = {};
//@ chunk-jv2zdrd7.js:1189-1310 placement
Ar(EMPTY_SURFACE_CLIENTS, {
  clientFocusStore: () => focusStore,
  default: () => EMPTY_SURFACE_CLIENTS,
  focusClient: () => setFocusedClient,
  focusedClientId: () => focusedClientId,
  releaseClientFocus: () => clearFocusedClient,
});
//@ chunk-jv2zdrd7.js:1310-1809 placement
function createUiMessagePort(r = {}) {
  let run = r.run ?? dispatchUiMessage;
  let f =
    r.schedule ??
    ((m) => {
      let timer = setTimeout(m, SCROLL_JUMP_LINES);
      return () => {
        clearTimeout(timer);
      };
    });
  let w =
    r.warn ??
    ((m) => {
      logForDebugging(m, {
        level: "warn",
      });
    });
  let p = new Map();
  let T;
  let a = 0;
  function u() {
    T = undefined;
    let m = [...p.values()];
    p.clear();
    for (let { message, reply } of m) {
      a += 1;
      run(message).then(reply, (error) => {
        w(
          `ui.message ${message.plugin}/${message.message.element}: the chain threw (${errorMessage(error)}); no reply`,
        );
      });
    }
  }
  return {
    post(m, message, reply) {
      p.set(m, {
        message,
        reply,
      });
      T ??= f(u);
    },
    cancel(m) {
      p.delete(m);
      if (p.size === 0 && T !== undefined) {
        T();
        T = undefined;
      }
    },
    dispatched: () => a,
  };
}
//@ chunk-jv2zdrd7.js:1809-1822 placement
/**
 * UI 消息端口
 */
var uiMessagePort = createUiMessagePort();
//@ chunk-jv2zdrd7.js:1822-1862 placement
/**
 * 客户端界面键
 */
var clientSurfaceKey = (requestId, key) => `${requestId}\x00client\x00${key}`;
//@ chunk-jv2zdrd7.js:1862-1951 placement
/**
 * 客户端描述
 */
var surfaceClientInfo = (r) => ({
  component: r.component,
  requestId: clientSurfaceKey(r.requestId, r.key),
  surface: r.surface,
});
//@ chunk-jv2zdrd7.js:1951-1996 placement
/**
 * 客户端失败说明
 */
var clientFailureText = (plugin, i, f) => `Client ${i}: ${describeClientFailure(plugin, i, f)}`;
//@ chunk-jv2zdrd7.js:1996-2069 placement
/**
 * 焦点 store
 */
var focusStore = identity(
  createStore({
    focusedId: null,
  }),
  (r) =>
    r.setState(() => ({
      focusedId: null,
    })),
);
//@ chunk-jv2zdrd7.js:2069-2133 placement
/**
 * 设置焦点
 */
var setFocusedClient = (id) =>
  focusStore.setState((i) =>
    i.focusedId === id
      ? i
      : {
          focusedId: id,
        },
  );
//@ chunk-jv2zdrd7.js:2133-2169 placement
/**
 * 取焦点 id
 */
var focusedClientId = () => focusStore.getState().focusedId;
//@ chunk-jv2zdrd7.js:2169-2236 placement
/**
 * 清除焦点
 */
var clearFocusedClient = (id) =>
  focusStore.setState((i) =>
    i.focusedId === id
      ? {
          focusedId: null,
        }
      : i,
  );
//@ chunk-jv2zdrd7.js:2236-2259 placement
/**
 * 引擎节点权重
 */
var engineNodeWeight = (component) => (component === ONE_ENGINE_NODE_COMPONENT ? 1 : 0);
//@ chunk-jv2zdrd7.js:2259-2383 placement
function createClientSite(r, component) {
  let f = {
    surface: r.drawing.surface,
    component,
    requestId: r.requestId,
  };
  return {
    site: f,
    bornAt: currentVersion(f),
    holders: 0,
  };
}
//@ chunk-jv2zdrd7.js:2383-2419 placement
/**
 * 持有句柄
 */
var heldHandle = (plugin, handle) => ({
  plugin,
  handle,
});
//@ chunk-jv2zdrd7.js:2419-2785 placement
/**
 * 解析界面模块返回的元素树 JSON，把 held 句柄转为按键记录、悬停组归属到插件。
 */
function toClientTree(plugin, i, f) {
  function w(p) {
    if (!isPlainObject(p)) return p;
    let { props, hover, children, held } = p;
    let c = {
      type: p.type,
    };
    if (props !== undefined) c.props = props;
    if (hover !== undefined) c.hover = hover;
    if (isHoverableType(p.type) && elementScope(hover) !== undefined)
      c.group = {
        plugin,
      };
    if (typeof held === "number") c.press = heldHandle(plugin, f(held));
    if ((typeof held !== "number" || p.type === "Button") && Array.isArray(children))
      c.children = children.map(w);
    return c;
  }
  return deepFreezeInPlace(w(wellFormed(jsonParse(i))));
}
//@ chunk-jv2zdrd7.js:2785-2846 placement
/**
 * 客户端日志键
 */
var clientLogKey = (r) => [r.plugin, r.surface, r.requestId, r.key].join(" ");
//@ chunk-jv2zdrd7.js:2846-2856 placement
/**
 * 20
 */
var MAX_CLIENT_MEASURE_TRIES = 20;
//@ chunk-jv2zdrd7.js:2856-2865 placement
/**
 * 8
 */
var MAX_CLIENT_SETTLE_TRIES = 8;
//@ chunk-jv2zdrd7.js:2865-2874 placement
/**
 * 3
 */
var MAX_CLIENT_REDRAW_TRIES = 3;
//@ chunk-jv2zdrd7.js:2874-2988 placement
var clientKeyOf = (r) => ({
  plugin: r.plugin,
  module: r.module,
  component: r.drawing.component,
  requestId: r.requestId,
  key: r.element,
});
//@ chunk-jv2zdrd7.js:2988-3635 placement
var CLIENT_STATES = (r, i) => ({
  id: clientLogKey(r),
  plugin: r.plugin,
  module: r.module,
  element: r.key,
  drawing: surfaceClientInfo(r),
  requestId: r.requestId,
  clock: r.clock,
  props: r.props,
  handedProps: r.props,
  columns: 0,
  rows: 0,
  surface: undefined,
  snapshot: {
    status: "loading",
  },
  listeners: new Set(),
  held: [],
  holders: 1,
  dialogHolders: engineNodeWeight(r.component),
  rowSite: engineNodeWeight(r.component) === 0 ? r.component : undefined,
  drawnSite: undefined,
  isOverBudget: false,
  isDirty: false,
  isRendering: false,
  unpromptedRenders: 0,
  renderTimer: undefined,
  measurings: 0,
  frameOutcome: "unmeasured",
  isUnsettled: false,
  terminal: i,
  selfDrawnTimer: undefined,
  renderedAt: i,
  thrownAt: undefined,
  toldLast: undefined,
  isDestroyed: false,
  destroyTimer: undefined,
  mountGeneration: 0,
  heldIn: new Map(),
  environmentId: undefined,
});
//@ chunk-jv2zdrd7.js:3635-3772 placement
var tellClientProblem = (r, i, f) =>
  sayPlainCode({
    key: [`${r.plugin}#${r.environmentId}`, `Client ${r.module}`, i].join(" "),
    lead: r.plugin,
    text: clientFailureText(r.plugin, r.module, f),
  });
//@ chunk-jv2zdrd7.js:3772-4249 placement
var UNSETTLED_MEASURE_NOTES = {
  instance: `its region changed size on each of ${MAX_CLIENT_SETTLE_TRIES} measurings in one frame, so it is drawn as last measured; give the Client a height and a width, or draw no more than surface.rows and surface.columns`,
  frame: `the Clients on screen were measured again in ${MAX_CLIENT_MEASURE_TRIES} passes of one frame, this one in the next, so it is drawn as last measured; some change their region at every measuring: give each a height and a width, or draw no more than surface.rows and surface.columns`,
};
//@ chunk-jv2zdrd7.js:4249-4291 placement
/**
 * 上报未结算
 */
var reportUnsettled = (r, i) => tellClientProblem(r, `unsettled ${i}`, UNSETTLED_MEASURE_NOTES[i]);
//@ chunk-jv2zdrd7.js:4291-4379 placement
/**
 * 视口键
 */
function surfaceViewportKey() {
  let r = paneHostSlot.get();
  return [r?.columns, r?.rows, r?.conversationColumns].join("x");
}
//@ chunk-jv2zdrd7.js:4379-4521 placement
function createFaultReporter(r = desktopFaultDispatcher()) {
  return (i) =>
    void r(i).catch((error) => {
      matcherLog().log(
        `ui.fault ${i.plugin}/${i.fault.element}: the chain threw (${errorMessage(error)})`,
        "warn",
      );
    });
}
//@ chunk-jv2zdrd7.js:4521-4615 placement
/**
 * 客户端错误文本
 */
function clientErrorMessage(r, vmErrorDescriber) {
  let { name: f, message } = isVmError(r) ? r : vmErrorDescriber(r);
  return message.trim() !== "" ? message : f === "Error" ? DEFAULT_MODULE_FAILURE : f;
}
//@ chunk-jv2zdrd7.js:4615-4719 placement
var UNHANDLED_SURFACE_REJECTION_TEXT = (r) =>
  `Client: a promise a surface module did not return was rejected: ${r}; the session goes on`;
//@ chunk-jv2zdrd7.js:4719-4994 placement
var CLIENT_FAULT_TEXTS = ({ pluginName, environmentId, owns }) =>
  claimPendingWriteLine((w, p) => {
    if (![p, w].some((u) => !isUntrustedObject(u) && owns(u))) return;
    let a = UNHANDLED_SURFACE_REJECTION_TEXT(logLine(rejectionText(w)));
    try {
      tellOnce({
        key: `${pluginName}#${environmentId} Client rejection`,
        lead: pluginName,
        text: a,
      });
    } catch (error) {
      logForDebugging(`${pluginName}: the fault could not be said: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    return `${pluginName}: ${a}`;
  });
//@ chunk-jv2zdrd7.js:5016-5074 placement
/**
 * 是否脚本超时
 */
var isScriptTimeout = (r) => isVmError(r) && getErrnoCode(r) === "ERR_SCRIPT_EXECUTION_TIMEOUT";
//@ chunk-jv2zdrd7.js:5074-5086 placement
/**
 * 1000
 */
var CLIENT_TICK_MS = 1000;
//@ chunk-jv2zdrd7.js:5086-5099 placement
/**
 * 60000
 */
var CLIENT_LOAD_TIMEOUT_MS = 60000;
//@ chunk-jv2zdrd7.js:5099-5126 placement
/**
 * "__surface__.run()"
 */
var SURFACE_RUN_LABEL = "__surface__.run()";
//@ chunk-jv2zdrd7.js:5126-5171 placement
/**
 * 客户端运行时
 */
var clientRuntime = (r, tick) => ({
  ...r,
  timers: new Map(),
  tick,
});
//@ chunk-jv2zdrd7.js:5171-8615 placement
/**
 * 在隔离环境中加载插件的 surface 模块并建立客户端实例（约 3.4 KB）。
 */
async function loadSurfaceModule(r, i = {}) {
  let { pluginName, pluginRoot, environmentId, surfaceModules } = r;
  let a = false;
  let { sandbox, context } = newVmHostContext();
  let c = inboundCopier(context);
  let E = (o) => deepFreezeInPlace(c(o));
  let v = runVmPrelude(context, pluginRoot);
  let vmInstanceofObject = createVmInstanceofObject(context);
  let vmErrorDescriber = createVmErrorDescriber(context);
  let { intoEnvironment } = createErrorConverters(vmErrorDescriber, v, vmInstanceofObject);
  let I = runInVmWithTrace(context, intoEnvironment);
  Object.assign(sandbox, {
    console: createVmConsole(I, `[${pluginName}] surface`),
  });
  let me = CLIENT_FAULT_TEXTS({
    pluginName,
    environmentId,
    owns: vmInstanceofObject,
  });
  let C = new Map();
  let A = 0;
  let pe = 0;
  function H(o) {
    let n = C.get(o);
    if (!n) throw new HooksError(`${pluginName}: no client instance ${o}`);
    return n;
  }
  function ue(o, n) {
    let s = H(o);
    let l = `${pluginName}: Client ${s.module}: post: the data`;
    if (n.length > MAX_TREE_TEXT_CHARS_2)
      throw new HooksError(
        `${l} serializes to ${n.length} characters, over the ${MAX_TREE_TEXT_CHARS_2} limit; not sent`,
      );
    let x = jsonParse(n);
    let g = checkPlainData(x);
    if (g !== undefined) throw new HooksError(`${l} ${g}; not sent`);
    s.host.post(x);
  }
  function W(o, n) {
    let s = H(o);
    let l = ++pe;
    s.timers.set(
      l,
      s.host.startTimer(n, () => {
        if (C.get(o)?.timers.has(l) === true) s.tick(l);
      }),
    );
    return l;
  }
  let R = freezeApiObject({
    schedule: nullPrototypeFunction(
      I((o) => {
        C.get(o)?.host.schedule();
      }),
    ),
    post: nullPrototypeFunction(I(ue)),
    startTimer: nullPrototypeFunction(I(W)),
    stopTimer: nullPrototypeFunction(
      I((o, n) => {
        let s = C.get(o);
        s?.timers.get(n)?.();
        s?.timers.delete(n);
      }),
    ),
    fault: nullPrototypeFunction(
      I((o, n) => {
        let s = C.get(o);
        if (s === undefined) {
          logForDebugging(
            `${pluginName}: Client: a promise an instance since unmounted returned was rejected: ${logLine(n)}`,
            {
              level: "warn",
            },
          );
          return;
        }
        s.host.fault(
          new HooksError(`${pluginName}: Client ${s.module}: a promise it returned was rejected: ${n}`),
        );
      }),
    ),
  });
  let { mount, setProps, resize, stage, dropHeld, hasListener, unmount } = vmModule.runInContext(
    withUseStrict(DESKTOP_SURFACE_RUNTIME_SOURCE),
    context,
  )(R, E(surfaceLimits()));
  let le = new vmModule.Script(withUseStrict(SURFACE_RUN_LABEL), {
    filename: `${pluginName} surface`,
  });
  let budgetMs = i.budgetMs ?? CLIENT_TICK_MS;
  let j = timeoutOption(CLIENT_TICK_MS, i.budgetMs);
  let Z = (o) =>
    isScriptTimeout(o) ? `ran longer than its ${budgetMs}ms budget` : clientErrorMessage(o, vmErrorDescriber);
  let ee = (o, n) => new HooksError(`${pluginName}: Client ${o}: ${Z(n)}`);
  function b(o, n, s) {
    if (a) throw envUnloadedError(pluginName);
    stage(o.id, n, s === undefined ? undefined : E(s));
    try {
      return le.runInContext(context, j);
    } catch (error) {
      throw ee(o.module, error);
    }
  }
  let oe = linkHooksModule({
    args: {
      pluginName,
      pluginRoot,
      linked: surfaceModules.flatMap((surfaceModule) => surfaceModule.linked),
      links: surfaceModules.flatMap((surfaceModule) => surfaceModule.links),
    },
    context,
    isScanned: true,
    stamped: (o) => o(),
    evaluateOptions: j,
  });
  let readyMs = i.readyMs ?? HOOKS_READY_TIMEOUT_MS;
  let F = new Map();
  for (let surfaceModule of surfaceModules) F.set(surfaceModule.module, await N(surfaceModule));
  async function N(surfaceModule) {
    try {
      let n = await withTimeout(
        oe.load(surfaceModule.modulePath, surfaceModule.source),
        readyMs,
        `its top level did not settle in ${readyMs}ms`,
      );
      return {
        component: surfaceModule.component,
        exports: n,
      };
    } catch (error) {
      return {
        error: new HooksError(
          `${pluginName}: Client ${surfaceModule.module}: the surface module did not load: ${Z(error)}`,
        ),
      };
    }
  }
  function X(o) {
    if (!C.delete(o.id)) return;
    for (let timer of o.timers.values()) timer();
    o.timers.clear();
    if (!a) unmount(o.id);
  }
  function re(o) {
    let n = F.get(o);
    if (!n) {
      let g = [...F.keys()].join(", ") || "none";
      throw new HooksError(
        `${pluginName}: Client ${o}: the plugin loaded no surface module at that path (it loaded ${g})`,
      );
    }
    if ("error" in n) throw n.error;
    let { component, exports: l } = n;
    let x = Object.hasOwn(l, component) && l[component];
    if (typeof x !== "function")
      throw new HooksError(
        `${pluginName}: Client ${o}: its export ${component} is not a function (props, surface) => tree`,
      );
    return x;
  }
  function K(o) {
    if (!a) o();
  }
  function e(o) {
    let { props, host } = o;
    if (a) throw envUnloadedError(pluginName);
    let l = re(o.module);
    let x = ++A;
    let g = clientRuntime(
      {
        id: x,
        module: o.module,
        host,
      },
      (h) => {
        b(g, "tick", h);
      },
    );
    C.set(x, g);
    mount(x, l, E(props));
    return {
      id: x,
      render: () => {
        let h = b(g, "render");
        if (typeof h !== "string") throw ee(o.module, Error("the module returned no tree"));
        return h;
      },
      setProps: (h) => K(() => setProps(x, E(h))),
      resize: (h, P) => K(() => resize(x, h, P)),
      pointer: (h) => {
        b(g, "pointer", h);
      },
      key: (h) => {
        b(g, "key", h);
      },
      runHeld: (handle, event) => {
        b(g, "held", {
          handle,
          event,
        });
      },
      dropHeld: (h) => K(() => dropHeld(x, E(h))),
      hasPointerListener: () => !a && hasListener(x, "pointer"),
      hasKeyListener: () => !a && hasListener(x, "key"),
      unmount: () => X(g),
    };
  }
  return {
    pluginName,
    environmentId,
    mount: e,
    dispose() {
      if (a) return;
      for (let o of [...C.values()]) X(o);
      setTimeout(me, CLIENT_LOAD_TIMEOUT_MS).unref();
      a = true;
    },
    isDisposed: () => a,
  };
}
//@ chunk-jv2zdrd7.js:8615-8673 placement
/**
 * 加载中的环境
 */
var loadingEnv = (environmentId, loading) => ({
  environmentId,
  loading,
  loaded: undefined,
});
//@ chunk-jv2zdrd7.js:8673-8708 placement
/**
 * 界面宿主槽
 */
var surfaceHostSlot = identity(createValueSlot(), (r) => r.set(undefined));
//@ chunk-jv2zdrd7.js:8708-9958 placement
function createSurfaceEnvironmentPool() {
  let r = new Map();
  let signal = createSignal();
  let f;
  function w(a, u) {
    if (r.get(a) === u) r.delete(a);
    u.loading.then(
      (c) => {
        c.dispose();
        heldRunners.forget(a);
        logForDebugging(`surface environment of ${a} (environment ${u.environmentId}) disposed`);
      },
      () => {},
    );
    queueMicrotask(() => signal.emit(a));
  }
  function p() {
    let a = new Map(
      getPluginRegistry()
        .loadedModules.filter(isModuleAdmitted)
        .map((loadedModule) => [loadedModule.name, loadedModule.environmentId]),
    );
    for (let [u, m] of [...r]) if (a.get(u) !== m.environmentId) w(u, m);
  }
  function T(a) {
    let loadedModule = findLoadedModule(a);
    if (!loadedModule) return Promise.reject(new HooksError(`${a}: Client: the plugin is not loaded`));
    let m = r.get(a);
    if (m?.environmentId === loadedModule.environmentId) return m.loading;
    if (m) w(a, m);
    let { surfaceModules, pluginRoot } = loadedModule.args;
    if (!surfaceModules || surfaceModules.length === 0)
      return Promise.reject(
        new HooksError(
          `${a}: Client: the plugin loaded no surface module (its hooks module builds no Client from a literal path), so nothing can draw its Clients`,
        ),
      );
    let v = surfaceHostSlot.get();
    let { environmentId } = loadedModule;
    let y = loadingEnv(
      environmentId,
      loadSurfaceModule(
        {
          pluginName: a,
          pluginRoot,
          environmentId,
          surfaceModules,
        },
        v === undefined
          ? {}
          : {
              budgetMs: v,
            },
      ).then((surfaceModule) => {
        y.loaded = surfaceModule;
        logForDebugging(
          `surface environment of ${a} (environment ${environmentId}) loaded ` +
            surfaceModules.map((surfaceModule) => surfaceModule.module).join(", "),
        );
        return surfaceModule;
      }),
    );
    r.set(a, y);
    return y.loading;
  }
  return {
    environmentFor(a) {
      f ??= subscribe_2(p);
      return T(a);
    },
    sweep: p,
    onDisposed: signal.subscribe,
    disposeAll() {
      for (let [a, u] of [...r]) w(a, u);
      f?.();
      f = undefined;
    },
    count: () => r.size,
  };
}
//@ chunk-jv2zdrd7.js:9958-9970 placement
/**
 * 界面环境池
 */
var surfaceEnvPool = createSurfaceEnvironmentPool();
//@ chunk-jv2zdrd7.js:9970-17440 placement
/**
 * 管理 surface 客户端：测量、重绘稳定性检测、异常上报（约 7.5 KB）。
 */
function createSurfaceClientHost(r = {}) {
  let environments = r.environments ?? surfaceEnvPool;
  let port = r.port ?? uiMessagePort;
  let w = r.raiseFault ?? createFaultReporter();
  let p = new Map();
  let T;
  let a = 0;
  let u = false;
  let m;
  function c(e, snapshot) {
    e.snapshot = snapshot;
    for (let listener of e.listeners) listener();
  }
  function E(e) {
    C(e, e.held);
    e.held = [];
  }
  function v(e) {
    e.mountGeneration += 1;
    R(e);
    e.isDirty = false;
    e.isOverBudget = false;
    e.thrownAt = undefined;
    e.drawnSite = undefined;
    surfaceRowLedger.dropClient(H(e));
    if (e.renderTimer) {
      clearImmediate(e.renderTimer);
      e.renderTimer = undefined;
    }
    clearImmediate(e.selfDrawnTimer);
    j(e);
    e.measurings = 0;
    e.frameOutcome = "unmeasured";
    e.isUnsettled = false;
    moveToCloudTrash.holdDrawing(e.plugin, e.drawing, []);
    E(e);
    e.surface?.unmount();
    e.surface = undefined;
    port.cancel(e.id);
    clearFocusedClient(e.id);
  }
  function O(e, o, n) {
    let s = clientFailureText(e.plugin, e.module, o);
    let l = `${e.plugin}: ${s}`;
    matcherLog().log(`${l}; ${n}`, "warn");
    reportPluginProblem(e.plugin, s, e.toldLast === s ? "once" : "again");
    e.toldLast = s;
    return l;
  }
  function y(e, error, phase) {
    let s = errorMessage(error);
    let text = O(e, s, "the instance unmounted");
    let x = new Map(e.heldIn);
    v(e);
    c(e, {
      status: "failed",
      text,
    });
    w(
      toUiFaultEvent(clientKeyOf(e), e.drawing.surface, {
        phase,
        reason: s,
        sites: () =>
          [...e.heldIn.values()]
            .filter((g) => g.holders > 0)
            .map((g) => ({
              site: g.site,
              bornAt: (x.get(g.site.component) ?? g).bornAt,
            })),
      }),
    );
  }
  let M = (e, o) =>
    `${o} ${stableStringifySafe({
      props: e.handedProps,
    })}`;
  function I(e, o) {
    if (!e.surface || e.isDestroyed) return;
    try {
      o();
    } catch (error) {
      y(e, error, "run");
    }
  }
  function me(e, surface) {
    let n = [];
    let s = [];
    let l = [];
    let x = 0;
    let g = 0;
    try {
      let clientTree = toClientTree(e.plugin, surface.render(), (S) => {
        let V = heldRunners.hold(e.plugin, (Te) => {
          R(e);
          I(e, () => surface.runHeld(S, Te));
        });
        n.push({
          surfaceHandle: V,
          environmentHandle: S,
        });
        return V;
      });
      let P = validateTree(clientTree, undefined, {
        surface: e.drawing.surface,
        within: N(e),
        measured: (S, V) => {
          x = S;
          g = V;
        },
      });
      if (P !== undefined) throw new HooksError(`returned a tree that does not validate (${P})`);
      return [
        withPlainLinks(
          withPlainCode(
            withKnownBorders(clientTree, (S) => tellClientProblem(e, "borderStyle", unknownBorderNote(S))),
            (S) => {
              s.push(S);
            },
          ),
          e.drawing.surface,
          (S) => {
            l.push(S);
          },
        ),
        n,
        x,
        s,
        l,
        g,
      ];
    } catch (error) {
      C(e, n);
      throw error;
    }
  }
  function C(e, held) {
    heldRunners.release(
      e.plugin,
      held.map((n) => n.surfaceHandle),
    );
    e.surface?.dropHeld(held.map((n) => n.environmentHandle));
  }
  function A(e) {
    let { surface } = e;
    if (!surface || e.isDestroyed) return;
    e.isDirty = false;
    e.isRendering = true;
    e.renderedAt = surfaceViewportKey();
    let n;
    try {
      n = me(e, surface);
    } catch (error) {
      y(e, error, "render");
      return;
    } finally {
      e.isRendering = false;
    }
    let [s, l, x, g, h, P] = n;
    let S = N(e) === ONE_ENGINE_NODE_COMPONENT;
    if (S && !surfaceRowLedger.fits(H(e), x, P)) {
      e.isOverBudget = true;
      C(e, l);
      O(
        e,
        `returned a tree of ${x} rows that, with the tree around the dialog and its other Clients, passes ${P}`,
        "the frame before it kept",
      );
      return;
    }
    e.isOverBudget = false;
    let held = e.held;
    e.held = l;
    let tree = hostDrawnPresses(s, e.drawing);
    C(e, held);
    e.drawnSite = N(e);
    c(e, {
      status: "drawn",
      tree,
    });
    for (let _ of g) tellClientProblem(e, plainCodeFinding(_), plainCodeNote(_));
    for (let _ of h) tellClientProblem(e, `${e.drawing.surface} ${plainLinkFinding(_)}`, plainLinkNote(_));
    if (S) surfaceRowLedger.recordClient(H(e), x);
  }
  function pe(e) {
    for (let o of p.values())
      if (
        o.isOverBudget &&
        o.requestId === e.requestId &&
        o.drawing.surface === e.surface &&
        !o.isDirty &&
        !o.isDestroyed &&
        o.surface !== undefined
      ) {
        o.isDirty = true;
        o.unpromptedRenders = 0;
        o.renderTimer = setImmediate(W, o);
      }
  }
  let H = (e) => ({
    requestId: e.requestId,
    surface: e.drawing.surface,
    plugin: e.plugin,
    key: e.element,
  });
  function ue(e) {
    if (e.isDirty || e.isDestroyed || !e.surface) return;
    if (e.unpromptedRenders >= MAX_CLIENT_REDRAW_TRIES) {
      let o = new HooksError(
        `set its state again after each of ${e.unpromptedRenders} renders, nothing heard between; set state on a pointer or key event, a tick, a press or new props, and let a render settle`,
      );
      if (e.isRendering) throw o;
      y(e, o, "run");
      return;
    }
    e.isDirty = true;
    e.renderTimer = setImmediate(W, e);
  }
  function W(e) {
    e.renderTimer = undefined;
    if (e.isDirty) {
      e.unpromptedRenders += 1;
      clearImmediate(e.selfDrawnTimer);
      e.selfDrawnTimer = setImmediate(j, e);
      A(e);
    }
  }
  function R(e) {
    for (let o of p.values()) if (o.plugin === e.plugin) o.unpromptedRenders = 0;
  }
  function ce(e, o) {
    let mountGeneration = e.mountGeneration;
    port.post(e.id, toUiMessageEvent(clientKeyOf(e), e.drawing.surface, o), (s) => {
      if (s.props !== undefined && !e.isDestroyed && e.mountGeneration === mountGeneration) Y(e, s.props);
    });
  }
  function de(e, o) {
    if (e.isDestroyed || e.surface) return;
    if (e.thrownAt !== undefined) {
      if (e.thrownAt === M(e, surfaceViewportKey())) return;
      e.thrownAt = undefined;
      e.props = e.handedProps;
      for (let [n, s] of e.heldIn)
        if (s.holders > 0)
          e.heldIn.set(n, {
            ...s,
            bornAt: currentVersion(s.site),
          });
    }
    try {
      e.environmentId = o.environmentId;
      e.surface = o.mount({
        module: e.module,
        props: e.props,
        host: {
          schedule: () => ue(e),
          post: (n) => ce(e, n),
          startTimer: (n, s) =>
            e.clock.every(n, () => {
              R(e);
              I(e, s);
            }),
          fault: (n) =>
            I(e, () => {
              throw n;
            }),
        },
      });
      e.surface.resize(e.columns, e.rows);
    } catch (error) {
      y(e, error, "load");
      return;
    }
    A(e);
  }
  function q(e) {
    e.mountGeneration += 1;
    let mountGeneration = e.mountGeneration;
    let n = () => e.mountGeneration === mountGeneration && !e.isDestroyed;
    environments.environmentFor(e.plugin).then(
      (s) => {
        if (n()) de(e, s);
      },
      (error) => {
        if (n()) y(e, error, "load");
      },
    );
  }
  function Y(e, o) {
    if (stableStringifySafe(o) === stableStringifySafe(e.props)) return;
    e.props = o;
    R(e);
    I(e, () => {
      e.surface?.setProps(o);
    });
    A(e);
  }
  function J(e, o) {
    e.handedProps = o;
    Y(e, o);
  }
  function G(e) {
    if (e.isDestroyed) return;
    e.isDestroyed = true;
    clearTimeout(e.destroyTimer);
    v(e);
    if (p.get(e.id) === e) p.delete(e.id);
  }
  function Q() {
    m = undefined;
    a = 0;
    for (let e of p.values()) {
      e.isUnsettled &&= e.frameOutcome !== "measured";
      e.measurings = 0;
      e.frameOutcome = "unmeasured";
    }
  }
  function le(e) {
    let o = e.measurings >= (e.isUnsettled ? 1 : MAX_CLIENT_SETTLE_TRIES);
    let n = e.measurings > 0 && a > MAX_CLIENT_MEASURE_TRIES;
    return o ? "instance" : n ? "frame" : undefined;
  }
  function he(e, o) {
    e.frameOutcome = "passed over";
    e.surface?.resize(e.columns, e.rows);
    if (!e.isUnsettled) {
      e.isUnsettled = true;
      reportUnsettled(e, o);
    }
  }
  function j(e) {
    e.selfDrawnTimer = undefined;
  }
  function Z(e) {
    if (e.holders === 0) G(e);
  }
  function ee(e, o) {
    if (o.columns === e.columns && o.rows === e.rows) return;
    let n = surfaceViewportKey();
    let s = n !== e.terminal;
    let l = u && !s && e.measurings > 0;
    e.terminal = n;
    e.columns = o.columns;
    e.rows = o.rows;
    if (l) {
      a += 1;
      u = false;
    }
    let x = s ? undefined : le(e);
    if (x !== undefined) {
      he(e, x);
      return;
    }
    if (!s) e.measurings += 1;
    if (e.frameOutcome === "unmeasured") e.frameOutcome = "measured";
    m ??= setImmediate(Q);
    if (s || e.selfDrawnTimer === undefined) R(e);
    if (e.surface) {
      e.surface.resize(o.columns, o.rows);
      A(e);
    }
  }
  function b(e, o) {
    F(e, o, -1);
    e.holders = Math.max(0, e.holders - 1);
    e.dialogHolders = Math.max(0, e.dialogHolders - engineNodeWeight(o));
    if (e.holders === 0 && !e.isDestroyed) {
      clearTimeout(e.destroyTimer);
      e.destroyTimer = setTimeout(Z, 0, e);
    } else if (!oe(e)) z(e);
  }
  function oe(e) {
    return e.surface === undefined || e.drawnSite === N(e);
  }
  function z(e) {
    R(e);
    surfaceRowLedger.dropClient(H(e));
    e.drawnSite = undefined;
    if (e.snapshot.status === "drawn")
      c(e, {
        status: "loading",
      });
    A(e);
  }
  function F(e, component, n) {
    let s = e.heldIn.get(component) ?? createClientSite(e, component);
    e.heldIn.set(component, {
      ...s,
      holders: Math.max(0, s.holders + n),
    });
  }
  function N(e) {
    return e.dialogHolders > 0 ? ONE_ENGINE_NODE_COMPONENT : (e.rowSite ?? e.drawing.component);
  }
  let X = (e, component) => ({
    id: e.id,
    plugin: e.plugin,
    module: e.module,
    subscribe: (n) => {
      e.listeners.add(n);
      return () => e.listeners.delete(n);
    },
    getSnapshot: () => e.snapshot,
    setProps: (n) => J(e, n),
    laidOut: () => {
      u = true;
    },
    resize: (columns, rows) =>
      ee(e, {
        columns,
        rows,
      }),
    pointer: (n) => {
      R(e);
      I(e, () => e.surface?.pointer(n));
    },
    key: (n) => {
      R(e);
      I(e, () => e.surface?.key(n));
    },
    acceptsPointer: () => e.surface?.hasPointerListener() === true,
    acceptsKeys: () => e.surface?.hasKeyListener() === true,
    threw: (n) => {
      if (e.surface === undefined || e.isDestroyed) return;
      y(e, n, "render");
      e.thrownAt = M(e, e.renderedAt);
    },
    drawnAgain: () =>
      e.thrownAt !== undefined && e.thrownAt !== M(e, surfaceViewportKey()) && e.holders > 0
        ? q(e)
        : undefined,
    release: () => b(e, component),
  });
  function re(e) {
    for (let o of p.values()) {
      if (o.plugin !== e || o.isDestroyed) continue;
      v(o);
      o.toldLast = undefined;
      c(o, {
        status: "loading",
      });
      if (o.holders > 0) q(o);
    }
  }
  function K(e, o) {
    clearTimeout(e.destroyTimer);
    e.destroyTimer = undefined;
    e.holders += 1;
    F(e, o.component, 1);
    e.clock = o.clock;
    let n = engineNodeWeight(o.component);
    e.dialogHolders += n;
    e.rowSite = n === 0 ? o.component : e.rowSite;
    if (oe(e)) J(e, o.props);
    else {
      e.handedProps = o.props;
      e.props = o.props;
      I(e, () => {
        e.surface?.setProps(o.props);
      });
      z(e);
    }
    return X(e, o.component);
  }
  return {
    acquire(e) {
      T ??= [environments.onDisposed(re), surfaceRowLedger.onFreed(pe)];
      let o = p.get(clientLogKey(e));
      if (o !== undefined && !o.isDestroyed && o.module === e.module) return K(o, e);
      if (o) G(o);
      let s = CLIENT_STATES(e, surfaceViewportKey());
      p.set(s.id, s);
      F(s, e.component, 1);
      q(s);
      return X(s, e.component);
    },
    remountPlugin: re,
    count: () => p.size,
    dispose() {
      for (let e of T ?? []) e();
      T = undefined;
      clearImmediate(m);
      Q();
      for (let e of p.values()) {
        clearImmediate(e.selfDrawnTimer);
        j(e);
      }
    },
  };
}
//@ chunk-jv2zdrd7.js:17440-17454 placement
/**
 * 界面客户端宿主
 */
var surfaceClientHost = createSurfaceClientHost();
export {
  focusStore,
  setFocusedClient,
  createSurfaceClientHost,
  clientSurfaceKey,
  createUiMessagePort,
  clearFocusedClient,
  surfaceClientHost,
};
