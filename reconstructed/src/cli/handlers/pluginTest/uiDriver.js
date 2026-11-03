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
import { setTimeout as Jn } from "timers/promises";
import { basename, join } from "path";
import { readdir, readFile, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { DoctorLazy } from "../util.js";
import {
  string,
  u,
  union,
  literal,
  discriminatedUnion,
  _enum,
  E,
  unknown,
  record,
  M,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { isUiElementTypeName } from "../../../plugins/functionHooks/ui/renderSites.js";
import {
  isRenderSiteName,
  findHostedElement,
  engineCallFor,
  scaffoldPluginTestRoot,
  hooksModuleSource,
  submitTestInput,
} from "./engineShim.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { SCROLL_JUMP_LINES } from "../../../ink/scrollConstants.js";
import { HooksError } from "../../../plugins/functionHooks/hooksErrors.js";
import { createSurfaceClientHost, clientSurfaceKey } from "../../../plugins/functionHooks/surfaceClients.js";
import { moveToCloudTrash } from "../../../utils/cloudTrash.js";
import {
  releasePresses,
  handleUiPress,
  dispatchInputQueued,
  dispatchSelectQueued,
} from "../../../plugins/functionHooks/ui/interactions.js";
import { getImageProcessor } from "../../../tools/FileReadTool/imageProcessor.js";
import { siteVersionOf } from "../../../plugins/functionHooks/ui/renderDispatch.js";
import { renderVersions } from "../../../plugins/functionHooks/ui/renderInstances.js";
import { ENGINE_ELEMENT } from "../../../plugins/functionHooks/sites/promptContextSites.js";
import { UI_ELEMENT_TYPES } from "../../../plugins/functionHooks/ui/elements.js";
import { errorMessage } from "../../../utils/errors.js";
import { toUiMessageEvent } from "../../../plugins/functionHooks/ui/desktopSurface.js";
import { loadHooksModules, loadedPluginOptions } from "../../../plugins/functionHooks/hooksModuleLoader.js";
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
import { pluginEnvSlot } from "../../../plugins/functionHooks/vm/moduleLoader.js";
import { currentDispatchSlot } from "../../../plugins/functionHooks/dispatch/chain.js";
import { matcherLog, setMatcherLog } from "../../../utils/hooks/functionHookMatchers.js";
import { getInlinePlugins, setInlinePlugins } from "../../../bootstrap/state.js";
import { pluginDirSlot } from "../../../plugins/functionHooks/hooksWorkerClient.js";
import { marketplaceSource } from "../../../utils/plugins/pluginOptionsStorage.js";
import { createTestHooksEngine } from "./runner.js";
import { setUiLogSink } from "../../../plugins/functionHooks/uiApi.js";
import { resetPluginState } from "../../../plugins/functionHooks/api/state.js";
import { logForDebugging } from "../../../utils/debug.js";
import { teeGeneratorResult } from "../../../plugins/functionHooks/dispatch/streamChain.js";

//@ chunk-1tz177x8.js:22923-23886 placement
var UI_DRIVER_ACTIONS_SCHEMA = DoctorLazy(() => {
  let e = string().optional();
  let query = u({
    type: string().optional(),
    key: string().optional(),
    text: union([
      string(),
      u({
        source: string(),
        flags: string(),
      }),
    ]).optional(),
    in: e,
  });
  let n = literal(true).optional();
  return discriminatedUnion("act", [
    u({
      act: literal("drawn"),
      in: e,
    }),
    u({
      act: literal("find"),
      query,
    }),
    u({
      act: literal("findAll"),
      query,
    }),
    u({
      act: literal("press"),
      key: string(),
      plugin: string().optional(),
      link: u({
        href: string(),
      }).optional(),
    }),
    u({
      act: literal("input"),
      key: string(),
      text: string(),
      kind: _enum(["change", "submit"]).optional(),
      plugin: string().optional(),
    }),
    u({
      act: literal("select"),
      key: string(),
      value: string(),
      plugin: string().optional(),
    }),
    u({
      act: literal("key"),
      event: u({
        key: string(),
        ctrl: n,
        shift: n,
        meta: n,
      }),
      in: e,
    }),
    u({
      act: literal("pointer"),
      event: u({
        type: _enum(["down", "move", "up", "enter", "leave"]),
        x: E(),
        y: E(),
        button: _enum(["left", "middle", "right"]).optional(),
        shift: n,
        alt: n,
        ctrl: n,
      }),
      in: e,
    }),
    u({
      act: literal("post"),
      data: unknown(),
      in: e,
    }),
    u({
      act: literal("advance"),
      ms: E().nonnegative(),
    }),
    u({
      act: literal("resize"),
      columns: E().int().nonnegative(),
      rows: E().int().nonnegative(),
      in: e,
    }),
    u({
      act: literal("redraw"),
      props: record(string(), unknown()).optional(),
    }),
    u({
      act: literal("unmount"),
    }),
  ]);
});
//@ chunk-1tz177x8.js:23886-24163 placement
var RENDER_ACTION_SCHEMA = DoctorLazy(() =>
  u({
    plugin: string(),
    surface: string().refine(isUiElementTypeName, "is not a surface"),
    component: string().refine(isRenderSiteName, "is not a component"),
    props: record(string(), unknown()),
    requestId: string().optional(),
    viewport: u({
      columns: E().int().nonnegative(),
      rows: E().int().nonnegative(),
      isFullscreen: M().optional(),
    }).optional(),
  }),
);
//@ chunk-1tz177x8.js:24163-24564 placement
/**
 * 插件 UI 测试各动作对应的目标元素类型与触达的回调说明。
 */
var UI_ACTION_TARGETS = {
  input: {
    element: "Input",
    reaches: "an Input's onSubmit",
  },
  select: {
    element: "Select",
    reaches: "a Select's onSelect",
  },
  key: {
    element: "Client",
    reaches: "a Client's onKey",
  },
  pointer: {
    element: "Client",
    reaches: "a Client's onPointer",
  },
  post: {
    element: "Client",
    reaches: "a Client's surface.post",
  },
  advance: {
    element: "Client",
    reaches: "a Client's surface.every",
  },
  resize: {
    element: "Client",
    reaches: "a Client's region",
  },
};
//@ chunk-1tz177x8.js:24564-24914 placement
/**
 * 从渲染树中收集 Client 元素（插件、键、模块、属性）。
 */
function collectClientElements(e) {
  let r = [];
  function n(s) {
    if (!isPlainObject(s)) return;
    let props = isPlainObject(s.props) ? s.props : {};
    let client = isPlainObject(s.client) ? s.client : {};
    let { key, module: c } = props;
    let plugin = client.plugin;
    if (
      s.type === "Client" &&
      typeof plugin === "string" &&
      typeof key === "string" &&
      typeof c === "string"
    ) {
      r.push({
        plugin,
        key,
        module: c,
        props: props.props,
      });
      return;
    }
    if (Array.isArray(s.children)) for (let child of s.children) n(child);
  }
  n(e);
  return r;
}
//@ chunk-1tz177x8.js:24914-24992 placement
var renderHandleInfo = (e) => ({
  component: e.component,
  requestId: e.requestId,
  surface: e.surface,
});
//@ chunk-1tz177x8.js:24992-25419 placement
/**
 * 取渲染元素的可见文本（按钮、链接、Markdown、代码、输入框等）。
 */
function elementText(e) {
  if (typeof e === "string") return e;
  if (!isPlainObject(e)) return "";
  let props = isPlainObject(e.props) ? e.props : {};
  let n = (y) => (typeof props[y] === "string" ? props[y] : "");
  let s = e.type === "Button";
  let m = e.type === "Link";
  let f = e.type === "Markdown";
  let a = e.type === "Code";
  let c = e.type === "Input";
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
var matchesExpectedText = (e, r) => (typeof r === "string" ? e.includes(r) : r.test(e));
//@ chunk-1tz177x8.js:25477-25929 placement
/**
 * 在渲染树中按类型、key 与文本查找元素。
 */
function findElements(tree, query) {
  let { key, text } = query;
  let m = query.type;
  let f = [];
  let c = typeof text === "object" ? new RegExp(text.source, text.flags) : text;
  let h = (y) => c === undefined || matchesExpectedText(y, c);
  function k(y) {
    if (!isPlainObject(y) || typeof y.type !== "string") return;
    let b = isPlainObject(y.props)
      ? {
          ...y.props,
        }
      : {};
    let key_2 = typeof b.key === "string" ? b.key : undefined;
    let children = Array.isArray(y.children) ? y.children : [];
    let j = elementText(y);
    if ((m === undefined || y.type === m) && (key === undefined || key_2 === key) && h(j))
      f.push({
        type: y.type,
        key: key_2,
        props: b,
        text: j,
        children,
      });
    for (let child of children) k(child);
  }
  k(tree);
  return f;
}
//@ chunk-1tz177x8.js:25929-25940 placement
var MAX_TIMER_TICKS_PER_ADVANCE = 1e4;
//@ chunk-1tz177x8.js:25940-26473 placement
/**
 * 测试用的虚拟帧时钟：every 登记周期任务，advance(ms) 按到期顺序触发，单次推进超过 Lo 次触发时报错。
 */
function createFakeFrameClock() {
  let timers = new Set();
  let now = 0;
  function every(intervalMs, tick) {
    let max = Math.max(SCROLL_JUMP_LINES, intervalMs);
    let timer = {
      ms: max,
      dueAt: now + max,
      tick,
    };
    timers.add(timer);
    return () => {
      timers.delete(timer);
    };
  }
  function advance(ms) {
    let target = now + ms;
    let fired = 0;
    for (;;) {
      let reduced = [...timers].reduce((acc, timer) => Math.min(acc, timer.dueAt), Number.POSITIVE_INFINITY);
      if (reduced > target) break;
      now = reduced;
      for (let timer of [...timers])
        if (timer.dueAt <= now && timers.has(timer)) {
          fired += 1;
          if (fired > MAX_TIMER_TICKS_PER_ADVANCE)
            throw new HooksError(
              `advance(${ms}): ${MAX_TIMER_TICKS_PER_ADVANCE} timer ticks fired and more were due; advance in smaller steps, or check for an \`every\` the module re-arms on each tick`,
            );
          timer.dueAt = now + timer.ms;
          timer.tick();
        }
    }
    now = target;
  }
  return {
    clock: {
      every,
    },
    advance,
  };
}
//@ chunk-1tz177x8.js:26606-26760 placement
var mountRequest = (e, r) => ({
  surface: e.surface,
  component: e.component,
  requestId: e.requestId ?? `mount-${r}`,
  ...(e.viewport !== undefined && {
    viewport: e.viewport,
  }),
  props: e.props,
});
//@ chunk-1tz177x8.js:26760-26772 placement
var RENDER_SETTLE_MS = 2000;
//@ chunk-1tz177x8.js:26818-26987 placement
var createDriveState = ({ plugin, input, port }) => ({
  plugin,
  input,
  drawn: {
    tree: undefined,
  },
  registry: createSurfaceClientHost({
    port,
  }),
  clients: [],
  frame: createFakeFrameClock(),
  version: "",
  unsubscribe: () => {
    return;
  },
  isStale: false,
});
//@ chunk-1tz177x8.js:26987-27097 placement
function releaseDrawings(e) {
  let r = renderHandleInfo(e);
  for (let n of moveToCloudTrash.holdersOf(r)) {
    let { released } = moveToCloudTrash.holdDrawing(n, r, []);
    releasePresses(n, released, r);
  }
}
//@ chunk-1tz177x8.js:27097-32912 placement
/**
 * 插件测试中驱动 ui.render 的结果：提供 act/drawn/find/findAll/press 等操作，模拟用户与插件界面交互。
 */
function driveRenderedUi(e) {
  let imageProcessor = getImageProcessor();
  let n = new Map();
  let s = 0;
  function m(g) {
    let l = n.get(g);
    if (!l) throw new HooksError("this drawing was unmounted");
    return l;
  }
  let f = (g) => siteVersionOf(renderVersions().getState(), g);
  let a = (instance, l) =>
    new Promise((resolve) => {
      let R = () => instance.getSnapshot().status !== "loading";
      if (R()) {
        resolve(true);
        return;
      }
      let S = instance.subscribe(() => {
        if (R()) {
          clearTimeout(timer);
          S();
          resolve(true);
        }
      });
      let timer = setTimeout(
        (v, G) => {
          v();
          G(false);
        },
        l,
        S,
        resolve,
      );
    });
  function c(g) {
    let clients = g.clients;
    g.clients = [];
    for (let client of clients) client.instance.release();
  }
  async function h(g) {
    let { instance } = g;
    let x = await a(instance, RENDER_SETTLE_MS);
    let snapshot = instance.getSnapshot();
    if (!x)
      throw new HooksError(
        `${g.plugin}'s Client ${g.module} (keyed ${JSON.stringify(g.key)}) drew nothing in ${RENDER_SETTLE_MS} ms (a dialog Client past its row budget draws nothing; the report says so)`,
      );
    if (snapshot.status === "failed") throw new HooksError(snapshot.text);
  }
  let k = (g, clientElement) => g.plugin === clientElement.plugin && g.key === clientElement.key;
  function y(g, clientElement) {
    let { input, registry, frame } = g;
    let N = registry.acquire({
      ...clientElement,
      component: input.component,
      requestId: input.requestId,
      surface: input.surface,
      clock: frame.clock,
    });
    N.resize(input.viewport?.columns ?? 0, input.viewport?.rows ?? 0);
    return {
      ...clientElement,
      instance: N,
    };
  }
  async function b(g, l) {
    let clientElements = collectClientElements(l);
    let R = (client) =>
      clientElements.some(
        (clientElement) => k(clientElement, client) && clientElement.module === client.module,
      );
    for (let client of g.clients) if (!R(client)) client.instance.release();
    let filtered = g.clients.filter(R);
    for (let clientElement of clientElements)
      filtered.find((G) => k(G, clientElement))?.instance.setProps(clientElement.props);
    let mapped = clientElements
      .filter((clientElement) => !filtered.some((G) => k(G, clientElement)))
      .map((clientElement) => y(g, clientElement));
    g.clients = [...filtered, ...mapped];
    for (let v of mapped) await h(v);
  }
  async function z(g, l) {
    g.input = l;
    g.version = f(l);
    g.isStale = false;
    let x = e.told.length;
    let R = [`ui.render (${l.component}) refused: `, `a tree ${l.component} refuses: `];
    let S = () => e.told.slice(x).findLast((v) => R.some((G) => v.includes(G)));
    let N = await e.render(l).catch((error) => {
      if (S() === undefined) throw error;
      return ENGINE_ELEMENT;
    });
    if (N === ENGINE_ELEMENT) {
      g.drawn = {
        refused:
          `${g.plugin} drew nothing on the ${l.surface} surface: ` +
          (S() ??
            `the tree its hooks returned for ${l.component} did not validate by that surface's rules (the report says why)`),
      };
      c(g);
      return;
    }
    g.drawn = {
      tree: N,
    };
    await b(g, N);
  }
  function I(g) {
    if ("refused" in g.drawn) throw new HooksError(g.drawn.refused);
    return g.drawn.tree;
  }
  function j(g, l) {
    let { surface } = g.input;
    let { element, reaches } = UI_ACTION_TARGETS[l];
    if (!UI_ELEMENT_TYPES[surface].includes(element))
      throw new HooksError(
        `${l}: the ${surface} surface draws no ${element}; ${l} reaches ${reaches}, so it is not an act on this surface`,
      );
  }
  function L(g, l, x) {
    I(g);
    let filtered = g.clients.filter((client) => l === undefined || client.key === l);
    let [S, ...N] = filtered;
    if (!S) {
      let v = l === undefined ? "" : ` keyed ${JSON.stringify(l)}`;
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
  let V = (g, l, x) => (l === undefined ? I(g) : W(L(g, l, x)));
  function X(g, l) {
    I(g);
    let { component, requestId, surface } = g.input;
    let N = new Set([requestId, ...g.clients.map((client) => clientSurfaceKey(requestId, client.key))]);
    let filtered = moveToCloudTrash
      .hostedButtonsOf(l.plugin, l.key)
      .filter(
        ({ button }) =>
          button.tag === l.tag &&
          button.surface === surface &&
          button.component === component &&
          N.has(button.requestId),
      );
    let [G, ...xr] = filtered;
    let ue = `${l.plugin} keyed ${JSON.stringify(l.key)}`;
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
    n.delete(g);
    l.unsubscribe();
    c(l);
    releaseDrawings(l.input);
    l.registry.dispose();
  }
  async function w(g, l) {
    mo(g, l);
    await Jn(0);
  }
  async function P(g) {
    if (!g.isStale) return;
    try {
      await z(g, g.input);
    } catch (error) {
      g.drawn = {
        refused: errorMessage(error),
      };
      c(g);
    }
  }
  function C(g) {
    if (
      [...n.values()].some(
        ({ input }) =>
          input.surface === g.surface && input.component === g.component && input.requestId === g.requestId,
      )
    )
      throw new HooksError(
        `$.ui.mount: ${g.component} ${g.requestId} is mounted on the ${g.surface} surface already; unmount it first, or name another requestId for a second instance`,
      );
  }
  async function F(g) {
    s += 1;
    let l = s;
    let x = mountRequest(g, l);
    C(x);
    let driveState = createDriveState({
      plugin: g.plugin,
      input: x,
      port: imageProcessor,
    });
    n.set(l, driveState);
    driveState.unsubscribe = renderVersions().subscribe(() => {
      if (f(driveState.input) !== driveState.version) driveState.isStale = true;
    });
    try {
      await z(driveState, x);
      I(driveState);
    } catch (error) {
      if (n.has(l)) await w(l, driveState);
      throw error instanceof HooksError ? new HooksError(`$.ui.mount: ${error.message}`) : error;
    }
    if (!n.has(l)) throw new HooksError("$.ui.mount: the test ended while the drawing was being raised");
    return l;
  }
  function q(g, l, x) {
    let { component, requestId, surface } = g.input;
    imageProcessor.post(
      l.instance.id,
      toUiMessageEvent(
        {
          ...l,
          component,
          requestId,
        },
        surface,
        x,
      ),
      (v) => {
        if (v.props !== undefined) l.instance.setProps(v.props);
      },
    );
  }
  async function no(g, l) {
    let x = m(g);
    if (!(l.act === "redraw" || l.act === "unmount")) await P(x);
    let { component, surface } = x.input;
    switch (l.act) {
      case "drawn":
        return V(x, l.in, "drawn");
      case "find":
        return findElements(V(x, l.query.in, "find"), l.query)[0];
      case "findAll":
        return findElements(V(x, l.query.in, "findAll"), l.query);
      case "press": {
        let plugin = l.plugin ?? x.plugin;
        let tag = l.link === undefined ? "Button" : "Markdown";
        return handleUiPress({
          plugin,
          handle: X(x, {
            plugin,
            key: l.key,
            tag,
            act: "press",
          }).hosted,
          surface,
          link: l.link,
        });
      }
      case "input": {
        j(x, "input");
        let plugin = l.plugin ?? x.plugin;
        return dispatchInputQueued({
          plugin,
          handle: X(x, {
            plugin,
            key: l.key,
            tag: "Input",
            act: "input",
          }).hosted,
          element: l.key,
          component,
          surface,
          kind: l.kind ?? "submit",
          value: l.text,
        });
      }
      case "select": {
        j(x, "select");
        let plugin = l.plugin ?? x.plugin;
        return dispatchSelectQueued({
          plugin,
          handle: X(x, {
            plugin,
            key: l.key,
            tag: "Select",
            act: "select",
          }).hosted,
          element: l.key,
          component,
          surface,
          value: l.value,
        });
      }
      case "key":
        j(x, "key");
        L(x, l.in, "key").instance.key(l.event);
        return;
      case "pointer":
        j(x, "pointer");
        L(x, l.in, "pointer").instance.pointer(l.event);
        return;
      case "post":
        j(x, "post");
        q(x, L(x, l.in, "post"), l.data);
        return;
      case "advance":
        j(x, "advance");
        I(x);
        x.frame.advance(l.ms);
        return;
      case "resize":
        j(x, "resize");
        L(x, l.in, "resize").instance.resize(l.columns, l.rows);
        return;
      case "redraw":
        await z(x, {
          ...x.input,
          props: l.props ?? x.input.props,
        });
        I(x);
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
async function reloadHooksModulesWithFile(plugins, dir) {
  await loadHooksModules(plugins.filter((n) => n.path === dir));
  await loadHooksModules(plugins);
}
//@ chunk-1tz177x8.js:33091-33133 placement
var POLICY_LAYER_NAMES = {
  prepend: "policy",
  append: "policy",
};
//@ chunk-1tz177x8.js:33133-33203 placement
var buildHookOrder = (prepend, append) => ({
  prepend,
  append,
  from: POLICY_LAYER_NAMES,
  shadowed: [],
  outermost: [],
});
//@ chunk-1tz177x8.js:33203-33394 placement
function managementFromTiers(e, plugins) {
  let n = (s) => e.filter((m, f) => plugins[f]?.tier === s).map((m) => m.source);
  return {
    managedIds: new Set([...n("prepend"), ...n("append")]),
    order: buildHookOrder(n("prepend").map(nfcLower), n("append").map(nfcLower)),
  };
}
//@ chunk-1tz177x8.js:33394-33404 placement
var PLUGIN_TEST_TRUSTED = true;
//@ chunk-1tz177x8.js:33502-34264 placement
async function loadTestPlugins(e, r) {
  let n = basename(e);
  let { plugin, errors } = await createPluginFromPath(e, `${n}@claude-plugin-test`, PLUGIN_TEST_TRUSTED, n);
  let f = r === "builtin";
  let any = [...getHostState().builtinPlugins.keys()].some((key) => pluginNamesEqual(key, plugin.name));
  if (f && any)
    throw new HooksError(
      `${plugin.name} cannot load in the builtin tier: this Claude Code bundles a plugin of that name, and would load its copy`,
    );
  if (plugin.modulePath === undefined) {
    let joined = errors.map((error) => error.type).join(", ");
    let h = joined === "" ? "" : ` (${joined})`;
    if (
      !(await readdir(e).then(
        () => true,
        () => false,
      ))
    )
      throw new HooksError(`${e}: no such plugin folder`);
    let y = await readFile(join(e, "hooks", "hooks.json")).then(
      () => true,
      () => false,
    );
    throw new HooksError(
      y
        ? `${e}: no hooks module to load; hooks/hooks.json names none in "modules"${h}`
        : `${e}: no hooks module to load; there is no hooks/hooks.json naming one in "modules"`,
    );
  }
  return f
    ? {
        ...plugin,
        source: `${plugin.name}@${BUILTIN}`,
      }
    : plugin;
}
//@ chunk-1tz177x8.js:34264-34534 placement
async function loadTestPluginSet({ plugins }) {
  let results = await Promise.all(plugins.map((plugin) => loadTestPlugins(plugin.dir, plugin.tier)));
  let n = new Set();
  for (let { name: m } of results) {
    if (n.has(m)) throw new HooksError(`test(name, { plugins }): ${m} is loaded twice`);
    n.add(m);
  }
  let s = managementFromTiers(results, plugins);
  return {
    plugins: chainOrder(results, s.managedIds, s.order),
    management: s,
  };
}
//@ chunk-1tz177x8.js:34534-34760 placement
function pressTestButton({ plugin, key, requestId, surface, link }) {
  let hostedElement = findHostedElement({
    act: "press",
    tag: link === undefined ? "Button" : "Markdown",
    plugin,
    key,
    requestId,
    surface,
  });
  return handleUiPress({
    plugin,
    handle: hostedElement.hosted,
    surface: hostedElement.button.surface,
    link,
  });
}
//@ chunk-1tz177x8.js:34760-35058 placement
function assertPluginsLoaded(e) {
  let pluginRegistry = getPluginRegistry();
  let n = new Set(pluginRegistry.loadedModules.map((loadedModule) => loadedModule.name));
  let filtered = e.filter((a) => !n.has(a));
  if (filtered.length === 0) return;
  let mapped = pluginRegistry.pendingUiLog
    .filter((a) => filtered.includes(a.plugin))
    .map((a) => `${a.plugin}: ${a.text}`);
  let f = mapped.length === 0;
  throw new HooksError(
    f
      ? `${filtered.join(", ")}: hooks module did not load`
      : mapped.join(`
`),
  );
}
//@ chunk-1tz177x8.js:35058-35340 placement
var createTestHookLogger = (e, isEnded, n) => ({
  log(s, m) {
    if (m && !/^hooks? (chain )?failed: /.test(s)) e(s);
  },
  hookFailed(s) {
    if (s.environmentId !== undefined && isEnded(s.environmentId)) return;
    let f = s.skip?.kind === "unapplied" ? "hook" : "hook was skipped";
    let a = SkippableStep(s);
    e(`${s.plugin}'s ${s.event} ${f}: ${s.reason}`);
    if (a !== undefined) n(a);
  },
});
//@ chunk-1tz177x8.js:35340-35567 placement
function seatBuiltinTestPlugins(plugins) {
  let flattened = plugins.flatMap((n) =>
    isBuiltinPluginId(n.source) && getBuiltinPlugin(n.name) === undefined ? [n.name] : [],
  );
  for (let n of flattened)
    registerBuiltinPlugin({
      name: n,
      description: `${n}, seated in the builtin tier by its test`,
    });
  return () => {
    for (let n of flattened) getHostState().builtinPlugins.delete(n);
  };
}
//@ chunk-1tz177x8.js:35567-35813 placement
function selectTestOption({ plugin, key, value: n, requestId, surface }) {
  let hostedElement = findHostedElement({
    act: "select",
    tag: "Select",
    plugin,
    key,
    requestId,
    surface,
  });
  return dispatchSelectQueued({
    plugin,
    handle: hostedElement.hosted,
    element: key,
    component: hostedElement.button.component,
    surface: hostedElement.button.surface,
    value: n,
  });
}
//@ chunk-1tz177x8.js:35813-35836 placement
var setManagedPluginsSlot = (management) => managedPluginsSlot.set(management);
//@ chunk-1tz177x8.js:35836-35859 placement
var setHooksEngineRegistry = (e) => pluginEnvSlot.set(e);
//@ chunk-1tz177x8.js:35859-35882 placement
var setPluginOptionsSlot = (e) => loadedPluginOptions.set(e);
//@ chunk-1tz177x8.js:35882-35905 placement
var setTestPluginStateSlot = (handleTestHostCall) => currentDispatchSlot.set(handleTestHostCall);
//@ chunk-1tz177x8.js:35905-35914 placement
var RM_MAX_RETRIES = 3;
//@ chunk-1tz177x8.js:35914-37670 placement
function createPluginTestEngine({ root, bare, spec, isEnded }) {
  let abortController = new AbortController();
  let pluginRegistry = getPluginRegistry();
  let a = matcherLog();
  let uiLogSink = pluginRegistry.uiLogSink;
  let inlinePlugins = getInlinePlugins();
  let k = pluginDirSlot.get();
  let y = [];
  let b = (C) => {
    y.push(C);
  };
  let z;
  let I = (C) => {
    z ??= C;
  };
  let j;
  let L;
  let W = [];
  let V;
  setMatcherLog(createTestHookLogger(b, isEnded, I));
  let X = driveRenderedUi({
    render: async (C) => {
      await w();
      return engineCallFor("ui.render", abortController.signal)(C);
    },
    told: y,
  });
  async function mo(C, register) {
    let q = await mkdtemp(join(tmpdir(), "claude-plugin-test-"));
    j = q;
    let results = await Promise.all(
      spec.plugins.map(async (plugin) => ({
        dir: await scaffoldPluginTestRoot(q, plugin),
        tier: plugin.tier,
      })),
    );
    let g = await hooksModuleSource(q, C);
    let testPluginSet = await loadTestPluginSet({
      plugins: [
        {
          dir: root,
          tier: spec.tier,
        },
        ...results,
        {
          dir: g.dir,
          tier: "builtin",
        },
      ],
    });
    V = seatBuiltinTestPlugins(testPluginSet.plugins);
    setManagedPluginsSlot(testPluginSet.management);
    let found = testPluginSet.plugins.find((plugin) => plugin.path === root);
    if (spec.options && found)
      setPluginOptionsSlot({
        pluginId: marketplaceSource(found),
        options: spec.options,
      });
    setHooksEngineRegistry(new Map([[g.modulePath, createTestHooksEngine(bare, register)]]));
    pluginRegistry.pendingUiLog = [];
    let mapped = testPluginSet.plugins.map((plugin) => plugin.path);
    setInlinePlugins(mapped);
    pluginDirSlot.set(mapped);
    await reloadHooksModulesWithFile(testPluginSet.plugins, g.dir);
    W = pluginRegistry.loadedModules.map((loadedModule) => loadedModule.environmentId);
    assertPluginsLoaded(testPluginSet.plugins.map((plugin) => plugin.name));
    setUiLogSink((S) => b(`${S.plugin}: ${S.text}`));
  }
  async function w() {
    if (!L) throw Error("the engine is used before its load");
    await L;
  }
  async function P() {
    abortController.abort();
    X.releaseAll();
    try {
      if (L) {
        await L.catch(() => {
          return;
        });
        await loadHooksModules([]);
      }
    } finally {
      V?.();
      setHooksEngineRegistry(undefined);
      resetPluginState();
      setManagedPluginsSlot(undefined);
      setPluginOptionsSlot(undefined);
      setMatcherLog(a);
      pluginRegistry.uiLogSink = uiLogSink;
      setInlinePlugins(inlinePlugins);
      pluginDirSlot.set(k);
      if (j !== undefined)
        await rm(j, {
          recursive: true,
          force: true,
          maxRetries: RM_MAX_RETRIES,
        }).catch((error) =>
          logForDebugging(`claude plugin test: ${j} was not removed: ` + errorMessage(error), {
            level: "warn",
          }),
        );
    }
    return {
      told:
        y.length === 0
          ? ""
          : `the engine reported:
${y.map((F) => `  ${F}`).join(`
`)}`,
      ...(z !== undefined && {
        failed: z,
      }),
    };
  }
  return {
    load: (C, F) => (L ??= mo(C, F)),
    ready: async () => {
      await L?.catch(() => {
        return;
      });
    },
    call: async (path, F) => {
      await w();
      return engineCallFor(path, abortController.signal)(F);
    },
    stream: (path, F) =>
      teeGeneratorResult(
        (async function* () {
          await w();
          return yield* engineCallFor(path, abortController.signal)(F);
        })(),
      ),
    press: async (C) => {
      await w();
      return pressTestButton(C);
    },
    input: async (C) => {
      await w();
      return submitTestInput(C);
    },
    select: async (C) => {
      await w();
      return selectTestOption(C);
    },
    mounts: X,
    environmentIds: () => W,
    close: P,
  };
}
//@ chunk-1tz177x8.js:37670-37817 placement
var PRESS_ACTION_SCHEMA = DoctorLazy(() =>
  u({
    plugin: string(),
    key: string(),
    requestId: string().optional(),
    surface: string().refine(isUiElementTypeName, "is not a surface").optional(),
    link: u({
      href: string(),
    }).optional(),
  }),
);
export {
  loadTestPlugins,
  setTestPluginStateSlot,
  createPluginTestEngine,
  PRESS_ACTION_SCHEMA,
  RENDER_ACTION_SCHEMA,
  UI_DRIVER_ACTIONS_SCHEMA,
};
