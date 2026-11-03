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
import { zodStrictObject, tc } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-f2w97cfp.js:305-378 placement
function clampMinVersion(e, n) {
  return e !== void 0 && Number.isInteger(e) && e >= 6 && e <= n ? e : 6;
}
//@ chunk-f2w97cfp.js:378-740 placement
var TOOL_HOST_INTERFACE_FEATURES = {
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
  },
  max = Math.max(...Object.values(TOOL_HOST_INTERFACE_FEATURES)),
  d = { [FILE_READ_TOOL_NAME]: { [ALLOW_LARGE_PARAM]: TOOL_HOST_INTERFACE_FEATURES.readAllowLarge } };
//@ chunk-f2w97cfp.js:740-929 placement
var TOOL_HOST_INTERFACE_VERSION = { version: max, min_version: clampMinVersion(void 0, max) },
  dkn = { version: TOOL_HOST_INTERFACE_VERSION.version, min_version: 1 },
  zYt = DoctorLazy(() =>
    zodStrictObject({ version: tc().min(1), min_version: tc().min(1) }).refine(
      ({ version: version, min_version: min_version }) => min_version <= version,
    ),
  );
//@ chunk-f2w97cfp.js:929-976 placement
function parseInterfaceVersion(e) {
  return zYt().safeParse(e).data;
}
//@ chunk-f2w97cfp.js:976-1156 placement
function compareInterfaceVersions(e, n) {
  if (n.version < e.min_version) return { kind: "peer_too_old" };
  return e.version < n.min_version
    ? { kind: "self_too_old" }
    : { kind: "agreed", version: Math.min(e.version, n.version) };
}

export {
  zYt,
  dkn,
  TOOL_HOST_INTERFACE_FEATURES,
  TOOL_HOST_INTERFACE_VERSION,
  parseInterfaceVersion,
  compareInterfaceVersions,
  clampMinVersion,
};
