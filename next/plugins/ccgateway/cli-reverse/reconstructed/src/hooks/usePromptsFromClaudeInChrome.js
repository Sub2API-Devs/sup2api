/**
 * hooks/usePromptsFromClaudeInChrome.tsx
 *
 * 接收 Claude in Chrome 扩展发来的提示（含图片）并提交，可切换权限模式。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/usePromptsFromClaudeInChrome.tsx
 * pieces: chunk-czq1j3j2.js (7)
 * attribution: placement 4, fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { toError } from "../utils/errors.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  objectSchema,
  literal,
  stringSchema,
  _enum,
  numberSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useCommandQueueOrDefault } from "../context/QueuedMessageContext.js";
import { useRef, useEffect } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getSessionBypassPermissionsMode } from "../bootstrap/state.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME } from "../utils/claudeInChrome/common.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:221928-221944 placement
function noopChromeEffect() {}
//@ chunk-czq1j3j2.js:221944-221994 placement
function logChromePermissionSyncOk() {
  return logFeatureOk("chrome_permission_sync");
}
//@ chunk-czq1j3j2.js:221994-222140 placement
function syncChromePermissionMode(error) {
  logFeatureSad("chrome_permission_sync", "set_mode_failed");
  logForDebugging(`claude-in-chrome set_permission_mode failed: ${toError(error).message}`, {
    level: "error",
  });
}
//@ chunk-czq1j3j2.js:222140-222352 fingerprint (2.1.88 match: ClaudeInChromePromptNotificationSchema, 0.877)
var ClaudeInChromePromptNotificationSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:222140", () => {
  ClaudeInChromePromptNotificationSchema = DoctorLazy(() =>
    objectSchema({
      method: literal("notifications/message"),
      params: objectSchema({
        prompt: stringSchema(),
        image: objectSchema({
          type: literal("base64"),
          media_type: _enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
          data: stringSchema(),
        }).optional(),
        tabId: numberSchema().optional(),
      }),
    }),
  );
});
//@ chunk-czq1j3j2.js:222352-222991 fingerprint (2.1.88 match: usePromptsFromClaudeInChrome, 0.707)
/**
 * 订阅 Claude in Chrome 的 notifications/message：把带图片的提示提交到会话，必要时切换权限模式（set_permission_mode）。
 */
function usePromptsFromClaudeInChrome(mcpClients, toolPermissionMode) {
  let $ = useMemoCache(8);
  let commandQueueOrDefault = useCommandQueueOrDefault();
  useRef(undefined);
  let effectDeps;
  if ($[0] !== mcpClients || $[1] !== commandQueueOrDefault) {
    effectDeps = [mcpClients, commandQueueOrDefault];
    $[0] = mcpClients;
    $[1] = commandQueueOrDefault;
    $[2] = effectDeps;
  } else effectDeps = $[2];
  useEffect(noopChromeEffect, effectDeps);
  let initialChromeMode;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    initialChromeMode = getChromePermissionMode();
    $[3] = initialChromeMode;
  } else initialChromeMode = $[3];
  let lastChromeModeRef = useRef(initialChromeMode);
  let clientRef = useRef(undefined);
  let syncPermissionMode;
  let syncDeps;
  if ($[4] !== mcpClients || $[5] !== toolPermissionMode) {
    syncPermissionMode = () => {
      let chromeClient = findChromeClient(mcpClients);
      let client = chromeClient?.client;
      if (clientRef.current !== client) {
        clientRef.current = client;
        lastChromeModeRef.current = getChromePermissionMode();
      }
      if (!chromeClient) {
        return;
      }
      let chromeMode = toolPermissionMode === "bypassPermissions" ? "skip_all_permission_checks" : "ask";
      if (lastChromeModeRef.current === chromeMode) {
        return;
      }
      lastChromeModeRef.current = chromeMode;
      let { callIdeRpc } = require("../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
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
    syncDeps = [mcpClients, toolPermissionMode];
    $[4] = mcpClients;
    $[5] = toolPermissionMode;
    $[6] = syncPermissionMode;
    $[7] = syncDeps;
  } else {
    syncPermissionMode = $[6];
    syncDeps = $[7];
  }
  useEffect(syncPermissionMode, syncDeps);
}
//@ chunk-czq1j3j2.js:222991-223053 placement (2.1.88 match: PERMISSION_MODES, 0.642)
/**
 * （误归此处）当前会话的 Chrome 权限模式：会话处于 bypass 时为 skip_all_permission_checks，否则 ask。
 */
function getChromePermissionMode() {
  return getSessionBypassPermissionsMode() ? "skip_all_permission_checks" : "ask";
}
//@ chunk-czq1j3j2.js:223053-223123 fingerprint (2.1.88 match: findChromeClient, 1)
function findChromeClient(clients) {
  return clients.find(
    (client) => client.type === "connected" && client.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME,
  );
}
export { usePromptsFromClaudeInChrome };
