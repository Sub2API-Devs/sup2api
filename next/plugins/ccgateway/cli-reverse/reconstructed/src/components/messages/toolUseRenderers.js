/**
 * components/messages/toolUseRenderers.ts
 *
 * 2.1.316 新增：工具调用渲染器。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wd422xa5.js (3)
 * attribution: placement 3
 */
import { AGENT } from "../../tools/AgentTool/constants.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wd422xa5.js:377-1591 placement
/**
 * 内置工具的 renderToolUseMessage 懒加载表：r/s/n 为构建时关闭的工具槽（null），e 为 Artifact 工具 UI；M 列出有渲染器的工具名，T 为工具名→渲染函数的 getter 表。
 */
var DISABLED_TOOL_UI_SLOT_A; // deferred: loads other modules while loading; runs once its import cycle is complete
var DISABLED_TOOL_UI_SLOT_B;
var DISABLED_TOOL_UI_SLOT_C;
var ARTIFACT_TOOL_UI;
var TOOL_NAMES_WITH_USE_RENDERERS;
var TOOL_USE_RENDERERS;
deferInit("chunk-wd422xa5.js:377", () => {
  DISABLED_TOOL_UI_SLOT_A = null;
  DISABLED_TOOL_UI_SLOT_B = null;
  DISABLED_TOOL_UI_SLOT_C = null;
  ARTIFACT_TOOL_UI = {
    name: require("../../tools/ArtifactTool/AMPERSAND_FORMS.lazy.js").ARTIFACT_TOOL_NAME,
    names: require("../../tools/ArtifactTool/AMPERSAND_FORMS.lazy.js"),
    ui: require("../../tools/ArtifactTool/renderCheckToolUseMessage.lazy.js"),
  };
  TOOL_NAMES_WITH_USE_RENDERERS = [
    AGENT,
    BASH_TOOL_NAME,
    EDIT,
    FILE_WRITE_TOOL_NAME,
    READ,
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
  TOOL_USE_RENDERERS = {
    get [AGENT]() {
      return require("../../tools/AgentTool/UI.js").renderToolUseMessage;
    },
    get [BASH_TOOL_NAME]() {
      return require("../../tools/BashTool/UI.js").renderToolUseMessage;
    },
    get [EDIT]() {
      return require("../../tools/FileEditTool/UI.js").renderToolUseMessage;
    },
    get [FILE_WRITE_TOOL_NAME]() {
      return require("../../tools/FileWriteTool/UI.js").renderToolUseMessage;
    },
    get [READ]() {
      return require("../../tools/FileReadTool/renderToolResultMessage.lazy.js").renderToolUseMessage;
    },
    get [NOTEBOOK_EDIT_TOOL_NAME]() {
      return require("../../tools/NotebookEditTool/renderToolResultMessage.lazy.js").renderToolUseMessage;
    },
    get [POWERSHELL_TOOL_NAME]() {
      return require("../../tools/PowerShellTool/isResultTruncated.lazy.js").renderToolUseMessage;
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
});
//@ chunk-wd422xa5.js:1591-1695 placement
/**
 * 渲染工具调用行：工具自带 renderToolUseMessage 则用之，否则按工具名查内置渲染表。
 */
function renderToolUseMessageFor(tool, input, theme) {
  if (tool.renderToolUseMessage) return tool.renderToolUseMessage(input, theme);
  return renderToolUseByName(tool.name, input, theme);
}
//@ chunk-wd422xa5.js:1695-1768 placement
/**
 * 函数 renderToolUseByName（按工具名找渲染器）。
 */
function renderToolUseByName(toolName, input, theme) {
  if (Object.hasOwn(TOOL_USE_RENDERERS, toolName)) return TOOL_USE_RENDERERS[toolName]?.(input, theme);
  return null;
}
export { renderToolUseByName, renderToolUseMessageFor };
