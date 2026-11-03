/**
 * @bufbuild/cel/dist/cjs/env.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { VL } from "./registry.js";
import { D_ } from "./namespace.js";
import { ZL } from "./resolver.js";
import { kB } from "./std/cast.js";
import { H_ } from "./std/math.js";
import { MB } from "./std/logic.js";
import { VB } from "./std/time.js";

//@ chunk-fq0cr76a.js:510126-510775 cjs-fingerprint
var Y_ = x(function (KB) {
  Object.defineProperty(KB, "__esModule", { value: !0 });
  KB.celEnv = eie;
  var qy = VL(),
    WB = D_(),
    GB = ZL(),
    Zse = kB(),
    zse = H_(),
    Xse = MB(),
    Jse = VB(),
    Qse = Symbol.for("@bufbuild/cel/env");
  function eie(e) {
    return new HB(
      e?.namespace ? new WB.Namespace(e?.namespace) : void 0,
      e?.registry ? qy.createRegistryWithWKT(e.registry) : qy.createRegistryWithWKT(),
      GB.createResolver(zse.default, Zse.default, Jse.default, Xse.default, e?.funcs ?? []),
    );
  }
  class HB {
    _namespace;
    _registry;
    _funcs;
    [Qse] = {};
    constructor(e, n, r) {
      ((this._namespace = e), (this._registry = n), (this._funcs = r));
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

export { Y_ };
