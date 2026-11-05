/**
 * tools/SuggestConnectorsTool/SuggestConnectorsTool.ts
 *
 * 2.1.316 新增：SuggestConnectors 工具：按 directoryUuid 解析连接器。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qweg2pbs.js (1)
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

//@ chunk-qweg2pbs.js:4691-5742 placement
/**
 * SuggestConnectors 工具：按 directoryUuid 解析连接器。
 */
var SuggestConnectorsTool_2 = DoctorLazy(() =>
  zodStrictObject({
    uuids: array(stringSchema().min(1).max(64))
      .min(1)
      .max(32)
      .describe("directoryUuid or server_id values to resolve."),
  }),
);
var suggestConnectorsOutputSchema = DoctorLazy(() =>
  objectSchema({
    connectors: array(connectorResultSchema()),
    opt_in_required: literal(true).optional(),
    message: stringSchema().optional(),
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
      async call(input, { signal }) {
        try {
          let connectors = await lookupConnectors(input.uuids, signal, credentials);
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
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: jsonStringify(result.opt_in_required ? result : result.connectors),
    };
  },
  renderToolUseMessage(input) {
    return plural((input.uuids ?? []).length, "uuid");
  },
});
export { SuggestConnectorsTool };
