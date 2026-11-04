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
import { sanitizeDisplayTitle, VERSIONED_NAME_RE } from "../../utils/textNormalize.js";
import {
  ORIGINAL_ROLE_RE,
  hasAuthorAccount,
  classifyThreadAuthors,
} from "../../services/artifacts/comments/commentAuthorship.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0rj0mpq7.js:386-553 placement
/**
 * Artifact 的发布类动作名列表。
 */
var ARTIFACT_ACTIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PUBLISH_ACTION_NAMES;
deferInit("chunk-0rj0mpq7.js:386", () => {
  ARTIFACT_ACTIONS = new Set([
    "publish_version",
    "edit_version",
    "publish_files",
    "copy_file",
    "create_from_type",
  ]);
  PUBLISH_ACTION_NAMES = new Set(["publish_version", "publish_files", "authorize_upload"]);
});
//@ chunk-0rj0mpq7.js:553-667 placement
/**
 * 判断 MCP Artifact 动作是否为创建（create_from_type，或未带 slug 的发布类动作）。
 */
function isCreateAction(actionName, input) {
  return (
    actionName === "create_from_type" ||
    (PUBLISH_ACTION_NAMES.has(actionName) &&
      !(isPlainObject(input) && input.slug !== undefined && input.slug !== null && input.slug !== ""))
  );
}
//@ chunk-0rj0mpq7.js:667-693 placement
var DELETE_ARTIFACT = "delete_artifact";
//@ chunk-0rj0mpq7.js:693-884 placement
function parseResultJson(result) {
  let textBlock = Array.isArray(result)
    ? result.find((part) => isPlainObject(part) && part.type === "text")
    : undefined;
  let text = typeof result === "string" ? result : isPlainObject(textBlock) ? textBlock.text : undefined;
  if (typeof text !== "string") return null;
  let parsed = safeParseJSON(text, false);
  return isPlainObject(parsed) ? parsed : null;
}
//@ chunk-0rj0mpq7.js:884-1239 placement
/**
 * 从 MCP 工具结果中解析出已发布 Artifact：校验 url 可解析且 slug 一致，附带清洗后的标题与合法版本号；无法解析返回 null。
 */
function publishedArtifactFromResult(result) {
  let resultJson = parseResultJson(result);
  if (resultJson === null || typeof resultJson.url !== "string") return null;
  let artifactUrl = parseArtifactUrl(resultJson.url);
  if (artifactUrl === null || (resultJson.slug !== undefined && resultJson.slug !== artifactUrl.slug))
    return null;
  let title = typeof resultJson.title === "string" ? sanitizeDisplayTitle(resultJson.title) : null;
  let version =
    typeof resultJson.version === "string" && VERSIONED_NAME_RE.test(resultJson.version)
      ? resultJson.version
      : undefined;
  return {
    slug: artifactUrl.slug,
    env: artifactUrl.env,
    ...(title !== null &&
      title !== "" && {
        title,
      }),
    ...(version !== undefined && {
      version,
    }),
  };
}
//@ chunk-0rj0mpq7.js:1239-1608 placement
/**
 * 判定一条评论的作者归属：解析 author_role（非法为 degraded）、是否由 Artifact 发帖，再按线程作者分类；未知但由当前用户发出时算作 own。
 */
function commentAuthorship(comment, info, trustByUser) {
  let authorRole =
    comment.author_role === undefined || comment.author_role === null
      ? undefined
      : typeof comment.author_role === "string" && ORIGINAL_ROLE_RE.test(comment.author_role)
        ? comment.author_role
        : "degraded";
  let postedByArtifact = hasAuthorAccount(comment.source, authorRole);
  let authorship = classifyThreadAuthors(
    [
      {
        account: typeof comment.author_id === "string" ? comment.author_id : "unknown",
        ...(authorRole !== undefined && {
          role: authorRole,
        }),
        ...(postedByArtifact && {
          postedByArtifact: true,
        }),
      },
    ],
    info,
  );
  return authorship === "unknown" &&
    trustByUser &&
    comment.by_user === true &&
    !postedByArtifact &&
    authorRole !== "degraded"
    ? "own"
    : authorship;
}
//@ chunk-0rj0mpq7.js:1608-2181 placement
/**
 * 从 artifacts MCP 工具结果中解析评论列表（单线程或线程数组、comments 或 first_comment），附带每条的作者归属判定；形状不对返回 null。
 */
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
        ...(typeof comment.to_claude_at === "string" && {
          toClaudeAt: comment.to_claude_at,
        }),
        text: comment.text,
        authorship: commentAuthorship(comment, viewer, trustByUser),
      });
    }
  }
  return comments;
}
//@ chunk-0rj0mpq7.js:2181-2312 placement
/**
 * 从 MCP 结果中取 read 与 shared 字段（字符串才保留）。
 */
function shareFieldsFromResult(result) {
  let resultJson = parseResultJson(result);
  return {
    read: typeof resultJson?.read === "string" ? resultJson.read : undefined,
    shared: typeof resultJson?.shared === "string" ? resultJson.shared : undefined,
  };
}
//@ chunk-0rj0mpq7.js:2312-2426 placement
/**
 * 从删除结果中取被删除的 Artifact slug（deleted 为真且 slug 合法）。
 */
function deletedSlugFromResult(result) {
  let resultJson = parseResultJson(result);
  return resultJson !== null &&
    resultJson.deleted === true &&
    typeof resultJson.slug === "string" &&
    ARTIFACT_SLUG_RE.test(resultJson.slug)
    ? resultJson.slug
    : null;
}
//@ chunk-0rj0mpq7.js:2426-2565 placement
class LazyWritersSlot {
  writers = null;
  loadWriters = null;
  register(writers) {
    this.writers = writers;
  }
  loaded() {
    if (this.writers === null) this.loadWriters?.();
    return this.writers;
  }
}
//@ chunk-0rj0mpq7.js:2565-2579 placement
/**
 * 惰性写入器注册插槽。
 */
var lazyWritersSlot; // deferred: uses LazyWritersSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0rj0mpq7.js:2565", () => {
  lazyWritersSlot = new LazyWritersSlot();
});
//@ chunk-0rj0mpq7.js:2579-2611 placement
/**
 * 注册惰性写入器。
 */
function registerLazyWriter(writer) {
  lazyWritersSlot.register(writer);
}
//@ chunk-0rj0mpq7.js:2611-2652 placement
/**
 * 保存单个写入器钩子的槽类。
 */
class WriterArmSlot {
  arm = null;
  register(arm) {
    this.arm = arm;
  }
}
//@ chunk-0rj0mpq7.js:2652-2666 placement
/**
 * 写入器钩子槽实例。
 */
var writersArmSlot; // deferred: uses WriterArmSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0rj0mpq7.js:2652", () => {
  writersArmSlot = new WriterArmSlot();
});
//@ chunk-0rj0mpq7.js:2666-2698 placement
/**
 * 注册写入器钩子。
 */
function registerWritersArm(armCommentWakeAfterMcpPublish) {
  writersArmSlot.register(armCommentWakeAfterMcpPublish);
}
export {
  lazyWritersSlot,
  isCreateAction,
  PUBLISH_ACTION_NAMES,
  shareFieldsFromResult,
  publishedArtifactFromResult,
  commentsFromResult,
  registerWritersArm,
  ARTIFACT_ACTIONS,
  DELETE_ARTIFACT,
  deletedSlugFromResult,
  writersArmSlot,
  registerLazyWriter,
};
