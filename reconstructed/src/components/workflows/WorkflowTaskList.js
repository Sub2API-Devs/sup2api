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
import { hr } from "../../utils/invisibleChars.js";
import { qa } from "../../utils/stripAnsi.js";
import { count } from "../../utils/collections.js";
import { truncateToWidth, splitByDisplayWidth } from "../../utils/format.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { StatusIcon_2 } from "../design-system/StatusIcon.js";

//@ chunk-axsvbsqv.js:13272-13299 placement
var $n = 3,
  _n = 100,
  kl = 12,
  Sl = 6;
//@ chunk-axsvbsqv.js:13299-13371 placement
function Le(o) {
  return hr(qa(o.replace(/\t/g, "  ")).trimEnd()).trimEnd();
}
//@ chunk-axsvbsqv.js:13371-14472 placement
function WorkflowTaskList({ tasks: tasks, expanded: expanded, width: width, indent: indent }) {
  let d = [],
    p = count(tasks, (v) => v.status === "completed");
  d.push([
    { text: "Tasks", bold: !0, dimColor: !0 },
    { text: truncateToWidth(` \xB7 ${p}/${tasks.length} done`, width - 5), dimColor: !0 },
  ]);
  let h = tasks.length > $n,
    b = tasks,
    x = [];
  if (!expanded && h) {
    let v = [
        ...tasks.filter((M) => M.status === "in_progress"),
        ...tasks.filter((M) => M.status === "pending"),
        ...tasks.filter((M) => M.status === "completed"),
      ],
      T = new Set(v.slice(0, $n));
    ((b = tasks.filter((M) => T.has(M))), (x = v.slice($n)));
  } else if (expanded && tasks.length > _n) ((b = tasks.slice(0, _n)), (x = tasks.slice(_n)));
  let max = Math.max(4, width - bunStringWidth(indent) - 2);
  for (let v of b) {
    let T = Le(v.content),
      M = expanded ? splitByDisplayWidth(T, max) : [truncateToWidth(T, max)],
      I = M.length > 0 ? M : [""];
    for (let [N, E] of I.entries())
      d.push([
        { text: indent },
        N === 0 ? StatusIcon_2(v.status) : { text: " " },
        { text: ` ${E}`, bold: v.status === "in_progress", dimColor: v.status !== "in_progress" },
      ]);
  }
  if (x.length > 0) {
    let v;
    if (expanded) v = `${x.length} more`;
    else {
      let T = [],
        M = count(x, (E) => E.status === "in_progress"),
        I = count(x, (E) => E.status === "pending"),
        N = count(x, (E) => E.status === "completed");
      if (M > 0) T.push(`${M} in progress`);
      if (I > 0) T.push(`${I} pending`);
      if (N > 0) T.push(`${N} completed`);
      v = T.join(", ");
    }
    d.push([{ text: truncateToWidth(`${indent}\u2026 +${v}`, width), dimColor: !0 }]);
  }
  return { lines: d, capped: h };
}

export { Le, kl, Sl, WorkflowTaskList };
