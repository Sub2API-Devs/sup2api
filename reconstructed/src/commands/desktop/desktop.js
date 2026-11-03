/**
 * commands/desktop/desktop.tsx
 *
 * /desktop 实现：把当前会话交接给 Claude Desktop
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/desktop/desktop.tsx
 * pieces: chunk-ds2d8kad.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { DesktopHandoff, v } from "../../components/DesktopHandoff.js";
import { yN } from "../../utils/promptSubmissionOrigin.js";

/**
 * /desktop 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-ds2d8kad.js:18318-18400 callgraph-fingerprint = call (0.394)
async function call(onDone, context) {
  return e(DesktopHandoff, { onDone: onDone, handoff: v(), getTranscript: () => yN(context) });
}
