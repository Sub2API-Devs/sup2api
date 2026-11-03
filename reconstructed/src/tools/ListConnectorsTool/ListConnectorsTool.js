/**
 * tools/ListConnectorsTool/ListConnectorsTool.ts
 *
 * 2.1.316 新增：ListConnectors 工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ry7vktx8.js (4)
 * attribution: placement 4
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, A, o, u, T } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  connectorResultSchema,
  PHs,
  bLe,
  markEnabledInChat,
  logConnectorFetchFailure,
  ConnectorRegistryUnavailableError,
} from "../../services/mcp/connectorSuggestions.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { LIST_CONNECTORS_TOOL_NAME, DESCRIPTION, PROMPT } from "./prompt.js";
import { gHe } from "../../utils/remoteSessionEnv.js";
import { AbortError } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";

/**
 * ListConnectors 输入/输出 schema。
 */
//@ chunk-ry7vktx8.js:4604-4816 placement
var LIST_CONNECTORS_INPUT_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      keywords: A(o().min(1).max(64)).max(8).optional().describe("Optional filter; omit to list everything."),
    }),
  ),
  LIST_CONNECTORS_OUTPUT_SCHEMA = DoctorLazy(() =>
    u({ connectors: A(connectorResultSchema()), opt_in_required: T(!0).optional(), message: o().optional() }),
  );
//@ chunk-ry7vktx8.js:4816-4902 placement
function a(e, t) {
  let lower = e.toLowerCase();
  return t.some((n) => lower.includes(n.toLowerCase()));
}
/**
 * 按关键词过滤连接器（名称或描述）。
 */
//@ chunk-ry7vktx8.js:4902-5070 placement
function filterConnectors(e, t) {
  if (!t?.length) return e;
  return e.filter((r) => {
    if (typeof r.name === "string" && a(r.name, t)) return !0;
    let description = r.description;
    return typeof description === "string" && a(description, t);
  });
}
/**
 * 2.1.316 新增的 ListConnectors 工具：列出用户已安装的 MCP 连接器。
 */
//@ chunk-ry7vktx8.js:5070-5962 placement
var ListConnectorsTool = buildTool({
  name: LIST_CONNECTORS_TOOL_NAME,
  searchHint: "list the user's installed MCP connectors",
  backgrounding: "never",
  maxResultSizeChars: 300000,
  persistenceThresholdCeiling: 300000,
  shouldDefer: !0,
  get inputSchema() {
    return LIST_CONNECTORS_INPUT_SCHEMA();
  },
  get outputSchema() {
    return LIST_CONNECTORS_OUTPUT_SCHEMA();
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
  create({ credentials: e, mcpClients: t, session: r }) {
    return {
      async call(n, { signal: i }) {
        try {
          let s = await PHs(i, e);
          if (bLe(s)) return { data: { connectors: [], ...s } };
          let c = t(),
            l = markEnabledInChat(s, c, r);
          return { data: { connectors: filterConnectors(l, n.keywords) } };
        } catch (error) {
          if (i.aborted) throw new AbortError();
          throw (
            logConnectorFetchFailure("list", error),
            new ConnectorRegistryUnavailableError(
              "Connector registry is unavailable right now; please try again.",
            )
          );
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, t) {
    return {
      tool_use_id: t,
      type: "tool_result",
      content: jsonStringify(e.opt_in_required ? e : e.connectors),
    };
  },
  renderToolUseMessage(e) {
    return (e.keywords ?? []).join(", ");
  },
});
