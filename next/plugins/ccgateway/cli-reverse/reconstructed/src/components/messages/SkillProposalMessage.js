/**
 * components/messages/SkillProposalMessage.tsx
 *
 * 2.1.316 新增：工具名到 UI 模块的映射（MCP 注册表搜索、连接器建议、Artifact、工作流等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (5)
 * attribution: placement 5
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { AttachmentList, renderToolResultMessage_6 } from "../../tools/BriefTool/UI.js";
import { plural } from "../../utils/stringUtils.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import {
  renderGroupedAgentToolUse,
  renderToolResultMessage,
  renderToolUseErrorMessage,
  renderToolUseProgressMessage,
  renderToolUseRejectedMessage,
  renderToolUseTag,
  userFacingNameBackgroundColor,
  renderToolUseTag_2,
} from "../../tools/AgentTool/UI.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { renderToolResultMessage_8 } from "../../tools/TaskStopTool/UI.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import {
  AskUserQuestionResult,
  AskUserQuestionDeclined,
  renderNoToolUseProgress,
  renderNoToolUseError,
} from "../../tools/AskUserQuestionTool/UI.js";
import { BRIEF_TOOL_NAME } from "../../tools/BriefTool/prompt.js";
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import {
  renderToolResultMessage_10,
  renderToolUseRejectedMessage_2,
} from "../../tools/ExitPlanModeTool/UI.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { MEMORY_WRITE } from "../../tools/MemoryTool/memoryToolNames.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import {
  renderToolResultMessage_3,
  renderTaskOutputResult,
  renderToolUseErrorMessage_4,
} from "../../tools/GrepTool/UI.js";
import { renderToolUseErrorMessage_3 } from "../../tools/GlobTool/UI.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { renderToolResultMessage as renderToolResultMessage_11 } from "../../tools/WebFetchTool/UI.js";
import { FallbackToolUseRejectedMessage } from "../FallbackToolUseRejectedMessage.js";
import { WEBSEARCH } from "../../tools/WebSearchTool/prompt.js";
import { renderToolResultMessage_9, renderToolUseProgressMessage_4 } from "../../tools/WebSearchTool/UI.js";
import { REPORTFINDINGS } from "../../tools/ReportFindingsTool/constants.js";
import {
  renderFindingsResult,
  noFindingError,
  noFindingToolUseMessage,
  noFindingProgressMessage,
  noFindingResultMessage,
} from "../../tools/ReportFindingsTool/UI.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import {
  LSP_TOOL_NAME,
  renderToolResultMessage_4,
  renderToolUseErrorMessage_2,
} from "../../tools/LSPTool/UI.js";
import { REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { LISTMCPRESOURCESTOOL } from "../../tools/ListMcpResourcesTool/prompt.js";
import {
  renderMcpResourceListResult,
  renderMcpResourceDirResult,
} from "../../tools/ListMcpResourcesTool/UI.js";
import {
  exceedsMonitorLineLimit,
  exceedsPushNotificationLineLimit,
  renderMonitorStarted,
  PushNotificationResult,
} from "../../tools/MonitorTool/UI.js";
import { READ_MCP_RESOURCE_DIR_TOOL_NAME } from "../../tools/ReadMcpResourceDirTool/prompt.js";
import { READMCPRESOURCETOOL } from "../../tools/ReadMcpResourceTool/prompt.js";
import { renderToolResultMessage_5 } from "../../tools/ReadMcpResourceTool/UI.js";
import {
  exceedsNotificationsLineLimit,
  renderNotificationsResult,
  renderHttpStatusLine,
} from "../../tools/NotificationsTool/UI.js";
import { READNOTIFICATIONS } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../../tools/EnterPlanModeTool/constants.js";
import { EnterPlanModeResult, PlanModeDeclinedMessage } from "../../tools/EnterPlanModeTool/UI.js";
import { ENTER_WORKTREE_TOOL_NAME } from "../../tools/EnterWorktreeTool/constants.js";
import { WorktreeSwitchedMessage } from "../../tools/EnterWorktreeTool/UI.js";
import { EXIT_WORKTREE_TOOL_NAME } from "../../tools/ExitWorktreeTool/constants.js";
import { renderToolResultMessage_7 } from "../../tools/ExitWorktreeTool/UI.js";
import {
  CRON_CREATE_TOOL_NAME,
  CRON_DELETE_TOOL_NAME,
  CRON_LIST_TOOL_NAME,
} from "../../tools/ScheduleCronTool/prompt.js";
import {
  renderCreateResultMessage,
  renderDeleteResultMessage,
  renderCronList,
} from "../../tools/ScheduleCronTool/UI.js";
import { REMOTETRIGGER } from "../../tools/RemoteTriggerTool/prompt.js";
import { MCP_UI_TABLE_KEY, MCP_DISPLAY_ONLY } from "../../tools/MCPTool/MCPTool.js";
import {
  renderMcpToolResultMessage,
  renderToolUseProgressMessage as renderToolUseProgressMessage_5,
  isLargeMcpOutput,
  MCPTextOutput,
} from "../../tools/MCPTool/UI.js";
import { MCP_SLACK_SEND } from "../../tools/MCPTool/slackSend.js";
import { MCP_CLAUDE_TEST_WRITE } from "../../plugins/bundled/claudeTest/constants.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";
import { SENDFILE } from "../../tools/SendFileTool/prompt.js";
import { PROPOSE_SKILLS } from "../../tools/ProposeSkillsTool/ProposeSkillsTool.js";
import { PUSHNOTIFICATION } from "../../tools/PushNotificationTool/constants.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import { SHOWONBOARDINGROLEPICKER } from "../../tools/ShowOnboardingRolePickerTool/ShowOnboardingRolePickerTool.js";
import { SHAREONBOARDINGGUIDE } from "../../tools/ShareOnboardingGuideTool/prompt.js";
import { GET_TASK_TOOL_TEXT } from "../../remote/tools/nativeToolErrors.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../../utils/computerUse/common.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ah34pb7m.js:256269-256563 placement
function renderFileOpResult(result) {
  if (typeof result === "string")
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: stripNonPrintable(result),
      }),
    });
  let filtered = result.files.filter((file) => file.error !== undefined);
  return jsxProd_default_2(MessageResponse, {
    children: [
      jsxProd_default(Text, {
        dimColor: true,
        children: stripNonPrintable(result.message),
      }),
      filtered.map((file) =>
        jsxProd_default_2(
          Text,
          {
            color: "warning",
            children: ["  ", stripNonPrintable(`${file.path}: ${file.error}`)],
          },
          file.path,
        ),
      ),
    ],
  });
}
//@ chunk-ah34pb7m.js:256563-256810 placement
function renderAttachmentCaption(props) {
  return jsxProd_default_2(Box, {
    flexDirection: "row",
    marginTop: 1,
    children: [
      jsxProd_default(Box, {
        minWidth: 2,
        children: jsxProd_default(Text, {
          color: "text",
          children: BLACK_CIRCLE,
        }),
      }),
      jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          props.caption
            ? jsxProd_default(Text, {
                children: props.caption,
              })
            : null,
          jsxProd_default(AttachmentList, {
            attachments: props.attachments,
          }),
        ],
      }),
    ],
  });
}
//@ chunk-ah34pb7m.js:256810-256923 placement
function renderRolePickerResult(result) {
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default(Text, {
      children: result.role !== undefined ? `Role: ${result.role}` : "Role picker dismissed",
    }),
  });
}
//@ chunk-ah34pb7m.js:256923-257050 placement
function renderSkillProposalResult(result) {
  return jsxProd_default(Text, {
    children: `Shown ${result.proposalCount} ${plural(result.proposalCount, "skill proposal")} to the user for review`,
  });
}
//@ chunk-ah34pb7m.js:257050-265304 placement
/**
 * 工具名到 UI 模块的映射（MCP 注册表搜索、连接器建议、Artifact、工作流等）。
 */
var SEARCH_MCP_REGISTRY_TOOL_UI; // deferred: loads other modules while loading; runs once its import cycle is complete
var SUGGEST_CONNECTORS_TOOL_UI;
var disabledToolUi_1;
var disabledToolUi_2;
var LIST_CONNECTORS_TOOL_UI;
var disabledToolUi_3;
var disabledToolUi_4;
var disabledToolUi_5;
var FETCH_INBOX_MESSAGE_TOOL_UI;
var disabledToolUi_6;
var WORKFLOW_TOOL_UI;
var disabledToolUi_7;
var toolUiModule;
var disabledToolUi_8;
var disabledToolUi_9;
var ARTIFACT_TOOL_UI;
var END_CONVERSATION_TOOL_UI;
var GROUPED_TOOL_USE_RENDERERS;
var MCP_TOOL_NAME_PREFIX;
deferInit("chunk-ah34pb7m.js:257050", () => {
  SEARCH_MCP_REGISTRY_TOOL_UI = {
    name: require("../../tools/SearchMcpRegistryTool/prompt.js").SEARCH_MCP_REGISTRY_TOOL_NAME,
    ui: require("../../tools/SearchMcpRegistryTool/renderToolResultMessage.lazy.js"),
  };
  SUGGEST_CONNECTORS_TOOL_UI = {
    name: require("../../tools/SuggestConnectorsTool/prompt.js").SUGGEST_CONNECTORS_TOOL_NAME,
    ui: require("../../tools/SuggestConnectorsTool/renderToolResultMessage.lazy.js"),
  };
  disabledToolUi_1 = null;
  disabledToolUi_2 = null;
  LIST_CONNECTORS_TOOL_UI = {
    name: require("../../tools/ListConnectorsTool/prompt.js").LIST_CONNECTORS_TOOL_NAME,
    ui: require("../../tools/ConnectorsTool/UI.js"),
  };
  disabledToolUi_3 = null;
  disabledToolUi_4 = null;
  disabledToolUi_5 = null;
  FETCH_INBOX_MESSAGE_TOOL_UI = {
    name: require("../../tools/FetchInboxMessageTool/prompt.js").FETCH_INBOX_MESSAGE_TOOL_NAME,
    ui: require("../../tools/InboxTool/renderToolResultMessage.lazy.js"),
  };
  disabledToolUi_6 = null;
  WORKFLOW_TOOL_UI = {
    name: require("../../tools/WorkflowTool/constants.js").WORKFLOW_TOOL_NAME,
    ui: require("../../tools/WorkflowTool/UI.js"),
  };
  disabledToolUi_7 = null;
  toolUiModule = require("./makeResultCountRenderer.lazy.js");
  disabledToolUi_8 = null;
  disabledToolUi_9 = null;
  ARTIFACT_TOOL_UI = {
    name: require("../../tools/ArtifactTool/AMPERSAND_FORMS.lazy.js").ARTIFACT_TOOL_NAME,
    names: require("../../tools/ArtifactTool/AMPERSAND_FORMS.lazy.js"),
    ui: require("../../tools/ArtifactTool/renderCheckToolUseMessage.lazy.js"),
  };
  END_CONVERSATION_TOOL_UI = {
    name: require("../../tools/EndConversationTool/constants.js").END_CONVERSATION_TOOL_NAME,
    ui: require("../permissions/renderToolResultMessage.lazy.js"),
  };
  GROUPED_TOOL_USE_RENDERERS = {
    [AGENT]: {
      renderGroupedToolUse: renderGroupedAgentToolUse,
      renderToolResultMessage,
      renderToolUseErrorMessage,
      renderToolUseProgressMessage,
      renderToolUseRejectedMessage,
      renderToolUseTag,
      userFacingNameBackgroundColor,
    },
    get [BASH_TOOL_NAME]() {
      let bashModule = require("../../tools/BashTool/UI.js");
      return {
        renderToolResultMessage: bashModule.renderToolResultMessage,
        renderToolUseProgressMessage: bashModule.renderToolUseProgressMessage,
        renderToolUseQueuedMessage: bashModule.renderToolUseQueuedMessage,
        renderToolUseErrorMessage: bashModule.renderToolUseErrorMessage,
        isResultTruncated: bashModule.isResultTruncated,
      };
    },
    [TASKSTOP]: {
      renderToolResultMessage: renderToolResultMessage_8,
    },
    [ASKUSERQUESTION]: {
      renderToolResultMessage: AskUserQuestionResult,
      renderToolUseRejectedMessage: AskUserQuestionDeclined,
      renderToolUseProgressMessage: renderNoToolUseProgress,
      renderToolUseErrorMessage: renderNoToolUseError,
    },
    [BRIEF_TOOL_NAME]: {
      renderToolResultMessage: renderToolResultMessage_6,
    },
    [EXITPLANMODE_2]: {
      renderToolResultMessage: renderToolResultMessage_10,
      renderToolUseRejectedMessage: renderToolUseRejectedMessage_2,
    },
    get [FILE_EDIT_TOOL_NAME]() {
      let fileEditModule = require("../../tools/FileEditTool/UI.js");
      return {
        renderToolResultMessage: fileEditModule.renderToolResultMessage,
        renderToolUseRejectedMessage: fileEditModule.renderToolUseRejectedMessage,
        renderToolUseErrorMessage: fileEditModule.renderToolUseErrorMessage,
      };
    },
    get [FILE_WRITE_TOOL_NAME]() {
      let fileWriteModule = require("../../tools/FileWriteTool/UI.js");
      return {
        renderToolResultMessage: fileWriteModule.renderToolResultMessage,
        renderToolUseRejectedMessage: fileWriteModule.renderToolUseRejectedMessage,
        renderToolUseErrorMessage: fileWriteModule.renderToolUseErrorMessage,
        isResultTruncated: fileWriteModule.isResultTruncated,
      };
    },
    get [MEMORY_WRITE]() {
      let memoryWriteModule = require("../../tools/MemoryTool/isResultTruncated.lazy.js");
      return {
        renderToolResultMessage: memoryWriteModule.renderToolResultMessage,
        renderToolUseErrorMessage: memoryWriteModule.renderToolUseErrorMessage,
        isResultTruncated: memoryWriteModule.isResultTruncated,
      };
    },
    get [FILE_READ_TOOL_NAME]() {
      let fileReadModule = require("../../tools/FileReadTool/renderToolResultMessage.lazy.js");
      return {
        renderToolResultMessage: fileReadModule.renderToolResultMessage,
        renderToolUseErrorMessage: fileReadModule.renderToolUseErrorMessage,
        renderToolUseTag: fileReadModule.renderToolUseTag,
      };
    },
    get [NOTEBOOK_EDIT_TOOL_NAME]() {
      let globModule = require("../../tools/NotebookEditTool/renderToolResultMessage.lazy.js");
      return {
        renderToolResultMessage: globModule.renderToolResultMessage,
        renderToolUseRejectedMessage: globModule.renderToolUseRejectedMessage,
        renderToolUseErrorMessage: globModule.renderToolUseErrorMessage,
      };
    },
    get [POWERSHELL_TOOL_NAME]() {
      let grepModule = require("../../tools/PowerShellTool/isResultTruncated.lazy.js");
      return {
        renderToolResultMessage: grepModule.renderToolResultMessage,
        renderToolUseErrorMessage: grepModule.renderToolUseErrorMessage,
        renderToolUseProgressMessage: grepModule.renderToolUseProgressMessage,
        renderToolUseQueuedMessage: grepModule.renderToolUseQueuedMessage,
        isResultTruncated: grepModule.isResultTruncated,
      };
    },
    [GREP_TOOL_NAME]: {
      renderToolResultMessage: renderToolResultMessage_3,
      renderToolUseErrorMessage: renderToolUseErrorMessage_3,
    },
    [GLOB_TOOL_NAME]: {
      renderToolResultMessage: renderToolResultMessage_3,
      renderToolUseErrorMessage: renderToolUseErrorMessage_3,
    },
    [WEBFETCH]: {
      renderToolResultMessage: renderToolResultMessage_11,
      renderToolUseProgressMessage: FallbackToolUseRejectedMessage,
    },
    [WEBSEARCH]: {
      renderToolResultMessage: renderToolResultMessage_9,
      renderToolUseProgressMessage: renderToolUseProgressMessage_4,
    },
    [REPORTFINDINGS]: {
      renderToolResultMessage: renderFindingsResult,
    },
    get [SKILL]() {
      let notebookModule = require("../../tools/SkillTool/renderToolResultMessage.lazy.js");
      return {
        renderToolResultMessage: notebookModule.renderToolResultMessage,
        renderToolUseProgressMessage: notebookModule.renderToolUseProgressMessage,
        renderToolUseRejectedMessage: notebookModule.renderToolUseRejectedMessage,
        renderToolUseErrorMessage: notebookModule.renderToolUseErrorMessage,
      };
    },
    [LSP_TOOL_NAME]: {
      renderToolResultMessage: renderToolResultMessage_4,
      renderToolUseErrorMessage: renderToolUseErrorMessage_2,
    },
    [REPL_TOOL_NAME]: {
      renderToolUseErrorMessage: noFindingError,
      renderToolUseProgressMessage: noFindingToolUseMessage,
      renderToolUseRejectedMessage: noFindingProgressMessage,
    },
    [LISTMCPRESOURCESTOOL]: {
      renderToolResultMessage: renderMcpResourceListResult,
      isResultTruncated: exceedsMonitorLineLimit,
    },
    [READ_MCP_RESOURCE_DIR_TOOL_NAME]: {
      renderToolResultMessage: renderMcpResourceDirResult,
      isResultTruncated: exceedsPushNotificationLineLimit,
    },
    [READMCPRESOURCETOOL]: {
      renderToolResultMessage: renderToolResultMessage_5,
      isResultTruncated: exceedsNotificationsLineLimit,
    },
    [READNOTIFICATIONS]: {
      renderToolResultMessage: renderNotificationsResult,
    },
    [ENTER_PLAN_MODE_TOOL_NAME]: {
      renderToolResultMessage: EnterPlanModeResult,
      renderToolUseRejectedMessage: PlanModeDeclinedMessage,
    },
    [ENTER_WORKTREE_TOOL_NAME]: {
      renderToolResultMessage: WorktreeSwitchedMessage,
    },
    [EXIT_WORKTREE_TOOL_NAME]: {
      renderToolResultMessage: renderToolResultMessage_7,
    },
    [CRON_CREATE_TOOL_NAME]: {
      renderToolResultMessage: renderCreateResultMessage,
    },
    [CRON_DELETE_TOOL_NAME]: {
      renderToolResultMessage: renderDeleteResultMessage,
    },
    [CRON_LIST_TOOL_NAME]: {
      renderToolResultMessage: renderCronList,
    },
    [REMOTETRIGGER]: {
      renderToolResultMessage: renderHttpStatusLine,
    },
    [MCP_UI_TABLE_KEY]: {
      renderToolResultMessage: renderMcpToolResultMessage,
      renderToolUseProgressMessage: renderToolUseProgressMessage_5,
      isResultTruncated: isLargeMcpOutput,
    },
    get [MCP_DISPLAY_ONLY]() {
      let displayOnlyMcpToolUi = require("../../tools/MCPTool/displayOnlyTool.js").displayOnlyMcpToolUi;
      return {
        renderToolUseProgressMessage: renderToolUseProgressMessage_5,
        renderToolResultMessage: displayOnlyMcpToolUi.renderToolResultMessage,
        isResultTruncated: displayOnlyMcpToolUi.isResultTruncated,
      };
    },
    [MCP_SLACK_SEND]: {
      renderToolResultMessage: renderMcpToolResultMessage,
      renderToolUseProgressMessage: renderToolUseProgressMessage_5,
      renderToolUseTag: renderToolUseTag_2,
      isResultTruncated: isLargeMcpOutput,
    },
    get [MCP_CLAUDE_TEST_WRITE]() {
      let taskModule = require("./renderClaudeTestDraftResult.lazy.js");
      return {
        renderToolResultMessage: taskModule.renderClaudeTestDraftResult,
        renderToolUseProgressMessage: renderToolUseProgressMessage_5,
        isResultTruncated: isLargeMcpOutput,
      };
    },
    [MONITOR]: {
      renderToolResultMessage: renderMonitorStarted,
    },
    [SEND_USER_FILE_TOOL_NAME]: {
      renderToolResultMessage: renderAttachmentCaption,
    },
    [SENDFILE]: {
      renderToolResultMessage: renderFileOpResult,
    },
    [PROPOSE_SKILLS]: {
      renderToolResultMessage: renderSkillProposalResult,
    },
    [PUSHNOTIFICATION]: {
      renderToolResultMessage: PushNotificationResult,
    },
    [SENDMESSAGE]: {
      renderToolResultMessage: MCPTextOutput,
    },
    [SHOWONBOARDINGROLEPICKER]: {
      renderToolResultMessage: renderRolePickerResult,
    },
    ...(SEARCH_MCP_REGISTRY_TOOL_UI && {
      [SEARCH_MCP_REGISTRY_TOOL_UI.name]: {
        renderToolResultMessage: SEARCH_MCP_REGISTRY_TOOL_UI.ui.renderToolResultMessage,
      },
    }),
    ...(SUGGEST_CONNECTORS_TOOL_UI && {
      [SUGGEST_CONNECTORS_TOOL_UI.name]: {
        renderToolResultMessage: SUGGEST_CONNECTORS_TOOL_UI.ui.renderToolResultMessage,
      },
    }),
    ...(disabledToolUi_1 && {
      [disabledToolUi_1.name]: {
        renderToolResultMessage: disabledToolUi_1.ui.renderToolResultMessage,
        isResultTruncated: disabledToolUi_1.ui.isResultTruncated,
      },
    }),
    ...(disabledToolUi_2 && {
      [disabledToolUi_2.name]: {
        renderToolResultMessage: disabledToolUi_2.ui.renderToolResultMessage,
      },
    }),
    ...(LIST_CONNECTORS_TOOL_UI && {
      [LIST_CONNECTORS_TOOL_UI.name]: {
        renderToolResultMessage: LIST_CONNECTORS_TOOL_UI.ui.renderToolResultMessage,
      },
    }),
    ...(disabledToolUi_3 && {
      [disabledToolUi_3.name]: {
        renderToolResultMessage: disabledToolUi_3.ui.renderToolResultMessage,
      },
    }),
    ...(disabledToolUi_4 && {
      [disabledToolUi_4.readName]: {
        renderToolResultMessage: disabledToolUi_4.ui.renderToolResultMessage,
        renderToolUseErrorMessage: disabledToolUi_4.ui.renderToolUseErrorMessage,
      },
      [disabledToolUi_4.changeName]: {
        renderToolResultMessage: disabledToolUi_4.ui.renderToolResultMessage,
        renderToolUseProgressMessage: disabledToolUi_4.ui.renderToolUseProgressMessage,
        renderToolUseRejectedMessage: disabledToolUi_4.ui.renderToolUseRejectedMessage,
        renderToolUseErrorMessage: disabledToolUi_4.ui.renderToolUseErrorMessage,
        endedByChoice: disabledToolUi_4.ui.endedByChoice,
      },
      [disabledToolUi_4.joinName]: {
        renderToolResultMessage: disabledToolUi_4.ui.renderToolResultMessage,
        renderToolUseProgressMessage: disabledToolUi_4.ui.renderToolUseProgressMessage,
        renderToolUseRejectedMessage: disabledToolUi_4.ui.renderToolUseRejectedMessage,
        renderToolUseErrorMessage: disabledToolUi_4.ui.renderToolUseErrorMessage,
        endedByChoice: disabledToolUi_4.ui.endedByChoice,
      },
    }),
    [SHAREONBOARDINGGUIDE]: {
      renderToolResultMessage: noFindingResultMessage,
    },
    ...(disabledToolUi_5 && {
      [disabledToolUi_5.name]: {
        renderToolResultMessage: disabledToolUi_5.ui.renderToolResultMessage,
      },
    }),
    ...(FETCH_INBOX_MESSAGE_TOOL_UI && {
      [FETCH_INBOX_MESSAGE_TOOL_UI.name]: {
        renderToolResultMessage: FETCH_INBOX_MESSAGE_TOOL_UI.ui.renderToolResultMessage,
      },
    }),
    ...(disabledToolUi_6 && {
      [disabledToolUi_6.name]: {
        renderToolResultMessage: disabledToolUi_6.ui.renderToolResultMessage,
        renderToolUseProgressMessage: disabledToolUi_6.ui.renderToolUseProgressMessage,
      },
    }),
    [GET_TASK_TOOL_TEXT]: {
      renderToolResultMessage: renderTaskOutputResult,
      renderToolUseErrorMessage: renderToolUseErrorMessage_4,
    },
    [WORKFLOW_TOOL_UI.name]: {
      renderToolResultMessage: WORKFLOW_TOOL_UI.ui.renderToolResultMessage,
      renderToolUseProgressMessage: WORKFLOW_TOOL_UI.ui.renderToolUseProgressMessage,
      renderToolUseRejectedMessage: WORKFLOW_TOOL_UI.ui.renderToolUseRejectedMessage,
    },
    ...(disabledToolUi_7 && {
      [disabledToolUi_7.name]: {
        renderToolResultMessage: disabledToolUi_7.ui.renderToolResultMessage,
        renderToolUseRejectedMessage: disabledToolUi_7.ui.renderToolUseRejectedMessage,
      },
    }),
    ...(disabledToolUi_8 && {
      [disabledToolUi_8.name]: {
        renderToolResultMessage: disabledToolUi_8.ui.renderToolResultMessage,
        renderToolUseProgressMessage: disabledToolUi_8.ui.renderToolUseProgressMessage,
      },
    }),
    ...(disabledToolUi_9 && {
      [disabledToolUi_9.name]: {
        renderToolResultMessage: disabledToolUi_9.ui.renderToolResultMessage,
        renderToolUseProgressMessage: disabledToolUi_9.ui.renderToolUseProgressMessage,
      },
    }),
    ...(ARTIFACT_TOOL_UI &&
      Object.fromEntries(
        [
          ARTIFACT_TOOL_UI.name,
          ARTIFACT_TOOL_UI.names.ARTIFACT_COMMENTS_TOOL_NAME,
          ARTIFACT_TOOL_UI.names.ARTIFACT_DATA_TOOL_NAME,
          ARTIFACT_TOOL_UI.names.ARTIFACT_CHECK_TOOL_NAME,
        ].map((webModule) => [
          webModule,
          {
            renderToolResultMessage: ARTIFACT_TOOL_UI.ui.renderToolResultMessage,
            renderToolUseProgressMessage: ARTIFACT_TOOL_UI.ui.renderToolUseProgressMessage,
            renderToolUseErrorMessage: ARTIFACT_TOOL_UI.ui.renderToolUseErrorMessage,
            renderToolUseQueuedMessage: ARTIFACT_TOOL_UI.ui.renderToolUseQueuedMessage,
          },
        ]),
      )),
    ...(END_CONVERSATION_TOOL_UI && {
      [END_CONVERSATION_TOOL_UI.name]: {
        renderToolResultMessage: END_CONVERSATION_TOOL_UI.ui.renderToolResultMessage,
      },
    }),
    ...(toolUiModule && {
      ListPlugins: {
        renderToolResultMessage: toolUiModule.makeResultCountRenderer("plugin"),
      },
      ListSkills: {
        renderToolResultMessage: toolUiModule.makeResultCountRenderer("skill"),
      },
      SearchPlugins: {
        renderToolResultMessage: toolUiModule.makeResultCountRenderer("plugin"),
      },
      SearchSkills: {
        renderToolResultMessage: toolUiModule.makeResultCountRenderer("skill"),
      },
      SuggestPluginInstall: {
        renderToolResultMessage: (planModule) =>
          toolUiModule.makeResultCountRenderer("plugin")({
            results: planModule.plugins,
          }),
      },
      SuggestSkills: {
        renderToolResultMessage: toolUiModule.makeResultCountRenderer("skill"),
      },
    }),
  };
  MCP_TOOL_NAME_PREFIX = `mcp__${COMPUTER_USE_MCP_SERVER_NAME}__`;
});
export { GROUPED_TOOL_USE_RENDERERS, MCP_TOOL_NAME_PREFIX };
