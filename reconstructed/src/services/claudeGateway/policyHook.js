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
var x1 = "blocked by your organization's policy",
  j1 = 500;
/**
 * 清理策略 webhook 返回的拒绝原因（去控制字符、限长），空时用默认文案。
 */
//@ chunk-1ny7cxrt.js:1455537-1455700 placement
function sanitizePolicyReason(e) {
  let trimmed = e.replace(/[\p{Cc}\p{Cf}]+/gu, " ").trim();
  if (trimmed.length === 0) return x1;
  let list = Array.from(trimmed);
  return list.length > j1 ? list.slice(0, j1).join("") + "\u2026" : trimmed;
}
/**
 * CRI 策略 webhook：把请求路径/查询/头/正文 POST 给 webhook，block=true 时返回 400 policy_blocked；webhook 出错时按 fail_closed 拒绝或放行，并记录 policy.blocked/skipped。
 */
//@ chunk-1ny7cxrt.js:1455700-1457320 placement
function createPolicyWebhook(e) {
  let t = e.cri?.enabled ? e.cri.policy?.webhook : void 0;
  if (!t) return null;
  let { url: url, timeout_ms: timeout_ms } = t,
    failClosed = t.fail_closed !== !1;
  function blockedResponse(a, l, c, u, f, h, m, y) {
    return (
      gatewayJsonLog("policy.blocked", {
        request_id: l,
        sub: a,
        cause: c,
        path: f,
        ...(h !== void 0 && { org: h }),
        ...(m !== void 0 && { act: m }),
        ...(y !== void 0 && { rule_id: y }),
      }),
      jsonErrorResponse(400, "policy_blocked", u, l, { "x-should-retry": "false" })
    );
  }
  return {
    async precheck(a, l, c, u, f, h) {
      let m,
        y = (b) => {
          gatewayJsonLog("policy.skipped", {
            request_id: c,
            sub: a.sub,
            cause: b,
            path: u.path,
            ...(f !== void 0 && { org: f }),
            ...(h !== void 0 && { act: h }),
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
            body: jsonStringify({ path: u.path, query: u.query, headers: u.headers, body: l }),
          },
          timeout_ms,
          "policy webhook timed out",
        );
        if (!b.ok)
          throw (
            b.body?.cancel().catch(() => {}),
            gatewayLog("warn", `policy check failed: webhook returned ${b.status}`),
            Error("policy webhook returned a non-OK status")
          );
        let body = await b.json();
        if (typeof body !== "object" || body === null || Array.isArray(body))
          throw Error("policy webhook returned a non-object decision");
        if (((m = body), typeof m.block !== "boolean")) {
          if (failClosed) throw Error("policy webhook decision has no boolean block field");
          return (
            gatewayLog(
              "warn",
              "policy check: webhook decision has no boolean block field \u2014 allowing (fail-open)",
            ),
            y("decision_shape"),
            null
          );
        }
      } catch (error) {
        if ((gatewayLog("warn", `policy check failed: ${errorMessage(error)}`), failClosed))
          return blockedResponse(a.sub, c, "engine_error", "policy check unavailable", u.path, f, h);
        return (y("engine_error"), null);
      }
      if (m.block !== !0) return null;
      return blockedResponse(
        a.sub,
        c,
        "policy_hit",
        typeof m.reason === "string" && m.reason.length > 0 ? sanitizePolicyReason(m.reason) : x1,
        u.path,
        f,
        h,
        typeof m.rule_id === "string" ? m.rule_id : void 0,
      );
    },
  };
}

export { createPolicyWebhook };
