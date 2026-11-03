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
var CHROME_PERMISSIONS_URL = "https://clau.de/chrome/permissions";
var CHROME_CONSENT_URLS = {
  install: HTTPS_CLAUDE_AI_CHROME,
  reconnect: CHROME_EXTENSION_RECONNECT_URL,
  permissions: CHROME_PERMISSIONS_URL,
};
//@ chunk-vbhf914m.js:472-993 placement
/**
 * /chrome 对话框的响应（扩展检测与权限页）。
 */
async function buildChromeDialogResponse({ mcpClients, atStartup }) {
  let installed = await isChromeExtensionInstalled().catch((error) => {
    logForDebugging(
      `[Claude in Chrome] Extension detection failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return false;
  });
  let globalConfig = getGlobalConfig();
  let any = mcpClients.some(
    (mcpClient) => mcpClient.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME && mcpClient.type === "connected",
  );
  let pairedDeviceName = globalConfig.chromeExtension?.pairedDeviceName;
  return {
    allowed: isClaudeInChromeAllowed(),
    subscriber: isClaudeAISubscriber(),
    wsl: env.isWslEnvironment(),
    installed,
    connected: any,
    ...(any &&
      pairedDeviceName && {
        paired_browser: pairedDeviceName,
      }),
    enabled_by_default: globalConfig.claudeInChromeDefaultEnabled ?? false,
    at_startup: await atStartup(globalConfig.claudeInChromeDefaultEnabled === true),
    urls: {
      ...CHROME_CONSENT_URLS,
    },
  };
}
export { CHROME_PERMISSIONS_URL };
