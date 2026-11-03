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
import { isTelemetryNotBlocked } from "./index.js";

//@ chunk-4m46mxx9.js:6590-6808 placement
/**
 * cc-plugin-telemetry 插件定义。
 */
var TELEMETRY_PLUGIN = {
  name: "cc-plugin-telemetry",
  description:
    "Telemetry: a plugin logs an analytics event through $.telemetry.log or marks a feature's use through $.telemetry.mark, sent as first-party rows in batches",
  isAvailable: isTelemetryNotBlocked,
};
//@ chunk-4m46mxx9.js:6808-6952 placement
/**
 * 账号与组织 uuid（都没有时 undefined）。
 */
function authIdentity(identity) {
  return identity.accountUuid !== undefined || identity.organizationUuid !== undefined
    ? {
        accountUuid: identity.accountUuid,
        organizationUuid: identity.organizationUuid,
      }
    : undefined;
}
//@ chunk-4m46mxx9.js:6952-7012 placement
/**
 * 把属性编码成 base64 JSON
 */
var encodeProps = (e, rh) =>
  btoa(
    JSON.stringify({
      rh,
      ...e.fields.props,
    }),
  );
//@ chunk-4m46mxx9.js:7012-7408 placement
/**
 * 把插件遥测事件转换为 ClaudeCodeInternalEvent 字段。
 */
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
  env: {
    ...t.context.environment,
    isClaudeAiAuth: t.isClaudeAiAuth,
  },
  additionalMetadata: encodeProps(e, t.context.remoteHash),
});
//@ chunk-4m46mxx9.js:7408-7468 placement
var _ = (e) => typeof e === "object" && e !== null && !Array.isArray(e);
//@ chunk-4m46mxx9.js:7468-7640 placement
/**
 * 递归把对象键从 camelCase 转为 snake_case。
 */
function toSnakeCaseKeys(e) {
  let t = Array.isArray(e);
  let r = _(e);
  return t
    ? e.map(toSnakeCaseKeys)
    : r
      ? Object.fromEntries(
          Object.entries(e).map(([key, value]) => [
            key.replace(/[A-Z]/g, (a) => `_${a.toLowerCase()}`),
            toSnakeCaseKeys(value),
          ]),
        )
      : e;
}
//@ chunk-4m46mxx9.js:7640-7753 placement
/**
 * 序列化遥测事件批次（ClaudeCodeInternalEvent）。
 */
var serializeEventBatch = (e, t) =>
  JSON.stringify({
    events: e.map((r) => ({
      event_type: "ClaudeCodeInternalEvent",
      event_data: toSnakeCaseKeys(toInternalEvent(r, t)),
    })),
  });
//@ chunk-4m46mxx9.js:7753-7788 placement
/**
 * 事件名格式
 */
var EVENT_NAME_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
//@ chunk-4m46mxx9.js:7788-7797 placement
/**
 * 32
 */
var MAX_PROPS = 32;
//@ chunk-4m46mxx9.js:7797-7872 placement
/**
 * 遥测校验错误
 */
var telemetryError = (e, t = "log") =>
  Object.assign(Error(`$.telemetry.${t}: ${e}`), {
    what: e,
  });
//@ chunk-4m46mxx9.js:7872-8539 placement
/**
 * 校验遥测属性值（有限数字、布尔或 Choice，拒绝自由文本）。
 */
function checkPropValue(e, t, r = "log") {
  if (typeof t === "boolean") return t;
  if (typeof t === "number") {
    if (Number.isFinite(t)) return t;
    throw telemetryError(`props.${e}: a number is finite`, r);
  }
  if (typeof t === "string")
    throw telemetryError(`props.${e}: free text is refused; a string is a Choice, { value, of: [...] }`, r);
  if (!_(t) || !Array.isArray(t.of))
    throw telemetryError(
      `props.${e}: a value is a finite number, a boolean, or a Choice, { value, of: [...] }`,
      r,
    );
  let { of, value: n } = t;
  if (!(
    of.length > 0 &&
    of.length <= MAX_PROPS &&
    of.every((o) => typeof o === "string" && EVENT_NAME_RE.test(o))
  ))
    throw telemetryError(`props.${e}.of: a list of 1 to ${MAX_PROPS} lowercase tokens`, r);
  if (typeof n !== "string" || !of.includes(n))
    throw telemetryError(`props.${e}.value: one of the members of \`of\``, r);
  return n;
}
//@ chunk-4m46mxx9.js:8539-8548 placement
/**
 * 16
 */
var MAX_PROP_LIST_ITEMS = 16;
//@ chunk-4m46mxx9.js:8548-8579 placement
/**
 * snake_case 键名
 */
var PROP_KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;
//@ chunk-4m46mxx9.js:8579-8853 placement
/**
 * 校验 props：对象、键数上限、键为 snake_case、值合法。
 */
function validateProps(props, t) {
  if (!_(props)) throw telemetryError("props: an object of properties by key", t);
  let entries = Object.entries(props);
  if (entries.length > MAX_PROP_LIST_ITEMS)
    throw telemetryError(`props: at most ${MAX_PROP_LIST_ITEMS} properties`, t);
  let i = {};
  for (let [n, a] of entries) {
    if (!PROP_KEY_RE.test(n)) throw telemetryError("props: every key is a snake_case token", t);
    i[n] = checkPropValue(n, a, t);
  }
  return i;
}
//@ chunk-4m46mxx9.js:8853-8868 placement
var TENGU = "tengu_";
//@ chunk-4m46mxx9.js:8868-8890 placement
var TENGU_PLUGIN = "tengu_plugin_";
//@ chunk-4m46mxx9.js:8890-8942 placement
/**
 * 事件名加 tengu 前缀
 */
var withTenguPrefix = (event, props) => ({
  name: event.startsWith(TENGU) ? event : TENGU_PLUGIN + event,
  props,
});
//@ chunk-4m46mxx9.js:8942-9147 placement
/**
 * 校验 telemetry.log 条目 {event, props}。
 */
function validateLogEntry(e) {
  if (!_(e)) throw telemetryError("takes one entry, { event, props? }");
  let { event, props = {} } = e;
  if (typeof event !== "string" || !PROP_KEY_RE.test(event))
    throw telemetryError("takes an event name, a snake_case token");
  return withTenguPrefix(event, validateProps(props, "log"));
}
//@ chunk-4m46mxx9.js:9147-9172 placement
/**
 * ok/sad/bad
 */
var DECISION_KINDS = ["ok", "sad", "bad"];
//@ chunk-4m46mxx9.js:9172-9202 placement
/**
 * 是否合法决定
 */
var isDecisionKind = (kind) => DECISION_KINDS.some((t) => t === kind);
//@ chunk-4m46mxx9.js:9202-9225 placement
var TENGU_FEATURE = "tengu_feature_";
//@ chunk-4m46mxx9.js:9225-9357 placement
/**
 * mark 条目转为 tengu_feature_* 事件。
 */
var markToEvent = ({ kind, feature, reason, props }) => ({
  name: TENGU_FEATURE + kind,
  props:
    reason === undefined
      ? {
          feature_name: feature,
          ...props,
        }
      : {
          ...props,
          feature_name: feature,
          error_code: reason,
        },
});
//@ chunk-4m46mxx9.js:9357-9926 placement
/**
 * 校验 telemetry.mark 条目（feature、kind、reason、props）。
 */
function validateMarkEntry(e) {
  if (!_(e)) throw telemetryError("takes one entry, { feature, kind, reason?, props? }", "mark");
  let { feature, kind, reason, props = {} } = e;
  if (typeof feature !== "string" || !PROP_KEY_RE.test(feature))
    throw telemetryError("takes a feature name, a snake_case token", "mark");
  if (!isDecisionKind(kind)) throw telemetryError("kind: 'ok', 'sad' or 'bad'", "mark");
  if (kind === "ok") {
    if (reason !== undefined) throw telemetryError("reason: an ok mark carries none", "mark");
    return markToEvent({
      kind,
      feature,
      props: validateProps(props, "mark"),
    });
  }
  if (typeof reason !== "string" || !PROP_KEY_RE.test(reason))
    throw telemetryError(`reason: a ${kind} mark names why, a snake_case token`, "mark");
  return markToEvent({
    kind,
    feature,
    reason,
    props: validateProps(props, "mark"),
  });
}
//@ chunk-4m46mxx9.js:9926-9988 placement
/**
 * 事件日志批量上报地址
 */
var EVENT_LOG_BATCH_URL = "https://api.anthropic.com/api/event_logging/v2/batch";
//@ chunk-4m46mxx9.js:9988-10059 placement
/**
 * 是否遥测拒绝错误
 */
var isTelemetryDenyError = (error) =>
  error instanceof Error && "what" in error && typeof error.what === "string";
//@ chunk-4m46mxx9.js:10059-10143 placement
/**
 * 捕获拒绝错误转成 deny
 */
var settleDeny = (e) =>
  e.then(
    () => ({
      value: undefined,
    }),
    (error) => {
      if (isTelemetryDenyError(error))
        return {
          deny: error.what,
        };
      throw error;
    },
  );
//@ chunk-4m46mxx9.js:10143-10154 placement
/**
 * 100
 */
var MAX_BATCH_EVENTS = 100;
//@ chunk-4m46mxx9.js:10154-10166 placement
/**
 * 5000
 */
var SEND_TIMEOUT_MS = 5000;
//@ chunk-4m46mxx9.js:10166-10176 placement
/**
 * 408
 */
var HTTP_REQUEST_TIMEOUT = 408;
//@ chunk-4m46mxx9.js:10176-10187 placement
/**
 * 500
 */
var RETRY_STATUS_MIN = 500;
//@ chunk-4m46mxx9.js:10187-10198 placement
/**
 * 429
 */
var HTTP_TOO_MANY_REQUESTS = 429;
//@ chunk-4m46mxx9.js:10198-10231 placement
/**
 * 5xx/408/429 可重试
 */
var isRetryableStatus = (status) =>
  status >= RETRY_STATUS_MIN || status === HTTP_REQUEST_TIMEOUT || status === HTTP_TOO_MANY_REQUESTS;
//@ chunk-4m46mxx9.js:10231-10281 placement
/**
 * 错误转字符串
 */
var errorText = (error) => (error instanceof Error ? error.message : String(error));
//@ chunk-4m46mxx9.js:10281-10292 placement
/**
 * 500
 */
var MAX_RETRY_AFTER_MS = 500;
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
var isNonEmpty = (e) => e !== undefined && e !== "";
//@ chunk-4m46mxx9.js:10493-10567 placement = isEnvTruthy (1)
var isEnvTruthy = (envVar) => ["1", "true", "yes", "on"].includes((envVar ?? "").trim().toLowerCase());
//@ chunk-4m46mxx9.js:10567-10948 placement
/**
 * 根据环境判断遥测是否关闭（测试、DISABLE_TELEMETRY、第三方提供商等）。
 */
function isTelemetryDisabled(e, t) {
  let r =
    e.nodeEnv === "test" ||
    isNonEmpty(e.disableTelemetry) ||
    isNonEmpty(e.disableNonessentialTraffic) ||
    isEnvTruthy(e.doNotTrack);
  let i =
    !isEnvTruthy(e.providerManagedByHost) &&
    [e.useBedrock, e.useVertex, e.useFoundry, e.useAnthropicAws, e.useAnthropicGoogleCloud, e.useMantle].some(
      isEnvTruthy,
    );
  let n =
    isEnvTruthy(e.useGateway) || t.forceLoginMethod === "gateway" || t.forceLoginGatewayUrl !== undefined;
  let a = isNonEmpty(e.customOauthUrl?.trim());
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
/**
 * 从 claude-code-action/ 后取版本
 */
var githubActionVersion = (githubActionPath) =>
  githubActionPath?.includes("claude-code-action/")
    ? githubActionPath.split("claude-code-action/")[1]
    : undefined;
//@ chunk-4m46mxx9.js:11276-11714 placement
/**
 * 已知云开发环境/托管平台名单。
 */
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
/**
 * 已知云开发环境名或 unknown-N
 */
var cloudEnvironmentName = (signals, platform) =>
  CLOUD_DEV_ENVIRONMENTS.find((r) => signals.some(([i, n]) => n && i === r)) ?? `unknown-${platform}`;
export {
  TELEMETRY_PLUGIN,
  MAX_BATCH_EVENTS,
  SEND_TIMEOUT_MS,
  MAX_PROPS,
  EVENT_NAME_RE,
  ENTRYPOINT_ALIASES,
  TENGU,
  CLOUD_DEV_ENVIRONMENTS,
  TENGU_PLUGIN,
  TENGU_FEATURE,
  EVENT_LOG_BATCH_URL,
  DECISION_KINDS,
  MAX_PROP_LIST_ITEMS,
  MAX_RETRY_AFTER_MS,
  HTTP_REQUEST_TIMEOUT,
  RETRY_STATUS_MIN,
  HTTP_TOO_MANY_REQUESTS,
  PROP_KEY_RE,
  githubActionVersion,
  settleDeny,
  authIdentity,
  serializeEventBatch,
  validateLogEntry,
  validateMarkEntry,
  validateProps,
  checkPropValue,
  resolveEntrypoint,
  cloudEnvironmentName,
  toInternalEvent,
  withTenguPrefix,
  isTelemetryDisabled,
  isNonEmpty,
  isEnvTruthy,
  isDecisionKind,
  _,
  isTelemetryDenyError,
  isRetryableStatus,
  markToEvent,
  errorText,
  encodeProps,
  telemetryError,
  toSnakeCaseKeys,
};
