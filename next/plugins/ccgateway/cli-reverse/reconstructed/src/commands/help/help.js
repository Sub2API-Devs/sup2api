/**
 * commands/help/help.tsx
 *
 * /help 实现：命令帮助面板
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/help/help.tsx
 * pieces: chunk-yxcx2jtr.js (1)
 * attribution: fingerprint 1
 */
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { HelpV2 } from "../../components/HelpV2/HelpV2.js";

//@ chunk-yxcx2jtr.js:19220-19288 fingerprint = call (1)
/**
 * /help 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone, { options: { commands } }) =>
  jsxProd_default(HelpV2, {
    commands,
    onClose: onDone,
  });
export { call };
