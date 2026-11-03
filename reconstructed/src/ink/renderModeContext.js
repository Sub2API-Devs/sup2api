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
import { j, qt, y, Se, R } from "../../vendor/react/cjs/react.production.js";
import { isFullscreenEnvEnabled } from "../utils/fullscreen.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-x6v6jz2y.js:1478-1482 placement
j();
//@ chunk-x6v6jz2y.js:1482-1486 placement
j();
//@ chunk-x6v6jz2y.js:1486-1521 placement
function ft() {
  return { latched: null };
}
//@ chunk-x6v6jz2y.js:1521-1538 placement
var RenderModeContext = qt(null);
//@ chunk-x6v6jz2y.js:1538-1586 placement
function Re() {
  return isFullscreenEnvEnabled() ? "fullscreen" : "inline";
}
//@ chunk-x6v6jz2y.js:1586-1767 placement
function RenderModeProvider(o) {
  let p = w(3),
    { value: r, children: children } = o,
    [u] = y(ft);
  const d = r ?? u;
  let m;
  if (p[0] !== children || p[1] !== d)
    ((m = e(RenderModeContext.Provider, { value: d, children: children })),
      (p[0] = children),
      (p[1] = d),
      (p[2] = m));
  else m = p[2];
  return m;
}
//@ chunk-x6v6jz2y.js:1767-1870 placement
function useRenderMode() {
  let r = w(2);
  const o = Se(RenderModeContext);
  let l;
  if (r[0] !== o) ((l = resolveRenderMode(o)), (r[0] = o), (r[1] = l));
  else l = r[1];
  return l;
}
//@ chunk-x6v6jz2y.js:1870-1994 placement
function resolveRenderMode(o) {
  if (o === null) return Re();
  if (typeof o === "string") return o;
  if (o.latched === null) o.latched = Re();
  return o.latched;
}
//@ chunk-x6v6jz2y.js:1994-2035 placement
function useIsFullscreen() {
  return useRenderMode() === "fullscreen";
}
//@ chunk-x6v6jz2y.js:2035-2039 placement
j();
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
var Te = qt(null);
//@ chunk-x6v6jz2y.js:2181-2289 placement
function FrameRegistryProvider({ children: children }) {
  let r = R(null);
  return ((r.current ??= createRenderCaches()), e(Te.Provider, { value: r.current, children: children }));
}
//@ chunk-x6v6jz2y.js:2289-2374 placement
function useFrameRegistry() {
  let o = Se(Te),
    r = R(null);
  if (o) return o;
  return ((r.current ??= createRenderCaches()), r.current);
}
//@ chunk-x6v6jz2y.js:2374-2602 placement
function parseRenderModeValue(o, r, l) {
  if (!r) return;
  if (typeof l !== "object" || l === null) return r.safeParse(l);
  let u = o.parsedToolResults.get(l);
  if (u && ht(u, r)) return u.parsed;
  let safeParse = r.safeParse(l);
  return (o.parsedToolResults.set(l, { schema: r, parsed: safeParse }), safeParse);
}
//@ chunk-x6v6jz2y.js:2602-2639 placement
function ht(o, r) {
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
