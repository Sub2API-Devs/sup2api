/**
 * ajv/dist/compile/rules.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-s82q9s4x.js:25072-25637 cjs-fingerprint
var require_rules_2 = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getRules = cjsExports.isJSONType = undefined;
  var _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
  var jsonTypes = new Set(_jsonTypes);
  function isJSONType(x) {
    return typeof x == "string" && jsonTypes.has(x);
  }
  cjsExports.isJSONType = isJSONType;
  function getRules() {
    let groups = {
      number: {
        type: "number",
        rules: [],
      },
      string: {
        type: "string",
        rules: [],
      },
      array: {
        type: "array",
        rules: [],
      },
      object: {
        type: "object",
        rules: [],
      },
    };
    return {
      types: {
        ...groups,
        integer: true,
        boolean: true,
        null: true,
      },
      rules: [
        {
          rules: [],
        },
        groups.number,
        groups.string,
        groups.array,
        groups.object,
      ],
      post: {
        rules: [],
      },
      all: {},
      keywords: {},
    };
  }
  cjsExports.getRules = getRules;
});
export { require_rules_2 };
