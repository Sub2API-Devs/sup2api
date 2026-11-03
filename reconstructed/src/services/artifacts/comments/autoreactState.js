/**
 * services/artifacts/comments/autoreactState.ts
 *
 * 2.1.316 新增：评论自动响应的内存状态与通知解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9tgt55am.js (33)
 * attribution: placement 33
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import {
  TENGU_MADRONE_SPINDLE_CORBEL,
  COMMENT_NOTICE_HEADER,
  COMMENTS_NOTICE_HEADER,
  ARTIFACT_LINE_PREFIX,
  THREAD_LINE_PREFIX,
  SENT_AT_LINE_PREFIX,
  THREADS_LINE_PREFIX,
  MAX_OPEN_SUMMONS,
  DESKTOP_APP,
  MAX_READ_CLAIMS,
  MAX_SUMMON_CLAIMS,
  SUMMON_GRACE_MS,
  SUMMON_POLL_MS,
} from "./commentNotifications.js";
import { parseArtifactUrl } from "../../../tools/ArtifactTool/constants.js";
import { Vt } from "../../../utils/agentId.js";
import { recordCommentHandIn, recordUnaccountedComments } from "../shareEntries.js";
import { getLiveState } from "../../liveReplica/liveReplica.js";
import { getCommentsAwaitingReply } from "./commentState.js";
import { sleep } from "../../../utils/sleep.js";
import {
  MAX_ANCHOR_FILES,
  MAX_ANCHORS_PER_FILE,
  resolveAnchorElements,
  ANCHOR_CACHE_MAX_PAGES,
} from "./pageAnchors.js";

//@ chunk-9tgt55am.js:27724-27760 placement
function isCommentNotificationGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MADRONE_SPINDLE_CORBEL, !1) === !0;
}
//@ chunk-9tgt55am.js:27760-27831 placement
var Bn = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
  ji = /^[1-9][0-9]{0,5}$/;
//@ chunk-9tgt55am.js:27831-27873 placement
function Zt(e) {
  return e != null && Bn.test(e);
}
//@ chunk-9tgt55am.js:27873-27943 placement
function Me(e, t, n) {
  return `${e.toLowerCase()}:${t.toLowerCase()}:${n}`;
}
//@ chunk-9tgt55am.js:27943-27994 placement
function kr(e, t) {
  return `${e.toLowerCase()}:*:${t}`;
}
//@ chunk-9tgt55am.js:27994-28077 placement
function isCommentNotificationText(e) {
  let t = getPromptText(e);
  return t !== null && (t.startsWith(COMMENT_NOTICE_HEADER) || t.startsWith(COMMENTS_NOTICE_HEADER));
}
/**
 * 解析"[Artifact comment sent to Claude]"格式的通知文本，取出 artifact、线程与发送时间。
 */
//@ chunk-9tgt55am.js:28077-28464 placement
function parseCommentNotification(e) {
  if (!e.startsWith(COMMENT_NOTICE_HEADER)) return null;
  let parts = e.split(
    `
`,
    4,
  );
  if (parts.length < 4 || parts[0] !== COMMENT_NOTICE_HEADER) return null;
  let n = parts[1],
    a = parts[2],
    r = parts[3];
  if (
    !n.startsWith(ARTIFACT_LINE_PREFIX) ||
    !a.startsWith(THREAD_LINE_PREFIX) ||
    !r.startsWith(SENT_AT_LINE_PREFIX)
  )
    return null;
  let s = parseArtifactUrl(n.slice(ARTIFACT_LINE_PREFIX.length).trim())?.slug,
    trimmed = a.slice(THREAD_LINE_PREFIX.length).trim(),
    sliced = r.slice(SENT_AT_LINE_PREFIX.length);
  if (s === void 0 || Vt(trimmed) === null || !Bn.test(sliced)) return null;
  return { slug: s, threadId: trimmed, gestureAt: sliced };
}
//@ chunk-9tgt55am.js:28464-28847 placement
function parseMultiCommentNotification(e) {
  if (!e.startsWith(COMMENTS_NOTICE_HEADER)) return null;
  let parts = e.split(
    `
`,
    4,
  );
  if (parts.length < 4 || parts[0] !== COMMENTS_NOTICE_HEADER) return null;
  let n = parts[1],
    a = parts[2],
    r = parts[3];
  if (
    !n.startsWith(ARTIFACT_LINE_PREFIX) ||
    !a.startsWith(THREADS_LINE_PREFIX) ||
    !r.startsWith(SENT_AT_LINE_PREFIX)
  )
    return null;
  let s = parseArtifactUrl(n.slice(ARTIFACT_LINE_PREFIX.length).trim())?.slug,
    sliced = a.slice(THREADS_LINE_PREFIX.length),
    sliced_2 = r.slice(SENT_AT_LINE_PREFIX.length);
  if (s === void 0 || !ji.test(sliced) || !Bn.test(sliced_2)) return null;
  return { slug: s, count: Number(sliced), gestureAt: sliced_2 };
}
//@ chunk-9tgt55am.js:28847-28984 placement
function summonKeyFromNotification(e) {
  let t = parseCommentNotification(e);
  if (t !== null) return Me(t.slug, t.threadId, t.gestureAt);
  let n = parseMultiCommentNotification(e);
  return n === null ? null : kr(n.slug, n.gestureAt);
}
//@ chunk-9tgt55am.js:28984-29282 placement
function consumeSeededSummon(e) {
  if (e.seededSummon !== !0) return null;
  let t = getPromptText(e.value),
    n = t === null ? null : summonKeyFromNotification(t);
  if (t === null || n === null) return null;
  let a = parseCommentNotification(t);
  if (a !== null) recordCommentHandIn(a.slug, a.threadId, a.gestureAt);
  else {
    let r = parseMultiCommentNotification(t);
    if (r !== null) recordUnaccountedComments(r.slug);
  }
  if (e.shouldQuery === !1) return null;
  if ((Cr([n]), a !== null)) rememberOpenSummon(n, a);
  return n;
}
/**
 * 用户提示词是宿主预置的评论召唤时，解析通知得到召唤键（单条或多条评论），记录评论交入并登记为已认领；不是召唤时返回 null。
 */
//@ chunk-9tgt55am.js:29282-29505 placement
function takeSeededSummon(e) {
  if (e.seededSummon !== !0 || e.shouldQuery === !1) return null;
  let t = getPromptText(e.value),
    n = t === null ? null : summonKeyFromNotification(t);
  if (t === null || n === null) return null;
  let a = parseCommentNotification(t);
  if (a !== null) recordCommentHandIn(a.slug, a.threadId, a.gestureAt);
  return (Cr([n]), n);
}
//@ chunk-9tgt55am.js:29505-29734 placement
function rememberOpenSummon(e, t) {
  let { open: open } = getLiveState().summonSeeds;
  (open.delete(e),
    open.set(e, { slug: t.slug.toLowerCase(), threadId: t.threadId.toLowerCase(), gestureAt: t.gestureAt }));
  while (open.size > MAX_OPEN_SUMMONS) {
    let a = open.keys().next().value;
    if (a === void 0) break;
    open.delete(a);
  }
}
//@ chunk-9tgt55am.js:29734-30125 placement
function settleSummonSeed(e, t, n) {
  let { open: open, settled: settled } = getLiveState().summonSeeds,
    lower = e.toLowerCase(),
    lower_2 = t.toLowerCase();
  for (let [y, C] of open) if (C.slug === lower && C.threadId === lower_2) open.delete(y);
  let h = n == null ? null : parseCommentNotification(n);
  if (h !== null && h.slug.toLowerCase() === lower && h.threadId.toLowerCase() === lower_2) {
    let y = Me(h.slug, h.threadId, h.gestureAt);
    (settled.delete(y), settled.add(y));
    while (settled.size > MAX_OPEN_SUMMONS) {
      let C = settled.values().next().value;
      if (C === void 0) break;
      settled.delete(C);
    }
  }
}
//@ chunk-9tgt55am.js:30125-30212 placement
function JFs(e) {
  return getLiveState().summonSeeds.settled.has(Me(e.slug, e.threadId, e.gestureAt));
}
//@ chunk-9tgt55am.js:30212-30296 placement
function QFs(e) {
  return getLiveState().summonSeeds.open.get(Me(e.slug, e.threadId, e.gestureAt));
}
/**
 * 判断提示词来自本地真实用户输入：已声明、非远程 IO、非合成、非对等投递、没有入站来源，且客户端平台为空或是桌面应用。
 */
//@ chunk-9tgt55am.js:30296-30466 placement
function isLocalDesktopPrompt(e) {
  return (
    e.declared === !0 &&
    !e.isRemoteIO &&
    e.isSynthetic !== !0 &&
    !e.peerDelivered &&
    e.inboundOrigin === void 0 &&
    (e.clientPlatform === void 0 || e.clientPlatform === DESKTOP_APP)
  );
}
/**
 * 为线程里等待回复且时间戳有效的评论生成召唤键，登记为已读认领（有上限），返回数量。
 */
//@ chunk-9tgt55am.js:30466-30633 placement
function claimAwaitingReplies(e, t) {
  let n = [];
  for (let a of t)
    for (let r of getCommentsAwaitingReply(a)) if (Zt(r.toClaudeAt)) n.push(Me(e, a.id, r.toClaudeAt));
  return (addToBoundedSet(getLiveState().summonSeeds.readClaims, n, MAX_READ_CLAIMS), n.length);
}
/**
 * 把一组值按最近使用顺序加入集合（已有的移到末尾），超过上限时淘汰最早的。
 */
//@ chunk-9tgt55am.js:30633-30767 placement
function addToBoundedSet(e, t, n) {
  for (let a of t) (e.delete(a), e.add(a));
  while (e.size > n) {
    let a = e.values().next().value;
    if (a === void 0) break;
    e.delete(a);
  }
}
//@ chunk-9tgt55am.js:30767-30815 placement
function Cr(e) {
  addToBoundedSet(getLiveState().summonSeeds.claims, e, MAX_SUMMON_CLAIMS);
}
//@ chunk-9tgt55am.js:30815-30838 placement
var Gn = { hostSeeded: !0 };
//@ chunk-9tgt55am.js:30838-30937 placement
function St(e, t, n, a = Gn) {
  return getLiveState().summonSeeds.readClaims.has(Me(e, t, n)) || (a.hostSeeded && en(e, t, n));
}
//@ chunk-9tgt55am.js:30937-31027 placement
function en(e, t, n) {
  let { claims: claims } = getLiveState().summonSeeds;
  return claims.has(Me(e, t, n)) || claims.has(kr(e, n));
}
//@ chunk-9tgt55am.js:31027-31096 placement
function Hn(e, t, n, a = Gn) {
  return n.length > 0 && n.every((r) => St(e, t, r, a));
}
/**
 * 消费召唤种子的认领记录：校验通过后删除对应的读认领（由宿主预置时一并删除认领）。
 */
//@ chunk-9tgt55am.js:31096-31269 placement
function consumeSummonClaims(e, t, n, a = Gn) {
  if (!Hn(e, t, n, a)) return !1;
  let { claims: claims, readClaims: readClaims } = getLiveState().summonSeeds;
  for (let d of n) if ((readClaims.delete(Me(e, t, d)), a.hostSeeded)) claims.delete(Me(e, t, d));
  return !0;
}
//@ chunk-9tgt55am.js:31269-31358 placement
function Or(e, t, n) {
  let { readClaims: readClaims } = getLiveState().summonSeeds;
  for (let r of n) readClaims.delete(Me(e, t, r));
}
/**
 * 在宽限期内轮询等待某线程的召唤认领出现（可中止），到期后再检查一次。
 */
//@ chunk-9tgt55am.js:31358-31573 placement
async function waitForSummonClaim(e, t, n, a) {
  let r = getLiveState().summonSeeds.graceMsOverride ?? SUMMON_GRACE_MS,
    s = Date.now() + r;
  while (Date.now() < s) {
    if (a.aborted) return !1;
    if (Hn(e, t, n)) return !0;
    await sleep(Math.min(SUMMON_POLL_MS, Math.max(1, s - Date.now())), a);
  }
  return Hn(e, t, n);
}
/**
 * 取提示词文本：字符串直接返回；内容块数组取最后一个 text 块的文字；否则 null。
 */
//@ chunk-9tgt55am.js:31573-31729 placement
function getPromptText(e) {
  if (typeof e === "string") return e;
  if (Array.isArray(e)) {
    let at = e.at(-1);
    if (at?.type === "text" && typeof at.text === "string") return at.text;
  }
  return null;
}
//@ chunk-9tgt55am.js:35345-35500 placement
function getWholeFileAnchor(e) {
  return e.anchor_path !== void 0 &&
    (e.span_quote === void 0 || e.span_quote === "") &&
    e.anchor_file_degraded !== !0 &&
    e.carried !== !0
    ? e.anchor_path
    : void 0;
}
//@ chunk-9tgt55am.js:35500-35618 placement
function getLatestCommentTime(e) {
  return e.comments.reduce(
    (t, n) => (n.created_at !== void 0 && n.created_at > t ? n.created_at : t),
    e.created_at ?? "",
  );
}
//@ chunk-9tgt55am.js:35618-37679 placement
async function collectThreadAnchorSnippets(e, t, n = {}) {
  let { onlyThreadIds: onlyThreadIds, memoKey: memoKey, regionKids: regionKids } = n,
    d = getLiveState(),
    { anchorSnippets: anchorSnippets, accountEpoch: accountEpoch } = d,
    C = (P) => (memoKey === void 0 ? void 0 : anchorSnippets.get(`${memoKey}|${P ?? ""}`)),
    R = (P) => {
      if (onlyThreadIds !== void 0 && !onlyThreadIds.has(P.id)) return;
      let D = getWholeFileAnchor(P);
      if (D === void 0) return;
      let G = P.anchor_region ? regionKids?.get(P.id) : void 0;
      return G === void 0 || G.length === 0
        ? { path: D, key: D }
        : { path: D, kids: G, key: `${D}|k${G.join(",")}` };
    },
    b = (P) => (P.comments.some((comment) => comment.sent_to_claude === !0) ? 0 : 2) + (P.resolved ? 1 : 0),
    sorted = e
      .filter((P) => R(P) !== void 0)
      .sort((P, D) => b(P) - b(D) || getLatestCommentTime(D).localeCompare(getLatestCommentTime(P))),
    S = new Map(),
    w = new Map();
  for (let P of sorted) {
    let D = R(P),
      G = C(P.anchor_file);
    if (G?.has(D.key)) {
      let x = w.get(P.anchor_file) ?? new Map();
      (x.set(D.key, G.get(D.key)), w.set(P.anchor_file, x));
      continue;
    }
    if (!S.has(P.anchor_file)) {
      if (S.size >= MAX_ANCHOR_FILES) continue;
      S.set(P.anchor_file, { paths: new Set(), requests: new Map() });
    }
    let { paths: paths, requests: requests } = S.get(P.anchor_file);
    if (paths.size < MAX_ANCHORS_PER_FILE || paths.has(D.path)) (paths.add(D.path), requests.set(D.key, D));
  }
  if (memoKey !== void 0)
    for (let P of w.keys()) {
      let D = `${memoKey}|${P ?? ""}`,
        G = anchorSnippets.get(D);
      if (G !== void 0) (anchorSnippets.delete(D), anchorSnippets.set(D, G));
    }
  let L = new Map();
  return (
    await Promise.all(
      [...S].map(async ([P, { paths: D, requests: G }]) => {
        let V = await t(P).catch(() => {
          return;
        });
        if (V === void 0) return;
        let q = new Map();
        for (let { path: path, kids: kids } of G.values())
          if (kids !== void 0) q.set(path, [...(q.get(path) ?? []), ...kids]);
        let x = await resolveAnchorElements(V, [...D], q),
          Y = new Set(),
          z = new Map();
        for (let { path: path, kids: kids, key: key } of G.values()) {
          let le = x.get(path);
          if (le === void 0) {
            z.set(key, null);
            continue;
          }
          let me = kids?.map((ue) => le.kids?.get(ue));
          if (me?.includes(void 0)) Y.add(key);
          let be = Y.has(key) ? [] : me?.filter((ue) => typeof ue === "string");
          z.set(key, { snippet: le.snippet, ...(be !== void 0 && be.length > 0 && { inside: be }) });
        }
        if ((L.set(P, z), memoKey === void 0 || d.accountEpoch !== accountEpoch)) return;
        let Q = `${memoKey}|${P ?? ""}`,
          I = anchorSnippets.get(Q) ?? new Map();
        for (let [j, Z] of z) if (!Y.has(j)) I.set(j, Z);
        (anchorSnippets.delete(Q), anchorSnippets.set(Q, I));
        while (anchorSnippets.size > ANCHOR_CACHE_MAX_PAGES)
          anchorSnippets.delete(anchorSnippets.keys().next().value);
      }),
    ),
    e.map((P) => {
      let D = R(P);
      if (D === void 0) return P;
      let G = L.get(P.anchor_file)?.get(D.key) ?? w.get(P.anchor_file)?.get(D.key) ?? void 0;
      return G === void 0 || G === null
        ? P
        : { ...P, anchor_snippet: G.snippet, ...(G.inside !== void 0 && { region_inside: [...G.inside] }) };
    })
  );
}
//@ chunk-9tgt55am.js:37679-37774 placement
function zn(e) {
  let t = { ...e, consumed: !1 };
  return (getLiveState().summonAnswers.set(e.expectedToolUseId, t), t);
}
/**
 * 某次回复工具调用对应的召唤答复还没用过且属于同一线程时，标记为已用；返回是否算作回应召唤，或需要延续的回复 id。
 */
//@ chunk-9tgt55am.js:37774-38046 placement
function consumeSummonAnswer(e, t, n) {
  let a = n === void 0 ? void 0 : getLiveState().summonAnswers.get(n);
  if (a === void 0 || a.consumed || a.slug !== e || a.threadId !== t) return { answersSummon: !1 };
  return (
    (a.consumed = !0),
    a.continuesReplyId === void 0
      ? { answersSummon: !0 }
      : { answersSummon: !1, continuesReplyId: a.continuesReplyId }
  );
}
/**
 * 若召唤回答仍是当前记录，则按预期工具调用 id 删除它。
 */
//@ chunk-9tgt55am.js:38046-38150 placement
function clearSummonAnswer(e) {
  let summonAnswers = getLiveState().summonAnswers;
  if (summonAnswers.get(e.expectedToolUseId) === e) summonAnswers.delete(e.expectedToolUseId);
}

export {
  isLocalDesktopPrompt,
  takeSeededSummon,
  consumeSeededSummon,
  isCommentNotificationGateOn,
  settleSummonSeed,
  collectThreadAnchorSnippets,
  claimAwaitingReplies,
  consumeSummonAnswer,
  parseCommentNotification,
  QFs,
  JFs,
  zn,
  clearSummonAnswer,
  St,
  Zt,
  en,
  Or,
  consumeSummonClaims,
  waitForSummonClaim,
  getPromptText,
  isCommentNotificationText,
};
