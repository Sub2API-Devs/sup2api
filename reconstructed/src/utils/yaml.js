/**
 * utils/yaml.ts
 *
 * YAML 解析（parseYaml，Bun.YAML）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/yaml.ts
 * pieces: chunk-82kqcve8.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-82kqcve8.js:82369-82409 fingerprint = parseYaml (0.408)
function parseYaml(input) {
  return Bun.YAML.parse(input);
}

export { parseYaml };
