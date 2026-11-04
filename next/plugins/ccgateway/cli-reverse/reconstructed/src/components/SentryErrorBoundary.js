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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bc20zedk.js:5225-5283 affinity
var BOUNDARY_THROW_TEXT = "a boundary caught a throw (message not reported)";
//@ chunk-bc20zedk.js:5283-6145 fingerprint (2.1.88 match: SentryErrorBoundary, 0.319)
let SentryErrorBoundary; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:5283", () => {
  SentryErrorBoundary = class SentryErrorBoundary extends REACT_PROFILER_TYPE {
    constructor(props) {
      super(props);
      this.state = {
        hasError: false,
        resetKey: props.resetKey,
      };
    }
    static getDerivedStateFromError() {
      return {
        hasError: true,
      };
    }
    static getDerivedStateFromProps(nextProps, prevState) {
      return Object.is(nextProps.resetKey, prevState.resetKey)
        ? null
        : {
            hasError: false,
            resetKey: nextProps.resetKey,
          };
    }
    componentDidCatch(error, info) {
      let reportedError = this.reported(error);
      if (reportedError !== null) logError(reportedError);
      try {
        this.props.onError?.(error, info);
      } catch (error) {
        logForDebugging(
          `SentryErrorBoundary: onError threw: ${error instanceof Error ? error.message : "a value that is no error"}`,
          {
            level: "error",
          },
        );
      }
    }
    reported(error) {
      if (this.props.telemetryMessage === undefined) return error;
      let telemetryMessage = this.messageAsked(this.props.telemetryMessage);
      if (telemetryMessage === null) return null;
      let taggedError = withTelemetryMessage(error, telemetryMessage);
      return getTelemetryMessage(taggedError) === undefined
        ? withTelemetryMessage(Error("a value that takes no telemetry message was thrown"), telemetryMessage)
        : taggedError;
    }
    messageAsked(getMessage) {
      try {
        return getMessage();
      } catch {
        return BOUNDARY_THROW_TEXT;
      }
    }
    render() {
      if (this.state.hasError) return this.props.fallback ?? null;
      return this.props.children;
    }
  };
});
export { SentryErrorBoundary };
