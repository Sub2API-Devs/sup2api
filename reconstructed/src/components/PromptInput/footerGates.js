/**
 * components/PromptInput/footerGates.ts
 *
 * 输入框页脚显示条件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a33zgk4j.js (2)
 * attribution: placement 2
 */
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { renderWithForceUpdate } from "../../hooks/useForceRender.js";
import { Ynn } from "../../context/notifications.js";
import { tE } from "../../utils/permissions/currentPermissionContext.js";

//@ chunk-a33zgk4j.js:339-393 placement
function Oy() {
  let e = useIsScreenReaderEnabled(),
    r = useIsFullscreen();
  return renderWithForceUpdate(Ynn) && r && !e;
}
//@ chunk-a33zgk4j.js:393-447 placement
function AHt() {
  let e = useIsScreenReaderEnabled(),
    r = useIsFullscreen();
  return renderWithForceUpdate(tE) && r && !e;
}

export { Oy, AHt };
