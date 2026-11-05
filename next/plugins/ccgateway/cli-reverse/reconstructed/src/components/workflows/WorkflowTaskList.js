/**
 * components/workflows/WorkflowTaskList.tsx
 *
 * 2.1.316 新增。工作流任务列表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n6w10qzg.js (3)
 * attribution: placement 3
 */
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { countWhere } from "../../utils/collections.js";
import { truncateToWidth, splitByDisplayWidth } from "../../utils/format.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { StatusIcon_2 } from "../design-system/StatusIcon.js";

//@ chunk-n6w10qzg.js:14721-14748 placement
var MAX_TASK_ROWS = 3;
var MAX_TASK_LABEL_WIDTH = 100;
var MAX_TASK_DETAIL_LINES = 12;
var MIN_TASK_ROWS = 6;
//@ chunk-n6w10qzg.js:14748-14820 placement
function normalizeTaskText(text) {
  return stripInvisibleChars(stripAnsiPerLine(text.replace(/\t/g, "  ")).trimEnd()).trimEnd();
}
//@ chunk-n6w10qzg.js:14820-15921 placement
function WorkflowTaskList({ tasks, expanded, width, indent }) {
  let lines = [];
  let completedCount = countWhere(tasks, (task) => task.status === "completed");
  lines.push([
    {
      text: "Tasks",
      bold: true,
      dimColor: true,
    },
    {
      text: truncateToWidth(` \xB7 ${completedCount}/${tasks.length} done`, width - 5),
      dimColor: true,
    },
  ]);
  let isCapped = tasks.length > MAX_TASK_ROWS;
  let visibleTasks = tasks;
  let hiddenTasks = [];
  if (!expanded && isCapped) {
    let sortedTasks = [
      ...tasks.filter((task) => task.status === "in_progress"),
      ...tasks.filter((task) => task.status === "pending"),
      ...tasks.filter((task) => task.status === "completed"),
    ];
    let visibleTaskSet = new Set(sortedTasks.slice(0, MAX_TASK_ROWS));
    visibleTasks = tasks.filter((task) => visibleTaskSet.has(task));
    hiddenTasks = sortedTasks.slice(MAX_TASK_ROWS);
  } else if (expanded && tasks.length > MAX_TASK_LABEL_WIDTH) {
    visibleTasks = tasks.slice(0, MAX_TASK_LABEL_WIDTH);
    hiddenTasks = tasks.slice(MAX_TASK_LABEL_WIDTH);
  }
  let max = Math.max(4, width - bunStringWidth(indent) - 2);
  for (let task of visibleTasks) {
    let taskText = normalizeTaskText(task.content);
    let taskLines = expanded ? splitByDisplayWidth(taskText, max) : [truncateToWidth(taskText, max)];
    let wrappedLines = taskLines.length > 0 ? taskLines : [""];
    for (let [lineIndex, lineText] of wrappedLines.entries())
      lines.push([
        {
          text: indent,
        },
        lineIndex === 0
          ? StatusIcon_2(task.status)
          : {
              text: " ",
            },
        {
          text: ` ${lineText}`,
          bold: task.status === "in_progress",
          dimColor: task.status !== "in_progress",
        },
      ]);
  }
  if (hiddenTasks.length > 0) {
    let moreSummary;
    if (expanded) moreSummary = `${hiddenTasks.length} more`;
    else {
      let summaryParts = [];
      let inProgressCount = countWhere(hiddenTasks, (task) => task.status === "in_progress");
      let pendingCount = countWhere(hiddenTasks, (task) => task.status === "pending");
      let completedHiddenCount = countWhere(hiddenTasks, (task) => task.status === "completed");
      if (inProgressCount > 0) summaryParts.push(`${inProgressCount} in progress`);
      if (pendingCount > 0) summaryParts.push(`${pendingCount} pending`);
      if (completedHiddenCount > 0) summaryParts.push(`${completedHiddenCount} completed`);
      moreSummary = summaryParts.join(", ");
    }
    lines.push([
      {
        text: truncateToWidth(`${indent}\u2026 +${moreSummary}`, width),
        dimColor: true,
      },
    ]);
  }
  return {
    lines,
    capped: isCapped,
  };
}
export { normalizeTaskText, MAX_TASK_DETAIL_LINES, MIN_TASK_ROWS, WorkflowTaskList };
