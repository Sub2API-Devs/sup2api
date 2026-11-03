/**
 * entrypoints/mcp/toolHostInterface.ts
 *
 * 2.1.316 新增：MCP serve 的工具宿主接口（anthropic/toolHostInterface）：版本协商、会话/守护进程过旧时的拒绝、工具输出上报。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rqan0pc1.js (7)
 * attribution: placement 7
 */
import {
  TOOL_HOST_INTERFACE_VERSION,
  clampMinVersion,
  parseInterfaceVersion,
  compareInterfaceVersions,
} from "../../remote/tools/protocolNegotiation.js";
import { nk } from "../../utils/subprocessEnvLoader.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { safeParseJSON } from "../../utils/json.js";
import { logForDebugging } from "../../utils/debug.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, oe } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-rqan0pc1.js:493-529 placement
var ANTHROPIC_TOOLHOSTINTERFACE = "anthropic/toolHostInterface";
//@ chunk-rqan0pc1.js:529-557 placement
function rangeToAnnounce() {
  return rangeRaisedAtLaunch();
}
//@ chunk-rqan0pc1.js:557-675 placement
function rangeRaisedAtLaunch() {
  let { version: version } = TOOL_HOST_INTERFACE_VERSION;
  return {
    version: version,
    min_version: clampMinVersion(nk.CLAUDE_CODE_MCP_SERVE_INTERFACE_MIN_VERSION, version),
  };
}
//@ chunk-rqan0pc1.js:675-993 placement
function interfaceVersionCapability() {
  let e = rangeToAnnounce(),
    n = nk.CLAUDE_CODE_MCP_SERVE_INTERFACE_MIN_VERSION;
  if (n !== void 0 && e?.min_version !== n)
    logFeatureSad("mcp_serve_tool_output", "launch_min_version_ignored", {
      launch_min_version: n,
      ...(e && { daemon_interface_version: e.version, daemon_interface_min_version: e.min_version }),
    });
  return { experimental: e === void 0 ? {} : { [ANTHROPIC_TOOLHOSTINTERFACE]: e } };
}
//@ chunk-rqan0pc1.js:993-1003 placement
var l = 100;
//@ chunk-rqan0pc1.js:1003-1962 placement
function refuseCallerInterface(e, n) {
  let i = isPlainObject(n) ? n[ANTHROPIC_TOOLHOSTINTERFACE] : void 0;
  if (i === void 0) return;
  let r = rangeToAnnounce();
  if (r === void 0) return;
  let s = typeof i === "string" && i.length <= l ? parseInterfaceVersion(safeParseJSON(i, !1)) : void 0,
    a =
      s === void 0
        ? "unreadable"
        : { peer_too_old: "session_too_old", self_too_old: "daemon_too_old", agreed: void 0 }[
            compareInterfaceVersions(r, s).kind
          ];
  if (a === void 0) return;
  let d = `${e} was not run: ${s === void 0 ? "this server could not read the version of the interface that its caller stated with the call" : a === "session_too_old" ? `this session speaks version ${s.version} of the interface to this server, which works with version ${r.min_version} or later` : `this session works with version ${s.min_version} or later of the interface to this server, which speaks version ${r.version}`}. Retrying won't help: tell the user.`;
  return (
    logForDebugging(`MCP server: ${d}`, { level: "warn" }),
    logFeatureSad("mcp_serve_tool_output", `caller_interface_${a}`, {
      daemon_interface_min_version: r.min_version,
    }),
    {
      isError: !0,
      content: [{ type: "text", text: d }],
      _meta: { [ANTHROPIC_TOOLHOSTINTERFACE]: { refused: a, range: r } },
    }
  );
}
//@ chunk-rqan0pc1.js:1962-2014 placement
var O = DoctorLazy(() => u({ refused: o(), range: oe().optional() }));

export { rangeRaisedAtLaunch, rangeToAnnounce };
