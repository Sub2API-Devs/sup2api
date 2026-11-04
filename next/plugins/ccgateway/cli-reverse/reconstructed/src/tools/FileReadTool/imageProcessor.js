/**
 * tools/FileReadTool/imageProcessor.ts
 *
 * 图片处理调度器（setImmediate 调度）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileReadTool/imageProcessor.ts
 * pieces: chunk-1tz177x8.js (1)
 * attribution: fingerprint 1
 */
import { createUiMessagePort } from "../../plugins/functionHooks/surfaceClients.js";
import { dispatchUiMessage } from "../../plugins/functionHooks/ui/desktopSurface.js";
import { matcherLog } from "../../utils/hooks/functionHookMatchers.js";

//@ chunk-1tz177x8.js:26473-26606 fingerprint (2.1.88 match: getImageProcessor, 0.396)
/**
 * 创建图片处理调度器（setImmediate 调度，警告写日志）。
 */
var getImageProcessor = () =>
  createUiMessagePort({
    run: (message) => dispatchUiMessage(message),
    schedule: (task) => {
      let sharp = setImmediate(task);
      return () => {
        clearImmediate(sharp);
      };
    },
    warn: (record) => {
      matcherLog().log(record, "warn");
    },
  });
export { getImageProcessor };
