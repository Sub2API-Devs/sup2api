/**
 * commands/dialogs.ts
 *
 * 2.1.316 新增：local-jsx 命令未提供 load 时，按 dialogKey ?? name 从 COMMAND_DIALOG_LOADERS 懒加载实现 chunk。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: placement 1
 */
import { COMMAND_DIALOG_LOADERS } from "../screens/repl/commandDialogLoaders.js";

//@ chunk-18hwfzwa.js:40620-40744 placement (2.1.88 match: thinkback, 0.685)
/**
 * resolveCommandDialog：local-jsx 命令未提供 load 时，按 dialogKey ?? name 从 COMMAND_DIALOG_LOADERS 懒加载实现 chunk。
 */
function resolveCommandDialog(command) {
  if (command.type !== "local-jsx") return;
  let dialogKey = command.dialogKey ?? command.name;
  return (
    command.load ??
    (Object.hasOwn(COMMAND_DIALOG_LOADERS, dialogKey) ? COMMAND_DIALOG_LOADERS[dialogKey] : undefined)
  );
}
export { resolveCommandDialog };
