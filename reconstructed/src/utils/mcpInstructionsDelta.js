/**
 * utils/mcpInstructionsDelta.ts
 *
 * 计算 MCP 服务器 instructions 的增量附件（新增/变更/移除），避免每轮重复注入完整说明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mcpInstructionsDelta.ts
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: fingerprint 1, placement 1
 */
import { stringArray as stringArray_2, count } from "./collections.js";
import { isConnectedOrCached } from "../skills/bundled/scheduleRemoteAgents.js";
import { isSortedOtterOn } from "../services/mcp/mcpGates.js";
import { isDiscoveryCacheOn } from "../services/mcp/mcpAccountKey.js";
import { logEvent } from "../services/analytics/index.js";
import { compareStringsGrouped } from "./stringUtils.js";

//@ chunk-e6aww6q8.js:2311501-2313126 fingerprint = getMcpInstructionsDelta (0.82)
/**
 * getMcpInstructionsDelta：对比消息中已宣布的 mcp_instructions_delta 附件与当前已连接服务器的 instructions，算出新增/变更与已断开的服务器，返回 {addedNames, addedBlocks, addedServerInstructions?, removedNames} 或 null；可选在服务器 pending 时暂不撤回。
 */
function getMcpInstructionsDelta(
  clients,
  messages,
  clientSideInstructions,
  holdRetractionsWhilePending = false,
) {
  let announced = new Map();
  let announcedBlocks = new Map();
  let attachmentCount = 0;
  let midCount = 0;
  for (let msg of messages) {
    if (msg.type !== "attachment") continue;
    attachmentCount++;
    if (msg.attachment.type !== "mcp_instructions_delta") continue;
    midCount++;
    if (Array.isArray(msg.attachment.addedBlocks)) {
      let addedNames = msg.attachment.addedNames;
      let addedBlocks = msg.attachment.addedBlocks;
      let addedServerInstructions = msg.attachment.addedServerInstructions;
      if (Array.isArray(addedNames))
        addedNames.forEach((addedName, nt) => {
          if (typeof addedName !== "string") return;
          let pt = Array.isArray(addedServerInstructions) ? addedServerInstructions[nt] : undefined;
          announcedBlocks.set(addedName, addedBlocks[nt]);
          announced.set(
            addedName,
            typeof addedBlocks[nt] !== "string" ? "" : typeof pt === "string" ? pt : undefined,
          );
        });
    }
    for (let n of stringArray_2(msg.attachment.removedNames)) announced.delete(n);
  }
  let connected = clients.filter(isConnectedOrCached);
  let connectedNames = new Set(connected.map((Me) => Me.name));
  let currentBlocks = computeMcpInstructionsDelta(connected, clientSideInstructions);
  let serverInstructions = new Map();
  for (let Me of connected) if (Me.instructions) serverInstructions.set(Me.name, Me.instructions);
  let Se = isSortedOtterOn();
  let ke = isDiscoveryCacheOn() || Se;
  let added = [];
  for (let [Me, We] of currentBlocks) {
    let ze = serverInstructions.get(Me) ?? "";
    if (!announced.has(Me)) {
      added.push({
        name: Me,
        block: We,
        server: ze,
      });
      continue;
    }
    let existing = announced.get(Me);
    let Je = existing !== undefined ? existing !== ze : Se && announcedBlocks.get(Me) !== We;
    if (ke && ze !== "" && Je)
      added.push({
        name: Me,
        block: We,
        server: ze,
      });
  }
  let filtered = [...announced.keys()].filter((key) => !connectedNames.has(key));
  let pendingNames = new Set(
    clients.filter((client) => client.type === "pending").map((client) => client.name),
  );
  let removed = holdRetractionsWhilePending ? filtered.filter((Me) => !pendingNames.has(Me)) : filtered;
  if (added.length === 0 && removed.length === 0) return null;
  logEvent("tengu_mcp_instructions_pool_change", {
    addedCount: added.length,
    removedCount: removed.length,
    departedWhileConnectingCount: count(filtered, (Me) => pendingNames.has(Me)),
    retractionHoldEnabled: holdRetractionsWhilePending,
    priorAnnouncedCount: announced.size,
    clientSideCount: clientSideInstructions.length,
    messagesLength: messages.length,
    attachmentCount,
    midCount,
  });
  added.sort((Me, We) => compareStringsGrouped(Me.name, We.name));
  return {
    addedNames: added.map((Me) => Me.name),
    addedBlocks: added.map((Me) => Me.block),
    ...(ke && {
      addedServerInstructions: added.map((Me) => Me.server),
    }),
    removedNames: removed.sort(),
  };
}
//@ chunk-e6aww6q8.js:2313126-2313429 placement
/**
 * 计算 MCP 服务器 instructions 增量：对比当前已连接服务器的 instructions 与之前已公告的，给出新增/变更与移除的服务器列表。
 */
function computeMcpInstructionsDelta(e, n) {
  let r = new Map();
  for (let h of e)
    if (h.instructions)
      r.set(
        h.name,
        `## ${h.name}
${h.instructions}`,
      );
  let s = new Set(e.map((h) => h.name));
  for (let h of n) {
    if (!s.has(h.serverName)) continue;
    let y = r.get(h.serverName);
    r.set(
      h.serverName,
      y
        ? `${y}

${h.block}`
        : `## ${h.serverName}
${h.block}`,
    );
  }
  return r;
}
export { getMcpInstructionsDelta, computeMcpInstructionsDelta };
