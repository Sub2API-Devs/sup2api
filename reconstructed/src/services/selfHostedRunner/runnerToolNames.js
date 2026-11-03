/**
 * services/selfHostedRunner/runnerToolNames.ts
 *
 * 2.1.316 新增：自托管 runner 相关工具名常量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-31fzpab5.js (2), chunk-3fqpd3gk.js (6)
 * attribution: placement 8
 */
import { splitRuleList } from "../../utils/permissions/disallowedToolsFlag.js";

//@ chunk-3fqpd3gk.js:227-255 placement
var SELF_HOSTED_RUNNER = "self_hosted_runner_";
//@ chunk-3fqpd3gk.js:255-294 placement
function Xon(n) {
  return n.startsWith(SELF_HOSTED_RUNNER);
}
//@ chunk-3fqpd3gk.js:294-338 placement
function oWn(n) {
  return splitRuleList([...n]).some(Xon);
}
//@ chunk-3fqpd3gk.js:338-400 placement
function Kko(n) {
  return splitRuleList([n])
    .filter((t) => !Xon(t))
    .join(",");
}
/**
 * 判断 runner 传入的工具列表中是否含不允许的工具规格。
 */
//@ chunk-3fqpd3gk.js:400-502 placement
function hasDisallowedToolSpec(n) {
  if (n === void 0) return !1;
  let t = typeof n === "string" ? n : String(n);
  return splitRuleList([t]).some(Xon);
}
/**
 * 规范化会话参数中的 tools：转为字符串，并在含不允许规格时改写。
 */
//@ chunk-3fqpd3gk.js:502-674 placement
function normalizeToolsArg(n) {
  let tools = n.tools;
  if (tools === void 0) return n;
  let o = typeof tools === "string" ? tools : String(tools);
  if (!hasDisallowedToolSpec(o)) return typeof tools === "string" ? n : { ...n, tools: o };
  return { ...n, tools: Kko(o) };
}
//@ chunk-31fzpab5.js:191-531 placement
var SELF_HOSTED_RUNNER_GET_POOL = "self_hosted_runner_get_pool",
  SELF_HOSTED_RUNNER_LIST_RUNNERS = "self_hosted_runner_list_runners",
  SELF_HOSTED_RUNNER_LIST_SESSIONS = "self_hosted_runner_list_sessions",
  SELF_HOSTED_RUNNER_LIST_SECRETS = "self_hosted_runner_list_secrets",
  SELF_HOSTED_RUNNER_SPAWN_LOCAL = "self_hosted_runner_spawn_local",
  SELF_HOSTED_RUNNER_READ_HEALTH = "self_hosted_runner_read_health",
  SELF_HOSTED_RUNNER_READ_METRICS = "self_hosted_runner_read_metrics",
  SELF_HOSTED_RUNNER_TAIL_LOG = "self_hosted_runner_tail_log",
  SELF_HOSTED_RUNNER_REQUEUE_SESSION = "self_hosted_runner_requeue_session";
/**
 * 自托管 runner 运维工具的说明文字：环境状态、runner/会话/密钥列表、启动 runner、健康检查、指标、日志、重新排队会话。
 */
//@ chunk-31fzpab5.js:531-4008 placement
var ENV_STATE_TOOL_DESCRIPTION = `Read a self-hosted environment's aggregate state (alive_runner_count, available_capacity_total, capacity_in_use, pending_session_count, unplaceable_session_count, backing_off_count, circuit_broken_count).${"\nThe result includes an `equivalent.ui` string with the Admin-UI path. Surface it to the operator so they can repeat the action without you.\nAuth: handled internally via the operator's `claude login` OAuth session \u2014 secrets never enter the conversation."}`,
  LIST_RUNNERS_TOOL_DESCRIPTION = `List runners registered to a self-hosted environment, with per-runner lease_expires_at, locked_account_id/email, and assigned_session_count.${"\nThe result includes an `equivalent.ui` string with the Admin-UI path. Surface it to the operator so they can repeat the action without you.\nAuth: handled internally via the operator's `claude login` OAuth session \u2014 secrets never enter the conversation."}`,
  LIST_SESSIONS_TOOL_DESCRIPTION = `List sessions queued/assigned in a self-hosted environment (status, failure_log[], excluded_runner_ids, spawn_attempt, spawn_last_error).${"\nThe result includes an `equivalent.ui` string with the Admin-UI path. Surface it to the operator so they can repeat the action without you.\nAuth: handled internally via the operator's `claude login` OAuth session \u2014 secrets never enter the conversation."}`,
  LIST_SECRETS_TOOL_DESCRIPTION = `List environment secrets (jti, label, created_at, revoked, last_used_at). Secret values are never returned \u2014 only metadata.${"\nThe result includes an `equivalent.ui` string with the Admin-UI path. Surface it to the operator so they can repeat the action without you.\nAuth: handled internally via the operator's `claude login` OAuth session \u2014 secrets never enter the conversation."}`,
  SPAWN_RUNNER_TOOL_DESCRIPTION =
    "Spawn a self-hosted runner as a detached background process on THIS machine using this binary's `self-hosted-runner` subcommand. Always passes `--base-dir` (the runner's default of /workspace is unwritable on operator laptops) and uses space-separated flags only. Returns {pid, log_path, health_port, command} \u2014 `command` is the equivalent shell line for the operator's cheat sheet. This is for the zero\u2192aha proof; production deployment (k8s / docker-compose) is taught, not tooled.",
  RUNNER_HEALTH_TOOL_DESCRIPTION =
    "GET http://127.0.0.1:{health_port}/healthz on the local runner (2s timeout). Returns the health JSON, or {disabled:true} when health_port is 0, or {unreachable:true,error} when nothing is listening.",
  RUNNER_METRICS_TOOL_DESCRIPTION =
    "GET http://127.0.0.1:{health_port}/metrics on the local runner and parse the `claude_code_self_hosted_runner_*` Prometheus gauges into {capacity, active_sessions, last_poll_age_seconds, locked_account_email?}.",
  RUNNER_LOGS_TOOL_DESCRIPTION =
    "Read the last N bytes of the runner's --log-file with the shared secret redaction (key=value secrets, sk-ant/Bearer/Basic, URL userinfo, JWTs, and VCS/service PATs \u2014 see redact() in src/utils/secretRedaction.ts for the current rule set) applied before the content reaches model context.",
  REQUEUE_SESSION_TOOL_DESCRIPTION = `Requeue an assigned session onto a different runner. Appends the observed runner to the session's excluded_runner_ids so the queue pop doesn't immediately hand it back. Takes session_id + runner_id (the runner the caller observed failing). Only write operation in the doctor tool suite.${"\nThe result includes an `equivalent.ui` string with the Admin-UI path. Surface it to the operator so they can repeat the action without you.\nAuth: handled internally via the operator's `claude login` OAuth session \u2014 secrets never enter the conversation."}`;

export {
  oWn,
  Xon,
  SELF_HOSTED_RUNNER_GET_POOL,
  ENV_STATE_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_LIST_SESSIONS,
  LIST_SESSIONS_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_LIST_RUNNERS,
  LIST_RUNNERS_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_LIST_SECRETS,
  LIST_SECRETS_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_READ_HEALTH,
  RUNNER_HEALTH_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_READ_METRICS,
  RUNNER_METRICS_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_REQUEUE_SESSION,
  REQUEUE_SESSION_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_SPAWN_LOCAL,
  SPAWN_RUNNER_TOOL_DESCRIPTION,
  SELF_HOSTED_RUNNER_TAIL_LOG,
  RUNNER_LOGS_TOOL_DESCRIPTION,
  Kko,
  normalizeToolsArg,
  hasDisallowedToolSpec,
};
