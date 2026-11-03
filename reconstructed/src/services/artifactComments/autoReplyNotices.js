/**
 * services/artifactComments/autoReplyNotices.ts
 *
 * Artifact 评论自动回复通知（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jh9jdn8w.js (16)
 * attribution: placement 16
 */
import { isBgSession } from "../../utils/concurrentSessions.js";
import {
  getAttacherCaps,
  getRvSupervisorLinkLive,
  onAttacherCapsChange,
  onRvSupervisorLinkChange,
} from "../../bootstrap/state.js";
import { getLiveState, stopSupervisor, disposePresenceSlug } from "../liveReplica/liveReplica.js";
import {
  isSlugStopped,
  isSlugSwept,
  stopGeneration,
  isSlugStoppedAnywhere,
} from "../artifacts/summonArms.js";
import { createInformationalSystemMessage } from "../../utils/messages.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-jh9jdn8w.js:434-493 placement
/**
 * 导出函数 `canAutoReply`：返回 !0; return getAttacherCaps() !== null && getRvSupervisorLinkLive()。
 */
function canAutoReply() {
  if (!isBgSession()) return true;
  return getAttacherCaps() !== null && getRvSupervisorLinkLive();
}
//@ chunk-jh9jdn8w.js:493-550 placement
/**
 * 导出函数 `subscribeAutoReplyChanges`：参数 e，返回 () => { (t(), n()); }。
 */
function subscribeAutoReplyChanges(e) {
  let t = onAttacherCapsChange(e);
  let n = onRvSupervisorLinkChange(e);
  return () => {
    t();
    n();
  };
}
//@ chunk-jh9jdn8w.js:550-659 placement
/**
 * 自动回复开启时，返回当前正在监听评论的 artifact slug 集合；否则返回空集。
 */
function getAutoReactSlugs() {
  if (getLiveState().autoReact.enabledMemo !== true) return new Set();
  return new Set(Array.from(iterateAutoReactSupervisors(), (e) => e.slug));
}
//@ chunk-jh9jdn8w.js:659-996 placement
/**
 * 返回正在启动中、仍属本轮扫描且未被停止/撤销的自动回复监听 slug（新发布且刚清扫过的也算）；自动回复关闭或用户解除时返回空集。
 */
function getBootingAutoReactSlugs() {
  let { autoReact, durable, live, wakes } = getLiveState();
  let i = new Set();
  if (autoReact.enabledMemo === false || autoReact.userDisarmed) return i;
  for (let [o, s] of live.bootingWiredArms) {
    if (
      s.scanGeneration !== wakes.scanGeneration ||
      live.retiredInFlightArms.has(o) ||
      durable.stopLatches.isStopped(o)
    )
      continue;
    if (!isSlugStopped(o) || (s.freshPublish && isSlugSwept(o) && s.stopGeneration === stopGeneration(o)))
      i.add(o);
  }
  return i;
}
//@ chunk-jh9jdn8w.js:996-1116 placement
function* iterateAutoReactSupervisors() {
  for (let supervisor of getLiveState().live.supervisors.values())
    if (
      !supervisor.stopped &&
      supervisor.autoReactWiring !== undefined &&
      !isSlugStoppedAnywhere(supervisor.slug)
    )
      yield supervisor;
}
//@ chunk-jh9jdn8w.js:1116-1260 placement
/**
 * 判断是否还有活跃的自动回复监听；重连时只算有定时器或在途订阅的监听。
 */
function hasActiveAutoReactWatch(e) {
  let { live } = getLiveState();
  for (let n of iterateAutoReactSupervisors())
    if (e?.reconnecting !== true || n.timer !== undefined || live.inFlightSubscribes.has(n.slug)) return true;
  return false;
}
//@ chunk-jh9jdn8w.js:1260-1338 placement
/**
 * 导出函数 `isAutoReactWatching`：返回 getLiveState().autoReact.enabledMemo === !0 && hasActiveAutoReactWatch({ reconnecting: !0 })。
 */
function isAutoReactWatching() {
  return (
    getLiveState().autoReact.enabledMemo === true &&
    hasActiveAutoReactWatch({
      reconnecting: true,
    })
  );
}
//@ chunk-jh9jdn8w.js:1338-1546 placement
/**
 * 停止并移除给定 slug 的监听器，清掉已收到版本与相关缓存，通知头部订阅源结束，并撤销仍在途的订阅启动。
 */
function stopArtifactSupervisors(e) {
  let live = getLiveState().live;
  for (let n of e) {
    let r = live.supervisors.get(n);
    if (r !== undefined) {
      stopSupervisor(r);
      live.supervisors.delete(n);
    }
    live.heardVersions.delete(n);
    disposePresenceSlug(n);
    getLiveState().liveDocWatch.headSinks.get(n)?.sourceEnded();
  }
  retireInFlightArms(e);
}
//@ chunk-jh9jdn8w.js:1546-1735 placement
function retireInFlightArms(e) {
  let live = getLiveState().live;
  for (let n of e)
    if (live.inFlightSubscribes.has(n) && !live.supervisors.has(n)) {
      live.retiredInFlightArms.add(n);
      live.bootingWiredArms.delete(n);
      live.inFlightWiredIntent.delete(n);
    }
}
//@ chunk-jh9jdn8w.js:1735-1747 placement
/**
 * 无人值守自动回复计数的上限 10000（按 artifact slug 记）。
 */
var MAX_UNATTENDED_REPLY_COUNT = 1e4;
//@ chunk-jh9jdn8w.js:1747-1800 placement
function unattendedReplies() {
  return getLiveState().autoReact.unattendedReplies;
}
//@ chunk-jh9jdn8w.js:1800-1865 placement
/**
 * 导出函数 `bumpUnattendedReply`：参数 e。
 */
function bumpUnattendedReply(slug) {
  let t = unattendedReplies();
  t.set(slug, Math.min((t.get(slug) ?? 0) + 1, MAX_UNATTENDED_REPLY_COUNT));
}
//@ chunk-jh9jdn8w.js:1865-1941 placement
/**
 * 导出函数 `addUnattendedReplies`：参数 e, t。
 */
function addUnattendedReplies(slug, unattendedReplies_2) {
  if (unattendedReplies_2 > 0) {
    let n = unattendedReplies();
    n.set(slug, Math.min((n.get(slug) ?? 0) + unattendedReplies_2, MAX_UNATTENDED_REPLY_COUNT));
  }
}
//@ chunk-jh9jdn8w.js:1941-2002 placement
/**
 * 导出函数 `takeUnattendedReplies`：参数 e，返回 (t.delete(e), n)。
 */
function takeUnattendedReplies(e) {
  let t = unattendedReplies();
  let n = t.get(e) ?? 0;
  t.delete(e);
  return n;
}
//@ chunk-jh9jdn8w.js:2002-2150 placement
/**
 * 取出并清空"无人值守时自动回复"的计数，返回总数与按 slug 的明细。
 */
function drainUnattendedReplies() {
  let autoReact = getLiveState().autoReact;
  let unattendedReplies = autoReact.unattendedReplies;
  autoReact.unattendedReplies = new Map();
  let total = 0;
  for (let r of unattendedReplies.values()) total += r;
  return {
    total,
    bySlug: unattendedReplies,
  };
}
//@ chunk-jh9jdn8w.js:2150-2280 placement
function formatAutoReplyNotice(e, { where, stop }) {
  return createInformationalSystemMessage(
    `Claude auto-replied to ${e} ${plural(e, "comment")}${where} while you were away.${stop}`,
    "notice",
  );
}
export {
  takeUnattendedReplies,
  formatAutoReplyNotice,
  addUnattendedReplies,
  canAutoReply,
  subscribeAutoReplyChanges,
  drainUnattendedReplies,
  getAutoReactSlugs,
  getBootingAutoReactSlugs,
  MAX_UNATTENDED_REPLY_COUNT,
  stopArtifactSupervisors,
  bumpUnattendedReply,
  hasActiveAutoReactWatch,
  isAutoReactWatching,
};
