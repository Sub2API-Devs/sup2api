/**
 * commands/list-agents/list-agents.ts
 *
 * 2.1.316 新增：/list-agents 命令：列出可发消息的子代理、队友与其他 Claude 会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kq21a1r9.js (1)
 * attribution: placement 1
 */
import { listAllPeers, buildSubagentExtras, formatForUser } from "../../utils/peerSessions/listAgents.js";
import { WL } from "../../tools/SendMessageTool/selfTarget.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";

/**
 * /list-agents 命令：列出可发消息的子代理、队友与其他 Claude 会话。
 */
//@ chunk-kq21a1r9.js:4004-4404 placement
var call = async (args, context) => {
  let [
    {
      peers: a,
      bridgeWalkFailed: e,
      cloudListFailed: l,
      localListFailed: r,
      ownEndpointShadowed: i,
      messagingDisabled: o,
      listTruncated: t,
    },
    m,
  ] = await Promise.all([
    listAllPeers(context.session, void 0, context.credentials),
    buildSubagentExtras(context, WL(context)),
  ]);
  return {
    type: "text",
    value: formatForUser(a, m, {
      bridgeWalkFailed: e,
      cloudListFailed: l,
      localListFailed: r,
      ownEndpointShadowed: i,
      messagingDisabled: o,
      listTruncated: t,
      omitDirectories: isBridgeOrTransport(context.session),
    }),
  };
};
