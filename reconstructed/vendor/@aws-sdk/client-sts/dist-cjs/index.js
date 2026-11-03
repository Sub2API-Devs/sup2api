/**
 * @aws-sdk/client-sts/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-sts@3.936.0..3.939.0
 * pieces: chunk-heg39xxp.js (46)
 * attribution: esm-fingerprint 28, esm-layout 18
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { _D } from "../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { ff } from "../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { pK } from "../../../@smithy/middleware-endpoint/dist-cjs/index.js";

//@ chunk-heg39xxp.js:1681-2144 esm-fingerprint
var V = (e) =>
    Object.assign(e, {
      useDualstackEndpoint: e.useDualstackEndpoint ?? !1,
      useFipsEndpoint: e.useFipsEndpoint ?? !1,
      useGlobalEndpoint: e.useGlobalEndpoint ?? !1,
      defaultSigningName: "sts",
    }),
  B = {
    UseGlobalEndpoint: { type: "builtInParams", name: "useGlobalEndpoint" },
    UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
    Endpoint: { type: "builtInParams", name: "endpoint" },
    Region: { type: "builtInParams", name: "region" },
    UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
  };
//@ chunk-heg39xxp.js:14920-14935 esm-layout
var a = Re(_D());
//@ chunk-heg39xxp.js:14935-14951 esm-layout
var je = Re(ff());
//@ chunk-heg39xxp.js:14951-15052 esm-fingerprint
class s extends je.ServiceException {
  constructor(e) {
    super(e);
    Object.setPrototypeOf(this, s.prototype);
  }
}
//@ chunk-heg39xxp.js:15052-15230 esm-fingerprint
class C extends s {
  name = "ExpiredTokenException";
  $fault = "client";
  constructor(e) {
    super({ name: "ExpiredTokenException", $fault: "client", ...e });
    Object.setPrototypeOf(this, C.prototype);
  }
}
//@ chunk-heg39xxp.js:15230-15430 esm-fingerprint
class G extends s {
  name = "MalformedPolicyDocumentException";
  $fault = "client";
  constructor(e) {
    super({ name: "MalformedPolicyDocumentException", $fault: "client", ...e });
    Object.setPrototypeOf(this, G.prototype);
  }
}
//@ chunk-heg39xxp.js:15430-15624 esm-fingerprint
class b extends s {
  name = "PackedPolicyTooLargeException";
  $fault = "client";
  constructor(e) {
    super({ name: "PackedPolicyTooLargeException", $fault: "client", ...e });
    Object.setPrototypeOf(this, b.prototype);
  }
}
//@ chunk-heg39xxp.js:15624-15806 esm-fingerprint
class k extends s {
  name = "RegionDisabledException";
  $fault = "client";
  constructor(e) {
    super({ name: "RegionDisabledException", $fault: "client", ...e });
    Object.setPrototypeOf(this, k.prototype);
  }
}
//@ chunk-heg39xxp.js:15806-15992 esm-fingerprint
class w extends s {
  name = "IDPRejectedClaimException";
  $fault = "client";
  constructor(e) {
    super({ name: "IDPRejectedClaimException", $fault: "client", ...e });
    Object.setPrototypeOf(this, w.prototype);
  }
}
//@ chunk-heg39xxp.js:15992-16186 esm-fingerprint
class W extends s {
  name = "InvalidIdentityTokenException";
  $fault = "client";
  constructor(e) {
    super({ name: "InvalidIdentityTokenException", $fault: "client", ...e });
    Object.setPrototypeOf(this, W.prototype);
  }
}
//@ chunk-heg39xxp.js:16186-16382 esm-fingerprint
class O extends s {
  name = "IDPCommunicationErrorException";
  $fault = "client";
  constructor(e) {
    super({ name: "IDPCommunicationErrorException", $fault: "client", ...e });
    Object.setPrototypeOf(this, O.prototype);
  }
}
//@ chunk-heg39xxp.js:16382-16590 esm-fingerprint
class M extends s {
  name = "InvalidAuthorizationMessageException";
  $fault = "client";
  constructor(e) {
    super({ name: "InvalidAuthorizationMessageException", $fault: "client", ...e });
    Object.setPrototypeOf(this, M.prototype);
  }
}
//@ chunk-heg39xxp.js:16590-16782 esm-fingerprint
class H extends s {
  name = "ExpiredTradeInTokenException";
  $fault = "client";
  constructor(e) {
    super({ name: "ExpiredTradeInTokenException", $fault: "client", ...e });
    Object.setPrototypeOf(this, H.prototype);
  }
}
//@ chunk-heg39xxp.js:16782-16980 esm-fingerprint
class F extends s {
  name = "JWTPayloadSizeExceededException";
  $fault = "client";
  constructor(e) {
    super({ name: "JWTPayloadSizeExceededException", $fault: "client", ...e });
    Object.setPrototypeOf(this, F.prototype);
  }
}
//@ chunk-heg39xxp.js:16980-17208 esm-fingerprint
class N extends s {
  name = "OutboundWebIdentityFederationDisabledException";
  $fault = "client";
  constructor(e) {
    super({ name: "OutboundWebIdentityFederationDisabledException", $fault: "client", ...e });
    Object.setPrototypeOf(this, N.prototype);
  }
}
//@ chunk-heg39xxp.js:17208-17412 esm-fingerprint
class L extends s {
  name = "SessionDurationEscalationException";
  $fault = "client";
  constructor(e) {
    super({ name: "SessionDurationEscalationException", $fault: "client", ...e });
    Object.setPrototypeOf(this, L.prototype);
  }
}
//@ chunk-heg39xxp.js:17412-17571 esm-layout
var et = [
  -3,
  "com.amazonaws.sts",
  "ExpiredTokenException",
  { ["error"]: "client", ["httpError"]: 400, ["awsQueryError"]: ["ExpiredTokenException", 400] },
  ["message"],
  [0],
];
//@ chunk-heg39xxp.js:17571-17631 esm-fingerprint
a.TypeRegistry.for("com.amazonaws.sts").registerError(et, C);
//@ chunk-heg39xxp.js:17631-17804 esm-layout
var tt = [
  -3,
  "com.amazonaws.sts",
  "ExpiredTradeInTokenException",
  { ["error"]: "client", ["httpError"]: 400, ["awsQueryError"]: ["ExpiredTradeInTokenException", 400] },
  ["message"],
  [0],
];
//@ chunk-heg39xxp.js:17804-17864 esm-fingerprint
a.TypeRegistry.for("com.amazonaws.sts").registerError(tt, H);
//@ chunk-heg39xxp.js:17864-18022 esm-layout
var ot = [3, "com.amazonaws.sts", "GetCallerIdentityRequest", 0, [], []],
  nt = [3, "com.amazonaws.sts", "GetCallerIdentityResponse", 0, ["UserId", "Account", "Arn"], [0, 0, 0]];
//@ chunk-heg39xxp.js:18022-18190 esm-layout
var st = [
  -3,
  "com.amazonaws.sts",
  "IDPCommunicationErrorException",
  { ["error"]: "client", ["httpError"]: 400, ["awsQueryError"]: ["IDPCommunicationError", 400] },
  ["message"],
  [0],
];
//@ chunk-heg39xxp.js:18190-18250 esm-fingerprint
a.TypeRegistry.for("com.amazonaws.sts").registerError(st, O);
//@ chunk-heg39xxp.js:18250-18408 esm-layout
var rt = [
  -3,
  "com.amazonaws.sts",
  "IDPRejectedClaimException",
  { ["error"]: "client", ["httpError"]: 403, ["awsQueryError"]: ["IDPRejectedClaim", 403] },
  ["message"],
  [0],
];
//@ chunk-heg39xxp.js:18408-18468 esm-fingerprint
a.TypeRegistry.for("com.amazonaws.sts").registerError(rt, w);
//@ chunk-heg39xxp.js:18468-18657 esm-layout
var it = [
  -3,
  "com.amazonaws.sts",
  "InvalidAuthorizationMessageException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
    ["awsQueryError"]: ["InvalidAuthorizationMessageException", 400],
  },
  ["message"],
  [0],
];
//@ chunk-heg39xxp.js:18657-18717 esm-fingerprint
a.TypeRegistry.for("com.amazonaws.sts").registerError(it, M);
//@ chunk-heg39xxp.js:18717-18883 esm-layout
var at = [
  -3,
  "com.amazonaws.sts",
  "InvalidIdentityTokenException",
  { ["error"]: "client", ["httpError"]: 400, ["awsQueryError"]: ["InvalidIdentityToken", 400] },
  ["message"],
  [0],
];
//@ chunk-heg39xxp.js:18883-18943 esm-fingerprint
a.TypeRegistry.for("com.amazonaws.sts").registerError(at, W);
//@ chunk-heg39xxp.js:18943-19122 esm-layout
var ct = [
  -3,
  "com.amazonaws.sts",
  "JWTPayloadSizeExceededException",
  { ["error"]: "client", ["httpError"]: 400, ["awsQueryError"]: ["JWTPayloadSizeExceededException", 400] },
  ["message"],
  [0],
];
//@ chunk-heg39xxp.js:19122-19182 esm-fingerprint
a.TypeRegistry.for("com.amazonaws.sts").registerError(ct, F);
//@ chunk-heg39xxp.js:19182-19354 esm-layout
var dt = [
  -3,
  "com.amazonaws.sts",
  "MalformedPolicyDocumentException",
  { ["error"]: "client", ["httpError"]: 400, ["awsQueryError"]: ["MalformedPolicyDocument", 400] },
  ["message"],
  [0],
];
//@ chunk-heg39xxp.js:19354-19414 esm-fingerprint
a.TypeRegistry.for("com.amazonaws.sts").registerError(dt, G);
//@ chunk-heg39xxp.js:19414-19623 esm-layout
var pt = [
  -3,
  "com.amazonaws.sts",
  "OutboundWebIdentityFederationDisabledException",
  {
    ["error"]: "client",
    ["httpError"]: 403,
    ["awsQueryError"]: ["OutboundWebIdentityFederationDisabledException", 403],
  },
  ["message"],
  [0],
];
//@ chunk-heg39xxp.js:19623-19683 esm-fingerprint
a.TypeRegistry.for("com.amazonaws.sts").registerError(pt, N);
//@ chunk-heg39xxp.js:19683-19849 esm-layout
var lt = [
  -3,
  "com.amazonaws.sts",
  "PackedPolicyTooLargeException",
  { ["error"]: "client", ["httpError"]: 400, ["awsQueryError"]: ["PackedPolicyTooLarge", 400] },
  ["message"],
  [0],
];
//@ chunk-heg39xxp.js:19849-19909 esm-fingerprint
a.TypeRegistry.for("com.amazonaws.sts").registerError(lt, b);
//@ chunk-heg39xxp.js:19909-20072 esm-layout
var ut = [
  -3,
  "com.amazonaws.sts",
  "RegionDisabledException",
  { ["error"]: "client", ["httpError"]: 403, ["awsQueryError"]: ["RegionDisabledException", 403] },
  ["message"],
  [0],
];
//@ chunk-heg39xxp.js:20072-20132 esm-fingerprint
a.TypeRegistry.for("com.amazonaws.sts").registerError(ut, k);
//@ chunk-heg39xxp.js:20132-20317 esm-layout
var mt = [
  -3,
  "com.amazonaws.sts",
  "SessionDurationEscalationException",
  { ["error"]: "client", ["httpError"]: 403, ["awsQueryError"]: ["SessionDurationEscalationException", 403] },
  ["message"],
  [0],
];
//@ chunk-heg39xxp.js:20317-20377 esm-fingerprint
a.TypeRegistry.for("com.amazonaws.sts").registerError(mt, L);
//@ chunk-heg39xxp.js:20377-20463 esm-layout
var _t = [-3, "smithy.ts.sdk.synthetic.com.amazonaws.sts", "STSServiceException", 0, [], []];
//@ chunk-heg39xxp.js:20463-20547 esm-fingerprint
a.TypeRegistry.for("smithy.ts.sdk.synthetic.com.amazonaws.sts").registerError(_t, s);
//@ chunk-heg39xxp.js:20547-20614 esm-layout
var Ue = [9, "com.amazonaws.sts", "GetCallerIdentity", 0, () => ot, () => nt];
//@ chunk-heg39xxp.js:20614-20642 esm-layout
var Ke = Re(pK()),
  ze = Re(ff());
//@ chunk-heg39xxp.js:20642-20901 esm-fingerprint
class ht extends ze.Command.classBuilder()
  .ep(B)
  .m(function (e, t, o, d) {
    return [Ke.getEndpointPlugin(o, e.getEndpointParameterInstructions())];
  })
  .s("AWSSecurityTokenServiceV20110615", "GetCallerIdentity", {})
  .n("STSClient", "GetCallerIdentityCommand")
  .sc(Ue)
  .build() {}

export { V };
