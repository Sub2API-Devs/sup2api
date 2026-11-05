/**
 * @bufbuild/cel/dist/cjs/activation.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_error } from "./error.js";
import { require_value } from "./value.js";

//@ chunk-qg41pqt6.js:611633-612177 cjs-fingerprint
var require_activation = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.EMPTY_ACTIVATION = cjsExports.VarActivation = cjsExports.ObjectActivation = undefined;
  var error_js_1 = require_error();
  var value_js_1 = require_value();
  class ObjectActivation {
    data;
    constructor(data) {
      this.data = data;
    }
    resolve(name) {
      let value = this.data[name];
      if (value === undefined) return;
      if (error_js_1.isCelError(value)) return value;
      return value_js_1.toCel(value);
    }
  }
  cjsExports.ObjectActivation = ObjectActivation;
  class VarActivation {
    name;
    value;
    parent;
    constructor(name, value, parent) {
      this.name = name;
      this.value = value;
      this.parent = parent;
    }
    resolve(name) {
      if (name === this.name) return this.value;
      return this.parent.resolve(name);
    }
  }
  cjsExports.VarActivation = VarActivation;
  cjsExports.EMPTY_ACTIVATION = {
    resolve() {
      return;
    },
  };
});
export { require_activation };
