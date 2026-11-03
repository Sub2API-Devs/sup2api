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
import { compareNumericPrefix, VERSIONED_NAME_RE } from "../../utils/textNormalize.js";
import { getTypeInfo } from "../../services/artifacts/publishConflicts.js";
import { handoverCoverage, readPendingFor } from "../../services/artifacts/handoverRead.js";
import { getUntoldLiveVersion, markLiveVersionTold } from "../../services/artifacts/liveSubscribe.js";

//@ chunk-8wvtd8sr.js:18594-19028 placement
/**
 * 需要跟踪 Artifact 版本的动作集合（读、列文件、评论、数据库、端点、pin 等），以及读到更新版本时提示合并本地修改的说明。
 */
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
]);
var NEWER_VERSION_READ_NOTE =
  "[This read is of a newer version than the one you had. If you have local edits made from the older version, merge them onto it before you publish.]";
//@ chunk-8wvtd8sr.js:19028-19222 placement
function newerVersionPublishedNote(liveVer) {
  return `[Version ${liveVer} of this artifact was published after the version you have. Before you publish to it, fetch the artifact's URL again and merge your edits onto that version.]`;
}
//@ chunk-8wvtd8sr.js:19222-19241 placement
var weakMap = new WeakMap();
//@ chunk-8wvtd8sr.js:19241-19307 placement
/**
 * 执行函数，出错时返回兜底值（中止错误不记日志）。
 */
function safeOrFallback(e, n) {
  try {
    return n();
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return e;
  }
}
//@ chunk-8wvtd8sr.js:19307-19743 placement
/**
 * 调用前记录：对需要跟踪版本的动作，若本会话已观察过该 slug 的某个版本，返回 {slug, heldVer, isRead}（之后用于提示是否有更新版本）。
 */
function heldVersionForCall(e, n, id) {
  return safeOrFallback(undefined, () => {
    if (e === null || typeof e !== "object") return;
    let r = Reflect.get(e, "action");
    if (typeof r !== "string" || !VERSION_TRACKED_ACTIONS.has(r)) return;
    let slug = parseArtifactUrlInput(Reflect.get(e, "url"))?.slug;
    if (slug === undefined) return;
    let { ver, observers } = n.getArtifactReadObservation(slug);
    let { observed } = artifactVersionObserved(
      observers === undefined
        ? undefined
        : {
            [slug]: {
              ...observers,
            },
          },
      slug,
      n.agentId,
      id,
    );
    let isRead = r === "read" && Reflect.get(e, "version") === undefined;
    return ver === undefined || !observed
      ? undefined
      : {
          slug,
          heldVer: ver,
          isRead,
        };
  });
}
//@ chunk-8wvtd8sr.js:19743-20009 placement
/**
 * 给 Artifact 工具结果挂上版本跟踪信息（读取时须是新版本才挂），供之后提示"读到了更新版本"。
 */
function attachVersionWatch(e, n, s) {
  return safeOrFallback(false, () => {
    if (n === undefined || e === null || typeof e !== "object") return false;
    let r = n.isRead ? deliveredReadVersion(e, n.slug, s) : undefined;
    if (
      n.isRead &&
      (!isSuccessfulRead(e) || (r !== undefined && !((compareNumericPrefix(r, n.heldVer) ?? 0) > 0)))
    )
      return false;
    weakMap.set(e, {
      ...n,
      agentId: s.agentId,
      delivered: r,
      shown: false,
    });
    return true;
  });
}
//@ chunk-8wvtd8sr.js:20009-20118 placement
function isSuccessfulRead(e) {
  let n = Reflect.get(e, "read");
  return n !== null && typeof n === "object" && Reflect.get(n, "code") === 200;
}
//@ chunk-8wvtd8sr.js:20118-20309 placement
function deliveredReadVersion(e, slug, s) {
  let r = Reflect.get(e, "artifactRead");
  if (r !== null && typeof r === "object") {
    let h = Reflect.get(r, "ver");
    let y = typeof h === "string" ? h : getTypeInfo(r);
    if (y !== undefined) return y;
  }
  return handoverCoverage(s, slug)?.ver;
}
//@ chunk-8wvtd8sr.js:20309-20427 placement
function resolveLiveVersion({ slug, heldVer, agentId, isRead }) {
  let liveVer = getUntoldLiveVersion(slug, heldVer, agentId)?.liveVer;
  return liveVer === undefined || (!isRead && readPendingFor(agentId, slug, liveVer)) ? null : liveVer;
}
//@ chunk-8wvtd8sr.js:20427-20564 placement
function contentTextLength(content) {
  if (content === undefined || typeof content === "string") return content?.length ?? 0;
  let n = 0;
  for (let s of content) n += s.type === "text" ? s.text.length : 0;
  return n;
}
//@ chunk-8wvtd8sr.js:20564-21002 placement
/**
 * 结果映射时：若该结果登记了版本跟踪且线上版本更新，在结果前加"有更新版本，发布前先合并"的提示（结果过长时不加）。
 */
function prependNewerVersionNote(e, n) {
  return safeOrFallback(n, () => {
    let s = e !== null && typeof e === "object" ? weakMap.get(e) : undefined;
    if (s === undefined) return n;
    if (s.liveVer === undefined) s.liveVer = resolveLiveVersion(s);
    s.shown = false;
    let { liveVer } = s;
    let h =
      liveVer === null
        ? null
        : s.isRead
          ? NEWER_VERSION_READ_NOTE
          : VERSIONED_NAME_RE.test(liveVer)
            ? newerVersionPublishedNote(liveVer)
            : null;
    let { content } = n;
    if (h === null || contentTextLength(content) + h.length + 2 > ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS)
      return n;
    let p =
      content === undefined || content === ""
        ? {
            ...n,
            content: h,
          }
        : typeof content === "string"
          ? {
              ...n,
              content: `${h}

${content}`,
            }
          : {
              ...n,
              content: [
                {
                  type: "text",
                  text: h,
                },
                ...content,
              ],
            };
    s.shown = true;
    return p;
  });
}
//@ chunk-8wvtd8sr.js:21002-21234 placement
/**
 * 结果中的更新版本提示已显示时，记录该 Artifact 的线上版本为已送达。
 */
function markNewerVersionShown(e) {
  safeOrFallback(undefined, () => {
    let n = e !== null && typeof e === "object" ? weakMap.get(e) : undefined;
    if (n?.shown !== true || typeof n.liveVer !== "string") return;
    let { slug, liveVer, delivered, agentId } = n;
    if (
      delivered === undefined ||
      delivered === liveVer ||
      (compareNumericPrefix(delivered, liveVer) ?? 0) > 0
    )
      markLiveVersionTold(slug, liveVer, agentId);
  });
}
//@ chunk-8wvtd8sr.js:21234-21367 placement
/**
 * 把版本跟踪信息从旧结果对象转移到新结果对象上。
 */
function carryVersionWatch(e, n) {
  if (e !== null && typeof e === "object" && n !== null && typeof n === "object") {
    let s = weakMap.get(e);
    if (s !== undefined) weakMap.set(n, s);
  }
  return n;
}
//@ chunk-8wvtd8sr.js:21367-21788 placement
/**
 * Artifact 工具全部动作名列表（publish、list、read、quickstart、comments、read_db、run_script、share 等）及其集合。
 */
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
];
var ARTIFACT_ACTION_NAME_SET = new Set(ARTIFACT_ACTION_NAMES);
export {
  ARTIFACT_ACTION_NAME_SET,
  carryVersionWatch,
  heldVersionForCall,
  attachVersionWatch,
  markNewerVersionShown,
  prependNewerVersionNote,
};
