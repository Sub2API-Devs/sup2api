/**
 * plugins/functionHooks/surfaceClients.ts
 *
 * 2.1.316 新增：函数钩子插件的"surface"客户端：在沙箱环境运行界面模块、测量与重绘、焦点、故障上报
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3b87bmyq.js (41)
 * attribution: placement 41
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import * as vmModule from "vm";
import { __export } from "../../../runtime/bun-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3b87bmyq.js:1211-1222 placement
/**
 * 空对象
 */
var EMPTY_SURFACE_CLIENTS = {};
//@ chunk-3b87bmyq.js:1222-1343 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3b87bmyq.js:1222", () => {
  __export(EMPTY_SURFACE_CLIENTS, {
    clientFocusStore: () => focusStore,
    default: () => EMPTY_SURFACE_CLIENTS,
    focusClient: () => setFocusedClient,
    focusedClientId: () => focusedClientId,
    releaseClientFocus: () => clearFocusedClient,
  });
});
//@ chunk-3b87bmyq.js:1343-1842 placement
function createUiMessagePort(options = {}) {
  let run = options.run ?? dispatchUiMessage;
  let schedule =
    options.schedule ??
    ((flush) => {
      let timer = setTimeout(flush, SCROLL_JUMP_LINES);
      return () => {
        clearTimeout(timer);
      };
    });
  let warn =
    options.warn ??
    ((text) => {
      logForDebugging(text, {
        level: "warn",
      });
    });
  let pending = new Map();
  let cancelTimer;
  let dispatchCount = 0;
  function flush() {
    cancelTimer = undefined;
    let entries = [...pending.values()];
    pending.clear();
    for (let { message, reply } of entries) {
      dispatchCount += 1;
      run(message).then(reply, (error) => {
        warn(
          `ui.message ${message.plugin}/${message.message.element}: the chain threw (${errorMessage(error)}); no reply`,
        );
      });
    }
  }
  return {
    post(id, message, reply) {
      pending.set(id, {
        message,
        reply,
      });
      cancelTimer ??= schedule(flush);
    },
    cancel(id) {
      pending.delete(id);
      if (pending.size === 0 && cancelTimer !== undefined) {
        cancelTimer();
        cancelTimer = undefined;
      }
    },
    dispatched: () => dispatchCount,
  };
}
//@ chunk-3b87bmyq.js:1842-1855 placement
/**
 * UI 消息端口
 */
var uiMessagePort; // deferred: uses createUiMessagePort of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3b87bmyq.js:1842", () => {
  uiMessagePort = createUiMessagePort();
});
//@ chunk-3b87bmyq.js:1855-1895 placement
/**
 * 客户端界面键
 */
var clientSurfaceKey = (requestId, key) => `${requestId}\x00client\x00${key}`;
//@ chunk-3b87bmyq.js:1895-1984 placement
/**
 * 客户端描述
 */
var surfaceClientInfo = (drawn) => ({
  component: drawn.component,
  requestId: clientSurfaceKey(drawn.requestId, drawn.key),
  surface: drawn.surface,
});
//@ chunk-3b87bmyq.js:1984-2029 placement
/**
 * 客户端失败说明
 */
var clientFailureText = (caller, moduleName, reason) =>
  `Client ${moduleName}: ${describeClientFailure(caller, moduleName, reason)}`;
//@ chunk-3b87bmyq.js:2029-2102 placement
/**
 * 焦点 store
 */
var focusStore; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3b87bmyq.js:2029", () => {
  focusStore = identity(
    createStore({
      focusedId: null,
    }),
    (store) =>
      store.setState(() => ({
        focusedId: null,
      })),
  );
});
//@ chunk-3b87bmyq.js:2102-2166 placement
/**
 * 设置焦点
 */
var setFocusedClient = (id) =>
  focusStore.setState((state) =>
    state.focusedId === id
      ? state
      : {
          focusedId: id,
        },
  );
//@ chunk-3b87bmyq.js:2166-2202 placement
/**
 * 取焦点 id
 */
var focusedClientId = () => focusStore.getState().focusedId;
//@ chunk-3b87bmyq.js:2202-2269 placement
/**
 * 清除焦点
 */
var clearFocusedClient = (id) =>
  focusStore.setState((state) =>
    state.focusedId === id
      ? {
          focusedId: null,
        }
      : state,
  );
//@ chunk-3b87bmyq.js:2269-2292 placement
/**
 * 引擎节点权重
 */
var engineNodeWeight = (component) => (component === ONE_ENGINE_NODE_COMPONENT ? 1 : 0);
//@ chunk-3b87bmyq.js:2292-2416 placement
function createClientSite(drawn, component) {
  let site = {
    surface: drawn.drawing.surface,
    component,
    requestId: drawn.requestId,
  };
  return {
    site,
    bornAt: currentVersion(site),
    holders: 0,
  };
}
//@ chunk-3b87bmyq.js:2416-2452 placement
/**
 * 持有句柄
 */
var heldHandle = (plugin, handle) => ({
  plugin,
  handle,
});
//@ chunk-3b87bmyq.js:2452-2818 placement
/**
 * 解析界面模块返回的元素树 JSON，把 held 句柄转为按键记录、悬停组归属到插件。
 */
function toClientTree(plugin, treeJson, handleOf) {
  function convert(node) {
    if (!isPlainObject(node)) return node;
    let { props, hover, children, held } = node;
    let converted = {
      type: node.type,
    };
    if (props !== undefined) converted.props = props;
    if (hover !== undefined) converted.hover = hover;
    if (isHoverableType(node.type) && elementScope(hover) !== undefined)
      converted.group = {
        plugin,
      };
    if (typeof held === "number") converted.press = heldHandle(plugin, handleOf(held));
    if ((typeof held !== "number" || node.type === "Button") && Array.isArray(children))
      converted.children = children.map(convert);
    return converted;
  }
  return deepFreezeInPlace(convert(wellFormed(jsonParse(treeJson))));
}
//@ chunk-3b87bmyq.js:2818-2879 placement
/**
 * 客户端日志键
 */
var clientLogKey = (client) => [client.plugin, client.surface, client.requestId, client.key].join(" ");
//@ chunk-3b87bmyq.js:2879-2889 placement
/**
 * 20
 */
var MAX_CLIENT_MEASURE_TRIES = 20;
//@ chunk-3b87bmyq.js:2889-2898 placement
/**
 * 8
 */
var MAX_CLIENT_SETTLE_TRIES = 8;
//@ chunk-3b87bmyq.js:2898-2907 placement
/**
 * 3
 */
var MAX_CLIENT_REDRAW_TRIES = 3;
//@ chunk-3b87bmyq.js:2907-3021 placement
var clientKeyOf = (client) => ({
  plugin: client.plugin,
  module: client.module,
  component: client.drawing.component,
  requestId: client.requestId,
  key: client.element,
});
//@ chunk-3b87bmyq.js:3021-3668 placement
var CLIENT_STATES = (drawn, renderTree) => ({
  id: clientLogKey(drawn),
  plugin: drawn.plugin,
  module: drawn.module,
  element: drawn.key,
  drawing: surfaceClientInfo(drawn),
  requestId: drawn.requestId,
  clock: drawn.clock,
  props: drawn.props,
  handedProps: drawn.props,
  columns: 0,
  rows: 0,
  surface: undefined,
  snapshot: {
    status: "loading",
  },
  listeners: new Set(),
  held: [],
  holders: 1,
  dialogHolders: engineNodeWeight(drawn.component),
  rowSite: engineNodeWeight(drawn.component) === 0 ? drawn.component : undefined,
  drawnSite: undefined,
  isOverBudget: false,
  isDirty: false,
  isRendering: false,
  unpromptedRenders: 0,
  renderTimer: undefined,
  measurings: 0,
  frameOutcome: "unmeasured",
  isUnsettled: false,
  terminal: renderTree,
  selfDrawnTimer: undefined,
  renderedAt: renderTree,
  thrownAt: undefined,
  toldLast: undefined,
  isDestroyed: false,
  destroyTimer: undefined,
  mountGeneration: 0,
  heldIn: new Map(),
  environmentId: undefined,
});
//@ chunk-3b87bmyq.js:3668-3805 placement
var tellClientProblem = (client, finding, note) =>
  sayPlainCode({
    key: [`${client.plugin}#${client.environmentId}`, `Client ${client.module}`, finding].join(" "),
    lead: client.plugin,
    text: clientFailureText(client.plugin, client.module, note),
  });
//@ chunk-3b87bmyq.js:3805-4282 placement
var UNSETTLED_MEASURE_NOTES = {
  instance: `its region changed size on each of ${MAX_CLIENT_SETTLE_TRIES} measurings in one frame, so it is drawn as last measured; give the Client a height and a width, or draw no more than surface.rows and surface.columns`,
  frame: `the Clients on screen were measured again in ${MAX_CLIENT_MEASURE_TRIES} passes of one frame, this one in the next, so it is drawn as last measured; some change their region at every measuring: give each a height and a width, or draw no more than surface.rows and surface.columns`,
};
//@ chunk-3b87bmyq.js:4282-4324 placement
/**
 * 上报未结算
 */
var reportUnsettled = (client, reason) =>
  tellClientProblem(client, `unsettled ${reason}`, UNSETTLED_MEASURE_NOTES[reason]);
//@ chunk-3b87bmyq.js:4324-4412 placement
/**
 * 视口键
 */
function surfaceViewportKey() {
  let host = paneHostSlot.get();
  return [host?.columns, host?.rows, host?.conversationColumns].join("x");
}
//@ chunk-3b87bmyq.js:4412-4554 placement
function createFaultReporter(dispatch = desktopFaultDispatcher()) {
  return (request) =>
    void dispatch(request).catch((error) => {
      matcherLog().log(
        `ui.fault ${request.plugin}/${request.fault.element}: the chain threw (${errorMessage(error)})`,
        "warn",
      );
    });
}
//@ chunk-3b87bmyq.js:4554-4648 placement
/**
 * 客户端错误文本
 */
function clientErrorMessage(error, vmErrorDescriber) {
  let { name: errorName, message } = isVmError(error) ? error : vmErrorDescriber(error);
  return message.trim() !== "" ? message : errorName === "Error" ? DEFAULT_MODULE_FAILURE : errorName;
}
//@ chunk-3b87bmyq.js:4648-4752 placement
var UNHANDLED_SURFACE_REJECTION_TEXT = (reason) =>
  `Client: a promise a surface module did not return was rejected: ${reason}; the session goes on`;
//@ chunk-3b87bmyq.js:4752-5027 placement
var CLIENT_FAULT_TEXTS = ({ pluginName, environmentId, owns }) =>
  claimPendingWriteLine((value, promiseOrContext) => {
    if (![promiseOrContext, value].some((candidate) => !isUntrustedObject(candidate) && owns(candidate)))
      return;
    let text = UNHANDLED_SURFACE_REJECTION_TEXT(logLine(rejectionText(value)));
    try {
      tellOnce({
        key: `${pluginName}#${environmentId} Client rejection`,
        lead: pluginName,
        text,
      });
    } catch (error) {
      logForDebugging(`${pluginName}: the fault could not be said: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    return `${pluginName}: ${text}`;
  });
//@ chunk-3b87bmyq.js:5049-5107 placement
/**
 * 是否脚本超时
 */
var isScriptTimeout = (error) => isVmError(error) && getErrnoCode(error) === "ERR_SCRIPT_EXECUTION_TIMEOUT";
//@ chunk-3b87bmyq.js:5107-5119 placement
/**
 * 1000
 */
var CLIENT_TICK_MS = 1000;
//@ chunk-3b87bmyq.js:5119-5132 placement
/**
 * 60000
 */
var CLIENT_LOAD_TIMEOUT_MS = 60000;
//@ chunk-3b87bmyq.js:5132-5159 placement
/**
 * "__surface__.run()"
 */
var SURFACE_RUN_LABEL = "__surface__.run()";
//@ chunk-3b87bmyq.js:5159-5204 placement
/**
 * 客户端运行时
 */
var clientRuntime = (client, tick) => ({
  ...client,
  timers: new Map(),
  tick,
});
//@ chunk-3b87bmyq.js:5204-8648 placement
/**
 * 在隔离环境中加载插件的 surface 模块并建立客户端实例（约 3.4 KB）。
 */
async function loadSurfaceModule(args, bounds = {}) {
  let { pluginName, pluginRoot, environmentId, surfaceModules } = args;
  let isDisposed = false;
  let { sandbox, context } = newVmHostContext();
  let copyIn = inboundCopier(context);
  let freezeIn = (value) => deepFreezeInPlace(copyIn(value));
  let makers = runVmPrelude(context, pluginRoot);
  let vmInstanceofObject = createVmInstanceofObject(context);
  let vmErrorDescriber = createVmErrorDescriber(context);
  let { intoEnvironment } = createErrorConverters(vmErrorDescriber, makers, vmInstanceofObject);
  let runInVm = runInVmWithTrace(context, intoEnvironment);
  Object.assign(sandbox, {
    console: createVmConsole(runInVm, `[${pluginName}] surface`),
  });
  let surfaceRejectionHandler = CLIENT_FAULT_TEXTS({
    pluginName,
    environmentId,
    owns: vmInstanceofObject,
  });
  let instances = new Map();
  let instanceCounter = 0;
  let timerCounter = 0;
  function instanceOf(id) {
    let instance = instances.get(id);
    if (!instance) throw new HooksError(`${pluginName}: no client instance ${id}`);
    return instance;
  }
  function postData(id, text) {
    let instance = instanceOf(id);
    let prefix = `${pluginName}: Client ${instance.module}: post: the data`;
    if (text.length > MAX_TREE_TEXT_CHARS_2)
      throw new HooksError(
        `${prefix} serializes to ${text.length} characters, over the ${MAX_TREE_TEXT_CHARS_2} limit; not sent`,
      );
    let data = jsonParse(text);
    let dataProblem = checkPlainData(data);
    if (dataProblem !== undefined) throw new HooksError(`${prefix} ${dataProblem}; not sent`);
    instance.host.post(data);
  }
  function startTimer(id, intervalMs) {
    let instance = instanceOf(id);
    let timerId = ++timerCounter;
    instance.timers.set(
      timerId,
      instance.host.startTimer(intervalMs, () => {
        if (instances.get(id)?.timers.has(timerId) === true) instance.tick(timerId);
      }),
    );
    return timerId;
  }
  let bridge = freezeApiObject({
    schedule: nullPrototypeFunction(
      runInVm((id) => {
        instances.get(id)?.host.schedule();
      }),
    ),
    post: nullPrototypeFunction(runInVm(postData)),
    startTimer: nullPrototypeFunction(runInVm(startTimer)),
    stopTimer: nullPrototypeFunction(
      runInVm((id, timerId) => {
        let instance = instances.get(id);
        instance?.timers.get(timerId)?.();
        instance?.timers.delete(timerId);
      }),
    ),
    fault: nullPrototypeFunction(
      runInVm((id, reason) => {
        let instance = instances.get(id);
        if (instance === undefined) {
          logForDebugging(
            `${pluginName}: Client: a promise an instance since unmounted returned was rejected: ${logLine(reason)}`,
            {
              level: "warn",
            },
          );
          return;
        }
        instance.host.fault(
          new HooksError(
            `${pluginName}: Client ${instance.module}: a promise it returned was rejected: ${reason}`,
          ),
        );
      }),
    ),
  });
  let { mount, setProps, resize, stage, dropHeld, hasListener, unmount } = vmModule.runInContext(
    withUseStrict(DESKTOP_SURFACE_RUNTIME_SOURCE),
    context,
  )(bridge, freezeIn(surfaceLimits()));
  let runScript = new vmModule.Script(withUseStrict(SURFACE_RUN_LABEL), {
    filename: `${pluginName} surface`,
  });
  let budgetMs = bounds.budgetMs ?? CLIENT_TICK_MS;
  let timeoutOptions = timeoutOption(CLIENT_TICK_MS, bounds.budgetMs);
  let failureText = (error) =>
    isScriptTimeout(error)
      ? `ran longer than its ${budgetMs}ms budget`
      : clientErrorMessage(error, vmErrorDescriber);
  let failWith = (moduleName, error) =>
    new HooksError(`${pluginName}: Client ${moduleName}: ${failureText(error)}`);
  function runStage(runtime, stageData, data) {
    if (isDisposed) throw envUnloadedError(pluginName);
    stage(runtime.id, stageData, data === undefined ? undefined : freezeIn(data));
    try {
      return runScript.runInContext(context, timeoutOptions);
    } catch (error) {
      throw failWith(runtime.module, error);
    }
  }
  let linker = linkHooksModule({
    args: {
      pluginName,
      pluginRoot,
      linked: surfaceModules.flatMap((surfaceModule) => surfaceModule.linked),
      links: surfaceModules.flatMap((surfaceModule) => surfaceModule.links),
    },
    context,
    isScanned: true,
    stamped: (fn) => fn(),
    evaluateOptions: timeoutOptions,
  });
  let readyMs = bounds.readyMs ?? HOOKS_READY_TIMEOUT_MS;
  let modules = new Map();
  for (let surfaceModule of surfaceModules)
    modules.set(surfaceModule.module, await loadModule(surfaceModule));
  async function loadModule(surfaceModule) {
    try {
      let exported = await withTimeout(
        linker.load(surfaceModule.modulePath, surfaceModule.source),
        readyMs,
        `its top level did not settle in ${readyMs}ms`,
      );
      return {
        component: surfaceModule.component,
        exports: exported,
      };
    } catch (error) {
      return {
        error: new HooksError(
          `${pluginName}: Client ${surfaceModule.module}: the surface module did not load: ${failureText(error)}`,
        ),
      };
    }
  }
  function unmountInstance(runtime) {
    if (!instances.delete(runtime.id)) return;
    for (let timer of runtime.timers.values()) timer();
    runtime.timers.clear();
    if (!isDisposed) unmount(runtime.id);
  }
  function componentOf(modulePath) {
    let loaded = modules.get(modulePath);
    if (!loaded) {
      let loadedList = [...modules.keys()].join(", ") || "none";
      throw new HooksError(
        `${pluginName}: Client ${modulePath}: the plugin loaded no surface module at that path (it loaded ${loadedList})`,
      );
    }
    if ("error" in loaded) throw loaded.error;
    let { component, exports: surfaceExports } = loaded;
    let componentFn = Object.hasOwn(surfaceExports, component) && surfaceExports[component];
    if (typeof componentFn !== "function")
      throw new HooksError(
        `${pluginName}: Client ${modulePath}: its export ${component} is not a function (props, surface) => tree`,
      );
    return componentFn;
  }
  function unlessDisposed(fn) {
    if (!isDisposed) fn();
  }
  function mountInstance(request) {
    let { props, host } = request;
    if (isDisposed) throw envUnloadedError(pluginName);
    let component = componentOf(request.module);
    let id = ++instanceCounter;
    let runtime = clientRuntime(
      {
        id,
        module: request.module,
        host,
      },
      (stage) => {
        runStage(runtime, "tick", stage);
      },
    );
    instances.set(id, runtime);
    mount(id, component, freezeIn(props));
    return {
      id,
      render: () => {
        let treeJson = runStage(runtime, "render");
        if (typeof treeJson !== "string")
          throw failWith(request.module, Error("the module returned no tree"));
        return treeJson;
      },
      setProps: (props) => unlessDisposed(() => setProps(id, freezeIn(props))),
      resize: (columns, rows) => unlessDisposed(() => resize(id, columns, rows)),
      pointer: (event) => {
        runStage(runtime, "pointer", event);
      },
      key: (event) => {
        runStage(runtime, "key", event);
      },
      runHeld: (handle, event) => {
        runStage(runtime, "held", {
          handle,
          event,
        });
      },
      dropHeld: (handles) => unlessDisposed(() => dropHeld(id, freezeIn(handles))),
      hasPointerListener: () => !isDisposed && hasListener(id, "pointer"),
      hasKeyListener: () => !isDisposed && hasListener(id, "key"),
      unmount: () => unmountInstance(runtime),
    };
  }
  return {
    pluginName,
    environmentId,
    mount: mountInstance,
    dispose() {
      if (isDisposed) return;
      for (let runtime of [...instances.values()]) unmountInstance(runtime);
      setTimeout(surfaceRejectionHandler, CLIENT_LOAD_TIMEOUT_MS).unref();
      isDisposed = true;
    },
    isDisposed: () => isDisposed,
  };
}
//@ chunk-3b87bmyq.js:8648-8706 placement
/**
 * 加载中的环境
 */
var loadingEnv = (environmentId, loading) => ({
  environmentId,
  loading,
  loaded: undefined,
});
//@ chunk-3b87bmyq.js:8706-8741 placement
/**
 * 界面宿主槽
 */
var surfaceHostSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3b87bmyq.js:8706", () => {
  surfaceHostSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-3b87bmyq.js:8741-9991 placement
function createSurfaceEnvironmentPool() {
  let environmentsByPlugin = new Map();
  let signal = createSignal();
  let unsubscribe;
  function disposeEnv(pluginName, entry) {
    if (environmentsByPlugin.get(pluginName) === entry) environmentsByPlugin.delete(pluginName);
    entry.loading.then(
      (surfaceModule) => {
        surfaceModule.dispose();
        heldRunners.forget(pluginName);
        logForDebugging(`surface environment of ${pluginName} (environment ${entry.environmentId}) disposed`);
      },
      () => {},
    );
    queueMicrotask(() => signal.emit(pluginName));
  }
  function sweep() {
    let liveEnvironmentIds = new Map(
      getPluginRegistry()
        .loadedModules.filter(isModuleAdmitted)
        .map((loadedModule) => [loadedModule.name, loadedModule.environmentId]),
    );
    for (let [pluginName, entry] of [...environmentsByPlugin])
      if (liveEnvironmentIds.get(pluginName) !== entry.environmentId) disposeEnv(pluginName, entry);
  }
  function environmentFor(pluginName) {
    let loadedModule = findLoadedModule(pluginName);
    if (!loadedModule)
      return Promise.reject(new HooksError(`${pluginName}: Client: the plugin is not loaded`));
    let cached = environmentsByPlugin.get(pluginName);
    if (cached?.environmentId === loadedModule.environmentId) return cached.loading;
    if (cached) disposeEnv(pluginName, cached);
    let { surfaceModules, pluginRoot } = loadedModule.args;
    if (!surfaceModules || surfaceModules.length === 0)
      return Promise.reject(
        new HooksError(
          `${pluginName}: Client: the plugin loaded no surface module (its hooks module builds no Client from a literal path), so nothing can draw its Clients`,
        ),
      );
    let host = surfaceHostSlot.get();
    let { environmentId } = loadedModule;
    let entry = loadingEnv(
      environmentId,
      loadSurfaceModule(
        {
          pluginName,
          pluginRoot,
          environmentId,
          surfaceModules,
        },
        host === undefined
          ? {}
          : {
              budgetMs: host,
            },
      ).then((surfaceModule) => {
        entry.loaded = surfaceModule;
        logForDebugging(
          `surface environment of ${pluginName} (environment ${environmentId}) loaded ` +
            surfaceModules.map((surfaceModule) => surfaceModule.module).join(", "),
        );
        return surfaceModule;
      }),
    );
    environmentsByPlugin.set(pluginName, entry);
    return entry.loading;
  }
  return {
    environmentFor(pluginName) {
      unsubscribe ??= subscribe_2(sweep);
      return environmentFor(pluginName);
    },
    sweep,
    onDisposed: signal.subscribe,
    disposeAll() {
      for (let [pluginName, entry] of [...environmentsByPlugin]) disposeEnv(pluginName, entry);
      unsubscribe?.();
      unsubscribe = undefined;
    },
    count: () => environmentsByPlugin.size,
  };
}
//@ chunk-3b87bmyq.js:9991-10003 placement
/**
 * 界面环境池
 */
var surfaceEnvPool; // deferred: uses createSurfaceEnvironmentPool of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3b87bmyq.js:9991", () => {
  surfaceEnvPool = createSurfaceEnvironmentPool();
});
//@ chunk-3b87bmyq.js:10003-17473 placement
/**
 * 管理 surface 客户端：测量、重绘稳定性检测、异常上报（约 7.5 KB）。
 */
function createSurfaceClientHost(options = {}) {
  let environments = options.environments ?? surfaceEnvPool;
  let port = options.port ?? uiMessagePort;
  let raiseFault = options.raiseFault ?? createFaultReporter();
  let clients = new Map();
  let cleanups;
  let frameMeasureTries = 0;
  let isFrameLaidOut = false;
  let settleTimer;
  function notify(client, snapshot) {
    client.snapshot = snapshot;
    for (let listener of client.listeners) listener();
  }
  function releaseHandles(client) {
    releaseHeld(client, client.held);
    client.held = [];
  }
  function unmountClient(client) {
    client.mountGeneration += 1;
    resetUnpromptedRenders(client);
    client.isDirty = false;
    client.isOverBudget = false;
    client.thrownAt = undefined;
    client.drawnSite = undefined;
    surfaceRowLedger.dropClient(clientSiteOf(client));
    if (client.renderTimer) {
      clearImmediate(client.renderTimer);
      client.renderTimer = undefined;
    }
    clearImmediate(client.selfDrawnTimer);
    clearSelfDrawnTimer(client);
    client.measurings = 0;
    client.frameOutcome = "unmeasured";
    client.isUnsettled = false;
    moveToCloudTrash.holdDrawing(client.plugin, client.drawing, []);
    releaseHandles(client);
    client.surface?.unmount();
    client.surface = undefined;
    port.cancel(client.id);
    clearFocusedClient(client.id);
  }
  function reportFailure(client, reason, note) {
    let reasonText = clientFailureText(client.plugin, client.module, reason);
    let message = `${client.plugin}: ${reasonText}`;
    matcherLog().log(`${message}; ${note}`, "warn");
    reportPluginProblem(client.plugin, reasonText, client.toldLast === reasonText ? "once" : "again");
    client.toldLast = reasonText;
    return message;
  }
  function failClient(client, error, phase) {
    let reason = errorMessage(error);
    let text = reportFailure(client, reason, "the instance unmounted");
    let previousSites = new Map(client.heldIn);
    unmountClient(client);
    notify(client, {
      status: "failed",
      text,
    });
    raiseFault(
      toUiFaultEvent(clientKeyOf(client), client.drawing.surface, {
        phase,
        reason,
        sites: () =>
          [...client.heldIn.values()]
            .filter((site) => site.holders > 0)
            .map((entry) => ({
              site: entry.site,
              bornAt: (previousSites.get(entry.site.component) ?? entry).bornAt,
            })),
      }),
    );
  }
  let thrownKeyOf = (client, viewport) =>
    `${viewport} ${stableStringifySafe({
      props: client.handedProps,
    })}`;
  function guard(client, run) {
    if (!client.surface || client.isDestroyed) return;
    try {
      run();
    } catch (error) {
      failClient(client, error, "run");
    }
  }
  function renderClient(client, surface) {
    let handles = [];
    let codeFindings = [];
    let linkFindings = [];
    let rows = 0;
    let rowsMax = 0;
    try {
      let element = toClientTree(client.plugin, surface.render(), (environmentHandle) => {
        let surfaceHandle = heldRunners.hold(client.plugin, (handler) => {
          resetUnpromptedRenders(client);
          guard(client, () => surface.runHeld(environmentHandle, handler));
        });
        handles.push({
          surfaceHandle,
          environmentHandle,
        });
        return surfaceHandle;
      });
      let treeProblem = validateTree(element, undefined, {
        surface: client.drawing.surface,
        within: drawnComponentOf(client),
        measured: (measuredRows, measuredMax) => {
          rows = measuredRows;
          rowsMax = measuredMax;
        },
      });
      if (treeProblem !== undefined)
        throw new HooksError(`returned a tree that does not validate (${treeProblem})`);
      return [
        withPlainLinks(
          withPlainCode(
            withKnownBorders(element, (borderStyle) =>
              tellClientProblem(client, "borderStyle", unknownBorderNote(borderStyle)),
            ),
            (codeFinding) => {
              codeFindings.push(codeFinding);
            },
          ),
          client.drawing.surface,
          (linkFinding) => {
            linkFindings.push(linkFinding);
          },
        ),
        handles,
        rows,
        codeFindings,
        linkFindings,
        rowsMax,
      ];
    } catch (error) {
      releaseHeld(client, handles);
      throw error;
    }
  }
  function releaseHeld(client, held) {
    heldRunners.release(
      client.plugin,
      held.map((held) => held.surfaceHandle),
    );
    client.surface?.dropHeld(held.map((held) => held.environmentHandle));
  }
  function drawClient(client) {
    let { surface } = client;
    if (!surface || client.isDestroyed) return;
    client.isDirty = false;
    client.isRendering = true;
    client.renderedAt = surfaceViewportKey();
    let rendered;
    try {
      rendered = renderClient(client, surface);
    } catch (error) {
      failClient(client, error, "render");
      return;
    } finally {
      client.isRendering = false;
    }
    let [tree, held, rows, codeFindings, linkFindings, rowsMax] = rendered;
    let isDialog = drawnComponentOf(client) === ONE_ENGINE_NODE_COMPONENT;
    if (isDialog && !surfaceRowLedger.fits(clientSiteOf(client), rows, rowsMax)) {
      client.isOverBudget = true;
      releaseHeld(client, held);
      reportFailure(
        client,
        `returned a tree of ${rows} rows that, with the tree around the dialog and its other Clients, passes ${rowsMax}`,
        "the frame before it kept",
      );
      return;
    }
    client.isOverBudget = false;
    let held_2 = client.held;
    client.held = held;
    let tree_2 = hostDrawnPresses(tree, client.drawing);
    releaseHeld(client, held_2);
    client.drawnSite = drawnComponentOf(client);
    notify(client, {
      status: "drawn",
      tree: tree_2,
    });
    for (let codeFinding of codeFindings)
      tellClientProblem(client, plainCodeFinding(codeFinding), plainCodeNote(codeFinding));
    for (let linkFinding of linkFindings)
      tellClientProblem(
        client,
        `${client.drawing.surface} ${plainLinkFinding(linkFinding)}`,
        plainLinkNote(linkFinding),
      );
    if (isDialog) surfaceRowLedger.recordClient(clientSiteOf(client), rows);
  }
  function redrawOverBudget(request) {
    for (let client of clients.values())
      if (
        client.isOverBudget &&
        client.requestId === request.requestId &&
        client.drawing.surface === request.surface &&
        !client.isDirty &&
        !client.isDestroyed &&
        client.surface !== undefined
      ) {
        client.isDirty = true;
        client.unpromptedRenders = 0;
        client.renderTimer = setImmediate(runRedraw, client);
      }
  }
  let clientSiteOf = (client) => ({
    requestId: client.requestId,
    surface: client.drawing.surface,
    plugin: client.plugin,
    key: client.element,
  });
  function scheduleRedraw(client) {
    if (client.isDirty || client.isDestroyed || !client.surface) return;
    if (client.unpromptedRenders >= MAX_CLIENT_REDRAW_TRIES) {
      let error = new HooksError(
        `set its state again after each of ${client.unpromptedRenders} renders, nothing heard between; set state on a pointer or key event, a tick, a press or new props, and let a render settle`,
      );
      if (client.isRendering) throw error;
      failClient(client, error, "run");
      return;
    }
    client.isDirty = true;
    client.renderTimer = setImmediate(runRedraw, client);
  }
  function runRedraw(client) {
    client.renderTimer = undefined;
    if (client.isDirty) {
      client.unpromptedRenders += 1;
      clearImmediate(client.selfDrawnTimer);
      client.selfDrawnTimer = setImmediate(clearSelfDrawnTimer, client);
      drawClient(client);
    }
  }
  function resetUnpromptedRenders(client) {
    for (let eachClient of clients.values())
      if (eachClient.plugin === client.plugin) eachClient.unpromptedRenders = 0;
  }
  function postToSurface(client, data) {
    let mountGeneration = client.mountGeneration;
    port.post(client.id, toUiMessageEvent(clientKeyOf(client), client.drawing.surface, data), (answer) => {
      if (answer.props !== undefined && !client.isDestroyed && client.mountGeneration === mountGeneration)
        setClientProps(client, answer.props);
    });
  }
  function mountClient(client, environment) {
    if (client.isDestroyed || client.surface) return;
    if (client.thrownAt !== undefined) {
      if (client.thrownAt === thrownKeyOf(client, surfaceViewportKey())) return;
      client.thrownAt = undefined;
      client.props = client.handedProps;
      for (let [siteKey, entry] of client.heldIn)
        if (entry.holders > 0)
          client.heldIn.set(siteKey, {
            ...entry,
            bornAt: currentVersion(entry.site),
          });
    }
    try {
      client.environmentId = environment.environmentId;
      client.surface = environment.mount({
        module: client.module,
        props: client.props,
        host: {
          schedule: () => scheduleRedraw(client),
          post: (data) => postToSurface(client, data),
          startTimer: (intervalMs, tick) =>
            client.clock.every(intervalMs, () => {
              resetUnpromptedRenders(client);
              guard(client, tick);
            }),
          fault: (error) =>
            guard(client, () => {
              throw error;
            }),
        },
      });
      client.surface.resize(client.columns, client.rows);
    } catch (error) {
      failClient(client, error, "load");
      return;
    }
    drawClient(client);
  }
  function remountClient(client) {
    client.mountGeneration += 1;
    let mountGeneration = client.mountGeneration;
    let isCurrent = () => client.mountGeneration === mountGeneration && !client.isDestroyed;
    environments.environmentFor(client.plugin).then(
      (environment) => {
        if (isCurrent()) mountClient(client, environment);
      },
      (error) => {
        if (isCurrent()) failClient(client, error, "load");
      },
    );
  }
  function setClientProps(client, props) {
    if (stableStringifySafe(props) === stableStringifySafe(client.props)) return;
    client.props = props;
    resetUnpromptedRenders(client);
    guard(client, () => {
      client.surface?.setProps(props);
    });
    drawClient(client);
  }
  function applyProps(client, props) {
    client.handedProps = props;
    setClientProps(client, props);
  }
  function destroyClient(client) {
    if (client.isDestroyed) return;
    client.isDestroyed = true;
    clearTimeout(client.destroyTimer);
    unmountClient(client);
    if (clients.get(client.id) === client) clients.delete(client.id);
  }
  function resetFrameMeasures() {
    settleTimer = undefined;
    frameMeasureTries = 0;
    for (let client of clients.values()) {
      client.isUnsettled &&= client.frameOutcome !== "measured";
      client.measurings = 0;
      client.frameOutcome = "unmeasured";
    }
  }
  function settleReason(client) {
    let hitInstanceLimit = client.measurings >= (client.isUnsettled ? 1 : MAX_CLIENT_SETTLE_TRIES);
    let hitFrameLimit = client.measurings > 0 && frameMeasureTries > MAX_CLIENT_MEASURE_TRIES;
    return hitInstanceLimit ? "instance" : hitFrameLimit ? "frame" : undefined;
  }
  function markUnsettled(client, reason) {
    client.frameOutcome = "passed over";
    client.surface?.resize(client.columns, client.rows);
    if (!client.isUnsettled) {
      client.isUnsettled = true;
      reportUnsettled(client, reason);
    }
  }
  function clearSelfDrawnTimer(client) {
    client.selfDrawnTimer = undefined;
  }
  function destroyIfUnheld(client) {
    if (client.holders === 0) destroyClient(client);
  }
  function resizeClient(client, size) {
    if (size.columns === client.columns && size.rows === client.rows) return;
    let viewportKey = surfaceViewportKey();
    let hasViewportMoved = viewportKey !== client.terminal;
    let isFrameRemeasure = isFrameLaidOut && !hasViewportMoved && client.measurings > 0;
    client.terminal = viewportKey;
    client.columns = size.columns;
    client.rows = size.rows;
    if (isFrameRemeasure) {
      frameMeasureTries += 1;
      isFrameLaidOut = false;
    }
    let settle = hasViewportMoved ? undefined : settleReason(client);
    if (settle !== undefined) {
      markUnsettled(client, settle);
      return;
    }
    if (!hasViewportMoved) client.measurings += 1;
    if (client.frameOutcome === "unmeasured") client.frameOutcome = "measured";
    settleTimer ??= setImmediate(resetFrameMeasures);
    if (hasViewportMoved || client.selfDrawnTimer === undefined) resetUnpromptedRenders(client);
    if (client.surface) {
      client.surface.resize(size.columns, size.rows);
      drawClient(client);
    }
  }
  function releaseHolder(client, component) {
    holdSite(client, component, -1);
    client.holders = Math.max(0, client.holders - 1);
    client.dialogHolders = Math.max(0, client.dialogHolders - engineNodeWeight(component));
    if (client.holders === 0 && !client.isDestroyed) {
      clearTimeout(client.destroyTimer);
      client.destroyTimer = setTimeout(destroyIfUnheld, 0, client);
    } else if (!isSettledSite(client)) redrawClient(client);
  }
  function isSettledSite(client) {
    return client.surface === undefined || client.drawnSite === drawnComponentOf(client);
  }
  function redrawClient(client) {
    resetUnpromptedRenders(client);
    surfaceRowLedger.dropClient(clientSiteOf(client));
    client.drawnSite = undefined;
    if (client.snapshot.status === "drawn")
      notify(client, {
        status: "loading",
      });
    drawClient(client);
  }
  function holdSite(client, component, delta) {
    let held = client.heldIn.get(component) ?? createClientSite(client, component);
    client.heldIn.set(component, {
      ...held,
      holders: Math.max(0, held.holders + delta),
    });
  }
  function drawnComponentOf(client) {
    return client.dialogHolders > 0
      ? ONE_ENGINE_NODE_COMPONENT
      : (client.rowSite ?? client.drawing.component);
  }
  let clientHandle = (client, component) => ({
    id: client.id,
    plugin: client.plugin,
    module: client.module,
    subscribe: (listener) => {
      client.listeners.add(listener);
      return () => client.listeners.delete(listener);
    },
    getSnapshot: () => client.snapshot,
    setProps: (props) => applyProps(client, props),
    laidOut: () => {
      isFrameLaidOut = true;
    },
    resize: (columns, rows) =>
      resizeClient(client, {
        columns,
        rows,
      }),
    pointer: (event) => {
      resetUnpromptedRenders(client);
      guard(client, () => client.surface?.pointer(event));
    },
    key: (event) => {
      resetUnpromptedRenders(client);
      guard(client, () => client.surface?.key(event));
    },
    acceptsPointer: () => client.surface?.hasPointerListener() === true,
    acceptsKeys: () => client.surface?.hasKeyListener() === true,
    threw: (error) => {
      if (client.surface === undefined || client.isDestroyed) return;
      failClient(client, error, "render");
      client.thrownAt = thrownKeyOf(client, client.renderedAt);
    },
    drawnAgain: () =>
      client.thrownAt !== undefined &&
      client.thrownAt !== thrownKeyOf(client, surfaceViewportKey()) &&
      client.holders > 0
        ? remountClient(client)
        : undefined,
    release: () => releaseHolder(client, component),
  });
  function remountPlugin(pluginName) {
    for (let client of clients.values()) {
      if (client.plugin !== pluginName || client.isDestroyed) continue;
      unmountClient(client);
      client.toldLast = undefined;
      notify(client, {
        status: "loading",
      });
      if (client.holders > 0) remountClient(client);
    }
  }
  function reuseClient(client, request) {
    clearTimeout(client.destroyTimer);
    client.destroyTimer = undefined;
    client.holders += 1;
    holdSite(client, request.component, 1);
    client.clock = request.clock;
    let weight = engineNodeWeight(request.component);
    client.dialogHolders += weight;
    client.rowSite = weight === 0 ? request.component : client.rowSite;
    if (isSettledSite(client)) applyProps(client, request.props);
    else {
      client.handedProps = request.props;
      client.props = request.props;
      guard(client, () => {
        client.surface?.setProps(request.props);
      });
      redrawClient(client);
    }
    return clientHandle(client, request.component);
  }
  return {
    acquire(request) {
      cleanups ??= [environments.onDisposed(remountPlugin), surfaceRowLedger.onFreed(redrawOverBudget)];
      let existing = clients.get(clientLogKey(request));
      if (existing !== undefined && !existing.isDestroyed && existing.module === request.module)
        return reuseClient(existing, request);
      if (existing) destroyClient(existing);
      let client = CLIENT_STATES(request, surfaceViewportKey());
      clients.set(client.id, client);
      holdSite(client, request.component, 1);
      remountClient(client);
      return clientHandle(client, request.component);
    },
    remountPlugin,
    count: () => clients.size,
    dispose() {
      for (let cleanup of cleanups ?? []) cleanup();
      cleanups = undefined;
      clearImmediate(settleTimer);
      resetFrameMeasures();
      for (let client of clients.values()) {
        clearImmediate(client.selfDrawnTimer);
        clearSelfDrawnTimer(client);
      }
    },
  };
}
//@ chunk-3b87bmyq.js:17473-17487 placement
/**
 * 界面客户端宿主
 */
var surfaceClientHost; // deferred: uses createSurfaceClientHost of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3b87bmyq.js:17473", () => {
  surfaceClientHost = createSurfaceClientHost();
});
export {
  focusStore,
  setFocusedClient,
  createSurfaceClientHost,
  clientSurfaceKey,
  createUiMessagePort,
  clearFocusedClient,
  surfaceClientHost,
};
