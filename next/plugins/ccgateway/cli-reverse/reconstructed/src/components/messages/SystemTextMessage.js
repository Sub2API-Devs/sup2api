/**
 * components/messages/SystemTextMessage.tsx
 *
 * 系统消息分派：turn_duration（"Worked for Xm"）、memory_saved、away_summary、agents_killed、stop_hook_summary、bridge_status、api_error、model_fallback、permission_retry 等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/SystemTextMessage.tsx
 * pieces: chunk-fwegbnps.js (1), chunk-wjygkcr4.js (32)
 * attribution: placement 8, affinity 1, fingerprint 11, layout 12, file-local 1
 */
import { normalize, basename } from "path";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppStateSlice, useAppState, useAppStoreDirect } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { REFERENCE_GLYPH, BLACK_CIRCLE, TEARDROP_ASTERISK } from "../../constants/figures.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useFrozenValue } from "../FreezeWhenOffscreen.js";
import {
  repositoryTrustNote,
  describeRepositoryTrust,
  SYNC_STATUS_HEADING,
  SYNC_ITEM_LABELS,
  cross,
} from "../../cli/headlessCloud/syncStatus.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { hashString31 } from "../../utils/pastedContent.js";
import { TURN_COMPLETION_VERBS } from "../../constants/turnCompletionVerbs.js";
import { isPanelAgentTask, isIdleTeammateTask } from "../../tasks/taskKinds.js";
import { isTerminalTaskStatus as isTerminalTaskStatus_2 } from "../../tasks/taskStatus.js";
import { isMainAgentCommand } from "../../utils/messageQueueManager.js";
import { isCoordinatorPanelActive } from "../../utils/transcriptDiagnostics.js";
import { shouldHideTasksFooter } from "../tasks/taskStatusUtils.js";
import { countNonAmbientTasks } from "../tasks/BackgroundTaskStatus.js";
import { getPillLabelWithExtra } from "../../tasks/pillLabel.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { isRefusalFallbackEnabled } from "../../services/api/refusalFallback.js";
import { LinkifiedText } from "../rateLimit/usageCreditsOffer.js";
import { getValidStringArray, normalizeHookSummary } from "../../utils/collapseHookSummaries.js";
import { permissionRetryText, autoModeRetrySuffix } from "../../utils/messages.js";
import { CtrlOToExpand } from "../CtrlOToExpand.js";
import { useShimmerOffset, ShimmerText } from "../../tools/ReportFindingsTool/UI.js";
import { hasStringUuid } from "../../bridge/inboundMessages.js";
import { useCommandQueueOrDefault } from "../../context/QueuedMessageContext.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { formatBriefTimestamp } from "../../utils/formatBriefTimestamp.js";
import { useState, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import { formatDuration, formatNumber } from "../../utils/format.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { getMemorySavedVerb, teamMemSavedPart } from "./teamMemSaved.js";
import { renderWithForceUpdate } from "../../hooks/useForceRender.js";
import { getAutoMemPathOrNull } from "../../memdir/paths.js";
import { getPlatform } from "../../utils/platform.js";
import { isAllowedAutoMemWritePath } from "../../services/extractMemories/extractMemories.js";
import { MessageResponse } from "../MessageResponse.js";
import { hasControlChars } from "../../services/policyLimits/complianceTaints.js";
import { HIDDEN_PATH_PLACEHOLDER } from "../../utils/file.js";
import { openPath } from "../../utils/browser.js";
import { FilePathLink } from "../FilePathLink.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fwegbnps.js:231-363 placement
/**
 * 云会话横幅文字（创建或附着）与"在此或在…编码"的连接文字。
 */
var CLOUD_SESSION_BANNERS = {
  create: "Cloud session active",
  attach: "Attached to cloud session",
  moved: "Cloud session ready",
};
var CODE_HERE_OR_AT = " \xB7 code here or at ";
//@ chunk-wjygkcr4.js:66162-66209 affinity
function selectMaxProseWidth(state) {
  return state.settings.maxProseWidth;
}
//@ chunk-wjygkcr4.js:66209-66910 fingerprint (2.1.88 match: ThinkingMessage, 0.463)
function ThinkingMessage(props) {
  let $ = useMemoCache(13);
  let { content, addMargin, trailer } = props;
  let maxWidth = useAppStateSlice(selectMaxProseWidth);
  const marginTop = addMargin ? 1 : 0;
  let t2;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Box, {
      minWidth: 2,
      children: jsxProd_default(Text, {
        "aria-hidden": true,
        dimColor: true,
        children: REFERENCE_GLYPH,
      }),
    });
    $[0] = t2;
  } else t2 = $[0];
  let t3;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    t3 = jsxProd_default_2(Text, {
      dimColor: true,
      bold: true,
      children: ["recap:", " "],
    });
    $[1] = t3;
  } else t3 = $[1];
  let textElement;
  if ($[2] !== content) {
    textElement = jsxProd_default(Text, {
      dimColor: true,
      italic: true,
      children: content,
    });
    $[2] = content;
    $[3] = textElement;
  } else textElement = $[3];
  let children;
  if ($[4] !== textElement || $[5] !== trailer) {
    children = jsxProd_default_2(Text, {
      children: [t3, textElement, trailer],
    });
    $[4] = textElement;
    $[5] = trailer;
    $[6] = children;
  } else children = $[6];
  let contentBox;
  if ($[7] !== maxWidth || $[8] !== children) {
    contentBox = jsxProd_default(Box, {
      maxWidth,
      children,
    });
    $[7] = maxWidth;
    $[8] = children;
    $[9] = contentBox;
  } else contentBox = $[9];
  let rowBox;
  if ($[10] !== marginTop || $[11] !== contentBox) {
    rowBox = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop,
      width: "100%",
      children: [t2, contentBox],
    });
    $[10] = marginTop;
    $[11] = contentBox;
    $[12] = rowBox;
  } else rowBox = $[12];
  return rowBox;
}
//@ chunk-wjygkcr4.js:197526-197567 placement
function selectCloudSessionSync(state) {
  return state.cloudSessionSync;
}
//@ chunk-wjygkcr4.js:197567-198519 placement
/**
 * 系统消息：远程会话链接（仅当前远程会话 URL 匹配时显示），并附上同步状态行。
 */
function RemoteSessionLinkMessage(props) {
  let $ = useMemoCache(18);
  let { message, addMargin } = props;
  let { columns } = useTerminalSize();
  let selectUrlMatch;
  if ($[0] !== message.url) {
    selectUrlMatch = (state) => state.remoteSessionUrl === message.url;
    $[0] = message.url;
    $[1] = selectUrlMatch;
  } else selectUrlMatch = $[1];
  let appState = useAppState(selectUrlMatch);
  let appState_2 = useAppState(selectCloudSessionSync);
  let [frozenValueRef, frozenValue] = useFrozenValue(appState_2);
  if (!appState) {
    return null;
  }
  const marginTop = addMargin ? 1 : 0;
  let bulletBox;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    bulletBox = jsxProd_default(Box, {
      minWidth: 2,
      children: jsxProd_default(Text, {
        "aria-hidden": true,
        color: "inactive",
        children: BLACK_CIRCLE,
      }),
    });
    $[2] = bulletBox;
  } else bulletBox = $[2];
  const width = columns - 10;
  const bannerText = CLOUD_SESSION_BANNERS[message.entry];
  let linkElement;
  if ($[3] !== message.url) {
    linkElement = jsxProd_default(Link, {
      url: message.url,
      children: message.url,
    });
    $[3] = message.url;
    $[4] = linkElement;
  } else linkElement = $[4];
  let textElement;
  if ($[5] !== bannerText || $[6] !== linkElement) {
    textElement = jsxProd_default_2(Text, {
      color: "inactive",
      wrap: "wrap",
      children: [bannerText, CODE_HERE_OR_AT, linkElement],
    });
    $[5] = bannerText;
    $[6] = linkElement;
    $[7] = textElement;
  } else textElement = $[7];
  let syncHint;
  if ($[8] !== frozenValue) {
    syncHint =
      frozenValue !== undefined &&
      jsxProd_default(SyncStatusRows, {
        rows: frozenValue,
      });
    $[8] = frozenValue;
    $[9] = syncHint;
  } else syncHint = $[9];
  let contentColumn;
  if ($[10] !== width || $[11] !== textElement || $[12] !== syncHint) {
    contentColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      width,
      children: [textElement, syncHint],
    });
    $[10] = width;
    $[11] = textElement;
    $[12] = syncHint;
    $[13] = contentColumn;
  } else contentColumn = $[13];
  let bannerRow;
  if ($[14] !== frozenValueRef || $[15] !== marginTop || $[16] !== contentColumn) {
    bannerRow = jsxProd_default_2(Box, {
      ref: frozenValueRef,
      flexDirection: "row",
      marginTop,
      width: "100%",
      children: [bulletBox, contentColumn],
    });
    $[14] = frozenValueRef;
    $[15] = marginTop;
    $[16] = contentColumn;
    $[17] = bannerRow;
  } else bannerRow = $[17];
  return bannerRow;
}
//@ chunk-wjygkcr4.js:198519-199636 placement
/**
 * 远程会话同步状态区块：项目文件、设置、插件、本地工具各一行，以及两行附加说明。
 */
function SyncStatusRows(props) {
  let $ = useMemoCache(24);
  let { rows } = props;
  let trustNote;
  if ($[0] !== rows) {
    trustNote = repositoryTrustNote(rows);
    $[0] = rows;
    $[1] = trustNote;
  } else trustNote = $[1];
  let trustNoteMemo = trustNote;
  let trustDescription;
  if ($[2] !== rows) {
    trustDescription = describeRepositoryTrust(rows);
    $[2] = rows;
    $[3] = trustDescription;
  } else trustDescription = $[3];
  let trustDescriptionMemo = trustDescription;
  let textElement;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    textElement = jsxProd_default(Text, {
      color: "inactive",
      children: SYNC_STATUS_HEADING,
    });
    $[4] = textElement;
  } else textElement = $[4];
  let projectFilesRow;
  if ($[5] !== rows.projectFiles) {
    projectFilesRow =
      rows.projectFiles !== undefined &&
      jsxProd_default(SyncStatusRow, {
        label: SYNC_ITEM_LABELS.projectFiles,
        row: rows.projectFiles,
      });
    $[5] = rows.projectFiles;
    $[6] = projectFilesRow;
  } else projectFilesRow = $[6];
  let settingsRow;
  if ($[7] !== rows.settings) {
    settingsRow = jsxProd_default(SyncStatusRow, {
      label: SYNC_ITEM_LABELS.settings,
      row: rows.settings,
    });
    $[7] = rows.settings;
    $[8] = settingsRow;
  } else settingsRow = $[8];
  let pluginsRow;
  if ($[9] !== rows.plugins) {
    pluginsRow = jsxProd_default(SyncStatusRow, {
      label: SYNC_ITEM_LABELS.plugins,
      row: rows.plugins,
    });
    $[9] = rows.plugins;
    $[10] = pluginsRow;
  } else pluginsRow = $[10];
  let localToolsRow;
  if ($[11] !== rows.localTools) {
    localToolsRow =
      rows.localTools !== undefined &&
      jsxProd_default(SyncStatusRow, {
        label: SYNC_ITEM_LABELS.localTools,
        row: rows.localTools,
      });
    $[11] = rows.localTools;
    $[12] = localToolsRow;
  } else localToolsRow = $[12];
  let trustNoteText;
  if ($[13] !== trustNoteMemo) {
    trustNoteText =
      trustNoteMemo !== undefined &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children: trustNoteMemo,
      });
    $[13] = trustNoteMemo;
    $[14] = trustNoteText;
  } else trustNoteText = $[14];
  let trustDescriptionText;
  if ($[15] !== trustDescriptionMemo) {
    trustDescriptionText =
      trustDescriptionMemo !== undefined &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children: trustDescriptionMemo,
      });
    $[15] = trustDescriptionMemo;
    $[16] = trustDescriptionText;
  } else trustDescriptionText = $[16];
  let fragmentElement;
  if (
    $[17] !== projectFilesRow ||
    $[18] !== settingsRow ||
    $[19] !== pluginsRow ||
    $[20] !== localToolsRow ||
    $[21] !== trustNoteText ||
    $[22] !== trustDescriptionText
  ) {
    fragmentElement = jsxProd_default_2(Fragment, {
      children: [
        textElement,
        projectFilesRow,
        settingsRow,
        pluginsRow,
        localToolsRow,
        trustNoteText,
        trustDescriptionText,
      ],
    });
    $[17] = projectFilesRow;
    $[18] = settingsRow;
    $[19] = pluginsRow;
    $[20] = localToolsRow;
    $[21] = trustNoteText;
    $[22] = trustDescriptionText;
    $[23] = fragmentElement;
  } else fragmentElement = $[23];
  return fragmentElement;
}
//@ chunk-wjygkcr4.js:199636-200552 placement
/**
 * 同步状态行：synced 显示成功图标与备注，pending 显示加载，not_synced 显示叉号与原因。
 */
function SyncStatusRow(props) {
  let $ = useMemoCache(15);
  let { label, row } = props;
  switch (row.mark) {
    case "synced": {
      let successIcon;
      if ($[0] === MEMO_CACHE_SENTINEL) {
        successIcon = jsxProd_default(StatusIcon, {
          status: "success",
          withSpace: true,
        });
        $[0] = successIcon;
      } else successIcon = $[0];
      let noteText;
      if ($[1] !== row.note) {
        noteText =
          row.note !== undefined &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [" (", row.note, ")"],
          });
        $[1] = row.note;
        $[2] = noteText;
      } else noteText = $[2];
      let syncedRow;
      if ($[3] !== label || $[4] !== noteText) {
        syncedRow = jsxProd_default_2(Text, {
          color: "inactive",
          children: [successIcon, label, noteText],
        });
        $[3] = label;
        $[4] = noteText;
        $[5] = syncedRow;
      } else syncedRow = $[5];
      return syncedRow;
    }
    case "pending": {
      let loadingIcon;
      if ($[6] === MEMO_CACHE_SENTINEL) {
        loadingIcon = jsxProd_default(StatusIcon, {
          status: "loading",
          withSpace: true,
        });
        $[6] = loadingIcon;
      } else loadingIcon = $[6];
      let pendingRow;
      if ($[7] !== label) {
        pendingRow = jsxProd_default_2(Text, {
          dimColor: true,
          children: [loadingIcon, label],
        });
        $[7] = label;
        $[8] = pendingRow;
      } else pendingRow = $[8];
      return pendingRow;
    }
    case "not_synced": {
      let crossIcon;
      if ($[9] === MEMO_CACHE_SENTINEL) {
        crossIcon = jsxProd_default(Text, {
          "aria-label": "not synced:",
          children: cross,
        });
        $[9] = crossIcon;
      } else crossIcon = $[9];
      let notSyncedText;
      if ($[10] !== row.words) {
        notSyncedText = jsxProd_default_2(Text, {
          dimColor: true,
          children: [" \u2014 ", row.words],
        });
        $[10] = row.words;
        $[11] = notSyncedText;
      } else notSyncedText = $[11];
      let notSyncedRow;
      if ($[12] !== label || $[13] !== notSyncedText) {
        notSyncedRow = jsxProd_default_2(Text, {
          color: "inactive",
          wrap: "wrap",
          children: [crossIcon, " ", label, notSyncedText],
        });
        $[12] = label;
        $[13] = notSyncedText;
        $[14] = notSyncedRow;
      } else notSyncedRow = $[14];
      return notSyncedRow;
    }
  }
}
//@ chunk-wjygkcr4.js:200642-200658 fingerprint (2.1.88 match: _temp4, 1)
var WORKED = "Worked";
//@ chunk-wjygkcr4.js:200658-200719 layout
function pickTurnCompletionVerb(uuid) {
  let verbIndex = (hashString31(uuid) >>> 0) % TURN_COMPLETION_VERBS.length;
  return TURN_COMPLETION_VERBS[verbIndex] ?? WORKED;
}
//@ chunk-wjygkcr4.js:200719-200822 layout
function countPendingBackgroundWork(state) {
  let { agents, workflowIds } = collectPendingBackgroundWork(state);
  return {
    pendingAgents: agents.size,
    pendingWorkflows: workflowIds.size,
  };
}
//@ chunk-wjygkcr4.js:200822-200985 layout
function listPendingBackgroundAgents(state) {
  return [...collectPendingBackgroundWork(state).agents.values()].map((agent) => ({
    id: agent.id,
    agentType: agent.agentType,
    startTime: agent.startTime,
    ...(agent.toolUseId !== undefined && {
      toolUseId: agent.toolUseId,
    }),
  }));
}
//@ chunk-wjygkcr4.js:200985-201377 layout
function collectPendingBackgroundWork({ tasks, queuedCommands = [] }) {
  let agentsById = new Map();
  let workflowIds = new Set();
  let collectTask = (task) => {
    if (isPanelAgentTask(task) && task.isBackgrounded) agentsById.set(task.id, task);
    else if (task.type === "local_workflow") workflowIds.add(task.id);
  };
  for (let task of Object.values(tasks))
    if (task.status === "running" || (isTerminalTaskStatus_2(task.status) && !task.notified))
      collectTask(task);
  for (let queuedCommand of queuedCommands) {
    if (
      queuedCommand.mode !== "task-notification" ||
      !isMainAgentCommand(queuedCommand) ||
      queuedCommand.taskId === undefined
    )
      continue;
    let queuedTask = tasks[queuedCommand.taskId];
    if (queuedTask) collectTask(queuedTask);
  }
  return {
    agents: agentsById,
    workflowIds,
  };
}
//@ chunk-wjygkcr4.js:201377-201821 layout
/**
 * 计算回合耗时信息：仍有后台代理/工作流时返回回合时长、待完成数量与后台等待起点；否则从等待起点算到现在。
 */
function computeTurnDurationInfo({
  tasks,
  queuedCommands = [],
  turnDurationMs,
  turnStartTime,
  now,
  backgroundWaitStartTime,
}) {
  let { pendingAgents, pendingWorkflows } = countPendingBackgroundWork({
    tasks,
    queuedCommands,
  });
  if (pendingAgents > 0 || pendingWorkflows > 0)
    return {
      durationMs: turnDurationMs,
      pendingBackgroundAgentCount: pendingAgents > 0 ? pendingAgents : undefined,
      pendingWorkflowCount: pendingWorkflows > 0 ? pendingWorkflows : undefined,
      backgroundWaitStartTime: backgroundWaitStartTime ?? turnStartTime,
    };
  return {
    durationMs: backgroundWaitStartTime !== null ? now - backgroundWaitStartTime : turnDurationMs,
    pendingBackgroundAgentCount: undefined,
    pendingWorkflowCount: undefined,
    backgroundWaitStartTime: null,
  };
}
//@ chunk-wjygkcr4.js:201821-201867 layout
function sumDurationMs(sum, entry) {
  return sum + (entry.durationMs ?? 0);
}
//@ chunk-wjygkcr4.js:201867-202044 fingerprint (2.1.88 match: _temp2, 0.851)
function renderStopHookCommandLine(info, idx) {
  return jsxProd_default_2(
    Text,
    {
      dimColor: true,
      children: [
        jsxProd_default(Text, {
          "aria-hidden": true,
          children: "     \u23BF ",
        }),
        info.command === "prompt" ? `prompt: ${info.promptText || ""}` : info.command,
        "",
      ],
    },
    `cmd-${idx}`,
  );
}
//@ chunk-wjygkcr4.js:202044-202226 fingerprint (2.1.88 match: _temp3, 0.718)
function renderStopHookCommandLineCompact(info, idx) {
  return jsxProd_default_2(
    Text,
    {
      dimColor: true,
      children: [
        jsxProd_default(Text, {
          "aria-hidden": true,
          children: "\u23BF \xA0",
        }),
        info.command === "prompt" ? `prompt: ${info.promptText || ""}` : info.command,
        "",
      ],
    },
    `cmd-${idx}`,
  );
}
//@ chunk-wjygkcr4.js:202226-202372 layout
function renderStopHookFeedbackLine(line, index) {
  return jsxProd_default_2(
    Text,
    {
      children: [
        jsxProd_default(Text, {
          "aria-hidden": true,
          dimColor: true,
          children: "\u23BF \xA0",
        }),
        "Stop hook feedback: ",
        line,
      ],
    },
    `feedback-${index}`,
  );
}
//@ chunk-wjygkcr4.js:202372-202481 placement
function agentRef(agent) {
  return {
    id: agent.id,
    agentType: agent.agentType,
    ...(agent.toolUseId !== undefined && {
      tool_use_id: agent.toolUseId,
    }),
  };
}
//@ chunk-wjygkcr4.js:202481-202660 layout
function getBackgroundTasksPillLabel(state) {
  let isCoordinatorPanelOn = isCoordinatorPanelActive();
  let filtered = Object.values(state.tasks).filter(
    (task) => shouldHideTasksFooter(task) && !(isCoordinatorPanelOn && isIdleTeammateTask(task)),
  );
  let remoteTasks = countNonAmbientTasks(state.remoteBackgroundTasks);
  return filtered.length + remoteTasks.length > 0 ? getPillLabelWithExtra(filtered, remoteTasks) : null;
}
//@ chunk-wjygkcr4.js:202660-202698 layout
function isLivelyAvalancheEnabled() {
  return readFlagWithOverride(TENGU_LIVELY_AVALANCHE, {
    safe: true,
  });
}
//@ chunk-wjygkcr4.js:202698-202718 layout
var memoryQualifierApi = null;
var accountMemoryModule = null;
//@ chunk-wjygkcr4.js:202718-207420 fingerprint (2.1.88 match: SystemTextMessage, 0.561)
/**
 * 系统消息分派：turn_duration（"Worked for …"、预算/后台 agent）、memory_saved/account_memory_saved、away_summary、agents_killed、stop_hook_summary（"Ran N hooks"）、bridge_status（"/remote-control is active"）、api_error、model_fallback/model_refusal_*、permission_denied/permission_retry、scheduled_task_fire、cloud_session_status 等；其余按 level 着色显示文本。
 */
function SystemTextMessage(props) {
  let $ = useMemoCache(65);
  let { message, addMargin, verbose, isTranscriptMode } = props;
  if (message.subtype === "turn_duration") {
    const isExpanded = verbose || isTranscriptMode === true;
    let turnDurationRowElement;
    if ($[0] !== addMargin || $[1] !== message || $[2] !== isExpanded) {
      turnDurationRowElement = jsxProd_default(TurnDurationRow, {
        message,
        addMargin,
        isExpanded,
      });
      $[0] = addMargin;
      $[1] = message;
      $[2] = isExpanded;
      $[3] = turnDurationRowElement;
    } else turnDurationRowElement = $[3];
    return turnDurationRowElement;
  }
  if (message.subtype === "memory_saved") {
    const verbose_2 = verbose || !!isTranscriptMode;
    let memorySavedMessageElement;
    if ($[4] !== addMargin || $[5] !== message || $[6] !== verbose_2) {
      memorySavedMessageElement = jsxProd_default(MemorySavedMessage, {
        message,
        addMargin,
        verbose: verbose_2,
      });
      $[4] = addMargin;
      $[5] = message;
      $[6] = verbose_2;
      $[7] = memorySavedMessageElement;
    } else memorySavedMessageElement = $[7];
    return memorySavedMessageElement;
  }
  if (message.subtype === "account_memory_saved") {
    let accountMemoryElement;
    if ($[8] !== addMargin || $[9] !== message) {
      accountMemoryElement =
        accountMemoryModule === null
          ? null
          : jsxProd_default(accountMemoryModule.AccountMemorySavedMessage, {
              message,
              addMargin,
            });
      $[8] = addMargin;
      $[9] = message;
      $[10] = accountMemoryElement;
    } else accountMemoryElement = $[10];
    return accountMemoryElement;
  }
  if (message.subtype === "away_summary") {
    let thinkingMessageElement;
    if ($[11] !== addMargin || $[12] !== message.content) {
      thinkingMessageElement = jsxProd_default(ThinkingMessage, {
        content: message.content,
        addMargin,
      });
      $[11] = addMargin;
      $[12] = message.content;
      $[13] = thinkingMessageElement;
    } else thinkingMessageElement = $[13];
    return thinkingMessageElement;
  }
  if (message.subtype === "agents_killed") {
    const marginTop = addMargin ? 1 : 0;
    let t2;
    let turnDurationElement;
    if ($[14] === MEMO_CACHE_SENTINEL) {
      t2 = jsxProd_default(Box, {
        minWidth: 2,
        children: jsxProd_default(Text, {
          "aria-hidden": true,
          color: "error",
          children: BLACK_CIRCLE,
        }),
      });
      turnDurationElement = jsxProd_default(Text, {
        dimColor: true,
        children: "All background agents stopped",
      });
      $[14] = t2;
      $[15] = turnDurationElement;
    } else {
      t2 = $[14];
      turnDurationElement = $[15];
    }
    let t4;
    if ($[16] !== marginTop) {
      t4 = jsxProd_default_2(Box, {
        flexDirection: "row",
        marginTop,
        width: "100%",
        children: [t2, turnDurationElement],
      });
      $[16] = marginTop;
      $[17] = t4;
    } else t4 = $[17];
    return t4;
  }
  if (message.subtype === "thinking") {
    return null;
  }
  if (message.subtype === "model_refusal_no_fallback") {
    return null;
  }
  if (isRefusalFallbackEnabled() && message.subtype === "model_refusal_fallback") {
    const marginTop = addMargin ? 1 : 0;
    let memorySavedElement;
    if ($[18] === MEMO_CACHE_SENTINEL) {
      memorySavedElement = jsxProd_default(Box, {
        minWidth: 2,
        children: jsxProd_default(Text, {
          "aria-label": "warning:",
          color: "warning",
          children: BLACK_CIRCLE,
        }),
      });
      $[18] = memorySavedElement;
    } else memorySavedElement = $[18];
    let stopHookElement;
    if ($[19] !== message.content) {
      stopHookElement = jsxProd_default_2(Box, {
        flexDirection: "row",
        width: "100%",
        children: [
          memorySavedElement,
          jsxProd_default(LinkifiedText, {
            color: "warning",
            bold: true,
            children: message.content,
          }),
        ],
      });
      $[19] = message.content;
      $[20] = stopHookElement;
    } else stopHookElement = $[20];
    let bridgeElement;
    if ($[21] !== message.scope) {
      bridgeElement =
        message.scope !== "local" &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            jsxProd_default(Text, {
              "aria-hidden": true,
              children: "  \u23BF  ",
            }),
            "Tip: You can configure model switch behavior in /config",
          ],
        });
      $[21] = message.scope;
      $[22] = bridgeElement;
    } else bridgeElement = $[22];
    let t3;
    if ($[23] !== marginTop || $[24] !== stopHookElement || $[25] !== bridgeElement) {
      t3 = jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop,
        width: "100%",
        children: [stopHookElement, bridgeElement, false],
      });
      $[23] = marginTop;
      $[24] = stopHookElement;
      $[25] = bridgeElement;
      $[26] = t3;
    } else t3 = $[26];
    return t3;
  }
  if (message.subtype === "model_fallback") {
    let bold = message.trigger === "model_not_found" || message.trigger === "permission_denied";
    const marginTop = addMargin ? 1 : 0;
    let innerElement;
    if ($[27] === MEMO_CACHE_SENTINEL) {
      innerElement = jsxProd_default(Box, {
        minWidth: 2,
        children: jsxProd_default(Text, {
          "aria-label": "warning:",
          color: "warning",
          children: BLACK_CIRCLE,
        }),
      });
      $[27] = innerElement;
    } else innerElement = $[27];
    let containerElement;
    if ($[28] !== bold || $[29] !== message.content) {
      containerElement = jsxProd_default(Text, {
        color: "warning",
        bold,
        wrap: "wrap",
        children: message.content,
      });
      $[28] = bold;
      $[29] = message.content;
      $[30] = containerElement;
    } else containerElement = $[30];
    let wrappedElement;
    if ($[31] !== marginTop || $[32] !== containerElement) {
      wrappedElement = jsxProd_default_2(Box, {
        flexDirection: "row",
        marginTop,
        width: "100%",
        children: [innerElement, containerElement],
      });
      $[31] = marginTop;
      $[32] = containerElement;
      $[33] = wrappedElement;
    } else wrappedElement = $[33];
    return wrappedElement;
  }
  if (message.subtype === "bridge_status") {
    let bridgeStatusMessageElement;
    if ($[34] !== addMargin || $[35] !== message) {
      bridgeStatusMessageElement = jsxProd_default(BridgeStatusMessage, {
        message,
        addMargin,
      });
      $[34] = addMargin;
      $[35] = message;
      $[36] = bridgeStatusMessageElement;
    } else bridgeStatusMessageElement = $[36];
    return bridgeStatusMessageElement;
  }
  if (message.subtype === "cloud_session_status") {
    let t1;
    if ($[37] !== addMargin || $[38] !== message) {
      t1 = jsxProd_default(RemoteSessionLinkMessage, {
        message,
        addMargin,
      });
      $[37] = addMargin;
      $[38] = message;
      $[39] = t1;
    } else t1 = $[39];
    return t1;
  }
  if (message.subtype === "scheduled_task_fire") {
    const marginTop = addMargin ? 1 : 0;
    let rowElement;
    if ($[40] === MEMO_CACHE_SENTINEL) {
      rowElement = jsxProd_default_2(Text, {
        "aria-hidden": true,
        children: [TEARDROP_ASTERISK, " "],
      });
      $[40] = rowElement;
    } else rowElement = $[40];
    let children;
    if ($[41] !== message.content) {
      children = jsxProd_default_2(Text, {
        dimColor: true,
        children: [rowElement, message.content],
      });
      $[41] = message.content;
      $[42] = children;
    } else children = $[42];
    let columnElement;
    if ($[43] !== marginTop || $[44] !== children) {
      columnElement = jsxProd_default(Box, {
        marginTop,
        width: "100%",
        children,
      });
      $[43] = marginTop;
      $[44] = children;
      $[45] = columnElement;
    } else columnElement = $[45];
    return columnElement;
  }
  if (message.subtype === "permission_retry") {
    let commands = message.commands;
    let content = message.content;
    let outerElement;
    let innerElement;
    if (
      $[46] !== addMargin ||
      $[47] !== commands ||
      $[48] !== content ||
      $[49] !== message.heardAtNextPrompt
    ) {
      innerElement = EARLY_RETURN_SENTINEL;
      G: {
        let validStringArray = getValidStringArray(commands);
        let joined = validStringArray.join(", ");
        let contentText = typeof content === "string" ? content : "";
        if (joined.length === 0 && contentText.length === 0) {
          innerElement = null;
          break G;
        }
        let hintElement;
        if ($[52] === MEMO_CACHE_SENTINEL) {
          hintElement = jsxProd_default_2(Text, {
            "aria-hidden": true,
            dimColor: true,
            children: [TEARDROP_ASTERISK, " "],
          });
          $[52] = hintElement;
        } else hintElement = $[52];
        outerElement = jsxProd_default_2(Box, {
          marginTop: addMargin ? 1 : 0,
          width: "100%",
          children: [
            hintElement,
            joined.length > 0
              ? jsxProd_default_2(Text, {
                  children: [
                    permissionRetryText(message.heardAtNextPrompt === true),
                    " ",
                    jsxProd_default(Text, {
                      bold: true,
                      children: joined,
                    }),
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      children: [". ", autoModeRetrySuffix(validStringArray.length)],
                    }),
                  ],
                })
              : jsxProd_default(Text, {
                  children: contentText,
                }),
          ],
        });
      }
      $[46] = addMargin;
      $[47] = commands;
      $[48] = content;
      $[49] = message.heardAtNextPrompt;
      $[50] = outerElement;
      $[51] = innerElement;
    } else {
      outerElement = $[50];
      innerElement = $[51];
    }
    if (innerElement !== EARLY_RETURN_SENTINEL) return innerElement;
    return outerElement;
  }
  if (message.subtype === "placed") {
    return null;
  }
  if (message.subtype !== "stop_hook_summary" && !verbose && message.level === "info") {
    return null;
  }
  if (message.subtype === "api_error") {
    return null;
  }
  if (message.subtype === "stop_hook_summary") {
    let stopHookSummaryMessageElement;
    if ($[53] !== addMargin || $[54] !== isTranscriptMode || $[55] !== message || $[56] !== verbose) {
      stopHookSummaryMessageElement = jsxProd_default(StopHookSummaryMessage, {
        message,
        addMargin,
        verbose,
        isTranscriptMode,
      });
      $[53] = addMargin;
      $[54] = isTranscriptMode;
      $[55] = message;
      $[56] = verbose;
      $[57] = stopHookSummaryMessageElement;
    } else stopHookSummaryMessageElement = $[57];
    return stopHookSummaryMessageElement;
  }
  let content = message.content;
  if (typeof content !== "string") {
    return null;
  }
  const dot = message.level !== "info";
  const color = message.level === "warning" ? "warning" : message.level === "notice" ? "inactive" : undefined;
  const highlight = message.subtype === "informational" ? message.highlight : undefined;
  const dimColor = message.level === "info";
  let t4;
  if (
    $[58] !== addMargin ||
    $[59] !== content ||
    $[60] !== dot ||
    $[61] !== color ||
    $[62] !== highlight ||
    $[63] !== dimColor
  ) {
    t4 = jsxProd_default(Box, {
      flexDirection: "row",
      width: "100%",
      children: jsxProd_default(SystemTextMessageInner, {
        content,
        addMargin,
        dot,
        color,
        highlight,
        dimColor,
      }),
    });
    $[58] = addMargin;
    $[59] = content;
    $[60] = dot;
    $[61] = color;
    $[62] = highlight;
    $[63] = dimColor;
    $[64] = t4;
  } else t4 = $[64];
  return t4;
}
//@ chunk-wjygkcr4.js:207420-208618 fingerprint (2.1.88 match: StopHookSummaryMessage, 0.765)
function StopHookSummaryMessage(props) {
  let $ = useMemoCache(2);
  let { message, addMargin, verbose, isTranscriptMode } = props;
  let {
    hookCount,
    hookInfos,
    hookErrors,
    hookAdditionalContext,
    preventedContinuation,
    stopReason,
    hookLabel,
    totalDurationMs,
  } = normalizeHookSummary(message);
  let additionalContext = hookAdditionalContext === undefined ? [] : hookAdditionalContext;
  let { columns } = useTerminalSize();
  totalDurationMs ?? hookInfos.reduce(sumDurationMs, 0);
  if (hookErrors.length === 0 && additionalContext.length === 0 && !preventedContinuation && !hookLabel) {
    return null;
  }
  if (hookLabel) {
    let textElement;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      textElement = jsxProd_default(Text, {
        "aria-hidden": true,
        children: "  \u23BF  ",
      });
      $[0] = textElement;
    } else textElement = $[0];
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      width: "100%",
      children: [
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            textElement,
            "Ran ",
            hookCount,
            " ",
            hookLabel,
            " ",
            hookCount === 1 ? "hook" : "hooks",
            "",
          ],
        }),
        isTranscriptMode && hookInfos.map(renderStopHookCommandLine),
      ],
    });
  }
  let boxElement;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    boxElement = jsxProd_default(Box, {
      minWidth: 2,
      children: jsxProd_default(Text, {
        "aria-hidden": true,
        children: BLACK_CIRCLE,
      }),
    });
    $[1] = boxElement;
  } else boxElement = $[1];
  return jsxProd_default_2(Box, {
    flexDirection: "row",
    marginTop: addMargin ? 1 : 0,
    width: "100%",
    children: [
      boxElement,
      jsxProd_default_2(Box, {
        flexDirection: "column",
        width: columns - 10,
        children: [
          jsxProd_default_2(Text, {
            children: [
              "Ran ",
              jsxProd_default(Text, {
                bold: true,
                children: hookCount,
              }),
              " ",
              hookLabel ?? "stop",
              " ",
              hookCount === 1 ? "hook" : "hooks",
              "",
              !verbose &&
                hookInfos.length > 0 &&
                jsxProd_default_2(Fragment, {
                  children: [" ", jsxProd_default(CtrlOToExpand, {})],
                }),
            ],
          }),
          verbose && hookInfos.length > 0 && hookInfos.map(renderStopHookCommandLineCompact),
          preventedContinuation &&
            stopReason &&
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default(Text, {
                  "aria-hidden": true,
                  dimColor: true,
                  children: "\u23BF \xA0",
                }),
                stopReason,
              ],
            }),
          hookErrors.length > 0 &&
            hookErrors.map((err, idx) =>
              jsxProd_default_2(
                Text,
                {
                  children: [
                    jsxProd_default(Text, {
                      "aria-hidden": true,
                      dimColor: true,
                      children: "\u23BF \xA0",
                    }),
                    hookLabel ?? "Stop",
                    " hook error: ",
                    err,
                  ],
                },
                idx,
              ),
            ),
          additionalContext.length > 0 && additionalContext.map(renderStopHookFeedbackLine),
        ],
      }),
    ],
  });
}
//@ chunk-wjygkcr4.js:208618-209571 fingerprint (2.1.88 match: SystemTextMessageInner, 0.72)
function SystemTextMessageInner(props) {
  let $ = useMemoCache(19);
  let { content, addMargin, dot, color, dimColor, highlight } = props;
  let { columns } = useTerminalSize();
  let trimmed = content.trim();
  let [shimmerOffset, setShimmerOffset] = useShimmerOffset(highlight ? trimmed.length : 0);
  let [firstLine] = trimmed.split(`
`);
  if (firstLine === undefined) "";
  else firstLine;
  const marginTop = addMargin ? 1 : 0;
  let dotElement;
  if ($[0] !== color || $[1] !== dimColor || $[2] !== dot || $[3] !== highlight?.color) {
    dotElement =
      dot &&
      jsxProd_default(Box, {
        minWidth: 2,
        children: jsxProd_default(Text, {
          "aria-hidden": true,
          color: highlight?.color ?? color,
          dimColor,
          children: BLACK_CIRCLE,
        }),
      });
    $[0] = color;
    $[1] = dimColor;
    $[2] = dot;
    $[3] = highlight?.color;
    $[4] = dotElement;
  } else dotElement = $[4];
  const width = columns - 10;
  let children;
  if (
    $[5] !== color ||
    $[6] !== dimColor ||
    $[7] !== setShimmerOffset ||
    $[8] !== highlight ||
    $[9] !== trimmed
  ) {
    children = highlight
      ? jsxProd_default(ShimmerText, {
          text: trimmed,
          color: highlight.color,
          shimmerColor: highlight.shimmerColor,
          glimmerIndex: setShimmerOffset,
        })
      : jsxProd_default(Text, {
          color,
          dimColor,
          wrap: "wrap",
          children: trimmed,
        });
    $[5] = color;
    $[6] = dimColor;
    $[7] = setShimmerOffset;
    $[8] = highlight;
    $[9] = trimmed;
    $[10] = children;
  } else children = $[10];
  let t6;
  if ($[11] !== width || $[12] !== children) {
    t6 = jsxProd_default(Box, {
      flexDirection: "column",
      width,
      children,
    });
    $[11] = width;
    $[12] = children;
    $[13] = t6;
  } else t6 = $[13];
  let t7;
  if ($[14] !== shimmerOffset || $[15] !== marginTop || $[16] !== dotElement || $[17] !== t6) {
    t7 = jsxProd_default_2(Box, {
      ref: shimmerOffset,
      flexDirection: "row",
      marginTop,
      width: "100%",
      children: [dotElement, t6],
    });
    $[14] = shimmerOffset;
    $[15] = marginTop;
    $[16] = dotElement;
    $[17] = t6;
    $[18] = t7;
  } else t7 = $[18];
  return t7;
}
//@ chunk-wjygkcr4.js:209571-211281 layout
function TurnDurationRow(props) {
  let $ = useMemoCache(21);
  let { message, addMargin, isExpanded } = props;
  let uuid = hasStringUuid(message) ? message.uuid : "";
  let verb;
  if ($[0] !== uuid) {
    verb = pickTurnCompletionVerb(uuid);
    $[0] = uuid;
    $[1] = verb;
  } else verb = $[1];
  let durationText = verb;
  let appStoreDirect = useAppStoreDirect();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let durationElement;
  if (
    $[2] !== message.briefHiddenCount ||
    $[3] !== message.budgetLimit ||
    $[4] !== message.pendingBackgroundAgentCount ||
    $[5] !== message.pendingWorkflowCount ||
    $[6] !== message.timestamp ||
    $[7] !== commandQueueOrDefault ||
    $[8] !== appStoreDirect
  ) {
    durationElement = () => {
      let hintElement = {
        tasks: appStoreDirect.getState().tasks,
        queuedCommands: commandQueueOrDefault.getCommandQueue(),
      };
      let titleElement = countPendingBackgroundWork(hintElement);
      let titleRow = titleElement.pendingAgents > 0;
      let rowBox = titleElement.pendingWorkflows > 0;
      let detailElement = resolveSetting("showTurnDuration", true).value;
      let columnElement = titleRow ? (message.pendingBackgroundAgentCount ?? 0) : 0;
      let containerElement = rowBox ? (message.pendingWorkflowCount ?? 0) : 0;
      let timestamp = Date.parse(message.timestamp);
      let filtered = (columnElement > 0 ? listPendingBackgroundAgents(hintElement) : []).filter(
        (state) => state.startTime <= timestamp,
      );
      let resultElement =
        detailElement &&
        (columnElement > 0 || containerElement > 0) &&
        message.budgetLimit === undefined &&
        (message.briefHiddenCount ?? 0) === 0 &&
        filtered.length === columnElement;
      return {
        hasPendingAgents: titleRow,
        hasPendingWorkflows: rowBox,
        showTurnDuration: detailElement,
        doneAt: formatBriefTimestamp(message.timestamp),
        waitingFor: resultElement
          ? {
              agents: filtered.map(agentRef),
              workflows: containerElement,
            }
          : undefined,
      };
    };
    $[2] = message.briefHiddenCount;
    $[3] = message.budgetLimit;
    $[4] = message.pendingBackgroundAgentCount;
    $[5] = message.pendingWorkflowCount;
    $[6] = message.timestamp;
    $[7] = commandQueueOrDefault;
    $[8] = appStoreDirect;
    $[9] = durationElement;
  } else durationElement = $[9];
  let [durationMemo] = useState(durationElement);
  let hintElement;
  let rowElement;
  if (
    $[10] !== isExpanded ||
    $[11] !== message.durationMs ||
    $[12] !== uuid ||
    $[13] !== durationMemo.waitingFor ||
    $[14] !== durationText
  ) {
    hintElement = () => ({
      requestId: uuid,
      props: {
        word: durationText,
        durationMs: message.durationMs,
        isExpanded,
        ...(durationMemo.waitingFor !== undefined && {
          waitingFor: durationMemo.waitingFor,
        }),
      },
    });
    rowElement = [durationText, uuid, message.durationMs, isExpanded, durationMemo.waitingFor];
    $[10] = isExpanded;
    $[11] = message.durationMs;
    $[12] = uuid;
    $[13] = durationMemo.waitingFor;
    $[14] = durationText;
    $[15] = hintElement;
    $[16] = rowElement;
  } else {
    hintElement = $[15];
    rowElement = $[16];
  }
  let renderInput = actionKeysNamespace.useRenderInput("TurnDuration", hintElement, rowElement);
  let renderHook;
  if ($[17] !== addMargin || $[18] !== message || $[19] !== durationMemo) {
    renderHook = (args) =>
      jsxProd_default(TurnDurationMessage, {
        message:
          args.props.durationMs === message.durationMs
            ? message
            : {
                ...message,
                durationMs: args.props.durationMs,
              },
        addMargin,
        verb: args.props.word,
        snapshot: durationMemo,
      });
    $[17] = addMargin;
    $[18] = message;
    $[19] = durationMemo;
    $[20] = renderHook;
  } else renderHook = $[20];
  return actionKeysNamespace.useRenderHook(renderInput, renderHook);
}
//@ chunk-wjygkcr4.js:211281-213640 fingerprint (2.1.88 match: TurnDurationMessage, 0.466)
/**
 * 回合耗时消息："✻ <随机完成动词> for Xm Ys"，附带 token 用量、提醒（nudge）计数与仍在后台运行的 agent/工作流数。
 */
function TurnDurationMessage(props) {
  let $ = useMemoCache(33);
  let { message, addMargin, verb, snapshot } = props;
  let { hasPendingAgents, hasPendingWorkflows, showTurnDuration, doneAt } = snapshot;
  let appState = useAppState(getBackgroundTasksPillLabel);
  let durationText;
  if ($[0] !== message.durationMs) {
    durationText = formatDuration(message.durationMs);
    $[0] = message.durationMs;
    $[1] = durationText;
  } else durationText = $[1];
  let durationText_2 = durationText;
  let hasBudget = message.budgetLimit !== undefined;
  let budgetPart;
  W: {
    if (!hasBudget) {
      budgetPart = null;
      break W;
    }
    let tokens = message.budgetTokens;
    let limit = message.budgetLimit;
    let budgetText;
    if ($[2] !== limit || $[3] !== tokens) {
      budgetText =
        tokens >= limit
          ? jsxProd_default_2(Text, {
              children: [
                formatNumber(tokens),
                " used (",
                formatNumber(limit),
                " min",
                jsxProd_default_2(Text, {
                  "aria-hidden": true,
                  children: [" ", figures_default.tick],
                }),
                ")",
              ],
            })
          : `${formatNumber(tokens)} / ${formatNumber(limit)} (${Math.round((tokens / limit) * 100)}%)`;
      $[2] = limit;
      $[3] = tokens;
      $[4] = budgetText;
    } else budgetText = $[4];
    let budgetText_2 = budgetText;
    let nudgeSuffix =
      message.budgetNudges > 0
        ? ` \xB7 ${message.budgetNudges} ${message.budgetNudges === 1 ? "nudge" : "nudges"}`
        : "";
    const leadingSep = showTurnDuration ? " \xB7 " : "";
    let budgetFragment;
    if ($[5] !== nudgeSuffix || $[6] !== leadingSep || $[7] !== budgetText_2) {
      budgetFragment = jsxProd_default_2(Fragment, {
        children: [leadingSep, budgetText_2, nudgeSuffix],
      });
      $[5] = nudgeSuffix;
      $[6] = leadingSep;
      $[7] = budgetText_2;
      $[8] = budgetFragment;
    } else budgetFragment = $[8];
    budgetPart = budgetFragment;
  }
  let budgetFragment_2 = budgetPart;
  let briefHiddenCount = message.briefHiddenCount ?? 0;
  let hiddenSuffix =
    briefHiddenCount > 0
      ? `${showTurnDuration || hasBudget ? " \xB7 " : ""}${briefHiddenCount} ${briefHiddenCount === 1 ? "message" : "messages"} hidden (/focus to show)`
      : "";
  let isEmpty = !showTurnDuration && !hasBudget && !hiddenSuffix;
  let pendingAgents = hasPendingAgents ? (message.pendingBackgroundAgentCount ?? 0) : 0;
  let pendingWorkflows = hasPendingWorkflows ? (message.pendingWorkflowCount ?? 0) : 0;
  let hasPending = pendingAgents > 0 || pendingWorkflows > 0;
  let agentsText;
  if ($[9] !== pendingAgents) {
    agentsText =
      pendingAgents > 0 &&
      jsxProd_default_2(Text, {
        children: [
          " ",
          jsxProd_default(Text, {
            bold: true,
            dimColor: true,
            children: pendingAgents,
          }),
          ` background ${pendingAgents === 1 ? "agent" : "agents"}`,
        ],
      });
    $[9] = pendingAgents;
    $[10] = agentsText;
  } else agentsText = $[10];
  const andText = pendingAgents > 0 && pendingWorkflows > 0 && " and";
  let workflowsText;
  if ($[11] !== pendingWorkflows) {
    workflowsText =
      pendingWorkflows > 0 &&
      jsxProd_default_2(Text, {
        children: [
          " ",
          jsxProd_default(Text, {
            bold: true,
            dimColor: true,
            children: pendingWorkflows,
          }),
          ` ${pendingWorkflows === 1 ? "dynamic workflow" : "dynamic workflows"}`,
        ],
      });
    $[11] = pendingWorkflows;
    $[12] = workflowsText;
  } else workflowsText = $[12];
  let waitingText;
  if ($[13] !== agentsText || $[14] !== andText || $[15] !== workflowsText) {
    waitingText = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Waiting for", agentsText, andText, workflowsText, " to finish"],
    });
    $[13] = agentsText;
    $[14] = andText;
    $[15] = workflowsText;
    $[16] = waitingText;
  } else waitingText = $[16];
  let waitingText_2 = waitingText;
  let waitingShown = showTurnDuration && hasPending;
  let content;
  if (
    $[17] !== addMargin ||
    $[18] !== appState ||
    $[19] !== budgetFragment_2 ||
    $[20] !== doneAt ||
    $[21] !== durationText_2 ||
    $[22] !== hiddenSuffix ||
    $[23] !== isEmpty ||
    $[24] !== hasPending ||
    $[25] !== showTurnDuration ||
    $[26] !== waitingShown ||
    $[27] !== verb ||
    $[28] !== waitingText_2
  ) {
    content = isEmpty
      ? null
      : jsxProd_default_2(Box, {
          flexDirection: "row",
          marginTop: addMargin ? 1 : 0,
          width: "100%",
          children: [
            jsxProd_default(Box, {
              minWidth: 2,
              children: jsxProd_default(Text, {
                "aria-hidden": true,
                dimColor: true,
                children: TEARDROP_ASTERISK,
              }),
            }),
            jsxProd_default_2(Text, {
              children: [
                showTurnDuration &&
                  (hasPending
                    ? waitingText_2
                    : jsxProd_default(Text, {
                        dimColor: true,
                        children: `${verb} for ${durationText_2}${doneAt ? ` \xB7 done ${doneAt}` : ""}`,
                      })),
                budgetFragment_2 &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: budgetFragment_2,
                  }),
                hiddenSuffix &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: hiddenSuffix,
                  }),
                !waitingShown &&
                  appState &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: ` \xB7 ${appState} still running`,
                  }),
              ],
            }),
          ],
        });
    $[17] = addMargin;
    $[18] = appState;
    $[19] = budgetFragment_2;
    $[20] = doneAt;
    $[21] = durationText_2;
    $[22] = hiddenSuffix;
    $[23] = isEmpty;
    $[24] = hasPending;
    $[25] = showTurnDuration;
    $[26] = waitingShown;
    $[27] = verb;
    $[28] = waitingText_2;
    $[29] = content;
  } else content = $[29];
  let contentOrNull = content;
  let [measureRef, frozenContent] = useFrozenValue(contentOrNull);
  let container;
  if ($[30] !== frozenContent || $[31] !== measureRef) {
    container = jsxProd_default(Box, {
      ref: measureRef,
      flexDirection: "column",
      width: "100%",
      children: frozenContent,
    });
    $[30] = frozenContent;
    $[31] = measureRef;
    $[32] = container;
  } else container = $[32];
  return container;
}
//@ chunk-wjygkcr4.js:213640-213672 layout
var TENGU_LIVELY_AVALANCHE = "tengu_lively_avalanche";
//@ chunk-wjygkcr4.js:213672-214864 fingerprint (2.1.88 match: MemorySavedMessage, 0.628)
function MemorySavedMessage(props) {
  let $ = useMemoCache(18);
  let { message, addMargin, verbose } = props;
  let validStringArray = getValidStringArray(message.writtenPaths);
  let verb;
  if ($[0] !== message) {
    verb = getMemorySavedVerb(message);
    $[0] = message;
    $[1] = verb;
  } else verb = $[1];
  let parts = verb;
  let pathElement = renderWithForceUpdate(isLivelyAvalancheEnabled);
  let pathText = pathElement ? getAutoMemPathOrNull() : null;
  let headlineElement;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    headlineElement = getPlatform();
    $[2] = headlineElement;
  } else headlineElement = $[2];
  let headlineText = headlineElement;
  let headerRow = headlineText !== "windows" && headlineText !== "wsl";
  let countElement;
  if ($[3] !== message) {
    countElement = teamMemSavedPart(message);
    $[3] = message;
    $[4] = countElement;
  } else countElement = $[4];
  let noticeRow = countElement;
  let privateCount = validStringArray.length - (noticeRow?.count ?? 0);
  let localQualifier;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    localQualifier = memoryQualifierApi?.localMemoryQualifier() ?? "";
    $[5] = localQualifier;
  } else localQualifier = $[5];
  let bodyElement = localQualifier;
  const columnElement =
    privateCount > 0 ? `${privateCount} ${bodyElement}${privateCount === 1 ? "memory" : "memories"}` : null;
  const segment = noticeRow?.segment;
  let t4;
  if ($[6] !== columnElement || $[7] !== segment) {
    t4 = [columnElement, segment].filter(Boolean);
    $[6] = columnElement;
    $[7] = segment;
    $[8] = t4;
  } else t4 = $[8];
  let parts_2 = t4;
  const containerElement = Box;
  const flexDirection = "column";
  const marginTop = addMargin ? 1 : 0;
  let t6;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    t6 = jsxProd_default(Box, {
      minWidth: 2,
      children: jsxProd_default(Text, {
        "aria-hidden": true,
        dimColor: true,
        children: BLACK_CIRCLE,
      }),
    });
    $[9] = t6;
  } else t6 = $[9];
  const joined = parts_2.join(" \xB7 ");
  let boxElement;
  if ($[10] !== joined || $[11] !== parts) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        t6,
        jsxProd_default_2(Text, {
          children: [parts, " ", joined],
        }),
      ],
    });
    $[10] = joined;
    $[11] = parts;
    $[12] = boxElement;
  } else boxElement = $[12];
  const outerElement =
    verbose &&
    validStringArray.map((validString) => {
      if (!pathElement) {
        return jsxProd_default(
          MemoryFileRow,
          {
            path: validString,
          },
          validString,
        );
      }
      return headerRow && pathText !== null && isAllowedAutoMemWritePath(validString, pathText)
        ? jsxProd_default(
            MemoryFileRow,
            {
              path: normalize(validString),
            },
            validString,
          )
        : jsxProd_default(
            MemoryFilePath,
            {
              path: validString,
            },
            validString,
          );
    });
  let t11;
  if ($[13] !== containerElement || $[14] !== boxElement || $[15] !== outerElement || $[16] !== marginTop) {
    t11 = jsxProd_default_2(containerElement, {
      flexDirection,
      marginTop,
      children: [boxElement, outerElement],
    });
    $[13] = containerElement;
    $[14] = boxElement;
    $[15] = outerElement;
    $[16] = marginTop;
    $[17] = t11;
  } else t11 = $[17];
  return t11;
}
//@ chunk-wjygkcr4.js:214864-215235 file-local
function MemoryFilePath(p) {
  let $ = useMemoCache(12);
  let { path } = p;
  let textComponent;
  let wrapperComponent;
  let dimColor;
  let children;
  if ($[0] !== path) {
    let baseName = basename(path);
    wrapperComponent = MessageResponse;
    textComponent = Text;
    dimColor = true;
    children = hasControlChars(baseName) ? HIDDEN_PATH_PLACEHOLDER : baseName;
    $[0] = path;
    $[1] = textComponent;
    $[2] = wrapperComponent;
    $[3] = dimColor;
    $[4] = children;
  } else {
    textComponent = $[1];
    wrapperComponent = $[2];
    dimColor = $[3];
    children = $[4];
  }
  let children_2;
  if ($[5] !== textComponent || $[6] !== dimColor || $[7] !== children) {
    children_2 = jsxProd_default(textComponent, {
      dimColor,
      children,
    });
    $[5] = textComponent;
    $[6] = dimColor;
    $[7] = children;
    $[8] = children_2;
  } else children_2 = $[8];
  let wrapperElement;
  if ($[9] !== wrapperComponent || $[10] !== children_2) {
    wrapperElement = jsxProd_default(wrapperComponent, {
      children: children_2,
    });
    $[9] = wrapperComponent;
    $[10] = children_2;
    $[11] = wrapperElement;
  } else wrapperElement = $[11];
  return wrapperElement;
}
//@ chunk-wjygkcr4.js:215235-215856 fingerprint (2.1.88 match: MemoryFileRow, 0.734)
function MemoryFileRow(props) {
  let $ = useMemoCache(16);
  let { path } = props;
  let [hover, setHover] = useState(false);
  let onClick;
  if ($[0] !== path) {
    onClick = () => void openPath(path);
    $[0] = path;
    $[1] = onClick;
  } else onClick = $[1];
  let onMouseEnter;
  let onMouseLeave;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setHover(true);
    onMouseLeave = () => setHover(false);
    $[2] = onMouseEnter;
    $[3] = onMouseLeave;
  } else {
    onMouseEnter = $[2];
    onMouseLeave = $[3];
  }
  const dimColor = !hover;
  let children;
  if ($[4] !== path) {
    children = basename(path);
    $[4] = path;
    $[5] = children;
  } else children = $[5];
  let children_2;
  if ($[6] !== path || $[7] !== children) {
    children_2 = jsxProd_default(FilePathLink, {
      filePath: path,
      children,
    });
    $[6] = path;
    $[7] = children;
    $[8] = children_2;
  } else children_2 = $[8];
  let children_3;
  if ($[9] !== hover || $[10] !== dimColor || $[11] !== children_2) {
    children_3 = jsxProd_default(Text, {
      dimColor,
      underline: hover,
      children: children_2,
    });
    $[9] = hover;
    $[10] = dimColor;
    $[11] = children_2;
    $[12] = children_3;
  } else children_3 = $[12];
  let t8;
  if ($[13] !== onClick || $[14] !== children_3) {
    t8 = jsxProd_default(MessageResponse, {
      children: jsxProd_default(Box, {
        onClick,
        onMouseEnter,
        onMouseLeave,
        children: children_3,
      }),
    });
    $[13] = onClick;
    $[14] = children_3;
    $[15] = t8;
  } else t8 = $[15];
  return t8;
}
//@ chunk-wjygkcr4.js:215856-216512 fingerprint (2.1.88 match: BridgeStatusMessage, 0.358)
function BridgeStatusMessage(props) {
  let $ = useMemoCache(8);
  let { message, addMargin } = props;
  let selectBridgeMatch;
  if ($[0] !== message) {
    selectBridgeMatch = (state) =>
      state.replBridgeConnected &&
      !state.replBridgeOutboundOnly &&
      state.replBridgeSessionUrl === message.url;
    $[0] = message;
    $[1] = selectBridgeMatch;
  } else selectBridgeMatch = $[1];
  if (!useAppState(selectBridgeMatch)) {
    return null;
  }
  const marginTop = addMargin ? 1 : 0;
  let iconSpacer;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    iconSpacer = jsxProd_default(Box, {
      minWidth: 2,
    });
    $[2] = iconSpacer;
  } else iconSpacer = $[2];
  let isConnected;
  if ($[3] !== message.url) {
    isConnected = jsxProd_default(Box, {
      flexDirection: "column",
      children: jsxProd_default_2(Text, {
        children: [
          "/remote-control is active",
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              " \xB7 Continue here, on your phone, or at ",
              jsxProd_default(Link, {
                url: message.url,
                children: message.url,
              }),
            ],
          }),
        ],
      }),
    });
    $[3] = message.url;
    $[4] = isConnected;
  } else isConnected = $[4];
  let statusText;
  if ($[5] !== marginTop || $[6] !== isConnected) {
    statusText = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop,
      width: 999,
      children: [iconSpacer, isConnected],
    });
    $[5] = marginTop;
    $[6] = isConnected;
    $[7] = statusText;
  } else statusText = $[7];
  return statusText;
}
//@ chunk-wjygkcr4.js:216512-216516 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:216512", () => {
  init_react_production();
});
//@ chunk-wjygkcr4.js:220642-220646 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:220642", () => {
  init_react_production();
});
export {
  SystemTextMessage,
  CLOUD_SESSION_BANNERS,
  CODE_HERE_OR_AT,
  countPendingBackgroundWork,
  ThinkingMessage,
  computeTurnDurationInfo,
};
