/**
 * plugins/functionHooks/ui/treeConstants.ts
 *
 * ui.render 树字段常量（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (10)
 * attribution: placement 10
 */
import { identity } from "../../../utils/identity.js";
import { createSurfaceRowLedger } from "../sites/index.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:9066-9098 placement
/**
 * 界面行账本
 */
var surfaceRowLedger; // deferred: uses createSurfaceRowLedger (../sites/index.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:9066", () => {
  surfaceRowLedger = identity(createSurfaceRowLedger(), (ledger) => ledger.clear());
});
//@ chunk-j8f885h1.js:9098-9109 placement
var DIALOG_FRAME_COLUMNS = 40;
//@ chunk-j8f885h1.js:9109-9120 placement
var DIALOG_FRAME_ROWS_MAX = 12;
//@ chunk-j8f885h1.js:9120-9131 placement
var OWN_FRAME_ROWS_MAX = 48;
//@ chunk-j8f885h1.js:9131-9178 placement
var OWN_FRAME_SURFACES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-j8f885h1.js:9131", () => {
  OWN_FRAME_SURFACES = new Set(["desktop", "vscode", "mobile"]);
});
//@ chunk-j8f885h1.js:9178-9267 placement
function dialogFrameOf(surface) {
  let isOwnFrame = surface !== undefined && OWN_FRAME_SURFACES.has(surface);
  return {
    rowsMax: isOwnFrame ? OWN_FRAME_ROWS_MAX : DIALOG_FRAME_ROWS_MAX,
    isMarkdownDrawn: isOwnFrame,
  };
}
//@ chunk-j8f885h1.js:9267-9279 placement
var MAX_TREE_TEXT_CHARS = 1e5;
//@ chunk-j8f885h1.js:9279-9305 placement (2.1.88 match: ASK_USER_QUESTION_TOOL_NAME, 1)
/**
 * AskUserQuestion 工具名常量。
 */
var ONE_ENGINE_NODE_COMPONENT = "AskUserQuestion";
//@ chunk-j8f885h1.js:9305-9539 placement
/**
 * 识别要求渲染 AskUserQuestion 组件的 ui.render 事件，返回 requestId 与 surface。
 */
function parseAskUserQuestionRenderRequest(event, payload) {
  let component = "component" in payload ? payload.component : undefined;
  let requestId = "requestId" in payload ? payload.requestId : undefined;
  let surface = "surface" in payload ? payload.surface : undefined;
  return event === "ui.render" &&
    component === ONE_ENGINE_NODE_COMPONENT &&
    typeof requestId === "string" &&
    typeof surface === "string"
    ? {
        requestId,
        surface,
      }
    : undefined;
}
//@ chunk-j8f885h1.js:9539-9641 placement
/**
 * 生成 Client 元素的挂载键（请求、界面、插件与 key）。
 */
var clientMountKey = ({ requestId, surface }, client) => ({
  requestId,
  surface,
  plugin: client.client.plugin,
  key: client.props.key,
});
export {
  ONE_ENGINE_NODE_COMPONENT,
  surfaceRowLedger,
  parseAskUserQuestionRenderRequest,
  DIALOG_FRAME_COLUMNS,
  DIALOG_FRAME_ROWS_MAX,
  MAX_TREE_TEXT_CHARS,
  OWN_FRAME_ROWS_MAX,
  OWN_FRAME_SURFACES,
  dialogFrameOf,
  clientMountKey,
};
