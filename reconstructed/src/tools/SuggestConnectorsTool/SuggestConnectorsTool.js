/**
 * tools/SuggestConnectorsTool/SuggestConnectorsTool.ts
 *
 * 2.1.316 新增：SuggestConnectors 工具：按 directoryUuid 解析连接器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-24nc744j.js (1)
 * attribution: placement 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, array, string, u, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  connectorResultSchema,
  lookupConnectors,
  isOptInRequired,
  ConnectorRegistryUnavailableError,
  logConnectorFetchFailure,
} from "../../services/mcp/connectorSuggestions.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { SUGGEST_CONNECTORS_TOOL_NAME, DESCRIPTION, PROMPT } from "./prompt.js";
import { isRemoteFirstPartySession } from "../../utils/remoteSessionEnv.js";
import { AbortError } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-24nc744j.js:4607-5658 placement
/**
 * SuggestConnectors 工具：按 directoryUuid 解析连接器。
 */
var SuggestConnectorsTool_2 = DoctorLazy(() =>
  zodStrictObject({
    uuids: array(string().min(1).max(64))
      .min(1)
      .max(32)
      .describe("directoryUuid or server_id values to resolve."),
  }),
);
var suggestConnectorsOutputSchema = DoctorLazy(() =>
  u({
    connectors: array(connectorResultSchema()),
    opt_in_required: literal(true).optional(),
    message: string().optional(),
  }),
);
var SuggestConnectorsTool = buildTool({
  name: SUGGEST_CONNECTORS_TOOL_NAME,
  searchHint: "resolve MCP connector payloads by directoryUuid",
  backgrounding: "never",
  maxResultSizeChars: 50000,
  shouldDefer: true,
  get inputSchema() {
    return SuggestConnectorsTool_2();
  },
  get outputSchema() {
    return suggestConnectorsOutputSchema();
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
  create({ credentials }) {
    return {
      async call(r, { signal }) {
        try {
          let connectors = await lookupConnectors(r.uuids, signal, credentials);
          if (isOptInRequired(connectors))
            return {
              data: {
                connectors: [],
                ...connectors,
              },
            };
          return {
            data: {
              connectors,
            },
          };
        } catch (error) {
          if (signal.aborted) throw new AbortError();
          if (error instanceof ConnectorRegistryUnavailableError) throw error;
          logConnectorFetchFailure("lookup", error);
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
      content: jsonStringify(e.opt_in_required ? e : e.connectors),
    };
  },
  renderToolUseMessage(e) {
    return plural((e.uuids ?? []).length, "uuid");
  },
});
