/**
 * tools/ArtifactTool/actionInput.ts
 *
 * 2.1.316 新增：动作输入解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (14)
 * attribution: placement 14
 */
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { parseArtifactUrlInput, ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS } from "./constants.js";
import { artifactVersionObserved } from "../../services/artifacts/readObservation.js";
import { compareNumericPrefix, w4e } from "../../utils/textNormalize.js";
import { oBs } from "../../services/artifacts/publishConflicts.js";
import { handoverCoverage, readPendingFor } from "../../services/artifacts/handoverRead.js";
import { getUntoldLiveVersion, markLiveVersionTold } from "../../services/artifacts/liveSubscribe.js";

/**
 * 需要跟踪 Artifact 版本的动作集合（读、列文件、评论、数据库、端点、pin 等），以及读到更新版本时提示合并本地修改的说明。
 */
//@ chunk-8wvtd8sr.js:18594-19028 placement
var VERSION_TRACKED_ACTIONS = new Set([
    "read",
    "list_files",
    "read_file",
    "list_assets",
    "read_asset",
    "upload_asset",
    "delete_asset",
    "copy_from",
    "comments",
    "reply",
    "resolve",
    "watch",
    "resume_replies",
    "verify",
    "open",
    "read_db",
    "write_db",
    "get_endpoints",
    "call_endpoint",
    "run_script",
    "room_send",
    "pin",
    "unpin",
  ]),
  NEWER_VERSION_READ_NOTE =
    "[This read is of a newer version than the one you had. If you have local edits made from the older version, merge them onto it before you publish.]";
//@ chunk-8wvtd8sr.js:19028-19222 placement
function newerVersionPublishedNote(e) {
  return `[Version ${e} of this artifact was published after the version you have. Before you publish to it, fetch the artifact's URL again and merge your edits onto that version.]`;
}
//@ chunk-8wvtd8sr.js:19222-19241 placement
var weakMap = new WeakMap();
//@ chunk-8wvtd8sr.js:19241-19307 placement
function ca(e, n) {
  try {
    return n();
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return e;
  }
}
/**
 * 调用前记录：对需要跟踪版本的动作，若本会话已观察过该 slug 的某个版本，返回 {slug, heldVer, isRead}（之后用于提示是否有更新版本）。
 */
//@ chunk-8wvtd8sr.js:19307-19743 placement
function heldVersionForCall(e, n, s) {
  return ca(void 0, () => {
    if (e === null || typeof e !== "object") return;
    let r = Reflect.get(e, "action");
    if (typeof r !== "string" || !VERSION_TRACKED_ACTIONS.has(r)) return;
    let h = parseArtifactUrlInput(Reflect.get(e, "url"))?.slug;
    if (h === void 0) return;
    let { ver: ver, observers: observers } = n.getArtifactReadObservation(h),
      { observed: observed } = artifactVersionObserved(
        observers === void 0 ? void 0 : { [h]: { ...observers } },
        h,
        n.agentId,
        s,
      ),
      A = r === "read" && Reflect.get(e, "version") === void 0;
    return ver === void 0 || !observed ? void 0 : { slug: h, heldVer: ver, isRead: A };
  });
}
/**
 * 给 Artifact 工具结果挂上版本跟踪信息（读取时须是新版本才挂），供之后提示"读到了更新版本"。
 */
//@ chunk-8wvtd8sr.js:19743-20009 placement
function attachVersionWatch(e, n, s) {
  return ca(!1, () => {
    if (n === void 0 || e === null || typeof e !== "object") return !1;
    let r = n.isRead ? deliveredReadVersion(e, n.slug, s) : void 0;
    if (
      n.isRead &&
      (!isSuccessfulRead(e) || (r !== void 0 && !((compareNumericPrefix(r, n.heldVer) ?? 0) > 0)))
    )
      return !1;
    return (weakMap.set(e, { ...n, agentId: s.agentId, delivered: r, shown: !1 }), !0);
  });
}
//@ chunk-8wvtd8sr.js:20009-20118 placement
function isSuccessfulRead(e) {
  let n = Reflect.get(e, "read");
  return n !== null && typeof n === "object" && Reflect.get(n, "code") === 200;
}
//@ chunk-8wvtd8sr.js:20118-20309 placement
function deliveredReadVersion(e, n, s) {
  let r = Reflect.get(e, "artifactRead");
  if (r !== null && typeof r === "object") {
    let h = Reflect.get(r, "ver"),
      y = typeof h === "string" ? h : oBs(r);
    if (y !== void 0) return y;
  }
  return handoverCoverage(s, n)?.ver;
}
//@ chunk-8wvtd8sr.js:20309-20427 placement
function resolveLiveVersion({ slug: slug, heldVer: heldVer, agentId: agentId, isRead: isRead }) {
  let h = getUntoldLiveVersion(slug, heldVer, agentId)?.liveVer;
  return h === void 0 || (!isRead && readPendingFor(agentId, slug, h)) ? null : h;
}
//@ chunk-8wvtd8sr.js:20427-20564 placement
function contentTextLength(e) {
  if (e === void 0 || typeof e === "string") return e?.length ?? 0;
  let n = 0;
  for (let s of e) n += s.type === "text" ? s.text.length : 0;
  return n;
}
/**
 * 结果映射时：若该结果登记了版本跟踪且线上版本更新，在结果前加"有更新版本，发布前先合并"的提示（结果过长时不加）。
 */
//@ chunk-8wvtd8sr.js:20564-21002 placement
function prependNewerVersionNote(e, n) {
  return ca(n, () => {
    let s = e !== null && typeof e === "object" ? weakMap.get(e) : void 0;
    if (s === void 0) return n;
    if (s.liveVer === void 0) s.liveVer = resolveLiveVersion(s);
    s.shown = !1;
    let { liveVer: liveVer } = s,
      h =
        liveVer === null
          ? null
          : s.isRead
            ? NEWER_VERSION_READ_NOTE
            : w4e.test(liveVer)
              ? newerVersionPublishedNote(liveVer)
              : null,
      { content: content } = n;
    if (h === null || contentTextLength(content) + h.length + 2 > ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS)
      return n;
    let p =
      content === void 0 || content === ""
        ? { ...n, content: h }
        : typeof content === "string"
          ? {
              ...n,
              content: `${h}

${content}`,
            }
          : { ...n, content: [{ type: "text", text: h }, ...content] };
    return ((s.shown = !0), p);
  });
}
/**
 * 结果中的更新版本提示已显示时，记录该 Artifact 的线上版本为已送达。
 */
//@ chunk-8wvtd8sr.js:21002-21234 placement
function markNewerVersionShown(e) {
  ca(void 0, () => {
    let n = e !== null && typeof e === "object" ? weakMap.get(e) : void 0;
    if (n?.shown !== !0 || typeof n.liveVer !== "string") return;
    let { slug: slug, liveVer: liveVer, delivered: delivered, agentId: agentId } = n;
    if (delivered === void 0 || delivered === liveVer || (compareNumericPrefix(delivered, liveVer) ?? 0) > 0)
      markLiveVersionTold(slug, liveVer, agentId);
  });
}
/**
 * 把版本跟踪信息从旧结果对象转移到新结果对象上。
 */
//@ chunk-8wvtd8sr.js:21234-21367 placement
function carryVersionWatch(e, n) {
  if (e !== null && typeof e === "object" && n !== null && typeof n === "object") {
    let s = weakMap.get(e);
    if (s !== void 0) weakMap.set(n, s);
  }
  return n;
}
/**
 * Artifact 工具全部动作名列表（publish、list、read、quickstart、comments、read_db、run_script、share 等）及其集合。
 */
//@ chunk-8wvtd8sr.js:21367-21788 placement
var ARTIFACT_ACTION_NAMES = [
    "publish",
    "list",
    "read",
    "list_types",
    "describe_type",
    "quickstart",
    "live-edit",
    "sync",
    "version",
    "comments",
    "reply",
    "resolve",
    "watch",
    "unwatch",
    "status",
    "resume_replies",
    "verify",
    "read_db",
    "write_db",
    "room_send",
    "upload_asset",
    "list_assets",
    "read_asset",
    "delete_asset",
    "copy_from",
    "list_files",
    "read_file",
    "delete",
    "preview",
    "open",
    "get_endpoints",
    "call_endpoint",
    "run_script",
    "pin",
    "unpin",
    "share",
  ],
  ARTIFACT_ACTION_NAME_SET = new Set(ARTIFACT_ACTION_NAMES);

export {
  ARTIFACT_ACTION_NAME_SET,
  carryVersionWatch,
  heldVersionForCall,
  attachVersionWatch,
  markNewerVersionShown,
  prependNewerVersionNote,
};
