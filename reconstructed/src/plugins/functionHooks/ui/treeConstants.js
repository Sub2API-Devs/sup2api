/**
 * plugins/functionHooks/ui/treeConstants.ts
 *
 * ui.render 树字段常量（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (10)
 * attribution: placement 10
 */
import { identity } from "../../../utils/identity.js";
import { createSurfaceRowLedger } from "../sites/index.js";

//@ chunk-4121qate.js:8957-8989 placement
/**
 * 界面行账本
 */
var surfaceRowLedger = identity(createSurfaceRowLedger(), (e) => e.clear());
//@ chunk-4121qate.js:8989-9000 placement
var DIALOG_FRAME_COLUMNS = 40;
//@ chunk-4121qate.js:9000-9011 placement
var DIALOG_FRAME_ROWS_MAX = 12;
//@ chunk-4121qate.js:9011-9022 placement
var OWN_FRAME_ROWS_MAX = 48;
//@ chunk-4121qate.js:9022-9069 placement
var OWN_FRAME_SURFACES = new Set(["desktop", "vscode", "mobile"]);
//@ chunk-4121qate.js:9069-9158 placement
function dialogFrameOf(surface) {
  let o = surface !== undefined && OWN_FRAME_SURFACES.has(surface);
  return {
    rowsMax: o ? OWN_FRAME_ROWS_MAX : DIALOG_FRAME_ROWS_MAX,
    isMarkdownDrawn: o,
  };
}
//@ chunk-4121qate.js:9158-9170 placement
var MAX_TREE_TEXT_CHARS = 1e5;
//@ chunk-4121qate.js:9170-9196 placement = ASK_USER_QUESTION_TOOL_NAME (1)
/**
 * AskUserQuestion 工具名常量。
 */
var ONE_ENGINE_NODE_COMPONENT = "AskUserQuestion";
//@ chunk-4121qate.js:9196-9430 placement
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
//@ chunk-4121qate.js:9430-9532 placement
/**
 * 生成 Client 元素的挂载键（请求、界面、插件与 key）。
 */
var clientMountKey = ({ requestId, surface }, r) => ({
  requestId,
  surface,
  plugin: r.client.plugin,
  key: r.props.key,
});
export {
  MAX_TREE_TEXT_CHARS,
  DIALOG_FRAME_COLUMNS,
  ONE_ENGINE_NODE_COMPONENT,
  dialogFrameOf,
  surfaceRowLedger,
  clientMountKey,
  parseAskUserQuestionRenderRequest,
  DIALOG_FRAME_ROWS_MAX,
  OWN_FRAME_ROWS_MAX,
  OWN_FRAME_SURFACES,
};
