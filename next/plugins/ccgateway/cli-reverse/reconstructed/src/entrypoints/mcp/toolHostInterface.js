/**
 * entrypoints/mcp/toolHostInterface.ts
 *
 * 2.1.316 新增：MCP serve 的工具宿主接口（anthropic/toolHostInterface）：版本协商、会话/守护进程过旧时的拒绝、工具输出上报。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ae6gfkmc.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  TOOL_HOST_INTERFACE_VERSION,
  clampMinVersion,
  parseInterfaceVersion,
  compareInterfaceVersions,
} from "../../remote/tools/protocolNegotiation.js";
import { toolServerEnvAccessor } from "../../utils/subprocessEnvLoader.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { safeParseJSON } from "../../utils/json.js";
import { logForDebugging } from "../../utils/debug.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, unknown } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-ae6gfkmc.js:493-529 placement
var ANTHROPIC_TOOLHOSTINTERFACE = "anthropic/toolHostInterface";
//@ chunk-ae6gfkmc.js:529-557 placement
function rangeToAnnounce() {
  return rangeRaisedAtLaunch();
}
//@ chunk-ae6gfkmc.js:557-675 placement
function rangeRaisedAtLaunch() {
  let { version } = TOOL_HOST_INTERFACE_VERSION;
  return {
    version,
    min_version: clampMinVersion(toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_INTERFACE_MIN_VERSION, version),
  };
}
//@ chunk-ae6gfkmc.js:675-993 placement
function interfaceVersionCapability() {
  let range = rangeToAnnounce();
  let launchMinVersion = toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_INTERFACE_MIN_VERSION;
  if (launchMinVersion !== undefined && range?.min_version !== launchMinVersion)
    logFeatureSad("mcp_serve_tool_output", "launch_min_version_ignored", {
      launch_min_version: launchMinVersion,
      ...(range && {
        daemon_interface_version: range.version,
        daemon_interface_min_version: range.min_version,
      }),
    });
  return {
    experimental:
      range === undefined
        ? {}
        : {
            [ANTHROPIC_TOOLHOSTINTERFACE]: range,
          },
  };
}
//@ chunk-ae6gfkmc.js:993-1003 placement
var HOST_CALL_TIMEOUT_MS = 100;
//@ chunk-ae6gfkmc.js:1003-1962 placement
function refuseCallerInterface(toolName, meta) {
  let raw = isPlainObject(meta) ? meta[ANTHROPIC_TOOLHOSTINTERFACE] : undefined;
  if (raw === undefined) return;
  let range = rangeToAnnounce();
  if (range === undefined) return;
  let callerVersion =
    typeof raw === "string" && raw.length <= HOST_CALL_TIMEOUT_MS
      ? parseInterfaceVersion(safeParseJSON(raw, false))
      : undefined;
  let refusal =
    callerVersion === undefined
      ? "unreadable"
      : {
          peer_too_old: "session_too_old",
          self_too_old: "daemon_too_old",
          agreed: undefined,
        }[compareInterfaceVersions(range, callerVersion).kind];
  if (refusal === undefined) return;
  let message = `${toolName} was not run: ${callerVersion === undefined ? "this server could not read the version of the interface that its caller stated with the call" : refusal === "session_too_old" ? `this session speaks version ${callerVersion.version} of the interface to this server, which works with version ${range.min_version} or later` : `this session works with version ${callerVersion.min_version} or later of the interface to this server, which speaks version ${range.version}`}. Retrying won't help: tell the user.`;
  logForDebugging(`MCP server: ${message}`, {
    level: "warn",
  });
  logFeatureSad("mcp_serve_tool_output", `caller_interface_${refusal}`, {
    daemon_interface_min_version: range.min_version,
  });
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: message,
      },
    ],
    _meta: {
      [ANTHROPIC_TOOLHOSTINTERFACE]: {
        refused: refusal,
        range,
      },
    },
  };
}
//@ chunk-ae6gfkmc.js:1962-2014 placement
var ReadRangeResultSchema = DoctorLazy(() =>
  objectSchema({
    refused: stringSchema(),
    range: unknown().optional(),
  }),
);
export { rangeToAnnounce, rangeRaisedAtLaunch, interfaceVersionCapability, refuseCallerInterface };
