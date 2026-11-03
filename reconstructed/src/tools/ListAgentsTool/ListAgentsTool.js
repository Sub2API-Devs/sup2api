/**
 * tools/ListAgentsTool/ListAgentsTool.ts
 *
 * 2.1.316 新增：ListAgents 工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kv9asrky.js (1)
 * attribution: placement 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, u, A, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { LISTAGENTS, LISTPEERS, A5o } from "../SendMessageTool/listAgents.js";
import { hasSendMessageTool } from "../SendMessageTool/constants.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { WL } from "../SendMessageTool/selfTarget.js";

/**
 * ListAgents 工具：列出可用 SendMessage 联系的 agent/对等会话（跨会话消息启用时可用），输入的 channel/q 在本构建不可用，结果为格式化列表与分节行。
 */
//@ chunk-kv9asrky.js:4770-6217 placement
var LIST_AGENTS_MAX_CHARS = 1e4,
  listAgentsInputSchema = DoctorLazy(() =>
    zodStrictObject({
      channel: o().max(256).optional().describe("Not available in this build; leave unset."),
      q: o().max(256).optional().describe("Not available in this build; leave unset."),
    }),
  ),
  listAgentsOutputSchema = DoctorLazy(() =>
    u({
      listing: o().describe("Formatted list of reachable agents"),
      sections: A(
        u({
          kind: o(),
          total: E(),
          rows: A(
            u({
              name: o().optional(),
              ref: o().optional(),
              id: o().optional(),
              type: o().optional(),
              status: o().optional(),
            }),
          ),
        }),
      ).optional(),
      notes: A(u({ kind: o(), text: o() })).optional(),
    }),
  ),
  ListAgentsTool = buildTool({
    name: LISTAGENTS,
    aliases: [LISTPEERS],
    searchHint: "list agents you can SendMessage to",
    backgrounding: "never",
    maxResultSizeChars: LIST_AGENTS_MAX_CHARS,
    toAutoClassifierInput() {
      return "list agents";
    },
    async description(e, { tools: options }) {
      return A5o({ canSendMessages: hasSendMessageTool(options) });
    },
    userFacingName() {
      return "ListAgents";
    },
    isEnabled() {
      return isCrossSessionMessagingEnabled();
    },
    get inputSchema() {
      return listAgentsInputSchema();
    },
    get outputSchema() {
      return listAgentsOutputSchema();
    },
    isConcurrencySafe() {
      return !0;
    },
    isReadOnly() {
      return !0;
    },
    async prompt({ tools: e }) {
      return A5o({ canSendMessages: hasSendMessageTool(e) });
    },
    renderToolUseMessage() {
      return null;
    },
    create(e) {
      return {
        async call(t) {
          let {
              listAllPeers: listAllPeers,
              listAgentsForModel: listAgentsForModel,
              buildSubagentExtras: buildSubagentExtras,
            } = require("./chunk-58q34e4p.js"),
            i = t.channel?.trim() || void 0,
            l = t.q?.trim() || void 0,
            [n, c] = await Promise.all([
              listAllPeers(e.session, { channel: i, q: l, storageV5: e.storageV5 }, e.credentials),
              buildSubagentExtras({ ...e, getAppState: e.resolverState }, WL(e)),
            ]);
          return {
            data: listAgentsForModel(n.peers, c, { ...n, callerCanSend: hasSendMessageTool(e.tools) }),
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, t) {
      return { tool_use_id: t, type: "tool_result", content: e.listing };
    },
  });
