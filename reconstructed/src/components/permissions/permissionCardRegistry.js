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

//@ chunk-s4bxxzsw.js:44358-44817 placement
/**
 * 可选工具的占位（本构建被裁掉为 null）以及 Workflow/Monitor/ContinueInProjects 的懒加载引用、workflow 使用同意模块、已撤回请求的提示文字。
 */
var ARTIFACT_TOOL_REF = null;
var ARTIFACT_PERMISSION_DIALOG = null;
var ACCOUNT_MEMORY_PERMISSION_MODULE = null;
var ContinueInProjectsTool = require("./chunk-hbtxm37k.js").ContinueInProjectsTool;
var projectContinuePermissionDialog = require("./chunk-dkjq625a.js").projectContinuePermissionDialog;
var OPTIONAL_TOOL_REF = null;
var OPTIONAL_TOOL_DIALOG = null;
var WORDS_SENT_ROUTE = null;
var WorkflowTool = require("./chunk-y1shfdfm.js").WorkflowTool;
var workflowPermissionDialog = require("./chunk-vhnfh0m3.js").workflowPermissionDialog;
var workflowUsageConsentModule = require("./chunk-hxj257dq.js");
var MonitorTool = require("./chunk-v3rq5m6f.js").MonitorTool;
var WITHDRAWN_REQUEST_ANSWER_TEXT =
  "The request this approval was for had already been withdrawn; the answer applied to nothing.";
//@ chunk-s4bxxzsw.js:44817-44841 placement
function identity(e) {
  return e;
}
//@ chunk-s4bxxzsw.js:44841-45959 placement
/**
 * 工具 → 权限卡片映射：每项 {matches 工具判定, dialog 卡片定义, build 载荷构造}，供远程/桥接审批使用。
 */
var PERMISSION_CARD_REGISTRY = [
  identity({
    matches: (e) => e === WebFetchTool,
    dialog: WEBFETCH_PERMISSION_CARD,
    build: buildWebFetchPermissionPayload,
  }),
  identity({
    matches: (e) => e.name.startsWith(CFC_TOOL_PREFIX),
    dialog: BROWSER_PERMISSION_CARD,
    build: buildChromePermissionPayload,
  }),
  identity({
    matches: (e) => e === AskUserQuestionTool,
    dialog: ASK_USER_QUESTION_PERMISSION_CARD,
    build: buildAskUserQuestionPayload,
  }),
  identity({
    matches: (e) => e === EnterPlanModeTool,
    dialog: ENTER_PLAN_MODE_PERMISSION_CARD,
    build: buildPermissionPromptPayload,
  }),
  identity({
    matches: (e) => e === PublishPluginTool,
    dialog: PUBLISH_PLUGIN_PERMISSION_CARD,
    build: buildPublishPluginPayload,
  }),
  identity({
    matches: (e) => e === ExitPlanModeV2Tool,
    dialog: EXIT_PLAN_MODE_V2_PERMISSION_CARD,
    build: buildExitPlanModePermissionPayload,
  }),
  identity({
    matches: (e) => e === SkillTool,
    dialog: SKILL_PERMISSION_CARD,
    build: buildSkillPermissionPayload,
  }),
  identity({
    matches: (e) => e.name === POWERSHELL_TOOL_NAME,
    dialog: POWERSHELL_PERMISSION_CARD,
    build: buildPowerShellPermissionPayload,
  }),
  identity({
    matches: (e) => e === MonitorTool,
    dialog: MONITOR_PERMISSION_CARD,
    build: buildMonitorPermissionPayload,
  }),
  ...(ARTIFACT_TOOL_REF !== null && ARTIFACT_PERMISSION_DIALOG !== null
    ? [
        identity({
          matches: (e) => e === ARTIFACT_TOOL_REF,
          dialog: ARTIFACT_PERMISSION_DIALOG,
          build: buildArtifactPermissionPayload,
        }),
      ]
    : []),
  identity({
    matches: (e) => e === WorkflowTool,
    dialog: workflowPermissionDialog,
    build: buildWorkflowPermissionPayload,
  }),
  ...(ContinueInProjectsTool !== null && projectContinuePermissionDialog !== null
    ? [
        identity({
          matches: (e) => e === ContinueInProjectsTool,
          dialog: projectContinuePermissionDialog,
          build: buildPermissionPromptPayload,
        }),
      ]
    : []),
  ...(OPTIONAL_TOOL_REF !== null && OPTIONAL_TOOL_DIALOG !== null
    ? [
        identity({
          matches: (e) => e === OPTIONAL_TOOL_REF,
          dialog: OPTIONAL_TOOL_DIALOG,
          build: buildPermissionPromptPayload,
        }),
      ]
    : []),
  ...(WORDS_SENT_ROUTE !== null
    ? [
        identity({
          matches: (e) => e === WORDS_SENT_ROUTE.tool,
          dialog: WORDS_SENT_ROUTE.dialog,
          build: WORDS_SENT_ROUTE.route.buildAskPayload,
          race: (e) =>
            WORDS_SENT_ROUTE.startWordsSentRacer({
              ...e,
              resultWhenSent: WORDS_SENT_ROUTE.route.resultWhenWordsAreSent,
            }),
          resultWhenNotShown: WORDS_SENT_ROUTE.route.resultWhenNotShown,
        }),
      ]
    : []),
  ...(ACCOUNT_MEMORY_PERMISSION_MODULE !== null
    ? [
        identity({
          matches: (e) => ACCOUNT_MEMORY_PERMISSION_MODULE.isAccountMemoryWriteDialogTool(e),
          dialog: ACCOUNT_MEMORY_PERMISSION_MODULE.accountMemoryWritePermissionDialog,
          build: ACCOUNT_MEMORY_PERMISSION_MODULE.buildAccountMemoryWritePermissionDescriptor,
        }),
      ]
    : []),
];
export {
  PERMISSION_CARD_REGISTRY,
  WorkflowTool,
  workflowUsageConsentModule,
  ACCOUNT_MEMORY_PERMISSION_MODULE,
  WITHDRAWN_REQUEST_ANSWER_TEXT,
};
