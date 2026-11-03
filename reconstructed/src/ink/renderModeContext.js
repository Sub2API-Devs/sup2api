/**
 * ink/renderModeContext.tsx
 *
 * 2.1.316 新增：渲染模式（全屏/内联）上下文与帧登记提供者
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x6v6jz2y.js (16)
 * attribution: placement 16
 */
import { init_react_production, qt, y, Se, R } from "../../vendor/react/cjs/react.production.js";
import { isFullscreenEnvEnabled } from "../utils/fullscreen.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-x6v6jz2y.js:1478-1482 placement
init_react_production();
//@ chunk-x6v6jz2y.js:1482-1486 placement
init_react_production();
//@ chunk-x6v6jz2y.js:1486-1521 placement
/**
 * 新建渲染模式锁存
 */
function createRenderModeLatch() {
  return {
    latched: null,
  };
}
//@ chunk-x6v6jz2y.js:1521-1538 placement
var RenderModeContext = qt(null);
//@ chunk-x6v6jz2y.js:1538-1586 placement
/**
 * 全屏环境变量开启则 fullscreen，否则 inline
 */
function defaultRenderMode() {
  return isFullscreenEnvEnabled() ? "fullscreen" : "inline";
}
//@ chunk-x6v6jz2y.js:1586-1767 placement
function RenderModeProvider(props) {
  let p = w(3);
  let { value: r, children } = props;
  let [u] = y(createRenderModeLatch);
  const value = r ?? u;
  let m;
  if (p[0] !== children || p[1] !== value) {
    m = jsxProd_default(RenderModeContext.Provider, {
      value,
      children,
    });
    p[0] = children;
    p[1] = value;
    p[2] = m;
  } else m = p[2];
  return m;
}
//@ chunk-x6v6jz2y.js:1767-1870 placement
function useRenderMode() {
  let r = w(2);
  const o = Se(RenderModeContext);
  let l;
  if (r[0] !== o) {
    l = resolveRenderMode(o);
    r[0] = o;
    r[1] = l;
  } else l = r[1];
  return l;
}
//@ chunk-x6v6jz2y.js:1870-1994 placement
function resolveRenderMode(o) {
  if (o === null) return defaultRenderMode();
  if (typeof o === "string") return o;
  if (o.latched === null) o.latched = defaultRenderMode();
  return o.latched;
}
//@ chunk-x6v6jz2y.js:1994-2035 placement
function useIsFullscreen() {
  return useRenderMode() === "fullscreen";
}
//@ chunk-x6v6jz2y.js:2035-2039 placement
init_react_production();
//@ chunk-x6v6jz2y.js:2039-2165 placement
function createRenderCaches() {
  return {
    markdownTokens: new Map(),
    highlightedCode: new Map(),
    structuredDiff: new WeakMap(),
    parsedToolResults: new WeakMap(),
  };
}
//@ chunk-x6v6jz2y.js:2165-2181 placement
/**
 * 渲染缓存上下文
 */
var RenderCachesContext = qt(null);
//@ chunk-x6v6jz2y.js:2181-2289 placement
function FrameRegistryProvider({ children }) {
  let renderCachesRef = R(null);
  renderCachesRef.current ??= createRenderCaches();
  return jsxProd_default(RenderCachesContext.Provider, {
    value: renderCachesRef.current,
    children,
  });
}
//@ chunk-x6v6jz2y.js:2289-2374 placement
function useFrameRegistry() {
  let o = Se(RenderCachesContext);
  let renderCachesRef = R(null);
  if (o) return o;
  renderCachesRef.current ??= createRenderCaches();
  return renderCachesRef.current;
}
//@ chunk-x6v6jz2y.js:2374-2602 placement
function parseRenderModeValue(frameRegistry, outputSchema, l) {
  if (!outputSchema) return;
  if (typeof l !== "object" || l === null) return outputSchema.safeParse(l);
  let u = frameRegistry.parsedToolResults.get(l);
  if (u && isSameSchema(u, outputSchema)) return u.parsed;
  let d = outputSchema.safeParse(l);
  frameRegistry.parsedToolResults.set(l, {
    schema: outputSchema,
    parsed: d,
  });
  return d;
}
//@ chunk-x6v6jz2y.js:2602-2639 placement
/**
 * schema 引用相等
 */
function isSameSchema(o, r) {
  return o.schema === r;
}
export {
  resolveRenderMode,
  RenderModeContext,
  useIsFullscreen,
  useFrameRegistry,
  useRenderMode,
  parseRenderModeValue,
  RenderModeProvider,
  FrameRegistryProvider,
};
