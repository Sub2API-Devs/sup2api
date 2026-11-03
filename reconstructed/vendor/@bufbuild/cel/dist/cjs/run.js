/**
 * @bufbuild/cel/dist/cjs/run.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_env } from "./env.js";
import { require_parse_2 } from "./parse.js";
import { require_plan } from "./plan.js";

//@ chunk-fq0cr76a.js:628855-629033 cjs-fingerprint
var require_run = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.run = run;
  var env_js_1 = require_env();
  var parse_js_1 = require_parse_2();
  var plan_js_1 = require_plan();
  function run(expr, bindings, envOptions) {
    return plan_js_1.plan(env_js_1.celEnv(envOptions), parse_js_1.parse(expr))(bindings);
  }
});
export { require_run };
