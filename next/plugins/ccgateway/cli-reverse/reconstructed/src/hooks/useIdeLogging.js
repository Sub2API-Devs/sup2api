/**
 * hooks/useIdeLogging.ts
 *
 * 把 IDE 发来的日志事件转发为 tengu_ide_* 分析事件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useIdeLogging.ts
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: fingerprint 2
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, literal, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { useEffect } from "../../vendor/react/cjs/react.production.js";
import { hasAccessToIDEExtensionDiffFeature } from "../services/compact/idleToolResultClearing.js";
import { onMcpNotification } from "../services/mcp/mcpWireUtils.js";
import { logEvent } from "../services/analytics/index.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:212585-212683 fingerprint (2.1.88 match: LogEventSchema, 0.849)
var LogEventSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:212585", () => {
  LogEventSchema = DoctorLazy(() =>
    objectSchema({
      method: literal("log_event"),
      params: objectSchema({
        eventName: stringSchema(),
        eventData: objectSchema({}).passthrough(),
      }),
    }),
  );
});
//@ chunk-czq1j3j2.js:212683-212830 fingerprint (2.1.88 match: useIdeLogging, 0.863)
function useIdeLogging(mcpClients) {
  useEffect(() => {
    if (!mcpClients.length) return;
    let ideClient = hasAccessToIDEExtensionDiffFeature(mcpClients);
    if (ideClient)
      onMcpNotification(ideClient, LogEventSchema(), (notification) => {
        let { eventName, eventData } = notification.params;
        logEvent(`tengu_ide_${eventName}`, eventData);
      });
  }, [mcpClients]);
}
export { useIdeLogging };
