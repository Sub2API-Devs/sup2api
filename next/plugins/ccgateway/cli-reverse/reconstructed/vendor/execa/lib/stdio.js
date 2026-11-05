/**
 * execa/lib/stdio.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-t889g22j.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-t889g22j.js:15758-16261 esm-fingerprint
var aliases = ["stdin", "stdout", "stderr"];
var hasAlias = (options) => aliases.some((alias) => options[alias] !== undefined);
var normalizeStdio = (options) => {
  if (!options) return;
  let { stdio } = options;
  if (stdio === undefined) return aliases.map((alias) => options[alias]);
  if (hasAlias(options))
    throw Error(
      `It's not possible to provide \`stdio\` in combination with one of ${aliases.map((alias) => `\`${alias}\``).join(", ")}`,
    );
  if (typeof stdio === "string") return stdio;
  if (!Array.isArray(stdio))
    throw TypeError(`Expected \`stdio\` to be of type \`string\` or \`Array\`, got \`${typeof stdio}\``);
  let length = Math.max(stdio.length, aliases.length);
  return Array.from(
    {
      length,
    },
    (value, index) => stdio[index],
  );
};
export { normalizeStdio };
