/**
 * bridge/bridgeServerConfig.ts
 *
 * 2.1.316 新增：应用桥接服务器下发的会话配置（claude_code_args、MCP、自动模式环境），受开关控制
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jx5trqed.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { writeFile, lstat, mkdtemp, rm } from "fs/promises";
import { createHash } from "crypto";
import { buildMcpToolName } from "../services/mcp/mcpStringUtils.js";
import { CLAUDE_CODE_REMOTE, ccrMetaMcpServerConfig } from "../services/mcp/ccrMetaMcp.js";
import {
  DEFAULTS_PLACEHOLDER,
  hasControlChars,
  hasInvisibleRuleChars,
  findTemplateInjection,
} from "../utils/permissions/autoModeRulesPrompt.js";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { logForDebugging } from "../utils/debug.js";
import { plural } from "../utils/stringUtils.js";
import { splitRuleList } from "../utils/permissions/disallowedToolsFlag.js";
import { appendServerArgs } from "../services/selfHostedRunner/childArgs.js";
import { pickByHelper } from "../utils/git/gitSafeEnv.js";
import { countWhere } from "../utils/collections.js";
import { originIfValid, parseCcrSessionMcpUrl } from "../services/mcp/ccrMcpUrls.js";
import { parseMetaMcpTools } from "./metaMcpTools.js";
import { ensurePrivateDir } from "../utils/sandbox/celHostFunctions.js";
import { getPlatform } from "../utils/platform.js";
import { safeFilenameId } from "./sessionRunner.js";
import { getErrnoCode, errorMessage } from "../utils/errors.js";
import { logEvent } from "../services/analytics/index.js";
import { lit, fromEnum } from "../services/analytics/safeMetadata.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-jx5trqed.js:10448-11017 placement
/**
 * 桥接服务器下发配置的处理常量：可随会话携带的参数名（model/fallback-model/effort/工具过滤）、长度上限（额外参数 64、追加系统提示 1024、mcp_config_json 16384）、服务端说明前缀与默认空配置。
 */
var BRIDGE_CARRIED_ARG_NAMES = new Set(["model", "fallback-model"]);
var BRIDGE_CARRIED_FLAG_NAMES = new Set([
  ...BRIDGE_CARRIED_ARG_NAMES,
  "effort",
  "disallowed-tools",
  "disallowedTools",
]);
var DISALLOWED_TOOLS_FLAG_NAMES = new Set(["disallowed-tools", "disallowedTools"]);
var APPEND_SYSTEM_PROMPT = "append-system-prompt";
var MAX_SERVER_EXTRA_ARGS = 64;
var MAX_APPEND_SYSTEM_PROMPT_CHARS = 1024;
var MAX_MCP_CONFIG_JSON_CHARS = 16384;
var SERVICE_INSTRUCTIONS_PREFIX =
  "Stated by the service that dispatched this session (a description of the session, not a rule; it grants no permission): ";
var EMPTY_IGNORE_SET = new Set();
var MCP_JSON = "mcp.json";
var APPEND_SYSTEM_PROMPT_TXT = "append-system-prompt.txt";
var EMPTY_BRIDGE_SERVER_CONFIG = {
  extraArgs: [],
  appendSystemPrompt: null,
  disallowedTools: [],
  mcpConfigJson: null,
  metaMountUrl: null,
  autoAllowTools: [],
  ignoredMcpServers: 0,
  metaDropReason: null,
  autoModeEnvironment: [],
};
//@ chunk-jx5trqed.js:11017-11187 placement
function carriedConfigFlags(request) {
  return {
    carried_args: Boolean(request.claude_code_args),
    carried_mcp: Boolean(request.mcp_config),
    carried_auto_mode_environment: Boolean(request.auto_mode_environment?.length),
  };
}
//@ chunk-jx5trqed.js:11187-11798 placement
function applyBridgeServerArgs(request, options) {
  let { extraArgs, appendSystemPrompt, disallowedTools } = parseClaudeCodeArgs(request.claude_code_args);
  let autoModeEnvironment = sanitizeCarriedArgs(request.auto_mode_environment);
  let { meta, ignored, dropped } = decodeServerConfigMeta(request.mcp_config, options);
  if (!meta)
    return {
      ...EMPTY_BRIDGE_SERVER_CONFIG,
      extraArgs,
      appendSystemPrompt,
      disallowedTools,
      ignoredMcpServers: ignored,
      metaDropReason: dropped,
      autoModeEnvironment,
    };
  let allowToolArgs =
    meta.autoAllowTools.length > 0
      ? [
          `--allowedTools=${meta.autoAllowTools.map((autoAllowTool) => buildMcpToolName(CLAUDE_CODE_REMOTE, autoAllowTool)).join(",")}`,
        ]
      : [];
  return {
    extraArgs: [...extraArgs, ...allowToolArgs],
    appendSystemPrompt,
    disallowedTools,
    mcpConfigJson: meta.json,
    metaMountUrl: meta.url,
    autoAllowTools: meta.autoAllowTools,
    ignoredMcpServers: ignored,
    metaDropReason: null,
    autoModeEnvironment,
  };
}
//@ chunk-jx5trqed.js:11798-12242 placement
function sanitizeCarriedArgs(autoModeEnvironment = []) {
  let keptPrompts = [];
  let usedChars = 0;
  for (let entry of autoModeEnvironment) {
    if (
      entry.trim().length === 0 ||
      [...entry].length > MAX_APPEND_SYSTEM_PROMPT_CHARS ||
      entry === DEFAULTS_PLACEHOLDER ||
      hasControlChars(entry) ||
      hasInvisibleRuleChars(entry) ||
      findTemplateInjection(entry) !== null ||
      keptPrompts.length >= MAX_SERVER_EXTRA_ARGS
    )
      continue;
    let prompt = SERVICE_INSTRUCTIONS_PREFIX + entry;
    let nextChars = usedChars + jsonStringify(prompt).length + 1;
    if (nextChars > MAX_MCP_CONFIG_JSON_CHARS) continue;
    usedChars = nextChars;
    keptPrompts.push(prompt);
  }
  let droppedCount = autoModeEnvironment.length - keptPrompts.length;
  if (droppedCount > 0)
    logForDebugging(
      `[bridge:server-config] dropped ${droppedCount} auto_mode_environment ${plural(droppedCount, "entry", "entries")} (empty, over the caps, control, invisible or template characters, or the defaults marker)`,
      {
        level: "warn",
      },
    );
  return keptPrompts;
}
//@ chunk-jx5trqed.js:12242-12805 placement
/**
 * 解析桥接服务器下发的 claude_code_args，拆出额外参数、追加系统提示词与禁用工具。
 */
function parseClaudeCodeArgs(args) {
  if (!args)
    return {
      extraArgs: [],
      appendSystemPrompt: null,
      disallowedTools: [],
    };
  let carried = {};
  let appendPrompt = null;
  let disallowedTools = [];
  let notAllowlisted = 0;
  for (let [key, value] of Object.entries(args))
    if (BRIDGE_CARRIED_FLAG_NAMES.has(key)) {
      carried[key] = value;
      if (DISALLOWED_TOOLS_FLAG_NAMES.has(key) && typeof value === "string")
        disallowedTools.push(...splitRuleList([value]));
    } else if (key === APPEND_SYSTEM_PROMPT) appendPrompt = typeof value === "string" && value ? value : null;
    else notAllowlisted++;
  let extraArgs = [];
  let appliedCount = appendServerArgs(extraArgs, carried, EMPTY_IGNORE_SET, (flagName) =>
    logForDebugging(`[bridge:server-config] skipped ${flagName} claude_code_arg`),
  );
  logForDebugging(
    `[bridge:server-config] claude_code_args applied=${appliedCount} append_prompt=${appendPrompt ? "present" : "unset"} disallowed_tools=${disallowedTools.length} not_allowlisted=${notAllowlisted}`,
  );
  return {
    extraArgs,
    appendSystemPrompt: appendPrompt,
    disallowedTools,
  };
}
//@ chunk-jx5trqed.js:12805-12880 placement
function carriedModel(claudeCodeArgs) {
  let model = claudeCodeArgs?.model;
  return typeof model === "string" && model !== "" ? model : undefined;
}
//@ chunk-jx5trqed.js:12880-12956 placement
function carriedEffort(claudeCodeArgs) {
  let effort = claudeCodeArgs?.effort;
  return typeof effort === "string" && effort !== "" ? effort : undefined;
}
//@ chunk-jx5trqed.js:12956-13039 placement
function carriedModelArgs(claudeCodeArgs) {
  if (!claudeCodeArgs) return [];
  let carried = pickByHelper(claudeCodeArgs, (value, key) => BRIDGE_CARRIED_ARG_NAMES.has(key));
  return parseClaudeCodeArgs(carried).extraArgs;
}
//@ chunk-jx5trqed.js:13039-14247 placement
function decodeServerConfigMeta(mcpConfig, options) {
  if (!mcpConfig)
    return {
      meta: null,
      ignored: 0,
      dropped: null,
    };
  let decoded = decodeBase64Json(mcpConfig.content);
  if (!decoded)
    return {
      meta: null,
      ignored: 0,
      dropped: "undecodable",
    };
  let ignoredCount = countWhere(Object.keys(decoded), (serverName) => serverName !== CLAUDE_CODE_REMOTE);
  if (ignoredCount > 0)
    logForDebugging(
      `[bridge:server-config] ignoring ${ignoredCount} other server(s) in mcp_config (only ${CLAUDE_CODE_REMOTE} is honored)`,
    );
  let entry = decoded[CLAUDE_CODE_REMOTE];
  if (entry === undefined) {
    logForDebugging("[bridge:server-config] mcp_config carries no meta entry");
    return {
      meta: null,
      ignored: ignoredCount,
      dropped: "no_meta_entry",
    };
  }
  if (
    entry === null ||
    typeof entry !== "object" ||
    !("type" in entry) ||
    entry.type !== "http" ||
    !("url" in entry) ||
    typeof entry.url !== "string"
  ) {
    logForDebugging("[bridge:server-config] meta entry is not http", {
      level: "warn",
    });
    return {
      meta: null,
      ignored: ignoredCount,
      dropped: "not_http",
    };
  }
  let origin = originIfValid(options.apiBaseUrl);
  if (!origin) {
    logForDebugging(
      "[bridge:server-config] apiBaseUrl is not a trusted ingress origin; dropping meta entry",
      {
        level: "warn",
      },
    );
    return {
      meta: null,
      ignored: ignoredCount,
      dropped: "untrusted_origin",
    };
  }
  let url = parseCcrSessionMcpUrl(entry.url, origin, options.sessionId);
  if (!url) {
    logForDebugging(
      "[bridge:server-config] meta url is not this session's meta proxy route on the bridge origin",
      {
        level: "warn",
      },
    );
    return {
      meta: null,
      ignored: ignoredCount,
      dropped: "route_mismatch",
    };
  }
  let metaMcpTools = parseMetaMcpTools(entry);
  if (!metaMcpTools)
    return {
      meta: null,
      ignored: ignoredCount,
      dropped: "bad_tools",
    };
  return {
    meta: {
      json: jsonStringify({
        mcpServers: {
          [CLAUDE_CODE_REMOTE]: ccrMetaMcpServerConfig(url, options.sessionId),
        },
      }),
      url,
      autoAllowTools: metaMcpTools,
    },
    ignored: ignoredCount,
    dropped: null,
  };
}
//@ chunk-jx5trqed.js:14247-14646 placement
function decodeBase64Json(content) {
  let decoded;
  try {
    decoded = jsonParse(Buffer.from(content, "base64").toString("utf8"));
  } catch {
    logForDebugging("[bridge:server-config] mcp_config did not decode", {
      level: "warn",
    });
    return null;
  }
  if (
    decoded === null ||
    typeof decoded !== "object" ||
    !("mcpServers" in decoded) ||
    decoded.mcpServers === null ||
    typeof decoded.mcpServers !== "object" ||
    Array.isArray(decoded.mcpServers)
  ) {
    logForDebugging("[bridge:server-config] mcp_config has no mcpServers", {
      level: "warn",
    });
    return null;
  }
  return decoded.mcpServers;
}
//@ chunk-jx5trqed.js:14646-14942 placement
async function loadAutoModeSettingsModules() {
  let { autoModeConfigSchema, getSettingsFilePathForSource, getSettingsForSource } =
    await import("../utils/settings/settings.js");
  let { parseSettingsFileUncached } = await import("../utils/settings/ADDED_TO_A_POLICY_ONLY_TIER.lazy.js");
  let schema = autoModeConfigSchema();
  let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
  return (
    (settingsFilePathForSource !== undefined &&
      hasServerAutoModeEnvironment(schema, parseSettingsFileUncached(settingsFilePathForSource).settings)) ||
    hasServerAutoModeEnvironment(schema, getSettingsForSource("policySettings"))
  );
}
//@ chunk-jx5trqed.js:14942-15043 placement
function hasServerAutoModeEnvironment(schema, settings) {
  let parsed = schema.safeParse(settings?.autoMode);
  return parsed.success && (parsed.data?.environment?.length ?? 0) > 0;
}
//@ chunk-jx5trqed.js:15043-15790 placement
async function applyAutoModeEnvironment(config, options) {
  let environment =
    config.autoModeEnvironment.length === 0
      ? undefined
      : options.userAutoModeEnvironmentConfigured
        ? config.autoModeEnvironment
        : [DEFAULTS_PLACEHOLDER, ...config.autoModeEnvironment];
  if (!config.mcpConfigJson && !config.appendSystemPrompt)
    return config.extraArgs.length > 0 || environment !== undefined
      ? {
          extraArgs: config.extraArgs,
          autoModeEnvironment: environment,
        }
      : undefined;
  let dirPath = await writePrivateConfigDir(options.sessionId);
  try {
    let mcpConfig;
    if (config.mcpConfigJson) {
      let mcpPath = join(dirPath, MCP_JSON);
      await writeFile(mcpPath, config.mcpConfigJson, {
        flag: "wx",
        mode: 384,
      });
      mcpConfig = {
        path: mcpPath,
        ingressUrl: options.apiBaseUrl,
      };
    }
    let appendSystemPrompt;
    if (config.appendSystemPrompt) {
      let promptPath = join(dirPath, APPEND_SYSTEM_PROMPT_TXT);
      let buffer = Buffer.from(config.appendSystemPrompt, "utf8");
      await writeFile(promptPath, buffer, {
        flag: "wx",
        mode: 384,
      });
      appendSystemPrompt = {
        path: promptPath,
        sha256: createHash("sha256").update(buffer).digest("hex"),
      };
    }
    return {
      extraArgs: config.extraArgs,
      dir: dirPath,
      mcpConfig,
      appendSystemPrompt,
      autoModeEnvironment: environment,
    };
  } catch (error) {
    await removeRecursiveQuietly(dirPath);
    throw error;
  }
}
//@ chunk-jx5trqed.js:15790-16323 placement
async function writePrivateConfigDir(sessionId) {
  for (let j = 0; ; j++)
    try {
      let privateDir = await ensurePrivateDir();
      let rootStat = await lstat(privateDir);
      if (!rootStat.isDirectory()) throw Error("bridge spawn root is not a directory");
      if (getPlatform() !== "windows") {
        if (
          (typeof process.getuid === "function" && rootStat.uid !== process.getuid()) ||
          (rootStat.mode & 63) !== 0
        )
          throw Error("bridge spawn root has unexpected owner or mode");
      }
      let dirPath = await mkdtemp(join(privateDir, `${safeFilenameId(sessionId)}-`));
      let recheckStat = await lstat(privateDir).catch(() => null);
      if (recheckStat?.dev !== rootStat.dev || recheckStat.ino !== rootStat.ino) {
        await removeRecursiveQuietly(dirPath);
        throw Error("bridge spawn root changed identity during mkdtemp");
      }
      return dirPath;
    } catch (error) {
      if (j > 0 || getErrnoCode(error) !== "ENOENT") throw error;
    }
}
//@ chunk-jx5trqed.js:16323-16393 placement (2.1.88 match: convertDirectoryToZipInPlace, 1)
async function removeRecursiveQuietly(dirPath) {
  await rm(dirPath, {
    recursive: true,
    force: true,
  }).catch(() => {});
}
//@ chunk-jx5trqed.js:16393-16440 placement
async function cleanupServerConfigDir(config) {
  if (config?.dir) await removeRecursiveQuietly(config.dir);
}
//@ chunk-jx5trqed.js:16440-16703 placement
function logConfigNotApplied(sessionId, attributes) {
  logForDebugging(
    `[bridge:server-config] not applied sessionId=${sessionId}: gate_off (tengu_bridge_apply_server_session_config=false)`,
    {
      level: "warn",
    },
  );
  logEvent("tengu_bridge_server_config_rejected", {
    ...attributes,
    reason: lit("gate_off"),
  });
  logFeatureSad("bridge_server_session_config", "gate_off", attributes);
}
//@ chunk-jx5trqed.js:16703-18762 placement
/**
 * 把桥接服务器下发的会话配置（参数、MCP、自动模式环境等）应用到本地启动，受开关控制。
 */
async function applyBridgeServerConfig(workSecret, options) {
  let flags = carriedConfigFlags(workSecret);
  if (!Object.values(flags).some(Boolean)) return;
  if (!options.enabled) {
    logConfigNotApplied(options.sessionId, flags);
    return;
  }
  let config = EMPTY_BRIDGE_SERVER_CONFIG;
  let prepared;
  let prepareError;
  try {
    config = applyBridgeServerArgs(
      options.dropAutoModeEnvironment === undefined
        ? workSecret
        : {
            ...workSecret,
            auto_mode_environment: undefined,
          },
      options,
    );
    let nextOptions =
      config.autoModeEnvironment.length > 0 && options.userAutoModeEnvironmentConfigured === undefined
        ? {
            ...options,
            userAutoModeEnvironmentConfigured: await loadAutoModeSettingsModules(),
          }
        : options;
    prepared = await applyAutoModeEnvironment(config, nextOptions);
  } catch (error) {
    prepareError = errorMessage(error);
  }
  let attributes = {
    ...flags,
    extra_args: config.extraArgs.length,
    append_prompt: config.appendSystemPrompt !== null,
    meta_mcp: config.mcpConfigJson !== null,
    auto_allow: config.autoAllowTools.length,
    auto_mode_environment: config.autoModeEnvironment.length,
    ...(options.dropAutoModeEnvironment !== undefined && {
      auto_mode_environment_drop: fromEnum(options.dropAutoModeEnvironment),
    }),
    ignored_mcp: config.ignoredMcpServers,
    ...(config.metaDropReason !== null && {
      meta_drop: fromEnum(config.metaDropReason),
    }),
  };
  if (prepareError !== undefined) {
    logForDebugging(`[bridge:server-config] not applied sessionId=${options.sessionId}: ${prepareError}`, {
      level: "warn",
    });
    logEvent("tengu_bridge_server_config_rejected", {
      ...attributes,
      reason: lit("prepare_failed"),
    });
    logFeatureBad("bridge_server_session_config", "prepare_failed", attributes);
    return;
  }
  if (!prepared) {
    logForDebugging(
      `[bridge:server-config] nothing applied sessionId=${options.sessionId}: every carried value was rejected`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_bridge_server_config_rejected", {
      ...attributes,
      reason: lit("nothing_applied"),
    });
    logFeatureSad("bridge_server_session_config", "nothing_applied", attributes);
    return;
  }
  let metaStatus = config.mcpConfigJson
    ? "present"
    : config.metaDropReason
      ? `dropped:${config.metaDropReason}`
      : "unset";
  logForDebugging(
    `[bridge:server-config] applied sessionId=${options.sessionId} args=${config.extraArgs.length} appendPrompt=${config.appendSystemPrompt ? "present" : "unset"} metaMcp=${metaStatus} autoAllow=${config.autoAllowTools.length} autoModeEnvironment=${config.autoModeEnvironment.length}`,
    {
      level: config.metaDropReason ? "warn" : "debug",
    },
  );
  logEvent("tengu_bridge_server_config_applied", attributes);
  if (config.metaDropReason !== null)
    logFeatureSad("bridge_server_session_config", "meta_mcp_not_verified", attributes);
  else if (flags.carried_auto_mode_environment && config.autoModeEnvironment.length === 0)
    logFeatureSad(
      "bridge_server_session_config",
      options.dropAutoModeEnvironment === undefined
        ? "auto_mode_environment_dropped"
        : `auto_mode_environment_${options.dropAutoModeEnvironment}`,
      attributes,
    );
  else logFeatureOk("bridge_server_session_config", attributes);
  return prepared;
}
export {
  applyBridgeServerConfig,
  carriedModelArgs,
  cleanupServerConfigDir,
  logConfigNotApplied,
  carriedConfigFlags,
  applyBridgeServerArgs,
  carriedModel,
  carriedEffort,
};
