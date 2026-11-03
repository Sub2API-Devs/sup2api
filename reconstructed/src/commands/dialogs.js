/**
 * commands/dialogs.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: placement 1
 */
import { COMMAND_DIALOG_LOADERS } from "../screens/repl/commandDialogLoaders.js";

/**
 * resolveCommandDialog：local-jsx 命令未提供 load 时，按 dialogKey ?? name 从 COMMAND_DIALOG_LOADERS 懒加载实现 chunk。
 */
//@ chunk-18hwfzwa.js:40620-40744 placement = thinkback (0.685)
function resolveCommandDialog(h) {
  if (h.type !== "local-jsx") return;
  let x = h.dialogKey ?? h.name;
  return h.load ?? (Object.hasOwn(COMMAND_DIALOG_LOADERS, x) ? COMMAND_DIALOG_LOADERS[x] : void 0);
}

export { resolveCommandDialog };
