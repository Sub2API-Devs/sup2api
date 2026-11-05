/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/auth/httpAuthExtensionConfiguration.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-brqnbz3r.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";

//@ chunk-brqnbz3r.js:9866-10562 cjs-require-graph
var require_httpAuthExtensionConfiguration = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.resolveHttpAuthRuntimeConfig = cjsExports.getHttpAuthExtensionConfiguration = undefined;
  var getHttpAuthExtensionConfiguration = (runtimeConfig) => {
    let {
      httpAuthSchemes: _httpAuthSchemes,
      httpAuthSchemeProvider: _httpAuthSchemeProvider,
      credentials: _credentials,
    } = runtimeConfig;
    return {
      setHttpAuthScheme(httpAuthScheme) {
        let index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
        if (index === -1) _httpAuthSchemes.push(httpAuthScheme);
        else _httpAuthSchemes.splice(index, 1, httpAuthScheme);
      },
      httpAuthSchemes() {
        return _httpAuthSchemes;
      },
      setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
        _httpAuthSchemeProvider = httpAuthSchemeProvider;
      },
      httpAuthSchemeProvider() {
        return _httpAuthSchemeProvider;
      },
      setCredentials(credentials) {
        _credentials = credentials;
      },
      credentials() {
        return _credentials;
      },
    };
  };
  cjsExports.getHttpAuthExtensionConfiguration = getHttpAuthExtensionConfiguration;
  var resolveHttpAuthRuntimeConfig = (config) => ({
    httpAuthSchemes: config.httpAuthSchemes(),
    httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
    credentials: config.credentials(),
  });
  cjsExports.resolveHttpAuthRuntimeConfig = resolveHttpAuthRuntimeConfig;
});
export { require_httpAuthExtensionConfiguration };
