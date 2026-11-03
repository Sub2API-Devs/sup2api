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
import {
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  readlink as readlink_5,
  readlink as readlink_6,
  readlink as readlink_7,
  readlink as readlink_8,
  readlink as readlink_9,
  readlink as readlink_10,
  readlink as readlink_11,
  readlink as readlink_12,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
  writeFile as writeFile_5,
  writeFile as writeFile_6,
  writeFile as writeFile_7,
  writeFile as writeFile_8,
  writeFile as writeFile_9,
  writeFile as writeFile_10,
  writeFile as writeFile_11,
  writeFile as writeFile_12,
  writeFile as writeFile_13,
  writeFile as writeFile_14,
  writeFile as writeFile_15,
  writeFile as writeFile_16,
  writeFile as writeFile_17,
  writeFile as writeFile_18,
  chmod,
  chmod as chmod_2,
  chmod as chmod_3,
  chmod as chmod_4,
  chmod as chmod_5,
} from "fs/promises";
import { promisify } from "util";
import { gunzip } from "zlib";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
} from "crypto";
import { getPlatform } from "../platform.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { Vy } from "../../../vendor/semver/index.js";
import { subprocessEnv, hipaaWithholdsChildCredentials } from "../subprocessEnv.js";
import { Cxi } from "../settings/settingsSourceTrust.js";
import { GITHUB_HOST, normalizeHostCached } from "../git/githubUrl.js";
import { redactUrlsInMessage, redactUrlsInText } from "../redaction/urlRedaction.js";
import { buildNpmRegistryArgs } from "./pluginLoader.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { isHttpUrl, isValidNpmPackageName } from "./schemas.js";
import { Do } from "../git/gitSafeEnv.js";
import { jsonParse } from "../slowOperations.js";
import { printableName } from "../printableName.js";
import { getFsImplementation } from "../fsOperations.js";
import { logForDebugging } from "../debug.js";
import { firstLineOf } from "../stringUtils.js";
import { getErrnoCode, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { decodeChunk } from "../../upstreamproxy/relay.js";
import { isSafeZipPath } from "../dxt/zip.js";
import { removeDirectoryTreeNoFollow } from "../fsRemove.js";
import { npmResolutionPolicyRefusal } from "./marketplacePolicy.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { Nks } from "./pluginDependencies.js";

/**
 * Linux/WSL 上经 /proc/self/fd 取文件描述符的真实路径。
 */
//@ chunk-e6aww6q8.js:4386422-4386612 placement
async function fdRealPath(e) {
  let n = getPlatform();
  if (n !== "linux" && n !== "wsl") return null;
  try {
    let r = await readlink_10(`/proc/self/fd/${e}`);
    return r.startsWith("/") && !r.endsWith(" (deleted)") ? r : null;
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:4386612-4386631 placement
var yft = Re(Vy(), 1);
//@ chunk-e6aww6q8.js:4386739-4386757 placement
var t5 = Re(Vy(), 1);
//@ chunk-e6aww6q8.js:4386869-4386912 placement
var B_s = { npm_config_ignore_scripts: "true" };
//@ chunk-e6aww6q8.js:4386912-4387008 placement
function lDe() {
  let e = { ...subprocessEnv(), ...B_s };
  if (!hipaaWithholdsChildCredentials() && Cxi()) return { env: e };
  return { env: e, extendEnv: !1 };
}
//@ chunk-e6aww6q8.js:4387008-4387665 placement
var parseNpmPackument = 60000,
  Q_s = 30000,
  Z_s = 300000,
  eSs = 8388608,
  uDe = 1048576,
  tSs = 256,
  nSs = 512,
  aSs = 256,
  Qct = tSs * uDe,
  Ozn = nSs * uDe,
  Izn = aSs * uDe,
  Dzn = 1e5,
  lSs = 300,
  dSs = 120,
  cSs = 4,
  e5 = 512,
  fSs = 493,
  SSs = 73,
  rft = 32,
  bSs = 127,
  wSs = 128,
  TSs = 256,
  vSs = 8,
  RSs = 10,
  Ox = {
    name: [0, 100],
    mode: [100, 8],
    size: [124, 12],
    checksum: [148, 8],
    typeflag: [156, 1],
    magic: [257, 6],
    prefix: [345, 155],
  },
  CSs = ["name", "version", "dist.tarball", "dist.integrity", "dist.shasum", "dist-tags.latest"],
  ASs = ["sha512", "sha384", "sha256", "sha1"],
  PSs = /^[a-z0-9][a-z0-9._-]{0,127}$/i,
  MSs = /[.](?:tgz|tar.gz|tar)$/i,
  OSs = new Set([GITHUB_HOST, `gist.${GITHUB_HOST}`, "gitlab.com", "bitbucket.org", "git.sr.ht"]),
  ISs = Ox.checksum[0],
  DSs = Ox.checksum[0] + Ox.checksum[1],
  LSs = promisify(gunzip);
/**
 * 用 npm view 解析插件包版本，名字非法时拒绝。
 */
//@ chunk-e6aww6q8.js:4387665-4388524 placement
async function resolveNpmPackage(e, n, r) {
  let s = `${e}@${n ?? "latest"}`;
  if (!bT(e))
    throw Xk(
      `"${kw(redactUrlsInMessage(e))}" was not fetched: it is not a valid npm package name. Valid names look like "my-plugin" or "@scope/my-plugin".`,
      "npm package name is not a registry name",
    );
  (assertNpmVersionSpec(e, n), await checkRegistryOverride(e, r));
  let h = await aie(["view", "--json", ...buildNpmRegistryArgs(r, e), "--", s, ...CSs], r, parseNpmPackument);
  if (h.code !== 0)
    throw Xk(
      `Could not resolve ${s} from the npm registry: ` + npmErrorSummary(h.stdout, h.stderr),
      "npm view failed",
    );
  let y = pickNpmVersion(parseNpmViewVersions(h.stdout), n);
  if (!y)
    throw Xk(
      `Could not resolve ${s} from the npm registry: no version matches`,
      "npm view returned no versions",
    );
  if (y.tarballUrl === void 0)
    throw Xk(
      `Could not resolve ${s} from the npm registry: the registry did not report a tarball URL`,
      "npm view returned no tarball",
    );
  return {
    name: y.name ?? e,
    version: y.version,
    tarballUrl: y.tarballUrl,
    ...ift({ integrity: y.integrity, shasum: y.shasum }),
  };
}
//@ chunk-e6aww6q8.js:4388524-4388714 placement
function assertNpmVersionSpec(e, n) {
  if (n === void 0 || iie(n)) return;
  throw Xk(
    `${e} was not resolved: "${kw(n)}" is not a version, a semver range or a dist-tag`,
    "npm version spec is not a version, range or tag",
  );
}
//@ chunk-e6aww6q8.js:4388714-4388926 placement
async function getDefaultHttpNpmRegistry(e) {
  let n = await aie(["config", "get", "registry", "--workspaces=false"], e, Q_s),
    trimmed = n.stdout.trim();
  if (n.code !== 0 || !URL.canParse(trimmed)) return;
  let s = new URL(trimmed);
  return s.protocol === "http:" ? s.origin : void 0;
}
//@ chunk-e6aww6q8.js:4388926-4389182 placement
function checkTarballUrl(e, n, r, s = "npm") {
  let h = validateNpmRegistryUrl(e, r, s);
  if (h !== void 0) return { reason: h, moved: !1 };
  if (n === void 0) return;
  let { pathname: pathname } = new URL(e),
    S = URL.canParse(pathname, n)
      ? validateNpmRegistryUrl(new URL(pathname, n).href, r, s)
      : "is not an http or https link";
  return S === void 0 ? void 0 : { reason: S, moved: !0 };
}
//@ chunk-e6aww6q8.js:4389182-4389893 placement
function validateNpmRegistryUrl(e, n, r) {
  if (!/^https?:\/\//i.test(e) || !URL.canParse(e)) return "is not an http or https link";
  if (/[\s#\\]/.test(e) || hasControlChars_2(e))
    return 'contains a "#", whitespace, a backslash or a control character';
  let s = new URL(e),
    h = normalizeHostCached(s.hostname),
    y = h === "gitlab.com" && s.pathname.startsWith("/api/v4/") && s.pathname.includes("/-/");
  if (OSs.has(h) && !y)
    return `is on GitHub, GitLab, Bitbucket or SourceHut, where ${r} may fetch it as a git repository and run its setup script`;
  if (s.pathname.startsWith("//")) return 'starts its path with "//"';
  if (s.protocol === "http:" && s.origin !== n)
    return `is an unencrypted http link on a host other than your npm registry, so ${r} could send your saved registry token to it in the clear`;
  return;
}
//@ chunk-e6aww6q8.js:4389893-4389995 placement
function hasControlChars_2(e) {
  for (let n = 0; n < e.length; n++) {
    let code = e.charCodeAt(n);
    if (code < rft || code === bSs) return !0;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:4389995-4390070 placement
function iie(e) {
  return !MSs.test(e) && (t5.validRange(e) !== null || PSs.test(e));
}
//@ chunk-e6aww6q8.js:4390070-4390167 placement
function aie(e, n, r) {
  return execFileNoThrowWithCwd(
    "npm",
    [`--git=${join_122(n.workDir, "git-is-disabled")}`, ...e],
    npmExecOptions(n, r),
  );
}
//@ chunk-e6aww6q8.js:4390167-4390322 placement
function npmExecOptions(e, n) {
  return {
    cwd: e.workDir,
    timeout: n,
    maxBuffer: eSs,
    stdin: "ignore",
    ...lDe(),
    ...(e.toolCgroupClass !== void 0 && { toolCgroupClass: e.toolCgroupClass }),
  };
}
/**
 * 检查为插件设置的 npm registry：不是合法 URL 抛 validation 拒绝；http 且不是用户默认 registry 时抛 policy 拒绝（避免明文泄露令牌）。 返回默认 http registry（若是）。
 */
//@ chunk-e6aww6q8.js:4390322-4391044 placement
async function checkRegistryOverride(e, n) {
  if (n.registry === void 0) return;
  if (!isHttpUrl(n.registry))
    throw new NpmFetchRefusal(
      `"${kw(redactUrlsInMessage(e))}" was not fetched: the npm registry set for it is not a valid address.`,
      "npm registry override is not a URL",
      "validation",
    );
  let { origin: origin, protocol: protocol } = new URL(n.registry);
  if (protocol !== "http:") return;
  let h = await getDefaultHttpNpmRegistry(n);
  if (origin !== h)
    throw new NpmFetchRefusal(
      `"${kw(redactUrlsInMessage(e))}" was not fetched: its npm registry, ${origin}, is unencrypted and isn't your default npm registry, so npm could send your saved registry token to it in the clear. It works once the registry uses https (for a marketplace plugin, the marketplace's owner sets it) or is your default npm registry (npm config set registry <url>).`,
      "npm registry override is http",
      "policy",
    );
  return h;
}
//@ chunk-e6aww6q8.js:4391264-4391485 placement
function pickNpmVersion(e, n) {
  let [r] = e;
  if (!r || e.length === 1) return r;
  let mapped = e.map((w) => w.version),
    latestTag = r.latestTag,
    S =
      latestTag !== void 0 && n !== void 0 && mapped.includes(latestTag) && BSs(latestTag, n)
        ? latestTag
        : (t5.maxSatisfying(mapped, n ?? "*") ?? mapped.at(-1));
  return e.find((w) => w.version === S);
}
//@ chunk-e6aww6q8.js:4391485-4391548 placement
function BSs(e, n) {
  try {
    return t5.satisfies(e, n);
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:4391548-4391665 placement
function parseNpmViewVersions(e) {
  let n = Bzn(e);
  return (Array.isArray(n) ? n : n === null ? [] : [n]).flatMap((r) => {
    let s = toNpmViewRecord(r);
    return s ? [s] : [];
  });
}
/**
 * npm view 单条记录取 version/name/tarball/integrity/shasum/latest。
 */
//@ chunk-e6aww6q8.js:4391665-4391994 placement
function toNpmViewRecord(e) {
  if (typeof e !== "object" || !e) return;
  let n = e;
  function r(h) {
    let y = Reflect.get(n, h);
    return typeof y === "string" ? y : void 0;
  }
  let s = r("version");
  if (s === void 0) return;
  return {
    version: s,
    ...ift({
      name: r("name"),
      tarballUrl: r("dist.tarball"),
      integrity: r("dist.integrity"),
      shasum: r("dist.shasum"),
      latestTag: r("dist-tags.latest"),
    }),
  };
}
//@ chunk-e6aww6q8.js:4391994-4392039 placement
function ift(e) {
  return Do(e, (n) => n !== void 0);
}
//@ chunk-e6aww6q8.js:4392039-4392106 placement
function Bzn(e) {
  try {
    return jsonParse(e.trim() || "null");
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:4392106-4392389 placement
function npmErrorSummary(e, n) {
  let r = Bzn(e),
    s = r?.error?.summary,
    h = r?.error?.code,
    y = typeof h === "string" ? `${h} ` : "",
    w =
      typeof s === "string" && s.length > 0
        ? `${y}${s}`
        : (n
            .split(
              `
`,
            )
            .map((L) => L.replace(/^npm (ERR!|error) ?/, "").trim())
            .find((L) => L.length > 0) ?? "npm exited with an error");
  return printableName(redactUrlsInMessage(w), lSs);
}
/**
 * 下载已解析的 tarball 并校验完整性。
 */
//@ chunk-e6aww6q8.js:4392389-4392812 placement
async function downloadNpmTarball(e, n) {
  let r = `${e.name}@${e.version}`,
    s = await npmPackTarball(e.tarballUrl, n, {
      displaySpec: r,
      refusal: ({ reason: reason, moved: moved }) =>
        `"${kw(r)}" was not installed: ` +
        (moved
          ? `npm may move this package's download address onto the npm registry the marketplace sets, and there it ${reason}. The marketplace's owner can fix that.`
          : `its registry lists a download address that ${reason}. The package's publisher can fix that.`),
    });
  return (checkNpmIntegrity(s, e, n), s);
}
/**
 * 用 npm pack 下载插件包（--ignore-scripts）。
 */
//@ chunk-e6aww6q8.js:4392812-4393591 placement
async function npmPackTarball(e, n, { displaySpec: displaySpec = e, refusal: refusal }) {
  let y =
      (await checkRegistryOverride(displaySpec, n)) ??
      (/^http:/i.test(e) ? await getDefaultHttpNpmRegistry(n) : void 0),
    S = checkTarballUrl(e, n.registry, y);
  if (S !== void 0)
    throw new NpmFetchRefusal(refusal(S), "npm spec is not a plain tarball download", "policy");
  let w = await aie(
    ["pack", "--ignore-scripts", "--loglevel=error", ...buildNpmRegistryArgs(n), "--", e],
    n,
    Z_s,
  );
  if (w.code !== 0)
    throw Xk(
      `Could not download ${displaySpec} from the npm registry: ` + npmErrorSummary(w.stdout, w.stderr),
      "npm pack failed",
    );
  let found = (await readdir_29(n.workDir)).find((q) => q.endsWith(".tgz"));
  if (found === void 0)
    throw Xk(
      `Could not download ${displaySpec}: npm pack finished without writing a tarball`,
      "npm pack wrote no tarball",
    );
  let fileBytes = await getFsImplementation().readFileBytes(join_122(n.workDir, found), Qct + 1);
  if (fileBytes.length > Qct)
    throw Xk(`${displaySpec} is larger than ${aft(Qct)} MB and was not installed`, "npm tarball too large");
  return fileBytes;
}
//@ chunk-e6aww6q8.js:4393591-4393632 placement
function aft(e) {
  return Math.floor(e / uDe);
}
//@ chunk-e6aww6q8.js:4393632-4394134 placement
function checkNpmIntegrity(e, n, r) {
  let s = `${n.name}@${n.version}`;
  if (n.integrity) {
    if (!integrityMatches(e, n.integrity)) throw tarballMismatchError(s, `integrity (${kw(n.integrity)})`);
    return;
  }
  if (n.shasum && !r.needsIntegrity) {
    if (zSs(e) !== n.shasum.toLowerCase()) throw tarballMismatchError(s, "shasum");
    return;
  }
  if (r.needsIntegrity)
    throw Xk(
      `${s} was not installed: the registry reported no integrity value to verify the download against`,
      "npm registry reported no integrity",
    );
  logForDebugging(`npm: no integrity reported for ${s}; installing the packed tarball unverified`, {
    level: "warn",
  });
}
//@ chunk-e6aww6q8.js:4394134-4394332 placement
function integrityMatches(e, n) {
  let filtered = n.split(/\s+/).filter((y) => y.includes("-")),
    found = ASs.find((y) => filtered.some((S) => firstLineOf(S, "-") === y));
  if (!found) return !1;
  let digest = createHash_23(found).update(e).digest("base64");
  return filtered.includes(`${found}-${digest}`);
}
//@ chunk-e6aww6q8.js:4394332-4394391 placement
function zSs(e) {
  return createHash_23("sha1").update(e).digest("hex");
}
//@ chunk-e6aww6q8.js:4394391-4394551 placement
function tarballMismatchError(e, n) {
  return Xk(
    `${e} was not installed: the downloaded tarball does not match the ${n} the registry reported`,
    `npm tarball ${firstLineOf(n, " ")} mismatch`,
  );
}
//@ chunk-e6aww6q8.js:4394551-4394583 placement
function kw(e) {
  return printableName(e, dSs);
}
/**
 * 解开 tarball 到目标目录（wx 独占写、保留可执行位）。
 */
//@ chunk-e6aww6q8.js:4394583-4395039 placement
async function unpackNpmTarball(e, n) {
  let r = await parseNpmTarball(e),
    s = getFsImplementation();
  await s.mkdir(n);
  let h = [];
  for (let y of r) {
    let S = join_122(n, y.path);
    if (y.kind === "directory") {
      await s.mkdir(S);
      continue;
    }
    if (
      (await s.mkdir(dirname_70(S)),
      await writeFile_16(S, y.data, { flag: "wx" }).catch((w) => {
        throw getErrnoCode(w) === "EEXIST"
          ? rE(`two entries name the same file on this filesystem (${kw(y.path)})`)
          : w;
      }),
      y.mode & SSs)
    )
      await chmod_5(S, y.mode & fSs).catch(() => {});
    h.push(y.path);
  }
  return (logForDebugging(`Unpacked npm tarball to ${n}: ${h.length} files`), h);
}
/**
 * 解析 npm tarball（tar 头校验、大小限制、越界检查）。
 */
//@ chunk-e6aww6q8.js:4395039-4396489 placement
async function parseNpmTarball(e) {
  let n = await gunzipTarball(e),
    r = [],
    s = new Set(),
    h,
    y,
    S = 0;
  while (S + e5 <= n.length) {
    let chunk = n.subarray(S, S + e5);
    if (oks(chunk)) break;
    if (!verifyTarHeaderChecksum(chunk)) throw rE("a header checksum does not match (corrupt tarball)");
    let G = Jct(chunk, Ox.name),
      q = readTarNumber(chunk, Ox.size),
      Z = S + e5,
      Se = Z + q;
    if (q < 0) throw rE("an entry declares a negative size (corrupt tarball)");
    if (q > Izn) throw rE(`an entry is larger than ${aft(Izn)} MB (${kw(G)})`);
    if (Se > n.length) throw rE("an entry runs past the end of the archive (truncated tarball)");
    let chunk_2 = n.subarray(Z, Se);
    S = Z + Math.ceil(q / e5) * e5;
    let we = tks(chunk),
      Ee = h ?? y;
    switch (we) {
      case "x":
        h = decodeChunk(chunk_2).get("path") ?? h;
        continue;
      case "L":
        y = uft(chunk_2);
        continue;
      case "g":
      case "K":
        continue;
      case "1":
      case "2":
        throw rE(`it contains a ${XSs(we)} (${kw(Ee ?? G)}); links are not allowed in a plugin package`);
      case "3":
      case "4":
      case "6":
        throw rE("it contains a device or FIFO entry");
      case "0":
      case "7":
      case "5":
        break;
      default:
        throw rE('it contains an entry of unsupported type "' + printableName(we, cSs) + '"');
    }
    let Ae = Ee ?? tarEntryPath(chunk, G);
    ((h = void 0), (y = void 0));
    let Ie = stripPackageRoot(Ae);
    if (Ie === null) continue;
    if (!isSafeZipPath(Ie) || Ie.includes("\\"))
      throw rE(`it contains an entry outside the package folder (${kw(Ae)})`);
    if (r.length >= Dzn) throw rE(`it contains more than ${Dzn} entries`);
    if (s.has(Ie)) throw rE(`it contains the same path twice (${kw(Ae)})`);
    s.add(Ie);
    let Me = we === "5";
    r.push(
      Me
        ? { kind: "directory", path: Ie }
        : { kind: "file", path: Ie, data: chunk_2, mode: readTarNumber(chunk, Ox.mode) },
    );
  }
  if (!r.some((L) => L.kind === "file")) throw rE("it contains no files");
  return r;
}
//@ chunk-e6aww6q8.js:4396489-4396784 placement
async function gunzipTarball(e) {
  try {
    return await LSs(e, { maxOutputLength: Ozn });
  } catch (error) {
    let s =
      error instanceof RangeError
        ? `The npm package unpacks to more than ${aft(Ozn)} MB and was not installed`
        : "The npm package tarball is not valid gzip data and was not installed";
    throw Xk(s, "npm tarball gunzip failed");
  }
}
//@ chunk-e6aww6q8.js:4396784-4396843 placement
function XSs(e) {
  return e === "1" ? "hard link" : "symbolic link";
}
//@ chunk-e6aww6q8.js:4396843-4396946 placement
function tarEntryPath(e, n) {
  let s = Jct(e, Ox.magic).startsWith("ustar") ? Jct(e, Ox.prefix) : "";
  return s ? `${s}/${n}` : n;
}
//@ chunk-e6aww6q8.js:4396946-4397036 placement
function tks(e) {
  let uInt8 = e.readUInt8(Ox.typeflag[0]);
  return uInt8 === 0 ? "0" : String.fromCharCode(uInt8);
}
//@ chunk-e6aww6q8.js:4397036-4397126 placement
function rE(e) {
  return Xk(`The npm package was not installed: ${e}`, "npm tarball refused");
}
//@ chunk-e6aww6q8.js:4397126-4397161 placement
function Xk(e, n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(e, n);
}
//@ chunk-e6aww6q8.js:4397161-4397301 placement
class NpmFetchRefusal extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  pluginCommandErrorCategory;
  constructor(e, n, r) {
    super(e, n);
    ((this.name = "NpmFetchRefusal"), (this.pluginCommandErrorCategory = r));
  }
}
//@ chunk-e6aww6q8.js:4397301-4397440 placement
function stripPackageRoot(e) {
  let replaced = e.replace(/^\.\//, ""),
    index = replaced.indexOf("/");
  if (index < 0) return null;
  let replaced_2 = replaced.slice(index + 1).replace(/\/+$/, "");
  return replaced_2 === "" ? null : replaced_2;
}
//@ chunk-e6aww6q8.js:4397440-4397483 placement
function oks(e) {
  return e.every((n) => n === 0);
}
//@ chunk-e6aww6q8.js:4397483-4397607 placement
function verifyTarHeaderChecksum(e) {
  let n = readTarNumber(e, Ox.checksum),
    r = 0;
  for (let s = 0; s < e5; s++) {
    let h = s >= ISs && s < DSs;
    r += h ? rft : e.readUInt8(s);
  }
  return r === n;
}
//@ chunk-e6aww6q8.js:4397607-4397659 placement
function Jct(e, [n, r]) {
  return uft(e.subarray(n, n + r));
}
//@ chunk-e6aww6q8.js:4397659-4397741 placement
function uft(e) {
  let index = e.indexOf(0);
  return (index < 0 ? e : e.subarray(0, index)).toString("utf8");
}
//@ chunk-e6aww6q8.js:4397741-4397916 placement
function readTarNumber(e, [n, r]) {
  let chunk = e.subarray(n, n + r);
  if ((chunk.readUInt8(0) & wSs) !== 0) return chunk.subarray(1).reduce((S, w) => S * TSs + w, 0);
  let trimmed = uft(chunk).trim();
  return trimmed === "" ? 0 : parseInt(trimmed, vSs) || 0;
}
/**
 * 下载 npm 插件包到 targetPath：非 npm 市场通道且不是包名时按链接或 tarball 处理；否则解析版本、下载 tarball、 校验完整性（需要时与记录的 integrity 对比）、解包；npm 市场通道还校验包名、策略与 package.json 身份。
 */
//@ chunk-e6aww6q8.js:4398208-4398790 placement
async function fetchNpmPackage(request, options) {
  let { packageName: packageName, versionSpec: versionSpec, targetPath: targetPath } = request;
  if (
    (await getFsImplementation().mkdir(options.workDir), !options.isNpmMarketplaceLane && !bT(packageName))
  ) {
    let L = versionSpec === void 0 ? splitNpmSpec(packageName) : void 0;
    return L === void 0
      ? fetchNpmLinkSource(request, options)
      : fetchNpmPackage({ ...request, ...L }, options);
  }
  let resolved = await resolveNpmPackage(packageName, versionSpec, options);
  if (
    (logForDebugging(
      `npm: ${packageName}@${versionSpec ?? "latest"} resolved to ${resolved.name}@${resolved.version} from ` +
        redactUrlsInText(resolved.tarballUrl),
    ),
    options.isNpmMarketplaceLane)
  )
    assertNpmResolutionAllowed(packageName, resolved);
  let tarball = await downloadNpmTarball(resolved, {
    registry: options.registry,
    workDir: options.workDir,
    needsIntegrity: options.isNpmMarketplaceLane,
  });
  if (options.expectedIntegrity !== void 0)
    assertRecordedIntegrity(tarball, resolved, options.expectedIntegrity);
  if ((await unpackNpmTarball(tarball, targetPath), options.isNpmMarketplaceLane))
    await assertUnpackedManifestMatches(targetPath, resolved);
  return resolved;
}
/**
 * 解包后的 package.json 名字/版本须与解析结果一致。
 */
//@ chunk-e6aww6q8.js:4398790-4399110 placement
async function assertUnpackedManifestMatches(e, n) {
  let r = await readPackageJsonIdentity(e);
  if (r.name === n.name && r.version === n.version) return;
  throw (
    await removeDirectoryTreeNoFollow(e).catch(() => {}),
    Xk(
      `${n.name}@${n.version} was not installed: the downloaded package calls itself ` +
        kw(`${r.name ?? "(no name)"}@${r.version ?? "(no version)"}`),
      "npm tarball manifest does not match the resolution",
    )
  );
}
/**
 * tarball 与安装时记录的完整性一致，否则提示 plugin update。
 */
//@ chunk-e6aww6q8.js:4399110-4399410 placement
function assertRecordedIntegrity(e, n, r) {
  if (integrityMatches(e, r)) return;
  throw Xk(
    `${n.name}@${n.version} was not loaded: the registry now serves different contents for this version than were installed; run \`claude plugin update\` for it to accept what the registry serves`,
    "npm tarball differs from the recorded install integrity",
  );
}
/**
 * registry 返回的包名一致且策略允许。
 */
//@ chunk-e6aww6q8.js:4399410-4399741 placement
function assertNpmResolutionAllowed(e, n) {
  if (n.name !== e)
    throw Xk(
      `${e} was not installed: the registry answered with a different package name (${kw(n.name)})`,
      "npm registry answered with a different package name",
    );
  let r = npmResolutionPolicyRefusal({ packageName: e, tarballUrl: n.tarballUrl });
  if (r !== null) throw new NpmFetchRefusal(r, "npm marketplace install refused by managed policy", "policy");
}
//@ chunk-e6aww6q8.js:4399741-4399809 placement
function bT(e) {
  return isValidNpmPackageName(e.replace(/[A-Z]/g, (n) => n.toLowerCase()));
}
//@ chunk-e6aww6q8.js:4399809-4399941 placement
function splitNpmSpec(e) {
  let index = e.indexOf("@", 1),
    sliced = e.slice(0, index),
    sliced_2 = e.slice(index + 1);
  return index > 0 && bT(sliced) && iie(sliced_2) ? { packageName: sliced, versionSpec: sliced_2 } : void 0;
}
/**
 * 非 registry 包名（链接/tarball）的 npm 源下载与解包。
 */
//@ chunk-e6aww6q8.js:4399941-4400537 placement
async function fetchNpmLinkSource(
  { packageName: packageName, versionSpec: versionSpec, targetPath: targetPath },
  s,
) {
  let h = versionSpec ? `${packageName}@${versionSpec}` : packageName,
    y = await npmPackTarball(h, s, {
      refusal: ({ reason: reason, moved: moved }) =>
        `"${kw(redactUrlsInMessage(h))}" was not installed: ` +
        (moved
          ? `npm may move this link onto the npm registry the marketplace sets, and there it ${reason}. The marketplace's owner can fix that.`
          : `it ${reason}. An npm plugin source must name a registry package (name or name@version) or link to a tarball file. For a plugin in a git repository, use a "github", "url" or "git-subdir" source.`),
    });
  await unpackNpmTarball(y, targetPath);
  let S = await readPackageJsonIdentity(targetPath);
  return {
    name: S.name ?? packageName,
    version: S.version ?? versionSpec ?? "unknown",
    tarballUrl: packageName,
  };
}
//@ chunk-e6aww6q8.js:4400537-4400802 placement
async function readPackageJsonIdentity(e) {
  try {
    let n = jsonParse(
        await getFsImplementation().readFile(join_122(e, "package.json"), { encoding: "utf8" }),
      ),
      r = Reflect.get(Object(n), "name"),
      s = Reflect.get(Object(n), "version");
    return ift({ name: typeof r === "string" ? r : void 0, version: typeof s === "string" ? s : void 0 });
  } catch {
    return {};
  }
}
//@ chunk-e6aww6q8.js:4413764-4413825 placement
function ZJn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugins_npm_marketplace", Nks);
}
/**
 * 账号未开放 <package>@npm 直接安装。
 */
//@ chunk-e6aww6q8.js:4413825-4413935 placement
var NPM_DIRECT_INSTALL_DISABLED_MESSAGE =
  "Installing plugins straight from an npm registry (`<package>@npm`) is not enabled for this account.";
//@ chunk-e6aww6q8.js:4413935-4413958 placement
var NPM_REGISTRY = "npm:registry";
/**
 * 包名/版本/registry 转 npm 插件源。
 */
//@ chunk-e6aww6q8.js:4413958-4414097 placement
function toNpmPluginSource(e, n) {
  return npmPluginSource(e.packageName, {
    ...(e.versionSpec !== void 0 && { version: e.versionSpec }),
    ...(n !== void 0 && { registry: new URL(n).href }),
  });
}
//@ chunk-e6aww6q8.js:4414097-4414235 placement
function toNpmMarketplaceSource(e, n) {
  let r = n?.version,
    s = n?.npmRegistry,
    h = r === void 0 ? {} : { version: r };
  return { ...npmPluginSource(e, { ...h, ...(s !== void 0 && { registry: s }) }), ...h };
}
//@ chunk-e6aww6q8.js:4414235-4414294 placement
function npmPluginSource(e, n) {
  return { name: e, strict: !0, source: installVersion(e, n) };
}
//@ chunk-e6aww6q8.js:4414294-4414348 placement = installVersion (0.763)
function installVersion(e, n) {
  return { source: "npm", package: e, ...n };
}

export {
  ZJn,
  NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
  toNpmPluginSource,
  NPM_REGISTRY,
  resolveNpmPackage,
  rft,
  RSs,
  bT,
  fetchNpmPackage,
  toNpmMarketplaceSource,
  fdRealPath,
  yft,
  checkTarballUrl,
  iie,
  lDe,
  aie,
  getDefaultHttpNpmRegistry,
};
