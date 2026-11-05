/**
 * utils/auth/credentialEpoch.ts
 *
 * 2.1.316 新增：隧道凭据代次请求头与事件；发出凭据变化事件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { credentialSignalByHost } from "./oauthRefreshLock.js";
import { getRootSession } from "../../bootstrap/state.js";
import { HostScoped } from "../hostScoped.js";
import { createSignal } from "../signal.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:324217-324254 placement
/**
 * 按宿主隔离的凭据代次事件源。
 */
function credentialEpochEmitter() {
  return credentialSignalByHost.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:324254-324280 placement
/**
 * 发出凭据变化事件。
 */
function emitCredentialChange() {
  credentialEpochEmitter().emit();
}
//@ chunk-exfmq47h.js:324280-324321 placement
/**
 * 订阅凭据变化事件。
 */
function onCredentialChange(listener) {
  return credentialEpochEmitter().subscribe(listener);
}
//@ chunk-exfmq47h.js:324321-324388 placement
/**
 * 按宿主隔离的凭据代次信号。
 */
var TUNNEL_CREDENTIAL_EPOCH_HEADER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var credentialEpochSignalByHost;
deferInit("chunk-exfmq47h.js:324321", () => {
  TUNNEL_CREDENTIAL_EPOCH_HEADER = "x-claude-code-tunnel-credential-epoch";
  credentialEpochSignalByHost = new HostScoped(() => createSignal());
});
//@ chunk-exfmq47h.js:324388-324455 placement
/**
 * 从请求头值发出凭据代次变化（值不合法时忽略）。
 */
function emitEpochFromHeader(headerValue) {
  let epochNumber = parseEpochNumber(headerValue);
  if (epochNumber !== undefined) credentialEpochSignalByHost.of(getRootSession().host).emit(epochNumber);
}
//@ chunk-exfmq47h.js:324455-324507 placement
/**
 * 订阅凭据代次变化。
 */
function subscribeCredentialEpoch(onTunnelCredentialEpoch) {
  return credentialEpochSignalByHost.of(getRootSession().host).subscribe(onTunnelCredentialEpoch);
}
//@ chunk-exfmq47h.js:324507-324581 placement
/**
 * 把请求头值解析成非负整数（格式不符返回 undefined）。
 */
function parseEpochNumber(value) {
  if (value == null || !/^\d{1,15}$/.test(value)) return;
  return Number(value);
}
export {
  emitCredentialChange,
  onCredentialChange,
  emitEpochFromHeader,
  TUNNEL_CREDENTIAL_EPOCH_HEADER,
  parseEpochNumber,
  subscribeCredentialEpoch,
};
