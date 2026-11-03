/**
 * components/messages/SystemTextMessage.tsx
 *
 * 系统消息分派：turn_duration（"Worked for Xm"）、memory_saved、away_summary、agents_killed、stop_hook_summary、bridge_status、api_error、model_fallback、permission_retry 等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/SystemTextMessage.tsx
 * pieces: chunk-ah34pb7m.js (32), chunk-e4xept39.js (1), chunk-e6aww6q8.js (1)
 * attribution: affinity 1, fingerprint 12, placement 8, layout 12, file-local 1
 */
import { normalize, basename } from "path";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppStateSlice, useAppState, useAppStoreDirect } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import {
  REFERENCE_GLYPH,
  BLACK_CIRCLE,
  TEARDROP_ASTERISK,
} from "../../utils/permissions/autoModeRulesPrompt.js";
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
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
import { countNonAmbientTasks } from "../../utils/claudeInChrome/toolRendering.js";
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
import {
  MAX_TOOL_DURATION_ENTRIES,
  encodeToolNameForHeader,
  MAX_TOOL_DURATION_HEADER_CHARS,
} from "../../services/api/compactionHeaders.js";

//@ chunk-ah34pb7m.js:65544-65591 affinity
function selectMaxProseWidth(L) {
  return L.settings.maxProseWidth;
}
//@ chunk-ah34pb7m.js:65591-66292 fingerprint = ThinkingMessage (0.463)
function ThinkingMessage(props) {
  let $ = w(13);
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
  let k;
  if ($[2] !== content) {
    k = jsxProd_default(Text, {
      dimColor: true,
      italic: true,
      children: content,
    });
    $[2] = content;
    $[3] = k;
  } else k = $[3];
  let children;
  if ($[4] !== k || $[5] !== trailer) {
    children = jsxProd_default_2(Text, {
      children: [t3, k, trailer],
    });
    $[4] = k;
    $[5] = trailer;
    $[6] = children;
  } else children = $[6];
  let E;
  if ($[7] !== maxWidth || $[8] !== children) {
    E = jsxProd_default(Box, {
      maxWidth,
      children,
    });
    $[7] = maxWidth;
    $[8] = children;
    $[9] = E;
  } else E = $[9];
  let B;
  if ($[10] !== marginTop || $[11] !== E) {
    B = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop,
      width: "100%",
      children: [t2, E],
    });
    $[10] = marginTop;
    $[11] = E;
    $[12] = B;
  } else B = $[12];
  return B;
}
//@ chunk-ah34pb7m.js:190237-190241 placement
init_react_production();
//@ chunk-ah34pb7m.js:190290-190294 placement
init_react_production();
//@ chunk-ah34pb7m.js:190294-190335 placement
function selectCloudSessionSync(z) {
  return z.cloudSessionSync;
}
//@ chunk-ah34pb7m.js:190335-191287 placement
/**
 * 系统消息：远程会话链接（仅当前远程会话 URL 匹配时显示），并附上同步状态行。
 */
function RemoteSessionLinkMessage(props) {
  let f = w(18);
  let { message, addMargin } = props;
  let { columns } = useTerminalSize();
  let h;
  if (f[0] !== message.url) {
    h = (M) => M.remoteSessionUrl === message.url;
    f[0] = message.url;
    f[1] = h;
  } else h = f[1];
  let appState = useAppState(h);
  let appState_2 = useAppState(selectCloudSessionSync);
  let [k, b] = useFrozenValue(appState_2);
  if (!appState) {
    return null;
  }
  const marginTop = addMargin ? 1 : 0;
  let B;
  if (f[2] === MEMO_CACHE_SENTINEL) {
    B = jsxProd_default(Box, {
      minWidth: 2,
      children: jsxProd_default(Text, {
        "aria-hidden": true,
        color: "inactive",
        children: BLACK_CIRCLE,
      }),
    });
    f[2] = B;
  } else B = f[2];
  const width = columns - 10;
  const N = CLOUD_SESSION_BANNERS[message.entry];
  let W;
  if (f[3] !== message.url) {
    W = jsxProd_default(Link, {
      url: message.url,
      children: message.url,
    });
    f[3] = message.url;
    f[4] = W;
  } else W = f[4];
  let U;
  if (f[5] !== N || f[6] !== W) {
    U = jsxProd_default_2(Text, {
      color: "inactive",
      wrap: "wrap",
      children: [N, CODE_HERE_OR_AT, W],
    });
    f[5] = N;
    f[6] = W;
    f[7] = U;
  } else U = f[7];
  let K;
  if (f[8] !== b) {
    K =
      b !== undefined &&
      jsxProd_default(SyncStatusRows, {
        rows: b,
      });
    f[8] = b;
    f[9] = K;
  } else K = f[9];
  let V;
  if (f[10] !== width || f[11] !== U || f[12] !== K) {
    V = jsxProd_default_2(Box, {
      flexDirection: "column",
      width,
      children: [U, K],
    });
    f[10] = width;
    f[11] = U;
    f[12] = K;
    f[13] = V;
  } else V = f[13];
  let Y;
  if (f[14] !== k || f[15] !== marginTop || f[16] !== V) {
    Y = jsxProd_default_2(Box, {
      ref: k,
      flexDirection: "row",
      marginTop,
      width: "100%",
      children: [B, V],
    });
    f[14] = k;
    f[15] = marginTop;
    f[16] = V;
    f[17] = Y;
  } else Y = f[17];
  return Y;
}
//@ chunk-ah34pb7m.js:191287-192403 placement
/**
 * 远程会话同步状态区块：项目文件、设置、插件、本地工具各一行，以及两行附加说明。
 */
function SyncStatusRows(props) {
  let c = w(24);
  let { rows } = props;
  let g;
  if (c[0] !== rows) {
    g = repositoryTrustNote(rows);
    c[0] = rows;
    c[1] = g;
  } else g = c[1];
  let f = g;
  let h;
  if (c[2] !== rows) {
    h = describeRepositoryTrust(rows);
    c[2] = rows;
    c[3] = h;
  } else h = c[3];
  let M = h;
  let T;
  if (c[4] === MEMO_CACHE_SENTINEL) {
    T = jsxProd_default(Text, {
      color: "inactive",
      children: SYNC_STATUS_HEADING,
    });
    c[4] = T;
  } else T = c[4];
  let x;
  if (c[5] !== rows.projectFiles) {
    x =
      rows.projectFiles !== undefined &&
      jsxProd_default(SyncStatusRow, {
        label: SYNC_ITEM_LABELS.projectFiles,
        row: rows.projectFiles,
      });
    c[5] = rows.projectFiles;
    c[6] = x;
  } else x = c[6];
  let k;
  if (c[7] !== rows.settings) {
    k = jsxProd_default(SyncStatusRow, {
      label: SYNC_ITEM_LABELS.settings,
      row: rows.settings,
    });
    c[7] = rows.settings;
    c[8] = k;
  } else k = c[8];
  let b;
  if (c[9] !== rows.plugins) {
    b = jsxProd_default(SyncStatusRow, {
      label: SYNC_ITEM_LABELS.plugins,
      row: rows.plugins,
    });
    c[9] = rows.plugins;
    c[10] = b;
  } else b = c[10];
  let E;
  if (c[11] !== rows.localTools) {
    E =
      rows.localTools !== undefined &&
      jsxProd_default(SyncStatusRow, {
        label: SYNC_ITEM_LABELS.localTools,
        row: rows.localTools,
      });
    c[11] = rows.localTools;
    c[12] = E;
  } else E = c[12];
  let B;
  if (c[13] !== f) {
    B =
      f !== undefined &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children: f,
      });
    c[13] = f;
    c[14] = B;
  } else B = c[14];
  let L;
  if (c[15] !== M) {
    L =
      M !== undefined &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children: M,
      });
    c[15] = M;
    c[16] = L;
  } else L = c[16];
  let N;
  if (c[17] !== x || c[18] !== k || c[19] !== b || c[20] !== E || c[21] !== B || c[22] !== L) {
    N = jsxProd_default_2(Fragment, {
      children: [T, x, k, b, E, B, L],
    });
    c[17] = x;
    c[18] = k;
    c[19] = b;
    c[20] = E;
    c[21] = B;
    c[22] = L;
    c[23] = N;
  } else N = c[23];
  return N;
}
//@ chunk-ah34pb7m.js:192403-193319 placement
/**
 * 同步状态行：synced 显示成功图标与备注，pending 显示加载，not_synced 显示叉号与原因。
 */
function SyncStatusRow(props) {
  let g = w(15);
  let { label, row } = props;
  switch (row.mark) {
    case "synced": {
      let f;
      if (g[0] === MEMO_CACHE_SENTINEL) {
        f = jsxProd_default(StatusIcon, {
          status: "success",
          withSpace: true,
        });
        g[0] = f;
      } else f = g[0];
      let h;
      if (g[1] !== row.note) {
        h =
          row.note !== undefined &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [" (", row.note, ")"],
          });
        g[1] = row.note;
        g[2] = h;
      } else h = g[2];
      let M;
      if (g[3] !== label || g[4] !== h) {
        M = jsxProd_default_2(Text, {
          color: "inactive",
          children: [f, label, h],
        });
        g[3] = label;
        g[4] = h;
        g[5] = M;
      } else M = g[5];
      return M;
    }
    case "pending": {
      let f;
      if (g[6] === MEMO_CACHE_SENTINEL) {
        f = jsxProd_default(StatusIcon, {
          status: "loading",
          withSpace: true,
        });
        g[6] = f;
      } else f = g[6];
      let h;
      if (g[7] !== label) {
        h = jsxProd_default_2(Text, {
          dimColor: true,
          children: [f, label],
        });
        g[7] = label;
        g[8] = h;
      } else h = g[8];
      return h;
    }
    case "not_synced": {
      let f;
      if (g[9] === MEMO_CACHE_SENTINEL) {
        f = jsxProd_default(Text, {
          "aria-label": "not synced:",
          children: cross,
        });
        g[9] = f;
      } else f = g[9];
      let h;
      if (g[10] !== row.words) {
        h = jsxProd_default_2(Text, {
          dimColor: true,
          children: [" \u2014 ", row.words],
        });
        g[10] = row.words;
        g[11] = h;
      } else h = g[11];
      let M;
      if (g[12] !== label || g[13] !== h) {
        M = jsxProd_default_2(Text, {
          color: "inactive",
          wrap: "wrap",
          children: [f, " ", label, h],
        });
        g[12] = label;
        g[13] = h;
        g[14] = M;
      } else M = g[14];
      return M;
    }
  }
}
//@ chunk-ah34pb7m.js:193409-193425 fingerprint = _temp4 (1)
var WORKED = "Worked";
//@ chunk-ah34pb7m.js:193425-193486 layout
function pickTurnCompletionVerb(uuid) {
  let d = (hashString31(uuid) >>> 0) % TURN_COMPLETION_VERBS.length;
  return TURN_COMPLETION_VERBS[d] ?? WORKED;
}
//@ chunk-ah34pb7m.js:193486-193589 layout
function countPendingBackgroundWork(m) {
  let { agents, workflowIds } = collectPendingBackgroundWork(m);
  return {
    pendingAgents: agents.size,
    pendingWorkflows: workflowIds.size,
  };
}
//@ chunk-ah34pb7m.js:193589-193752 layout
function listPendingBackgroundAgents(m) {
  return [...collectPendingBackgroundWork(m).agents.values()].map((agent) => ({
    id: agent.id,
    agentType: agent.agentType,
    startTime: agent.startTime,
    ...(agent.toolUseId !== undefined && {
      toolUseId: agent.toolUseId,
    }),
  }));
}
//@ chunk-ah34pb7m.js:193752-194144 layout
function collectPendingBackgroundWork({ tasks, queuedCommands = [] }) {
  let c = new Map();
  let g = new Set();
  let f = (h) => {
    if (isPanelAgentTask(h) && h.isBackgrounded) c.set(h.id, h);
    else if (h.type === "local_workflow") g.add(h.id);
  };
  for (let h of Object.values(tasks))
    if (h.status === "running" || (isTerminalTaskStatus_2(h.status) && !h.notified)) f(h);
  for (let queuedCommand of queuedCommands) {
    if (
      queuedCommand.mode !== "task-notification" ||
      !isMainAgentCommand(queuedCommand) ||
      queuedCommand.taskId === undefined
    )
      continue;
    let M = tasks[queuedCommand.taskId];
    if (M) f(M);
  }
  return {
    agents: c,
    workflowIds: g,
  };
}
//@ chunk-ah34pb7m.js:194144-194588 layout
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
//@ chunk-ah34pb7m.js:194588-194632 layout
function sumDurationMs(sum, X) {
  return sum + (X.durationMs ?? 0);
}
//@ chunk-ah34pb7m.js:194632-194811 fingerprint = _temp2 (0.851)
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
//@ chunk-ah34pb7m.js:194811-194993 fingerprint = _temp3 (0.718)
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
//@ chunk-ah34pb7m.js:194993-195139 layout
function renderStopHookFeedbackLine(ae, pe) {
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
        ae,
      ],
    },
    `feedback-${pe}`,
  );
}
//@ chunk-ah34pb7m.js:195139-195248 placement = _temp0 (0.683)
function agentRef(a) {
  return {
    id: a.id,
    agentType: a.agentType,
    ...(a.toolUseId !== undefined && {
      tool_use_id: a.toolUseId,
    }),
  };
}
//@ chunk-ah34pb7m.js:195248-195420 layout
function getBackgroundTasksPillLabel(we) {
  let $e = isCoordinatorPanelActive();
  let tasks = Object.values(we.tasks).filter(
    (task) => shouldHideTasksFooter(task) && !($e && isIdleTeammateTask(task)),
  );
  let extraCount = countNonAmbientTasks(we.remoteBackgroundTasks);
  return tasks.length + extraCount > 0 ? getPillLabelWithExtra(tasks, extraCount) : null;
}
//@ chunk-ah34pb7m.js:195420-195458 layout
function isLivelyAvalancheEnabled() {
  return readFlagWithOverride(TENGU_LIVELY_AVALANCHE, {
    safe: true,
  });
}
//@ chunk-ah34pb7m.js:195458-195478 layout
var memoryQualifierApi = null;
var accountMemoryModule = null;
//@ chunk-ah34pb7m.js:195478-200180 fingerprint = SystemTextMessage (0.561)
/**
 * 系统消息分派：turn_duration（"Worked for …"、预算/后台 agent）、memory_saved/account_memory_saved、away_summary、agents_killed、stop_hook_summary（"Ran N hooks"）、bridge_status（"/remote-control is active"）、api_error、model_fallback/model_refusal_*、permission_denied/permission_retry、scheduled_task_fire、cloud_session_status 等；其余按 level 着色显示文本。
 */
function SystemTextMessage(props) {
  let $ = w(65);
  let { message, addMargin, verbose, isTranscriptMode } = props;
  if (message.subtype === "turn_duration") {
    const isExpanded = verbose || isTranscriptMode === true;
    let T;
    if ($[0] !== addMargin || $[1] !== message || $[2] !== isExpanded) {
      T = jsxProd_default(TurnDurationRow, {
        message,
        addMargin,
        isExpanded,
      });
      $[0] = addMargin;
      $[1] = message;
      $[2] = isExpanded;
      $[3] = T;
    } else T = $[3];
    return T;
  }
  if (message.subtype === "memory_saved") {
    const verbose_2 = verbose || !!isTranscriptMode;
    let T;
    if ($[4] !== addMargin || $[5] !== message || $[6] !== verbose_2) {
      T = jsxProd_default(MemorySavedMessage, {
        message,
        addMargin,
        verbose: verbose_2,
      });
      $[4] = addMargin;
      $[5] = message;
      $[6] = verbose_2;
      $[7] = T;
    } else T = $[7];
    return T;
  }
  if (message.subtype === "account_memory_saved") {
    let h;
    if ($[8] !== addMargin || $[9] !== message) {
      h =
        accountMemoryModule === null
          ? null
          : jsxProd_default(accountMemoryModule.AccountMemorySavedMessage, {
              message,
              addMargin,
            });
      $[8] = addMargin;
      $[9] = message;
      $[10] = h;
    } else h = $[10];
    return h;
  }
  if (message.subtype === "away_summary") {
    let h;
    if ($[11] !== addMargin || $[12] !== message.content) {
      h = jsxProd_default(ThinkingMessage, {
        content: message.content,
        addMargin,
      });
      $[11] = addMargin;
      $[12] = message.content;
      $[13] = h;
    } else h = $[13];
    return h;
  }
  if (message.subtype === "agents_killed") {
    const marginTop = addMargin ? 1 : 0;
    let t2;
    let x;
    if ($[14] === MEMO_CACHE_SENTINEL) {
      t2 = jsxProd_default(Box, {
        minWidth: 2,
        children: jsxProd_default(Text, {
          "aria-hidden": true,
          color: "error",
          children: BLACK_CIRCLE,
        }),
      });
      x = jsxProd_default(Text, {
        dimColor: true,
        children: "All background agents stopped",
      });
      $[14] = t2;
      $[15] = x;
    } else {
      t2 = $[14];
      x = $[15];
    }
    let t4;
    if ($[16] !== marginTop) {
      t4 = jsxProd_default_2(Box, {
        flexDirection: "row",
        marginTop,
        width: "100%",
        children: [t2, x],
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
    let T;
    if ($[18] === MEMO_CACHE_SENTINEL) {
      T = jsxProd_default(Box, {
        minWidth: 2,
        children: jsxProd_default(Text, {
          "aria-label": "warning:",
          color: "warning",
          children: BLACK_CIRCLE,
        }),
      });
      $[18] = T;
    } else T = $[18];
    let x;
    if ($[19] !== message.content) {
      x = jsxProd_default_2(Box, {
        flexDirection: "row",
        width: "100%",
        children: [
          T,
          jsxProd_default(LinkifiedText, {
            color: "warning",
            bold: true,
            children: message.content,
          }),
        ],
      });
      $[19] = message.content;
      $[20] = x;
    } else x = $[20];
    let k;
    if ($[21] !== message.scope) {
      k =
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
      $[22] = k;
    } else k = $[22];
    let t3;
    if ($[23] !== marginTop || $[24] !== x || $[25] !== k) {
      t3 = jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop,
        width: "100%",
        children: [x, k, false],
      });
      $[23] = marginTop;
      $[24] = x;
      $[25] = k;
      $[26] = t3;
    } else t3 = $[26];
    return t3;
  }
  if (message.subtype === "model_fallback") {
    let bold = message.trigger === "model_not_found" || message.trigger === "permission_denied";
    const marginTop = addMargin ? 1 : 0;
    let T;
    if ($[27] === MEMO_CACHE_SENTINEL) {
      T = jsxProd_default(Box, {
        minWidth: 2,
        children: jsxProd_default(Text, {
          "aria-label": "warning:",
          color: "warning",
          children: BLACK_CIRCLE,
        }),
      });
      $[27] = T;
    } else T = $[27];
    let x;
    if ($[28] !== bold || $[29] !== message.content) {
      x = jsxProd_default(Text, {
        color: "warning",
        bold,
        wrap: "wrap",
        children: message.content,
      });
      $[28] = bold;
      $[29] = message.content;
      $[30] = x;
    } else x = $[30];
    let k;
    if ($[31] !== marginTop || $[32] !== x) {
      k = jsxProd_default_2(Box, {
        flexDirection: "row",
        marginTop,
        width: "100%",
        children: [T, x],
      });
      $[31] = marginTop;
      $[32] = x;
      $[33] = k;
    } else k = $[33];
    return k;
  }
  if (message.subtype === "bridge_status") {
    let h;
    if ($[34] !== addMargin || $[35] !== message) {
      h = jsxProd_default(BridgeStatusMessage, {
        message,
        addMargin,
      });
      $[34] = addMargin;
      $[35] = message;
      $[36] = h;
    } else h = $[36];
    return h;
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
    let T;
    if ($[40] === MEMO_CACHE_SENTINEL) {
      T = jsxProd_default_2(Text, {
        "aria-hidden": true,
        children: [TEARDROP_ASTERISK, " "],
      });
      $[40] = T;
    } else T = $[40];
    let children;
    if ($[41] !== message.content) {
      children = jsxProd_default_2(Text, {
        dimColor: true,
        children: [T, message.content],
      });
      $[41] = message.content;
      $[42] = children;
    } else children = $[42];
    let k;
    if ($[43] !== marginTop || $[44] !== children) {
      k = jsxProd_default(Box, {
        marginTop,
        width: "100%",
        children,
      });
      $[43] = marginTop;
      $[44] = children;
      $[45] = k;
    } else k = $[45];
    return k;
  }
  if (message.subtype === "permission_retry") {
    let commands = message.commands;
    let content = message.content;
    let h;
    let T;
    if (
      $[46] !== addMargin ||
      $[47] !== commands ||
      $[48] !== content ||
      $[49] !== message.heardAtNextPrompt
    ) {
      T = EARLY_RETURN_SENTINEL;
      K: {
        let validStringArray = getValidStringArray(commands);
        let joined = validStringArray.join(", ");
        let U = typeof content === "string" ? content : "";
        if (joined.length === 0 && U.length === 0) {
          T = null;
          break K;
        }
        let x;
        if ($[52] === MEMO_CACHE_SENTINEL) {
          x = jsxProd_default_2(Text, {
            "aria-hidden": true,
            dimColor: true,
            children: [TEARDROP_ASTERISK, " "],
          });
          $[52] = x;
        } else x = $[52];
        h = jsxProd_default_2(Box, {
          marginTop: addMargin ? 1 : 0,
          width: "100%",
          children: [
            x,
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
                  children: U,
                }),
          ],
        });
      }
      $[46] = addMargin;
      $[47] = commands;
      $[48] = content;
      $[49] = message.heardAtNextPrompt;
      $[50] = h;
      $[51] = T;
    } else {
      h = $[50];
      T = $[51];
    }
    if (T !== EARLY_RETURN_SENTINEL) return T;
    return h;
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
    let h;
    if ($[53] !== addMargin || $[54] !== isTranscriptMode || $[55] !== message || $[56] !== verbose) {
      h = jsxProd_default(StopHookSummaryMessage, {
        message,
        addMargin,
        verbose,
        isTranscriptMode,
      });
      $[53] = addMargin;
      $[54] = isTranscriptMode;
      $[55] = message;
      $[56] = verbose;
      $[57] = h;
    } else h = $[57];
    return h;
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
//@ chunk-ah34pb7m.js:200180-201377 fingerprint = StopHookSummaryMessage (0.765)
function StopHookSummaryMessage(props) {
  let $ = w(2);
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
  let L = hookAdditionalContext === undefined ? [] : hookAdditionalContext;
  let { columns } = useTerminalSize();
  totalDurationMs ?? hookInfos.reduce(sumDurationMs, 0);
  if (hookErrors.length === 0 && L.length === 0 && !preventedContinuation && !hookLabel) {
    return null;
  }
  if (hookLabel) {
    let U;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      U = jsxProd_default(Text, {
        "aria-hidden": true,
        children: "  \u23BF  ",
      });
      $[0] = U;
    } else U = $[0];
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      width: "100%",
      children: [
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [U, "Ran ", hookCount, " ", hookLabel, " ", hookCount === 1 ? "hook" : "hooks", ""],
        }),
        isTranscriptMode && hookInfos.map(renderStopHookCommandLine),
      ],
    });
  }
  let U;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    U = jsxProd_default(Box, {
      minWidth: 2,
      children: jsxProd_default(Text, {
        "aria-hidden": true,
        children: BLACK_CIRCLE,
      }),
    });
    $[1] = U;
  } else U = $[1];
  return jsxProd_default_2(Box, {
    flexDirection: "row",
    marginTop: addMargin ? 1 : 0,
    width: "100%",
    children: [
      U,
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
          L.length > 0 && L.map(renderStopHookFeedbackLine),
        ],
      }),
    ],
  });
}
//@ chunk-ah34pb7m.js:201377-202330 fingerprint = SystemTextMessageInner (0.721)
function SystemTextMessageInner(props) {
  let $ = w(19);
  let { content, addMargin, dot, color, dimColor, highlight } = props;
  let { columns } = useTerminalSize();
  let trimmed = content.trim();
  let [k, b] = useShimmerOffset(highlight ? trimmed.length : 0);
  let [E] = trimmed.split(`
`);
  if (E === undefined) "";
  else E;
  const marginTop = addMargin ? 1 : 0;
  let N;
  if ($[0] !== color || $[1] !== dimColor || $[2] !== dot || $[3] !== highlight?.color) {
    N =
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
    $[4] = N;
  } else N = $[4];
  const width = columns - 10;
  let children;
  if ($[5] !== color || $[6] !== dimColor || $[7] !== b || $[8] !== highlight || $[9] !== trimmed) {
    children = highlight
      ? jsxProd_default(ShimmerText, {
          text: trimmed,
          color: highlight.color,
          shimmerColor: highlight.shimmerColor,
          glimmerIndex: b,
        })
      : jsxProd_default(Text, {
          color,
          dimColor,
          wrap: "wrap",
          children: trimmed,
        });
    $[5] = color;
    $[6] = dimColor;
    $[7] = b;
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
  if ($[14] !== k || $[15] !== marginTop || $[16] !== N || $[17] !== t6) {
    t7 = jsxProd_default_2(Box, {
      ref: k,
      flexDirection: "row",
      marginTop,
      width: "100%",
      children: [N, t6],
    });
    $[14] = k;
    $[15] = marginTop;
    $[16] = N;
    $[17] = t6;
    $[18] = t7;
  } else t7 = $[18];
  return t7;
}
//@ chunk-ah34pb7m.js:202330-204046 layout
function TurnDurationRow(props) {
  let $ = w(21);
  let { message, addMargin, isExpanded } = props;
  let uuid = hasStringUuid(message) ? message.uuid : "";
  let M;
  if ($[0] !== uuid) {
    M = pickTurnCompletionVerb(uuid);
    $[0] = uuid;
    $[1] = M;
  } else M = $[1];
  let T = M;
  let appStoreDirect = useAppStoreDirect();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let b;
  if (
    $[2] !== message.briefHiddenCount ||
    $[3] !== message.budgetLimit ||
    $[4] !== message.pendingBackgroundAgentCount ||
    $[5] !== message.pendingWorkflowCount ||
    $[6] !== message.timestamp ||
    $[7] !== commandQueueOrDefault ||
    $[8] !== appStoreDirect
  ) {
    b = () => {
      let E = {
        tasks: appStoreDirect.getState().tasks,
        queuedCommands: commandQueueOrDefault.getCommandQueue(),
      };
      let B = countPendingBackgroundWork(E);
      let L = B.pendingAgents > 0;
      let N = B.pendingWorkflows > 0;
      let W = resolveSetting("showTurnDuration", true).value;
      let U = L ? (message.pendingBackgroundAgentCount ?? 0) : 0;
      let K = N ? (message.pendingWorkflowCount ?? 0) : 0;
      let timestamp = Date.parse(message.timestamp);
      let filtered = (U > 0 ? listPendingBackgroundAgents(E) : []).filter((Y) => Y.startTime <= timestamp);
      let z =
        W &&
        (U > 0 || K > 0) &&
        message.budgetLimit === undefined &&
        (message.briefHiddenCount ?? 0) === 0 &&
        filtered.length === U;
      return {
        hasPendingAgents: L,
        hasPendingWorkflows: N,
        showTurnDuration: W,
        doneAt: formatBriefTimestamp(message.timestamp),
        waitingFor: z
          ? {
              agents: filtered.map(agentRef),
              workflows: K,
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
    $[9] = b;
  } else b = $[9];
  let [ee] = y(b);
  let le;
  let ge;
  if (
    $[10] !== isExpanded ||
    $[11] !== message.durationMs ||
    $[12] !== uuid ||
    $[13] !== ee.waitingFor ||
    $[14] !== T
  ) {
    le = () => ({
      requestId: uuid,
      props: {
        word: T,
        durationMs: message.durationMs,
        isExpanded,
        ...(ee.waitingFor !== undefined && {
          waitingFor: ee.waitingFor,
        }),
      },
    });
    ge = [T, uuid, message.durationMs, isExpanded, ee.waitingFor];
    $[10] = isExpanded;
    $[11] = message.durationMs;
    $[12] = uuid;
    $[13] = ee.waitingFor;
    $[14] = T;
    $[15] = le;
    $[16] = ge;
  } else {
    le = $[15];
    ge = $[16];
  }
  let ae = actionKeysNamespace.useRenderInput("TurnDuration", le, ge);
  let pe;
  if ($[17] !== addMargin || $[18] !== message || $[19] !== ee) {
    pe = (te) =>
      jsxProd_default(TurnDurationMessage, {
        message:
          te.props.durationMs === message.durationMs
            ? message
            : {
                ...message,
                durationMs: te.props.durationMs,
              },
        addMargin,
        verb: te.props.word,
        snapshot: ee,
      });
    $[17] = addMargin;
    $[18] = message;
    $[19] = ee;
    $[20] = pe;
  } else pe = $[20];
  return actionKeysNamespace.useRenderHook(ae, pe);
}
//@ chunk-ah34pb7m.js:204046-206407 fingerprint = TurnDurationMessage (0.466)
/**
 * 回合耗时消息："✻ <随机完成动词> for Xm Ys"，附带 token 用量、提醒（nudge）计数与仍在后台运行的 agent/工作流数。
 */
function TurnDurationMessage(props) {
  let $ = w(33);
  let { message, addMargin, verb, snapshot } = props;
  let { hasPendingAgents, hasPendingWorkflows, showTurnDuration, doneAt } = snapshot;
  let appState = useAppState(getBackgroundTasksPillLabel);
  let E;
  if ($[0] !== message.durationMs) {
    E = formatDuration(message.durationMs);
    $[0] = message.durationMs;
    $[1] = E;
  } else E = $[1];
  let B = E;
  let hasBudget = message.budgetLimit !== undefined;
  let N;
  W: {
    if (!hasBudget) {
      N = null;
      break W;
    }
    let tokens = message.budgetTokens;
    let limit = message.budgetLimit;
    let V;
    if ($[2] !== limit || $[3] !== tokens) {
      V =
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
      $[4] = V;
    } else V = $[4];
    let Y = V;
    let X =
      message.budgetNudges > 0
        ? ` \xB7 ${message.budgetNudges} ${message.budgetNudges === 1 ? "nudge" : "nudges"}`
        : "";
    const z = showTurnDuration ? " \xB7 " : "";
    let ee;
    if ($[5] !== X || $[6] !== z || $[7] !== Y) {
      ee = jsxProd_default_2(Fragment, {
        children: [z, Y, X],
      });
      $[5] = X;
      $[6] = z;
      $[7] = Y;
      $[8] = ee;
    } else ee = $[8];
    N = ee;
  }
  let le = N;
  let briefHiddenCount = message.briefHiddenCount ?? 0;
  let ae =
    briefHiddenCount > 0
      ? `${showTurnDuration || hasBudget ? " \xB7 " : ""}${briefHiddenCount} ${briefHiddenCount === 1 ? "message" : "messages"} hidden (/focus to show)`
      : "";
  let pe = !showTurnDuration && !hasBudget && !ae;
  let te = hasPendingAgents ? (message.pendingBackgroundAgentCount ?? 0) : 0;
  let de = hasPendingWorkflows ? (message.pendingWorkflowCount ?? 0) : 0;
  let ue = te > 0 || de > 0;
  let V;
  if ($[9] !== te) {
    V =
      te > 0 &&
      jsxProd_default_2(Text, {
        children: [
          " ",
          jsxProd_default(Text, {
            bold: true,
            dimColor: true,
            children: te,
          }),
          ` background ${te === 1 ? "agent" : "agents"}`,
        ],
      });
    $[9] = te;
    $[10] = V;
  } else V = $[10];
  const z = te > 0 && de > 0 && " and";
  let ee;
  if ($[11] !== de) {
    ee =
      de > 0 &&
      jsxProd_default_2(Text, {
        children: [
          " ",
          jsxProd_default(Text, {
            bold: true,
            dimColor: true,
            children: de,
          }),
          ` ${de === 1 ? "dynamic workflow" : "dynamic workflows"}`,
        ],
      });
    $[11] = de;
    $[12] = ee;
  } else ee = $[12];
  let J;
  if ($[13] !== V || $[14] !== z || $[15] !== ee) {
    J = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Waiting for", V, z, ee, " to finish"],
    });
    $[13] = V;
    $[14] = z;
    $[15] = ee;
    $[16] = J;
  } else J = $[16];
  let se = J;
  let ye = showTurnDuration && ue;
  let Te;
  if (
    $[17] !== addMargin ||
    $[18] !== appState ||
    $[19] !== le ||
    $[20] !== doneAt ||
    $[21] !== B ||
    $[22] !== ae ||
    $[23] !== pe ||
    $[24] !== ue ||
    $[25] !== showTurnDuration ||
    $[26] !== ye ||
    $[27] !== verb ||
    $[28] !== se
  ) {
    Te = pe
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
                  (ue
                    ? se
                    : jsxProd_default(Text, {
                        dimColor: true,
                        children: `${verb} for ${B}${doneAt ? ` \xB7 done ${doneAt}` : ""}`,
                      })),
                le &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: le,
                  }),
                ae &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: ae,
                  }),
                !ye &&
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
    $[19] = le;
    $[20] = doneAt;
    $[21] = B;
    $[22] = ae;
    $[23] = pe;
    $[24] = ue;
    $[25] = showTurnDuration;
    $[26] = ye;
    $[27] = verb;
    $[28] = se;
    $[29] = Te;
  } else Te = $[29];
  let Me = Te;
  let [be, ve] = useFrozenValue(Me);
  let Ue;
  if ($[30] !== ve || $[31] !== be) {
    Ue = jsxProd_default(Box, {
      ref: be,
      flexDirection: "column",
      width: "100%",
      children: ve,
    });
    $[30] = ve;
    $[31] = be;
    $[32] = Ue;
  } else Ue = $[32];
  return Ue;
}
//@ chunk-ah34pb7m.js:206407-206439 layout
var TENGU_LIVELY_AVALANCHE = "tengu_lively_avalanche";
//@ chunk-ah34pb7m.js:206439-207625 fingerprint = MemorySavedMessage (0.642)
function MemorySavedMessage(props) {
  let $ = w(18);
  let { message, addMargin, verbose } = props;
  let validStringArray = getValidStringArray(message.writtenPaths);
  let M;
  if ($[0] !== message) {
    M = getMemorySavedVerb(message);
    $[0] = message;
    $[1] = M;
  } else M = $[1];
  let T = M;
  let x = renderWithForceUpdate(isLivelyAvalancheEnabled);
  let k = x ? getAutoMemPathOrNull() : null;
  let b;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    b = getPlatform();
    $[2] = b;
  } else b = $[2];
  let E = b;
  let B = E !== "windows" && E !== "wsl";
  let L;
  if ($[3] !== message) {
    L = teamMemSavedPart(message);
    $[3] = message;
    $[4] = L;
  } else L = $[4];
  let N = L;
  let privateCount = validStringArray.length - (N?.count ?? 0);
  let U;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    U = memoryQualifierApi?.localMemoryQualifier() ?? "";
    $[5] = U;
  } else U = $[5];
  let K = U;
  const V = privateCount > 0 ? `${privateCount} ${K}${privateCount === 1 ? "memory" : "memories"}` : null;
  const segment = N?.segment;
  let t4;
  if ($[6] !== V || $[7] !== segment) {
    t4 = [V, segment].filter(Boolean);
    $[6] = V;
    $[7] = segment;
    $[8] = t4;
  } else t4 = $[8];
  let parts = t4;
  const ee = Box;
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
  const joined = parts.join(" \xB7 ");
  let te;
  if ($[10] !== joined || $[11] !== T) {
    te = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        t6,
        jsxProd_default_2(Text, {
          children: [T, " ", joined],
        }),
      ],
    });
    $[10] = joined;
    $[11] = T;
    $[12] = te;
  } else te = $[12];
  const ue =
    verbose &&
    validStringArray.map((validString) => {
      if (!x) {
        return jsxProd_default(
          MemoryFileRow,
          {
            path: validString,
          },
          validString,
        );
      }
      return B && k !== null && isAllowedAutoMemWritePath(validString, k)
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
  if ($[13] !== ee || $[14] !== te || $[15] !== ue || $[16] !== marginTop) {
    t11 = jsxProd_default_2(ee, {
      flexDirection,
      marginTop,
      children: [te, ue],
    });
    $[13] = ee;
    $[14] = te;
    $[15] = ue;
    $[16] = marginTop;
    $[17] = t11;
  } else t11 = $[17];
  return t11;
}
//@ chunk-ah34pb7m.js:207625-207996 file-local
function MemoryFilePath(p) {
  let $ = w(12);
  let { path } = p;
  let g;
  let f;
  let dimColor;
  let children;
  if ($[0] !== path) {
    let T = basename(path);
    f = MessageResponse;
    g = Text;
    dimColor = true;
    children = hasControlChars(T) ? HIDDEN_PATH_PLACEHOLDER : T;
    $[0] = path;
    $[1] = g;
    $[2] = f;
    $[3] = dimColor;
    $[4] = children;
  } else {
    g = $[1];
    f = $[2];
    dimColor = $[3];
    children = $[4];
  }
  let children_2;
  if ($[5] !== g || $[6] !== dimColor || $[7] !== children) {
    children_2 = jsxProd_default(g, {
      dimColor,
      children,
    });
    $[5] = g;
    $[6] = dimColor;
    $[7] = children;
    $[8] = children_2;
  } else children_2 = $[8];
  let k;
  if ($[9] !== f || $[10] !== children_2) {
    k = jsxProd_default(f, {
      children: children_2,
    });
    $[9] = f;
    $[10] = children_2;
    $[11] = k;
  } else k = $[11];
  return k;
}
//@ chunk-ah34pb7m.js:207996-208617 fingerprint = MemoryFileRow (0.734)
function MemoryFileRow(props) {
  let $ = w(16);
  let { path } = props;
  let [hover, setHover] = y(false);
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
//@ chunk-ah34pb7m.js:208617-209574 fingerprint = BridgeStatusMessage (0.355)
function BridgeStatusMessage(props) {
  let $ = w(13);
  let { message, addMargin } = props;
  let f;
  if ($[0] !== message) {
    f = (h) => h.replBridgeConnected && !h.replBridgeOutboundOnly && h.replBridgeSessionUrl === message.url;
    $[0] = message;
    $[1] = f;
  } else f = $[1];
  if (!useAppState(f)) {
    return null;
  }
  const marginTop = addMargin ? 1 : 0;
  let t2;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Box, {
      minWidth: 2,
    });
    $[2] = t2;
  } else t2 = $[2];
  let k;
  if ($[3] !== message.url) {
    k = jsxProd_default_2(Text, {
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
    });
    $[3] = message.url;
    $[4] = k;
  } else k = $[4];
  let b;
  if ($[5] !== message.upgradeNudge) {
    b =
      message.upgradeNudge &&
      jsxProd_default_2(Box, {
        flexDirection: "row",
        children: [
          jsxProd_default(Text, {
            "aria-hidden": true,
            dimColor: true,
            children: "\u23BF  ",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: message.upgradeNudge,
          }),
        ],
      });
    $[5] = message.upgradeNudge;
    $[6] = b;
  } else b = $[6];
  let E;
  if ($[7] !== k || $[8] !== b) {
    E = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [k, b],
    });
    $[7] = k;
    $[8] = b;
    $[9] = E;
  } else E = $[9];
  let B;
  if ($[10] !== marginTop || $[11] !== E) {
    B = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop,
      width: 999,
      children: [t2, E],
    });
    $[10] = marginTop;
    $[11] = E;
    $[12] = B;
  } else B = $[12];
  return B;
}
//@ chunk-e4xept39.js:231-335 placement
/**
 * 云会话横幅文字（创建或附着）与"在此或在…编码"的连接文字。
 */
var CLOUD_SESSION_BANNERS = {
  create: "Cloud session active",
  attach: "Attached to cloud session",
};
var CODE_HERE_OR_AT = " \xB7 code here or at ";
//@ chunk-e6aww6q8.js:1538140-1538417 fingerprint = _temp (0.705)
/**
 * 把工具耗时列表编码为 "tool=ms;tool=ms"（数量与总长有上限），用于请求头。
 */
function formatToolDurationsHeader(prevToolDurations) {
  let n = [];
  let r = 0;
  for (let { toolName, durationMs } of prevToolDurations) {
    if (n.length >= MAX_TOOL_DURATION_ENTRIES) break;
    if (!Number.isFinite(durationMs)) continue;
    let max = Math.max(0, Math.round(durationMs));
    let S = `${encodeToolNameForHeader(toolName)}=${max}`;
    let w = n.length > 0 ? 1 : 0;
    if (r + w + S.length > MAX_TOOL_DURATION_HEADER_CHARS) break;
    r += w + S.length;
    n.push(S);
  }
  return n.length > 0 ? n.join(";") : undefined;
}
export {
  countPendingBackgroundWork,
  ThinkingMessage,
  computeTurnDurationInfo,
  formatToolDurationsHeader,
  CLOUD_SESSION_BANNERS,
  CODE_HERE_OR_AT,
  SystemTextMessage,
};
