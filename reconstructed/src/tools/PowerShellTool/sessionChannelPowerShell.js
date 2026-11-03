/**
 * tools/PowerShellTool/sessionChannelPowerShell.ts
 *
 * 2.1.316 新增：会话通道 PowerShell 提示与暂存行跟踪
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-azz22fvc.js (5)
 * attribution: placement 5
 */
import { getPowerShellTool } from "../../tools.js";
import { getPrompt } from "./prompt.js";
import { $r } from "../../bridge/deviceRegistration.js";
import { o, B1e } from "../../../vendor/zod/v4/classic/schemas.js";
import { PLACED_BY_NAME_TOOL_SPEC } from "../../utils/filePersistence/placedByName.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, toError } from "../../utils/errors.js";
import { Vri } from "../../services/api/deferredToolsState.js";
import { isPowerShellToolEnabled } from "../../utils/shell/shellToolUtils.js";
import { uniq } from "../../utils/collections.js";
import { POWERSHELL_TOOL_NAME } from "./toolName.js";
import { logError } from "../../utils/log.js";
import { isRemoteToolForwardingEnabledCached } from "../../services/remoteTools/servingGates.js";
import { createSignal } from "../../utils/signal.js";
import { joined } from "../../services/homeSeed/workingFiles.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";

//@ chunk-azz22fvc.js:4123-5156 placement
function sessionChannelPowerShellPrompt(e, t) {
  let r = getPowerShellTool(),
    a = getPrompt({
      edition: t?.powershell?.edition ?? null,
      buildTools: [],
      onWindows: !0,
      backgroundRuns: !1,
    }),
    extend = omitSchemaFields(r.inputSchema, ["run_in_background"]).extend({
      [$r]: o()
        .optional()
        .describe(
          "Optional. Names the attached computer this runs on \u2014 the attached-machines note says which computers serve PowerShell. While exactly one does it may be omitted and the call runs there; when several do, name one. It never runs in this session's own environment, which has no PowerShell. The result says where it ran.",
        ),
    }),
    defineProperties = Object.defineProperties(
      {},
      {
        ...Object.getOwnPropertyDescriptors(r),
        inputSchema: { value: extend, enumerable: !0 },
        prompt: { value: async () => a, enumerable: !0 },
        isEnabled: { value: () => !0, enumerable: !0 },
        remoteExecution: { value: PLACED_BY_NAME_TOOL_SPEC, enumerable: !0 },
        suppressesAllPermissionUpdates: { value: () => !0, enumerable: !0 },
        call: {
          value: async () => {
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `PowerShell runs only on ${e}; the session runs it there and it cannot run here.`,
              "session-channel PowerShell tool called without being routed to its machine",
            );
          },
          enumerable: !0,
        },
      },
    );
  return Vri(defineProperties);
}
//@ chunk-azz22fvc.js:5156-5398 placement
function countPowerShellCallsWhenDisabled(e, t) {
  if (isPowerShellToolEnabled()) return 0;
  let r = uniq(t.filter((n) => n.tool === POWERSHELL_TOOL_NAME).map((n) => n.host));
  if (r.length === 0) return 0;
  let a;
  try {
    a = r.map((n) => ({ tool: sessionChannelPowerShellPrompt(n, void 0), machine: n }));
  } catch (error) {
    return (logError(toError(error)), 0);
  }
  return (e.presentUntilAnnounced(a, isRemoteToolForwardingEnabledCached), a.length);
}
//@ chunk-azz22fvc.js:5398-5616 placement
function omitSchemaFields(e, t) {
  if (!(e instanceof B1e)) throw TypeError("PowerShellTool no longer declares an object schema");
  let filtered = t.filter((n) => n in e.shape),
    fromEntries = Object.fromEntries(filtered.map((n) => [n, !0]));
  return filtered.length === 0 ? e : e.omit(fromEntries);
}
//@ chunk-azz22fvc.js:5616-5632 placement
var O = 8,
  Spo = 256;
//@ chunk-azz22fvc.js:5632-6742 placement
function createStagedRowTracker(e = () => performance.now()) {
  let t = [],
    r = [],
    a = 0,
    n = 0,
    s = !1,
    c = !1,
    f = !1,
    p = createSignal();
  return {
    noteStagedRow(m) {
      if (m.mount_path !== joined) return !1;
      let content_sha256 = m.content_sha256,
        u =
          typeof content_sha256 === "string" && content_sha256.length > 0 && content_sha256.length <= Spo
            ? content_sha256
            : null;
      if (u === null) {
        if (!f) ((f = !0), logForDiagnosticsNoPII("warn", "home_seed_stage_without_usable_etag", {}));
        return !1;
      }
      n++;
      let y = { etag: u, beforeFirstCommand: !s && !c, ordinal: n };
      ((t = [...t, y].slice(-O)),
        (r = [...r, { etag: u, ordinal: n, heardAtMs: e(), turnsAtHoldBefore: a }].slice(-O)));
      try {
        p.emit(y);
      } catch {
        logForDiagnosticsNoPII("error", "home_seed_announcement_listener_threw", {});
      }
      return !0;
    },
    noteStagedRowRead(m) {
      if (m.mount_path !== joined) return;
      let found = r.find((u) => u.etag === m.content_sha256);
      if (found === void 0) return { onRecord: !1 };
      return (
        (r = r.filter((u) => u !== found)),
        {
          onRecord: !0,
          ordinal: found.ordinal,
          behindMs: Math.round(e() - found.heardAtMs),
          turnsAtHoldBefore: found.turnsAtHoldBefore,
          turnAtHoldMeanwhile: a > found.turnsAtHoldBefore,
        }
      );
    },
    markTurnAtHold() {
      a++;
    },
    markUserFrameDelivered() {
      c = !0;
    },
    markFirstCommandDequeued() {
      s = !0;
    },
    firstCommandDequeued() {
      return s;
    },
    announcements() {
      return t;
    },
    announcementCount() {
      return n;
    },
    announcementForEtag(m) {
      return t.findLast((d) => d.etag === m);
    },
    announced: { subscribe: p.subscribe },
  };
}

export { createStagedRowTracker, countPowerShellCallsWhenDisabled, sessionChannelPowerShellPrompt, Spo };
