/**
 * services/claudeGateway/telemetry/resourceAttributes.ts
 *
 * 2.1.316 新增：网关遥测资源属性
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (6)
 * attribution: placement 6
 */
import { isEnvTruthy } from "../../../utils/envUtils.js";
import { listGatewayModels, supports1mContext } from "../models.js";

//@ chunk-1ny7cxrt.js:1383830-1384039 placement
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
//@ chunk-1ny7cxrt.js:1384039-1384657 placement
/**
 * 校验遥测资源属性的标签名与值（字符集、保留名、长度），返回错误或 undefined。
 */
function validateResourceLabel(e, t) {
  if (!/^[A-Za-z0-9._-]{1,255}$/.test(e))
    return `label name '${e}' may use only letters, digits, ".", "_" and "-", 255 characters at most`;
  let lower = e.toLowerCase();
  if (RESERVED_RESOURCE_LABELS.has(lower) || RESERVED_LABEL_PREFIXES.some((o) => lower.startsWith(o)))
    return `label '${e}' is reserved: the gateway or Claude sets it. Use another name`;
  if (t === "" || INVALID_LABEL_CHARS_RE.test(t))
    return `label '${e}' needs a non-empty value of printable ASCII with no space and none of , ; = \\ " % (if it comes from a \${VAR}, check that variable's value)`;
  if (!isWithinEncodedLength(t))
    return `label '${e}' has too long a value: the limit is 255 characters, and characters such as / : @ count as three`;
  return;
}
//@ chunk-1ny7cxrt.js:1384657-1384924 placement
/**
 * 为用户生成 OTLP 资源属性：enduser.id、user.email、user.groups、enduser.sub（值需合法）。
 */
function buildUserResourceAttributes(e, resourceAttributes) {
  let n = {
    ...resourceAttributes,
    "enduser.id": e.email ?? e.sub,
  };
  if (e.email) n["user.email"] = e.email;
  let groups = e.groups ?? [];
  let joined = groups.join(",");
  if (
    joined.length > 0 &&
    !groups.some((group) => group.includes(",") || group.includes("=")) &&
    isWithinEncodedLength(joined)
  )
    n["user.groups"] = joined;
  let sub = e.sub;
  if (!INVALID_LABEL_CHARS_RE.test(sub) && isWithinEncodedLength(sub)) n[ENDUSER_SUB] = sub;
  return n;
}
//@ chunk-1ny7cxrt.js:1384924-1385000 placement
/**
 * 判断 URI 编码后的长度是否不超过 255。
 */
function isWithinEncodedLength(e) {
  try {
    return encodeURIComponent(e).length <= 255;
  } catch {
    return false;
  }
}
//@ chunk-1ny7cxrt.js:1385000-1385366 placement
/**
 * 生成发给客户端的 inferenceModels（显示名覆盖、可用时标 supports1m）。
 */
function buildInferenceModels(e, t, settings) {
  let CLAUDE_CODE_DISABLE_1M_CONTEXT = envObject(settings).CLAUDE_CODE_DISABLE_1M_CONTEXT;
  let r = !isEnvTruthy(
    typeof CLAUDE_CODE_DISABLE_1M_CONTEXT === "string" || typeof CLAUDE_CODE_DISABLE_1M_CONTEXT === "boolean"
      ? CLAUDE_CODE_DISABLE_1M_CONTEXT
      : typeof CLAUDE_CODE_DISABLE_1M_CONTEXT === "number"
        ? String(CLAUDE_CODE_DISABLE_1M_CONTEXT)
        : undefined,
  );
  let mapped = listGatewayModels(e.models, e.upstreams, e.auto_include_builtin_models, t).map((a) => ({
    name: a.id,
    ...(a.display_name !== a.id && {
      labelOverride: a.display_name,
    }),
    ...(r &&
      supports1mContext(a.id, e) && {
        supports1m: true,
      }),
  }));
  return mapped.length > 0
    ? {
        inferenceModels: mapped,
      }
    : {};
}
//@ chunk-1ny7cxrt.js:1385366-1385435 placement
/**
 * 取对象上的 env 字段，不是对象时给空对象。
 */
function envObject(e) {
  return e.env !== null && typeof e.env === "object" ? e.env : {};
}
export { buildUserResourceAttributes, buildInferenceModels, envObject, validateResourceLabel };
