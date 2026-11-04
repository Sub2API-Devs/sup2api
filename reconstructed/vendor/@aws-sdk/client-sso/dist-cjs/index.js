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
  InvalidRequestException_2,
  ResourceNotFoundException_2,
  TooManyRequestsException_2,
  UnauthorizedException_2,
  SSOServiceException,
  import_client_6,
  import_middleware_endpoint_2,
} from "../../nested-clients/dist-cjs/submodules/sso/index.js";
import { deferInit, beginDeferredInits, runDeferredInits } from "../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 3 modules closed by ../../nested-clients/dist-cjs/submodules/signin/endpoint/endpointResolver.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("vendor/@aws-sdk/nested-clients/dist-cjs/submodules/signin/endpoint/endpointResolver.js");
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
var AccessTokenType = [0, "com.amazonaws.sso", "AccessTokenType", 8, 0];
var SecretAccessKeyType = [0, "com.amazonaws.sso", "SecretAccessKeyType", 8, 0];
var SessionTokenType = [0, "com.amazonaws.sso", "SessionTokenType", 8, 0];
//@ chunk-kejz1rpb.js:12874-13292 placement
var GetRoleCredentialsRequest = [
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
      () => AccessTokenType,
      {
        ["httpHeader"]: "x-amz-sso_bearer_token",
      },
    ],
  ],
];
var GetRoleCredentialsResponse = [
  3,
  "com.amazonaws.sso",
  "GetRoleCredentialsResponse",
  0,
  ["roleCredentials"],
  [[() => RoleCredentials, 0]],
];
var InvalidRequestException = [
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
// deferred: uses import_schema_2 (../../nested-clients/dist-cjs/submodules/sso/index.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kejz1rpb.js:13292", () => {
  import_schema_2.TypeRegistry.for("com.amazonaws.sso").registerError(
    InvalidRequestException,
    InvalidRequestException_2,
  );
});
//@ chunk-kejz1rpb.js:13352-13467 placement
var ResourceNotFoundException = [
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
// deferred: uses import_schema_2 (../../nested-clients/dist-cjs/submodules/sso/index.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kejz1rpb.js:13467", () => {
  import_schema_2.TypeRegistry.for("com.amazonaws.sso").registerError(
    ResourceNotFoundException,
    ResourceNotFoundException_2,
  );
});
//@ chunk-kejz1rpb.js:13527-13668 placement
var RoleCredentials = [
  3,
  "com.amazonaws.sso",
  "RoleCredentials",
  0,
  ["accessKeyId", "secretAccessKey", "sessionToken", "expiration"],
  [0, [() => SecretAccessKeyType, 0], [() => SessionTokenType, 0], 1],
];
//@ chunk-kejz1rpb.js:13668-13782 layout
var TooManyRequestsException = [
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
// deferred: uses import_schema_2 (../../nested-clients/dist-cjs/submodules/sso/index.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kejz1rpb.js:13782", () => {
  import_schema_2.TypeRegistry.for("com.amazonaws.sso").registerError(
    TooManyRequestsException,
    TooManyRequestsException_2,
  );
});
//@ chunk-kejz1rpb.js:13842-13953 esm-layout
var UnauthorizedException = [
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
// deferred: uses import_schema_2 (../../nested-clients/dist-cjs/submodules/sso/index.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kejz1rpb.js:13953", () => {
  import_schema_2.TypeRegistry.for("com.amazonaws.sso").registerError(
    UnauthorizedException,
    UnauthorizedException_2,
  );
});
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
// deferred: uses import_schema_2 (../../nested-clients/dist-cjs/submodules/sso/index.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kejz1rpb.js:14099", () => {
  import_schema_2.TypeRegistry.for("smithy.ts.sdk.synthetic.com.amazonaws.sso").registerError(
    SSOServiceException_2,
    SSOServiceException,
  );
});
//@ chunk-kejz1rpb.js:14183-14298 esm-layout
var GetRoleCredentials = [
  9,
  "com.amazonaws.sso",
  "GetRoleCredentials",
  {
    ["http"]: ["GET", "/federation/credentials", 200],
  },
  () => GetRoleCredentialsRequest,
  () => GetRoleCredentialsResponse,
];
//@ chunk-kejz1rpb.js:14298-14544 esm-fingerprint
let GetRoleCredentialsCommand; // deferred: uses import_middleware_endpoint_2 (../../nested-clients/dist-cjs/submodules/sso/index.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kejz1rpb.js:14298", () => {
  GetRoleCredentialsCommand = class GetRoleCredentialsCommand extends (
    import_client_6.Command.classBuilder()
      .ep(commonParams)
      .m(function (Command, cs, config, o) {
        return [
          import_middleware_endpoint_2.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        ];
      })
      .s("SWBPortalService", "GetRoleCredentials", {})
      .n("SSOClient", "GetRoleCredentialsCommand")
      .sc(GetRoleCredentials)
      .build()
  ) {};
});

// The import cycle this module closes (3 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("vendor/@aws-sdk/client-sso/dist-cjs/index.js");
export { resolveClientEndpointParameters, GetRoleCredentialsCommand };
