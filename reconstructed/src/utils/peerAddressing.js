/**
 * utils/peerAddressing.ts
 *
 * 2.1.316 新增：对等会话寻址
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (20)
 * attribution: placement 20
 */
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
import { isCrossSessionMessagingEnabled } from "./crossSessionMessagingGate.js";
import { logForDebugging } from "./debug.js";
import { anr, primePeerIdentity, warmBridgeListing, warmCloudSessions } from "./peerSessions/cloudPeers.js";
import {
  PBe,
  describeAgentAddress,
  slugifySessionName,
  normalizeSessionTitle,
  isUntitledName,
  joo,
  bOe,
} from "./sessionAddresses.js";
import { ND } from "./swarm/teammateIds.js";
import { MAIN } from "./sessionPeers.js";
import { TEAM_LEAD } from "./swarm/constants.js";
import { readTeamFileAsync } from "./swarm/teamHelpers.js";
import { formatDuration } from "./format.js";
import { gq, rAe } from "./attachments/atMentions.js";
import { logEvent } from "../services/analytics/index.js";
import { logAtMention } from "./telemetry/thirdPartyEventRecords.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:3194653-3194703 placement
async function ZBr() {
  return (await listPeerSessionsSafe()).sessions;
}
/**
 * 跨会话消息开启时列出本机存活的其他会话；会话记录无法读取时记日志并返回空列表且标记 unavailable。
 */
//@ chunk-e6aww6q8.js:3194703-3195114 placement
async function listPeerSessionsSafe() {
  if (isCrossSessionMessagingEnabled()) {
    let {
      listLivePeerSessions: listLivePeerSessions,
      SessionRecordsUnreadableError: SessionRecordsUnreadableError,
    } = require("./chunk-ewxn4535.js");
    try {
      return { sessions: await listLivePeerSessions(), unavailable: !1 };
    } catch (error) {
      if (error instanceof SessionRecordsUnreadableError)
        return (
          logForDebugging(
            `[agents:local] ${error.message} (${error.code ?? "unknown"}) \u2014 this machine's sessions not searched this call, disclosing`,
            { level: "warn" },
          ),
          { sessions: [], unavailable: !0 }
        );
      throw error;
    }
  }
  return { sessions: [], unavailable: !1 };
}
//@ chunk-e6aww6q8.js:3195114-3195159 placement
function wFo(e) {
  if (isCrossSessionMessagingEnabled()) return anr(e);
  return;
}
//@ chunk-e6aww6q8.js:3195159-3195219 placement
async function iEn(e) {
  return (await primePeerIdentity({ refresh: !1 }), wFo(e));
}
//@ chunk-e6aww6q8.js:3195219-3195264 placement
function EFo(e) {
  if (isCrossSessionMessagingEnabled()) return warmBridgeListing(e);
  return;
}
//@ chunk-e6aww6q8.js:3195298-3195365 placement
var jCr = 20,
  WCr = 3,
  regExp_14 = new RegExp(`\\[${PBe}\\]`, "i"),
  dEn = 128,
  uEn = ND;
/**
 * 解析对等会话的地址（主会话、队友、子代理、本机、云会话）。
 */
//@ chunk-e6aww6q8.js:3195365-3196434 placement
function resolvePeerAddress(e, n, r = Date.now()) {
  let s = describeAgentAddress(e, n),
    h = new Set([slugifySessionName(MAIN)]);
  if (e.teamContext) h.add(slugifySessionName(TEAM_LEAD));
  let y = [];
  for (let candidate of s.candidates)
    if (candidate.kind === "main" || candidate.kind === "teammate" || candidate.kind === "subagent")
      h.add(slugifySessionName(candidate.name));
    else y.push(candidate);
  let S = (Se) => Math.min(Se.lastActive ?? 0, r);
  y.sort((Se, ke) => {
    let we = Number(ke.where === "this-machine") - Number(Se.where === "this-machine");
    return we !== 0 ? we : S(ke) - S(Se);
  });
  let w = new Set(),
    filtered = y.filter((Se) => {
      let ke = `${Se.kind}\x00${Se.id}\x00${slugifySessionName(Se.name)}`;
      if (w.has(ke)) return !1;
      return (w.add(ke), !0);
    }),
    G = new Set();
  for (let session of n.sessions) {
    let ke = session.name ? normalizeSessionTitle(session.name) : null;
    if (ke) G.add(`session\x00${session.sock}\x00${slugifySessionName(ke)}`);
  }
  let q = new Set(),
    Z = new Set();
  for (let Se of [...(n.cloud ?? []), ...(n.bridge ?? [])]) if (isUntitledName(Se.title)) Z.add(Se.id);
  for (let Se of filtered)
    if ((Se.kind === "cloud-session" || Se.kind === "bridge-session") && Z.has(Se.id))
      q.add(`${Se.kind}\x00${Se.id}\x00${slugifySessionName(Se.name)}`);
  for (let session of n.sessions)
    if (!session.name && session.cwd) {
      let ke = normalizeSessionTitle(basename_47(session.cwd)),
        we = ke && `session\x00${session.sock}\x00${slugifySessionName(ke)}`;
      if (we && !G.has(we)) q.add(we);
    }
  return { candidates: filtered, inProcess: h, defaultNamed: q };
}
/**
 * 判断会话名能否作为 @ 提及目标：不含引号、尖括号、换行和非法字符，不像 agent 名，且长度在上限内（纯 ASCII 与其他字符上限不同）。
 */
//@ chunk-e6aww6q8.js:3196434-3196709 placement
function isAddressablePeerName(e) {
  let n = slugifySessionName(e);
  if (
    e.includes('"') ||
    n.includes('"') ||
    /[<>]/.test(e) ||
    /[<>]/.test(n) ||
    /[\n\r\u2028\u2029]/.test(e) ||
    regExp_14.test(e) ||
    regExp_14.test(n) ||
    n.startsWith("agent-") ||
    n.endsWith("(agent)") ||
    n.length === 0
  )
    return !1;
  let r = [...e].length;
  return mEn.test(e) ? r <= dEn : r <= uEn;
}
//@ chunk-e6aww6q8.js:3196709-3196728 placement
var mEn = /^[\w-]+$/;
/**
 * 汇总可寻址对象（会话列表、团队文件、云端、bridge）供 @ 补全与附件使用（切分误归 AgentTool）。
 */
//@ chunk-e6aww6q8.js:3196728-3196928 placement = resolveTeamName (0.412)
async function resolveTeamName(e, n, r) {
  let s = n.teamContext?.teamName,
    [h, y, S] = await Promise.all([
      ZBr(),
      s ? readTeamFileAsync(s, r.storageV5) : Promise.resolve(null),
      iEn(e),
    ]);
  return resolvePeerAddress(n, { teamFile: y, sessions: h, cloud: warmCloudSessions(e), bridge: S });
}
//@ chunk-e6aww6q8.js:3196928-3196963 placement
function zCr(e) {
  return hEn(e.name);
}
//@ chunk-e6aww6q8.js:3196963-3197016 placement
function hEn(e) {
  return mEn.test(e) ? `@${e}` : `@"${e}"`;
}
//@ chunk-e6aww6q8.js:3197016-3197192 placement
function describePeerCandidate(e, n) {
  let r =
    e.lastActive === void 0
      ? ""
      : ` \xB7 active ${formatDuration(Math.max(0, n - e.lastActive), { mostSignificantOnly: !0 })} ago`;
  return `message session \xB7 ${joo(e.where)}${r}`;
}
/**
 * 按输入前缀生成 @ 会话提及建议：跳过进程内同名、已排除和不可寻址的候选，最多若干条，附显示文本与"最近活跃"说明。
 */
//@ chunk-e6aww6q8.js:3197192-3197487 placement
function suggestPeerMentions(e, n, r = Date.now()) {
  if (n === "") return [];
  let suggestions = [];
  for (let candidate of e.candidates) {
    if (suggestions.length >= jCr) break;
    let normalizedName = slugifySessionName(candidate.name);
    if (
      e.inProcess.has(normalizedName) ||
      SEn(e, candidate) ||
      !normalizedName.startsWith(n) ||
      !isAddressablePeerName(candidate.name)
    )
      continue;
    suggestions.push({
      id: `dm-peer-${candidate.kind}-${candidate.ref}-${normalizedName}`,
      displayText: zCr(candidate),
      description: describePeerCandidate(candidate, r),
    });
  }
  return suggestions;
}
//@ chunk-e6aww6q8.js:3197487-3197665 placement
var regExp_15 = new RegExp(
  String.raw`(?:^|${gq})@(?:"([^"\n]{1,${uEn}})"|([\w-]{1,${dEn}})(?=$|[\s,;!?)\]}>'"\u201D\u2019${rAe}]|[.:](?:$|\s)|\[${PBe}\]))(?:[ \t]*\[(${PBe})\])?`,
  "gu",
);
/**
 * 从文本中提取 @会话 提及（名称与可选引用），去重；同名既有带引用又有不带引用时只保留带引用的。
 */
//@ chunk-e6aww6q8.js:3197665-3197979 placement
function parsePeerMentions(e) {
  let mentions = [],
    seen = new Set();
  for (let match of e.matchAll(regExp_15)) {
    let name = match[1] ?? match[2];
    if (!isAddressablePeerName(name)) continue;
    let ref = match[3],
      dedupeKey = `${slugifySessionName(name)}\x00${ref ?? ""}`;
    if (seen.has(dedupeKey)) continue;
    (seen.add(dedupeKey), mentions.push({ name: name, ref: ref }));
  }
  let namesWithRef = new Set(mentions.filter((h) => h.ref !== void 0).map((h) => slugifySessionName(h.name)));
  return mentions.filter((h) => h.ref !== void 0 || !namesWithRef.has(slugifySessionName(h.name)));
}
/**
 * 把 @会话 提及解析为目标：有引用时按引用精确匹配；唯一候选直接 resolved；多个候选返回 ask 让用户选择；并记录提及结果打点。
 */
//@ chunk-e6aww6q8.js:3197979-3198574 placement
function resolvePeerMentions(mentions, peers) {
  let results = [];
  for (let { name: mentionName, ref: ref } of mentions) {
    let normalizedName = slugifySessionName(mentionName);
    if (peers.inProcess.has(normalizedName)) continue;
    let sameName = peers.candidates.filter(
        (candidate) => slugifySessionName(candidate.name) === normalizedName,
      ),
      eligible = sameName.filter((q) => !SEn(peers, q)),
      displayName = hEn(mentionName),
      mentionLabel = ref === void 0 ? displayName : `${displayName} [${ref}]`;
    if (ref !== void 0) {
      let refMatch = sameName.find((Z) => Z.ref === ref);
      if (refMatch) results.push({ kind: "resolved", mention: mentionLabel, candidate: LZe(refMatch) });
      logPeerMentionOutcome(refMatch !== void 0 ? "success" : "not_found");
      continue;
    }
    if (eligible.length === 0) continue;
    if (eligible.length === 1 && sameName.length === 1) {
      (results.push({ kind: "resolved", mention: mentionLabel, candidate: LZe(eligible[0]) }),
        logPeerMentionOutcome("success"));
      continue;
    }
    (results.push({
      kind: "ask",
      mention: mentionLabel,
      candidates: sameName.slice(0, WCr).map(LZe),
      total: sameName.length,
    }),
      logPeerMentionOutcome("ask"));
  }
  return results;
}
//@ chunk-e6aww6q8.js:3198574-3198659 placement
function SEn(e, n) {
  return e.defaultNamed.has(`${n.kind}\x00${n.id}\x00${slugifySessionName(n.name)}`);
}
//@ chunk-e6aww6q8.js:3198659-3198715 placement
function LZe(e) {
  return { token: bOe(e), where: joo(e.where) };
}
//@ chunk-e6aww6q8.js:3198715-3198953 placement
function logPeerMentionOutcome(e) {
  if (
    (logEvent(`tengu_at_mention_peer_${e}`, {}),
    logAtMention({ mentionType: "peer", success: e === "success" }),
    e === "success")
  )
    logFeatureOk("input_peer_at_mention");
  else if (e === "ask") logFeatureSad("input_peer_at_mention", "ask");
  else logFeatureBad("input_peer_at_mention", "not_found");
}

export {
  resolveTeamName,
  suggestPeerMentions,
  ZBr,
  wFo,
  parsePeerMentions,
  resolvePeerMentions,
  listPeerSessionsSafe,
  EFo,
};
