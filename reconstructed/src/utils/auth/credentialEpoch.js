/**
 * utils/auth/credentialEpoch.ts
 *
 * 2.1.316 新增：隧道凭据代次请求头与事件；发出凭据变化事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (7)
 * attribution: placement 7
 */
import { xL } from "./oauthRefreshLock.js";
import { getRootSession } from "../../bootstrap/state.js";
import { HostScoped } from "../hostScoped.js";
import { createSignal } from "../signal.js";

//@ chunk-aepeg2w5.js:313968-314005 placement
function Nv() {
  return xL.of(getRootSession().host);
}
/**
 * 发出凭据变化事件。
 */
//@ chunk-aepeg2w5.js:314005-314031 placement
function emitCredentialChange() {
  Nv().emit();
}
//@ chunk-aepeg2w5.js:314031-314072 placement
function W3t(e) {
  return Nv().subscribe(e);
}
/**
 * 隧道凭据代次请求头与事件。
 */
//@ chunk-aepeg2w5.js:314072-314139 placement
var TUNNEL_CREDENTIAL_EPOCH_HEADER = "x-claude-code-tunnel-credential-epoch",
  Fv = new HostScoped(() => createSignal());
//@ chunk-aepeg2w5.js:314139-314206 placement
function Qos(e) {
  let n = xto(e);
  if (n !== void 0) Fv.of(getRootSession().host).emit(n);
}
//@ chunk-aepeg2w5.js:314206-314258 placement
function Hwi(e) {
  return Fv.of(getRootSession().host).subscribe(e);
}
//@ chunk-aepeg2w5.js:314258-314332 placement
function xto(e) {
  if (e == null || !/^\d{1,15}$/.test(e)) return;
  return Number(e);
}

export { W3t, emitCredentialChange, TUNNEL_CREDENTIAL_EPOCH_HEADER, xto, Hwi, Qos };
