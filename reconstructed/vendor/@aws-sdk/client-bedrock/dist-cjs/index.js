/**
 * @aws-sdk/client-bedrock/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock@3.936.0..3.938.0
 * pieces: chunk-0dmzgg46.js (55)
 * attribution: esm-fingerprint 17, placement 5, esm-layout 5, layout 28
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { Rx } from "../../core/dist-cjs/index.js";
import { Hme } from "../../util-user-agent-node/dist-cjs/index.js";
import { dR } from "../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { EE } from "../../../@smithy/core/dist-cjs/index.js";
import { Nme, $me } from "../../../unresolved-cjs/index.js";
import { dG } from "../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import { wD } from "../../../@smithy/node-config-provider/dist-cjs/index.js";
import { E$ } from "../../../@smithy/node-http-handler/dist-cjs/index.js";
import { Mae } from "../../../@smithy/core/dist-cjs/submodules/retry/index.browser.js";
import { Fme } from "../../core/dist-cjs/submodules/protocols/index.js";
import { ff } from "../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { P4 } from "../../../@smithy/url-parser/dist-cjs/index.js";
import { base64Module } from "../../credential-provider-web-identity/dist-cjs/index.js";
import { IR } from "../../../@smithy/util-utf8/dist-cjs/index.js";
import { Iae } from "../../util-endpoints/dist-cjs/index.js";
import { YJ } from "../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { Dae } from "../../region-config-resolver/dist-cjs/index.js";
import { Kg } from "../../../@smithy/protocol-http/dist-cjs/index.js";
import { he, S, I, De, D, Ge, O, Se, Ie, Ee, ye, m, U } from "./auth/httpAuthSchemeProvider.js";
import { ve } from "./runtimeConfig.js";
import { _D } from "../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { pK } from "../../../@smithy/middleware-endpoint/dist-cjs/index.js";

//@ chunk-0dmzgg46.js:1886-2245 esm-fingerprint
var j = (e) =>
    Object.assign(e, {
      useDualstackEndpoint: e.useDualstackEndpoint ?? !1,
      useFipsEndpoint: e.useFipsEndpoint ?? !1,
      defaultSigningName: "bedrock",
    }),
  M = {
    UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
    Endpoint: { type: "builtInParams", name: "endpoint" },
    Region: { type: "builtInParams", name: "region" },
    UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
  };
//@ chunk-0dmzgg46.js:2245-5230 placement
var Q = {
  name: "@aws-sdk/client-bedrock",
  description: "AWS SDK for JavaScript Bedrock Client for Node.js, Browser and React Native",
  version: "3.936.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "node ../../scripts/compilation/inline client-bedrock",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "extract:docs": "api-extractor run --local",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo bedrock",
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: !1,
  dependencies: {
    "@aws-crypto/sha256-browser": "5.2.0",
    "@aws-crypto/sha256-js": "5.2.0",
    "@aws-sdk/core": "3.936.0",
    "@aws-sdk/credential-provider-node": "3.936.0",
    "@aws-sdk/middleware-host-header": "3.936.0",
    "@aws-sdk/middleware-logger": "3.936.0",
    "@aws-sdk/middleware-recursion-detection": "3.936.0",
    "@aws-sdk/middleware-user-agent": "3.936.0",
    "@aws-sdk/region-config-resolver": "3.936.0",
    "@aws-sdk/token-providers": "3.936.0",
    "@aws-sdk/types": "3.936.0",
    "@aws-sdk/util-endpoints": "3.936.0",
    "@aws-sdk/util-user-agent-browser": "3.936.0",
    "@aws-sdk/util-user-agent-node": "3.936.0",
    "@smithy/config-resolver": "^4.4.3",
    "@smithy/core": "^3.18.5",
    "@smithy/fetch-http-handler": "^5.3.6",
    "@smithy/hash-node": "^4.2.5",
    "@smithy/invalid-dependency": "^4.2.5",
    "@smithy/middleware-content-length": "^4.2.5",
    "@smithy/middleware-endpoint": "^4.3.12",
    "@smithy/middleware-retry": "^4.4.12",
    "@smithy/middleware-serde": "^4.2.6",
    "@smithy/middleware-stack": "^4.2.5",
    "@smithy/node-config-provider": "^4.3.5",
    "@smithy/node-http-handler": "^4.4.5",
    "@smithy/protocol-http": "^5.3.5",
    "@smithy/smithy-client": "^4.9.8",
    "@smithy/types": "^4.9.0",
    "@smithy/url-parser": "^4.2.5",
    "@smithy/util-base64": "^4.3.0",
    "@smithy/util-body-length-browser": "^4.2.0",
    "@smithy/util-body-length-node": "^4.2.1",
    "@smithy/util-defaults-mode-browser": "^4.3.11",
    "@smithy/util-defaults-mode-node": "^4.2.14",
    "@smithy/util-endpoints": "^3.2.5",
    "@smithy/util-middleware": "^4.2.5",
    "@smithy/util-retry": "^4.2.5",
    "@smithy/util-utf8": "^4.2.0",
    tslib: "^2.6.2",
  },
  devDependencies: {
    "@tsconfig/node18": "18.2.4",
    "@types/node": "^18.19.69",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typescript: "~5.8.3",
  },
  engines: { node: ">=18.0.0" },
  typesVersions: { "<4.0": { "dist-types/*": ["dist-types/ts3.4/*"] } },
  files: ["dist-*/**"],
  author: { name: "AWS SDK for JavaScript Team", url: "https://aws.amazon.com/javascript/" },
  license: "Apache-2.0",
  browser: { "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser" },
  "react-native": { "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native" },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-bedrock",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-bedrock",
  },
};
//@ chunk-0dmzgg46.js:5230-5245 placement
var R = Re(Rx());
//@ chunk-0dmzgg46.js:5245-5356 placement
var v = Re(Hme()),
  l = Re(dR()),
  pe = Re(EE()),
  me = Re(Nme()),
  T = Re(dG()),
  c = Re(wD()),
  f = Re(E$()),
  Ce = Re($me()),
  Ae = Re(Mae());
//@ chunk-0dmzgg46.js:5356-5443 placement
var ie = Re(Rx()),
  _e = Re(Fme()),
  ce = Re(EE()),
  le = Re(ff()),
  ue = Re(P4()),
  g = Re(base64Module()),
  P = Re(IR());
//@ chunk-0dmzgg46.js:5443-5471 placement
var re = Re(Iae()),
  p = Re(YJ());
//@ chunk-0dmzgg46.js:10758-10796 esm-layout
var x = Re(Dae()),
  E = Re(Kg()),
  y = Re(ff());
//@ chunk-0dmzgg46.js:10796-11322 esm-fingerprint
var Te = (e) => {
    let {
      httpAuthSchemes: httpAuthSchemes,
      httpAuthSchemeProvider: httpAuthSchemeProvider,
      credentials: credentials,
      token: token,
    } = e;
    return {
      setHttpAuthScheme(n) {
        let index = httpAuthSchemes.findIndex((A) => A.schemeId === n.schemeId);
        if (index === -1) httpAuthSchemes.push(n);
        else httpAuthSchemes.splice(index, 1, n);
      },
      httpAuthSchemes() {
        return httpAuthSchemes;
      },
      setHttpAuthSchemeProvider(n) {
        httpAuthSchemeProvider = n;
      },
      httpAuthSchemeProvider() {
        return httpAuthSchemeProvider;
      },
      setCredentials(n) {
        credentials = n;
      },
      credentials() {
        return credentials;
      },
      setToken(n) {
        token = n;
      },
      token() {
        return token;
      },
    };
  },
  fe = (e) => ({
    httpAuthSchemes: e.httpAuthSchemes(),
    httpAuthSchemeProvider: e.httpAuthSchemeProvider(),
    credentials: e.credentials(),
    token: e.token(),
  });
//@ chunk-0dmzgg46.js:11322-11660 esm-fingerprint
var xe = (e, o) => {
  let merged = Object.assign(
    x.getAwsRegionExtensionConfiguration(e),
    y.getDefaultExtensionConfiguration(e),
    E.getHttpHandlerExtensionConfiguration(e),
    Te(e),
  );
  return (
    o.forEach((r) => r.configure(merged)),
    Object.assign(
      e,
      x.resolveAwsRegionExtensionConfiguration(merged),
      y.resolveDefaultRuntimeConfig(merged),
      E.resolveHttpHandlerRuntimeConfig(merged),
      fe(merged),
    )
  );
};
//@ chunk-0dmzgg46.js:11660-12750 esm-fingerprint
class He extends he.Client {
  config;
  constructor(...[e]) {
    let o = ve(e || {});
    super(o);
    this.initConfig = o;
    let t = j(o),
      userAgentConfig = S.resolveUserAgentConfig(t),
      retryConfig = I.resolveRetryConfig(userAgentConfig),
      regionConfig = De.resolveRegionConfig(retryConfig),
      hostHeaderConfig = D.resolveHostHeaderConfig(regionConfig),
      endpointConfig = Ge.resolveEndpointConfig(hostHeaderConfig),
      We = O(endpointConfig),
      Ue = xe(We, e?.extensions || []);
    ((this.config = Ue),
      this.middlewareStack.use(Se.getSchemaSerdePlugin(this.config)),
      this.middlewareStack.use(S.getUserAgentPlugin(this.config)),
      this.middlewareStack.use(I.getRetryPlugin(this.config)),
      this.middlewareStack.use(Ie.getContentLengthPlugin(this.config)),
      this.middlewareStack.use(D.getHostHeaderPlugin(this.config)),
      this.middlewareStack.use(Ee.getLoggerPlugin(this.config)),
      this.middlewareStack.use(ye.getRecursionDetectionPlugin(this.config)),
      this.middlewareStack.use(
        m.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: U,
          identityProviderConfigProvider: async (q) =>
            new m.DefaultIdentityProviderConfig({
              "aws.auth#sigv4": q.credentials,
              "smithy.api#httpBearerAuth": q.token,
            }),
        }),
      ),
      this.middlewareStack.use(m.getHttpSigningPlugin(this.config)));
  }
  destroy() {
    super.destroy();
  }
}
//@ chunk-0dmzgg46.js:12750-12765 esm-layout
var i = Re(_D());
//@ chunk-0dmzgg46.js:12765-12781 esm-layout
var Le = Re(ff());
//@ chunk-0dmzgg46.js:12781-12882 esm-fingerprint
class s extends Le.ServiceException {
  constructor(e) {
    super(e);
    Object.setPrototypeOf(this, s.prototype);
  }
}
//@ chunk-0dmzgg46.js:12882-13060 esm-fingerprint
class G extends s {
  name = "AccessDeniedException";
  $fault = "client";
  constructor(e) {
    super({ name: "AccessDeniedException", $fault: "client", ...e });
    Object.setPrototypeOf(this, G.prototype);
  }
}
//@ chunk-0dmzgg46.js:13060-13242 esm-fingerprint
class h extends s {
  name = "InternalServerException";
  $fault = "server";
  constructor(e) {
    super({ name: "InternalServerException", $fault: "server", ...e });
    Object.setPrototypeOf(this, h.prototype);
  }
}
//@ chunk-0dmzgg46.js:13242-13428 esm-fingerprint
class L extends s {
  name = "ResourceNotFoundException";
  $fault = "client";
  constructor(e) {
    super({ name: "ResourceNotFoundException", $fault: "client", ...e });
    Object.setPrototypeOf(this, L.prototype);
  }
}
//@ chunk-0dmzgg46.js:13428-13602 esm-fingerprint
class b extends s {
  name = "ThrottlingException";
  $fault = "client";
  constructor(e) {
    super({ name: "ThrottlingException", $fault: "client", ...e });
    Object.setPrototypeOf(this, b.prototype);
  }
}
//@ chunk-0dmzgg46.js:13602-13776 esm-fingerprint
class k extends s {
  name = "ValidationException";
  $fault = "client";
  constructor(e) {
    super({ name: "ValidationException", $fault: "client", ...e });
    Object.setPrototypeOf(this, k.prototype);
  }
}
//@ chunk-0dmzgg46.js:13776-13946 esm-fingerprint
class F extends s {
  name = "ConflictException";
  $fault = "client";
  constructor(e) {
    super({ name: "ConflictException", $fault: "client", ...e });
    Object.setPrototypeOf(this, F.prototype);
  }
}
//@ chunk-0dmzgg46.js:13946-14140 esm-fingerprint
class B extends s {
  name = "ServiceQuotaExceededException";
  $fault = "client";
  constructor(e) {
    super({ name: "ServiceQuotaExceededException", $fault: "client", ...e });
    Object.setPrototypeOf(this, B.prototype);
  }
}
//@ chunk-0dmzgg46.js:14140-14362 esm-fingerprint
class J extends s {
  name = "TooManyTagsException";
  $fault = "client";
  resourceName;
  constructor(e) {
    super({ name: "TooManyTagsException", $fault: "client", ...e });
    (Object.setPrototypeOf(this, J.prototype), (this.resourceName = e.resourceName));
  }
}
//@ chunk-0dmzgg46.js:14362-14542 esm-fingerprint
class N extends s {
  name = "ResourceInUseException";
  $fault = "client";
  constructor(e) {
    super({ name: "ResourceInUseException", $fault: "client", ...e });
    Object.setPrototypeOf(this, N.prototype);
  }
}
//@ chunk-0dmzgg46.js:14542-14732 esm-fingerprint
class V extends s {
  name = "ServiceUnavailableException";
  $fault = "server";
  constructor(e) {
    super({ name: "ServiceUnavailableException", $fault: "server", ...e });
    Object.setPrototypeOf(this, V.prototype);
  }
}
//@ chunk-0dmzgg46.js:14732-14801 layout
var be = [0, "com.amazonaws.bedrock", "InferenceProfileDescription", 8, 0];
//@ chunk-0dmzgg46.js:14801-14916 layout
var ze = [
  -3,
  "com.amazonaws.bedrock",
  "AccessDeniedException",
  { ["error"]: "client", ["httpError"]: 403 },
  ["message"],
  [0],
];
//@ chunk-0dmzgg46.js:14916-14980 layout
i.TypeRegistry.for("com.amazonaws.bedrock").registerError(ze, G);
//@ chunk-0dmzgg46.js:14980-15091 layout
var $e = [
  -3,
  "com.amazonaws.bedrock",
  "ConflictException",
  { ["error"]: "client", ["httpError"]: 400 },
  ["message"],
  [0],
];
//@ chunk-0dmzgg46.js:15091-15155 layout
i.TypeRegistry.for("com.amazonaws.bedrock").registerError($e, F);
//@ chunk-0dmzgg46.js:15155-15488 layout
var Ye = [
    3,
    "com.amazonaws.bedrock",
    "GetInferenceProfileRequest",
    0,
    ["inferenceProfileIdentifier"],
    [[0, 1]],
  ],
  Xe = [
    3,
    "com.amazonaws.bedrock",
    "GetInferenceProfileResponse",
    0,
    [
      "inferenceProfileName",
      "description",
      "createdAt",
      "updatedAt",
      "inferenceProfileArn",
      "models",
      "inferenceProfileId",
      "status",
      "type",
    ],
    [0, [() => be, 0], 5, 5, 0, () => ke, 0, 0, 0],
  ];
//@ chunk-0dmzgg46.js:15488-15903 layout
var Ze = [3, "com.amazonaws.bedrock", "InferenceProfileModel", 0, ["modelArn"], [0]],
  eo = [
    3,
    "com.amazonaws.bedrock",
    "InferenceProfileSummary",
    0,
    [
      "inferenceProfileName",
      "description",
      "createdAt",
      "updatedAt",
      "inferenceProfileArn",
      "models",
      "inferenceProfileId",
      "status",
      "type",
    ],
    [0, [() => be, 0], 5, 5, 0, () => ke, 0, 0, 0],
  ],
  oo = [
    -3,
    "com.amazonaws.bedrock",
    "InternalServerException",
    { ["error"]: "server", ["httpError"]: 500 },
    ["message"],
    [0],
  ];
//@ chunk-0dmzgg46.js:15903-15967 layout
i.TypeRegistry.for("com.amazonaws.bedrock").registerError(oo, h);
//@ chunk-0dmzgg46.js:15967-16291 layout
var to = [
    3,
    "com.amazonaws.bedrock",
    "ListInferenceProfilesRequest",
    0,
    ["maxResults", "nextToken", "typeEquals"],
    [
      [1, { ["httpQuery"]: "maxResults" }],
      [0, { ["httpQuery"]: "nextToken" }],
      [0, { ["httpQuery"]: "type" }],
    ],
  ],
  no = [
    3,
    "com.amazonaws.bedrock",
    "ListInferenceProfilesResponse",
    0,
    ["inferenceProfileSummaries", "nextToken"],
    [[() => po, 0], 0],
  ];
//@ chunk-0dmzgg46.js:16291-16407 layout
var so = [
  -3,
  "com.amazonaws.bedrock",
  "ResourceInUseException",
  { ["error"]: "client", ["httpError"]: 400 },
  ["message"],
  [0],
];
//@ chunk-0dmzgg46.js:16407-16471 layout
i.TypeRegistry.for("com.amazonaws.bedrock").registerError(so, N);
//@ chunk-0dmzgg46.js:16471-16590 layout
var ro = [
  -3,
  "com.amazonaws.bedrock",
  "ResourceNotFoundException",
  { ["error"]: "client", ["httpError"]: 404 },
  ["message"],
  [0],
];
//@ chunk-0dmzgg46.js:16590-16654 layout
i.TypeRegistry.for("com.amazonaws.bedrock").registerError(ro, L);
//@ chunk-0dmzgg46.js:16654-16777 layout
var ao = [
  -3,
  "com.amazonaws.bedrock",
  "ServiceQuotaExceededException",
  { ["error"]: "client", ["httpError"]: 400 },
  ["message"],
  [0],
];
//@ chunk-0dmzgg46.js:16777-16841 layout
i.TypeRegistry.for("com.amazonaws.bedrock").registerError(ao, B);
//@ chunk-0dmzgg46.js:16841-16962 layout
var io = [
  -3,
  "com.amazonaws.bedrock",
  "ServiceUnavailableException",
  { ["error"]: "server", ["httpError"]: 503 },
  ["message"],
  [0],
];
//@ chunk-0dmzgg46.js:16962-17026 layout
i.TypeRegistry.for("com.amazonaws.bedrock").registerError(io, V);
//@ chunk-0dmzgg46.js:17026-17139 layout
var _o = [
  -3,
  "com.amazonaws.bedrock",
  "ThrottlingException",
  { ["error"]: "client", ["httpError"]: 429 },
  ["message"],
  [0],
];
//@ chunk-0dmzgg46.js:17139-17203 layout
i.TypeRegistry.for("com.amazonaws.bedrock").registerError(_o, b);
//@ chunk-0dmzgg46.js:17203-17334 layout
var co = [
  -3,
  "com.amazonaws.bedrock",
  "TooManyTagsException",
  { ["error"]: "client", ["httpError"]: 400 },
  ["message", "resourceName"],
  [0, 0],
];
//@ chunk-0dmzgg46.js:17334-17398 layout
i.TypeRegistry.for("com.amazonaws.bedrock").registerError(co, J);
//@ chunk-0dmzgg46.js:17398-17511 layout
var lo = [
  -3,
  "com.amazonaws.bedrock",
  "ValidationException",
  { ["error"]: "client", ["httpError"]: 400 },
  ["message"],
  [0],
];
//@ chunk-0dmzgg46.js:17511-17575 layout
i.TypeRegistry.for("com.amazonaws.bedrock").registerError(lo, k);
//@ chunk-0dmzgg46.js:17575-17669 layout
var uo = [-3, "smithy.ts.sdk.synthetic.com.amazonaws.bedrock", "BedrockServiceException", 0, [], []];
//@ chunk-0dmzgg46.js:17669-17757 layout
i.TypeRegistry.for("smithy.ts.sdk.synthetic.com.amazonaws.bedrock").registerError(uo, s);
//@ chunk-0dmzgg46.js:17757-17898 layout
var ke = [1, "com.amazonaws.bedrock", "InferenceProfileModels", 0, () => Ze],
  po = [1, "com.amazonaws.bedrock", "InferenceProfileSummaries", 0, [() => eo, 0]];
//@ chunk-0dmzgg46.js:17898-18043 layout
var Fe = [
  9,
  "com.amazonaws.bedrock",
  "GetInferenceProfile",
  { ["http"]: ["GET", "/inference-profiles/{inferenceProfileIdentifier}", 200] },
  () => Ye,
  () => Xe,
];
//@ chunk-0dmzgg46.js:18043-18161 layout
var Be = [
  9,
  "com.amazonaws.bedrock",
  "ListInferenceProfiles",
  { ["http"]: ["GET", "/inference-profiles", 200] },
  () => to,
  () => no,
];
//@ chunk-0dmzgg46.js:18161-18189 esm-layout
var Je = Re(pK()),
  Ne = Re(ff());
//@ chunk-0dmzgg46.js:18189-18456 esm-fingerprint
class Ro extends Ne.Command.classBuilder()
  .ep(M)
  .m(function (e, o, t, r) {
    return [Je.getEndpointPlugin(t, e.getEndpointParameterInstructions())];
  })
  .s("AmazonBedrockControlPlaneService", "GetInferenceProfile", {})
  .n("BedrockClient", "GetInferenceProfileCommand")
  .sc(Fe)
  .build() {}
//@ chunk-0dmzgg46.js:18456-18484 esm-layout
var Ve = Re(pK()),
  qe = Re(ff());
//@ chunk-0dmzgg46.js:18484-18755 esm-fingerprint
class mo extends qe.Command.classBuilder()
  .ep(M)
  .m(function (e, o, t, r) {
    return [Ve.getEndpointPlugin(t, e.getEndpointParameterInstructions())];
  })
  .s("AmazonBedrockControlPlaneService", "ListInferenceProfiles", {})
  .n("BedrockClient", "ListInferenceProfilesCommand")
  .sc(Be)
  .build() {}

export { p, re, g, ie, ce, le, _e, ue, P, R, c, Ce, v, Q, pe, T, l, f, Ae, me };
