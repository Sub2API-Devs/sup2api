/**
 * utils/yaml.ts
 *
 * YAML 解析（parseYaml，Bun.YAML）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/yaml.ts
 * pieces: chunk-a2q0x549.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-a2q0x549.js:79795-79835 fingerprint (2.1.88 match: parseYaml, 0.408)
function parseYaml(input) {
  return Bun.YAML.parse(input);
}
export { parseYaml };
