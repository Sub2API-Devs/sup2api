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
  A4r,
  C4r,
  DESKTOP_SURFACE_RUNTIME_SOURCE,
  P4r,
  toUiFaultEvent,
  toUiMessageEvent,
} from "./ui/desktopSurface.js";
import { Xh } from "../../ink/scrollConstants.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { ge } from "../../utils/identity.js";
import { createStore } from "../../state/store.js";
import { ONE_ENGINE_NODE_COMPONENT, zte } from "./ui/treeConstants.js";
import { currentVersion, sayPlainCode, logLine, unknownBorderNote } from "./ui/renderDispatch.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { d3t, c3t } from "./ui/elements.js";
import { Q5e, pd } from "../../utils/hooks/functionHookMatchers.js";
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
import { g2 } from "./panes.js";
import {
  QAn,
  lSi,
  dSi,
  createVmInstanceofObject,
  createErrorConverters,
  createVmConsole,
} from "./vm/vmGlobals.js";
import { Jun, n0e } from "../../utils/shutdown/pendingWrites.js";
import { jfr, mSi, gSi, linkHooksModule } from "./vm/moduleLoader.js";
import { tellOnce } from "./ui/renderNotices.js";
import { createVmErrorDescriber, B5e } from "./vm/vmRealm.js";
import { HooksError, SIe } from "./hooksErrors.js";
import { afr, lEe } from "./sites/plainData.js";
import { freezeApiObject, NH } from "./dispatch/chain.js";
import { BT } from "./vm/vmBootstrapSource.js";
import { iEt } from "./hooksModuleLoader.js";
import { withTimeout } from "../../utils/sleep.js";
import { to } from "../../utils/valueSlot.js";
import { createSignal } from "../../utils/signal.js";
import { Hvt, hostDrawnPresses } from "./ui/interactions.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { isModuleAdmitted } from "../../utils/plugins/functionHooks/admission.js";
import { QNe } from "../hooksModules/loadedModuleFilters.js";
import { subscribe_2 } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { _ee } from "../../utils/cloudTrash.js";
import { reportPluginProblem } from "./hooksWorkerClient.js";
import { Rs } from "../../utils/hooks/hookSerialization.js";

//@ chunk-jv2zdrd7.js:1178-1189 placement
var HNt = {};
//@ chunk-jv2zdrd7.js:1189-1310 placement
Ar(HNt, {
  clientFocusStore: () => HTe,
  default: () => HNt,
  focusClient: () => Qrn,
  focusedClientId: () => io,
  releaseClientFocus: () => Ewo,
});
//@ chunk-jv2zdrd7.js:1310-1809 placement
function createUiMessagePort(r = {}) {
  let i = r.run ?? dispatchUiMessage,
    f =
      r.schedule ??
      ((m) => {
        let c = setTimeout(m, Xh);
        return () => {
          clearTimeout(c);
        };
      }),
    w =
      r.warn ??
      ((m) => {
        logForDebugging(m, { level: "warn" });
      }),
    p = new Map(),
    T,
    a = 0;
  function u() {
    T = void 0;
    let m = [...p.values()];
    p.clear();
    for (let { message: message, reply: reply } of m)
      ((a += 1),
        i(message).then(reply, (v) => {
          w(
            `ui.message ${message.plugin}/${message.message.element}: the chain threw (${errorMessage(v)}); no reply`,
          );
        }));
  }
  return {
    post(m, c, E) {
      (p.set(m, { message: c, reply: E }), (T ??= f(u)));
    },
    cancel(m) {
      if ((p.delete(m), p.size === 0 && T !== void 0)) (T(), (T = void 0));
    },
    dispatched: () => a,
  };
}
//@ chunk-jv2zdrd7.js:1809-1822 placement
var We = createUiMessagePort();
//@ chunk-jv2zdrd7.js:1822-1862 placement
var wwo = (r, i) => `${r}\x00client\x00${i}`;
//@ chunk-jv2zdrd7.js:1862-1951 placement
var ye = (r) => ({ component: r.component, requestId: wwo(r.requestId, r.key), surface: r.surface });
//@ chunk-jv2zdrd7.js:1951-1996 placement
var ne = (r, i, f) => `Client ${i}: ${describeClientFailure(r, i, f)}`;
//@ chunk-jv2zdrd7.js:1996-2069 placement
var HTe = ge(createStore({ focusedId: null }), (r) => r.setState(() => ({ focusedId: null })));
//@ chunk-jv2zdrd7.js:2069-2133 placement
var Qrn = (r) => HTe.setState((i) => (i.focusedId === r ? i : { focusedId: r }));
//@ chunk-jv2zdrd7.js:2133-2169 placement
var io = () => HTe.getState().focusedId;
//@ chunk-jv2zdrd7.js:2169-2236 placement
var Ewo = (r) => HTe.setState((i) => (i.focusedId === r ? { focusedId: null } : i));
//@ chunk-jv2zdrd7.js:2236-2259 placement
var U = (r) => (r === ONE_ENGINE_NODE_COMPONENT ? 1 : 0);
//@ chunk-jv2zdrd7.js:2259-2383 placement
function createClientSite(r, i) {
  let f = { surface: r.drawing.surface, component: i, requestId: r.requestId };
  return { site: f, bornAt: currentVersion(f), holders: 0 };
}
//@ chunk-jv2zdrd7.js:2383-2419 placement
var Se = (r, i) => ({ plugin: r, handle: i });
/**
 * 解析界面模块返回的元素树 JSON，把 held 句柄转为按键记录、悬停组归属到插件。
 */
//@ chunk-jv2zdrd7.js:2419-2785 placement
function toClientTree(r, i, f) {
  function w(p) {
    if (!isPlainObject(p)) return p;
    let { props: props, hover: hover, children: children, held: held } = p,
      c = { type: p.type };
    if (props !== void 0) c.props = props;
    if (hover !== void 0) c.hover = hover;
    if (d3t(p.type) && c3t(hover) !== void 0) c.group = { plugin: r };
    if (typeof held === "number") c.press = Se(r, f(held));
    if ((typeof held !== "number" || p.type === "Button") && Array.isArray(children))
      c.children = children.map(w);
    return c;
  }
  return Q5e(w(wellFormed(jsonParse(i))));
}
//@ chunk-jv2zdrd7.js:2785-2846 placement
var se = (r) => [r.plugin, r.surface, r.requestId, r.key].join(" ");
//@ chunk-jv2zdrd7.js:2846-2856 placement
var ie = 20;
//@ chunk-jv2zdrd7.js:2856-2865 placement
var ae = 8;
//@ chunk-jv2zdrd7.js:2865-2874 placement
var ve = 3;
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
  id: se(r),
  plugin: r.plugin,
  module: r.module,
  element: r.key,
  drawing: ye(r),
  requestId: r.requestId,
  clock: r.clock,
  props: r.props,
  handedProps: r.props,
  columns: 0,
  rows: 0,
  surface: void 0,
  snapshot: { status: "loading" },
  listeners: new Set(),
  held: [],
  holders: 1,
  dialogHolders: U(r.component),
  rowSite: U(r.component) === 0 ? r.component : void 0,
  drawnSite: void 0,
  isOverBudget: !1,
  isDirty: !1,
  isRendering: !1,
  unpromptedRenders: 0,
  renderTimer: void 0,
  measurings: 0,
  frameOutcome: "unmeasured",
  isUnsettled: !1,
  terminal: i,
  selfDrawnTimer: void 0,
  renderedAt: i,
  thrownAt: void 0,
  toldLast: void 0,
  isDestroyed: !1,
  destroyTimer: void 0,
  mountGeneration: 0,
  heldIn: new Map(),
  environmentId: void 0,
});
//@ chunk-jv2zdrd7.js:3635-3772 placement
var tellClientProblem = (r, i, f) =>
  sayPlainCode({
    key: [`${r.plugin}#${r.environmentId}`, `Client ${r.module}`, i].join(" "),
    lead: r.plugin,
    text: ne(r.plugin, r.module, f),
  });
//@ chunk-jv2zdrd7.js:3772-4249 placement
var UNSETTLED_MEASURE_NOTES = {
  instance: `its region changed size on each of ${ae} measurings in one frame, so it is drawn as last measured; give the Client a height and a width, or draw no more than surface.rows and surface.columns`,
  frame: `the Clients on screen were measured again in ${ie} passes of one frame, this one in the next, so it is drawn as last measured; some change their region at every measuring: give each a height and a width, or draw no more than surface.rows and surface.columns`,
};
//@ chunk-jv2zdrd7.js:4249-4291 placement
var vo = (r, i) => tellClientProblem(r, `unsettled ${i}`, UNSETTLED_MEASURE_NOTES[i]);
//@ chunk-jv2zdrd7.js:4291-4379 placement
function B() {
  let r = g2.get();
  return [r?.columns, r?.rows, r?.conversationColumns].join("x");
}
//@ chunk-jv2zdrd7.js:4379-4521 placement
function createFaultReporter(r = A4r()) {
  return (i) =>
    void r(i).catch((f) => {
      pd().log(`ui.fault ${i.plugin}/${i.fault.element}: the chain threw (${errorMessage(f)})`, "warn");
    });
}
//@ chunk-jv2zdrd7.js:4521-4615 placement
function Ae(r, i) {
  let { name: f, message: message } = QAn(r) ? r : i(r);
  return message.trim() !== "" ? message : f === "Error" ? C4r : f;
}
//@ chunk-jv2zdrd7.js:4615-4719 placement
var UNHANDLED_SURFACE_REJECTION_TEXT = (r) =>
  `Client: a promise a surface module did not return was rejected: ${r}; the session goes on`;
//@ chunk-jv2zdrd7.js:4719-4994 placement
var CLIENT_FAULT_TEXTS = ({ pluginName: pluginName, environmentId: environmentId, owns: owns }) =>
  Jun((w, p) => {
    if (![p, w].some((u) => !n0e(u) && owns(u))) return;
    let a = UNHANDLED_SURFACE_REJECTION_TEXT(logLine(jfr(w)));
    try {
      tellOnce({ key: `${pluginName}#${environmentId} Client rejection`, lead: pluginName, text: a });
    } catch (error) {
      logForDebugging(`${pluginName}: the fault could not be said: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    return `${pluginName}: ${a}`;
  });
//@ chunk-jv2zdrd7.js:5016-5074 placement
var Fe = (r) => QAn(r) && getErrnoCode(r) === "ERR_SCRIPT_EXECUTION_TIMEOUT";
//@ chunk-jv2zdrd7.js:5074-5086 placement
var Ie = 1000;
//@ chunk-jv2zdrd7.js:5086-5099 placement
var _e = 60000;
//@ chunk-jv2zdrd7.js:5099-5126 placement
var je = "__surface__.run()";
//@ chunk-jv2zdrd7.js:5126-5171 placement
var Ne = (r, i) => ({ ...r, timers: new Map(), tick: i });
/**
 * 在隔离环境中加载插件的 surface 模块并建立客户端实例（约 3.4 KB）。
 */
//@ chunk-jv2zdrd7.js:5171-8615 placement
async function loadSurfaceModule(r, i = {}) {
  let {
      pluginName: pluginName,
      pluginRoot: pluginRoot,
      environmentId: environmentId,
      surfaceModules: surfaceModules,
    } = r,
    a = !1,
    { sandbox: sandbox, context: context } = mSi(),
    c = lSi(context),
    E = (o) => Q5e(c(o)),
    v = dSi(context, pluginRoot),
    O = createVmInstanceofObject(context),
    y = createVmErrorDescriber(context),
    { intoEnvironment: intoEnvironment } = createErrorConverters(y, v, O),
    I = gSi(context, intoEnvironment);
  Object.assign(sandbox, { console: createVmConsole(I, `[${pluginName}] surface`) });
  let me = CLIENT_FAULT_TEXTS({ pluginName: pluginName, environmentId: environmentId, owns: O }),
    C = new Map(),
    A = 0,
    pe = 0;
  function H(o) {
    let n = C.get(o);
    if (!n) throw new HooksError(`${pluginName}: no client instance ${o}`);
    return n;
  }
  function ue(o, n) {
    let s = H(o),
      l = `${pluginName}: Client ${s.module}: post: the data`;
    if (n.length > afr)
      throw new HooksError(`${l} serializes to ${n.length} characters, over the ${afr} limit; not sent`);
    let x = jsonParse(n),
      g = lEe(x);
    if (g !== void 0) throw new HooksError(`${l} ${g}; not sent`);
    s.host.post(x);
  }
  function W(o, n) {
    let s = H(o),
      l = ++pe;
    return (
      s.timers.set(
        l,
        s.host.startTimer(n, () => {
          if (C.get(o)?.timers.has(l) === !0) s.tick(l);
        }),
      ),
      l
    );
  }
  let R = freezeApiObject({
      schedule: NH(
        I((o) => {
          C.get(o)?.host.schedule();
        }),
      ),
      post: NH(I(ue)),
      startTimer: NH(I(W)),
      stopTimer: NH(
        I((o, n) => {
          let s = C.get(o);
          (s?.timers.get(n)?.(), s?.timers.delete(n));
        }),
      ),
      fault: NH(
        I((o, n) => {
          let s = C.get(o);
          if (s === void 0) {
            logForDebugging(
              `${pluginName}: Client: a promise an instance since unmounted returned was rejected: ${logLine(n)}`,
              { level: "warn" },
            );
            return;
          }
          s.host.fault(
            new HooksError(`${pluginName}: Client ${s.module}: a promise it returned was rejected: ${n}`),
          );
        }),
      ),
    }),
    {
      mount: mount,
      setProps: setProps,
      resize: resize,
      stage: stage,
      dropHeld: dropHeld,
      hasListener: hasListener,
      unmount: unmount,
    } = vmModule.runInContext(BT(DESKTOP_SURFACE_RUNTIME_SOURCE), context)(R, E(P4r())),
    le = new vmModule.Script(BT(je), { filename: `${pluginName} surface` }),
    he = i.budgetMs ?? Ie,
    j = B5e(Ie, i.budgetMs),
    Z = (o) => (Fe(o) ? `ran longer than its ${he}ms budget` : Ae(o, y)),
    ee = (o, n) => new HooksError(`${pluginName}: Client ${o}: ${Z(n)}`);
  function b(o, n, s) {
    if (a) throw SIe(pluginName);
    stage(o.id, n, s === void 0 ? void 0 : E(s));
    try {
      return le.runInContext(context, j);
    } catch (error) {
      throw ee(o.module, error);
    }
  }
  let oe = linkHooksModule({
      args: {
        pluginName: pluginName,
        pluginRoot: pluginRoot,
        linked: surfaceModules.flatMap((o) => o.linked),
        links: surfaceModules.flatMap((o) => o.links),
      },
      context: context,
      isScanned: !0,
      stamped: (o) => o(),
      evaluateOptions: j,
    }),
    z = i.readyMs ?? iEt,
    F = new Map();
  for (let o of surfaceModules) F.set(o.module, await N(o));
  async function N(o) {
    try {
      let n = await withTimeout(oe.load(o.modulePath, o.source), z, `its top level did not settle in ${z}ms`);
      return { component: o.component, exports: n };
    } catch (error) {
      return {
        error: new HooksError(
          `${pluginName}: Client ${o.module}: the surface module did not load: ${Z(error)}`,
        ),
      };
    }
  }
  function X(o) {
    if (!C.delete(o.id)) return;
    for (let n of o.timers.values()) n();
    if ((o.timers.clear(), !a)) unmount(o.id);
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
    let { component: component, exports: l } = n,
      x = Object.hasOwn(l, component) && l[component];
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
    let { props: props, host: host } = o;
    if (a) throw SIe(pluginName);
    let l = re(o.module),
      x = ++A,
      g = Ne({ id: x, module: o.module, host: host }, (h) => {
        b(g, "tick", h);
      });
    return (
      C.set(x, g),
      mount(x, l, E(props)),
      {
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
        runHeld: (h, P) => {
          b(g, "held", { handle: h, event: P });
        },
        dropHeld: (h) => K(() => dropHeld(x, E(h))),
        hasPointerListener: () => !a && hasListener(x, "pointer"),
        hasKeyListener: () => !a && hasListener(x, "key"),
        unmount: () => X(g),
      }
    );
  }
  return {
    pluginName: pluginName,
    environmentId: environmentId,
    mount: e,
    dispose() {
      if (a) return;
      for (let o of [...C.values()]) X(o);
      (setTimeout(me, _e).unref(), (a = !0));
    },
    isDisposed: () => a,
  };
}
//@ chunk-jv2zdrd7.js:8615-8673 placement
var qe = (r, i) => ({ environmentId: r, loading: i, loaded: void 0 });
//@ chunk-jv2zdrd7.js:8673-8708 placement
var Ge = ge(to(), (r) => r.set(void 0));
//@ chunk-jv2zdrd7.js:8708-9958 placement
function createSurfaceEnvironmentPool() {
  let r = new Map(),
    i = createSignal(),
    f;
  function w(a, u) {
    if (r.get(a) === u) r.delete(a);
    (u.loading.then(
      (c) => {
        (c.dispose(),
          Hvt.forget(a),
          logForDebugging(`surface environment of ${a} (environment ${u.environmentId}) disposed`));
      },
      () => {},
    ),
      queueMicrotask(() => i.emit(a)));
  }
  function p() {
    let a = new Map(
      getPluginRegistry()
        .loadedModules.filter(isModuleAdmitted)
        .map((u) => [u.name, u.environmentId]),
    );
    for (let [u, m] of [...r]) if (a.get(u) !== m.environmentId) w(u, m);
  }
  function T(a) {
    let u = QNe(a);
    if (!u) return Promise.reject(new HooksError(`${a}: Client: the plugin is not loaded`));
    let m = r.get(a);
    if (m?.environmentId === u.environmentId) return m.loading;
    if (m) w(a, m);
    let { surfaceModules: surfaceModules, pluginRoot: pluginRoot } = u.args;
    if (!surfaceModules || surfaceModules.length === 0)
      return Promise.reject(
        new HooksError(
          `${a}: Client: the plugin loaded no surface module (its hooks module builds no Client from a literal path), so nothing can draw its Clients`,
        ),
      );
    let v = Ge.get(),
      { environmentId: environmentId } = u,
      y = qe(
        environmentId,
        loadSurfaceModule(
          {
            pluginName: a,
            pluginRoot: pluginRoot,
            environmentId: environmentId,
            surfaceModules: surfaceModules,
          },
          v === void 0 ? {} : { budgetMs: v },
        ).then(
          (M) => (
            (y.loaded = M),
            logForDebugging(
              `surface environment of ${a} (environment ${environmentId}) loaded ` +
                surfaceModules.map((I) => I.module).join(", "),
            ),
            M
          ),
        ),
      );
    return (r.set(a, y), y.loading);
  }
  return {
    environmentFor(a) {
      return ((f ??= subscribe_2(p)), T(a));
    },
    sweep: p,
    onDisposed: i.subscribe,
    disposeAll() {
      for (let [a, u] of [...r]) w(a, u);
      (f?.(), (f = void 0));
    },
    count: () => r.size,
  };
}
//@ chunk-jv2zdrd7.js:9958-9970 placement
var Xe = createSurfaceEnvironmentPool();
/**
 * 管理 surface 客户端：测量、重绘稳定性检测、异常上报（约 7.5 KB）。
 */
//@ chunk-jv2zdrd7.js:9970-17440 placement
function createSurfaceClientHost(r = {}) {
  let i = r.environments ?? Xe,
    f = r.port ?? We,
    w = r.raiseFault ?? createFaultReporter(),
    p = new Map(),
    T,
    a = 0,
    u = !1,
    m;
  function c(e, o) {
    e.snapshot = o;
    for (let listener of e.listeners) listener();
  }
  function E(e) {
    (C(e, e.held), (e.held = []));
  }
  function v(e) {
    if (
      ((e.mountGeneration += 1),
      R(e),
      (e.isDirty = !1),
      (e.isOverBudget = !1),
      (e.thrownAt = void 0),
      (e.drawnSite = void 0),
      zte.dropClient(H(e)),
      e.renderTimer)
    )
      (clearImmediate(e.renderTimer), (e.renderTimer = void 0));
    (clearImmediate(e.selfDrawnTimer),
      j(e),
      (e.measurings = 0),
      (e.frameOutcome = "unmeasured"),
      (e.isUnsettled = !1),
      _ee.holdDrawing(e.plugin, e.drawing, []),
      E(e),
      e.surface?.unmount(),
      (e.surface = void 0),
      f.cancel(e.id),
      Ewo(e.id));
  }
  function O(e, o, n) {
    let s = ne(e.plugin, e.module, o),
      l = `${e.plugin}: ${s}`;
    return (
      pd().log(`${l}; ${n}`, "warn"),
      reportPluginProblem(e.plugin, s, e.toldLast === s ? "once" : "again"),
      (e.toldLast = s),
      l
    );
  }
  function y(e, o, n) {
    let s = errorMessage(o),
      l = O(e, s, "the instance unmounted"),
      x = new Map(e.heldIn);
    (v(e),
      c(e, { status: "failed", text: l }),
      w(
        toUiFaultEvent(clientKeyOf(e), e.drawing.surface, {
          phase: n,
          reason: s,
          sites: () =>
            [...e.heldIn.values()]
              .filter((g) => g.holders > 0)
              .map((g) => ({ site: g.site, bornAt: (x.get(g.site.component) ?? g).bornAt })),
        }),
      ));
  }
  let M = (e, o) => `${o} ${Rs({ props: e.handedProps })}`;
  function I(e, o) {
    if (!e.surface || e.isDestroyed) return;
    try {
      o();
    } catch (error) {
      y(e, error, "run");
    }
  }
  function me(e, o) {
    let n = [],
      s = [],
      l = [],
      x = 0,
      g = 0;
    try {
      let h = toClientTree(e.plugin, o.render(), (S) => {
          let hold = Hvt.hold(e.plugin, (Te) => {
            (R(e), I(e, () => o.runHeld(S, Te)));
          });
          return (n.push({ surfaceHandle: hold, environmentHandle: S }), hold);
        }),
        P = validateTree(h, void 0, {
          surface: e.drawing.surface,
          within: N(e),
          measured: (S, V) => {
            ((x = S), (g = V));
          },
        });
      if (P !== void 0) throw new HooksError(`returned a tree that does not validate (${P})`);
      return [
        withPlainLinks(
          withPlainCode(
            withKnownBorders(h, (S) => tellClientProblem(e, "borderStyle", unknownBorderNote(S))),
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
      throw (C(e, n), error);
    }
  }
  function C(e, o) {
    (Hvt.release(
      e.plugin,
      o.map((n) => n.surfaceHandle),
    ),
      e.surface?.dropHeld(o.map((n) => n.environmentHandle)));
  }
  function A(e) {
    let { surface: surface } = e;
    if (!surface || e.isDestroyed) return;
    ((e.isDirty = !1), (e.isRendering = !0), (e.renderedAt = B()));
    let n;
    try {
      n = me(e, surface);
    } catch (error) {
      y(e, error, "render");
      return;
    } finally {
      e.isRendering = !1;
    }
    let [s, l, x, g, h, P] = n,
      S = N(e) === ONE_ENGINE_NODE_COMPONENT;
    if (S && !zte.fits(H(e), x, P)) {
      ((e.isOverBudget = !0),
        C(e, l),
        O(
          e,
          `returned a tree of ${x} rows that, with the tree around the dialog and its other Clients, passes ${P}`,
          "the frame before it kept",
        ));
      return;
    }
    e.isOverBudget = !1;
    let held = e.held;
    e.held = l;
    let Ke = hostDrawnPresses(s, e.drawing);
    (C(e, held), (e.drawnSite = N(e)), c(e, { status: "drawn", tree: Ke }));
    for (let _ of g) tellClientProblem(e, plainCodeFinding(_), plainCodeNote(_));
    for (let _ of h) tellClientProblem(e, `${e.drawing.surface} ${plainLinkFinding(_)}`, plainLinkNote(_));
    if (S) zte.recordClient(H(e), x);
  }
  function pe(e) {
    for (let o of p.values())
      if (
        o.isOverBudget &&
        o.requestId === e.requestId &&
        o.drawing.surface === e.surface &&
        !o.isDirty &&
        !o.isDestroyed &&
        o.surface !== void 0
      )
        ((o.isDirty = !0), (o.unpromptedRenders = 0), (o.renderTimer = setImmediate(W, o)));
  }
  let H = (e) => ({ requestId: e.requestId, surface: e.drawing.surface, plugin: e.plugin, key: e.element });
  function ue(e) {
    if (e.isDirty || e.isDestroyed || !e.surface) return;
    if (e.unpromptedRenders >= ve) {
      let o = new HooksError(
        `set its state again after each of ${e.unpromptedRenders} renders, nothing heard between; set state on a pointer or key event, a tick, a press or new props, and let a render settle`,
      );
      if (e.isRendering) throw o;
      y(e, o, "run");
      return;
    }
    ((e.isDirty = !0), (e.renderTimer = setImmediate(W, e)));
  }
  function W(e) {
    if (((e.renderTimer = void 0), e.isDirty))
      ((e.unpromptedRenders += 1),
        clearImmediate(e.selfDrawnTimer),
        (e.selfDrawnTimer = setImmediate(j, e)),
        A(e));
  }
  function R(e) {
    for (let o of p.values()) if (o.plugin === e.plugin) o.unpromptedRenders = 0;
  }
  function ce(e, o) {
    let mountGeneration = e.mountGeneration;
    f.post(e.id, toUiMessageEvent(clientKeyOf(e), e.drawing.surface, o), (s) => {
      if (s.props !== void 0 && !e.isDestroyed && e.mountGeneration === mountGeneration) Y(e, s.props);
    });
  }
  function de(e, o) {
    if (e.isDestroyed || e.surface) return;
    if (e.thrownAt !== void 0) {
      if (e.thrownAt === M(e, B())) return;
      ((e.thrownAt = void 0), (e.props = e.handedProps));
      for (let [n, s] of e.heldIn)
        if (s.holders > 0) e.heldIn.set(n, { ...s, bornAt: currentVersion(s.site) });
    }
    try {
      ((e.environmentId = o.environmentId),
        (e.surface = o.mount({
          module: e.module,
          props: e.props,
          host: {
            schedule: () => ue(e),
            post: (n) => ce(e, n),
            startTimer: (n, s) =>
              e.clock.every(n, () => {
                (R(e), I(e, s));
              }),
            fault: (n) =>
              I(e, () => {
                throw n;
              }),
          },
        })),
        e.surface.resize(e.columns, e.rows));
    } catch (error) {
      y(e, error, "load");
      return;
    }
    A(e);
  }
  function q(e) {
    e.mountGeneration += 1;
    let mountGeneration = e.mountGeneration,
      n = () => e.mountGeneration === mountGeneration && !e.isDestroyed;
    i.environmentFor(e.plugin).then(
      (s) => {
        if (n()) de(e, s);
      },
      (s) => {
        if (n()) y(e, s, "load");
      },
    );
  }
  function Y(e, o) {
    if (Rs(o) === Rs(e.props)) return;
    ((e.props = o),
      R(e),
      I(e, () => {
        e.surface?.setProps(o);
      }),
      A(e));
  }
  function J(e, o) {
    ((e.handedProps = o), Y(e, o));
  }
  function G(e) {
    if (e.isDestroyed) return;
    if (((e.isDestroyed = !0), clearTimeout(e.destroyTimer), v(e), p.get(e.id) === e)) p.delete(e.id);
  }
  function Q() {
    ((m = void 0), (a = 0));
    for (let e of p.values())
      ((e.isUnsettled &&= e.frameOutcome !== "measured"),
        (e.measurings = 0),
        (e.frameOutcome = "unmeasured"));
  }
  function le(e) {
    let o = e.measurings >= (e.isUnsettled ? 1 : ae),
      n = e.measurings > 0 && a > ie;
    return o ? "instance" : n ? "frame" : void 0;
  }
  function he(e, o) {
    if (((e.frameOutcome = "passed over"), e.surface?.resize(e.columns, e.rows), !e.isUnsettled))
      ((e.isUnsettled = !0), vo(e, o));
  }
  function j(e) {
    e.selfDrawnTimer = void 0;
  }
  function Z(e) {
    if (e.holders === 0) G(e);
  }
  function ee(e, o) {
    if (o.columns === e.columns && o.rows === e.rows) return;
    let n = B(),
      s = n !== e.terminal,
      l = u && !s && e.measurings > 0;
    if (((e.terminal = n), (e.columns = o.columns), (e.rows = o.rows), l)) ((a += 1), (u = !1));
    let x = s ? void 0 : le(e);
    if (x !== void 0) {
      he(e, x);
      return;
    }
    if (!s) e.measurings += 1;
    if (e.frameOutcome === "unmeasured") e.frameOutcome = "measured";
    if (((m ??= setImmediate(Q)), s || e.selfDrawnTimer === void 0)) R(e);
    if (e.surface) (e.surface.resize(o.columns, o.rows), A(e));
  }
  function b(e, o) {
    if (
      (F(e, o, -1),
      (e.holders = Math.max(0, e.holders - 1)),
      (e.dialogHolders = Math.max(0, e.dialogHolders - U(o))),
      e.holders === 0 && !e.isDestroyed)
    )
      (clearTimeout(e.destroyTimer), (e.destroyTimer = setTimeout(Z, 0, e)));
    else if (!oe(e)) z(e);
  }
  function oe(e) {
    return e.surface === void 0 || e.drawnSite === N(e);
  }
  function z(e) {
    if ((R(e), zte.dropClient(H(e)), (e.drawnSite = void 0), e.snapshot.status === "drawn"))
      c(e, { status: "loading" });
    A(e);
  }
  function F(e, o, n) {
    let s = e.heldIn.get(o) ?? createClientSite(e, o);
    e.heldIn.set(o, { ...s, holders: Math.max(0, s.holders + n) });
  }
  function N(e) {
    return e.dialogHolders > 0 ? ONE_ENGINE_NODE_COMPONENT : (e.rowSite ?? e.drawing.component);
  }
  let X = (e, o) => ({
    id: e.id,
    plugin: e.plugin,
    module: e.module,
    subscribe: (n) => (e.listeners.add(n), () => e.listeners.delete(n)),
    getSnapshot: () => e.snapshot,
    setProps: (n) => J(e, n),
    laidOut: () => {
      u = !0;
    },
    resize: (n, s) => ee(e, { columns: n, rows: s }),
    pointer: (n) => {
      (R(e), I(e, () => e.surface?.pointer(n)));
    },
    key: (n) => {
      (R(e), I(e, () => e.surface?.key(n)));
    },
    acceptsPointer: () => e.surface?.hasPointerListener() === !0,
    acceptsKeys: () => e.surface?.hasKeyListener() === !0,
    threw: (n) => {
      if (e.surface === void 0 || e.isDestroyed) return;
      (y(e, n, "render"), (e.thrownAt = M(e, e.renderedAt)));
    },
    drawnAgain: () => (e.thrownAt !== void 0 && e.thrownAt !== M(e, B()) && e.holders > 0 ? q(e) : void 0),
    release: () => b(e, o),
  });
  function re(e) {
    for (let o of p.values()) {
      if (o.plugin !== e || o.isDestroyed) continue;
      if ((v(o), (o.toldLast = void 0), c(o, { status: "loading" }), o.holders > 0)) q(o);
    }
  }
  function K(e, o) {
    (clearTimeout(e.destroyTimer),
      (e.destroyTimer = void 0),
      (e.holders += 1),
      F(e, o.component, 1),
      (e.clock = o.clock));
    let n = U(o.component);
    if (((e.dialogHolders += n), (e.rowSite = n === 0 ? o.component : e.rowSite), oe(e))) J(e, o.props);
    else
      ((e.handedProps = o.props),
        (e.props = o.props),
        I(e, () => {
          e.surface?.setProps(o.props);
        }),
        z(e));
    return X(e, o.component);
  }
  return {
    acquire(e) {
      T ??= [i.onDisposed(re), zte.onFreed(pe)];
      let o = p.get(se(e));
      if (o !== void 0 && !o.isDestroyed && o.module === e.module) return K(o, e);
      if (o) G(o);
      let s = CLIENT_STATES(e, B());
      return (p.set(s.id, s), F(s, e.component, 1), q(s), X(s, e.component));
    },
    remountPlugin: re,
    count: () => p.size,
    dispose() {
      for (let e of T ?? []) e();
      ((T = void 0), clearImmediate(m), Q());
      for (let e of p.values()) (clearImmediate(e.selfDrawnTimer), j(e));
    },
  };
}
//@ chunk-jv2zdrd7.js:17440-17454 placement
var TDs = createSurfaceClientHost();

export { HTe, Qrn, createSurfaceClientHost, wwo, createUiMessagePort, Ewo, TDs };
