/**
 * components/TaskListV2.tsx
 *
 * 任务列表 V2（Task 工具的任务）：按状态排序显示任务项与 "blocked by" 依赖。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TaskListV2.tsx
 * pieces: chunk-zef67v87.js (10)
 * attribution: placement 5, layout 1, callgraph-fingerprint 1, fingerprint 3
 */
import { j, y, R, P } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { gye } from "../hooks/useTasksV2.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useClock } from "../ink/components/ClockContext.js";
import { isTaskToolsEnabled } from "../utils/tasks.js";
import { isAgentSwarmsEnabled } from "../utils/agentSwarmsEnabled.js";
import { AGENT_COLOR_TO_THEME_COLOR } from "../tools/AgentTool/agentColorManager.js";
import { isInProcessTeammateTask } from "../tasks/InProcessTeammateTask/types.js";
import { summarizeRecentActivities } from "../utils/collapseReadSearch.js";
import { count } from "../utils/collections.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { truncateToWidth } from "../utils/format.js";

//@ chunk-zef67v87.js:778-782 placement
j();
//@ chunk-zef67v87.js:782-819 placement = _temp4 (1)
function selectExpandedView(s_1) {
  return s_1.expandedView;
}
//@ chunk-zef67v87.js:819-873 placement
function Be(T, U) {
  return parseInt(T, 10) - parseInt(U, 10);
}
//@ chunk-zef67v87.js:873-904 placement
function Ie(ee) {
  return `#${ee}`;
}
/**
 * 展开视图为 tasks 时显示完整任务列表。
 */
//@ chunk-zef67v87.js:904-1150 placement
function ExpandedTaskList(i) {
  let x = w(2),
    { hidden: hidden } = i,
    f = useAppState(selectExpandedView) === "tasks",
    d = gye();
  if (hidden || !f || !d || d.length === 0) {
    return null;
  }
  let z;
  if (x[0] !== d)
    ((z = e(Box, {
      width: "100%",
      flexDirection: "column",
      children: e(TaskListV2, { tasks: d, isStandalone: !0 }),
    })),
      (x[0] = d),
      (x[1] = z));
  else z = x[1];
  return z;
}
//@ chunk-zef67v87.js:1150-1163 layout
var te = 30000;
//@ chunk-zef67v87.js:1163-1290 callgraph-fingerprint = byIdAsc (1)
function byIdAsc(a, b) {
  let aNum = parseInt(a.id, 10),
    bNum = parseInt(b.id, 10);
  if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
  return a.id.localeCompare(b.id);
}
//@ chunk-zef67v87.js:1290-3878 fingerprint = TaskListV2 (0.943)
function TaskListV2({ tasks: tasks, isStandalone: isStandalone = !1 }) {
  let teamContext = useAppState((t) => t.teamContext),
    appStateTasks = useAppState((s_0) => s_0.tasks),
    [x, z] = y(0),
    { rows: rows, columns: columns } = useTerminalSize(),
    A = useClock(),
    C = R(null);
  C.current ??= new Map(tasks.filter((t) => t.status === "completed").map((t_0) => [t_0.id, null]));
  let a = C.current,
    maxDisplay = rows <= 10 ? 0 : Math.min(5, Math.max(3, rows - 14)),
    currentCompletedIds = new Set(tasks.filter((t_1) => t_1.status === "completed").map((t_2) => t_2.id)),
    now = Date.now();
  for (let id of currentCompletedIds) if (!a.has(id)) a.set(id, now);
  for (let id_0 of a.keys()) if (!currentCompletedIds.has(id_0)) a.delete(id_0);
  if (
    (P(() => {
      let currentNow = Date.now(),
        o = 1 / 0;
      for (let ts of a.values()) {
        if (ts === null) continue;
        let m = ts + te;
        if (m > currentNow && m < o) o = m;
      }
      if (o === 1 / 0) return;
      return A.setTimeout(() => z((forceUpdate_0) => forceUpdate_0 + 1), o - currentNow);
    }, [tasks, A, a, x]),
    !isTaskToolsEnabled())
  )
    return null;
  if (tasks.length === 0) return null;
  let _ = {};
  if (isAgentSwarmsEnabled() && teamContext?.teammates) {
    for (let teammate of Object.values(teamContext.teammates))
      if (teammate.color) {
        let themeColor = AGENT_COLOR_TO_THEME_COLOR[teammate.color];
        if (themeColor) _[teammate.name] = themeColor;
      }
  }
  let g = {},
    activeTeammates = new Set();
  if (isAgentSwarmsEnabled()) {
    for (let bgTask of Object.values(appStateTasks))
      if (isInProcessTeammateTask(bgTask) && bgTask.status === "running") {
        (activeTeammates.add(bgTask.identity.agentName), activeTeammates.add(bgTask.identity.agentId));
        let activities = bgTask.progress?.recentActivities,
          desc =
            (activities && summarizeRecentActivities(activities)) ??
            bgTask.progress?.lastActivity?.activityDescription;
        if (desc) ((g[bgTask.identity.agentName] = desc), (g[bgTask.identity.agentId] = desc));
      }
  }
  let completedCount = count(tasks, (t_3) => t_3.status === "completed"),
    pendingCount = count(tasks, (t_4) => t_4.status === "pending"),
    q = tasks.length - completedCount - pendingCount,
    unresolvedTaskIds = new Set(tasks.filter((t_5) => t_5.status !== "completed").map((t_6) => t_6.id)),
    V = tasks.length > maxDisplay,
    M,
    h;
  if (V) {
    let t = [],
      o = [];
    for (let task of tasks.filter((t_7) => t_7.status === "completed")) {
      let ts_0 = a.get(task.id);
      if (typeof ts_0 === "number" && now - ts_0 < te) t.push(task);
      else o.push(task);
    }
    (t.sort(byIdAsc), o.sort(byIdAsc));
    let inProgress = tasks.filter((t_8) => t_8.status === "in_progress").sort(byIdAsc),
      pending = tasks
        .filter((t_9) => t_9.status === "pending")
        .sort((u, T) => {
          let aBlocked = u.blockedBy.some((id_1) => unresolvedTaskIds.has(id_1)),
            bBlocked = T.blockedBy.some((id_2) => unresolvedTaskIds.has(id_2));
          if (aBlocked !== bBlocked) return aBlocked ? 1 : -1;
          return byIdAsc(u, T);
        }),
      prioritized = [...t, ...inProgress, ...pending, ...o];
    ((M = prioritized.slice(0, maxDisplay)), (h = prioritized.slice(maxDisplay)));
  } else ((M = [...tasks].sort(byIdAsc)), (h = []));
  let hiddenSummary = "";
  if (h.length > 0) {
    let t = [],
      hiddenPending = count(h, (t_10) => t_10.status === "pending"),
      hiddenInProgress = count(h, (t_11) => t_11.status === "in_progress"),
      hiddenCompleted = count(h, (t_12) => t_12.status === "completed");
    if (hiddenInProgress > 0) t.push(`${hiddenInProgress} in progress`);
    if (hiddenPending > 0) t.push(`${hiddenPending} pending`);
    if (hiddenCompleted > 0) t.push(`${hiddenCompleted} completed`);
    hiddenSummary = ` \u2026 +${t.join(", ")}`;
  }
  let L = r(Fragment, {
    children: [
      M.map((task_0) =>
        e(
          TaskItem,
          {
            task: task_0,
            ownerColor: task_0.owner ? _[task_0.owner] : void 0,
            openBlockers: task_0.blockedBy.filter((id_3) => unresolvedTaskIds.has(id_3)),
            activity: task_0.owner ? g[task_0.owner] : void 0,
            ownerActive: task_0.owner ? activeTeammates.has(task_0.owner) : !1,
            columns: columns,
          },
          task_0.id,
        ),
      ),
      maxDisplay > 0 && hiddenSummary && e(Text, { dimColor: !0, children: hiddenSummary }),
    ],
  });
  if (isStandalone)
    return r(Box, {
      flexDirection: "column",
      marginTop: 1,
      marginLeft: 2,
      children: [
        e(Box, {
          children: r(Text, {
            dimColor: !0,
            children: [
              e(Text, { bold: !0, children: tasks.length }),
              " tasks (",
              e(Text, { bold: !0, children: completedCount }),
              " done, ",
              q > 0 && r(Fragment, { children: [e(Text, { bold: !0, children: q }), " in progress, "] }),
              e(Text, { bold: !0, children: pendingCount }),
              " open)",
            ],
          }),
        }),
        L,
      ],
    });
  return e(Box, { flexDirection: "column", children: L });
}
//@ chunk-zef67v87.js:3878-4080 fingerprint = getTaskIcon (1)
function getTaskIcon(status) {
  switch (status) {
    case "completed":
      return { icon: re.tick, color: "success" };
    case "in_progress":
      return { icon: re.squareSmallFilled, color: "claude" };
    case "pending":
      return { icon: re.squareSmall, color: void 0 };
  }
}
//@ chunk-zef67v87.js:4080-5736 fingerprint = TaskItem (0.926)
function TaskItem(t0) {
  let $ = w(37),
    {
      task: task,
      ownerColor: ownerColor,
      openBlockers: openBlockers,
      activity: activity,
      ownerActive: ownerActive,
      columns: columns,
    } = t0,
    I = task.status === "completed",
    A = task.status === "in_progress",
    C = openBlockers.length > 0,
    S;
  if ($[0] !== task.status) ((S = getTaskIcon(task.status)), ($[0] = task.status), ($[1] = S));
  else S = $[1];
  let { icon: icon, color: color } = S,
    _ = A && !C && activity,
    g = columns >= 60 && task.owner && ownerActive,
    O;
  if ($[2] !== g || $[3] !== task.owner)
    ((O = g ? bunStringWidth(` (@${task.owner})`) : 0), ($[2] = g), ($[3] = task.owner), ($[4] = O));
  else O = $[4];
  let H = O,
    maxSubjectWidth = Math.max(15, columns - 15 - H),
    q;
  if ($[5] !== maxSubjectWidth || $[6] !== task.subject)
    ((q = truncateToWidth(task.subject, maxSubjectWidth)),
      ($[5] = maxSubjectWidth),
      ($[6] = task.subject),
      ($[7] = q));
  else q = $[7];
  let B = q,
    maxActivityWidth = Math.max(15, columns - 15),
    M;
  if ($[8] !== activity || $[9] !== maxActivityWidth)
    ((M = activity ? truncateToWidth(activity, maxActivityWidth) : void 0),
      ($[8] = activity),
      ($[9] = maxActivityWidth),
      ($[10] = M));
  else M = $[10];
  let h = M,
    b;
  if ($[11] !== color || $[12] !== icon)
    ((b = r(Text, { color: color, children: [icon, " "] })), ($[11] = color), ($[12] = icon), ($[13] = b));
  else b = $[13];
  const L = I || C;
  let t;
  if ($[14] !== B || $[15] !== I || $[16] !== A || $[17] !== L)
    ((t = e(Text, { bold: A, strikethrough: I, dimColor: L, children: B })),
      ($[14] = B),
      ($[15] = I),
      ($[16] = A),
      ($[17] = L),
      ($[18] = t));
  else t = $[18];
  let o;
  if ($[19] !== ownerColor || $[20] !== g || $[21] !== task.owner)
    ((o =
      g &&
      r(Text, {
        dimColor: !0,
        children: [
          " (",
          ownerColor ? r(Text, { color: ownerColor, children: ["@", task.owner] }) : `@${task.owner}`,
          ")",
        ],
      })),
      ($[19] = ownerColor),
      ($[20] = g),
      ($[21] = task.owner),
      ($[22] = o));
  else o = $[22];
  let l;
  if ($[23] !== C || $[24] !== openBlockers)
    ((l =
      C &&
      r(Text, {
        dimColor: !0,
        children: [" ", re.pointerSmall, " blocked by", " ", [...openBlockers].sort(Be).map(Ie).join(", ")],
      })),
      ($[23] = C),
      ($[24] = openBlockers),
      ($[25] = l));
  else l = $[25];
  let m;
  if ($[26] !== b || $[27] !== t || $[28] !== o || $[29] !== l)
    ((m = r(Box, { children: [b, t, o, l] })),
      ($[26] = b),
      ($[27] = t),
      ($[28] = o),
      ($[29] = l),
      ($[30] = m));
  else m = $[30];
  let p;
  if ($[31] !== h || $[32] !== _)
    ((p = _ && h && e(Box, { children: r(Text, { dimColor: !0, children: ["  ", h, re.ellipsis] }) })),
      ($[31] = h),
      ($[32] = _),
      ($[33] = p));
  else p = $[33];
  let u;
  if ($[34] !== m || $[35] !== p)
    ((u = r(Box, { flexDirection: "column", children: [m, p] })), ($[34] = m), ($[35] = p), ($[36] = u));
  else u = $[36];
  return u;
}

export { ExpandedTaskList, TaskListV2, getTaskIcon };
