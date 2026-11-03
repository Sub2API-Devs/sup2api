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
import { join, join as join_2, dirname } from "path";
import { createHash } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { o, u, Ir, zodStrictObject, T, E, pe } from "../../../vendor/zod/v4/classic/schemas.js";
import { O_NONBLOCK, ws } from "../fsFlags.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { logForDebugging } from "../debug.js";
import { isENOENT, getErrnoCode, errorMessage } from "../errors.js";
import { memoizeWithTTLAsync } from "../memoize.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { THn } from "../networkPaths.js";
import { env } from "../env.js";
import { PVn, getGcloudConfigDir } from "../gcloudConfigDir.js";
import { safeParseJSON } from "../json.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { hasCustomApiKeyHeader, bearerFromEnvOrHeaders } from "../../services/api/customHeaders.js";
import { isDiskless } from "../../bootstrap/state.js";
import { getFileReader } from "../fileStore.js";
import { jsonStringify } from "../slowOperations.js";
import { classifyProviderModelError } from "../../services/api/providerModelErrors.js";
import { extractConnectionErrorDetails } from "../../services/api/errorUtils.js";
import { fT, ef } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { stripIgnorables } from "../sanitization.js";
import { truncateAtWord } from "../stringUtils.js";

/**
 * 第三方模型访问记忆用常量：身份文件大小上限、AWS 配置中影响身份的键、gcloud ADC 文件中的键及其解析 schema。
 */
//@ chunk-bwyr6h72.js:1088-1518 placement
var MAX_IDENTITY_FILE_BYTES = 4194304,
  Q = 5,
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
  ],
  GCP_ADC_KEYS = [
    "type",
    "client_email",
    "audience",
    "service_account_impersonation_url",
    "quota_project_id",
  ],
  adcFileSchema = DoctorLazy(() => {
    let e = o()
      .optional()
      .catch(void 0);
    return u({
      type: e,
      client_email: e,
      audience: e,
      service_account_impersonation_url: e,
      quota_project_id: e,
    });
  });
/**
 * 以非阻塞只读方式读取 AWS/gcloud 身份文件（必须是普通文件且不超过 4MB），返回文本与 mtime；不存在返回空文本，其他错误返回 undefined。
 */
//@ chunk-bwyr6h72.js:1518-2090 placement
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
      let alloc = Buffer.alloc(stats.size),
        offset = 0;
      while (offset < stats.size) {
        let { bytesRead: bytesRead } = await handle.read(alloc, offset, stats.size - offset, offset);
        if (bytesRead === 0) break;
        offset += bytesRead;
      }
      return { text: alloc.subarray(0, offset).toString("utf8"), mtimeMs: stats.mtimeMs };
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (isENOENT(error)) return { text: "" };
    logForDebugging(`[3p-model-memory] identity file unreadable: ${getErrnoCode(error) ?? "unknown"}`);
    return;
  }
}
//@ chunk-bwyr6h72.js:2090-2984 placement
var readAwsSharedConfig = memoizeWithTTLAsync(
  async () => {
    let { getHomeDir: getHomeDir, loadSharedConfigFiles: loadSharedConfigFiles } =
        await import("./chunk-72ngr4xp.js").then((m) => Re(m.default, 1)),
      n = getHomeDir(),
      f = THn(env.AWS_CONFIG_FILE || join_2(n, ".aws", "config"), n),
      c = THn(env.AWS_SHARED_CREDENTIALS_FILE || join_2(n, ".aws", "credentials"), n);
    if ((await Promise.all([readIdentityFile(f), readIdentityFile(c)])).includes(void 0)) return;
    try {
      let { configFile: configFile, credentialsFile: credentialsFile } = await loadSharedConfigFiles({
          configFilepath: f,
          filepath: c,
          ignoreCache: !0,
        }),
        l = [],
        m = env.AWS_PROFILE || "default";
      for (let h = 0; m && h <= Q; h++) {
        let b = { ...configFile[m], ...credentialsFile[m] };
        l.push(`profile=${m}`);
        for (let A of AWS_IDENTITY_KEYS) l.push(`${A}=${b[A] ?? ""}`);
        if (b.sso_session) {
          let A = configFile[`sso-session.${b.sso_session}`];
          l.push(`sso_session_start_url=${A?.sso_start_url ?? ""}`);
        }
        (l.push(`aws_access_key_id=${b.aws_access_key_id ?? ""}`),
          (m = b.source_profile && b.source_profile !== m ? b.source_profile : void 0));
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
function readGcloudCoreConfig(e) {
  let r = !1,
    n = {};
  for (let f of e.split(/\r?\n/)) {
    let trimmed = f.trim(),
      match = /^\[(.+)\]$/.exec(trimmed);
    if (match) {
      r = match[1].trim() === "core";
      continue;
    }
    let match_2 = /^(project|account)\s*=\s*(.*)$/.exec(trimmed);
    if (r && match_2) n[match_2[1]] = match_2[2].trim();
  }
  return [`project=${n.project ?? ""}`, `account=${n.account ?? ""}`];
}
/**
 * 计算 GCP 身份指纹（按 TTL 缓存）：当前 gcloud 配置名、core 段 project/account、ADC 文件中的关键字段（authorized_user 时加文件 mtime）。
 */
//@ chunk-bwyr6h72.js:3257-3867 placement
var getGcpIdentityFingerprint = memoizeWithTTLAsync(
  async () => {
    let configDir = PVn(),
      activeConfig = await readIdentityFile(join_2(configDir, "active_config"));
    if (activeConfig === void 0) return;
    let configName = env.CLOUDSDK_ACTIVE_CONFIG_NAME || activeConfig.text.trim() || "default",
      adcPath =
        env.GOOGLE_APPLICATION_CREDENTIALS ||
        env.google_application_credentials ||
        join_2(getGcloudConfigDir(), "application_default_credentials.json"),
      [configFile, adcFile] = await Promise.all([
        readIdentityFile(join_2(configDir, "configurations", `config_${configName}`)),
        readIdentityFile(adcPath),
      ]);
    if (configFile === void 0 || adcFile === void 0) return;
    let parts = [`config=${configName}`, ...readGcloudCoreConfig(configFile.text)],
      parsed = adcFile.text ? adcFileSchema().safeParse(safeParseJSON(adcFile.text, !1)) : void 0,
      adc = parsed?.success ? parsed.data : {};
    for (let key of GCP_ADC_KEYS) parts.push(`${key}=${adc[key] ?? ""}`);
    if (adc.type === "authorized_user") parts.push(`adc_file=${adcFile.mtimeMs}`);
    return parts.join(`
`);
  },
  () => "gcp",
);
/**
 * 模型访问记忆常量：可用/拒绝结论的有效期与保留期、文件版本与大小上限、作用域与每作用域条目上限、日志前缀、结论说明、文件 schema 与"更新格式"标记。
 */
//@ chunk-bwyr6h72.js:3867-4376 placement
var OK_TTL_MS = 900000,
  REFUSED_TTL_MS = 86400000,
  RECHECK_CLAIM_MS = 600000,
  OK_RETENTION_MS = 604800000,
  MEMORY_FORMAT_TAG = "1",
  MEMORY_VERSION = 1,
  MAX_MEMORY_BYTES = 65536,
  MAX_SCOPES = 16,
  MAX_MODELS_PER_SCOPE = 32,
  LOG_PREFIX = "[3p-model-memory]",
  le = 300,
  VERDICT_DESCRIPTIONS = {
    refused: "the provider refuses this model for the account",
    denied: "an IAM or SCP policy denies the call",
    temporary: "nothing learned about the model",
    failed: "a failure this build cannot interpret",
  },
  memoryEntrySchema = DoctorLazy(() =>
    Ir("s", [
      zodStrictObject({ s: T("ok"), at: E() }),
      zodStrictObject({ s: T("refused"), at: E(), rc: E().optional() }),
    ]),
  ),
  memoryFileSchema = DoctorLazy(() =>
    zodStrictObject({ version: T(MEMORY_VERSION), entries: pe(o(), pe(o(), memoryEntrySchema())) }),
  ),
  versionOnlySchema = DoctorLazy(() => u({ version: E() })),
  NEWER_FORMAT = Symbol("newer format");
//@ chunk-bwyr6h72.js:4376-4434 placement
function CVn() {
  return join(getClaudeConfigDir(), "cache", "model-access.json");
}
//@ chunk-bwyr6h72.js:4434-4503 placement
function FWs() {
  return join(getClaudeConfigDir(), "cache", "provider-probe-verdicts.json");
}
//@ chunk-bwyr6h72.js:4503-4683 placement
function hasStaticProviderCredential() {
  return (
    Boolean(env.AWS_BEARER_TOKEN_BEDROCK) ||
    Boolean(env.CLOUDSDK_AUTH_ACCESS_TOKEN) ||
    Boolean(env.CLAUDE_CODE_SKIP_VERTEX_AUTH && env.ANTHROPIC_API_KEY) ||
    hasCustomApiKeyHeader() ||
    bearerFromEnvOrHeaders() !== void 0
  );
}
//@ chunk-bwyr6h72.js:4683-4907 placement = getCustomHeaders (1)
function getCustomHeaders() {
  let customHeadersEnv = env.ANTHROPIC_CUSTOM_HEADERS;
  if (!customHeadersEnv) return "";
  let r = [];
  for (let n of customHeadersEnv.split(/\n|\r\n/)) {
    let colonIdx = n.indexOf(":");
    if (colonIdx !== -1) r.push(n.slice(0, colonIdx).trim().toLowerCase());
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
    if (f === void 0) return;
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
var P = memoizeWithTTLAsync(async (e) => {
    let r = await readAccessMemory(e);
    return r === NEWER_FORMAT ? {} : r;
  }),
  N = memoizeWithTTLAsync(async (e) => {});
/**
 * 读取模型访问记忆文件（不跟随符号链接，最多 64KB）：版本更新时返回 NEWER_FORMAT 标记，格式不符或读失败返回空表。
 */
//@ chunk-bwyr6h72.js:5804-6310 placement
async function readAccessMemory(path) {
  if (isDiskless()) return {};
  let bytes;
  try {
    let reader = getFileReader();
    if (ws === 0) {
      let stats = await reader.lstat(path);
      if (stats !== void 0 && !stats.isFile) return {};
    }
    bytes = await reader.readTail(path, MAX_MEMORY_BYTES + 1, { noFollow: !0 });
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`${LOG_PREFIX} read failed: ${getErrnoCode(error) ?? "unknown"}`);
    return {};
  }
  if (bytes.length > MAX_MEMORY_BYTES)
    return (logForDebugging(`${LOG_PREFIX} file over 64 KB; ignoring it`), {});
  let parsed = safeParseJSON(bytes.toString("utf8"), !1),
    safeParse = versionOnlySchema().safeParse(parsed);
  if (safeParse.success && safeParse.data.version > MEMORY_VERSION) return NEWER_FORMAT;
  let safeParse_2 = memoryFileSchema().safeParse(parsed);
  if (!safeParse_2.success)
    return (logForDebugging(`${LOG_PREFIX} file not in this format; ignoring it`), {});
  return safeParse_2.data.entries;
}
//@ chunk-bwyr6h72.js:6310-6519 placement
function toRememberedState(e, r) {
  if (e === void 0 || e.at > r) return;
  if (e.s === "ok") return r - e.at <= OK_TTL_MS ? { state: "ok", at: e.at } : void 0;
  if (r - e.at > REFUSED_TTL_MS) return;
  return { state: "refused", at: e.at, ...(e.rc !== void 0 && e.rc <= r && { recheckClaimedAt: e.rc }) };
}
//@ chunk-bwyr6h72.js:6519-6593 placement
async function _ze(e, r, n = Date.now()) {
  return toRememberedState((await P(CVn()))[e]?.[r], n);
}
//@ chunk-bwyr6h72.js:6593-6691 placement
function W(e, r = Date.now()) {
  return e.state === "refused" && r - Math.max(e.at, e.recheckClaimedAt ?? 0) >= RECHECK_CLAIM_MS;
}
/**
 * 串行地读取-修改-原子写入模型访问记忆文件（按作用域与模型更新一条记录），返回更新后的记录；无盘模式只调用更新函数。
 */
//@ chunk-bwyr6h72.js:6691-7066 placement
function updateAccessMemory(e, r, n, f) {
  if (isDiskless()) return Promise.resolve(n(void 0));
  let c = CVn(),
    a = N(c)
      .then(async () => {
        let g = await readAccessMemory(c);
        if (g === NEWER_FORMAT) return n(void 0);
        let l = pruneAccessMemory(g, e, r, n, f);
        try {
          let m = getFileReader();
          (await m.mkdir(dirname(c)),
            await m.atomicWrite(c, jsonStringify({ version: MEMORY_VERSION, entries: l }), 384));
        } catch (error) {
          logForDebugging(`${LOG_PREFIX} write failed: ${getErrnoCode(error) ?? "unknown"}`);
        }
        return l[e]?.[r];
      })
      .catch(() => {
        return;
      });
  return (
    N.cache.set(
      c,
      a.then(() => {}),
    ),
    a
  );
}
//@ chunk-bwyr6h72.js:7066-7159 placement
function D(e, r, n, f) {
  let c = CVn(),
    s = P(c);
  P.cache.set(
    c,
    s.then(
      (a) => pruneAccessMemory(a, e, r, () => n, f),
      () => ({}),
    ),
  );
}
//@ chunk-bwyr6h72.js:7159-7247 placement
async function bze(e, r, n, f = Date.now()) {
  let c = { s: n, at: f };
  (D(e, r, c, f), await updateAccessMemory(e, r, () => c, f));
}
//@ chunk-bwyr6h72.js:7247-7327 placement
async function Ee(e, r, n = Date.now()) {
  (D(e, r, void 0, n),
    await updateAccessMemory(
      e,
      r,
      () => {
        return;
      },
      n,
    ));
}
//@ chunk-bwyr6h72.js:7327-7581 placement
async function claimRecheck(e, r, n = Date.now()) {
  let f = !1,
    c = await updateAccessMemory(
      e,
      r,
      (a) => {
        let g = toRememberedState(a, n);
        if (g !== void 0 && W(g, n)) return ((f = !0), { s: "refused", at: g.at, rc: n });
        return a;
      },
      n,
    );
  if ((D(e, r, c, n), f)) return { claimed: !0 };
  let s = toRememberedState(c, n);
  return s === void 0 ? { claimed: !1 } : { claimed: !1, current: s };
}
/**
 * 清理访问记忆：去掉过期记录，更新指定条目，每个作用域只保留最近的若干模型，并只保留最近使用的若干作用域。
 */
//@ chunk-bwyr6h72.js:7581-8025 placement
function pruneAccessMemory(e, r, n, f, c) {
  let s = {};
  for (let [l, m] of Object.entries(e)) {
    let h = {};
    for (let [b, A] of Object.entries(m)) {
      let w = A.s === "ok" ? OK_RETENTION_MS : REFUSED_TTL_MS;
      if (A.at <= c + w && c - A.at <= w) h[b] = A;
    }
    s[l] = h;
  }
  let a = f(s[r]?.[n]),
    g = { ...s[r] };
  if ((delete g[n], a !== void 0)) g[n] = a;
  return (
    (s[r] = Object.fromEntries(
      Object.entries(g)
        .sort(([, l], [, m]) => m.at - l.at)
        .slice(0, MAX_MODELS_PER_SCOPE),
    )),
    Object.fromEntries(
      Object.entries(s)
        .filter(([, l]) => Object.keys(l).length > 0)
        .sort(([, l], [, m]) => I(m) - I(l))
        .slice(0, MAX_SCOPES),
    )
  );
}
//@ chunk-bwyr6h72.js:8025-8091 placement
function I(e) {
  return Math.max(...Object.values(e).map((r) => r.at));
}
//@ chunk-bwyr6h72.js:8091-8212 placement
function getStatusCode(e) {
  if (typeof e !== "object" || e === null || !("status" in e)) return;
  return typeof e.status === "number" ? e.status : void 0;
}
//@ chunk-bwyr6h72.js:8212-8363 placement
function classifyAccessFailure(e, r) {
  if (e === "refused" || e === "denied") return e;
  let n = getStatusCode(r);
  return e === "credential" || n === void 0 || n === 408 || n === 429 || n >= 500 ? "temporary" : "failed";
}
/**
 * 判定第三方模型访问（优先用记忆），回调通知结论并返回。
 */
//@ chunk-bwyr6h72.js:8363-8477 placement
async function checkRememberedModelAccess(e, r, n, f, c) {
  let s = await resolveModelAccess(e, r, n, f, c);
  return (c?.onVerdict?.(s.verdict, s.rememberedAt), s.verdict);
}
/**
 * 判定第三方模型是否可用：非 live 时先用记忆中的结论（默认模型的拒绝可认领复查），否则实际探测并记忆结果。
 */
//@ chunk-bwyr6h72.js:8477-8928 placement
async function resolveModelAccess(e, r, n, f, c) {
  if (r !== void 0 && !c?.live) {
    let s = await _ze(r, n),
      a = !1;
    if (s !== void 0 && c?.isDefault && W(s)) {
      let l = await claimRecheck(r, n);
      ((a = l.claimed), (s = l.claimed ? void 0 : l.current));
    }
    if (s !== void 0)
      return (
        logForDebugging(`${LOG_PREFIX} ${e} ${n}: ${s.state} (remembered)`),
        { verdict: s.state === "ok" ? "accessible" : "refused", rememberedAt: s.at }
      );
    let g = await decideRememberedModelAccess(e, r, n, f, c);
    if (a && g === "denied") return (bze(r, n, "refused"), { verdict: "refused" });
    return { verdict: g };
  }
  return { verdict: await decideRememberedModelAccess(e, r, n, f, c) };
}
//@ chunk-bwyr6h72.js:8928-10421 placement
async function decideRememberedModelAccess(e, r, n, f, c) {
  let s = await f(),
    a = s.accessible ? void 0 : classifyProviderModelError(e, s.error);
  if (a === "outdated") {
    let F = c?.versionTooOld === "unavailable",
      G = F ? "not switching to it" : "keeping it, so the first request shows the update message";
    if (
      (logForDebugging(
        `${LOG_PREFIX} ${e} ${n}: needs a newer Claude Code than ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}; ${G} (not saved; any earlier answer cleared)`,
      ),
      r !== void 0)
    )
      Ee(r, n);
    return F ? "failed" : "accessible";
  }
  if (r !== void 0 && (s.accessible || a === "refused")) bze(r, n, s.accessible ? "ok" : "refused");
  if (s.accessible || a === void 0) return "accessible";
  let g = classifyAccessFailure(a, s.error),
    l = getStatusCode(s.error),
    m = l !== void 0 ? null : extractConnectionErrorDetails(s.error),
    h =
      s.error instanceof fT
        ? "timeout"
        : l !== void 0
          ? `HTTP ${l}`
          : m !== null
            ? stripIgnorables(m.code)
            : s.error instanceof ef
              ? "connection error"
              : "no HTTP status",
    b = m?.message ?? errorMessage(s.error),
    A = l !== void 0 ? `${l} ` : m !== null ? `${m.code}: ` : void 0,
    w = stripIgnorables(A !== void 0 && b.startsWith(A) ? b.slice(A.length) : b);
  return (
    logForDebugging(
      `${LOG_PREFIX} ${e} ${n}: check failed: ${VERDICT_DESCRIPTIONS[g]} (${a === "credential" ? "a credential error, " : ""}${h}: ${truncateAtWord(w, le)})`,
      { level: g === "refused" || g === "denied" ? "debug" : "error" },
    ),
    g
  );
}
/**
 * 按分组顺序探测候选模型（并行），返回第一个可用者；都不可用时在截止时间前对记忆为拒绝的候选做一次 live 复查。
 */
//@ chunk-bwyr6h72.js:10421-10736 placement
async function findFirstAccessibleModel(e, r, n, f) {
  let c = [];
  for (let a of e) {
    let results = await Promise.all(a.map(n)),
      results_2 = await Promise.all(a.map((h) => r(h, !1))),
      found = a.find((h, b) => results_2[b]);
    if (found !== void 0) return found;
    c.push(...a.filter((h, b) => results[b]));
  }
  if (c.length === 0 || Date.now() > f) return;
  let results = await Promise.all(c.map((a) => r(a, !0)));
  return c.find((a, g) => results[g]);
}

export {
  CVn,
  FWs,
  REFUSED_TTL_MS,
  findFirstAccessibleModel,
  _ze,
  checkRememberedModelAccess,
  bze,
  PACKAGE_INFO,
  getCustomHeaders,
};
