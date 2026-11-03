/**
 * utils/agentProxy/agentProxyState.ts
 *
 * 代理（proxy）状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-551t875q.js (5)
 * attribution: placement 5
 */
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-551t875q.js:261-309 placement
class n {
  endpoint = void 0;
  set(e) {
    this.endpoint = e;
  }
}
//@ chunk-551t875q.js:309-332 placement
var t = new HostScoped(() => new n());
//@ chunk-551t875q.js:332-367 placement
function d() {
  return t.of(getRootSession().host);
}
//@ chunk-551t875q.js:367-394 placement
function Mir(e) {
  d().set(e);
}
//@ chunk-551t875q.js:394-429 placement
function Wci() {
  return d().endpoint;
}

export { Mir, Wci };
