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
  d8,
  describeAgentAddress,
  resolveUniqueCandidate,
  pdt,
  PBe,
  LD,
} from "../../utils/sessionAddresses.js";
import { getTeamName } from "../../utils/teammate.js";
import { readTeamFileAsync } from "../../utils/swarm/teamHelpers.js";
import { ZBr, wFo } from "../../utils/peerAddressing.js";
import { searchCloudPeers } from "../../utils/peerSessions/cloudPeers.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { ND } from "../../utils/swarm/teammateIds.js";
import { Um } from "../../utils/agentId.js";
import { SENDMESSAGE } from "./constants.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { AGENT_METADATA_ID_RE } from "../../utils/agentMetadata.js";
import { AGENT, TASK } from "../AgentTool/constants.js";

//@ chunk-42jte3st.js:697-796 placement
var freeze = Object.freeze({
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
      return r ? r(t) : Promise.resolve({ send: t.raised, delivering: freeze });
    },
  };
}
//@ chunk-42jte3st.js:953-963 placement
var c = createSessionSendRunner();
//@ chunk-42jte3st.js:963-988 placement
var runSessionSend = c.runSessionSend;
//@ chunk-42jte3st.js:988-1049 placement
var VHi = "Delivered by a plugin hook; nothing else was sent.";
//@ chunk-42jte3st.js:1049-1080 placement
var setSessionSendRunner = c.setSessionSendRunner;
//@ chunk-42jte3st.js:1080-1927 placement
async function describeDeliveryResult({
  session: session,
  to: to,
  message: message,
  resolved: resolved,
  appState: appState,
  agentLifecycle: agentLifecycle,
  storageV5: storageV5,
  credentials: credentials,
}) {
  if (typeof message !== "string") return { kind: "proceed", pin: void 0 };
  let a = routeToSubagentRef(resolved);
  if (a === null) return { kind: "proceed", pin: void 0 };
  let l = slugifySessionName(a.name),
    f = Object.hasOwn(appState.sendMessagePins, l) ? appState.sendMessagePins[l] : void 0;
  if (f !== void 0 && f.id === a.id) return { kind: "proceed", pin: f };
  if (f !== void 0) {
    let y = d8(to) !== null;
    if (!y && to === a.name && to !== f.name) return { kind: "proceed", pin: void 0 };
    if (!y) {
      let x = getTeamName(appState.teamContext),
        [R, P, A] = await Promise.all([
          x ? readTeamFileAsync(x, storageV5) : null,
          ZBr(),
          searchCloudPeers(session, credentials),
        ]),
        _ = describeAgentAddress(appState, {
          teamFile: R,
          sessions: P,
          cloud: A.sessions,
          bridge: wFo(session),
        }),
        g = resolveUniqueCandidate(_.byName, l);
      return {
        kind: "rebound",
        name: a.name,
        previous: f,
        next: g?.kind === "one" && g.candidate.id === a.id ? g.candidate : void 0,
      };
    }
  }
  let S = { id: a.id, name: a.name, ref: pdt(a.kind, a.id) };
  return (agentLifecycle.setSendMessagePin(l, S), { kind: "proceed", pin: S });
}
//@ chunk-42jte3st.js:1927-2205 placement
function routeToSubagentRef(e) {
  switch (e.kind) {
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
      return { kind: "subagent", id: e.agentId, name: e.agentName };
  }
}
//@ chunk-42jte3st.js:2205-2351 placement
var sendResultPinSchema = DoctorLazy(() =>
  u({
    success: T(!0),
    pin: u({
      name: o().min(1).max(ND),
      id: o()
        .max(1024)
        .refine((e) => Um(e) !== null),
      ref: o().regex(new RegExp(`^${PBe}$`)),
    }),
  }),
);
/**
 * 从历史消息中找出成功的 SendMessage 结果，按名字收集其 pin（id、name、ref），用于恢复会话后的寻址固定。
 */
//@ chunk-42jte3st.js:2351-2894 placement
function collectSendPins(e) {
  let t = new Map(),
    r = new Set();
  for (let d of e)
    if (d.type === "assistant") {
      let content = d.message.content;
      if (!Array.isArray(content)) continue;
      for (let s of content) if (s.type === "tool_use" && s.name === SENDMESSAGE) r.add(s.id);
    } else if (d.type === "user") {
      let content = d.message.content;
      if (!Array.isArray(content)) continue;
      if (content.find((m) => m.type === "tool_result" && !m.is_error && r.has(m.tool_use_id)) === void 0)
        continue;
      let safeParse = sendResultPinSchema().safeParse(d.toolUseResult);
      if (!safeParse.success) continue;
      t.set(slugifySessionName(safeParse.data.pin.name), {
        id: safeParse.data.pin.id,
        name: safeParse.data.pin.name,
        ref: safeParse.data.pin.ref,
      });
    }
  return Object.fromEntries(t);
}
//@ chunk-42jte3st.js:2894-2947 placement
function hHs(e, t) {
  let r = collectSendPins(e);
  return En(r, t) ? null : r;
}
//@ chunk-42jte3st.js:2947-3072 placement
var agentNameSchema = DoctorLazy(() =>
    u({
      name: o()
        .regex(AGENT_METADATA_ID_RE)
        .refine((e) => !LD(e)),
    }),
  ),
  agentLaunchResultSchema = DoctorLazy(() => u({ status: U(["async_launched", "completed"]), agentId: o() }));
/**
 * 从历史中收集 Agent/Task 工具调用的 name → 子代理 agentId（解析 tool_use 输入与 toolUseResult），与已有映射合并；没有新增时返回 null。旧版名配错（不是 yieldMissingToolResultBlocks）。
 */
//@ chunk-42jte3st.js:3072-3713 placement = yieldMissingToolResultBlocks (0.847)
function collectNamedAgentIds(assistantMessages, errorMessage) {
  let r = new Map(),
    d = new Map();
  for (let assistantMessage of assistantMessages)
    if (assistantMessage.type === "assistant" && Array.isArray(assistantMessage.message.content)) {
      for (let s of assistantMessage.message.content)
        if (s.type === "tool_use" && (s.name === AGENT || s.name === TASK)) {
          let safeParse = agentNameSchema().safeParse(s.input);
          if (safeParse.success && !errorMessage.has(safeParse.data.name)) r.set(s.id, safeParse.data.name);
        }
    } else if (assistantMessage.type === "user" && Array.isArray(assistantMessage.message.content)) {
      let [s, ...i] = assistantMessage.message.content.filter((content) => content.type === "tool_result"),
        m = s !== void 0 && i.length === 0 && !s.is_error ? r.get(s.tool_use_id) : void 0;
      if (m === void 0) continue;
      let safeParse = agentLaunchResultSchema().safeParse(assistantMessage.toolUseResult),
        l = safeParse.success ? Um(safeParse.data.agentId) : null;
      if (l !== null) d.set(m, l);
    }
  return d.size > 0 ? new Map([...errorMessage, ...d]) : null;
}

export {
  freeze,
  setSessionSendRunner,
  hHs,
  collectNamedAgentIds,
  collectSendPins,
  runSessionSend,
  VHi,
  describeDeliveryResult,
};
