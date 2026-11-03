/**
 * utils/model/modelCatalog.ts
 *
 * 2.1.316 新增：内置模型目录（model-catalog）：各模型在各提供商的 id、能力、价格档、弃用日期，及服务端下发能力的覆盖
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-v9tcvh08.js (28)
 * attribution: placement 28
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, E, T, M, Ue, A, U, pe } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../env.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";

/**
 * 手工维护的内置模型目录 JSON（haiku 3.5 … haiku 5.5 等，各提供商 id、上下文、能力，约 20 KB）。
 */
//@ chunk-v9tcvh08.js:522-20802 placement
var BAKED_MODEL_CATALOG = {
  "//": "Hand-maintained baked-in model catalog \u2014 the source of truth for per-model provider IDs and metadata. On model launch add one entry to `models` below; `bun run generate:model-catalog` validates this file against the schema and formats it.",
  schema_version: 1,
  pricing_tiers: {
    tier_2_10: {
      input: 2,
      output: 10,
      cache_write_5m: 2.5,
      cache_write_1h: 4,
      cache_read: 0.2,
      web_search: 0.01,
    },
    tier_2_10_cache_read_0_10: {
      input: 2,
      output: 10,
      cache_write_5m: 2.5,
      cache_write_1h: 4,
      cache_read: 0.1,
      web_search: 0.01,
    },
    tier_3_15: {
      input: 3,
      output: 15,
      cache_write_5m: 3.75,
      cache_write_1h: 6,
      cache_read: 0.3,
      web_search: 0.01,
    },
    tier_5_25: {
      input: 5,
      output: 25,
      cache_write_5m: 6.25,
      cache_write_1h: 10,
      cache_read: 0.5,
      web_search: 0.01,
    },
    tier_15_75: {
      input: 15,
      output: 75,
      cache_write_5m: 18.75,
      cache_write_1h: 30,
      cache_read: 1.5,
      web_search: 0.01,
    },
    tier_10_50: {
      input: 10,
      output: 50,
      cache_write_5m: 12.5,
      cache_write_1h: 20,
      cache_read: 1,
      web_search: 0.01,
    },
    tier_10_50_cache_read_0_25: {
      input: 10,
      output: 50,
      cache_write_5m: 12.5,
      cache_write_1h: 20,
      cache_read: 0.25,
      web_search: 0.01,
    },
    tier_4_20_cache_read_0_20: {
      input: 4,
      output: 20,
      cache_write_5m: 5,
      cache_write_1h: 8,
      cache_read: 0.2,
      web_search: 0.01,
    },
    haiku_35: {
      input: 0.8,
      output: 4,
      cache_write_5m: 1,
      cache_write_1h: 1.6,
      cache_read: 0.08,
      web_search: 0.01,
    },
    haiku_45: {
      input: 1,
      output: 5,
      cache_write_5m: 1.25,
      cache_write_1h: 2,
      cache_read: 0.1,
      web_search: 0.01,
    },
    haiku_55: {
      input: 0.1,
      output: 0.5,
      cache_write_5m: 0.125,
      cache_write_1h: 0.2,
      cache_read: 0.01,
      web_search: 0.01,
      long_prompt: {
        above_prompt_tokens: 1e5,
        input: 0.5,
        output: 2.5,
        cache_write_5m: 0.625,
        cache_write_1h: 1,
        cache_read: 0.05,
      },
    },
  },
  models: [
    {
      id: "claude-3-5-haiku",
      family: "haiku",
      display_name: "Haiku 3.5",
      provider_ids: {
        first_party: "claude-3-5-haiku-20241022",
        bedrock: "us.anthropic.claude-3-5-haiku-20241022-v1:0",
        vertex: "claude-3-5-haiku@20241022",
        foundry: "claude-3-5-haiku",
        anthropic_aws: "claude-3-5-haiku-20241022",
        anthropic_google_cloud: null,
        mantle: null,
        gateway: "claude-3-5-haiku-20241022",
      },
      eager_input_streaming: { vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_3_5_HAIKU",
      max_output_tokens: { default: 8192, upper: 8192 },
      pricing: "haiku_35",
      capabilities: ["total_tokens_reminder", "tool_loaded_text"],
    },
    {
      id: "claude-haiku-4-5",
      family: "haiku",
      display_name: "Haiku 4.5",
      knowledge_cutoff: "February 2025",
      provider_ids: {
        first_party: "claude-haiku-4-5-20251001",
        bedrock: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
        vertex: "claude-haiku-4-5@20251001",
        foundry: "claude-haiku-4-5",
        anthropic_aws: "claude-haiku-4-5-20251001",
        anthropic_google_cloud: "claude-haiku-4-5-20251001",
        mantle: "anthropic.claude-haiku-4-5",
        gateway: "claude-haiku-4-5-20251001",
      },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_HAIKU_4_5",
      context: { window: 200000, supports_1m_suffix: !0 },
      max_output_tokens: { default: 32000, upper: 64000 },
      pricing: "haiku_45",
      capabilities: ["context_management", "total_tokens_reminder", "tool_loaded_text"],
      advisor_rank: 1,
    },
    {
      id: "claude-haiku-5-5",
      family: "haiku",
      display_name: "Haiku 5.5",
      knowledge_cutoff: "June 2026",
      provider_ids: {
        first_party: "claude-haiku-5-5",
        bedrock: "us.anthropic.claude-haiku-5-5",
        vertex: "claude-haiku-5-5",
        foundry: "claude-haiku-5-5",
        anthropic_aws: "claude-haiku-5-5",
        anthropic_google_cloud: "claude-haiku-5-5",
        mantle: "anthropic.claude-haiku-5-5",
      },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_HAIKU_5_5",
      fallback_3p: "claude-haiku-4-5",
      context: { window: 1e6, native_1m: !0, supports_1m_beta: !0 },
      max_output_tokens: { default: 128000, upper: 128000 },
      pricing: "haiku_55",
      capabilities: [
        "effort",
        "max_effort",
        "xhigh_effort",
        "adaptive_thinking",
        "mid_conv_tool_change",
        "context_management",
        "rejects_disabled_thinking",
        "per_turn_effort",
        "lean_prompt",
        "org_locked_thinking",
        "haiku_5_5_early_stopping_guidance",
        "total_tokens_reminder",
        "tool_loaded_text",
      ],
      default_effort: "medium",
      effort_cost_index: { low: 0.38, medium: 0.52, high: 1, xhigh: 2.03, max: 4.34 },
      image_limits: { maxWidth: 2576, maxHeight: 2576, maxImageTokens: 4784 },
      advisor_rank: 4,
    },
    {
      id: "claude-3-5-sonnet",
      family: "sonnet",
      display_name: "Sonnet 3.5",
      provider_ids: {
        first_party: "claude-3-5-sonnet-20241022",
        bedrock: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        vertex: "claude-3-5-sonnet-v2@20241022",
        foundry: "claude-3-5-sonnet",
        anthropic_aws: "claude-3-5-sonnet-20241022",
        anthropic_google_cloud: null,
        mantle: null,
        gateway: "claude-3-5-sonnet-20241022",
      },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_3_5_SONNET",
      max_output_tokens: { default: 8192, upper: 8192 },
      pricing: "tier_3_15",
      capabilities: ["total_tokens_reminder", "tool_loaded_text"],
    },
    {
      id: "claude-3-7-sonnet",
      family: "sonnet",
      display_name: "Sonnet 3.7",
      provider_ids: {
        first_party: "claude-3-7-sonnet-20250219",
        bedrock: "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        vertex: "claude-3-7-sonnet@20250219",
        foundry: "claude-3-7-sonnet",
        anthropic_aws: "claude-3-7-sonnet-20250219",
        anthropic_google_cloud: null,
        mantle: null,
        gateway: "claude-3-7-sonnet-20250219",
      },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_3_7_SONNET",
      max_output_tokens: { default: 32000, upper: 64000 },
      pricing: "tier_3_15",
      capabilities: ["total_tokens_reminder", "tool_loaded_text"],
    },
    {
      id: "claude-sonnet-4-0",
      family: "sonnet",
      display_name: "Sonnet 4",
      knowledge_cutoff: "January 2025",
      provider_ids: {
        first_party: "claude-sonnet-4-20250514",
        bedrock: "us.anthropic.claude-sonnet-4-20250514-v1:0",
        vertex: "claude-sonnet-4@20250514",
        foundry: "claude-sonnet-4",
        anthropic_aws: "claude-sonnet-4-20250514",
        anthropic_google_cloud: null,
        mantle: null,
        gateway: "claude-sonnet-4-20250514",
      },
      eager_input_streaming: { vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_4_0_SONNET",
      context: {
        window: 200000,
        maximum_window: 1e6,
        supports_1m_beta: !0,
        clamp_long_context_without_beta: !0,
        supports_1m_suffix: !0,
      },
      max_output_tokens: { default: 32000, upper: 64000 },
      pricing: "tier_3_15",
      capabilities: ["context_management", "total_tokens_reminder", "tool_loaded_text"],
    },
    {
      id: "claude-sonnet-4-5",
      family: "sonnet",
      display_name: "Sonnet 4.5",
      knowledge_cutoff: "January 2025",
      provider_ids: {
        first_party: "claude-sonnet-4-5-20250929",
        bedrock: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        vertex: "claude-sonnet-4-5@20250929",
        foundry: "claude-sonnet-4-5",
        anthropic_aws: "claude-sonnet-4-5-20250929",
        anthropic_google_cloud: "claude-sonnet-4-5-20250929",
        mantle: null,
        gateway: "claude-sonnet-4-5-20250929",
      },
      eager_input_streaming: { vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_4_5_SONNET",
      fallback_3p: "claude-sonnet-4-0",
      context: {
        window: 200000,
        maximum_window: 1e6,
        supports_1m_beta: !0,
        clamp_long_context_without_beta: !0,
        supports_1m_suffix: !0,
      },
      max_output_tokens: { default: 32000, upper: 64000 },
      pricing: "tier_3_15",
      capabilities: ["context_management", "total_tokens_reminder", "tool_loaded_text"],
    },
    {
      id: "claude-sonnet-4-6",
      family: "sonnet",
      display_name: "Sonnet 4.6",
      knowledge_cutoff: "August 2025",
      provider_ids: {
        first_party: "claude-sonnet-4-6",
        bedrock: "us.anthropic.claude-sonnet-4-6",
        vertex: "claude-sonnet-4-6",
        foundry: "claude-sonnet-4-6",
        anthropic_aws: "claude-sonnet-4-6",
        anthropic_google_cloud: "claude-sonnet-4-6",
        mantle: null,
        gateway: "claude-sonnet-4-6",
      },
      eager_input_streaming: { bedrock: !0, vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_4_6_SONNET",
      fallback_3p: "claude-sonnet-4-5",
      context: { window: 200000, maximum_window: 1e6, supports_1m_beta: !0, supports_1m_suffix: !0 },
      max_output_tokens: { default: 32000, upper: 128000 },
      pricing: "tier_3_15",
      capabilities: [
        "effort",
        "max_effort",
        "adaptive_thinking",
        "context_management",
        "total_tokens_reminder",
        "tool_loaded_text",
      ],
      advisor_rank: 2,
    },
    {
      id: "claude-sonnet-5",
      family: "sonnet",
      display_name: "Sonnet 5",
      knowledge_cutoff: "January 2026",
      provider_ids: {
        first_party: "claude-sonnet-5",
        bedrock: "us.anthropic.claude-sonnet-5",
        vertex: "claude-sonnet-5",
        foundry: "claude-sonnet-5",
        anthropic_aws: "claude-sonnet-5",
        anthropic_google_cloud: "claude-sonnet-5",
        mantle: "anthropic.claude-sonnet-5",
        gateway: "claude-sonnet-5",
      },
      eager_input_streaming: { bedrock: !0, vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_5_SONNET",
      fallback_3p: "claude-sonnet-4-6",
      context: { window: 1e6, native_1m: !0, supports_1m_beta: !0 },
      max_output_tokens: { default: 64000, upper: 128000 },
      pricing: "tier_2_10",
      capabilities: [
        "effort",
        "max_effort",
        "xhigh_effort",
        "adaptive_thinking",
        "context_management",
        "total_tokens_reminder",
        "tool_loaded_text",
      ],
      default_effort: "high",
      effort_cost_index: { low: 0.47, medium: 0.74, high: 1, xhigh: 2.41, max: 5.59 },
      image_limits: { maxWidth: 2576, maxHeight: 2576, maxImageTokens: 4784 },
      advisor_rank: 4,
    },
    {
      id: "claude-sonnet-5-5",
      family: "sonnet",
      display_name: "Sonnet 5.5",
      knowledge_cutoff: "June 2026",
      provider_ids: {
        first_party: "claude-sonnet-5-5",
        bedrock: "us.anthropic.claude-sonnet-5-5",
        vertex: "claude-sonnet-5-5",
        foundry: "claude-sonnet-5-5",
        anthropic_aws: "claude-sonnet-5-5",
        anthropic_google_cloud: "claude-sonnet-5-5",
        mantle: "anthropic.claude-sonnet-5-5",
        gateway: "claude-sonnet-5-5",
      },
      eager_input_streaming: { bedrock: !0, vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_5_5_SONNET",
      fallback_3p: "claude-sonnet-5",
      context: { window: 1e6, native_1m: !0, supports_1m_beta: !0 },
      max_output_tokens: { default: 128000, upper: 128000 },
      pricing: "tier_2_10_cache_read_0_10",
      capabilities: [
        "effort",
        "max_effort",
        "xhigh_effort",
        "adaptive_thinking",
        "mid_conv_tool_change",
        "context_management",
        "rejects_disabled_thinking",
        "per_turn_effort",
        "per_turn_timing",
        "lean_prompt",
        "refusal_fallback",
        "silent_turn_reminder",
        "org_locked_thinking",
        "tool_loaded_text",
      ],
      default_effort: "medium",
      effort_cost_index: { low: 0.49, medium: 0.54, high: 1, xhigh: 1.87, max: 5.5 },
      image_limits: { maxWidth: 2576, maxHeight: 2576, maxImageTokens: 4784 },
      advisor_rank: 6,
    },
    {
      id: "claude-opus-4-0",
      family: "opus",
      display_name: "Opus 4",
      knowledge_cutoff: "January 2025",
      provider_ids: {
        first_party: "claude-opus-4-20250514",
        bedrock: "us.anthropic.claude-opus-4-20250514-v1:0",
        vertex: "claude-opus-4@20250514",
        foundry: "claude-opus-4",
        anthropic_aws: "claude-opus-4-20250514",
        anthropic_google_cloud: null,
        mantle: null,
        gateway: "claude-opus-4-20250514",
      },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_4_0_OPUS",
      context: { window: 200000, supports_1m_suffix: !0 },
      max_output_tokens: { default: 32000, upper: 32000 },
      pricing: "tier_15_75",
      capabilities: ["context_management", "total_tokens_reminder", "tool_loaded_text"],
    },
    {
      id: "claude-opus-4-1",
      family: "opus",
      display_name: "Opus 4.1",
      knowledge_cutoff: "January 2025",
      provider_ids: {
        first_party: "claude-opus-4-1-20250805",
        bedrock: "us.anthropic.claude-opus-4-1-20250805-v1:0",
        vertex: "claude-opus-4-1@20250805",
        foundry: "claude-opus-4-1",
        anthropic_aws: "claude-opus-4-1-20250805",
        anthropic_google_cloud: null,
        mantle: null,
        gateway: "claude-opus-4-1-20250805",
      },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_4_1_OPUS",
      context: { window: 200000, supports_1m_suffix: !0 },
      max_output_tokens: { default: 32000, upper: 32000 },
      pricing: "tier_15_75",
      capabilities: ["context_management", "total_tokens_reminder", "tool_loaded_text"],
    },
    {
      id: "claude-opus-4-5",
      family: "opus",
      display_name: "Opus 4.5",
      knowledge_cutoff: "May 2025",
      provider_ids: {
        first_party: "claude-opus-4-5-20251101",
        bedrock: "us.anthropic.claude-opus-4-5-20251101-v1:0",
        vertex: "claude-opus-4-5@20251101",
        foundry: "claude-opus-4-5",
        anthropic_aws: "claude-opus-4-5-20251101",
        anthropic_google_cloud: "claude-opus-4-5-20251101",
        mantle: null,
        gateway: "claude-opus-4-5-20251101",
      },
      eager_input_streaming: { vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_4_5_OPUS",
      fallback_3p: "claude-opus-4-1",
      context: { window: 200000, supports_1m_suffix: !0 },
      max_output_tokens: { default: 32000, upper: 64000 },
      pricing: "tier_5_25",
      capabilities: ["context_management", "total_tokens_reminder", "tool_loaded_text"],
    },
    {
      id: "claude-opus-4-6",
      family: "opus",
      display_name: "Opus 4.6",
      knowledge_cutoff: "May 2025",
      provider_ids: {
        first_party: "claude-opus-4-6",
        bedrock: "us.anthropic.claude-opus-4-6-v1",
        vertex: "claude-opus-4-6",
        foundry: "claude-opus-4-6",
        anthropic_aws: "claude-opus-4-6",
        anthropic_google_cloud: "claude-opus-4-6",
        mantle: null,
        gateway: "claude-opus-4-6",
      },
      eager_input_streaming: { vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_4_6_OPUS",
      fallback_3p: "claude-opus-4-5",
      context: { window: 200000, maximum_window: 1e6, supports_1m_beta: !0, supports_1m_suffix: !0 },
      max_output_tokens: { default: 64000, upper: 128000 },
      pricing: "tier_5_25",
      capabilities: [
        "effort",
        "max_effort",
        "adaptive_thinking",
        "context_management",
        "total_tokens_reminder",
        "tool_loaded_text",
      ],
      advisor_rank: 3,
    },
    {
      id: "claude-opus-4-7",
      family: "opus",
      display_name: "Opus 4.7",
      knowledge_cutoff: "January 2026",
      provider_ids: {
        first_party: "claude-opus-4-7",
        bedrock: "us.anthropic.claude-opus-4-7",
        vertex: "claude-opus-4-7",
        foundry: "claude-opus-4-7",
        anthropic_aws: "claude-opus-4-7",
        anthropic_google_cloud: "claude-opus-4-7",
        mantle: "anthropic.claude-opus-4-7",
        gateway: "claude-opus-4-7",
      },
      eager_input_streaming: { bedrock: !0, vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_4_7_OPUS",
      fallback_3p: "claude-opus-4-6",
      context: { window: 1e6, native_1m: !0, supports_1m_beta: !0, supports_1m_suffix: !0 },
      max_output_tokens: { default: 64000, upper: 128000 },
      pricing: "tier_5_25",
      capabilities: [
        "effort",
        "max_effort",
        "xhigh_effort",
        "adaptive_thinking",
        "context_management",
        "total_tokens_reminder",
        "tool_loaded_text",
      ],
      default_effort: "xhigh",
      image_limits: { maxWidth: 2576, maxHeight: 2576, maxImageTokens: 4784 },
      advisor_rank: 5,
    },
    {
      id: "claude-opus-4-8",
      family: "opus",
      display_name: "Opus 4.8",
      knowledge_cutoff: "January 2026",
      provider_ids: {
        first_party: "claude-opus-4-8",
        bedrock: "us.anthropic.claude-opus-4-8",
        vertex: "claude-opus-4-8",
        foundry: "claude-opus-4-8",
        anthropic_aws: "claude-opus-4-8",
        anthropic_google_cloud: "claude-opus-4-8",
        mantle: "anthropic.claude-opus-4-8",
        gateway: "claude-opus-4-8",
      },
      eager_input_streaming: { bedrock: !0, vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_4_8_OPUS",
      fallback_3p: "claude-opus-4-7",
      context: { window: 1e6, native_1m: !0, supports_1m_beta: !0, supports_1m_suffix: !0 },
      max_output_tokens: { default: 64000, upper: 128000 },
      pricing: "tier_5_25",
      capabilities: [
        "effort",
        "max_effort",
        "xhigh_effort",
        "adaptive_thinking",
        "mid_conv_tool_change",
        "context_management",
        "fast_mode",
        "lean_prompt",
        "total_tokens_reminder",
        "tool_loaded_text",
      ],
      default_effort: "high",
      effort_cost_index: { low: 0.72, medium: 0.9, high: 1, xhigh: 1.65, max: 1.88 },
      image_limits: { maxWidth: 2576, maxHeight: 2576, maxImageTokens: 4784 },
      advisor_rank: 5,
    },
    {
      id: "claude-opus-5",
      family: "opus",
      display_name: "Opus 5",
      knowledge_cutoff: "May 2026",
      provider_ids: {
        first_party: "claude-opus-5",
        bedrock: "us.anthropic.claude-opus-5",
        vertex: "claude-opus-5",
        foundry: "claude-opus-5",
        anthropic_aws: "claude-opus-5",
        anthropic_google_cloud: "claude-opus-5",
        mantle: "anthropic.claude-opus-5",
        gateway: "claude-opus-5",
      },
      eager_input_streaming: { bedrock: !0, vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_5_OPUS",
      fallback_3p: "claude-opus-4-8",
      context: { window: 1e6, native_1m: !0, supports_1m_beta: !0, supports_1m_suffix: !0 },
      max_output_tokens: { default: 64000, upper: 128000 },
      pricing: "tier_5_25",
      capabilities: [
        "effort",
        "max_effort",
        "xhigh_effort",
        "adaptive_thinking",
        "mid_conv_tool_change",
        "context_management",
        "thinking_disabled_effort_cap",
        "fast_mode",
        "lean_prompt",
        "refusal_fallback",
        "opus_5_prompt_bundle",
        "total_tokens_reminder",
        "tool_loaded_text",
      ],
      default_effort: "high",
      effort_cost_index: { low: 0.67, medium: 0.76, high: 1, xhigh: 1.6, max: 1.7 },
      image_limits: { maxWidth: 2576, maxHeight: 2576, maxImageTokens: 4784 },
      advisor_rank: 7,
    },
    {
      id: "claude-opus-5-5",
      family: "opus",
      display_name: "Opus 5.5",
      knowledge_cutoff: "June 2026",
      provider_ids: {
        first_party: "claude-opus-5-5",
        bedrock: "us.anthropic.claude-opus-5-5",
        vertex: "claude-opus-5-5",
        foundry: "claude-opus-5-5",
        anthropic_aws: "claude-opus-5-5",
        anthropic_google_cloud: "claude-opus-5-5",
        mantle: "anthropic.claude-opus-5-5",
        gateway: "claude-opus-5-5",
      },
      eager_input_streaming: { bedrock: !0, vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_5_5_OPUS",
      fallback_3p: "claude-opus-5",
      context: { window: 1e6, native_1m: !0, supports_1m_beta: !0, supports_1m_suffix: !0 },
      max_output_tokens: { default: 128000, upper: 128000 },
      pricing: "tier_4_20_cache_read_0_20",
      capabilities: [
        "effort",
        "max_effort",
        "xhigh_effort",
        "adaptive_thinking",
        "rejects_disabled_thinking",
        "mid_conv_tool_change",
        "per_turn_effort",
        "per_turn_timing",
        "context_management",
        "fast_mode",
        "lean_prompt",
        "refusal_fallback",
        "opus_5_5_prompt_bundle",
        "tool_loaded_text",
      ],
      default_effort: "medium",
      effort_cost_index: { low: 0.48, medium: 0.66, high: 1, xhigh: 1.66, max: 3.44 },
      image_limits: { maxWidth: 2576, maxHeight: 2576, maxImageTokens: 4784 },
      advisor_rank: 7,
    },
    {
      id: "claude-fable-5",
      family: "fable",
      display_name: "Fable 5",
      knowledge_cutoff: "January 2026",
      provider_ids: {
        first_party: "claude-fable-5",
        bedrock: "us.anthropic.claude-fable-5",
        vertex: "claude-fable-5",
        foundry: "claude-fable-5",
        anthropic_aws: "claude-fable-5",
        anthropic_google_cloud: "claude-fable-5",
        mantle: "anthropic.claude-fable-5",
        gateway: "claude-fable-5",
      },
      eager_input_streaming: { bedrock: !0, vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_FABLE_5",
      fallback_3p: "claude-opus-5-5",
      context: { window: 1e6, native_1m: !0, supports_1m_beta: !0 },
      max_output_tokens: { default: 64000, upper: 128000 },
      pricing: "tier_10_50",
      capabilities: [
        "effort",
        "max_effort",
        "xhigh_effort",
        "adaptive_thinking",
        "rejects_disabled_thinking",
        "mid_conv_tool_change",
        "context_management",
        "lean_prompt",
        "fable_5_mitigations",
        "refusal_fallback",
        "total_tokens_reminder",
        "tool_loaded_text",
      ],
      default_effort: "high",
      effort_cost_index: { low: 0.6, medium: 0.77, high: 1, xhigh: 1.74, max: 1.91 },
      image_limits: { maxWidth: 2576, maxHeight: 2576, maxImageTokens: 4784 },
      advisor_rank: 8,
    },
    {
      id: "claude-fable-5-1",
      family: "fable",
      display_name: "Fable 5.1",
      knowledge_cutoff: "June 2026",
      provider_ids: {
        first_party: "claude-fable-5-1",
        bedrock: "us.anthropic.claude-fable-5-1",
        vertex: "claude-fable-5-1",
        foundry: "claude-fable-5-1",
        anthropic_aws: "claude-fable-5-1",
        anthropic_google_cloud: "claude-fable-5-1",
        mantle: "anthropic.claude-fable-5-1",
        gateway: "claude-fable-5-1",
      },
      eager_input_streaming: { bedrock: !0, vertex: !0 },
      vertex_region_env_var: "VERTEX_REGION_CLAUDE_FABLE_5_1",
      fallback_3p: "claude-fable-5",
      context: { window: 1e6, native_1m: !0, supports_1m_beta: !0 },
      max_output_tokens: { default: 64000, upper: 128000 },
      pricing: "tier_10_50_cache_read_0_25",
      capabilities: [
        "effort",
        "max_effort",
        "xhigh_effort",
        "adaptive_thinking",
        "rejects_disabled_thinking",
        "mid_conv_tool_change",
        "per_turn_effort",
        "per_turn_timing",
        "context_management",
        "lean_prompt",
        "fable_5_mitigations",
        "refusal_fallback",
        "fable_5_1_prompt_bundle",
        "total_tokens_reminder",
        "tool_loaded_text",
      ],
      default_effort: "high",
      effort_cost_index: { low: 0.75, medium: 0.86, high: 1, xhigh: 1.38, max: 1.74 },
      image_limits: { maxWidth: 2576, maxHeight: 2576, maxImageTokens: 4784 },
      advisor_rank: 9,
    },
    {
      id: "claude-mythos-5",
      family: "mythos",
      display_name: "Mythos 5",
      knowledge_cutoff: "January 2026",
      provider_ids: {
        first_party: "claude-mythos-5",
        bedrock: null,
        vertex: null,
        foundry: null,
        anthropic_aws: null,
        anthropic_google_cloud: null,
        mantle: null,
        gateway: null,
      },
      context: { window: 1e6, native_1m: !0, supports_1m_beta: !0 },
      max_output_tokens: { default: 64000, upper: 128000 },
      pricing: "tier_10_50",
      capabilities: ["total_tokens_reminder", "tool_loaded_text"],
      image_limits: { maxWidth: 2576, maxHeight: 2576, maxImageTokens: 4784 },
      advisor_rank: 8,
    },
    {
      id: "claude-mythos-5-1",
      family: "mythos",
      display_name: "Mythos 5.1",
      knowledge_cutoff: "June 2026",
      provider_ids: {
        first_party: "claude-mythos-5-1",
        bedrock: null,
        vertex: null,
        foundry: null,
        anthropic_aws: null,
        anthropic_google_cloud: null,
        mantle: null,
        gateway: null,
      },
      context: { window: 1e6, native_1m: !0, supports_1m_beta: !0 },
      max_output_tokens: { default: 64000, upper: 128000 },
      pricing: "tier_10_50_cache_read_0_25",
      capabilities: [
        "effort",
        "max_effort",
        "xhigh_effort",
        "adaptive_thinking",
        "rejects_disabled_thinking",
        "mid_conv_tool_change",
        "per_turn_timing",
        "context_management",
        "lean_prompt",
        "fable_5_mitigations",
        "fable_5_1_prompt_bundle",
        "total_tokens_reminder",
        "tool_loaded_text",
      ],
      default_effort: "high",
      effort_cost_index: { low: 0.75, medium: 0.86, high: 1, xhigh: 1.38, max: 1.74 },
      image_limits: { maxWidth: 2576, maxHeight: 2576, maxImageTokens: 4784 },
      advisor_rank: 9,
    },
  ],
  aliases: {
    opus: {
      default: "claude-opus-5-5",
      per_provider: {
        bedrock: "claude-opus-5-5",
        vertex: "claude-opus-5-5",
        foundry: "claude-opus-4-6",
        mantle: "claude-opus-5-5",
        anthropic_aws: "claude-opus-5-5",
        gateway: "claude-opus-4-7",
      },
    },
    sonnet: {
      default: "claude-sonnet-5-5",
      per_provider: {
        bedrock: "claude-sonnet-4-5",
        vertex: "claude-sonnet-4-5",
        foundry: "claude-sonnet-4-5",
        mantle: "claude-sonnet-4-5",
        anthropic_aws: "claude-sonnet-4-6",
        gateway: "claude-sonnet-4-6",
      },
    },
    haiku: {
      default: "claude-haiku-5-5",
      per_provider: {
        bedrock: "claude-haiku-4-5",
        vertex: "claude-haiku-4-5",
        foundry: "claude-haiku-4-5",
        mantle: "claude-haiku-4-5",
        anthropic_aws: "claude-haiku-4-5",
        anthropic_google_cloud: "claude-haiku-4-5",
        gateway: "claude-haiku-4-5",
      },
    },
    fable: { default: "claude-fable-5-1", per_provider: { gateway: "claude-fable-5" } },
  },
  defaults: {},
  best: "fable",
  latest_per_family: {
    fable: "claude-fable-5-1",
    opus: "claude-opus-5-5",
    sonnet: "claude-sonnet-5-5",
    haiku: "claude-haiku-5-5",
  },
  alias_migration: {},
};
//@ chunk-v9tcvh08.js:20802-20946 placement
function createCatalogState() {
  return {
    bakedCatalog: void 0,
    canonicalNameMemo: new Map(),
    mainLoopCanonical: void 0,
    servedCapabilityLookup: void 0,
    modelKnowledge: void 0,
  };
}
//@ chunk-v9tcvh08.js:20946-20952 placement
var f;
//@ chunk-v9tcvh08.js:20952-20995 placement
function getCatalogState() {
  if (f === void 0) f = createCatalogState();
  return f;
}
/**
 * 模型目录的 zod 模式（first_party/bedrock/vertex/foundry 等 id、effort 级别）。
 */
//@ chunk-v9tcvh08.js:20995-23274 placement
var ModelCatalogSchema = DoctorLazy(() =>
    u({
      first_party: o(),
      bedrock: o().nullish(),
      vertex: o().nullish(),
      foundry: o().nullish(),
      anthropic_aws: o().nullish(),
      anthropic_google_cloud: o().nullish(),
      mantle: o().nullish(),
      gateway: o().nullish(),
    }).loose(),
  ),
  b = DoctorLazy(() =>
    u({
      input: E(),
      output: E(),
      cache_write_5m: E().optional(),
      cache_write_1h: E().optional(),
      cache_read: E().optional(),
      web_search: E().optional(),
      long_prompt: u({
        above_prompt_tokens: E().int().positive(),
        input: E(),
        output: E(),
        cache_write_5m: E().optional(),
        cache_write_1h: E().optional(),
        cache_read: E().optional(),
      })
        .loose()
        .optional(),
    }).loose(),
  ),
  I = DoctorLazy(() =>
    u({
      id: o(),
      family: o(),
      display_name: o(),
      slogan: o().optional(),
      knowledge_cutoff: o().optional(),
      provider_ids: ModelCatalogSchema(),
      eager_input_streaming: u({ bedrock: T(!0).optional(), vertex: T(!0).optional() })
        .loose()
        .optional(),
      vertex_region_env_var: o().optional(),
      fallback_3p: o().optional(),
      context: u({
        window: E(),
        maximum_window: E().optional(),
        native_1m: M().optional(),
        supports_1m_beta: M().optional(),
        clamp_long_context_without_beta: M().optional(),
        supports_1m_suffix: M().optional(),
      })
        .loose()
        .optional(),
      max_output_tokens: u({ default: E(), upper: E() }).loose().optional(),
      pricing: Ue([o(), b()]).optional(),
      capabilities: A(o()).default([]),
      default_effort: U(["low", "medium", "high", "xhigh", "max"]).optional(),
      effort_cost_index: u({
        low: E().positive().optional(),
        medium: E().positive().optional(),
        high: E().positive().optional(),
        xhigh: E().positive().optional(),
        max: E().positive().optional(),
      })
        .loose()
        .optional(),
      image_limits: u({
        maxWidth: E().optional(),
        maxHeight: E().optional(),
        maxImageTokens: E().optional(),
        maxBase64Size: E().optional(),
      })
        .loose()
        .optional(),
      advisor_rank: E().optional(),
      fallback_chain: A(o()).optional(),
      picker: u({
        section: U(["main", "overflow", "deprecated"]).optional(),
        badge: o().optional(),
        disabled_reason: o().optional(),
        tiers: A(o()).optional(),
      })
        .loose()
        .optional(),
      deprecation: u({ retirement_dates: pe(o(), o()).optional(), remapped_to: o().optional() })
        .loose()
        .optional(),
      min_cli_version: o().optional(),
    }).loose(),
  ),
  D = DoctorLazy(() => u({ default: o(), per_provider: pe(o(), o()).optional() }).loose()),
  ae = DoctorLazy(() =>
    u({
      schema_version: E(),
      pricing_tiers: pe(o(), b()).default({}),
      models: A(I()),
      aliases: pe(o(), D()).default({}),
      defaults: pe(o(), o()).default({}),
      best: o().optional(),
      latest_per_family: pe(o(), o()).default({}),
      alias_migration: pe(o(), o()).default({}),
    }).loose(),
  );
/**
 * 建立按提供商 id 与目录 id 的索引，检测冲突。
 */
//@ chunk-v9tcvh08.js:23274-23629 placement
function indexModelCatalog(e) {
  let t = new Map(),
    a = new Map();
  for (let model of e.models) {
    t.set(model.id, model);
    for (let r of Object.values(model.provider_ids)) {
      if (typeof r !== "string") continue;
      let lower = r.toLowerCase(),
        l = a.get(lower);
      if (l !== void 0 && l !== model.id)
        throw Error("model catalog: provider id collision across distinct entries");
      a.set(lower, model.id);
    }
  }
  return { catalog: e, entriesById: t, catalogIdByProviderId: a };
}
//@ chunk-v9tcvh08.js:23629-23724 placement
function getBakedCatalog() {
  let e = getCatalogState();
  if (e.bakedCatalog === void 0) e.bakedCatalog = indexModelCatalog(BAKED_MODEL_CATALOG);
  return e.bakedCatalog;
}
//@ chunk-v9tcvh08.js:23724-23758 placement
function getModelCatalog() {
  return getBakedCatalog().catalog;
}
//@ chunk-v9tcvh08.js:23758-23769 placement
var WK = getModelCatalog;
//@ chunk-v9tcvh08.js:23769-23838 placement
function catalogIdForProviderModelId(e) {
  return getBakedCatalog().catalogIdByProviderId.get(e.toLowerCase());
}
//@ chunk-v9tcvh08.js:23838-23883 placement
function getCatalogEntry(e) {
  return getBakedCatalog().entriesById.get(e);
}
//@ chunk-v9tcvh08.js:23883-24010 placement
function resolvePricing(e) {
  let pricing = e.pricing;
  if (typeof pricing !== "string") return pricing;
  let pricing_tiers = WK().pricing_tiers;
  return Object.hasOwn(pricing_tiers, pricing) ? pricing_tiers[pricing] : void 0;
}
//@ chunk-v9tcvh08.js:24010-24756 placement
var EFFORT_CAPABILITY_KEYS = [
  "effort",
  "max_effort",
  "xhigh_effort",
  "adaptive_thinking",
  "rejects_disabled_thinking",
  "thinking_disabled_effort_cap",
  "mid_conv_system",
  "mid_conv_tool_change",
  "per_turn_effort",
  "per_turn_timing",
  "context_management",
  "fast_mode",
  "lean_prompt",
  "fable_5_mitigations",
  "refusal_fallback",
  "no_refusal_fallback",
  "opus_5_prompt_bundle",
  "fable_5_1_prompt_bundle",
  "opus_5_5_prompt_bundle",
  "thrifty_sonic",
  "turn_updates",
  "bash_output_audience_note",
  "silent_turn_reminder",
  "thinking_display_updates",
  "quizzical_shore",
  "amber_astrolabe",
  "bison_cairn",
  "larch_cistern",
  "haiku_5_5_early_stopping_guidance",
  "original_games_guidance",
  "org_locked_thinking",
  "elapsed_time_reminder",
  "total_tokens_reminder",
  "tool_loaded_text",
  "temporal_hare",
  "bash_edit_diff",
];
//@ chunk-v9tcvh08.js:24756-24802 placement
function setServedCapabilityLookup(e) {
  getCatalogState().servedCapabilityLookup = e;
}
/**
 * 判断模型是否支持某能力：服务端下发覆盖优先，否则看目录。
 */
//@ chunk-v9tcvh08.js:24802-24847 placement
function modelSupportsCapability(e, t, a) {
  return fOt(t, e) ?? lookupCapability(e, t, a);
}
//@ chunk-v9tcvh08.js:24847-24898 placement
function modelDefinitelySupports(e, t, a) {
  return lookupCapability(e, t, a) === !0 ? !0 : void 0;
}
//@ chunk-v9tcvh08.js:24898-24987 placement
function lookupCapability(e, t, a) {
  return (
    getCatalogState().servedCapabilityLookup?.(t, [a, stripContextSuffix(e)]) ??
    (catalogHasCapability(e, t) ? !0 : void 0)
  );
}
//@ chunk-v9tcvh08.js:24987-25047 placement
function catalogHasCapability(e, t) {
  return getCatalogEntry(stripContextSuffix(e))?.capabilities.includes(t);
}
//@ chunk-v9tcvh08.js:25047-25086 placement
function fOt(e, t) {
  return parseModelCapabilitiesEnv(t).get(e);
}
/**
 * 解析 CLAUDE_CODE_MODEL_CAPABILITIES（"模型=能力,-能力;..."，模型可用 * 前缀通配），返回当前模型的能力开关表。
 */
//@ chunk-v9tcvh08.js:25086-25472 placement
function parseModelCapabilitiesEnv(e) {
  let t = new Map(),
    CLAUDE_CODE_MODEL_CAPABILITIES = env.CLAUDE_CODE_MODEL_CAPABILITIES;
  if (CLAUDE_CODE_MODEL_CAPABILITIES === void 0) return t;
  let n = stripContextSuffix(e);
  for (let r of CLAUDE_CODE_MODEL_CAPABILITIES.split(";")) {
    let index = r.indexOf("=");
    if (index !== -1) {
      let trimmed = r.slice(0, index).trim();
      if (trimmed === "") continue;
      if (!(trimmed.endsWith("*") ? n.startsWith(trimmed.slice(0, -1)) : n === trimmed)) continue;
    }
    for (let l of (index === -1 ? r : r.slice(index + 1)).split(",")) {
      let trimmed = l.trim(),
        v = !trimmed.startsWith("-");
      t.set(v ? trimmed : trimmed.slice(1), v);
    }
  }
  return t;
}
//@ chunk-v9tcvh08.js:25472-25518 placement
function stripContextSuffix(e) {
  return e.replace(/\[1m\]/gi, "");
}
/**
 * 解析目录中的别名目标：按提供商的覆盖优先，否则默认值。
 */
//@ chunk-v9tcvh08.js:25518-25675 placement
function resolveCatalogAlias(e, t) {
  let aliases = WK().aliases,
    n = Object.hasOwn(aliases, e) ? aliases[e] : void 0;
  if (!n) return;
  let per_provider = n.per_provider;
  return (per_provider && Object.hasOwn(per_provider, t) ? per_provider[t] : void 0) ?? n.default;
}
//@ chunk-v9tcvh08.js:25675-25874 placement
function validateCatalogAliases(e) {
  let t = resolveCatalogAlias(e, "first_party"),
    a = t === void 0 ? void 0 : getCatalogEntry(t);
  if (a === void 0) throw Error("model-catalog.json: every aliases entry must name a models[] entry");
  return a.provider_ids.first_party;
}
/**
 * 模型 id 前缀到内置目录短键（如 claude-opus-4-5 → opus45）的映射表。
 */
//@ chunk-v9tcvh08.js:25874-26451 placement
var MODEL_KEY_BY_ID = {
  "claude-3-5-haiku": "haiku35",
  "claude-haiku-4-5": "haiku45",
  "claude-haiku-5-5": "haiku55",
  "claude-3-5-sonnet": "sonnet35",
  "claude-3-7-sonnet": "sonnet37",
  "claude-sonnet-4-0": "sonnet40",
  "claude-sonnet-4-5": "sonnet45",
  "claude-sonnet-4-6": "sonnet46",
  "claude-sonnet-5": "sonnet5",
  "claude-sonnet-5-5": "sonnet55",
  "claude-opus-4-0": "opus40",
  "claude-opus-4-1": "opus41",
  "claude-opus-4-5": "opus45",
  "claude-opus-4-6": "opus46",
  "claude-opus-4-7": "opus47",
  "claude-opus-4-8": "opus48",
  "claude-opus-5": "opus5",
  "claude-opus-5-5": "opus55",
  "claude-fable-5": "fable5",
  "claude-fable-5-1": "fable51",
};
/**
 * 把目录条目的 provider_ids 转为各提供商的模型 id 表（缺省为 null，gateway 回退第一方 id），带 eager_input_streaming 时一并带出。
 */
//@ chunk-v9tcvh08.js:26451-26809 placement
function toProviderIdMap(e) {
  let provider_ids = e.provider_ids,
    a = {
      firstParty: provider_ids.first_party,
      bedrock: provider_ids.bedrock ?? null,
      vertex: provider_ids.vertex ?? null,
      foundry: provider_ids.foundry ?? null,
      anthropicAws: provider_ids.anthropic_aws ?? null,
      anthropicGoogleCloud: provider_ids.anthropic_google_cloud ?? null,
      mantle: provider_ids.mantle ?? null,
      gateway: provider_ids.gateway ?? provider_ids.first_party,
    };
  if (e.eager_input_streaming) a.eagerInputStreaming = e.eager_input_streaming;
  return a;
}
//@ chunk-v9tcvh08.js:26809-27042 placement
function requireCatalogEntry() {
  let e = {};
  for (let [t, a] of Object.entries(MODEL_KEY_BY_ID)) {
    let n = getCatalogEntry(t);
    if (!n)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `model catalog missing entry for '${t}' (CATALOG_ID_TO_KEY key '${a}')`,
        "model catalog missing entry for CATALOG_ID_TO_KEY id",
      );
    e[a] = toProviderIdMap(n);
  }
  return e;
}
//@ chunk-v9tcvh08.js:27042-27053 placement
var No = requireCatalogEntry();
//@ chunk-v9tcvh08.js:27053-27281 placement
function PROVIDER_KEYS(e) {
  for (let t of ["bedrock", "vertex", "foundry", "anthropicAws"])
    if (e[t] === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `named CLAUDE_*_CONFIG export for '${e.firstParty}' has null ${t}`,
        "named model config export has null 3P provider id",
      );
  return e;
}

export {
  WK,
  getCatalogEntry,
  No,
  catalogIdForProviderModelId,
  fOt,
  modelSupportsCapability,
  resolvePricing,
  resolveCatalogAlias,
  EFFORT_CAPABILITY_KEYS,
  modelDefinitelySupports,
  getCatalogState,
  getModelCatalog,
  validateCatalogAliases,
  BAKED_MODEL_CATALOG,
  catalogHasCapability,
  setServedCapabilityLookup,
  PROVIDER_KEYS,
  parseModelCapabilitiesEnv,
};
