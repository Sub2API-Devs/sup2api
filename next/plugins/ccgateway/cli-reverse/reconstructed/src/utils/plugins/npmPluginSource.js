/**
 * utils/plugins/npmPluginSource.ts
 *
 * 2.1.316 新增：npm 插件来源
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (62)
 * attribution: placement 61, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readlink, readdir, writeFile, chmod } from "fs/promises";
import { promisify } from "util";
import { gunzip } from "zlib";
import { join, dirname } from "path";
import { createHash } from "crypto";
import { getPlatform } from "../platform.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../../vendor/semver/index.js";
import { subprocessEnv, hipaaWithholdsChildCredentials } from "../subprocessEnv.js";
import { isCalmEagleOn } from "../settings/settingsSourceTrust.js";
import { GITHUB_HOST, normalizeHostCached } from "../git/githubUrl.js";
import { redactUrlsInMessage, redactUrlsInText } from "../redaction/urlRedaction.js";
import { buildNpmRegistryArgs } from "./pluginLoader.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { isHttpUrl as isHttpUrl_2, isValidNpmPackageName } from "./schemas.js";
import { pickByHelper } from "../git/gitSafeEnv.js";
import { jsonParse } from "../slowOperations.js";
import { printableName } from "../printableName.js";
import { getFsImplementation } from "../fsOperations.js";
import { logForDebugging } from "../debug.js";
import { firstLineOf } from "../stringUtils.js";
import { getErrnoCode, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { isSafeZipPath } from "../dxt/zip.js";
import { removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2 } from "../fsRemove.js";
import { npmResolutionPolicyRefusal } from "./marketplacePolicy.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { npmMarketplaceDefaultOff } from "./pluginDependencies.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4493035-4493225 placement
/**
 * Linux/WSL 上经 /proc/self/fd 取文件描述符的真实路径。
 */
async function fdRealPath(fd) {
  let platform = getPlatform();
  if (platform !== "linux" && platform !== "wsl") return null;
  try {
    let target = await readlink(`/proc/self/fd/${fd}`);
    return target.startsWith("/") && !target.endsWith(" (deleted)") ? target : null;
  } catch {
    return null;
  }
}
//@ chunk-5xgkngpb.js:4493225-4493244 placement
/**
 * semverCompat：npm semver 的 CommonJS 包装（包下载用）。
 */
var semverCompat; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4493225", () => {
  semverCompat = __toESM(require_semver_3(), 1);
});
//@ chunk-5xgkngpb.js:4493352-4493370 placement
var semverCompatRequire; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4493352", () => {
  semverCompatRequire = __toESM(require_semver_3(), 1);
});
//@ chunk-5xgkngpb.js:4493482-4493525 placement
var NPM_DISABLE_GIT_ENV = {
  npm_config_ignore_scripts: "true",
};
//@ chunk-5xgkngpb.js:4493525-4493621 placement
/**
 * npmExecEnv：npm 子进程环境（是否继承父环境）。
 */
function npmExecEnv() {
  let env = {
    ...subprocessEnv(),
    ...NPM_DISABLE_GIT_ENV,
  };
  if (!hipaaWithholdsChildCredentials() && isCalmEagleOn())
    return {
      env,
    };
  return {
    env,
    extendEnv: false,
  };
}
//@ chunk-5xgkngpb.js:4493621-4494278 placement
/**
 * npm 下载相关的常量组（32 个绑定）：Y_s npm view 超时 60 s；Q_s registry 查询超时 30 s；Z_s npm pack 超时 300 s；eSs npm 子进程输出上限 8 MiB；uDe tar 块 1 MiB；tSs/nSs/aSs 每块数（256/512/256）与 Qct/Ozn/Izn 三个体积上限；Dzn 条目数上限 1e5；lSs/dSs/cSs 错误与名称展示长度；e5/fSs 是 tar 头长度 512 与权限位掩码 493；SSs 类型位掩码 73；rft/bSs/wSs/TSs/vSs/RSs 是 tar 的大小、可打印判定与进制常量；Ox 是 tar 头各字段的偏移；CSs/ASs/PSs/MSs/OSs 是 npm view 字段、校验算法、包名与归档后缀正则、git 托管站；ISs/DSs 是校验和字段的起止下标；LSs 是 promisify 后的 gunzip。
 */
var NPM_VIEW_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NPM_REGISTRY_QUERY_TIMEOUT_MS;
var NPM_PACK_TIMEOUT_MS;
var NPM_EXEC_MAX_BUFFER;
var TAR_CHUNK_BYTES;
var TAR_BLOCK_SIZE;
var TAR_MAX_HEADER_CHUNKS;
var TAR_FIELD_CHUNKS;
var MAX_PACKUMENT_BYTES;
var MAX_TARBALL_BYTES;
var MAX_SINGLE_ENTRY_BYTES;
var MAX_TARBALL_ENTRIES;
var MAX_NPM_ERROR_LENGTH;
var MAX_PACKAGE_NAME_DISPLAY;
var MAX_TAR_ENTRY_TYPE_DISPLAY;
var TAR_HEADER_BYTES;
var FILE_MODE_PERMISSION_BITS;
var FILE_MODE_TYPE_BITS;
var PRINTABLE_CHAR_MIN;
var NON_PRINTABLE_CHAR_CODE;
var BINARY_MODE_FLAG;
var BINARY_BASE;
var OCTAL_RADIX;
var DECIMAL_RADIX;
var TAR_HEADER_FIELDS;
var NPM_VIEW_FIELDS;
var INTEGRITY_ALGORITHMS;
var NPM_PACKAGE_NAME_RE;
var ARCHIVE_SUFFIX_RE;
var GIT_HOSTING_PROVIDERS;
var CHECKSUM_OFFSET;
var CHECKSUM_END;
var gunzipTarball;
deferInit("chunk-5xgkngpb.js:4493621", () => {
  NPM_VIEW_TIMEOUT_MS = 60000;
  NPM_REGISTRY_QUERY_TIMEOUT_MS = 30000;
  NPM_PACK_TIMEOUT_MS = 300000;
  NPM_EXEC_MAX_BUFFER = 8388608;
  TAR_CHUNK_BYTES = 1048576;
  TAR_BLOCK_SIZE = 256;
  TAR_MAX_HEADER_CHUNKS = 512;
  TAR_FIELD_CHUNKS = 256;
  MAX_PACKUMENT_BYTES = TAR_BLOCK_SIZE * TAR_CHUNK_BYTES;
  MAX_TARBALL_BYTES = TAR_MAX_HEADER_CHUNKS * TAR_CHUNK_BYTES;
  MAX_SINGLE_ENTRY_BYTES = TAR_FIELD_CHUNKS * TAR_CHUNK_BYTES;
  MAX_TARBALL_ENTRIES = 1e5;
  MAX_NPM_ERROR_LENGTH = 300;
  MAX_PACKAGE_NAME_DISPLAY = 120;
  MAX_TAR_ENTRY_TYPE_DISPLAY = 4;
  TAR_HEADER_BYTES = 512;
  FILE_MODE_PERMISSION_BITS = 493;
  FILE_MODE_TYPE_BITS = 73;
  PRINTABLE_CHAR_MIN = 32;
  NON_PRINTABLE_CHAR_CODE = 127;
  BINARY_MODE_FLAG = 128;
  BINARY_BASE = 256;
  OCTAL_RADIX = 8;
  DECIMAL_RADIX = 10;
  TAR_HEADER_FIELDS = {
    name: [0, 100],
    mode: [100, 8],
    size: [124, 12],
    checksum: [148, 8],
    typeflag: [156, 1],
    magic: [257, 6],
    prefix: [345, 155],
  };
  NPM_VIEW_FIELDS = ["name", "version", "dist.tarball", "dist.integrity", "dist.shasum", "dist-tags.latest"];
  INTEGRITY_ALGORITHMS = ["sha512", "sha384", "sha256", "sha1"];
  NPM_PACKAGE_NAME_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
  ARCHIVE_SUFFIX_RE = /[.](?:tgz|tar.gz|tar)$/i;
  GIT_HOSTING_PROVIDERS = new Set([
    GITHUB_HOST,
    `gist.${GITHUB_HOST}`,
    "gitlab.com",
    "bitbucket.org",
    "git.sr.ht",
  ]);
  CHECKSUM_OFFSET = TAR_HEADER_FIELDS.checksum[0];
  CHECKSUM_END = TAR_HEADER_FIELDS.checksum[0] + TAR_HEADER_FIELDS.checksum[1];
  gunzipTarball = promisify(gunzip);
});
//@ chunk-5xgkngpb.js:4494278-4495137 placement
/**
 * 用 npm view 解析插件包版本，名字非法时拒绝。
 */
async function resolveNpmPackage(packageName, versionSpec, options) {
  let spec = `${packageName}@${versionSpec ?? "latest"}`;
  if (!isValidNpmPackageNameLoose(packageName))
    throw telemetrySafeError(
      `"${printablePackageName(redactUrlsInMessage(packageName))}" was not fetched: it is not a valid npm package name. Valid names look like "my-plugin" or "@scope/my-plugin".`,
      "npm package name is not a registry name",
    );
  assertNpmVersionSpec(packageName, versionSpec);
  await checkRegistryOverride(packageName, options);
  let viewResult = await runNpm(
    ["view", "--json", ...buildNpmRegistryArgs(options, packageName), "--", spec, ...NPM_VIEW_FIELDS],
    options,
    NPM_VIEW_TIMEOUT_MS,
  );
  if (viewResult.code !== 0)
    throw telemetrySafeError(
      `Could not resolve ${spec} from the npm registry: ` +
        npmErrorSummary(viewResult.stdout, viewResult.stderr),
      "npm view failed",
    );
  let picked = pickNpmVersion(parseNpmViewVersions(viewResult.stdout), versionSpec);
  if (!picked)
    throw telemetrySafeError(
      `Could not resolve ${spec} from the npm registry: no version matches`,
      "npm view returned no versions",
    );
  if (picked.tarballUrl === undefined)
    throw telemetrySafeError(
      `Could not resolve ${spec} from the npm registry: the registry did not report a tarball URL`,
      "npm view returned no tarball",
    );
  return {
    name: picked.name ?? packageName,
    version: picked.version,
    tarballUrl: picked.tarballUrl,
    ...isDefinedValue({
      integrity: picked.integrity,
      shasum: picked.shasum,
    }),
  };
}
//@ chunk-5xgkngpb.js:4495137-4495327 placement
function assertNpmVersionSpec(packageName, versionSpec) {
  if (versionSpec === undefined || isNpmVersionSpec(versionSpec)) return;
  throw telemetrySafeError(
    `${packageName} was not resolved: "${printablePackageName(versionSpec)}" is not a version, a semver range or a dist-tag`,
    "npm version spec is not a version, range or tag",
  );
}
//@ chunk-5xgkngpb.js:4495327-4495539 placement
async function getDefaultHttpNpmRegistry(options) {
  let configResult = await runNpm(
    ["config", "get", "registry", "--workspaces=false"],
    options,
    NPM_REGISTRY_QUERY_TIMEOUT_MS,
  );
  let trimmed = configResult.stdout.trim();
  if (configResult.code !== 0 || !URL.canParse(trimmed)) return;
  let registryUrl = new URL(trimmed);
  return registryUrl.protocol === "http:" ? registryUrl.origin : undefined;
}
//@ chunk-5xgkngpb.js:4495539-4495795 placement
function checkTarballUrl(tarballUrl, registryOrigin, registryOverride, subject = "npm") {
  let reason = validateNpmRegistryUrl(tarballUrl, registryOverride, subject);
  if (reason !== undefined)
    return {
      reason,
      moved: false,
    };
  if (registryOrigin === undefined) return;
  let { pathname } = new URL(tarballUrl);
  let relocatedReason = URL.canParse(pathname, registryOrigin)
    ? validateNpmRegistryUrl(new URL(pathname, registryOrigin).href, registryOverride, subject)
    : "is not an http or https link";
  return relocatedReason === undefined
    ? undefined
    : {
        reason: relocatedReason,
        moved: true,
      };
}
//@ chunk-5xgkngpb.js:4495795-4496506 placement
function validateNpmRegistryUrl(url, registryOrigin, subject) {
  if (!/^https?:\/\//i.test(url) || !URL.canParse(url)) return "is not an http or https link";
  if (/[\s#\\]/.test(url) || hasControlChars_2(url))
    return 'contains a "#", whitespace, a backslash or a control character';
  let parsed = new URL(url);
  let host = normalizeHostCached(parsed.hostname);
  let isGitlabApi =
    host === "gitlab.com" && parsed.pathname.startsWith("/api/v4/") && parsed.pathname.includes("/-/");
  if (GIT_HOSTING_PROVIDERS.has(host) && !isGitlabApi)
    return `is on GitHub, GitLab, Bitbucket or SourceHut, where ${subject} may fetch it as a git repository and run its setup script`;
  if (parsed.pathname.startsWith("//")) return 'starts its path with "//"';
  if (parsed.protocol === "http:" && parsed.origin !== registryOrigin)
    return `is an unencrypted http link on a host other than your npm registry, so ${subject} could send your saved registry token to it in the clear`;
  return;
}
//@ chunk-5xgkngpb.js:4496506-4496608 placement
function hasControlChars_2(text) {
  for (let idx = 0; idx < text.length; idx++) {
    let code = text.charCodeAt(idx);
    if (code < PRINTABLE_CHAR_MIN || code === NON_PRINTABLE_CHAR_CODE) return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:4496608-4496683 placement
/**
 * isNpmVersionSpec：是否为 npm 版本规格。
 */
function isNpmVersionSpec(spec) {
  return (
    !ARCHIVE_SUFFIX_RE.test(spec) &&
    (semverCompatRequire.validRange(spec) !== null || NPM_PACKAGE_NAME_RE.test(spec))
  );
}
//@ chunk-5xgkngpb.js:4496683-4496780 placement
/**
 * runNpm：带禁 git 参数执行 npm。
 */
function runNpm(args, context, timeout) {
  return execFileNoThrowWithCwd(
    "npm",
    [`--git=${join(context.workDir, "git-is-disabled")}`, ...args],
    npmExecOptions(context, timeout),
  );
}
//@ chunk-5xgkngpb.js:4496780-4496935 placement
function npmExecOptions(context, timeout) {
  return {
    cwd: context.workDir,
    timeout,
    maxBuffer: NPM_EXEC_MAX_BUFFER,
    stdin: "ignore",
    ...npmExecEnv(),
    ...(context.toolCgroupClass !== undefined && {
      toolCgroupClass: context.toolCgroupClass,
    }),
  };
}
//@ chunk-5xgkngpb.js:4496935-4497657 placement
/**
 * 检查为插件设置的 npm registry：不是合法 URL 抛 validation 拒绝；http 且不是用户默认 registry 时抛 policy 拒绝（避免明文泄露令牌）。 返回默认 http registry（若是）。
 */
async function checkRegistryOverride(packageName, options) {
  if (options.registry === undefined) return;
  if (!isHttpUrl_2(options.registry))
    throw new NpmFetchRefusal(
      `"${printablePackageName(redactUrlsInMessage(packageName))}" was not fetched: the npm registry set for it is not a valid address.`,
      "npm registry override is not a URL",
      "validation",
    );
  let { origin, protocol } = new URL(options.registry);
  if (protocol !== "http:") return;
  let defaultHttpNpmRegistry = await getDefaultHttpNpmRegistry(options);
  if (origin !== defaultHttpNpmRegistry)
    throw new NpmFetchRefusal(
      `"${printablePackageName(redactUrlsInMessage(packageName))}" was not fetched: its npm registry, ${origin}, is unencrypted and isn't your default npm registry, so npm could send your saved registry token to it in the clear. It works once the registry uses https (for a marketplace plugin, the marketplace's owner sets it) or is your default npm registry (npm config set registry <url>).`,
      "npm registry override is http",
      "policy",
    );
  return defaultHttpNpmRegistry;
}
//@ chunk-5xgkngpb.js:4497877-4498098 placement
function pickNpmVersion(npmViewVersions, versionSpec) {
  let [first] = npmViewVersions;
  if (!first || npmViewVersions.length === 1) return first;
  let mapped = npmViewVersions.map((record) => record.version);
  let latestTag = first.latestTag;
  let chosenVersion =
    latestTag !== undefined &&
    versionSpec !== undefined &&
    mapped.includes(latestTag) &&
    semverSatisfies(latestTag, versionSpec)
      ? latestTag
      : (semverCompatRequire.maxSatisfying(mapped, versionSpec ?? "*") ?? mapped.at(-1));
  return npmViewVersions.find((record) => record.version === chosenVersion);
}
//@ chunk-5xgkngpb.js:4498098-4498161 placement
function semverSatisfies(latestTag, range) {
  try {
    return semverCompatRequire.satisfies(latestTag, range);
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:4498161-4498278 placement
function parseNpmViewVersions(text) {
  let jsonOrNull = parseJsonOrNull(text);
  return (Array.isArray(jsonOrNull) ? jsonOrNull : jsonOrNull === null ? [] : [jsonOrNull]).flatMap((raw) => {
    let npmViewRecord = toNpmViewRecord(raw);
    return npmViewRecord ? [npmViewRecord] : [];
  });
}
//@ chunk-5xgkngpb.js:4498278-4498607 placement
/**
 * npm view 单条记录取 version/name/tarball/integrity/shasum/latest。
 */
function toNpmViewRecord(raw) {
  if (typeof raw !== "object" || !raw) return;
  let record = raw;
  function readField(path) {
    let value = Reflect.get(record, path);
    return typeof value === "string" ? value : undefined;
  }
  let version = readField("version");
  if (version === undefined) return;
  return {
    version,
    ...isDefinedValue({
      name: readField("name"),
      tarballUrl: readField("dist.tarball"),
      integrity: readField("dist.integrity"),
      shasum: readField("dist.shasum"),
      latestTag: readField("dist-tags.latest"),
    }),
  };
}
//@ chunk-5xgkngpb.js:4498607-4498652 placement
function isDefinedValue(record) {
  return pickByHelper(record, (value) => value !== undefined);
}
//@ chunk-5xgkngpb.js:4498652-4498719 placement
function parseJsonOrNull(text) {
  try {
    return jsonParse(text.trim() || "null");
  } catch {
    return null;
  }
}
//@ chunk-5xgkngpb.js:4498719-4499002 placement
function npmErrorSummary(text, stderr) {
  let jsonOrNull = parseJsonOrNull(text);
  let summary = jsonOrNull?.error?.summary;
  let code = jsonOrNull?.error?.code;
  let codePrefix = typeof code === "string" ? `${code} ` : "";
  let errorSummary =
    typeof summary === "string" && summary.length > 0
      ? `${codePrefix}${summary}`
      : (stderr
          .split(
            `
`,
          )
          .map((line) => line.replace(/^npm (ERR!|error) ?/, "").trim())
          .find((line) => line.length > 0) ?? "npm exited with an error");
  return printableName(redactUrlsInMessage(errorSummary), MAX_NPM_ERROR_LENGTH);
}
//@ chunk-5xgkngpb.js:4499002-4499425 placement
/**
 * 下载已解析的 tarball 并校验完整性。
 */
async function downloadNpmTarball(resolved, options) {
  let displaySpec = `${resolved.name}@${resolved.version}`;
  let bytes = await npmPackTarball(resolved.tarballUrl, options, {
    displaySpec,
    refusal: ({ reason, moved }) =>
      `"${printablePackageName(displaySpec)}" was not installed: ` +
      (moved
        ? `npm may move this package's download address onto the npm registry the marketplace sets, and there it ${reason}. The marketplace's owner can fix that.`
        : `its registry lists a download address that ${reason}. The package's publisher can fix that.`),
  });
  checkNpmIntegrity(bytes, resolved, options);
  return bytes;
}
//@ chunk-5xgkngpb.js:4499425-4500204 placement
/**
 * 用 npm pack 下载插件包（--ignore-scripts）。
 */
async function npmPackTarball(spec, options, { displaySpec = spec, refusal }) {
  let registryOrigin =
    (await checkRegistryOverride(displaySpec, options)) ??
    (/^http:/i.test(spec) ? await getDefaultHttpNpmRegistry(options) : undefined);
  let urlRefusal = checkTarballUrl(spec, options.registry, registryOrigin);
  if (urlRefusal !== undefined)
    throw new NpmFetchRefusal(refusal(urlRefusal), "npm spec is not a plain tarball download", "policy");
  let packResult = await runNpm(
    ["pack", "--ignore-scripts", "--loglevel=error", ...buildNpmRegistryArgs(options), "--", spec],
    options,
    NPM_PACK_TIMEOUT_MS,
  );
  if (packResult.code !== 0)
    throw telemetrySafeError(
      `Could not download ${displaySpec} from the npm registry: ` +
        npmErrorSummary(packResult.stdout, packResult.stderr),
      "npm pack failed",
    );
  let found = (await readdir(options.workDir)).find((name) => name.endsWith(".tgz"));
  if (found === undefined)
    throw telemetrySafeError(
      `Could not download ${displaySpec}: npm pack finished without writing a tarball`,
      "npm pack wrote no tarball",
    );
  let fileBytes = await getFsImplementation().readFileBytes(
    join(options.workDir, found),
    MAX_PACKUMENT_BYTES + 1,
  );
  if (fileBytes.length > MAX_PACKUMENT_BYTES)
    throw telemetrySafeError(
      `${displaySpec} is larger than ${bytesToMiB(MAX_PACKUMENT_BYTES)} MB and was not installed`,
      "npm tarball too large",
    );
  return fileBytes;
}
//@ chunk-5xgkngpb.js:4500204-4500245 placement
function bytesToMiB(bytes) {
  return Math.floor(bytes / TAR_CHUNK_BYTES);
}
//@ chunk-5xgkngpb.js:4500245-4500747 placement
function checkNpmIntegrity(bytes, resolved, options) {
  let displaySpec = `${resolved.name}@${resolved.version}`;
  if (resolved.integrity) {
    if (!integrityMatches(bytes, resolved.integrity))
      throw tarballMismatchError(displaySpec, `integrity (${printablePackageName(resolved.integrity)})`);
    return;
  }
  if (resolved.shasum && !options.needsIntegrity) {
    if (sha1Hex(bytes) !== resolved.shasum.toLowerCase()) throw tarballMismatchError(displaySpec, "shasum");
    return;
  }
  if (options.needsIntegrity)
    throw telemetrySafeError(
      `${displaySpec} was not installed: the registry reported no integrity value to verify the download against`,
      "npm registry reported no integrity",
    );
  logForDebugging(`npm: no integrity reported for ${displaySpec}; installing the packed tarball unverified`, {
    level: "warn",
  });
}
//@ chunk-5xgkngpb.js:4500747-4500945 placement
function integrityMatches(bytes, integrity) {
  let filtered = integrity.split(/\s+/).filter((part) => part.includes("-"));
  let found = INTEGRITY_ALGORITHMS.find((algorithm) =>
    filtered.some((part) => firstLineOf(part, "-") === algorithm),
  );
  if (!found) return false;
  let digest = createHash(found).update(bytes).digest("base64");
  return filtered.includes(`${found}-${digest}`);
}
//@ chunk-5xgkngpb.js:4500945-4501004 placement
function sha1Hex(bytes) {
  return createHash("sha1").update(bytes).digest("hex");
}
//@ chunk-5xgkngpb.js:4501004-4501164 placement
function tarballMismatchError(displaySpec, kind) {
  return telemetrySafeError(
    `${displaySpec} was not installed: the downloaded tarball does not match the ${kind} the registry reported`,
    `npm tarball ${firstLineOf(kind, " ")} mismatch`,
  );
}
//@ chunk-5xgkngpb.js:4501164-4501196 placement
function printablePackageName(name) {
  return printableName(name, MAX_PACKAGE_NAME_DISPLAY);
}
//@ chunk-5xgkngpb.js:4501196-4501652 placement
/**
 * 解开 tarball 到目标目录（wx 独占写、保留可执行位）。
 */
async function unpackNpmTarball(bytes, targetPath) {
  let npmTarball = await parseNpmTarball(bytes);
  let fsImplementation = getFsImplementation();
  await fsImplementation.mkdir(targetPath);
  let writtenPaths = [];
  for (let entry of npmTarball) {
    let fullPath = join(targetPath, entry.path);
    if (entry.kind === "directory") {
      await fsImplementation.mkdir(fullPath);
      continue;
    }
    await fsImplementation.mkdir(dirname(fullPath));
    await writeFile(fullPath, entry.data, {
      flag: "wx",
    }).catch((error) => {
      throw getErrnoCode(error) === "EEXIST"
        ? npmInstallRefusal(
            `two entries name the same file on this filesystem (${printablePackageName(entry.path)})`,
          )
        : error;
    });
    if (entry.mode & FILE_MODE_TYPE_BITS)
      await chmod(fullPath, entry.mode & FILE_MODE_PERMISSION_BITS).catch(() => {});
    writtenPaths.push(entry.path);
  }
  logForDebugging(`Unpacked npm tarball to ${targetPath}: ${writtenPaths.length} files`);
  return writtenPaths;
}
//@ chunk-5xgkngpb.js:4501652-4503106 placement
/**
 * 解析 npm tarball（tar 头校验、大小限制、越界检查）。
 */
async function parseNpmTarball(bytes) {
  let buffer = await gunzipTarball_2(bytes);
  let entries = [];
  let seenPaths = new Set();
  let paxPath;
  let longName;
  let offset = 0;
  while (offset + TAR_HEADER_BYTES <= buffer.length) {
    let header = buffer.subarray(offset, offset + TAR_HEADER_BYTES);
    if (isAllZeroBytes(header)) break;
    if (!verifyTarHeaderChecksum(header))
      throw npmInstallRefusal("a header checksum does not match (corrupt tarball)");
    let tarField = readTarField(header, TAR_HEADER_FIELDS.name);
    let tarNumber = readTarNumber(header, TAR_HEADER_FIELDS.size);
    let dataStart = offset + TAR_HEADER_BYTES;
    let dataEnd = dataStart + tarNumber;
    if (tarNumber < 0) throw npmInstallRefusal("an entry declares a negative size (corrupt tarball)");
    if (tarNumber > MAX_SINGLE_ENTRY_BYTES)
      throw npmInstallRefusal(
        `an entry is larger than ${bytesToMiB(MAX_SINGLE_ENTRY_BYTES)} MB (${printablePackageName(tarField)})`,
      );
    if (dataEnd > buffer.length)
      throw npmInstallRefusal("an entry runs past the end of the archive (truncated tarball)");
    let chunk = buffer.subarray(dataStart, dataEnd);
    offset = dataStart + Math.ceil(tarNumber / TAR_HEADER_BYTES) * TAR_HEADER_BYTES;
    let tarTypeFlag = readTarTypeFlag(header);
    let effectivePath = paxPath ?? longName;
    switch (tarTypeFlag) {
      case "x":
        paxPath = parsePrintHeaders(chunk).get("path") ?? paxPath;
        continue;
      case "L":
        longName = readCString(chunk);
        continue;
      case "g":
      case "K":
        continue;
      case "1":
      case "2":
        throw npmInstallRefusal(
          `it contains a ${tarLinkKindLabel(tarTypeFlag)} (${printablePackageName(effectivePath ?? tarField)}); links are not allowed in a plugin package`,
        );
      case "3":
      case "4":
      case "6":
        throw npmInstallRefusal("it contains a device or FIFO entry");
      case "0":
      case "7":
      case "5":
        break;
      default:
        throw npmInstallRefusal(
          'it contains an entry of unsupported type "' +
            printableName(tarTypeFlag, MAX_TAR_ENTRY_TYPE_DISPLAY) +
            '"',
        );
    }
    let entryPath = effectivePath ?? tarEntryPath(header, tarField);
    paxPath = undefined;
    longName = undefined;
    let filePath = stripPackageRoot(entryPath);
    if (filePath === null) continue;
    if (!isSafeZipPath(filePath) || filePath.includes("\\"))
      throw npmInstallRefusal(
        `it contains an entry outside the package folder (${printablePackageName(entryPath)})`,
      );
    if (entries.length >= MAX_TARBALL_ENTRIES)
      throw npmInstallRefusal(`it contains more than ${MAX_TARBALL_ENTRIES} entries`);
    if (seenPaths.has(filePath))
      throw npmInstallRefusal(`it contains the same path twice (${printablePackageName(entryPath)})`);
    seenPaths.add(filePath);
    let isDirectory = tarTypeFlag === "5";
    entries.push(
      isDirectory
        ? {
            kind: "directory",
            path: filePath,
          }
        : {
            kind: "file",
            path: filePath,
            data: chunk,
            mode: readTarNumber(header, TAR_HEADER_FIELDS.mode),
          },
    );
  }
  if (!entries.some((entry) => entry.kind === "file")) throw npmInstallRefusal("it contains no files");
  return entries;
}
//@ chunk-5xgkngpb.js:4503106-4503401 placement
async function gunzipTarball_2(bytes) {
  try {
    return await gunzipTarball(bytes, {
      maxOutputLength: MAX_TARBALL_BYTES,
    });
  } catch (error) {
    let message =
      error instanceof RangeError
        ? `The npm package unpacks to more than ${bytesToMiB(MAX_TARBALL_BYTES)} MB and was not installed`
        : "The npm package tarball is not valid gzip data and was not installed";
    throw telemetrySafeError(message, "npm tarball gunzip failed");
  }
}
//@ chunk-5xgkngpb.js:4503401-4503460 placement
function tarLinkKindLabel(tarTypeFlag) {
  return tarTypeFlag === "1" ? "hard link" : "symbolic link";
}
//@ chunk-5xgkngpb.js:4503460-4503563 placement
function tarEntryPath(header, tarField) {
  let prefix = readTarField(header, TAR_HEADER_FIELDS.magic).startsWith("ustar")
    ? readTarField(header, TAR_HEADER_FIELDS.prefix)
    : "";
  return prefix ? `${prefix}/${tarField}` : tarField;
}
//@ chunk-5xgkngpb.js:4503563-4503653 placement
function readTarTypeFlag(header) {
  let uInt8 = header.readUInt8(TAR_HEADER_FIELDS.typeflag[0]);
  return uInt8 === 0 ? "0" : String.fromCharCode(uInt8);
}
//@ chunk-5xgkngpb.js:4503653-4503743 placement
function npmInstallRefusal(reason) {
  return telemetrySafeError(`The npm package was not installed: ${reason}`, "npm tarball refused");
}
//@ chunk-5xgkngpb.js:4503743-4503778 placement
function telemetrySafeError(message, telemetryCode) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(message, telemetryCode);
}
//@ chunk-5xgkngpb.js:4503778-4503918 placement
let NpmFetchRefusal; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4503778", () => {
  NpmFetchRefusal = class NpmFetchRefusal extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    pluginCommandErrorCategory;
    constructor(message, telemetryCode, pluginCommandErrorCategory) {
      super(message, telemetryCode);
      this.name = "NpmFetchRefusal";
      this.pluginCommandErrorCategory = pluginCommandErrorCategory;
    }
  };
});
//@ chunk-5xgkngpb.js:4503918-4504057 placement
function stripPackageRoot(entryPath) {
  let replaced = entryPath.replace(/^\.\//, "");
  let index = replaced.indexOf("/");
  if (index < 0) return null;
  let replaced_2 = replaced.slice(index + 1).replace(/\/+$/, "");
  return replaced_2 === "" ? null : replaced_2;
}
//@ chunk-5xgkngpb.js:4504057-4504100 placement
function isAllZeroBytes(bytes) {
  return bytes.every((byte) => byte === 0);
}
//@ chunk-5xgkngpb.js:4504100-4504224 placement
function verifyTarHeaderChecksum(header) {
  let tarNumber = readTarNumber(header, TAR_HEADER_FIELDS.checksum);
  let sum = 0;
  for (let idx = 0; idx < TAR_HEADER_BYTES; idx++) {
    let inChecksumField = idx >= CHECKSUM_OFFSET && idx < CHECKSUM_END;
    sum += inChecksumField ? PRINTABLE_CHAR_MIN : header.readUInt8(idx);
  }
  return sum === tarNumber;
}
//@ chunk-5xgkngpb.js:4504224-4504276 placement
function readTarField(header, [start, length]) {
  return readCString(header.subarray(start, start + length));
}
//@ chunk-5xgkngpb.js:4504276-4504358 placement
function readCString(bytes) {
  let index = bytes.indexOf(0);
  return (index < 0 ? bytes : bytes.subarray(0, index)).toString("utf8");
}
//@ chunk-5xgkngpb.js:4504358-4504533 placement
function readTarNumber(header, [start, length]) {
  let bytes = header.subarray(start, start + length);
  if ((bytes.readUInt8(0) & BINARY_MODE_FLAG) !== 0)
    return bytes.subarray(1).reduce((acc, byte) => acc * BINARY_BASE + byte, 0);
  let trimmed = readCString(bytes).trim();
  return trimmed === "" ? 0 : parseInt(trimmed, OCTAL_RADIX) || 0;
}
//@ chunk-5xgkngpb.js:4504533-4504825 layout
function parsePrintHeaders(buffer) {
  let headers = new Map();
  let offset = 0;
  while (offset < buffer.length) {
    let index = buffer.indexOf(PRINTABLE_CHAR_MIN, offset);
    if (index < 0) break;
    let chunkSize = parseInt(buffer.subarray(offset, index).toString("utf8"), DECIMAL_RADIX);
    if (!Number.isFinite(chunkSize) || chunkSize <= 0) break;
    let str = buffer.subarray(index + 1, offset + chunkSize - 1).toString("utf8");
    let index_2 = str.indexOf("=");
    if (index_2 > 0) headers.set(str.slice(0, index_2), str.slice(index_2 + 1));
    offset += chunkSize;
  }
  return headers;
}
//@ chunk-5xgkngpb.js:4504825-4505407 placement
/**
 * 下载 npm 插件包到 targetPath：非 npm 市场通道且不是包名时按链接或 tarball 处理；否则解析版本、下载 tarball、 校验完整性（需要时与记录的 integrity 对比）、解包；npm 市场通道还校验包名、策略与 package.json 身份。
 */
async function fetchNpmPackage(request, options) {
  let { packageName, versionSpec, targetPath } = request;
  await getFsImplementation().mkdir(options.workDir);
  if (!options.isNpmMarketplaceLane && !isValidNpmPackageNameLoose(packageName)) {
    let splitSpec = versionSpec === undefined ? splitNpmSpec(packageName) : undefined;
    return splitSpec === undefined
      ? fetchNpmLinkSource(request, options)
      : fetchNpmPackage(
          {
            ...request,
            ...splitSpec,
          },
          options,
        );
  }
  let resolved = await resolveNpmPackage(packageName, versionSpec, options);
  logForDebugging(
    `npm: ${packageName}@${versionSpec ?? "latest"} resolved to ${resolved.name}@${resolved.version} from ` +
      redactUrlsInText(resolved.tarballUrl),
  );
  if (options.isNpmMarketplaceLane) assertNpmResolutionAllowed(packageName, resolved);
  let tarball = await downloadNpmTarball(resolved, {
    registry: options.registry,
    workDir: options.workDir,
    needsIntegrity: options.isNpmMarketplaceLane,
  });
  if (options.expectedIntegrity !== undefined)
    assertRecordedIntegrity(tarball, resolved, options.expectedIntegrity);
  await unpackNpmTarball(tarball, targetPath);
  if (options.isNpmMarketplaceLane) await assertUnpackedManifestMatches(targetPath, resolved);
  return resolved;
}
//@ chunk-5xgkngpb.js:4505407-4505727 placement
/**
 * 解包后的 package.json 名字/版本须与解析结果一致。
 */
async function assertUnpackedManifestMatches(dir, resolved) {
  let packageJsonIdentity = await readPackageJsonIdentity(dir);
  if (packageJsonIdentity.name === resolved.name && packageJsonIdentity.version === resolved.version) return;
  await removeDirectoryTreeNoFollow_2(dir).catch(() => {});
  throw telemetrySafeError(
    `${resolved.name}@${resolved.version} was not installed: the downloaded package calls itself ` +
      printablePackageName(
        `${packageJsonIdentity.name ?? "(no name)"}@${packageJsonIdentity.version ?? "(no version)"}`,
      ),
    "npm tarball manifest does not match the resolution",
  );
}
//@ chunk-5xgkngpb.js:4505727-4506027 placement
/**
 * tarball 与安装时记录的完整性一致，否则提示 plugin update。
 */
function assertRecordedIntegrity(bytes, resolved, integrity) {
  if (integrityMatches(bytes, integrity)) return;
  throw telemetrySafeError(
    `${resolved.name}@${resolved.version} was not loaded: the registry now serves different contents for this version than were installed; run \`claude plugin update\` for it to accept what the registry serves`,
    "npm tarball differs from the recorded install integrity",
  );
}
//@ chunk-5xgkngpb.js:4506027-4506358 placement
/**
 * registry 返回的包名一致且策略允许。
 */
function assertNpmResolutionAllowed(packageName, resolved) {
  if (resolved.name !== packageName)
    throw telemetrySafeError(
      `${packageName} was not installed: the registry answered with a different package name (${printablePackageName(resolved.name)})`,
      "npm registry answered with a different package name",
    );
  let refusal = npmResolutionPolicyRefusal({
    packageName,
    tarballUrl: resolved.tarballUrl,
  });
  if (refusal !== null)
    throw new NpmFetchRefusal(refusal, "npm marketplace install refused by managed policy", "policy");
}
//@ chunk-5xgkngpb.js:4506358-4506426 placement
/**
 * isValidNpmPackageNameLoose：小写后是否为合法 npm 包名。
 */
function isValidNpmPackageNameLoose(name) {
  return isValidNpmPackageName(name.replace(/[A-Z]/g, (char) => char.toLowerCase()));
}
//@ chunk-5xgkngpb.js:4506426-4506558 placement
function splitNpmSpec(packageName) {
  let index = packageName.indexOf("@", 1);
  let sliced = packageName.slice(0, index);
  let spec = packageName.slice(index + 1);
  return index > 0 && isValidNpmPackageNameLoose(sliced) && isNpmVersionSpec(spec)
    ? {
        packageName: sliced,
        versionSpec: spec,
      }
    : undefined;
}
//@ chunk-5xgkngpb.js:4506558-4507154 placement
/**
 * 非 registry 包名（链接/tarball）的 npm 源下载与解包。
 */
async function fetchNpmLinkSource({ packageName, versionSpec, targetPath }, options) {
  let spec = versionSpec ? `${packageName}@${versionSpec}` : packageName;
  let bytes = await npmPackTarball(spec, options, {
    refusal: ({ reason, moved }) =>
      `"${printablePackageName(redactUrlsInMessage(spec))}" was not installed: ` +
      (moved
        ? `npm may move this link onto the npm registry the marketplace sets, and there it ${reason}. The marketplace's owner can fix that.`
        : `it ${reason}. An npm plugin source must name a registry package (name or name@version) or link to a tarball file. For a plugin in a git repository, use a "github", "url" or "git-subdir" source.`),
  });
  await unpackNpmTarball(bytes, targetPath);
  let packageJsonIdentity = await readPackageJsonIdentity(targetPath);
  return {
    name: packageJsonIdentity.name ?? packageName,
    version: packageJsonIdentity.version ?? versionSpec ?? "unknown",
    tarballUrl: packageName,
  };
}
//@ chunk-5xgkngpb.js:4507154-4507419 placement
async function readPackageJsonIdentity(dir) {
  try {
    let parsed = jsonParse(
      await getFsImplementation().readFile(join(dir, "package.json"), {
        encoding: "utf8",
      }),
    );
    let name = Reflect.get(Object(parsed), "name");
    let version = Reflect.get(Object(parsed), "version");
    return isDefinedValue({
      name: typeof name === "string" ? name : undefined,
      version: typeof version === "string" ? version : undefined,
    });
  } catch {
    return {};
  }
}
//@ chunk-5xgkngpb.js:4520390-4520451 placement
/**
 * npmMarketplaceEnabled：npm 市场功能开关。
 */
function npmMarketplaceEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugins_npm_marketplace", npmMarketplaceDefaultOff);
}
//@ chunk-5xgkngpb.js:4520451-4520561 placement
/**
 * 账号未开放 <package>@npm 直接安装。
 */
var NPM_DIRECT_INSTALL_DISABLED_MESSAGE =
  "Installing plugins straight from an npm registry (`<package>@npm`) is not enabled for this account.";
//@ chunk-5xgkngpb.js:4520561-4520584 placement
var NPM_REGISTRY = "npm:registry";
//@ chunk-5xgkngpb.js:4520584-4520723 placement
/**
 * 包名/版本/registry 转 npm 插件源。
 */
function toNpmPluginSource(request, registry) {
  return npmPluginSource(request.packageName, {
    ...(request.versionSpec !== undefined && {
      version: request.versionSpec,
    }),
    ...(registry !== undefined && {
      registry: new URL(registry).href,
    }),
  });
}
//@ chunk-5xgkngpb.js:4520723-4520861 placement
function toNpmMarketplaceSource(name, options) {
  let version = options?.version;
  let npmRegistry = options?.npmRegistry;
  let versionFields =
    version === undefined
      ? {}
      : {
          version,
        };
  return {
    ...npmPluginSource(name, {
      ...versionFields,
      ...(npmRegistry !== undefined && {
        registry: npmRegistry,
      }),
    }),
    ...versionFields,
  };
}
//@ chunk-5xgkngpb.js:4520861-4520920 placement
function npmPluginSource(name, options) {
  return {
    name,
    strict: true,
    source: installVersion(name, options),
  };
}
//@ chunk-5xgkngpb.js:4520920-4520974 placement (2.1.88 match: installVersion, 0.763)
function installVersion(packageName, options) {
  return {
    source: "npm",
    package: packageName,
    ...options,
  };
}
export {
  isValidNpmPackageNameLoose,
  fetchNpmPackage,
  npmMarketplaceEnabled,
  NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
  toNpmMarketplaceSource,
  NPM_REGISTRY,
  semverCompat,
  checkTarballUrl,
  isNpmVersionSpec,
  npmExecEnv,
  runNpm,
  getDefaultHttpNpmRegistry,
  fdRealPath,
  toNpmPluginSource,
  resolveNpmPackage,
};
