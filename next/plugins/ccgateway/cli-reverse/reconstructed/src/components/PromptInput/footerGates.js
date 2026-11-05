/**
 * components/PromptInput/footerGates.ts
 *
 * 输入框页脚显示条件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8wy31wqm.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { renderWithForceUpdate } from "../../hooks/useForceRender.js";
import { useStatelessShared } from "../../context/notifications.js";
import { currentToolPermissionContext } from "../../utils/permissions/currentPermissionContext.js";

//@ chunk-8wy31wqm.js:339-393 placement
/**
 * 函数 showSwarmFooterGate（swarm 页脚开关）；位于「输入框页脚显示条件（2.1.316 新增）」模块。
 */
function showSwarmFooterGate() {
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let isFullscreen = useIsFullscreen();
  return renderWithForceUpdate(useStatelessShared) && isFullscreen && !isScreenReaderEnabled;
}
//@ chunk-8wy31wqm.js:393-447 placement
/**
 * 函数 showFooterHintGate（页脚提示开关）；位于「输入框页脚显示条件（2.1.316 新增）」模块。
 */
function showFooterHintGate() {
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let isFullscreen = useIsFullscreen();
  return renderWithForceUpdate(currentToolPermissionContext) && isFullscreen && !isScreenReaderEnabled;
}
export { showSwarmFooterGate, showFooterHintGate };
