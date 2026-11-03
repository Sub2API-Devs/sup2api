/**
 * @modelcontextprotocol/sdk/dist/esm/server/auth/errors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-9z4e25ww.js (36)
 * attribution: esm-fingerprint 19, esm-layout 17
 */

//@ chunk-9z4e25ww.js:5186-5465 esm-fingerprint
class TM extends Error {
  constructor(e, t) {
    super(e);
    ((this.errorUri = t), (this.name = this.constructor.name));
  }
  toResponseObject() {
    let e = { error: this.errorCode, error_description: this.message };
    if (this.errorUri) e.error_uri = this.errorUri;
    return e;
  }
  get errorCode() {
    return this.constructor.errorCode;
  }
}
//@ chunk-9z4e25ww.js:5465-5485 esm-layout
class x extends TM {}
//@ chunk-9z4e25ww.js:5485-5515 esm-fingerprint
x.errorCode = "invalid_request";
//@ chunk-9z4e25ww.js:5515-5535 esm-layout
class g extends TM {}
//@ chunk-9z4e25ww.js:5535-5564 esm-fingerprint
g.errorCode = "invalid_client";
//@ chunk-9z4e25ww.js:5564-5586 esm-layout
class J_t extends TM {}
//@ chunk-9z4e25ww.js:5586-5616 esm-fingerprint
J_t.errorCode = "invalid_grant";
//@ chunk-9z4e25ww.js:5616-5636 esm-layout
class w extends TM {}
//@ chunk-9z4e25ww.js:5636-5670 esm-fingerprint
w.errorCode = "unauthorized_client";
//@ chunk-9z4e25ww.js:5670-5690 esm-layout
class U extends TM {}
//@ chunk-9z4e25ww.js:5690-5727 esm-fingerprint
U.errorCode = "unsupported_grant_type";
//@ chunk-9z4e25ww.js:5727-5747 esm-layout
class R extends TM {}
//@ chunk-9z4e25ww.js:5747-5775 esm-fingerprint
R.errorCode = "invalid_scope";
//@ chunk-9z4e25ww.js:5775-5795 esm-layout
class C extends TM {}
//@ chunk-9z4e25ww.js:5795-5823 esm-fingerprint
C.errorCode = "access_denied";
//@ chunk-9z4e25ww.js:5823-5845 esm-layout
class Jze extends TM {}
//@ chunk-9z4e25ww.js:5845-5874 esm-fingerprint
Jze.errorCode = "server_error";
//@ chunk-9z4e25ww.js:5874-5896 esm-layout
class scn extends TM {}
//@ chunk-9z4e25ww.js:5896-5936 esm-fingerprint
scn.errorCode = "temporarily_unavailable";
//@ chunk-9z4e25ww.js:5936-5956 esm-layout
class k extends TM {}
//@ chunk-9z4e25ww.js:5956-5996 esm-fingerprint
k.errorCode = "unsupported_response_type";
//@ chunk-9z4e25ww.js:5996-6016 esm-layout
class b extends TM {}
//@ chunk-9z4e25ww.js:6016-6053 esm-fingerprint
b.errorCode = "unsupported_token_type";
//@ chunk-9z4e25ww.js:6053-6073 esm-layout
class S extends TM {}
//@ chunk-9z4e25ww.js:6073-6101 esm-fingerprint
S.errorCode = "invalid_token";
//@ chunk-9z4e25ww.js:6101-6121 esm-layout
class v extends TM {}
//@ chunk-9z4e25ww.js:6121-6154 esm-fingerprint
v.errorCode = "method_not_allowed";
//@ chunk-9z4e25ww.js:6154-6176 esm-layout
class icn extends TM {}
//@ chunk-9z4e25ww.js:6176-6210 esm-fingerprint
icn.errorCode = "too_many_requests";
//@ chunk-9z4e25ww.js:6210-6230 esm-layout
class z extends TM {}
//@ chunk-9z4e25ww.js:6230-6268 esm-fingerprint
z.errorCode = "invalid_client_metadata";
//@ chunk-9z4e25ww.js:6268-6288 esm-layout
class L extends TM {}
//@ chunk-9z4e25ww.js:6288-6321 esm-fingerprint
L.errorCode = "insufficient_scope";
//@ chunk-9z4e25ww.js:6321-6341 esm-layout
class P extends TM {}
//@ chunk-9z4e25ww.js:6341-6370 esm-fingerprint
P.errorCode = "invalid_target";
//@ chunk-9z4e25ww.js:6370-6666 esm-fingerprint
var K = {
  [x.errorCode]: x,
  [g.errorCode]: g,
  [J_t.errorCode]: J_t,
  [w.errorCode]: w,
  [U.errorCode]: U,
  [R.errorCode]: R,
  [C.errorCode]: C,
  [Jze.errorCode]: Jze,
  [scn.errorCode]: scn,
  [k.errorCode]: k,
  [b.errorCode]: b,
  [S.errorCode]: S,
  [v.errorCode]: v,
  [icn.errorCode]: icn,
  [z.errorCode]: z,
  [L.errorCode]: L,
  [P.errorCode]: P,
};

export { TM, J_t, Jze, scn, icn, K, g, w, z };
