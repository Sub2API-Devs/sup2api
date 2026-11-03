/**
 * commands/diff/diff.tsx
 *
 * /diff 实现：全屏模式切换 diff 面板，否则打开未提交改动对话框
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/diff/diff.tsx
 * pieces: chunk-19av2vh6.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { fyo } from "../../hooks/useWorkspaceDiff.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { resolveRenderMode } from "../../utils/fullscreen.js";

/**
 * toggleDiffPanel：全屏模式切换 diff 面板。
 */
//@ chunk-19av2vh6.js:3996-4091 placement
var toggleDiffPanel = async (a, l) => (
  a(l.toggleDiffPanel ? await l.toggleDiffPanel() : fyo, { display: "system" }),
  null
);
//@ chunk-19av2vh6.js:4091-4208 fingerprint = call (0.615)
var openDiffDialog = async (onDone, context) => {
  let { DiffDialog: DiffDialog } = await import("./chunk-mtx4csef.js");
  return e(DiffDialog, { messages: context.messages, onDone: onDone });
};
/**
 * /diff 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-19av2vh6.js:4208-4306 placement
var callDiff = (onDone, context, args, invokedName) =>
  resolveRenderMode(context.presentation, context.dispatchedAsImmediate) === "fullscreen"
    ? toggleDiffPanel(onDone, context, args, invokedName)
    : openDiffDialog(onDone, context, args, invokedName);
