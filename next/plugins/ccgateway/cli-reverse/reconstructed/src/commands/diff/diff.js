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
import { DIFF_UNAVAILABLE_TEXT } from "../../hooks/useWorkspaceDiff.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { resolveRenderMode } from "../../utils/fullscreen.js";

//@ chunk-19av2vh6.js:3996-4091 placement
/**
 * toggleDiffPanel：全屏模式切换 diff 面板。
 */
var toggleDiffPanel = async (onDone, context) => {
  onDone(context.toggleDiffPanel ? await context.toggleDiffPanel() : DIFF_UNAVAILABLE_TEXT, {
    display: "system",
  });
  return null;
};
//@ chunk-19av2vh6.js:4091-4208 fingerprint = call (0.615)
var openDiffDialog = async (onDone, context) => {
  let { DiffDialog } = await import("../../components/diff/DiffDialog.js");
  return jsxProd_default(DiffDialog, {
    messages: context.messages,
    onDone,
  });
};
//@ chunk-19av2vh6.js:4208-4306 placement
/**
 * /diff 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var callDiff = (onDone, context, args, invokedName) =>
  resolveRenderMode(context.presentation, context.dispatchedAsImmediate) === "fullscreen"
    ? toggleDiffPanel(onDone, context, args, invokedName)
    : openDiffDialog(onDone, context, args, invokedName);
export { callDiff };
