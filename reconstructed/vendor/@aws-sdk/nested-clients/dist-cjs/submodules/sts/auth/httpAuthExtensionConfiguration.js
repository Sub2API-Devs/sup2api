/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/auth/httpAuthExtensionConfiguration.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-a8ee6x44.js (1)
 * attribution: cjs-require-graph 1
 */
import { x as x_2 } from "../../../../../../../runtime/bun-runtime.js";

//@ chunk-a8ee6x44.js:9866-10562 cjs-require-graph
var It = x_2(function (xt) {
  Object.defineProperty(xt, "__esModule", { value: !0 });
  xt.resolveHttpAuthRuntimeConfig = xt.getHttpAuthExtensionConfiguration = void 0;
  var qo = (e) => {
    let {
      httpAuthSchemes: httpAuthSchemes,
      httpAuthSchemeProvider: httpAuthSchemeProvider,
      credentials: credentials,
    } = e;
    return {
      setHttpAuthScheme(r) {
        let index = httpAuthSchemes.findIndex((l) => l.schemeId === r.schemeId);
        if (index === -1) httpAuthSchemes.push(r);
        else httpAuthSchemes.splice(index, 1, r);
      },
      httpAuthSchemes() {
        return httpAuthSchemes;
      },
      setHttpAuthSchemeProvider(r) {
        httpAuthSchemeProvider = r;
      },
      httpAuthSchemeProvider() {
        return httpAuthSchemeProvider;
      },
      setCredentials(r) {
        credentials = r;
      },
      credentials() {
        return credentials;
      },
    };
  };
  xt.getHttpAuthExtensionConfiguration = qo;
  var ko = (e) => ({
    httpAuthSchemes: e.httpAuthSchemes(),
    httpAuthSchemeProvider: e.httpAuthSchemeProvider(),
    credentials: e.credentials(),
  });
  xt.resolveHttpAuthRuntimeConfig = ko;
});

export { It };
