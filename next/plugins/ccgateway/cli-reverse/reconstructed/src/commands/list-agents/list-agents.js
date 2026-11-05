/**
 * commands/list-agents/list-agents.ts
 *
 * 2.1.316 新增：/list-agents 命令：列出可发消息的子代理、队友与其他 Claude 会话。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-g26rcen4.js (1)
 * attribution: placement 1
 */
import { listAllPeers, buildSubagentExtras, formatForUser } from "../../utils/peerSessions/listAgents.js";
import { isTeammateOrSubagentContext } from "../../tools/SendMessageTool/selfTarget.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";

//@ chunk-g26rcen4.js:4312-4712 placement
/**
 * /list-agents 命令：列出可发消息的子代理、队友与其他 Claude 会话。
 */
var call = async (args, context) => {
  let [
    {
      peers,
      bridgeWalkFailed,
      cloudListFailed,
      localListFailed,
      ownEndpointShadowed,
      messagingDisabled,
      listTruncated,
    },
    subagentExtras,
  ] = await Promise.all([
    listAllPeers(context.session, undefined, context.credentials),
    buildSubagentExtras(context, isTeammateOrSubagentContext(context)),
  ]);
  return {
    type: "text",
    value: formatForUser(peers, subagentExtras, {
      bridgeWalkFailed,
      cloudListFailed,
      localListFailed,
      ownEndpointShadowed,
      messagingDisabled,
      listTruncated,
      omitDirectories: isBridgeOrTransport(context.session),
    }),
  };
};
export { call };
