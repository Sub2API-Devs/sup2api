/**
 * hooks/usePromptsFromClaudeInChrome.tsx
 *
 * 接收 Claude in Chrome 扩展发来的提示（含图片）并提交，可切换权限模式。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/usePromptsFromClaudeInChrome.tsx
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 4, fingerprint 3
 */
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { toError } from "../utils/errors.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, literal, string, _enum, E } from "../../vendor/zod/v4/classic/schemas.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useCommandQueueOrDefault } from "../context/QueuedMessageContext.js";
import { R, P } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getSessionBypassPermissionsMode } from "../bootstrap/state.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME } from "../utils/claudeInChrome/common.js";

//@ chunk-18hwfzwa.js:216890-216906 placement
function noopChromeEffect() {}
//@ chunk-18hwfzwa.js:216906-216956 placement
function logChromePermissionSyncOk() {
  return logFeatureOk("chrome_permission_sync");
}
//@ chunk-18hwfzwa.js:216956-217102 placement
function syncChromePermissionMode(At) {
  logFeatureSad("chrome_permission_sync", "set_mode_failed");
  logForDebugging(`claude-in-chrome set_permission_mode failed: ${toError(At).message}`, {
    level: "error",
  });
}
//@ chunk-18hwfzwa.js:217102-217314 fingerprint = ClaudeInChromePromptNotificationSchema (0.878)
var ClaudeInChromePromptNotificationSchema = DoctorLazy(() =>
  u({
    method: literal("notifications/message"),
    params: u({
      prompt: string(),
      image: u({
        type: literal("base64"),
        media_type: _enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
        data: string(),
      }).optional(),
      tabId: E().optional(),
    }),
  }),
);
//@ chunk-18hwfzwa.js:217314-217953 fingerprint = usePromptsFromClaudeInChrome (0.707)
/**
 * 订阅 Claude in Chrome 的 notifications/message：把带图片的提示提交到会话，必要时切换权限模式（set_permission_mode）。
 */
function usePromptsFromClaudeInChrome(mcpClients, toolPermissionMode) {
  let $ = w(8);
  let commandQueueOrDefault = useCommandQueueOrDefault();
  R(undefined);
  let ee;
  if ($[0] !== mcpClients || $[1] !== commandQueueOrDefault) {
    ee = [mcpClients, commandQueueOrDefault];
    $[0] = mcpClients;
    $[1] = commandQueueOrDefault;
    $[2] = ee;
  } else ee = $[2];
  P(noopChromeEffect, ee);
  let ke;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    ke = getChromePermissionMode();
    $[3] = ke;
  } else ke = $[3];
  let Re = R(ke);
  let clientRef = R(undefined);
  let He;
  let We;
  if ($[4] !== mcpClients || $[5] !== toolPermissionMode) {
    He = () => {
      let chromeClient = findChromeClient(mcpClients);
      let client = chromeClient?.client;
      if (clientRef.current !== client) {
        clientRef.current = client;
        Re.current = getChromePermissionMode();
      }
      if (!chromeClient) {
        return;
      }
      let chromeMode = toolPermissionMode === "bypassPermissions" ? "skip_all_permission_checks" : "ask";
      if (Re.current === chromeMode) {
        return;
      }
      Re.current = chromeMode;
      let { callIdeRpc } = require("./chunk-asne9cp8.js").mcpClientModule();
      callIdeRpc(
        "set_permission_mode",
        {
          mode: chromeMode,
        },
        chromeClient,
      )
        .then(logChromePermissionSyncOk)
        .catch(syncChromePermissionMode);
    };
    We = [mcpClients, toolPermissionMode];
    $[4] = mcpClients;
    $[5] = toolPermissionMode;
    $[6] = He;
    $[7] = We;
  } else {
    He = $[6];
    We = $[7];
  }
  P(He, We);
}
//@ chunk-18hwfzwa.js:217953-218015 placement = PERMISSION_MODES (0.642)
/**
 * （误归此处）当前会话的 Chrome 权限模式：会话处于 bypass 时为 skip_all_permission_checks，否则 ask。
 */
function getChromePermissionMode() {
  return getSessionBypassPermissionsMode() ? "skip_all_permission_checks" : "ask";
}
//@ chunk-18hwfzwa.js:218015-218085 fingerprint = findChromeClient (1)
function findChromeClient(clients) {
  return clients.find(
    (client) => client.type === "connected" && client.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME,
  );
}
export { usePromptsFromClaudeInChrome };
