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
import { zt } from "../../vendor/react/cjs/react.production.js";
import { mountPluginImage, l$i } from "../plugins/functionHooks/imageApi.js";

/**
 * 插件请求的模态框 key 变化或终端尺寸变化时上报尺寸。
 */
//@ chunk-bc20zedk.js:37038-37224 fingerprint = useModalOrTerminalSize (0.669)
function useModalOrTerminalSize(o, p, a) {
  let { plugin: plugin, requestId: requestId, key: key } = o,
    { columns: columns, rows: rows } = p;
  zt(() => {
    if (key === void 0) return;
    return mountPluginImage(
      l$i({ plugin: plugin, requestId: requestId, key: key }, { columns: columns, rows: rows }, a),
    );
  }, [plugin, requestId, key, columns, rows, a]);
}

export { useModalOrTerminalSize };
