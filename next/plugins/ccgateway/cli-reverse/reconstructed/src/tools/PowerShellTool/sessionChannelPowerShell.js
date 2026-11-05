/**
 * tools/PowerShellTool/sessionChannelPowerShell.ts
 *
 * 2.1.316 新增：会话通道 PowerShell 提示与暂存行跟踪
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h6gkxbpm.js (6)
 * attribution: affinity 1, placement 5
 */
import { getPrompt } from "./prompt.js";
import { HOST_TOOL_INPUT_FIELD } from "../../bridge/deviceRegistration.js";
import { stringSchema, ZodObject } from "../../../vendor/zod/v4/classic/schemas.js";
import { PLACED_BY_NAME_TOOL_SPEC } from "../../utils/filePersistence/placedByName.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, toError } from "../../utils/errors.js";
import { markHostOnlyNativeTool } from "../../services/api/deferredToolsState.js";
import { isPowerShellToolEnabled } from "../../utils/shell/shellToolUtils.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { POWERSHELL_TOOL_NAME } from "./toolName.js";
import { logError } from "../../utils/log.js";
import { isRemoteToolForwardingEnabledCached } from "../../services/remoteTools/servingGates.js";
import { createSignal } from "../../utils/signal.js";
import { joined } from "../../services/homeSeed/workingFiles.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";

//@ chunk-h6gkxbpm.js:4020-4086 affinity
/**
 * require 并返回 PowerShellTool（不检查启用条件）。
 */
function powerShellTool() {
  return require("./PowerShellTool.js").PowerShellTool;
}
//@ chunk-h6gkxbpm.js:4086-5119 placement
function sessionChannelPowerShellPrompt(machine, options) {
  let powerShellModule = powerShellTool();
  let prompt = getPrompt({
    edition: options?.powershell?.edition ?? null,
    buildTools: [],
    onWindows: true,
    backgroundRuns: false,
  });
  let value = omitSchemaFields(powerShellModule.inputSchema, ["run_in_background"]).extend({
    [HOST_TOOL_INPUT_FIELD]: stringSchema()
      .optional()
      .describe(
        "Optional. Names the attached computer this runs on \u2014 the attached-machines note says which computers serve PowerShell. While exactly one does it may be omitted and the call runs there; when several do, name one. It never runs in this session's own environment, which has no PowerShell. The result says where it ran.",
      ),
  });
  let toolStub = Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(powerShellModule),
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
            `PowerShell runs only on ${machine}; the session runs it there and it cannot run here.`,
            "session-channel PowerShell tool called without being routed to its machine",
          );
        },
        enumerable: true,
      },
    },
  );
  return markHostOnlyNativeTool(toolStub);
}
//@ chunk-h6gkxbpm.js:5119-5361 placement
function countPowerShellCallsWhenDisabled(announcer, toolUses) {
  if (isPowerShellToolEnabled()) return 0;
  let hosts = normalizeCaseForComparison_2(
    toolUses.filter((toolUse) => toolUse.tool === POWERSHELL_TOOL_NAME).map((toolUse) => toolUse.host),
  );
  if (hosts.length === 0) return 0;
  let announcements;
  try {
    announcements = hosts.map((machine) => ({
      tool: sessionChannelPowerShellPrompt(machine, undefined),
      machine,
    }));
  } catch (error) {
    logError(toError(error));
    return 0;
  }
  announcer.presentUntilAnnounced(announcements, isRemoteToolForwardingEnabledCached);
  return announcements.length;
}
//@ chunk-h6gkxbpm.js:5361-5579 placement
function omitSchemaFields(inputSchema, fields) {
  if (!(inputSchema instanceof ZodObject))
    throw TypeError("PowerShellTool no longer declares an object schema");
  let filtered = fields.filter((fieldName) => fieldName in inputSchema.shape);
  let dropMask = Object.fromEntries(filtered.map((fieldName) => [fieldName, true]));
  return filtered.length === 0 ? inputSchema : inputSchema.omit(dropMask);
}
//@ chunk-h6gkxbpm.js:5579-5595 placement
/**
 * 暂存行追踪只保留最近 8 条记录。
 */
var MAX_STAGED_ROWS = 8;
var MAX_CONTENT_HASH_CHARS = 256;
//@ chunk-h6gkxbpm.js:5595-6705 placement
function createStagedRowTracker(now = () => performance.now()) {
  let announcements = [];
  let pendingRows = [];
  let turnAtHold = 0;
  let announcementCount = 0;
  let firstCommandDequeued = false;
  let userFrameDelivered = false;
  let loggedMissingEtag = false;
  let signal = createSignal();
  return {
    noteStagedRow(row) {
      if (row.mount_path !== joined) return false;
      let contentSha256 = row.content_sha256;
      let etag =
        typeof contentSha256 === "string" &&
        contentSha256.length > 0 &&
        contentSha256.length <= MAX_CONTENT_HASH_CHARS
          ? contentSha256
          : null;
      if (etag === null) {
        if (!loggedMissingEtag) {
          loggedMissingEtag = true;
          logForDiagnosticsNoPII("warn", "home_seed_stage_without_usable_etag", {});
        }
        return false;
      }
      announcementCount++;
      let announcement = {
        etag,
        beforeFirstCommand: !firstCommandDequeued && !userFrameDelivered,
        ordinal: announcementCount,
      };
      announcements = [...announcements, announcement].slice(-MAX_STAGED_ROWS);
      pendingRows = [
        ...pendingRows,
        {
          etag,
          ordinal: announcementCount,
          heardAtMs: now(),
          turnsAtHoldBefore: turnAtHold,
        },
      ].slice(-MAX_STAGED_ROWS);
      try {
        signal.emit(announcement);
      } catch {
        logForDiagnosticsNoPII("error", "home_seed_announcement_listener_threw", {});
      }
      return true;
    },
    noteStagedRowRead(row) {
      if (row.mount_path !== joined) return;
      let found = pendingRows.find((pendingRow) => pendingRow.etag === row.content_sha256);
      if (found === undefined)
        return {
          onRecord: false,
        };
      pendingRows = pendingRows.filter((pendingRow) => pendingRow !== found);
      return {
        onRecord: true,
        ordinal: found.ordinal,
        behindMs: Math.round(now() - found.heardAtMs),
        turnsAtHoldBefore: found.turnsAtHoldBefore,
        turnAtHoldMeanwhile: turnAtHold > found.turnsAtHoldBefore,
      };
    },
    markTurnAtHold() {
      turnAtHold++;
    },
    markUserFrameDelivered() {
      userFrameDelivered = true;
    },
    markFirstCommandDequeued() {
      firstCommandDequeued = true;
    },
    firstCommandDequeued() {
      return firstCommandDequeued;
    },
    announcements() {
      return announcements;
    },
    announcementCount() {
      return announcementCount;
    },
    announcementForEtag(etag) {
      return announcements.findLast((announcement) => announcement.etag === etag);
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
