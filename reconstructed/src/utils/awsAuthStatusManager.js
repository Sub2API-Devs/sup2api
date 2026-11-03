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
import { truncateAtWord, ql } from "./stringUtils.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";

//@ chunk-aepeg2w5.js:320397-320425 affinity
var AWS_AUTH_STATUS_TIMEOUTS = 15000,
  Kv = 4000,
  KL = 200;
/**
 * 云认证刷新状态单例：记录是否在认证中、输出行、错误，供 UI 显示 AWS/GCP 刷新进度。
 */
//@ chunk-aepeg2w5.js:320425-321468 fingerprint = AwsAuthStatusManager (0.766)
class AwsAuthStatusManager {
  status = { isAuthenticating: !1, output: [] };
  changed = createSignal();
  dismissTimer = null;
  static getInstance() {
    return getAwsAuthStatusManager();
  }
  getStatus() {
    return { ...this.status, output: [...this.status.output] };
  }
  startAuthentication() {
    (this.clearDismissTimer(),
      (this.status = { isAuthenticating: !0, output: [] }),
      this.changed.emit(this.getStatus()));
  }
  addOutput(e) {
    let n = truncateAtWord(ql(e), Kv);
    if (!n) return;
    ((this.status.output = [...this.status.output.slice(1 - KL), n]), this.changed.emit(this.getStatus()));
  }
  setError(e) {
    let n = truncateAtWord(ql(e), Kv);
    if (!n) return;
    ((this.status.error = n), this.changed.emit(this.getStatus()));
  }
  endAuthentication(e) {
    if ((this.clearDismissTimer(), e)) this.status = { isAuthenticating: !1, output: [] };
    else
      ((this.status.isAuthenticating = !1),
        (this.dismissTimer = setTimeout(() => this.dismiss(), AWS_AUTH_STATUS_TIMEOUTS)),
        this.dismissTimer.unref?.());
    this.changed.emit(this.getStatus());
  }
  dismiss() {
    (this.clearDismissTimer(),
      (this.status = { isAuthenticating: !1, output: [] }),
      this.changed.emit(this.getStatus()));
  }
  subscribe = this.changed.subscribe;
  clearDismissTimer() {
    if (this.dismissTimer !== null) (clearTimeout(this.dismissTimer), (this.dismissTimer = null));
  }
}
//@ chunk-aepeg2w5.js:321468-321493 sole-consumer
var awsAuthStatusManagerByHost = new HostScoped(() => new AwsAuthStatusManager());
//@ chunk-aepeg2w5.js:321493-321530 sole-consumer
function getAwsAuthStatusManager() {
  return awsAuthStatusManagerByHost.of(getRootSession().host);
}

export { AwsAuthStatusManager };
