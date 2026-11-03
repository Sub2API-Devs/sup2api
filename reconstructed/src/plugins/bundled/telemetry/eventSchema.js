/**
 * plugins/bundled/telemetry/eventSchema.ts
 *
 * 2.1.316 新增：校验遥测属性值（有限数字、布尔或 Choice，拒绝自由文本）；校验 telemetry.mark 条目（feature、kind、reason、props）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4m46mxx9.js (42)
 * attribution: placement 42
 */
import { F } from "./index.js";

/**
 * cc-plugin-telemetry 插件定义。
 */
//@ chunk-4m46mxx9.js:6590-6808 placement
var TELEMETRY_PLUGIN = {
  name: "cc-plugin-telemetry",
  description:
    "Telemetry: a plugin logs an analytics event through $.telemetry.log or marks a feature's use through $.telemetry.mark, sent as first-party rows in batches",
  isAvailable: F,
};
/**
 * 账号与组织 uuid（都没有时 undefined）。
 */
//@ chunk-4m46mxx9.js:6808-6952 placement
function authIdentity(e) {
  return e.accountUuid !== void 0 || e.organizationUuid !== void 0
    ? { accountUuid: e.accountUuid, organizationUuid: e.organizationUuid }
    : void 0;
}
//@ chunk-4m46mxx9.js:6952-7012 placement
var G = (e, t) => btoa(JSON.stringify({ rh: t, ...e.fields.props }));
/**
 * 把插件遥测事件转换为 ClaudeCodeInternalEvent 字段。
 */
//@ chunk-4m46mxx9.js:7012-7408 placement
var toInternalEvent = (e, t) => ({
  eventId: e.eventId,
  eventName: e.fields.name,
  clientTimestamp: e.loggedAt,
  deviceId: t.context.identity.deviceId,
  email: t.context.identity.email,
  auth: authIdentity(t.context.identity),
  sessionId: t.sessionId,
  model: t.model,
  userType: t.userType,
  isInteractive: t.isInteractive,
  ...t.context.session,
  env: { ...t.context.environment, isClaudeAiAuth: t.isClaudeAiAuth },
  additionalMetadata: G(e, t.context.remoteHash),
});
//@ chunk-4m46mxx9.js:7408-7468 placement
var _ = (e) => typeof e === "object" && e !== null && !Array.isArray(e);
/**
 * 递归把对象键从 camelCase 转为 snake_case。
 */
//@ chunk-4m46mxx9.js:7468-7640 placement
function toSnakeCaseKeys(e) {
  let isArray = Array.isArray(e),
    r = _(e);
  return isArray
    ? e.map(toSnakeCaseKeys)
    : r
      ? Object.fromEntries(
          Object.entries(e).map(([i, n]) => [
            i.replace(/[A-Z]/g, (a) => `_${a.toLowerCase()}`),
            toSnakeCaseKeys(n),
          ]),
        )
      : e;
}
/**
 * 序列化遥测事件批次（ClaudeCodeInternalEvent）。
 */
//@ chunk-4m46mxx9.js:7640-7753 placement
var serializeEventBatch = (e, t) =>
  JSON.stringify({
    events: e.map((r) => ({
      event_type: "ClaudeCodeInternalEvent",
      event_data: toSnakeCaseKeys(toInternalEvent(r, t)),
    })),
  });
//@ chunk-4m46mxx9.js:7753-7788 placement
var K = /^[a-z0-9][a-z0-9_-]{0,63}$/;
//@ chunk-4m46mxx9.js:7788-7797 placement
var v = 32;
//@ chunk-4m46mxx9.js:7797-7872 placement
var d = (e, t = "log") => Object.assign(Error(`$.telemetry.${t}: ${e}`), { what: e });
/**
 * 校验遥测属性值（有限数字、布尔或 Choice，拒绝自由文本）。
 */
//@ chunk-4m46mxx9.js:7872-8539 placement
function checkPropValue(e, t, r = "log") {
  if (typeof t === "boolean") return t;
  if (typeof t === "number") {
    if (Number.isFinite(t)) return t;
    throw d(`props.${e}: a number is finite`, r);
  }
  if (typeof t === "string")
    throw d(`props.${e}: free text is refused; a string is a Choice, { value, of: [...] }`, r);
  if (!_(t) || !Array.isArray(t.of))
    throw d(`props.${e}: a value is a finite number, a boolean, or a Choice, { value, of: [...] }`, r);
  let { of: of, value: n } = t;
  if (!(of.length > 0 && of.length <= v && of.every((o) => typeof o === "string" && K.test(o))))
    throw d(`props.${e}.of: a list of 1 to ${v} lowercase tokens`, r);
  if (typeof n !== "string" || !of.includes(n)) throw d(`props.${e}.value: one of the members of \`of\``, r);
  return n;
}
//@ chunk-4m46mxx9.js:8539-8548 placement
var A = 16;
//@ chunk-4m46mxx9.js:8548-8579 placement
var O = /^[a-z][a-z0-9_]{0,63}$/;
/**
 * 校验 props：对象、键数上限、键为 snake_case、值合法。
 */
//@ chunk-4m46mxx9.js:8579-8853 placement
function validateProps(e, t) {
  if (!_(e)) throw d("props: an object of properties by key", t);
  let entries = Object.entries(e);
  if (entries.length > A) throw d(`props: at most ${A} properties`, t);
  let i = {};
  for (let [n, a] of entries) {
    if (!O.test(n)) throw d("props: every key is a snake_case token", t);
    i[n] = checkPropValue(n, a, t);
  }
  return i;
}
//@ chunk-4m46mxx9.js:8853-8868 placement
var TENGU = "tengu_";
//@ chunk-4m46mxx9.js:8868-8890 placement
var TENGU_PLUGIN = "tengu_plugin_";
//@ chunk-4m46mxx9.js:8890-8942 placement
var X = (e, t) => ({ name: e.startsWith(TENGU) ? e : TENGU_PLUGIN + e, props: t });
/**
 * 校验 telemetry.log 条目 {event, props}。
 */
//@ chunk-4m46mxx9.js:8942-9147 placement
function validateLogEntry(e) {
  if (!_(e)) throw d("takes one entry, { event, props? }");
  let { event: event, props: props = {} } = e;
  if (typeof event !== "string" || !O.test(event)) throw d("takes an event name, a snake_case token");
  return X(event, validateProps(props, "log"));
}
//@ chunk-4m46mxx9.js:9147-9172 placement
var J = ["ok", "sad", "bad"];
//@ chunk-4m46mxx9.js:9172-9202 placement
var Q = (e) => J.some((t) => t === e);
//@ chunk-4m46mxx9.js:9202-9225 placement
var TENGU_FEATURE = "tengu_feature_";
/**
 * mark 条目转为 tengu_feature_* 事件。
 */
//@ chunk-4m46mxx9.js:9225-9357 placement
var markToEvent = ({ kind: kind, feature: feature, reason: reason, props: props }) => ({
  name: TENGU_FEATURE + kind,
  props:
    reason === void 0
      ? { feature_name: feature, ...props }
      : { ...props, feature_name: feature, error_code: reason },
});
/**
 * 校验 telemetry.mark 条目（feature、kind、reason、props）。
 */
//@ chunk-4m46mxx9.js:9357-9926 placement
function validateMarkEntry(e) {
  if (!_(e)) throw d("takes one entry, { feature, kind, reason?, props? }", "mark");
  let { feature: feature, kind: kind, reason: reason, props: props = {} } = e;
  if (typeof feature !== "string" || !O.test(feature))
    throw d("takes a feature name, a snake_case token", "mark");
  if (!Q(kind)) throw d("kind: 'ok', 'sad' or 'bad'", "mark");
  if (kind === "ok") {
    if (reason !== void 0) throw d("reason: an ok mark carries none", "mark");
    return markToEvent({ kind: kind, feature: feature, props: validateProps(props, "mark") });
  }
  if (typeof reason !== "string" || !O.test(reason))
    throw d(`reason: a ${kind} mark names why, a snake_case token`, "mark");
  return markToEvent({ kind: kind, feature: feature, reason: reason, props: validateProps(props, "mark") });
}
//@ chunk-4m46mxx9.js:9926-9988 placement
var We = "https://api.anthropic.com/api/event_logging/v2/batch";
//@ chunk-4m46mxx9.js:9988-10059 placement
var Ke = (e) => e instanceof Error && "what" in e && typeof e.what === "string";
//@ chunk-4m46mxx9.js:10059-10143 placement
var N = (e) =>
  e.then(
    () => ({ value: void 0 }),
    (t) => {
      if (Ke(t)) return { deny: t.what };
      throw t;
    },
  );
//@ chunk-4m46mxx9.js:10143-10154 placement
var Ye = 100;
//@ chunk-4m46mxx9.js:10154-10166 placement
var $e = 5000;
//@ chunk-4m46mxx9.js:10166-10176 placement
var q = 408;
//@ chunk-4m46mxx9.js:10176-10187 placement
var ee = 500;
//@ chunk-4m46mxx9.js:10187-10198 placement
var te = 429;
//@ chunk-4m46mxx9.js:10198-10231 placement
var je = (e) => e >= ee || e === q || e === te;
//@ chunk-4m46mxx9.js:10231-10281 placement
var U = (e) => (e instanceof Error ? e.message : String(e));
//@ chunk-4m46mxx9.js:10281-10292 placement
var ze = 500;
//@ chunk-4m46mxx9.js:10292-10463 placement
var ENTRYPOINT_ALIASES = {
  "sdk-ts": "sdk-typescript",
  "sdk-py": "sdk-python",
  "sdk-cli": "sdk-cli",
  "claude-vscode": "claude-vscode",
  "local-agent": "local-agent",
  "claude-desktop": "claude-desktop",
};
//@ chunk-4m46mxx9.js:10463-10493 placement
var isNonEmpty = (e) => e !== void 0 && e !== "";
//@ chunk-4m46mxx9.js:10493-10567 placement = isEnvTruthy (1)
var isEnvTruthy = (envVar) => ["1", "true", "yes", "on"].includes((envVar ?? "").trim().toLowerCase());
/**
 * 根据环境判断遥测是否关闭（测试、DISABLE_TELEMETRY、第三方提供商等）。
 */
//@ chunk-4m46mxx9.js:10567-10948 placement
function isTelemetryDisabled(e, t) {
  let r =
      e.nodeEnv === "test" ||
      isNonEmpty(e.disableTelemetry) ||
      isNonEmpty(e.disableNonessentialTraffic) ||
      isEnvTruthy(e.doNotTrack),
    i =
      !isEnvTruthy(e.providerManagedByHost) &&
      [
        e.useBedrock,
        e.useVertex,
        e.useFoundry,
        e.useAnthropicAws,
        e.useAnthropicGoogleCloud,
        e.useMantle,
      ].some(isEnvTruthy),
    n = isEnvTruthy(e.useGateway) || t.forceLoginMethod === "gateway" || t.forceLoginGatewayUrl !== void 0,
    a = isNonEmpty(e.customOauthUrl?.trim());
  return r || i || n || a;
}
//@ chunk-4m46mxx9.js:10948-11188 placement
function resolveEntrypoint(e) {
  let t =
    e.entrypoint === "remote" ||
    e.hasSessionAccessToken ||
    e.hasSessionIngressTokenFile ||
    e.hasWebsocketAuthFileDescriptor ||
    isEnvTruthy(e.claudeCodeRemote);
  return isEnvTruthy(e.githubActions)
    ? "github-action"
    : (ENTRYPOINT_ALIASES[e.entrypoint ?? ""] ?? (t ? "remote" : "cli"));
}
//@ chunk-4m46mxx9.js:11188-11276 placement
var se = (e) => (e?.includes("claude-code-action/") ? e.split("claude-code-action/")[1] : void 0);
/**
 * 已知云开发环境/托管平台名单。
 */
//@ chunk-4m46mxx9.js:11276-11714 placement
var CLOUD_DEV_ENVIRONMENTS = [
  "codespaces",
  "gitpod",
  "coder",
  "devpod",
  "daytona",
  "gcp-cloud-workstations",
  "aws-cloud9",
  "replit",
  "glitch",
  "vercel",
  "railway",
  "render",
  "netlify",
  "heroku",
  "fly.io",
  "cloudflare-pages",
  "deno-deploy",
  "aws-lambda",
  "aws-fargate",
  "aws-ecs",
  "aws-ec2",
  "gcp-cloud-run",
  "gcp",
  "azure-app-service",
  "azure-functions",
  "digitalocean-app-platform",
  "huggingface-spaces",
  "github-actions",
  "gitlab-ci",
  "circleci",
  "buildkite",
  "ci",
  "kubernetes",
  "docker",
];
//@ chunk-4m46mxx9.js:11714-11784 placement
var Xe = (e, t) => CLOUD_DEV_ENVIRONMENTS.find((r) => e.some(([i, n]) => n && i === r)) ?? `unknown-${t}`;

export {
  TELEMETRY_PLUGIN,
  Ye,
  $e,
  v,
  K,
  ENTRYPOINT_ALIASES,
  TENGU,
  CLOUD_DEV_ENVIRONMENTS,
  TENGU_PLUGIN,
  TENGU_FEATURE,
  We,
  J,
  A,
  ze,
  q,
  ee,
  te,
  O,
  se,
  N,
  authIdentity,
  serializeEventBatch,
  validateLogEntry,
  validateMarkEntry,
  validateProps,
  checkPropValue,
  resolveEntrypoint,
  Xe,
  toInternalEvent,
  X,
  isTelemetryDisabled,
  isNonEmpty,
  isEnvTruthy,
  Q,
  _,
  Ke,
  je,
  markToEvent,
  U,
  G,
  d,
  toSnakeCaseKeys,
};
