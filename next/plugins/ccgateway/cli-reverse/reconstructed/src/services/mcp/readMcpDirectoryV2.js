/**
 * services/mcp/readMcpDirectoryV2.ts
 *
 * MCP SDK v2 代的资源目录分页读取：directoryRead 能力判定、resources/directory/read 翻页与 InvalidParams 退化（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0f2rgfjp.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { IO_MODELCONTEXTPROTOCOL_SKILLS } from "./mcpSkills.js";
import { identityId2 } from "../../types/ids.js";
import { ListResourcesResultSchema } from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { getConnectionTimeoutMs } from "./client.js";
import {
  ProtocolError,
  ProtocolErrorCode,
} from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";
import { logMCPDebug } from "../../utils/log.js";

//@ chunk-0f2rgfjp.js:3795-3804 placement
var MAX_DIRECTORY_DEPTH = 20;
//@ chunk-0f2rgfjp.js:3804-3924 placement
/**
 * MCP server 的能力是否声明了 directoryRead（v2 SDK 版）。
 */
function hasDirectoryRead(capabilities) {
  let directoryRead = capabilities?.extensions?.[IO_MODELCONTEXTPROTOCOL_SKILLS];
  return (
    directoryRead != null &&
    typeof directoryRead === "object" &&
    "directoryRead" in directoryRead &&
    directoryRead.directoryRead === true
  );
}
//@ chunk-0f2rgfjp.js:3924-4581 placement
/**
 * readMcpDirectory（v2 SDK 版）：按 cursor 翻页读 MCP 资源目录，最多 20 页；后续页 InvalidParams 时退回已收集条目。
 */
async function readMcpDirectory(server, uri, maxDepth) {
  if (!hasDirectoryRead(server.capabilities))
    throw Error("readMcpDirectory called on a server without directoryRead capability");
  let entries = [];
  let cursor;
  let pageCount = 0;
  do {
    let response;
    try {
      response = await identityId2(server.client).request(
        {
          method: "resources/directory/read",
          params: {
            uri,
            ...(cursor && {
              cursor,
            }),
          },
        },
        ListResourcesResultSchema,
        {
          timeout: getConnectionTimeoutMs(),
          signal: maxDepth,
        },
      );
    } catch (error) {
      if (
        pageCount === 0 ||
        !(error instanceof ProtocolError && error.code === ProtocolErrorCode.InvalidParams)
      )
        throw error;
      logMCPDebug(
        server.name,
        `resources/directory/read ${uri}: page ${pageCount + 1} returned InvalidParams on cursor; returning ${entries.length} entries from prior pages`,
      );
      return entries;
    }
    entries.push(...response.resources);
    cursor = response.nextCursor;
    pageCount++;
  } while (cursor && pageCount < MAX_DIRECTORY_DEPTH);
  if (cursor)
    logMCPDebug(
      server.name,
      `resources/directory/read ${uri}: stopped at ${MAX_DIRECTORY_DEPTH} pages with more pending`,
    );
  return entries;
}
export { readMcpDirectory, hasDirectoryRead };
