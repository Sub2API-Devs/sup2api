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
import { zodStrictObject, string, u, array, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { LISTAGENTS, LISTPEERS, listAgentsPrompt } from "../SendMessageTool/listAgents.js";
import { hasSendMessageTool } from "../SendMessageTool/constants.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { isTeammateOrSubagentContext } from "../SendMessageTool/selfTarget.js";

//@ chunk-kv9asrky.js:4770-6217 placement
/**
 * ListAgents 工具：列出可用 SendMessage 联系的 agent/对等会话（跨会话消息启用时可用），输入的 channel/q 在本构建不可用，结果为格式化列表与分节行。
 */
var LIST_AGENTS_MAX_CHARS = 1e4;
var listAgentsInputSchema = DoctorLazy(() =>
  zodStrictObject({
    channel: string().max(256).optional().describe("Not available in this build; leave unset."),
    q: string().max(256).optional().describe("Not available in this build; leave unset."),
  }),
);
var listAgentsOutputSchema = DoctorLazy(() =>
  u({
    listing: string().describe("Formatted list of reachable agents"),
    sections: array(
      u({
        kind: string(),
        total: E(),
        rows: array(
          u({
            name: string().optional(),
            ref: string().optional(),
            id: string().optional(),
            type: string().optional(),
            status: string().optional(),
          }),
        ),
      }),
    ).optional(),
    notes: array(
      u({
        kind: string(),
        text: string(),
      }),
    ).optional(),
  }),
);
var ListAgentsTool = buildTool({
  name: LISTAGENTS,
  aliases: [LISTPEERS],
  searchHint: "list agents you can SendMessage to",
  backgrounding: "never",
  maxResultSizeChars: LIST_AGENTS_MAX_CHARS,
  toAutoClassifierInput() {
    return "list agents";
  },
  async description(e, { tools: options }) {
    return listAgentsPrompt({
      canSendMessages: hasSendMessageTool(options),
    });
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
    return true;
  },
  isReadOnly() {
    return true;
  },
  async prompt({ tools }) {
    return listAgentsPrompt({
      canSendMessages: hasSendMessageTool(tools),
    });
  },
  renderToolUseMessage() {
    return null;
  },
  create(e) {
    return {
      async call(t) {
        let { listAllPeers, listAgentsForModel, buildSubagentExtras } = require("./chunk-58q34e4p.js");
        let channel = t.channel?.trim() || undefined;
        let l = t.q?.trim() || undefined;
        let [n, subagentExtras] = await Promise.all([
          listAllPeers(
            e.session,
            {
              channel,
              q: l,
              storageV5: e.storageV5,
            },
            e.credentials,
          ),
          buildSubagentExtras(
            {
              ...e,
              getAppState: e.resolverState,
            },
            isTeammateOrSubagentContext(e),
          ),
        ]);
        return {
          data: listAgentsForModel(n.peers, subagentExtras, {
            ...n,
            callerCanSend: hasSendMessageTool(e.tools),
          }),
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: e.listing,
    };
  },
});
