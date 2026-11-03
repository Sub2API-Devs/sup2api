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
import { HOST_TOOL_INPUT_FIELD } from "../../bridge/deviceRegistration.js";
import { string, B1e } from "../../../vendor/zod/v4/classic/schemas.js";
import { PLACED_BY_NAME_TOOL_SPEC } from "../../utils/filePersistence/placedByName.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, toError } from "../../utils/errors.js";
import { markHostOnlyNativeTool } from "../../services/api/deferredToolsState.js";
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
  let powerShellTool = getPowerShellTool();
  let prompt = getPrompt({
    edition: t?.powershell?.edition ?? null,
    buildTools: [],
    onWindows: true,
    backgroundRuns: false,
  });
  let value = omitSchemaFields(powerShellTool.inputSchema, ["run_in_background"]).extend({
    [HOST_TOOL_INPUT_FIELD]: string()
      .optional()
      .describe(
        "Optional. Names the attached computer this runs on \u2014 the attached-machines note says which computers serve PowerShell. While exactly one does it may be omitted and the call runs there; when several do, name one. It never runs in this session's own environment, which has no PowerShell. The result says where it ran.",
      ),
  });
  let s = Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(powerShellTool),
      inputSchema: {
        value,
        enumerable: true,
      },
      prompt: {
        value: async () => prompt,
        enumerable: true,
      },
      isEnabled: {
        value: () => true,
        enumerable: true,
      },
      remoteExecution: {
        value: PLACED_BY_NAME_TOOL_SPEC,
        enumerable: true,
      },
      suppressesAllPermissionUpdates: {
        value: () => true,
        enumerable: true,
      },
      call: {
        value: async () => {
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `PowerShell runs only on ${e}; the session runs it there and it cannot run here.`,
            "session-channel PowerShell tool called without being routed to its machine",
          );
        },
        enumerable: true,
      },
    },
  );
  return markHostOnlyNativeTool(s);
}
//@ chunk-azz22fvc.js:5156-5398 placement
function countPowerShellCallsWhenDisabled(e, t) {
  if (isPowerShellToolEnabled()) return 0;
  let r = uniq(t.filter((n) => n.tool === POWERSHELL_TOOL_NAME).map((n) => n.host));
  if (r.length === 0) return 0;
  let a;
  try {
    a = r.map((n) => ({
      tool: sessionChannelPowerShellPrompt(n, undefined),
      machine: n,
    }));
  } catch (error) {
    logError(toError(error));
    return 0;
  }
  e.presentUntilAnnounced(a, isRemoteToolForwardingEnabledCached);
  return a.length;
}
//@ chunk-azz22fvc.js:5398-5616 placement
function omitSchemaFields(inputSchema, t) {
  if (!(inputSchema instanceof B1e)) throw TypeError("PowerShellTool no longer declares an object schema");
  let filtered = t.filter((n) => n in inputSchema.shape);
  let a = Object.fromEntries(filtered.map((n) => [n, true]));
  return filtered.length === 0 ? inputSchema : inputSchema.omit(a);
}
//@ chunk-azz22fvc.js:5616-5632 placement
/**
 * 暂存行追踪只保留最近 8 条记录。
 */
var MAX_STAGED_ROWS = 8;
var MAX_CONTENT_HASH_CHARS = 256;
//@ chunk-azz22fvc.js:5632-6742 placement
function createStagedRowTracker(e = () => performance.now()) {
  let t = [];
  let r = [];
  let a = 0;
  let n = 0;
  let s = false;
  let c = false;
  let f = false;
  let signal = createSignal();
  return {
    noteStagedRow(m) {
      if (m.mount_path !== joined) return false;
      let contentSha256 = m.content_sha256;
      let u =
        typeof contentSha256 === "string" &&
        contentSha256.length > 0 &&
        contentSha256.length <= MAX_CONTENT_HASH_CHARS
          ? contentSha256
          : null;
      if (u === null) {
        if (!f) {
          f = true;
          logForDiagnosticsNoPII("warn", "home_seed_stage_without_usable_etag", {});
        }
        return false;
      }
      n++;
      let y = {
        etag: u,
        beforeFirstCommand: !s && !c,
        ordinal: n,
      };
      t = [...t, y].slice(-MAX_STAGED_ROWS);
      r = [
        ...r,
        {
          etag: u,
          ordinal: n,
          heardAtMs: e(),
          turnsAtHoldBefore: a,
        },
      ].slice(-MAX_STAGED_ROWS);
      try {
        signal.emit(y);
      } catch {
        logForDiagnosticsNoPII("error", "home_seed_announcement_listener_threw", {});
      }
      return true;
    },
    noteStagedRowRead(m) {
      if (m.mount_path !== joined) return;
      let found = r.find((u) => u.etag === m.content_sha256);
      if (found === undefined)
        return {
          onRecord: false,
        };
      r = r.filter((u) => u !== found);
      return {
        onRecord: true,
        ordinal: found.ordinal,
        behindMs: Math.round(e() - found.heardAtMs),
        turnsAtHoldBefore: found.turnsAtHoldBefore,
        turnAtHoldMeanwhile: a > found.turnsAtHoldBefore,
      };
    },
    markTurnAtHold() {
      a++;
    },
    markUserFrameDelivered() {
      c = true;
    },
    markFirstCommandDequeued() {
      s = true;
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
    announced: {
      subscribe: signal.subscribe,
    },
  };
}
export {
  createStagedRowTracker,
  countPowerShellCallsWhenDisabled,
  sessionChannelPowerShellPrompt,
  MAX_CONTENT_HASH_CHARS,
};
