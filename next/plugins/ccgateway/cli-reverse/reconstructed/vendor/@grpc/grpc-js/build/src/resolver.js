/**
 * @grpc/grpc-js/build/src/resolver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";
import { we } from "./uri-parser.js";

//@ chunk-pwh5dx3n.js:11712-12568 cjs-fingerprint
var rt = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.CHANNEL_ARGS_CONFIG_SELECTOR_KEY = undefined;
  cjsExports.registerResolver = registerResolver;
  cjsExports.registerDefaultScheme = registerDefaultScheme;
  cjsExports.createResolver = createResolver;
  cjsExports.getDefaultAuthority = getDefaultAuthority;
  cjsExports.mapUriDefaultScheme = mapUriDefaultScheme;
  var uri_parser_1 = we();
  cjsExports.CHANNEL_ARGS_CONFIG_SELECTOR_KEY = "grpc.internal.config_selector";
  var registeredResolvers = {};
  var defaultScheme = null;
  function registerResolver(scheme, resolverClass) {
    registeredResolvers[scheme] = resolverClass;
  }
  function registerDefaultScheme(scheme) {
    defaultScheme = scheme;
  }
  function createResolver(target, listener, options) {
    if (target.scheme !== undefined && target.scheme in registeredResolvers)
      return new registeredResolvers[target.scheme](target, listener, options);
    else throw Error(`No resolver could be created for target ${uri_parser_1.uriToString(target)}`);
  }
  function getDefaultAuthority(target) {
    if (target.scheme !== undefined && target.scheme in registeredResolvers)
      return registeredResolvers[target.scheme].getDefaultAuthority(target);
    else throw Error(`Invalid target ${uri_parser_1.uriToString(target)}`);
  }
  function mapUriDefaultScheme(target) {
    if (target.scheme === undefined || !(target.scheme in registeredResolvers))
      if (defaultScheme !== null)
        return {
          scheme: defaultScheme,
          authority: undefined,
          path: uri_parser_1.uriToString(target),
        };
      else return null;
    return target;
  }
});
export { rt };
