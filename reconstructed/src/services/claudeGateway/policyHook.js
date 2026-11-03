/**
 * services/claudeGateway/policyHook.ts
 *
 * 2.1.316 新增：网关策略钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (3)
 * attribution: placement 3
 */
import { gatewayJsonLog, gatewayLog } from "../gateway/gatewayBanner.js";
import { jsonErrorResponse } from "./upstreamErrors.js";
import { fetchWithTimeout } from "./network.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-1ny7cxrt.js:1455483-1455537 placement
/**
 * 策略拒绝原因的最大字符数（500），超出截断加省略号。
 */
var DEFAULT_POLICY_BLOCK_REASON = "blocked by your organization's policy";
var MAX_POLICY_REASON_CHARS = 500;
//@ chunk-1ny7cxrt.js:1455537-1455700 placement
/**
 * 清理策略 webhook 返回的拒绝原因（去控制字符、限长），空时用默认文案。
 */
function sanitizePolicyReason(reason) {
  let trimmed = reason.replace(/[\p{Cc}\p{Cf}]+/gu, " ").trim();
  if (trimmed.length === 0) return DEFAULT_POLICY_BLOCK_REASON;
  let list = Array.from(trimmed);
  return list.length > MAX_POLICY_REASON_CHARS
    ? list.slice(0, MAX_POLICY_REASON_CHARS).join("") + "\u2026"
    : trimmed;
}
//@ chunk-1ny7cxrt.js:1455700-1457320 placement
/**
 * CRI 策略 webhook：把请求路径/查询/头/正文 POST 给 webhook，block=true 时返回 400 policy_blocked；webhook 出错时按 fail_closed 拒绝或放行，并记录 policy.blocked/skipped。
 */
function createPolicyWebhook(gatewayConfig) {
  let webhook = gatewayConfig.cri?.enabled ? gatewayConfig.cri.policy?.webhook : undefined;
  if (!webhook) return null;
  let { url, timeout_ms: timeoutMs } = webhook;
  let failClosed = webhook.fail_closed !== false;
  function blockedResponse(sub, l, cause, u, path, h, m, y) {
    gatewayJsonLog("policy.blocked", {
      request_id: l,
      sub,
      cause,
      path,
      ...(h !== undefined && {
        org: h,
      }),
      ...(m !== undefined && {
        act: m,
      }),
      ...(y !== undefined && {
        rule_id: y,
      }),
    });
    return jsonErrorResponse(400, "policy_blocked", u, l, {
      "x-should-retry": "false",
    });
  }
  return {
    async precheck(a, body, c, u, f, h) {
      let m;
      let y = (cause) => {
        gatewayJsonLog("policy.skipped", {
          request_id: c,
          sub: a.sub,
          cause,
          path: u.path,
          ...(f !== undefined && {
            org: f,
          }),
          ...(h !== undefined && {
            act: h,
          }),
        });
      };
      try {
        let b = await fetchWithTimeout(
          url,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-request-id": c,
              "x-principal-sub": a.sub.replace(/[^\x21-\x7e]/g, ""),
            },
            body: jsonStringify({
              path: u.path,
              query: u.query,
              headers: u.headers,
              body,
            }),
          },
          timeoutMs,
          "policy webhook timed out",
        );
        if (!b.ok) {
          b.body?.cancel().catch(() => {});
          gatewayLog("warn", `policy check failed: webhook returned ${b.status}`);
          throw Error("policy webhook returned a non-OK status");
        }
        let body_2 = await b.json();
        if (typeof body_2 !== "object" || body_2 === null || Array.isArray(body_2))
          throw Error("policy webhook returned a non-object decision");
        m = body_2;
        if (typeof m.block !== "boolean") {
          if (failClosed) throw Error("policy webhook decision has no boolean block field");
          gatewayLog(
            "warn",
            "policy check: webhook decision has no boolean block field \u2014 allowing (fail-open)",
          );
          y("decision_shape");
          return null;
        }
      } catch (error) {
        gatewayLog("warn", `policy check failed: ${errorMessage(error)}`);
        if (failClosed)
          return blockedResponse(a.sub, c, "engine_error", "policy check unavailable", u.path, f, h);
        y("engine_error");
        return null;
      }
      if (m.block !== true) return null;
      return blockedResponse(
        a.sub,
        c,
        "policy_hit",
        typeof m.reason === "string" && m.reason.length > 0
          ? sanitizePolicyReason(m.reason)
          : DEFAULT_POLICY_BLOCK_REASON,
        u.path,
        f,
        h,
        typeof m.rule_id === "string" ? m.rule_id : undefined,
      );
    },
  };
}
export { createPolicyWebhook };
