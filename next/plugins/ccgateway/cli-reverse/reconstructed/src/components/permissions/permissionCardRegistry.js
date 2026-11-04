/**
 * components/permissions/permissionCardRegistry.ts
 *
 * 2.1.316 新增：工具到权限卡片的映射。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s4bxxzsw.js (3)
 * attribution: placement 3
 */
import { WebFetchTool } from "../../tools/WebFetchTool/WebFetchTool.js";
import {
  WEBFETCH_PERMISSION_CARD,
  buildWebFetchPermissionPayload,
  BROWSER_PERMISSION_CARD,
  buildChromePermissionPayload,
  ASK_USER_QUESTION_PERMISSION_CARD,
  buildAskUserQuestionPayload,
  ENTER_PLAN_MODE_PERMISSION_CARD,
  buildPermissionPromptPayload,
  PUBLISH_PLUGIN_PERMISSION_CARD,
  buildPublishPluginPayload,
  EXIT_PLAN_MODE_V2_PERMISSION_CARD,
  buildExitPlanModePermissionPayload,
  SKILL_PERMISSION_CARD,
  buildSkillPermissionPayload,
  POWERSHELL_PERMISSION_CARD,
  buildPowerShellPermissionPayload,
  MONITOR_PERMISSION_CARD,
  buildMonitorPermissionPayload,
  buildArtifactPermissionPayload,
  buildWorkflowPermissionPayload,
} from "./permissionCardKinds.js";
import { CFC_TOOL_PREFIX } from "../../utils/claudeInChrome/common.js";
import { AskUserQuestionTool } from "../../tools/AskUserQuestionTool/AskUserQuestionTool.js";
import { EnterPlanModeTool } from "../../tools/EnterPlanModeTool/EnterPlanModeTool.js";
import { PublishPluginTool } from "../../tools/PublishPluginTool/PublishPluginTool.js";
import { ExitPlanModeV2Tool } from "../../tools/ExitPlanModeTool/ExitPlanModeV2Tool.js";
import { SkillTool } from "../../tools/SkillTool/SkillTool.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s4bxxzsw.js:44358-44817 placement
/**
 * 可选工具的占位（本构建被裁掉为 null）以及 Workflow/Monitor/ContinueInProjects 的懒加载引用、workflow 使用同意模块、已撤回请求的提示文字。
 */
var ARTIFACT_TOOL_REF; // deferred: loads other modules while loading; runs once its import cycle is complete
var ARTIFACT_PERMISSION_DIALOG;
var ACCOUNT_MEMORY_PERMISSION_MODULE;
var ContinueInProjectsTool;
var projectContinuePermissionDialog;
var OPTIONAL_TOOL_REF;
var OPTIONAL_TOOL_DIALOG;
var WORDS_SENT_ROUTE;
var WorkflowTool;
var workflowPermissionDialog;
var workflowUsageConsentModule;
var MonitorTool;
var WITHDRAWN_REQUEST_ANSWER_TEXT;
deferInit("chunk-s4bxxzsw.js:44358", () => {
  ARTIFACT_TOOL_REF = null;
  ARTIFACT_PERMISSION_DIALOG = null;
  ACCOUNT_MEMORY_PERMISSION_MODULE = null;
  ContinueInProjectsTool =
    require("../../tools/ContinueInProjectsTool/ContinueInProjectsTool.js").ContinueInProjectsTool;
  projectContinuePermissionDialog =
    require("../../tools/ContinueInProjectsTool/CONTINUE_NOTIFICATION.lazy.js").projectContinuePermissionDialog;
  OPTIONAL_TOOL_REF = null;
  OPTIONAL_TOOL_DIALOG = null;
  WORDS_SENT_ROUTE = null;
  WorkflowTool = require("../../tools/WorkflowTool/WorkflowTool.js").WorkflowTool;
  workflowPermissionDialog = require("../dialogs/workflowPermissionDialog.lazy.js").workflowPermissionDialog;
  workflowUsageConsentModule = require("../../services/workflow/recordWorkflowUsageConsent.lazy.js");
  MonitorTool = require("../../tools/MonitorTool/MonitorTool.js").MonitorTool;
  WITHDRAWN_REQUEST_ANSWER_TEXT =
    "The request this approval was for had already been withdrawn; the answer applied to nothing.";
});
//@ chunk-s4bxxzsw.js:44817-44841 placement
function identity(x) {
  return x;
}
//@ chunk-s4bxxzsw.js:44841-45959 placement
/**
 * 工具 → 权限卡片映射：每项 {matches 工具判定, dialog 卡片定义, build 载荷构造}，供远程/桥接审批使用。
 */
var PERMISSION_CARD_REGISTRY; // deferred: uses identity of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s4bxxzsw.js:44841", () => {
  PERMISSION_CARD_REGISTRY = [
    identity({
      matches: (tool) => tool === WebFetchTool,
      dialog: WEBFETCH_PERMISSION_CARD,
      build: buildWebFetchPermissionPayload,
    }),
    identity({
      matches: (state) => state.name.startsWith(CFC_TOOL_PREFIX),
      dialog: BROWSER_PERMISSION_CARD,
      build: buildChromePermissionPayload,
    }),
    identity({
      matches: (tool) => tool === AskUserQuestionTool,
      dialog: ASK_USER_QUESTION_PERMISSION_CARD,
      build: buildAskUserQuestionPayload,
    }),
    identity({
      matches: (tool) => tool === EnterPlanModeTool,
      dialog: ENTER_PLAN_MODE_PERMISSION_CARD,
      build: buildPermissionPromptPayload,
    }),
    identity({
      matches: (tool) => tool === PublishPluginTool,
      dialog: PUBLISH_PLUGIN_PERMISSION_CARD,
      build: buildPublishPluginPayload,
    }),
    identity({
      matches: (tool) => tool === ExitPlanModeV2Tool,
      dialog: EXIT_PLAN_MODE_V2_PERMISSION_CARD,
      build: buildExitPlanModePermissionPayload,
    }),
    identity({
      matches: (tool) => tool === SkillTool,
      dialog: SKILL_PERMISSION_CARD,
      build: buildSkillPermissionPayload,
    }),
    identity({
      matches: (state) => state.name === POWERSHELL_TOOL_NAME,
      dialog: POWERSHELL_PERMISSION_CARD,
      build: buildPowerShellPermissionPayload,
    }),
    identity({
      matches: (tool) => tool === MonitorTool,
      dialog: MONITOR_PERMISSION_CARD,
      build: buildMonitorPermissionPayload,
    }),
    ...(ARTIFACT_TOOL_REF !== null && ARTIFACT_PERMISSION_DIALOG !== null
      ? [
          identity({
            matches: (tool) => tool === ARTIFACT_TOOL_REF,
            dialog: ARTIFACT_PERMISSION_DIALOG,
            build: buildArtifactPermissionPayload,
          }),
        ]
      : []),
    identity({
      matches: (tool) => tool === WorkflowTool,
      dialog: workflowPermissionDialog,
      build: buildWorkflowPermissionPayload,
    }),
    ...(ContinueInProjectsTool !== null && projectContinuePermissionDialog !== null
      ? [
          identity({
            matches: (tool) => tool === ContinueInProjectsTool,
            dialog: projectContinuePermissionDialog,
            build: buildPermissionPromptPayload,
          }),
        ]
      : []),
    ...(OPTIONAL_TOOL_REF !== null && OPTIONAL_TOOL_DIALOG !== null
      ? [
          identity({
            matches: (tool) => tool === OPTIONAL_TOOL_REF,
            dialog: OPTIONAL_TOOL_DIALOG,
            build: buildPermissionPromptPayload,
          }),
        ]
      : []),
    ...(WORDS_SENT_ROUTE !== null
      ? [
          identity({
            matches: (tool) => tool === WORDS_SENT_ROUTE.tool,
            dialog: WORDS_SENT_ROUTE.dialog,
            build: WORDS_SENT_ROUTE.route.buildAskPayload,
            race: (tool) =>
              WORDS_SENT_ROUTE.startWordsSentRacer({
                ...tool,
                resultWhenSent: WORDS_SENT_ROUTE.route.resultWhenWordsAreSent,
              }),
            resultWhenNotShown: WORDS_SENT_ROUTE.route.resultWhenNotShown,
          }),
        ]
      : []),
    ...(ACCOUNT_MEMORY_PERMISSION_MODULE !== null
      ? [
          identity({
            matches: (tool) => ACCOUNT_MEMORY_PERMISSION_MODULE.isAccountMemoryWriteDialogTool(tool),
            dialog: ACCOUNT_MEMORY_PERMISSION_MODULE.accountMemoryWritePermissionDialog,
            build: ACCOUNT_MEMORY_PERMISSION_MODULE.buildAccountMemoryWritePermissionDescriptor,
          }),
        ]
      : []),
  ];
});
export {
  PERMISSION_CARD_REGISTRY,
  WorkflowTool,
  workflowUsageConsentModule,
  ACCOUNT_MEMORY_PERMISSION_MODULE,
  WITHDRAWN_REQUEST_ANSWER_TEXT,
};
