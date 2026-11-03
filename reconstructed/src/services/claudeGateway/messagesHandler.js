/**
 * services/claudeGateway/messagesHandler.ts
 *
 * 2.1.316 新增：网关 /v1/messages 处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (4)
 * attribution: placement 4
 */
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import {
  jsonErrorResponse,
  weakMap,
  INVALID_MODEL_ID_MESSAGE,
  copyDiagnosticHeaders,
} from "./upstreamErrors.js";
import {
  getRoleModelRestrictionMessage,
  findModelEntryById,
  operatorModelNotAllowedMessage,
  resolveUpstreamModel,
} from "./models.js";
import { findDisallowedNestedModel } from "./requestValidation.js";
import { sanitizeModelIdForMessage } from "../../utils/permissions/permissionExplainer.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { forwardRawRequest } from "./versionInfo.js";
import { applyBedrockGuardrails } from "./bedrockGuardrails.js";
import { errorMessage } from "../../utils/errors.js";
import { forwardViaSdk } from "./upstreams/stream.js";
import { isAwsCredentialError } from "../../utils/aws.js";
import { UPSTREAM_REQUEST_ID_HEADERS } from "./proxyRequest.js";
import { redactAwsSessionName } from "./upstreams/aws.js";
import { normalizeFullWidthSpace } from "../../utils/stringUtils.js";

//@ chunk-1ny7cxrt.js:1363661-1369477 placement
/**
 * 网关 /v1/messages 处理：读取并解析请求体、校验、按策略选择上游、计量与转发。
 */
async function handleGatewayMessagesRequest(
  e,
  pathname,
  n,
  models,
  autoIncludeBuiltinModels = true,
  role,
  upstreamTtfbMs = 120000,
  l,
  c,
) {
  let u;
  let f;
  if (c?.body) {
    u = c.body.buf;
    f = c.body.parsed;
  } else {
    u = await e.arrayBuffer();
    try {
      f = jsonParse(Buffer.from(u).toString("utf8"));
    } catch {
      return jsonErrorResponse(400, "invalid_request_error", "invalid JSON", l);
    }
  }
  if (typeof f !== "object" || f === null || Array.isArray(f))
    return jsonErrorResponse(400, "invalid_request_error", "request body must be a JSON object", l);
  if (!("model" in f) || f.model === "")
    return jsonErrorResponse(400, "invalid_request_error", "model is required", l);
  if (typeof f.model !== "string")
    return jsonErrorResponse(400, "invalid_request_error", "model must be a string", l);
  let model = f.model;
  let roleModelRestrictionMessage = getRoleModelRestrictionMessage(model, role, models);
  if (roleModelRestrictionMessage)
    return jsonErrorResponse(400, "invalid_request_error", roleModelRestrictionMessage, l);
  if (n.length === 0)
    return jsonErrorResponse(
      400,
      "invalid_request_error",
      "you aren't in a group that can use this gateway. Ask your administrator to add you to one",
      l,
    );
  if (role?.availableModels || role?.deniedModels || !autoIncludeBuiltinModels) {
    let disallowedNestedModel = findDisallowedNestedModel(
      f,
      (modelId) =>
        getRoleModelRestrictionMessage(modelId, role, models) ??
        (autoIncludeBuiltinModels || findModelEntryById(modelId, models)
          ? undefined
          : operatorModelNotAllowedMessage(modelId)),
    );
    if (disallowedNestedModel)
      return jsonErrorResponse(
        400,
        "invalid_request_error",
        `${sanitizeModelIdForMessage(disallowedNestedModel.path)}: ${disallowedNestedModel.reason}`,
        l,
      );
  }
  let y = [];
  let b = false;
  let w = [];
  let S = () => {
    let mapped = w.filter((ve) => !b || !ve.listSkip).map((ve) => ve.text);
    if (mapped.length === 0) return;
    gatewayLog("warn", `inference: model resolution failed request_id=${l ?? "-"}: ${mapped.join("; ")}`);
  };
  let j = null;
  let M = null;
  let N = null;
  let Z = null;
  let F = null;
  let X = e.headers.get("anthropic-beta") ?? undefined;
  let he = {};
  e.headers.forEach((header, ve) => {
    if (ve.toLowerCase().startsWith("x-stainless-")) he[ve] = header;
  });
  let Me = c?.criPrincipal === true;
  let ce = c?.ttfbOnSdkLegs ? upstreamTtfbMs : undefined;
  for (let be of n) {
    if (e.signal.aborted) break;
    let upstreamModel = resolveUpstreamModel(model, be, models, autoIncludeBuiltinModels, Me);
    if (!upstreamModel.ok) {
      y.push(upstreamModel.error);
      w.push({
        text: `${be.name}: ${upstreamModel.error}`,
        listSkip: upstreamModel.listSkip === true,
      });
      continue;
    }
    let model_2 = upstreamModel.model;
    let kt =
      model_2 === model
        ? f
        : {
            ...f,
            model: model_2,
          };
    b = true;
    try {
      let je;
      if (be.kind === "raw") {
        let body = kt === f ? u : new TextEncoder().encode(jsonStringify(kt));
        je = await forwardRawRequest(e, pathname, body, be, upstreamTtfbMs, c?.user);
        if (je.status === 401 && be.invalidateAuth) {
          be.invalidateAuth();
          gatewayLog(
            "warn",
            `401 from ${be.name}; invalidated WIF bearer cache, retrying request_id=${l ?? "-"}`,
          );
          je.body?.cancel().catch(() => {});
          je = await forwardRawRequest(e, pathname, body, be, upstreamTtfbMs, c?.user);
        }
      } else {
        let An =
          (be.guardrail || be.guardrailTrace) && pathname === "/v1/messages"
            ? Object.keys(f).find((key) => /^amazon-bedrock-/i.test(key))
            : undefined;
        let xe = kt;
        if (An === undefined && be.inputTagging && pathname === "/v1/messages")
          try {
            xe = applyBedrockGuardrails(kt, be.inputTagging);
          } catch (error) {
            xe = undefined;
            gatewayLog(
              "warn",
              `upstream '${be.name}': input_tagging failed, answered 400 request_id=${l ?? "-"}: ${errorMessage(error)}`,
            );
          }
        if (An !== undefined || xe === undefined) {
          for (let vr of [j, M, N, Z]) vr?.body?.cancel().catch(() => {});
          S();
          return jsonErrorResponse(
            400,
            "invalid_request_error",
            An === undefined
              ? Me
                ? "the request could not be processed on this upstream"
                : "the request could not be prepared for the guardrail this gateway applies to Bedrock requests, so it was not sent"
              : Me
                ? `${An} is not permitted on this upstream`
                : `${An} is not permitted: this gateway applies a guardrail to Bedrock requests`,
            l,
          );
        }
        let rn = Me ? model : undefined;
        let user = c?.user;
        let Cs = be.guardrailTrace
          ? {
              request_id: l,
              sub: user?.sub,
              email: user?.email,
              upstream: be.name,
            }
          : undefined;
        let cr =
          be.assumeRole && pathname !== "/v1/messages/count_tokens"
            ? await be.assumeRole.clientFor(user)
            : undefined;
        je = await forwardViaSdk(
          pathname,
          xe,
          be.provider,
          cr?.client ?? be.client,
          X,
          he,
          e.signal,
          ce,
          l,
          rn,
          be.countTokens,
          Cs,
        );
        let Ua = weakMap.get(je);
        let Qt =
          je.status === 401 || je.status === 403 ? (cr ? cr.invalidate : be.invalidateAuth) : undefined;
        let Vd = Ua !== undefined && isAwsCredentialError(Ua.errorType, Ua.message);
        if (Qt && !Vd) Qt();
        if (Qt && Vd) {
          let vr = Qt();
          gatewayLog(
            "warn",
            `${je.status} from ${be.name}; ${vr ? "invalidated credential cache" : "credential invalidation debounced"}, retrying request_id=${l ?? "-"}`,
          );
          je.body?.cancel().catch(() => {});
          if (cr && be.assumeRole) cr = await be.assumeRole.clientFor(user);
          je = await forwardViaSdk(
            pathname,
            xe,
            be.provider,
            cr?.client ?? be.client,
            X,
            he,
            e.signal,
            ce,
            l,
            rn,
            be.countTokens,
            Cs,
          );
        }
        let Kr = weakMap.get(je);
        let Bi = Kr?.message.startsWith(
          `400 Invocation of model ID ${model_2} with on-demand throughput isn`,
        );
        if (Kr && be.provider === "bedrock" && (Bi || Kr.message === INVALID_MODEL_ID_MESSAGE)) {
          let vr = sanitizeModelIdForMessage(model);
          gatewayLog(
            "warn",
            `upstream '${be.name}': AWS says model id ${model_2} (sent for ${vr}) ${Bi ? "runs only through an inference profile here" : "is invalid"} request_id=${l ?? "-"}: under models:, map ${vr} to ${Bi ? "an inference profile this AWS account offers; AWS may then run it in any region that profile spans" : "a model id or inference profile this AWS account and region offer"}`,
          );
          let qd = jsonErrorResponse(
            400,
            "invalid_request_error",
            `model ${vr} is not available on bedrock`,
            l,
          );
          copyDiagnosticHeaders(je.headers, qd.headers);
          je = qd;
          weakMap.set(je, Kr);
        }
      }
      je.headers.set("x-gateway-upstream", be.name);
      je.headers.set("x-gateway-upstream-kind", "operator");
      je.headers.set("x-gateway-model", model);
      je.headers.set("x-gateway-upstream-model", model_2);
      if (
        !(
          je.status === 429 &&
          be.kind === "raw" &&
          be.forwardUserIdentity &&
          encodeHeaderValue(c?.user?.email) !== undefined
        ) &&
        (je.status >= 500 || je.status === 429 || je.status === 401 || je.status === 403 || je.status === 404)
      ) {
        y.push(`${je.status} ${je.statusText}`);
        if (je.status === 501) {
          if (j) j.body?.cancel().catch(() => {});
          j = je;
        } else if (je.status === 429) {
          if (M) M.body?.cancel().catch(() => {});
          M = je;
        } else if (je.status === 401 || je.status === 403) {
          if (N) N.body?.cancel().catch(() => {});
          N = je;
        } else if (je.status === 404) {
          if (Z) Z.body?.cancel().catch(() => {});
          Z = je;
        } else {
          je.body?.cancel().catch(() => {});
          if (UPSTREAM_REQUEST_ID_HEADERS.some((An) => je.headers.has(An))) F = je;
        }
        continue;
      }
      for (let An of [j, M, N, Z]) An?.body?.cancel().catch(() => {});
      if (je.status >= 300) S();
      return je;
    } catch (error) {
      let Ur = redactAwsSessionName(errorMessage(error));
      y.push(Ur);
      gatewayLog("warn", `upstream failed, trying next request_id=${l ?? "-"}: ${Ur}`);
    }
  }
  if (e.signal.aborted) {
    for (let be of [j, M, N, Z]) be?.body?.cancel().catch(() => {});
    return jsonErrorResponse(499, "api_error", "client closed request", l, {
      "x-gateway-model": sanitizeModelIdForMessage(model),
    });
  }
  S();
  if (!b) return jsonErrorResponse(400, "invalid_request_error", y.join("; "), l);
  if (M) {
    for (let be of [j, N, Z]) be?.body?.cancel().catch(() => {});
    return M;
  }
  if (N) {
    for (let be of [j, Z]) be?.body?.cancel().catch(() => {});
    return N;
  }
  if (Z) {
    j?.body?.cancel().catch(() => {});
    return Z;
  }
  if (j) return j;
  gatewayLog("warn", `all upstreams failed request_id=${l ?? "-"}: ${y.join("; ")}`);
  let Ne = jsonErrorResponse(502, "api_error", `all upstreams failed (${n.length} attempted)`, l, {
    "x-gateway-model": sanitizeModelIdForMessage(model),
  });
  for (let be of UPSTREAM_REQUEST_ID_HEADERS) {
    let ve = F?.headers.get(be);
    if (ve) Ne.headers.set(be, ve);
  }
  return Ne;
}
//@ chunk-1ny7cxrt.js:1369477-1369593 placement
/**
 * 头部值规范化：去空白、全角空格转换，非可打印 ASCII 与 % 做 URL 编码。
 */
function encodeHeaderValue(email) {
  return email === undefined
    ? undefined
    : normalizeFullWidthSpace(email.trim()).replace(/[^\x21-\x7e]|%/gu, (t) => encodeURIComponent(t)) ||
        undefined;
}
//@ chunk-1ny7cxrt.js:1369593-1369666 placement
/**
 * 把来源对象的 headers 逐项 set 到目标 Headers 上。
 */
function copyHeadersInto(headers, t) {
  for (let [key, value] of Object.entries(t.headers ?? {})) headers.set(key, value);
}
//@ chunk-1ny7cxrt.js:1369666-1369882 placement
/**
 * 开启身份转发时设置 x-litellm-end-user-id、x-claude-gateway-user-id/email 头。
 */
function setUserIdentityHeaders(headers, t, n) {
  if (!t.forwardUserIdentity || !n) return;
  let o = encodeHeaderValue(n.email);
  let r = encodeHeaderValue(n.sub);
  let s = [
    ["x-litellm-end-user-id", o],
    ["x-claude-gateway-user-id", r],
    ["x-claude-gateway-user-email", o],
  ];
  for (let [a, l] of s) if (l) headers.set(a, l);
}
export { copyHeadersInto, setUserIdentityHeaders, handleGatewayMessagesRequest };
