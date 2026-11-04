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
import {
  init_react_production,
  createContext,
  useState,
  useContext,
  useRef,
} from "../../vendor/react/cjs/react.production.js";
import { isFullscreenEnvEnabled } from "../utils/fullscreen.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-x6v6jz2y.js:1478-1482 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:1478", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:1482-1486 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:1482", () => {
  init_react_production();
});
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
var RenderModeContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:1521", () => {
  RenderModeContext = createContext(null);
});
//@ chunk-x6v6jz2y.js:1538-1586 placement
/**
 * 全屏环境变量开启则 fullscreen，否则 inline
 */
function defaultRenderMode() {
  return isFullscreenEnvEnabled() ? "fullscreen" : "inline";
}
//@ chunk-x6v6jz2y.js:1586-1767 placement
function RenderModeProvider(props) {
  let $ = useMemoCache(3);
  let { value: valueProp, children } = props;
  let [latch] = useState(createRenderModeLatch);
  const value = valueProp ?? latch;
  let providerElement;
  if ($[0] !== children || $[1] !== value) {
    providerElement = jsxProd_default(RenderModeContext.Provider, {
      value,
      children,
    });
    $[0] = children;
    $[1] = value;
    $[2] = providerElement;
  } else providerElement = $[2];
  return providerElement;
}
//@ chunk-x6v6jz2y.js:1767-1870 placement
function useRenderMode() {
  let $ = useMemoCache(2);
  const contextValue = useContext(RenderModeContext);
  let mode;
  if ($[0] !== contextValue) {
    mode = resolveRenderMode(contextValue);
    $[0] = contextValue;
    $[1] = mode;
  } else mode = $[1];
  return mode;
}
//@ chunk-x6v6jz2y.js:1870-1994 placement
function resolveRenderMode(value) {
  if (value === null) return defaultRenderMode();
  if (typeof value === "string") return value;
  if (value.latched === null) value.latched = defaultRenderMode();
  return value.latched;
}
//@ chunk-x6v6jz2y.js:1994-2035 placement
function useIsFullscreen() {
  return useRenderMode() === "fullscreen";
}
//@ chunk-x6v6jz2y.js:2035-2039 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:2035", () => {
  init_react_production();
});
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
var RenderCachesContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:2165", () => {
  RenderCachesContext = createContext(null);
});
//@ chunk-x6v6jz2y.js:2181-2289 placement
function FrameRegistryProvider({ children }) {
  let renderCachesRef = useRef(null);
  renderCachesRef.current ??= createRenderCaches();
  return jsxProd_default(RenderCachesContext.Provider, {
    value: renderCachesRef.current,
    children,
  });
}
//@ chunk-x6v6jz2y.js:2289-2374 placement
function useFrameRegistry() {
  let contextRegistry = useContext(RenderCachesContext);
  let renderCachesRef = useRef(null);
  if (contextRegistry) return contextRegistry;
  renderCachesRef.current ??= createRenderCaches();
  return renderCachesRef.current;
}
//@ chunk-x6v6jz2y.js:2374-2602 placement
function parseRenderModeValue(frameRegistry, schema, value) {
  if (!schema) return;
  if (typeof value !== "object" || value === null) return schema.safeParse(value);
  let cached = frameRegistry.parsedToolResults.get(value);
  if (cached && isSameSchema(cached, schema)) return cached.parsed;
  let parsed = schema.safeParse(value);
  frameRegistry.parsedToolResults.set(value, {
    schema,
    parsed,
  });
  return parsed;
}
//@ chunk-x6v6jz2y.js:2602-2639 placement
/**
 * schema 引用相等
 */
function isSameSchema(cached, schema) {
  return cached.schema === schema;
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
