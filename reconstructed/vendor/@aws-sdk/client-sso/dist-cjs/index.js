/**
 * @aws-sdk/client-sso/dist-cjs/index.js
 *
 * AWS SSO 客户端（第三方）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-sso@3.936.0..3.940.0
 * pieces: chunk-kejz1rpb.js (15)
 * attribution: esm-fingerprint 5, placement 6, layout 1, esm-layout 3
 */
import { u, C, I, T, b, i, Ce, Pe } from "../../nested-clients/dist-cjs/submodules/sso/index.js";

//@ chunk-kejz1rpb.js:1605-1969 esm-fingerprint
var H = (e) =>
    Object.assign(e, {
      useDualstackEndpoint: e.useDualstackEndpoint ?? !1,
      useFipsEndpoint: e.useFipsEndpoint ?? !1,
      defaultSigningName: "awsssoportal",
    }),
  F = {
    UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
    Endpoint: { type: "builtInParams", name: "endpoint" },
    Region: { type: "builtInParams", name: "region" },
    UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
  };
//@ chunk-kejz1rpb.js:12718-12874 placement
var He = [0, "com.amazonaws.sso", "AccessTokenType", 8, 0],
  Fe = [0, "com.amazonaws.sso", "SecretAccessKeyType", 8, 0],
  Ue = [0, "com.amazonaws.sso", "SessionTokenType", 8, 0];
//@ chunk-kejz1rpb.js:12874-13292 placement
var Ge = [
    3,
    "com.amazonaws.sso",
    "GetRoleCredentialsRequest",
    0,
    ["roleName", "accountId", "accessToken"],
    [
      [0, { ["httpQuery"]: "role_name" }],
      [0, { ["httpQuery"]: "account_id" }],
      [() => He, { ["httpHeader"]: "x-amz-sso_bearer_token" }],
    ],
  ],
  qe = [3, "com.amazonaws.sso", "GetRoleCredentialsResponse", 0, ["roleCredentials"], [[() => ze, 0]]],
  je = [
    -3,
    "com.amazonaws.sso",
    "InvalidRequestException",
    { ["error"]: "client", ["httpError"]: 400 },
    ["message"],
    [0],
  ];
//@ chunk-kejz1rpb.js:13292-13352 placement
u.TypeRegistry.for("com.amazonaws.sso").registerError(je, C);
//@ chunk-kejz1rpb.js:13352-13467 placement
var Me = [
  -3,
  "com.amazonaws.sso",
  "ResourceNotFoundException",
  { ["error"]: "client", ["httpError"]: 404 },
  ["message"],
  [0],
];
//@ chunk-kejz1rpb.js:13467-13527 placement
u.TypeRegistry.for("com.amazonaws.sso").registerError(Me, I);
//@ chunk-kejz1rpb.js:13527-13668 placement
var ze = [
  3,
  "com.amazonaws.sso",
  "RoleCredentials",
  0,
  ["accessKeyId", "secretAccessKey", "sessionToken", "expiration"],
  [0, [() => Fe, 0], [() => Ue, 0], 1],
];
//@ chunk-kejz1rpb.js:13668-13782 layout
var Ke = [
  -3,
  "com.amazonaws.sso",
  "TooManyRequestsException",
  { ["error"]: "client", ["httpError"]: 429 },
  ["message"],
  [0],
];
//@ chunk-kejz1rpb.js:13782-13842 esm-fingerprint
u.TypeRegistry.for("com.amazonaws.sso").registerError(Ke, T);
//@ chunk-kejz1rpb.js:13842-13953 esm-layout
var $e = [
  -3,
  "com.amazonaws.sso",
  "UnauthorizedException",
  { ["error"]: "client", ["httpError"]: 401 },
  ["message"],
  [0],
];
//@ chunk-kejz1rpb.js:13953-14013 esm-fingerprint
u.TypeRegistry.for("com.amazonaws.sso").registerError($e, b);
//@ chunk-kejz1rpb.js:14013-14099 esm-layout
var Qe = [-3, "smithy.ts.sdk.synthetic.com.amazonaws.sso", "SSOServiceException", 0, [], []];
//@ chunk-kejz1rpb.js:14099-14183 esm-fingerprint
u.TypeRegistry.for("smithy.ts.sdk.synthetic.com.amazonaws.sso").registerError(Qe, i);
//@ chunk-kejz1rpb.js:14183-14298 esm-layout
var we = [
  9,
  "com.amazonaws.sso",
  "GetRoleCredentials",
  { ["http"]: ["GET", "/federation/credentials", 200] },
  () => Ge,
  () => qe,
];
//@ chunk-kejz1rpb.js:14298-14544 esm-fingerprint
class GetRoleCredentialsCommand extends Ce.Command.classBuilder()
  .ep(F)
  .m(function (e, t, o, n) {
    return [Pe.getEndpointPlugin(o, e.getEndpointParameterInstructions())];
  })
  .s("SWBPortalService", "GetRoleCredentials", {})
  .n("SSOClient", "GetRoleCredentialsCommand")
  .sc(we)
  .build() {}

export { H };
