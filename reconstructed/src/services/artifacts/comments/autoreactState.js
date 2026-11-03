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
import { normalizeUuidOrNull } from "../../../utils/agentId.js";
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
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MADRONE_SPINDLE_CORBEL, false) === true;
}
//@ chunk-9tgt55am.js:27760-27831 placement
var ISO_SECOND_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
var NUMBER_STRING_RE = /^[1-9][0-9]{0,5}$/;
//@ chunk-9tgt55am.js:27831-27873 placement
function isToClaudeTimestamp(toClaudeAt) {
  return toClaudeAt != null && ISO_SECOND_UTC_RE.test(toClaudeAt);
}
//@ chunk-9tgt55am.js:27873-27943 placement
function summonKey(e, t, n) {
  return `${e.toLowerCase()}:${t.toLowerCase()}:${n}`;
}
//@ chunk-9tgt55am.js:27943-27994 placement
function summonSlugKey(e, t) {
  return `${e.toLowerCase()}:*:${t}`;
}
//@ chunk-9tgt55am.js:27994-28077 placement
function isCommentNotificationText(e) {
  let promptText = getPromptText(e);
  return (
    promptText !== null &&
    (promptText.startsWith(COMMENT_NOTICE_HEADER) || promptText.startsWith(COMMENTS_NOTICE_HEADER))
  );
}
//@ chunk-9tgt55am.js:28077-28464 placement
/**
 * 解析"[Artifact comment sent to Claude]"格式的通知文本，取出 artifact、线程与发送时间。
 */
function parseCommentNotification(promptText) {
  if (!promptText.startsWith(COMMENT_NOTICE_HEADER)) return null;
  let lines = promptText.split(
    `
`,
    4,
  );
  if (lines.length < 4 || lines[0] !== COMMENT_NOTICE_HEADER) return null;
  let n = lines[1];
  let a = lines[2];
  let r = lines[3];
  if (
    !n.startsWith(ARTIFACT_LINE_PREFIX) ||
    !a.startsWith(THREAD_LINE_PREFIX) ||
    !r.startsWith(SENT_AT_LINE_PREFIX)
  )
    return null;
  let slug = parseArtifactUrl(n.slice(ARTIFACT_LINE_PREFIX.length).trim())?.slug;
  let trimmed = a.slice(THREAD_LINE_PREFIX.length).trim();
  let sliced = r.slice(SENT_AT_LINE_PREFIX.length);
  if (slug === undefined || normalizeUuidOrNull(trimmed) === null || !ISO_SECOND_UTC_RE.test(sliced))
    return null;
  return {
    slug,
    threadId: trimmed,
    gestureAt: sliced,
  };
}
//@ chunk-9tgt55am.js:28464-28847 placement
function parseMultiCommentNotification(e) {
  if (!e.startsWith(COMMENTS_NOTICE_HEADER)) return null;
  let lines = e.split(
    `
`,
    4,
  );
  if (lines.length < 4 || lines[0] !== COMMENTS_NOTICE_HEADER) return null;
  let n = lines[1];
  let a = lines[2];
  let r = lines[3];
  if (
    !n.startsWith(ARTIFACT_LINE_PREFIX) ||
    !a.startsWith(THREADS_LINE_PREFIX) ||
    !r.startsWith(SENT_AT_LINE_PREFIX)
  )
    return null;
  let slug = parseArtifactUrl(n.slice(ARTIFACT_LINE_PREFIX.length).trim())?.slug;
  let sliced = a.slice(THREADS_LINE_PREFIX.length);
  let sliced_2 = r.slice(SENT_AT_LINE_PREFIX.length);
  if (slug === undefined || !NUMBER_STRING_RE.test(sliced) || !ISO_SECOND_UTC_RE.test(sliced_2)) return null;
  return {
    slug,
    count: Number(sliced),
    gestureAt: sliced_2,
  };
}
//@ chunk-9tgt55am.js:28847-28984 placement
function summonKeyFromNotification(promptText) {
  let commentNotification = parseCommentNotification(promptText);
  if (commentNotification !== null)
    return summonKey(commentNotification.slug, commentNotification.threadId, commentNotification.gestureAt);
  let multiCommentNotification = parseMultiCommentNotification(promptText);
  return multiCommentNotification === null
    ? null
    : summonSlugKey(multiCommentNotification.slug, multiCommentNotification.gestureAt);
}
//@ chunk-9tgt55am.js:28984-29282 placement
function consumeSeededSummon(e) {
  if (e.seededSummon !== true) return null;
  let promptText = getPromptText(e.value);
  let n = promptText === null ? null : summonKeyFromNotification(promptText);
  if (promptText === null || n === null) return null;
  let commentNotification = parseCommentNotification(promptText);
  if (commentNotification !== null)
    recordCommentHandIn(
      commentNotification.slug,
      commentNotification.threadId,
      commentNotification.gestureAt,
    );
  else {
    let multiCommentNotification = parseMultiCommentNotification(promptText);
    if (multiCommentNotification !== null) recordUnaccountedComments(multiCommentNotification.slug);
  }
  if (e.shouldQuery === false) return null;
  addSummonClaim([n]);
  if (commentNotification !== null) rememberOpenSummon(n, commentNotification);
  return n;
}
//@ chunk-9tgt55am.js:29282-29505 placement
/**
 * 用户提示词是宿主预置的评论召唤时，解析通知得到召唤键（单条或多条评论），记录评论交入并登记为已认领；不是召唤时返回 null。
 */
function takeSeededSummon(e) {
  if (e.seededSummon !== true || e.shouldQuery === false) return null;
  let promptText = getPromptText(e.value);
  let n = promptText === null ? null : summonKeyFromNotification(promptText);
  if (promptText === null || n === null) return null;
  let commentNotification = parseCommentNotification(promptText);
  if (commentNotification !== null)
    recordCommentHandIn(
      commentNotification.slug,
      commentNotification.threadId,
      commentNotification.gestureAt,
    );
  addSummonClaim([n]);
  return n;
}
//@ chunk-9tgt55am.js:29505-29734 placement
function rememberOpenSummon(e, commentNotification) {
  let { open } = getLiveState().summonSeeds;
  open.delete(e);
  open.set(e, {
    slug: commentNotification.slug.toLowerCase(),
    threadId: commentNotification.threadId.toLowerCase(),
    gestureAt: commentNotification.gestureAt,
  });
  while (open.size > MAX_OPEN_SUMMONS) {
    let a = open.keys().next().value;
    if (a === undefined) break;
    open.delete(a);
  }
}
//@ chunk-9tgt55am.js:29734-30125 placement
function settleSummonSeed(slug, threadId, text) {
  let { open, settled } = getLiveState().summonSeeds;
  let lower = slug.toLowerCase();
  let lower_2 = threadId.toLowerCase();
  for (let [y, C] of open) if (C.slug === lower && C.threadId === lower_2) open.delete(y);
  let h = text == null ? null : parseCommentNotification(text);
  if (h !== null && h.slug.toLowerCase() === lower && h.threadId.toLowerCase() === lower_2) {
    let y = summonKey(h.slug, h.threadId, h.gestureAt);
    settled.delete(y);
    settled.add(y);
    while (settled.size > MAX_OPEN_SUMMONS) {
      let C = settled.values().next().value;
      if (C === undefined) break;
      settled.delete(C);
    }
  }
}
//@ chunk-9tgt55am.js:30125-30212 placement
/**
 * 导出函数 `isSummonSettled`：参数 e，返回 getLiveState().summonSeeds.settled.has(Me(e.slug, e.threadId, e.gestureAt))。
 */
function isSummonSettled(e) {
  return getLiveState().summonSeeds.settled.has(summonKey(e.slug, e.threadId, e.gestureAt));
}
//@ chunk-9tgt55am.js:30212-30296 placement
/**
 * 导出函数 `openSummonFor`：参数 e，返回 getLiveState().summonSeeds.open.get(Me(e.slug, e.threadId, e.gestureAt))。
 */
function openSummonFor(e) {
  return getLiveState().summonSeeds.open.get(summonKey(e.slug, e.threadId, e.gestureAt));
}
//@ chunk-9tgt55am.js:30296-30466 placement
/**
 * 判断提示词来自本地真实用户输入：已声明、非远程 IO、非合成、非对等投递、没有入站来源，且客户端平台为空或是桌面应用。
 */
function isLocalDesktopPrompt(e) {
  return (
    e.declared === true &&
    !e.isRemoteIO &&
    e.isSynthetic !== true &&
    !e.peerDelivered &&
    e.inboundOrigin === undefined &&
    (e.clientPlatform === undefined || e.clientPlatform === DESKTOP_APP)
  );
}
//@ chunk-9tgt55am.js:30466-30633 placement
/**
 * 为线程里等待回复且时间戳有效的评论生成召唤键，登记为已读认领（有上限），返回数量。
 */
function claimAwaitingReplies(slug, t) {
  let n = [];
  for (let a of t)
    for (let r of getCommentsAwaitingReply(a))
      if (isToClaudeTimestamp(r.toClaudeAt)) n.push(summonKey(slug, a.id, r.toClaudeAt));
  addToBoundedSet(getLiveState().summonSeeds.readClaims, n, MAX_READ_CLAIMS);
  return n.length;
}
//@ chunk-9tgt55am.js:30633-30767 placement
/**
 * 把一组值按最近使用顺序加入集合（已有的移到末尾），超过上限时淘汰最早的。
 */
function addToBoundedSet(e, t, n) {
  for (let a of t) {
    e.delete(a);
    e.add(a);
  }
  while (e.size > n) {
    let a = e.values().next().value;
    if (a === undefined) break;
    e.delete(a);
  }
}
//@ chunk-9tgt55am.js:30767-30815 placement
function addSummonClaim(e) {
  addToBoundedSet(getLiveState().summonSeeds.claims, e, MAX_SUMMON_CLAIMS);
}
//@ chunk-9tgt55am.js:30815-30838 placement
var DEFAULT_SEED_OPTIONS = {
  hostSeeded: true,
};
//@ chunk-9tgt55am.js:30838-30937 placement
function hasSummonClaim(slug, id, n, a = DEFAULT_SEED_OPTIONS) {
  return (
    getLiveState().summonSeeds.readClaims.has(summonKey(slug, id, n)) ||
    (a.hostSeeded && hasHostClaim(slug, id, n))
  );
}
//@ chunk-9tgt55am.js:30937-31027 placement
function hasHostClaim(slug, id, n) {
  let { claims } = getLiveState().summonSeeds;
  return claims.has(summonKey(slug, id, n)) || claims.has(summonSlugKey(slug, n));
}
//@ chunk-9tgt55am.js:31027-31096 placement
function allSummonsClaimed(e, t, n, a = DEFAULT_SEED_OPTIONS) {
  return n.length > 0 && n.every((r) => hasSummonClaim(e, t, r, a));
}
//@ chunk-9tgt55am.js:31096-31269 placement
/**
 * 消费召唤种子的认领记录：校验通过后删除对应的读认领（由宿主预置时一并删除认领）。
 */
function consumeSummonClaims(slug, id, n, a = DEFAULT_SEED_OPTIONS) {
  if (!allSummonsClaimed(slug, id, n, a)) return false;
  let { claims, readClaims } = getLiveState().summonSeeds;
  for (let d of n) {
    readClaims.delete(summonKey(slug, id, d));
    if (a.hostSeeded) claims.delete(summonKey(slug, id, d));
  }
  return true;
}
//@ chunk-9tgt55am.js:31269-31358 placement
function consumeReadClaims(slug, id, n) {
  let { readClaims } = getLiveState().summonSeeds;
  for (let r of n) readClaims.delete(summonKey(slug, id, r));
}
//@ chunk-9tgt55am.js:31358-31573 placement
/**
 * 在宽限期内轮询等待某线程的召唤认领出现（可中止），到期后再检查一次。
 */
async function waitForSummonClaim(slug, id, n, signal) {
  let graceMsOverride = getLiveState().summonSeeds.graceMsOverride ?? SUMMON_GRACE_MS;
  let s = Date.now() + graceMsOverride;
  while (Date.now() < s) {
    if (signal.aborted) return false;
    if (allSummonsClaimed(slug, id, n)) return true;
    await sleep(Math.min(SUMMON_POLL_MS, Math.max(1, s - Date.now())), signal);
  }
  return allSummonsClaimed(slug, id, n);
}
//@ chunk-9tgt55am.js:31573-31729 placement
/**
 * 取提示词文本：字符串直接返回；内容块数组取最后一个 text 块的文字；否则 null。
 */
function getPromptText(e) {
  if (typeof e === "string") return e;
  if (Array.isArray(e)) {
    let last = e.at(-1);
    if (last?.type === "text" && typeof last.text === "string") return last.text;
  }
  return null;
}
//@ chunk-9tgt55am.js:35345-35500 placement
function getWholeFileAnchor(e) {
  return e.anchor_path !== undefined &&
    (e.span_quote === undefined || e.span_quote === "") &&
    e.anchor_file_degraded !== true &&
    e.carried !== true
    ? e.anchor_path
    : undefined;
}
//@ chunk-9tgt55am.js:35500-35618 placement
function getLatestCommentTime(e) {
  return e.comments.reduce(
    (acc, comment) =>
      comment.created_at !== undefined && comment.created_at > acc ? comment.created_at : acc,
    e.created_at ?? "",
  );
}
//@ chunk-9tgt55am.js:35618-37679 placement
async function collectThreadAnchorSnippets(e, t, n = {}) {
  let { onlyThreadIds, memoKey, regionKids } = n;
  let liveState = getLiveState();
  let { anchorSnippets, accountEpoch } = liveState;
  let C = (anchorFile) =>
    memoKey === undefined ? undefined : anchorSnippets.get(`${memoKey}|${anchorFile ?? ""}`);
  let R = (P) => {
    if (onlyThreadIds !== undefined && !onlyThreadIds.has(P.id)) return;
    let wholeFileAnchor = getWholeFileAnchor(P);
    if (wholeFileAnchor === undefined) return;
    let G = P.anchor_region ? regionKids?.get(P.id) : undefined;
    return G === undefined || G.length === 0
      ? {
          path: wholeFileAnchor,
          key: wholeFileAnchor,
        }
      : {
          path: wholeFileAnchor,
          kids: G,
          key: `${wholeFileAnchor}|k${G.join(",")}`,
        };
  };
  let b = (P) =>
    (P.comments.some((comment) => comment.sent_to_claude === true) ? 0 : 2) + (P.resolved ? 1 : 0);
  let sorted = e
    .filter((P) => R(P) !== undefined)
    .sort((P, D) => b(P) - b(D) || getLatestCommentTime(D).localeCompare(getLatestCommentTime(P)));
  let S = new Map();
  let w = new Map();
  for (let P of sorted) {
    let D = R(P);
    let G = C(P.anchor_file);
    if (G?.has(D.key)) {
      let x = w.get(P.anchor_file) ?? new Map();
      x.set(D.key, G.get(D.key));
      w.set(P.anchor_file, x);
      continue;
    }
    if (!S.has(P.anchor_file)) {
      if (S.size >= MAX_ANCHOR_FILES) continue;
      S.set(P.anchor_file, {
        paths: new Set(),
        requests: new Map(),
      });
    }
    let { paths, requests } = S.get(P.anchor_file);
    if (paths.size < MAX_ANCHORS_PER_FILE || paths.has(D.path)) {
      paths.add(D.path);
      requests.set(D.key, D);
    }
  }
  if (memoKey !== undefined)
    for (let key of w.keys()) {
      let D = `${memoKey}|${key ?? ""}`;
      let G = anchorSnippets.get(D);
      if (G !== undefined) {
        anchorSnippets.delete(D);
        anchorSnippets.set(D, G);
      }
    }
  let L = new Map();
  await Promise.all(
    [...S].map(async ([P, { paths: D, requests: G }]) => {
      let V = await t(P).catch(() => {
        return;
      });
      if (V === undefined) return;
      let q = new Map();
      for (let { path, kids } of G.values())
        if (kids !== undefined) q.set(path, [...(q.get(path) ?? []), ...kids]);
      let anchorElements = await resolveAnchorElements(V, [...D], q);
      let Y = new Set();
      let z = new Map();
      for (let { path, kids, key } of G.values()) {
        let le = anchorElements.get(path);
        if (le === undefined) {
          z.set(key, null);
          continue;
        }
        let mapped = kids?.map((ue) => le.kids?.get(ue));
        if (mapped?.includes(undefined)) Y.add(key);
        let be = Y.has(key) ? [] : mapped?.filter((ue) => typeof ue === "string");
        z.set(key, {
          snippet: le.snippet,
          ...(be !== undefined &&
            be.length > 0 && {
              inside: be,
            }),
        });
      }
      L.set(P, z);
      if (memoKey === undefined || liveState.accountEpoch !== accountEpoch) return;
      let Q = `${memoKey}|${P ?? ""}`;
      let I = anchorSnippets.get(Q) ?? new Map();
      for (let [j, Z] of z) if (!Y.has(j)) I.set(j, Z);
      anchorSnippets.delete(Q);
      anchorSnippets.set(Q, I);
      while (anchorSnippets.size > ANCHOR_CACHE_MAX_PAGES)
        anchorSnippets.delete(anchorSnippets.keys().next().value);
    }),
  );
  return e.map((P) => {
    let D = R(P);
    if (D === undefined) return P;
    let G = L.get(P.anchor_file)?.get(D.key) ?? w.get(P.anchor_file)?.get(D.key) ?? undefined;
    return G === undefined || G === null
      ? P
      : {
          ...P,
          anchor_snippet: G.snippet,
          ...(G.inside !== undefined && {
            region_inside: [...G.inside],
          }),
        };
  });
}
//@ chunk-9tgt55am.js:37679-37774 placement
function rememberSummonAnswer(e) {
  let t = {
    ...e,
    consumed: false,
  };
  getLiveState().summonAnswers.set(e.expectedToolUseId, t);
  return t;
}
//@ chunk-9tgt55am.js:37774-38046 placement
/**
 * 某次回复工具调用对应的召唤答复还没用过且属于同一线程时，标记为已用；返回是否算作回应召唤，或需要延续的回复 id。
 */
function consumeSummonAnswer(slug, threadId, toolUseId) {
  let a = toolUseId === undefined ? undefined : getLiveState().summonAnswers.get(toolUseId);
  if (a === undefined || a.consumed || a.slug !== slug || a.threadId !== threadId)
    return {
      answersSummon: false,
    };
  a.consumed = true;
  return a.continuesReplyId === undefined
    ? {
        answersSummon: true,
      }
    : {
        answersSummon: false,
        continuesReplyId: a.continuesReplyId,
      };
}
//@ chunk-9tgt55am.js:38046-38150 placement
/**
 * 若召唤回答仍是当前记录，则按预期工具调用 id 删除它。
 */
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
  openSummonFor,
  isSummonSettled,
  rememberSummonAnswer,
  clearSummonAnswer,
  hasSummonClaim,
  isToClaudeTimestamp,
  hasHostClaim,
  consumeReadClaims,
  consumeSummonClaims,
  waitForSummonClaim,
  getPromptText,
  isCommentNotificationText,
};
