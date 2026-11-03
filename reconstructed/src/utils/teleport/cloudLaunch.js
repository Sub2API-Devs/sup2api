/**
 * utils/teleport/cloudLaunch.ts
 *
 * 2.1.316 新增：云会话启动
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { printableName } from "../printableName.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";

/**
 * 云会话启动时 --tools 参数不支持的错误文案。
 */
//@ chunk-e6aww6q8.js:1874593-1876281 placement
var CLOUD_LAUNCH_TOOL_ERRORS =
    "The cloud session was not started: an empty --tools list asks for no built-in tools, which cloud sessions don't support yet. List the tools to keep, or leave --tools out.",
  gZo =
    "The cloud session was not started: --tools is not supported in a Remote Control environment. Leave --tools out, or use an Anthropic-hosted environment: choose one with /remote-env in claude, and drop any flag that names another.",
  hZo =
    "The cloud session was not started: --tools does not work yet with the self-hosted environment that this session would use. Leave --tools out, or use an Anthropic-hosted environment: choose one with /remote-env in claude, and drop any flag that names another.",
  _Zo =
    "The cloud session was not started: this launch needs a session that is attached to this computer, and a session in the self-hosted environment that it would use cannot be attached. Use an Anthropic-hosted environment: choose one with /remote-env in claude.",
  SZo =
    "The cloud session was not started: this version of Claude Code cannot tell whether the session's environment would apply a --tools list. Leave --tools out, or use an Anthropic-hosted environment: choose one with /remote-env in claude, and drop any flag that names another.",
  rnn =
    "The cloud session was not started: this command cannot start a session attached to this computer with both --tools and a prompt. Leave --tools out, or keep tools out with --disallowed-tools.",
  snn =
    "The cloud session was not started: limiting a cloud session to the tools you list with --tools is not available for your organization. Leave --tools out, or keep tools out with --disallowed-tools.",
  kZo = DoctorLazy(() => u({ error: u({ reason: T("builtin_tools_unavailable") }) }));
//@ chunk-e6aww6q8.js:1876281-1876330 placement
function kB(e) {
  return kZo().safeParse(e).success;
}
//@ chunk-e6aww6q8.js:1876330-1876398 placement
function inn(e) {
  return u({ deduplicated: T(!0) }).safeParse(e).success;
}
//@ chunk-e6aww6q8.js:1876398-1876431 placement
function ann(e) {
  return printableName(e, 200);
}
//@ chunk-e6aww6q8.js:1876431-1876711 placement
function duplicateSessionMessage(e) {
  return `No new cloud session was started: the service answered with a session it had already created for this request.${e.promptHeld ? " Your prompt was not sent." : ""} That session was left as it is. Look at it before you run the command again: ${ann(e.sessionUrl)}`;
}
//@ chunk-e6aww6q8.js:1876711-1877010 placement
function classifyPromptSendResult(e) {
  if (e.ok) return { kind: "sent" };
  if (e.status === void 0)
    return {
      kind: e.cause === "server" || e.cause === "timeout" || e.cause === "network" ? "busy" : "unsent",
      reason: e.reason,
    };
  if (e.status >= 200 && e.status < 300) return { kind: "sent" };
  return { kind: e.status === 408 || e.status === 429 ? "busy" : "refused", reason: e.reason };
}
//@ chunk-e6aww6q8.js:1877010-1877639 placement
function archiveCloudSession(e, n) {
  let replaced = printableName(e.reason, 400).replace(/\.$/, ""),
    s = replaced === "" ? "" : `: ${replaced}`,
    h = n.archived
      ? "The session was archived"
      : `The session could not be archived (archive it at ${ann(n.sessionUrl)})`,
    y = /^HTTP \d{3}$/.test(replaced)
      ? " Run the command again with --debug to record the service's full answer in the debug log."
      : "";
  return `The cloud session was created, but ${{ busy: `the service was busy or could not be reached while your prompt was being sent${s}. ${h}; run the command again in a moment.`, refused: `the service refused your prompt${s}. ${h}.${y}`, unsent: `your prompt could not be sent from this machine${s}. ${h}.${y}` }[e.kind]}`;
}
/**
 * 按环境类型返回不支持的启动结果与说明；Anthropic 云环境返回 null。
 */
//@ chunk-e6aww6q8.js:1877639-1877965 placement
function unsupportedEnvironmentOutcome(e, n) {
  switch (e) {
    case "anthropic_cloud":
      return null;
    case "bridge":
      return { outcome: "bridge_environment", message: gZo };
    case "self_hosted_pool":
      return n ? { outcome: "self_hosted_pool", message: _Zo } : null;
    case "byoc":
      return { outcome: "self_hosted_environment", message: hZo };
    default:
      return { outcome: "unknown_environment", message: SZo };
  }
}
//@ chunk-e6aww6q8.js:1877965-1878115 placement
function logBuiltinToolsCreate(e, n = !1) {
  if (e === "created") logFeatureOk("cloud_builtin_tools_create", { self_hosted_pool: n });
  else logFeatureBad("cloud_builtin_tools_create", e, { self_hosted_pool: n });
}
//@ chunk-e6aww6q8.js:1878115-1878148 placement
var X_TRUSTED_DEVICE_TOKEN = "X-Trusted-Device-Token";

export {
  inn,
  logBuiltinToolsCreate,
  duplicateSessionMessage,
  classifyPromptSendResult,
  archiveCloudSession,
  unsupportedEnvironmentOutcome,
  kB,
  CLOUD_LAUNCH_TOOL_ERRORS,
  rnn,
  snn,
  X_TRUSTED_DEVICE_TOKEN,
};
