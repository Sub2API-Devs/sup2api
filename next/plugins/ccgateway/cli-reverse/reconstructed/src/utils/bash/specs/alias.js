/**
 * utils/bash/specs/alias.ts
 *
 * alias 命令的内置 Fig spec。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/specs/alias.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:3121329-3121512 fingerprint (2.1.88 match: alias, 1)
/**
 * alias 命令的补全 spec。
 */
var aliasSpec = {
  name: "alias",
  description: "Create or list command aliases",
  args: {
    name: "definition",
    description: "Alias definition in the form name=value",
    isOptional: true,
    isVariadic: true,
  },
};
var aliasSpec_2 = aliasSpec;
export { aliasSpec_2 };
