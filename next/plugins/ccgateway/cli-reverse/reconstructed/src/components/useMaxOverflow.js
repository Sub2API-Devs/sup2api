/**
 * components/useMaxOverflow.ts
 *
 * 记录布局溢出的最大值 hook，供“上方还有内容”判定（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8prszgkd.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useState, useLayoutEffect } from "../../vendor/react/cjs/react.production.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";

//@ chunk-8prszgkd.js:21182-21466 placement
/**
 * 记录并取布局溢出的最大值（终端尺寸变化时重置），全屏被禁用时直接返回传入值。
 */
function useGrownOverflow(wanted) {
  let { columns, rows } = useTerminalSize();
  let [state, setState] = useState({
    columns,
    rows,
    overflow: -1 / 0,
  });
  let sizeUnchanged = state.columns === columns && state.rows === rows;
  useLayoutEffect(() => {
    if (!sizeUnchanged)
      setState({
        columns,
        rows,
        overflow: -1 / 0,
      });
    else if (wanted > state.overflow)
      setState({
        columns,
        rows,
        overflow: wanted,
      });
  }, [sizeUnchanged, columns, rows, wanted, state.overflow]);
  return useIsFullscreen() ? wanted : Math.max(wanted, sizeUnchanged ? state.overflow : -1 / 0);
}
export { useGrownOverflow };
