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
function safeOrFallback(fallback, fn) {
  try {
    return fn();
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return fallback;
  }
}
//@ chunk-8wvtd8sr.js:19307-19743 placement
/**
 * 调用前记录：对需要跟踪版本的动作，若本会话已观察过该 slug 的某个版本，返回 {slug, heldVer, isRead}（之后用于提示是否有更新版本）。
 */
function heldVersionForCall(input, toolUseContext, batch) {
  return safeOrFallback(undefined, () => {
    if (input === null || typeof input !== "object") return;
    let actionName = Reflect.get(input, "action");
    if (typeof actionName !== "string" || !VERSION_TRACKED_ACTIONS.has(actionName)) return;
    let slug = parseArtifactUrlInput(Reflect.get(input, "url"))?.slug;
    if (slug === undefined) return;
    let { ver, observers } = toolUseContext.getArtifactReadObservation(slug);
    let { observed } = artifactVersionObserved(
      observers === undefined
        ? undefined
        : {
            [slug]: {
              ...observers,
            },
          },
      slug,
      toolUseContext.agentId,
      batch,
    );
    let isRead = actionName === "read" && Reflect.get(input, "version") === undefined;
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
function attachVersionWatch(result, watch, toolUseContext) {
  return safeOrFallback(false, () => {
    if (watch === undefined || result === null || typeof result !== "object") return false;
    let deliveredVersion = watch.isRead
      ? deliveredReadVersion(result, watch.slug, toolUseContext)
      : undefined;
    if (
      watch.isRead &&
      (!isSuccessfulRead(result) ||
        (deliveredVersion !== undefined &&
          !((compareNumericPrefix(deliveredVersion, watch.heldVer) ?? 0) > 0)))
    )
      return false;
    weakMap.set(result, {
      ...watch,
      agentId: toolUseContext.agentId,
      delivered: deliveredVersion,
      shown: false,
    });
    return true;
  });
}
//@ chunk-8wvtd8sr.js:20009-20118 placement
function isSuccessfulRead(result) {
  let read = Reflect.get(result, "read");
  return read !== null && typeof read === "object" && Reflect.get(read, "code") === 200;
}
//@ chunk-8wvtd8sr.js:20118-20309 placement
function deliveredReadVersion(result, slug, toolUseContext) {
  let artifactRead = Reflect.get(result, "artifactRead");
  if (artifactRead !== null && typeof artifactRead === "object") {
    let ver = Reflect.get(artifactRead, "ver");
    let version = typeof ver === "string" ? ver : getTypeInfo(artifactRead);
    if (version !== undefined) return version;
  }
  return handoverCoverage(toolUseContext, slug)?.ver;
}
//@ chunk-8wvtd8sr.js:20309-20427 placement
function resolveLiveVersion({ slug, heldVer, agentId, isRead }) {
  let liveVer = getUntoldLiveVersion(slug, heldVer, agentId)?.liveVer;
  return liveVer === undefined || (!isRead && readPendingFor(agentId, slug, liveVer)) ? null : liveVer;
}
//@ chunk-8wvtd8sr.js:20427-20564 placement
function contentTextLength(content) {
  if (content === undefined || typeof content === "string") return content?.length ?? 0;
  let total = 0;
  for (let block of content) total += block.type === "text" ? block.text.length : 0;
  return total;
}
//@ chunk-8wvtd8sr.js:20564-21002 placement
/**
 * 结果映射时：若该结果登记了版本跟踪且线上版本更新，在结果前加"有更新版本，发布前先合并"的提示（结果过长时不加）。
 */
function prependNewerVersionNote(result, fallback) {
  return safeOrFallback(fallback, () => {
    let watch = result !== null && typeof result === "object" ? weakMap.get(result) : undefined;
    if (watch === undefined) return fallback;
    if (watch.liveVer === undefined) watch.liveVer = resolveLiveVersion(watch);
    watch.shown = false;
    let { liveVer } = watch;
    let noteText =
      liveVer === null
        ? null
        : watch.isRead
          ? NEWER_VERSION_READ_NOTE
          : VERSIONED_NAME_RE.test(liveVer)
            ? newerVersionPublishedNote(liveVer)
            : null;
    let { content } = fallback;
    if (
      noteText === null ||
      contentTextLength(content) + noteText.length + 2 > ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS
    )
      return fallback;
    let withNote =
      content === undefined || content === ""
        ? {
            ...fallback,
            content: noteText,
          }
        : typeof content === "string"
          ? {
              ...fallback,
              content: `${noteText}

${content}`,
            }
          : {
              ...fallback,
              content: [
                {
                  type: "text",
                  text: noteText,
                },
                ...content,
              ],
            };
    watch.shown = true;
    return withNote;
  });
}
//@ chunk-8wvtd8sr.js:21002-21234 placement
/**
 * 结果中的更新版本提示已显示时，记录该 Artifact 的线上版本为已送达。
 */
function markNewerVersionShown(result) {
  safeOrFallback(undefined, () => {
    let watch = result !== null && typeof result === "object" ? weakMap.get(result) : undefined;
    if (watch?.shown !== true || typeof watch.liveVer !== "string") return;
    let { slug, liveVer, delivered, agentId } = watch;
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
function carryVersionWatch(source, target) {
  if (source !== null && typeof source === "object" && target !== null && typeof target === "object") {
    let watch = weakMap.get(source);
    if (watch !== undefined) weakMap.set(target, watch);
  }
  return target;
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
