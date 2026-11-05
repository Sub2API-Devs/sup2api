/**
 * utils/updateChannel.ts
 *
 * 更新通道（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nt7p6yjz.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getInitialSettings } from "./settings/settings.js";

//@ chunk-nt7p6yjz.js:227-315 placement
/**
 * 取自动更新通道（缺省 latest）。
 */
function autoUpdatesChannel() {
  let autoUpdatesChannel = getInitialSettings()?.autoUpdatesChannel;
  if (autoUpdatesChannel && autoUpdatesChannel !== "latest") return autoUpdatesChannel;
  return "latest";
}
export { autoUpdatesChannel };
