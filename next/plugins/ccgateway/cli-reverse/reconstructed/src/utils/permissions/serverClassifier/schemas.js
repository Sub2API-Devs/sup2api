/**
 * utils/permissions/serverClassifier/schemas.ts
 *
 * 2.1.316 新增：分类器决策 schema
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nt9amew5.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  array,
  record,
  booleanSchema,
  literal,
  partialRecord,
  _enum,
  numberSchema,
  unknown,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-nt9amew5.js:1832-3889 placement
/**
 * 服务端分类器决策 schema（allow/deny/ask 与自动模式软硬拒绝）。
 */
var DEFAULT_MAX_SAVED_RULES; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_SAVED_RULES_SETTING;
var MAX_RULE_PATTERN_LENGTH;
var MAX_CLASSIFIER_PAYLOAD_BYTES;
var MAX_RULES_PER_LIST;
var MAX_USER_IDENTITY_LENGTH;
var MAX_TRUSTED_DIR_ENTRIES;
var MAX_DROPPED_ENTRIES;
var MAX_AUTO_MODE_LINE_LENGTH;
var MAX_PERMISSION_MODE_LENGTH;
var MAX_PLATFORM_LENGTH;
var MAX_PATH_FIELD_LENGTH;
var ruleEntrySchema;
var trustedPathSchema;
var CLASSIFIER_DECISION_VALUES;
var classifierContextSchema;
var artifactVisibilitySchema;
var chromeNavigationSchema;
var gitStateSchema;
var classifierExtraContextSchema;
var MAX_TOOL_USE_IDS;
var MAX_CONTEXT_ENTRY_LENGTH;
var perToolContextSchema;
var MAX_MCP_RULE_LENGTH;
var MAX_ID_LIST_LENGTH;
var MAX_TURN_TEXT_LENGTH;
var MAX_TURN_ATTACHMENT_LENGTH;
var MAX_FILESYSTEM_PATH_LENGTH;
var MAX_SAVED_RULES;
var MAX_SESSION_IDS;
var MAX_SESSION_TITLES;
var MAX_CONTEXT_TEXT_LENGTH;
var MAX_ARTIFACT_SLUGS;
var MAX_ARTIFACT_PATH_LENGTH;
var MAX_ARTIFACT_SLUG_LENGTH;
var MAX_ARTIFACT_TEXT_LENGTH;
deferInit("chunk-nt9amew5.js:1832", () => {
  DEFAULT_MAX_SAVED_RULES = 64;
  MAX_SAVED_RULES_SETTING = 1024;
  MAX_RULE_PATTERN_LENGTH = 200;
  MAX_CLASSIFIER_PAYLOAD_BYTES = 256000;
  MAX_RULES_PER_LIST = 1024;
  MAX_USER_IDENTITY_LENGTH = 16;
  MAX_TRUSTED_DIR_ENTRIES = 128000;
  MAX_DROPPED_ENTRIES = 1024;
  MAX_AUTO_MODE_LINE_LENGTH = 4096;
  MAX_PERMISSION_MODE_LENGTH = 32;
  MAX_PLATFORM_LENGTH = 256;
  MAX_PATH_FIELD_LENGTH = 260;
  ruleEntrySchema = DoctorLazy(() =>
    objectSchema({
      rule: stringSchema(),
      canonical: stringSchema().optional(),
      source: stringSchema(),
      root: stringSchema().nullable().optional(),
      pattern: stringSchema().optional(),
    }),
  );
  trustedPathSchema = DoctorLazy(() =>
    objectSchema({
      path: stringSchema(),
      resolved: array(stringSchema()),
    }),
  );
  CLASSIFIER_DECISION_VALUES = [
    "allow",
    "deny",
    "ask",
    "auto_mode_allow",
    "auto_mode_soft_deny",
    "auto_mode_hard_deny",
    "auto_mode_environment",
  ];
  classifierContextSchema = DoctorLazy(() =>
    objectSchema({
      permission_mode: stringSchema(),
      platform: stringSchema(),
      live_cwd: stringSchema().optional(),
      home_dir: stringSchema().optional(),
      rule_roots: record(stringSchema(), stringSchema()),
      trusted_directories: objectSchema({
        primary: trustedPathSchema().optional(),
        additional: array(
          objectSchema({
            path: stringSchema(),
            resolved: array(stringSchema()),
            source: stringSchema(),
          }),
        ),
        network: array(stringSchema()),
        block_reads_outside_working_directories: booleanSchema(),
      }),
      rules: objectSchema({
        allow: array(ruleEntrySchema()),
        deny: array(ruleEntrySchema()),
        ask: array(ruleEntrySchema()),
      }),
      case_insensitive_paths: booleanSchema(),
      auto_mode: objectSchema({
        allow: array(stringSchema()),
        soft_deny: array(stringSchema()),
        hard_deny: array(stringSchema()),
        environment: array(stringSchema()),
      }),
      artifact_consent_holdback: booleanSchema(),
      chrome_navigation: chromeNavigationSchema().optional(),
      restricted: booleanSchema(),
      is_remote_mode: booleanSchema(),
      classify_all_shell: booleanSchema(),
      mcp_allow_rules_exact: literal(true).optional(),
      user_identity: stringSchema().nullable(),
      dropped: partialRecord(_enum(CLASSIFIER_DECISION_VALUES), numberSchema()).optional(),
      truncated: booleanSchema().optional(),
    }),
  );
  artifactVisibilitySchema = DoctorLazy(() => _enum(["public", "private", "unknown"]));
  chromeNavigationSchema = DoctorLazy(() =>
    objectSchema({
      enabled: booleanSchema(),
      baselines: record(stringSchema(), stringSchema()),
      tabs: record(stringSchema(), record(stringSchema(), stringSchema())).optional(),
    }),
  );
  gitStateSchema = DoctorLazy(() =>
    objectSchema({
      cwd: stringSchema().nullable(),
      root: stringSchema().nullable(),
      branch: stringSchema().nullable(),
      default_branch: stringSchema().nullable(),
      status: objectSchema({
        clean: booleanSchema(),
        counts: objectSchema({
          staged: numberSchema(),
          modified: numberSchema(),
          untracked: numberSchema().nullable(),
          untracked_normal: numberSchema().nullable(),
        }).nullable(),
        porcelain: stringSchema().nullable(),
        truncated: booleanSchema(),
      }).nullable(),
      visibility: objectSchema({
        origin: objectSchema({
          host: stringSchema(),
          remote: stringSchema(),
          visibility: artifactVisibilitySchema(),
        }).nullable(),
        push_remote: stringSchema().nullable(),
        remotes: array(
          objectSchema({
            name: stringSchema(),
            host: stringSchema(),
            remote: stringSchema(),
            visibility: artifactVisibilitySchema(),
          }),
        ),
        visibility_cache: array(
          objectSchema({
            host: stringSchema(),
            remote: stringSchema(),
            visibility: artifactVisibilitySchema(),
          }),
        ),
      }).nullable(),
      error: _enum(["timeout", "not_a_repo", "error", "pending"]).optional(),
      truncated: booleanSchema().optional(),
    }),
  );
  classifierExtraContextSchema = DoctorLazy(() =>
    objectSchema({
      git_state: gitStateSchema().optional(),
      chrome_navigation: chromeNavigationSchema().optional(),
      live_cwd: stringSchema().optional(),
      platform: stringSchema().optional(),
    }),
  );
  MAX_TOOL_USE_IDS = 64;
  MAX_CONTEXT_ENTRY_LENGTH = 200;
  perToolContextSchema = DoctorLazy(() =>
    objectSchema({
      tool_use_ids: array(stringSchema().max(MAX_CONTEXT_ENTRY_LENGTH)),
      context: classifierExtraContextSchema(),
    }),
  );
  MAX_MCP_RULE_LENGTH = 1024;
  MAX_ID_LIST_LENGTH = 64;
  MAX_TURN_TEXT_LENGTH = 256;
  MAX_TURN_ATTACHMENT_LENGTH = 256;
  MAX_FILESYSTEM_PATH_LENGTH = 64;
  MAX_SAVED_RULES = 32;
  MAX_SESSION_IDS = 8;
  MAX_SESSION_TITLES = 1024;
  MAX_CONTEXT_TEXT_LENGTH = 64;
  MAX_ARTIFACT_SLUGS = 64000;
  MAX_ARTIFACT_PATH_LENGTH = 4000;
  MAX_ARTIFACT_SLUG_LENGTH = 32;
  MAX_ARTIFACT_TEXT_LENGTH = 64;
});
//@ chunk-nt9amew5.js:3950-5713 placement
/**
 * 发给分类器的 Artifact 状态 schema：按 slug 的分享/认证/观察状态、按路径映射、实时文档、房间、最近发布与会话级能力开关。
 */
var artifactEnvSchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var artifactShareStateSchema;
var artifactSlugStateSchema;
var artifactClassifierStateSchema;
deferInit("chunk-nt9amew5.js:3950", () => {
  artifactEnvSchema = DoctorLazy(() => _enum(["prod", "staging"]));
  artifactShareStateSchema = DoctorLazy(() =>
    objectSchema({
      mode: stringSchema(),
      is_shared_live: booleanSchema(),
      role: stringSchema().optional(),
      probe_failed: literal(true).optional(),
      probed: booleanSchema(),
      probe_current_account: booleanSchema(),
      cowritten: literal(true).optional(),
      outside_writer: literal(true).optional(),
      artifact_kind: stringSchema().optional(),
      type_locked: literal(true).optional(),
      type_lock: booleanSchema().optional(),
      type_first_party: literal(true).optional(),
      caps_read_not_found: literal(true).optional(),
      live_paths: array(stringSchema()).optional(),
      capabilities: record(stringSchema(), unknown()).optional(),
      capabilities_unknown: literal(true).optional(),
      capabilities_cut: literal(true).optional(),
      grant_observed: booleanSchema(),
      endpoint_connectors: array(stringSchema()).optional(),
    }),
  );
  artifactSlugStateSchema = DoctorLazy(() =>
    objectSchema({
      share: artifactShareStateSchema().optional(),
      attested: stringSchema().optional(),
      notice_pending: literal(true).optional(),
      published_env: artifactEnvSchema().optional(),
      watch: objectSchema({
        stopped: literal(true).optional(),
        auto_reply_stopped: literal(true).optional(),
        auto_reply_swept: literal(true).optional(),
        replies_declined: literal(true).optional(),
      }).optional(),
    }),
  );
  artifactClassifierStateSchema = DoctorLazy(() =>
    objectSchema({
      by_slug: record(stringSchema(), artifactSlugStateSchema()),
      by_path: record(
        stringSchema(),
        objectSchema({
          slug: stringSchema().optional(),
          thumbnail_named: array(stringSchema()).optional(),
        }),
      ),
      live_docs: array(
        objectSchema({
          slug: stringSchema(),
          live_path: stringSchema(),
          working_copy: stringSchema(),
        }),
      ),
      room_armed: array(stringSchema()),
      type_reads: record(
        stringSchema(),
        objectSchema({
          declares_room: booleanSchema(),
        }),
      ),
      last_publish: objectSchema({
        slug: stringSchema(),
        env: artifactEnvSchema(),
      }).optional(),
      session: objectSchema({
        frame_env: artifactEnvSchema(),
        viewer_origin: stringSchema(),
        dev_viewer_origin: stringSchema().optional(),
        toolset: booleanSchema().optional(),
        short_links: booleanSchema().optional(),
        ant_build: booleanSchema(),
        live_edit: booleanSchema().optional(),
        live_doc_stream: booleanSchema().optional(),
        live_paths_schema: booleanSchema().optional(),
        copy_from: booleanSchema().optional(),
        types_on: booleanSchema().optional(),
        five_class_asks: booleanSchema().optional(),
        inherited_type_grant: literal(true).optional(),
        connectors_mark: literal(true).optional(),
        watch_rail: _enum(["live", "durable", "none"]).optional(),
        auto_react: booleanSchema().optional(),
        comments_in_schema: booleanSchema(),
        db_str_replace: booleanSchema().optional(),
        handlers: booleanSchema(),
        room_client: booleanSchema(),
        eval_stub: booleanSchema(),
        scratchpad_dir: stringSchema().nullable(),
        tool_results_dir: stringSchema().optional(),
      }),
      truncated: booleanSchema().optional(),
    }),
  );
});
export {
  MAX_ARTIFACT_SLUG_LENGTH,
  MAX_ARTIFACT_TEXT_LENGTH,
  MAX_CONTEXT_ENTRY_LENGTH,
  MAX_TOOL_USE_IDS,
  MAX_ID_LIST_LENGTH,
  MAX_MCP_RULE_LENGTH,
  classifierExtraContextSchema,
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
  MAX_AUTO_MODE_LINE_LENGTH,
  DEFAULT_MAX_SAVED_RULES,
  MAX_SAVED_RULES_SETTING,
  MAX_CLASSIFIER_PAYLOAD_BYTES,
};
