/**
 * commands/chrome/chromeDialogResponse.ts
 *
 * 2.1.316 新增。/chrome 对话框的响应（扩展检测与权限页）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vbhf914m.js (2)
 * attribution: placement 2
 */
import { HTTPS_CLAUDE_AI_CHROME } from "./chrome.js";
import {
  CHROME_EXTENSION_RECONNECT_URL,
  isChromeExtensionInstalled,
  isClaudeInChromeAllowed,
} from "../../utils/claudeInChrome/setup.js";
import { logForDebugging } from "../../utils/debug.js";
import { getGlobalConfig } from "../../utils/config.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME } from "../../utils/claudeInChrome/common.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { env } from "../../utils/env.js";

//@ chunk-vbhf914m.js:382-472 placement
var CHROME_PERMISSIONS_URL = "https://clau.de/chrome/permissions",
  m = {
    install: HTTPS_CLAUDE_AI_CHROME,
    reconnect: CHROME_EXTENSION_RECONNECT_URL,
    permissions: CHROME_PERMISSIONS_URL,
  };
/**
 * /chrome 对话框的响应（扩展检测与权限页）。
 */
//@ chunk-vbhf914m.js:472-993 placement
async function buildChromeDialogResponse({ mcpClients: mcpClients, atStartup: atStartup }) {
  let l = await isChromeExtensionInstalled().catch(
      (e) => (
        logForDebugging(
          `[Claude in Chrome] Extension detection failed: ${e instanceof Error ? e.message : String(e)}`,
          { level: "error" },
        ),
        !1
      ),
    ),
    o = getGlobalConfig(),
    any = mcpClients.some((e) => e.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME && e.type === "connected"),
    n = o.chromeExtension?.pairedDeviceName;
  return {
    allowed: isClaudeInChromeAllowed(),
    subscriber: isClaudeAISubscriber(),
    wsl: env.isWslEnvironment(),
    installed: l,
    connected: any,
    ...(any && n && { paired_browser: n }),
    enabled_by_default: o.claudeInChromeDefaultEnabled ?? !1,
    at_startup: await atStartup(o.claudeInChromeDefaultEnabled === !0),
    urls: { ...m },
  };
}

export { CHROME_PERMISSIONS_URL };
