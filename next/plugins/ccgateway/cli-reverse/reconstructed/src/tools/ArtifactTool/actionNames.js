/**
 * tools/ArtifactTool/actionNames.ts
 *
 * Artifact 工具动作名（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-edpmz0zs.js (16)
 * attribution: placement 15, layout 1
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

//@ chunk-edpmz0zs.js:386-565 placement
/**
 * Artifact 的发布类动作名列表。
 */
var PUBLISH_FILES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var COPY_FILE;
var CREATE_FROM_TYPE;
var ARTIFACT_ACTIONS;
var ACTION_WITH_RESERVED_MINT;
deferInit("chunk-edpmz0zs.js:386", () => {
  PUBLISH_FILES = "publish_files";
  COPY_FILE = "copy_file";
  CREATE_FROM_TYPE = "create_from_type";
  ARTIFACT_ACTIONS = new Set(["publish_version", "edit_version", PUBLISH_FILES, COPY_FILE, CREATE_FROM_TYPE]);
  ACTION_WITH_RESERVED_MINT = new Set(["publish_version", PUBLISH_FILES, "authorize_upload"]);
});
//@ chunk-edpmz0zs.js:565-664 placement
/**
 * 判断 MCP Artifact 动作是否为创建（create_from_type，或未带 slug 的发布类动作）。
 */
function isCreateAction(actionName, input) {
  return (
    actionName === CREATE_FROM_TYPE ||
    (ACTION_WITH_RESERVED_MINT.has(actionName) &&
      !(isPlainObject(input) && input.slug !== undefined && input.slug !== null && input.slug !== ""))
  );
}
//@ chunk-edpmz0zs.js:664-690 placement
var DELETE_ARTIFACT = "delete_artifact";
//@ chunk-edpmz0zs.js:690-881 placement
function parseResultJson(result) {
  let textBlock = Array.isArray(result)
    ? result.find((part) => isPlainObject(part) && part.type === "text")
    : undefined;
  let text = typeof result === "string" ? result : isPlainObject(textBlock) ? textBlock.text : undefined;
  if (typeof text !== "string") return null;
  let parsed = safeParseJSON(text, false);
  return isPlainObject(parsed) ? parsed : null;
}
//@ chunk-edpmz0zs.js:881-1236 placement
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
//@ chunk-edpmz0zs.js:1236-1605 placement
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
//@ chunk-edpmz0zs.js:1605-2178 placement
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
//@ chunk-edpmz0zs.js:2178-2309 placement
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
//@ chunk-edpmz0zs.js:2309-2378 layout
function isKeptInFiles(name) {
  let content = parseResultJson(name)?.content;
  return isPlainObject(content) && content.kept_in === "files";
}
//@ chunk-edpmz0zs.js:2378-2492 placement
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
//@ chunk-edpmz0zs.js:2492-2631 placement
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
//@ chunk-edpmz0zs.js:2631-2645 placement
/**
 * 惰性写入器注册插槽。
 */
var lazyWritersSlot; // deferred: uses LazyWritersSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-edpmz0zs.js:2631", () => {
  lazyWritersSlot = new LazyWritersSlot();
});
//@ chunk-edpmz0zs.js:2645-2677 placement
/**
 * 注册惰性写入器。
 */
function registerLazyWriter(writer) {
  lazyWritersSlot.register(writer);
}
//@ chunk-edpmz0zs.js:2677-2718 placement
/**
 * 保存单个写入器钩子的槽类。
 */
class WriterArmSlot {
  arm = null;
  register(arm) {
    this.arm = arm;
  }
}
//@ chunk-edpmz0zs.js:2718-2732 placement
/**
 * 写入器钩子槽实例。
 */
var writersArmSlot; // deferred: uses WriterArmSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-edpmz0zs.js:2718", () => {
  writersArmSlot = new WriterArmSlot();
});
//@ chunk-edpmz0zs.js:2732-2764 placement
/**
 * 注册写入器钩子。
 */
function registerWritersArm(armCommentWakeAfterMcpPublish) {
  writersArmSlot.register(armCommentWakeAfterMcpPublish);
}
export {
  lazyWritersSlot,
  registerWritersArm,
  isCreateAction,
  ACTION_WITH_RESERVED_MINT,
  shareFieldsFromResult,
  publishedArtifactFromResult,
  commentsFromResult,
  ARTIFACT_ACTIONS,
  DELETE_ARTIFACT,
  deletedSlugFromResult,
  CREATE_FROM_TYPE,
  isKeptInFiles,
  PUBLISH_FILES,
  writersArmSlot,
  COPY_FILE,
  registerLazyWriter,
};
