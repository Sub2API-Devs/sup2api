/**
 * components/workflows/WorkflowTaskList.tsx
 *
 * 2.1.316 新增。工作流任务列表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axsvbsqv.js (3)
 * attribution: placement 3
 */
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { count } from "../../utils/collections.js";
import { truncateToWidth, splitByDisplayWidth } from "../../utils/format.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { StatusIcon_2 } from "../design-system/StatusIcon.js";

//@ chunk-axsvbsqv.js:13272-13299 placement
var MAX_TASK_ROWS = 3;
var MAX_TASK_LABEL_WIDTH = 100;
var MAX_TASK_DETAIL_LINES = 12;
var MIN_TASK_ROWS = 6;
//@ chunk-axsvbsqv.js:13299-13371 placement
function normalizeTaskText(o) {
  return stripInvisibleChars(stripAnsiPerLine(o.replace(/\t/g, "  ")).trimEnd()).trimEnd();
}
//@ chunk-axsvbsqv.js:13371-14472 placement
function WorkflowTaskList({ tasks, expanded, width, indent }) {
  let d = [];
  let p = count(tasks, (v) => v.status === "completed");
  d.push([
    {
      text: "Tasks",
      bold: true,
      dimColor: true,
    },
    {
      text: truncateToWidth(` \xB7 ${p}/${tasks.length} done`, width - 5),
      dimColor: true,
    },
  ]);
  let h = tasks.length > MAX_TASK_ROWS;
  let b = tasks;
  let x = [];
  if (!expanded && h) {
    let v = [
      ...tasks.filter((task) => task.status === "in_progress"),
      ...tasks.filter((task) => task.status === "pending"),
      ...tasks.filter((task) => task.status === "completed"),
    ];
    let T = new Set(v.slice(0, MAX_TASK_ROWS));
    b = tasks.filter((task) => T.has(task));
    x = v.slice(MAX_TASK_ROWS);
  } else if (expanded && tasks.length > MAX_TASK_LABEL_WIDTH) {
    b = tasks.slice(0, MAX_TASK_LABEL_WIDTH);
    x = tasks.slice(MAX_TASK_LABEL_WIDTH);
  }
  let max = Math.max(4, width - bunStringWidth(indent) - 2);
  for (let v of b) {
    let T = normalizeTaskText(v.content);
    let M = expanded ? splitByDisplayWidth(T, max) : [truncateToWidth(T, max)];
    let I = M.length > 0 ? M : [""];
    for (let [N, E] of I.entries())
      d.push([
        {
          text: indent,
        },
        N === 0
          ? StatusIcon_2(v.status)
          : {
              text: " ",
            },
        {
          text: ` ${E}`,
          bold: v.status === "in_progress",
          dimColor: v.status !== "in_progress",
        },
      ]);
  }
  if (x.length > 0) {
    let v;
    if (expanded) v = `${x.length} more`;
    else {
      let T = [];
      let M = count(x, (E) => E.status === "in_progress");
      let I = count(x, (E) => E.status === "pending");
      let N = count(x, (E) => E.status === "completed");
      if (M > 0) T.push(`${M} in progress`);
      if (I > 0) T.push(`${I} pending`);
      if (N > 0) T.push(`${N} completed`);
      v = T.join(", ");
    }
    d.push([
      {
        text: truncateToWidth(`${indent}\u2026 +${v}`, width),
        dimColor: true,
      },
    ]);
  }
  return {
    lines: d,
    capped: h,
  };
}
export { normalizeTaskText, MAX_TASK_DETAIL_LINES, MIN_TASK_ROWS, WorkflowTaskList };
