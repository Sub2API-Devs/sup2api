/**
 * remote/tools/toolServerEnv.ts
 *
 * MCP serve 环境形状（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hp4m40y1.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export } from "../../../runtime/bun-runtime.js";
import { ENV_PARSERS } from "../../utils/envSchema.js";

//@ chunk-hp4m40y1.js:486-495 placement
var TOOL_SERVER_ENV_FIELDS = {};
//@ chunk-hp4m40y1.js:495-849 placement
__export(TOOL_SERVER_ENV_FIELDS, {
  CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR: () => CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR,
  CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN: () => TOOL_SERVER_ENV_PARSERS,
  CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS: () => CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS,
  CLAUDE_CODE_MCP_SERVE_INTERFACE_MIN_VERSION: () => CLAUDE_CODE_MCP_SERVE_INTERFACE_MIN_VERSION,
  CLAUDE_CODE_MCP_SERVE_SETTINGS: () => CLAUDE_CODE_MCP_SERVE_SETTINGS,
  CLAUDE_CODE_MCP_SERVE_TOOL_OUTPUT: () => CLAUDE_CODE_MCP_SERVE_TOOL_OUTPUT,
  CLAUDE_CODE_MCP_SERVE_TUNNEL_BINARY_FRAMES: () => CLAUDE_CODE_MCP_SERVE_TUNNEL_BINARY_FRAMES,
  CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT: () => CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT,
});
//@ chunk-hp4m40y1.js:849-965 placement
var TOOL_SERVER_ENV_PARSERS = ENV_PARSERS.rawStr();
var CLAUDE_CODE_MCP_SERVE_TOOL_OUTPUT = ENV_PARSERS.bool();
var CLAUDE_CODE_MCP_SERVE_SETTINGS = ENV_PARSERS.rawStr();
var CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT = ENV_PARSERS.str();
var CLAUDE_CODE_MCP_SERVE_INTERFACE_MIN_VERSION = ENV_PARSERS.int({
  min: 1,
  digitsOnly: true,
});
var CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS = ENV_PARSERS.rawStr();
var CLAUDE_CODE_MCP_SERVE_TUNNEL_BINARY_FRAMES = ENV_PARSERS.bool();
var CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR = ENV_PARSERS.str();
//@ chunk-hp4m40y1.js:965-978 placement
/**
 * 导出常量或表 `TOOL_SERVER_ENV_DEFAULTS_ALIAS`：值为 { ...r }。
 */
var TOOL_SERVER_ENV_DEFAULTS_ALIAS = {
  ...TOOL_SERVER_ENV_FIELDS,
};
export { TOOL_SERVER_ENV_DEFAULTS_ALIAS };
