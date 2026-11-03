/**
 * utils/teleport/autoModeDumps.ts
 *
 * 2.1.316 新增：auto mode 分类器转储文件名。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f25sswmp.js (2)
 * attribution: placement 2
 */

//@ chunk-f25sswmp.js:25264-25445 placement
var AUTO_MODE_DUMP_FILES = "auto-mode-classifier-error.txt",
  AUTO_MODE_DUMP = "auto-mode-dump.",
  AUTO_MODE_ENV_EDIT = "auto-mode-env-edit-",
  AUTO_MODE_BUILTINS = "auto-mode-builtins-",
  AUTO_MODE_CLASSIFIER_DUMP = "auto-mode-classifier-dump",
  AUTO_MODE_CLASSIFIER_SYSTEM = "auto-mode-classifier-system";
//@ chunk-f25sswmp.js:25445-25602 placement
function isClassifierDumpEvent(e) {
  if (typeof e !== "object" || e === null || !("type" in e)) return !1;
  return e.type === "auto-mode-classifier-dump" || e.type === "auto-mode-classifier-system";
}

export {
  AUTO_MODE_DUMP_FILES,
  AUTO_MODE_DUMP,
  AUTO_MODE_ENV_EDIT,
  AUTO_MODE_BUILTINS,
  isClassifierDumpEvent,
};
