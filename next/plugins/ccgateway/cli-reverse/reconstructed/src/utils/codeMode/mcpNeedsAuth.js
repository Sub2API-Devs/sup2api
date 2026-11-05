/**
 * utils/codeMode/mcpNeedsAuth.ts
 *
 * 从 servers 里取出需要先登录的 MCP server 并渲染提示（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vk1gjsn9.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { array, objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { normalizeServerNameShort } from "../../services/api/deferredToolsState.js";

//@ chunk-vk1gjsn9.js:721-764 placement
var connectorToolSchema = DoctorLazy(() =>
  array(
    objectSchema({
      name: stringSchema(),
      authTool: stringSchema(),
    }),
  ),
);
//@ chunk-vk1gjsn9.js:764-836 placement
/**
 * 从 servers 里取出需要先登录的 MCP server 列表。
 */
function parseAuthServers(response) {
  let parsed = connectorToolSchema().safeParse(response.servers);
  return parsed.success ? parsed.data : [];
}
//@ chunk-vk1gjsn9.js:836-1002 placement
/**
 * 渲染“MCP server 需要先认证、其 authTool 可在脚本里调用”的提示。
 */
function buildAuthNotes(servers) {
  return servers.map(
    (server) =>
      `MCP server ${normalizeServerNameShort(server.name)} needs authentication before its tools answer; its ${server.authTool} tool is callable from a script.`,
  ).join(`
`);
}
export { buildAuthNotes, parseAuthServers };
