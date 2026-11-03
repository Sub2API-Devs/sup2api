/**
 * bridge/workSecret.ts
 *
 * work secret 解码与校验、会话 URL 构造、registerWorker（取 worker_epoch）、会话 ID 后缀比较、网关 URL 规范化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/workSecret.ts
 * pieces: chunk-aepeg2w5.js (2), chunk-ptaf548f.js (6)
 * attribution: fingerprint 4, layout 4
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { kt, T, o, pe, E, A, M } from "../../vendor/zod/v4/classic/schemas.js";
import { jsonParse, jsonStringify } from "../utils/slowOperations.js";
import { validateBridgeId } from "./sessionIdCompat.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
import { claudeCodeUserAgent } from "../utils/http.js";
import { plainServiceText } from "./debugUtils.js";

/**
 * work secret schema（version=1、session_ingress_token、api_base_url，可选 claude_code_args、mcp_config、auto_mode_environment、worktree）与错误文案表。
 */
//@ chunk-ptaf548f.js:2436-3027 fingerprint = decodeWorkSecret (0.429)
var workSecretSchema = DoctorLazy(() =>
    kt({
      version: T(1),
      session_ingress_token: o().min(1),
      api_base_url: o(),
      claude_code_args: pe(o(), o())
        .optional()
        .catch(void 0),
      mcp_config: kt({ content: o(), path: o().optional(), mode: E().optional() })
        .optional()
        .catch(void 0),
      auto_mode_environment: A(o())
        .optional()
        .catch(void 0),
      worktree: M()
        .optional()
        .catch(void 0),
    }),
  ),
  WORK_SECRET_ERRORS = {
    secret_did_not_decode: "Work secret is not valid JSON",
    unsupported_version: "Unsupported work secret version",
    missing_session_ingress_token: "Invalid work secret: missing or empty session_ingress_token",
    missing_api_base_url: "Invalid work secret: missing api_base_url",
  };
/**
 * work secret 形状不合法的错误，verdict 为具体原因码。
 */
//@ chunk-ptaf548f.js:3027-3135 layout
class WorkSecretShapeError extends Error {
  verdict;
  constructor(e) {
    super(WORK_SECRET_ERRORS[e]);
    this.verdict = e;
    this.name = "WorkSecretShapeError";
  }
}
/**
 * 解码 base64url JSON 的 work secret 并校验；按缺失字段抛 WorkSecretShapeError（secret_did_not_decode / unsupported_version / missing_*）。
 */
//@ chunk-ptaf548f.js:3135-3548 layout
function decodeWorkSecret(secret) {
  let t;
  try {
    t = jsonParse(Buffer.from(secret, "base64url").toString("utf-8"));
  } catch {
    throw new WorkSecretShapeError("secret_did_not_decode");
  }
  let safeParse = workSecretSchema().safeParse(t);
  if (safeParse.success) return safeParse.data;
  let i = new Set(safeParse.error.issues.map((issue) => issue.path[0]));
  if (i.has(void 0) || i.has("version")) throw new WorkSecretShapeError("unsupported_version");
  if (i.has("session_ingress_token")) throw new WorkSecretShapeError("missing_session_ingress_token");
  throw new WorkSecretShapeError("missing_api_base_url");
}
/**
 * 两个会话 ID 是否相同：完全相等，或去掉前缀后的末段相同（长度≥4，兼容 cse_/session_）。
 */
//@ chunk-ptaf548f.js:3548-3678 layout
function sameSessionId(a, b) {
  if (a === b) return !0;
  let sliced = a.slice(a.lastIndexOf("_") + 1),
    sliced_2 = b.slice(b.lastIndexOf("_") + 1);
  return sliced.length >= 4 && sliced === sliced_2;
}
/**
 * 拼 v2 会话 URL：{base}/v1/code/sessions/{sessionId}（校验 ID 安全）。
 */
//@ chunk-ptaf548f.js:3678-3769 layout
function buildCCRv2SdkUrl(apiBaseUrl, sessionId) {
  return (
    validateBridgeId(sessionId, "sessionId"),
    `${apiBaseUrl.replace(/\/+$/, "")}/v1/code/sessions/${sessionId}`
  );
}
/**
 * POST {sessionUrl}/worker/register 注册 worker，返回 worker_epoch（字符串转数字，非安全整数报错）。
 */
//@ chunk-ptaf548f.js:3769-4326 fingerprint = registerWorker (0.762)
async function registerWorker(sessionUrl, accessToken) {
  let response = await Dt.post(
      `${sessionUrl}/worker/register`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "User-Agent": claudeCodeUserAgent(),
        },
        timeout: 1e4,
      },
    ),
    raw = response.data?.worker_epoch,
    epoch = typeof raw === "string" ? Number(raw) : raw;
  if (typeof epoch !== "number" || !Number.isFinite(epoch) || !Number.isSafeInteger(epoch)) {
    let a = plainServiceText(`${jsonStringify(response.data)}`, "register_worker_response");
    throw Error(
      `registerWorker: invalid worker_epoch in response${a === void 0 ? " (the response is not quoted: it is too long or is not one plain line)" : `: ${a}`}`,
    );
  }
  return epoch;
}
/**
 * 允许使用 http:// 的本地主机名集合。
 */
//@ chunk-aepeg2w5.js:238316-238366 fingerprint = buildSdkUrl (0.538)
var LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
//@ chunk-aepeg2w5.js:802859-802953 fingerprint = buildCCRv2SdkUrl (1)
var CODE_SESSIONS_PATH = "/v1/code/sessions/",
  CODE_TRIGGERS_PATH_PATTERN = /^\/v1\/code\/triggers(?:\?|$)|^\/v1\/code\/triggers\/[\w-]+$/;

export {
  decodeWorkSecret,
  buildCCRv2SdkUrl,
  registerWorker,
  sameSessionId,
  LOCALHOST_NAMES,
  CODE_SESSIONS_PATH,
  CODE_TRIGGERS_PATH_PATTERN,
  WorkSecretShapeError,
};
