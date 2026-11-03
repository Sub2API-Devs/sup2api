/**
 * @bufbuild/cel/dist/cjs/env.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_registry_2 } from "./registry.js";
import { require_namespace } from "./namespace.js";
import { require_resolver } from "./resolver.js";
import { require_cast } from "./std/cast.js";
import { require_math } from "./std/math.js";
import { require_logic } from "./std/logic.js";
import { require_time } from "./std/time.js";

//@ chunk-fq0cr76a.js:510126-510775 cjs-fingerprint
var require_env = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.celEnv = celEnv;
  var registry_js_1 = require_registry_2();
  var namespace_js_1 = require_namespace();
  var resolver_js_1 = require_resolver();
  var cast_js_1 = require_cast();
  var math_js_1 = require_math();
  var logic_js_1 = require_logic();
  var time_js_1 = require_time();
  var privateSymbol = Symbol.for("@bufbuild/cel/env");
  function celEnv(options) {
    return new _CelEnv(
      options?.namespace ? new namespace_js_1.Namespace(options?.namespace) : undefined,
      options?.registry
        ? registry_js_1.createRegistryWithWKT(options.registry)
        : registry_js_1.createRegistryWithWKT(),
      resolver_js_1.createResolver(
        math_js_1.default,
        cast_js_1.default,
        time_js_1.default,
        logic_js_1.default,
        options?.funcs ?? [],
      ),
    );
  }
  class _CelEnv {
    _namespace;
    _registry;
    _funcs;
    [privateSymbol] = {};
    constructor(_namespace, _registry, _funcs) {
      this._namespace = _namespace;
      this._registry = _registry;
      this._funcs = _funcs;
    }
    get namespace() {
      return this._namespace;
    }
    get registry() {
      return this._registry;
    }
    get funcs() {
      return this._funcs;
    }
  }
});
export { require_env };
