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
import { Se, R, P, j, Q, yt, Vc } from "../../../vendor/react/cjs/react.production.js";
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
import { Yn } from "../../utils/stripAnsi.js";
import { _T, $L, bTe } from "../components/ClockContext.js";
import { RenderModeProvider, FrameRegistryProvider } from "../renderModeContext.js";
import { ThemeProvider, StorageCredentialsProvider } from "../../components/design-system/ThemeProvider.js";
import { KillRingProvider } from "../../utils/killRing.js";
import { isNativeCursorEnabled } from "../nativeCursor.js";
import { atlasResetConfig } from "../renderTelemetry.js";
import { sessionServicesFor } from "../../utils/secureStorage/credentialsFileStore.js";
import { wrappedRender, createRootAsync } from "../root.js";
import { di } from "../terminal.js";

/**
 * 把会话状态写到终端标签页（OSC 21337 标签状态，经 tmux/screen 透传）；kind 为 null 时清除；终端不支持时不写。
 */
//@ chunk-x6v6jz2y.js:27473-27709 placement = IDLE_SPECULATION_STATE (1)
function useTabStatus(kind, idleText) {
  let l = Se(TerminalWriteContext),
    u = R(null);
  P(() => {
    if (kind === null) {
      if (u.current !== null && l && isTabStatusEnabled()) l(wrapForMultiplexer(CLEAR_TAB_STATUS));
      u.current = null;
      return;
    }
    if (((u.current = kind), !l || !isTabStatusEnabled())) return;
    let d = TAB_STATUS_PRESETS[kind],
      p = kind === "idle" && idleText !== void 0 ? { ...d, status: idleText } : d;
    l(wrapForMultiplexer(tabStatus(p)));
  }, [kind, idleText, l]);
}
//@ chunk-x6v6jz2y.js:27709-27713 placement
j();
/**
 * 标题变化时用 OSC 0 设置终端窗口/标签标题（先去掉转义字符）；title 为 null 不写。
 */
//@ chunk-x6v6jz2y.js:27713-27823 placement = CLEAR_TERMINAL_TITLE (1)
function useTerminalTitle(title) {
  let writeRaw = Se(TerminalWriteContext);
  P(() => {
    if (title === null || !writeRaw) return;
    let l = Yn(title);
    writeRaw(osc(OSC.SET_TITLE_AND_ICON, l));
  }, [title, writeRaw]);
}
//@ chunk-x6v6jz2y.js:27823-27827 placement
j();
//@ chunk-x6v6jz2y.js:27827-27841 placement
var Ko = () => !1;
//@ chunk-x6v6jz2y.js:27841-28173 placement
function useTimeout(o, r, l) {
  let u = Se(_T),
    d = typeof o === "function",
    p = d ? o : null,
    m = d ? r : o,
    b = d ? void 0 : r,
    C = R(p);
  C.current = p;
  let h = R(null),
    k = u?.setTimeout ?? $L,
    x = Q(() => {
      if (m === null) return bTe;
      let A = (T) => (
        (h.current = null),
        T(),
        k(() => {
          if (((h.current = A), d)) C.current?.();
          else T();
        }, m)
      );
      return A;
    }, [k, m, d, b, ...(l ?? [])]),
    E = yt(x, d ? Ko : () => h.current === x);
  if (!d) return E;
}
/**
 * 读元素 yoga 计算后的宽高。
 */
//@ chunk-x6v6jz2y.js:28173-28277 placement = measureElement (1)
var measureElement_2 = (o) => ({
    width: o.yogaNode?.getComputedWidth() ?? 0,
    height: o.yogaNode?.getComputedHeight() ?? 0,
  }),
  measureElement = measureElement_2;
//@ chunk-x6v6jz2y.js:28277-28398 placement = siblingSharesY (0.858)
function topWithin(node, ancestor) {
  let top = 0,
    cur = node;
  while (cur !== void 0 && cur !== ancestor)
    ((top += cur.yogaNode?.getComputedTop() ?? 0), (cur = cur.parentNode));
  return cur === ancestor ? top : -1;
}
//@ chunk-x6v6jz2y.js:28398-28519 placement
function wrapWithAppProviders(node, storage) {
  let l = Vc(
    RenderModeProvider,
    null,
    Vc(ThemeProvider, null, Vc(KillRingProvider, null, Vc(FrameRegistryProvider, null, node))),
  );
  return storage !== void 0 ? Vc(StorageCredentialsProvider, { ...storage, children: l }) : l;
}
/**
 * 默认渲染选项：是否使用原生光标（native cursor 开关）与样式图集记录器。
 */
//@ chunk-x6v6jz2y.js:28519-28578 placement
function getDefaultRenderOptions() {
  return { nativeCursor: isNativeCursorEnabled(), atlasRecorder: atlasResetConfig() };
}
/**
 * 应用入口的 render：给根元素包上主题等 Provider 后交给 Ink 渲染；第二个参数可以是 stdout 流或选项。
 */
//@ chunk-x6v6jz2y.js:28578-28737 placement
async function render(node, optionsOrStdout, extra) {
  let u = extra?.storageV5 !== void 0 ? sessionServicesFor(extra.storageV5) : void 0;
  if (optionsOrStdout !== void 0 && "write" in optionsOrStdout)
    return wrappedRender(wrapWithAppProviders(node, u), optionsOrStdout);
  return wrappedRender(wrapWithAppProviders(node, u), { ...getDefaultRenderOptions(), ...optionsOrStdout });
}
//@ chunk-x6v6jz2y.js:28737-28756 placement
var weakMap = new WeakMap();
//@ chunk-x6v6jz2y.js:28756-28962 placement
async function createRoot(o, r) {
  let l = await createRootAsync({ ...getDefaultRenderOptions(), ...o }),
    u = r?.storageV5 !== void 0 ? sessionServicesFor(r.storageV5) : void 0,
    d = { ...l, render: (m) => l.render(wrapWithAppProviders(m, u)) },
    p = di().get(o?.stdout ?? process.stdout);
  if (p) weakMap.set(p, d);
  return d;
}
//@ chunk-x6v6jz2y.js:28962-29031 placement
function rootOf(o = process.stdout) {
  let r = di().get(o);
  return r && weakMap.get(r);
}

export { measureElement, topWithin, rootOf, useTerminalTitle, useTimeout, useTabStatus, createRoot, render };
