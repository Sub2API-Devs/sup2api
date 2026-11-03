/**
 * components/messages/toolUseRenderers.ts
 *
 * 2.1.316 新增：工具调用渲染器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6t1v7est.js (3)
 * attribution: placement 3
 */
import { AGENT } from "../../tools/AgentTool/constants.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";

//@ chunk-6t1v7est.js:344-1558 placement
/**
 * 内置工具的 renderToolUseMessage 懒加载表：r/s/n 为构建时关闭的工具槽（null），e 为 Artifact 工具 UI；M 列出有渲染器的工具名，T 为工具名→渲染函数的 getter 表。
 */
var DISABLED_TOOL_UI_SLOT_A = null;
var DISABLED_TOOL_UI_SLOT_B = null;
var DISABLED_TOOL_UI_SLOT_C = null;
var ARTIFACT_TOOL_UI = {
  name: require("./chunk-ecvm5qmk.js").ARTIFACT_TOOL_NAME,
  names: require("./chunk-ecvm5qmk.js"),
  ui: require("./chunk-wc0ezwp2.js"),
};
var TOOL_NAMES_WITH_USE_RENDERERS = [
  AGENT,
  BASH_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  FILE_READ_TOOL_NAME,
  NOTEBOOK_EDIT_TOOL_NAME,
  POWERSHELL_TOOL_NAME,
  ...(DISABLED_TOOL_UI_SLOT_A ? [DISABLED_TOOL_UI_SLOT_A.name] : []),
  ...(DISABLED_TOOL_UI_SLOT_B ? [DISABLED_TOOL_UI_SLOT_B.name] : []),
  ...(DISABLED_TOOL_UI_SLOT_C ? [DISABLED_TOOL_UI_SLOT_C.name] : []),
  ...(ARTIFACT_TOOL_UI
    ? [
        ARTIFACT_TOOL_UI.name,
        ARTIFACT_TOOL_UI.names.ARTIFACT_COMMENTS_TOOL_NAME,
        ARTIFACT_TOOL_UI.names.ARTIFACT_DATA_TOOL_NAME,
        ARTIFACT_TOOL_UI.names.ARTIFACT_CHECK_TOOL_NAME,
      ]
    : []),
];
var TOOL_USE_RENDERERS = {
  get [AGENT]() {
    return require("./chunk-7stysahr.js").renderToolUseMessage;
  },
  get [BASH_TOOL_NAME]() {
    return require("./chunk-ncbkecaq.js").renderToolUseMessage;
  },
  get [FILE_EDIT_TOOL_NAME]() {
    return require("./chunk-smaqkhx4.js").renderToolUseMessage;
  },
  get [FILE_WRITE_TOOL_NAME]() {
    return require("./chunk-5t7pjfd2.js").renderToolUseMessage;
  },
  get [FILE_READ_TOOL_NAME]() {
    return require("./chunk-nc07tp5s.js").renderToolUseMessage;
  },
  get [NOTEBOOK_EDIT_TOOL_NAME]() {
    return require("./chunk-q466qetm.js").renderToolUseMessage;
  },
  get [POWERSHELL_TOOL_NAME]() {
    return require("./chunk-hkh7sq9y.js").renderToolUseMessage;
  },
  ...(DISABLED_TOOL_UI_SLOT_A && {
    [DISABLED_TOOL_UI_SLOT_A.name]: DISABLED_TOOL_UI_SLOT_A.ui.renderToolUseMessage,
  }),
  ...(DISABLED_TOOL_UI_SLOT_B && {
    [DISABLED_TOOL_UI_SLOT_B.name]: DISABLED_TOOL_UI_SLOT_B.ui.renderToolUseMessage,
  }),
  ...(DISABLED_TOOL_UI_SLOT_C && {
    [DISABLED_TOOL_UI_SLOT_C.name]: DISABLED_TOOL_UI_SLOT_C.ui.renderToolUseMessage,
  }),
  ...(ARTIFACT_TOOL_UI && {
    [ARTIFACT_TOOL_UI.name]: ARTIFACT_TOOL_UI.ui.renderToolUseLine,
    [ARTIFACT_TOOL_UI.names.ARTIFACT_COMMENTS_TOOL_NAME]: ARTIFACT_TOOL_UI.ui.renderCommentsToolUseMessage,
    [ARTIFACT_TOOL_UI.names.ARTIFACT_DATA_TOOL_NAME]: ARTIFACT_TOOL_UI.ui.renderDataToolUseMessage,
    [ARTIFACT_TOOL_UI.names.ARTIFACT_CHECK_TOOL_NAME]: ARTIFACT_TOOL_UI.ui.renderCheckToolUseMessage,
  }),
};
//@ chunk-6t1v7est.js:1558-1662 placement
/**
 * 渲染工具调用行：工具自带 renderToolUseMessage 则用之，否则按工具名查内置渲染表。
 */
function renderToolUseMessageFor(tool, t, l) {
  if (tool.renderToolUseMessage) return tool.renderToolUseMessage(t, l);
  return renderToolUseByName(tool.name, t, l);
}
//@ chunk-6t1v7est.js:1662-1735 placement
/**
 * 函数 renderToolUseByName（按工具名找渲染器）。
 */
function renderToolUseByName(o, t, l) {
  if (Object.hasOwn(TOOL_USE_RENDERERS, o)) return TOOL_USE_RENDERERS[o]?.(t, l);
  return null;
}
export { renderToolUseByName, renderToolUseMessageFor };
