/**
 * cli/handlers/pluginTest/uiDriver.ts
 *
 * 2.1.316 新增。插件测试中驱动 ui.render 绘制结果（act/find/press）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f284hj51.js (34)
 * attribution: placement 34
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { setTimeout as Jn } from "timers/promises";
import { basename, join } from "path";
import { readdir, readFile, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { DoctorLazy } from "../util.js";
import {
  stringSchema,
  objectSchema,
  union,
  literal,
  discriminatedUnion,
  _enum,
  numberSchema,
  unknown,
  record,
  booleanSchema,
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
import { clearStateSession } from "../../../plugins/functionHooks/api/state.js";
import { logForDebugging } from "../../../utils/debug.js";
import { teeGeneratorResult } from "../../../plugins/functionHooks/dispatch/streamChain.js";
import { deferInit, beginDeferredInits } from "../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 5 modules closed by ../../../components/Onboarding.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/components/Onboarding.js");
//@ chunk-f284hj51.js:24076-25039 placement
var UI_DRIVER_ACTIONS_SCHEMA = DoctorLazy(() => {
  let scopeIn = stringSchema().optional();
  let query = objectSchema({
    type: stringSchema().optional(),
    key: stringSchema().optional(),
    text: union([
      stringSchema(),
      objectSchema({
        source: stringSchema(),
        flags: stringSchema(),
      }),
    ]).optional(),
    in: scopeIn,
  });
  let isOn = literal(true).optional();
  return discriminatedUnion("act", [
    objectSchema({
      act: literal("drawn"),
      in: scopeIn,
    }),
    objectSchema({
      act: literal("find"),
      query,
    }),
    objectSchema({
      act: literal("findAll"),
      query,
    }),
    objectSchema({
      act: literal("press"),
      key: stringSchema(),
      plugin: stringSchema().optional(),
      link: objectSchema({
        href: stringSchema(),
      }).optional(),
    }),
    objectSchema({
      act: literal("input"),
      key: stringSchema(),
      text: stringSchema(),
      kind: _enum(["change", "submit"]).optional(),
      plugin: stringSchema().optional(),
    }),
    objectSchema({
      act: literal("select"),
      key: stringSchema(),
      value: stringSchema(),
      plugin: stringSchema().optional(),
    }),
    objectSchema({
      act: literal("key"),
      event: objectSchema({
        key: stringSchema(),
        ctrl: isOn,
        shift: isOn,
        meta: isOn,
      }),
      in: scopeIn,
    }),
    objectSchema({
      act: literal("pointer"),
      event: objectSchema({
        type: _enum(["down", "move", "up", "enter", "leave"]),
        x: numberSchema(),
        y: numberSchema(),
        button: _enum(["left", "middle", "right"]).optional(),
        shift: isOn,
        alt: isOn,
        ctrl: isOn,
      }),
      in: scopeIn,
    }),
    objectSchema({
      act: literal("post"),
      data: unknown(),
      in: scopeIn,
    }),
    objectSchema({
      act: literal("advance"),
      ms: numberSchema().nonnegative(),
    }),
    objectSchema({
      act: literal("resize"),
      columns: numberSchema().int().nonnegative(),
      rows: numberSchema().int().nonnegative(),
      in: scopeIn,
    }),
    objectSchema({
      act: literal("redraw"),
      props: record(stringSchema(), unknown()).optional(),
    }),
    objectSchema({
      act: literal("unmount"),
    }),
  ]);
});
//@ chunk-f284hj51.js:25039-25316 placement
var RENDER_ACTION_SCHEMA; // deferred: uses isRenderSiteName (./engineShim.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-f284hj51.js:25039", () => {
  RENDER_ACTION_SCHEMA = DoctorLazy(() =>
    objectSchema({
      plugin: stringSchema(),
      surface: stringSchema().refine(isUiElementTypeName, "is not a surface"),
      component: stringSchema().refine(isRenderSiteName, "is not a component"),
      props: record(stringSchema(), unknown()),
      requestId: stringSchema().optional(),
      viewport: objectSchema({
        columns: numberSchema().int().nonnegative(),
        rows: numberSchema().int().nonnegative(),
        isFullscreen: booleanSchema().optional(),
      }).optional(),
    }),
  );
});
//@ chunk-f284hj51.js:25316-25717 placement
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
//@ chunk-f284hj51.js:25717-26067 placement
/**
 * 从渲染树中收集 Client 元素（插件、键、模块、属性）。
 */
function collectClientElements(root) {
  let found = [];
  function visit(node) {
    if (!isPlainObject(node)) return;
    let props = isPlainObject(node.props) ? node.props : {};
    let client = isPlainObject(node.client) ? node.client : {};
    let { key, module: moduleName } = props;
    let plugin = client.plugin;
    if (
      node.type === "Client" &&
      typeof plugin === "string" &&
      typeof key === "string" &&
      typeof moduleName === "string"
    ) {
      found.push({
        plugin,
        key,
        module: moduleName,
        props: props.props,
      });
      return;
    }
    if (Array.isArray(node.children)) for (let child of node.children) visit(child);
  }
  visit(root);
  return found;
}
//@ chunk-f284hj51.js:26067-26145 placement
var renderHandleInfo = (handle) => ({
  component: handle.component,
  requestId: handle.requestId,
  surface: handle.surface,
});
//@ chunk-f284hj51.js:26145-26572 placement
/**
 * 取渲染元素的可见文本（按钮、链接、Markdown、代码、输入框等）。
 */
function elementText(node) {
  if (typeof node === "string") return node;
  if (!isPlainObject(node)) return "";
  let props = isPlainObject(node.props) ? node.props : {};
  let propText = (name) => (typeof props[name] === "string" ? props[name] : "");
  let isButton = node.type === "Button";
  let isLink = node.type === "Link";
  let isMarkdown = node.type === "Markdown";
  let isCode = node.type === "Code";
  let isInput = node.type === "Input";
  return (
    (isButton && Array.isArray(node.children) && node.children.length > 0
      ? ""
      : isButton
        ? propText("label")
        : isLink
          ? propText("label") || propText("href")
          : isMarkdown
            ? propText("text")
            : isCode
              ? propText("source")
              : isInput
                ? propText("value")
                : "") + (Array.isArray(node.children) ? node.children : []).map(elementText).join("")
  );
}
//@ chunk-f284hj51.js:26572-26630 placement
var matchesExpectedText = (text, expected) =>
  typeof expected === "string" ? text.includes(expected) : expected.test(text);
//@ chunk-f284hj51.js:26630-27082 placement
/**
 * 在渲染树中按类型、key 与文本查找元素。
 */
function findElements(tree, query) {
  let { key, text } = query;
  let type = query.type;
  let matches = [];
  let textMatcher = typeof text === "object" ? new RegExp(text.source, text.flags) : text;
  let textMatches = (text) => textMatcher === undefined || matchesExpectedText(text, textMatcher);
  function visit(node) {
    if (!isPlainObject(node) || typeof node.type !== "string") return;
    let props = isPlainObject(node.props)
      ? {
          ...node.props,
        }
      : {};
    let key_2 = typeof props.key === "string" ? props.key : undefined;
    let children = Array.isArray(node.children) ? node.children : [];
    let text = elementText(node);
    if (
      (type === undefined || node.type === type) &&
      (key === undefined || key_2 === key) &&
      textMatches(text)
    )
      matches.push({
        type: node.type,
        key: key_2,
        props,
        text,
        children,
      });
    for (let child of children) visit(child);
  }
  visit(tree);
  return matches;
}
//@ chunk-f284hj51.js:27082-27093 placement
var MAX_TIMER_TICKS_PER_ADVANCE = 1e4;
//@ chunk-f284hj51.js:27093-27626 placement
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
//@ chunk-f284hj51.js:27759-27913 placement
var mountRequest = (request, index) => ({
  surface: request.surface,
  component: request.component,
  requestId: request.requestId ?? `mount-${index}`,
  ...(request.viewport !== undefined && {
    viewport: request.viewport,
  }),
  props: request.props,
});
//@ chunk-f284hj51.js:27913-27925 placement
var RENDER_SETTLE_MS = 2000;
//@ chunk-f284hj51.js:27971-28140 placement
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
//@ chunk-f284hj51.js:28140-28250 placement
function releaseDrawings(handle) {
  let info = renderHandleInfo(handle);
  for (let holder of moveToCloudTrash.holdersOf(info)) {
    let { released } = moveToCloudTrash.holdDrawing(holder, info, []);
    releasePresses(holder, released, info);
  }
}
//@ chunk-f284hj51.js:28250-34065 placement
/**
 * 插件测试中驱动 ui.render 的结果：提供 act/drawn/find/findAll/press 等操作，模拟用户与插件界面交互。
 */
function driveRenderedUi(port) {
  let imageProcessor = getImageProcessor();
  let drawings = new Map();
  let nextId = 0;
  function drawingOf(id) {
    let drawing = drawings.get(id);
    if (!drawing) throw new HooksError("this drawing was unmounted");
    return drawing;
  }
  let versionOf = (input) => siteVersionOf(renderVersions().getState(), input);
  let waitForDrawn = (instance, timeoutMs) =>
    new Promise((resolve) => {
      let isReady = () => instance.getSnapshot().status !== "loading";
      if (isReady()) {
        resolve(true);
        return;
      }
      let unsubscribe = instance.subscribe(() => {
        if (isReady()) {
          clearTimeout(timer);
          unsubscribe();
          resolve(true);
        }
      });
      let timer = setTimeout(
        (stop, finish) => {
          stop();
          finish(false);
        },
        timeoutMs,
        unsubscribe,
        resolve,
      );
    });
  function releaseClients(drawing) {
    let clients = drawing.clients;
    drawing.clients = [];
    for (let client of clients) client.instance.release();
  }
  async function awaitClientDrawn(client) {
    let { instance } = client;
    let ok = await waitForDrawn(instance, RENDER_SETTLE_MS);
    let snapshot = instance.getSnapshot();
    if (!ok)
      throw new HooksError(
        `${client.plugin}'s Client ${client.module} (keyed ${JSON.stringify(client.key)}) drew nothing in ${RENDER_SETTLE_MS} ms (a dialog Client past its row budget draws nothing; the report says so)`,
      );
    if (snapshot.status === "failed") throw new HooksError(snapshot.text);
  }
  let sameClient = (a, clientElement) => a.plugin === clientElement.plugin && a.key === clientElement.key;
  function acquireClient(drawing, clientElement) {
    let { input, registry, frame } = drawing;
    let instance = registry.acquire({
      ...clientElement,
      component: input.component,
      requestId: input.requestId,
      surface: input.surface,
      clock: frame.clock,
    });
    instance.resize(input.viewport?.columns ?? 0, input.viewport?.rows ?? 0);
    return {
      ...clientElement,
      instance,
    };
  }
  async function syncClients(drawing, tree) {
    let clientElements = collectClientElements(tree);
    let isKept = (client) =>
      clientElements.some(
        (clientElement) => sameClient(clientElement, client) && clientElement.module === client.module,
      );
    for (let client of drawing.clients) if (!isKept(client)) client.instance.release();
    let filtered = drawing.clients.filter(isKept);
    for (let clientElement of clientElements)
      filtered.find((client) => sameClient(client, clientElement))?.instance.setProps(clientElement.props);
    let mapped = clientElements
      .filter((clientElement) => !filtered.some((client) => sameClient(client, clientElement)))
      .map((clientElement) => acquireClient(drawing, clientElement));
    drawing.clients = [...filtered, ...mapped];
    for (let client of mapped) await awaitClientDrawn(client);
  }
  async function draw(drawing, input) {
    drawing.input = input;
    drawing.version = versionOf(input);
    drawing.isStale = false;
    let toldBefore = port.told.length;
    let refusalPrefixes = [`ui.render (${input.component}) refused: `, `a tree ${input.component} refuses: `];
    let findRefusal = () =>
      port.told.slice(toldBefore).findLast((line) => refusalPrefixes.some((prefix) => line.includes(prefix)));
    let tree = await port.render(input).catch((error) => {
      if (findRefusal() === undefined) throw error;
      return ENGINE_ELEMENT;
    });
    if (tree === ENGINE_ELEMENT) {
      drawing.drawn = {
        refused:
          `${drawing.plugin} drew nothing on the ${input.surface} surface: ` +
          (findRefusal() ??
            `the tree its hooks returned for ${input.component} did not validate by that surface's rules (the report says why)`),
      };
      releaseClients(drawing);
      return;
    }
    drawing.drawn = {
      tree,
    };
    await syncClients(drawing, tree);
  }
  function requireTree(drawing) {
    if ("refused" in drawing.drawn) throw new HooksError(drawing.drawn.refused);
    return drawing.drawn.tree;
  }
  function requireSurfaceDraws(drawing, act) {
    let { surface } = drawing.input;
    let { element, reaches } = UI_ACTION_TARGETS[act];
    if (!UI_ELEMENT_TYPES[surface].includes(element))
      throw new HooksError(
        `${act}: the ${surface} surface draws no ${element}; ${act} reaches ${reaches}, so it is not an act on this surface`,
      );
  }
  function clientOf(drawing, key, act) {
    requireTree(drawing);
    let filtered = drawing.clients.filter((client) => key === undefined || client.key === key);
    let [first, ...rest] = filtered;
    if (!first) {
      let keyNote = key === undefined ? "" : ` keyed ${JSON.stringify(key)}`;
      throw new HooksError(`${act}: the drawing holds no Client${keyNote}`);
    }
    if (rest.length > 0)
      throw new HooksError(
        `${act}: the drawing holds ${filtered.length} Clients (` +
          filtered.map((client) => client.key).join(", ") +
          "); name one with `in`",
      );
    return first;
  }
  function clientTree(client) {
    let snapshot = client.instance.getSnapshot();
    if (snapshot.status === "failed") throw new HooksError(snapshot.text);
    if (snapshot.status !== "drawn")
      throw new HooksError(`${client.plugin}: Client ${client.module} has drawn nothing`);
    return snapshot.tree;
  }
  let treeFor = (drawing, inKey, act) =>
    inKey === undefined ? requireTree(drawing) : clientTree(clientOf(drawing, inKey, act));
  function findButton(drawing, target) {
    requireTree(drawing);
    let { component, requestId, surface } = drawing.input;
    let requestIds = new Set([
      requestId,
      ...drawing.clients.map((client) => clientSurfaceKey(requestId, client.key)),
    ]);
    let filtered = moveToCloudTrash
      .hostedButtonsOf(target.plugin, target.key)
      .filter(
        ({ button }) =>
          button.tag === target.tag &&
          button.surface === surface &&
          button.component === component &&
          requestIds.has(button.requestId),
      );
    let [first, ...rest] = filtered;
    let label = `${target.plugin} keyed ${JSON.stringify(target.key)}`;
    if (!first)
      throw new HooksError(
        `${target.act}: no ${target.tag} of ${label} is drawn in this ${component} on the ${surface} surface`,
      );
    if (rest.length > 0)
      throw new HooksError(
        `${target.act}: ${filtered.length} ${target.tag}s of ${label} are drawn in this drawing; key each once`,
      );
    return first;
  }
  function disposeDrawing(id, drawing) {
    drawings.delete(id);
    drawing.unsubscribe();
    releaseClients(drawing);
    releaseDrawings(drawing.input);
    drawing.registry.dispose();
  }
  async function unmount(id, drawing) {
    disposeDrawing(id, drawing);
    await Jn(0);
  }
  async function redrawIfStale(drawing) {
    if (!drawing.isStale) return;
    try {
      await draw(drawing, drawing.input);
    } catch (error) {
      drawing.drawn = {
        refused: errorMessage(error),
      };
      releaseClients(drawing);
    }
  }
  function assertNotMounted(request) {
    if (
      [...drawings.values()].some(
        ({ input }) =>
          input.surface === request.surface &&
          input.component === request.component &&
          input.requestId === request.requestId,
      )
    )
      throw new HooksError(
        `$.ui.mount: ${request.component} ${request.requestId} is mounted on the ${request.surface} surface already; unmount it first, or name another requestId for a second instance`,
      );
  }
  async function mount(request) {
    nextId += 1;
    let id = nextId;
    let mountReq = mountRequest(request, id);
    assertNotMounted(mountReq);
    let drawing = createDriveState({
      plugin: request.plugin,
      input: mountReq,
      port: imageProcessor,
    });
    drawings.set(id, drawing);
    drawing.unsubscribe = renderVersions().subscribe(() => {
      if (versionOf(drawing.input) !== drawing.version) drawing.isStale = true;
    });
    try {
      await draw(drawing, mountReq);
      requireTree(drawing);
    } catch (error) {
      if (drawings.has(id)) await unmount(id, drawing);
      throw error instanceof HooksError ? new HooksError(`$.ui.mount: ${error.message}`) : error;
    }
    if (!drawings.has(id))
      throw new HooksError("$.ui.mount: the test ended while the drawing was being raised");
    return id;
  }
  function postToClient(drawing, client, data) {
    let { component, requestId, surface } = drawing.input;
    imageProcessor.post(
      client.instance.id,
      toUiMessageEvent(
        {
          ...client,
          component,
          requestId,
        },
        surface,
        data,
      ),
      (reply) => {
        if (reply.props !== undefined) client.instance.setProps(reply.props);
      },
    );
  }
  async function act(id, action) {
    let drawing = drawingOf(id);
    if (!(action.act === "redraw" || action.act === "unmount")) await redrawIfStale(drawing);
    let { component, surface } = drawing.input;
    switch (action.act) {
      case "drawn":
        return treeFor(drawing, action.in, "drawn");
      case "find":
        return findElements(treeFor(drawing, action.query.in, "find"), action.query)[0];
      case "findAll":
        return findElements(treeFor(drawing, action.query.in, "findAll"), action.query);
      case "press": {
        let plugin = action.plugin ?? drawing.plugin;
        let tag = action.link === undefined ? "Button" : "Markdown";
        return handleUiPress({
          plugin,
          handle: findButton(drawing, {
            plugin,
            key: action.key,
            tag,
            act: "press",
          }).hosted,
          surface,
          link: action.link,
        });
      }
      case "input": {
        requireSurfaceDraws(drawing, "input");
        let plugin = action.plugin ?? drawing.plugin;
        return dispatchInputQueued({
          plugin,
          handle: findButton(drawing, {
            plugin,
            key: action.key,
            tag: "Input",
            act: "input",
          }).hosted,
          element: action.key,
          component,
          surface,
          kind: action.kind ?? "submit",
          value: action.text,
        });
      }
      case "select": {
        requireSurfaceDraws(drawing, "select");
        let plugin = action.plugin ?? drawing.plugin;
        return dispatchSelectQueued({
          plugin,
          handle: findButton(drawing, {
            plugin,
            key: action.key,
            tag: "Select",
            act: "select",
          }).hosted,
          element: action.key,
          component,
          surface,
          value: action.value,
        });
      }
      case "key":
        requireSurfaceDraws(drawing, "key");
        clientOf(drawing, action.in, "key").instance.key(action.event);
        return;
      case "pointer":
        requireSurfaceDraws(drawing, "pointer");
        clientOf(drawing, action.in, "pointer").instance.pointer(action.event);
        return;
      case "post":
        requireSurfaceDraws(drawing, "post");
        postToClient(drawing, clientOf(drawing, action.in, "post"), action.data);
        return;
      case "advance":
        requireSurfaceDraws(drawing, "advance");
        requireTree(drawing);
        drawing.frame.advance(action.ms);
        return;
      case "resize":
        requireSurfaceDraws(drawing, "resize");
        clientOf(drawing, action.in, "resize").instance.resize(action.columns, action.rows);
        return;
      case "redraw":
        await draw(drawing, {
          ...drawing.input,
          props: action.props ?? drawing.input.props,
        });
        requireTree(drawing);
        return;
      case "unmount":
        await unmount(id, drawing);
        return;
    }
  }
  return {
    mount,
    act,
    async refresh() {
      for (let drawing of drawings.values()) await redrawIfStale(drawing);
    },
    releaseAll() {
      for (let [id, drawing] of [...drawings]) disposeDrawing(id, drawing);
    },
  };
}
//@ chunk-f284hj51.js:34065-34138 placement
async function reloadHooksModulesWithFile(plugins, dir) {
  await loadHooksModules(plugins.filter((plugin) => plugin.path === dir));
  await loadHooksModules(plugins);
}
//@ chunk-f284hj51.js:34244-34286 placement
var POLICY_LAYER_NAMES = {
  prepend: "policy",
  append: "policy",
};
//@ chunk-f284hj51.js:34286-34356 placement
var buildHookOrder = (prepend, append) => ({
  prepend,
  append,
  from: POLICY_LAYER_NAMES,
  shadowed: [],
  outermost: [],
});
//@ chunk-f284hj51.js:34356-34547 placement
function managementFromTiers(entries, plugins) {
  let sourcesOfTier = (tier) =>
    entries.filter((entry, index) => plugins[index]?.tier === tier).map((entry) => entry.source);
  return {
    managedIds: new Set([...sourcesOfTier("prepend"), ...sourcesOfTier("append")]),
    order: buildHookOrder(sourcesOfTier("prepend").map(nfcLower), sourcesOfTier("append").map(nfcLower)),
  };
}
//@ chunk-f284hj51.js:34547-34557 placement
var PLUGIN_TEST_TRUSTED = true;
//@ chunk-f284hj51.js:34655-35417 placement
async function loadTestPlugins(dir, tier) {
  let name = basename(dir);
  let { plugin, errors } = await createPluginFromPath(
    dir,
    `${name}@claude-plugin-test`,
    PLUGIN_TEST_TRUSTED,
    name,
  );
  let isBuiltinTier = tier === "builtin";
  let any = [...getHostState().builtinPlugins.keys()].some((key) => pluginNamesEqual(key, plugin.name));
  if (isBuiltinTier && any)
    throw new HooksError(
      `${plugin.name} cannot load in the builtin tier: this Claude Code bundles a plugin of that name, and would load its copy`,
    );
  if (plugin.modulePath === undefined) {
    let joined = errors.map((error) => error.type).join(", ");
    let errorsNote = joined === "" ? "" : ` (${joined})`;
    if (
      !(await readdir(dir).then(
        () => true,
        () => false,
      ))
    )
      throw new HooksError(`${dir}: no such plugin folder`);
    let hasHooksJson = await readFile(join(dir, "hooks", "hooks.json")).then(
      () => true,
      () => false,
    );
    throw new HooksError(
      hasHooksJson
        ? `${dir}: no hooks module to load; hooks/hooks.json names none in "modules"${errorsNote}`
        : `${dir}: no hooks module to load; there is no hooks/hooks.json naming one in "modules"`,
    );
  }
  return isBuiltinTier
    ? {
        ...plugin,
        source: `${plugin.name}@${BUILTIN}`,
      }
    : plugin;
}
//@ chunk-f284hj51.js:35417-35687 placement
async function loadTestPluginSet({ plugins }) {
  let results = await Promise.all(plugins.map((plugin) => loadTestPlugins(plugin.dir, plugin.tier)));
  let seenNames = new Set();
  for (let { name } of results) {
    if (seenNames.has(name)) throw new HooksError(`test(name, { plugins }): ${name} is loaded twice`);
    seenNames.add(name);
  }
  let management = managementFromTiers(results, plugins);
  return {
    plugins: chainOrder(results, management.managedIds, management.order),
    management,
  };
}
//@ chunk-f284hj51.js:35687-35913 placement
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
//@ chunk-f284hj51.js:35913-36211 placement
function assertPluginsLoaded(names) {
  let pluginRegistry = getPluginRegistry();
  let loadedNames = new Set(pluginRegistry.loadedModules.map((loadedModule) => loadedModule.name));
  let filtered = names.filter((name) => !loadedNames.has(name));
  if (filtered.length === 0) return;
  let mapped = pluginRegistry.pendingUiLog
    .filter((entry) => filtered.includes(entry.plugin))
    .map((entry) => `${entry.plugin}: ${entry.text}`);
  let hasNoLog = mapped.length === 0;
  throw new HooksError(
    hasNoLog
      ? `${filtered.join(", ")}: hooks module did not load`
      : mapped.join(`
`),
  );
}
//@ chunk-f284hj51.js:36211-36493 placement
var createTestHookLogger = (report, isEnded, onSkipped) => ({
  log(message, isWarning) {
    if (isWarning && !/^hooks? (chain )?failed: /.test(message)) report(message);
  },
  hookFailed(failure) {
    if (failure.environmentId !== undefined && isEnded(failure.environmentId)) return;
    let verb = failure.skip?.kind === "unapplied" ? "hook" : "hook was skipped";
    let skipped = SkippableStep(failure);
    report(`${failure.plugin}'s ${failure.event} ${verb}: ${failure.reason}`);
    if (skipped !== undefined) onSkipped(skipped);
  },
});
//@ chunk-f284hj51.js:36493-36720 placement
function seatBuiltinTestPlugins(plugins) {
  let flattened = plugins.flatMap((plugin) =>
    isBuiltinPluginId(plugin.source) && getBuiltinPlugin(plugin.name) === undefined ? [plugin.name] : [],
  );
  for (let name of flattened)
    registerBuiltinPlugin({
      name,
      description: `${name}, seated in the builtin tier by its test`,
    });
  return () => {
    for (let name of flattened) getHostState().builtinPlugins.delete(name);
  };
}
//@ chunk-f284hj51.js:36720-36966 placement
function selectTestOption({ plugin, key, value, requestId, surface }) {
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
    value,
  });
}
//@ chunk-f284hj51.js:36966-36989 placement
var setManagedPluginsSlot = (management) => managedPluginsSlot.set(management);
//@ chunk-f284hj51.js:36989-37012 placement
var setHooksEngineRegistry = (registry) => pluginEnvSlot.set(registry);
//@ chunk-f284hj51.js:37012-37035 placement
var setPluginOptionsSlot = (loaded) => loadedPluginOptions.set(loaded);
//@ chunk-f284hj51.js:37035-37058 placement
var setTestPluginStateSlot = (handleTestHostCall) => currentDispatchSlot.set(handleTestHostCall);
//@ chunk-f284hj51.js:37058-37067 placement
var RM_MAX_RETRIES = 3;
//@ chunk-f284hj51.js:37067-38823 placement
function createPluginTestEngine({ root, bare, spec, isEnded }) {
  let abortController = new AbortController();
  let pluginRegistry = getPluginRegistry();
  let originalLog = matcherLog();
  let uiLogSink = pluginRegistry.uiLogSink;
  let inlinePlugins = getInlinePlugins();
  let originalPluginDirs = pluginDirSlot.get();
  let told = [];
  let tell = (message) => {
    told.push(message);
  };
  let failed;
  let fail = (failure) => {
    failed ??= failure;
  };
  let tempDir;
  let loadPromise;
  let environmentIds = [];
  let unseatBuiltins;
  setMatcherLog(createTestHookLogger(tell, isEnded, fail));
  let ui = driveRenderedUi({
    render: async (request) => {
      await ensureLoaded();
      return engineCallFor("ui.render", abortController.signal)(request);
    },
    told,
  });
  async function doLoad(hookEvents, register) {
    let rootDir = await mkdtemp(join(tmpdir(), "claude-plugin-test-"));
    tempDir = rootDir;
    let results = await Promise.all(
      spec.plugins.map(async (plugin) => ({
        dir: await scaffoldPluginTestRoot(rootDir, plugin),
        tier: plugin.tier,
      })),
    );
    let hooksSource = await hooksModuleSource(rootDir, hookEvents);
    let testPluginSet = await loadTestPluginSet({
      plugins: [
        {
          dir: root,
          tier: spec.tier,
        },
        ...results,
        {
          dir: hooksSource.dir,
          tier: "builtin",
        },
      ],
    });
    unseatBuiltins = seatBuiltinTestPlugins(testPluginSet.plugins);
    setManagedPluginsSlot(testPluginSet.management);
    let found = testPluginSet.plugins.find((plugin) => plugin.path === root);
    if (spec.options && found)
      setPluginOptionsSlot({
        pluginId: marketplaceSource(found),
        options: spec.options,
      });
    setHooksEngineRegistry(new Map([[hooksSource.modulePath, createTestHooksEngine(bare, register)]]));
    pluginRegistry.pendingUiLog = [];
    let mapped = testPluginSet.plugins.map((plugin) => plugin.path);
    setInlinePlugins(mapped);
    pluginDirSlot.set(mapped);
    await reloadHooksModulesWithFile(testPluginSet.plugins, hooksSource.dir);
    environmentIds = pluginRegistry.loadedModules.map((loadedModule) => loadedModule.environmentId);
    assertPluginsLoaded(testPluginSet.plugins.map((plugin) => plugin.name));
    setUiLogSink((entry) => tell(`${entry.plugin}: ${entry.text}`));
  }
  async function ensureLoaded() {
    if (!loadPromise) throw Error("the engine is used before its load");
    await loadPromise;
  }
  async function close() {
    abortController.abort();
    ui.releaseAll();
    try {
      if (loadPromise) {
        await loadPromise.catch(() => {
          return;
        });
        await loadHooksModules([]);
      }
    } finally {
      unseatBuiltins?.();
      setHooksEngineRegistry(undefined);
      clearStateSession();
      setManagedPluginsSlot(undefined);
      setPluginOptionsSlot(undefined);
      setMatcherLog(originalLog);
      pluginRegistry.uiLogSink = uiLogSink;
      setInlinePlugins(inlinePlugins);
      pluginDirSlot.set(originalPluginDirs);
      if (tempDir !== undefined)
        await rm(tempDir, {
          recursive: true,
          force: true,
          maxRetries: RM_MAX_RETRIES,
        }).catch((error) =>
          logForDebugging(`claude plugin test: ${tempDir} was not removed: ` + errorMessage(error), {
            level: "warn",
          }),
        );
    }
    return {
      told:
        told.length === 0
          ? ""
          : `the engine reported:
${told.map((line) => `  ${line}`).join(`
`)}`,
      ...(failed !== undefined && {
        failed,
      }),
    };
  }
  return {
    load: (hookEvents, register) => (loadPromise ??= doLoad(hookEvents, register)),
    ready: async () => {
      await loadPromise?.catch(() => {
        return;
      });
    },
    call: async (path, input) => {
      await ensureLoaded();
      return engineCallFor(path, abortController.signal)(input);
    },
    stream: (path, input) =>
      teeGeneratorResult(
        (async function* () {
          await ensureLoaded();
          return yield* engineCallFor(path, abortController.signal)(input);
        })(),
      ),
    press: async (action) => {
      await ensureLoaded();
      return pressTestButton(action);
    },
    input: async (action) => {
      await ensureLoaded();
      return submitTestInput(action);
    },
    select: async (action) => {
      await ensureLoaded();
      return selectTestOption(action);
    },
    mounts: ui,
    environmentIds: () => environmentIds,
    close,
  };
}
//@ chunk-f284hj51.js:38823-38970 placement
var PRESS_ACTION_SCHEMA; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-f284hj51.js:38823", () => {
  PRESS_ACTION_SCHEMA = DoctorLazy(() =>
    objectSchema({
      plugin: stringSchema(),
      key: stringSchema(),
      requestId: stringSchema().optional(),
      surface: stringSchema().refine(isUiElementTypeName, "is not a surface").optional(),
      link: objectSchema({
        href: stringSchema(),
      }).optional(),
    }),
  );
});
export {
  loadTestPlugins,
  setTestPluginStateSlot,
  createPluginTestEngine,
  PRESS_ACTION_SCHEMA,
  RENDER_ACTION_SCHEMA,
  UI_DRIVER_ACTIONS_SCHEMA,
};
