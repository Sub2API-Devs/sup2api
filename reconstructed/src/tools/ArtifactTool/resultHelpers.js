/**
 * tools/ArtifactTool/resultHelpers.ts
 *
 * 2.1.316 新增：结果辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (12)
 * attribution: placement 12
 */
import { ACTION_HANDLER_BY_NAME, renderAssetUploadsResult } from "./actions/uploadAsset.js";
import { ARTIFACT_COMMENTS_ACTION_HANDLER_VALUE } from "./actions/comments.js";
import { LIVE_EDIT_RESULT_MAPPERS } from "./actions/liveEdit.js";
import { ARTIFACT_WATCH_ACTION_HANDLER_VALUE } from "./actions/watch.js";
import { ARTIFACT_ROOM_SEND_ACTION_HANDLER_2 } from "./actions/roomSend.js";
import { dbReadResultRenderer, stripDbReadDocData } from "./actions/database.js";
import { formatDbProfiles, formatDbProfilesAlt } from "../../services/artifacts/artifactPeople.js";
import { renderCopyFromResult } from "./actions/copyFrom.js";
import { mapPinResult } from "./actions/pin.js";
import { renderShareResult } from "./actions/share.js";
import { ARTIFACT_OPEN_RESULT_RENDERERS } from "./actions/open.js";
import { ARTIFACT_LIST_RESULT_RENDERERS } from "./actions/list.js";
import { quickstartToolResult, compactQuickstartResult } from "./actions/quickstart.js";
import {
  renderPreviewResultBlock,
  stripPreviewShotImages,
  renderEmulatorPreviewBlock,
  stripEmulatorPictureImages,
} from "./actions/preview.js";
import { ENDPOINT_RESULT_MAPPERS, stripHandlerResult, stripScriptResult } from "./actions/endpoints.js";
import { getLiveState, revokeCodeliveredFollowups } from "../../services/liveReplica/liveReplica.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { TYPE_FILE_UNREAD_REASONS } from "../../services/artifacts/publishSource.js";

//@ chunk-8wvtd8sr.js:311415-311503 placement
/**
 * 按 action 名取动作处理器。
 */
function actionHandlerFor(e) {
  let action = typeof e?.action === "string" ? e.action : undefined;
  return ACTION_HANDLER_BY_NAME.get(action) ?? null;
}
//@ chunk-8wvtd8sr.js:311503-312756 placement
/**
 * Artifact 结果映射表：Tb 为结果 JSON 可能的顶层键；vd 为键 → [结果渲染函数, 存储时的瘦身函数] 的映射，Eb 为其 Map。
 */
var ARTIFACT_RESULT_KEYS = [
  "read",
  "versioned",
  "threads",
  "replied",
  "thread_resolved",
  "liveEdit",
  "sync",
  "watch",
  "unwatch",
  "room_send",
  "resume_replies",
  "watches",
  "verify",
  "db_read",
  "db_profiles",
  "db_write",
  "asset_upload",
  "asset_uploads",
  "asset_list",
  "asset_read",
  "file_list",
  "file_read",
  "files_read",
  "artifact_delete",
  "asset_delete",
  "asset_copy",
  "pin",
  "shared",
  "opened",
  "created_from_type",
  "artifact_types",
  "artifact_type",
  "type_instances",
  "page_versions",
  "quickstart",
  "artifacts",
  "preview",
  "emulatorPreview",
  "handlers_doc",
  "handler_result",
  "script_result",
];
var RESULT_RENDERERS = [
  ["threads", ARTIFACT_COMMENTS_ACTION_HANDLER_VALUE.threads],
  ["replied", ARTIFACT_COMMENTS_ACTION_HANDLER_VALUE.replied],
  ["thread_resolved", ARTIFACT_COMMENTS_ACTION_HANDLER_VALUE.thread_resolved],
  ["liveEdit", LIVE_EDIT_RESULT_MAPPERS.liveEdit],
  ["watch", ARTIFACT_WATCH_ACTION_HANDLER_VALUE.watch],
  ["unwatch", ARTIFACT_WATCH_ACTION_HANDLER_VALUE.unwatch],
  ["room_send", ARTIFACT_ROOM_SEND_ACTION_HANDLER_2.room_send],
  ["resume_replies", ARTIFACT_WATCH_ACTION_HANDLER_VALUE.resume_replies],
  ["watches", ARTIFACT_WATCH_ACTION_HANDLER_VALUE.watches],
  ["db_read", dbReadResultRenderer.db_read, stripDbReadDocData],
  ["db_profiles", formatDbProfiles, formatDbProfilesAlt],
  ["db_write", dbReadResultRenderer.db_write],
  ["asset_uploads", renderAssetUploadsResult],
  ["asset_copy", renderCopyFromResult],
  ["pin", mapPinResult],
  ["shared", renderShareResult],
  ["opened", ARTIFACT_OPEN_RESULT_RENDERERS.opened],
  ["type_instances", ARTIFACT_LIST_RESULT_RENDERERS.type_instances],
  ["page_versions", ARTIFACT_LIST_RESULT_RENDERERS.page_versions],
  ["quickstart", quickstartToolResult, compactQuickstartResult],
  ["artifacts", ARTIFACT_LIST_RESULT_RENDERERS.artifacts],
  ["preview", renderPreviewResultBlock, stripPreviewShotImages],
  ["emulatorPreview", renderEmulatorPreviewBlock, stripEmulatorPictureImages],
  ["handlers_doc", ENDPOINT_RESULT_MAPPERS.handlers_doc],
  ["handler_result", ENDPOINT_RESULT_MAPPERS.handler_result, stripHandlerResult],
  ["script_result", ENDPOINT_RESULT_MAPPERS.script_result, stripScriptResult],
];
var RESULT_RENDERER_BY_KEY = new Map(RESULT_RENDERERS.map(([key, n]) => [key, n]));
//@ chunk-8wvtd8sr.js:312756-312803 placement
/**
 * 判断结果里是否有任一可渲染键。
 */
function hasRenderableResultKey(e) {
  return RESULT_RENDERERS.some(([n]) => n in e);
}
//@ chunk-8wvtd8sr.js:312803-312868 placement
/**
 * 按结果里的第一个已知键取渲染器。
 */
function resultRendererFor(e) {
  let n = firstResultKey(e);
  return n === null ? null : (RESULT_RENDERER_BY_KEY.get(n) ?? null);
}
//@ chunk-8wvtd8sr.js:312868-312931 placement
/**
 * 取结果里第一个出现的已知结果键。
 */
function firstResultKey(e) {
  for (let n of ARTIFACT_RESULT_KEYS) if (n in e) return n;
  return null;
}
//@ chunk-8wvtd8sr.js:312931-313045 placement
/**
 * 根据结果中出现的键，取出保存到记录前需要执行的瘦身函数。
 */
function resultStorageStrippers(e) {
  if (e === null || typeof e !== "object") return [];
  return RESULT_RENDERERS.flatMap(([n, , s]) => (s !== undefined && n in e ? [s] : []));
}
//@ chunk-8wvtd8sr.js:313045-313179 placement
/**
 * 登记协调器编辑者：撤销其他 agent 已送达的后续提示，记录编辑者并启动编辑完成监视。
 */
function registerCoordinatorEditor(slug, n) {
  let liveState = getLiveState();
  revokeCodeliveredFollowups(slug, "page_rehomed", {
    exceptAgentId: n.agentId,
  });
  liveState.coordinatorEditors.set(slug, n);
  liveState.editorSettleWatch ??= watchEditorSettle(liveState);
}
//@ chunk-8wvtd8sr.js:313179-313250 placement
/**
 * 撤销已送达的后续提示并移除该协调器编辑者。
 */
function unregisterCoordinatorEditor(slug) {
  revokeCodeliveredFollowups(slug, "page_rehomed");
  getLiveState().coordinatorEditors.delete(slug);
}
//@ chunk-8wvtd8sr.js:313250-313449 placement
function watchEditorSettle(liveState) {
  return getTaskRunState().agentSettled.subscribe((n, s) => {
    if (s === "completed") return;
    try {
      for (let [r, h] of liveState.coordinatorEditors)
        if (h.agentId === n) liveState.coordinatorEditors.delete(r);
    } catch (error) {
      if (!isAbortError(error)) logError(error);
    }
  });
}
//@ chunk-8wvtd8sr.js:314231-314335 placement
/**
 * 单次读取类型文件的数量上限、结果字符预算，以及视为类型目录不可用的错误原因。
 */
var MAX_TYPE_FILES_PER_READ = 24;
var TYPE_FILES_RESULT_BUDGET = 120000;
var CATALOG_DOWN_REASONS = new Set([
  "request_error",
  "rate_limited",
  "unavailable",
  "http_5xx",
  "relay_error",
]);
//@ chunk-8wvtd8sr.js:314335-314389 placement
/**
 * 把类型文件的未知不可读原因归为 unavailable。
 */
function typeFileUnreadReason(unread) {
  return TYPE_FILE_UNREAD_REASONS.includes(unread) ? unread : "unavailable";
}
//@ chunk-8wvtd8sr.js:314389-314931 placement
/**
 * 把 Artifact 类型信息转换成结果对象：标题、type_url、描述、层级、文件列表、说明文件（已读取时附正文与字数、不可用时附原因）、能力与可创建性。
 */
function artifactTypeResult(typeInfo, instructions) {
  return {
    title: typeInfo.title,
    type_url: typeInfo.typeUrl,
    ...(typeInfo.description !== undefined && {
      description: typeInfo.description,
    }),
    ...(typeInfo.tier !== undefined && {
      tier: typeInfo.tier,
    }),
    ...(typeInfo.release !== undefined && {
      release: typeInfo.release,
    }),
    files: typeInfo.files,
    ...(typeInfo.filesOmitted > 0 && {
      files_omitted: typeInfo.filesOmitted,
    }),
    instructions_file: typeInfo.shipsInstructions,
    ...(instructions?.kind === "read" && {
      instructions: instructions.text,
      instructions_chars: instructions.chars,
      ...(instructions.clipped && {
        instructions_clipped: true,
      }),
    }),
    ...(instructions?.kind === "unavailable" && {
      instructions_unavailable: instructions.why,
    }),
    capabilities: typeInfo.capabilities,
    ...(typeInfo.creatable !== undefined && {
      creatable: typeInfo.creatable,
    }),
  };
}
export {
  artifactTypeResult,
  CATALOG_DOWN_REASONS,
  TYPE_FILES_RESULT_BUDGET,
  MAX_TYPE_FILES_PER_READ,
  actionHandlerFor,
  resultStorageStrippers,
  resultRendererFor,
  hasRenderableResultKey,
  registerCoordinatorEditor,
  unregisterCoordinatorEditor,
  typeFileUnreadReason,
  firstResultKey,
};
