/**
 * utils/awsAuthStatusManager.ts
 *
 * 云认证刷新状态单例（是否进行中、输出行、错误），供 UI 显示 awsAuthRefresh/gcpAuthRefresh 进度。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/awsAuthStatusManager.ts
 * pieces: chunk-aepeg2w5.js (4)
 * attribution: affinity 1, fingerprint 1, sole-consumer 2
 */
import { createSignal } from "./signal.js";
import { truncateAtWord, cleanForDisplay } from "./stringUtils.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:320397-320425 affinity
/**
 * 云认证状态行的最大字符数（4000）。
 */
var AWS_AUTH_STATUS_TIMEOUTS = 15000;
var MAX_AWS_STATUS_LINE_CHARS = 4000;
var MAX_AWS_STATUS_LINES = 200;
//@ chunk-aepeg2w5.js:320425-321468 fingerprint = AwsAuthStatusManager (0.766)
/**
 * 云认证刷新状态单例：记录是否在认证中、输出行、错误，供 UI 显示 AWS/GCP 刷新进度。
 */
class AwsAuthStatusManager {
  status = {
    isAuthenticating: false,
    output: [],
  };
  changed = createSignal();
  dismissTimer = null;
  static getInstance() {
    return getAwsAuthStatusManager();
  }
  getStatus() {
    return {
      ...this.status,
      output: [...this.status.output],
    };
  }
  startAuthentication() {
    this.clearDismissTimer();
    this.status = {
      isAuthenticating: true,
      output: [],
    };
    this.changed.emit(this.getStatus());
  }
  addOutput(line) {
    let cleanLine = truncateAtWord(cleanForDisplay(line), MAX_AWS_STATUS_LINE_CHARS);
    if (!cleanLine) return;
    this.status.output = [...this.status.output.slice(1 - MAX_AWS_STATUS_LINES), cleanLine];
    this.changed.emit(this.getStatus());
  }
  setError(message) {
    let cleanMessage = truncateAtWord(cleanForDisplay(message), MAX_AWS_STATUS_LINE_CHARS);
    if (!cleanMessage) return;
    this.status.error = cleanMessage;
    this.changed.emit(this.getStatus());
  }
  endAuthentication(success) {
    this.clearDismissTimer();
    if (success)
      this.status = {
        isAuthenticating: false,
        output: [],
      };
    else {
      this.status.isAuthenticating = false;
      this.dismissTimer = setTimeout(() => this.dismiss(), AWS_AUTH_STATUS_TIMEOUTS);
      this.dismissTimer.unref?.();
    }
    this.changed.emit(this.getStatus());
  }
  dismiss() {
    this.clearDismissTimer();
    this.status = {
      isAuthenticating: false,
      output: [],
    };
    this.changed.emit(this.getStatus());
  }
  subscribe = this.changed.subscribe;
  clearDismissTimer() {
    if (this.dismissTimer !== null) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }
}
//@ chunk-aepeg2w5.js:321468-321493 sole-consumer
var awsAuthStatusManagerByHost; // deferred: uses AwsAuthStatusManager of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:321468", () => {
  awsAuthStatusManagerByHost = new HostScoped(() => new AwsAuthStatusManager());
});
//@ chunk-aepeg2w5.js:321493-321530 sole-consumer
function getAwsAuthStatusManager() {
  return awsAuthStatusManagerByHost.of(getRootSession().host);
}
export { AwsAuthStatusManager };
