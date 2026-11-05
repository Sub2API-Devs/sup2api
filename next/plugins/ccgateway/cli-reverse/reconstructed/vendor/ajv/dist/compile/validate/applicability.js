/**
 * ajv/dist/compile/validate/applicability.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-xcs4sv9h.js:25637-26116 cjs-fingerprint
var require_applicability = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.shouldUseRule = cjsExports.shouldUseGroup = cjsExports.schemaHasRulesForType = undefined;
  function schemaHasRulesForType({ schema, self: ajvInstance }, type) {
    let group = ajvInstance.RULES.types[type];
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
