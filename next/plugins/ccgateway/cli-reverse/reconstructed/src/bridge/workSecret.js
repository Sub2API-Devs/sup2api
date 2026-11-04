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
import {
  looseObject,
  literal,
  stringSchema,
  record,
  numberSchema,
  array,
  booleanSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import { jsonParse, jsonStringify } from "../utils/slowOperations.js";
import { validateBridgeId } from "./sessionIdCompat.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { claudeCodeUserAgent } from "../utils/http.js";
import { plainServiceText } from "./debugUtils.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:238316-238366 fingerprint (2.1.88 match: buildSdkUrl, 0.538)
/**
 * 允许使用 http:// 的本地主机名集合。
 */
var LOCALHOST_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:238316", () => {
  LOCALHOST_NAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
});
//@ chunk-aepeg2w5.js:802859-802953 fingerprint (2.1.88 match: buildCCRv2SdkUrl, 1)
var CODE_SESSIONS_PATH = "/v1/code/sessions/";
var CODE_TRIGGERS_PATH_PATTERN = /^\/v1\/code\/triggers(?:\?|$)|^\/v1\/code\/triggers\/[\w-]+$/;
//@ chunk-ptaf548f.js:2436-3027 fingerprint (2.1.88 match: decodeWorkSecret, 0.429)
/**
 * work secret schema（version=1、session_ingress_token、api_base_url，可选 claude_code_args、mcp_config、auto_mode_environment、worktree）与错误文案表。
 */
var workSecretSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var WORK_SECRET_ERRORS;
deferInit("chunk-ptaf548f.js:2436", () => {
  workSecretSchema = DoctorLazy(() =>
    looseObject({
      version: literal(1),
      session_ingress_token: stringSchema().min(1),
      api_base_url: stringSchema(),
      claude_code_args: record(stringSchema(), stringSchema()).optional().catch(undefined),
      mcp_config: looseObject({
        content: stringSchema(),
        path: stringSchema().optional(),
        mode: numberSchema().optional(),
      })
        .optional()
        .catch(undefined),
      auto_mode_environment: array(stringSchema()).optional().catch(undefined),
      worktree: booleanSchema().optional().catch(undefined),
    }),
  );
  WORK_SECRET_ERRORS = {
    secret_did_not_decode: "Work secret is not valid JSON",
    unsupported_version: "Unsupported work secret version",
    missing_session_ingress_token: "Invalid work secret: missing or empty session_ingress_token",
    missing_api_base_url: "Invalid work secret: missing api_base_url",
  };
});
//@ chunk-ptaf548f.js:3027-3135 layout
/**
 * work secret 形状不合法的错误，verdict 为具体原因码。
 */
class WorkSecretShapeError extends Error {
  verdict;
  constructor(verdict) {
    super(WORK_SECRET_ERRORS[verdict]);
    this.verdict = verdict;
    this.name = "WorkSecretShapeError";
  }
}
//@ chunk-ptaf548f.js:3135-3548 layout
/**
 * 解码 base64url JSON 的 work secret 并校验；按缺失字段抛 WorkSecretShapeError（secret_did_not_decode / unsupported_version / missing_*）。
 */
function decodeWorkSecret(secret) {
  let parsed;
  try {
    parsed = jsonParse(Buffer.from(secret, "base64url").toString("utf-8"));
  } catch {
    throw new WorkSecretShapeError("secret_did_not_decode");
  }
  let result = workSecretSchema().safeParse(parsed);
  if (result.success) return result.data;
  let invalidKeys = new Set(result.error.issues.map((issue) => issue.path[0]));
  if (invalidKeys.has(undefined) || invalidKeys.has("version"))
    throw new WorkSecretShapeError("unsupported_version");
  if (invalidKeys.has("session_ingress_token"))
    throw new WorkSecretShapeError("missing_session_ingress_token");
  throw new WorkSecretShapeError("missing_api_base_url");
}
//@ chunk-ptaf548f.js:3548-3678 layout
/**
 * 两个会话 ID 是否相同：完全相等，或去掉前缀后的末段相同（长度≥4，兼容 cse_/session_）。
 */
function sameSessionId(a, b) {
  if (a === b) return true;
  let aBody = a.slice(a.lastIndexOf("_") + 1);
  let bBody = b.slice(b.lastIndexOf("_") + 1);
  return aBody.length >= 4 && aBody === bBody;
}
//@ chunk-ptaf548f.js:3678-3769 layout
/**
 * 拼 v2 会话 URL：{base}/v1/code/sessions/{sessionId}（校验 ID 安全）。
 */
function buildCCRv2SdkUrl(apiBaseUrl, sessionId) {
  validateBridgeId(sessionId, "sessionId");
  return `${apiBaseUrl.replace(/\/+$/, "")}/v1/code/sessions/${sessionId}`;
}
//@ chunk-ptaf548f.js:3769-4326 fingerprint (2.1.88 match: registerWorker, 0.762)
/**
 * POST {sessionUrl}/worker/register 注册 worker，返回 worker_epoch（字符串转数字，非安全整数报错）。
 */
async function registerWorker(sessionUrl, accessToken) {
  let response = await axios_default.post(
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
  );
  let raw = response.data?.worker_epoch;
  let epoch = typeof raw === "string" ? Number(raw) : raw;
  if (typeof epoch !== "number" || !Number.isFinite(epoch) || !Number.isSafeInteger(epoch)) {
    let detail = plainServiceText(`${jsonStringify(response.data)}`, "register_worker_response");
    throw Error(
      `registerWorker: invalid worker_epoch in response${detail === undefined ? " (the response is not quoted: it is too long or is not one plain line)" : `: ${detail}`}`,
    );
  }
  return epoch;
}
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
