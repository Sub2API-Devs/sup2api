/**
 * services/mcp/claudeDocsLinks.ts
 *
 * Claude Docs 文档连接器：由 artifact URL 解析 doc id、生成链接与描述，并判定工具调用是否属于文档读写（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kq89f1h5.js (11)
 * attribution: placement 11
 */
import { isDiskless } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { matchesToolName } from "../../Tool.js";
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import { BATCH, CREATE, UPDATE } from "./firstPartyServerIds.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";

//@ chunk-kq89f1h5.js:706-747 placement
var HTTPS_CLAUDE_AI_CODE_ARTIFACT = "https://claude.ai/code/artifact/";
//@ chunk-kq89f1h5.js:747-807 placement
/**
 * Claude Docs 连接器总开关（tengu_inked_lantern）。
 */
function isDisklessPlanDocsOn() {
  return isDiskless() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_inked_lantern", false) === true;
}
//@ chunk-kq89f1h5.js:807-954 placement
function planDocsServerNameOf(tools) {
  return isDisklessPlanDocsOn() && tools.some((tool) => matchesToolName(tool, EXITPLANMODE_2))
    ? tools.find((tool) => tool.mcpInfo?.docsConnector === true && tool.mcpInfo.toolName === BATCH)?.mcpInfo
        ?.serverName
    : undefined;
}
//@ chunk-kq89f1h5.js:954-1027 placement
/**
 * 在工具里找文档连接器 server 名；utils/attachments 与 ExitPlanModeV2Tool 使用。
 */
function planDocsServerNameFor(tools, permissionContext) {
  return permissionContext.planDoc !== undefined && planDocRef(permissionContext) === undefined
    ? undefined
    : planDocsServerNameOf(tools);
}
//@ chunk-kq89f1h5.js:1027-1113 placement
/**
 * 取 planDoc 的 id 与标题，供文档链接使用。
 */
function planDocRef({ planDoc }) {
  return isDisklessPlanDocsOn() && planDoc?.id !== undefined
    ? {
        id: planDoc.id,
        title: planDoc.title,
      }
    : undefined;
}
//@ chunk-kq89f1h5.js:1113-1151 placement
/**
 * 由 id 拼出 claude.ai 的 artifact 链接。
 */
function planDocUrl({ id }) {
  return `${HTTPS_CLAUDE_AI_CODE_ARTIFACT}${id}`;
}
//@ chunk-kq89f1h5.js:1151-1274 placement
/**
 * 从链接里解出 doc id，非本前缀或形状不符返回 undefined。
 */
function planDocIdFromPath(planFilePath) {
  let slug =
    typeof planFilePath === "string" && planFilePath.startsWith(HTTPS_CLAUDE_AI_CODE_ARTIFACT)
      ? planFilePath.slice(HTTPS_CLAUDE_AI_CODE_ARTIFACT.length)
      : undefined;
  return slug !== undefined && ARTIFACT_SLUG_RE.test(slug) ? slug : undefined;
}
//@ chunk-kq89f1h5.js:1274-1379 placement
/**
 * 生成文档的人类可读指代（带 id 或标题）。
 */
function describePlanDoc({ id, title }) {
  return title === undefined ? `the Claude Doc with the id ${id}` : `the Claude Doc "${title}"`;
}
//@ chunk-kq89f1h5.js:1379-1490 placement
function isValidDocName(name) {
  return (
    typeof name === "string" &&
    name.trim() !== "" &&
    name.length <= 200 &&
    !/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(name)
  );
}
//@ chunk-kq89f1h5.js:1490-2248 placement
/**
 * 判定一次工具调用是否是文档读写并校验其输入形状；permissions 使用。
 */
function needsDocsConnectorFixup(tool, args, context) {
  let { container, ref, batch = [] } = args;
  if (
    tool.mcpInfo?.docsConnector !== true ||
    context.agentId !== undefined ||
    !isDisklessPlanDocsOn() ||
    planDocsServerNameOf(context.options.tools) === undefined ||
    !isPlainObject(container) ||
    container.kind !== "project"
  )
    return false;
  let toolPermissionContext = getToolPermissionContext(context);
  if (toolPermissionContext.planDoc !== undefined) {
    let planDoc = planDocRef(toolPermissionContext);
    if (planDoc === undefined || !hasOnlyKeys(container, ["kind", "id"]) || container.id !== planDoc.id)
      return false;
    return tool.mcpInfo.toolName === CREATE
      ? hasOnlyKeys(args, ["container", "object", "payload", "verbose"]) && args.object === "utterance"
      : tool.mcpInfo.toolName === UPDATE &&
          hasOnlyKeys(args, ["container", "ref", "payload", "engine", "verbose"]) &&
          isPlainObject(ref) &&
          hasOnlyKeys(ref, ["object", "id"]) &&
          ref.object === "node";
  }
  let { create } = container;
  return (
    tool.mcpInfo.toolName === BATCH &&
    hasOnlyKeys(args, ["container", "batch", "verbose"]) &&
    Array.isArray(batch) &&
    batch.length === 0 &&
    hasOnlyKeys(container, ["kind", "create"]) &&
    isPlainObject(create) &&
    hasOnlyKeys(create, ["name", "doc"]) &&
    isValidDocName(create.name) &&
    (create.doc === undefined ||
      (isPlainObject(create.doc) && hasOnlyKeys(create.doc, ["markdown", "blocks"])))
  );
}
//@ chunk-kq89f1h5.js:2248-2312 placement
function hasOnlyKeys(object, allowedKeys) {
  return Object.keys(object).every((key) => allowedKeys.includes(key));
}
export {
  needsDocsConnectorFixup,
  describePlanDoc,
  planDocRef,
  planDocsServerNameFor,
  isDisklessPlanDocsOn,
  planDocUrl,
  planDocIdFromPath,
};
