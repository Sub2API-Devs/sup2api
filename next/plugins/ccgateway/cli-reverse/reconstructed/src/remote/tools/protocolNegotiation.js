/**
 * remote/tools/protocolNegotiation.ts
 *
 * 2.1.316 新增：工具宿主接口版本协商
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-37ybptf3.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { READ, ALLOW_LARGE_PARAM } from "../../tools/FileReadTool/constants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, int } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-37ybptf3.js:305-378 placement
function clampMinVersion(minVersion, maxVersion) {
  return minVersion !== undefined &&
    Number.isInteger(minVersion) &&
    minVersion >= 6 &&
    minVersion <= maxVersion
    ? minVersion
    : 6;
}
//@ chunk-37ybptf3.js:378-874 placement
/**
 * 工具宿主界面特性版本表：从 first=5 到 repoHooksListing=18 的每个特性及其版本号，并取最新版本作为当前界面版本。
 */
var TOOL_HOST_INTERFACE_FEATURES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var max;
var FEATURE_REQUIREMENTS;
deferInit("chunk-37ybptf3.js:378", () => {
  TOOL_HOST_INTERFACE_FEATURES = {
    first: 5,
    permissionRequestRenames: 6,
    readAllowLarge: 7,
    editOriginalFile: 8,
    containerSearchTools: 9,
    managedHookCall: 10,
    keptBackgroundCommands: 11,
    readCallsByToolUseId: 12,
    repoRulesReadHere: 13,
    repoRulesOnRenders: 14,
    repoRulesOnUploads: 15,
    whichCopyAsk: 16,
    runAnswersKept: 17,
    repoHooksListing: 18,
    readOutputDropsFileUnchanged: 19,
    shellDirectoryHeld: 20,
    pluginHttpHookCall: 21,
    hookConditionCall: 22,
    attachedComputerPermissionRequest: 23,
  };
  max = Math.max(...Object.values(TOOL_HOST_INTERFACE_FEATURES));
  FEATURE_REQUIREMENTS = {
    [READ]: {
      [ALLOW_LARGE_PARAM]: TOOL_HOST_INTERFACE_FEATURES.readAllowLarge,
    },
  };
});
//@ chunk-37ybptf3.js:874-1063 placement
/**
 * 导出函数 `TOOL_HOST_INTERFACE_VERSION`。
 */
var TOOL_HOST_INTERFACE_VERSION; // deferred: uses TOOL_HOST_INTERFACE_FEATURES of its import cycle while loading; runs once the cycle is complete
var MINIMAL_INTERFACE_VERSION;
var toolHostInterfaceSchema;
deferInit("chunk-37ybptf3.js:874", () => {
  TOOL_HOST_INTERFACE_VERSION = {
    version: max,
    min_version: clampMinVersion(undefined, max),
  };
  MINIMAL_INTERFACE_VERSION = {
    version: TOOL_HOST_INTERFACE_VERSION.version,
    min_version: 1,
  };
  toolHostInterfaceSchema = DoctorLazy(() =>
    zodStrictObject({
      version: int().min(1),
      min_version: int().min(1),
    }).refine(({ version, min_version: minVersion }) => minVersion <= version),
  );
});
//@ chunk-37ybptf3.js:1063-1110 placement
function parseInterfaceVersion(value) {
  return toolHostInterfaceSchema().safeParse(value).data;
}
//@ chunk-37ybptf3.js:1110-1290 placement
function compareInterfaceVersions(ours, peer) {
  if (peer.version < ours.min_version)
    return {
      kind: "peer_too_old",
    };
  return ours.version < peer.min_version
    ? {
        kind: "self_too_old",
      }
    : {
        kind: "agreed",
        version: Math.min(ours.version, peer.version),
      };
}
export {
  MINIMAL_INTERFACE_VERSION,
  toolHostInterfaceSchema,
  TOOL_HOST_INTERFACE_VERSION,
  parseInterfaceVersion,
  compareInterfaceVersions,
  TOOL_HOST_INTERFACE_FEATURES,
  clampMinVersion,
};
