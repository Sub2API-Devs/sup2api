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
import {
  zodStrictObject,
  stringSchema,
  objectSchema,
  array,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
    channel: stringSchema().max(256).optional().describe("Not available in this build; leave unset."),
    q: stringSchema().max(256).optional().describe("Not available in this build; leave unset."),
  }),
);
var listAgentsOutputSchema = DoctorLazy(() =>
  objectSchema({
    listing: stringSchema().describe("Formatted list of reachable agents"),
    sections: array(
      objectSchema({
        kind: stringSchema(),
        total: numberSchema(),
        rows: array(
          objectSchema({
            name: stringSchema().optional(),
            ref: stringSchema().optional(),
            id: stringSchema().optional(),
            type: stringSchema().optional(),
            status: stringSchema().optional(),
          }),
        ),
      }),
    ).optional(),
    notes: array(
      objectSchema({
        kind: stringSchema(),
        text: stringSchema(),
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
  async description(input, { tools: options }) {
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
  create(toolContext) {
    return {
      async call(input) {
        let {
          listAllPeers,
          listAgentsForModel,
          buildSubagentExtras,
        } = require("../../utils/peerSessions/listAgents.js");
        let channel = input.channel?.trim() || undefined;
        let query = input.q?.trim() || undefined;
        let [peersResult, subagentExtras] = await Promise.all([
          listAllPeers(
            toolContext.session,
            {
              channel,
              q: query,
              storageV5: toolContext.storageV5,
            },
            toolContext.credentials,
          ),
          buildSubagentExtras(
            {
              ...toolContext,
              getAppState: toolContext.resolverState,
            },
            isTeammateOrSubagentContext(toolContext),
          ),
        ]);
        return {
          data: listAgentsForModel(peersResult.peers, subagentExtras, {
            ...peersResult,
            callerCanSend: hasSendMessageTool(toolContext.tools),
          }),
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: result.listing,
    };
  },
});
export { ListAgentsTool };
