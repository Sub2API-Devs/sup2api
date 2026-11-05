/**
 * services/claudeGateway/telemetry/resourceAttributes.ts
 *
 * 2.1.316 新增：网关遥测资源属性
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isEnvTruthy } from "../../../utils/envUtils.js";
import { listGatewayModels, supports1mContext } from "../models.js";

//@ chunk-1hnjmk23.js:1385667-1385876 placement
/**
 * 保留的遥测标签前缀（enduser.、user.、identity.）。
 */
var ENDUSER_SUB = "enduser.sub";
var INVALID_LABEL_CHARS_RE = /[^\x21-\x7e]|[,;=\\"%]/;
var RESERVED_RESOURCE_LABELS = new Set([
  "service.name",
  "service.version",
  "claude.deployment_mode",
  "host.arch",
  "os.type",
  "os.version",
  "wsl.version",
]);
var RESERVED_LABEL_PREFIXES = ["enduser.", "user.", "identity."];
//@ chunk-1hnjmk23.js:1385876-1386494 placement
/**
 * 校验遥测资源属性的标签名与值（字符集、保留名、长度），返回错误或 undefined。
 */
function validateResourceLabel(name, value) {
  if (!/^[A-Za-z0-9._-]{1,255}$/.test(name))
    return `label name '${name}' may use only letters, digits, ".", "_" and "-", 255 characters at most`;
  let lower = name.toLowerCase();
  if (
    RESERVED_RESOURCE_LABELS.has(lower) ||
    RESERVED_LABEL_PREFIXES.some((prefix) => lower.startsWith(prefix))
  )
    return `label '${name}' is reserved: the gateway or Claude sets it. Use another name`;
  if (value === "" || INVALID_LABEL_CHARS_RE.test(value))
    return `label '${name}' needs a non-empty value of printable ASCII with no space and none of , ; = \\ " % (if it comes from a \${VAR}, check that variable's value)`;
  if (!isWithinEncodedLength(value))
    return `label '${name}' has too long a value: the limit is 255 characters, and characters such as / : @ count as three`;
  return;
}
//@ chunk-1hnjmk23.js:1386494-1386761 placement
/**
 * 为用户生成 OTLP 资源属性：enduser.id、user.email、user.groups、enduser.sub（值需合法）。
 */
function buildUserResourceAttributes(claims, resourceAttributes) {
  let attrs = {
    ...resourceAttributes,
    "enduser.id": claims.email ?? claims.sub,
  };
  if (claims.email) attrs["user.email"] = claims.email;
  let groups = claims.groups ?? [];
  let joined = groups.join(",");
  if (
    joined.length > 0 &&
    !groups.some((group) => group.includes(",") || group.includes("=")) &&
    isWithinEncodedLength(joined)
  )
    attrs["user.groups"] = joined;
  let sub = claims.sub;
  if (!INVALID_LABEL_CHARS_RE.test(sub) && isWithinEncodedLength(sub)) attrs[ENDUSER_SUB] = sub;
  return attrs;
}
//@ chunk-1hnjmk23.js:1386761-1386837 placement
/**
 * 判断 URI 编码后的长度是否不超过 255。
 */
function isWithinEncodedLength(value) {
  try {
    return encodeURIComponent(value).length <= 255;
  } catch {
    return false;
  }
}
//@ chunk-1hnjmk23.js:1386837-1387203 placement
/**
 * 生成发给客户端的 inferenceModels（显示名覆盖、可用时标 supports1m）。
 */
function buildInferenceModels(config, policy, bootstrap) {
  let CLAUDE_CODE_DISABLE_1M_CONTEXT = envObject(bootstrap).CLAUDE_CODE_DISABLE_1M_CONTEXT;
  let enable1m = !isEnvTruthy(
    typeof CLAUDE_CODE_DISABLE_1M_CONTEXT === "string" || typeof CLAUDE_CODE_DISABLE_1M_CONTEXT === "boolean"
      ? CLAUDE_CODE_DISABLE_1M_CONTEXT
      : typeof CLAUDE_CODE_DISABLE_1M_CONTEXT === "number"
        ? String(CLAUDE_CODE_DISABLE_1M_CONTEXT)
        : undefined,
  );
  let mapped = listGatewayModels(
    config.models,
    config.upstreams,
    config.auto_include_builtin_models,
    policy,
  ).map((model) => ({
    name: model.id,
    ...(model.display_name !== model.id && {
      labelOverride: model.display_name,
    }),
    ...(enable1m &&
      supports1mContext(model.id, config) && {
        supports1m: true,
      }),
  }));
  return mapped.length > 0
    ? {
        inferenceModels: mapped,
      }
    : {};
}
//@ chunk-1hnjmk23.js:1387203-1387272 placement
/**
 * 取对象上的 env 字段，不是对象时给空对象。
 */
function envObject(bootstrap) {
  return bootstrap.env !== null && typeof bootstrap.env === "object" ? bootstrap.env : {};
}
export { buildUserResourceAttributes, buildInferenceModels, envObject, validateResourceLabel };
