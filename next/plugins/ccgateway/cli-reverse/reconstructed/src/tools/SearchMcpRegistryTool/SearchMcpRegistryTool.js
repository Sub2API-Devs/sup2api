/**
 * tools/SearchMcpRegistryTool/SearchMcpRegistryTool.ts
 *
 * 搜索 MCP 连接器注册表的工具（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xxyew49s.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  array,
  stringSchema,
  objectSchema,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  connectorResultSchema,
  searchConnectors,
  isOptInRequired,
  markEnabledInChat,
  ConnectorRegistryUnavailableError,
  logConnectorFetchFailure,
} from "../../services/mcp/connectorSuggestions.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { SEARCH_MCP_REGISTRY_TOOL_NAME, DESCRIPTION, PROMPT } from "./prompt.js";
import { isRemoteFirstPartySession } from "../../utils/remoteSessionEnv.js";
import { AbortError } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-xxyew49s.js:4688-5960 placement
/**
 * SearchMcpRegistry 的输入/输出 schema 与工具定义。
 */
var SearchMcpRegistryTool = DoctorLazy(() =>
  zodStrictObject({
    keywords: array(stringSchema().min(1).max(64))
      .min(1)
      .max(8)
      .describe("Keyword phrases describing the user's intent or a named product."),
  }),
);
var searchMcpRegistryOutputSchema = DoctorLazy(() =>
  objectSchema({
    results: array(connectorResultSchema()),
    opt_in_required: literal(true).optional(),
    message: stringSchema().optional(),
  }),
);
var CONNECTOR_SEARCH_PARTIAL_NOTE =
  "This search covers only a part of the connector directory. A connector that is not in these results can still exist. The full connector directory is on claude.ai.";
var SearchMcpRegistryTool_2 = buildTool({
  name: SEARCH_MCP_REGISTRY_TOOL_NAME,
  searchHint: "discover MCP connectors by keyword",
  backgrounding: "never",
  maxResultSizeChars: 50000,
  shouldDefer: true,
  get inputSchema() {
    return SearchMcpRegistryTool();
  },
  get outputSchema() {
    return searchMcpRegistryOutputSchema();
  },
  isEnabled: isRemoteFirstPartySession,
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  async description() {
    return DESCRIPTION;
  },
  async prompt() {
    return PROMPT;
  },
  create({ credentials, mcpClients, session }) {
    return {
      async call(input, { signal }) {
        try {
          let searchResult = await searchConnectors(input.keywords, signal, credentials);
          if (isOptInRequired(searchResult))
            return {
              data: {
                results: [],
                ...searchResult,
              },
            };
          let mcpClientsList = mcpClients();
          return {
            data: {
              results: markEnabledInChat(searchResult, mcpClientsList, session),
            },
          };
        } catch (error) {
          if (signal.aborted) throw new AbortError();
          if (error instanceof ConnectorRegistryUnavailableError) throw error;
          logConnectorFetchFailure("search", error);
          throw new ConnectorRegistryUnavailableError(
            "Connector registry is unavailable right now; please try again.",
          );
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: jsonStringify(
        result.opt_in_required
          ? result
          : {
              results: result.results,
              note: CONNECTOR_SEARCH_PARTIAL_NOTE,
            },
      ),
    };
  },
  renderToolUseMessage(input) {
    return (input.keywords ?? []).join(", ");
  },
});
export { SearchMcpRegistryTool_2 };
