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
import { zodStrictObject, A, o, u, T } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  connectorResultSchema,
  lookupConnectors,
  bLe,
  ConnectorRegistryUnavailableError,
  logConnectorFetchFailure,
} from "../../services/mcp/connectorSuggestions.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { SUGGEST_CONNECTORS_TOOL_NAME, DESCRIPTION, PROMPT } from "./prompt.js";
import { gHe } from "../../utils/remoteSessionEnv.js";
import { AbortError } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { plural } from "../../utils/stringUtils.js";

/**
 * SuggestConnectors 工具：按 directoryUuid 解析连接器。
 */
//@ chunk-24nc744j.js:4607-5658 placement
var SuggestConnectorsTool = DoctorLazy(() =>
    zodStrictObject({
      uuids: A(o().min(1).max(64)).min(1).max(32).describe("directoryUuid or server_id values to resolve."),
    }),
  ),
  i = DoctorLazy(() =>
    u({ connectors: A(connectorResultSchema()), opt_in_required: T(!0).optional(), message: o().optional() }),
  ),
  g = buildTool({
    name: SUGGEST_CONNECTORS_TOOL_NAME,
    searchHint: "resolve MCP connector payloads by directoryUuid",
    backgrounding: "never",
    maxResultSizeChars: 50000,
    shouldDefer: !0,
    get inputSchema() {
      return SuggestConnectorsTool();
    },
    get outputSchema() {
      return i();
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
    create({ credentials: e }) {
      return {
        async call(r, { signal: n }) {
          try {
            let t = await lookupConnectors(r.uuids, n, e);
            if (bLe(t)) return { data: { connectors: [], ...t } };
            return { data: { connectors: t } };
          } catch (error) {
            if (n.aborted) throw new AbortError();
            if (error instanceof ConnectorRegistryUnavailableError) throw error;
            throw (
              logConnectorFetchFailure("lookup", error),
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
        content: jsonStringify(e.opt_in_required ? e : e.connectors),
      };
    },
    renderToolUseMessage(e) {
      return plural((e.uuids ?? []).length, "uuid");
    },
  });
