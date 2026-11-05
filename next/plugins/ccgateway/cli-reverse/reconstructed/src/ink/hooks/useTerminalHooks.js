/**
 * ink/hooks/useTerminalHooks.ts
 *
 * 2.1.316 新增：终端相关钩子与渲染入口（useTimeout、useTabStatus、render、createRoot）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-18rrbwq1.js (2), chunk-czq1j3j2.js (1), chunk-emhzq435.js (10), chunk-q9vyeahf.js (1)
 * attribution: placement 14
 */
import {
  useContext,
  useRef,
  useMemo,
  useSyncExternalStore,
  createElement,
  init_react_production,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { clockContext, defaultSetTimeout, noopClock } from "../components/ClockContext.js";
import { RenderModeProvider, FrameRegistryProvider } from "../renderModeContext.js";
import { ThemeProvider, StorageCredentialsProvider } from "../../components/design-system/ThemeProvider.js";
import { KillRingProvider } from "../../utils/killRing.js";
import { isNativeCursorEnabled } from "../nativeCursor.js";
import { atlasResetConfig } from "../renderTelemetry.js";
import { sessionServicesFor } from "../../utils/secureStorage/credentialsFileStore.js";
import { wrappedRender, createRootAsync } from "../root.js";
import { getSecondRootError } from "../terminal.js";
import { TerminalWriteContext } from "../useTerminalNotification.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import {
  osc,
  OSC,
  isTabStatusEnabled,
  wrapForMultiplexer,
  CLEAR_TAB_STATUS,
  tabStatus,
} from "../termio/osc.js";
import { TAB_STATUS_PRESETS } from "./use-tab-status.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-emhzq435.js:26962-26976 placement
/**
 * 恒 false 的选择器
 */
var alwaysFalse_2 = () => false;
//@ chunk-emhzq435.js:26976-27308 placement
function useTimeout(first, second, extraDeps) {
  let clock = useContext(clockContext);
  let isCallback = typeof first === "function";
  let callback = isCallback ? first : null;
  let delayMs = isCallback ? second : first;
  let callbackArg = isCallback ? undefined : second;
  let callbackRef = useRef(callback);
  callbackRef.current = callback;
  let timerRef = useRef(null);
  let setTimeoutFn = clock?.setTimeout ?? defaultSetTimeout;
  let schedule = useMemo(() => {
    if (delayMs === null) return noopClock;
    let tick = (done) => {
      timerRef.current = null;
      done();
      return setTimeoutFn(() => {
        timerRef.current = tick;
        if (isCallback) callbackRef.current?.();
        else done();
      }, delayMs);
    };
    return tick;
  }, [setTimeoutFn, delayMs, isCallback, callbackArg, ...(extraDeps ?? [])]);
  let isPending = useSyncExternalStore(
    schedule,
    isCallback ? alwaysFalse_2 : () => timerRef.current === schedule,
  );
  if (!isCallback) return isPending;
}
//@ chunk-emhzq435.js:27308-27412 placement (2.1.88 match: measureElement, 1)
/**
 * 读元素 yoga 计算后的宽高。
 */
var measureElement_2 = (node) => ({
  width: node.yogaNode?.getComputedWidth() ?? 0,
  height: node.yogaNode?.getComputedHeight() ?? 0,
});
var measureElement = measureElement_2;
//@ chunk-emhzq435.js:27412-27533 placement (2.1.88 match: siblingSharesY, 0.858)
function topWithin(node, ancestor) {
  let top = 0;
  let cur = node;
  while (cur !== undefined && cur !== ancestor) {
    top += cur.yogaNode?.getComputedTop() ?? 0;
    cur = cur.parentNode;
  }
  return cur === ancestor ? top : -1;
}
//@ chunk-emhzq435.js:27533-27654 placement
function wrapWithAppProviders(node, storage) {
  let children = createElement(
    RenderModeProvider,
    null,
    createElement(
      ThemeProvider,
      null,
      createElement(KillRingProvider, null, createElement(FrameRegistryProvider, null, node)),
    ),
  );
  return storage !== undefined
    ? createElement(StorageCredentialsProvider, {
        ...storage,
        children,
      })
    : children;
}
//@ chunk-emhzq435.js:27654-27713 placement
/**
 * 默认渲染选项：是否使用原生光标（native cursor 开关）与样式图集记录器。
 */
function getDefaultRenderOptions() {
  return {
    nativeCursor: isNativeCursorEnabled(),
    atlasRecorder: atlasResetConfig(),
  };
}
//@ chunk-emhzq435.js:27713-27872 placement
/**
 * 应用入口的 render：给根元素包上主题等 Provider 后交给 Ink 渲染；第二个参数可以是 stdout 流或选项。
 */
async function render(node, optionsOrStdout, extra) {
  let storage = extra?.storageV5 !== undefined ? sessionServicesFor(extra.storageV5) : undefined;
  if (optionsOrStdout !== undefined && "write" in optionsOrStdout)
    return wrappedRender(wrapWithAppProviders(node, storage), optionsOrStdout);
  return wrappedRender(wrapWithAppProviders(node, storage), {
    ...getDefaultRenderOptions(),
    ...optionsOrStdout,
  });
}
//@ chunk-emhzq435.js:27872-27891 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-emhzq435.js:27872", () => {
  weakMap = new WeakMap();
});
//@ chunk-emhzq435.js:27891-28097 placement
async function createRoot(baseRenderOptions, options) {
  let root = await createRootAsync({
    ...getDefaultRenderOptions(),
    ...baseRenderOptions,
  });
  let storage = options?.storageV5 !== undefined ? sessionServicesFor(options.storageV5) : undefined;
  let rootWithProviders = {
    ...root,
    render: (node) => root.render(wrapWithAppProviders(node, storage)),
  };
  let ink = getSecondRootError().get(baseRenderOptions?.stdout ?? process.stdout);
  if (ink) weakMap.set(ink, rootWithProviders);
  return rootWithProviders;
}
//@ chunk-emhzq435.js:28097-28166 placement
function rootOf(stdout = process.stdout) {
  let ink = getSecondRootError().get(stdout);
  return ink && weakMap.get(ink);
}
//@ chunk-q9vyeahf.js:271-275 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-q9vyeahf.js:271", () => {
  init_react_production();
});
//@ chunk-18rrbwq1.js:20277-20387 placement (2.1.88 match: CLEAR_TERMINAL_TITLE, 1)
/**
 * 标题变化时用 OSC 0 设置终端窗口/标签标题（先去掉转义字符）；title 为 null 不写。
 */
function useTerminalTitle(title) {
  let writeRaw = useContext(TerminalWriteContext);
  useEffect(() => {
    if (title === null || !writeRaw) return;
    let cleanTitle = stripAnsi(title);
    writeRaw(osc(OSC.SET_TITLE_AND_ICON, cleanTitle));
  }, [title, writeRaw]);
}
//@ chunk-18rrbwq1.js:47779-47783 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18rrbwq1.js:47779", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1465320-1465562 placement (2.1.88 match: IDLE_SPECULATION_STATE, 1)
/**
 * 把会话状态写到终端标签页（OSC 21337 标签状态，经 tmux/screen 透传）；kind 为 null 时清除；终端不支持时不写。
 */
function IDLE_SPECULATION_STATE(kind, idleText) {
  let writeRaw = useContext(TerminalWriteContext);
  let kindRef = useRef(null);
  useEffect(() => {
    if (kind === null) {
      if (kindRef.current !== null && writeRaw && isTabStatusEnabled())
        writeRaw(wrapForMultiplexer(CLEAR_TAB_STATUS));
      kindRef.current = null;
      return;
    }
    kindRef.current = kind;
    if (!writeRaw || !isTabStatusEnabled()) return;
    let preset = TAB_STATUS_PRESETS[kind];
    let fields =
      kind === "idle" && idleText !== undefined
        ? {
            ...preset,
            status: idleText,
          }
        : preset;
    writeRaw(wrapForMultiplexer(tabStatus(fields)));
  }, [kind, idleText, writeRaw]);
}
export {
  measureElement,
  render,
  useTimeout,
  topWithin,
  createRoot,
  useTerminalTitle,
  rootOf,
  IDLE_SPECULATION_STATE,
};
