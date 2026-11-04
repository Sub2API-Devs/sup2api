/**
 * remote/tools/protocolNegotiation.ts
 *
 * 2.1.316 新增：工具宿主接口版本协商
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f2w97cfp.js (5)
 * attribution: placement 5
 */
import { FILE_READ_TOOL_NAME, ALLOW_LARGE_PARAM } from "../../tools/FileReadTool/constants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, int } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-f2w97cfp.js:305-378 placement
function clampMinVersion(minVersion, maxVersion) {
  return minVersion !== undefined &&
    Number.isInteger(minVersion) &&
    minVersion >= 6 &&
    minVersion <= maxVersion
    ? minVersion
    : 6;
}
//@ chunk-f2w97cfp.js:378-740 placement
/**
 * 工具宿主界面特性版本表：从 first=5 到 repoHooksListing=18 的每个特性及其版本号，并取最新版本作为当前界面版本。
 */
var TOOL_HOST_INTERFACE_FEATURES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var max;
var FEATURE_REQUIREMENTS;
deferInit("chunk-f2w97cfp.js:378", () => {
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
  };
  max = Math.max(...Object.values(TOOL_HOST_INTERFACE_FEATURES));
  FEATURE_REQUIREMENTS = {
    [FILE_READ_TOOL_NAME]: {
      [ALLOW_LARGE_PARAM]: TOOL_HOST_INTERFACE_FEATURES.readAllowLarge,
    },
  };
});
//@ chunk-f2w97cfp.js:740-929 placement
/**
 * 导出函数 `TOOL_HOST_INTERFACE_VERSION`。
 */
var TOOL_HOST_INTERFACE_VERSION; // deferred: uses TOOL_HOST_INTERFACE_FEATURES of its import cycle while loading; runs once the cycle is complete
var MINIMAL_INTERFACE_VERSION;
var toolHostInterfaceSchema;
deferInit("chunk-f2w97cfp.js:740", () => {
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
//@ chunk-f2w97cfp.js:929-976 placement
function parseInterfaceVersion(value) {
  return toolHostInterfaceSchema().safeParse(value).data;
}
//@ chunk-f2w97cfp.js:976-1156 placement
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
  toolHostInterfaceSchema,
  MINIMAL_INTERFACE_VERSION,
  TOOL_HOST_INTERFACE_FEATURES,
  TOOL_HOST_INTERFACE_VERSION,
  parseInterfaceVersion,
  compareInterfaceVersions,
  clampMinVersion,
};
