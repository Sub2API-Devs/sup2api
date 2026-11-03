/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-3cddmtk7.js (76)
 * attribution: esm-fingerprint 18, esm-layout 4, layout 54
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { Dae } from "../../region-config-resolver/dist-cjs/index.js";
import { Kg } from "../../../@smithy/protocol-http/dist-cjs/index.js";
import { ff } from "../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { ut, U, lt, Ae, _t, he } from "./auth/httpAuthSchemeProvider.js";
import { tt } from "./runtimeConfig.js";
import { O, L, st, at } from "../../../@aws-crypto/crc32/build/module/aws_crc32.js";
import { it, ge, ct, B } from "../../../@smithy/core/dist-cjs/submodules/event-streams/index.js";
import { ae } from "../../middleware-eventstream/dist-cjs/index.js";
import { xe } from "../../middleware-websocket/dist-cjs/index.js";
import { _D } from "../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { pK } from "../../../@smithy/middleware-endpoint/dist-cjs/index.js";

//@ chunk-3cddmtk7.js:14441-14802 esm-fingerprint
var ye = (e) =>
    Object.assign(e, {
      useDualstackEndpoint: e.useDualstackEndpoint ?? !1,
      useFipsEndpoint: e.useFipsEndpoint ?? !1,
      defaultSigningName: "bedrock",
    }),
  Be = {
    UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
    Endpoint: { type: "builtInParams", name: "endpoint" },
    Region: { type: "builtInParams", name: "region" },
    UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
  };
//@ chunk-3cddmtk7.js:26372-26410 esm-layout
var M = Re(Dae()),
  w = Re(Kg()),
  F = Re(ff());
//@ chunk-3cddmtk7.js:26410-26936 esm-fingerprint
var ot = (e) => {
    let {
      httpAuthSchemes: httpAuthSchemes,
      httpAuthSchemeProvider: httpAuthSchemeProvider,
      credentials: credentials,
      token: token,
    } = e;
    return {
      setHttpAuthScheme(s) {
        let index = httpAuthSchemes.findIndex((i) => i.schemeId === s.schemeId);
        if (index === -1) httpAuthSchemes.push(s);
        else httpAuthSchemes.splice(index, 1, s);
      },
      httpAuthSchemes() {
        return httpAuthSchemes;
      },
      setHttpAuthSchemeProvider(s) {
        httpAuthSchemeProvider = s;
      },
      httpAuthSchemeProvider() {
        return httpAuthSchemeProvider;
      },
      setCredentials(s) {
        credentials = s;
      },
      credentials() {
        return credentials;
      },
      setToken(s) {
        token = s;
      },
      token() {
        return token;
      },
    };
  },
  nt = (e) => ({
    httpAuthSchemes: e.httpAuthSchemes(),
    httpAuthSchemeProvider: e.httpAuthSchemeProvider(),
    credentials: e.credentials(),
    token: e.token(),
  });
//@ chunk-3cddmtk7.js:26936-27274 esm-fingerprint
var rt = (e, t) => {
  let merged = Object.assign(
    M.getAwsRegionExtensionConfiguration(e),
    F.getDefaultExtensionConfiguration(e),
    w.getHttpHandlerExtensionConfiguration(e),
    ot(e),
  );
  return (
    t.forEach((r) => r.configure(merged)),
    Object.assign(
      e,
      M.resolveAwsRegionExtensionConfiguration(merged),
      F.resolveDefaultRuntimeConfig(merged),
      w.resolveHttpHandlerRuntimeConfig(merged),
      nt(merged),
    )
  );
};
//@ chunk-3cddmtk7.js:27274-28388 esm-fingerprint
class BedrockRuntimeClient extends ut.Client {
  config;
  constructor(...[e]) {
    let t = tt(e || {});
    super(t);
    this.initConfig = t;
    let o = ye(t),
      userAgentConfig = O.resolveUserAgentConfig(o),
      retryConfig = U.resolveRetryConfig(userAgentConfig),
      regionConfig = it.resolveRegionConfig(retryConfig),
      hostHeaderConfig = L.resolveHostHeaderConfig(regionConfig),
      endpointConfig = lt.resolveEndpointConfig(hostHeaderConfig),
      c = ge(endpointConfig),
      p = Ae(c),
      u = ae(p),
      _ = xe(u),
      R = rt(_, e?.extensions || []);
    ((this.config = R),
      this.middlewareStack.use(ct.getSchemaSerdePlugin(this.config)),
      this.middlewareStack.use(O.getUserAgentPlugin(this.config)),
      this.middlewareStack.use(U.getRetryPlugin(this.config)),
      this.middlewareStack.use(_t.getContentLengthPlugin(this.config)),
      this.middlewareStack.use(L.getHostHeaderPlugin(this.config)),
      this.middlewareStack.use(st.getLoggerPlugin(this.config)),
      this.middlewareStack.use(at.getRecursionDetectionPlugin(this.config)),
      this.middlewareStack.use(
        B.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: he,
          identityProviderConfigProvider: async (T) =>
            new B.DefaultIdentityProviderConfig({
              "aws.auth#sigv4": T.credentials,
              "smithy.api#httpBearerAuth": T.token,
            }),
        }),
      ),
      this.middlewareStack.use(B.getHttpSigningPlugin(this.config)));
  }
  destroy() {
    super.destroy();
  }
}
//@ chunk-3cddmtk7.js:28388-28403 esm-layout
var l = Re(_D());
//@ chunk-3cddmtk7.js:28403-28419 esm-layout
var dt = Re(ff());
//@ chunk-3cddmtk7.js:28419-28522 esm-fingerprint
class BedrockRuntimeServiceException extends dt.ServiceException {
  constructor(e) {
    super(e);
    Object.setPrototypeOf(this, BedrockRuntimeServiceException.prototype);
  }
}
//@ chunk-3cddmtk7.js:28522-28701 esm-fingerprint
class W extends BedrockRuntimeServiceException {
  name = "AccessDeniedException";
  $fault = "client";
  constructor(e) {
    super({ name: "AccessDeniedException", $fault: "client", ...e });
    Object.setPrototypeOf(this, W.prototype);
  }
}
//@ chunk-3cddmtk7.js:28701-28888 esm-fingerprint
class InternalServerException extends BedrockRuntimeServiceException {
  name = "InternalServerException";
  $fault = "server";
  constructor(e) {
    super({ name: "InternalServerException", $fault: "server", ...e });
    Object.setPrototypeOf(this, InternalServerException.prototype);
  }
}
//@ chunk-3cddmtk7.js:28888-29067 esm-fingerprint
class ThrottlingException extends BedrockRuntimeServiceException {
  name = "ThrottlingException";
  $fault = "client";
  constructor(e) {
    super({ name: "ThrottlingException", $fault: "client", ...e });
    Object.setPrototypeOf(this, ThrottlingException.prototype);
  }
}
//@ chunk-3cddmtk7.js:29067-29246 esm-fingerprint
class ValidationException extends BedrockRuntimeServiceException {
  name = "ValidationException";
  $fault = "client";
  constructor(e) {
    super({ name: "ValidationException", $fault: "client", ...e });
    Object.setPrototypeOf(this, ValidationException.prototype);
  }
}
//@ chunk-3cddmtk7.js:29246-29417 esm-fingerprint
class N extends BedrockRuntimeServiceException {
  name = "ConflictException";
  $fault = "client";
  constructor(e) {
    super({ name: "ConflictException", $fault: "client", ...e });
    Object.setPrototypeOf(this, N.prototype);
  }
}
//@ chunk-3cddmtk7.js:29417-29604 esm-fingerprint
class H extends BedrockRuntimeServiceException {
  name = "ResourceNotFoundException";
  $fault = "client";
  constructor(e) {
    super({ name: "ResourceNotFoundException", $fault: "client", ...e });
    Object.setPrototypeOf(this, H.prototype);
  }
}
//@ chunk-3cddmtk7.js:29604-29799 esm-fingerprint
class V extends BedrockRuntimeServiceException {
  name = "ServiceQuotaExceededException";
  $fault = "client";
  constructor(e) {
    super({ name: "ServiceQuotaExceededException", $fault: "client", ...e });
    Object.setPrototypeOf(this, V.prototype);
  }
}
//@ chunk-3cddmtk7.js:29799-29994 esm-fingerprint
class ServiceUnavailableException extends BedrockRuntimeServiceException {
  name = "ServiceUnavailableException";
  $fault = "server";
  constructor(e) {
    super({ name: "ServiceUnavailableException", $fault: "server", ...e });
    Object.setPrototypeOf(this, ServiceUnavailableException.prototype);
  }
}
//@ chunk-3cddmtk7.js:29994-30279 esm-fingerprint
class q extends BedrockRuntimeServiceException {
  name = "ModelErrorException";
  $fault = "client";
  originalStatusCode;
  resourceName;
  constructor(e) {
    super({ name: "ModelErrorException", $fault: "client", ...e });
    (Object.setPrototypeOf(this, q.prototype),
      (this.originalStatusCode = e.originalStatusCode),
      (this.resourceName = e.resourceName));
  }
}
//@ chunk-3cddmtk7.js:30279-30474 esm-fingerprint
class j extends BedrockRuntimeServiceException {
  name = "ModelNotReadyException";
  $fault = "client";
  $retryable = {};
  constructor(e) {
    super({ name: "ModelNotReadyException", $fault: "client", ...e });
    Object.setPrototypeOf(this, j.prototype);
  }
}
//@ chunk-3cddmtk7.js:30474-30657 esm-fingerprint
class ModelTimeoutException extends BedrockRuntimeServiceException {
  name = "ModelTimeoutException";
  $fault = "client";
  constructor(e) {
    super({ name: "ModelTimeoutException", $fault: "client", ...e });
    Object.setPrototypeOf(this, ModelTimeoutException.prototype);
  }
}
//@ chunk-3cddmtk7.js:30657-30967 esm-fingerprint
class ModelStreamErrorException extends BedrockRuntimeServiceException {
  name = "ModelStreamErrorException";
  $fault = "client";
  originalStatusCode;
  originalMessage;
  constructor(e) {
    super({ name: "ModelStreamErrorException", $fault: "client", ...e });
    (Object.setPrototypeOf(this, ModelStreamErrorException.prototype),
      (this.originalStatusCode = e.originalStatusCode),
      (this.originalMessage = e.originalMessage));
  }
}
//@ chunk-3cddmtk7.js:30967-31021 layout
var Xt = [0, "com.amazonaws.bedrockruntime", "Body", 8, 21];
//@ chunk-3cddmtk7.js:31021-31143 layout
var zt = [
  -3,
  "com.amazonaws.bedrockruntime",
  "AccessDeniedException",
  { ["error"]: "client", ["httpError"]: 403 },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:31143-31214 layout
l.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(zt, W);
//@ chunk-3cddmtk7.js:31214-31280 layout
var Qt = [3, "com.amazonaws.bedrockruntime", "AnyToolChoice", 0, [], []];
//@ chunk-3cddmtk7.js:31280-31347 layout
var Kt = [3, "com.amazonaws.bedrockruntime", "AutoToolChoice", 0, [], []];
//@ chunk-3cddmtk7.js:31347-31717 layout
var re = [3, "com.amazonaws.bedrockruntime", "CachePointBlock", 0, ["type"], [0]],
  Jt = [
    3,
    "com.amazonaws.bedrockruntime",
    "Citation",
    0,
    ["title", "source", "sourceContent", "location"],
    [0, 0, () => Mo, () => Vo],
  ],
  pt = [3, "com.amazonaws.bedrockruntime", "CitationsConfig", 0, ["enabled"], [2]],
  Zt = [
    3,
    "com.amazonaws.bedrockruntime",
    "CitationsContentBlock",
    0,
    ["content", "citations"],
    [() => Po, () => bo],
  ];
//@ chunk-3cddmtk7.js:31717-31835 layout
var Yt = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ConflictException",
  { ["error"]: "client", ["httpError"]: 400 },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:31835-31906 layout
l.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(Yt, N);
//@ chunk-3cddmtk7.js:31906-32074 layout
var eo = [
  3,
  "com.amazonaws.bedrockruntime",
  "ConverseTokensRequest",
  0,
  ["messages", "system", "toolConfig", "additionalModelRequestFields"],
  [[() => Lo, 0], [() => Uo, 0], () => Ro, 15],
];
//@ chunk-3cddmtk7.js:32074-32697 layout
var to = [
    3,
    "com.amazonaws.bedrockruntime",
    "CountTokensRequest",
    0,
    ["modelId", "input"],
    [
      [0, 1],
      [() => $o, 0],
    ],
  ],
  oo = [3, "com.amazonaws.bedrockruntime", "CountTokensResponse", 0, ["inputTokens"], [1]],
  mt = [
    3,
    "com.amazonaws.bedrockruntime",
    "DocumentBlock",
    0,
    ["format", "name", "source", "context", "citations"],
    [0, 0, () => zo, 0, () => pt],
  ],
  no = [
    3,
    "com.amazonaws.bedrockruntime",
    "DocumentCharLocation",
    0,
    ["documentIndex", "start", "end"],
    [1, 1, 1],
  ],
  ro = [
    3,
    "com.amazonaws.bedrockruntime",
    "DocumentChunkLocation",
    0,
    ["documentIndex", "start", "end"],
    [1, 1, 1],
  ],
  so = [
    3,
    "com.amazonaws.bedrockruntime",
    "DocumentPageLocation",
    0,
    ["documentIndex", "start", "end"],
    [1, 1, 1],
  ];
//@ chunk-3cddmtk7.js:32697-32904 layout
var ao = [
    3,
    "com.amazonaws.bedrockruntime",
    "GuardrailConverseImageBlock",
    8,
    ["format", "source"],
    [0, [() => Qo, 0]],
  ],
  io = [3, "com.amazonaws.bedrockruntime", "GuardrailConverseTextBlock", 0, ["text", "qualifiers"], [0, 64]];
//@ chunk-3cddmtk7.js:32904-32992 layout
var xt = [3, "com.amazonaws.bedrockruntime", "ImageBlock", 0, ["format", "source"], [0, () => Ko]];
//@ chunk-3cddmtk7.js:32992-33116 layout
var co = [
  -3,
  "com.amazonaws.bedrockruntime",
  "InternalServerException",
  { ["error"]: "server", ["httpError"]: 500 },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:33116-33189 layout
l.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(co, InternalServerException);
//@ chunk-3cddmtk7.js:33189-33282 layout
var _o = [3, "com.amazonaws.bedrockruntime", "InvokeModelTokensRequest", 0, ["body"], [[() => Xt, 0]]];
//@ chunk-3cddmtk7.js:33282-33370 layout
var lo = [3, "com.amazonaws.bedrockruntime", "Message", 0, ["role", "content"], [0, [() => wo, 0]]];
//@ chunk-3cddmtk7.js:33370-33530 layout
var uo = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ModelErrorException",
  { ["error"]: "client", ["httpError"]: 424 },
  ["message", "originalStatusCode", "resourceName"],
  [0, 1, 0],
];
//@ chunk-3cddmtk7.js:33530-33601 layout
l.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(uo, q);
//@ chunk-3cddmtk7.js:33601-33724 layout
var po = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ModelNotReadyException",
  { ["error"]: "client", ["httpError"]: 429 },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:33724-33795 layout
l.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(po, j);
//@ chunk-3cddmtk7.js:33795-33964 layout
var mo = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ModelStreamErrorException",
  { ["error"]: "client", ["httpError"]: 424 },
  ["message", "originalStatusCode", "originalMessage"],
  [0, 1, 0],
];
//@ chunk-3cddmtk7.js:33964-34037 layout
l.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(mo, ModelStreamErrorException);
//@ chunk-3cddmtk7.js:34037-34159 layout
var xo = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ModelTimeoutException",
  { ["error"]: "client", ["httpError"]: 408 },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:34159-34232 layout
l.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(xo, ModelTimeoutException);
//@ chunk-3cddmtk7.js:34232-34446 layout
var Co = [3, "com.amazonaws.bedrockruntime", "ReasoningTextBlock", 8, ["text", "signature"], [0, 0]],
  vo = [
    -3,
    "com.amazonaws.bedrockruntime",
    "ResourceNotFoundException",
    { ["error"]: "client", ["httpError"]: 404 },
    ["message"],
    [0],
  ];
//@ chunk-3cddmtk7.js:34446-34517 layout
l.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(vo, H);
//@ chunk-3cddmtk7.js:34517-35036 layout
var se = [3, "com.amazonaws.bedrockruntime", "S3Location", 0, ["uri", "bucketOwner"], [0, 0]],
  Ct = [
    3,
    "com.amazonaws.bedrockruntime",
    "SearchResultBlock",
    0,
    ["source", "title", "content", "citations"],
    [0, 0, () => Oo, () => pt],
  ],
  go = [3, "com.amazonaws.bedrockruntime", "SearchResultContentBlock", 0, ["text"], [0]],
  fo = [
    3,
    "com.amazonaws.bedrockruntime",
    "SearchResultLocation",
    0,
    ["searchResultIndex", "start", "end"],
    [1, 1, 1],
  ],
  ho = [
    -3,
    "com.amazonaws.bedrockruntime",
    "ServiceQuotaExceededException",
    { ["error"]: "client", ["httpError"]: 400 },
    ["message"],
    [0],
  ];
//@ chunk-3cddmtk7.js:35036-35107 layout
l.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(ho, V);
//@ chunk-3cddmtk7.js:35107-35235 layout
var So = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ServiceUnavailableException",
  { ["error"]: "server", ["httpError"]: 503 },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:35235-35308 layout
l.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(So, ServiceUnavailableException);
//@ chunk-3cddmtk7.js:35308-35386 layout
var Ao = [3, "com.amazonaws.bedrockruntime", "SpecificToolChoice", 0, ["name"], [0]];
//@ chunk-3cddmtk7.js:35386-35456 layout
var yo = [3, "com.amazonaws.bedrockruntime", "SystemTool", 0, ["name"], [0]];
//@ chunk-3cddmtk7.js:35456-35576 layout
var Bo = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ThrottlingException",
  { ["error"]: "client", ["httpError"]: 429 },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:35576-35649 layout
l.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(Bo, ThrottlingException);
//@ chunk-3cddmtk7.js:35649-35865 layout
var Ro = [
    3,
    "com.amazonaws.bedrockruntime",
    "ToolConfiguration",
    0,
    ["tools", "toolChoice"],
    [() => No, () => en],
  ],
  Eo = [
    3,
    "com.amazonaws.bedrockruntime",
    "ToolResultBlock",
    0,
    ["toolUseId", "content", "status", "type"],
    [0, () => Wo, 0, 0],
  ];
//@ chunk-3cddmtk7.js:35865-36081 layout
var Io = [
    3,
    "com.amazonaws.bedrockruntime",
    "ToolSpecification",
    0,
    ["name", "description", "inputSchema"],
    [0, 0, () => tn],
  ],
  To = [
    3,
    "com.amazonaws.bedrockruntime",
    "ToolUseBlock",
    0,
    ["toolUseId", "name", "input", "type"],
    [0, 0, 15, 0],
  ];
//@ chunk-3cddmtk7.js:36081-36201 layout
var Go = [
  -3,
  "com.amazonaws.bedrockruntime",
  "ValidationException",
  { ["error"]: "client", ["httpError"]: 400 },
  ["message"],
  [0],
];
//@ chunk-3cddmtk7.js:36201-36274 layout
l.TypeRegistry.for("com.amazonaws.bedrockruntime").registerError(Go, ValidationException);
//@ chunk-3cddmtk7.js:36274-36439 layout
var vt = [3, "com.amazonaws.bedrockruntime", "VideoBlock", 0, ["format", "source"], [0, () => nn]],
  ko = [3, "com.amazonaws.bedrockruntime", "WebLocation", 0, ["url", "domain"], [0, 0]];
//@ chunk-3cddmtk7.js:36439-36547 layout
var Do = [
  -3,
  "smithy.ts.sdk.synthetic.com.amazonaws.bedrockruntime",
  "BedrockRuntimeServiceException",
  0,
  [],
  [],
];
//@ chunk-3cddmtk7.js:36547-36643 layout
l.TypeRegistry.for("smithy.ts.sdk.synthetic.com.amazonaws.bedrockruntime").registerError(
  Do,
  BedrockRuntimeServiceException,
);
//@ chunk-3cddmtk7.js:36643-36859 layout
var Po = [1, "com.amazonaws.bedrockruntime", "CitationGeneratedContentList", 0, () => Ho],
  bo = [1, "com.amazonaws.bedrockruntime", "Citations", 0, () => Jt],
  Mo = [1, "com.amazonaws.bedrockruntime", "CitationSourceContentList", 0, () => qo];
//@ chunk-3cddmtk7.js:36859-37001 layout
var wo = [1, "com.amazonaws.bedrockruntime", "ContentBlocks", 0, [() => jo, 0]],
  Fo = [1, "com.amazonaws.bedrockruntime", "DocumentContentBlocks", 0, () => Xo];
//@ chunk-3cddmtk7.js:37001-37067 layout
var Lo = [1, "com.amazonaws.bedrockruntime", "Messages", 0, [() => lo, 0]];
//@ chunk-3cddmtk7.js:37067-37219 layout
var Oo = [1, "com.amazonaws.bedrockruntime", "SearchResultContentBlocks", 0, () => go],
  Uo = [1, "com.amazonaws.bedrockruntime", "SystemContentBlocks", 0, [() => Zo, 0]];
//@ chunk-3cddmtk7.js:37219-37351 layout
var Wo = [1, "com.amazonaws.bedrockruntime", "ToolResultContentBlocks", 0, () => on],
  No = [1, "com.amazonaws.bedrockruntime", "Tools", 0, () => Yo];
//@ chunk-3cddmtk7.js:37351-37962 layout
var Ho = [3, "com.amazonaws.bedrockruntime", "CitationGeneratedContent", 0, ["text"], [0]],
  Vo = [
    3,
    "com.amazonaws.bedrockruntime",
    "CitationLocation",
    0,
    ["web", "documentChar", "documentPage", "documentChunk", "searchResultLocation"],
    [() => ko, () => no, () => so, () => ro, () => fo],
  ],
  qo = [3, "com.amazonaws.bedrockruntime", "CitationSourceContent", 0, ["text"], [0]],
  jo = [
    3,
    "com.amazonaws.bedrockruntime",
    "ContentBlock",
    0,
    [
      "text",
      "image",
      "document",
      "video",
      "toolUse",
      "toolResult",
      "guardContent",
      "cachePoint",
      "reasoningContent",
      "citationsContent",
      "searchResult",
    ],
    [
      0,
      () => xt,
      () => mt,
      () => vt,
      () => To,
      () => Eo,
      [() => gt, 0],
      () => re,
      [() => Jo, 0],
      () => Zt,
      () => Ct,
    ],
  ];
//@ chunk-3cddmtk7.js:37962-38270 layout
var $o = [
    3,
    "com.amazonaws.bedrockruntime",
    "CountTokensInput",
    0,
    ["invokeModel", "converse"],
    [
      [() => _o, 0],
      [() => eo, 0],
    ],
  ],
  Xo = [3, "com.amazonaws.bedrockruntime", "DocumentContentBlock", 0, ["text"], [0]],
  zo = [
    3,
    "com.amazonaws.bedrockruntime",
    "DocumentSource",
    0,
    ["bytes", "s3Location", "text", "content"],
    [21, () => se, 0, () => Fo],
  ];
//@ chunk-3cddmtk7.js:38270-38469 layout
var gt = [
    3,
    "com.amazonaws.bedrockruntime",
    "GuardrailConverseContentBlock",
    0,
    ["text", "image"],
    [() => io, [() => ao, 0]],
  ],
  Qo = [3, "com.amazonaws.bedrockruntime", "GuardrailConverseImageSource", 8, ["bytes"], [21]];
//@ chunk-3cddmtk7.js:38469-38562 layout
var Ko = [3, "com.amazonaws.bedrockruntime", "ImageSource", 0, ["bytes", "s3Location"], [21, () => se]];
//@ chunk-3cddmtk7.js:38562-38682 layout
var Jo = [
  3,
  "com.amazonaws.bedrockruntime",
  "ReasoningContentBlock",
  8,
  ["reasoningText", "redactedContent"],
  [[() => Co, 0], 21],
];
//@ chunk-3cddmtk7.js:38682-39085 layout
var Zo = [
    3,
    "com.amazonaws.bedrockruntime",
    "SystemContentBlock",
    0,
    ["text", "guardContent", "cachePoint"],
    [0, [() => gt, 0], () => re],
  ],
  Yo = [
    3,
    "com.amazonaws.bedrockruntime",
    "Tool",
    0,
    ["toolSpec", "systemTool", "cachePoint"],
    [() => Io, () => yo, () => re],
  ],
  en = [
    3,
    "com.amazonaws.bedrockruntime",
    "ToolChoice",
    0,
    ["auto", "any", "tool"],
    [() => Kt, () => Qt, () => Ao],
  ],
  tn = [3, "com.amazonaws.bedrockruntime", "ToolInputSchema", 0, ["json"], [15]];
//@ chunk-3cddmtk7.js:39085-39336 layout
var on = [
    3,
    "com.amazonaws.bedrockruntime",
    "ToolResultContentBlock",
    0,
    ["json", "text", "image", "document", "video", "searchResult"],
    [15, 0, () => xt, () => mt, () => vt, () => Ct],
  ],
  nn = [3, "com.amazonaws.bedrockruntime", "VideoSource", 0, ["bytes", "s3Location"], [21, () => se]];
//@ chunk-3cddmtk7.js:39336-39462 layout
var ft = [
  9,
  "com.amazonaws.bedrockruntime",
  "CountTokens",
  { ["http"]: ["POST", "/model/{modelId}/count-tokens", 200] },
  () => to,
  () => oo,
];
//@ chunk-3cddmtk7.js:39462-39490 esm-layout
var ht = Re(pK()),
  St = Re(ff());
//@ chunk-3cddmtk7.js:39490-39746 esm-fingerprint
class CountTokensCommand extends St.Command.classBuilder()
  .ep(Be)
  .m(function (e, t, o, r) {
    return [ht.getEndpointPlugin(o, e.getEndpointParameterInstructions())];
  })
  .s("AmazonBedrockFrontendService", "CountTokens", {})
  .n("BedrockRuntimeClient", "CountTokensCommand")
  .sc(ft)
  .build() {}

export {
  InternalServerException,
  ModelStreamErrorException,
  ModelTimeoutException,
  ServiceUnavailableException,
  ThrottlingException,
  ValidationException,
  BedrockRuntimeServiceException,
};
