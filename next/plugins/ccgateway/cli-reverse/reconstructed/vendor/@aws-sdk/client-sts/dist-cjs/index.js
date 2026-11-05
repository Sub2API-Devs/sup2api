/**
 * @aws-sdk/client-sts/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/client-sts@3.936.0..3.939.0
 * pieces: chunk-539esr4f.js (46)
 * attribution: esm-fingerprint 28, esm-layout 18
 */
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_schema } from "../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { require_client } from "../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { require_middleware_endpoint } from "../../../@smithy/middleware-endpoint/dist-cjs/index.js";

//@ chunk-539esr4f.js:1681-2144 esm-fingerprint
var resolveClientEndpointParameters = (options) =>
  Object.assign(options, {
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    useGlobalEndpoint: options.useGlobalEndpoint ?? false,
    defaultSigningName: "sts",
  });
var commonParams = {
  UseGlobalEndpoint: {
    type: "builtInParams",
    name: "useGlobalEndpoint",
  },
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
//@ chunk-539esr4f.js:14920-14935 esm-layout
var schema = __toESM(require_schema());
//@ chunk-539esr4f.js:14935-14951 esm-layout
var import_client_6 = __toESM(require_client());
//@ chunk-539esr4f.js:14951-15052 esm-fingerprint
class STSServiceException$1 extends import_client_6.ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, STSServiceException$1.prototype);
  }
}
//@ chunk-539esr4f.js:15052-15230 esm-fingerprint
class ExpiredTokenException$1 extends STSServiceException$1 {
  name = "ExpiredTokenException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ExpiredTokenException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, ExpiredTokenException$1.prototype);
  }
}
//@ chunk-539esr4f.js:15230-15430 esm-fingerprint
class MalformedPolicyDocumentException$1 extends STSServiceException$1 {
  name = "MalformedPolicyDocumentException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "MalformedPolicyDocumentException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, MalformedPolicyDocumentException$1.prototype);
  }
}
//@ chunk-539esr4f.js:15430-15624 esm-fingerprint
class PackedPolicyTooLargeException$1 extends STSServiceException$1 {
  name = "PackedPolicyTooLargeException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "PackedPolicyTooLargeException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, PackedPolicyTooLargeException$1.prototype);
  }
}
//@ chunk-539esr4f.js:15624-15806 esm-fingerprint
class RegionDisabledException$1 extends STSServiceException$1 {
  name = "RegionDisabledException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "RegionDisabledException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, RegionDisabledException$1.prototype);
  }
}
//@ chunk-539esr4f.js:15806-15992 esm-fingerprint
class IDPRejectedClaimException$1 extends STSServiceException$1 {
  name = "IDPRejectedClaimException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "IDPRejectedClaimException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, IDPRejectedClaimException$1.prototype);
  }
}
//@ chunk-539esr4f.js:15992-16186 esm-fingerprint
class InvalidIdentityTokenException$1 extends STSServiceException$1 {
  name = "InvalidIdentityTokenException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "InvalidIdentityTokenException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, InvalidIdentityTokenException$1.prototype);
  }
}
//@ chunk-539esr4f.js:16186-16382 esm-fingerprint
class IDPCommunicationErrorException$1 extends STSServiceException$1 {
  name = "IDPCommunicationErrorException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "IDPCommunicationErrorException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, IDPCommunicationErrorException$1.prototype);
  }
}
//@ chunk-539esr4f.js:16382-16590 esm-fingerprint
class InvalidAuthorizationMessageException$1 extends STSServiceException$1 {
  name = "InvalidAuthorizationMessageException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "InvalidAuthorizationMessageException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, InvalidAuthorizationMessageException$1.prototype);
  }
}
//@ chunk-539esr4f.js:16590-16782 esm-fingerprint
class ExpiredTradeInTokenException$1 extends STSServiceException$1 {
  name = "ExpiredTradeInTokenException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "ExpiredTradeInTokenException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, ExpiredTradeInTokenException$1.prototype);
  }
}
//@ chunk-539esr4f.js:16782-16980 esm-fingerprint
class JWTPayloadSizeExceededException$1 extends STSServiceException$1 {
  name = "JWTPayloadSizeExceededException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "JWTPayloadSizeExceededException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, JWTPayloadSizeExceededException$1.prototype);
  }
}
//@ chunk-539esr4f.js:16980-17208 esm-fingerprint
class OutboundWebIdentityFederationDisabledException$1 extends STSServiceException$1 {
  name = "OutboundWebIdentityFederationDisabledException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "OutboundWebIdentityFederationDisabledException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, OutboundWebIdentityFederationDisabledException$1.prototype);
  }
}
//@ chunk-539esr4f.js:17208-17412 esm-fingerprint
class SessionDurationEscalationException$1 extends STSServiceException$1 {
  name = "SessionDurationEscalationException";
  $fault = "client";
  constructor(opts) {
    super({
      name: "SessionDurationEscalationException",
      $fault: "client",
      ...opts,
    });
    Object.setPrototypeOf(this, SessionDurationEscalationException$1.prototype);
  }
}
//@ chunk-539esr4f.js:17412-17571 esm-layout
var ExpiredTokenException = [
  -3,
  "com.amazonaws.sts",
  "ExpiredTokenException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
    ["awsQueryError"]: ["ExpiredTokenException", 400],
  },
  ["message"],
  [0],
];
//@ chunk-539esr4f.js:17571-17631 esm-fingerprint
schema.TypeRegistry.for("com.amazonaws.sts").registerError(ExpiredTokenException, ExpiredTokenException$1);
//@ chunk-539esr4f.js:17631-17804 esm-layout
var ExpiredTradeInTokenException = [
  -3,
  "com.amazonaws.sts",
  "ExpiredTradeInTokenException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
    ["awsQueryError"]: ["ExpiredTradeInTokenException", 400],
  },
  ["message"],
  [0],
];
//@ chunk-539esr4f.js:17804-17864 esm-fingerprint
schema.TypeRegistry.for("com.amazonaws.sts").registerError(
  ExpiredTradeInTokenException,
  ExpiredTradeInTokenException$1,
);
//@ chunk-539esr4f.js:17864-18022 esm-layout
var GetCallerIdentityRequest = [3, "com.amazonaws.sts", "GetCallerIdentityRequest", 0, [], []];
var GetCallerIdentityResponse = [
  3,
  "com.amazonaws.sts",
  "GetCallerIdentityResponse",
  0,
  ["UserId", "Account", "Arn"],
  [0, 0, 0],
];
//@ chunk-539esr4f.js:18022-18190 esm-layout
var IDPCommunicationErrorException = [
  -3,
  "com.amazonaws.sts",
  "IDPCommunicationErrorException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
    ["awsQueryError"]: ["IDPCommunicationError", 400],
  },
  ["message"],
  [0],
];
//@ chunk-539esr4f.js:18190-18250 esm-fingerprint
schema.TypeRegistry.for("com.amazonaws.sts").registerError(
  IDPCommunicationErrorException,
  IDPCommunicationErrorException$1,
);
//@ chunk-539esr4f.js:18250-18408 esm-layout
var IDPRejectedClaimException = [
  -3,
  "com.amazonaws.sts",
  "IDPRejectedClaimException",
  {
    ["error"]: "client",
    ["httpError"]: 403,
    ["awsQueryError"]: ["IDPRejectedClaim", 403],
  },
  ["message"],
  [0],
];
//@ chunk-539esr4f.js:18408-18468 esm-fingerprint
schema.TypeRegistry.for("com.amazonaws.sts").registerError(
  IDPRejectedClaimException,
  IDPRejectedClaimException$1,
);
//@ chunk-539esr4f.js:18468-18657 esm-layout
var InvalidAuthorizationMessageException = [
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
//@ chunk-539esr4f.js:18657-18717 esm-fingerprint
schema.TypeRegistry.for("com.amazonaws.sts").registerError(
  InvalidAuthorizationMessageException,
  InvalidAuthorizationMessageException$1,
);
//@ chunk-539esr4f.js:18717-18883 esm-layout
var InvalidIdentityTokenException = [
  -3,
  "com.amazonaws.sts",
  "InvalidIdentityTokenException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
    ["awsQueryError"]: ["InvalidIdentityToken", 400],
  },
  ["message"],
  [0],
];
//@ chunk-539esr4f.js:18883-18943 esm-fingerprint
schema.TypeRegistry.for("com.amazonaws.sts").registerError(
  InvalidIdentityTokenException,
  InvalidIdentityTokenException$1,
);
//@ chunk-539esr4f.js:18943-19122 esm-layout
var JWTPayloadSizeExceededException = [
  -3,
  "com.amazonaws.sts",
  "JWTPayloadSizeExceededException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
    ["awsQueryError"]: ["JWTPayloadSizeExceededException", 400],
  },
  ["message"],
  [0],
];
//@ chunk-539esr4f.js:19122-19182 esm-fingerprint
schema.TypeRegistry.for("com.amazonaws.sts").registerError(
  JWTPayloadSizeExceededException,
  JWTPayloadSizeExceededException$1,
);
//@ chunk-539esr4f.js:19182-19354 esm-layout
var MalformedPolicyDocumentException = [
  -3,
  "com.amazonaws.sts",
  "MalformedPolicyDocumentException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
    ["awsQueryError"]: ["MalformedPolicyDocument", 400],
  },
  ["message"],
  [0],
];
//@ chunk-539esr4f.js:19354-19414 esm-fingerprint
schema.TypeRegistry.for("com.amazonaws.sts").registerError(
  MalformedPolicyDocumentException,
  MalformedPolicyDocumentException$1,
);
//@ chunk-539esr4f.js:19414-19623 esm-layout
var OutboundWebIdentityFederationDisabledException = [
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
//@ chunk-539esr4f.js:19623-19683 esm-fingerprint
schema.TypeRegistry.for("com.amazonaws.sts").registerError(
  OutboundWebIdentityFederationDisabledException,
  OutboundWebIdentityFederationDisabledException$1,
);
//@ chunk-539esr4f.js:19683-19849 esm-layout
var PackedPolicyTooLargeException = [
  -3,
  "com.amazonaws.sts",
  "PackedPolicyTooLargeException",
  {
    ["error"]: "client",
    ["httpError"]: 400,
    ["awsQueryError"]: ["PackedPolicyTooLarge", 400],
  },
  ["message"],
  [0],
];
//@ chunk-539esr4f.js:19849-19909 esm-fingerprint
schema.TypeRegistry.for("com.amazonaws.sts").registerError(
  PackedPolicyTooLargeException,
  PackedPolicyTooLargeException$1,
);
//@ chunk-539esr4f.js:19909-20072 esm-layout
var RegionDisabledException = [
  -3,
  "com.amazonaws.sts",
  "RegionDisabledException",
  {
    ["error"]: "client",
    ["httpError"]: 403,
    ["awsQueryError"]: ["RegionDisabledException", 403],
  },
  ["message"],
  [0],
];
//@ chunk-539esr4f.js:20072-20132 esm-fingerprint
schema.TypeRegistry.for("com.amazonaws.sts").registerError(
  RegionDisabledException,
  RegionDisabledException$1,
);
//@ chunk-539esr4f.js:20132-20317 esm-layout
var SessionDurationEscalationException = [
  -3,
  "com.amazonaws.sts",
  "SessionDurationEscalationException",
  {
    ["error"]: "client",
    ["httpError"]: 403,
    ["awsQueryError"]: ["SessionDurationEscalationException", 403],
  },
  ["message"],
  [0],
];
//@ chunk-539esr4f.js:20317-20377 esm-fingerprint
schema.TypeRegistry.for("com.amazonaws.sts").registerError(
  SessionDurationEscalationException,
  SessionDurationEscalationException$1,
);
//@ chunk-539esr4f.js:20377-20463 esm-layout
var STSServiceException = [-3, "smithy.ts.sdk.synthetic.com.amazonaws.sts", "STSServiceException", 0, [], []];
//@ chunk-539esr4f.js:20463-20547 esm-fingerprint
schema.TypeRegistry.for("smithy.ts.sdk.synthetic.com.amazonaws.sts").registerError(
  STSServiceException,
  STSServiceException$1,
);
//@ chunk-539esr4f.js:20547-20614 esm-layout
var GetCallerIdentity = [
  9,
  "com.amazonaws.sts",
  "GetCallerIdentity",
  0,
  () => GetCallerIdentityRequest,
  () => GetCallerIdentityResponse,
];
//@ chunk-539esr4f.js:20614-20642 esm-layout
var import_middleware_endpoint_2 = __toESM(require_middleware_endpoint());
var import_client_7 = __toESM(require_client());
//@ chunk-539esr4f.js:20642-20901 esm-fingerprint
class AssumeRoleWithWebIdentityCommand extends import_client_7.Command.classBuilder()
  .ep(commonParams)
  .m(function (Command, cs, config, o) {
    return [
      import_middleware_endpoint_2.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
  })
  .s("AWSSecurityTokenServiceV20110615", "GetCallerIdentity", {})
  .n("STSClient", "GetCallerIdentityCommand")
  .sc(GetCallerIdentity)
  .build() {}
export { resolveClientEndpointParameters, AssumeRoleWithWebIdentityCommand };
