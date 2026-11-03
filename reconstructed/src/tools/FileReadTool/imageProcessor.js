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

//@ chunk-1tz177x8.js:26473-26606 fingerprint = getImageProcessor (0.396)
/**
 * 创建图片处理调度器（setImmediate 调度，警告写日志）。
 */
var getImageProcessor = () =>
  createUiMessagePort({
    run: (e) => dispatchUiMessage(e),
    schedule: (e) => {
      let sharp = setImmediate(e);
      return () => {
        clearImmediate(sharp);
      };
    },
    warn: (e) => {
      matcherLog().log(e, "warn");
    },
  });
export { getImageProcessor };
