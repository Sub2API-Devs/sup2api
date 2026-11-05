/**
 * utils/yaml.ts
 *
 * YAML 解析（parseYaml，Bun.YAML）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/yaml.ts
 * pieces: chunk-a2q0x549.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-a2q0x549.js:79795-79835 fingerprint (2.1.88 match: parseYaml, 0.408)
function parseYaml(input) {
  return Bun.YAML.parse(input);
}
export { parseYaml };
