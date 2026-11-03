/**
 * types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts
 *
 * protobuf 生成代码：ClaudeCodeInternalEvent、EnvironmentMetadata、GitHubActionsMetadata、SlackContext 的编解码。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/types/generated/events_mono/claude_code/v1/claude_code_internal_event.ts
 * pieces: chunk-aepeg2w5.js (11)
 * attribution: fingerprint 10, callgraph-witnessed 1
 */
import { PublicApiAuth, PublicApiAuth_2 } from "../../common/v1/auth.js";
import { Timestamp } from "../../../google/protobuf/timestamp.js";

//@ chunk-aepeg2w5.js:661941-662015 fingerprint = createBaseGitHubActionsMetadata (1)
function createBaseGitHubActionsMetadata() {
  return { actor_id: "", repository_id: "", repository_owner_id: "" };
}
//@ chunk-aepeg2w5.js:662015-662662 fingerprint = GitHubActionsMetadata (1)
var GitHubActionsMetadata = {
  fromJSON(e) {
    return {
      actor_id: isSet_2(e.actor_id) ? globalThis.String(e.actor_id) : "",
      repository_id: isSet_2(e.repository_id) ? globalThis.String(e.repository_id) : "",
      repository_owner_id: isSet_2(e.repository_owner_id) ? globalThis.String(e.repository_owner_id) : "",
    };
  },
  toJSON(e) {
    let n = {};
    if (e.actor_id !== void 0) n.actor_id = e.actor_id;
    if (e.repository_id !== void 0) n.repository_id = e.repository_id;
    if (e.repository_owner_id !== void 0) n.repository_owner_id = e.repository_owner_id;
    return n;
  },
  create(e) {
    return GitHubActionsMetadata.fromPartial(e ?? {});
  },
  fromPartial(e) {
    let n = createBaseGitHubActionsMetadata();
    return (
      (n.actor_id = e.actor_id ?? ""),
      (n.repository_id = e.repository_id ?? ""),
      (n.repository_owner_id = e.repository_owner_id ?? ""),
      n
    );
  },
};
//@ chunk-aepeg2w5.js:662662-663365 fingerprint = createBaseEnvironmentMetadata (0.99)
function createBaseEnvironmentMetadata() {
  return {
    platform: "",
    node_version: "",
    terminal: "",
    package_managers: "",
    runtimes: "",
    is_running_with_bun: !1,
    is_ci: !1,
    is_claubbit: !1,
    is_github_action: !1,
    is_claude_code_action: !1,
    is_claude_ai_auth: !1,
    version: "",
    github_event_name: "",
    github_actions_runner_environment: "",
    github_actions_runner_os: "",
    github_action_ref: "",
    wsl_version: "",
    github_actions_metadata: void 0,
    arch: "",
    is_claude_code_remote: !1,
    remote_environment_type: "",
    claude_code_container_id: "",
    claude_code_remote_session_id: "",
    tags: [],
    deployment_environment: "",
    is_conductor: !1,
    version_base: "",
    coworker_type: "",
    build_time: "",
    is_local_agent_mode: !1,
    linux_distro_id: "",
    linux_distro_version: "",
    linux_kernel: "",
    vcs: "",
    platform_raw: "",
    shell: "",
  };
}
//@ chunk-aepeg2w5.js:663365-670221 fingerprint = EnvironmentMetadata (0.991)
var EnvironmentMetadata = {
  fromJSON(e) {
    return {
      platform: isSet_2(e.platform) ? globalThis.String(e.platform) : "",
      node_version: isSet_2(e.node_version) ? globalThis.String(e.node_version) : "",
      terminal: isSet_2(e.terminal) ? globalThis.String(e.terminal) : "",
      package_managers: isSet_2(e.package_managers) ? globalThis.String(e.package_managers) : "",
      runtimes: isSet_2(e.runtimes) ? globalThis.String(e.runtimes) : "",
      is_running_with_bun: isSet_2(e.is_running_with_bun) ? globalThis.Boolean(e.is_running_with_bun) : !1,
      is_ci: isSet_2(e.is_ci) ? globalThis.Boolean(e.is_ci) : !1,
      is_claubbit: isSet_2(e.is_claubbit) ? globalThis.Boolean(e.is_claubbit) : !1,
      is_github_action: isSet_2(e.is_github_action) ? globalThis.Boolean(e.is_github_action) : !1,
      is_claude_code_action: isSet_2(e.is_claude_code_action)
        ? globalThis.Boolean(e.is_claude_code_action)
        : !1,
      is_claude_ai_auth: isSet_2(e.is_claude_ai_auth) ? globalThis.Boolean(e.is_claude_ai_auth) : !1,
      version: isSet_2(e.version) ? globalThis.String(e.version) : "",
      github_event_name: isSet_2(e.github_event_name) ? globalThis.String(e.github_event_name) : "",
      github_actions_runner_environment: isSet_2(e.github_actions_runner_environment)
        ? globalThis.String(e.github_actions_runner_environment)
        : "",
      github_actions_runner_os: isSet_2(e.github_actions_runner_os)
        ? globalThis.String(e.github_actions_runner_os)
        : "",
      github_action_ref: isSet_2(e.github_action_ref) ? globalThis.String(e.github_action_ref) : "",
      wsl_version: isSet_2(e.wsl_version) ? globalThis.String(e.wsl_version) : "",
      github_actions_metadata: isSet_2(e.github_actions_metadata)
        ? GitHubActionsMetadata.fromJSON(e.github_actions_metadata)
        : void 0,
      arch: isSet_2(e.arch) ? globalThis.String(e.arch) : "",
      is_claude_code_remote: isSet_2(e.is_claude_code_remote)
        ? globalThis.Boolean(e.is_claude_code_remote)
        : !1,
      remote_environment_type: isSet_2(e.remote_environment_type)
        ? globalThis.String(e.remote_environment_type)
        : "",
      claude_code_container_id: isSet_2(e.claude_code_container_id)
        ? globalThis.String(e.claude_code_container_id)
        : "",
      claude_code_remote_session_id: isSet_2(e.claude_code_remote_session_id)
        ? globalThis.String(e.claude_code_remote_session_id)
        : "",
      tags: globalThis.Array.isArray(e?.tags) ? e.tags.map((tag) => globalThis.String(tag)) : [],
      deployment_environment: isSet_2(e.deployment_environment)
        ? globalThis.String(e.deployment_environment)
        : "",
      is_conductor: isSet_2(e.is_conductor) ? globalThis.Boolean(e.is_conductor) : !1,
      version_base: isSet_2(e.version_base) ? globalThis.String(e.version_base) : "",
      coworker_type: isSet_2(e.coworker_type) ? globalThis.String(e.coworker_type) : "",
      build_time: isSet_2(e.build_time) ? globalThis.String(e.build_time) : "",
      is_local_agent_mode: isSet_2(e.is_local_agent_mode) ? globalThis.Boolean(e.is_local_agent_mode) : !1,
      linux_distro_id: isSet_2(e.linux_distro_id) ? globalThis.String(e.linux_distro_id) : "",
      linux_distro_version: isSet_2(e.linux_distro_version) ? globalThis.String(e.linux_distro_version) : "",
      linux_kernel: isSet_2(e.linux_kernel) ? globalThis.String(e.linux_kernel) : "",
      vcs: isSet_2(e.vcs) ? globalThis.String(e.vcs) : "",
      platform_raw: isSet_2(e.platform_raw) ? globalThis.String(e.platform_raw) : "",
      shell: isSet_2(e.shell) ? globalThis.String(e.shell) : "",
    };
  },
  toJSON(e) {
    let n = {};
    if (e.platform !== void 0) n.platform = e.platform;
    if (e.node_version !== void 0) n.node_version = e.node_version;
    if (e.terminal !== void 0) n.terminal = e.terminal;
    if (e.package_managers !== void 0) n.package_managers = e.package_managers;
    if (e.runtimes !== void 0) n.runtimes = e.runtimes;
    if (e.is_running_with_bun !== void 0) n.is_running_with_bun = e.is_running_with_bun;
    if (e.is_ci !== void 0) n.is_ci = e.is_ci;
    if (e.is_claubbit !== void 0) n.is_claubbit = e.is_claubbit;
    if (e.is_github_action !== void 0) n.is_github_action = e.is_github_action;
    if (e.is_claude_code_action !== void 0) n.is_claude_code_action = e.is_claude_code_action;
    if (e.is_claude_ai_auth !== void 0) n.is_claude_ai_auth = e.is_claude_ai_auth;
    if (e.version !== void 0) n.version = e.version;
    if (e.github_event_name !== void 0) n.github_event_name = e.github_event_name;
    if (e.github_actions_runner_environment !== void 0)
      n.github_actions_runner_environment = e.github_actions_runner_environment;
    if (e.github_actions_runner_os !== void 0) n.github_actions_runner_os = e.github_actions_runner_os;
    if (e.github_action_ref !== void 0) n.github_action_ref = e.github_action_ref;
    if (e.wsl_version !== void 0) n.wsl_version = e.wsl_version;
    if (e.github_actions_metadata !== void 0)
      n.github_actions_metadata = GitHubActionsMetadata.toJSON(e.github_actions_metadata);
    if (e.arch !== void 0) n.arch = e.arch;
    if (e.is_claude_code_remote !== void 0) n.is_claude_code_remote = e.is_claude_code_remote;
    if (e.remote_environment_type !== void 0) n.remote_environment_type = e.remote_environment_type;
    if (e.claude_code_container_id !== void 0) n.claude_code_container_id = e.claude_code_container_id;
    if (e.claude_code_remote_session_id !== void 0)
      n.claude_code_remote_session_id = e.claude_code_remote_session_id;
    if (e.tags?.length) n.tags = e.tags;
    if (e.deployment_environment !== void 0) n.deployment_environment = e.deployment_environment;
    if (e.is_conductor !== void 0) n.is_conductor = e.is_conductor;
    if (e.version_base !== void 0) n.version_base = e.version_base;
    if (e.coworker_type !== void 0) n.coworker_type = e.coworker_type;
    if (e.build_time !== void 0) n.build_time = e.build_time;
    if (e.is_local_agent_mode !== void 0) n.is_local_agent_mode = e.is_local_agent_mode;
    if (e.linux_distro_id !== void 0) n.linux_distro_id = e.linux_distro_id;
    if (e.linux_distro_version !== void 0) n.linux_distro_version = e.linux_distro_version;
    if (e.linux_kernel !== void 0) n.linux_kernel = e.linux_kernel;
    if (e.vcs !== void 0) n.vcs = e.vcs;
    if (e.platform_raw !== void 0) n.platform_raw = e.platform_raw;
    if (e.shell !== void 0) n.shell = e.shell;
    return n;
  },
  create(e) {
    return EnvironmentMetadata.fromPartial(e ?? {});
  },
  fromPartial(e) {
    let n = createBaseEnvironmentMetadata();
    return (
      (n.platform = e.platform ?? ""),
      (n.node_version = e.node_version ?? ""),
      (n.terminal = e.terminal ?? ""),
      (n.package_managers = e.package_managers ?? ""),
      (n.runtimes = e.runtimes ?? ""),
      (n.is_running_with_bun = e.is_running_with_bun ?? !1),
      (n.is_ci = e.is_ci ?? !1),
      (n.is_claubbit = e.is_claubbit ?? !1),
      (n.is_github_action = e.is_github_action ?? !1),
      (n.is_claude_code_action = e.is_claude_code_action ?? !1),
      (n.is_claude_ai_auth = e.is_claude_ai_auth ?? !1),
      (n.version = e.version ?? ""),
      (n.github_event_name = e.github_event_name ?? ""),
      (n.github_actions_runner_environment = e.github_actions_runner_environment ?? ""),
      (n.github_actions_runner_os = e.github_actions_runner_os ?? ""),
      (n.github_action_ref = e.github_action_ref ?? ""),
      (n.wsl_version = e.wsl_version ?? ""),
      (n.github_actions_metadata =
        e.github_actions_metadata !== void 0 && e.github_actions_metadata !== null
          ? GitHubActionsMetadata.fromPartial(e.github_actions_metadata)
          : void 0),
      (n.arch = e.arch ?? ""),
      (n.is_claude_code_remote = e.is_claude_code_remote ?? !1),
      (n.remote_environment_type = e.remote_environment_type ?? ""),
      (n.claude_code_container_id = e.claude_code_container_id ?? ""),
      (n.claude_code_remote_session_id = e.claude_code_remote_session_id ?? ""),
      (n.tags = e.tags?.map((r) => r) || []),
      (n.deployment_environment = e.deployment_environment ?? ""),
      (n.is_conductor = e.is_conductor ?? !1),
      (n.version_base = e.version_base ?? ""),
      (n.coworker_type = e.coworker_type ?? ""),
      (n.build_time = e.build_time ?? ""),
      (n.is_local_agent_mode = e.is_local_agent_mode ?? !1),
      (n.linux_distro_id = e.linux_distro_id ?? ""),
      (n.linux_distro_version = e.linux_distro_version ?? ""),
      (n.linux_kernel = e.linux_kernel ?? ""),
      (n.vcs = e.vcs ?? ""),
      (n.platform_raw = e.platform_raw ?? ""),
      (n.shell = e.shell ?? ""),
      n
    );
  },
};
//@ chunk-aepeg2w5.js:670221-670315 fingerprint = createBaseSlackContext (1)
function createBaseSlackContext() {
  return { slack_team_id: "", is_enterprise_install: !1, trigger: "", creation_method: "" };
}
//@ chunk-aepeg2w5.js:670315-671155 fingerprint = SlackContext (1)
var SlackContext = {
  fromJSON(e) {
    return {
      slack_team_id: isSet_2(e.slack_team_id) ? globalThis.String(e.slack_team_id) : "",
      is_enterprise_install: isSet_2(e.is_enterprise_install)
        ? globalThis.Boolean(e.is_enterprise_install)
        : !1,
      trigger: isSet_2(e.trigger) ? globalThis.String(e.trigger) : "",
      creation_method: isSet_2(e.creation_method) ? globalThis.String(e.creation_method) : "",
    };
  },
  toJSON(e) {
    let n = {};
    if (e.slack_team_id !== void 0) n.slack_team_id = e.slack_team_id;
    if (e.is_enterprise_install !== void 0) n.is_enterprise_install = e.is_enterprise_install;
    if (e.trigger !== void 0) n.trigger = e.trigger;
    if (e.creation_method !== void 0) n.creation_method = e.creation_method;
    return n;
  },
  create(e) {
    return SlackContext.fromPartial(e ?? {});
  },
  fromPartial(e) {
    let n = createBaseSlackContext();
    return (
      (n.slack_team_id = e.slack_team_id ?? ""),
      (n.is_enterprise_install = e.is_enterprise_install ?? !1),
      (n.trigger = e.trigger ?? ""),
      (n.creation_method = e.creation_method ?? ""),
      n
    );
  },
};
//@ chunk-aepeg2w5.js:671155-671872 fingerprint = createBaseClaudeCodeInternalEvent (0.83)
function createBaseClaudeCodeInternalEvent() {
  return {
    event_name: "",
    client_timestamp: void 0,
    model: "",
    session_id: "",
    user_type: "",
    betas: "",
    env: void 0,
    entrypoint: "",
    agent_sdk_version: "",
    is_interactive: !1,
    client_type: "",
    process: void 0,
    additional_metadata: void 0,
    auth: void 0,
    server_timestamp: void 0,
    event_id: "",
    device_id: "",
    swe_bench_run_id: "",
    swe_bench_instance_id: "",
    swe_bench_task_id: "",
    email: "",
    agent_id: "",
    parent_session_id: "",
    agent_type: "",
    slack: void 0,
    team_name: "",
    skill_name: "",
    plugin_name: "",
    marketplace_name: "",
    head_sha: "",
    client_reported_auth: void 0,
    event_metadata_vars: void 0,
    mcp_server_name: "",
    mcp_tool_name: "",
    git_remote_url: "",
    is_clean_tree_at_start: void 0,
    changed_file_count_at_start: void 0,
    untracked_file_count_at_start: void 0,
    rh: void 0,
  };
}
//@ chunk-aepeg2w5.js:671872-678763 fingerprint = ClaudeCodeInternalEvent (0.843)
var ClaudeCodeInternalEvent = {
  fromJSON(e) {
    return {
      event_name: isSet_2(e.event_name) ? globalThis.String(e.event_name) : "",
      client_timestamp: isSet_2(e.client_timestamp) ? fromJsonTimestamp(e.client_timestamp) : void 0,
      model: isSet_2(e.model) ? globalThis.String(e.model) : "",
      session_id: isSet_2(e.session_id) ? globalThis.String(e.session_id) : "",
      user_type: isSet_2(e.user_type) ? globalThis.String(e.user_type) : "",
      betas: isSet_2(e.betas) ? globalThis.String(e.betas) : "",
      env: isSet_2(e.env) ? EnvironmentMetadata.fromJSON(e.env) : void 0,
      entrypoint: isSet_2(e.entrypoint) ? globalThis.String(e.entrypoint) : "",
      agent_sdk_version: isSet_2(e.agent_sdk_version) ? globalThis.String(e.agent_sdk_version) : "",
      is_interactive: isSet_2(e.is_interactive) ? globalThis.Boolean(e.is_interactive) : !1,
      client_type: isSet_2(e.client_type) ? globalThis.String(e.client_type) : "",
      process: isSet_2(e.process) ? globalThis.String(e.process) : void 0,
      additional_metadata: isSet_2(e.additional_metadata) ? globalThis.String(e.additional_metadata) : void 0,
      auth: isSet_2(e.auth) ? PublicApiAuth.fromJSON(e.auth) : void 0,
      server_timestamp: isSet_2(e.server_timestamp) ? fromJsonTimestamp(e.server_timestamp) : void 0,
      event_id: isSet_2(e.event_id) ? globalThis.String(e.event_id) : "",
      device_id: isSet_2(e.device_id) ? globalThis.String(e.device_id) : "",
      swe_bench_run_id: isSet_2(e.swe_bench_run_id) ? globalThis.String(e.swe_bench_run_id) : "",
      swe_bench_instance_id: isSet_2(e.swe_bench_instance_id)
        ? globalThis.String(e.swe_bench_instance_id)
        : "",
      swe_bench_task_id: isSet_2(e.swe_bench_task_id) ? globalThis.String(e.swe_bench_task_id) : "",
      email: isSet_2(e.email) ? globalThis.String(e.email) : "",
      agent_id: isSet_2(e.agent_id) ? globalThis.String(e.agent_id) : "",
      parent_session_id: isSet_2(e.parent_session_id) ? globalThis.String(e.parent_session_id) : "",
      agent_type: isSet_2(e.agent_type) ? globalThis.String(e.agent_type) : "",
      slack: isSet_2(e.slack) ? SlackContext.fromJSON(e.slack) : void 0,
      team_name: isSet_2(e.team_name) ? globalThis.String(e.team_name) : "",
      skill_name: isSet_2(e.skill_name) ? globalThis.String(e.skill_name) : "",
      plugin_name: isSet_2(e.plugin_name) ? globalThis.String(e.plugin_name) : "",
      marketplace_name: isSet_2(e.marketplace_name) ? globalThis.String(e.marketplace_name) : "",
      head_sha: isSet_2(e.head_sha) ? globalThis.String(e.head_sha) : "",
      client_reported_auth: isSet_2(e.client_reported_auth)
        ? PublicApiAuth_2.fromJSON(e.client_reported_auth)
        : void 0,
      event_metadata_vars: isSet_2(e.event_metadata_vars) ? globalThis.String(e.event_metadata_vars) : void 0,
      mcp_server_name: isSet_2(e.mcp_server_name) ? globalThis.String(e.mcp_server_name) : "",
      mcp_tool_name: isSet_2(e.mcp_tool_name) ? globalThis.String(e.mcp_tool_name) : "",
      git_remote_url: isSet_2(e.git_remote_url) ? globalThis.String(e.git_remote_url) : "",
      is_clean_tree_at_start: isSet_2(e.is_clean_tree_at_start)
        ? globalThis.Boolean(e.is_clean_tree_at_start)
        : void 0,
      changed_file_count_at_start: isSet_2(e.changed_file_count_at_start)
        ? globalThis.Number(e.changed_file_count_at_start)
        : void 0,
      untracked_file_count_at_start: isSet_2(e.untracked_file_count_at_start)
        ? globalThis.Number(e.untracked_file_count_at_start)
        : void 0,
      rh: isSet_2(e.rh) ? globalThis.String(e.rh) : void 0,
    };
  },
  toJSON(e) {
    let n = {};
    if (e.event_name !== void 0) n.event_name = e.event_name;
    if (e.client_timestamp !== void 0) n.client_timestamp = e.client_timestamp.toISOString();
    if (e.model !== void 0) n.model = e.model;
    if (e.session_id !== void 0) n.session_id = e.session_id;
    if (e.user_type !== void 0) n.user_type = e.user_type;
    if (e.betas !== void 0) n.betas = e.betas;
    if (e.env !== void 0) n.env = EnvironmentMetadata.toJSON(e.env);
    if (e.entrypoint !== void 0) n.entrypoint = e.entrypoint;
    if (e.agent_sdk_version !== void 0) n.agent_sdk_version = e.agent_sdk_version;
    if (e.is_interactive !== void 0) n.is_interactive = e.is_interactive;
    if (e.client_type !== void 0) n.client_type = e.client_type;
    if (e.process !== void 0) n.process = e.process;
    if (e.additional_metadata !== void 0) n.additional_metadata = e.additional_metadata;
    if (e.auth !== void 0) n.auth = PublicApiAuth.toJSON(e.auth);
    if (e.server_timestamp !== void 0) n.server_timestamp = e.server_timestamp.toISOString();
    if (e.event_id !== void 0) n.event_id = e.event_id;
    if (e.device_id !== void 0) n.device_id = e.device_id;
    if (e.swe_bench_run_id !== void 0) n.swe_bench_run_id = e.swe_bench_run_id;
    if (e.swe_bench_instance_id !== void 0) n.swe_bench_instance_id = e.swe_bench_instance_id;
    if (e.swe_bench_task_id !== void 0) n.swe_bench_task_id = e.swe_bench_task_id;
    if (e.email !== void 0) n.email = e.email;
    if (e.agent_id !== void 0) n.agent_id = e.agent_id;
    if (e.parent_session_id !== void 0) n.parent_session_id = e.parent_session_id;
    if (e.agent_type !== void 0) n.agent_type = e.agent_type;
    if (e.slack !== void 0) n.slack = SlackContext.toJSON(e.slack);
    if (e.team_name !== void 0) n.team_name = e.team_name;
    if (e.skill_name !== void 0) n.skill_name = e.skill_name;
    if (e.plugin_name !== void 0) n.plugin_name = e.plugin_name;
    if (e.marketplace_name !== void 0) n.marketplace_name = e.marketplace_name;
    if (e.head_sha !== void 0) n.head_sha = e.head_sha;
    if (e.client_reported_auth !== void 0)
      n.client_reported_auth = PublicApiAuth_2.toJSON(e.client_reported_auth);
    if (e.event_metadata_vars !== void 0) n.event_metadata_vars = e.event_metadata_vars;
    if (e.mcp_server_name !== void 0) n.mcp_server_name = e.mcp_server_name;
    if (e.mcp_tool_name !== void 0) n.mcp_tool_name = e.mcp_tool_name;
    if (e.git_remote_url !== void 0) n.git_remote_url = e.git_remote_url;
    if (e.is_clean_tree_at_start !== void 0) n.is_clean_tree_at_start = e.is_clean_tree_at_start;
    if (e.changed_file_count_at_start !== void 0)
      n.changed_file_count_at_start = Math.round(e.changed_file_count_at_start);
    if (e.untracked_file_count_at_start !== void 0)
      n.untracked_file_count_at_start = Math.round(e.untracked_file_count_at_start);
    if (e.rh !== void 0) n.rh = e.rh;
    return n;
  },
  create(e) {
    return ClaudeCodeInternalEvent.fromPartial(e ?? {});
  },
  fromPartial(e) {
    let n = createBaseClaudeCodeInternalEvent();
    return (
      (n.event_name = e.event_name ?? ""),
      (n.client_timestamp = e.client_timestamp ?? void 0),
      (n.model = e.model ?? ""),
      (n.session_id = e.session_id ?? ""),
      (n.user_type = e.user_type ?? ""),
      (n.betas = e.betas ?? ""),
      (n.env = e.env !== void 0 && e.env !== null ? EnvironmentMetadata.fromPartial(e.env) : void 0),
      (n.entrypoint = e.entrypoint ?? ""),
      (n.agent_sdk_version = e.agent_sdk_version ?? ""),
      (n.is_interactive = e.is_interactive ?? !1),
      (n.client_type = e.client_type ?? ""),
      (n.process = e.process ?? void 0),
      (n.additional_metadata = e.additional_metadata ?? void 0),
      (n.auth = e.auth !== void 0 && e.auth !== null ? PublicApiAuth.fromPartial(e.auth) : void 0),
      (n.server_timestamp = e.server_timestamp ?? void 0),
      (n.event_id = e.event_id ?? ""),
      (n.device_id = e.device_id ?? ""),
      (n.swe_bench_run_id = e.swe_bench_run_id ?? ""),
      (n.swe_bench_instance_id = e.swe_bench_instance_id ?? ""),
      (n.swe_bench_task_id = e.swe_bench_task_id ?? ""),
      (n.email = e.email ?? ""),
      (n.agent_id = e.agent_id ?? ""),
      (n.parent_session_id = e.parent_session_id ?? ""),
      (n.agent_type = e.agent_type ?? ""),
      (n.slack = e.slack !== void 0 && e.slack !== null ? SlackContext.fromPartial(e.slack) : void 0),
      (n.team_name = e.team_name ?? ""),
      (n.skill_name = e.skill_name ?? ""),
      (n.plugin_name = e.plugin_name ?? ""),
      (n.marketplace_name = e.marketplace_name ?? ""),
      (n.head_sha = e.head_sha ?? ""),
      (n.client_reported_auth =
        e.client_reported_auth !== void 0 && e.client_reported_auth !== null
          ? PublicApiAuth_2.fromPartial(e.client_reported_auth)
          : void 0),
      (n.event_metadata_vars = e.event_metadata_vars ?? void 0),
      (n.mcp_server_name = e.mcp_server_name ?? ""),
      (n.mcp_tool_name = e.mcp_tool_name ?? ""),
      (n.git_remote_url = e.git_remote_url ?? ""),
      (n.is_clean_tree_at_start = e.is_clean_tree_at_start ?? void 0),
      (n.changed_file_count_at_start = e.changed_file_count_at_start ?? void 0),
      (n.untracked_file_count_at_start = e.untracked_file_count_at_start ?? void 0),
      (n.rh = e.rh ?? void 0),
      n
    );
  },
};
//@ chunk-aepeg2w5.js:678763-678854 fingerprint = fromTimestamp (1)
function fromTimestamp(t) {
  let millis = (t.seconds || 0) * 1000;
  return ((millis += (t.nanos || 0) / 1e6), new globalThis.Date(millis));
}
//@ chunk-aepeg2w5.js:678854-678999 fingerprint = fromJsonTimestamp (1)
function fromJsonTimestamp(o) {
  if (o instanceof globalThis.Date) return o;
  else if (typeof o === "string") return new globalThis.Date(o);
  else return fromTimestamp(Timestamp.fromJSON(o));
}
//@ chunk-aepeg2w5.js:678999-679042 callgraph-witnessed = isSet (0)
function isSet_2(value) {
  return value !== null && value !== void 0;
}

export { ClaudeCodeInternalEvent };
