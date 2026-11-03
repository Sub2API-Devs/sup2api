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
import { u, o, A, pe, M, T, Hve, U, E, oe } from "../../../../vendor/zod/v4/classic/schemas.js";

/**
 * 服务端分类器决策 schema（allow/deny/ask 与自动模式软硬拒绝）。
 */
//@ chunk-e6aww6q8.js:133187-135297 placement
var SERVER_CLASSIFIER_DECISION_SCHEMA = 64,
  _Vs = 1024,
  fTt = 200,
  bVs = 256000,
  pTt = 1024,
  mTt = 16,
  Eao = 128000,
  hTt = 1024,
  S$o = 4096,
  JUr = 32,
  s3n = 256,
  yTt = 260,
  e$e = DoctorLazy(() =>
    u({
      rule: o(),
      canonical: o().optional(),
      source: o(),
      root: o().nullable().optional(),
      pattern: o().optional(),
    }),
  ),
  Rao = DoctorLazy(() => u({ path: o(), resolved: A(o()) })),
  Cao = [
    "allow",
    "deny",
    "ask",
    "auto_mode_allow",
    "auto_mode_soft_deny",
    "auto_mode_hard_deny",
    "auto_mode_environment",
  ],
  Sui = DoctorLazy(() =>
    u({
      permission_mode: o(),
      platform: o(),
      live_cwd: o().optional(),
      home_dir: o().optional(),
      rule_roots: pe(o(), o()),
      trusted_directories: u({
        primary: Rao().optional(),
        additional: A(u({ path: o(), resolved: A(o()), source: o() })),
        network: A(o()),
        block_reads_outside_working_directories: M(),
      }),
      rules: u({ allow: A(e$e()), deny: A(e$e()), ask: A(e$e()) }),
      case_insensitive_paths: M(),
      auto_mode: u({ allow: A(o()), soft_deny: A(o()), hard_deny: A(o()), environment: A(o()) }),
      artifact_consent_holdback: M(),
      chrome_navigation: kTt().optional(),
      restricted: M(),
      is_remote_mode: M(),
      classify_all_shell: M(),
      mcp_allow_rules_exact: T(!0).optional(),
      user_identity: o().nullable(),
      dropped: Hve(U(Cao), E()).optional(),
      truncated: M().optional(),
    }),
  ),
  t$e = DoctorLazy(() => U(["public", "private", "unknown"])),
  kTt = DoctorLazy(() =>
    u({ enabled: M(), baselines: pe(o(), o()), tabs: pe(o(), pe(o(), o())).optional() }),
  ),
  Aao = DoctorLazy(() =>
    u({
      cwd: o().nullable(),
      root: o().nullable(),
      branch: o().nullable(),
      default_branch: o().nullable(),
      status: u({
        clean: M(),
        counts: u({
          staged: E(),
          modified: E(),
          untracked: E().nullable(),
          untracked_normal: E().nullable(),
        }).nullable(),
        porcelain: o().nullable(),
        truncated: M(),
      }).nullable(),
      visibility: u({
        origin: u({ host: o(), remote: o(), visibility: t$e() }).nullable(),
        push_remote: o().nullable(),
        remotes: A(u({ name: o(), host: o(), remote: o(), visibility: t$e() })),
        visibility_cache: A(u({ host: o(), remote: o(), visibility: t$e() })),
      }).nullable(),
      error: U(["timeout", "not_a_repo", "error", "pending"]).optional(),
      truncated: M().optional(),
    }),
  ),
  s$e = DoctorLazy(() =>
    u({
      git_state: Aao().optional(),
      chrome_navigation: kTt().optional(),
      live_cwd: o().optional(),
      platform: o().optional(),
    }),
  ),
  bTt = 64,
  a$e = 200,
  kui = DoctorLazy(() => u({ tool_use_ids: A(o().max(a$e)), context: s$e() })),
  aA = 1024,
  wTt = 64,
  xao = 256,
  Pao = 256,
  n$e = 64,
  Mao = 32,
  Oao = 8,
  o$e = 1024,
  DP = 64,
  Iao = 64000,
  Dao = 4000,
  Lao = 32,
  Nao = 64;
/**
 * 发给分类器的 Artifact 状态 schema：按 slug 的分享/认证/观察状态、按路径映射、实时文档、房间、最近发布与会话级能力开关。
 */
//@ chunk-e6aww6q8.js:135360-137136 placement
var artifactEnvSchema = DoctorLazy(() => U(["prod", "staging"])),
  artifactShareStateSchema = DoctorLazy(() =>
    u({
      mode: o(),
      is_shared_live: M(),
      role: o().optional(),
      probe_failed: T(!0).optional(),
      probed: M(),
      probe_current_account: M(),
      cowritten: T(!0).optional(),
      outside_writer: T(!0).optional(),
      artifact_kind: o().optional(),
      type_locked: T(!0).optional(),
      type_lock: M().optional(),
      type_first_party: T(!0).optional(),
      caps_read_not_found: T(!0).optional(),
      live_paths: A(o()).optional(),
      capabilities: pe(o(), oe()).optional(),
      capabilities_unknown: T(!0).optional(),
      capabilities_cut: T(!0).optional(),
      grant_observed: M(),
      endpoint_connectors: A(o()).optional(),
    }),
  ),
  artifactSlugStateSchema = DoctorLazy(() =>
    u({
      share: artifactShareStateSchema().optional(),
      attested: o().optional(),
      notice_pending: T(!0).optional(),
      published_env: artifactEnvSchema().optional(),
      watch: u({
        stopped: T(!0).optional(),
        auto_reply_stopped: T(!0).optional(),
        auto_reply_swept: T(!0).optional(),
        replies_declined: T(!0).optional(),
      }).optional(),
    }),
  ),
  artifactClassifierStateSchema = DoctorLazy(() =>
    u({
      by_slug: pe(o(), artifactSlugStateSchema()),
      by_path: pe(o(), u({ slug: o().optional(), thumbnail_named: A(o()).optional() })),
      live_docs: A(u({ slug: o(), live_path: o(), working_copy: o() })),
      room_armed: A(o()),
      type_reads: pe(o(), u({ declares_room: M() })),
      last_publish: u({ slug: o(), env: artifactEnvSchema() }).optional(),
      session: u({
        frame_env: artifactEnvSchema(),
        viewer_origin: o(),
        dev_viewer_origin: o().optional(),
        toolset: M().optional(),
        short_links: M().optional(),
        ant_build: M(),
        live_edit: M().optional(),
        live_doc_stream: M().optional(),
        live_paths_schema: M().optional(),
        copy_from: M().optional(),
        types_on: M().optional(),
        five_class_asks: M().optional(),
        inherited_type_grant: T(!0).optional(),
        connectors_mark: T(!0).optional(),
        watch_rail: U(["live", "durable", "none"]).optional(),
        auto_react: M().optional(),
        comments_in_schema: M(),
        db_str_replace: M().optional(),
        handlers: M(),
        room_client: M(),
        eval_stub: M(),
        scratchpad_dir: o().nullable(),
        tool_results_dir: o().optional(),
      }),
      truncated: M().optional(),
    }),
  );

export {
  Lao,
  Nao,
  a$e,
  bTt,
  o$e,
  Dao,
  DP,
  Mao,
  xao,
  Pao,
  Oao,
  n$e,
  Iao,
  pTt,
  fTt,
  mTt,
  Eao,
  hTt,
  yTt,
  JUr,
  s3n,
  wTt,
  aA,
  s$e,
  S$o,
  SERVER_CLASSIFIER_DECISION_SCHEMA,
  _Vs,
  bVs,
};
