/**
 * @smithy/types/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/types@4.11.0..4.19.0
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-hq88884p.js:1015-2578 cjs-fingerprint
var W1e = x(function (Tr) {
  Tr.HttpAuthLocation = void 0;
  (function (e) {
    ((e.HEADER = "header"), (e.QUERY = "query"));
  })(Tr.HttpAuthLocation || (Tr.HttpAuthLocation = {}));
  Tr.HttpApiKeyAuthLocation = void 0;
  (function (e) {
    ((e.HEADER = "header"), (e.QUERY = "query"));
  })(Tr.HttpApiKeyAuthLocation || (Tr.HttpApiKeyAuthLocation = {}));
  Tr.EndpointURLScheme = void 0;
  (function (e) {
    ((e.HTTP = "http"), (e.HTTPS = "https"));
  })(Tr.EndpointURLScheme || (Tr.EndpointURLScheme = {}));
  Tr.AlgorithmId = void 0;
  (function (e) {
    ((e.MD5 = "md5"), (e.CRC32 = "crc32"), (e.CRC32C = "crc32c"), (e.SHA1 = "sha1"), (e.SHA256 = "sha256"));
  })(Tr.AlgorithmId || (Tr.AlgorithmId = {}));
  var _r = (e) => {
      let r = [];
      if (e.sha256 !== void 0)
        r.push({ algorithmId: () => Tr.AlgorithmId.SHA256, checksumConstructor: () => e.sha256 });
      if (e.md5 != null) r.push({ algorithmId: () => Tr.AlgorithmId.MD5, checksumConstructor: () => e.md5 });
      return {
        addChecksumAlgorithm(n) {
          r.push(n);
        },
        checksumAlgorithms() {
          return r;
        },
      };
    },
    Er = (e) => {
      let r = {};
      return (
        e.checksumAlgorithms().forEach((n) => {
          r[n.algorithmId()] = n.checksumConstructor();
        }),
        r
      );
    },
    Ar = (e) => _r(e),
    Sr = (e) => Er(e);
  Tr.FieldPosition = void 0;
  (function (e) {
    ((e[(e.HEADER = 0)] = "HEADER"), (e[(e.TRAILER = 1)] = "TRAILER"));
  })(Tr.FieldPosition || (Tr.FieldPosition = {}));
  var xr = "__smithy_context";
  Tr.IniSectionType = void 0;
  (function (e) {
    ((e.PROFILE = "profile"), (e.SSO_SESSION = "sso-session"), (e.SERVICES = "services"));
  })(Tr.IniSectionType || (Tr.IniSectionType = {}));
  Tr.RequestHandlerProtocol = void 0;
  (function (e) {
    ((e.HTTP_0_9 = "http/0.9"), (e.HTTP_1_0 = "http/1.0"), (e.TDS_8_0 = "tds/8.0"));
  })(Tr.RequestHandlerProtocol || (Tr.RequestHandlerProtocol = {}));
  Tr.SMITHY_CONTEXT_KEY = xr;
  Tr.getDefaultClientConfiguration = Ar;
  Tr.resolveDefaultRuntimeConfig = Sr;
});

export { W1e };
