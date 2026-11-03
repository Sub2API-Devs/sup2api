/**
 * utils/permissions/serverClassifier/schemas.ts
 *
 * 2.1.316 新增：分类器决策 schema
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  u,
  string,
  array,
  record,
  M,
  literal,
  partialRecord,
  _enum,
  E,
  unknown,
} from "../../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-e6aww6q8.js:133187-135297 placement
/**
 * 服务端分类器决策 schema（allow/deny/ask 与自动模式软硬拒绝）。
 */
var SERVER_CLASSIFIER_DECISION_SCHEMA = 64;
var MAX_RULE_CANONICAL_LENGTH = 1024;
var MAX_RULE_PATTERN_LENGTH = 200;
var MAX_CLASSIFIER_PAYLOAD_BYTES = 256000;
var MAX_RULES_PER_LIST = 1024;
var MAX_USER_IDENTITY_LENGTH = 16;
var MAX_TRUSTED_DIR_ENTRIES = 128000;
var MAX_DROPPED_ENTRIES = 1024;
var MAX_AUTO_MODE_LINE_LENGTH = 4096;
var MAX_PERMISSION_MODE_LENGTH = 32;
var MAX_PLATFORM_LENGTH = 256;
var MAX_PATH_FIELD_LENGTH = 260;
var ruleEntrySchema = DoctorLazy(() =>
  u({
    rule: string(),
    canonical: string().optional(),
    source: string(),
    root: string().nullable().optional(),
    pattern: string().optional(),
  }),
);
var trustedPathSchema = DoctorLazy(() =>
  u({
    path: string(),
    resolved: array(string()),
  }),
);
var CLASSIFIER_DECISION_VALUES = [
  "allow",
  "deny",
  "ask",
  "auto_mode_allow",
  "auto_mode_soft_deny",
  "auto_mode_hard_deny",
  "auto_mode_environment",
];
var classifierContextSchema = DoctorLazy(() =>
  u({
    permission_mode: string(),
    platform: string(),
    live_cwd: string().optional(),
    home_dir: string().optional(),
    rule_roots: record(string(), string()),
    trusted_directories: u({
      primary: trustedPathSchema().optional(),
      additional: array(
        u({
          path: string(),
          resolved: array(string()),
          source: string(),
        }),
      ),
      network: array(string()),
      block_reads_outside_working_directories: M(),
    }),
    rules: u({
      allow: array(ruleEntrySchema()),
      deny: array(ruleEntrySchema()),
      ask: array(ruleEntrySchema()),
    }),
    case_insensitive_paths: M(),
    auto_mode: u({
      allow: array(string()),
      soft_deny: array(string()),
      hard_deny: array(string()),
      environment: array(string()),
    }),
    artifact_consent_holdback: M(),
    chrome_navigation: chromeNavigationSchema().optional(),
    restricted: M(),
    is_remote_mode: M(),
    classify_all_shell: M(),
    mcp_allow_rules_exact: literal(true).optional(),
    user_identity: string().nullable(),
    dropped: partialRecord(_enum(CLASSIFIER_DECISION_VALUES), E()).optional(),
    truncated: M().optional(),
  }),
);
var artifactVisibilitySchema = DoctorLazy(() => _enum(["public", "private", "unknown"]));
var chromeNavigationSchema = DoctorLazy(() =>
  u({
    enabled: M(),
    baselines: record(string(), string()),
    tabs: record(string(), record(string(), string())).optional(),
  }),
);
var gitStateSchema = DoctorLazy(() =>
  u({
    cwd: string().nullable(),
    root: string().nullable(),
    branch: string().nullable(),
    default_branch: string().nullable(),
    status: u({
      clean: M(),
      counts: u({
        staged: E(),
        modified: E(),
        untracked: E().nullable(),
        untracked_normal: E().nullable(),
      }).nullable(),
      porcelain: string().nullable(),
      truncated: M(),
    }).nullable(),
    visibility: u({
      origin: u({
        host: string(),
        remote: string(),
        visibility: artifactVisibilitySchema(),
      }).nullable(),
      push_remote: string().nullable(),
      remotes: array(
        u({
          name: string(),
          host: string(),
          remote: string(),
          visibility: artifactVisibilitySchema(),
        }),
      ),
      visibility_cache: array(
        u({
          host: string(),
          remote: string(),
          visibility: artifactVisibilitySchema(),
        }),
      ),
    }).nullable(),
    error: _enum(["timeout", "not_a_repo", "error", "pending"]).optional(),
    truncated: M().optional(),
  }),
);
var classifierExtraContextSchema = DoctorLazy(() =>
  u({
    git_state: gitStateSchema().optional(),
    chrome_navigation: chromeNavigationSchema().optional(),
    live_cwd: string().optional(),
    platform: string().optional(),
  }),
);
var MAX_TOOL_USE_IDS = 64;
var MAX_CONTEXT_ENTRY_LENGTH = 200;
var perToolContextSchema = DoctorLazy(() =>
  u({
    tool_use_ids: array(string().max(MAX_CONTEXT_ENTRY_LENGTH)),
    context: classifierExtraContextSchema(),
  }),
);
var MAX_MCP_RULE_LENGTH = 1024;
var MAX_ID_LIST_LENGTH = 64;
var MAX_TURN_TEXT_LENGTH = 256;
var MAX_TURN_ATTACHMENT_LENGTH = 256;
var MAX_FILESYSTEM_PATH_LENGTH = 64;
var MAX_SAVED_RULES = 32;
var MAX_SESSION_IDS = 8;
var MAX_SESSION_TITLES = 1024;
var MAX_CONTEXT_TEXT_LENGTH = 64;
var MAX_ARTIFACT_SLUGS = 64000;
var MAX_ARTIFACT_PATH_LENGTH = 4000;
var MAX_ARTIFACT_SLUG_LENGTH = 32;
var MAX_ARTIFACT_TEXT_LENGTH = 64;
//@ chunk-e6aww6q8.js:135360-137136 placement
/**
 * 发给分类器的 Artifact 状态 schema：按 slug 的分享/认证/观察状态、按路径映射、实时文档、房间、最近发布与会话级能力开关。
 */
var artifactEnvSchema = DoctorLazy(() => _enum(["prod", "staging"]));
var artifactShareStateSchema = DoctorLazy(() =>
  u({
    mode: string(),
    is_shared_live: M(),
    role: string().optional(),
    probe_failed: literal(true).optional(),
    probed: M(),
    probe_current_account: M(),
    cowritten: literal(true).optional(),
    outside_writer: literal(true).optional(),
    artifact_kind: string().optional(),
    type_locked: literal(true).optional(),
    type_lock: M().optional(),
    type_first_party: literal(true).optional(),
    caps_read_not_found: literal(true).optional(),
    live_paths: array(string()).optional(),
    capabilities: record(string(), unknown()).optional(),
    capabilities_unknown: literal(true).optional(),
    capabilities_cut: literal(true).optional(),
    grant_observed: M(),
    endpoint_connectors: array(string()).optional(),
  }),
);
var artifactSlugStateSchema = DoctorLazy(() =>
  u({
    share: artifactShareStateSchema().optional(),
    attested: string().optional(),
    notice_pending: literal(true).optional(),
    published_env: artifactEnvSchema().optional(),
    watch: u({
      stopped: literal(true).optional(),
      auto_reply_stopped: literal(true).optional(),
      auto_reply_swept: literal(true).optional(),
      replies_declined: literal(true).optional(),
    }).optional(),
  }),
);
var artifactClassifierStateSchema = DoctorLazy(() =>
  u({
    by_slug: record(string(), artifactSlugStateSchema()),
    by_path: record(
      string(),
      u({
        slug: string().optional(),
        thumbnail_named: array(string()).optional(),
      }),
    ),
    live_docs: array(
      u({
        slug: string(),
        live_path: string(),
        working_copy: string(),
      }),
    ),
    room_armed: array(string()),
    type_reads: record(
      string(),
      u({
        declares_room: M(),
      }),
    ),
    last_publish: u({
      slug: string(),
      env: artifactEnvSchema(),
    }).optional(),
    session: u({
      frame_env: artifactEnvSchema(),
      viewer_origin: string(),
      dev_viewer_origin: string().optional(),
      toolset: M().optional(),
      short_links: M().optional(),
      ant_build: M(),
      live_edit: M().optional(),
      live_doc_stream: M().optional(),
      live_paths_schema: M().optional(),
      copy_from: M().optional(),
      types_on: M().optional(),
      five_class_asks: M().optional(),
      inherited_type_grant: literal(true).optional(),
      connectors_mark: literal(true).optional(),
      watch_rail: _enum(["live", "durable", "none"]).optional(),
      auto_react: M().optional(),
      comments_in_schema: M(),
      db_str_replace: M().optional(),
      handlers: M(),
      room_client: M(),
      eval_stub: M(),
      scratchpad_dir: string().nullable(),
      tool_results_dir: string().optional(),
    }),
    truncated: M().optional(),
  }),
);
export {
  MAX_ARTIFACT_SLUG_LENGTH,
  MAX_ARTIFACT_TEXT_LENGTH,
  MAX_CONTEXT_ENTRY_LENGTH,
  MAX_TOOL_USE_IDS,
  MAX_SESSION_TITLES,
  MAX_ARTIFACT_PATH_LENGTH,
  MAX_CONTEXT_TEXT_LENGTH,
  MAX_SAVED_RULES,
  MAX_TURN_TEXT_LENGTH,
  MAX_TURN_ATTACHMENT_LENGTH,
  MAX_SESSION_IDS,
  MAX_FILESYSTEM_PATH_LENGTH,
  MAX_ARTIFACT_SLUGS,
  MAX_RULES_PER_LIST,
  MAX_RULE_PATTERN_LENGTH,
  MAX_USER_IDENTITY_LENGTH,
  MAX_TRUSTED_DIR_ENTRIES,
  MAX_DROPPED_ENTRIES,
  MAX_PATH_FIELD_LENGTH,
  MAX_PERMISSION_MODE_LENGTH,
  MAX_PLATFORM_LENGTH,
  MAX_ID_LIST_LENGTH,
  MAX_MCP_RULE_LENGTH,
  classifierExtraContextSchema,
  MAX_AUTO_MODE_LINE_LENGTH,
  SERVER_CLASSIFIER_DECISION_SCHEMA,
  MAX_RULE_CANONICAL_LENGTH,
  MAX_CLASSIFIER_PAYLOAD_BYTES,
};
