/**
 * components/tasks/ShellProgress.tsx
 *
 * 后台 shell 任务状态文字。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/ShellProgress.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: callgraph-fingerprint 1, fingerprint 1
 */
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { StatusIcon } from "../design-system/StatusIcon.js";

//@ chunk-18hwfzwa.js:698417-698759 callgraph-fingerprint = TaskStatusText (0.375)
function TaskStatusText(t0) {
  switch (t0) {
    case "running":
      return jsxProd_default(StatusIcon, {
        status: "running",
      });
    case "pending":
      return jsxProd_default(StatusIcon, {
        status: "pending",
      });
    case "completed":
      return jsxProd_default(StatusIcon, {
        status: "success",
      });
    case "failed":
      return jsxProd_default(StatusIcon, {
        status: "error",
      });
    case "killed":
      return jsxProd_default(StatusIcon, {
        status: "warning",
        "aria-label": "stopped:",
      });
    case "paused":
      return jsxProd_default(StatusIcon, {
        status: "off",
        "aria-label": "paused:",
      });
  }
}
//@ chunk-18hwfzwa.js:698759-698928 fingerprint = ShellProgress (0.736)
function ShellProgress(t0) {
  switch (t0) {
    case "completed":
      return "done";
    case "failed":
      return "error";
    case "killed":
      return "stopped";
    case "running":
    case "pending":
    case "paused":
      return "running";
  }
}
export { TaskStatusText, ShellProgress };
