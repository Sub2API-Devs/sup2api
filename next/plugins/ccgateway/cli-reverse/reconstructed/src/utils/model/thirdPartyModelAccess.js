/**
 * utils/model/thirdPartyModelAccess.ts
 *
 * 2.1.316 新增。第三方（Bedrock 等）模型访问判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwyr6h72.js (29)
 * attribution: placement 29
 */
import { open } from "fs/promises";
import { constants } from "fs";
import { join, dirname } from "path";
import { createHash } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  stringSchema,
  objectSchema,
  discriminatedUnion,
  zodStrictObject,
  literal,
  numberSchema,
  record,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { O_NONBLOCK, NOFOLLOW_NONBLOCK_FLAGS } from "../fsFlags.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { logForDebugging } from "../debug.js";
import { isENOENT, getErrnoCode, errorMessage } from "../errors.js";
import { memoizeWithTTLAsync } from "../memoize.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { expandTildeWith } from "../networkPaths.js";
import { env } from "../env.js";
import { resolveGcloudConfigDir, getGcloudConfigDir } from "../gcloudConfigDir.js";
import { safeParseJSON } from "../json.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { hasCustomApiKeyHeader, bearerFromEnvOrHeaders } from "../../services/api/customHeaders.js";
import { isDiskless } from "../../bootstrap/state.js";
import { getFileReader } from "../fileStore.js";
import { jsonStringify } from "../slowOperations.js";
import { classifyProviderModelError } from "../../services/api/providerModelErrors.js";
import { extractConnectionErrorDetails } from "../../services/api/errorUtils.js";
import {
  APIConnectionTimeoutError,
  APIConnectionError,
} from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { stripIgnorables } from "../sanitization.js";
import { truncateAtWord } from "../stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bwyr6h72.js:1088-1518 placement
/**
 * 第三方模型访问记忆用常量：身份文件大小上限、AWS 配置中影响身份的键、gcloud ADC 文件中的键及其解析 schema。
 */
var MAX_IDENTITY_FILE_BYTES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_AWS_PROFILES;
var AWS_IDENTITY_KEYS;
var GCP_ADC_KEYS;
var adcFileSchema;
deferInit("chunk-bwyr6h72.js:1088", () => {
  MAX_IDENTITY_FILE_BYTES = 4194304;
  MAX_AWS_PROFILES = 5;
  AWS_IDENTITY_KEYS = [
    "sso_account_id",
    "sso_role_name",
    "sso_session",
    "sso_start_url",
    "role_arn",
    "source_profile",
    "credential_source",
    "credential_process",
    "web_identity_token_file",
    "region",
  ];
  GCP_ADC_KEYS = [
    "type",
    "client_email",
    "audience",
    "service_account_impersonation_url",
    "quota_project_id",
  ];
  adcFileSchema = DoctorLazy(() => {
    let optionalString = stringSchema().optional().catch(undefined);
    return objectSchema({
      type: optionalString,
      client_email: optionalString,
      audience: optionalString,
      service_account_impersonation_url: optionalString,
      quota_project_id: optionalString,
    });
  });
});
//@ chunk-bwyr6h72.js:1518-2090 placement
/**
 * 以非阻塞只读方式读取 AWS/gcloud 身份文件（必须是普通文件且不超过 4MB），返回文本与 mtime；不存在返回空文本，其他错误返回 undefined。
 */
async function readIdentityFile(filePath) {
  try {
    let handle = await open(filePath, constants.O_RDONLY | O_NONBLOCK | READ_LIMITS);
    try {
      let stats = await handle.stat();
      if (!stats.isFile() || stats.size > MAX_IDENTITY_FILE_BYTES) {
        logForDebugging(
          "[3p-model-memory] an AWS or gcloud identity file is over 4 MB or not a regular file, so start-up model checks will not reuse saved results",
        );
        return;
      }
      let buffer = Buffer.alloc(stats.size);
      let offset = 0;
      while (offset < stats.size) {
        let { bytesRead } = await handle.read(buffer, offset, stats.size - offset, offset);
        if (bytesRead === 0) break;
        offset += bytesRead;
      }
      return {
        text: buffer.subarray(0, offset).toString("utf8"),
        mtimeMs: stats.mtimeMs,
      };
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (isENOENT(error))
      return {
        text: "",
      };
    logForDebugging(`[3p-model-memory] identity file unreadable: ${getErrnoCode(error) ?? "unknown"}`);
    return;
  }
}
//@ chunk-bwyr6h72.js:2090-2984 placement
var readAwsSharedConfig; // deferred: uses memoizeWithTTLAsync (../memoize.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bwyr6h72.js:2090", () => {
  readAwsSharedConfig = memoizeWithTTLAsync(
    async () => {
      let { getHomeDir, loadSharedConfigFiles } =
        await import("../../../vendor/@smithy/shared-ini-file-loader/default.js").then((awsConfigModule) =>
          __toESM(awsConfigModule.default, 1),
        );
      let baseDir = getHomeDir();
      let configPath = expandTildeWith(env.AWS_CONFIG_FILE || join(baseDir, ".aws", "config"), baseDir);
      let credentialsPath = expandTildeWith(
        env.AWS_SHARED_CREDENTIALS_FILE || join(baseDir, ".aws", "credentials"),
        baseDir,
      );
      if (
        (await Promise.all([readIdentityFile(configPath), readIdentityFile(credentialsPath)])).includes(
          undefined,
        )
      )
        return;
      try {
        let { configFile, credentialsFile } = await loadSharedConfigFiles({
          configFilepath: configPath,
          filepath: credentialsPath,
          ignoreCache: true,
        });
        let parts = [];
        let AWS_PROFILE = env.AWS_PROFILE || "default";
        for (let idx = 0; AWS_PROFILE && idx <= MAX_AWS_PROFILES; idx++) {
          let profile = {
            ...configFile[AWS_PROFILE],
            ...credentialsFile[AWS_PROFILE],
          };
          parts.push(`profile=${AWS_PROFILE}`);
          for (let key of AWS_IDENTITY_KEYS) parts.push(`${key}=${profile[key] ?? ""}`);
          if (profile.sso_session) {
            let ssoSession = configFile[`sso-session.${profile.sso_session}`];
            parts.push(`sso_session_start_url=${ssoSession?.sso_start_url ?? ""}`);
          }
          parts.push(`aws_access_key_id=${profile.aws_access_key_id ?? ""}`);
          AWS_PROFILE =
            profile.source_profile && profile.source_profile !== AWS_PROFILE
              ? profile.source_profile
              : undefined;
        }
        return parts.join(`
`);
      } catch (error) {
        logForDebugging(`[3p-model-memory] AWS config unreadable: ${getErrnoCode(error) ?? "unknown"}`);
        return;
      }
    },
    () => "aws",
  );
});
//@ chunk-bwyr6h72.js:2984-3257 placement
function readGcloudCoreConfig(text) {
  let inCore = false;
  let values = {};
  for (let line of text.split(/\r?\n/)) {
    let trimmed = line.trim();
    let match = /^\[(.+)\]$/.exec(trimmed);
    if (match) {
      inCore = match[1].trim() === "core";
      continue;
    }
    let match_2 = /^(project|account)\s*=\s*(.*)$/.exec(trimmed);
    if (inCore && match_2) values[match_2[1]] = match_2[2].trim();
  }
  return [`project=${values.project ?? ""}`, `account=${values.account ?? ""}`];
}
//@ chunk-bwyr6h72.js:3257-3867 placement
/**
 * 计算 GCP 身份指纹（按 TTL 缓存）：当前 gcloud 配置名、core 段 project/account、ADC 文件中的关键字段（authorized_user 时加文件 mtime）。
 */
var getGcpIdentityFingerprint; // deferred: uses memoizeWithTTLAsync (../memoize.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bwyr6h72.js:3257", () => {
  getGcpIdentityFingerprint = memoizeWithTTLAsync(
    async () => {
      let configDir = resolveGcloudConfigDir();
      let activeConfig = await readIdentityFile(join(configDir, "active_config"));
      if (activeConfig === undefined) return;
      let configName = env.CLOUDSDK_ACTIVE_CONFIG_NAME || activeConfig.text.trim() || "default";
      let adcPath =
        env.GOOGLE_APPLICATION_CREDENTIALS ||
        env.google_application_credentials ||
        join(getGcloudConfigDir(), "application_default_credentials.json");
      let [configFile, adcFile] = await Promise.all([
        readIdentityFile(join(configDir, "configurations", `config_${configName}`)),
        readIdentityFile(adcPath),
      ]);
      if (configFile === undefined || adcFile === undefined) return;
      let parts = [`config=${configName}`, ...readGcloudCoreConfig(configFile.text)];
      let parsed = adcFile.text ? adcFileSchema().safeParse(safeParseJSON(adcFile.text, false)) : undefined;
      let adc = parsed?.success ? parsed.data : {};
      for (let key of GCP_ADC_KEYS) parts.push(`${key}=${adc[key] ?? ""}`);
      if (adc.type === "authorized_user") parts.push(`adc_file=${adcFile.mtimeMs}`);
      return parts.join(`
`);
    },
    () => "gcp",
  );
});
//@ chunk-bwyr6h72.js:3867-4376 placement
/**
 * 模型访问记忆常量：可用/拒绝结论的有效期与保留期、文件版本与大小上限、作用域与每作用域条目上限、日志前缀、结论说明、文件 schema 与"更新格式"标记。
 */
var OK_TTL_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var REFUSED_TTL_MS;
var RECHECK_CLAIM_MS;
var OK_RETENTION_MS;
var MEMORY_FORMAT_TAG;
var MEMORY_VERSION;
var MAX_MEMORY_BYTES;
var MAX_SCOPES;
var MAX_MODELS_PER_SCOPE;
var LOG_PREFIX;
var NEWER_MEMORY_FORMAT;
var VERDICT_DESCRIPTIONS;
var memoryEntrySchema;
var memoryFileSchema;
var versionOnlySchema;
var NEWER_FORMAT;
deferInit("chunk-bwyr6h72.js:3867", () => {
  OK_TTL_MS = 900000;
  REFUSED_TTL_MS = 86400000;
  RECHECK_CLAIM_MS = 600000;
  OK_RETENTION_MS = 604800000;
  MEMORY_FORMAT_TAG = "1";
  MEMORY_VERSION = 1;
  MAX_MEMORY_BYTES = 65536;
  MAX_SCOPES = 16;
  MAX_MODELS_PER_SCOPE = 32;
  LOG_PREFIX = "[3p-model-memory]";
  NEWER_MEMORY_FORMAT = 300;
  VERDICT_DESCRIPTIONS = {
    refused: "the provider refuses this model for the account",
    denied: "an IAM or SCP policy denies the call",
    temporary: "nothing learned about the model",
    failed: "a failure this build cannot interpret",
  };
  memoryEntrySchema = DoctorLazy(() =>
    discriminatedUnion("s", [
      zodStrictObject({
        s: literal("ok"),
        at: numberSchema(),
      }),
      zodStrictObject({
        s: literal("refused"),
        at: numberSchema(),
        rc: numberSchema().optional(),
      }),
    ]),
  );
  memoryFileSchema = DoctorLazy(() =>
    zodStrictObject({
      version: literal(MEMORY_VERSION),
      entries: record(stringSchema(), record(stringSchema(), memoryEntrySchema())),
    }),
  );
  versionOnlySchema = DoctorLazy(() =>
    objectSchema({
      version: numberSchema(),
    }),
  );
  NEWER_FORMAT = Symbol("newer format");
});
//@ chunk-bwyr6h72.js:4376-4434 placement
/**
 * 模型访问记忆文件路径（<config>/cache/model-access.json）。
 */
function accessMemoryPath() {
  return join(getClaudeConfigDir(), "cache", "model-access.json");
}
//@ chunk-bwyr6h72.js:4434-4503 placement
/**
 * 提供商探测结论文件路径。
 */
function providerProbeVerdictsPath() {
  return join(getClaudeConfigDir(), "cache", "provider-probe-verdicts.json");
}
//@ chunk-bwyr6h72.js:4503-4683 placement
function hasStaticProviderCredential() {
  return (
    Boolean(env.AWS_BEARER_TOKEN_BEDROCK) ||
    Boolean(env.CLOUDSDK_AUTH_ACCESS_TOKEN) ||
    Boolean(env.CLAUDE_CODE_SKIP_VERTEX_AUTH && env.ANTHROPIC_API_KEY) ||
    hasCustomApiKeyHeader() ||
    bearerFromEnvOrHeaders() !== undefined
  );
}
//@ chunk-bwyr6h72.js:4683-4907 placement (2.1.88 match: getCustomHeaders, 1)
function getCustomHeaders() {
  let customHeadersEnv = env.ANTHROPIC_CUSTOM_HEADERS;
  if (!customHeadersEnv) return "";
  let headerNames = [];
  for (let line of customHeadersEnv.split(/\n|\r\n/)) {
    let colonIdx = line.indexOf(":");
    if (colonIdx !== -1) headerNames.push(line.slice(0, colonIdx).trim().toLowerCase());
  }
  return headerNames
    .filter((headerName) => headerName !== "")
    .sort()
    .join(",");
}
//@ chunk-bwyr6h72.js:4907-5726 placement
async function PACKAGE_INFO(
  provider,
  loadModels,
  version = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
) {
  try {
    if (isDiskless() || env.CLAUDE_CODE_SKIP_MODEL_ACCESS_MEMORY || hasStaticProviderCredential()) return;
    let identityFingerprint =
      provider === "vertex" ? await getGcpIdentityFingerprint() : await readAwsSharedConfig();
    if (identityFingerprint === undefined) return;
    let customHeaders = await loadModels();
    return createHash("sha256")
      .update(
        [
          provider,
          MEMORY_FORMAT_TAG,
          version,
          ...customHeaders.map((headerInfo) => headerInfo ?? ""),
          identityFingerprint,
        ].join("\x00"),
      )
      .digest("hex")
      .slice(0, 24);
  } catch (error) {
    logForDebugging(`${LOG_PREFIX} not used this start: ${getErrnoCode(error) ?? "unknown"}`);
    return;
  }
}
//@ chunk-bwyr6h72.js:5726-5804 placement
var accessMemoryCache; // deferred: uses memoizeWithTTLAsync (../memoize.js) of its import cycle while loading; runs once the cycle is complete
var noopMemorySetterCache;
deferInit("chunk-bwyr6h72.js:5726", () => {
  accessMemoryCache = memoizeWithTTLAsync(async (path) => {
    let accessMemory = await readAccessMemory(path);
    return accessMemory === NEWER_FORMAT ? {} : accessMemory;
  });
  noopMemorySetterCache = memoizeWithTTLAsync(async (path) => {});
});
//@ chunk-bwyr6h72.js:5804-6310 placement
/**
 * 读取模型访问记忆文件（不跟随符号链接，最多 64KB）：版本更新时返回 NEWER_FORMAT 标记，格式不符或读失败返回空表。
 */
async function readAccessMemory(path) {
  if (isDiskless()) return {};
  let bytes;
  try {
    let reader = getFileReader();
    if (NOFOLLOW_NONBLOCK_FLAGS === 0) {
      let stats = await reader.lstat(path);
      if (stats !== undefined && !stats.isFile) return {};
    }
    bytes = await reader.readTail(path, MAX_MEMORY_BYTES + 1, {
      noFollow: true,
    });
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`${LOG_PREFIX} read failed: ${getErrnoCode(error) ?? "unknown"}`);
    return {};
  }
  if (bytes.length > MAX_MEMORY_BYTES) {
    logForDebugging(`${LOG_PREFIX} file over 64 KB; ignoring it`);
    return {};
  }
  let parsed = safeParseJSON(bytes.toString("utf8"), false);
  let versionResult = versionOnlySchema().safeParse(parsed);
  if (versionResult.success && versionResult.data.version > MEMORY_VERSION) return NEWER_FORMAT;
  let fileResult = memoryFileSchema().safeParse(parsed);
  if (!fileResult.success) {
    logForDebugging(`${LOG_PREFIX} file not in this format; ignoring it`);
    return {};
  }
  return fileResult.data.entries;
}
//@ chunk-bwyr6h72.js:6310-6519 placement
function toRememberedState(entry, now) {
  if (entry === undefined || entry.at > now) return;
  if (entry.s === "ok")
    return now - entry.at <= OK_TTL_MS
      ? {
          state: "ok",
          at: entry.at,
        }
      : undefined;
  if (now - entry.at > REFUSED_TTL_MS) return;
  return {
    state: "refused",
    at: entry.at,
    ...(entry.rc !== undefined &&
      entry.rc <= now && {
        recheckClaimedAt: entry.rc,
      }),
  };
}
//@ chunk-bwyr6h72.js:6519-6593 placement
/**
 * 取某作用域下某模型已记忆的访问结论。
 */
async function rememberedAccess(scope, modelId, now = Date.now()) {
  return toRememberedState((await accessMemoryCache(accessMemoryPath()))[scope]?.[modelId], now);
}
//@ chunk-bwyr6h72.js:6593-6691 placement
function shouldRecheckRefusal(state, now = Date.now()) {
  return (
    state.state === "refused" && now - Math.max(state.at, state.recheckClaimedAt ?? 0) >= RECHECK_CLAIM_MS
  );
}
//@ chunk-bwyr6h72.js:6691-7066 placement
/**
 * 串行地读取-修改-原子写入模型访问记忆文件（按作用域与模型更新一条记录），返回更新后的记录；无盘模式只调用更新函数。
 */
function updateAccessMemory(scope, modelId, mutate, now) {
  if (isDiskless()) return Promise.resolve(mutate(undefined));
  let path = accessMemoryPath();
  let write = noopMemorySetterCache(path)
    .then(async () => {
      let memory = await readAccessMemory(path);
      if (memory === NEWER_FORMAT) return mutate(undefined);
      let entries = pruneAccessMemory(memory, scope, modelId, mutate, now);
      try {
        let fileReader = getFileReader();
        await fileReader.mkdir(dirname(path));
        await fileReader.atomicWrite(
          path,
          jsonStringify({
            version: MEMORY_VERSION,
            entries,
          }),
          384,
        );
      } catch (error) {
        logForDebugging(`${LOG_PREFIX} write failed: ${getErrnoCode(error) ?? "unknown"}`);
      }
      return entries[scope]?.[modelId];
    })
    .catch(() => {
      return;
    });
  noopMemorySetterCache.cache.set(
    path,
    write.then(() => {}),
  );
  return write;
}
//@ chunk-bwyr6h72.js:7066-7159 placement
function updateAccessMemoryCache(scope, modelId, entry, now) {
  let path = accessMemoryPath();
  let loaded = accessMemoryCache(path);
  accessMemoryCache.cache.set(
    path,
    loaded.then(
      (entries) => pruneAccessMemory(entries, scope, modelId, () => entry, now),
      () => ({}),
    ),
  );
}
//@ chunk-bwyr6h72.js:7159-7247 placement
/**
 * 记录某模型的访问结论（可访问或拒绝）。
 */
async function recordAccessVerdict(scope, modelId, verdict, now = Date.now()) {
  let entry = {
    s: verdict,
    at: now,
  };
  updateAccessMemoryCache(scope, modelId, entry, now);
  await updateAccessMemory(scope, modelId, () => entry, now);
}
//@ chunk-bwyr6h72.js:7247-7327 placement
async function forgetAccessVerdict(scope, modelId, now = Date.now()) {
  updateAccessMemoryCache(scope, modelId, undefined, now);
  await updateAccessMemory(
    scope,
    modelId,
    () => {
      return;
    },
    now,
  );
}
//@ chunk-bwyr6h72.js:7327-7581 placement
async function claimRecheck(scope, modelId, now = Date.now()) {
  let claimed = false;
  let entry = await updateAccessMemory(
    scope,
    modelId,
    (previous) => {
      let state = toRememberedState(previous, now);
      if (state !== undefined && shouldRecheckRefusal(state, now)) {
        claimed = true;
        return {
          s: "refused",
          at: state.at,
          rc: now,
        };
      }
      return previous;
    },
    now,
  );
  updateAccessMemoryCache(scope, modelId, entry, now);
  if (claimed)
    return {
      claimed: true,
    };
  let rememberedState = toRememberedState(entry, now);
  return rememberedState === undefined
    ? {
        claimed: false,
      }
    : {
        claimed: false,
        current: rememberedState,
      };
}
//@ chunk-bwyr6h72.js:7581-8025 placement
/**
 * 清理访问记忆：去掉过期记录，更新指定条目，每个作用域只保留最近的若干模型，并只保留最近使用的若干作用域。
 */
function pruneAccessMemory(memory, scope, modelId, mutate, now) {
  let pruned = {};
  for (let [key, value] of Object.entries(memory)) {
    let keptModels = {};
    for (let [key, value_2] of Object.entries(value)) {
      let retentionMs = value_2.s === "ok" ? OK_RETENTION_MS : REFUSED_TTL_MS;
      if (value_2.at <= now + retentionMs && now - value_2.at <= retentionMs) keptModels[key] = value_2;
    }
    pruned[key] = keptModels;
  }
  let updatedEntry = mutate(pruned[scope]?.[modelId]);
  let scopeModels = {
    ...pruned[scope],
  };
  delete scopeModels[modelId];
  if (updatedEntry !== undefined) scopeModels[modelId] = updatedEntry;
  pruned[scope] = Object.fromEntries(
    Object.entries(scopeModels)
      .sort(([, leftEntry], [, rightEntry]) => rightEntry.at - leftEntry.at)
      .slice(0, MAX_MODELS_PER_SCOPE),
  );
  return Object.fromEntries(
    Object.entries(pruned)
      .filter(([, value]) => Object.keys(value).length > 0)
      .sort(([, leftScope], [, rightScope]) => maxEntryTimestamp(rightScope) - maxEntryTimestamp(leftScope))
      .slice(0, MAX_SCOPES),
  );
}
//@ chunk-bwyr6h72.js:8025-8091 placement
function maxEntryTimestamp(models) {
  return Math.max(...Object.values(models).map((entry) => entry.at));
}
//@ chunk-bwyr6h72.js:8091-8212 placement
function getStatusCode(error) {
  if (typeof error !== "object" || error === null || !("status" in error)) return;
  return typeof error.status === "number" ? error.status : undefined;
}
//@ chunk-bwyr6h72.js:8212-8363 placement
function classifyAccessFailure(failureKind, error) {
  if (failureKind === "refused" || failureKind === "denied") return failureKind;
  let statusCode = getStatusCode(error);
  return failureKind === "credential" ||
    statusCode === undefined ||
    statusCode === 408 ||
    statusCode === 429 ||
    statusCode >= 500
    ? "temporary"
    : "failed";
}
//@ chunk-bwyr6h72.js:8363-8477 placement
/**
 * 判定第三方模型访问（优先用记忆），回调通知结论并返回。
 */
async function checkRememberedModelAccess(provider, scope, modelId, probe, options) {
  let modelAccess = await resolveModelAccess(provider, scope, modelId, probe, options);
  options?.onVerdict?.(modelAccess.verdict, modelAccess.rememberedAt);
  return modelAccess.verdict;
}
//@ chunk-bwyr6h72.js:8477-8928 placement
/**
 * 判定第三方模型是否可用：非 live 时先用记忆中的结论（默认模型的拒绝可认领复查），否则实际探测并记忆结果。
 */
async function resolveModelAccess(provider, scope, modelId, probe, options) {
  if (scope !== undefined && !options?.live) {
    let remembered = await rememberedAccess(scope, modelId);
    let didClaimRecheck = false;
    if (remembered !== undefined && options?.isDefault && shouldRecheckRefusal(remembered)) {
      let claim = await claimRecheck(scope, modelId);
      didClaimRecheck = claim.claimed;
      remembered = claim.claimed ? undefined : claim.current;
    }
    if (remembered !== undefined) {
      logForDebugging(`${LOG_PREFIX} ${provider} ${modelId}: ${remembered.state} (remembered)`);
      return {
        verdict: remembered.state === "ok" ? "accessible" : "refused",
        rememberedAt: remembered.at,
      };
    }
    let verdict = await decideRememberedModelAccess(provider, scope, modelId, probe, options);
    if (didClaimRecheck && verdict === "denied") {
      recordAccessVerdict(scope, modelId, "refused");
      return {
        verdict: "refused",
      };
    }
    return {
      verdict,
    };
  }
  return {
    verdict: await decideRememberedModelAccess(provider, scope, modelId, probe, options),
  };
}
//@ chunk-bwyr6h72.js:8928-10421 placement
async function decideRememberedModelAccess(provider, scope, modelId, probe, options) {
  let probeResult = await probe();
  let failureKind = probeResult.accessible
    ? undefined
    : classifyProviderModelError(provider, probeResult.error);
  if (failureKind === "outdated") {
    let treatOutdatedAsUnavailable = options?.versionTooOld === "unavailable";
    let outdatedChoice = treatOutdatedAsUnavailable
      ? "not switching to it"
      : "keeping it, so the first request shows the update message";
    logForDebugging(
      `${LOG_PREFIX} ${provider} ${modelId}: needs a newer Claude Code than ${
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION
      }; ${outdatedChoice} (not saved; any earlier answer cleared)`,
    );
    if (scope !== undefined) forgetAccessVerdict(scope, modelId);
    return treatOutdatedAsUnavailable ? "failed" : "accessible";
  }
  if (scope !== undefined && (probeResult.accessible || failureKind === "refused"))
    recordAccessVerdict(scope, modelId, probeResult.accessible ? "ok" : "refused");
  if (probeResult.accessible || failureKind === undefined) return "accessible";
  let failureClass = classifyAccessFailure(failureKind, probeResult.error);
  let statusCode = getStatusCode(probeResult.error);
  let connectionDetails = statusCode !== undefined ? null : extractConnectionErrorDetails(probeResult.error);
  let reasonCode =
    probeResult.error instanceof APIConnectionTimeoutError
      ? "timeout"
      : statusCode !== undefined
        ? `HTTP ${statusCode}`
        : connectionDetails !== null
          ? stripIgnorables(connectionDetails.code)
          : probeResult.error instanceof APIConnectionError
            ? "connection error"
            : "no HTTP status";
  let errorText = connectionDetails?.message ?? errorMessage(probeResult.error);
  let prefix =
    statusCode !== undefined
      ? `${statusCode} `
      : connectionDetails !== null
        ? `${connectionDetails.code}: `
        : undefined;
  let messageText = stripIgnorables(
    prefix !== undefined && errorText.startsWith(prefix) ? errorText.slice(prefix.length) : errorText,
  );
  logForDebugging(
    `${LOG_PREFIX} ${provider} ${modelId}: check failed: ${VERDICT_DESCRIPTIONS[failureClass]} (${failureKind === "credential" ? "a credential error, " : ""}${reasonCode}: ${truncateAtWord(messageText, NEWER_MEMORY_FORMAT)})`,
    {
      level: failureClass === "refused" || failureClass === "denied" ? "debug" : "error",
    },
  );
  return failureClass;
}
//@ chunk-bwyr6h72.js:10421-10736 placement
/**
 * 按分组顺序探测候选模型（并行），返回第一个可用者；都不可用时在截止时间前对记忆为拒绝的候选做一次 live 复查。
 */
async function findFirstAccessibleModel(groups, probeLive, isRefused, deadline) {
  let candidates = [];
  for (let group of groups) {
    let results = await Promise.all(group.map(isRefused));
    let results_2 = await Promise.all(group.map((candidate) => probeLive(candidate, false)));
    let found = group.find((candidate, index) => results_2[index]);
    if (found !== undefined) return found;
    candidates.push(...group.filter((candidate, index) => results[index]));
  }
  if (candidates.length === 0 || Date.now() > deadline) return;
  let results = await Promise.all(candidates.map((candidate) => probeLive(candidate, true)));
  return candidates.find((candidate, index) => results[index]);
}
export {
  accessMemoryPath,
  providerProbeVerdictsPath,
  REFUSED_TTL_MS,
  findFirstAccessibleModel,
  rememberedAccess,
  checkRememberedModelAccess,
  recordAccessVerdict,
  PACKAGE_INFO,
  getCustomHeaders,
};
