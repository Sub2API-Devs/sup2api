/**
 * tools/ListConnectorsTool/ListConnectorsTool.ts
 *
 * 2.1.316 新增：ListConnectors 工具
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b13afkp1.js (4)
 * attribution: placement 4
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
  listConnectorSuggestions,
  isOptInRequired,
  markEnabledInChat,
  logConnectorFetchFailure,
  ConnectorRegistryUnavailableError,
} from "../../services/mcp/connectorSuggestions.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { LIST_CONNECTORS_TOOL_NAME, DESCRIPTION, PROMPT } from "./prompt.js";
import { isRemoteFirstPartySession } from "../../utils/remoteSessionEnv.js";
import { AbortError } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-b13afkp1.js:4688-4900 placement
/**
 * ListConnectors 输入/输出 schema。
 */
var LIST_CONNECTORS_INPUT_SCHEMA = DoctorLazy(() =>
  zodStrictObject({
    keywords: array(stringSchema().min(1).max(64))
      .max(8)
      .optional()
      .describe("Optional filter; omit to list everything."),
  }),
);
var LIST_CONNECTORS_OUTPUT_SCHEMA = DoctorLazy(() =>
  objectSchema({
    connectors: array(connectorResultSchema()),
    opt_in_required: literal(true).optional(),
    message: stringSchema().optional(),
  }),
);
//@ chunk-b13afkp1.js:4900-4986 placement
/**
 * 判断名称或描述里是否含任意关键词（忽略大小写）。
 */
function matchesKeyword(text, keywords) {
  let lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}
//@ chunk-b13afkp1.js:4986-5154 placement
/**
 * 按关键词过滤连接器（名称或描述）。
 */
function filterConnectors(connectors, keywords) {
  if (!keywords?.length) return connectors;
  return connectors.filter((connector) => {
    if (typeof connector.name === "string" && matchesKeyword(connector.name, keywords)) return true;
    let description = connector.description;
    return typeof description === "string" && matchesKeyword(description, keywords);
  });
}
//@ chunk-b13afkp1.js:5154-6046 placement
/**
 * 2.1.316 新增的 ListConnectors 工具：列出用户已安装的 MCP 连接器。
 */
var ListConnectorsTool = buildTool({
  name: LIST_CONNECTORS_TOOL_NAME,
  searchHint: "list the user's installed MCP connectors",
  backgrounding: "never",
  maxResultSizeChars: 300000,
  persistenceThresholdCeiling: 300000,
  shouldDefer: true,
  get inputSchema() {
    return LIST_CONNECTORS_INPUT_SCHEMA();
  },
  get outputSchema() {
    return LIST_CONNECTORS_OUTPUT_SCHEMA();
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
          let suggestions = await listConnectorSuggestions(signal, credentials);
          if (isOptInRequired(suggestions))
            return {
              data: {
                connectors: [],
                ...suggestions,
              },
            };
          let mcpClientsList = mcpClients();
          let enabledConnectors = markEnabledInChat(suggestions, mcpClientsList, session);
          return {
            data: {
              connectors: filterConnectors(enabledConnectors, input.keywords),
            },
          };
        } catch (error) {
          if (signal.aborted) throw new AbortError();
          logConnectorFetchFailure("list", error);
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
      content: jsonStringify(result.opt_in_required ? result : result.connectors),
    };
  },
  renderToolUseMessage(input) {
    return (input.keywords ?? []).join(", ");
  },
});
export { ListConnectorsTool };
