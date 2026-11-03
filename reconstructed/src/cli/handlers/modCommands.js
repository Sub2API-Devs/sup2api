/**
 * cli/handlers/modCommands.ts
 *
 * 2.1.316 新增：mod 命令处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bvc050re.js (1)
 * attribution: placement 1
 */
import { PLUGIN_SUBCOMMANDS } from "./plugins.js";

//@ chunk-bvc050re.js:227-671 placement
var joined = [
  `Usage: claude ${PLUGIN_SUBCOMMANDS.test.usage}`,
  "",
  PLUGIN_SUBCOMMANDS.test.description,
  "",
  "Arguments:",
  "  dir         The mod's folder (default: the current folder)",
  "",
  "Options:",
  "  -h, --help  Display help for command",
  "",
  "Runs every *.test.ts and *.test.tsx under dir, each file in a child of this",
  "binary, in an environment like the one the mod's hooks run in. A test file",
  "imports its kit from 'claude-code/testing'. Exits 1 when a test fails.",
  "",
].join(`
`);
export { joined };
