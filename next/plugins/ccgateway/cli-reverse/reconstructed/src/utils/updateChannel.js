/**
 * utils/updateChannel.ts
 *
 * 更新通道（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vjd99kgw.js (1)
 * attribution: placement 1
 */
import { getInitialSettings_2 } from "./settings/settings.js";

//@ chunk-vjd99kgw.js:227-315 placement
/**
 * 取自动更新通道（缺省 latest）。
 */
function autoUpdatesChannel() {
  let autoUpdatesChannel = getInitialSettings_2()?.autoUpdatesChannel;
  if (autoUpdatesChannel && autoUpdatesChannel !== "latest") return autoUpdatesChannel;
  return "latest";
}
export { autoUpdatesChannel };
