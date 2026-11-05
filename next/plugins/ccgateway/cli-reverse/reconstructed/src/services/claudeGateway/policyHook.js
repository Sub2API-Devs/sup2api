/**
 * services/claudeGateway/policyHook.ts
 *
 * 2.1.316 新增：网关策略钩子
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (3)
 * attribution: placement 3
 */
import { gatewayJsonLog, gatewayLog } from "../gateway/gatewayBanner.js";
import { jsonErrorResponse } from "./upstreamErrors.js";
import { fetchWithTimeout } from "./network.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-1hnjmk23.js:1478411-1478465 placement
/**
 * 策略拒绝原因的最大字符数（500），超出截断加省略号。
 */
var DEFAULT_POLICY_BLOCK_REASON = "blocked by your organization's policy";
var MAX_POLICY_REASON_CHARS = 500;
//@ chunk-1hnjmk23.js:1478465-1478628 placement
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
//@ chunk-1hnjmk23.js:1478628-1480248 placement
/**
 * CRI 策略 webhook：把请求路径/查询/头/正文 POST 给 webhook，block=true 时返回 400 policy_blocked；webhook 出错时按 fail_closed 拒绝或放行，并记录 policy.blocked/skipped。
 */
function createPolicyWebhook(gatewayConfig) {
  let webhook = gatewayConfig.cri?.enabled ? gatewayConfig.cri.policy?.webhook : undefined;
  if (!webhook) return null;
  let { url, timeout_ms: timeoutMs } = webhook;
  let failClosed = webhook.fail_closed !== false;
  function blockedResponse(sub, requestId, cause, message, path, org, actor, ruleId) {
    gatewayJsonLog("policy.blocked", {
      request_id: requestId,
      sub,
      cause,
      path,
      ...(org !== undefined && {
        org,
      }),
      ...(actor !== undefined && {
        act: actor,
      }),
      ...(ruleId !== undefined && {
        rule_id: ruleId,
      }),
    });
    return jsonErrorResponse(400, "policy_blocked", message, requestId, {
      "x-should-retry": "false",
    });
  }
  return {
    async precheck(principal, body, requestId, requestTarget, org, actor) {
      let decision;
      let logSkipped = (cause) => {
        gatewayJsonLog("policy.skipped", {
          request_id: requestId,
          sub: principal.sub,
          cause,
          path: requestTarget.path,
          ...(org !== undefined && {
            org,
          }),
          ...(actor !== undefined && {
            act: actor,
          }),
        });
      };
      try {
        let response = await fetchWithTimeout(
          url,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-request-id": requestId,
              "x-principal-sub": principal.sub.replace(/[^\x21-\x7e]/g, ""),
            },
            body: jsonStringify({
              path: requestTarget.path,
              query: requestTarget.query,
              headers: requestTarget.headers,
              body,
            }),
          },
          timeoutMs,
          "policy webhook timed out",
        );
        if (!response.ok) {
          response.body?.cancel().catch(() => {});
          gatewayLog("warn", `policy check failed: webhook returned ${response.status}`);
          throw Error("policy webhook returned a non-OK status");
        }
        let body_2 = await response.json();
        if (typeof body_2 !== "object" || body_2 === null || Array.isArray(body_2))
          throw Error("policy webhook returned a non-object decision");
        decision = body_2;
        if (typeof decision.block !== "boolean") {
          if (failClosed) throw Error("policy webhook decision has no boolean block field");
          gatewayLog(
            "warn",
            "policy check: webhook decision has no boolean block field \u2014 allowing (fail-open)",
          );
          logSkipped("decision_shape");
          return null;
        }
      } catch (error) {
        gatewayLog("warn", `policy check failed: ${errorMessage(error)}`);
        if (failClosed)
          return blockedResponse(
            principal.sub,
            requestId,
            "engine_error",
            "policy check unavailable",
            requestTarget.path,
            org,
            actor,
          );
        logSkipped("engine_error");
        return null;
      }
      if (decision.block !== true) return null;
      return blockedResponse(
        principal.sub,
        requestId,
        "policy_hit",
        typeof decision.reason === "string" && decision.reason.length > 0
          ? sanitizePolicyReason(decision.reason)
          : DEFAULT_POLICY_BLOCK_REASON,
        requestTarget.path,
        org,
        actor,
        typeof decision.rule_id === "string" ? decision.rule_id : undefined,
      );
    },
  };
}
export { createPolicyWebhook };
