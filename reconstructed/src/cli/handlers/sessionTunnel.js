/**
 * cli/handlers/sessionTunnel.ts
 *
 * 2.1.316 新增。--session-tunnel：为远程会话建立隧道。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6a6pbbv.js (8)
 * attribution: placement 8
 */
import { validateIngressOrigin } from "../../utils/teleport/relayEnv.js";
import { checkSdkUrl } from "../transports/sdkUrlValidation.js";
import { isLoopbackHost } from "../../utils/localhost.js";
import { DoctorLazy } from "./util.js";
import { u, literal, string, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { bY } from "../../../vendor/zod/v4/core/core.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { decodeJwtExpiry } from "../../bridge/jwtUtils.js";
import { createPreviewTunnel } from "../../bridge/previewTunnel.js";

//@ chunk-e6a6pbbv.js:12043-12083 placement
var EXIT_UNAVAILABLE = 69;
var _ = 77;
var EXIT_CONFIG = 78;
var SESSION_TUNNEL_PORT = 28471;
var TUNNEL_LIVENESS_DEADLINE_MS = 600000;
var TUNNEL_QUIET_LIVENESS_PINGS = 1;
//@ chunk-e6a6pbbv.js:12083-12278 placement
function parseTunnelApiOrigin(url) {
  let t = validateIngressOrigin(url);
  if (t.ok) return checkSdkUrl(t.origin) === null ? t.origin : undefined;
  let n = URL.parse(url);
  return n?.protocol === "http:" && isLoopbackHost(n.hostname) && (url === n.origin || url === `${n.origin}/`)
    ? n.origin
    : undefined;
}
//@ chunk-e6a6pbbv.js:12278-12593 placement
/**
 * 会话隧道从 stdin 读取的参数结构：会话 id 与令牌、API 地址、令牌过期时间、上传路径。
 */
var TUNNEL_STDIN_SCHEMA = DoctorLazy(() =>
  u({
    v: literal(1),
    session_id: string().min(1),
    session_token: string().min(1),
    api_base_url: string().transform((url, t) => {
      let tunnelApiOrigin = parseTunnelApiOrigin(url);
      if (tunnelApiOrigin === undefined) {
        t.addIssue({
          code: "custom",
        });
        return bY;
      }
      return tunnelApiOrigin;
    }),
    session_token_expires_at: E().int().min(1e9).optional().catch(undefined),
    file_upload_path: string()
      .regex(/^\/(?!\/)/)
      .optional()
      .catch(undefined),
  }),
);
//@ chunk-e6a6pbbv.js:12593-12679 placement
function parseTunnelStdin(e) {
  if (e === undefined) return;
  try {
    return TUNNEL_STDIN_SCHEMA().safeParse(jsonParse(e)).data;
  } catch {
    return;
  }
}
//@ chunk-e6a6pbbv.js:12679-12702 placement
class SessionTunnelError extends Error {}
//@ chunk-e6a6pbbv.js:12702-13142 placement
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
//@ chunk-e6a6pbbv.js:13142-13852 placement
function runSessionTunnel(e, t, n = (i) => void gracefulShutdown(i)) {
  let previewTunnelWithRedial = startPreviewTunnelWithRedial(
    {
      sessionId: t.session_id,
      apiBaseUrl: t.api_base_url,
      accessToken: t.session_token,
      allowedPorts: new Set([e.boundPort]),
      policyStopEnforce: true,
      livenessEnforce: true,
      livenessDeadlineMs: TUNNEL_LIVENESS_DEADLINE_MS,
      quietLivenessPings: TUNNEL_QUIET_LIVENESS_PINGS,
      toolServer: {
        port: e.boundPort,
        authToken: e.authToken,
      },
    },
    t.session_token_expires_at,
    (s, r) => {
      let d =
        r === "stated_expiry_passed"
          ? "the session_token_expires_at it was started with has passed"
          : "the token has expired";
      process.stderr.write(
        r === "policy"
          ? `--session-tunnel: ${s}
`
          : `--session-tunnel: ${d} (${s}); start another server with a fresh token
`,
      );
      logFeatureBad("cli_mcp_serve_session_tunnel", r === "policy" ? "relay_refused" : r);
      n(r === "policy" ? EXIT_CONFIG : _);
    },
  );
  logFeatureOk("cli_mcp_serve_session_tunnel");
  return previewTunnelWithRedial;
}
//@ chunk-e6a6pbbv.js:13852-14244 placement
/**
 * 启动预览隧道，永久失败时：策略拒绝或令牌已过期则回调 onFatal，否则在 stderr 提示后重新拨号；返回带 stop 的句柄。
 */
function startPreviewTunnelWithRedial(options, statedExpiry, onFatal) {
  let i = decodeJwtExpiry(options.accessToken);
  let s = i ?? statedExpiry ?? null;
  let r = false;
  let d = l();
  function l() {
    return createPreviewTunnel({
      ...options,
      onPermanentFailure: (a, f) => {
        if (r) return;
        if (f === "policy") {
          onFatal(a, "policy");
          return;
        }
        if (s !== null && s * 1000 < Date.now()) {
          onFatal(a, i === null ? "stated_expiry_passed" : "token_expired");
          return;
        }
        process.stderr.write(`--session-tunnel: cannot reach the relay (${a}); dialing again
`);
        d = l();
      },
    });
  }
  return {
    stop() {
      r = true;
      d.stop();
    },
  };
}
