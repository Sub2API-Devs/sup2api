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
  string,
  u,
  discriminatedUnion,
  zodStrictObject,
  literal,
  E,
  record,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { O_NONBLOCK, NOFOLLOW_NONBLOCK_FLAGS } from "../fsFlags.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { logForDebugging } from "../debug.js";
import { isENOENT, getErrnoCode, errorMessage } from "../errors.js";
import { memoizeWithTTLAsync } from "../memoize.js";
import { Re } from "../../../runtime/bun-runtime.js";
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

//@ chunk-bwyr6h72.js:1088-1518 placement
/**
 * 第三方模型访问记忆用常量：身份文件大小上限、AWS 配置中影响身份的键、gcloud ADC 文件中的键及其解析 schema。
 */
var MAX_IDENTITY_FILE_BYTES = 4194304;
var gcpAdcFileSchema = 5;
var AWS_IDENTITY_KEYS = [
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
var GCP_ADC_KEYS = [
  "type",
  "client_email",
  "audience",
  "service_account_impersonation_url",
  "quota_project_id",
];
var adcFileSchema = DoctorLazy(() => {
  let e = string().optional().catch(undefined);
  return u({
    type: e,
    client_email: e,
    audience: e,
    service_account_impersonation_url: e,
    quota_project_id: e,
  });
});
//@ chunk-bwyr6h72.js:1518-2090 placement
/**
 * 以非阻塞只读方式读取 AWS/gcloud 身份文件（必须是普通文件且不超过 4MB），返回文本与 mtime；不存在返回空文本，其他错误返回 undefined。
 */
async function readIdentityFile(e) {
  try {
    let handle = await open(e, constants.O_RDONLY | O_NONBLOCK | READ_LIMITS);
    try {
      let stats = await handle.stat();
      if (!stats.isFile() || stats.size > MAX_IDENTITY_FILE_BYTES) {
        logForDebugging(
          "[3p-model-memory] an AWS or gcloud identity file is over 4 MB or not a regular file, so start-up model checks will not reuse saved results",
        );
        return;
      }
      let f = Buffer.alloc(stats.size);
      let offset = 0;
      while (offset < stats.size) {
        let { bytesRead } = await handle.read(f, offset, stats.size - offset, offset);
        if (bytesRead === 0) break;
        offset += bytesRead;
      }
      return {
        text: f.subarray(0, offset).toString("utf8"),
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
var readAwsSharedConfig = memoizeWithTTLAsync(
  async () => {
    let { getHomeDir, loadSharedConfigFiles } = await import("./chunk-72ngr4xp.js").then((m) =>
      Re(m.default, 1),
    );
    let homeDir = getHomeDir();
    let f = expandTildeWith(env.AWS_CONFIG_FILE || join(homeDir, ".aws", "config"), homeDir);
    let c = expandTildeWith(env.AWS_SHARED_CREDENTIALS_FILE || join(homeDir, ".aws", "credentials"), homeDir);
    if ((await Promise.all([readIdentityFile(f), readIdentityFile(c)])).includes(undefined)) return;
    try {
      let { configFile, credentialsFile } = await loadSharedConfigFiles({
        configFilepath: f,
        filepath: c,
        ignoreCache: true,
      });
      let l = [];
      let AWS_PROFILE = env.AWS_PROFILE || "default";
      for (let idx = 0; AWS_PROFILE && idx <= gcpAdcFileSchema; idx++) {
        let b = {
          ...configFile[AWS_PROFILE],
          ...credentialsFile[AWS_PROFILE],
        };
        l.push(`profile=${AWS_PROFILE}`);
        for (let A of AWS_IDENTITY_KEYS) l.push(`${A}=${b[A] ?? ""}`);
        if (b.sso_session) {
          let A = configFile[`sso-session.${b.sso_session}`];
          l.push(`sso_session_start_url=${A?.sso_start_url ?? ""}`);
        }
        l.push(`aws_access_key_id=${b.aws_access_key_id ?? ""}`);
        AWS_PROFILE = b.source_profile && b.source_profile !== AWS_PROFILE ? b.source_profile : undefined;
      }
      return l.join(`
`);
    } catch (error) {
      logForDebugging(`[3p-model-memory] AWS config unreadable: ${getErrnoCode(error) ?? "unknown"}`);
      return;
    }
  },
  () => "aws",
);
//@ chunk-bwyr6h72.js:2984-3257 placement
function readGcloudCoreConfig(text) {
  let r = false;
  let n = {};
  for (let line of text.split(/\r?\n/)) {
    let trimmed = line.trim();
    let match = /^\[(.+)\]$/.exec(trimmed);
    if (match) {
      r = match[1].trim() === "core";
      continue;
    }
    let match_2 = /^(project|account)\s*=\s*(.*)$/.exec(trimmed);
    if (r && match_2) n[match_2[1]] = match_2[2].trim();
  }
  return [`project=${n.project ?? ""}`, `account=${n.account ?? ""}`];
}
//@ chunk-bwyr6h72.js:3257-3867 placement
/**
 * 计算 GCP 身份指纹（按 TTL 缓存）：当前 gcloud 配置名、core 段 project/account、ADC 文件中的关键字段（authorized_user 时加文件 mtime）。
 */
var getGcpIdentityFingerprint = memoizeWithTTLAsync(
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
//@ chunk-bwyr6h72.js:3867-4376 placement
/**
 * 模型访问记忆常量：可用/拒绝结论的有效期与保留期、文件版本与大小上限、作用域与每作用域条目上限、日志前缀、结论说明、文件 schema 与"更新格式"标记。
 */
var OK_TTL_MS = 900000;
var REFUSED_TTL_MS = 86400000;
var RECHECK_CLAIM_MS = 600000;
var OK_RETENTION_MS = 604800000;
var MEMORY_FORMAT_TAG = "1";
var MEMORY_VERSION = 1;
var MAX_MEMORY_BYTES = 65536;
var MAX_SCOPES = 16;
var MAX_MODELS_PER_SCOPE = 32;
var LOG_PREFIX = "[3p-model-memory]";
var NEWER_MEMORY_FORMAT = 300;
var VERDICT_DESCRIPTIONS = {
  refused: "the provider refuses this model for the account",
  denied: "an IAM or SCP policy denies the call",
  temporary: "nothing learned about the model",
  failed: "a failure this build cannot interpret",
};
var memoryEntrySchema = DoctorLazy(() =>
  discriminatedUnion("s", [
    zodStrictObject({
      s: literal("ok"),
      at: E(),
    }),
    zodStrictObject({
      s: literal("refused"),
      at: E(),
      rc: E().optional(),
    }),
  ]),
);
var memoryFileSchema = DoctorLazy(() =>
  zodStrictObject({
    version: literal(MEMORY_VERSION),
    entries: record(string(), record(string(), memoryEntrySchema())),
  }),
);
var versionOnlySchema = DoctorLazy(() =>
  u({
    version: E(),
  }),
);
var NEWER_FORMAT = Symbol("newer format");
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
//@ chunk-bwyr6h72.js:4683-4907 placement = getCustomHeaders (1)
function getCustomHeaders() {
  let customHeadersEnv = env.ANTHROPIC_CUSTOM_HEADERS;
  if (!customHeadersEnv) return "";
  let r = [];
  for (let line of customHeadersEnv.split(/\n|\r\n/)) {
    let colonIdx = line.indexOf(":");
    if (colonIdx !== -1) r.push(line.slice(0, colonIdx).trim().toLowerCase());
  }
  return r
    .filter((n) => n !== "")
    .sort()
    .join(",");
}
//@ chunk-bwyr6h72.js:4907-5726 placement
async function PACKAGE_INFO(
  e,
  r,
  n = {
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
    let f = e === "vertex" ? await getGcpIdentityFingerprint() : await readAwsSharedConfig();
    if (f === undefined) return;
    let c = await r();
    return createHash("sha256")
      .update([e, MEMORY_FORMAT_TAG, n, ...c.map((s) => s ?? ""), f].join("\x00"))
      .digest("hex")
      .slice(0, 24);
  } catch (error) {
    logForDebugging(`${LOG_PREFIX} not used this start: ${getErrnoCode(error) ?? "unknown"}`);
    return;
  }
}
//@ chunk-bwyr6h72.js:5726-5804 placement
var accessMemoryCache = memoizeWithTTLAsync(async (path) => {
  let accessMemory = await readAccessMemory(path);
  return accessMemory === NEWER_FORMAT ? {} : accessMemory;
});
var noopMemorySetterCache = memoizeWithTTLAsync(async (e) => {});
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
  let f = versionOnlySchema().safeParse(parsed);
  if (f.success && f.data.version > MEMORY_VERSION) return NEWER_FORMAT;
  let c = memoryFileSchema().safeParse(parsed);
  if (!c.success) {
    logForDebugging(`${LOG_PREFIX} file not in this format; ignoring it`);
    return {};
  }
  return c.data.entries;
}
//@ chunk-bwyr6h72.js:6310-6519 placement
function toRememberedState(e, r) {
  if (e === undefined || e.at > r) return;
  if (e.s === "ok")
    return r - e.at <= OK_TTL_MS
      ? {
          state: "ok",
          at: e.at,
        }
      : undefined;
  if (r - e.at > REFUSED_TTL_MS) return;
  return {
    state: "refused",
    at: e.at,
    ...(e.rc !== undefined &&
      e.rc <= r && {
        recheckClaimedAt: e.rc,
      }),
  };
}
//@ chunk-bwyr6h72.js:6519-6593 placement
/**
 * 取某作用域下某模型已记忆的访问结论。
 */
async function rememberedAccess(e, r, n = Date.now()) {
  return toRememberedState((await accessMemoryCache(accessMemoryPath()))[e]?.[r], n);
}
//@ chunk-bwyr6h72.js:6593-6691 placement
function shouldRecheckRefusal(e, r = Date.now()) {
  return e.state === "refused" && r - Math.max(e.at, e.recheckClaimedAt ?? 0) >= RECHECK_CLAIM_MS;
}
//@ chunk-bwyr6h72.js:6691-7066 placement
/**
 * 串行地读取-修改-原子写入模型访问记忆文件（按作用域与模型更新一条记录），返回更新后的记录；无盘模式只调用更新函数。
 */
function updateAccessMemory(e, r, n, f) {
  if (isDiskless()) return Promise.resolve(n(undefined));
  let path = accessMemoryPath();
  let a = noopMemorySetterCache(path)
    .then(async () => {
      let accessMemory = await readAccessMemory(path);
      if (accessMemory === NEWER_FORMAT) return n(undefined);
      let l = pruneAccessMemory(accessMemory, e, r, n, f);
      try {
        let fileReader = getFileReader();
        await fileReader.mkdir(dirname(path));
        await fileReader.atomicWrite(
          path,
          jsonStringify({
            version: MEMORY_VERSION,
            entries: l,
          }),
          384,
        );
      } catch (error) {
        logForDebugging(`${LOG_PREFIX} write failed: ${getErrnoCode(error) ?? "unknown"}`);
      }
      return l[e]?.[r];
    })
    .catch(() => {
      return;
    });
  noopMemorySetterCache.cache.set(
    path,
    a.then(() => {}),
  );
  return a;
}
//@ chunk-bwyr6h72.js:7066-7159 placement
function updateAccessMemoryCache(e, r, n, f) {
  let c = accessMemoryPath();
  let s = accessMemoryCache(c);
  accessMemoryCache.cache.set(
    c,
    s.then(
      (a) => pruneAccessMemory(a, e, r, () => n, f),
      () => ({}),
    ),
  );
}
//@ chunk-bwyr6h72.js:7159-7247 placement
/**
 * 记录某模型的访问结论（可访问或拒绝）。
 */
async function recordAccessVerdict(e, r, n, f = Date.now()) {
  let c = {
    s: n,
    at: f,
  };
  updateAccessMemoryCache(e, r, c, f);
  await updateAccessMemory(e, r, () => c, f);
}
//@ chunk-bwyr6h72.js:7247-7327 placement
async function forgetAccessVerdict(e, r, n = Date.now()) {
  updateAccessMemoryCache(e, r, undefined, n);
  await updateAccessMemory(
    e,
    r,
    () => {
      return;
    },
    n,
  );
}
//@ chunk-bwyr6h72.js:7327-7581 placement
async function claimRecheck(e, r, n = Date.now()) {
  let f = false;
  let c = await updateAccessMemory(
    e,
    r,
    (a) => {
      let rememberedState = toRememberedState(a, n);
      if (rememberedState !== undefined && shouldRecheckRefusal(rememberedState, n)) {
        f = true;
        return {
          s: "refused",
          at: rememberedState.at,
          rc: n,
        };
      }
      return a;
    },
    n,
  );
  updateAccessMemoryCache(e, r, c, n);
  if (f)
    return {
      claimed: true,
    };
  let rememberedState = toRememberedState(c, n);
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
function pruneAccessMemory(e, r, n, f, c) {
  let s = {};
  for (let [key, value] of Object.entries(e)) {
    let h = {};
    for (let [key, value_2] of Object.entries(value)) {
      let w = value_2.s === "ok" ? OK_RETENTION_MS : REFUSED_TTL_MS;
      if (value_2.at <= c + w && c - value_2.at <= w) h[key] = value_2;
    }
    s[key] = h;
  }
  let a = f(s[r]?.[n]);
  let g = {
    ...s[r],
  };
  delete g[n];
  if (a !== undefined) g[n] = a;
  s[r] = Object.fromEntries(
    Object.entries(g)
      .sort(([, l], [, m]) => m.at - l.at)
      .slice(0, MAX_MODELS_PER_SCOPE),
  );
  return Object.fromEntries(
    Object.entries(s)
      .filter(([, value]) => Object.keys(value).length > 0)
      .sort(([, l], [, m]) => maxEntryTimestamp(m) - maxEntryTimestamp(l))
      .slice(0, MAX_SCOPES),
  );
}
//@ chunk-bwyr6h72.js:8025-8091 placement
function maxEntryTimestamp(e) {
  return Math.max(...Object.values(e).map((r) => r.at));
}
//@ chunk-bwyr6h72.js:8091-8212 placement
function getStatusCode(e) {
  if (typeof e !== "object" || e === null || !("status" in e)) return;
  return typeof e.status === "number" ? e.status : undefined;
}
//@ chunk-bwyr6h72.js:8212-8363 placement
function classifyAccessFailure(e, error) {
  if (e === "refused" || e === "denied") return e;
  let statusCode = getStatusCode(error);
  return e === "credential" ||
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
async function checkRememberedModelAccess(e, r, n, f, c) {
  let modelAccess = await resolveModelAccess(e, r, n, f, c);
  c?.onVerdict?.(modelAccess.verdict, modelAccess.rememberedAt);
  return modelAccess.verdict;
}
//@ chunk-bwyr6h72.js:8477-8928 placement
/**
 * 判定第三方模型是否可用：非 live 时先用记忆中的结论（默认模型的拒绝可认领复查），否则实际探测并记忆结果。
 */
async function resolveModelAccess(e, r, n, f, c) {
  if (r !== undefined && !c?.live) {
    let s = await rememberedAccess(r, n);
    let a = false;
    if (s !== undefined && c?.isDefault && shouldRecheckRefusal(s)) {
      let l = await claimRecheck(r, n);
      a = l.claimed;
      s = l.claimed ? undefined : l.current;
    }
    if (s !== undefined) {
      logForDebugging(`${LOG_PREFIX} ${e} ${n}: ${s.state} (remembered)`);
      return {
        verdict: s.state === "ok" ? "accessible" : "refused",
        rememberedAt: s.at,
      };
    }
    let g = await decideRememberedModelAccess(e, r, n, f, c);
    if (a && g === "denied") {
      recordAccessVerdict(r, n, "refused");
      return {
        verdict: "refused",
      };
    }
    return {
      verdict: g,
    };
  }
  return {
    verdict: await decideRememberedModelAccess(e, r, n, f, c),
  };
}
//@ chunk-bwyr6h72.js:8928-10421 placement
async function decideRememberedModelAccess(e, r, n, f, c) {
  let s = await f();
  let a = s.accessible ? undefined : classifyProviderModelError(e, s.error);
  if (a === "outdated") {
    let F = c?.versionTooOld === "unavailable";
    let G = F ? "not switching to it" : "keeping it, so the first request shows the update message";
    logForDebugging(
      `${LOG_PREFIX} ${e} ${n}: needs a newer Claude Code than ${
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
      }; ${G} (not saved; any earlier answer cleared)`,
    );
    if (r !== undefined) forgetAccessVerdict(r, n);
    return F ? "failed" : "accessible";
  }
  if (r !== undefined && (s.accessible || a === "refused"))
    recordAccessVerdict(r, n, s.accessible ? "ok" : "refused");
  if (s.accessible || a === undefined) return "accessible";
  let g = classifyAccessFailure(a, s.error);
  let statusCode = getStatusCode(s.error);
  let m = statusCode !== undefined ? null : extractConnectionErrorDetails(s.error);
  let h =
    s.error instanceof APIConnectionTimeoutError
      ? "timeout"
      : statusCode !== undefined
        ? `HTTP ${statusCode}`
        : m !== null
          ? stripIgnorables(m.code)
          : s.error instanceof APIConnectionError
            ? "connection error"
            : "no HTTP status";
  let b = m?.message ?? errorMessage(s.error);
  let A = statusCode !== undefined ? `${statusCode} ` : m !== null ? `${m.code}: ` : undefined;
  let w = stripIgnorables(A !== undefined && b.startsWith(A) ? b.slice(A.length) : b);
  logForDebugging(
    `${LOG_PREFIX} ${e} ${n}: check failed: ${VERDICT_DESCRIPTIONS[g]} (${a === "credential" ? "a credential error, " : ""}${h}: ${truncateAtWord(w, NEWER_MEMORY_FORMAT)})`,
    {
      level: g === "refused" || g === "denied" ? "debug" : "error",
    },
  );
  return g;
}
//@ chunk-bwyr6h72.js:10421-10736 placement
/**
 * 按分组顺序探测候选模型（并行），返回第一个可用者；都不可用时在截止时间前对记忆为拒绝的候选做一次 live 复查。
 */
async function findFirstAccessibleModel(e, r, n, f) {
  let c = [];
  for (let a of e) {
    let results = await Promise.all(a.map(n));
    let results_2 = await Promise.all(a.map((h) => r(h, false)));
    let found = a.find((h, b) => results_2[b]);
    if (found !== undefined) return found;
    c.push(...a.filter((h, b) => results[b]));
  }
  if (c.length === 0 || Date.now() > f) return;
  let results = await Promise.all(c.map((a) => r(a, true)));
  return c.find((a, g) => results[g]);
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
