/**
 * @smithy/types/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/types@4.11.0..4.19.0
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-hq88884p.js:1015-2578 cjs-fingerprint
var require_types = x(function (cjsExports) {
  cjsExports.HttpAuthLocation = undefined;
  (function (HttpAuthLocation) {
    HttpAuthLocation.HEADER = "header";
    HttpAuthLocation.QUERY = "query";
  })(cjsExports.HttpAuthLocation || (cjsExports.HttpAuthLocation = {}));
  cjsExports.HttpApiKeyAuthLocation = undefined;
  (function (HttpApiKeyAuthLocation) {
    HttpApiKeyAuthLocation.HEADER = "header";
    HttpApiKeyAuthLocation.QUERY = "query";
  })(cjsExports.HttpApiKeyAuthLocation || (cjsExports.HttpApiKeyAuthLocation = {}));
  cjsExports.EndpointURLScheme = undefined;
  (function (EndpointURLScheme) {
    EndpointURLScheme.HTTP = "http";
    EndpointURLScheme.HTTPS = "https";
  })(cjsExports.EndpointURLScheme || (cjsExports.EndpointURLScheme = {}));
  cjsExports.AlgorithmId = undefined;
  (function (AlgorithmId) {
    AlgorithmId.MD5 = "md5";
    AlgorithmId.CRC32 = "crc32";
    AlgorithmId.CRC32C = "crc32c";
    AlgorithmId.SHA1 = "sha1";
    AlgorithmId.SHA256 = "sha256";
  })(cjsExports.AlgorithmId || (cjsExports.AlgorithmId = {}));
  var getChecksumConfiguration = (runtimeConfig) => {
    let checksumAlgorithms = [];
    if (runtimeConfig.sha256 !== undefined)
      checksumAlgorithms.push({
        algorithmId: () => cjsExports.AlgorithmId.SHA256,
        checksumConstructor: () => runtimeConfig.sha256,
      });
    if (runtimeConfig.md5 != null)
      checksumAlgorithms.push({
        algorithmId: () => cjsExports.AlgorithmId.MD5,
        checksumConstructor: () => runtimeConfig.md5,
      });
    return {
      addChecksumAlgorithm(algo) {
        checksumAlgorithms.push(algo);
      },
      checksumAlgorithms() {
        return checksumAlgorithms;
      },
    };
  };
  var Er = (clientConfig) => {
    let runtimeConfig = {};
    clientConfig.checksumAlgorithms().forEach((checksumAlgorithm) => {
      runtimeConfig[checksumAlgorithm.algorithmId()] = checksumAlgorithm.checksumConstructor();
    });
    return runtimeConfig;
  };
  var getDefaultClientConfiguration = (runtimeConfig) => getChecksumConfiguration(runtimeConfig);
  var resolveDefaultRuntimeConfig = (config) => Er(config);
  cjsExports.FieldPosition = undefined;
  (function (FieldPosition) {
    FieldPosition[(FieldPosition.HEADER = 0)] = "HEADER";
    FieldPosition[(FieldPosition.TRAILER = 1)] = "TRAILER";
  })(cjsExports.FieldPosition || (cjsExports.FieldPosition = {}));
  var SMITHY_CONTEXT_KEY = "__smithy_context";
  cjsExports.IniSectionType = undefined;
  (function (IniSectionType) {
    IniSectionType.PROFILE = "profile";
    IniSectionType.SSO_SESSION = "sso-session";
    IniSectionType.SERVICES = "services";
  })(cjsExports.IniSectionType || (cjsExports.IniSectionType = {}));
  cjsExports.RequestHandlerProtocol = undefined;
  (function (RequestHandlerProtocol) {
    RequestHandlerProtocol.HTTP_0_9 = "http/0.9";
    RequestHandlerProtocol.HTTP_1_0 = "http/1.0";
    RequestHandlerProtocol.TDS_8_0 = "tds/8.0";
  })(cjsExports.RequestHandlerProtocol || (cjsExports.RequestHandlerProtocol = {}));
  cjsExports.SMITHY_CONTEXT_KEY = SMITHY_CONTEXT_KEY;
  cjsExports.getDefaultClientConfiguration = getDefaultClientConfiguration;
  cjsExports.resolveDefaultRuntimeConfig = resolveDefaultRuntimeConfig;
});
export { require_types };
