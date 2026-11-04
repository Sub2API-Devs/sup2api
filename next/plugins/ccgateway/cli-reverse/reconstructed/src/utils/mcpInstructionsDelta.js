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

//@ chunk-e6aww6q8.js:2311501-2313126 fingerprint (2.1.88 match: getMcpInstructionsDelta, 0.82)
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
        addedNames.forEach((addedName, index) => {
          if (typeof addedName !== "string") return;
          let serverInstruction = Array.isArray(addedServerInstructions)
            ? addedServerInstructions[index]
            : undefined;
          announcedBlocks.set(addedName, addedBlocks[index]);
          announced.set(
            addedName,
            typeof addedBlocks[index] !== "string"
              ? ""
              : typeof serverInstruction === "string"
                ? serverInstruction
                : undefined,
          );
        });
    }
    for (let n of stringArray_2(msg.attachment.removedNames)) announced.delete(n);
  }
  let connected = clients.filter(isConnectedOrCached);
  let connectedNames = new Set(connected.map((client) => client.name));
  let currentBlocks = computeMcpInstructionsDelta(connected, clientSideInstructions);
  let serverInstructions = new Map();
  for (let client of connected)
    if (client.instructions) serverInstructions.set(client.name, client.instructions);
  let sortedOtter = isSortedOtterOn();
  let discoveryCache = isDiscoveryCacheOn() || sortedOtter;
  let added = [];
  for (let [name, block] of currentBlocks) {
    let serverInstruction = serverInstructions.get(name) ?? "";
    if (!announced.has(name)) {
      added.push({
        name,
        block,
        server: serverInstruction,
      });
      continue;
    }
    let existing = announced.get(name);
    let hasChanged =
      existing !== undefined
        ? existing !== serverInstruction
        : sortedOtter && announcedBlocks.get(name) !== block;
    if (discoveryCache && serverInstruction !== "" && hasChanged)
      added.push({
        name,
        block,
        server: serverInstruction,
      });
  }
  let filtered = [...announced.keys()].filter((key) => !connectedNames.has(key));
  let pendingNames = new Set(
    clients.filter((client) => client.type === "pending").map((client) => client.name),
  );
  let removed = holdRetractionsWhilePending ? filtered.filter((name) => !pendingNames.has(name)) : filtered;
  if (added.length === 0 && removed.length === 0) return null;
  logEvent("tengu_mcp_instructions_pool_change", {
    addedCount: added.length,
    removedCount: removed.length,
    departedWhileConnectingCount: count(filtered, (name) => pendingNames.has(name)),
    retractionHoldEnabled: holdRetractionsWhilePending,
    priorAnnouncedCount: announced.size,
    clientSideCount: clientSideInstructions.length,
    messagesLength: messages.length,
    attachmentCount,
    midCount,
  });
  added.sort((entryA, entryB) => compareStringsGrouped(entryA.name, entryB.name));
  return {
    addedNames: added.map((entry) => entry.name),
    addedBlocks: added.map((entry) => entry.block),
    ...(discoveryCache && {
      addedServerInstructions: added.map((entry) => entry.server),
    }),
    removedNames: removed.sort(),
  };
}
//@ chunk-e6aww6q8.js:2313126-2313429 placement
/**
 * 计算 MCP 服务器 instructions 增量：对比当前已连接服务器的 instructions 与之前已公告的，给出新增/变更与移除的服务器列表。
 */
function computeMcpInstructionsDelta(clients, clientSideInstructions) {
  let blocks = new Map();
  for (let client of clients)
    if (client.instructions)
      blocks.set(
        client.name,
        `## ${client.name}
${client.instructions}`,
      );
  let clientNames = new Set(clients.map((client) => client.name));
  for (let instruction of clientSideInstructions) {
    if (!clientNames.has(instruction.serverName)) continue;
    let existingBlock = blocks.get(instruction.serverName);
    blocks.set(
      instruction.serverName,
      existingBlock
        ? `${existingBlock}

${instruction.block}`
        : `## ${instruction.serverName}
${instruction.block}`,
    );
  }
  return blocks;
}
export { getMcpInstructionsDelta, computeMcpInstructionsDelta };
