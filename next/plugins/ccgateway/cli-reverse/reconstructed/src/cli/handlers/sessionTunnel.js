/**
 * cli/handlers/sessionTunnel.ts
 *
 * 2.1.316 新增。--session-tunnel：为远程会话建立隧道。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czv9g42s.js (8)
 * attribution: placement 8
 */
import { validateIngressOrigin } from "../../utils/teleport/relayEnv.js";
import { checkSdkUrl } from "../transports/sdkUrlValidation.js";
import { isLoopbackHost } from "../../utils/localhost.js";
import { DoctorLazy } from "./util.js";
import { objectSchema, literal, stringSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { INVALID } from "../../../vendor/zod/v4/core/core.js";
import { diskStateSchema } from "../../services/mcpServe/toolHostIds.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { toolServerEnvAccessor } from "../../utils/subprocessEnvLoader.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { decodeJwtExpiry } from "../../bridge/jwtUtils.js";
import { createPreviewTunnel } from "../../bridge/previewTunnel.js";

//@ chunk-czv9g42s.js:13236-13276 placement
var EXIT_UNAVAILABLE = 69;
var EXIT_POLICY = 77;
var EXIT_CONFIG = 78;
var SESSION_TUNNEL_PORT = 28471;
var TUNNEL_LIVENESS_DEADLINE_MS = 600000;
var TUNNEL_QUIET_LIVENESS_PINGS = 1;
//@ chunk-czv9g42s.js:13276-13471 placement
function parseTunnelApiOrigin(url) {
  let validated = validateIngressOrigin(url);
  if (validated.ok) return checkSdkUrl(validated.origin) === null ? validated.origin : undefined;
  let parsed = URL.parse(url);
  return parsed?.protocol === "http:" &&
    isLoopbackHost(parsed.hostname) &&
    (url === parsed.origin || url === `${parsed.origin}/`)
    ? parsed.origin
    : undefined;
}
//@ chunk-czv9g42s.js:13471-13827 placement
/**
 * 会话隧道从 stdin 读取的参数结构：会话 id 与令牌、API 地址、令牌过期时间、上传路径。
 */
var TUNNEL_STDIN_SCHEMA = DoctorLazy(() =>
  objectSchema({
    v: literal(1),
    session_id: stringSchema().min(1),
    session_token: stringSchema().min(1),
    api_base_url: stringSchema().transform((url, ctx) => {
      let tunnelApiOrigin = parseTunnelApiOrigin(url);
      if (tunnelApiOrigin === undefined) {
        ctx.addIssue({
          code: "custom",
        });
        return INVALID;
      }
      return tunnelApiOrigin;
    }),
    session_token_expires_at: numberSchema().int().min(1e9).optional().catch(undefined),
    file_upload_path: stringSchema()
      .regex(/^\/(?!\/)/)
      .optional()
      .catch(undefined),
    tool_host: diskStateSchema().optional().catch(undefined),
  }),
);
//@ chunk-czv9g42s.js:13827-13913 placement
function parseTunnelStdin(raw) {
  if (raw === undefined) return;
  try {
    return TUNNEL_STDIN_SCHEMA().safeParse(jsonParse(raw)).data;
  } catch {
    return;
  }
}
//@ chunk-czv9g42s.js:13913-13936 placement
class SessionTunnelError extends Error {}
//@ chunk-czv9g42s.js:13936-14376 placement
/**
 * 检查 --session-tunnel 能否运行：必须 http 传输与固定端口、标准输入给出一行 JSON、提供方是 Anthropic、未禁用非必要流量；返回问题描述或 undefined。
 */
function sessionTunnelUsageProblem(transport, port, stdinLine) {
  if (transport !== "http" || port !== SESSION_TUNNEL_PORT)
    return `needs --transport http and --port ${SESSION_TUNNEL_PORT}`;
  if (stdinLine === undefined)
    return 'needs one line of JSON on standard input, which must be a pipe: "v": 1, "session_id", "session_token", and "api_base_url" set to the https origin of an Anthropic host';
  if (!isFirstPartyProvider()) return "does not dial under a provider other than Anthropic";
  return isEssentialTrafficOnly() && !isRemoteManagedEnvironment()
    ? "does not dial while CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC is set"
    : undefined;
}
//@ chunk-czv9g42s.js:14376-15152 placement
function runSessionTunnel(toolServer, spec, onStop = (code) => void gracefulShutdown(code)) {
  let previewTunnelWithRedial = startPreviewTunnelWithRedial(
    {
      sessionId: spec.session_id,
      apiBaseUrl: spec.api_base_url,
      accessToken: spec.session_token,
      allowedPorts: new Set([toolServer.boundPort]),
      policyStopEnforce: true,
      livenessEnforce: true,
      livenessDeadlineMs: TUNNEL_LIVENESS_DEADLINE_MS,
      quietLivenessPings: TUNNEL_QUIET_LIVENESS_PINGS,
      toolServer: {
        port: toolServer.boundPort,
        authToken: toolServer.authToken,
        asksForBinaryFrames: toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_TUNNEL_BINARY_FRAMES,
      },
    },
    spec.session_token_expires_at,
    (detail, reason) => {
      let why =
        reason === "stated_expiry_passed"
          ? "the session_token_expires_at it was started with has passed"
          : "the token has expired";
      process.stderr.write(
        reason === "policy"
          ? `--session-tunnel: ${detail}
`
          : `--session-tunnel: ${why} (${detail}); start another server with a fresh token
`,
      );
      logFeatureBad("cli_mcp_serve_session_tunnel", reason === "policy" ? "relay_refused" : reason);
      onStop(reason === "policy" ? EXIT_CONFIG : EXIT_POLICY);
    },
  );
  logFeatureOk("cli_mcp_serve_session_tunnel");
  return previewTunnelWithRedial;
}
//@ chunk-czv9g42s.js:15152-15544 placement
/**
 * 启动预览隧道，永久失败时：策略拒绝或令牌已过期则回调 onFatal，否则在 stderr 提示后重新拨号；返回带 stop 的句柄。
 */
function startPreviewTunnelWithRedial(options, statedExpiry, onFatal) {
  let tokenExpiry = decodeJwtExpiry(options.accessToken);
  let expiry = tokenExpiry ?? statedExpiry ?? null;
  let isStopped = false;
  let tunnel = dial();
  function dial() {
    return createPreviewTunnel({
      ...options,
      onPermanentFailure: (detail, reason) => {
        if (isStopped) return;
        if (reason === "policy") {
          onFatal(detail, "policy");
          return;
        }
        if (expiry !== null && expiry * 1000 < Date.now()) {
          onFatal(detail, tokenExpiry === null ? "stated_expiry_passed" : "token_expired");
          return;
        }
        process.stderr.write(`--session-tunnel: cannot reach the relay (${detail}); dialing again
`);
        tunnel = dial();
      },
    });
  }
  return {
    stop() {
      isStopped = true;
      tunnel.stop();
    },
  };
}
export {
  EXIT_CONFIG,
  EXIT_UNAVAILABLE,
  SessionTunnelError,
  parseTunnelStdin,
  sessionTunnelUsageProblem,
  runSessionTunnel,
};
