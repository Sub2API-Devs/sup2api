/**
 * tools/SendMessageTool/deliveryResults.ts
 *
 * SendMessage 投递结果（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-42jte3st.js (13)
 * attribution: placement 13
 */
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import {
  slugifySessionName,
  parseNameWithRef,
  describeAgentAddress,
  resolveUniqueCandidate,
  addressRef,
  ADDRESS_REF_PATTERN,
  isReservedSessionName,
} from "../../utils/sessionAddresses.js";
import { getTeamName } from "../../utils/teammate.js";
import { readTeamFileAsync } from "../../utils/swarm/teamHelpers.js";
import { listLocalPeerSessions, cachedBridgeListingRows } from "../../utils/peerAddressing.js";
import { searchCloudPeers } from "../../utils/peerSessions/cloudPeers.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal, stringSchema, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_SEED_NAME_CHARS } from "../../utils/swarm/teammateIds.js";
import { normalizeAgentIdOrNull } from "../../utils/agentId.js";
import { SENDMESSAGE } from "./constants.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { AGENT_METADATA_ID_RE } from "../../utils/agentMetadata.js";
import { AGENT, TASK } from "../AgentTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-42jte3st.js:697-796 placement
var DELIVERED_RESULT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-42jte3st.js:697", () => {
  DELIVERED_RESULT = Object.freeze({
    delivered: () => {
      return;
    },
    refused: () => {
      return;
    },
    [Symbol.dispose]: () => {
      return;
    },
  });
});
//@ chunk-42jte3st.js:796-953 placement
function createSessionSendRunner() {
  let slot = subscribe();
  return {
    setSessionSendRunner: slot.set,
    runSessionSend: (raised) => {
      let runner = slot.get();
      return runner
        ? runner(raised)
        : Promise.resolve({
            send: raised.raised,
            delivering: DELIVERED_RESULT,
          });
    },
  };
}
//@ chunk-42jte3st.js:953-963 placement
/**
 * 会话发送的可替换执行入口（runSessionSend/setSessionSendRunner）。
 */
var sessionSendRunner; // deferred: uses createSessionSendRunner of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-42jte3st.js:953", () => {
  sessionSendRunner = createSessionSendRunner();
});
//@ chunk-42jte3st.js:963-988 placement
var runSessionSend; // deferred: uses sessionSendRunner of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-42jte3st.js:963", () => {
  runSessionSend = sessionSendRunner.runSessionSend;
});
//@ chunk-42jte3st.js:988-1049 placement
/**
 * 说明消息由插件 hook 投递、没有其他内容发送。
 */
var HOOK_DELIVERED_NOTE = "Delivered by a plugin hook; nothing else was sent.";
//@ chunk-42jte3st.js:1049-1080 placement
var setSessionSendRunner; // deferred: uses sessionSendRunner of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-42jte3st.js:1049", () => {
  setSessionSendRunner = sessionSendRunner.setSessionSendRunner;
});
//@ chunk-42jte3st.js:1080-1927 placement
async function describeDeliveryResult({
  session,
  to,
  message,
  resolved,
  appState,
  agentLifecycle,
  storageV5,
  credentials,
}) {
  if (typeof message !== "string")
    return {
      kind: "proceed",
      pin: undefined,
    };
  let subagentRef = routeToSubagentRef(resolved);
  if (subagentRef === null)
    return {
      kind: "proceed",
      pin: undefined,
    };
  let slug = slugifySessionName(subagentRef.name);
  let existingPin = Object.hasOwn(appState.sendMessagePins, slug)
    ? appState.sendMessagePins[slug]
    : undefined;
  if (existingPin !== undefined && existingPin.id === subagentRef.id)
    return {
      kind: "proceed",
      pin: existingPin,
    };
  if (existingPin !== undefined) {
    let hasRef = parseNameWithRef(to) !== null;
    if (!hasRef && to === subagentRef.name && to !== existingPin.name)
      return {
        kind: "proceed",
        pin: undefined,
      };
    if (!hasRef) {
      let teamName = getTeamName(appState.teamContext);
      let [teamFile, localListing, cloudListing] = await Promise.all([
        teamName ? readTeamFileAsync(teamName, storageV5) : null,
        listLocalPeerSessions(),
        searchCloudPeers(session, credentials),
      ]);
      let addressIndex = describeAgentAddress(appState, {
        teamFile,
        sessions: localListing,
        cloud: cloudListing.sessions,
        bridge: cachedBridgeListingRows(session),
      });
      let uniqueCandidate = resolveUniqueCandidate(addressIndex.byName, slug);
      return {
        kind: "rebound",
        name: subagentRef.name,
        previous: existingPin,
        next:
          uniqueCandidate?.kind === "one" && uniqueCandidate.candidate.id === subagentRef.id
            ? uniqueCandidate.candidate
            : undefined,
      };
    }
  }
  let newPin = {
    id: subagentRef.id,
    name: subagentRef.name,
    ref: addressRef(subagentRef.kind, subagentRef.id),
  };
  agentLifecycle.setSendMessagePin(slug, newPin);
  return {
    kind: "proceed",
    pin: newPin,
  };
}
//@ chunk-42jte3st.js:1927-2205 placement
function routeToSubagentRef(resolved) {
  switch (resolved.kind) {
    case "main":
    case "not-found":
    case "ambiguous":
    case "agent-stopped-by-user":
    case "mailbox":
    case "local-session":
    case "cloud-session":
      return null;
    case "agent-live":
    case "agent-stopped":
    case "agent-evicted":
      return {
        kind: "subagent",
        id: resolved.agentId,
        name: resolved.agentName,
      };
  }
}
//@ chunk-42jte3st.js:2205-2351 placement
var sendResultPinSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-42jte3st.js:2205", () => {
  sendResultPinSchema = DoctorLazy(() =>
    objectSchema({
      success: literal(true),
      pin: objectSchema({
        name: stringSchema().min(1).max(MAX_SEED_NAME_CHARS),
        id: stringSchema()
          .max(1024)
          .refine((value) => normalizeAgentIdOrNull(value) !== null),
        ref: stringSchema().regex(new RegExp(`^${ADDRESS_REF_PATTERN}$`)),
      }),
    }),
  );
});
//@ chunk-42jte3st.js:2351-2894 placement
/**
 * 从历史消息中找出成功的 SendMessage 结果，按名字收集其 pin（id、name、ref），用于恢复会话后的寻址固定。
 */
function collectSendPins(messages) {
  let pinsBySlug = new Map();
  let sendToolUseIds = new Set();
  for (let message of messages)
    if (message.type === "assistant") {
      let content = message.message.content;
      if (!Array.isArray(content)) continue;
      for (let block of content)
        if (block.type === "tool_use" && block.name === SENDMESSAGE) sendToolUseIds.add(block.id);
    } else if (message.type === "user") {
      let content = message.message.content;
      if (!Array.isArray(content)) continue;
      if (
        content.find(
          (contentBlock) =>
            contentBlock.type === "tool_result" &&
            !contentBlock.is_error &&
            sendToolUseIds.has(contentBlock.tool_use_id),
        ) === undefined
      )
        continue;
      let parsed = sendResultPinSchema().safeParse(message.toolUseResult);
      if (!parsed.success) continue;
      pinsBySlug.set(slugifySessionName(parsed.data.pin.name), {
        id: parsed.data.pin.id,
        name: parsed.data.pin.name,
        ref: parsed.data.pin.ref,
      });
    }
  return Object.fromEntries(pinsBySlug);
}
//@ chunk-42jte3st.js:2894-2947 placement
/**
 * 发送目标已确定时返回 null，否则返回其固定标记。
 */
function sendPinsIfNotSettled(messages, sendMessagePins) {
  let sendPins = collectSendPins(messages);
  return import_sortedIndex_2(sendPins, sendMessagePins) ? null : sendPins;
}
//@ chunk-42jte3st.js:2947-3072 placement
var agentNameSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var agentLaunchResultSchema;
deferInit("chunk-42jte3st.js:2947", () => {
  agentNameSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema()
        .regex(AGENT_METADATA_ID_RE)
        .refine((name) => !isReservedSessionName(name)),
    }),
  );
  agentLaunchResultSchema = DoctorLazy(() =>
    objectSchema({
      status: _enum(["async_launched", "completed"]),
      agentId: stringSchema(),
    }),
  );
});
//@ chunk-42jte3st.js:3072-3713 placement (2.1.88 match: yieldMissingToolResultBlocks, 0.847)
/**
 * 从历史中收集 Agent/Task 工具调用的 name → 子代理 agentId（解析 tool_use 输入与 toolUseResult），与已有映射合并；没有新增时返回 null。旧版名配错（不是 yieldMissingToolResultBlocks）。
 */
function collectNamedAgentIds(assistantMessages, errorMessage) {
  let nameByToolUseId = new Map();
  let idByName = new Map();
  for (let assistantMessage of assistantMessages)
    if (assistantMessage.type === "assistant" && Array.isArray(assistantMessage.message.content)) {
      for (let block of assistantMessage.message.content)
        if (block.type === "tool_use" && (block.name === AGENT || block.name === TASK)) {
          let parsedName = agentNameSchema().safeParse(block.input);
          if (parsedName.success && !errorMessage.has(parsedName.data.name))
            nameByToolUseId.set(block.id, parsedName.data.name);
        }
    } else if (assistantMessage.type === "user" && Array.isArray(assistantMessage.message.content)) {
      let [firstResult, ...otherResults] = assistantMessage.message.content.filter(
        (content) => content.type === "tool_result",
      );
      let agentName =
        firstResult !== undefined && otherResults.length === 0 && !firstResult.is_error
          ? nameByToolUseId.get(firstResult.tool_use_id)
          : undefined;
      if (agentName === undefined) continue;
      let parsedResult = agentLaunchResultSchema().safeParse(assistantMessage.toolUseResult);
      let agentId = parsedResult.success ? normalizeAgentIdOrNull(parsedResult.data.agentId) : null;
      if (agentId !== null) idByName.set(agentName, agentId);
    }
  return idByName.size > 0 ? new Map([...errorMessage, ...idByName]) : null;
}
export {
  DELIVERED_RESULT,
  setSessionSendRunner,
  sendPinsIfNotSettled,
  collectNamedAgentIds,
  collectSendPins,
  runSessionSend,
  HOOK_DELIVERED_NOTE,
  describeDeliveryResult,
};
