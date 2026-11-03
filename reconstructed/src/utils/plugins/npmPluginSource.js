/**
 * utils/plugins/npmPluginSource.ts
 *
 * 2.1.316 新增：npm 插件来源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (61)
 * attribution: placement 61
 */
import { readlink, readdir, writeFile, chmod } from "fs/promises";
import { promisify } from "util";
import { gunzip } from "zlib";
import { join, dirname } from "path";
import { createHash } from "crypto";
import { getPlatform } from "../platform.js";
import { Re } from "../../../runtime/bun-runtime.js";
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
import { decodeChunk } from "../../upstreamproxy/relay.js";
import { isSafeZipPath } from "../dxt/zip.js";
import { removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2 } from "../fsRemove.js";
import { npmResolutionPolicyRefusal } from "./marketplacePolicy.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { npmMarketplaceDefaultOff } from "./pluginDependencies.js";

//@ chunk-e6aww6q8.js:4386422-4386612 placement
/**
 * Linux/WSL 上经 /proc/self/fd 取文件描述符的真实路径。
 */
async function fdRealPath(e) {
  let platform = getPlatform();
  if (platform !== "linux" && platform !== "wsl") return null;
  try {
    let r = await readlink(`/proc/self/fd/${e}`);
    return r.startsWith("/") && !r.endsWith(" (deleted)") ? r : null;
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:4386612-4386631 placement
/**
 * semverCompat：npm semver 的 CommonJS 包装（包下载用）。
 */
var semverCompat = Re(require_semver_3(), 1);
//@ chunk-e6aww6q8.js:4386739-4386757 placement
var semverCompatRequire = Re(require_semver_3(), 1);
//@ chunk-e6aww6q8.js:4386869-4386912 placement
var NPM_DISABLE_GIT_ENV = {
  npm_config_ignore_scripts: "true",
};
//@ chunk-e6aww6q8.js:4386912-4387008 placement
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
//@ chunk-e6aww6q8.js:4387008-4387665 placement
/**
 * NPM_REGISTRY_QUERY_TIMEOUT_MS：npm registry 查询超时；UNSAFE_STORE_PREFIX：不安全的存储前缀占位；NPM_PACK_TIMEOUT_MS：npm pack 超时（同一声明共 32 个绑定）。
 */
var parseNpmPackument = 60000;
var NPM_REGISTRY_QUERY_TIMEOUT_MS = 30000;
var UNSAFE_STORE_PREFIX = 300000;
var NPM_PACK_TIMEOUT_MS = 8388608;
var NPM_EXEC_MAX_BUFFER = 1048576;
var TAR_BLOCK_SIZE = 256;
var TAR_MAX_HEADER_CHUNKS = 512;
var TAR_FIELD_CHUNKS = 256;
var MAX_PACKUMENT_BYTES = TAR_BLOCK_SIZE * NPM_EXEC_MAX_BUFFER;
var MAX_TARBALL_BYTES = TAR_MAX_HEADER_CHUNKS * NPM_EXEC_MAX_BUFFER;
var MAX_SINGLE_ENTRY_BYTES = TAR_FIELD_CHUNKS * NPM_EXEC_MAX_BUFFER;
var MAX_TARBALL_ENTRIES = 1e5;
var MAX_NPM_ERROR_LENGTH = 300;
var MAX_PACKAGE_NAME_DISPLAY = 120;
var MAX_TAR_ENTRY_TYPE_DISPLAY = 4;
var MIN_PRINTABLE_CODE = 512;
var MAX_PRINTABLE_CODE = 493;
var FILE_MODE_MASK = 73;
var TAR_HEADER_OFFSETS = 32;
var NPM_VIEW_FIELDS = 127;
var INTEGRITY_ALGORITHMS = 128;
var NPM_PACKAGE_NAME_RE = 256;
var ARCHIVE_SUFFIX_RE = 8;
var GIT_HOSTING_PROVIDERS = 10;
var TAR_CHECKSUM_OFFSET = {
  name: [0, 100],
  mode: [100, 8],
  size: [124, 12],
  checksum: [148, 8],
  typeflag: [156, 1],
  magic: [257, 6],
  prefix: [345, 155],
};
var gunzipAsync = ["name", "version", "dist.tarball", "dist.integrity", "dist.shasum", "dist-tags.latest"];
var zipEntryDisplay = ["sha512", "sha384", "sha256", "sha1"];
var itemDisplay = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
var tarEntryTypeDisplay = /[.](?:tgz|tar.gz|tar)$/i;
var archiveSuffixAllowed = new Set([
  GITHUB_HOST,
  `gist.${GITHUB_HOST}`,
  "gitlab.com",
  "bitbucket.org",
  "git.sr.ht",
]);
var entryPathSafe = TAR_CHECKSUM_OFFSET.checksum[0];
var entryPathLengthOk = TAR_CHECKSUM_OFFSET.checksum[0] + TAR_CHECKSUM_OFFSET.checksum[1];
var gunzipTarball = promisify(gunzip);
//@ chunk-e6aww6q8.js:4387665-4388524 placement
/**
 * 用 npm view 解析插件包版本，名字非法时拒绝。
 */
async function resolveNpmPackage(e, n, r) {
  let s = `${e}@${n ?? "latest"}`;
  if (!isValidNpmPackageNameLoose(e))
    throw telemetrySafeError(
      `"${printablePackageName(redactUrlsInMessage(e))}" was not fetched: it is not a valid npm package name. Valid names look like "my-plugin" or "@scope/my-plugin".`,
      "npm package name is not a registry name",
    );
  assertNpmVersionSpec(e, n);
  await checkRegistryOverride(e, r);
  let h = await runNpm(
    ["view", "--json", ...buildNpmRegistryArgs(r, e), "--", s, ...gunzipAsync],
    r,
    parseNpmPackument,
  );
  if (h.code !== 0)
    throw telemetrySafeError(
      `Could not resolve ${s} from the npm registry: ` + npmErrorSummary(h.stdout, h.stderr),
      "npm view failed",
    );
  let y = pickNpmVersion(parseNpmViewVersions(h.stdout), n);
  if (!y)
    throw telemetrySafeError(
      `Could not resolve ${s} from the npm registry: no version matches`,
      "npm view returned no versions",
    );
  if (y.tarballUrl === undefined)
    throw telemetrySafeError(
      `Could not resolve ${s} from the npm registry: the registry did not report a tarball URL`,
      "npm view returned no tarball",
    );
  return {
    name: y.name ?? e,
    version: y.version,
    tarballUrl: y.tarballUrl,
    ...isDefinedValue({
      integrity: y.integrity,
      shasum: y.shasum,
    }),
  };
}
//@ chunk-e6aww6q8.js:4388524-4388714 placement
function assertNpmVersionSpec(e, n) {
  if (n === undefined || isNpmVersionSpec(n)) return;
  throw telemetrySafeError(
    `${e} was not resolved: "${printablePackageName(n)}" is not a version, a semver range or a dist-tag`,
    "npm version spec is not a version, range or tag",
  );
}
//@ chunk-e6aww6q8.js:4388714-4388926 placement
async function getDefaultHttpNpmRegistry(e) {
  let n = await runNpm(["config", "get", "registry", "--workspaces=false"], e, NPM_REGISTRY_QUERY_TIMEOUT_MS);
  let trimmed = n.stdout.trim();
  if (n.code !== 0 || !URL.canParse(trimmed)) return;
  let s = new URL(trimmed);
  return s.protocol === "http:" ? s.origin : undefined;
}
//@ chunk-e6aww6q8.js:4388926-4389182 placement
function checkTarballUrl(e, n, r, s = "npm") {
  let h = validateNpmRegistryUrl(e, r, s);
  if (h !== undefined)
    return {
      reason: h,
      moved: false,
    };
  if (n === undefined) return;
  let { pathname } = new URL(e);
  let S = URL.canParse(pathname, n)
    ? validateNpmRegistryUrl(new URL(pathname, n).href, r, s)
    : "is not an http or https link";
  return S === undefined
    ? undefined
    : {
        reason: S,
        moved: true,
      };
}
//@ chunk-e6aww6q8.js:4389182-4389893 placement
function validateNpmRegistryUrl(e, n, r) {
  if (!/^https?:\/\//i.test(e) || !URL.canParse(e)) return "is not an http or https link";
  if (/[\s#\\]/.test(e) || hasControlChars_2(e))
    return 'contains a "#", whitespace, a backslash or a control character';
  let s = new URL(e);
  let h = normalizeHostCached(s.hostname);
  let y = h === "gitlab.com" && s.pathname.startsWith("/api/v4/") && s.pathname.includes("/-/");
  if (archiveSuffixAllowed.has(h) && !y)
    return `is on GitHub, GitLab, Bitbucket or SourceHut, where ${r} may fetch it as a git repository and run its setup script`;
  if (s.pathname.startsWith("//")) return 'starts its path with "//"';
  if (s.protocol === "http:" && s.origin !== n)
    return `is an unencrypted http link on a host other than your npm registry, so ${r} could send your saved registry token to it in the clear`;
  return;
}
//@ chunk-e6aww6q8.js:4389893-4389995 placement
function hasControlChars_2(e) {
  for (let idx = 0; idx < e.length; idx++) {
    let code = e.charCodeAt(idx);
    if (code < TAR_HEADER_OFFSETS || code === NPM_VIEW_FIELDS) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:4389995-4390070 placement
/**
 * isNpmVersionSpec：是否为 npm 版本规格。
 */
function isNpmVersionSpec(e) {
  return !tarEntryTypeDisplay.test(e) && (semverCompatRequire.validRange(e) !== null || itemDisplay.test(e));
}
//@ chunk-e6aww6q8.js:4390070-4390167 placement
/**
 * runNpm：带禁 git 参数执行 npm。
 */
function runNpm(e, n, timeout) {
  return execFileNoThrowWithCwd(
    "npm",
    [`--git=${join(n.workDir, "git-is-disabled")}`, ...e],
    npmExecOptions(n, timeout),
  );
}
//@ chunk-e6aww6q8.js:4390167-4390322 placement
function npmExecOptions(e, timeout) {
  return {
    cwd: e.workDir,
    timeout,
    maxBuffer: NPM_PACK_TIMEOUT_MS,
    stdin: "ignore",
    ...npmExecEnv(),
    ...(e.toolCgroupClass !== undefined && {
      toolCgroupClass: e.toolCgroupClass,
    }),
  };
}
//@ chunk-e6aww6q8.js:4390322-4391044 placement
/**
 * 检查为插件设置的 npm registry：不是合法 URL 抛 validation 拒绝；http 且不是用户默认 registry 时抛 policy 拒绝（避免明文泄露令牌）。 返回默认 http registry（若是）。
 */
async function checkRegistryOverride(e, n) {
  if (n.registry === undefined) return;
  if (!isHttpUrl_2(n.registry))
    throw new NpmFetchRefusal(
      `"${printablePackageName(redactUrlsInMessage(e))}" was not fetched: the npm registry set for it is not a valid address.`,
      "npm registry override is not a URL",
      "validation",
    );
  let { origin, protocol } = new URL(n.registry);
  if (protocol !== "http:") return;
  let defaultHttpNpmRegistry = await getDefaultHttpNpmRegistry(n);
  if (origin !== defaultHttpNpmRegistry)
    throw new NpmFetchRefusal(
      `"${printablePackageName(redactUrlsInMessage(e))}" was not fetched: its npm registry, ${origin}, is unencrypted and isn't your default npm registry, so npm could send your saved registry token to it in the clear. It works once the registry uses https (for a marketplace plugin, the marketplace's owner sets it) or is your default npm registry (npm config set registry <url>).`,
      "npm registry override is http",
      "policy",
    );
  return defaultHttpNpmRegistry;
}
//@ chunk-e6aww6q8.js:4391264-4391485 placement
function pickNpmVersion(npmViewVersions, n) {
  let [r] = npmViewVersions;
  if (!r || npmViewVersions.length === 1) return r;
  let mapped = npmViewVersions.map((w) => w.version);
  let latestTag = r.latestTag;
  let S =
    latestTag !== undefined && n !== undefined && mapped.includes(latestTag) && semverSatisfies(latestTag, n)
      ? latestTag
      : (semverCompatRequire.maxSatisfying(mapped, n ?? "*") ?? mapped.at(-1));
  return npmViewVersions.find((w) => w.version === S);
}
//@ chunk-e6aww6q8.js:4391485-4391548 placement
function semverSatisfies(latestTag, n) {
  try {
    return semverCompatRequire.satisfies(latestTag, n);
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:4391548-4391665 placement
function parseNpmViewVersions(stdout) {
  let jsonOrNull = parseJsonOrNull(stdout);
  return (Array.isArray(jsonOrNull) ? jsonOrNull : jsonOrNull === null ? [] : [jsonOrNull]).flatMap((r) => {
    let npmViewRecord = toNpmViewRecord(r);
    return npmViewRecord ? [npmViewRecord] : [];
  });
}
//@ chunk-e6aww6q8.js:4391665-4391994 placement
/**
 * npm view 单条记录取 version/name/tarball/integrity/shasum/latest。
 */
function toNpmViewRecord(e) {
  if (typeof e !== "object" || !e) return;
  let n = e;
  function r(h) {
    let y = Reflect.get(n, h);
    return typeof y === "string" ? y : undefined;
  }
  let s = r("version");
  if (s === undefined) return;
  return {
    version: s,
    ...isDefinedValue({
      name: r("name"),
      tarballUrl: r("dist.tarball"),
      integrity: r("dist.integrity"),
      shasum: r("dist.shasum"),
      latestTag: r("dist-tags.latest"),
    }),
  };
}
//@ chunk-e6aww6q8.js:4391994-4392039 placement
function isDefinedValue(e) {
  return pickByHelper(e, (n) => n !== undefined);
}
//@ chunk-e6aww6q8.js:4392039-4392106 placement
function parseJsonOrNull(e) {
  try {
    return jsonParse(e.trim() || "null");
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:4392106-4392389 placement
function npmErrorSummary(stdout, stderr) {
  let jsonOrNull = parseJsonOrNull(stdout);
  let summary = jsonOrNull?.error?.summary;
  let code = jsonOrNull?.error?.code;
  let y = typeof code === "string" ? `${code} ` : "";
  let w =
    typeof summary === "string" && summary.length > 0
      ? `${y}${summary}`
      : (stderr
          .split(
            `
`,
          )
          .map((line) => line.replace(/^npm (ERR!|error) ?/, "").trim())
          .find((L) => L.length > 0) ?? "npm exited with an error");
  return printableName(redactUrlsInMessage(w), MAX_NPM_ERROR_LENGTH);
}
//@ chunk-e6aww6q8.js:4392389-4392812 placement
/**
 * 下载已解析的 tarball 并校验完整性。
 */
async function downloadNpmTarball(resolved, n) {
  let r = `${resolved.name}@${resolved.version}`;
  let s = await npmPackTarball(resolved.tarballUrl, n, {
    displaySpec: r,
    refusal: ({ reason, moved }) =>
      `"${printablePackageName(r)}" was not installed: ` +
      (moved
        ? `npm may move this package's download address onto the npm registry the marketplace sets, and there it ${reason}. The marketplace's owner can fix that.`
        : `its registry lists a download address that ${reason}. The package's publisher can fix that.`),
  });
  checkNpmIntegrity(s, resolved, n);
  return s;
}
//@ chunk-e6aww6q8.js:4392812-4393591 placement
/**
 * 用 npm pack 下载插件包（--ignore-scripts）。
 */
async function npmPackTarball(e, n, { displaySpec = e, refusal }) {
  let y =
    (await checkRegistryOverride(displaySpec, n)) ??
    (/^http:/i.test(e) ? await getDefaultHttpNpmRegistry(n) : undefined);
  let S = checkTarballUrl(e, n.registry, y);
  if (S !== undefined)
    throw new NpmFetchRefusal(refusal(S), "npm spec is not a plain tarball download", "policy");
  let w = await runNpm(
    ["pack", "--ignore-scripts", "--loglevel=error", ...buildNpmRegistryArgs(n), "--", e],
    n,
    UNSAFE_STORE_PREFIX,
  );
  if (w.code !== 0)
    throw telemetrySafeError(
      `Could not download ${displaySpec} from the npm registry: ` + npmErrorSummary(w.stdout, w.stderr),
      "npm pack failed",
    );
  let found = (await readdir(n.workDir)).find((q) => q.endsWith(".tgz"));
  if (found === undefined)
    throw telemetrySafeError(
      `Could not download ${displaySpec}: npm pack finished without writing a tarball`,
      "npm pack wrote no tarball",
    );
  let fileBytes = await getFsImplementation().readFileBytes(join(n.workDir, found), MAX_PACKUMENT_BYTES + 1);
  if (fileBytes.length > MAX_PACKUMENT_BYTES)
    throw telemetrySafeError(
      `${displaySpec} is larger than ${bytesToMiB(MAX_PACKUMENT_BYTES)} MB and was not installed`,
      "npm tarball too large",
    );
  return fileBytes;
}
//@ chunk-e6aww6q8.js:4393591-4393632 placement
function bytesToMiB(e) {
  return Math.floor(e / NPM_EXEC_MAX_BUFFER);
}
//@ chunk-e6aww6q8.js:4393632-4394134 placement
function checkNpmIntegrity(e, n, r) {
  let s = `${n.name}@${n.version}`;
  if (n.integrity) {
    if (!integrityMatches(e, n.integrity))
      throw tarballMismatchError(s, `integrity (${printablePackageName(n.integrity)})`);
    return;
  }
  if (n.shasum && !r.needsIntegrity) {
    if (sha1Hex(e) !== n.shasum.toLowerCase()) throw tarballMismatchError(s, "shasum");
    return;
  }
  if (r.needsIntegrity)
    throw telemetrySafeError(
      `${s} was not installed: the registry reported no integrity value to verify the download against`,
      "npm registry reported no integrity",
    );
  logForDebugging(`npm: no integrity reported for ${s}; installing the packed tarball unverified`, {
    level: "warn",
  });
}
//@ chunk-e6aww6q8.js:4394134-4394332 placement
function integrityMatches(e, n) {
  let filtered = n.split(/\s+/).filter((y) => y.includes("-"));
  let found = zipEntryDisplay.find((y) => filtered.some((S) => firstLineOf(S, "-") === y));
  if (!found) return false;
  let h = createHash(found).update(e).digest("base64");
  return filtered.includes(`${found}-${h}`);
}
//@ chunk-e6aww6q8.js:4394332-4394391 placement
function sha1Hex(e) {
  return createHash("sha1").update(e).digest("hex");
}
//@ chunk-e6aww6q8.js:4394391-4394551 placement
function tarballMismatchError(e, n) {
  return telemetrySafeError(
    `${e} was not installed: the downloaded tarball does not match the ${n} the registry reported`,
    `npm tarball ${firstLineOf(n, " ")} mismatch`,
  );
}
//@ chunk-e6aww6q8.js:4394551-4394583 placement
function printablePackageName(e) {
  return printableName(e, MAX_PACKAGE_NAME_DISPLAY);
}
//@ chunk-e6aww6q8.js:4394583-4395039 placement
/**
 * 解开 tarball 到目标目录（wx 独占写、保留可执行位）。
 */
async function unpackNpmTarball(e, targetPath) {
  let npmTarball = await parseNpmTarball(e);
  let fsImplementation = getFsImplementation();
  await fsImplementation.mkdir(targetPath);
  let h = [];
  for (let y of npmTarball) {
    let S = join(targetPath, y.path);
    if (y.kind === "directory") {
      await fsImplementation.mkdir(S);
      continue;
    }
    await fsImplementation.mkdir(dirname(S));
    await writeFile(S, y.data, {
      flag: "wx",
    }).catch((error) => {
      throw getErrnoCode(error) === "EEXIST"
        ? npmInstallRefusal(
            `two entries name the same file on this filesystem (${printablePackageName(y.path)})`,
          )
        : error;
    });
    if (y.mode & FILE_MODE_MASK) await chmod(S, y.mode & MAX_PRINTABLE_CODE).catch(() => {});
    h.push(y.path);
  }
  logForDebugging(`Unpacked npm tarball to ${targetPath}: ${h.length} files`);
  return h;
}
//@ chunk-e6aww6q8.js:4395039-4396489 placement
/**
 * 解析 npm tarball（tar 头校验、大小限制、越界检查）。
 */
async function parseNpmTarball(e) {
  let n = await gunzipTarball_2(e);
  let r = [];
  let s = new Set();
  let h;
  let y;
  let S = 0;
  while (S + MIN_PRINTABLE_CODE <= n.length) {
    let chunk = n.subarray(S, S + MIN_PRINTABLE_CODE);
    if (isAllZeroBytes(chunk)) break;
    if (!verifyTarHeaderChecksum(chunk))
      throw npmInstallRefusal("a header checksum does not match (corrupt tarball)");
    let tarField = readTarField(chunk, TAR_CHECKSUM_OFFSET.name);
    let tarNumber = readTarNumber(chunk, TAR_CHECKSUM_OFFSET.size);
    let Z = S + MIN_PRINTABLE_CODE;
    let Se = Z + tarNumber;
    if (tarNumber < 0) throw npmInstallRefusal("an entry declares a negative size (corrupt tarball)");
    if (tarNumber > MAX_SINGLE_ENTRY_BYTES)
      throw npmInstallRefusal(
        `an entry is larger than ${bytesToMiB(MAX_SINGLE_ENTRY_BYTES)} MB (${printablePackageName(tarField)})`,
      );
    if (Se > n.length)
      throw npmInstallRefusal("an entry runs past the end of the archive (truncated tarball)");
    let buf = n.subarray(Z, Se);
    S = Z + Math.ceil(tarNumber / MIN_PRINTABLE_CODE) * MIN_PRINTABLE_CODE;
    let tarTypeFlag = readTarTypeFlag(chunk);
    let Ee = h ?? y;
    switch (tarTypeFlag) {
      case "x":
        h = decodeChunk(buf).get("path") ?? h;
        continue;
      case "L":
        y = readCString(buf);
        continue;
      case "g":
      case "K":
        continue;
      case "1":
      case "2":
        throw npmInstallRefusal(
          `it contains a ${tarLinkKindLabel(tarTypeFlag)} (${printablePackageName(Ee ?? tarField)}); links are not allowed in a plugin package`,
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
    let Ae = Ee ?? tarEntryPath(chunk, tarField);
    h = undefined;
    y = undefined;
    let filePath = stripPackageRoot(Ae);
    if (filePath === null) continue;
    if (!isSafeZipPath(filePath) || filePath.includes("\\"))
      throw npmInstallRefusal(
        `it contains an entry outside the package folder (${printablePackageName(Ae)})`,
      );
    if (r.length >= MAX_TARBALL_ENTRIES)
      throw npmInstallRefusal(`it contains more than ${MAX_TARBALL_ENTRIES} entries`);
    if (s.has(filePath))
      throw npmInstallRefusal(`it contains the same path twice (${printablePackageName(Ae)})`);
    s.add(filePath);
    let Me = tarTypeFlag === "5";
    r.push(
      Me
        ? {
            kind: "directory",
            path: filePath,
          }
        : {
            kind: "file",
            path: filePath,
            data: buf,
            mode: readTarNumber(chunk, TAR_CHECKSUM_OFFSET.mode),
          },
    );
  }
  if (!r.some((L) => L.kind === "file")) throw npmInstallRefusal("it contains no files");
  return r;
}
//@ chunk-e6aww6q8.js:4396489-4396784 placement
async function gunzipTarball_2(e) {
  try {
    return await gunzipTarball(e, {
      maxOutputLength: MAX_TARBALL_BYTES,
    });
  } catch (error) {
    let s =
      error instanceof RangeError
        ? `The npm package unpacks to more than ${bytesToMiB(MAX_TARBALL_BYTES)} MB and was not installed`
        : "The npm package tarball is not valid gzip data and was not installed";
    throw telemetrySafeError(s, "npm tarball gunzip failed");
  }
}
//@ chunk-e6aww6q8.js:4396784-4396843 placement
function tarLinkKindLabel(tarTypeFlag) {
  return tarTypeFlag === "1" ? "hard link" : "symbolic link";
}
//@ chunk-e6aww6q8.js:4396843-4396946 placement
function tarEntryPath(e, tarField) {
  let s = readTarField(e, TAR_CHECKSUM_OFFSET.magic).startsWith("ustar")
    ? readTarField(e, TAR_CHECKSUM_OFFSET.prefix)
    : "";
  return s ? `${s}/${tarField}` : tarField;
}
//@ chunk-e6aww6q8.js:4396946-4397036 placement
function readTarTypeFlag(e) {
  let uInt8 = e.readUInt8(TAR_CHECKSUM_OFFSET.typeflag[0]);
  return uInt8 === 0 ? "0" : String.fromCharCode(uInt8);
}
//@ chunk-e6aww6q8.js:4397036-4397126 placement
function npmInstallRefusal(e) {
  return telemetrySafeError(`The npm package was not installed: ${e}`, "npm tarball refused");
}
//@ chunk-e6aww6q8.js:4397126-4397161 placement
function telemetrySafeError(e, n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(e, n);
}
//@ chunk-e6aww6q8.js:4397161-4397301 placement
class NpmFetchRefusal extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  pluginCommandErrorCategory;
  constructor(e, n, pluginCommandErrorCategory) {
    super(e, n);
    this.name = "NpmFetchRefusal";
    this.pluginCommandErrorCategory = pluginCommandErrorCategory;
  }
}
//@ chunk-e6aww6q8.js:4397301-4397440 placement
function stripPackageRoot(e) {
  let replaced = e.replace(/^\.\//, "");
  let index = replaced.indexOf("/");
  if (index < 0) return null;
  let replaced_2 = replaced.slice(index + 1).replace(/\/+$/, "");
  return replaced_2 === "" ? null : replaced_2;
}
//@ chunk-e6aww6q8.js:4397440-4397483 placement
function isAllZeroBytes(e) {
  return e.every((n) => n === 0);
}
//@ chunk-e6aww6q8.js:4397483-4397607 placement
function verifyTarHeaderChecksum(e) {
  let tarNumber = readTarNumber(e, TAR_CHECKSUM_OFFSET.checksum);
  let r = 0;
  for (let idx = 0; idx < MIN_PRINTABLE_CODE; idx++) {
    let h = idx >= entryPathSafe && idx < entryPathLengthOk;
    r += h ? TAR_HEADER_OFFSETS : e.readUInt8(idx);
  }
  return r === tarNumber;
}
//@ chunk-e6aww6q8.js:4397607-4397659 placement
function readTarField(e, [n, r]) {
  return readCString(e.subarray(n, n + r));
}
//@ chunk-e6aww6q8.js:4397659-4397741 placement
function readCString(e) {
  let index = e.indexOf(0);
  return (index < 0 ? e : e.subarray(0, index)).toString("utf8");
}
//@ chunk-e6aww6q8.js:4397741-4397916 placement
function readTarNumber(e, [n, r]) {
  let chunk = e.subarray(n, n + r);
  if ((chunk.readUInt8(0) & INTEGRITY_ALGORITHMS) !== 0)
    return chunk.subarray(1).reduce((acc, w) => acc * NPM_PACKAGE_NAME_RE + w, 0);
  let trimmed = readCString(chunk).trim();
  return trimmed === "" ? 0 : parseInt(trimmed, ARCHIVE_SUFFIX_RE) || 0;
}
//@ chunk-e6aww6q8.js:4398208-4398790 placement
/**
 * 下载 npm 插件包到 targetPath：非 npm 市场通道且不是包名时按链接或 tarball 处理；否则解析版本、下载 tarball、 校验完整性（需要时与记录的 integrity 对比）、解包；npm 市场通道还校验包名、策略与 package.json 身份。
 */
async function fetchNpmPackage(request, options) {
  let { packageName, versionSpec, targetPath } = request;
  await getFsImplementation().mkdir(options.workDir);
  if (!options.isNpmMarketplaceLane && !isValidNpmPackageNameLoose(packageName)) {
    let L = versionSpec === undefined ? splitNpmSpec(packageName) : undefined;
    return L === undefined
      ? fetchNpmLinkSource(request, options)
      : fetchNpmPackage(
          {
            ...request,
            ...L,
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
//@ chunk-e6aww6q8.js:4398790-4399110 placement
/**
 * 解包后的 package.json 名字/版本须与解析结果一致。
 */
async function assertUnpackedManifestMatches(targetPath, resolved) {
  let packageJsonIdentity = await readPackageJsonIdentity(targetPath);
  if (packageJsonIdentity.name === resolved.name && packageJsonIdentity.version === resolved.version) return;
  await removeDirectoryTreeNoFollow_2(targetPath).catch(() => {});
  throw telemetrySafeError(
    `${resolved.name}@${resolved.version} was not installed: the downloaded package calls itself ` +
      printablePackageName(
        `${packageJsonIdentity.name ?? "(no name)"}@${packageJsonIdentity.version ?? "(no version)"}`,
      ),
    "npm tarball manifest does not match the resolution",
  );
}
//@ chunk-e6aww6q8.js:4399110-4399410 placement
/**
 * tarball 与安装时记录的完整性一致，否则提示 plugin update。
 */
function assertRecordedIntegrity(tarball, resolved, expectedIntegrity) {
  if (integrityMatches(tarball, expectedIntegrity)) return;
  throw telemetrySafeError(
    `${resolved.name}@${resolved.version} was not loaded: the registry now serves different contents for this version than were installed; run \`claude plugin update\` for it to accept what the registry serves`,
    "npm tarball differs from the recorded install integrity",
  );
}
//@ chunk-e6aww6q8.js:4399410-4399741 placement
/**
 * registry 返回的包名一致且策略允许。
 */
function assertNpmResolutionAllowed(packageName, resolved) {
  if (resolved.name !== packageName)
    throw telemetrySafeError(
      `${packageName} was not installed: the registry answered with a different package name (${printablePackageName(resolved.name)})`,
      "npm registry answered with a different package name",
    );
  let r = npmResolutionPolicyRefusal({
    packageName,
    tarballUrl: resolved.tarballUrl,
  });
  if (r !== null) throw new NpmFetchRefusal(r, "npm marketplace install refused by managed policy", "policy");
}
//@ chunk-e6aww6q8.js:4399741-4399809 placement
/**
 * isValidNpmPackageNameLoose：小写后是否为合法 npm 包名。
 */
function isValidNpmPackageNameLoose(e) {
  return isValidNpmPackageName(e.replace(/[A-Z]/g, (n) => n.toLowerCase()));
}
//@ chunk-e6aww6q8.js:4399809-4399941 placement
function splitNpmSpec(packageName) {
  let index = packageName.indexOf("@", 1);
  let sliced = packageName.slice(0, index);
  let sliced_2 = packageName.slice(index + 1);
  return index > 0 && isValidNpmPackageNameLoose(sliced) && isNpmVersionSpec(sliced_2)
    ? {
        packageName: sliced,
        versionSpec: sliced_2,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:4399941-4400537 placement
/**
 * 非 registry 包名（链接/tarball）的 npm 源下载与解包。
 */
async function fetchNpmLinkSource({ packageName, versionSpec, targetPath }, options) {
  let h = versionSpec ? `${packageName}@${versionSpec}` : packageName;
  let y = await npmPackTarball(h, options, {
    refusal: ({ reason, moved }) =>
      `"${printablePackageName(redactUrlsInMessage(h))}" was not installed: ` +
      (moved
        ? `npm may move this link onto the npm registry the marketplace sets, and there it ${reason}. The marketplace's owner can fix that.`
        : `it ${reason}. An npm plugin source must name a registry package (name or name@version) or link to a tarball file. For a plugin in a git repository, use a "github", "url" or "git-subdir" source.`),
  });
  await unpackNpmTarball(y, targetPath);
  let packageJsonIdentity = await readPackageJsonIdentity(targetPath);
  return {
    name: packageJsonIdentity.name ?? packageName,
    version: packageJsonIdentity.version ?? versionSpec ?? "unknown",
    tarballUrl: packageName,
  };
}
//@ chunk-e6aww6q8.js:4400537-4400802 placement
async function readPackageJsonIdentity(e) {
  try {
    let n = jsonParse(
      await getFsImplementation().readFile(join(e, "package.json"), {
        encoding: "utf8",
      }),
    );
    let r = Reflect.get(Object(n), "name");
    let s = Reflect.get(Object(n), "version");
    return isDefinedValue({
      name: typeof r === "string" ? r : undefined,
      version: typeof s === "string" ? s : undefined,
    });
  } catch {
    return {};
  }
}
//@ chunk-e6aww6q8.js:4413764-4413825 placement
/**
 * npmMarketplaceEnabled：npm 市场功能开关。
 */
function npmMarketplaceEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugins_npm_marketplace", npmMarketplaceDefaultOff);
}
//@ chunk-e6aww6q8.js:4413825-4413935 placement
/**
 * 账号未开放 <package>@npm 直接安装。
 */
var NPM_DIRECT_INSTALL_DISABLED_MESSAGE =
  "Installing plugins straight from an npm registry (`<package>@npm`) is not enabled for this account.";
//@ chunk-e6aww6q8.js:4413935-4413958 placement
var NPM_REGISTRY = "npm:registry";
//@ chunk-e6aww6q8.js:4413958-4414097 placement
/**
 * 包名/版本/registry 转 npm 插件源。
 */
function toNpmPluginSource(e, n) {
  return npmPluginSource(e.packageName, {
    ...(e.versionSpec !== undefined && {
      version: e.versionSpec,
    }),
    ...(n !== undefined && {
      registry: new URL(n).href,
    }),
  });
}
//@ chunk-e6aww6q8.js:4414097-4414235 placement
function toNpmMarketplaceSource(packageName, n) {
  let version = n?.version;
  let npmRegistry = n?.npmRegistry;
  let h =
    version === undefined
      ? {}
      : {
          version,
        };
  return {
    ...npmPluginSource(packageName, {
      ...h,
      ...(npmRegistry !== undefined && {
        registry: npmRegistry,
      }),
    }),
    ...h,
  };
}
//@ chunk-e6aww6q8.js:4414235-4414294 placement
function npmPluginSource(e, n) {
  return {
    name: e,
    strict: true,
    source: installVersion(e, n),
  };
}
//@ chunk-e6aww6q8.js:4414294-4414348 placement = installVersion (0.763)
function installVersion(e, n) {
  return {
    source: "npm",
    package: e,
    ...n,
  };
}
export {
  npmMarketplaceEnabled,
  NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
  toNpmPluginSource,
  NPM_REGISTRY,
  resolveNpmPackage,
  TAR_HEADER_OFFSETS,
  GIT_HOSTING_PROVIDERS,
  isValidNpmPackageNameLoose,
  fetchNpmPackage,
  toNpmMarketplaceSource,
  fdRealPath,
  semverCompat,
  checkTarballUrl,
  isNpmVersionSpec,
  npmExecEnv,
  runNpm,
  getDefaultHttpNpmRegistry,
};
