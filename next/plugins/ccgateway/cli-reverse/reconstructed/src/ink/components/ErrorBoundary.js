/**
 * ink/components/ErrorBoundary.tsx
 *
 * 2.1.316 新增（与组 3 共用路径）：读屏判定、Decorative 与 ref 赋值辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (8), chunk-x6v6jz2y.js (6)
 * attribution: placement 14
 */
import { YOGA_INSTANCE } from "../../native-ts/yoga-layout/index.js";
import {
  init_react_production,
  createContext,
  useContext,
} from "../../../vendor/react/cjs/react.production.js";
import { sanitizeErrorName, errorMessage } from "../../utils/errors.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEventAsync } from "../../services/analytics/index.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { shortHash } from "../../utils/shortHash.js";
import { shutdown1PEventLogging } from "../../services/analytics/firstPartyEventLogger.js";
import { shutdownDatadog } from "../../services/analytics/datadog.js";
import { Button_2 } from "./Button.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bzr73sfg.js:171893-171903 placement
/**
 * yoga 布局引擎实例（native-ts/yoga-layout 的 YOGA_INSTANCE）；createNode 用 Yoga.Node.create(config) 给元素建布局节点。
 */
var Yoga = YOGA_INSTANCE;
//@ chunk-bzr73sfg.js:171934-171938 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bzr73sfg.js:171934", () => {
  init_react_production();
});
//@ chunk-bzr73sfg.js:171938-171952 placement
var errorBoundaryTriggered; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bzr73sfg.js:171938", () => {
  errorBoundaryTriggered = createContext(false);
});
//@ chunk-bzr73sfg.js:171952-171998 placement
// deferred: uses errorBoundaryTriggered of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bzr73sfg.js:171952", () => {
  errorBoundaryTriggered.displayName = "InternalAccessibilityContext";
});
//@ chunk-bzr73sfg.js:171998-172009 placement
/**
 * 导出值：ErrorBoundaryStateRef（错误边界的同一信号）。
 */
var ErrorBoundaryStateRef; // deferred: uses errorBoundaryTriggered of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bzr73sfg.js:171998", () => {
  ErrorBoundaryStateRef = errorBoundaryTriggered;
});
//@ chunk-bzr73sfg.js:172009-172013 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bzr73sfg.js:172009", () => {
  init_react_production();
});
//@ chunk-bzr73sfg.js:172013-172355 placement
/**
 * React 错误边界捕获渲染错误时记录日志并上报 tengu_uncaught_exception。
 */
function reportRenderError(error, info) {
  let errorName = sanitizeErrorName(error) ?? lit("unknown");
  try {
    logForDebugging(`[reportRenderError] React boundary caught ${errorName}: ${errorMessage(error)}`, {
      level: "error",
    });
  } catch {}
  let componentStack = info?.componentStack;
  (async () => {
    try {
      await logEventAsync("tengu_uncaught_exception", {
        error_name: errorName,
        ...errorTelemetryFields(error),
        source: lit("react_render"),
        ...(componentStack && {
          error_component_stack_hash: shortHash(componentStack),
        }),
      });
      await Promise.all([shutdown1PEventLogging(), shutdownDatadog()]);
    } catch {}
  })();
}
//@ chunk-bzr73sfg.js:172355-172404 placement
var NO_MOUSE_MODS = {
  shift: false,
  alt: false,
  ctrl: false,
};
var DOUBLE_CLICK_MS = 300;
var MULTI_CLICK_MAX_MS = 500;
//@ chunk-x6v6jz2y.js:19217-19227 placement
var Button = Button_2;
//@ chunk-x6v6jz2y.js:19227-19231 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:19227", () => {
  init_react_production();
});
//@ chunk-x6v6jz2y.js:19231-19260 placement
function useIsScreenReaderEnabled() {
  return useContext(ErrorBoundaryStateRef);
}
//@ chunk-x6v6jz2y.js:19260-19326 placement
function Decorative(props) {
  let { children, fallback } = props;
  return useIsScreenReaderEnabled() ? (fallback ?? null) : children;
}
//@ chunk-x6v6jz2y.js:19326-19399 placement
function assignRef(ref, value) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  if (ref) ref.current = value;
}
//@ chunk-x6v6jz2y.js:19399-19403 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x6v6jz2y.js:19399", () => {
  init_react_production();
});
export {
  useIsScreenReaderEnabled,
  Button,
  Decorative,
  Yoga,
  DOUBLE_CLICK_MS,
  MULTI_CLICK_MAX_MS,
  NO_MOUSE_MODS,
  reportRenderError,
  ErrorBoundaryStateRef,
  assignRef,
};
