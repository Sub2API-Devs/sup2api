/**
 * cli/handlers/pluginTest/uiDriver.ts
 *
 * 2.1.316 新增。插件测试中驱动 ui.render 绘制结果（act/find/press）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1tz177x8.js (34)
 * attribution: placement 34
 */
import { setTimeout as Jn, setTimeout as zi } from "timers/promises";
import {
  basename,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
} from "path";
import { readdir, readdir as readdir_2, readFile, readFile as readFile_2, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { DoctorLazy } from "../util.js";
import { o, u, Ue, T, Ir, U, E, oe, pe, M } from "../../../../vendor/zod/v4/classic/schemas.js";
import { W5e } from "../../../plugins/functionHooks/ui/renderSites.js";
import {
  Je,
  findHostedElement,
  engineCallFor,
  Ye,
  hooksModuleSource,
  submitTestInput,
} from "./engineShim.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { Xh } from "../../../ink/scrollConstants.js";
import { HooksError } from "../../../plugins/functionHooks/hooksErrors.js";
import { createSurfaceClientHost, wwo } from "../../../plugins/functionHooks/surfaceClients.js";
import { _ee } from "../../../utils/cloudTrash.js";
import { releasePresses, handleUiPress, Cer, xer } from "../../../plugins/functionHooks/ui/interactions.js";
import { getImageProcessor } from "../../../tools/FileReadTool/imageProcessor.js";
import { siteVersionOf } from "../../../plugins/functionHooks/ui/renderDispatch.js";
import { JB } from "../../../plugins/functionHooks/ui/renderInstances.js";
import { Lae } from "../../../plugins/functionHooks/sites/promptContextSites.js";
import { UI_ELEMENT_TYPES } from "../../../plugins/functionHooks/ui/elements.js";
import { errorMessage } from "../../../utils/errors.js";
import { toUiMessageEvent } from "../../../plugins/functionHooks/ui/desktopSurface.js";
import { loadHooksModules, EBr } from "../../../plugins/functionHooks/hooksModuleLoader.js";
import { nfcLower } from "../../../utils/stringUtils.js";
import { createPluginFromPath } from "../../../utils/plugins/pluginLoader.js";
import { getHostState } from "../../../utils/hostEnvironment.js";
import { pluginNamesEqual } from "../../../utils/plugins/pluginIdentifier.js";
import { BUILTIN } from "../../../utils/telemetry/pluginTelemetry.js";
import { chainOrder } from "../../../utils/plugins/loadPluginHooks.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import { SkippableStep } from "../../../components/Onboarding.js";
import {
  isBuiltinPluginId,
  getBuiltinPlugin,
  registerBuiltinPlugin,
} from "../../../plugins/builtinPlugins.js";
import { managedPluginsSlot } from "../../../utils/plugins/managedPlugins.js";
import { Meo } from "../../../plugins/functionHooks/vm/moduleLoader.js";
import { gZr } from "../../../plugins/functionHooks/dispatch/chain.js";
import { pd, dCn } from "../../../utils/hooks/functionHookMatchers.js";
import { getInlinePlugins, setInlinePlugins } from "../../../bootstrap/state.js";
import { ipe } from "../../../plugins/functionHooks/hooksWorkerClient.js";
import { marketplaceSource } from "../../../utils/plugins/pluginOptionsStorage.js";
import { createTestHooksEngine } from "./runner.js";
import { setUiLogSink } from "../../../plugins/functionHooks/uiApi.js";
import { resetPluginState } from "../../../plugins/functionHooks/api/state.js";
import { logForDebugging } from "../../../utils/debug.js";
import { teeGeneratorResult } from "../../../plugins/functionHooks/dispatch/streamChain.js";

//@ chunk-1tz177x8.js:22923-23886 placement
var UI_DRIVER_ACTIONS_SCHEMA = DoctorLazy(() => {
  let optional = o().optional(),
    r = u({
      type: o().optional(),
      key: o().optional(),
      text: Ue([o(), u({ source: o(), flags: o() })]).optional(),
      in: optional,
    }),
    optional_2 = T(!0).optional();
  return Ir("act", [
    u({ act: T("drawn"), in: optional }),
    u({ act: T("find"), query: r }),
    u({ act: T("findAll"), query: r }),
    u({ act: T("press"), key: o(), plugin: o().optional(), link: u({ href: o() }).optional() }),
    u({
      act: T("input"),
      key: o(),
      text: o(),
      kind: U(["change", "submit"]).optional(),
      plugin: o().optional(),
    }),
    u({ act: T("select"), key: o(), value: o(), plugin: o().optional() }),
    u({
      act: T("key"),
      event: u({ key: o(), ctrl: optional_2, shift: optional_2, meta: optional_2 }),
      in: optional,
    }),
    u({
      act: T("pointer"),
      event: u({
        type: U(["down", "move", "up", "enter", "leave"]),
        x: E(),
        y: E(),
        button: U(["left", "middle", "right"]).optional(),
        shift: optional_2,
        alt: optional_2,
        ctrl: optional_2,
      }),
      in: optional,
    }),
    u({ act: T("post"), data: oe(), in: optional }),
    u({ act: T("advance"), ms: E().nonnegative() }),
    u({ act: T("resize"), columns: E().int().nonnegative(), rows: E().int().nonnegative(), in: optional }),
    u({ act: T("redraw"), props: pe(o(), oe()).optional() }),
    u({ act: T("unmount") }),
  ]);
});
//@ chunk-1tz177x8.js:23886-24163 placement
var RENDER_ACTION_SCHEMA = DoctorLazy(() =>
  u({
    plugin: o(),
    surface: o().refine(W5e, "is not a surface"),
    component: o().refine(Je, "is not a component"),
    props: pe(o(), oe()),
    requestId: o().optional(),
    viewport: u({
      columns: E().int().nonnegative(),
      rows: E().int().nonnegative(),
      isFullscreen: M().optional(),
    }).optional(),
  }),
);
/**
 * 插件 UI 测试各动作对应的目标元素类型与触达的回调说明。
 */
//@ chunk-1tz177x8.js:24163-24564 placement
var UI_ACTION_TARGETS = {
  input: { element: "Input", reaches: "an Input's onSubmit" },
  select: { element: "Select", reaches: "a Select's onSelect" },
  key: { element: "Client", reaches: "a Client's onKey" },
  pointer: { element: "Client", reaches: "a Client's onPointer" },
  post: { element: "Client", reaches: "a Client's surface.post" },
  advance: { element: "Client", reaches: "a Client's surface.every" },
  resize: { element: "Client", reaches: "a Client's region" },
};
/**
 * 从渲染树中收集 Client 元素（插件、键、模块、属性）。
 */
//@ chunk-1tz177x8.js:24564-24914 placement
function collectClientElements(e) {
  let r = [];
  function n(s) {
    if (!isPlainObject(s)) return;
    let m = isPlainObject(s.props) ? s.props : {},
      f = isPlainObject(s.client) ? s.client : {},
      { key: key, module: c } = m,
      plugin = f.plugin;
    if (
      s.type === "Client" &&
      typeof plugin === "string" &&
      typeof key === "string" &&
      typeof c === "string"
    ) {
      r.push({ plugin: plugin, key: key, module: c, props: m.props });
      return;
    }
    if (Array.isArray(s.children)) for (let y of s.children) n(y);
  }
  return (n(e), r);
}
//@ chunk-1tz177x8.js:24914-24992 placement
var rt = (e) => ({ component: e.component, requestId: e.requestId, surface: e.surface });
/**
 * 取渲染元素的可见文本（按钮、链接、Markdown、代码、输入框等）。
 */
//@ chunk-1tz177x8.js:24992-25419 placement
function elementText(e) {
  if (typeof e === "string") return e;
  if (!isPlainObject(e)) return "";
  let r = isPlainObject(e.props) ? e.props : {},
    n = (y) => (typeof r[y] === "string" ? r[y] : ""),
    s = e.type === "Button",
    m = e.type === "Link",
    f = e.type === "Markdown",
    a = e.type === "Code",
    c = e.type === "Input";
  return (
    (s && Array.isArray(e.children) && e.children.length > 0
      ? ""
      : s
        ? n("label")
        : m
          ? n("label") || n("href")
          : f
            ? n("text")
            : a
              ? n("source")
              : c
                ? n("value")
                : "") + (Array.isArray(e.children) ? e.children : []).map(elementText).join("")
  );
}
//@ chunk-1tz177x8.js:25419-25477 placement
var nt = (e, r) => (typeof r === "string" ? e.includes(r) : r.test(e));
/**
 * 在渲染树中按类型、key 与文本查找元素。
 */
//@ chunk-1tz177x8.js:25477-25929 placement
function findElements(tree, query) {
  let { key: key, text: text } = query,
    m = query.type,
    f = [],
    c = typeof text === "object" ? new RegExp(text.source, text.flags) : text,
    h = (y) => c === void 0 || nt(y, c);
  function k(y) {
    if (!isPlainObject(y) || typeof y.type !== "string") return;
    let b = isPlainObject(y.props) ? { ...y.props } : {},
      z = typeof b.key === "string" ? b.key : void 0,
      I = Array.isArray(y.children) ? y.children : [],
      j = elementText(y);
    if ((m === void 0 || y.type === m) && (key === void 0 || z === key) && h(j))
      f.push({ type: y.type, key: z, props: b, text: j, children: I });
    for (let W of I) k(W);
  }
  return (k(tree), f);
}
//@ chunk-1tz177x8.js:25929-25940 placement
var Lo = 1e4;
/**
 * 测试用的虚拟帧时钟：every 登记周期任务，advance(ms) 按到期顺序触发，单次推进超过 Lo 次触发时报错。
 */
//@ chunk-1tz177x8.js:25940-26473 placement
function createFakeFrameClock() {
  let timers = new Set(),
    now = 0;
  function every(intervalMs, tick) {
    let max = Math.max(Xh, intervalMs),
      timer = { ms: max, dueAt: now + max, tick: tick };
    return (
      timers.add(timer),
      () => {
        timers.delete(timer);
      }
    );
  }
  function advance(ms) {
    let target = now + ms,
      fired = 0;
    for (;;) {
      let reduced = [...timers].reduce((k, y) => Math.min(k, y.dueAt), Number.POSITIVE_INFINITY);
      if (reduced > target) break;
      now = reduced;
      for (let k of [...timers])
        if (k.dueAt <= now && timers.has(k)) {
          if (((fired += 1), fired > Lo))
            throw new HooksError(
              `advance(${ms}): ${Lo} timer ticks fired and more were due; advance in smaller steps, or check for an \`every\` the module re-arms on each tick`,
            );
          ((k.dueAt = now + k.ms), k.tick());
        }
    }
    now = target;
  }
  return { clock: { every: every }, advance: advance };
}
//@ chunk-1tz177x8.js:26606-26760 placement
var mountRequest = (e, r) => ({
  surface: e.surface,
  component: e.component,
  requestId: e.requestId ?? `mount-${r}`,
  ...(e.viewport !== void 0 && { viewport: e.viewport }),
  props: e.props,
});
//@ chunk-1tz177x8.js:26760-26772 placement
var Bo = 2000;
//@ chunk-1tz177x8.js:26818-26987 placement
var createDriveState = ({ plugin: plugin, input: input, port: port }) => ({
  plugin: plugin,
  input: input,
  drawn: { tree: void 0 },
  registry: createSurfaceClientHost({ port: port }),
  clients: [],
  frame: createFakeFrameClock(),
  version: "",
  unsubscribe: () => {
    return;
  },
  isStale: !1,
});
//@ chunk-1tz177x8.js:26987-27097 placement
function releaseDrawings(e) {
  let r = rt(e);
  for (let n of _ee.holdersOf(r)) {
    let { released: released } = _ee.holdDrawing(n, r, []);
    releasePresses(n, released, r);
  }
}
/**
 * 插件测试中驱动 ui.render 的结果：提供 act/drawn/find/findAll/press 等操作，模拟用户与插件界面交互。
 */
//@ chunk-1tz177x8.js:27097-32912 placement
function driveRenderedUi(e) {
  let r = getImageProcessor(),
    n = new Map(),
    s = 0;
  function m(g) {
    let l = n.get(g);
    if (!l) throw new HooksError("this drawing was unmounted");
    return l;
  }
  let f = (g) => siteVersionOf(JB().getState(), g),
    a = (g, l) =>
      new Promise((x) => {
        let R = () => g.getSnapshot().status !== "loading";
        if (R()) {
          x(!0);
          return;
        }
        let subscribe = g.subscribe(() => {
            if (R()) (clearTimeout(N), subscribe(), x(!0));
          }),
          N = setTimeout(
            (v, G) => {
              (v(), G(!1));
            },
            l,
            subscribe,
            x,
          );
      });
  function c(g) {
    let clients = g.clients;
    g.clients = [];
    for (let x of clients) x.instance.release();
  }
  async function h(g) {
    let { instance: instance } = g,
      x = await a(instance, Bo),
      snapshot = instance.getSnapshot();
    if (!x)
      throw new HooksError(
        `${g.plugin}'s Client ${g.module} (keyed ${JSON.stringify(g.key)}) drew nothing in ${Bo} ms (a dialog Client past its row budget draws nothing; the report says so)`,
      );
    if (snapshot.status === "failed") throw new HooksError(snapshot.text);
  }
  let k = (g, l) => g.plugin === l.plugin && g.key === l.key;
  function y(g, l) {
    let { input: input, registry: registry, frame: frame } = g,
      acquire = registry.acquire({
        ...l,
        component: input.component,
        requestId: input.requestId,
        surface: input.surface,
        clock: frame.clock,
      });
    return (
      acquire.resize(input.viewport?.columns ?? 0, input.viewport?.rows ?? 0),
      { ...l, instance: acquire }
    );
  }
  async function b(g, l) {
    let x = collectClientElements(l),
      R = (v) => x.some((G) => k(G, v) && G.module === v.module);
    for (let client of g.clients) if (!R(client)) client.instance.release();
    let filtered = g.clients.filter(R);
    for (let v of x) filtered.find((G) => k(G, v))?.instance.setProps(v.props);
    let mapped = x.filter((v) => !filtered.some((G) => k(G, v))).map((v) => y(g, v));
    g.clients = [...filtered, ...mapped];
    for (let v of mapped) await h(v);
  }
  async function z(g, l) {
    ((g.input = l), (g.version = f(l)), (g.isStale = !1));
    let x = e.told.length,
      R = [`ui.render (${l.component}) refused: `, `a tree ${l.component} refuses: `],
      S = () => e.told.slice(x).findLast((v) => R.some((G) => v.includes(G))),
      N = await e.render(l).catch((v) => {
        if (S() === void 0) throw v;
        return Lae;
      });
    if (N === Lae) {
      ((g.drawn = {
        refused:
          `${g.plugin} drew nothing on the ${l.surface} surface: ` +
          (S() ??
            `the tree its hooks returned for ${l.component} did not validate by that surface's rules (the report says why)`),
      }),
        c(g));
      return;
    }
    ((g.drawn = { tree: N }), await b(g, N));
  }
  function I(g) {
    if ("refused" in g.drawn) throw new HooksError(g.drawn.refused);
    return g.drawn.tree;
  }
  function j(g, l) {
    let { surface: surface } = g.input,
      { element: element, reaches: reaches } = UI_ACTION_TARGETS[l];
    if (!UI_ELEMENT_TYPES[surface].includes(element))
      throw new HooksError(
        `${l}: the ${surface} surface draws no ${element}; ${l} reaches ${reaches}, so it is not an act on this surface`,
      );
  }
  function L(g, l, x) {
    I(g);
    let filtered = g.clients.filter((client) => l === void 0 || client.key === l),
      [S, ...N] = filtered;
    if (!S) {
      let v = l === void 0 ? "" : ` keyed ${JSON.stringify(l)}`;
      throw new HooksError(`${x}: the drawing holds no Client${v}`);
    }
    if (N.length > 0)
      throw new HooksError(
        `${x}: the drawing holds ${filtered.length} Clients (` +
          filtered.map((v) => v.key).join(", ") +
          "); name one with `in`",
      );
    return S;
  }
  function W(g) {
    let snapshot = g.instance.getSnapshot();
    if (snapshot.status === "failed") throw new HooksError(snapshot.text);
    if (snapshot.status !== "drawn")
      throw new HooksError(`${g.plugin}: Client ${g.module} has drawn nothing`);
    return snapshot.tree;
  }
  let V = (g, l, x) => (l === void 0 ? I(g) : W(L(g, l, x)));
  function X(g, l) {
    I(g);
    let { component: component, requestId: requestId, surface: surface } = g.input,
      N = new Set([requestId, ...g.clients.map((client) => wwo(requestId, client.key))]),
      filtered = _ee
        .hostedButtonsOf(l.plugin, l.key)
        .filter(
          ({ button: button }) =>
            button.tag === l.tag &&
            button.surface === surface &&
            button.component === component &&
            N.has(button.requestId),
        ),
      [G, ...xr] = filtered,
      ue = `${l.plugin} keyed ${JSON.stringify(l.key)}`;
    if (!G)
      throw new HooksError(
        `${l.act}: no ${l.tag} of ${ue} is drawn in this ${component} on the ${surface} surface`,
      );
    if (xr.length > 0)
      throw new HooksError(
        `${l.act}: ${filtered.length} ${l.tag}s of ${ue} are drawn in this drawing; key each once`,
      );
    return G;
  }
  function mo(g, l) {
    (n.delete(g), l.unsubscribe(), c(l), releaseDrawings(l.input), l.registry.dispose());
  }
  async function w(g, l) {
    (mo(g, l), await Jn(0));
  }
  async function P(g) {
    if (!g.isStale) return;
    try {
      await z(g, g.input);
    } catch (error) {
      ((g.drawn = { refused: errorMessage(error) }), c(g));
    }
  }
  function C(g) {
    if (
      [...n.values()].some(
        ({ input: input }) =>
          input.surface === g.surface && input.component === g.component && input.requestId === g.requestId,
      )
    )
      throw new HooksError(
        `$.ui.mount: ${g.component} ${g.requestId} is mounted on the ${g.surface} surface already; unmount it first, or name another requestId for a second instance`,
      );
  }
  async function F(g) {
    s += 1;
    let l = s,
      x = mountRequest(g, l);
    C(x);
    let R = createDriveState({ plugin: g.plugin, input: x, port: r });
    (n.set(l, R),
      (R.unsubscribe = JB().subscribe(() => {
        if (f(R.input) !== R.version) R.isStale = !0;
      })));
    try {
      (await z(R, x), I(R));
    } catch (error) {
      if (n.has(l)) await w(l, R);
      throw error instanceof HooksError ? new HooksError(`$.ui.mount: ${error.message}`) : error;
    }
    if (!n.has(l)) throw new HooksError("$.ui.mount: the test ended while the drawing was being raised");
    return l;
  }
  function q(g, l, x) {
    let { component: component, requestId: requestId, surface: surface } = g.input;
    r.post(
      l.instance.id,
      toUiMessageEvent({ ...l, component: component, requestId: requestId }, surface, x),
      (v) => {
        if (v.props !== void 0) l.instance.setProps(v.props);
      },
    );
  }
  async function no(g, l) {
    let x = m(g);
    if (!(l.act === "redraw" || l.act === "unmount")) await P(x);
    let { component: component, surface: surface } = x.input;
    switch (l.act) {
      case "drawn":
        return V(x, l.in, "drawn");
      case "find":
        return findElements(V(x, l.query.in, "find"), l.query)[0];
      case "findAll":
        return findElements(V(x, l.query.in, "findAll"), l.query);
      case "press": {
        let v = l.plugin ?? x.plugin,
          G = l.link === void 0 ? "Button" : "Markdown";
        return handleUiPress({
          plugin: v,
          handle: X(x, { plugin: v, key: l.key, tag: G, act: "press" }).hosted,
          surface: surface,
          link: l.link,
        });
      }
      case "input": {
        j(x, "input");
        let v = l.plugin ?? x.plugin;
        return Cer({
          plugin: v,
          handle: X(x, { plugin: v, key: l.key, tag: "Input", act: "input" }).hosted,
          element: l.key,
          component: component,
          surface: surface,
          kind: l.kind ?? "submit",
          value: l.text,
        });
      }
      case "select": {
        j(x, "select");
        let v = l.plugin ?? x.plugin;
        return xer({
          plugin: v,
          handle: X(x, { plugin: v, key: l.key, tag: "Select", act: "select" }).hosted,
          element: l.key,
          component: component,
          surface: surface,
          value: l.value,
        });
      }
      case "key":
        (j(x, "key"), L(x, l.in, "key").instance.key(l.event));
        return;
      case "pointer":
        (j(x, "pointer"), L(x, l.in, "pointer").instance.pointer(l.event));
        return;
      case "post":
        (j(x, "post"), q(x, L(x, l.in, "post"), l.data));
        return;
      case "advance":
        (j(x, "advance"), I(x), x.frame.advance(l.ms));
        return;
      case "resize":
        (j(x, "resize"), L(x, l.in, "resize").instance.resize(l.columns, l.rows));
        return;
      case "redraw":
        (await z(x, { ...x.input, props: l.props ?? x.input.props }), I(x));
        return;
      case "unmount":
        await w(g, x);
        return;
    }
  }
  return {
    mount: F,
    act: no,
    async refresh() {
      for (let g of n.values()) await P(g);
    },
    releaseAll() {
      for (let [g, l] of [...n]) mo(g, l);
    },
  };
}
//@ chunk-1tz177x8.js:32912-32985 placement
async function ct(e, r) {
  (await loadHooksModules(e.filter((n) => n.path === r)), await loadHooksModules(e));
}
//@ chunk-1tz177x8.js:33091-33133 placement
var dt = { prepend: "policy", append: "policy" };
//@ chunk-1tz177x8.js:33133-33203 placement
var gt = (e, r) => ({ prepend: e, append: r, from: dt, shadowed: [], outermost: [] });
//@ chunk-1tz177x8.js:33203-33394 placement
function managementFromTiers(e, r) {
  let n = (s) => e.filter((m, f) => r[f]?.tier === s).map((m) => m.source);
  return {
    managedIds: new Set([...n("prepend"), ...n("append")]),
    order: gt(n("prepend").map(nfcLower), n("append").map(nfcLower)),
  };
}
//@ chunk-1tz177x8.js:33394-33404 placement
var yt = !0;
//@ chunk-1tz177x8.js:33502-34264 placement
async function loadTestPlugins(e, r) {
  let n = basename(e),
    { plugin: plugin, errors: errors } = await createPluginFromPath(e, `${n}@claude-plugin-test`, yt, n),
    f = r === "builtin",
    any = [...getHostState().builtinPlugins.keys()].some((c) => pluginNamesEqual(c, plugin.name));
  if (f && any)
    throw new HooksError(
      `${plugin.name} cannot load in the builtin tier: this Claude Code bundles a plugin of that name, and would load its copy`,
    );
  if (plugin.modulePath === void 0) {
    let joined = errors.map((b) => b.type).join(", "),
      h = joined === "" ? "" : ` (${joined})`;
    if (
      !(await readdir(e).then(
        () => !0,
        () => !1,
      ))
    )
      throw new HooksError(`${e}: no such plugin folder`);
    let y = await readFile(join_5(e, "hooks", "hooks.json")).then(
      () => !0,
      () => !1,
    );
    throw new HooksError(
      y
        ? `${e}: no hooks module to load; hooks/hooks.json names none in "modules"${h}`
        : `${e}: no hooks module to load; there is no hooks/hooks.json naming one in "modules"`,
    );
  }
  return f ? { ...plugin, source: `${plugin.name}@${BUILTIN}` } : plugin;
}
//@ chunk-1tz177x8.js:34264-34534 placement
async function loadTestPluginSet({ plugins: plugins }) {
  let results = await Promise.all(plugins.map((m) => loadTestPlugins(m.dir, m.tier))),
    n = new Set();
  for (let { name: m } of results) {
    if (n.has(m)) throw new HooksError(`test(name, { plugins }): ${m} is loaded twice`);
    n.add(m);
  }
  let s = managementFromTiers(results, plugins);
  return { plugins: chainOrder(results, s.managedIds, s.order), management: s };
}
//@ chunk-1tz177x8.js:34534-34760 placement
function pressTestButton({ plugin: plugin, key: key, requestId: requestId, surface: surface, link: link }) {
  let f = findHostedElement({
    act: "press",
    tag: link === void 0 ? "Button" : "Markdown",
    plugin: plugin,
    key: key,
    requestId: requestId,
    surface: surface,
  });
  return handleUiPress({ plugin: plugin, handle: f.hosted, surface: f.button.surface, link: link });
}
//@ chunk-1tz177x8.js:34760-35058 placement
function assertPluginsLoaded(e) {
  let r = getPluginRegistry(),
    n = new Set(r.loadedModules.map((loadedModule) => loadedModule.name)),
    filtered = e.filter((a) => !n.has(a));
  if (filtered.length === 0) return;
  let mapped = r.pendingUiLog.filter((a) => filtered.includes(a.plugin)).map((a) => `${a.plugin}: ${a.text}`),
    f = mapped.length === 0;
  throw new HooksError(
    f
      ? `${filtered.join(", ")}: hooks module did not load`
      : mapped.join(`
`),
  );
}
//@ chunk-1tz177x8.js:35058-35340 placement
var createTestHookLogger = (e, r, n) => ({
  log(s, m) {
    if (m && !/^hooks? (chain )?failed: /.test(s)) e(s);
  },
  hookFailed(s) {
    if (s.environmentId !== void 0 && r(s.environmentId)) return;
    let f = s.skip?.kind === "unapplied" ? "hook" : "hook was skipped",
      a = SkippableStep(s);
    if ((e(`${s.plugin}'s ${s.event} ${f}: ${s.reason}`), a !== void 0)) n(a);
  },
});
//@ chunk-1tz177x8.js:35340-35567 placement
function seatBuiltinTestPlugins(e) {
  let flattened = e.flatMap((n) =>
    isBuiltinPluginId(n.source) && getBuiltinPlugin(n.name) === void 0 ? [n.name] : [],
  );
  for (let n of flattened)
    registerBuiltinPlugin({ name: n, description: `${n}, seated in the builtin tier by its test` });
  return () => {
    for (let n of flattened) getHostState().builtinPlugins.delete(n);
  };
}
//@ chunk-1tz177x8.js:35567-35813 placement
function selectTestOption({ plugin: plugin, key: key, value: n, requestId: requestId, surface: surface }) {
  let f = findHostedElement({
    act: "select",
    tag: "Select",
    plugin: plugin,
    key: key,
    requestId: requestId,
    surface: surface,
  });
  return xer({
    plugin: plugin,
    handle: f.hosted,
    element: key,
    component: f.button.component,
    surface: f.button.surface,
    value: n,
  });
}
//@ chunk-1tz177x8.js:35813-35836 placement
var Ot = (e) => managedPluginsSlot.set(e);
//@ chunk-1tz177x8.js:35836-35859 placement
var Ct = (e) => Meo.set(e);
//@ chunk-1tz177x8.js:35859-35882 placement
var At = (e) => EBr.set(e);
//@ chunk-1tz177x8.js:35882-35905 placement
var Cs = (e) => gZr.set(e);
//@ chunk-1tz177x8.js:35905-35914 placement
var vt = 3;
//@ chunk-1tz177x8.js:35914-37670 placement
function createPluginTestEngine({ root: root, bare: bare, spec: spec, isEnded: isEnded }) {
  let abortController = new AbortController(),
    f = getPluginRegistry(),
    a = pd(),
    uiLogSink = f.uiLogSink,
    h = getInlinePlugins(),
    k = ipe.get(),
    y = [],
    b = (C) => {
      y.push(C);
    },
    z,
    I = (C) => {
      z ??= C;
    },
    j,
    L,
    W = [],
    V;
  dCn(createTestHookLogger(b, isEnded, I));
  let X = driveRenderedUi({
    render: async (C) => (await w(), engineCallFor("ui.render", abortController.signal)(C)),
    told: y,
  });
  async function mo(C, F) {
    let q = await mkdtemp(join_4(tmpdir(), "claude-plugin-test-"));
    j = q;
    let results = await Promise.all(
        spec.plugins.map(async (plugin) => ({ dir: await Ye(q, plugin), tier: plugin.tier })),
      ),
      g = await hooksModuleSource(q, C),
      l = await loadTestPluginSet({
        plugins: [{ dir: root, tier: spec.tier }, ...results, { dir: g.dir, tier: "builtin" }],
      });
    ((V = seatBuiltinTestPlugins(l.plugins)), Ot(l.management));
    let found = l.plugins.find((plugin) => plugin.path === root);
    if (spec.options && found) At({ pluginId: marketplaceSource(found), options: spec.options });
    (Ct(new Map([[g.modulePath, createTestHooksEngine(bare, F)]])), (f.pendingUiLog = []));
    let mapped = l.plugins.map((plugin) => plugin.path);
    (setInlinePlugins(mapped),
      ipe.set(mapped),
      await ct(l.plugins, g.dir),
      (W = f.loadedModules.map((loadedModule) => loadedModule.environmentId)),
      assertPluginsLoaded(l.plugins.map((plugin) => plugin.name)),
      setUiLogSink((S) => b(`${S.plugin}: ${S.text}`)));
  }
  async function w() {
    if (!L) throw Error("the engine is used before its load");
    await L;
  }
  async function P() {
    (abortController.abort(), X.releaseAll());
    try {
      if (L)
        (await L.catch(() => {
          return;
        }),
          await loadHooksModules([]));
    } finally {
      if (
        (V?.(),
        Ct(void 0),
        resetPluginState(),
        Ot(void 0),
        At(void 0),
        dCn(a),
        (f.uiLogSink = uiLogSink),
        setInlinePlugins(h),
        ipe.set(k),
        j !== void 0)
      )
        await rm(j, { recursive: !0, force: !0, maxRetries: vt }).catch((F) =>
          logForDebugging(`claude plugin test: ${j} was not removed: ` + errorMessage(F), { level: "warn" }),
        );
    }
    return {
      told:
        y.length === 0
          ? ""
          : `the engine reported:
${y.map((F) => `  ${F}`).join(`
`)}`,
      ...(z !== void 0 && { failed: z }),
    };
  }
  return {
    load: (C, F) => (L ??= mo(C, F)),
    ready: async () => {
      await L?.catch(() => {
        return;
      });
    },
    call: async (C, F) => (await w(), engineCallFor(C, abortController.signal)(F)),
    stream: (C, F) =>
      teeGeneratorResult(
        (async function* () {
          return (await w(), yield* engineCallFor(C, abortController.signal)(F));
        })(),
      ),
    press: async (C) => (await w(), pressTestButton(C)),
    input: async (C) => (await w(), submitTestInput(C)),
    select: async (C) => (await w(), selectTestOption(C)),
    mounts: X,
    environmentIds: () => W,
    close: P,
  };
}
//@ chunk-1tz177x8.js:37670-37817 placement
var PRESS_ACTION_SCHEMA = DoctorLazy(() =>
  u({
    plugin: o(),
    key: o(),
    requestId: o().optional(),
    surface: o().refine(W5e, "is not a surface").optional(),
    link: u({ href: o() }).optional(),
  }),
);

export {
  loadTestPlugins,
  Cs,
  createPluginTestEngine,
  PRESS_ACTION_SCHEMA,
  RENDER_ACTION_SCHEMA,
  UI_DRIVER_ACTIONS_SCHEMA,
};
