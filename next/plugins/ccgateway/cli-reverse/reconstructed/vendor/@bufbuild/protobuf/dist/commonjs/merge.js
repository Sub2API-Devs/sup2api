/**
 * @bufbuild/protobuf/dist/commonjs/merge.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_reflect } from "../cjs/reflect/reflect.js";

//@ chunk-fq0cr76a.js:465470-466118 cjs-fingerprint
var require_merge = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.merge = merge;
  var reflect_js_1 = require_reflect();
  function merge(schema, target, source) {
    reflectMerge(reflect_js_1.reflect(schema, target), reflect_js_1.reflect(schema, source));
  }
  function reflectMerge(target, source) {
    var _a;
    var _b;
    let sourceUnknown = source.message.$unknown;
    if (sourceUnknown !== undefined && sourceUnknown.length > 0) {
      if (!((_a = (_b = target.message).$unknown) !== null && _a !== undefined)) _b.$unknown = [];
      target.message.$unknown.push(...sourceUnknown);
    }
    for (let f of target.fields) {
      if (!source.isSet(f)) continue;
      switch (f.fieldKind) {
        case "scalar":
        case "enum":
          target.set(f, source.get(f));
          break;
        case "message":
          if (target.isSet(f)) reflectMerge(target.get(f), source.get(f));
          else target.set(f, source.get(f));
          break;
        case "list":
          let list = target.get(f);
          for (let e of source.get(f)) list.add(e);
          break;
        case "map":
          let map = target.get(f);
          for (let [k, v] of source.get(f)) map.set(k, v);
          break;
      }
    }
  }
});
export { require_merge };
