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
var ENDUSER_SUB = "enduser.sub",
  jz = /[^\x21-\x7e]|[,;=\\"%]/,
  K_e = new Set([
    "service.name",
    "service.version",
    "claude.deployment_mode",
    "host.arch",
    "os.type",
    "os.version",
    "wsl.version",
  ]),
  Z_e = ["enduser.", "user.", "identity."];
/**
 * 校验遥测资源属性的标签名与值（字符集、保留名、长度），返回错误或 undefined。
 */
//@ chunk-1ny7cxrt.js:1384039-1384657 placement
function validateResourceLabel(e, t) {
  if (!/^[A-Za-z0-9._-]{1,255}$/.test(e))
    return `label name '${e}' may use only letters, digits, ".", "_" and "-", 255 characters at most`;
  let lower = e.toLowerCase();
  if (K_e.has(lower) || Z_e.some((o) => lower.startsWith(o)))
    return `label '${e}' is reserved: the gateway or Claude sets it. Use another name`;
  if (t === "" || jz.test(t))
    return `label '${e}' needs a non-empty value of printable ASCII with no space and none of , ; = \\ " % (if it comes from a \${VAR}, check that variable's value)`;
  if (!D0(t))
    return `label '${e}' has too long a value: the limit is 255 characters, and characters such as / : @ count as three`;
  return;
}
/**
 * 为用户生成 OTLP 资源属性：enduser.id、user.email、user.groups、enduser.sub（值需合法）。
 */
//@ chunk-1ny7cxrt.js:1384657-1384924 placement
function buildUserResourceAttributes(e, t) {
  let n = { ...t, "enduser.id": e.email ?? e.sub };
  if (e.email) n["user.email"] = e.email;
  let o = e.groups ?? [],
    joined = o.join(",");
  if (joined.length > 0 && !o.some((a) => a.includes(",") || a.includes("=")) && D0(joined))
    n["user.groups"] = joined;
  let sub = e.sub;
  if (!jz.test(sub) && D0(sub)) n[ENDUSER_SUB] = sub;
  return n;
}
//@ chunk-1ny7cxrt.js:1384924-1385000 placement
function D0(e) {
  try {
    return encodeURIComponent(e).length <= 255;
  } catch {
    return !1;
  }
}
/**
 * 生成发给客户端的 inferenceModels（显示名覆盖、可用时标 supports1m）。
 */
//@ chunk-1ny7cxrt.js:1385000-1385366 placement
function buildInferenceModels(e, t, n) {
  let CLAUDE_CODE_DISABLE_1M_CONTEXT = Lz(n).CLAUDE_CODE_DISABLE_1M_CONTEXT,
    r = !isEnvTruthy(
      typeof CLAUDE_CODE_DISABLE_1M_CONTEXT === "string" ||
        typeof CLAUDE_CODE_DISABLE_1M_CONTEXT === "boolean"
        ? CLAUDE_CODE_DISABLE_1M_CONTEXT
        : typeof CLAUDE_CODE_DISABLE_1M_CONTEXT === "number"
          ? String(CLAUDE_CODE_DISABLE_1M_CONTEXT)
          : void 0,
    ),
    mapped = listGatewayModels(e.models, e.upstreams, e.auto_include_builtin_models, t).map((a) => ({
      name: a.id,
      ...(a.display_name !== a.id && { labelOverride: a.display_name }),
      ...(r && supports1mContext(a.id, e) && { supports1m: !0 }),
    }));
  return mapped.length > 0 ? { inferenceModels: mapped } : {};
}
//@ chunk-1ny7cxrt.js:1385366-1385435 placement
function Lz(e) {
  return e.env !== null && typeof e.env === "object" ? e.env : {};
}

export { buildUserResourceAttributes, buildInferenceModels, Lz, validateResourceLabel };
