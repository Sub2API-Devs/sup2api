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
import { zodStrictObject, A, o, u, T } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  connectorResultSchema,
  searchConnectors,
  bLe,
  markEnabledInChat,
  ConnectorRegistryUnavailableError,
  logConnectorFetchFailure,
} from "../../services/mcp/connectorSuggestions.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { SEARCH_MCP_REGISTRY_TOOL_NAME, DESCRIPTION, PROMPT } from "./prompt.js";
import { gHe } from "../../utils/remoteSessionEnv.js";
import { AbortError } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-1kxhadxb.js:4604-5692 placement
var SearchMcpRegistryTool = DoctorLazy(() =>
    zodStrictObject({
      keywords: A(o().min(1).max(64))
        .min(1)
        .max(8)
        .describe("Keyword phrases describing the user's intent or a named product."),
    }),
  ),
  l = DoctorLazy(() =>
    u({ results: A(connectorResultSchema()), opt_in_required: T(!0).optional(), message: o().optional() }),
  ),
  R = buildTool({
    name: SEARCH_MCP_REGISTRY_TOOL_NAME,
    searchHint: "discover MCP connectors by keyword",
    backgrounding: "never",
    maxResultSizeChars: 50000,
    shouldDefer: !0,
    get inputSchema() {
      return SearchMcpRegistryTool();
    },
    get outputSchema() {
      return l();
    },
    isEnabled: gHe,
    isConcurrencySafe() {
      return !0;
    },
    isReadOnly() {
      return !0;
    },
    async description() {
      return DESCRIPTION;
    },
    async prompt() {
      return PROMPT;
    },
    create({ credentials: e, mcpClients: r, session: s }) {
      return {
        async call(a, { signal: n }) {
          try {
            let t = await searchConnectors(a.keywords, n, e);
            if (bLe(t)) return { data: { results: [], ...t } };
            let i = r();
            return { data: { results: markEnabledInChat(t, i, s) } };
          } catch (error) {
            if (n.aborted) throw new AbortError();
            if (error instanceof ConnectorRegistryUnavailableError) throw error;
            throw (
              logConnectorFetchFailure("search", error),
              new ConnectorRegistryUnavailableError(
                "Connector registry is unavailable right now; please try again.",
              )
            );
          }
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, r) {
      return {
        tool_use_id: r,
        type: "tool_result",
        content: jsonStringify(e.opt_in_required ? e : e.results),
      };
    },
    renderToolUseMessage(e) {
      return (e.keywords ?? []).join(", ");
    },
  });
