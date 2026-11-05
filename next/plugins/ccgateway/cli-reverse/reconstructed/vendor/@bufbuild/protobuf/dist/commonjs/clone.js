/**
 * @bufbuild/protobuf/dist/commonjs/clone.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_descriptors } from "../cjs/descriptors.js";
import { require_reflect } from "../cjs/reflect/reflect.js";
import { require_guard } from "../cjs/reflect/guard.js";

//@ chunk-qg41pqt6.js:360105-360803 cjs-fingerprint
var require_clone = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.clone = clone;
  var descriptors_js_1 = require_descriptors();
  var reflect_js_1 = require_reflect();
  var guard_js_1 = require_guard();
  function clone(schema, message) {
    return cloneReflect(reflect_js_1.reflect(schema, message)).message;
  }
  function cloneReflect(i) {
    let o = reflect_js_1.reflect(i.desc);
    for (let f of i.fields) {
      if (!i.isSet(f)) continue;
      switch (f.fieldKind) {
        case "list":
          let list = o.get(f);
          for (let item of i.get(f)) list.add(cloneSingular(f, item));
          break;
        case "map":
          let map = o.get(f);
          for (let entry of i.get(f).entries()) map.set(entry[0], cloneSingular(f, entry[1]));
          break;
        default: {
          o.set(f, cloneSingular(f, i.get(f)));
          break;
        }
      }
    }
    let unknown = i.getUnknown();
    if (unknown && unknown.length > 0) o.setUnknown([...unknown]);
    return o;
  }
  function cloneSingular(field, value) {
    if (field.message !== undefined && guard_js_1.isReflectMessage(value)) return cloneReflect(value);
    if (field.scalar == descriptors_js_1.ScalarType.BYTES && value instanceof Uint8Array)
      return value.slice();
    return value;
  }
});
export { require_clone };
