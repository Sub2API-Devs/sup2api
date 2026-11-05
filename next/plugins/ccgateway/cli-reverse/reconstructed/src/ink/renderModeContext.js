/**
 * ink/renderModeContext.tsx
 *
 * 2.1.316 新增：渲染模式（全屏/内联）上下文与帧登记提供者
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-emhzq435.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-emhzq435.js:1416-1420 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-emhzq435.js:1416", () => {
  init_react_production();
});
//@ chunk-emhzq435.js:1420-1424 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-emhzq435.js:1420", () => {
  init_react_production();
});
//@ chunk-emhzq435.js:1424-1459 placement
/**
 * 新建渲染模式锁存
 */
function createRenderModeLatch() {
  return {
    latched: null,
  };
}
//@ chunk-emhzq435.js:1459-1476 placement
var RenderModeContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-emhzq435.js:1459", () => {
  RenderModeContext = createContext(null);
});
//@ chunk-emhzq435.js:1476-1524 placement
/**
 * 全屏环境变量开启则 fullscreen，否则 inline
 */
function defaultRenderMode() {
  return isFullscreenEnvEnabled() ? "fullscreen" : "inline";
}
//@ chunk-emhzq435.js:1524-1705 placement
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
//@ chunk-emhzq435.js:1705-1808 placement
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
//@ chunk-emhzq435.js:1808-1932 placement
function resolveRenderMode(value) {
  if (value === null) return defaultRenderMode();
  if (typeof value === "string") return value;
  if (value.latched === null) value.latched = defaultRenderMode();
  return value.latched;
}
//@ chunk-emhzq435.js:1932-1973 placement
function useIsFullscreen() {
  return useRenderMode() === "fullscreen";
}
//@ chunk-emhzq435.js:1973-1977 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-emhzq435.js:1973", () => {
  init_react_production();
});
//@ chunk-emhzq435.js:1977-2103 placement
function createRenderCaches() {
  return {
    markdownTokens: new Map(),
    highlightedCode: new Map(),
    structuredDiff: new WeakMap(),
    parsedToolResults: new WeakMap(),
  };
}
//@ chunk-emhzq435.js:2103-2119 placement
/**
 * 渲染缓存上下文
 */
var RenderCachesContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-emhzq435.js:2103", () => {
  RenderCachesContext = createContext(null);
});
//@ chunk-emhzq435.js:2119-2227 placement
function FrameRegistryProvider({ children }) {
  let renderCachesRef = useRef(null);
  renderCachesRef.current ??= createRenderCaches();
  return jsxProd_default(RenderCachesContext.Provider, {
    value: renderCachesRef.current,
    children,
  });
}
//@ chunk-emhzq435.js:2227-2312 placement
function useFrameRegistry() {
  let contextRegistry = useContext(RenderCachesContext);
  let renderCachesRef = useRef(null);
  if (contextRegistry) return contextRegistry;
  renderCachesRef.current ??= createRenderCaches();
  return renderCachesRef.current;
}
//@ chunk-emhzq435.js:2312-2540 placement
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
//@ chunk-emhzq435.js:2540-2577 placement
/**
 * schema 引用相等
 */
function isSameSchema(cached, schema) {
  return cached.schema === schema;
}
export {
  useIsFullscreen,
  RenderModeProvider,
  FrameRegistryProvider,
  useRenderMode,
  useFrameRegistry,
  parseRenderModeValue,
  resolveRenderMode,
  RenderModeContext,
};
