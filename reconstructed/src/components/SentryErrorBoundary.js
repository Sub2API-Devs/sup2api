/**
 * components/SentryErrorBoundary.ts
 *
 * React 错误边界：捕获渲染异常、上报（不含消息正文）并调用 onError。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/SentryErrorBoundary.ts
 * pieces: chunk-bc20zedk.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { REACT_PROFILER_TYPE } from "../../vendor/react/cjs/react.production.js";
import { logError } from "../utils/log.js";
import { logForDebugging } from "../utils/debug.js";
import { withTelemetryMessage, getTelemetryMessage } from "../utils/errors.js";

//@ chunk-bc20zedk.js:5225-5283 affinity
var BOUNDARY_THROW_TEXT = "a boundary caught a throw (message not reported)";
//@ chunk-bc20zedk.js:5283-6145 fingerprint = SentryErrorBoundary (0.319)
class SentryErrorBoundary extends REACT_PROFILER_TYPE {
  constructor(o) {
    super(o);
    this.state = {
      hasError: false,
      resetKey: o.resetKey,
    };
  }
  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }
  static getDerivedStateFromProps(o, p) {
    return Object.is(o.resetKey, p.resetKey)
      ? null
      : {
          hasError: false,
          resetKey: o.resetKey,
        };
  }
  componentDidCatch(o, p) {
    let a = this.reported(o);
    if (a !== null) logError(a);
    try {
      this.props.onError?.(o, p);
    } catch (error) {
      logForDebugging(
        `SentryErrorBoundary: onError threw: ${error instanceof Error ? error.message : "a value that is no error"}`,
        {
          level: "error",
        },
      );
    }
  }
  reported(o) {
    if (this.props.telemetryMessage === undefined) return o;
    let p = this.messageAsked(this.props.telemetryMessage);
    if (p === null) return null;
    let a = withTelemetryMessage(o, p);
    return getTelemetryMessage(a) === undefined
      ? withTelemetryMessage(Error("a value that takes no telemetry message was thrown"), p)
      : a;
  }
  messageAsked(o) {
    try {
      return o();
    } catch {
      return BOUNDARY_THROW_TEXT;
    }
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
export { SentryErrorBoundary };
