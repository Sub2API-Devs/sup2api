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
  return {
    actor_id: "",
    repository_id: "",
    repository_owner_id: "",
  };
}
//@ chunk-aepeg2w5.js:662015-662662 fingerprint = GitHubActionsMetadata (1)
var GitHubActionsMetadata = {
  fromJSON(object) {
    return {
      actor_id: isSet_2(object.actor_id) ? globalThis.String(object.actor_id) : "",
      repository_id: isSet_2(object.repository_id) ? globalThis.String(object.repository_id) : "",
      repository_owner_id: isSet_2(object.repository_owner_id)
        ? globalThis.String(object.repository_owner_id)
        : "",
    };
  },
  toJSON(message) {
    let obj = {};
    if (message.actor_id !== undefined) obj.actor_id = message.actor_id;
    if (message.repository_id !== undefined) obj.repository_id = message.repository_id;
    if (message.repository_owner_id !== undefined) obj.repository_owner_id = message.repository_owner_id;
    return obj;
  },
  create(base) {
    return GitHubActionsMetadata.fromPartial(base ?? {});
  },
  fromPartial(object) {
    let message = createBaseGitHubActionsMetadata();
    message.actor_id = object.actor_id ?? "";
    message.repository_id = object.repository_id ?? "";
    message.repository_owner_id = object.repository_owner_id ?? "";
    return message;
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
    is_running_with_bun: false,
    is_ci: false,
    is_claubbit: false,
    is_github_action: false,
    is_claude_code_action: false,
    is_claude_ai_auth: false,
    version: "",
    github_event_name: "",
    github_actions_runner_environment: "",
    github_actions_runner_os: "",
    github_action_ref: "",
    wsl_version: "",
    github_actions_metadata: undefined,
    arch: "",
    is_claude_code_remote: false,
    remote_environment_type: "",
    claude_code_container_id: "",
    claude_code_remote_session_id: "",
    tags: [],
    deployment_environment: "",
    is_conductor: false,
    version_base: "",
    coworker_type: "",
    build_time: "",
    is_local_agent_mode: false,
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
  fromJSON(object) {
    return {
      platform: isSet_2(object.platform) ? globalThis.String(object.platform) : "",
      node_version: isSet_2(object.node_version) ? globalThis.String(object.node_version) : "",
      terminal: isSet_2(object.terminal) ? globalThis.String(object.terminal) : "",
      package_managers: isSet_2(object.package_managers) ? globalThis.String(object.package_managers) : "",
      runtimes: isSet_2(object.runtimes) ? globalThis.String(object.runtimes) : "",
      is_running_with_bun: isSet_2(object.is_running_with_bun)
        ? globalThis.Boolean(object.is_running_with_bun)
        : false,
      is_ci: isSet_2(object.is_ci) ? globalThis.Boolean(object.is_ci) : false,
      is_claubbit: isSet_2(object.is_claubbit) ? globalThis.Boolean(object.is_claubbit) : false,
      is_github_action: isSet_2(object.is_github_action)
        ? globalThis.Boolean(object.is_github_action)
        : false,
      is_claude_code_action: isSet_2(object.is_claude_code_action)
        ? globalThis.Boolean(object.is_claude_code_action)
        : false,
      is_claude_ai_auth: isSet_2(object.is_claude_ai_auth)
        ? globalThis.Boolean(object.is_claude_ai_auth)
        : false,
      version: isSet_2(object.version) ? globalThis.String(object.version) : "",
      github_event_name: isSet_2(object.github_event_name) ? globalThis.String(object.github_event_name) : "",
      github_actions_runner_environment: isSet_2(object.github_actions_runner_environment)
        ? globalThis.String(object.github_actions_runner_environment)
        : "",
      github_actions_runner_os: isSet_2(object.github_actions_runner_os)
        ? globalThis.String(object.github_actions_runner_os)
        : "",
      github_action_ref: isSet_2(object.github_action_ref) ? globalThis.String(object.github_action_ref) : "",
      wsl_version: isSet_2(object.wsl_version) ? globalThis.String(object.wsl_version) : "",
      github_actions_metadata: isSet_2(object.github_actions_metadata)
        ? GitHubActionsMetadata.fromJSON(object.github_actions_metadata)
        : undefined,
      arch: isSet_2(object.arch) ? globalThis.String(object.arch) : "",
      is_claude_code_remote: isSet_2(object.is_claude_code_remote)
        ? globalThis.Boolean(object.is_claude_code_remote)
        : false,
      remote_environment_type: isSet_2(object.remote_environment_type)
        ? globalThis.String(object.remote_environment_type)
        : "",
      claude_code_container_id: isSet_2(object.claude_code_container_id)
        ? globalThis.String(object.claude_code_container_id)
        : "",
      claude_code_remote_session_id: isSet_2(object.claude_code_remote_session_id)
        ? globalThis.String(object.claude_code_remote_session_id)
        : "",
      tags: globalThis.Array.isArray(object?.tags) ? object.tags.map((e) => globalThis.String(e)) : [],
      deployment_environment: isSet_2(object.deployment_environment)
        ? globalThis.String(object.deployment_environment)
        : "",
      is_conductor: isSet_2(object.is_conductor) ? globalThis.Boolean(object.is_conductor) : false,
      version_base: isSet_2(object.version_base) ? globalThis.String(object.version_base) : "",
      coworker_type: isSet_2(object.coworker_type) ? globalThis.String(object.coworker_type) : "",
      build_time: isSet_2(object.build_time) ? globalThis.String(object.build_time) : "",
      is_local_agent_mode: isSet_2(object.is_local_agent_mode)
        ? globalThis.Boolean(object.is_local_agent_mode)
        : false,
      linux_distro_id: isSet_2(object.linux_distro_id) ? globalThis.String(object.linux_distro_id) : "",
      linux_distro_version: isSet_2(object.linux_distro_version)
        ? globalThis.String(object.linux_distro_version)
        : "",
      linux_kernel: isSet_2(object.linux_kernel) ? globalThis.String(object.linux_kernel) : "",
      vcs: isSet_2(object.vcs) ? globalThis.String(object.vcs) : "",
      platform_raw: isSet_2(object.platform_raw) ? globalThis.String(object.platform_raw) : "",
      shell: isSet_2(object.shell) ? globalThis.String(object.shell) : "",
    };
  },
  toJSON(message) {
    let obj = {};
    if (message.platform !== undefined) obj.platform = message.platform;
    if (message.node_version !== undefined) obj.node_version = message.node_version;
    if (message.terminal !== undefined) obj.terminal = message.terminal;
    if (message.package_managers !== undefined) obj.package_managers = message.package_managers;
    if (message.runtimes !== undefined) obj.runtimes = message.runtimes;
    if (message.is_running_with_bun !== undefined) obj.is_running_with_bun = message.is_running_with_bun;
    if (message.is_ci !== undefined) obj.is_ci = message.is_ci;
    if (message.is_claubbit !== undefined) obj.is_claubbit = message.is_claubbit;
    if (message.is_github_action !== undefined) obj.is_github_action = message.is_github_action;
    if (message.is_claude_code_action !== undefined)
      obj.is_claude_code_action = message.is_claude_code_action;
    if (message.is_claude_ai_auth !== undefined) obj.is_claude_ai_auth = message.is_claude_ai_auth;
    if (message.version !== undefined) obj.version = message.version;
    if (message.github_event_name !== undefined) obj.github_event_name = message.github_event_name;
    if (message.github_actions_runner_environment !== undefined)
      obj.github_actions_runner_environment = message.github_actions_runner_environment;
    if (message.github_actions_runner_os !== undefined)
      obj.github_actions_runner_os = message.github_actions_runner_os;
    if (message.github_action_ref !== undefined) obj.github_action_ref = message.github_action_ref;
    if (message.wsl_version !== undefined) obj.wsl_version = message.wsl_version;
    if (message.github_actions_metadata !== undefined)
      obj.github_actions_metadata = GitHubActionsMetadata.toJSON(message.github_actions_metadata);
    if (message.arch !== undefined) obj.arch = message.arch;
    if (message.is_claude_code_remote !== undefined)
      obj.is_claude_code_remote = message.is_claude_code_remote;
    if (message.remote_environment_type !== undefined)
      obj.remote_environment_type = message.remote_environment_type;
    if (message.claude_code_container_id !== undefined)
      obj.claude_code_container_id = message.claude_code_container_id;
    if (message.claude_code_remote_session_id !== undefined)
      obj.claude_code_remote_session_id = message.claude_code_remote_session_id;
    if (message.tags?.length) obj.tags = message.tags;
    if (message.deployment_environment !== undefined)
      obj.deployment_environment = message.deployment_environment;
    if (message.is_conductor !== undefined) obj.is_conductor = message.is_conductor;
    if (message.version_base !== undefined) obj.version_base = message.version_base;
    if (message.coworker_type !== undefined) obj.coworker_type = message.coworker_type;
    if (message.build_time !== undefined) obj.build_time = message.build_time;
    if (message.is_local_agent_mode !== undefined) obj.is_local_agent_mode = message.is_local_agent_mode;
    if (message.linux_distro_id !== undefined) obj.linux_distro_id = message.linux_distro_id;
    if (message.linux_distro_version !== undefined) obj.linux_distro_version = message.linux_distro_version;
    if (message.linux_kernel !== undefined) obj.linux_kernel = message.linux_kernel;
    if (message.vcs !== undefined) obj.vcs = message.vcs;
    if (message.platform_raw !== undefined) obj.platform_raw = message.platform_raw;
    if (message.shell !== undefined) obj.shell = message.shell;
    return obj;
  },
  create(base) {
    return EnvironmentMetadata.fromPartial(base ?? {});
  },
  fromPartial(object) {
    let message = createBaseEnvironmentMetadata();
    message.platform = object.platform ?? "";
    message.node_version = object.node_version ?? "";
    message.terminal = object.terminal ?? "";
    message.package_managers = object.package_managers ?? "";
    message.runtimes = object.runtimes ?? "";
    message.is_running_with_bun = object.is_running_with_bun ?? false;
    message.is_ci = object.is_ci ?? false;
    message.is_claubbit = object.is_claubbit ?? false;
    message.is_github_action = object.is_github_action ?? false;
    message.is_claude_code_action = object.is_claude_code_action ?? false;
    message.is_claude_ai_auth = object.is_claude_ai_auth ?? false;
    message.version = object.version ?? "";
    message.github_event_name = object.github_event_name ?? "";
    message.github_actions_runner_environment = object.github_actions_runner_environment ?? "";
    message.github_actions_runner_os = object.github_actions_runner_os ?? "";
    message.github_action_ref = object.github_action_ref ?? "";
    message.wsl_version = object.wsl_version ?? "";
    message.github_actions_metadata =
      object.github_actions_metadata !== undefined && object.github_actions_metadata !== null
        ? GitHubActionsMetadata.fromPartial(object.github_actions_metadata)
        : undefined;
    message.arch = object.arch ?? "";
    message.is_claude_code_remote = object.is_claude_code_remote ?? false;
    message.remote_environment_type = object.remote_environment_type ?? "";
    message.claude_code_container_id = object.claude_code_container_id ?? "";
    message.claude_code_remote_session_id = object.claude_code_remote_session_id ?? "";
    message.tags = object.tags?.map((e) => e) || [];
    message.deployment_environment = object.deployment_environment ?? "";
    message.is_conductor = object.is_conductor ?? false;
    message.version_base = object.version_base ?? "";
    message.coworker_type = object.coworker_type ?? "";
    message.build_time = object.build_time ?? "";
    message.is_local_agent_mode = object.is_local_agent_mode ?? false;
    message.linux_distro_id = object.linux_distro_id ?? "";
    message.linux_distro_version = object.linux_distro_version ?? "";
    message.linux_kernel = object.linux_kernel ?? "";
    message.vcs = object.vcs ?? "";
    message.platform_raw = object.platform_raw ?? "";
    message.shell = object.shell ?? "";
    return message;
  },
};
//@ chunk-aepeg2w5.js:670221-670315 fingerprint = createBaseSlackContext (1)
function createBaseSlackContext() {
  return {
    slack_team_id: "",
    is_enterprise_install: false,
    trigger: "",
    creation_method: "",
  };
}
//@ chunk-aepeg2w5.js:670315-671155 fingerprint = SlackContext (1)
var SlackContext = {
  fromJSON(object) {
    return {
      slack_team_id: isSet_2(object.slack_team_id) ? globalThis.String(object.slack_team_id) : "",
      is_enterprise_install: isSet_2(object.is_enterprise_install)
        ? globalThis.Boolean(object.is_enterprise_install)
        : false,
      trigger: isSet_2(object.trigger) ? globalThis.String(object.trigger) : "",
      creation_method: isSet_2(object.creation_method) ? globalThis.String(object.creation_method) : "",
    };
  },
  toJSON(message) {
    let obj = {};
    if (message.slack_team_id !== undefined) obj.slack_team_id = message.slack_team_id;
    if (message.is_enterprise_install !== undefined)
      obj.is_enterprise_install = message.is_enterprise_install;
    if (message.trigger !== undefined) obj.trigger = message.trigger;
    if (message.creation_method !== undefined) obj.creation_method = message.creation_method;
    return obj;
  },
  create(base) {
    return SlackContext.fromPartial(base ?? {});
  },
  fromPartial(object) {
    let message = createBaseSlackContext();
    message.slack_team_id = object.slack_team_id ?? "";
    message.is_enterprise_install = object.is_enterprise_install ?? false;
    message.trigger = object.trigger ?? "";
    message.creation_method = object.creation_method ?? "";
    return message;
  },
};
//@ chunk-aepeg2w5.js:671155-671872 fingerprint = createBaseClaudeCodeInternalEvent (0.83)
function createBaseClaudeCodeInternalEvent() {
  return {
    event_name: "",
    client_timestamp: undefined,
    model: "",
    session_id: "",
    user_type: "",
    betas: "",
    env: undefined,
    entrypoint: "",
    agent_sdk_version: "",
    is_interactive: false,
    client_type: "",
    process: undefined,
    additional_metadata: undefined,
    auth: undefined,
    server_timestamp: undefined,
    event_id: "",
    device_id: "",
    swe_bench_run_id: "",
    swe_bench_instance_id: "",
    swe_bench_task_id: "",
    email: "",
    agent_id: "",
    parent_session_id: "",
    agent_type: "",
    slack: undefined,
    team_name: "",
    skill_name: "",
    plugin_name: "",
    marketplace_name: "",
    head_sha: "",
    client_reported_auth: undefined,
    event_metadata_vars: undefined,
    mcp_server_name: "",
    mcp_tool_name: "",
    git_remote_url: "",
    is_clean_tree_at_start: undefined,
    changed_file_count_at_start: undefined,
    untracked_file_count_at_start: undefined,
    rh: undefined,
  };
}
//@ chunk-aepeg2w5.js:671872-678763 fingerprint = ClaudeCodeInternalEvent (0.843)
var ClaudeCodeInternalEvent = {
  fromJSON(object) {
    return {
      event_name: isSet_2(object.event_name) ? globalThis.String(object.event_name) : "",
      client_timestamp: isSet_2(object.client_timestamp)
        ? fromJsonTimestamp(object.client_timestamp)
        : undefined,
      model: isSet_2(object.model) ? globalThis.String(object.model) : "",
      session_id: isSet_2(object.session_id) ? globalThis.String(object.session_id) : "",
      user_type: isSet_2(object.user_type) ? globalThis.String(object.user_type) : "",
      betas: isSet_2(object.betas) ? globalThis.String(object.betas) : "",
      env: isSet_2(object.env) ? EnvironmentMetadata.fromJSON(object.env) : undefined,
      entrypoint: isSet_2(object.entrypoint) ? globalThis.String(object.entrypoint) : "",
      agent_sdk_version: isSet_2(object.agent_sdk_version) ? globalThis.String(object.agent_sdk_version) : "",
      is_interactive: isSet_2(object.is_interactive) ? globalThis.Boolean(object.is_interactive) : false,
      client_type: isSet_2(object.client_type) ? globalThis.String(object.client_type) : "",
      process: isSet_2(object.process) ? globalThis.String(object.process) : undefined,
      additional_metadata: isSet_2(object.additional_metadata)
        ? globalThis.String(object.additional_metadata)
        : undefined,
      auth: isSet_2(object.auth) ? PublicApiAuth.fromJSON(object.auth) : undefined,
      server_timestamp: isSet_2(object.server_timestamp)
        ? fromJsonTimestamp(object.server_timestamp)
        : undefined,
      event_id: isSet_2(object.event_id) ? globalThis.String(object.event_id) : "",
      device_id: isSet_2(object.device_id) ? globalThis.String(object.device_id) : "",
      swe_bench_run_id: isSet_2(object.swe_bench_run_id) ? globalThis.String(object.swe_bench_run_id) : "",
      swe_bench_instance_id: isSet_2(object.swe_bench_instance_id)
        ? globalThis.String(object.swe_bench_instance_id)
        : "",
      swe_bench_task_id: isSet_2(object.swe_bench_task_id) ? globalThis.String(object.swe_bench_task_id) : "",
      email: isSet_2(object.email) ? globalThis.String(object.email) : "",
      agent_id: isSet_2(object.agent_id) ? globalThis.String(object.agent_id) : "",
      parent_session_id: isSet_2(object.parent_session_id) ? globalThis.String(object.parent_session_id) : "",
      agent_type: isSet_2(object.agent_type) ? globalThis.String(object.agent_type) : "",
      slack: isSet_2(object.slack) ? SlackContext.fromJSON(object.slack) : undefined,
      team_name: isSet_2(object.team_name) ? globalThis.String(object.team_name) : "",
      skill_name: isSet_2(object.skill_name) ? globalThis.String(object.skill_name) : "",
      plugin_name: isSet_2(object.plugin_name) ? globalThis.String(object.plugin_name) : "",
      marketplace_name: isSet_2(object.marketplace_name) ? globalThis.String(object.marketplace_name) : "",
      head_sha: isSet_2(object.head_sha) ? globalThis.String(object.head_sha) : "",
      client_reported_auth: isSet_2(object.client_reported_auth)
        ? PublicApiAuth_2.fromJSON(object.client_reported_auth)
        : undefined,
      event_metadata_vars: isSet_2(object.event_metadata_vars)
        ? globalThis.String(object.event_metadata_vars)
        : undefined,
      mcp_server_name: isSet_2(object.mcp_server_name) ? globalThis.String(object.mcp_server_name) : "",
      mcp_tool_name: isSet_2(object.mcp_tool_name) ? globalThis.String(object.mcp_tool_name) : "",
      git_remote_url: isSet_2(object.git_remote_url) ? globalThis.String(object.git_remote_url) : "",
      is_clean_tree_at_start: isSet_2(object.is_clean_tree_at_start)
        ? globalThis.Boolean(object.is_clean_tree_at_start)
        : undefined,
      changed_file_count_at_start: isSet_2(object.changed_file_count_at_start)
        ? globalThis.Number(object.changed_file_count_at_start)
        : undefined,
      untracked_file_count_at_start: isSet_2(object.untracked_file_count_at_start)
        ? globalThis.Number(object.untracked_file_count_at_start)
        : undefined,
      rh: isSet_2(object.rh) ? globalThis.String(object.rh) : undefined,
    };
  },
  toJSON(message) {
    let obj = {};
    if (message.event_name !== undefined) obj.event_name = message.event_name;
    if (message.client_timestamp !== undefined) obj.client_timestamp = message.client_timestamp.toISOString();
    if (message.model !== undefined) obj.model = message.model;
    if (message.session_id !== undefined) obj.session_id = message.session_id;
    if (message.user_type !== undefined) obj.user_type = message.user_type;
    if (message.betas !== undefined) obj.betas = message.betas;
    if (message.env !== undefined) obj.env = EnvironmentMetadata.toJSON(message.env);
    if (message.entrypoint !== undefined) obj.entrypoint = message.entrypoint;
    if (message.agent_sdk_version !== undefined) obj.agent_sdk_version = message.agent_sdk_version;
    if (message.is_interactive !== undefined) obj.is_interactive = message.is_interactive;
    if (message.client_type !== undefined) obj.client_type = message.client_type;
    if (message.process !== undefined) obj.process = message.process;
    if (message.additional_metadata !== undefined) obj.additional_metadata = message.additional_metadata;
    if (message.auth !== undefined) obj.auth = PublicApiAuth.toJSON(message.auth);
    if (message.server_timestamp !== undefined) obj.server_timestamp = message.server_timestamp.toISOString();
    if (message.event_id !== undefined) obj.event_id = message.event_id;
    if (message.device_id !== undefined) obj.device_id = message.device_id;
    if (message.swe_bench_run_id !== undefined) obj.swe_bench_run_id = message.swe_bench_run_id;
    if (message.swe_bench_instance_id !== undefined)
      obj.swe_bench_instance_id = message.swe_bench_instance_id;
    if (message.swe_bench_task_id !== undefined) obj.swe_bench_task_id = message.swe_bench_task_id;
    if (message.email !== undefined) obj.email = message.email;
    if (message.agent_id !== undefined) obj.agent_id = message.agent_id;
    if (message.parent_session_id !== undefined) obj.parent_session_id = message.parent_session_id;
    if (message.agent_type !== undefined) obj.agent_type = message.agent_type;
    if (message.slack !== undefined) obj.slack = SlackContext.toJSON(message.slack);
    if (message.team_name !== undefined) obj.team_name = message.team_name;
    if (message.skill_name !== undefined) obj.skill_name = message.skill_name;
    if (message.plugin_name !== undefined) obj.plugin_name = message.plugin_name;
    if (message.marketplace_name !== undefined) obj.marketplace_name = message.marketplace_name;
    if (message.head_sha !== undefined) obj.head_sha = message.head_sha;
    if (message.client_reported_auth !== undefined)
      obj.client_reported_auth = PublicApiAuth_2.toJSON(message.client_reported_auth);
    if (message.event_metadata_vars !== undefined) obj.event_metadata_vars = message.event_metadata_vars;
    if (message.mcp_server_name !== undefined) obj.mcp_server_name = message.mcp_server_name;
    if (message.mcp_tool_name !== undefined) obj.mcp_tool_name = message.mcp_tool_name;
    if (message.git_remote_url !== undefined) obj.git_remote_url = message.git_remote_url;
    if (message.is_clean_tree_at_start !== undefined)
      obj.is_clean_tree_at_start = message.is_clean_tree_at_start;
    if (message.changed_file_count_at_start !== undefined)
      obj.changed_file_count_at_start = Math.round(message.changed_file_count_at_start);
    if (message.untracked_file_count_at_start !== undefined)
      obj.untracked_file_count_at_start = Math.round(message.untracked_file_count_at_start);
    if (message.rh !== undefined) obj.rh = message.rh;
    return obj;
  },
  create(base) {
    return ClaudeCodeInternalEvent.fromPartial(base ?? {});
  },
  fromPartial(object) {
    let message = createBaseClaudeCodeInternalEvent();
    message.event_name = object.event_name ?? "";
    message.client_timestamp = object.client_timestamp ?? undefined;
    message.model = object.model ?? "";
    message.session_id = object.session_id ?? "";
    message.user_type = object.user_type ?? "";
    message.betas = object.betas ?? "";
    message.env =
      object.env !== undefined && object.env !== null
        ? EnvironmentMetadata.fromPartial(object.env)
        : undefined;
    message.entrypoint = object.entrypoint ?? "";
    message.agent_sdk_version = object.agent_sdk_version ?? "";
    message.is_interactive = object.is_interactive ?? false;
    message.client_type = object.client_type ?? "";
    message.process = object.process ?? undefined;
    message.additional_metadata = object.additional_metadata ?? undefined;
    message.auth =
      object.auth !== undefined && object.auth !== null ? PublicApiAuth.fromPartial(object.auth) : undefined;
    message.server_timestamp = object.server_timestamp ?? undefined;
    message.event_id = object.event_id ?? "";
    message.device_id = object.device_id ?? "";
    message.swe_bench_run_id = object.swe_bench_run_id ?? "";
    message.swe_bench_instance_id = object.swe_bench_instance_id ?? "";
    message.swe_bench_task_id = object.swe_bench_task_id ?? "";
    message.email = object.email ?? "";
    message.agent_id = object.agent_id ?? "";
    message.parent_session_id = object.parent_session_id ?? "";
    message.agent_type = object.agent_type ?? "";
    message.slack =
      object.slack !== undefined && object.slack !== null
        ? SlackContext.fromPartial(object.slack)
        : undefined;
    message.team_name = object.team_name ?? "";
    message.skill_name = object.skill_name ?? "";
    message.plugin_name = object.plugin_name ?? "";
    message.marketplace_name = object.marketplace_name ?? "";
    message.head_sha = object.head_sha ?? "";
    message.client_reported_auth =
      object.client_reported_auth !== undefined && object.client_reported_auth !== null
        ? PublicApiAuth_2.fromPartial(object.client_reported_auth)
        : undefined;
    message.event_metadata_vars = object.event_metadata_vars ?? undefined;
    message.mcp_server_name = object.mcp_server_name ?? "";
    message.mcp_tool_name = object.mcp_tool_name ?? "";
    message.git_remote_url = object.git_remote_url ?? "";
    message.is_clean_tree_at_start = object.is_clean_tree_at_start ?? undefined;
    message.changed_file_count_at_start = object.changed_file_count_at_start ?? undefined;
    message.untracked_file_count_at_start = object.untracked_file_count_at_start ?? undefined;
    message.rh = object.rh ?? undefined;
    return message;
  },
};
//@ chunk-aepeg2w5.js:678763-678854 fingerprint = fromTimestamp (1)
function fromTimestamp(t) {
  let millis = (t.seconds || 0) * 1000;
  millis += (t.nanos || 0) / 1e6;
  return new globalThis.Date(millis);
}
//@ chunk-aepeg2w5.js:678854-678999 fingerprint = fromJsonTimestamp (1)
function fromJsonTimestamp(o) {
  if (o instanceof globalThis.Date) return o;
  else if (typeof o === "string") return new globalThis.Date(o);
  else return fromTimestamp(Timestamp.fromJSON(o));
}
//@ chunk-aepeg2w5.js:678999-679042 callgraph-witnessed = isSet (0)
function isSet_2(value) {
  return value !== null && value !== undefined;
}
export { ClaudeCodeInternalEvent };
