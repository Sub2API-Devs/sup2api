/**
 * tools/ArtifactTool/actionNames.ts
 *
 * Artifact 工具动作名（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0rj0mpq7.js (15)
 * attribution: placement 15
 */
import { isPlainObject } from "../../utils/isPlainObject.js";
import { safeParseJSON } from "../../utils/json.js";
import { parseArtifactUrl, ARTIFACT_SLUG_RE } from "./constants.js";
import { sanitizeDisplayTitle, w4e } from "../../utils/textNormalize.js";
import {
  Gor,
  hasAuthorAccount,
  classifyThreadAuthors,
} from "../../services/artifacts/comments/commentAuthorship.js";

//@ chunk-0rj0mpq7.js:386-553 placement
var ARTIFACT_ACTIONS = new Set([
    "publish_version",
    "edit_version",
    "publish_files",
    "copy_file",
    "create_from_type",
  ]),
  F3o = new Set(["publish_version", "publish_files", "authorize_upload"]);
/**
 * 判断 MCP Artifact 动作是否为创建（create_from_type，或未带 slug 的发布类动作）。
 */
//@ chunk-0rj0mpq7.js:553-667 placement
function isCreateAction(t, e) {
  return (
    t === "create_from_type" ||
    (F3o.has(t) && !(isPlainObject(e) && e.slug !== void 0 && e.slug !== null && e.slug !== ""))
  );
}
//@ chunk-0rj0mpq7.js:667-693 placement
var DELETE_ARTIFACT = "delete_artifact";
//@ chunk-0rj0mpq7.js:693-884 placement
function parseResultJson(t) {
  let e = Array.isArray(t) ? t.find((o) => isPlainObject(o) && o.type === "text") : void 0,
    n = typeof t === "string" ? t : isPlainObject(e) ? e.text : void 0;
  if (typeof n !== "string") return null;
  let r = safeParseJSON(n, !1);
  return isPlainObject(r) ? r : null;
}
/**
 * 从 MCP 工具结果中解析出已发布 Artifact：校验 url 可解析且 slug 一致，附带清洗后的标题与合法版本号；无法解析返回 null。
 */
//@ chunk-0rj0mpq7.js:884-1239 placement
function publishedArtifactFromResult(t) {
  let e = parseResultJson(t);
  if (e === null || typeof e.url !== "string") return null;
  let n = parseArtifactUrl(e.url);
  if (n === null || (e.slug !== void 0 && e.slug !== n.slug)) return null;
  let r = typeof e.title === "string" ? sanitizeDisplayTitle(e.title) : null,
    o = typeof e.version === "string" && w4e.test(e.version) ? e.version : void 0;
  return {
    slug: n.slug,
    env: n.env,
    ...(r !== null && r !== "" && { title: r }),
    ...(o !== void 0 && { version: o }),
  };
}
/**
 * 判定一条评论的作者归属：解析 author_role（非法为 degraded）、是否由 Artifact 发帖，再按线程作者分类；未知但由当前用户发出时算作 own。
 */
//@ chunk-0rj0mpq7.js:1239-1608 placement
function commentAuthorship(t, e, n) {
  let r =
      t.author_role === void 0 || t.author_role === null
        ? void 0
        : typeof t.author_role === "string" && Gor.test(t.author_role)
          ? t.author_role
          : "degraded",
    o = hasAuthorAccount(t.source, r),
    u = classifyThreadAuthors(
      [
        {
          account: typeof t.author_id === "string" ? t.author_id : "unknown",
          ...(r !== void 0 && { role: r }),
          ...(o && { postedByArtifact: !0 }),
        },
      ],
      e,
    );
  return u === "unknown" && n && t.by_user === !0 && !o && r !== "degraded" ? "own" : u;
}
/**
 * 从 artifacts MCP 工具结果中解析评论列表（单线程或线程数组、comments 或 first_comment），附带每条的作者归属判定；形状不对返回 null。
 */
//@ chunk-0rj0mpq7.js:1608-2181 placement
function commentsFromResult(result, viewer, trustByUser) {
  let payload = parseResultJson(result);
  if (payload === null) return null;
  let threads = isPlainObject(payload.thread)
    ? [payload.thread]
    : payload.threads === null
      ? []
      : Array.isArray(payload.threads)
        ? payload.threads
        : null;
  if (threads === null) return null;
  let comments = [];
  for (let thread of threads) {
    if (!isPlainObject(thread) || typeof thread.id !== "string") return null;
    let threadComments = Array.isArray(thread.comments)
      ? thread.comments
      : isPlainObject(thread.first_comment)
        ? [thread.first_comment]
        : null;
    if (threadComments === null) return null;
    for (let comment of threadComments) {
      if (!isPlainObject(comment) || typeof comment.id !== "string" || typeof comment.text !== "string")
        return null;
      comments.push({
        threadId: thread.id,
        id: comment.id,
        ...(typeof comment.to_claude_at === "string" && { toClaudeAt: comment.to_claude_at }),
        text: comment.text,
        authorship: commentAuthorship(comment, viewer, trustByUser),
      });
    }
  }
  return comments;
}
/**
 * 从 MCP 结果中取 read 与 shared 字段（字符串才保留）。
 */
//@ chunk-0rj0mpq7.js:2181-2312 placement
function shareFieldsFromResult(t) {
  let e = parseResultJson(t);
  return {
    read: typeof e?.read === "string" ? e.read : void 0,
    shared: typeof e?.shared === "string" ? e.shared : void 0,
  };
}
/**
 * 从删除结果中取被删除的 Artifact slug（deleted 为真且 slug 合法）。
 */
//@ chunk-0rj0mpq7.js:2312-2426 placement
function deletedSlugFromResult(t) {
  let e = parseResultJson(t);
  return e !== null && e.deleted === !0 && typeof e.slug === "string" && ARTIFACT_SLUG_RE.test(e.slug)
    ? e.slug
    : null;
}
//@ chunk-0rj0mpq7.js:2426-2565 placement
class LazyWritersSlot {
  writers = null;
  loadWriters = null;
  register(t) {
    this.writers = t;
  }
  loaded() {
    if (this.writers === null) this.loadWriters?.();
    return this.writers;
  }
}
//@ chunk-0rj0mpq7.js:2565-2579 placement
var qSe = new LazyWritersSlot();
//@ chunk-0rj0mpq7.js:2579-2611 placement
function Uai(t) {
  qSe.register(t);
}
//@ chunk-0rj0mpq7.js:2611-2652 placement
class f {
  arm = null;
  register(t) {
    this.arm = t;
  }
}
//@ chunk-0rj0mpq7.js:2652-2666 placement
var U3o = new f();
//@ chunk-0rj0mpq7.js:2666-2698 placement
function Bai(t) {
  U3o.register(t);
}

export {
  qSe,
  isCreateAction,
  F3o,
  shareFieldsFromResult,
  publishedArtifactFromResult,
  commentsFromResult,
  Bai,
  ARTIFACT_ACTIONS,
  DELETE_ARTIFACT,
  deletedSlugFromResult,
  U3o,
  Uai,
};
