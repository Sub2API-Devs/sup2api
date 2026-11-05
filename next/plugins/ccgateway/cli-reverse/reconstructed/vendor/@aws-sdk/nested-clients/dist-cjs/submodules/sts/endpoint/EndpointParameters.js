/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/endpoint/EndpointParameters.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-brqnbz3r.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";

//@ chunk-brqnbz3r.js:1925-2573 cjs-require-graph
var require_EndpointParameters = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.commonParams = cjsExports.resolveClientEndpointParameters = undefined;
  var resolveClientEndpointParameters = (options) =>
    Object.assign(options, {
      useDualstackEndpoint: options.useDualstackEndpoint ?? false,
      useFipsEndpoint: options.useFipsEndpoint ?? false,
      useGlobalEndpoint: options.useGlobalEndpoint ?? false,
      defaultSigningName: "sts",
    });
  cjsExports.resolveClientEndpointParameters = resolveClientEndpointParameters;
  cjsExports.commonParams = {
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
});
export { require_EndpointParameters };
