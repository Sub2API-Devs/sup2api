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
import {
  import_schema_2,
  InvalidRequestException,
  ResourceNotFoundException,
  TooManyRequestsException,
  UnauthorizedException,
  SSOServiceException,
  import_client_5,
  import_middleware_endpoint_2,
} from "../../nested-clients/dist-cjs/submodules/sso/index.js";

//@ chunk-kejz1rpb.js:1605-1969 esm-fingerprint
var resolveClientEndpointParameters = (options) =>
  Object.assign(options, {
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "awsssoportal",
  });
var commonParams = {
  UseFIPS: {
    type: "builtInParams",
    name: "useFipsEndpoint",
  },
  Endpoint: {
    type: "builtInParams",
    name: "endpoint",
  },
  Region: {
    type: "builtInParams",
    name: "region",
  },
  UseDualStack: {
    type: "builtInParams",
    name: "useDualstackEndpoint",
  },
};
//@ chunk-kejz1rpb.js:12718-12874 placement
var He = [0, "com.amazonaws.sso", "AccessTokenType", 8, 0];
var SecretAccessKeyType = [0, "com.amazonaws.sso", "SecretAccessKeyType", 8, 0];
var SessionTokenType = [0, "com.amazonaws.sso", "SessionTokenType", 8, 0];
//@ chunk-kejz1rpb.js:12874-13292 placement
var Ge = [
  3,
  "com.amazonaws.sso",
  "GetRoleCredentialsRequest",
  0,
  ["roleName", "accountId", "accessToken"],
  [
    [
      0,
      {
        ["httpQuery"]: "role_name",
      },
    ],
    [
      0,
      {
        ["httpQuery"]: "account_id",
      },
    ],
    [
      () => He,
      {
        ["httpHeader"]: "x-amz-sso_bearer_token",
      },
    ],
  ],
];
var qe = [3, "com.amazonaws.sso", "GetRoleCredentialsResponse", 0, ["roleCredentials"], [[() => ze, 0]]];
var je = [
  -3,
  "com.amazonaws.sso",
  "InvalidRequestException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
  },
  ["message"],
  [0],
];
//@ chunk-kejz1rpb.js:13292-13352 placement
import_schema_2.TypeRegistry.for("com.amazonaws.sso").registerError(je, InvalidRequestException);
//@ chunk-kejz1rpb.js:13352-13467 placement
var Me = [
  -3,
  "com.amazonaws.sso",
  "ResourceNotFoundException",
  {
    ["error"]: "client",
    ["httpError"]: 404,
  },
  ["message"],
  [0],
];
//@ chunk-kejz1rpb.js:13467-13527 placement
import_schema_2.TypeRegistry.for("com.amazonaws.sso").registerError(Me, ResourceNotFoundException);
//@ chunk-kejz1rpb.js:13527-13668 placement
var ze = [
  3,
  "com.amazonaws.sso",
  "RoleCredentials",
  0,
  ["accessKeyId", "secretAccessKey", "sessionToken", "expiration"],
  [0, [() => SecretAccessKeyType, 0], [() => SessionTokenType, 0], 1],
];
//@ chunk-kejz1rpb.js:13668-13782 layout
var Ke = [
  -3,
  "com.amazonaws.sso",
  "TooManyRequestsException",
  {
    ["error"]: "client",
    ["httpError"]: 429,
  },
  ["message"],
  [0],
];
//@ chunk-kejz1rpb.js:13782-13842 esm-fingerprint
import_schema_2.TypeRegistry.for("com.amazonaws.sso").registerError(Ke, TooManyRequestsException);
//@ chunk-kejz1rpb.js:13842-13953 esm-layout
var $e = [
  -3,
  "com.amazonaws.sso",
  "UnauthorizedException",
  {
    ["error"]: "client",
    ["httpError"]: 401,
  },
  ["message"],
  [0],
];
//@ chunk-kejz1rpb.js:13953-14013 esm-fingerprint
import_schema_2.TypeRegistry.for("com.amazonaws.sso").registerError($e, UnauthorizedException);
//@ chunk-kejz1rpb.js:14013-14099 esm-layout
var SSOServiceException_2 = [
  -3,
  "smithy.ts.sdk.synthetic.com.amazonaws.sso",
  "SSOServiceException",
  0,
  [],
  [],
];
//@ chunk-kejz1rpb.js:14099-14183 esm-fingerprint
import_schema_2.TypeRegistry.for("smithy.ts.sdk.synthetic.com.amazonaws.sso").registerError(
  SSOServiceException_2,
  SSOServiceException,
);
//@ chunk-kejz1rpb.js:14183-14298 esm-layout
var GetRoleCredentials = [
  9,
  "com.amazonaws.sso",
  "GetRoleCredentials",
  {
    ["http"]: ["GET", "/federation/credentials", 200],
  },
  () => Ge,
  () => qe,
];
//@ chunk-kejz1rpb.js:14298-14544 esm-fingerprint
class GetRoleCredentialsCommand extends import_client_5.Command.classBuilder()
  .ep(commonParams)
  .m(function (Command, cs, config, o) {
    return [
      import_middleware_endpoint_2.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
  })
  .s("SWBPortalService", "GetRoleCredentials", {})
  .n("SSOClient", "GetRoleCredentialsCommand")
  .sc(GetRoleCredentials)
  .build() {}
export { resolveClientEndpointParameters };
