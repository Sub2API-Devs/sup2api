/**
 * services/mcp/startedServers.ts
 *
 * 2.1.316 新增。已启动的 MCP 服务器记录。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pa0q9qvb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../../utils/hostScoped.js";

//@ chunk-pa0q9qvb.js:226-261 placement
/**
 * 按宿主保存的已启动服务器键集合。
 */
var MAX_STARTED_SERVER_KEYS = 100;
var startedServerKeys = new HostScoped(() => new Set());
export { startedServerKeys, MAX_STARTED_SERVER_KEYS };
