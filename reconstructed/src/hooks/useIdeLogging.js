/**
 * hooks/useIdeLogging.ts
 *
 * 把 IDE 发来的日志事件转发为 tengu_ide_* 分析事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useIdeLogging.ts
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: fingerprint 2
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, T, o } from "../../vendor/zod/v4/classic/schemas.js";
import { P } from "../../vendor/react/cjs/react.production.js";
import { hasAccessToIDEExtensionDiffFeature } from "../services/compact/idleToolResultClearing.js";
import { onMcpNotification } from "../services/mcp/mcpWireUtils.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-18hwfzwa.js:207786-207884 fingerprint = LogEventSchema (0.849)
var LogEventSchema = DoctorLazy(() =>
  u({ method: T("log_event"), params: u({ eventName: o(), eventData: u({}).passthrough() }) }),
);
//@ chunk-18hwfzwa.js:207884-208031 fingerprint = useIdeLogging (0.863)
function useIdeLogging(mcpClients) {
  P(() => {
    if (!mcpClients.length) return;
    let ideClient = hasAccessToIDEExtensionDiffFeature(mcpClients);
    if (ideClient)
      onMcpNotification(ideClient, LogEventSchema(), (notification) => {
        let { eventName: eventName, eventData: eventData } = notification.params;
        logEvent(`tengu_ide_${eventName}`, eventData);
      });
  }, [mcpClients]);
}

export { useIdeLogging };
