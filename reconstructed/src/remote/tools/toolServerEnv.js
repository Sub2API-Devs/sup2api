/**
 * remote/tools/toolServerEnv.ts
 *
 * MCP serve 环境形状（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kakaahp3.js (4)
 * attribution: placement 4
 */
import { Ar } from "../../../runtime/bun-runtime.js";
import { ENV_PARSERS } from "../../utils/envSchema.js";

//@ chunk-kakaahp3.js:486-495 placement
var r = {};
//@ chunk-kakaahp3.js:495-800 placement
Ar(r, {
  CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR: () => str_2,
  CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN: () => rawStr,
  CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS: () => rawStr_3,
  CLAUDE_CODE_MCP_SERVE_INTERFACE_MIN_VERSION: () => int,
  CLAUDE_CODE_MCP_SERVE_SETTINGS: () => rawStr_2,
  CLAUDE_CODE_MCP_SERVE_TOOL_OUTPUT: () => bool,
  CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT: () => str,
});
//@ chunk-kakaahp3.js:800-905 placement
var rawStr = ENV_PARSERS.rawStr(),
  bool = ENV_PARSERS.bool(),
  rawStr_2 = ENV_PARSERS.rawStr(),
  str = ENV_PARSERS.str(),
  int = ENV_PARSERS.int({ min: 1, digitsOnly: !0 }),
  rawStr_3 = ENV_PARSERS.rawStr(),
  str_2 = ENV_PARSERS.str();
//@ chunk-kakaahp3.js:905-918 placement
var n = { ...r };
