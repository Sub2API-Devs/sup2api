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
import { ma } from "./actions/comments.js";
import { LIVE_EDIT_RESULT_MAPPERS } from "./actions/liveEdit.js";
import { Do } from "./actions/watch.js";
import { Rh } from "./actions/roomSend.js";
import { _ko, stripDbReadDocData } from "./actions/database.js";
import { formatDbProfiles, jHs } from "../../services/artifacts/artifactPeople.js";
import { renderCopyFromResult } from "./actions/copyFrom.js";
import { mapPinResult } from "./actions/pin.js";
import { renderShareResult } from "./actions/share.js";
import { ef } from "./actions/open.js";
import { Ta } from "./actions/list.js";
import { kf, compactQuickstartResult } from "./actions/quickstart.js";
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
function Mr(e) {
  let n = typeof e?.action === "string" ? e.action : void 0;
  return ACTION_HANDLER_BY_NAME.get(n) ?? null;
}
/**
 * Artifact 结果映射表：Tb 为结果 JSON 可能的顶层键；vd 为键 → [结果渲染函数, 存储时的瘦身函数] 的映射，Eb 为其 Map。
 */
//@ chunk-8wvtd8sr.js:311503-312756 placement
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
  ],
  RESULT_RENDERERS = [
    ["threads", ma.threads],
    ["replied", ma.replied],
    ["thread_resolved", ma.thread_resolved],
    ["liveEdit", LIVE_EDIT_RESULT_MAPPERS.liveEdit],
    ["watch", Do.watch],
    ["unwatch", Do.unwatch],
    ["room_send", Rh.room_send],
    ["resume_replies", Do.resume_replies],
    ["watches", Do.watches],
    ["db_read", _ko.db_read, stripDbReadDocData],
    ["db_profiles", formatDbProfiles, jHs],
    ["db_write", _ko.db_write],
    ["asset_uploads", renderAssetUploadsResult],
    ["asset_copy", renderCopyFromResult],
    ["pin", mapPinResult],
    ["shared", renderShareResult],
    ["opened", ef.opened],
    ["type_instances", Ta.type_instances],
    ["page_versions", Ta.page_versions],
    ["quickstart", kf, compactQuickstartResult],
    ["artifacts", Ta.artifacts],
    ["preview", renderPreviewResultBlock, stripPreviewShotImages],
    ["emulatorPreview", renderEmulatorPreviewBlock, stripEmulatorPictureImages],
    ["handlers_doc", ENDPOINT_RESULT_MAPPERS.handlers_doc],
    ["handler_result", ENDPOINT_RESULT_MAPPERS.handler_result, stripHandlerResult],
    ["script_result", ENDPOINT_RESULT_MAPPERS.script_result, stripScriptResult],
  ],
  RESULT_RENDERER_BY_KEY = new Map(RESULT_RENDERERS.map(([key, n]) => [key, n]));
//@ chunk-8wvtd8sr.js:312756-312803 placement
function Kh(e) {
  return RESULT_RENDERERS.some(([n]) => n in e);
}
//@ chunk-8wvtd8sr.js:312803-312868 placement
function Yh(e) {
  let n = $jn(e);
  return n === null ? null : (RESULT_RENDERER_BY_KEY.get(n) ?? null);
}
//@ chunk-8wvtd8sr.js:312868-312931 placement
function $jn(e) {
  for (let n of ARTIFACT_RESULT_KEYS) if (n in e) return n;
  return null;
}
/**
 * 根据结果中出现的键，取出保存到记录前需要执行的瘦身函数。
 */
//@ chunk-8wvtd8sr.js:312931-313045 placement
function resultStorageStrippers(e) {
  if (e === null || typeof e !== "object") return [];
  return RESULT_RENDERERS.flatMap(([n, , s]) => (s !== void 0 && n in e ? [s] : []));
}
/**
 * 登记协调器编辑者：撤销其他 agent 已送达的后续提示，记录编辑者并启动编辑完成监视。
 */
//@ chunk-8wvtd8sr.js:313045-313179 placement
function registerCoordinatorEditor(e, n) {
  let s = getLiveState();
  (revokeCodeliveredFollowups(e, "page_rehomed", { exceptAgentId: n.agentId }),
    s.coordinatorEditors.set(e, n),
    (s.editorSettleWatch ??= watchEditorSettle(s)));
}
//@ chunk-8wvtd8sr.js:313179-313250 placement
function kd(e) {
  (revokeCodeliveredFollowups(e, "page_rehomed"), getLiveState().coordinatorEditors.delete(e));
}
//@ chunk-8wvtd8sr.js:313250-313449 placement
function watchEditorSettle(e) {
  return getTaskRunState().agentSettled.subscribe((n, s) => {
    if (s === "completed") return;
    try {
      for (let [r, h] of e.coordinatorEditors) if (h.agentId === n) e.coordinatorEditors.delete(r);
    } catch (error) {
      if (!isAbortError(error)) logError(error);
    }
  });
}
/**
 * 单次读取类型文件的数量上限、结果字符预算，以及视为类型目录不可用的错误原因。
 */
//@ chunk-8wvtd8sr.js:314231-314335 placement
var MAX_TYPE_FILES_PER_READ = 24,
  TYPE_FILES_RESULT_BUDGET = 120000,
  CATALOG_DOWN_REASONS = new Set(["request_error", "rate_limited", "unavailable", "http_5xx", "relay_error"]);
//@ chunk-8wvtd8sr.js:314335-314389 placement
function tp(e) {
  return TYPE_FILE_UNREAD_REASONS.includes(e) ? e : "unavailable";
}
/**
 * 把 Artifact 类型信息转换成结果对象：标题、type_url、描述、层级、文件列表、说明文件（已读取时附正文与字数、不可用时附原因）、能力与可创建性。
 */
//@ chunk-8wvtd8sr.js:314389-314931 placement
function artifactTypeResult(typeInfo, instructions) {
  return {
    title: typeInfo.title,
    type_url: typeInfo.typeUrl,
    ...(typeInfo.description !== void 0 && { description: typeInfo.description }),
    ...(typeInfo.tier !== void 0 && { tier: typeInfo.tier }),
    ...(typeInfo.release !== void 0 && { release: typeInfo.release }),
    files: typeInfo.files,
    ...(typeInfo.filesOmitted > 0 && { files_omitted: typeInfo.filesOmitted }),
    instructions_file: typeInfo.shipsInstructions,
    ...(instructions?.kind === "read" && {
      instructions: instructions.text,
      instructions_chars: instructions.chars,
      ...(instructions.clipped && { instructions_clipped: !0 }),
    }),
    ...(instructions?.kind === "unavailable" && { instructions_unavailable: instructions.why }),
    capabilities: typeInfo.capabilities,
    ...(typeInfo.creatable !== void 0 && { creatable: typeInfo.creatable }),
  };
}

export {
  artifactTypeResult,
  CATALOG_DOWN_REASONS,
  TYPE_FILES_RESULT_BUDGET,
  MAX_TYPE_FILES_PER_READ,
  Mr,
  resultStorageStrippers,
  Yh,
  Kh,
  registerCoordinatorEditor,
  kd,
  tp,
  $jn,
};
