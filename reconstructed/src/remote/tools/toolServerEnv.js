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
var TOOL_SERVER_ENV_FIELDS = {};
//@ chunk-kakaahp3.js:495-800 placement
Ar(TOOL_SERVER_ENV_FIELDS, {
  CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR: () => C,
  CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN: () => TOOL_SERVER_ENV_PARSERS,
  CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS: () => S,
  CLAUDE_CODE_MCP_SERVE_INTERFACE_MIN_VERSION: () => _,
  CLAUDE_CODE_MCP_SERVE_SETTINGS: () => o,
  CLAUDE_CODE_MCP_SERVE_TOOL_OUTPUT: () => e,
  CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT: () => t,
});
//@ chunk-kakaahp3.js:800-905 placement
var TOOL_SERVER_ENV_PARSERS = ENV_PARSERS.rawStr();
var e = ENV_PARSERS.bool();
var o = ENV_PARSERS.rawStr();
var t = ENV_PARSERS.str();
var _ = ENV_PARSERS.int({
  min: 1,
  digitsOnly: true,
});
var S = ENV_PARSERS.rawStr();
var C = ENV_PARSERS.str();
//@ chunk-kakaahp3.js:905-918 placement
/**
 * 导出常量或表 `TOOL_SERVER_ENV_DEFAULTS_ALIAS`：值为 { ...r }。
 */
var TOOL_SERVER_ENV_DEFAULTS_ALIAS = {
  ...TOOL_SERVER_ENV_FIELDS,
};
