/**
 * context/modalContext.tsx
 *
 * 模态框/终端尺寸上报（插件 UI）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/modalContext.tsx
 * pieces: chunk-bc20zedk.js (1)
 * attribution: fingerprint 1
 */
import { useLayoutEffect } from "../../vendor/react/cjs/react.production.js";
import { mountPluginImage, withSwap } from "../plugins/functionHooks/imageApi.js";

//@ chunk-bc20zedk.js:37038-37224 fingerprint (2.1.88 match: useModalOrTerminalSize, 0.669)
/**
 * 插件请求的模态框 key 变化或终端尺寸变化时上报尺寸。
 */
function useModalOrTerminalSize(modalWidth, modalHeight, swap) {
  let { plugin, requestId, key } = modalWidth;
  let { columns, rows } = modalHeight;
  useLayoutEffect(() => {
    if (key === undefined) return;
    return mountPluginImage(
      withSwap(
        {
          plugin,
          requestId,
          key,
        },
        {
          columns,
          rows,
        },
        swap,
      ),
    );
  }, [plugin, requestId, key, columns, rows, swap]);
}
export { useModalOrTerminalSize };
