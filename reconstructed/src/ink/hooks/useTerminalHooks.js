/**
 * ink/hooks/useTerminalHooks.ts
 *
 * 2.1.316 新增：终端相关钩子与渲染入口（useTimeout、useTabStatus、render、createRoot）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x6v6jz2y.js (14)
 * attribution: placement 14
 */
import { Se, R, P, init_react_production, Q, yt, Vc } from "../../../vendor/react/cjs/react.production.js";
import { TerminalWriteContext } from "../useTerminalNotification.js";
import {
  isTabStatusEnabled,
  wrapForMultiplexer,
  CLEAR_TAB_STATUS,
  tabStatus,
  osc,
  OSC,
} from "../termio/osc.js";
import { TAB_STATUS_PRESETS } from "./use-tab-status.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { clockContext, defaultSetTimeout, noopClock } from "../components/ClockContext.js";
import { RenderModeProvider, FrameRegistryProvider } from "../renderModeContext.js";
import { ThemeProvider, StorageCredentialsProvider } from "../../components/design-system/ThemeProvider.js";
import { KillRingProvider } from "../../utils/killRing.js";
import { isNativeCursorEnabled } from "../nativeCursor.js";
import { atlasResetConfig } from "../renderTelemetry.js";
import { sessionServicesFor } from "../../utils/secureStorage/credentialsFileStore.js";
import { wrappedRender, createRootAsync } from "../root.js";
import { getSecondRootError } from "../terminal.js";

//@ chunk-x6v6jz2y.js:27473-27709 placement = IDLE_SPECULATION_STATE (1)
/**
 * 把会话状态写到终端标签页（OSC 21337 标签状态，经 tmux/screen 透传）；kind 为 null 时清除；终端不支持时不写。
 */
function useTabStatus(kind, idleText) {
  let l = Se(TerminalWriteContext);
  let kindRef = R(null);
  P(() => {
    if (kind === null) {
      if (kindRef.current !== null && l && isTabStatusEnabled()) l(wrapForMultiplexer(CLEAR_TAB_STATUS));
      kindRef.current = null;
      return;
    }
    kindRef.current = kind;
    if (!l || !isTabStatusEnabled()) return;
    let d = TAB_STATUS_PRESETS[kind];
    let fields =
      kind === "idle" && idleText !== undefined
        ? {
            ...d,
            status: idleText,
          }
        : d;
    l(wrapForMultiplexer(tabStatus(fields)));
  }, [kind, idleText, l]);
}
//@ chunk-x6v6jz2y.js:27709-27713 placement
init_react_production();
//@ chunk-x6v6jz2y.js:27713-27823 placement = CLEAR_TERMINAL_TITLE (1)
/**
 * 标题变化时用 OSC 0 设置终端窗口/标签标题（先去掉转义字符）；title 为 null 不写。
 */
function useTerminalTitle(title) {
  let writeRaw = Se(TerminalWriteContext);
  P(() => {
    if (title === null || !writeRaw) return;
    let l = stripAnsi(title);
    writeRaw(osc(OSC.SET_TITLE_AND_ICON, l));
  }, [title, writeRaw]);
}
//@ chunk-x6v6jz2y.js:27823-27827 placement
init_react_production();
//@ chunk-x6v6jz2y.js:27827-27841 placement
/**
 * 恒 false 的选择器
 */
var alwaysFalse_2 = () => false;
//@ chunk-x6v6jz2y.js:27841-28173 placement
function useTimeout(o, r, l) {
  let u = Se(clockContext);
  let d = typeof o === "function";
  let p = d ? o : null;
  let m = d ? r : o;
  let b = d ? undefined : r;
  let C = R(p);
  C.current = p;
  let h = R(null);
  let k = u?.setTimeout ?? defaultSetTimeout;
  let x = Q(() => {
    if (m === null) return noopClock;
    let A = (T) => {
      h.current = null;
      T();
      return k(() => {
        h.current = A;
        if (d) C.current?.();
        else T();
      }, m);
    };
    return A;
  }, [k, m, d, b, ...(l ?? [])]);
  let E = yt(x, d ? alwaysFalse_2 : () => h.current === x);
  if (!d) return E;
}
//@ chunk-x6v6jz2y.js:28173-28277 placement = measureElement (1)
/**
 * 读元素 yoga 计算后的宽高。
 */
var measureElement_2 = (node) => ({
  width: node.yogaNode?.getComputedWidth() ?? 0,
  height: node.yogaNode?.getComputedHeight() ?? 0,
});
var measureElement = measureElement_2;
//@ chunk-x6v6jz2y.js:28277-28398 placement = siblingSharesY (0.858)
function topWithin(node, ancestor) {
  let top = 0;
  let cur = node;
  while (cur !== undefined && cur !== ancestor) {
    top += cur.yogaNode?.getComputedTop() ?? 0;
    cur = cur.parentNode;
  }
  return cur === ancestor ? top : -1;
}
//@ chunk-x6v6jz2y.js:28398-28519 placement
function wrapWithAppProviders(node, storage) {
  let l = Vc(
    RenderModeProvider,
    null,
    Vc(ThemeProvider, null, Vc(KillRingProvider, null, Vc(FrameRegistryProvider, null, node))),
  );
  return storage !== undefined
    ? Vc(StorageCredentialsProvider, {
        ...storage,
        children: l,
      })
    : l;
}
//@ chunk-x6v6jz2y.js:28519-28578 placement
/**
 * 默认渲染选项：是否使用原生光标（native cursor 开关）与样式图集记录器。
 */
function getDefaultRenderOptions() {
  return {
    nativeCursor: isNativeCursorEnabled(),
    atlasRecorder: atlasResetConfig(),
  };
}
//@ chunk-x6v6jz2y.js:28578-28737 placement
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
//@ chunk-x6v6jz2y.js:28737-28756 placement
var weakMap = new WeakMap();
//@ chunk-x6v6jz2y.js:28756-28962 placement
async function createRoot(baseRenderOptions, r) {
  let root = await createRootAsync({
    ...getDefaultRenderOptions(),
    ...baseRenderOptions,
  });
  let storage = r?.storageV5 !== undefined ? sessionServicesFor(r.storageV5) : undefined;
  let d = {
    ...root,
    render: (node) => root.render(wrapWithAppProviders(node, storage)),
  };
  let p = getSecondRootError().get(baseRenderOptions?.stdout ?? process.stdout);
  if (p) weakMap.set(p, d);
  return d;
}
//@ chunk-x6v6jz2y.js:28962-29031 placement
function rootOf(stdout = process.stdout) {
  let r = getSecondRootError().get(stdout);
  return r && weakMap.get(r);
}
export { measureElement, topWithin, rootOf, useTerminalTitle, useTimeout, useTabStatus, createRoot, render };
