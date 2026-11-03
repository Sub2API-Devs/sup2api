/**
 * utils/bash/specs/alias.ts
 *
 * alias 命令的内置 Fig spec。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/specs/alias.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-e6aww6q8.js:3037238-3037421 fingerprint = alias (1)
var aliasSpec = {
    name: "alias",
    description: "Create or list command aliases",
    args: {
      name: "definition",
      description: "Alias definition in the form name=value",
      isOptional: !0,
      isVariadic: !0,
    },
  },
  Fbn = aliasSpec;

export { Fbn };
