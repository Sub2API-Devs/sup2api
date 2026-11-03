/**
 * tools/SearchMcpRegistryTool/SearchMcpRegistryTool.ts
 *
 * 搜索 MCP 连接器注册表的工具（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1kxhadxb.js (1)
 * attribution: placement 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, array, string, u, literal } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-1kxhadxb.js:4604-5692 placement
/**
 * SearchMcpRegistry 的输入/输出 schema 与工具定义。
 */
var SearchMcpRegistryTool = DoctorLazy(() =>
  zodStrictObject({
    keywords: array(string().min(1).max(64))
      .min(1)
      .max(8)
      .describe("Keyword phrases describing the user's intent or a named product."),
  }),
);
var searchMcpRegistryOutputSchema = DoctorLazy(() =>
  u({
    results: array(connectorResultSchema()),
    opt_in_required: literal(true).optional(),
    message: string().optional(),
  }),
);
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
      async call(a, { signal }) {
        try {
          let t = await searchConnectors(a.keywords, signal, credentials);
          if (isOptInRequired(t))
            return {
              data: {
                results: [],
                ...t,
              },
            };
          let i = mcpClients();
          return {
            data: {
              results: markEnabledInChat(t, i, session),
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
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: jsonStringify(e.opt_in_required ? e : e.results),
    };
  },
  renderToolUseMessage(e) {
    return (e.keywords ?? []).join(", ");
  },
});
