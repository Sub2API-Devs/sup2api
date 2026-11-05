/**
 * components/TaskListV2.tsx
 *
 * 任务列表 V2（Task 工具的任务）：按状态排序显示任务项与 "blocked by" 依赖。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TaskListV2.tsx
 * pieces: chunk-tv0spgv5.js (10)
 * attribution: placement 5, layout 1, callgraph-fingerprint 1, fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { useTaskListSnapshot } from "../hooks/useTasksV2.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useClock } from "../ink/components/ClockContext.js";
import { isTaskToolsEnabled } from "../utils/tasks.js";
import { isAgentSwarmsEnabled } from "../utils/agentSwarmsEnabled.js";
import { AGENT_COLOR_TO_THEME_COLOR } from "../tools/AgentTool/agentColorManager.js";
import { isInProcessTeammateTask } from "../tasks/InProcessTeammateTask/types.js";
import { summarizeRecentActivities } from "../utils/collapseReadSearch.js";
import { countWhere } from "../utils/collections.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { truncateToWidth } from "../utils/format.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-tv0spgv5.js:779-783 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tv0spgv5.js:779", () => {
  init_react_production();
});
//@ chunk-tv0spgv5.js:783-820 placement (2.1.88 match: _temp4, 1)
function selectExpandedView(s_1) {
  return s_1.expandedView;
}
//@ chunk-tv0spgv5.js:820-874 placement
function compareNumbers(left, right) {
  return parseInt(left, 10) - parseInt(right, 10);
}
//@ chunk-tv0spgv5.js:874-903 placement
function taskNumberLabel(taskNumber) {
  return `#${taskNumber}`;
}
//@ chunk-tv0spgv5.js:903-1149 placement
/**
 * 展开视图为 tasks 时显示完整任务列表。
 */
function ExpandedTaskList(props) {
  let $ = useMemoCache(2);
  let { hidden } = props;
  let isExpandedTasksView = useAppState(selectExpandedView) === "tasks";
  let taskListSnapshot = useTaskListSnapshot();
  if (hidden || !isExpandedTasksView || !taskListSnapshot || taskListSnapshot.length === 0) {
    return null;
  }
  let element;
  if ($[0] !== taskListSnapshot) {
    element = jsxProd_default(Box, {
      width: "100%",
      flexDirection: "column",
      children: jsxProd_default(TaskListV2, {
        tasks: taskListSnapshot,
        isStandalone: true,
      }),
    });
    $[0] = taskListSnapshot;
    $[1] = element;
  } else element = $[1];
  return element;
}
//@ chunk-tv0spgv5.js:1149-1162 layout
var TASK_REFRESH_MS = 30000;
//@ chunk-tv0spgv5.js:1162-1289 callgraph-fingerprint (2.1.88 match: byIdAsc, 1)
function byIdAsc(a, b) {
  let aNum = parseInt(a.id, 10);
  let bNum = parseInt(b.id, 10);
  if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
  return a.id.localeCompare(b.id);
}
//@ chunk-tv0spgv5.js:1289-3877 fingerprint (2.1.88 match: TaskListV2, 0.943)
function TaskListV2({ tasks, isStandalone = false }) {
  let teamContext = useAppState((appState) => appState.teamContext);
  let appStateTasks = useAppState((s_0) => s_0.tasks);
  let [refreshNonce, setRefreshNonce] = useState(0);
  let { rows, columns } = useTerminalSize();
  let clock = useClock();
  let previousCompletedIdsRef = useRef(null);
  previousCompletedIdsRef.current ??= new Map(
    tasks.filter((task) => task.status === "completed").map((t_0) => [t_0.id, null]),
  );
  let completedAtById = previousCompletedIdsRef.current;
  let maxDisplay = rows <= 10 ? 0 : Math.min(5, Math.max(3, rows - 14));
  let currentCompletedIds = new Set(tasks.filter((t_1) => t_1.status === "completed").map((t_2) => t_2.id));
  let now = Date.now();
  for (let id of currentCompletedIds) if (!completedAtById.has(id)) completedAtById.set(id, now);
  for (let id_0 of completedAtById.keys()) if (!currentCompletedIds.has(id_0)) completedAtById.delete(id_0);
  useEffect(() => {
    let currentNow = Date.now();
    let earliestExpiry = 1 / 0;
    for (let ts of completedAtById.values()) {
      if (ts === null) continue;
      let expiry = ts + TASK_REFRESH_MS;
      if (expiry > currentNow && expiry < earliestExpiry) earliestExpiry = expiry;
    }
    if (earliestExpiry === 1 / 0) return;
    return clock.setTimeout(() => setRefreshNonce((n) => n + 1), earliestExpiry - currentNow);
  }, [tasks, clock, completedAtById, refreshNonce]);
  if (!isTaskToolsEnabled()) return null;
  if (tasks.length === 0) return null;
  let teammateColors = {};
  if (isAgentSwarmsEnabled() && teamContext?.teammates) {
    for (let teammate of Object.values(teamContext.teammates))
      if (teammate.color) {
        let themeColor = AGENT_COLOR_TO_THEME_COLOR[teammate.color];
        if (themeColor) teammateColors[teammate.name] = themeColor;
      }
  }
  let teammateActivity = {};
  let activeTeammates = new Set();
  if (isAgentSwarmsEnabled()) {
    for (let bgTask of Object.values(appStateTasks))
      if (isInProcessTeammateTask(bgTask) && bgTask.status === "running") {
        activeTeammates.add(bgTask.identity.agentName);
        activeTeammates.add(bgTask.identity.agentId);
        let activities = bgTask.progress?.recentActivities;
        let desc =
          (activities && summarizeRecentActivities(activities)) ??
          bgTask.progress?.lastActivity?.activityDescription;
        if (desc) {
          teammateActivity[bgTask.identity.agentName] = desc;
          teammateActivity[bgTask.identity.agentId] = desc;
        }
      }
  }
  let completedCount = countWhere(tasks, (t_3) => t_3.status === "completed");
  let pendingCount = countWhere(tasks, (t_4) => t_4.status === "pending");
  let inProgressCount = tasks.length - completedCount - pendingCount;
  let unresolvedTaskIds = new Set(tasks.filter((t_5) => t_5.status !== "completed").map((t_6) => t_6.id));
  let needsTruncation = tasks.length > maxDisplay;
  let visibleTasks;
  let hiddenTasks;
  if (needsTruncation) {
    let recentCompleted = [];
    let olderCompleted = [];
    for (let task of tasks.filter((t_7) => t_7.status === "completed")) {
      let ts_0 = completedAtById.get(task.id);
      if (typeof ts_0 === "number" && now - ts_0 < TASK_REFRESH_MS) recentCompleted.push(task);
      else olderCompleted.push(task);
    }
    recentCompleted.sort(byIdAsc);
    olderCompleted.sort(byIdAsc);
    let inProgress = tasks.filter((t_8) => t_8.status === "in_progress").sort(byIdAsc);
    let pending = tasks
      .filter((t_9) => t_9.status === "pending")
      .sort((taskA, taskB) => {
        let aBlocked = taskA.blockedBy.some((id_1) => unresolvedTaskIds.has(id_1));
        let bBlocked = taskB.blockedBy.some((id_2) => unresolvedTaskIds.has(id_2));
        if (aBlocked !== bBlocked) return aBlocked ? 1 : -1;
        return byIdAsc(taskA, taskB);
      });
    let prioritized = [...recentCompleted, ...inProgress, ...pending, ...olderCompleted];
    visibleTasks = prioritized.slice(0, maxDisplay);
    hiddenTasks = prioritized.slice(maxDisplay);
  } else {
    visibleTasks = [...tasks].sort(byIdAsc);
    hiddenTasks = [];
  }
  let hiddenSummary = "";
  if (hiddenTasks.length > 0) {
    let parts = [];
    let hiddenPending = countWhere(hiddenTasks, (t_10) => t_10.status === "pending");
    let hiddenInProgress = countWhere(hiddenTasks, (t_11) => t_11.status === "in_progress");
    let hiddenCompleted = countWhere(hiddenTasks, (t_12) => t_12.status === "completed");
    if (hiddenInProgress > 0) parts.push(`${hiddenInProgress} in progress`);
    if (hiddenPending > 0) parts.push(`${hiddenPending} pending`);
    if (hiddenCompleted > 0) parts.push(`${hiddenCompleted} completed`);
    hiddenSummary = ` \u2026 +${parts.join(", ")}`;
  }
  let content = jsxProd_default_2(Fragment, {
    children: [
      visibleTasks.map((task) =>
        jsxProd_default(
          TaskItem,
          {
            task,
            ownerColor: task.owner ? teammateColors[task.owner] : undefined,
            openBlockers: task.blockedBy.filter((id_3) => unresolvedTaskIds.has(id_3)),
            activity: task.owner ? teammateActivity[task.owner] : undefined,
            ownerActive: task.owner ? activeTeammates.has(task.owner) : false,
            columns,
          },
          task.id,
        ),
      ),
      maxDisplay > 0 &&
        hiddenSummary &&
        jsxProd_default(Text, {
          dimColor: true,
          children: hiddenSummary,
        }),
    ],
  });
  if (isStandalone)
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      marginLeft: 2,
      children: [
        jsxProd_default(Box, {
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              jsxProd_default(Text, {
                bold: true,
                children: tasks.length,
              }),
              " tasks (",
              jsxProd_default(Text, {
                bold: true,
                children: completedCount,
              }),
              " done, ",
              inProgressCount > 0 &&
                jsxProd_default_2(Fragment, {
                  children: [
                    jsxProd_default(Text, {
                      bold: true,
                      children: inProgressCount,
                    }),
                    " in progress, ",
                  ],
                }),
              jsxProd_default(Text, {
                bold: true,
                children: pendingCount,
              }),
              " open)",
            ],
          }),
        }),
        content,
      ],
    });
  return jsxProd_default(Box, {
    flexDirection: "column",
    children: content,
  });
}
//@ chunk-tv0spgv5.js:3877-4079 fingerprint (2.1.88 match: getTaskIcon, 1)
function getTaskIcon(status) {
  switch (status) {
    case "completed":
      return {
        icon: figures_default.tick,
        color: "success",
      };
    case "in_progress":
      return {
        icon: figures_default.squareSmallFilled,
        color: "claude",
      };
    case "pending":
      return {
        icon: figures_default.squareSmall,
        color: undefined,
      };
  }
}
//@ chunk-tv0spgv5.js:4079-5735 fingerprint (2.1.88 match: TaskItem, 0.926)
function TaskItem(props) {
  let $ = useMemoCache(37);
  let { task, ownerColor, openBlockers, activity, ownerActive, columns } = props;
  let isCompleted = task.status === "completed";
  let isInProgress = task.status === "in_progress";
  let isBlocked = openBlockers.length > 0;
  let t1;
  if ($[0] !== task.status) {
    t1 = getTaskIcon(task.status);
    $[0] = task.status;
    $[1] = t1;
  } else t1 = $[1];
  let { icon, color } = t1;
  let showActivity = isInProgress && !isBlocked && activity;
  let showOwner = columns >= 60 && task.owner && ownerActive;
  let t2;
  if ($[2] !== showOwner || $[3] !== task.owner) {
    t2 = showOwner ? bunStringWidth(` (@${task.owner})`) : 0;
    $[2] = showOwner;
    $[3] = task.owner;
    $[4] = t2;
  } else t2 = $[4];
  let ownerWidth = t2;
  let maxSubjectWidth = Math.max(15, columns - 15 - ownerWidth);
  let t3;
  if ($[5] !== maxSubjectWidth || $[6] !== task.subject) {
    t3 = truncateToWidth(task.subject, maxSubjectWidth);
    $[5] = maxSubjectWidth;
    $[6] = task.subject;
    $[7] = t3;
  } else t3 = $[7];
  let displaySubject = t3;
  let maxActivityWidth = Math.max(15, columns - 15);
  let t4;
  if ($[8] !== activity || $[9] !== maxActivityWidth) {
    t4 = activity ? truncateToWidth(activity, maxActivityWidth) : undefined;
    $[8] = activity;
    $[9] = maxActivityWidth;
    $[10] = t4;
  } else t4 = $[10];
  let displayActivity = t4;
  let t5;
  if ($[11] !== color || $[12] !== icon) {
    t5 = jsxProd_default_2(Text, {
      color,
      children: [icon, " "],
    });
    $[11] = color;
    $[12] = icon;
    $[13] = t5;
  } else t5 = $[13];
  const dimColor = isCompleted || isBlocked;
  let t7;
  if ($[14] !== displaySubject || $[15] !== isCompleted || $[16] !== isInProgress || $[17] !== dimColor) {
    t7 = jsxProd_default(Text, {
      bold: isInProgress,
      strikethrough: isCompleted,
      dimColor,
      children: displaySubject,
    });
    $[14] = displaySubject;
    $[15] = isCompleted;
    $[16] = isInProgress;
    $[17] = dimColor;
    $[18] = t7;
  } else t7 = $[18];
  let t8;
  if ($[19] !== ownerColor || $[20] !== showOwner || $[21] !== task.owner) {
    t8 =
      showOwner &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          " (",
          ownerColor
            ? jsxProd_default_2(Text, {
                color: ownerColor,
                children: ["@", task.owner],
              })
            : `@${task.owner}`,
          ")",
        ],
      });
    $[19] = ownerColor;
    $[20] = showOwner;
    $[21] = task.owner;
    $[22] = t8;
  } else t8 = $[22];
  let t9;
  if ($[23] !== isBlocked || $[24] !== openBlockers) {
    t9 =
      isBlocked &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          " ",
          figures_default.pointerSmall,
          " blocked by",
          " ",
          [...openBlockers].sort(compareNumbers).map(taskNumberLabel).join(", "),
        ],
      });
    $[23] = isBlocked;
    $[24] = openBlockers;
    $[25] = t9;
  } else t9 = $[25];
  let t10;
  if ($[26] !== t5 || $[27] !== t7 || $[28] !== t8 || $[29] !== t9) {
    t10 = jsxProd_default_2(Box, {
      children: [t5, t7, t8, t9],
    });
    $[26] = t5;
    $[27] = t7;
    $[28] = t8;
    $[29] = t9;
    $[30] = t10;
  } else t10 = $[30];
  let t11;
  if ($[31] !== displayActivity || $[32] !== showActivity) {
    t11 =
      showActivity &&
      displayActivity &&
      jsxProd_default(Box, {
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", displayActivity, figures_default.ellipsis],
        }),
      });
    $[31] = displayActivity;
    $[32] = showActivity;
    $[33] = t11;
  } else t11 = $[33];
  let t12;
  if ($[34] !== t10 || $[35] !== t11) {
    t12 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t10, t11],
    });
    $[34] = t10;
    $[35] = t11;
    $[36] = t12;
  } else t12 = $[36];
  return t12;
}
export { ExpandedTaskList, TaskListV2, getTaskIcon };
