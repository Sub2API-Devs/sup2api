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
import { pw } from "../../utils/localhost.js";
import { DoctorLazy } from "./util.js";
import { u, T, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { freeze } from "../../../vendor/zod/v4/core/core.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { decodeJwtExpiry } from "../../bridge/jwtUtils.js";
import { createPreviewTunnel } from "../../bridge/previewTunnel.js";

//@ chunk-e6a6pbbv.js:12043-12083 placement
var B = 69,
  _ = 77,
  h = 78,
  c = 28471,
  v = 600000,
  x = 1;
//@ chunk-e6a6pbbv.js:12083-12278 placement
function parseTunnelApiOrigin(url) {
  let t = validateIngressOrigin(url);
  if (t.ok) return checkSdkUrl(t.origin) === null ? t.origin : void 0;
  let parse = URL.parse(url);
  return parse?.protocol === "http:" &&
    pw(parse.hostname) &&
    (url === parse.origin || url === `${parse.origin}/`)
    ? parse.origin
    : void 0;
}
/**
 * 会话隧道从 stdin 读取的参数结构：会话 id 与令牌、API 地址、令牌过期时间、上传路径。
 */
//@ chunk-e6a6pbbv.js:12278-12593 placement
var TUNNEL_STDIN_SCHEMA = DoctorLazy(() =>
  u({
    v: T(1),
    session_id: o().min(1),
    session_token: o().min(1),
    api_base_url: o().transform((e, t) => {
      let n = parseTunnelApiOrigin(e);
      if (n === void 0) return (t.addIssue({ code: "custom" }), freeze);
      return n;
    }),
    session_token_expires_at: E()
      .int()
      .min(1e9)
      .optional()
      .catch(void 0),
    file_upload_path: o()
      .regex(/^\/(?!\/)/)
      .optional()
      .catch(void 0),
  }),
);
//@ chunk-e6a6pbbv.js:12593-12679 placement
function j(e) {
  if (e === void 0) return;
  try {
    return TUNNEL_STDIN_SCHEMA().safeParse(jsonParse(e)).data;
  } catch {
    return;
  }
}
//@ chunk-e6a6pbbv.js:12679-12702 placement
class P extends Error {}
/**
 * 检查 --session-tunnel 能否运行：必须 http 传输与固定端口、标准输入给出一行 JSON、提供方是 Anthropic、未禁用非必要流量；返回问题描述或 undefined。
 */
//@ chunk-e6a6pbbv.js:12702-13142 placement
function sessionTunnelUsageProblem(transport, port, stdinLine) {
  if (transport !== "http" || port !== c) return `needs --transport http and --port ${c}`;
  if (stdinLine === void 0)
    return 'needs one line of JSON on standard input, which must be a pipe: "v": 1, "session_id", "session_token", and "api_base_url" set to the https origin of an Anthropic host';
  if (!isFirstPartyProvider()) return "does not dial under a provider other than Anthropic";
  return isEssentialTrafficOnly() && !mn()
    ? "does not dial while CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC is set"
    : void 0;
}
//@ chunk-e6a6pbbv.js:13142-13852 placement
function runSessionTunnel(e, t, n = (i) => void gracefulShutdown(i)) {
  let i = startPreviewTunnelWithRedial(
    {
      sessionId: t.session_id,
      apiBaseUrl: t.api_base_url,
      accessToken: t.session_token,
      allowedPorts: new Set([e.boundPort]),
      policyStopEnforce: !0,
      livenessEnforce: !0,
      livenessDeadlineMs: v,
      quietLivenessPings: x,
      toolServer: { port: e.boundPort, authToken: e.authToken },
    },
    t.session_token_expires_at,
    (s, r) => {
      let d =
        r === "stated_expiry_passed"
          ? "the session_token_expires_at it was started with has passed"
          : "the token has expired";
      (process.stderr.write(
        r === "policy"
          ? `--session-tunnel: ${s}
`
          : `--session-tunnel: ${d} (${s}); start another server with a fresh token
`,
      ),
        logFeatureBad("cli_mcp_serve_session_tunnel", r === "policy" ? "relay_refused" : r),
        n(r === "policy" ? h : _));
    },
  );
  return (logFeatureOk("cli_mcp_serve_session_tunnel"), i);
}
/**
 * 启动预览隧道，永久失败时：策略拒绝或令牌已过期则回调 onFatal，否则在 stderr 提示后重新拨号；返回带 stop 的句柄。
 */
//@ chunk-e6a6pbbv.js:13852-14244 placement
function startPreviewTunnelWithRedial(options, statedExpiry, onFatal) {
  let i = decodeJwtExpiry(options.accessToken),
    s = i ?? statedExpiry ?? null,
    r = !1,
    d = l();
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
        (process.stderr.write(`--session-tunnel: cannot reach the relay (${a}); dialing again
`),
          (d = l()));
      },
    });
  }
  return {
    stop() {
      ((r = !0), d.stop());
    },
  };
}
