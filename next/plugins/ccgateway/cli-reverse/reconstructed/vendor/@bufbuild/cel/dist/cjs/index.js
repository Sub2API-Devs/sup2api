/**
 * @bufbuild/cel/dist/cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_error } from "./error.js";
import { require_map } from "./map.js";
import { require_list } from "./list.js";
import { require_uint } from "./uint.js";
import { require_proto } from "./proto.js";
import { require_type } from "./type.js";
import { require_run } from "./run.js";
import { require_plan } from "./plan.js";
import { require_parse_2 } from "./parse.js";
import { require_env } from "./env.js";
import { require_func } from "./func.js";

//@ chunk-qg41pqt6.js:629611-632028 cjs-fingerprint
var require_cel = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.celFunc =
    cjsExports.celMethod =
    cjsExports.celEnv =
    cjsExports.parse =
    cjsExports.plan =
    cjsExports.run =
    cjsExports.isCelType =
    cjsExports.mapType =
    cjsExports.listType =
    cjsExports.CelScalar =
    cjsExports.objectType =
    cjsExports.celType =
    cjsExports.celFromScalar =
    cjsExports.isCelUint =
    cjsExports.celUint =
    cjsExports.celListConcat =
    cjsExports.isCelList =
    cjsExports.celList =
    cjsExports.isCelMap =
    cjsExports.celMap =
    cjsExports.isCelError =
    cjsExports.celError =
      undefined;
  var error_js_1 = require_error();
  Object.defineProperty(cjsExports, "celError", {
    enumerable: true,
    get: function () {
      return error_js_1.celError;
    },
  });
  Object.defineProperty(cjsExports, "isCelError", {
    enumerable: true,
    get: function () {
      return error_js_1.isCelError;
    },
  });
  var map_js_1 = require_map();
  Object.defineProperty(cjsExports, "celMap", {
    enumerable: true,
    get: function () {
      return map_js_1.celMap;
    },
  });
  Object.defineProperty(cjsExports, "isCelMap", {
    enumerable: true,
    get: function () {
      return map_js_1.isCelMap;
    },
  });
  var list_js_1 = require_list();
  Object.defineProperty(cjsExports, "celList", {
    enumerable: true,
    get: function () {
      return list_js_1.celList;
    },
  });
  Object.defineProperty(cjsExports, "isCelList", {
    enumerable: true,
    get: function () {
      return list_js_1.isCelList;
    },
  });
  Object.defineProperty(cjsExports, "celListConcat", {
    enumerable: true,
    get: function () {
      return list_js_1.celListConcat;
    },
  });
  var uint_js_1 = require_uint();
  Object.defineProperty(cjsExports, "celUint", {
    enumerable: true,
    get: function () {
      return uint_js_1.celUint;
    },
  });
  Object.defineProperty(cjsExports, "isCelUint", {
    enumerable: true,
    get: function () {
      return uint_js_1.isCelUint;
    },
  });
  var proto_js_1 = require_proto();
  Object.defineProperty(cjsExports, "celFromScalar", {
    enumerable: true,
    get: function () {
      return proto_js_1.celFromScalar;
    },
  });
  var type_js_1 = require_type();
  Object.defineProperty(cjsExports, "celType", {
    enumerable: true,
    get: function () {
      return type_js_1.celType;
    },
  });
  Object.defineProperty(cjsExports, "objectType", {
    enumerable: true,
    get: function () {
      return type_js_1.objectType;
    },
  });
  Object.defineProperty(cjsExports, "CelScalar", {
    enumerable: true,
    get: function () {
      return type_js_1.CelScalar;
    },
  });
  Object.defineProperty(cjsExports, "listType", {
    enumerable: true,
    get: function () {
      return type_js_1.listType;
    },
  });
  Object.defineProperty(cjsExports, "mapType", {
    enumerable: true,
    get: function () {
      return type_js_1.mapType;
    },
  });
  Object.defineProperty(cjsExports, "isCelType", {
    enumerable: true,
    get: function () {
      return type_js_1.isCelType;
    },
  });
  var run_js_1 = require_run();
  Object.defineProperty(cjsExports, "run", {
    enumerable: true,
    get: function () {
      return run_js_1.run;
    },
  });
  var plan_js_1 = require_plan();
  Object.defineProperty(cjsExports, "plan", {
    enumerable: true,
    get: function () {
      return plan_js_1.plan;
    },
  });
  var parse_js_1 = require_parse_2();
  Object.defineProperty(cjsExports, "parse", {
    enumerable: true,
    get: function () {
      return parse_js_1.parse;
    },
  });
  var env_js_1 = require_env();
  Object.defineProperty(cjsExports, "celEnv", {
    enumerable: true,
    get: function () {
      return env_js_1.celEnv;
    },
  });
  var func_js_1 = require_func();
  Object.defineProperty(cjsExports, "celMethod", {
    enumerable: true,
    get: function () {
      return func_js_1.celMethod;
    },
  });
  Object.defineProperty(cjsExports, "celFunc", {
    enumerable: true,
    get: function () {
      return func_js_1.celFunc;
    },
  });
});
export { require_cel };
