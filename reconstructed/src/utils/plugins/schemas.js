/**
 * utils/plugins/schemas.ts
 *
 * 并入已有模块：是否以 ./ 开头的相对来源。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/schemas.ts
 * pieces: chunk-bfnfj4kx.js (1), chunk-dcmhvw5a.js (109), chunk-yf5m6p65.js (1)
 * attribution: fingerprint 16, placement 2, layout 89, callgraph-witnessed 2, file-local 2
 */
import { posix, win32 } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  u,
  record,
  string,
  preprocess,
  array,
  unknown,
  union,
  literal,
  M,
  lazy,
  never,
  _enum,
  E,
  zodStrictObject,
  discriminatedUnion,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { McpServerConfigSchema } from "../../services/mcp/types.js";
import { normalizeGithubRepoSlug } from "./parseMarketplaceInput.js";
import {
  isGithubDotCom,
  isHost,
  hasBackslashInUrlAuthority,
  normalizeHost,
  GITHUB_HOST,
  isUnsafeRemoteUrl,
  WEB_URL_SCHEMES,
} from "../git/githubUrl.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { HooksSchema } from "../../schemas/hooks.js";
import { SCRIPT_EXTENSIONS_TEXT } from "./pluginSourceUrl.js";
import { recursivelySanitizeUnicode_2, INVISIBLE_CHAR_CLASS_SOURCE } from "../sanitization.js";
import { describeUrlScheme, tryParseUrl } from "../resultError.js";
import { parseUrlScheme } from "../redaction/urlParsing.js";
import { normalizeGitHost, nonHttpsScheme } from "../fsBoundRead.js";
import { parseScpLikeUrl } from "../gitHosts.js";
import { isPrivateHost } from "../network/privateHostCheck.js";
import { logForDebugging } from "../debug.js";
import { printableName } from "../printableName.js";
import { getPluginRegistry } from "./pluginLoadState.js";

//@ chunk-dcmhvw5a.js:71850-71894 placement
/**
 * McpJsonConfigSchema：{mcpServers: Record<string, McpServerConfig>}。
 */
var McpJsonConfigSchema = DoctorLazy(() =>
  u({
    mcpServers: record(string(), McpServerConfigSchema()),
  }),
);
//@ chunk-dcmhvw5a.js:75983-76003 fingerprint = OFFICIAL_GITHUB_ORG (1)
var OFFICIAL_GITHUB_ORG = "anthropics";
//@ chunk-dcmhvw5a.js:76003-76060 layout
/**
 * 判断来源是否指向 github.com/anthropics/ 组织下的仓库（官方保留市场名的校验依据）。
 */
function isAnthropicsGithubRepo(e) {
  return normalizeGithubRepoSlug(e)?.startsWith(`${OFFICIAL_GITHUB_ORG}/`) === true;
}
//@ chunk-dcmhvw5a.js:76060-76177 layout
var GIT_URL_PROTOCOLS = new Set(["https:", "http:", "git:", "git+https:", "git+http:", "git+ssh:", "ssh:"]);
var SSH_URL_PROTOCOLS = new Set(["ssh:", "git+ssh:"]);
//@ chunk-dcmhvw5a.js:76177-76230 layout
function isGithubOrSshGithubHost(e) {
  return isGithubDotCom(e) || isHost(e, "ssh.github.com");
}
//@ chunk-dcmhvw5a.js:76230-76250 layout
var GITLAB_COM = "gitlab.com";
//@ chunk-dcmhvw5a.js:76250-76282 layout
/**
 * 主机是否为 gitlab.com。
 */
function isGitlabHost(hostname) {
  return isHost(hostname, GITLAB_COM);
}
//@ chunk-dcmhvw5a.js:76282-76292 layout
var SCHEMA_CACHE_MAX_ENTRIES = 64;
//@ chunk-dcmhvw5a.js:76292-77849 layout
/**
 * 按字段惰性构建的 zod 对象 schema：`whole()` 是全字段 passthrough；`forDocument(doc, mode)` 只取文档里出现的键（加 activeWhenAbsent）构建 schema 并 LRU 缓存（64 项），strip 模式会对“本 schema 有但文档没有”的键报 issue。用于插件 manifest 的分字段宽容解析。
 */
class PerKeyLazySchema {
  fields;
  activeWhenAbsent;
  keys;
  built = new Map();
  byPresentKeys = new Map();
  wholeSchema;
  constructor(e, activeWhenAbsent = new Set()) {
    this.fields = e;
    this.activeWhenAbsent = activeWhenAbsent;
    this.keys = Object.keys(e).filter((key) => e[key] !== undefined);
  }
  has(e) {
    return Object.hasOwn(this.fields, e) && this.fields[e] !== undefined;
  }
  field(e) {
    let n = this.built.get(e);
    if (n) return n;
    let r = this.has(e) ? this.fields[e] : undefined;
    if (!r) return;
    let s = r();
    this.built.set(e, s);
    return s;
  }
  carries(e, n) {
    return this.activeWhenAbsent.has(n) || (typeof e === "object" && e !== null && n in e);
  }
  whole() {
    this.wholeSchema ??= u(this.shapeOf(this.keys)).passthrough();
    return this.wholeSchema;
  }
  forDocument(e, n = "passthrough") {
    let filtered = this.keys.filter((key) => this.carries(e, key));
    if (filtered.length === this.keys.length && n === "passthrough") return this.whole();
    let s = `${n}
${filtered.join(`
`)}`;
    let a = this.byPresentKeys.get(s);
    if (a) {
      this.byPresentKeys.delete(s);
      this.byPresentKeys.set(s, a);
      return a;
    }
    let c = this.shapeOf(filtered);
    let g =
      n === "strip"
        ? preprocess((m, f) => {
            for (let h of this.wrongDocumentIssues(m, c)) f.addIssue(h);
            return m;
          }, u(c))
        : u(c)
            .passthrough()
            .check((m) => {
              m.issues.push(...this.wrongDocumentIssues(m.value, c));
            });
    if (this.byPresentKeys.size >= SCHEMA_CACHE_MAX_ENTRIES)
      for (let key of this.byPresentKeys.keys()) {
        this.byPresentKeys.delete(key);
        break;
      }
    this.byPresentKeys.set(s, g);
    return g;
  }
  wrongDocumentIssues(e, n) {
    if (typeof e !== "object" || e === null) return [];
    let r = [];
    for (let key of Object.keys(e))
      if (!Object.hasOwn(n, key) && this.has(key))
        r.push({
          code: "custom",
          input: e[key],
          path: [key],
          message: "This settings schema was built for a document without this key",
        });
    return r;
  }
  shapeOf(e) {
    let n = {};
    for (let r of e) {
      let s = this.field(r);
      if (s) n[r] = s;
    }
    return n;
  }
}
//@ chunk-dcmhvw5a.js:77849-77860 layout
var COMMAND_SOURCE_MAX_TIMEOUT_SECONDS = 600;
//@ chunk-dcmhvw5a.js:77860-77879 layout
var MAX_CONSENT_COMMAND_LENGTH = 500;
var MAX_PREVIOUS_PRODUCER_PATHS = 32;
//@ chunk-dcmhvw5a.js:77879-78000 layout
function claudeaiInstallFields() {
  return {
    claudeaiPluginId: string().max(128).optional().catch(undefined),
    archiveSha256: Sha256HexSchema().optional().catch(undefined),
  };
}
//@ chunk-dcmhvw5a.js:78000-78084 layout
function directoryInstallFields() {
  return {
    directoryRepositoryKey: string().max(4096).optional().catch(undefined),
  };
}
//@ chunk-dcmhvw5a.js:78084-78223 layout
/**
 * 判断字符串是 http(s) URL。
 */
function isHttpUrl(e) {
  if (!/^https?:\/\/[^/\\]/i.test(e)) return false;
  try {
    let { protocol } = new URL(e);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
//@ chunk-dcmhvw5a.js:78223-78463 layout
function npmInstallFields() {
  return {
    npmVersionSpec: string().max(256).optional().catch(undefined),
    npmResolved: string().max(2048).optional().catch(undefined),
    npmIntegrity: string().max(256).optional().catch(undefined),
    npmRegistry: string().max(2048).refine(isHttpUrl).optional().catch(undefined),
  };
}
//@ chunk-dcmhvw5a.js:78463-79637 layout
/**
 * installed_plugins 条目里 command 来源插件的字段：用户同意过的 sourceCommand、最近一次解析出的 sourceProducerPath、之前的 producer 目录（最多 32 个，供沙箱继续写保护）。
 */
function commandSourceInstallFields() {
  return {
    sourceCommand: string()
      .max(MAX_CONSENT_COMMAND_LENGTH + 20)
      .optional()
      .catch(undefined)
      .describe(
        "The `command`-source command the user accepted at explicit install/update. The once-per-session background re-resolve only runs while the marketplace entry still declares this exact command; a changed command (or an entry that became command-sourced later) is skipped with a warning until the user runs an explicit update.",
      ),
    sourceProducerPath: string()
      .max(4096)
      .refine(isAbsolutePathAnyPlatform, {
        message: "must be an absolute path",
      })
      .optional()
      .catch(undefined)
      .describe(
        "The directory a `command`-source plugin was last resolved to (what its command printed). Served in place in link mode and re-copied every session in copy mode, so the sandbox write-denies it; refreshed on every install/update, including no-op updates that resolve to a new location.",
      ),
    previousProducerPaths: array(unknown())
      .transform((e) =>
        e
          .filter((n) => typeof n === "string" && n.length <= 4096 && isAbsolutePathAnyPlatform(n))
          .slice(-MAX_PREVIOUS_PRODUCER_PATHS),
      )
      .optional()
      .catch(undefined)
      .describe(
        "Producer directories this installation was resolved to before the current one (most recent last, bounded). A concurrent older session may still serve one of them, so the sandbox keeps write-denying them too.",
      ),
  };
}
//@ chunk-dcmhvw5a.js:79637-79694 layout
function isAbsolutePathAnyPlatform(e) {
  return posix.isAbsolute(e) || win32.isAbsolute(e);
}
//@ chunk-dcmhvw5a.js:79694-79722 layout
var UNPRINTABLE_OR_WIDE_SPACE_RE = /[^\x20-\x7E]| {4,}/;
//@ chunk-dcmhvw5a.js:79722-79995 layout
function HeadersHelperCommandSchema() {
  return string()
    .max(MAX_CONSENT_COMMAND_LENGTH, {
      message: "headersHelper must not be longer than the install consent UI can display",
    })
    .refine((e) => !UNPRINTABLE_OR_WIDE_SPACE_RE.test(e), {
      message:
        "headersHelper must be printable ASCII (letters, digits, punctuation, single spaces) with no runs of 4 or more spaces",
    });
}
//@ chunk-dcmhvw5a.js:79995-80535 fingerprint = ALLOWED_OFFICIAL_MARKETPLACE_NAMES (0.589)
/**
 * 官方市场保留名清单：官方（claude-plugins-official 等 14 个）、社区（claude-community…）、插件目录（anthropic-plugin-directory）；并集 RESERVED_MARKETPLACE_NAMES 只能由 anthropics/* 的 GitHub 来源使用。
 */
var ANTHROPIC_PLUGIN_DIRECTORY = "anthropic-plugin-directory";
var OFFICIAL_VERTICAL_MARKETPLACE_NAMES = ["healthcare"];
var COMMUNITY_MARKETPLACE_NAMES = new Set([
  "claude-community",
  "claude-plugins-community",
  ...OFFICIAL_VERTICAL_MARKETPLACE_NAMES,
]);
var ALLOWED_OFFICIAL_MARKETPLACE_NAMES = new Set([
  "claude-code-marketplace",
  "claude-code-plugins",
  "claude-plugins-official",
  "anthropic-marketplace",
  "anthropic-plugins",
  "agent-skills",
  "anthropic-agent-skills",
  "life-sciences",
  "knowledge-work-plugins",
  "claude-for-legal",
  "claude-for-financial-services",
  "financial-services-plugins",
  "first-party-plugins",
  "claude-tag-plugins",
]);
var PLUGIN_DIRECTORY_MARKETPLACE_NAMES = new Set([ANTHROPIC_PLUGIN_DIRECTORY, "claude-plugin-directory"]);
var RESERVED_MARKETPLACE_NAMES = new Set([
  ...ALLOWED_OFFICIAL_MARKETPLACE_NAMES,
  ...COMMUNITY_MARKETPLACE_NAMES,
  ...PLUGIN_DIRECTORY_MARKETPLACE_NAMES,
]);
//@ chunk-dcmhvw5a.js:80535-80607 layout
/**
 * 市场名（忽略大小写）是否在官方允许名单 ALLOWED_OFFICIAL_MARKETPLACE_NAMES 或 healthcare 中。
 */
function isOfficialMarketplaceName(marketplaceName) {
  let normalizedName = marketplaceName.toLowerCase();
  return (
    ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(normalizedName) ||
    OFFICIAL_VERTICAL_MARKETPLACE_NAMES.includes(normalizedName)
  );
}
//@ chunk-dcmhvw5a.js:80607-80672 fingerprint = NO_AUTO_UPDATE_OFFICIAL_MARKETPLACES (0.667)
var NO_AUTO_UPDATE_OFFICIAL_MARKETPLACES = new Set(["knowledge-work-plugins", "first-party-plugins"]);
//@ chunk-dcmhvw5a.js:80672-80903 callgraph-witnessed = isMarketplaceAutoUpdate (0.377)
/**
 * 市场是否自动更新：显式参数 > 条目 autoUpdate > claudeai/pluginDirectory 来源默认开 > 官方名（knowledge-work-plugins、first-party-plugins 除外）默认开。
 */
function isMarketplaceAutoUpdate(e, n, marketplaceAutoUpdate) {
  if (marketplaceAutoUpdate !== undefined) return marketplaceAutoUpdate;
  if (n.autoUpdate !== undefined) return n.autoUpdate;
  if (n.source?.source === "claudeai") return true;
  if (n.source?.source === "pluginDirectory") return true;
  let normalizedName = e.toLowerCase();
  return (
    ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(normalizedName) &&
    !NO_AUTO_UPDATE_OFFICIAL_MARKETPLACES.has(normalizedName)
  );
}
//@ chunk-dcmhvw5a.js:80903-80947 layout
var OFFICIAL_NAME_SUFFIXES = ["marketplace", "plugins", "official"];
//@ chunk-dcmhvw5a.js:80947-81001 layout
function getOfficialNameSuffixes() {
  return [...OFFICIAL_NAME_SUFFIXES, "directory", "directories"];
}
//@ chunk-dcmhvw5a.js:81001-81109 layout
var OFFICIAL_NAME_PATTERN_SOURCE =
  "official[^a-z0-9]*(anthropic|claude)|(?:anthropic|claude)[^a-z0-9]*official";
var OFFICIAL_NAME_RE = new RegExp(OFFICIAL_NAME_PATTERN_SOURCE, "i");
//@ chunk-dcmhvw5a.js:81109-81207 layout
function buildOfficialNameRegex(e) {
  return new RegExp(
    `(?:${OFFICIAL_NAME_PATTERN_SOURCE}|^(?:anthropic|claude)[^a-z0-9]*(${e.join("|")}))`,
    "i",
  );
}
//@ chunk-dcmhvw5a.js:81207-81256 layout
var LOOKALIKE_OFFICIAL_NAME_RE = buildOfficialNameRegex(getOfficialNameSuffixes());
var BLOCKED_OFFICIAL_NAME_PATTERN = buildOfficialNameRegex(OFFICIAL_NAME_SUFFIXES);
var NON_ASCII_PATTERN = /[^\u0020-\u007E]/;
//@ chunk-dcmhvw5a.js:81256-81322 layout
/**
 * 按非字母数字切分单词。
 */
function splitAlnumWords(e) {
  return e.split(/[^a-z0-9]+/i).filter((n) => n !== "");
}
//@ chunk-dcmhvw5a.js:81322-81450 layout
/**
 * 逐步拼接单词前缀（用于检测 anthropic+official 拼写变体）。
 */
function* iterJoinedWordPrefixes(e, n) {
  let r = splitAlnumWords(e);
  let s = "";
  for (let [a, c] of r.entries()) {
    s += c;
    yield {
      joined: s,
      isWhole: a === r.length - 1,
    };
    if (s.length > n) return;
  }
}
//@ chunk-dcmhvw5a.js:81450-81877 layout
/**
 * 判断市场名是否仿冒官方（anthropic/claude + official/marketplace/plugins 等组合、去分隔符后匹配、前缀拼接）；保留名本身返回 false。
 */
function isImpersonatingOfficialName(name) {
  if (RESERVED_MARKETPLACE_NAMES.has(name.toLowerCase())) return false;
  if (isBlockedOfficialName(name)) return true;
  if (LOOKALIKE_OFFICIAL_NAME_RE.test(name)) return true;
  {
    if (LOOKALIKE_OFFICIAL_NAME_RE.test(name.replace(/^[^a-z0-9]+/i, ""))) return true;
    if (/official(?:anthropic|claude)|(?:anthropic|claude)official/i.test(name.replace(/[^a-z0-9]+/gi, "")))
      return true;
    let officialNameSuffixes = getOfficialNameSuffixes();
    let regExp = new RegExp(`^(?:anthropic|claude)(?:${officialNameSuffixes.join("|")})s?$`, "i");
    let s = 9 + Math.max(...officialNameSuffixes.map((officialNameSuffix) => officialNameSuffix.length)) + 1;
    for (let { joined } of iterJoinedWordPrefixes(name, s)) if (regExp.test(joined)) return true;
  }
  return false;
}
//@ chunk-dcmhvw5a.js:81877-81920 layout
/**
 * 仿冒官方市场名且全部为 ASCII（非 ASCII 另由 isBlockedOfficialName 处理）。
 */
function isAsciiImpersonatingOfficialName(e) {
  return isImpersonatingOfficialName(e) && !NON_ASCII_PATTERN.test(e);
}
//@ chunk-dcmhvw5a.js:81920-81994 file-local
/**
 * 保留名之外，含非 ASCII 或匹配 BLOCKED_OFFICIAL_NAME_PATTERN 的市场名一律禁止。
 */
function isBlockedOfficialName(name) {
  return (
    !RESERVED_MARKETPLACE_NAMES.has(name.toLowerCase()) &&
    (NON_ASCII_PATTERN.test(name) || BLOCKED_OFFICIAL_NAME_PATTERN.test(name))
  );
}
//@ chunk-dcmhvw5a.js:81994-82055 layout
function isAnthropicsGitUrl(url) {
  let trimmed = url.trim();
  return trimmed.includes(":") && isAnthropicsGithubRepo(trimmed);
}
//@ chunk-dcmhvw5a.js:82055-82472 fingerprint = validateOfficialNameSource (0.975)
/**
 * 保留市场名只允许 github/git 来源且仓库在 anthropics/ 下；违反时返回错误文案，否则 null。
 */
function validateOfficialNameSource(name, source) {
  let normalizedName = name.toLowerCase();
  if (!RESERVED_MARKETPLACE_NAMES.has(normalizedName)) return null;
  if (source.source === "github" || (source.source === "git" && source.url)) {
    if (isAnthropicsMarketplaceSource(source)) return null;
    return `The name '${name}' is reserved for official Anthropic marketplaces. Only repositories from 'github.com/${OFFICIAL_GITHUB_ORG}/' can use this name.`;
  }
  return `The name '${name}' is reserved for official Anthropic marketplaces and can only be used with GitHub sources from the '${OFFICIAL_GITHUB_ORG}' organization.`;
}
//@ chunk-dcmhvw5a.js:82472-82611 layout
/**
 * 市场来源是否为 anthropics/ 组织下的 GitHub/git 仓库。
 */
function isAnthropicsMarketplaceSource(e) {
  if (e.source === "github") {
    let repo = e.repo ?? "";
    return !repo.includes(":") && isAnthropicsGithubRepo(repo);
  }
  return e.source === "git" && e.url !== undefined && isAnthropicsGitUrl(e.url);
}
//@ chunk-dcmhvw5a.js:82611-83957 fingerprint = McpbPath (0.36)
/**
 * 插件 manifest 路径类基础 schema（RelativePath 必须以 ./ 开头，JSON/Markdown/MCPB 路径变体）和保留市场名表：inline、builtin、skills-dir、synced、claude-plugin-test、npm 以及预留的 pip/uv/cargo/github/gh。
 */
var RelativePath = DoctorLazy(() => string().startsWith("./"));
var RelativeJSONPath = DoctorLazy(() => RelativePath().endsWith(".json"));
var RelativeSkillDirPath = DoctorLazy(() => union([literal("."), RelativePath()]));
var McpbPath = DoctorLazy(() =>
  union([
    RelativePath()
      .refine((path) => path.endsWith(".mcpb") || path.endsWith(".dxt"), {
        message: "MCPB file path must end with .mcpb or .dxt",
      })
      .describe("Path to MCPB file relative to plugin root"),
    string()
      .url()
      .refine((url) => url.endsWith(".mcpb") || url.endsWith(".dxt"), {
        message: "MCPB URL must end with .mcpb or .dxt",
      })
      .describe("URL to MCPB file"),
  ]),
);
var RelativeMarkdownPath = DoctorLazy(() => RelativePath().endsWith(".md"));
var RelativeCommandPath = DoctorLazy(() => union([RelativeMarkdownPath(), RelativePath()]));
var RESERVED_MARKETPLACE_NAME_PURPOSES = {
  inline: "--plugin-dir session plugins",
  builtin: "built-in plugins",
  "skills-dir": "plugins auto-loaded from .claude/skills/",
  synced: "plugins synced from your claude.ai account",
  "claude-plugin-test": "plugins loaded by claude plugin test",
  npm: "plugins installed from an npm registry (`<package>@npm`); remove this marketplace and add it again under another name",
  pip: "plugins installed from a Python package index (reserved; not yet available)",
  uv: "plugins installed from a Python package index through uv (reserved; not yet available)",
  cargo: "plugins installed from a Rust crate registry (reserved; not yet available)",
  github:
    "plugins installed straight from a GitHub repository (`<owner>/<repo>@github`; reserved; not yet available)",
  gh: "plugins installed straight from a GitHub repository (reserved; not yet available)",
};
var pluginManifestPathSchemas = "npm";
var UNAVAILABLE_PACKAGE_MARKETPLACES = ["pip", "uv", "cargo", "github", "gh"];
//@ chunk-dcmhvw5a.js:83957-84007 layout
/**
 * 是否为尚未开放的包市场（pip/uv/cargo/github/gh）。
 */
function isUnavailablePackageMarketplace(e) {
  return e !== undefined && UNAVAILABLE_PACKAGE_MARKETPLACES.includes(e);
}
//@ chunk-dcmhvw5a.js:84007-84103 layout
/**
 * “从 X 安装插件尚未开放”的提示。
 */
function formatPackageMarketplaceUnavailable(e) {
  return `Installing plugins from ${e} (\`<package>@${e}\`) is not available yet.`;
}
//@ chunk-dcmhvw5a.js:84103-84145 layout
/**
 * 名字是否为特殊来源保留的市场名（inline、builtin、skills-dir、synced、npm 等）。
 */
function isReservedMarketplaceName(e) {
  return Object.hasOwn(RESERVED_MARKETPLACE_NAME_PURPOSES, e);
}
//@ chunk-dcmhvw5a.js:84145-84163 layout
var PACKAGE_MARKETPLACE_NAMES = [pluginManifestPathSchemas, ...UNAVAILABLE_PACKAGE_MARKETPLACES];
//@ chunk-dcmhvw5a.js:84163-84215 layout
/**
 * 名字是否为包市场名（npm/pip/uv/cargo/github/gh）。
 */
function isPackageMarketplaceName(e) {
  return PACKAGE_MARKETPLACE_NAMES.includes(e.toLowerCase());
}
//@ chunk-dcmhvw5a.js:84215-84358 layout
function refineNotPackageMarketplaceName(e, n) {
  let lower = e.toLowerCase();
  if (isPackageMarketplaceName(lower) && isReservedMarketplaceName(lower))
    n.addIssue({
      code: "custom",
      message: `Marketplace name "${lower}" is reserved for ${RESERVED_MARKETPLACE_NAME_PURPOSES[lower]}`,
    });
}
//@ chunk-dcmhvw5a.js:84358-85131 fingerprint = MarketplaceNameSchema (0.598)
/**
 * 市场名 schema 工厂：非空、无空格、无控制/双向字符、无路径分隔符与 ..、不仿冒官方（检测函数由参数给出）、不占用保留名。
 */
var IMPERSONATION_ERROR_MESSAGE = "Marketplace name impersonates an official Anthropic/Claude marketplace";
var buildMarketplaceNameSchema = (e) =>
  string()
    .min(1, "Marketplace must have a name")
    .refine((name) => !name.includes(" "), {
      message: 'Marketplace name cannot contain spaces. Use kebab-case (e.g., "my-marketplace")',
    })
    .refine((n) => !CONTROL_OR_BIDI_CHARS_RE.test(n), {
      message: "Marketplace name cannot contain control or bidirectional-formatting characters",
    })
    .refine((name) => !name.includes("/") && !name.includes("\\") && !name.includes("..") && name !== ".", {
      message: 'Marketplace name cannot contain path separators (/ or \\), ".." sequences, or be "."',
    })
    .refine((name) => !e(name), {
      message: IMPERSONATION_ERROR_MESSAGE,
    })
    .superRefine((name, r) => {
      let lower = name.toLowerCase();
      if (!isReservedMarketplaceName(lower) || isPackageMarketplaceName(lower)) return;
      r.addIssue({
        code: "custom",
        message: `Marketplace name "${lower}" is reserved for ${RESERVED_MARKETPLACE_NAME_PURPOSES[lower]}`,
      });
    });
var MarketplaceNameSchema = DoctorLazy(() => buildMarketplaceNameSchema(isImpersonatingOfficialName));
var LenientMarketplaceNameSchema = DoctorLazy(() => buildMarketplaceNameSchema(() => false));
//@ chunk-dcmhvw5a.js:85131-85175 layout
function MarketplaceNameStrictSchema(isImpersonatingOfficialName) {
  return buildMarketplaceNameSchema(isImpersonatingOfficialName).superRefine(refineNotPackageMarketplaceName);
}
//@ chunk-dcmhvw5a.js:85175-101864 callgraph-witnessed = LspServerConfigSchema (0.255)
/**
 * 插件 manifest（.claude-plugin/plugin.json）各组成部分的 zod schema：元数据、hooks、commands、agents、skills、outputStyles、themes、workflows、mcpServers、userConfig、channels、LSP 服务器、monitors（后台监视命令）等；都用 lazySchema 包裹。
 */
var PluginNameSchema = DoctorLazy(() =>
  string()
    .min(1, "Plugin name cannot be empty")
    .refine((e) => !e.includes(" "), {
      message: 'Plugin name cannot contain spaces. Use kebab-case (e.g., "my-plugin")',
    })
    .refine((e) => !CONTROL_OR_BIDI_CHARS_RE.test(e), {
      message: "Plugin name cannot contain control or bidirectional-formatting characters",
    }),
);
var PluginAuthorSchema = DoctorLazy(() =>
  u({
    name: string()
      .min(1, "Author name cannot be empty")
      .describe("Display name of the plugin author or organization"),
    email: string().optional().describe("Contact email for support or feedback"),
    url: string().optional().describe("Website, GitHub profile, or organization URL"),
  }),
);
var PluginManifestMetadataSchema = DoctorLazy(() =>
  u({
    $schema: string()
      .optional()
      .describe("JSON Schema reference for editor autocomplete/validation; ignored at load time"),
    name: PluginNameSchema().describe(
      "Unique identifier for the plugin, used for namespacing (prefer kebab-case)",
    ),
    displayName: string()
      .optional()
      .describe(
        'Human-readable name shown in UI (e.g., "GitHub Utils"). Falls back to `name` when omitted. Unlike `name`, may contain spaces and any casing; not used for namespacing or lookup.',
      ),
    version: string()
      .optional()
      .describe("Semantic version (e.g., 1.2.3) following semver.org specification"),
    description: string().optional().describe("Brief, user-facing explanation of what the plugin provides"),
    author: PluginAuthorSchema().optional().describe("Information about the plugin creator or maintainer"),
    homepage: string().url().optional().describe("Plugin homepage or documentation URL"),
    repository: string().optional().describe("Source code repository URL"),
    license: string().optional().describe("SPDX license identifier (e.g., MIT, Apache-2.0)"),
    keywords: array(string()).optional().describe("Tags for plugin discovery and categorization"),
    defaultEnabled: M()
      .optional()
      .describe(
        "Whether the plugin starts enabled when the user has no explicit enabled/disabled setting for it (default: true). Explicit enabledPlugins values always win, and a plugin required by an enabled dependent is enabled regardless of this value.",
      ),
    dependencies: array(DependencyRefSchema())
      .optional()
      .describe(
        `Plugins that must be enabled for this plugin to function. Bare names (no "@marketplace") are resolved against the declaring plugin's own marketplace.`,
      ),
    metadata: preprocess(
      (e) => (isPlainObject_2(e) ? e : undefined),
      record(string(), unknown()).optional(),
    ).describe(
      "Free-form metadata for the plugin author's own use (e.g. entitlement or catalog fields). Preserved on the parsed manifest but not read by Claude Code.",
    ),
  }),
);
var MAX_HOOKS_MODULES = 1;
var PluginHooksSchema = DoctorLazy(() =>
  u({
    $schema: string()
      .optional()
      .catch(undefined)
      .describe("JSON Schema reference for editor autocomplete/validation; ignored at load time"),
    description: string().optional().describe("Brief, user-facing explanation of what these hooks provide"),
    hooks: lazy(() => HooksSchema())
      .optional()
      .describe("The hooks provided by the plugin, in the same format as the one used for settings"),
    modules: array(string())
      .max(MAX_HOOKS_MODULES, {
        message: "hooks.json `modules` names one hooks module per plugin; a second entry is refused",
      })
      .optional()
      .describe(
        `The hooks module: one path, relative to this hooks.json, of a module exporting register(on). The module, and every file it imports from the plugin, is named like code (${SCRIPT_EXTENSIONS_TEXT}; a file named otherwise is not loaded) and is an ES module whatever its suffix. What it hooks and calls is read from its source before it loads; \`claude plugin validate\` shows the result.`,
      ),
    surface: never({
      error:
        'hooks.json `surface` is gone: name the module in the Client element, `Client({ module: "./board.tsx", key })`, a path relative to the file that builds it',
    }).optional(),
  }).refine((e) => e.hooks !== undefined || (e.modules?.length ?? 0) > 0, {
    message: "hooks.json must have `hooks` (the hook matchers) or `modules` (hooks modules), or both",
  }),
);
var PluginManifestHooksSchema = DoctorLazy(() =>
  u({
    hooks: union([
      RelativeJSONPath().describe(
        "Path to file with additional hooks (in addition to those in hooks/hooks.json, if it exists), relative to the plugin root",
      ),
      lazy(() => HooksSchema()).describe(
        "Additional hooks (in addition to those in hooks/hooks.json, if it exists)",
      ),
      array(
        union([
          RelativeJSONPath().describe(
            "Path to file with additional hooks (in addition to those in hooks/hooks.json, if it exists), relative to the plugin root",
          ),
          lazy(() => HooksSchema()).describe(
            "Additional hooks (in addition to those in hooks/hooks.json, if it exists)",
          ),
        ]),
      ),
    ]),
  }),
);
var CommandMetadataSchema = DoctorLazy(() =>
  u({
    source: RelativeCommandPath()
      .optional()
      .describe("Path to command markdown file, relative to plugin root"),
    content: string().optional().describe("Inline markdown content for the command"),
    description: string().optional().describe("Command description override"),
    argumentHint: string().optional().describe('Hint for command arguments (e.g., "[file]")'),
    model: string().optional().describe("Default model for this command"),
    allowedTools: array(string()).optional().describe("Tools allowed when command runs"),
  }).refine((data) => (data.source && !data.content) || (!data.source && data.content), {
    message: 'Command must have either "source" (file path) or "content" (inline markdown), but not both',
  }),
);
var PluginManifestCommandsSchema = DoctorLazy(() =>
  u({
    commands: union([
      RelativeCommandPath().describe(
        "Path to a command file or skill directory, relative to the plugin root. When set, the commands/ directory is not auto-loaded \u2014 list its files here if you want both.",
      ),
      array(
        RelativeCommandPath().describe(
          "Path to a command file or skill directory, relative to the plugin root. When set, the commands/ directory is not auto-loaded \u2014 list its files here if you want both.",
        ),
      ).describe(
        "List of command file or skill directory paths. When set, the commands/ directory is not auto-loaded.",
      ),
      record(string(), CommandMetadataSchema()).describe(
        'Object mapping of command names to their metadata and source files. Command name becomes the slash command name (e.g., "about" \u2192 "/plugin:about")',
      ),
    ]),
  }),
);
var PluginManifestAgentsSchema = DoctorLazy(() =>
  u({
    agents: union([
      RelativeMarkdownPath().describe(
        "Path to an agent file, relative to the plugin root. When set, the agents/ directory is not auto-loaded \u2014 list its files here if you want both.",
      ),
      array(
        RelativeMarkdownPath().describe(
          "Path to an agent file, relative to the plugin root. When set, the agents/ directory is not auto-loaded \u2014 list its files here if you want both.",
        ),
      ).describe("List of agent file paths. When set, the agents/ directory is not auto-loaded."),
    ]),
  }),
);
var PluginManifestSkillsSchema = DoctorLazy(() =>
  u({
    skills: union([
      RelativeSkillDirPath().describe(
        'Path to a skill directory, relative to the plugin root ("." / "./" denote the plugin root itself). Loaded in addition to the skills/ directory (except: for a marketplace entry whose source resolves to the marketplace root, declaring a specific subdirectory replaces the skills/ scan).',
      ),
      array(
        RelativeSkillDirPath().describe(
          'Path to a skill directory, relative to the plugin root ("." / "./" denote the plugin root itself).',
        ),
      ).describe(
        "List of skill directory paths, loaded in addition to the skills/ directory (except: for a marketplace entry whose source resolves to the marketplace root, declaring specific subdirectories replaces the skills/ scan).",
      ),
    ]),
  }),
);
var EvalsPathSchema = DoctorLazy(() => union([string(), array(string())]));
var PluginManifestOutputStylesSchema = DoctorLazy(() =>
  u({
    outputStyles: union([
      RelativePath().describe(
        "Path to an output-styles directory or file, relative to the plugin root. When set, the output-styles/ directory is not auto-loaded \u2014 list its files here if you want both.",
      ),
      array(
        RelativePath().describe(
          "Path to an output-styles directory or file, relative to the plugin root. When set, the output-styles/ directory is not auto-loaded \u2014 list its files here if you want both.",
        ),
      ).describe(
        "List of output-style directory or file paths. When set, the output-styles/ directory is not auto-loaded.",
      ),
    ]),
  }),
);
var HljsLanguageIdSchema = DoctorLazy(() =>
  string()
    .max(64)
    .regex(/^[a-z][a-z0-9_-]*$/, "must match ^[a-z][a-z0-9_-]*$"),
);
var MAX_HLJS_LANGUAGES = 16;
var HljsLanguageEntrySchema = DoctorLazy(() =>
  u({
    id: HljsLanguageIdSchema(),
    remote: string()
      .max(256)
      .regex(
        /^(npm:[@a-z0-9/._-]+(@[a-z0-9._+-]+)?|github:[\w.-]+\/[\w.-]+@[\w./-]+#.+\.js)$/,
        "must be npm:<pkg>[@ver] or github:<owner>/<repo>@<ref>#<path>.js",
      )
      .optional(),
    integrity: string()
      .max(512)
      .regex(/^sha(256|384|512)-[A-Za-z0-9+/=]+$/, "must be SRI form: sha256-, sha384-, or sha512-<base64>")
      .optional(),
  }).strict(),
);
var PluginManifestSyntaxHighlightingSchema = DoctorLazy(() =>
  u({
    syntaxHighlighting: u({
      hljsLanguages: array(HljsLanguageEntrySchema()).max(MAX_HLJS_LANGUAGES),
    }).strict(),
  }),
);
var PluginManifestThemesSchema = DoctorLazy(() =>
  u({
    themes: union([
      RelativePath().describe(
        "Path to a themes directory or file, relative to the plugin root. When set, the themes/ directory is not auto-loaded \u2014 list its files here if you want both.",
      ),
      array(
        RelativePath().describe(
          "Path to a themes directory or file, relative to the plugin root. When set, the themes/ directory is not auto-loaded \u2014 list its files here if you want both.",
        ),
      ).describe(
        "List of theme directory or file paths. When set, the themes/ directory is not auto-loaded.",
      ),
    ]),
  }),
);
var PluginManifestWorkflowsSchema = DoctorLazy(() =>
  u({
    workflows: union([
      RelativePath().describe(
        "Path to a workflows directory or .js file, relative to the plugin root. When set, the workflows/ directory is not auto-loaded \u2014 list its files here if you want both.",
      ),
      array(
        RelativePath().describe(
          "Path to a workflows directory or .js file, relative to the plugin root. When set, the workflows/ directory is not auto-loaded \u2014 list its files here if you want both.",
        ),
      ).describe(
        "List of workflow directory or .js file paths. When set, the workflows/ directory is not auto-loaded.",
      ),
    ]).optional(),
  }),
);
var nonEmptyString = DoctorLazy(() => string().min(1));
var fileExtension = DoctorLazy(() =>
  string()
    .min(2)
    .refine((ext) => ext.startsWith("."), {
      message: 'File extensions must start with dot (e.g., ".ts", not "ts")',
    }),
);
var PluginManifestMcpServerSchema = DoctorLazy(() =>
  u({
    mcpServers: union([
      RelativeJSONPath().describe(
        "MCP servers to include in the plugin (in addition to those in the .mcp.json file, if it exists)",
      ),
      McpbPath().describe("Path or URL to MCPB file containing MCP server configuration"),
      record(string(), McpServerConfigSchema()).describe("MCP server configurations keyed by server name"),
      array(
        union([
          RelativeJSONPath().describe("Path to MCP servers configuration file"),
          McpbPath().describe("Path or URL to MCPB file"),
          record(string(), McpServerConfigSchema()).describe("Inline MCP server configurations"),
        ]),
      ).describe("Array of MCP server configurations (paths, MCPB files, or inline definitions)"),
    ]),
  }),
);
var PluginUserConfigOptionSchema = DoctorLazy(() =>
  u({
    type: _enum(["string", "number", "boolean", "directory", "file"]).describe(
      "Type of the configuration value",
    ),
    title: string().describe("Human-readable label shown in the config dialog"),
    description: string().describe("Help text shown beneath the field in the config dialog"),
    required: M().optional().describe("If true, validation fails when this field is empty"),
    default: union([string(), E(), M(), array(string())])
      .optional()
      .describe("Default value used when the user provides nothing"),
    multiple: M().optional().describe("For string type: allow an array of strings"),
    sensitive: M()
      .optional()
      .describe(
        "If true, masks dialog input and stores value in secure storage (keychain/credentials file) instead of settings.json",
      ),
    min: E().optional().describe("Minimum value (number type only)"),
    max: E().optional().describe("Maximum value (number type only)"),
    options: array(
      string()
        .min(1, "An option cannot be empty")
        .max(64, "An option can be at most 64 characters")
        .refine((e) => recursivelySanitizeUnicode_2(e) === e, {
          message: "An option cannot contain control, invisible or bidirectional-formatting characters",
        })
        .refine((e) => e.trim() === e, {
          message: "An option cannot start or end with a space",
        }),
    )
      .min(1, "options needs at least one value")
      .refine((e) => new Set(e.map((n) => n.toLowerCase())).size === e.length, {
        message: "options cannot repeat a value (in any letter case)",
      })
      .readonly()
      .optional()
      .describe(
        "For string type: the only values the field takes. /config shows the field as a picker over them, and a stored value outside them counts as unset",
      ),
  })
    .strict()
    .superRefine((e, n) => {
      if (e.options === undefined) return;
      if (e.type !== "string" || e.multiple === true || e.sensitive === true) {
        n.addIssue({
          code: "custom",
          path: ["options"],
          message: 'options is only for a field of type "string" that is neither multiple nor sensitive',
        });
        return;
      }
      if (e.default === undefined) {
        if (e.required !== true)
          n.addIssue({
            code: "custom",
            path: ["default"],
            message: "a field with options needs a default among them, or required: true",
          });
        return;
      }
      if (typeof e.default !== "string" || !e.options.includes(e.default))
        n.addIssue({
          code: "custom",
          path: ["default"],
          message: `default must be one of the options: ${e.options.join(", ")}`,
        });
    }),
);
var PluginManifestUserConfigSchema = DoctorLazy(() =>
  u({
    userConfig: record(
      string().regex(
        /^[A-Za-z_]\w*$/,
        "Option keys must be valid identifiers (letters, digits, underscore; no leading digit) \u2014 they become CLAUDE_PLUGIN_OPTION_<KEY> env vars in hooks",
      ),
      PluginUserConfigOptionSchema(),
    )
      .optional()
      .describe(
        "User-configurable values this plugin needs. Prompted at enable time. Non-sensitive values saved to settings.json; sensitive values to secure storage. Available as ${user_config.KEY} in MCP/LSP server config, hook commands, and (non-sensitive only) skill/agent content. Keep sensitive value counts small.",
      ),
  }),
);
var PluginManifestChannelsSchema = DoctorLazy(() =>
  u({
    channels: array(
      u({
        server: string()
          .min(1)
          .describe(
            "Name of the MCP server this channel binds to. Must match a key in this plugin's mcpServers.",
          ),
        displayName: string()
          .optional()
          .describe(
            'Human-readable name shown in the config dialog title (e.g., "Telegram"). Defaults to the server name.',
          ),
        userConfig: record(string(), PluginUserConfigOptionSchema())
          .optional()
          .describe(
            "Fields to prompt the user for when enabling this plugin in assistant mode. Saved values are substituted into ${user_config.KEY} references in the mcpServers env.",
          ),
      }).strict(),
    ).describe(
      "Channels this plugin provides. Each entry declares an MCP server as a message channel and optionally specifies user configuration to prompt for at enable time.",
    ),
  }),
);
var LspServerConfigSchema = DoctorLazy(() =>
  zodStrictObject({
    command: string()
      .min(1)
      .refine(
        (cmd) => {
          if (cmd.includes(" ") && !cmd.startsWith("/")) return false;
          return true;
        },
        {
          message: "Command should not contain spaces. Use args array for arguments.",
        },
      )
      .describe('Command to execute the LSP server (e.g., "typescript-language-server")'),
    args: array(nonEmptyString()).optional().describe("Command-line arguments to pass to the server"),
    extensionToLanguage: record(fileExtension(), nonEmptyString())
      .refine((record) => Object.keys(record).length > 0, {
        message: "extensionToLanguage must have at least one mapping",
      })
      .describe(
        "Mapping from file extension to LSP language ID. File extensions and languages are derived from this mapping.",
      ),
    transport: _enum(["stdio", "socket"]).default("stdio").describe("Communication transport mechanism"),
    env: record(string(), string())
      .optional()
      .describe("Environment variables to set when starting the server"),
    initializationOptions: unknown()
      .optional()
      .describe("Initialization options passed to the server during initialization"),
    settings: unknown()
      .optional()
      .describe("Settings passed to the server via workspace/didChangeConfiguration"),
    workspaceFolder: string().optional().describe("Workspace folder path to use for the server"),
    startupTimeout: E()
      .int()
      .positive()
      .optional()
      .describe("Maximum time to wait for server startup (milliseconds)"),
    shutdownTimeout: E()
      .int()
      .positive()
      .optional()
      .describe("Maximum time to wait for graceful shutdown (milliseconds)"),
    requestTimeout: E()
      .int()
      .positive()
      .max(2147483647)
      .optional()
      .describe("Maximum time to wait for the server to answer a request (milliseconds). Defaults to 60000."),
    restartOnCrash: M().optional().describe("Whether to restart the server if it crashes"),
    maxRestarts: E()
      .int()
      .nonnegative()
      .optional()
      .describe("Maximum number of restart attempts before giving up"),
    diagnostics: M()
      .optional()
      .describe(
        "Whether to push publishDiagnostics into the agent context after edits. Set to false to keep LSP navigation (goToDefinition, hover, etc.) but suppress automatic diagnostic injection. Defaults to true.",
      ),
  }),
);
var PluginMonitorSchema = DoctorLazy(() =>
  zodStrictObject({
    name: string()
      .min(1)
      .describe(
        "Identifier for this monitor, unique within the plugin. Used to dedupe so re-arming (plugin reload, repeat skill invoke) does not spawn duplicates.",
      ),
    command: string()
      .min(1)
      .describe(
        'Shell command to run as a persistent background monitor. Each stdout line is delivered to the model as a <task_notification> event; the process runs for the session lifetime. ${CLAUDE_PLUGIN_ROOT}, ${CLAUDE_PLUGIN_DATA}, ${CLAUDE_PROJECT_DIR}, ${user_config.*}, and ${ENV_VAR} are substituted. Runs in the session cwd (the named --project-config-root when a host set one) \u2014 prefix with `cd "${CLAUDE_PLUGIN_ROOT}" && ` if the script needs its own directory.',
      ),
    description: string()
      .min(1)
      .describe(
        "Short human-readable description of what is being monitored (shown in task panel and notification summary).",
      ),
    when: union([
      literal("always"),
      string()
        .startsWith("on-skill-invoke:")
        .refine((e) => e.length > 16, {
          message: "on-skill-invoke: must specify a skill name",
        }),
    ])
      .default("always")
      .describe(
        'Arm trigger. "always" arms at session start and on plugin reload. "on-skill-invoke:<skill>" arms the first time that skill is dispatched (via Skill tool or slash command).',
      ),
  }),
);
var PluginMonitorsArraySchema = DoctorLazy(() =>
  array(PluginMonitorSchema()).refine((e) => new Set(e.map((n) => n.name)).size === e.length, {
    message: "Monitor names must be unique within a plugin",
  }),
);
var PluginManifestMonitorsSchema = DoctorLazy(() =>
  u({
    monitors: union([
      RelativeJSONPath().describe(
        "Path to a JSON file containing the monitors array, relative to the plugin root",
      ),
      PluginMonitorsArraySchema(),
    ]).describe(
      "Background watch scripts the host arms as persistent Monitor tasks (unsandboxed, same trust tier as hooks) so plugins need not instruct the model to arm them. When omitted, monitors/monitors.json at the plugin root is loaded if present.",
    ),
  }),
);
var PluginManifestLspServerSchema = DoctorLazy(() =>
  u({
    lspServers: union([
      RelativeJSONPath().describe("Path to .lsp.json configuration file relative to plugin root"),
      record(string(), LspServerConfigSchema()).describe("LSP server configurations keyed by server name"),
      array(
        union([
          RelativeJSONPath().describe("Path to LSP configuration file"),
          record(string(), LspServerConfigSchema()).describe("Inline LSP server configurations"),
        ]),
      ).describe("Array of LSP server configurations (paths or inline definitions)"),
    ]),
  }),
);
var SCOPED_NPM_NAME_RE = /^@[a-z0-9][a-z0-9-._]*\/[a-z0-9][a-z0-9-._]*$/;
var UNSCOPED_NPM_NAME_RE = /^[a-z0-9][a-z0-9-._]*$/;
var NPM_SCOPE_WILDCARD_RE = /^@[a-z0-9][a-z0-9-._]*\/\*$/;
//@ chunk-dcmhvw5a.js:101864-101949 layout
/**
 * npm 包名是否合法（作用域 @scope/name 或普通名，不含 .. 与 //）。
 */
function isValidNpmPackageName(e) {
  return (
    !e.includes("..") && !e.includes("//") && (SCOPED_NPM_NAME_RE.test(e) || UNSCOPED_NPM_NAME_RE.test(e))
  );
}
//@ chunk-dcmhvw5a.js:101949-102252 fingerprint = NpmPackageNameSchema (0.835)
/**
 * npm 包名 schema（禁止 `..` 与 `//`、须为合法 npm 名）及同一语句里的插件二进制相关常量：二进制文件名正则、sha256 正则、下载并发 16、单插件最多 64 个二进制、1 MiB 常量、二进制 pin schema。
 */
var NpmPackageNameSchema = DoctorLazy(() =>
  string()
    .refine(
      (name) => !name.includes("..") && !name.includes("//"),
      "Package name cannot contain path traversal patterns",
    )
    .refine((name) => isValidNpmPackageName(name), "Invalid npm package name format"),
);
var BINARY_BASENAME_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9_-])?$/;
var SHA256_HEX_RE = /^[0-9a-f]{64}$/;
var BINARY_FETCH_CONCURRENCY = 16;
var MAX_PLUGIN_BINARIES = 64;
var ONE_MIB = 1048576;
var BinaryPinSchema = DoctorLazy(() =>
  u({
    sha256: string().regex(SHA256_HEX_RE),
  }),
);
//@ chunk-dcmhvw5a.js:102252-102492 layout
/**
 * 宽容解析 manifest 的 binaries：只保留 basename 合法且 {sha256} 合法的项，最多 64 个；无有效项返回 undefined。
 */
function parsePluginBinaries(binaries) {
  let n = record(string(), unknown()).safeParse(binaries);
  if (!n.success) return;
  let r = Object.create(null);
  let s = 0;
  for (let [key, value] of Object.entries(n.data)) {
    if (s >= MAX_PLUGIN_BINARIES) break;
    let g = BinaryPinSchema().safeParse(value);
    if (BINARY_BASENAME_RE.test(key) && g.success) {
      r[key] = g.data;
      s++;
    }
  }
  return s > 0 ? r : undefined;
}
//@ chunk-dcmhvw5a.js:102492-104275 layout
var PluginManifestBinariesSchema = DoctorLazy(() =>
  u({
    binaries: unknown()
      .transform(parsePluginBinaries)
      .describe(
        "sha256-pinned files to fetch into bin/ at install time, keyed by basename (target triple encoded in the name)",
      ),
  }),
);
var PluginManifestSettingsSchema = DoctorLazy(() =>
  u({
    settings: record(string(), unknown())
      .optional()
      .describe(
        "Settings to merge into the user settings while this plugin is enabled. Only the documented allowlisted keys are applied.",
      ),
  }),
);
var PluginManifestTypesSchema = DoctorLazy(() =>
  u({
    types: RelativePath()
      .refine((e) => e.endsWith(".d.ts"), {
        message: "types must name a TypeScript declaration file ending in '.d.ts'",
      })
      .refine((e) => !e.split(/[\\/]/).includes(".."), {
        message: "types must stay inside the plugin directory (no '..' segment)",
      })
      .optional()
      .describe(
        "Path to the plugin's type contract, relative to the plugin root and starting with ./: a self-contained .d.ts (no import, export-from, require or reference) that exports the types of the noun the plugin's hooks module adds in engine.create at its top level and declares the noun in a `declare module 'claude-code' { interface EngineInterface { ... } }` block, nothing else. A mod that lists this plugin under dependencies gets the contract laid at .claude-plugin/types/<plugin>/index.d.ts each time the engine loads it from a folder the person owns, so it types against the noun with nothing copied; claude plugin validate checks the file.",
      ),
  }),
);
var PluginManifestExperimentalSchema = DoctorLazy(() =>
  u({
    experimental: preprocess(
      (e) => (isPlainObject_2(e) ? e : undefined),
      u({
        ...PluginManifestThemesSchema().partial().shape,
        ...PluginManifestSyntaxHighlightingSchema().partial().shape,
        ...PluginManifestMonitorsSchema().partial().shape,
        ...PluginManifestOutputStylesSchema().partial().shape,
        evals: EvalsPathSchema()
          .optional()
          .describe(
            "Directory of eval cases for the plugin evaluation harness, relative to the plugin root (default: evals/). A list is accepted; its first entry is the case directory.",
          ),
      })
        .passthrough()
        .optional()
        .describe(
          "Components whose manifest shape may change without a deprecation cycle. Move a key out of here once it is promoted to stable.",
        ),
    ),
  }),
);
//@ chunk-dcmhvw5a.js:104275-105852 file-local
/**
 * PluginManifestSchema：把元数据与全部组件 schema 合并成完整 plugin.json schema；PluginManifestFieldSchemas 是同样字段的 PerKeyLazySchema 版本（name 必选），用于只校验文档里出现的字段。
 */
var PluginManifestSchema = DoctorLazy(() =>
  u({
    ...PluginManifestMetadataSchema().shape,
    ...PluginManifestHooksSchema().partial().shape,
    ...PluginManifestCommandsSchema().partial().shape,
    ...PluginManifestAgentsSchema().partial().shape,
    ...PluginManifestSkillsSchema().partial().shape,
    ...PluginManifestOutputStylesSchema().partial().shape,
    ...PluginManifestThemesSchema().partial().shape,
    ...PluginManifestWorkflowsSchema().shape,
    ...PluginManifestChannelsSchema().partial().shape,
    ...PluginManifestMcpServerSchema().partial().shape,
    ...PluginManifestLspServerSchema().partial().shape,
    ...PluginManifestMonitorsSchema().partial().shape,
    ...PluginManifestSettingsSchema().partial().shape,
    ...PluginManifestTypesSchema().partial().shape,
    ...PluginManifestUserConfigSchema().partial().shape,
    ...PluginManifestBinariesSchema().partial().shape,
    ...PluginManifestExperimentalSchema().partial().shape,
  }),
);
var PluginManifestFieldSchemas = DoctorLazy(
  () =>
    new PerKeyLazySchema(
      {
        $schema: () => PluginManifestMetadataSchema().shape.$schema,
        name: () => PluginManifestMetadataSchema().shape.name,
        displayName: () => PluginManifestMetadataSchema().shape.displayName,
        version: () => PluginManifestMetadataSchema().shape.version,
        description: () => PluginManifestMetadataSchema().shape.description,
        author: () => PluginManifestMetadataSchema().shape.author,
        homepage: () => PluginManifestMetadataSchema().shape.homepage,
        repository: () => PluginManifestMetadataSchema().shape.repository,
        license: () => PluginManifestMetadataSchema().shape.license,
        keywords: () => PluginManifestMetadataSchema().shape.keywords,
        defaultEnabled: () => PluginManifestMetadataSchema().shape.defaultEnabled,
        dependencies: () => PluginManifestMetadataSchema().shape.dependencies,
        metadata: () => PluginManifestMetadataSchema().shape.metadata,
        hooks: () => PluginManifestHooksSchema().partial().shape.hooks,
        commands: () => PluginManifestCommandsSchema().partial().shape.commands,
        agents: () => PluginManifestAgentsSchema().partial().shape.agents,
        skills: () => PluginManifestSkillsSchema().partial().shape.skills,
        outputStyles: () => PluginManifestOutputStylesSchema().partial().shape.outputStyles,
        themes: () => PluginManifestThemesSchema().partial().shape.themes,
        workflows: () => PluginManifestWorkflowsSchema().shape.workflows,
        channels: () => PluginManifestChannelsSchema().partial().shape.channels,
        mcpServers: () => PluginManifestMcpServerSchema().partial().shape.mcpServers,
        lspServers: () => PluginManifestLspServerSchema().partial().shape.lspServers,
        monitors: () => PluginManifestMonitorsSchema().partial().shape.monitors,
        settings: () => PluginManifestSettingsSchema().partial().shape.settings,
        types: () => PluginManifestTypesSchema().partial().shape.types,
        userConfig: () => PluginManifestUserConfigSchema().partial().shape.userConfig,
        binaries: () => PluginManifestBinariesSchema().partial().shape.binaries,
        experimental: () => PluginManifestExperimentalSchema().partial().shape.experimental,
      },
      new Set(["name"]),
    ),
);
//@ chunk-dcmhvw5a.js:105852-105903 layout
/**
 * 为一个 plugin.json 文档取“只含其出现字段”的 strip 模式 manifest schema。
 */
function getManifestSchemaForDocument(e) {
  return PluginManifestFieldSchemas().forDocument(e, "strip");
}
//@ chunk-dcmhvw5a.js:105903-106019 layout
var POLICY_SOURCE_TYPES = new Set([
  "url",
  "github",
  "git",
  "npm",
  "file",
  "directory",
  "skills-dir",
  "hostPattern",
  "pathPattern",
  "settings",
]);
//@ chunk-dcmhvw5a.js:106019-106079 layout
/**
 * 字符串能否编译为正则。
 */
function isValidRegex(e) {
  try {
    new RegExp(e);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-dcmhvw5a.js:106079-106115 layout
/**
 * git URL 是否危险（命令注入形态或本地协议）。
 */
function isUnsafeGitUrl(e) {
  return hasBackslashInUrlAuthority(e) || describeUrlScheme(e);
}
//@ chunk-dcmhvw5a.js:106115-106140 layout
var SSH_GITHUB_COM = "ssh.github.com";
//@ chunk-dcmhvw5a.js:106140-106181 layout
function isGithubHost(host) {
  return isGithubDotCom(host) || normalizeHost(host) === SSH_GITHUB_COM;
}
//@ chunk-dcmhvw5a.js:106181-106470 layout
/**
 * 从 git URL 解析 GitHub 的 owner/repo（规范化路径、去 .git），非 GitHub 返回 null。
 */
function parseGithubOwnerRepo(url) {
  if (isUnsafeGitUrl(url)) return null;
  let urlScheme = parseUrlScheme(url);
  let host = urlScheme?.host;
  let replaced = (
    /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(url.trimStart())
      ? urlScheme?.path.replace(/[?#][\s\S]*$/, "")
      : urlScheme?.path
  )?.replace(/^\/+/, "");
  if (!host || !replaced || !isGithubHost(host)) return null;
  let c = normalizeRepoPath(replaced);
  let parts = c.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return c;
}
//@ chunk-dcmhvw5a.js:106470-106498 layout
var GITHUB_NAME_SEGMENT_RE = /^[A-Za-z0-9._-]+$/;
//@ chunk-dcmhvw5a.js:106498-106572 layout
/**
 * GitHub owner/repo 段是否合法。
 */
function isValidGithubOwner(e) {
  return GITHUB_NAME_SEGMENT_RE.test(e) && !e.startsWith("-") && e !== "." && e !== "..";
}
//@ chunk-dcmhvw5a.js:106572-106662 layout
/**
 * 解析策略条目里的 "owner/*" 通配，返回 owner；不合法返回 null。
 */
function parseGithubOwnerWildcard(repo) {
  if (!repo.endsWith("/*")) return null;
  let sliced = repo.slice(0, -2);
  return isValidGithubOwner(sliced) ? sliced : null;
}
//@ chunk-dcmhvw5a.js:106662-106746 layout
/**
 * 规范化仓库路径（URL 解码、折叠 ./..、去尾斜杠与 .git）。
 */
function normalizeRepoPath(e) {
  let n = e;
  try {
    n = decodeURIComponent(e);
  } catch {}
  let r = collapseDotSegments(n);
  return stripTrailingSlashAndDotGit(r);
}
//@ chunk-dcmhvw5a.js:106746-106896 layout
function collapseDotSegments(e) {
  let n = [];
  for (let r of e.split("/")) {
    if (r === ".") continue;
    if (r === "..") {
      n.pop();
      continue;
    }
    n.push(r);
  }
  return n.filter((r) => r !== "").join("/");
}
//@ chunk-dcmhvw5a.js:106896-107068 layout
function stripTrailingSlashAndDotGit(e) {
  let n = e.length;
  for (;;) {
    let r = n;
    while (r > 0 && e.charCodeAt(r - 1) === 47) r--;
    if (r >= 4 && e.startsWith(".git", r - 4)) r -= 4;
    if (r === n) return n === e.length ? e : e.slice(0, n);
    n = r;
  }
}
//@ chunk-dcmhvw5a.js:107068-107116 layout
function canonicalGitHost(e) {
  let n = normalizeGitHost(e);
  return n === SSH_GITHUB_COM ? GITHUB_HOST : n;
}
//@ chunk-dcmhvw5a.js:107116-107462 layout
/**
 * 规范化 git URL 用于比较：主机规范化（ssh.github.com→github.com）、去凭据/查询/片段、折叠 ./..，可选去掉 .git。
 */
function normalizeGitUrlForComparison(url, n) {
  if (url.includes("://"))
    try {
      let s = nonHttpsScheme(url);
      if (s === null) return url;
      s.hostname = canonicalGitHost(s.hostname);
      s.username = "";
      s.password = "";
      s.search = "";
      s.hash = "";
      try {
        s.pathname = decodeURIComponent(s.pathname);
      } catch {}
      let a = collapseDotSegments(s.pathname);
      s.pathname = n?.stripDotGit ? stripTrailingSlashAndDotGit(a) : a;
      return s.toString();
    } catch {
      return url;
    }
  let urlScheme = parseUrlScheme(url);
  return urlScheme ? `${canonicalGitHost(urlScheme.host)}:${urlScheme.path}` : url;
}
//@ chunk-dcmhvw5a.js:107462-107529 layout
var CREDENTIAL_STRIP_PROTOCOLS = new Set(["http:", "https:", "git:", "git+http:", "git+https:"]);
//@ chunk-dcmhvw5a.js:107529-107865 layout
/**
 * git URL 主机规范化，http(s)/git 协议与 GitHub 主机去掉凭据；scp 形式 GitHub 转 github.com:path。
 */
function normalizeGitUrlHost(url) {
  if (isUnsafeRemoteUrl(url)) return url;
  if (url.includes("://"))
    try {
      let s = new URL(url);
      s.hostname = normalizeGitHost(s.hostname);
      if (CREDENTIAL_STRIP_PROTOCOLS.has(s.protocol) || isGithubDotCom(s.hostname)) {
        s.username = "";
        s.password = "";
      }
      return s.toString();
    } catch {
      return url;
    }
  let scpLikeUrl = parseScpLikeUrl(url);
  if (!scpLikeUrl) return url;
  let replaced = scpLikeUrl.host.toLowerCase().replace(/\.+$/, "");
  return isGithubDotCom(replaced)
    ? `${GITHUB_HOST}:${scpLikeUrl.path}`
    : `${scpLikeUrl.user}@${replaced}:${scpLikeUrl.path}`;
}
//@ chunk-dcmhvw5a.js:107865-108311 layout
/**
 * GitHub 来源的仓库路径是否含 * 通配（策略条目用）。
 */
function hasGithubWildcard(url) {
  if (url.includes("://")) {
    if (isUnsafeGitUrl(url)) return false;
    let host = parseUrlScheme(url)?.host;
    if (
      host !== undefined &&
      isGithubHost(host) &&
      normalizeGitUrlForComparison(url, {
        stripDotGit: true,
      }).includes("*")
    )
      return true;
    let hostname = tryParseUrl(url)?.hostname;
    if (!hostname || !isGithubHost(hostname)) return false;
    let m = normalizeGitUrlHost(url);
    try {
      let f = new URL(m);
      return f.hostname.includes("*") || f.pathname.includes("*");
    } catch {
      return m.includes("*");
    }
  }
  let urlScheme = parseUrlScheme(url);
  let host = urlScheme?.host;
  let path = urlScheme?.path;
  if (!host || path === undefined || !isGithubHost(host)) return false;
  let a = path;
  try {
    a = decodeURIComponent(path);
  } catch {}
  return a.includes("*");
}
//@ chunk-dcmhvw5a.js:108311-115001 fingerprint = MarketplaceSourceSchema (0.644)
/**
 * 市场来源（marketplace source）的判别联合 schema：url、github、git、npm、file、directory、skills-dir（策略哨兵）、hostPattern、pathPattern、settings（settings.json 内联市场）。参数为 true 时 settings 名字只做宽松校验（读 known_marketplaces.json 用）。
 */
function MarketplaceSourceSchema(e) {
  return discriminatedUnion("source", [
    u({
      source: literal("url"),
      url: string().url().describe("Direct URL to marketplace.json file"),
      headers: record(string(), string())
        .optional()
        .describe("Custom HTTP headers (e.g., for authentication)"),
      headersHelper: HeadersHelperCommandSchema()
        .optional()
        .describe(
          "Command that prints a JSON object of HTTP headers (e.g. a short-lived auth token). Its output overrides `headers` and, like `headers`, is inherited by same-origin archive downloads from this marketplace. Runs from a fixed directory (the Claude config home, never the session's), so give a bare command found via PATH or an absolute path; it is re-run on later refreshes of this marketplace.",
        ),
    }),
    u({
      source: literal("github"),
      repo: string().describe(
        'GitHub repository in owner/repo format. ONLY in the managed-settings policy lists (strictKnownMarketplaces / blockedMarketplaces) the owner-wildcard form "owner/*" matches every repository under exactly that owner. Everywhere else (marketplace add, extraKnownMarketplaces, known_marketplaces.json) the value ' +
          "must name a single repository \u2014 a wildcard is taken literally and fails to clone.",
      ),
      ref: string()
        .optional()
        .describe(
          'Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.',
        ),
      path: string()
        .optional()
        .describe("Path to marketplace.json within repo (defaults to .claude-plugin/marketplace.json)"),
      sparsePaths: array(string())
        .optional()
        .describe(
          'Directories to include via git sparse-checkout (cone mode). Use for monorepos where the marketplace lives in a subdirectory. Example: [".claude-plugin", "plugins"]. If omitted, the full repository is cloned.',
        ),
      skipLfs: M()
        .optional()
        .describe(
          "Has no effect; accepted so existing settings keep working. Claude Code's own git never downloads Git LFS content: LFS-tracked files in the marketplace repository are checked out as pointer files whether or not this is set, and adding or updating the marketplace says how many were. To fetch their content, run `git lfs pull` in the marketplace's checkout under ~/.claude/plugins/marketplaces/.",
        ),
    }),
    u({
      source: literal("git"),
      url: string().describe("Full git repository URL"),
      ref: string()
        .optional()
        .describe(
          'Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.',
        ),
      path: string()
        .optional()
        .describe("Path to marketplace.json within repo (defaults to .claude-plugin/marketplace.json)"),
      sparsePaths: array(string())
        .optional()
        .describe(
          'Directories to include via git sparse-checkout (cone mode). Use for monorepos where the marketplace lives in a subdirectory. Example: [".claude-plugin", "plugins"]. If omitted, the full repository is cloned.',
        ),
      skipLfs: M()
        .optional()
        .describe(
          "Has no effect; accepted so existing settings keep working. Claude Code's own git never downloads Git LFS content: LFS-tracked files in the marketplace repository are checked out as pointer files whether or not this is set, and adding or updating the marketplace says how many were. To fetch their content, run `git lfs pull` in the marketplace's checkout under ~/.claude/plugins/marketplaces/.",
        ),
    }),
    u({
      source: literal("npm"),
      package: NpmPackageNameSchema()
        .or(string().regex(NPM_SCOPE_WILDCARD_RE, "Invalid npm package name format"))
        .describe(
          'npm package containing marketplace.json (e.g. "@acme/claude-marketplace"). In strictKnownMarketplaces / blockedMarketplaces an entry also governs plugins installed straight from the npm marketplace (`<package>@npm`): an exact package name matches that package, and "@acme/*" matches every package under the scope.',
        ),
      version: string()
        .optional()
        .describe('Version or range to fetch (e.g. "1.4.0", "^1.4"); defaults to the latest dist-tag'),
      registry: string()
        .url()
        .refine(isHttpUrl, "Registry must be an http(s) URL")
        .optional()
        .describe(
          `Registry URL. When adding a marketplace: a one-off registry override (otherwise your npm configuration decides). In a policy entry: the origin and path prefix the package's RESOLVED tarball URL must fall under (e.g. "https://npm.example.com/api/npm/internal/"); under allowManagedPermissionRulesOnly, an npm marketplace keeps plugin allowed-tools only when both the entry and the registration pin this same registry.`,
        ),
    }),
    u({
      source: literal("file"),
      path: string().describe("Local file path to marketplace.json"),
    }),
    u({
      source: literal("directory"),
      path: string().describe("Local directory containing .claude-plugin/marketplace.json"),
    }),
    u({
      source: literal("skills-dir"),
    }).describe(
      "Policy-list sentinel for the ~/.claude/skills/ auto-load (@skills-dir plugins). In strictKnownMarketplaces: opt the scan back IN (by default any allowlist blocks it). In blockedMarketplaces: turn the scan OFF without otherwise restricting marketplaces. Only meaningful in those two managed-settings lists (areLocalPluginDirsAllowedByPolicy); known_marketplaces.json / marketplace add etc. ignore it.",
    ),
    u({
      source: literal("hostPattern"),
      hostPattern: string().describe(
        'Regex pattern to match the host/domain extracted from any marketplace source type. For github sources, matches against github.com. For git sources (SSH or HTTPS), extracts the hostname from the URL. Use in strictKnownMarketplaces to allow all marketplaces from a specific host (e.g., "^github\\.mycompany\\.com$").',
      ),
    }),
    u({
      source: literal("pathPattern"),
      pathPattern: string().describe(
        'Regex pattern matched against the .path field of file and directory sources. Use in strictKnownMarketplaces to allow filesystem-based marketplaces alongside hostPattern restrictions for network sources. Use ".*" to allow all filesystem paths, or a narrower pattern (e.g., "^/opt/approved/") to restrict to specific directories.',
      ),
    }),
    u({
      source: literal("settings"),
      name: e
        ? LenientMarketplaceNameSchema().describe(
            "Marketplace name, as stored in known_marketplaces.json. A reserved name is refused per entry at load (revalidateReservedNameEntry); a look-alike name is judged when that marketplace's own catalog is parsed (catalogNameSchemaFor).",
          )
        : MarketplaceNameSchema()
            .refine((name) => !RESERVED_MARKETPLACE_NAMES.has(name.toLowerCase()), {
              message:
                "Reserved marketplace names cannot be used with settings sources. validateOfficialNameSource only accepts github/git sources from anthropics/* for these names; a settings source would be rejected after loadAndCacheMarketplace has already written to disk with cleanupNeeded=false.",
            })
            .describe(
              "Marketplace name. Must match the extraKnownMarketplaces key (enforced); the synthetic manifest is written under this name. Same validation " +
                "as PluginMarketplaceSchema plus reserved-name rejection \u2014 " +
                "validateOfficialNameSource runs after the disk write, too late to clean up.",
            ),
      plugins: array(SettingsMarketplacePluginSchema()).describe(
        "Plugin entries declared inline in settings.json",
      ),
      owner: PluginAuthorSchema().optional(),
    }).describe(
      "Inline marketplace manifest defined directly in settings.json. The reconciler writes a synthetic marketplace.json to the cache; diffMarketplaces detects edits via isEqual on the stored source (the plugins array is inside this object, so edits surface as sourceChanged).",
    ),
  ]);
}
//@ chunk-dcmhvw5a.js:115001-115023 layout
var MarketplaceSourceStrictSchema = DoctorLazy(() => MarketplaceSourceSchema(false));
//@ chunk-dcmhvw5a.js:115023-115092 layout
/**
 * 返回去掉 headers/headersHelper、URL 用户名口令的市场来源副本；遇到 command 来源或无法安全清洗的 URL（带 query/hash、用户@ 形态）返回 null。
 */
function redactMarketplaceSource(e) {
  let n = {
    refused: false,
  };
  let r = redactMarketplaceSourceInto(e, n);
  return n.refused ? null : r;
}
//@ chunk-dcmhvw5a.js:115092-115807 layout
function redactMarketplaceSourceInto(e, n) {
  switch (e.source) {
    case "url": {
      let { headers, headersHelper, ...a } = e;
      return {
        ...a,
        url: redactSourceUrl(a.url, n),
      };
    }
    case "git":
      return {
        ...e,
        url: redactSourceUrl(e.url, n),
      };
    case "npm":
      return e.registry === undefined
        ? e
        : {
            ...e,
            registry: redactSourceUrl(e.registry, n),
          };
    case "settings":
      return {
        ...e,
        plugins: e.plugins.map((plugin) => {
          let { headers, headersHelper, ...c } = plugin;
          if (typeof c.source === "object" && "url" in c.source)
            return {
              ...c,
              source: {
                ...c.source,
                url: redactSourceUrl(c.source.url, n),
              },
            };
          if (typeof c.source === "object" && c.source.source === "command") {
            n.refused = true;
            return c;
          }
          if (typeof c.source === "object" && c.source.source === "npm") {
            let { registry } = c.source;
            return {
              ...c,
              source: {
                ...c.source,
                package: redactSourceUrl(c.source.package, n, true),
                ...(registry !== undefined && {
                  registry: redactSourceUrl(registry, n),
                }),
              },
            };
          }
          return c;
        }),
      };
    default:
      return e;
  }
}
//@ chunk-dcmhvw5a.js:115807-116319 layout
function redactSourceUrl(e, n, r = false) {
  if (hasBackslashInUrlAuthority(e)) return redactNonUrlSpec(e, n, r);
  let s;
  try {
    s = new URL(e);
  } catch {
    return redactNonUrlSpec(e, n, r);
  }
  if (s.host === "") return redactNonUrlSpec(e, n, r);
  if (urlPathWasNormalized(e, s)) {
    n.refused = true;
    return e;
  }
  if (!HTTP_LIKE_PROTOCOLS.has(s.protocol)) {
    let index = e.indexOf("#");
    let c = index === -1 ? e : e.slice(0, index);
    let g = index === -1 ? "" : e.slice(index);
    if (c.includes("?") || !SAFE_FRAGMENT_RE.test(g)) {
      n.refused = true;
      return e;
    }
    if (s.password === "") return e;
    s.password = "";
    return s.toString();
  }
  if (s.search !== "" || s.hash !== "") {
    n.refused = true;
    return e;
  }
  if (s.username === "" && s.password === "") return e;
  s.username = "";
  s.password = "";
  return s.toString();
}
//@ chunk-dcmhvw5a.js:116319-116676 layout
function urlPathWasNormalized(e, n) {
  let replaced = e.replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, "").replace(/[\t\n\r]/g, "");
  let s = WEB_URL_SCHEMES.has(n.protocol.slice(0, -1));
  let replaced_2 = replaced.slice(replaced.indexOf(":") + 1).replace(s ? /^[/\\]+/ : /^\/\//, "");
  let c = replaced_2.search(s ? /[/\\?#]/ : /[/?#]/);
  let g = c === -1 ? "" : replaced_2.slice(c);
  let m = g.search(/[?#]/);
  let f = m === -1 ? g : g.slice(0, m);
  if (f === "") return n.pathname !== "/" && n.pathname !== "";
  return f !== n.pathname;
}
//@ chunk-dcmhvw5a.js:116676-116998 layout
function redactNonUrlSpec(e, n, r) {
  let replaced = e.replace(/[\t\n\r]/g, "");
  if (replaced.includes("?")) {
    n.refused = true;
    return e;
  }
  let a =
    r &&
    (/^@[^@:?#\\%]+$/.test(replaced) ||
      /^(?:npm:)?(?:@[^@:/\\?#%]+\/)?[^@:/\\?#%]+@[^@:/\\?#]*$/.test(replaced));
  if (replaced.includes("@") && !SCP_LIKE_GIT_URL_RE.test(replaced) && !a) n.refused = true;
  let c = r && HOSTED_GIT_SHORTHAND_RE.test(replaced);
  if (replaced.includes("#") && !SCP_LIKE_GIT_URL_RE.test(replaced) && !c) n.refused = true;
  return e;
}
//@ chunk-dcmhvw5a.js:116998-117317 layout
var URL_FRAGMENT_CHAR_CLASS = String.raw`[\w./+-]`;
var SAFE_FRAGMENT_RE = new RegExp(`^(?:#${URL_FRAGMENT_CHAR_CLASS}*)?$`);
var SCP_LIKE_GIT_URL_RE = new RegExp(
  String.raw`^(?:(?:git\+)?ssh:\/\/)?[^@:/\\?#%]+@[^@:/\\?#]+:[^@?#]*(?:#${URL_FRAGMENT_CHAR_CLASS}*)?$`,
);
var HOSTED_GIT_SHORTHAND_RE = new RegExp(
  String.raw`^(?:(?:github|gitlab|bitbucket):)?[^@:/\\?#%]+(?:\/[^@:/\\?#%]+)+(?:#${URL_FRAGMENT_CHAR_CLASS}*)?$`,
);
var HTTP_LIKE_PROTOCOLS = new Set(["http:", "https:", "git+http:", "git+https:"]);
//@ chunk-dcmhvw5a.js:117317-117658 layout
/**
 * npm tarball URL 去掉凭据、查询和片段；非 http(s) 返回 null。
 */
function redactNpmTarball(npmResolution) {
  if (hasBackslashInUrlAuthority(npmResolution.tarballUrl)) return null;
  let n;
  try {
    n = new URL(npmResolution.tarballUrl);
  } catch {
    return null;
  }
  if (n.protocol !== "http:" && n.protocol !== "https:") return null;
  if (n.username === "" && n.password === "" && n.search === "" && n.hash === "") return npmResolution;
  n.username = "";
  n.password = "";
  n.search = "";
  n.hash = "";
  return {
    packageName: npmResolution.packageName,
    tarballUrl: n.toString(),
  };
}
//@ chunk-dcmhvw5a.js:117658-117679 layout
var MarketplaceSourceLenientSchema = DoctorLazy(() => MarketplaceSourceSchema(true));
//@ chunk-dcmhvw5a.js:117679-117705 layout
function getKnownMarketplaceSourceSchema() {
  return MarketplaceSourceLenientSchema();
}
//@ chunk-dcmhvw5a.js:117705-118445 fingerprint = gitSha (0.34)
/**
 * 市场来源相关 schema：策略名单用的来源 schema（额外支持 pluginDirectory 哨兵）、已知市场来源 schema、40 位 git SHA schema、sha256 十六进制 schema，以及 archive URL 必须 https 且不得指向回环/链路本地/云元数据地址的错误文案。
 */
var MarketplacePolicySourceSchema = DoctorLazy(() => {
  let knownMarketplaceSourceSchema = getKnownMarketplaceSourceSchema();
  return discriminatedUnion("source", [
    u({
      source: literal("pluginDirectory"),
    }).describe(
      "@internal Policy-list sentinel for the built-in Directory marketplace. In strictKnownMarketplaces: allow it (by default any allowlist blocks it). In blockedMarketplaces: block it without otherwise restricting marketplaces. Only meaningful in those two managed-settings lists; it cannot be added or declared anywhere else.",
    ),
    ...knownMarketplaceSourceSchema.options,
  ]);
});
var MarketplaceSourceSchemaLazy = DoctorLazy(() => getKnownMarketplaceSourceSchema());
var gitSha = DoctorLazy(() =>
  string()
    .length(40)
    .regex(/^[a-f0-9]{40}$/, "Must be a full 40-character lowercase git commit SHA"),
);
var Sha256HexSchema = DoctorLazy(() =>
  string().regex(/^[0-9a-fA-F]{64}$/, "Must be a 64-character hex SHA-256 digest"),
);
var ARCHIVE_URL_ERROR =
  "Archive URLs must use https:// and must not point at a loopback, link-local, or cloud-metadata host";
//@ chunk-dcmhvw5a.js:118445-118545 layout
/**
 * archive 来源 URL 是否安全：必须 https，且主机不是回环/链路本地/云元数据地址。
 */
function isSafeArchiveUrl(e) {
  try {
    let n = new URL(e);
    return n.protocol === "https:" && !isPrivateHost(n.hostname);
  } catch {
    return false;
  }
}
//@ chunk-dcmhvw5a.js:118545-125707 fingerprint = PluginSourceSchema (0.467)
/**
 * 插件来源 schema：相对路径（相对市场根）、npm、url（git）、github、git-subdir（稀疏检出子目录）、archive（https zip + sha256）、command（本地命令打印插件目录，copy/link 模式）、unsupported（解析失败占位）。SettingsMarketplacePluginSchema 是 settings 内联市场的插件条目，只允许远程来源。
 */
var ArchivePluginSourceSchema = DoctorLazy(() =>
  u({
    source: literal("archive"),
    url: string()
      .url()
      .refine(isSafeArchiveUrl, {
        message: ARCHIVE_URL_ERROR,
      })
      .describe(
        "HTTPS URL of a zip archive containing the plugin. The plugin root (the directory holding .claude-plugin/) may be at the top of the archive " +
          "or nested one directory deep \u2014 a single wrapping directory is stripped.",
      ),
    sha256: Sha256HexSchema()
      .optional()
      .describe(
        "SHA-256 digest of the archive. When set, every download is verified against it and the install is refused on mismatch. It also serves as the version identity when neither plugin.json nor the marketplace entry declares a `version`. Recommended. Note the update signal is the version string (plugin.json " +
          "version, else the entry version, else this digest) \u2014 changing only the digest " +
          "while a version is declared does not trigger an update.",
      ),
  }).describe(
    "Plugin distributed as a zip archive fetched over HTTPS \u2014 for hosting on any " +
      "static file server or artifact repository (S3, GitLab, nginx) with no git or npm on the client. Authentication: the entry's own `headers` / `headersHelper` (bound to this URL), overlaid on the enclosing url-source marketplace's headers (static or `headersHelper`-minted) when the archive shares its origin.",
  ),
);
var PluginSourceSchema = DoctorLazy(() =>
  union([
    preprocess((e) => (e === "." ? "./" : e), RelativePath()).describe(
      "Path to the plugin root, relative to the marketplace root (the directory containing .claude-plugin/, not .claude-plugin/ itself)",
    ),
    u({
      source: literal("npm"),
      package: NpmPackageNameSchema()
        .or(
          string().refine(
            (e) =>
              /^(?:file|https?|git(?:\+https?|\+ssh)?|ssh|github|gitlab|bitbucket):/i.test(e) ||
              !e.includes(".."),
            'Package reference cannot contain ".." path segments',
          ),
        )
        .describe(
          "Package name (or url, or local path, or anything else that can be passed to `npm` as a package)",
        ),
      version: string().optional().describe("Specific version or version range (e.g., ^1.0.0, ~2.1.0)"),
      registry: string()
        .url()
        .refine(isHttpUrl, "Registry must be an http(s) URL")
        .optional()
        .describe("Custom NPM registry URL (defaults to using system default, likely npmjs.org)"),
    }).describe("NPM package as plugin source"),
    u({
      source: literal("url"),
      url: string().describe("Full git repository URL (https:// or git@)"),
      ref: string()
        .optional()
        .describe(
          'Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.',
        ),
      sha: gitSha().optional().describe("Specific commit SHA to use"),
    }),
    u({
      source: literal("github"),
      repo: string().describe("GitHub repository in owner/repo format"),
      ref: string()
        .optional()
        .describe(
          'Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.',
        ),
      sha: gitSha().optional().describe("Specific commit SHA to use"),
    }),
    u({
      source: literal("git-subdir"),
      url: string().describe("Git repository: GitHub owner/repo shorthand, https://, or git@ URL"),
      path: string()
        .min(1)
        .describe(
          'Subdirectory within the repo containing the plugin (e.g., "tools/claude-plugin"). ' +
            "Checked out sparsely \u2014 over https or ssh as a partial clone (--filter=tree:0) \u2014 to minimize bandwidth for monorepos.",
        ),
      ref: string()
        .optional()
        .describe(
          'Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.',
        ),
      sha: gitSha().optional().describe("Specific commit SHA to use"),
    }).describe(
      "Plugin located in a subdirectory of a larger repository (monorepo). Only the specified subdirectory is materialized; the rest of the repo is not downloaded.",
    ),
    ArchivePluginSourceSchema(),
    u({
      source: literal("command"),
      command: string()
        .min(1)
        .max(MAX_CONSENT_COMMAND_LENGTH, {
          message: "command must not be longer than the install consent UI can display",
        })
        .refine((e) => !UNPRINTABLE_OR_WIDE_SPACE_RE.test(e), {
          message:
            "command must be printable ASCII (letters, digits, punctuation, single spaces) with no runs of 4 or more spaces",
        })
        .describe(
          "Shell command that prints the absolute path of the plugin directory on stdout (exactly one line) and exits 0. It must leave a complete plugin in that directory before exiting; the directory is copied into the plugin cache, so the printed path may change between runs (it is re-resolved on every install and update, and once per session in the background). Runs through the platform shell (sh on macOS/Linux, cmd.exe on Windows) from the user's home directory with Claude Code's subprocess environment.",
        ),
      timeout: E()
        .int()
        .positive()
        .max(COMMAND_SOURCE_MAX_TIMEOUT_SECONDS)
        .optional()
        .describe("Seconds to wait for the command before giving up (default: 60)"),
      mode: _enum(["copy", "link"])
        .optional()
        .describe(
          "copy (default): the printed directory is copied into the plugin cache and content-hashed, so it may be deleted afterwards. link: the cache entry links to the printed directory " +
            "in place (no copy, no size limit; macOS/Linux) \u2014 for large exports; the directory must then stay " +
            "valid while Claude Code runs, and a different printed path is what signals new content.",
        ),
    }).describe(
      "Plugin directory produced by a locally installed tool (e.g. an IDE that renders its plugin for the currently selected SDK). Claude Code runs the command, copies the directory it prints, and re-runs it in the background at startup to pick up changes.",
    ),
    u({
      source: literal("unsupported"),
      error: string().optional(),
    }).describe(
      "Placeholder for source types this Claude Code version does not recognize, or a known type whose fields failed validation (then `error` " +
        "holds the reason). Never authored by hand \u2014 PluginMarketplaceSchema rewrites " +
        "unparseable sources to this so the entry remains in marketplace.plugins (detectDelistedPlugins must not see it as removed). Install attempts fail at cachePlugin with an actionable message.",
    ),
  ]),
);
var SettingsMarketplacePluginSchema = DoctorLazy(() =>
  u({
    name: PluginNameSchema().describe("Plugin name as it appears in the target repository"),
    source: PluginSourceSchema().describe(
      "Where to fetch the plugin from. Must be a remote source \u2014 relative " +
        "paths have no marketplace repository to resolve against. Under allowManagedPermissionRulesOnly, a settings marketplace keeps its plugins' allowed-tools only when every npm entry here pins a `registry` on a bare package name; unpinned, the package resolves through the member's own npm config, and a non-bare spelling (an `npm:` alias, a `name@range`, a URL or git spec) packs as an " +
        "exotic spec the pin does not bind \u2014 either way the marketplace " +
        "vouches no tool grants.",
    ),
    description: string().optional(),
    version: string().optional(),
    strict: M().optional(),
    headers: record(string(), string())
      .optional()
      .describe("HTTP headers sent when downloading this entry's `archive` source."),
    headersHelper: HeadersHelperCommandSchema()
      .optional()
      .describe(
        "Command that prints a JSON object of HTTP headers for downloading this entry's `archive` source. Runs only when a user explicitly installs or updates this plugin. Unlike a catalog entry, an entry written here does not need `strict: false`: it is declared in a settings file, which has no manifest fields to inline. A declaration in project settings is not operator-authored, so request-routing and client-identity header names are still filtered there. Use an absolute path.",
      ),
  })
    .refine((e) => typeof e.source !== "string", {
      message:
        'Plugins in a settings-sourced marketplace must use remote sources (github, git-subdir, npm, url, archive, command). Relative-path sources like "./foo" have no marketplace repository to resolve against.',
    })
    .refine((e) => typeof e.source === "string" || e.source.source !== "unsupported", {
      message:
        "source.source: 'unsupported' is a parse-time placeholder and cannot be authored. Use a remote source (github, git-subdir, npm, url, archive, command).",
    }),
);
//@ chunk-dcmhvw5a.js:125707-125770 placement
/**
 * 是否以 ./ 开头的相对来源。
 */
function isRelativeSourcePath(source) {
  return typeof source === "string" && source.startsWith("./");
}
//@ chunk-dcmhvw5a.js:125834-129217 fingerprint = PluginMarketplaceEntrySchema (0.392)
/**
 * marketplace.json 中一个插件条目：manifest 字段全部可选 + name/source/headers/headersHelper/category/tags/strict（默认 true）/relevance（topic + signals：cli、hosts、filesRead、manifestDeps、cwd，用于“Working with X?”提示与推荐）。
 */
var PluginRelevanceSignalsSchema = DoctorLazy(() =>
  u({
    cli: array(string().max(64))
      .max(10)
      .optional()
      .describe(
        'First command tokens (e.g. ["stripe"]) \u2014 exact match against commands run this session.',
      ),
    hosts: array(string().max(128))
      .max(20)
      .optional()
      .describe(
        'Hostnames (e.g. ["api.stripe.com"]) \u2014 exact, case-insensitive match against ' +
          "hostnames seen in https?:// URLs in bash commands run this session. Bare hostname only: lowercase, no scheme, no port, no path.",
      ),
    filesRead: array(string().max(256))
      .max(10)
      .optional()
      .describe(
        'Glob patterns (e.g. ["**/*.tf"]) \u2014 the plugin is relevant when a file Claude has read ' +
          "this session matches any pattern. Matched against read-file paths, forward-slash normalized, case-insensitive.",
      ),
    manifestDeps: array(
      u({
        file: string().max(256),
        pattern: string().max(256),
      }),
    )
      .max(10)
      .optional()
      .describe(
        "Dependency declared in a package manifest. Each {file, pattern} is a pair of RegExp sources: " +
          "`file` matches the manifest filename (package.json, go.mod, requirements.txt, \u2026); " +
          "`pattern` matches the dependency declaration inside that file. Evaluated against files read this session.",
      ),
    cwd: array(string().max(256))
      .max(10)
      .optional()
      .describe(
        'Glob patterns (e.g. ["Engine/Source/Runtime/Renderer/**"]) \u2014 the plugin is relevant when the ' +
          `session's working directory is at or under a directory matching the pattern. Matched against the cwd both relative to the enclosing git repo root and as an absolute path, forward-slash normalized, case-insensitive. A bare directory (no glob characters) means "cwd is at or under this directory". Known at session start, so this signal can surface a suggestion before the first turn.`,
      ),
  }),
);
var PluginRelevanceSchema = DoctorLazy(() =>
  u({
    topic: string()
      .max(64)
      .optional()
      .describe(
        'What the user is working with when this plugin is relevant \u2014 fills "Working with {topic}?". ' +
          'Often the product name (e.g. "Stripe"); use a domain (e.g. "design") when the plugin name does not read naturally as a topic. Defaults to the plugin name with each hyphen-segment capitalized.',
      ),
    signals: PluginRelevanceSignalsSchema()
      .optional()
      .describe("Matchers that determine when the plugin is relevant."),
  }),
);
var PluginMarketplaceEntrySchema = DoctorLazy(() =>
  PluginManifestSchema()
    .partial()
    .extend({
      name: PluginNameSchema().describe("Unique identifier matching the plugin name"),
      source: PluginSourceSchema().describe("Where to fetch the plugin from"),
      headers: record(string(), string())
        .optional()
        .describe("Custom HTTP headers for fetching this plugin's archive; overrides the marketplace's"),
      headersHelper: HeadersHelperCommandSchema()
        .optional()
        .describe(
          "Command that prints a JSON object of HTTP headers for fetching this plugin's archive (e.g. a short-lived auth token); overrides this entry's `headers` and the marketplace's. Runs only when the user installs or updates this plugin, never during catalog browse. An entry that sets it must be `strict: false` with its manifest inlined here, so consent is informed from the entry alone before the command runs.",
        ),
      category: string()
        .optional()
        .describe('Category for organizing plugins (e.g., "productivity", "development")'),
      tags: array(string()).optional().describe("Tags for searchability and discovery"),
      strict: M()
        .optional()
        .default(true)
        .describe(
          "Require the plugin manifest to be present in the plugin folder. If false, the marketplace entry provides the manifest.",
        ),
      relevance: preprocess(
        (e) => (isPlainObject_2(e) ? e : undefined),
        PluginRelevanceSchema().optional(),
      ).describe(
        `Declares when this plugin is relevant to the user's work. Consumed by the spinner tip ("Working with {topic}?"), session-start auto-suggest, and marketplace browse ranking.`,
      ),
    }),
);
var PluginEntryNameOnlySchema = DoctorLazy(() =>
  u({
    name: PluginNameSchema(),
  }),
);
//@ chunk-dcmhvw5a.js:129217-129907 layout
/**
 * 逐条解析 marketplace.plugins：成功的保留；有名字但失败的改写成 source:{source:"unsupported",error} 占位（避免被当成下架）；连名字都没有的丢弃并记 warn 日志。
 */
function parseMarketplacePluginEntries(e) {
  let n = PluginMarketplaceEntrySchema();
  return e.flatMap((r, s) => {
    let a = n.safeParse(r);
    if (a.success) {
      let source = a.data.source;
      if (typeof source === "object" && source.source === "unsupported" && source.error !== undefined)
        return [
          {
            ...a.data,
            source: {
              source: "unsupported",
            },
          },
        ];
      return [a.data];
    }
    let c = PluginEntryNameOnlySchema().safeParse(r).data?.name;
    let joined = a.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
    if (c) {
      logForDebugging(`Stubbing unparseable marketplace plugin entry (${c}): ${joined}`, {
        level: "warn",
      });
      let m = isBareSourceName(isPlainObject_2(r) ? r.source : undefined)
        ? BARE_SOURCE_WITHOUT_PLUGIN_ROOT_ERROR
        : hasUnknownSourceType(r)
          ? undefined
          : (describeSourceUnionError(a.error.issues) ?? formatZodIssuesBrief(a.error.issues));
      return [
        {
          name: c,
          source: {
            source: "unsupported",
            ...(m && {
              error: m,
            }),
          },
          strict: true,
        },
      ];
    }
    logForDebugging(`Dropping unparseable marketplace plugin entry (index ${s}): ${joined}`, {
      level: "warn",
    });
    return [];
  });
}
//@ chunk-dcmhvw5a.js:129907-129993 layout
var KNOWN_REMOTE_PLUGIN_SOURCE_TYPES = new Set([
  "npm",
  "url",
  "github",
  "git-subdir",
  "archive",
  "command",
  "unsupported",
]);
//@ chunk-dcmhvw5a.js:129993-130149 layout
/**
 * 条目的 source.source 是否为本版本不认识的类型。
 */
function hasUnknownSourceType(e) {
  if (!e || typeof e !== "object") return false;
  let source = e.source;
  if (!source || typeof source !== "object") return false;
  let source_2 = source.source;
  return typeof source_2 === "string" && !KNOWN_REMOTE_PLUGIN_SOURCE_TYPES.has(source_2);
}
//@ chunk-dcmhvw5a.js:130149-130453 layout
function describeSourceUnionError(issues) {
  let found = issues.find((s) => s.path.length === 1 && s.path[0] === "source");
  if (!found || found.code !== "invalid_union") return;
  let found_2 = found.errors.find(
    (error) =>
      !error.some((a) => a.path.length === 0 || (a.code === "invalid_value" && a.path[0] === "source")),
  );
  if (!found_2 || found_2.length === 0) return;
  return formatZodIssuesBrief(
    found_2.map((s) => ({
      ...s,
      path: ["source", ...s.path],
    })),
  );
}
//@ chunk-dcmhvw5a.js:130453-130486 layout
var SAFE_ISSUE_KEY_RE = /^[A-Za-z0-9_$.-]{1,40}$/;
//@ chunk-dcmhvw5a.js:130486-130529 layout
/**
 * issue 路径键安全化（不合规显示 <key>）。
 */
function redactIssuePathKey(e) {
  return SAFE_ISSUE_KEY_RE.test(e) ? e : "<key>";
}
//@ chunk-dcmhvw5a.js:130529-130545 layout
var MAX_REPORTED_ISSUES = 3;
var MAX_ISSUE_MESSAGE_LENGTH = 160;
//@ chunk-dcmhvw5a.js:130545-130873 layout
/**
 * 把 zod issues 压成一行简短错误（最多 3 条，每条截断 160 字符，键名不安全时显示 <key>）。
 */
function formatZodIssuesBrief(issues) {
  let mapped = issues.slice(0, MAX_REPORTED_ISSUES).map((s) => {
    let joined = s.path
      .map(String)
      .map((g) => redactIssuePathKey(g))
      .join(".");
    let c =
      s.code === "unrecognized_keys"
        ? `Unrecognized ${s.keys.length === 1 ? "field" : "fields"}: ${s.keys.map(redactIssuePathKey).join(", ")}`
        : printableName(s.message, MAX_ISSUE_MESSAGE_LENGTH);
    return joined ? `${joined}: ${c}` : c;
  });
  let r = issues.length - mapped.length;
  return r > 0 ? `${mapped.join(", ")} (+${r} more)` : mapped.join(", ");
}
//@ chunk-dcmhvw5a.js:130873-131135 layout
var BARE_SOURCE_NAME_RE = /^[A-Za-z0-9][-A-Za-z0-9._]*$/;
var BARE_SOURCE_WITHOUT_PLUGIN_ROOT_ERROR =
  'Bare source names resolve under metadata.pluginRoot, which this marketplace does not set (or sets to a path outside the marketplace root). Use a "./relative/path" source, or set metadata.pluginRoot to allow bare names.';
//@ chunk-dcmhvw5a.js:131135-131209 layout
/**
 * 是否为裸来源名（不带 ./ 的单段名）。
 */
function isBareSourceName(source) {
  return typeof source === "string" && BARE_SOURCE_NAME_RE.test(source) && !source.includes("..");
}
//@ chunk-dcmhvw5a.js:131209-131462 layout
/**
 * 规范化 marketplace.json 的 metadata.pluginRoot（相对、无 ..、无冒号/反斜杠），非法返回 undefined。
 */
function normalizePluginRoot(pluginRoot) {
  if (
    typeof pluginRoot !== "string" ||
    pluginRoot === "" ||
    pluginRoot.startsWith("/") ||
    pluginRoot.includes("\\") ||
    pluginRoot.includes(":")
  )
    return;
  let replaced = pluginRoot.replace(/^\.\//, "").replace(/\/+$/, "");
  if (replaced === "" || replaced === ".") return ".";
  if (replaced.split("/").some((r) => r === "" || r === "." || r === "..")) return;
  return replaced;
}
//@ chunk-dcmhvw5a.js:131462-131599 layout
/**
 * 把裸来源名改写到 pluginRoot 下（./<root>/<name>）。
 */
function resolveBareSourceUnderPluginRoot(e, n) {
  if (n === undefined || !isPlainObject_2(e) || !isBareSourceName(e.source)) return e;
  let source = n === "." ? `./${e.source}` : `./${n}/${e.source}`;
  return {
    ...e,
    source,
  };
}
//@ chunk-dcmhvw5a.js:131599-131787 layout
/**
 * 预处理 marketplace.json：metadata.pluginRoot 合法时把裸名来源（"formatter"）改写成 ./<pluginRoot>/formatter。
 */
function applyMarketplacePluginRoot(e) {
  if (!isPlainObject_2(e) || !Array.isArray(e.plugins)) return e;
  let n = isPlainObject_2(e.metadata) ? normalizePluginRoot(e.metadata.pluginRoot) : undefined;
  if (n === undefined) return e;
  return {
    ...e,
    plugins: e.plugins.map((plugin) => resolveBareSourceUnderPluginRoot(plugin, n)),
  };
}
//@ chunk-dcmhvw5a.js:131787-133304 fingerprint = PluginMarketplaceSchema (0.71)
/**
 * marketplace.json schema：name、version、description、owner、plugins（逐条宽容解析）、forceRemoveDeletedPlugins、metadata.pluginRoot、allowCrossMarketplaceDependenciesOn、renames（旧名→新名/null）。
 */
var PluginMarketplaceSchema = DoctorLazy(() =>
  u({
    $schema: string()
      .optional()
      .describe("JSON Schema reference for editor autocomplete/validation; ignored at load time"),
    name: MarketplaceNameStrictSchema(isImpersonatingOfficialName),
    version: string().optional().describe("Marketplace manifest version"),
    description: string().optional().describe("Human-readable description of this marketplace"),
    owner: PluginAuthorSchema().describe("Marketplace maintainer or curator information"),
    plugins: array(unknown())
      .transform(parseMarketplacePluginEntries)
      .describe("Collection of available plugins in this marketplace"),
    forceRemoveDeletedPlugins: M()
      .optional()
      .describe(
        "When true, plugins removed from this marketplace will be automatically uninstalled and flagged for users",
      ),
    metadata: u({
      pluginRoot: string()
        .optional()
        .describe(
          'Base directory for bare plugin source names, relative to the marketplace root (e.g. "./plugins" resolves "source": "formatter" as ./plugins/formatter). Sources that already start with "./" are unaffected.',
        ),
      version: string().optional().describe("Marketplace version"),
      description: string().optional().describe("Marketplace description"),
    })
      .optional()
      .describe("Optional marketplace metadata"),
    allowCrossMarketplaceDependenciesOn: array(string())
      .optional()
      .describe(
        "Marketplace names whose plugins may be auto-installed as dependencies. Only the root marketplace's allowlist applies \u2014 no transitive trust.",
      ),
    renames: record(string(), string().nullable())
      .optional()
      .catch(undefined)
      .describe(
        "Append-only map of old plugin name \u2192 current name (or null when removed). The loader follows this on plugin-not-found and migrates user settings to the new name.",
      ),
  }),
);
var PluginMarketplaceFileSchema = DoctorLazy(() =>
  preprocess(applyMarketplacePluginRoot, PluginMarketplaceSchema()),
);
//@ chunk-dcmhvw5a.js:133304-133342 layout
/**
 * 名字像官方但未被直接禁止。
 */
function isLookalikeButNotBlockedName(name) {
  return isImpersonatingOfficialName(name) && !isBlockedOfficialName(name);
}
//@ chunk-dcmhvw5a.js:133342-133476 layout
/**
 * 针对某个市场自身名字返回放宽同名检测的市场名 schema。
 */
function getMarketplaceNameSchemaFor(e) {
  if (e !== undefined && isLookalikeButNotBlockedName(e)) {
    let lower = e.toLowerCase();
    return MarketplaceNameStrictSchema((name) =>
      name.toLowerCase() === lower ? isBlockedOfficialName(name) : isImpersonatingOfficialName(name),
    );
  }
  return PluginMarketplaceSchema().shape.name;
}
//@ chunk-dcmhvw5a.js:133476-133570 layout
/**
 * 返回解析某个市场 marketplace.json 用的 schema；该市场名本身像官方（但未被禁止）时只对“不同于自己”的名字做仿冒检测。
 */
function getPluginMarketplaceSchemaFor(e) {
  if (e !== undefined && isLookalikeButNotBlockedName(e))
    return preprocess(
      applyMarketplacePluginRoot,
      PluginMarketplaceSchema().extend({
        name: getMarketplaceNameSchemaFor(e),
      }),
    );
  return PluginMarketplaceFileSchema();
}
//@ chunk-dcmhvw5a.js:133570-133631 layout
var PLUGIN_ID_SEGMENT_PATTERN = "[A-Za-z0-9][-A-Za-z0-9._]*";
var PLUGIN_ID_SEGMENT_RE = new RegExp(`^${PLUGIN_ID_SEGMENT_PATTERN}$`);
//@ chunk-dcmhvw5a.js:133631-133664 layout
/**
 * 插件 ID 片段（名字或市场名）是否合法：字母数字开头，后接 -._ 与字母数字。
 */
function isValidPluginIdSegment(e) {
  return PLUGIN_ID_SEGMENT_RE.test(e);
}
//@ chunk-dcmhvw5a.js:133664-133711 layout
var PLUGIN_ID_RE = new RegExp(`^${PLUGIN_ID_SEGMENT_PATTERN}@${PLUGIN_ID_SEGMENT_PATTERN}$`);
var NPM_MARKETPLACE_SUFFIX = `@${pluginManifestPathSchemas}`;
//@ chunk-dcmhvw5a.js:133711-133777 layout
/**
 * 是否为 <npm包名>@npm 形式的插件 ID。
 */
function isNpmPluginId(e) {
  return (
    e.endsWith(NPM_MARKETPLACE_SUFFIX) && isValidNpmPackageName(e.slice(0, -NPM_MARKETPLACE_SUFFIX.length))
  );
}
//@ chunk-dcmhvw5a.js:133777-136457 fingerprint = PluginInstallationEntrySchema (0.508)
/**
 * 插件 ID（name@marketplace 或 <package>@npm）、依赖引用（名字[@市场][@^版本]或 {name,marketplace}）以及 installed_plugins.json 的 V1/V2 schema；V2 每个插件 ID 对应一组安装条目（scope、projectPath、installPath、version、gitCommitSha、auto…）。
 */
var PluginIdSchema = DoctorLazy(() =>
  string().refine(
    (e) => PLUGIN_ID_RE.test(e) || isNpmPluginId(e),
    "Plugin ID must be in format: plugin@marketplace",
  ),
);
var PLUGIN_NAME_FORBIDDEN_CHARS_RE = new RegExp(`[@:\\s/\\\\${INVISIBLE_CHAR_CLASS_SOURCE}]`, "u");
var INVISIBLE_CHARS_RE = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}]`, "u");
var CONTROL_OR_BIDI_CHARS_RE = /[\p{Cc}\u200E\u200F\u202A-\u202E\u2066-\u2069]/u;
var DEP_REF_REGEX = /^[A-Za-z0-9][-A-Za-z0-9._]*(@[A-Za-z0-9][-A-Za-z0-9._]*)?(@\^[^@]*)?$/;
var DependencyRefSchema = DoctorLazy(() =>
  union([
    string()
      .regex(DEP_REF_REGEX, "Dependency must be a plugin name, optionally qualified with @marketplace")
      .transform((e) => e.replace(/@\^[^@]*$/, "")),
    u({
      name: string()
        .min(1)
        .regex(/^[A-Za-z0-9][-A-Za-z0-9._]*$/),
      marketplace: string()
        .min(1)
        .regex(/^[A-Za-z0-9][-A-Za-z0-9._]*$/)
        .optional(),
    })
      .loose()
      .transform((e) => (e.marketplace ? `${e.name}@${e.marketplace}` : e.name)),
  ]),
);
var InstalledPluginSchema = DoctorLazy(() =>
  u({
    version: string().describe("Currently installed version"),
    installedAt: string().describe("ISO 8601 timestamp of installation"),
    lastUpdated: string().optional().describe("ISO 8601 timestamp of last update"),
    installPath: string().describe("Absolute path to the installed plugin directory"),
    gitCommitSha: string().optional().describe("Git commit SHA for git-based plugins (for version tracking)"),
    resolvedVersion: string()
      .optional()
      .describe(
        "Tag-derived semver this install resolved to (when fetched via a version constraint). Used by verifyAndDemote in preference to manifest.version, since the upstream may have forgotten to bump plugin.json.",
      ),
    auto: M()
      .optional()
      .describe(
        "True when this plugin was pulled in as a dependency rather than installed explicitly. Auto-installed plugins are eligible for removal by the orphan sweep when nothing depends on them. Absent = manual (preserves pre-flag installs).",
      ),
    ...claudeaiInstallFields(),
    ...directoryInstallFields(),
    ...commandSourceInstallFields(),
    ...npmInstallFields(),
  }),
);
var InstalledPluginsFileSchemaV1 = DoctorLazy(() =>
  u({
    version: literal(1).describe("Schema version 1"),
    plugins: record(PluginIdSchema(), InstalledPluginSchema()).describe(
      "Map of plugin IDs to their installation metadata",
    ),
  }),
);
var PluginScopeSchema = DoctorLazy(() => _enum(["managed", "user", "project", "local"]));
var PluginInstallationEntrySchema = DoctorLazy(() =>
  u({
    scope: PluginScopeSchema().describe("Installation scope"),
    projectPath: string().optional().describe("Project path (required for project/local scopes)"),
    installPath: string().describe("Absolute path to the versioned plugin directory"),
    version: string().optional().describe("Currently installed version"),
    installedAt: string().optional().describe("ISO 8601 timestamp of installation"),
    lastUpdated: string().optional().describe("ISO 8601 timestamp of last update"),
    gitCommitSha: string().optional().describe("Git commit SHA for git-based plugins"),
    resolvedVersion: string().optional().describe("Tag-derived semver this install resolved to"),
    auto: M().optional().describe("True when pulled in as a dependency. Eligible for orphan sweep."),
    ...claudeaiInstallFields(),
    ...directoryInstallFields(),
    ...commandSourceInstallFields(),
    ...npmInstallFields(),
  }),
);
var InstalledPluginsFileSchemaV2 = DoctorLazy(() =>
  u({
    version: literal(2).describe("Schema version 2"),
    plugins: record(PluginIdSchema(), array(PluginInstallationEntrySchema())).describe(
      "Map of plugin IDs to arrays of installation entries",
    ),
  }),
);
var InstalledPluginsFileShapeV2 = DoctorLazy(() =>
  u({
    version: literal(2),
    plugins: record(string(), unknown()),
  }),
);
//@ chunk-dcmhvw5a.js:136457-136838 layout
/**
 * 宽容解析 installed_plugins.json V2：ID 非法的放进 setAside、条目非法的放进 keptRaw（原样保留回写），返回合法部分与第一个错误。
 */
function parseInstalledPluginsV2Leniently(e) {
  InstalledPluginsFileShapeV2().parse(e);
  let n = {};
  let r = Object.create(null);
  let s = Object.create(null);
  let a;
  let firstUnparseableError;
  let plugins = e.plugins;
  for (let [key, value] of Object.entries(plugins)) {
    let h = PluginIdSchema().safeParse(key);
    if (!h.success) {
      r[key] = value;
      a ??= h.error;
      continue;
    }
    let y = array(PluginInstallationEntrySchema()).safeParse(value);
    if (y.success) n[key] = y.data;
    else {
      s[key] = value;
      a ??= y.error;
      firstUnparseableError ??= y.error;
    }
  }
  return {
    file: {
      version: 2,
      plugins: n,
    },
    setAside: r,
    keptRaw: s,
    firstError: a,
    firstUnparseableError,
  };
}
//@ chunk-dcmhvw5a.js:136838-137274 fingerprint = KnownMarketplaceSchema (0.763)
/**
 * known_marketplaces.json：市场名 → {source, installLocation, lastUpdated, autoUpdate}。claude.ai 同步的市场名以 claudeai- 开头（org/default/account）。
 */
var KnownMarketplaceSchema = DoctorLazy(() =>
  u({
    source: MarketplaceSourceLenientSchema().describe("Where to fetch the marketplace from"),
    installLocation: string().describe("Local cache path where marketplace manifest is stored"),
    lastUpdated: string().describe("ISO 8601 timestamp of last marketplace refresh"),
    autoUpdate: M()
      .optional()
      .describe("Whether to automatically update this marketplace and its installed plugins on startup"),
  }),
);
var KnownMarketplacesFileSchema = DoctorLazy(() => record(string(), KnownMarketplaceSchema()));
var CLAUDEAI_MARKETPLACE_PREFIX = "claudeai-";
var CLAUDEAI_MARKETPLACE_KINDS = ["org", "default", "account"];
//@ chunk-bfnfj4kx.js:4629-4766 fingerprint = PluginManifestSchema (0.355)
function PluginManifestSchema_2(e, o) {
  if (e.shape === undefined) return o === undefined ? e.initial : o;
  let t = o;
  return t?.shape === e.shape && t.value !== undefined ? t.value : e.initial;
}
//@ chunk-yf5m6p65.js:4323-4363 fingerprint = PluginManifestOutputStylesSchema (0.375)
/**
 * 清掉全局缓存的输出样式（名字配错）。
 */
function clearCachedOutputStyles() {
  getPluginRegistry().outputStyles = undefined;
}
export {
  isMarketplaceAutoUpdate,
  MAX_CONSENT_COMMAND_LENGTH,
  PluginManifestSchema,
  isReservedMarketplaceName,
  isUnavailablePackageMarketplace,
  formatPackageMarketplaceUnavailable,
  isAsciiImpersonatingOfficialName,
  IMPERSONATION_ERROR_MESSAGE,
  pluginManifestPathSchemas,
  isHttpUrl,
  isSafeArchiveUrl,
  ARCHIVE_URL_ERROR,
  PluginHooksSchema,
  PluginMonitorsArraySchema,
  redactNpmTarball,
  PluginIdSchema,
  redactMarketplaceSource,
  isNpmPluginId,
  gitSha,
  PLUGIN_NAME_FORBIDDEN_CHARS_RE,
  INVISIBLE_CHARS_RE,
  ALLOWED_OFFICIAL_MARKETPLACE_NAMES,
  ONE_MIB,
  MarketplaceSourceStrictSchema,
  MarketplaceSourceSchemaLazy,
  MarketplacePolicySourceSchema,
  PerKeyLazySchema,
  isValidRegex,
  parseGithubOwnerWildcard,
  hasGithubWildcard,
  PluginMarketplaceFileSchema,
  parsePluginBinaries,
  BINARY_BASENAME_RE,
  SHA256_HEX_RE,
  MAX_PLUGIN_BINARIES,
  BINARY_FETCH_CONCURRENCY,
  isValidPluginIdSegment,
  normalizePluginRoot,
  isOfficialMarketplaceName,
  isBareSourceName,
  PluginRelevanceSchema,
  PluginRelevanceSignalsSchema,
  PluginMarketplaceEntrySchema,
  PluginMarketplaceSchema,
  applyMarketplacePluginRoot,
  resolveBareSourceUnderPluginRoot,
  isRelativeSourcePath,
  LspServerConfigSchema,
  ANTHROPIC_PLUGIN_DIRECTORY,
  isAnthropicsGithubRepo,
  CONTROL_OR_BIDI_CHARS_RE,
  CLAUDEAI_MARKETPLACE_KINDS,
  CommandMetadataSchema,
  CLAUDEAI_MARKETPLACE_PREFIX,
  COMMUNITY_MARKETPLACE_NAMES,
  RESERVED_MARKETPLACE_NAMES,
  PluginManifestSchema_2,
  isGitlabHost,
  GIT_URL_PROTOCOLS,
  SSH_URL_PROTOCOLS,
  isGithubOrSshGithubHost,
  isValidNpmPackageName,
  KnownMarketplacesFileSchema,
  getMarketplaceNameSchemaFor,
  getPluginMarketplaceSchemaFor,
  validateOfficialNameSource,
  PLUGIN_DIRECTORY_MARKETPLACE_NAMES,
  isImpersonatingOfficialName,
  isLookalikeButNotBlockedName,
  hasUnknownSourceType,
  POLICY_SOURCE_TYPES,
  formatZodIssuesBrief,
  redactIssuePathKey,
  isPackageMarketplaceName,
  MarketplaceNameSchema,
  normalizeGitUrlHost,
  isUnsafeGitUrl,
  SSH_GITHUB_COM,
  parseGithubOwnerRepo,
  normalizeGitUrlForComparison,
  getManifestSchemaForDocument,
  clearCachedOutputStyles,
  InstalledPluginsFileSchemaV1,
  parseInstalledPluginsV2Leniently,
  MAX_PREVIOUS_PRODUCER_PATHS,
  isAnthropicsMarketplaceSource,
  isValidGithubOwner,
  normalizeRepoPath,
  GITHUB_NAME_SEGMENT_RE,
  EvalsPathSchema,
  splitAlnumWords,
  NON_ASCII_PATTERN,
  iterJoinedWordPrefixes,
  OFFICIAL_NAME_RE,
};
