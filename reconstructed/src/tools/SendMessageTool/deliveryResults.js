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
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
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
import { u, literal, string, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_SEED_NAME_CHARS } from "../../utils/swarm/teammateIds.js";
import { normalizeAgentIdOrNull } from "../../utils/agentId.js";
import { SENDMESSAGE } from "./constants.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { AGENT_METADATA_ID_RE } from "../../utils/agentMetadata.js";
import { AGENT, TASK } from "../AgentTool/constants.js";

//@ chunk-42jte3st.js:697-796 placement
var yvo = Object.freeze({
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
//@ chunk-42jte3st.js:796-953 placement
function createSessionSendRunner() {
  let e = pu();
  return {
    setSessionSendRunner: e.set,
    runSessionSend: (t) => {
      let r = e.get();
      return r
        ? r(t)
        : Promise.resolve({
            send: t.raised,
            delivering: yvo,
          });
    },
  };
}
//@ chunk-42jte3st.js:953-963 placement
/**
 * 会话发送的可替换执行入口（runSessionSend/setSessionSendRunner）。
 */
var sessionSendRunner = createSessionSendRunner();
//@ chunk-42jte3st.js:963-988 placement
var runSessionSend = sessionSendRunner.runSessionSend;
//@ chunk-42jte3st.js:988-1049 placement
/**
 * 说明消息由插件 hook 投递、没有其他内容发送。
 */
var HOOK_DELIVERED_NOTE = "Delivered by a plugin hook; nothing else was sent.";
//@ chunk-42jte3st.js:1049-1080 placement
var setSessionSendRunner = sessionSendRunner.setSessionSendRunner;
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
  let a = routeToSubagentRef(resolved);
  if (a === null)
    return {
      kind: "proceed",
      pin: undefined,
    };
  let l = slugifySessionName(a.name);
  let f = Object.hasOwn(appState.sendMessagePins, l) ? appState.sendMessagePins[l] : undefined;
  if (f !== undefined && f.id === a.id)
    return {
      kind: "proceed",
      pin: f,
    };
  if (f !== undefined) {
    let y = parseNameWithRef(to) !== null;
    if (!y && to === a.name && to !== f.name)
      return {
        kind: "proceed",
        pin: undefined,
      };
    if (!y) {
      let teamName = getTeamName(appState.teamContext);
      let [R, P, A] = await Promise.all([
        teamName ? readTeamFileAsync(teamName, storageV5) : null,
        listLocalPeerSessions(),
        searchCloudPeers(session, credentials),
      ]);
      let _ = describeAgentAddress(appState, {
        teamFile: R,
        sessions: P,
        cloud: A.sessions,
        bridge: cachedBridgeListingRows(session),
      });
      let uniqueCandidate = resolveUniqueCandidate(_.byName, l);
      return {
        kind: "rebound",
        name: a.name,
        previous: f,
        next:
          uniqueCandidate?.kind === "one" && uniqueCandidate.candidate.id === a.id
            ? uniqueCandidate.candidate
            : undefined,
      };
    }
  }
  let S = {
    id: a.id,
    name: a.name,
    ref: addressRef(a.kind, a.id),
  };
  agentLifecycle.setSendMessagePin(l, S);
  return {
    kind: "proceed",
    pin: S,
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
var sendResultPinSchema = DoctorLazy(() =>
  u({
    success: literal(true),
    pin: u({
      name: string().min(1).max(MAX_SEED_NAME_CHARS),
      id: string()
        .max(1024)
        .refine((e) => normalizeAgentIdOrNull(e) !== null),
      ref: string().regex(new RegExp(`^${ADDRESS_REF_PATTERN}$`)),
    }),
  }),
);
//@ chunk-42jte3st.js:2351-2894 placement
/**
 * 从历史消息中找出成功的 SendMessage 结果，按名字收集其 pin（id、name、ref），用于恢复会话后的寻址固定。
 */
function collectSendPins(e) {
  let t = new Map();
  let r = new Set();
  for (let d of e)
    if (d.type === "assistant") {
      let content = d.message.content;
      if (!Array.isArray(content)) continue;
      for (let s of content) if (s.type === "tool_use" && s.name === SENDMESSAGE) r.add(s.id);
    } else if (d.type === "user") {
      let content = d.message.content;
      if (!Array.isArray(content)) continue;
      if (content.find((m) => m.type === "tool_result" && !m.is_error && r.has(m.tool_use_id)) === undefined)
        continue;
      let i = sendResultPinSchema().safeParse(d.toolUseResult);
      if (!i.success) continue;
      t.set(slugifySessionName(i.data.pin.name), {
        id: i.data.pin.id,
        name: i.data.pin.name,
        ref: i.data.pin.ref,
      });
    }
  return Object.fromEntries(t);
}
//@ chunk-42jte3st.js:2894-2947 placement
/**
 * 发送目标已确定时返回 null，否则返回其固定标记。
 */
function sendPinsIfNotSettled(e, sendMessagePins) {
  let sendPins = collectSendPins(e);
  return En(sendPins, sendMessagePins) ? null : sendPins;
}
//@ chunk-42jte3st.js:2947-3072 placement
var agentNameSchema = DoctorLazy(() =>
  u({
    name: string()
      .regex(AGENT_METADATA_ID_RE)
      .refine((e) => !isReservedSessionName(e)),
  }),
);
var agentLaunchResultSchema = DoctorLazy(() =>
  u({
    status: _enum(["async_launched", "completed"]),
    agentId: string(),
  }),
);
//@ chunk-42jte3st.js:3072-3713 placement = yieldMissingToolResultBlocks (0.847)
/**
 * 从历史中收集 Agent/Task 工具调用的 name → 子代理 agentId（解析 tool_use 输入与 toolUseResult），与已有映射合并；没有新增时返回 null。旧版名配错（不是 yieldMissingToolResultBlocks）。
 */
function collectNamedAgentIds(assistantMessages, errorMessage) {
  let r = new Map();
  let d = new Map();
  for (let assistantMessage of assistantMessages)
    if (assistantMessage.type === "assistant" && Array.isArray(assistantMessage.message.content)) {
      for (let s of assistantMessage.message.content)
        if (s.type === "tool_use" && (s.name === AGENT || s.name === TASK)) {
          let i = agentNameSchema().safeParse(s.input);
          if (i.success && !errorMessage.has(i.data.name)) r.set(s.id, i.data.name);
        }
    } else if (assistantMessage.type === "user" && Array.isArray(assistantMessage.message.content)) {
      let [s, ...i] = assistantMessage.message.content.filter((content) => content.type === "tool_result");
      let m = s !== undefined && i.length === 0 && !s.is_error ? r.get(s.tool_use_id) : undefined;
      if (m === undefined) continue;
      let a = agentLaunchResultSchema().safeParse(assistantMessage.toolUseResult);
      let l = a.success ? normalizeAgentIdOrNull(a.data.agentId) : null;
      if (l !== null) d.set(m, l);
    }
  return d.size > 0 ? new Map([...errorMessage, ...d]) : null;
}
export {
  yvo,
  setSessionSendRunner,
  sendPinsIfNotSettled,
  collectNamedAgentIds,
  collectSendPins,
  runSessionSend,
  HOOK_DELIVERED_NOTE,
  describeDeliveryResult,
};
