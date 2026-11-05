/**
 * plugins/bundled/telemetry/eventSchema.ts
 *
 * 2.1.316 新增：校验遥测属性值（有限数字、布尔或 Choice，拒绝自由文本）；校验 telemetry.mark 条目（feature、kind、reason、props）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-08q4d92p.js (42)
 * attribution: placement 42
 */
import { isTelemetryNotBlocked } from "./index.js";

//@ chunk-08q4d92p.js:6842-7060 placement
/**
 * cc-plugin-telemetry 插件定义。
 */
var TELEMETRY_PLUGIN = {
  name: "cc-plugin-telemetry",
  description:
    "Telemetry: a plugin logs an analytics event through $.telemetry.log or marks a feature's use through $.telemetry.mark, sent as first-party rows in batches",
  isAvailable: isTelemetryNotBlocked,
};
//@ chunk-08q4d92p.js:7060-7204 placement (2.1.88 match: invalidateOverageCreditGrantCache, 0.668)
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
//@ chunk-08q4d92p.js:7204-7264 placement
/**
 * 把属性编码成 base64 JSON
 */
var encodeProps = (event, rh) =>
  btoa(
    JSON.stringify({
      rh,
      ...event.fields.props,
    }),
  );
//@ chunk-08q4d92p.js:7264-7660 placement
/**
 * 把插件遥测事件转换为 ClaudeCodeInternalEvent 字段。
 */
var toInternalEvent = (event, ctx) => ({
  eventId: event.eventId,
  eventName: event.fields.name,
  clientTimestamp: event.loggedAt,
  deviceId: ctx.context.identity.deviceId,
  email: ctx.context.identity.email,
  auth: authIdentity(ctx.context.identity),
  sessionId: ctx.sessionId,
  model: ctx.model,
  userType: ctx.userType,
  isInteractive: ctx.isInteractive,
  ...ctx.context.session,
  env: {
    ...ctx.context.environment,
    isClaudeAiAuth: ctx.isClaudeAiAuth,
  },
  additionalMetadata: encodeProps(event, ctx.context.remoteHash),
});
//@ chunk-08q4d92p.js:7660-7720 placement
var isPlainObjectValue = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
//@ chunk-08q4d92p.js:7720-7892 placement
/**
 * 递归把对象键从 camelCase 转为 snake_case。
 */
function toSnakeCaseKeys(value) {
  let isArray = Array.isArray(value);
  let isObject = isPlainObjectValue(value);
  return isArray
    ? value.map(toSnakeCaseKeys)
    : isObject
      ? Object.fromEntries(
          Object.entries(value).map(([key, value]) => [
            key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`),
            toSnakeCaseKeys(value),
          ]),
        )
      : value;
}
//@ chunk-08q4d92p.js:7892-8005 placement
/**
 * 序列化遥测事件批次（ClaudeCodeInternalEvent）。
 */
var serializeEventBatch = (events, ctx) =>
  JSON.stringify({
    events: events.map((event) => ({
      event_type: "ClaudeCodeInternalEvent",
      event_data: toSnakeCaseKeys(toInternalEvent(event, ctx)),
    })),
  });
//@ chunk-08q4d92p.js:8005-8040 placement
/**
 * 事件名格式
 */
var EVENT_NAME_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
//@ chunk-08q4d92p.js:8040-8049 placement
/**
 * 32
 */
var MAX_PROPS = 32;
//@ chunk-08q4d92p.js:8049-8124 placement
/**
 * 遥测校验错误
 */
var telemetryError = (what, kind = "log") =>
  Object.assign(Error(`$.telemetry.${kind}: ${what}`), {
    what,
  });
//@ chunk-08q4d92p.js:8124-8791 placement
/**
 * 校验遥测属性值（有限数字、布尔或 Choice，拒绝自由文本）。
 */
function checkPropValue(key, value, kind = "log") {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw telemetryError(`props.${key}: a number is finite`, kind);
  }
  if (typeof value === "string")
    throw telemetryError(
      `props.${key}: free text is refused; a string is a Choice, { value, of: [...] }`,
      kind,
    );
  if (!isPlainObjectValue(value) || !Array.isArray(value.of))
    throw telemetryError(
      `props.${key}: a value is a finite number, a boolean, or a Choice, { value, of: [...] }`,
      kind,
    );
  let { of, value: choice } = value;
  if (!(
    of.length > 0 &&
    of.length <= MAX_PROPS &&
    of.every((member) => typeof member === "string" && EVENT_NAME_RE.test(member))
  ))
    throw telemetryError(`props.${key}.of: a list of 1 to ${MAX_PROPS} lowercase tokens`, kind);
  if (typeof choice !== "string" || !of.includes(choice))
    throw telemetryError(`props.${key}.value: one of the members of \`of\``, kind);
  return choice;
}
//@ chunk-08q4d92p.js:8791-8800 placement
/**
 * 16
 */
var MAX_PROP_LIST_ITEMS = 16;
//@ chunk-08q4d92p.js:8800-8831 placement
/**
 * snake_case 键名
 */
var PROP_KEY_RE = /^[a-z][a-z0-9_]{0,63}$/;
//@ chunk-08q4d92p.js:8831-9105 placement
/**
 * 校验 props：对象、键数上限、键为 snake_case、值合法。
 */
function validateProps(props, kind) {
  if (!isPlainObjectValue(props)) throw telemetryError("props: an object of properties by key", kind);
  let entries = Object.entries(props);
  if (entries.length > MAX_PROP_LIST_ITEMS)
    throw telemetryError(`props: at most ${MAX_PROP_LIST_ITEMS} properties`, kind);
  let out = {};
  for (let [key, value] of entries) {
    if (!PROP_KEY_RE.test(key)) throw telemetryError("props: every key is a snake_case token", kind);
    out[key] = checkPropValue(key, value, kind);
  }
  return out;
}
//@ chunk-08q4d92p.js:9105-9120 placement
var TENGU = "tengu_";
//@ chunk-08q4d92p.js:9120-9142 placement
var TENGU_PLUGIN = "tengu_plugin_";
//@ chunk-08q4d92p.js:9142-9194 placement
/**
 * 事件名加 tengu 前缀
 */
var withTenguPrefix = (event, props) => ({
  name: event.startsWith(TENGU) ? event : TENGU_PLUGIN + event,
  props,
});
//@ chunk-08q4d92p.js:9194-9399 placement
/**
 * 校验 telemetry.log 条目 {event, props}。
 */
function validateLogEntry(entry) {
  if (!isPlainObjectValue(entry)) throw telemetryError("takes one entry, { event, props? }");
  let { event, props = {} } = entry;
  if (typeof event !== "string" || !PROP_KEY_RE.test(event))
    throw telemetryError("takes an event name, a snake_case token");
  return withTenguPrefix(event, validateProps(props, "log"));
}
//@ chunk-08q4d92p.js:9399-9424 placement
/**
 * ok/sad/bad
 */
var DECISION_KINDS = ["ok", "sad", "bad"];
//@ chunk-08q4d92p.js:9424-9454 placement
/**
 * 是否合法决定
 */
var isDecisionKind = (kind) => DECISION_KINDS.some((knownKind) => knownKind === kind);
//@ chunk-08q4d92p.js:9454-9477 placement
var TENGU_FEATURE = "tengu_feature_";
//@ chunk-08q4d92p.js:9477-9609 placement
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
//@ chunk-08q4d92p.js:9609-10178 placement
/**
 * 校验 telemetry.mark 条目（feature、kind、reason、props）。
 */
function validateMarkEntry(entry) {
  if (!isPlainObjectValue(entry))
    throw telemetryError("takes one entry, { feature, kind, reason?, props? }", "mark");
  let { feature, kind, reason, props = {} } = entry;
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
//@ chunk-08q4d92p.js:10178-10240 placement
/**
 * 事件日志批量上报地址
 */
var EVENT_LOG_BATCH_URL = "https://api.anthropic.com/api/event_logging/v2/batch";
//@ chunk-08q4d92p.js:10240-10311 placement
/**
 * 是否遥测拒绝错误
 */
var isTelemetryDenyError = (error) =>
  error instanceof Error && "what" in error && typeof error.what === "string";
//@ chunk-08q4d92p.js:10311-10395 placement
/**
 * 捕获拒绝错误转成 deny
 */
var settleDeny = (promise) =>
  promise.then(
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
//@ chunk-08q4d92p.js:10395-10406 placement
/**
 * 100
 */
var MAX_BATCH_EVENTS = 100;
//@ chunk-08q4d92p.js:10406-10418 placement
/**
 * 5000
 */
var SEND_TIMEOUT_MS = 5000;
//@ chunk-08q4d92p.js:10418-10428 placement
/**
 * 408
 */
var HTTP_REQUEST_TIMEOUT = 408;
//@ chunk-08q4d92p.js:10428-10439 placement
/**
 * 500
 */
var RETRY_STATUS_MIN = 500;
//@ chunk-08q4d92p.js:10439-10450 placement
/**
 * 429
 */
var HTTP_TOO_MANY_REQUESTS = 429;
//@ chunk-08q4d92p.js:10450-10483 placement
/**
 * 5xx/408/429 可重试
 */
var isRetryableStatus = (status) =>
  status >= RETRY_STATUS_MIN || status === HTTP_REQUEST_TIMEOUT || status === HTTP_TOO_MANY_REQUESTS;
//@ chunk-08q4d92p.js:10483-10533 placement
/**
 * 错误转字符串
 */
var errorText = (error) => (error instanceof Error ? error.message : String(error));
//@ chunk-08q4d92p.js:10533-10544 placement
/**
 * 500
 */
var MAX_RETRY_AFTER_MS = 500;
//@ chunk-08q4d92p.js:10544-10715 placement
var ENTRYPOINT_ALIASES = {
  "sdk-ts": "sdk-typescript",
  "sdk-py": "sdk-python",
  "sdk-cli": "sdk-cli",
  "claude-vscode": "claude-vscode",
  "local-agent": "local-agent",
  "claude-desktop": "claude-desktop",
};
//@ chunk-08q4d92p.js:10715-10745 placement
var isNonEmpty = (value) => value !== undefined && value !== "";
//@ chunk-08q4d92p.js:10745-10819 placement (2.1.88 match: isEnvTruthy, 1)
var isEnvTruthy = (envVar) => ["1", "true", "yes", "on"].includes((envVar ?? "").trim().toLowerCase());
//@ chunk-08q4d92p.js:10819-11200 placement
/**
 * 根据环境判断遥测是否关闭（测试、DISABLE_TELEMETRY、第三方提供商等）。
 */
function isTelemetryDisabled(env, config) {
  let isDisabled =
    env.nodeEnv === "test" ||
    isNonEmpty(env.disableTelemetry) ||
    isNonEmpty(env.disableNonessentialTraffic) ||
    isEnvTruthy(env.doNotTrack);
  let isThirdParty =
    !isEnvTruthy(env.providerManagedByHost) &&
    [
      env.useBedrock,
      env.useVertex,
      env.useFoundry,
      env.useAnthropicAws,
      env.useAnthropicGoogleCloud,
      env.useMantle,
    ].some(isEnvTruthy);
  let isGateway =
    isEnvTruthy(env.useGateway) ||
    config.forceLoginMethod === "gateway" ||
    config.forceLoginGatewayUrl !== undefined;
  let hasCustomOauth = isNonEmpty(env.customOauthUrl?.trim());
  return isDisabled || isThirdParty || isGateway || hasCustomOauth;
}
//@ chunk-08q4d92p.js:11200-11440 placement
function resolveEntrypoint(env) {
  let isRemote =
    env.entrypoint === "remote" ||
    env.hasSessionAccessToken ||
    env.hasSessionIngressTokenFile ||
    env.hasWebsocketAuthFileDescriptor ||
    isEnvTruthy(env.claudeCodeRemote);
  return isEnvTruthy(env.githubActions)
    ? "github-action"
    : (ENTRYPOINT_ALIASES[env.entrypoint ?? ""] ?? (isRemote ? "remote" : "cli"));
}
//@ chunk-08q4d92p.js:11440-11528 placement
/**
 * 从 claude-code-action/ 后取版本
 */
var githubActionVersion = (githubActionPath) =>
  githubActionPath?.includes("claude-code-action/")
    ? githubActionPath.split("claude-code-action/")[1]
    : undefined;
//@ chunk-08q4d92p.js:11528-11966 placement
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
//@ chunk-08q4d92p.js:11966-12036 placement
/**
 * 已知云开发环境名或 unknown-N
 */
var cloudEnvironmentName = (signals, platform) =>
  CLOUD_DEV_ENVIRONMENTS.find((environment) =>
    signals.some(([name, present]) => present && name === environment),
  ) ?? `unknown-${platform}`;
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
  isPlainObjectValue,
  isTelemetryDenyError,
  isRetryableStatus,
  markToEvent,
  errorText,
  encodeProps,
  telemetryError,
  toSnakeCaseKeys,
};
