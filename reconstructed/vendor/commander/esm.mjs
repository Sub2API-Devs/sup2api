/**
 * commander/esm.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: commander@12.0.0
 * pieces: chunk-b7dyevzy.js (1)
 * attribution: esm-layout 1
 */
import { __toESM } from "../../runtime/bun-runtime.js";
import { require_commander_2 } from "./index.js";

//@ chunk-b7dyevzy.js:35561-35767 esm-layout
var program = __toESM(require_commander_2(), 1);
var {
  program: program_2,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  Command,
  Argument,
  Option,
  Help,
} = program.default;
export { Command, Option, InvalidArgumentError, Help };
