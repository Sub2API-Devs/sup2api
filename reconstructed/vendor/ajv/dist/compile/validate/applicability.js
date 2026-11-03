/**
 * ajv/dist/compile/validate/applicability.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-s82q9s4x.js:25637-26116 cjs-fingerprint
var require_applicability = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.shouldUseRule = cjsExports.shouldUseGroup = cjsExports.schemaHasRulesForType = undefined;
  function schemaHasRulesForType({ schema, self: t }, type) {
    let group = t.RULES.types[type];
    return group && group !== true && shouldUseGroup(schema, group);
  }
  cjsExports.schemaHasRulesForType = schemaHasRulesForType;
  function shouldUseGroup(schema, group) {
    return group.rules.some((rule) => shouldUseRule(schema, rule));
  }
  cjsExports.shouldUseGroup = shouldUseGroup;
  function shouldUseRule(schema, rule) {
    var _a;
    return (
      schema[rule.keyword] !== undefined ||
      ((_a = rule.definition.implements) === null || _a === undefined
        ? undefined
        : _a.some((kwd) => schema[kwd] !== undefined))
    );
  }
  cjsExports.shouldUseRule = shouldUseRule;
});
export { require_applicability };
