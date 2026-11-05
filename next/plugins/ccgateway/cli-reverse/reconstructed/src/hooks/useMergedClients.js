/**
 * hooks/useMergedClients.ts
 *
 * 合并初始 MCP 客户端与动态客户端（按名称去重）；本模块混入大量 mergeClients 副本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useMergedClients.ts
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { uniqByExport } from "../../vendor/lodash-es/uniqBy.js";

//@ chunk-czq1j3j2.js:189876-189956 placement (2.1.88 match: mergeClients, 1)
function mergeClients(initialClients, mcpClients) {
  if (initialClients && mcpClients && mcpClients.length > 0)
    return uniqByExport([...initialClients, ...mcpClients], "name");
  return initialClients || [];
}
export { mergeClients };
