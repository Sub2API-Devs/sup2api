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
  objectSchema,
  record,
  stringSchema,
  preprocess,
  array,
  unknown,
  union,
  literal,
  booleanSchema,
  lazy,
  never,
  _enum,
  numberSchema,
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:71850-71894 placement
/**
 * McpJsonConfigSchema：{mcpServers: Record<string, McpServerConfig>}。
 */
var McpJsonConfigSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dcmhvw5a.js:71850", () => {
  McpJsonConfigSchema = DoctorLazy(() =>
    objectSchema({
      mcpServers: record(stringSchema(), McpServerConfigSchema()),
    }),
  );
});
//@ chunk-dcmhvw5a.js:75983-76003 fingerprint (2.1.88 match: OFFICIAL_GITHUB_ORG, 1)
var OFFICIAL_GITHUB_ORG = "anthropics";
//@ chunk-dcmhvw5a.js:76003-76060 layout
/**
 * 判断来源是否指向 github.com/anthropics/ 组织下的仓库（官方保留市场名的校验依据）。
 */
function isAnthropicsGithubRepo(spec) {
  return normalizeGithubRepoSlug(spec)?.startsWith(`${OFFICIAL_GITHUB_ORG}/`) === true;
}
//@ chunk-dcmhvw5a.js:76060-76177 layout
var GIT_URL_PROTOCOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SSH_URL_PROTOCOLS;
deferInit("chunk-dcmhvw5a.js:76060", () => {
  GIT_URL_PROTOCOLS = new Set(["https:", "http:", "git:", "git+https:", "git+http:", "git+ssh:", "ssh:"]);
  SSH_URL_PROTOCOLS = new Set(["ssh:", "git+ssh:"]);
});
//@ chunk-dcmhvw5a.js:76177-76230 layout
function isGithubOrSshGithubHost(host) {
  return isGithubDotCom(host) || isHost(host, "ssh.github.com");
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
  constructor(fields, activeWhenAbsent = new Set()) {
    this.fields = fields;
    this.activeWhenAbsent = activeWhenAbsent;
    this.keys = Object.keys(fields).filter((key) => fields[key] !== undefined);
  }
  has(key) {
    return Object.hasOwn(this.fields, key) && this.fields[key] !== undefined;
  }
  field(key) {
    let cached = this.built.get(key);
    if (cached) return cached;
    let factory = this.has(key) ? this.fields[key] : undefined;
    if (!factory) return;
    let built = factory();
    this.built.set(key, built);
    return built;
  }
  carries(doc, key) {
    return this.activeWhenAbsent.has(key) || (typeof doc === "object" && doc !== null && key in doc);
  }
  whole() {
    this.wholeSchema ??= objectSchema(this.shapeOf(this.keys)).passthrough();
    return this.wholeSchema;
  }
  forDocument(doc, mode = "passthrough") {
    let filtered = this.keys.filter((key) => this.carries(doc, key));
    if (filtered.length === this.keys.length && mode === "passthrough") return this.whole();
    let cacheKey = `${mode}
${filtered.join(`
`)}`;
    let cached = this.byPresentKeys.get(cacheKey);
    if (cached) {
      this.byPresentKeys.delete(cacheKey);
      this.byPresentKeys.set(cacheKey, cached);
      return cached;
    }
    let shape = this.shapeOf(filtered);
    let schema =
      mode === "strip"
        ? preprocess((doc, ctx) => {
            for (let issue of this.wrongDocumentIssues(doc, shape)) ctx.addIssue(issue);
            return doc;
          }, objectSchema(shape))
        : objectSchema(shape)
            .passthrough()
            .check((ctx) => {
              ctx.issues.push(...this.wrongDocumentIssues(ctx.value, shape));
            });
    if (this.byPresentKeys.size >= SCHEMA_CACHE_MAX_ENTRIES)
      for (let key of this.byPresentKeys.keys()) {
        this.byPresentKeys.delete(key);
        break;
      }
    this.byPresentKeys.set(cacheKey, schema);
    return schema;
  }
  wrongDocumentIssues(doc, shape) {
    if (typeof doc !== "object" || doc === null) return [];
    let issues = [];
    for (let key of Object.keys(doc))
      if (!Object.hasOwn(shape, key) && this.has(key))
        issues.push({
          code: "custom",
          input: doc[key],
          path: [key],
          message: "This settings schema was built for a document without this key",
        });
    return issues;
  }
  shapeOf(keys) {
    let shape = {};
    for (let key of keys) {
      let field = this.field(key);
      if (field) shape[key] = field;
    }
    return shape;
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
    claudeaiPluginId: stringSchema().max(128).optional().catch(undefined),
    archiveSha256: Sha256HexSchema().optional().catch(undefined),
  };
}
//@ chunk-dcmhvw5a.js:78000-78084 layout
function directoryInstallFields() {
  return {
    directoryRepositoryKey: stringSchema().max(4096).optional().catch(undefined),
  };
}
//@ chunk-dcmhvw5a.js:78084-78223 layout
/**
 * 判断字符串是 http(s) URL。
 */
function isHttpUrl(url) {
  if (!/^https?:\/\/[^/\\]/i.test(url)) return false;
  try {
    let { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
//@ chunk-dcmhvw5a.js:78223-78463 layout
function npmInstallFields() {
  return {
    npmVersionSpec: stringSchema().max(256).optional().catch(undefined),
    npmResolved: stringSchema().max(2048).optional().catch(undefined),
    npmIntegrity: stringSchema().max(256).optional().catch(undefined),
    npmRegistry: stringSchema().max(2048).refine(isHttpUrl).optional().catch(undefined),
  };
}
//@ chunk-dcmhvw5a.js:78463-79637 layout
/**
 * installed_plugins 条目里 command 来源插件的字段：用户同意过的 sourceCommand、最近一次解析出的 sourceProducerPath、之前的 producer 目录（最多 32 个，供沙箱继续写保护）。
 */
function commandSourceInstallFields() {
  return {
    sourceCommand: stringSchema()
      .max(MAX_CONSENT_COMMAND_LENGTH + 20)
      .optional()
      .catch(undefined)
      .describe(
        "The `command`-source command the user accepted at explicit install/update. The once-per-session background re-resolve only runs while the marketplace entry still declares this exact command; a changed command (or an entry that became command-sourced later) is skipped with a warning until the user runs an explicit update.",
      ),
    sourceProducerPath: stringSchema()
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
      .transform((list) =>
        list
          .filter(
            (path) => typeof path === "string" && path.length <= 4096 && isAbsolutePathAnyPlatform(path),
          )
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
function isAbsolutePathAnyPlatform(path) {
  return posix.isAbsolute(path) || win32.isAbsolute(path);
}
//@ chunk-dcmhvw5a.js:79694-79722 layout
var UNPRINTABLE_OR_WIDE_SPACE_RE = /[^\x20-\x7E]| {4,}/;
//@ chunk-dcmhvw5a.js:79722-79995 layout
function HeadersHelperCommandSchema() {
  return stringSchema()
    .max(MAX_CONSENT_COMMAND_LENGTH, {
      message: "headersHelper must not be longer than the install consent UI can display",
    })
    .refine((command) => !UNPRINTABLE_OR_WIDE_SPACE_RE.test(command), {
      message:
        "headersHelper must be printable ASCII (letters, digits, punctuation, single spaces) with no runs of 4 or more spaces",
    });
}
//@ chunk-dcmhvw5a.js:79995-80535 fingerprint (2.1.88 match: ALLOWED_OFFICIAL_MARKETPLACE_NAMES, 0.589)
/**
 * 官方市场保留名清单：官方（claude-plugins-official 等 14 个）、社区（claude-community…）、插件目录（anthropic-plugin-directory）；并集 RESERVED_MARKETPLACE_NAMES 只能由 anthropics/* 的 GitHub 来源使用。
 */
var ANTHROPIC_PLUGIN_DIRECTORY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var OFFICIAL_VERTICAL_MARKETPLACE_NAMES;
var COMMUNITY_MARKETPLACE_NAMES;
var ALLOWED_OFFICIAL_MARKETPLACE_NAMES;
var PLUGIN_DIRECTORY_MARKETPLACE_NAMES;
var RESERVED_MARKETPLACE_NAMES;
deferInit("chunk-dcmhvw5a.js:79995", () => {
  ANTHROPIC_PLUGIN_DIRECTORY = "anthropic-plugin-directory";
  OFFICIAL_VERTICAL_MARKETPLACE_NAMES = ["healthcare"];
  COMMUNITY_MARKETPLACE_NAMES = new Set([
    "claude-community",
    "claude-plugins-community",
    ...OFFICIAL_VERTICAL_MARKETPLACE_NAMES,
  ]);
  ALLOWED_OFFICIAL_MARKETPLACE_NAMES = new Set([
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
  PLUGIN_DIRECTORY_MARKETPLACE_NAMES = new Set([ANTHROPIC_PLUGIN_DIRECTORY, "claude-plugin-directory"]);
  RESERVED_MARKETPLACE_NAMES = new Set([
    ...ALLOWED_OFFICIAL_MARKETPLACE_NAMES,
    ...COMMUNITY_MARKETPLACE_NAMES,
    ...PLUGIN_DIRECTORY_MARKETPLACE_NAMES,
  ]);
});
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
//@ chunk-dcmhvw5a.js:80607-80672 fingerprint (2.1.88 match: NO_AUTO_UPDATE_OFFICIAL_MARKETPLACES, 0.667)
var NO_AUTO_UPDATE_OFFICIAL_MARKETPLACES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:80607", () => {
  NO_AUTO_UPDATE_OFFICIAL_MARKETPLACES = new Set(["knowledge-work-plugins", "first-party-plugins"]);
});
//@ chunk-dcmhvw5a.js:80672-80903 callgraph-witnessed (2.1.88 match: isMarketplaceAutoUpdate, 0.377)
/**
 * 市场是否自动更新：显式参数 > 条目 autoUpdate > claudeai/pluginDirectory 来源默认开 > 官方名（knowledge-work-plugins、first-party-plugins 除外）默认开。
 */
function isMarketplaceAutoUpdate(name, entry, marketplaceAutoUpdate) {
  if (marketplaceAutoUpdate !== undefined) return marketplaceAutoUpdate;
  if (entry.autoUpdate !== undefined) return entry.autoUpdate;
  if (entry.source?.source === "claudeai") return true;
  if (entry.source?.source === "pluginDirectory") return true;
  let normalizedName = name.toLowerCase();
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
var OFFICIAL_NAME_PATTERN_SOURCE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var OFFICIAL_NAME_RE;
deferInit("chunk-dcmhvw5a.js:81001", () => {
  OFFICIAL_NAME_PATTERN_SOURCE =
    "official[^a-z0-9]*(anthropic|claude)|(?:anthropic|claude)[^a-z0-9]*official";
  OFFICIAL_NAME_RE = new RegExp(OFFICIAL_NAME_PATTERN_SOURCE, "i");
});
//@ chunk-dcmhvw5a.js:81109-81207 layout
function buildOfficialNameRegex(suffixes) {
  return new RegExp(
    `(?:${OFFICIAL_NAME_PATTERN_SOURCE}|^(?:anthropic|claude)[^a-z0-9]*(${suffixes.join("|")}))`,
    "i",
  );
}
//@ chunk-dcmhvw5a.js:81207-81256 layout
var LOOKALIKE_OFFICIAL_NAME_RE; // deferred: uses buildOfficialNameRegex of its import cycle while loading; runs once the cycle is complete
var BLOCKED_OFFICIAL_NAME_PATTERN;
var NON_ASCII_PATTERN;
deferInit("chunk-dcmhvw5a.js:81207", () => {
  LOOKALIKE_OFFICIAL_NAME_RE = buildOfficialNameRegex(getOfficialNameSuffixes());
  BLOCKED_OFFICIAL_NAME_PATTERN = buildOfficialNameRegex(OFFICIAL_NAME_SUFFIXES);
  NON_ASCII_PATTERN = /[^\u0020-\u007E]/;
});
//@ chunk-dcmhvw5a.js:81256-81322 layout
/**
 * 按非字母数字切分单词。
 */
function splitAlnumWords(name) {
  return name.split(/[^a-z0-9]+/i).filter((word) => word !== "");
}
//@ chunk-dcmhvw5a.js:81322-81450 layout
/**
 * 逐步拼接单词前缀（用于检测 anthropic+official 拼写变体）。
 */
function* iterJoinedWordPrefixes(name, maxLength) {
  let words = splitAlnumWords(name);
  let joined = "";
  for (let [index, word] of words.entries()) {
    joined += word;
    yield {
      joined,
      isWhole: index === words.length - 1,
    };
    if (joined.length > maxLength) return;
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
    let bound =
      9 + Math.max(...officialNameSuffixes.map((officialNameSuffix) => officialNameSuffix.length)) + 1;
    for (let { joined } of iterJoinedWordPrefixes(name, bound)) if (regExp.test(joined)) return true;
  }
  return false;
}
//@ chunk-dcmhvw5a.js:81877-81920 layout
/**
 * 仿冒官方市场名且全部为 ASCII（非 ASCII 另由 isBlockedOfficialName 处理）。
 */
function isAsciiImpersonatingOfficialName(name) {
  return isImpersonatingOfficialName(name) && !NON_ASCII_PATTERN.test(name);
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
//@ chunk-dcmhvw5a.js:82055-82472 fingerprint (2.1.88 match: validateOfficialNameSource, 0.975)
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
function isAnthropicsMarketplaceSource(source) {
  if (source.source === "github") {
    let repo = source.repo ?? "";
    return !repo.includes(":") && isAnthropicsGithubRepo(repo);
  }
  return source.source === "git" && source.url !== undefined && isAnthropicsGitUrl(source.url);
}
//@ chunk-dcmhvw5a.js:82611-83957 fingerprint (2.1.88 match: McpbPath, 0.36)
/**
 * 插件 manifest 路径类基础 schema（RelativePath 必须以 ./ 开头，JSON/Markdown/MCPB 路径变体）和保留市场名表：inline、builtin、skills-dir、synced、claude-plugin-test、npm 以及预留的 pip/uv/cargo/github/gh。
 */
var RelativePath; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var RelativeJSONPath;
var RelativeSkillDirPath;
var McpbPath;
var RelativeMarkdownPath;
var RelativeCommandPath;
var RESERVED_MARKETPLACE_NAME_PURPOSES;
var pluginManifestPathSchemas;
var UNAVAILABLE_PACKAGE_MARKETPLACES;
deferInit("chunk-dcmhvw5a.js:82611", () => {
  RelativePath = DoctorLazy(() => stringSchema().startsWith("./"));
  RelativeJSONPath = DoctorLazy(() => RelativePath().endsWith(".json"));
  RelativeSkillDirPath = DoctorLazy(() => union([literal("."), RelativePath()]));
  McpbPath = DoctorLazy(() =>
    union([
      RelativePath()
        .refine((path) => path.endsWith(".mcpb") || path.endsWith(".dxt"), {
          message: "MCPB file path must end with .mcpb or .dxt",
        })
        .describe("Path to MCPB file relative to plugin root"),
      stringSchema()
        .url()
        .refine((url) => url.endsWith(".mcpb") || url.endsWith(".dxt"), {
          message: "MCPB URL must end with .mcpb or .dxt",
        })
        .describe("URL to MCPB file"),
    ]),
  );
  RelativeMarkdownPath = DoctorLazy(() => RelativePath().endsWith(".md"));
  RelativeCommandPath = DoctorLazy(() => union([RelativeMarkdownPath(), RelativePath()]));
  RESERVED_MARKETPLACE_NAME_PURPOSES = {
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
  pluginManifestPathSchemas = "npm";
  UNAVAILABLE_PACKAGE_MARKETPLACES = ["pip", "uv", "cargo", "github", "gh"];
});
//@ chunk-dcmhvw5a.js:83957-84007 layout
/**
 * 是否为尚未开放的包市场（pip/uv/cargo/github/gh）。
 */
function isUnavailablePackageMarketplace(name) {
  return name !== undefined && UNAVAILABLE_PACKAGE_MARKETPLACES.includes(name);
}
//@ chunk-dcmhvw5a.js:84007-84103 layout
/**
 * “从 X 安装插件尚未开放”的提示。
 */
function formatPackageMarketplaceUnavailable(name) {
  return `Installing plugins from ${name} (\`<package>@${name}\`) is not available yet.`;
}
//@ chunk-dcmhvw5a.js:84103-84145 layout
/**
 * 名字是否为特殊来源保留的市场名（inline、builtin、skills-dir、synced、npm 等）。
 */
function isReservedMarketplaceName(name) {
  return Object.hasOwn(RESERVED_MARKETPLACE_NAME_PURPOSES, name);
}
//@ chunk-dcmhvw5a.js:84145-84163 layout
var PACKAGE_MARKETPLACE_NAMES; // deferred: uses RelativePath of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dcmhvw5a.js:84145", () => {
  PACKAGE_MARKETPLACE_NAMES = [pluginManifestPathSchemas, ...UNAVAILABLE_PACKAGE_MARKETPLACES];
});
//@ chunk-dcmhvw5a.js:84163-84215 layout
/**
 * 名字是否为包市场名（npm/pip/uv/cargo/github/gh）。
 */
function isPackageMarketplaceName(name) {
  return PACKAGE_MARKETPLACE_NAMES.includes(name.toLowerCase());
}
//@ chunk-dcmhvw5a.js:84215-84358 layout
function refineNotPackageMarketplaceName(name, context) {
  let name_2 = name.toLowerCase();
  if (isPackageMarketplaceName(name_2) && isReservedMarketplaceName(name_2))
    context.addIssue({
      code: "custom",
      message: `Marketplace name "${name_2}" is reserved for ${RESERVED_MARKETPLACE_NAME_PURPOSES[name_2]}`,
    });
}
//@ chunk-dcmhvw5a.js:84358-85131 fingerprint (2.1.88 match: MarketplaceNameSchema, 0.598)
/**
 * 市场名 schema 工厂：非空、无空格、无控制/双向字符、无路径分隔符与 ..、不仿冒官方（检测函数由参数给出）、不占用保留名。
 */
var IMPERSONATION_ERROR_MESSAGE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var buildMarketplaceNameSchema;
var MarketplaceNameSchema;
var LenientMarketplaceNameSchema;
deferInit("chunk-dcmhvw5a.js:84358", () => {
  IMPERSONATION_ERROR_MESSAGE = "Marketplace name impersonates an official Anthropic/Claude marketplace";
  buildMarketplaceNameSchema = (isImpersonating) =>
    stringSchema()
      .min(1, "Marketplace must have a name")
      .refine((name) => !name.includes(" "), {
        message: 'Marketplace name cannot contain spaces. Use kebab-case (e.g., "my-marketplace")',
      })
      .refine((name) => !CONTROL_OR_BIDI_CHARS_RE.test(name), {
        message: "Marketplace name cannot contain control or bidirectional-formatting characters",
      })
      .refine((name) => !name.includes("/") && !name.includes("\\") && !name.includes("..") && name !== ".", {
        message: 'Marketplace name cannot contain path separators (/ or \\), ".." sequences, or be "."',
      })
      .refine((name) => !isImpersonating(name), {
        message: IMPERSONATION_ERROR_MESSAGE,
      })
      .superRefine((name, context) => {
        let name_2 = name.toLowerCase();
        if (!isReservedMarketplaceName(name_2) || isPackageMarketplaceName(name_2)) return;
        context.addIssue({
          code: "custom",
          message: `Marketplace name "${name_2}" is reserved for ${RESERVED_MARKETPLACE_NAME_PURPOSES[name_2]}`,
        });
      });
  MarketplaceNameSchema = DoctorLazy(() => buildMarketplaceNameSchema(isImpersonatingOfficialName));
  LenientMarketplaceNameSchema = DoctorLazy(() => buildMarketplaceNameSchema(() => false));
});
//@ chunk-dcmhvw5a.js:85131-85175 layout
function MarketplaceNameStrictSchema(isImpersonating) {
  return buildMarketplaceNameSchema(isImpersonating).superRefine(refineNotPackageMarketplaceName);
}
//@ chunk-dcmhvw5a.js:85175-101864 callgraph-witnessed (2.1.88 match: LspServerConfigSchema, 0.255)
/**
 * 插件 manifest（.claude-plugin/plugin.json）各组成部分的 zod schema：元数据、hooks、commands、agents、skills、outputStyles、themes、workflows、mcpServers、userConfig、channels、LSP 服务器、monitors（后台监视命令）等；都用 lazySchema 包裹。
 */
var PluginNameSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PluginAuthorSchema;
var PluginManifestMetadataSchema;
var MAX_HOOKS_MODULES;
var PluginHooksSchema;
var PluginManifestHooksSchema;
var CommandMetadataSchema;
var PluginManifestCommandsSchema;
var PluginManifestAgentsSchema;
var PluginManifestSkillsSchema;
var EvalsPathSchema;
var PluginManifestOutputStylesSchema;
var HljsLanguageIdSchema;
var MAX_HLJS_LANGUAGES;
var HljsLanguageEntrySchema;
var PluginManifestSyntaxHighlightingSchema;
var PluginManifestThemesSchema;
var PluginManifestWorkflowsSchema;
var nonEmptyString;
var fileExtension;
var PluginManifestMcpServerSchema;
var PluginUserConfigOptionSchema;
var PluginManifestUserConfigSchema;
var PluginManifestChannelsSchema;
var LspServerConfigSchema;
var PluginMonitorSchema;
var PluginMonitorsArraySchema;
var PluginManifestMonitorsSchema;
var PluginManifestLspServerSchema;
var SCOPED_NPM_NAME_RE;
var UNSCOPED_NPM_NAME_RE;
var NPM_SCOPE_WILDCARD_RE;
deferInit("chunk-dcmhvw5a.js:85175", () => {
  PluginNameSchema = DoctorLazy(() =>
    stringSchema()
      .min(1, "Plugin name cannot be empty")
      .refine((name) => !name.includes(" "), {
        message: 'Plugin name cannot contain spaces. Use kebab-case (e.g., "my-plugin")',
      })
      .refine((name) => !CONTROL_OR_BIDI_CHARS_RE.test(name), {
        message: "Plugin name cannot contain control or bidirectional-formatting characters",
      }),
  );
  PluginAuthorSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema()
        .min(1, "Author name cannot be empty")
        .describe("Display name of the plugin author or organization"),
      email: stringSchema().optional().describe("Contact email for support or feedback"),
      url: stringSchema().optional().describe("Website, GitHub profile, or organization URL"),
    }),
  );
  PluginManifestMetadataSchema = DoctorLazy(() =>
    objectSchema({
      $schema: stringSchema()
        .optional()
        .describe("JSON Schema reference for editor autocomplete/validation; ignored at load time"),
      name: PluginNameSchema().describe(
        "Unique identifier for the plugin, used for namespacing (prefer kebab-case)",
      ),
      displayName: stringSchema()
        .optional()
        .describe(
          'Human-readable name shown in UI (e.g., "GitHub Utils"). Falls back to `name` when omitted. Unlike `name`, may contain spaces and any casing; not used for namespacing or lookup.',
        ),
      version: stringSchema()
        .optional()
        .describe("Semantic version (e.g., 1.2.3) following semver.org specification"),
      description: stringSchema()
        .optional()
        .describe("Brief, user-facing explanation of what the plugin provides"),
      author: PluginAuthorSchema().optional().describe("Information about the plugin creator or maintainer"),
      homepage: stringSchema().url().optional().describe("Plugin homepage or documentation URL"),
      repository: stringSchema().optional().describe("Source code repository URL"),
      license: stringSchema().optional().describe("SPDX license identifier (e.g., MIT, Apache-2.0)"),
      keywords: array(stringSchema()).optional().describe("Tags for plugin discovery and categorization"),
      defaultEnabled: booleanSchema()
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
        (value) => (isPlainObject_2(value) ? value : undefined),
        record(stringSchema(), unknown()).optional(),
      ).describe(
        "Free-form metadata for the plugin author's own use (e.g. entitlement or catalog fields). Preserved on the parsed manifest but not read by Claude Code.",
      ),
    }),
  );
  MAX_HOOKS_MODULES = 1;
  PluginHooksSchema = DoctorLazy(() =>
    objectSchema({
      $schema: stringSchema()
        .optional()
        .catch(undefined)
        .describe("JSON Schema reference for editor autocomplete/validation; ignored at load time"),
      description: stringSchema()
        .optional()
        .describe("Brief, user-facing explanation of what these hooks provide"),
      hooks: lazy(() => HooksSchema())
        .optional()
        .describe("The hooks provided by the plugin, in the same format as the one used for settings"),
      modules: array(stringSchema())
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
    }).refine((value) => value.hooks !== undefined || (value.modules?.length ?? 0) > 0, {
      message: "hooks.json must have `hooks` (the hook matchers) or `modules` (hooks modules), or both",
    }),
  );
  PluginManifestHooksSchema = DoctorLazy(() =>
    objectSchema({
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
  CommandMetadataSchema = DoctorLazy(() =>
    objectSchema({
      source: RelativeCommandPath()
        .optional()
        .describe("Path to command markdown file, relative to plugin root"),
      content: stringSchema().optional().describe("Inline markdown content for the command"),
      description: stringSchema().optional().describe("Command description override"),
      argumentHint: stringSchema().optional().describe('Hint for command arguments (e.g., "[file]")'),
      model: stringSchema().optional().describe("Default model for this command"),
      allowedTools: array(stringSchema()).optional().describe("Tools allowed when command runs"),
    }).refine((data) => (data.source && !data.content) || (!data.source && data.content), {
      message: 'Command must have either "source" (file path) or "content" (inline markdown), but not both',
    }),
  );
  PluginManifestCommandsSchema = DoctorLazy(() =>
    objectSchema({
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
        record(stringSchema(), CommandMetadataSchema()).describe(
          'Object mapping of command names to their metadata and source files. Command name becomes the slash command name (e.g., "about" \u2192 "/plugin:about")',
        ),
      ]),
    }),
  );
  PluginManifestAgentsSchema = DoctorLazy(() =>
    objectSchema({
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
  PluginManifestSkillsSchema = DoctorLazy(() =>
    objectSchema({
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
  EvalsPathSchema = DoctorLazy(() => union([stringSchema(), array(stringSchema())]));
  PluginManifestOutputStylesSchema = DoctorLazy(() =>
    objectSchema({
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
  HljsLanguageIdSchema = DoctorLazy(() =>
    stringSchema()
      .max(64)
      .regex(/^[a-z][a-z0-9_-]*$/, "must match ^[a-z][a-z0-9_-]*$"),
  );
  MAX_HLJS_LANGUAGES = 16;
  HljsLanguageEntrySchema = DoctorLazy(() =>
    objectSchema({
      id: HljsLanguageIdSchema(),
      remote: stringSchema()
        .max(256)
        .regex(
          /^(npm:[@a-z0-9/._-]+(@[a-z0-9._+-]+)?|github:[\w.-]+\/[\w.-]+@[\w./-]+#.+\.js)$/,
          "must be npm:<pkg>[@ver] or github:<owner>/<repo>@<ref>#<path>.js",
        )
        .optional(),
      integrity: stringSchema()
        .max(512)
        .regex(/^sha(256|384|512)-[A-Za-z0-9+/=]+$/, "must be SRI form: sha256-, sha384-, or sha512-<base64>")
        .optional(),
    }).strict(),
  );
  PluginManifestSyntaxHighlightingSchema = DoctorLazy(() =>
    objectSchema({
      syntaxHighlighting: objectSchema({
        hljsLanguages: array(HljsLanguageEntrySchema()).max(MAX_HLJS_LANGUAGES),
      }).strict(),
    }),
  );
  PluginManifestThemesSchema = DoctorLazy(() =>
    objectSchema({
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
  PluginManifestWorkflowsSchema = DoctorLazy(() =>
    objectSchema({
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
  nonEmptyString = DoctorLazy(() => stringSchema().min(1));
  fileExtension = DoctorLazy(() =>
    stringSchema()
      .min(2)
      .refine((ext) => ext.startsWith("."), {
        message: 'File extensions must start with dot (e.g., ".ts", not "ts")',
      }),
  );
  PluginManifestMcpServerSchema = DoctorLazy(() =>
    objectSchema({
      mcpServers: union([
        RelativeJSONPath().describe(
          "MCP servers to include in the plugin (in addition to those in the .mcp.json file, if it exists)",
        ),
        McpbPath().describe("Path or URL to MCPB file containing MCP server configuration"),
        record(stringSchema(), McpServerConfigSchema()).describe(
          "MCP server configurations keyed by server name",
        ),
        array(
          union([
            RelativeJSONPath().describe("Path to MCP servers configuration file"),
            McpbPath().describe("Path or URL to MCPB file"),
            record(stringSchema(), McpServerConfigSchema()).describe("Inline MCP server configurations"),
          ]),
        ).describe("Array of MCP server configurations (paths, MCPB files, or inline definitions)"),
      ]),
    }),
  );
  PluginUserConfigOptionSchema = DoctorLazy(() =>
    objectSchema({
      type: _enum(["string", "number", "boolean", "directory", "file"]).describe(
        "Type of the configuration value",
      ),
      title: stringSchema().describe("Human-readable label shown in the config dialog"),
      description: stringSchema().describe("Help text shown beneath the field in the config dialog"),
      required: booleanSchema().optional().describe("If true, validation fails when this field is empty"),
      default: union([stringSchema(), numberSchema(), booleanSchema(), array(stringSchema())])
        .optional()
        .describe("Default value used when the user provides nothing"),
      multiple: booleanSchema().optional().describe("For string type: allow an array of strings"),
      sensitive: booleanSchema()
        .optional()
        .describe(
          "If true, masks dialog input and stores value in secure storage (keychain/credentials file) instead of settings.json",
        ),
      min: numberSchema().optional().describe("Minimum value (number type only)"),
      max: numberSchema().optional().describe("Maximum value (number type only)"),
      options: array(
        stringSchema()
          .min(1, "An option cannot be empty")
          .max(64, "An option can be at most 64 characters")
          .refine((option) => recursivelySanitizeUnicode_2(option) === option, {
            message: "An option cannot contain control, invisible or bidirectional-formatting characters",
          })
          .refine((option) => option.trim() === option, {
            message: "An option cannot start or end with a space",
          }),
      )
        .min(1, "options needs at least one value")
        .refine((options) => new Set(options.map((option) => option.toLowerCase())).size === options.length, {
          message: "options cannot repeat a value (in any letter case)",
        })
        .readonly()
        .optional()
        .describe(
          "For string type: the only values the field takes. /config shows the field as a picker over them, and a stored value outside them counts as unset",
        ),
    })
      .strict()
      .superRefine((field, context) => {
        if (field.options === undefined) return;
        if (field.type !== "string" || field.multiple === true || field.sensitive === true) {
          context.addIssue({
            code: "custom",
            path: ["options"],
            message: 'options is only for a field of type "string" that is neither multiple nor sensitive',
          });
          return;
        }
        if (field.default === undefined) {
          if (field.required !== true)
            context.addIssue({
              code: "custom",
              path: ["default"],
              message: "a field with options needs a default among them, or required: true",
            });
          return;
        }
        if (typeof field.default !== "string" || !field.options.includes(field.default))
          context.addIssue({
            code: "custom",
            path: ["default"],
            message: `default must be one of the options: ${field.options.join(", ")}`,
          });
      }),
  );
  PluginManifestUserConfigSchema = DoctorLazy(() =>
    objectSchema({
      userConfig: record(
        stringSchema().regex(
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
  PluginManifestChannelsSchema = DoctorLazy(() =>
    objectSchema({
      channels: array(
        objectSchema({
          server: stringSchema()
            .min(1)
            .describe(
              "Name of the MCP server this channel binds to. Must match a key in this plugin's mcpServers.",
            ),
          displayName: stringSchema()
            .optional()
            .describe(
              'Human-readable name shown in the config dialog title (e.g., "Telegram"). Defaults to the server name.',
            ),
          userConfig: record(stringSchema(), PluginUserConfigOptionSchema())
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
  LspServerConfigSchema = DoctorLazy(() =>
    zodStrictObject({
      command: stringSchema()
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
      env: record(stringSchema(), stringSchema())
        .optional()
        .describe("Environment variables to set when starting the server"),
      initializationOptions: unknown()
        .optional()
        .describe("Initialization options passed to the server during initialization"),
      settings: unknown()
        .optional()
        .describe("Settings passed to the server via workspace/didChangeConfiguration"),
      workspaceFolder: stringSchema().optional().describe("Workspace folder path to use for the server"),
      startupTimeout: numberSchema()
        .int()
        .positive()
        .optional()
        .describe("Maximum time to wait for server startup (milliseconds)"),
      shutdownTimeout: numberSchema()
        .int()
        .positive()
        .optional()
        .describe("Maximum time to wait for graceful shutdown (milliseconds)"),
      requestTimeout: numberSchema()
        .int()
        .positive()
        .max(2147483647)
        .optional()
        .describe(
          "Maximum time to wait for the server to answer a request (milliseconds). Defaults to 60000.",
        ),
      restartOnCrash: booleanSchema().optional().describe("Whether to restart the server if it crashes"),
      maxRestarts: numberSchema()
        .int()
        .nonnegative()
        .optional()
        .describe("Maximum number of restart attempts before giving up"),
      diagnostics: booleanSchema()
        .optional()
        .describe(
          "Whether to push publishDiagnostics into the agent context after edits. Set to false to keep LSP navigation (goToDefinition, hover, etc.) but suppress automatic diagnostic injection. Defaults to true.",
        ),
    }),
  );
  PluginMonitorSchema = DoctorLazy(() =>
    zodStrictObject({
      name: stringSchema()
        .min(1)
        .describe(
          "Identifier for this monitor, unique within the plugin. Used to dedupe so re-arming (plugin reload, repeat skill invoke) does not spawn duplicates.",
        ),
      command: stringSchema()
        .min(1)
        .describe(
          'Shell command to run as a persistent background monitor. Each stdout line is delivered to the model as a <task_notification> event; the process runs for the session lifetime. ${CLAUDE_PLUGIN_ROOT}, ${CLAUDE_PLUGIN_DATA}, ${CLAUDE_PROJECT_DIR}, ${user_config.*}, and ${ENV_VAR} are substituted. Runs in the session cwd (the named --project-config-root when a host set one) \u2014 prefix with `cd "${CLAUDE_PLUGIN_ROOT}" && ` if the script needs its own directory.',
        ),
      description: stringSchema()
        .min(1)
        .describe(
          "Short human-readable description of what is being monitored (shown in task panel and notification summary).",
        ),
      when: union([
        literal("always"),
        stringSchema()
          .startsWith("on-skill-invoke:")
          .refine((value) => value.length > 16, {
            message: "on-skill-invoke: must specify a skill name",
          }),
      ])
        .default("always")
        .describe(
          'Arm trigger. "always" arms at session start and on plugin reload. "on-skill-invoke:<skill>" arms the first time that skill is dispatched (via Skill tool or slash command).',
        ),
    }),
  );
  PluginMonitorsArraySchema = DoctorLazy(() =>
    array(PluginMonitorSchema()).refine(
      (monitors) => new Set(monitors.map((monitor) => monitor.name)).size === monitors.length,
      {
        message: "Monitor names must be unique within a plugin",
      },
    ),
  );
  PluginManifestMonitorsSchema = DoctorLazy(() =>
    objectSchema({
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
  PluginManifestLspServerSchema = DoctorLazy(() =>
    objectSchema({
      lspServers: union([
        RelativeJSONPath().describe("Path to .lsp.json configuration file relative to plugin root"),
        record(stringSchema(), LspServerConfigSchema()).describe(
          "LSP server configurations keyed by server name",
        ),
        array(
          union([
            RelativeJSONPath().describe("Path to LSP configuration file"),
            record(stringSchema(), LspServerConfigSchema()).describe("Inline LSP server configurations"),
          ]),
        ).describe("Array of LSP server configurations (paths or inline definitions)"),
      ]),
    }),
  );
  SCOPED_NPM_NAME_RE = /^@[a-z0-9][a-z0-9-._]*\/[a-z0-9][a-z0-9-._]*$/;
  UNSCOPED_NPM_NAME_RE = /^[a-z0-9][a-z0-9-._]*$/;
  NPM_SCOPE_WILDCARD_RE = /^@[a-z0-9][a-z0-9-._]*\/\*$/;
});
//@ chunk-dcmhvw5a.js:101864-101949 layout
/**
 * npm 包名是否合法（作用域 @scope/name 或普通名，不含 .. 与 //）。
 */
function isValidNpmPackageName(name) {
  return (
    !name.includes("..") &&
    !name.includes("//") &&
    (SCOPED_NPM_NAME_RE.test(name) || UNSCOPED_NPM_NAME_RE.test(name))
  );
}
//@ chunk-dcmhvw5a.js:101949-102252 fingerprint (2.1.88 match: NpmPackageNameSchema, 0.835)
/**
 * npm 包名 schema（禁止 `..` 与 `//`、须为合法 npm 名）及同一语句里的插件二进制相关常量：二进制文件名正则、sha256 正则、下载并发 16、单插件最多 64 个二进制、1 MiB 常量、二进制 pin schema。
 */
var NpmPackageNameSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var BINARY_BASENAME_RE;
var SHA256_HEX_RE;
var BINARY_FETCH_CONCURRENCY;
var MAX_PLUGIN_BINARIES;
var ONE_MIB;
var BinaryPinSchema;
deferInit("chunk-dcmhvw5a.js:101949", () => {
  NpmPackageNameSchema = DoctorLazy(() =>
    stringSchema()
      .refine(
        (name) => !name.includes("..") && !name.includes("//"),
        "Package name cannot contain path traversal patterns",
      )
      .refine((name) => isValidNpmPackageName(name), "Invalid npm package name format"),
  );
  BINARY_BASENAME_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9_-])?$/;
  SHA256_HEX_RE = /^[0-9a-f]{64}$/;
  BINARY_FETCH_CONCURRENCY = 16;
  MAX_PLUGIN_BINARIES = 64;
  ONE_MIB = 1048576;
  BinaryPinSchema = DoctorLazy(() =>
    objectSchema({
      sha256: stringSchema().regex(SHA256_HEX_RE),
    }),
  );
});
//@ chunk-dcmhvw5a.js:102252-102492 layout
/**
 * 宽容解析 manifest 的 binaries：只保留 basename 合法且 {sha256} 合法的项，最多 64 个；无有效项返回 undefined。
 */
function parsePluginBinaries(binaries) {
  let result = record(stringSchema(), unknown()).safeParse(binaries);
  if (!result.success) return;
  let validBinaries = Object.create(null);
  let count = 0;
  for (let [key, value] of Object.entries(result.data)) {
    if (count >= MAX_PLUGIN_BINARIES) break;
    let parsedPin = BinaryPinSchema().safeParse(value);
    if (BINARY_BASENAME_RE.test(key) && parsedPin.success) {
      validBinaries[key] = parsedPin.data;
      count++;
    }
  }
  return count > 0 ? validBinaries : undefined;
}
//@ chunk-dcmhvw5a.js:102492-104275 layout
var PluginManifestBinariesSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PluginManifestSettingsSchema;
var PluginManifestTypesSchema;
var PluginManifestExperimentalSchema;
deferInit("chunk-dcmhvw5a.js:102492", () => {
  PluginManifestBinariesSchema = DoctorLazy(() =>
    objectSchema({
      binaries: unknown()
        .transform(parsePluginBinaries)
        .describe(
          "sha256-pinned files to fetch into bin/ at install time, keyed by basename (target triple encoded in the name)",
        ),
    }),
  );
  PluginManifestSettingsSchema = DoctorLazy(() =>
    objectSchema({
      settings: record(stringSchema(), unknown())
        .optional()
        .describe(
          "Settings to merge into the user settings while this plugin is enabled. Only the documented allowlisted keys are applied.",
        ),
    }),
  );
  PluginManifestTypesSchema = DoctorLazy(() =>
    objectSchema({
      types: RelativePath()
        .refine((value) => value.endsWith(".d.ts"), {
          message: "types must name a TypeScript declaration file ending in '.d.ts'",
        })
        .refine((value) => !value.split(/[\\/]/).includes(".."), {
          message: "types must stay inside the plugin directory (no '..' segment)",
        })
        .optional()
        .describe(
          "Path to the plugin's type contract, relative to the plugin root and starting with ./: a self-contained .d.ts (no import, export-from, require or reference) that exports the types of the noun the plugin's hooks module adds in engine.create at its top level and declares the noun in a `declare module 'claude-code' { interface EngineInterface { ... } }` block, nothing else. A mod that lists this plugin under dependencies gets the contract laid at .claude-plugin/types/<plugin>/index.d.ts each time the engine loads it from a folder the person owns, so it types against the noun with nothing copied; claude plugin validate checks the file.",
        ),
    }),
  );
  PluginManifestExperimentalSchema = DoctorLazy(() =>
    objectSchema({
      experimental: preprocess(
        (value) => (isPlainObject_2(value) ? value : undefined),
        objectSchema({
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
});
//@ chunk-dcmhvw5a.js:104275-105852 file-local
/**
 * PluginManifestSchema：把元数据与全部组件 schema 合并成完整 plugin.json schema；PluginManifestFieldSchemas 是同样字段的 PerKeyLazySchema 版本（name 必选），用于只校验文档里出现的字段。
 */
var PluginManifestSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PluginManifestFieldSchemas;
deferInit("chunk-dcmhvw5a.js:104275", () => {
  PluginManifestSchema = DoctorLazy(() =>
    objectSchema({
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
  PluginManifestFieldSchemas = DoctorLazy(
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
});
//@ chunk-dcmhvw5a.js:105852-105903 layout
/**
 * 为一个 plugin.json 文档取“只含其出现字段”的 strip 模式 manifest schema。
 */
function getManifestSchemaForDocument(rawDocument) {
  return PluginManifestFieldSchemas().forDocument(rawDocument, "strip");
}
//@ chunk-dcmhvw5a.js:105903-106019 layout
var POLICY_SOURCE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:105903", () => {
  POLICY_SOURCE_TYPES = new Set([
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
});
//@ chunk-dcmhvw5a.js:106019-106079 layout
/**
 * 字符串能否编译为正则。
 */
function isValidRegex(source) {
  try {
    new RegExp(source);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-dcmhvw5a.js:106079-106115 layout
/**
 * git URL 是否危险（命令注入形态或本地协议）。
 */
function isUnsafeGitUrl(url) {
  return hasBackslashInUrlAuthority(url) || describeUrlScheme(url);
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
  let path = (
    /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(url.trimStart())
      ? urlScheme?.path.replace(/[?#][\s\S]*$/, "")
      : urlScheme?.path
  )?.replace(/^\/+/, "");
  if (!host || !path || !isGithubHost(host)) return null;
  let repoPath = normalizeRepoPath(path);
  let parts = repoPath.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return repoPath;
}
//@ chunk-dcmhvw5a.js:106470-106498 layout
var GITHUB_NAME_SEGMENT_RE = /^[A-Za-z0-9._-]+$/;
//@ chunk-dcmhvw5a.js:106498-106572 layout
/**
 * GitHub owner/repo 段是否合法。
 */
function isValidGithubOwner(owner) {
  return GITHUB_NAME_SEGMENT_RE.test(owner) && !owner.startsWith("-") && owner !== "." && owner !== "..";
}
//@ chunk-dcmhvw5a.js:106572-106662 layout
/**
 * 解析策略条目里的 "owner/*" 通配，返回 owner；不合法返回 null。
 */
function parseGithubOwnerWildcard(pattern) {
  if (!pattern.endsWith("/*")) return null;
  let sliced = pattern.slice(0, -2);
  return isValidGithubOwner(sliced) ? sliced : null;
}
//@ chunk-dcmhvw5a.js:106662-106746 layout
/**
 * 规范化仓库路径（URL 解码、折叠 ./..、去尾斜杠与 .git）。
 */
function normalizeRepoPath(path) {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {}
  let collapsed = collapseDotSegments(decoded);
  return stripTrailingSlashAndDotGit(collapsed);
}
//@ chunk-dcmhvw5a.js:106746-106896 layout
function collapseDotSegments(path) {
  let segments = [];
  for (let segment of path.split("/")) {
    if (segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.filter((segment) => segment !== "").join("/");
}
//@ chunk-dcmhvw5a.js:106896-107068 layout
function stripTrailingSlashAndDotGit(path) {
  let end = path.length;
  for (;;) {
    let trimmed = end;
    while (trimmed > 0 && path.charCodeAt(trimmed - 1) === 47) trimmed--;
    if (trimmed >= 4 && path.startsWith(".git", trimmed - 4)) trimmed -= 4;
    if (trimmed === end) return end === path.length ? path : path.slice(0, end);
    end = trimmed;
  }
}
//@ chunk-dcmhvw5a.js:107068-107116 layout
function canonicalGitHost(host) {
  let normalized = normalizeGitHost(host);
  return normalized === SSH_GITHUB_COM ? GITHUB_HOST : normalized;
}
//@ chunk-dcmhvw5a.js:107116-107462 layout
/**
 * 规范化 git URL 用于比较：主机规范化（ssh.github.com→github.com）、去凭据/查询/片段、折叠 ./..，可选去掉 .git。
 */
function normalizeGitUrlForComparison(url, options) {
  if (url.includes("://"))
    try {
      let parsed = nonHttpsScheme(url);
      if (parsed === null) return url;
      parsed.hostname = canonicalGitHost(parsed.hostname);
      parsed.username = "";
      parsed.password = "";
      parsed.search = "";
      parsed.hash = "";
      try {
        parsed.pathname = decodeURIComponent(parsed.pathname);
      } catch {}
      let path = collapseDotSegments(parsed.pathname);
      parsed.pathname = options?.stripDotGit ? stripTrailingSlashAndDotGit(path) : path;
      return parsed.toString();
    } catch {
      return url;
    }
  let urlScheme = parseUrlScheme(url);
  return urlScheme ? `${canonicalGitHost(urlScheme.host)}:${urlScheme.path}` : url;
}
//@ chunk-dcmhvw5a.js:107462-107529 layout
var CREDENTIAL_STRIP_PROTOCOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:107462", () => {
  CREDENTIAL_STRIP_PROTOCOLS = new Set(["http:", "https:", "git:", "git+http:", "git+https:"]);
});
//@ chunk-dcmhvw5a.js:107529-107865 layout
/**
 * git URL 主机规范化，http(s)/git 协议与 GitHub 主机去掉凭据；scp 形式 GitHub 转 github.com:path。
 */
function normalizeGitUrlHost(url) {
  if (isUnsafeRemoteUrl(url)) return url;
  if (url.includes("://"))
    try {
      let parsed = new URL(url);
      parsed.hostname = normalizeGitHost(parsed.hostname);
      if (CREDENTIAL_STRIP_PROTOCOLS.has(parsed.protocol) || isGithubDotCom(parsed.hostname)) {
        parsed.username = "";
        parsed.password = "";
      }
      return parsed.toString();
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
    let normalized = normalizeGitUrlHost(url);
    try {
      let parsed = new URL(normalized);
      return parsed.hostname.includes("*") || parsed.pathname.includes("*");
    } catch {
      return normalized.includes("*");
    }
  }
  let urlScheme = parseUrlScheme(url);
  let host = urlScheme?.host;
  let path = urlScheme?.path;
  if (!host || path === undefined || !isGithubHost(host)) return false;
  let path_2 = path;
  try {
    path_2 = decodeURIComponent(path);
  } catch {}
  return path_2.includes("*");
}
//@ chunk-dcmhvw5a.js:108311-115001 fingerprint (2.1.88 match: MarketplaceSourceSchema, 0.644)
/**
 * 市场来源（marketplace source）的判别联合 schema：url、github、git、npm、file、directory、skills-dir（策略哨兵）、hostPattern、pathPattern、settings（settings.json 内联市场）。参数为 true 时 settings 名字只做宽松校验（读 known_marketplaces.json 用）。
 */
function MarketplaceSourceSchema(lenient) {
  return discriminatedUnion("source", [
    objectSchema({
      source: literal("url"),
      url: stringSchema().url().describe("Direct URL to marketplace.json file"),
      headers: record(stringSchema(), stringSchema())
        .optional()
        .describe("Custom HTTP headers (e.g., for authentication)"),
      headersHelper: HeadersHelperCommandSchema()
        .optional()
        .describe(
          "Command that prints a JSON object of HTTP headers (e.g. a short-lived auth token). Its output overrides `headers` and, like `headers`, is inherited by same-origin archive downloads from this marketplace. Runs from a fixed directory (the Claude config home, never the session's), so give a bare command found via PATH or an absolute path; it is re-run on later refreshes of this marketplace.",
        ),
    }),
    objectSchema({
      source: literal("github"),
      repo: stringSchema().describe(
        'GitHub repository in owner/repo format. ONLY in the managed-settings policy lists (strictKnownMarketplaces / blockedMarketplaces) the owner-wildcard form "owner/*" matches every repository under exactly that owner. Everywhere else (marketplace add, extraKnownMarketplaces, known_marketplaces.json) the value ' +
          "must name a single repository \u2014 a wildcard is taken literally and fails to clone.",
      ),
      ref: stringSchema()
        .optional()
        .describe(
          'Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.',
        ),
      path: stringSchema()
        .optional()
        .describe("Path to marketplace.json within repo (defaults to .claude-plugin/marketplace.json)"),
      sparsePaths: array(stringSchema())
        .optional()
        .describe(
          'Directories to include via git sparse-checkout (cone mode). Use for monorepos where the marketplace lives in a subdirectory. Example: [".claude-plugin", "plugins"]. If omitted, the full repository is cloned.',
        ),
      skipLfs: booleanSchema()
        .optional()
        .describe(
          "Has no effect; accepted so existing settings keep working. Claude Code's own git never downloads Git LFS content: LFS-tracked files in the marketplace repository are checked out as pointer files whether or not this is set, and adding or updating the marketplace says how many were. To fetch their content, run `git lfs pull` in the marketplace's checkout under ~/.claude/plugins/marketplaces/.",
        ),
    }),
    objectSchema({
      source: literal("git"),
      url: stringSchema().describe("Full git repository URL"),
      ref: stringSchema()
        .optional()
        .describe(
          'Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.',
        ),
      path: stringSchema()
        .optional()
        .describe("Path to marketplace.json within repo (defaults to .claude-plugin/marketplace.json)"),
      sparsePaths: array(stringSchema())
        .optional()
        .describe(
          'Directories to include via git sparse-checkout (cone mode). Use for monorepos where the marketplace lives in a subdirectory. Example: [".claude-plugin", "plugins"]. If omitted, the full repository is cloned.',
        ),
      skipLfs: booleanSchema()
        .optional()
        .describe(
          "Has no effect; accepted so existing settings keep working. Claude Code's own git never downloads Git LFS content: LFS-tracked files in the marketplace repository are checked out as pointer files whether or not this is set, and adding or updating the marketplace says how many were. To fetch their content, run `git lfs pull` in the marketplace's checkout under ~/.claude/plugins/marketplaces/.",
        ),
    }),
    objectSchema({
      source: literal("npm"),
      package: NpmPackageNameSchema()
        .or(stringSchema().regex(NPM_SCOPE_WILDCARD_RE, "Invalid npm package name format"))
        .describe(
          'npm package containing marketplace.json (e.g. "@acme/claude-marketplace"). In strictKnownMarketplaces / blockedMarketplaces an entry also governs plugins installed straight from the npm marketplace (`<package>@npm`): an exact package name matches that package, and "@acme/*" matches every package under the scope.',
        ),
      version: stringSchema()
        .optional()
        .describe('Version or range to fetch (e.g. "1.4.0", "^1.4"); defaults to the latest dist-tag'),
      registry: stringSchema()
        .url()
        .refine(isHttpUrl, "Registry must be an http(s) URL")
        .optional()
        .describe(
          `Registry URL. When adding a marketplace: a one-off registry override (otherwise your npm configuration decides). In a policy entry: the origin and path prefix the package's RESOLVED tarball URL must fall under (e.g. "https://npm.example.com/api/npm/internal/"); under allowManagedPermissionRulesOnly, an npm marketplace keeps plugin allowed-tools only when both the entry and the registration pin this same registry.`,
        ),
    }),
    objectSchema({
      source: literal("file"),
      path: stringSchema().describe("Local file path to marketplace.json"),
    }),
    objectSchema({
      source: literal("directory"),
      path: stringSchema().describe("Local directory containing .claude-plugin/marketplace.json"),
    }),
    objectSchema({
      source: literal("skills-dir"),
    }).describe(
      "Policy-list sentinel for the ~/.claude/skills/ auto-load (@skills-dir plugins). In strictKnownMarketplaces: opt the scan back IN (by default any allowlist blocks it). In blockedMarketplaces: turn the scan OFF without otherwise restricting marketplaces. Only meaningful in those two managed-settings lists (areLocalPluginDirsAllowedByPolicy); known_marketplaces.json / marketplace add etc. ignore it.",
    ),
    objectSchema({
      source: literal("hostPattern"),
      hostPattern: stringSchema().describe(
        'Regex pattern to match the host/domain extracted from any marketplace source type. For github sources, matches against github.com. For git sources (SSH or HTTPS), extracts the hostname from the URL. Use in strictKnownMarketplaces to allow all marketplaces from a specific host (e.g., "^github\\.mycompany\\.com$").',
      ),
    }),
    objectSchema({
      source: literal("pathPattern"),
      pathPattern: stringSchema().describe(
        'Regex pattern matched against the .path field of file and directory sources. Use in strictKnownMarketplaces to allow filesystem-based marketplaces alongside hostPattern restrictions for network sources. Use ".*" to allow all filesystem paths, or a narrower pattern (e.g., "^/opt/approved/") to restrict to specific directories.',
      ),
    }),
    objectSchema({
      source: literal("settings"),
      name: lenient
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
var MarketplaceSourceStrictSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dcmhvw5a.js:115001", () => {
  MarketplaceSourceStrictSchema = DoctorLazy(() => MarketplaceSourceSchema(false));
});
//@ chunk-dcmhvw5a.js:115023-115092 layout
/**
 * 返回去掉 headers/headersHelper、URL 用户名口令的市场来源副本；遇到 command 来源或无法安全清洗的 URL（带 query/hash、用户@ 形态）返回 null。
 */
function redactMarketplaceSource(source) {
  let state = {
    refused: false,
  };
  let redacted = redactMarketplaceSourceInto(source, state);
  return state.refused ? null : redacted;
}
//@ chunk-dcmhvw5a.js:115092-115807 layout
function redactMarketplaceSourceInto(source, state) {
  switch (source.source) {
    case "url": {
      let { headers, headersHelper, ...rest } = source;
      return {
        ...rest,
        url: redactSourceUrl(rest.url, state),
      };
    }
    case "git":
      return {
        ...source,
        url: redactSourceUrl(source.url, state),
      };
    case "npm":
      return source.registry === undefined
        ? source
        : {
            ...source,
            registry: redactSourceUrl(source.registry, state),
          };
    case "settings":
      return {
        ...source,
        plugins: source.plugins.map((plugin) => {
          let { headers, headersHelper, ...pluginEntry } = plugin;
          if (typeof pluginEntry.source === "object" && "url" in pluginEntry.source)
            return {
              ...pluginEntry,
              source: {
                ...pluginEntry.source,
                url: redactSourceUrl(pluginEntry.source.url, state),
              },
            };
          if (typeof pluginEntry.source === "object" && pluginEntry.source.source === "command") {
            state.refused = true;
            return pluginEntry;
          }
          if (typeof pluginEntry.source === "object" && pluginEntry.source.source === "npm") {
            let { registry } = pluginEntry.source;
            return {
              ...pluginEntry,
              source: {
                ...pluginEntry.source,
                package: redactSourceUrl(pluginEntry.source.package, state, true),
                ...(registry !== undefined && {
                  registry: redactSourceUrl(registry, state),
                }),
              },
            };
          }
          return pluginEntry;
        }),
      };
    default:
      return source;
  }
}
//@ chunk-dcmhvw5a.js:115807-116319 layout
function redactSourceUrl(spec, state, isPackage = false) {
  if (hasBackslashInUrlAuthority(spec)) return redactNonUrlSpec(spec, state, isPackage);
  let parsed;
  try {
    parsed = new URL(spec);
  } catch {
    return redactNonUrlSpec(spec, state, isPackage);
  }
  if (parsed.host === "") return redactNonUrlSpec(spec, state, isPackage);
  if (urlPathWasNormalized(spec, parsed)) {
    state.refused = true;
    return spec;
  }
  if (!HTTP_LIKE_PROTOCOLS.has(parsed.protocol)) {
    let index = spec.indexOf("#");
    let base = index === -1 ? spec : spec.slice(0, index);
    let fragment = index === -1 ? "" : spec.slice(index);
    if (base.includes("?") || !SAFE_FRAGMENT_RE.test(fragment)) {
      state.refused = true;
      return spec;
    }
    if (parsed.password === "") return spec;
    parsed.password = "";
    return parsed.toString();
  }
  if (parsed.search !== "" || parsed.hash !== "") {
    state.refused = true;
    return spec;
  }
  if (parsed.username === "" && parsed.password === "") return spec;
  parsed.username = "";
  parsed.password = "";
  return parsed.toString();
}
//@ chunk-dcmhvw5a.js:116319-116676 layout
function urlPathWasNormalized(url, parsed) {
  let replaced = url.replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, "").replace(/[\t\n\r]/g, "");
  let isWebScheme = WEB_URL_SCHEMES.has(parsed.protocol.slice(0, -1));
  let replaced_2 = replaced.slice(replaced.indexOf(":") + 1).replace(isWebScheme ? /^[/\\]+/ : /^\/\//, "");
  let authorityEnd = replaced_2.search(isWebScheme ? /[/\\?#]/ : /[/?#]/);
  let authorityPart = authorityEnd === -1 ? "" : replaced_2.slice(authorityEnd);
  let queryStart = authorityPart.search(/[?#]/);
  let pathPart = queryStart === -1 ? authorityPart : authorityPart.slice(0, queryStart);
  if (pathPart === "") return parsed.pathname !== "/" && parsed.pathname !== "";
  return pathPart !== parsed.pathname;
}
//@ chunk-dcmhvw5a.js:116676-116998 layout
function redactNonUrlSpec(spec, state, isPackage) {
  let replaced = spec.replace(/[\t\n\r]/g, "");
  if (replaced.includes("?")) {
    state.refused = true;
    return spec;
  }
  let isBarePackageRef =
    isPackage &&
    (/^@[^@:?#\\%]+$/.test(replaced) ||
      /^(?:npm:)?(?:@[^@:/\\?#%]+\/)?[^@:/\\?#%]+@[^@:/\\?#]*$/.test(replaced));
  if (replaced.includes("@") && !SCP_LIKE_GIT_URL_RE.test(replaced) && !isBarePackageRef)
    state.refused = true;
  let isHostedShorthand = isPackage && HOSTED_GIT_SHORTHAND_RE.test(replaced);
  if (replaced.includes("#") && !SCP_LIKE_GIT_URL_RE.test(replaced) && !isHostedShorthand)
    state.refused = true;
  return spec;
}
//@ chunk-dcmhvw5a.js:116998-117317 layout
var URL_FRAGMENT_CHAR_CLASS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SAFE_FRAGMENT_RE;
var SCP_LIKE_GIT_URL_RE;
var HOSTED_GIT_SHORTHAND_RE;
var HTTP_LIKE_PROTOCOLS;
deferInit("chunk-dcmhvw5a.js:116998", () => {
  URL_FRAGMENT_CHAR_CLASS = String.raw`[\w./+-]`;
  SAFE_FRAGMENT_RE = new RegExp(`^(?:#${URL_FRAGMENT_CHAR_CLASS}*)?$`);
  SCP_LIKE_GIT_URL_RE = new RegExp(
    String.raw`^(?:(?:git\+)?ssh:\/\/)?[^@:/\\?#%]+@[^@:/\\?#]+:[^@?#]*(?:#${URL_FRAGMENT_CHAR_CLASS}*)?$`,
  );
  HOSTED_GIT_SHORTHAND_RE = new RegExp(
    String.raw`^(?:(?:github|gitlab|bitbucket):)?[^@:/\\?#%]+(?:\/[^@:/\\?#%]+)+(?:#${URL_FRAGMENT_CHAR_CLASS}*)?$`,
  );
  HTTP_LIKE_PROTOCOLS = new Set(["http:", "https:", "git+http:", "git+https:"]);
});
//@ chunk-dcmhvw5a.js:117317-117658 layout
/**
 * npm tarball URL 去掉凭据、查询和片段；非 http(s) 返回 null。
 */
function redactNpmTarball(npmResolution) {
  if (hasBackslashInUrlAuthority(npmResolution.tarballUrl)) return null;
  let parsed;
  try {
    parsed = new URL(npmResolution.tarballUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username === "" && parsed.password === "" && parsed.search === "" && parsed.hash === "")
    return npmResolution;
  parsed.username = "";
  parsed.password = "";
  parsed.search = "";
  parsed.hash = "";
  return {
    packageName: npmResolution.packageName,
    tarballUrl: parsed.toString(),
  };
}
//@ chunk-dcmhvw5a.js:117658-117679 layout
var MarketplaceSourceLenientSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dcmhvw5a.js:117658", () => {
  MarketplaceSourceLenientSchema = DoctorLazy(() => MarketplaceSourceSchema(true));
});
//@ chunk-dcmhvw5a.js:117679-117705 layout
function getKnownMarketplaceSourceSchema() {
  return MarketplaceSourceLenientSchema();
}
//@ chunk-dcmhvw5a.js:117705-118445 fingerprint (2.1.88 match: gitSha, 0.34)
/**
 * 市场来源相关 schema：策略名单用的来源 schema（额外支持 pluginDirectory 哨兵）、已知市场来源 schema、40 位 git SHA schema、sha256 十六进制 schema，以及 archive URL 必须 https 且不得指向回环/链路本地/云元数据地址的错误文案。
 */
var MarketplacePolicySourceSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MarketplaceSourceSchemaLazy;
var gitSha;
var Sha256HexSchema;
var ARCHIVE_URL_ERROR;
deferInit("chunk-dcmhvw5a.js:117705", () => {
  MarketplacePolicySourceSchema = DoctorLazy(() => {
    let knownMarketplaceSourceSchema = getKnownMarketplaceSourceSchema();
    return discriminatedUnion("source", [
      objectSchema({
        source: literal("pluginDirectory"),
      }).describe(
        "@internal Policy-list sentinel for the built-in Directory marketplace. In strictKnownMarketplaces: allow it (by default any allowlist blocks it). In blockedMarketplaces: block it without otherwise restricting marketplaces. Only meaningful in those two managed-settings lists; it cannot be added or declared anywhere else.",
      ),
      ...knownMarketplaceSourceSchema.options,
    ]);
  });
  MarketplaceSourceSchemaLazy = DoctorLazy(() => getKnownMarketplaceSourceSchema());
  gitSha = DoctorLazy(() =>
    stringSchema()
      .length(40)
      .regex(/^[a-f0-9]{40}$/, "Must be a full 40-character lowercase git commit SHA"),
  );
  Sha256HexSchema = DoctorLazy(() =>
    stringSchema().regex(/^[0-9a-fA-F]{64}$/, "Must be a 64-character hex SHA-256 digest"),
  );
  ARCHIVE_URL_ERROR =
    "Archive URLs must use https:// and must not point at a loopback, link-local, or cloud-metadata host";
});
//@ chunk-dcmhvw5a.js:118445-118545 layout
/**
 * archive 来源 URL 是否安全：必须 https，且主机不是回环/链路本地/云元数据地址。
 */
function isSafeArchiveUrl(url) {
  try {
    let parsed = new URL(url);
    return parsed.protocol === "https:" && !isPrivateHost(parsed.hostname);
  } catch {
    return false;
  }
}
//@ chunk-dcmhvw5a.js:118545-125707 fingerprint (2.1.88 match: PluginSourceSchema, 0.467)
/**
 * 插件来源 schema：相对路径（相对市场根）、npm、url（git）、github、git-subdir（稀疏检出子目录）、archive（https zip + sha256）、command（本地命令打印插件目录，copy/link 模式）、unsupported（解析失败占位）。SettingsMarketplacePluginSchema 是 settings 内联市场的插件条目，只允许远程来源。
 */
var ArchivePluginSourceSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PluginSourceSchema;
var SettingsMarketplacePluginSchema;
deferInit("chunk-dcmhvw5a.js:118545", () => {
  ArchivePluginSourceSchema = DoctorLazy(() =>
    objectSchema({
      source: literal("archive"),
      url: stringSchema()
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
  PluginSourceSchema = DoctorLazy(() =>
    union([
      preprocess((source) => (source === "." ? "./" : source), RelativePath()).describe(
        "Path to the plugin root, relative to the marketplace root (the directory containing .claude-plugin/, not .claude-plugin/ itself)",
      ),
      objectSchema({
        source: literal("npm"),
        package: NpmPackageNameSchema()
          .or(
            stringSchema().refine(
              (ref) =>
                /^(?:file|https?|git(?:\+https?|\+ssh)?|ssh|github|gitlab|bitbucket):/i.test(ref) ||
                !ref.includes(".."),
              'Package reference cannot contain ".." path segments',
            ),
          )
          .describe(
            "Package name (or url, or local path, or anything else that can be passed to `npm` as a package)",
          ),
        version: stringSchema()
          .optional()
          .describe("Specific version or version range (e.g., ^1.0.0, ~2.1.0)"),
        registry: stringSchema()
          .url()
          .refine(isHttpUrl, "Registry must be an http(s) URL")
          .optional()
          .describe("Custom NPM registry URL (defaults to using system default, likely npmjs.org)"),
      }).describe("NPM package as plugin source"),
      objectSchema({
        source: literal("url"),
        url: stringSchema().describe("Full git repository URL (https:// or git@)"),
        ref: stringSchema()
          .optional()
          .describe(
            'Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.',
          ),
        sha: gitSha().optional().describe("Specific commit SHA to use"),
      }),
      objectSchema({
        source: literal("github"),
        repo: stringSchema().describe("GitHub repository in owner/repo format"),
        ref: stringSchema()
          .optional()
          .describe(
            'Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.',
          ),
        sha: gitSha().optional().describe("Specific commit SHA to use"),
      }),
      objectSchema({
        source: literal("git-subdir"),
        url: stringSchema().describe("Git repository: GitHub owner/repo shorthand, https://, or git@ URL"),
        path: stringSchema()
          .min(1)
          .describe(
            'Subdirectory within the repo containing the plugin (e.g., "tools/claude-plugin"). ' +
              "Checked out sparsely \u2014 over https or ssh as a partial clone (--filter=tree:0) \u2014 to minimize bandwidth for monorepos.",
          ),
        ref: stringSchema()
          .optional()
          .describe(
            'Git branch or tag to use (e.g., "main", "v1.0.0"). Defaults to repository default branch.',
          ),
        sha: gitSha().optional().describe("Specific commit SHA to use"),
      }).describe(
        "Plugin located in a subdirectory of a larger repository (monorepo). Only the specified subdirectory is materialized; the rest of the repo is not downloaded.",
      ),
      ArchivePluginSourceSchema(),
      objectSchema({
        source: literal("command"),
        command: stringSchema()
          .min(1)
          .max(MAX_CONSENT_COMMAND_LENGTH, {
            message: "command must not be longer than the install consent UI can display",
          })
          .refine((command) => !UNPRINTABLE_OR_WIDE_SPACE_RE.test(command), {
            message:
              "command must be printable ASCII (letters, digits, punctuation, single spaces) with no runs of 4 or more spaces",
          })
          .describe(
            "Shell command that prints the absolute path of the plugin directory on stdout (exactly one line) and exits 0. It must leave a complete plugin in that directory before exiting; the directory is copied into the plugin cache, so the printed path may change between runs (it is re-resolved on every install and update, and once per session in the background). Runs through the platform shell (sh on macOS/Linux, cmd.exe on Windows) from the user's home directory with Claude Code's subprocess environment.",
          ),
        timeout: numberSchema()
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
      objectSchema({
        source: literal("unsupported"),
        error: stringSchema().optional(),
      }).describe(
        "Placeholder for source types this Claude Code version does not recognize, or a known type whose fields failed validation (then `error` " +
          "holds the reason). Never authored by hand \u2014 PluginMarketplaceSchema rewrites " +
          "unparseable sources to this so the entry remains in marketplace.plugins (detectDelistedPlugins must not see it as removed). Install attempts fail at cachePlugin with an actionable message.",
      ),
    ]),
  );
  SettingsMarketplacePluginSchema = DoctorLazy(() =>
    objectSchema({
      name: PluginNameSchema().describe("Plugin name as it appears in the target repository"),
      source: PluginSourceSchema().describe(
        "Where to fetch the plugin from. Must be a remote source \u2014 relative " +
          "paths have no marketplace repository to resolve against. Under allowManagedPermissionRulesOnly, a settings marketplace keeps its plugins' allowed-tools only when every npm entry here pins a `registry` on a bare package name; unpinned, the package resolves through the member's own npm config, and a non-bare spelling (an `npm:` alias, a `name@range`, a URL or git spec) packs as an " +
          "exotic spec the pin does not bind \u2014 either way the marketplace " +
          "vouches no tool grants.",
      ),
      description: stringSchema().optional(),
      version: stringSchema().optional(),
      strict: booleanSchema().optional(),
      headers: record(stringSchema(), stringSchema())
        .optional()
        .describe("HTTP headers sent when downloading this entry's `archive` source."),
      headersHelper: HeadersHelperCommandSchema()
        .optional()
        .describe(
          "Command that prints a JSON object of HTTP headers for downloading this entry's `archive` source. Runs only when a user explicitly installs or updates this plugin. Unlike a catalog entry, an entry written here does not need `strict: false`: it is declared in a settings file, which has no manifest fields to inline. A declaration in project settings is not operator-authored, so request-routing and client-identity header names are still filtered there. Use an absolute path.",
        ),
    })
      .refine((entry) => typeof entry.source !== "string", {
        message:
          'Plugins in a settings-sourced marketplace must use remote sources (github, git-subdir, npm, url, archive, command). Relative-path sources like "./foo" have no marketplace repository to resolve against.',
      })
      .refine((entry) => typeof entry.source === "string" || entry.source.source !== "unsupported", {
        message:
          "source.source: 'unsupported' is a parse-time placeholder and cannot be authored. Use a remote source (github, git-subdir, npm, url, archive, command).",
      }),
  );
});
//@ chunk-dcmhvw5a.js:125707-125770 placement
/**
 * 是否以 ./ 开头的相对来源。
 */
function isRelativeSourcePath(source) {
  return typeof source === "string" && source.startsWith("./");
}
//@ chunk-dcmhvw5a.js:125834-129217 fingerprint (2.1.88 match: PluginMarketplaceEntrySchema, 0.392)
/**
 * marketplace.json 中一个插件条目：manifest 字段全部可选 + name/source/headers/headersHelper/category/tags/strict（默认 true）/relevance（topic + signals：cli、hosts、filesRead、manifestDeps、cwd，用于“Working with X?”提示与推荐）。
 */
var PluginRelevanceSignalsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PluginRelevanceSchema;
var PluginMarketplaceEntrySchema;
var PluginEntryNameOnlySchema;
deferInit("chunk-dcmhvw5a.js:125834", () => {
  PluginRelevanceSignalsSchema = DoctorLazy(() =>
    objectSchema({
      cli: array(stringSchema().max(64))
        .max(10)
        .optional()
        .describe(
          'First command tokens (e.g. ["stripe"]) \u2014 exact match against commands run this session.',
        ),
      hosts: array(stringSchema().max(128))
        .max(20)
        .optional()
        .describe(
          'Hostnames (e.g. ["api.stripe.com"]) \u2014 exact, case-insensitive match against ' +
            "hostnames seen in https?:// URLs in bash commands run this session. Bare hostname only: lowercase, no scheme, no port, no path.",
        ),
      filesRead: array(stringSchema().max(256))
        .max(10)
        .optional()
        .describe(
          'Glob patterns (e.g. ["**/*.tf"]) \u2014 the plugin is relevant when a file Claude has read ' +
            "this session matches any pattern. Matched against read-file paths, forward-slash normalized, case-insensitive.",
        ),
      manifestDeps: array(
        objectSchema({
          file: stringSchema().max(256),
          pattern: stringSchema().max(256),
        }),
      )
        .max(10)
        .optional()
        .describe(
          "Dependency declared in a package manifest. Each {file, pattern} is a pair of RegExp sources: " +
            "`file` matches the manifest filename (package.json, go.mod, requirements.txt, \u2026); " +
            "`pattern` matches the dependency declaration inside that file. Evaluated against files read this session.",
        ),
      cwd: array(stringSchema().max(256))
        .max(10)
        .optional()
        .describe(
          'Glob patterns (e.g. ["Engine/Source/Runtime/Renderer/**"]) \u2014 the plugin is relevant when the ' +
            `session's working directory is at or under a directory matching the pattern. Matched against the cwd both relative to the enclosing git repo root and as an absolute path, forward-slash normalized, case-insensitive. A bare directory (no glob characters) means "cwd is at or under this directory". Known at session start, so this signal can surface a suggestion before the first turn.`,
        ),
    }),
  );
  PluginRelevanceSchema = DoctorLazy(() =>
    objectSchema({
      topic: stringSchema()
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
  PluginMarketplaceEntrySchema = DoctorLazy(() =>
    PluginManifestSchema()
      .partial()
      .extend({
        name: PluginNameSchema().describe("Unique identifier matching the plugin name"),
        source: PluginSourceSchema().describe("Where to fetch the plugin from"),
        headers: record(stringSchema(), stringSchema())
          .optional()
          .describe("Custom HTTP headers for fetching this plugin's archive; overrides the marketplace's"),
        headersHelper: HeadersHelperCommandSchema()
          .optional()
          .describe(
            "Command that prints a JSON object of HTTP headers for fetching this plugin's archive (e.g. a short-lived auth token); overrides this entry's `headers` and the marketplace's. Runs only when the user installs or updates this plugin, never during catalog browse. An entry that sets it must be `strict: false` with its manifest inlined here, so consent is informed from the entry alone before the command runs.",
          ),
        category: stringSchema()
          .optional()
          .describe('Category for organizing plugins (e.g., "productivity", "development")'),
        tags: array(stringSchema()).optional().describe("Tags for searchability and discovery"),
        strict: booleanSchema()
          .optional()
          .default(true)
          .describe(
            "Require the plugin manifest to be present in the plugin folder. If false, the marketplace entry provides the manifest.",
          ),
        relevance: preprocess(
          (value) => (isPlainObject_2(value) ? value : undefined),
          PluginRelevanceSchema().optional(),
        ).describe(
          `Declares when this plugin is relevant to the user's work. Consumed by the spinner tip ("Working with {topic}?"), session-start auto-suggest, and marketplace browse ranking.`,
        ),
      }),
  );
  PluginEntryNameOnlySchema = DoctorLazy(() =>
    objectSchema({
      name: PluginNameSchema(),
    }),
  );
});
//@ chunk-dcmhvw5a.js:129217-129907 layout
/**
 * 逐条解析 marketplace.plugins：成功的保留；有名字但失败的改写成 source:{source:"unsupported",error} 占位（避免被当成下架）；连名字都没有的丢弃并记 warn 日志。
 */
function parseMarketplacePluginEntries(entries) {
  let schema = PluginMarketplaceEntrySchema();
  return entries.flatMap((raw, index) => {
    let result = schema.safeParse(raw);
    if (result.success) {
      let source = result.data.source;
      if (typeof source === "object" && source.source === "unsupported" && source.error !== undefined)
        return [
          {
            ...result.data,
            source: {
              source: "unsupported",
            },
          },
        ];
      return [result.data];
    }
    let name = PluginEntryNameOnlySchema().safeParse(raw).data?.name;
    let joined = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
    if (name) {
      logForDebugging(`Stubbing unparseable marketplace plugin entry (${name}): ${joined}`, {
        level: "warn",
      });
      let reason = isBareSourceName(isPlainObject_2(raw) ? raw.source : undefined)
        ? BARE_SOURCE_WITHOUT_PLUGIN_ROOT_ERROR
        : hasUnknownSourceType(raw)
          ? undefined
          : (describeSourceUnionError(result.error.issues) ?? formatZodIssuesBrief(result.error.issues));
      return [
        {
          name,
          source: {
            source: "unsupported",
            ...(reason && {
              error: reason,
            }),
          },
          strict: true,
        },
      ];
    }
    logForDebugging(`Dropping unparseable marketplace plugin entry (index ${index}): ${joined}`, {
      level: "warn",
    });
    return [];
  });
}
//@ chunk-dcmhvw5a.js:129907-129993 layout
var KNOWN_REMOTE_PLUGIN_SOURCE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:129907", () => {
  KNOWN_REMOTE_PLUGIN_SOURCE_TYPES = new Set([
    "npm",
    "url",
    "github",
    "git-subdir",
    "archive",
    "command",
    "unsupported",
  ]);
});
//@ chunk-dcmhvw5a.js:129993-130149 layout
/**
 * 条目的 source.source 是否为本版本不认识的类型。
 */
function hasUnknownSourceType(entry) {
  if (!entry || typeof entry !== "object") return false;
  let source = entry.source;
  if (!source || typeof source !== "object") return false;
  let source_2 = source.source;
  return typeof source_2 === "string" && !KNOWN_REMOTE_PLUGIN_SOURCE_TYPES.has(source_2);
}
//@ chunk-dcmhvw5a.js:130149-130453 layout
function describeSourceUnionError(issues) {
  let found = issues.find((issue) => issue.path.length === 1 && issue.path[0] === "source");
  if (!found || found.code !== "invalid_union") return;
  let found_2 = found.errors.find(
    (error) =>
      !error.some(
        (error) => error.path.length === 0 || (error.code === "invalid_value" && error.path[0] === "source"),
      ),
  );
  if (!found_2 || found_2.length === 0) return;
  return formatZodIssuesBrief(
    found_2.map((error) => ({
      ...error,
      path: ["source", ...error.path],
    })),
  );
}
//@ chunk-dcmhvw5a.js:130453-130486 layout
var SAFE_ISSUE_KEY_RE = /^[A-Za-z0-9_$.-]{1,40}$/;
//@ chunk-dcmhvw5a.js:130486-130529 layout
/**
 * issue 路径键安全化（不合规显示 <key>）。
 */
function redactIssuePathKey(key) {
  return SAFE_ISSUE_KEY_RE.test(key) ? key : "<key>";
}
//@ chunk-dcmhvw5a.js:130529-130545 layout
var MAX_REPORTED_ISSUES = 3;
var MAX_ISSUE_MESSAGE_LENGTH = 160;
//@ chunk-dcmhvw5a.js:130545-130873 layout
/**
 * 把 zod issues 压成一行简短错误（最多 3 条，每条截断 160 字符，键名不安全时显示 <key>）。
 */
function formatZodIssuesBrief(issues) {
  let mapped = issues.slice(0, MAX_REPORTED_ISSUES).map((issue) => {
    let joined = issue.path
      .map(String)
      .map((segment) => redactIssuePathKey(segment))
      .join(".");
    let text =
      issue.code === "unrecognized_keys"
        ? `Unrecognized ${issue.keys.length === 1 ? "field" : "fields"}: ${issue.keys.map(redactIssuePathKey).join(", ")}`
        : printableName(issue.message, MAX_ISSUE_MESSAGE_LENGTH);
    return joined ? `${joined}: ${text}` : text;
  });
  let remaining = issues.length - mapped.length;
  return remaining > 0 ? `${mapped.join(", ")} (+${remaining} more)` : mapped.join(", ");
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
  if (replaced.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) return;
  return replaced;
}
//@ chunk-dcmhvw5a.js:131462-131599 layout
/**
 * 把裸来源名改写到 pluginRoot 下（./<root>/<name>）。
 */
function resolveBareSourceUnderPluginRoot(entry, pluginRoot) {
  if (pluginRoot === undefined || !isPlainObject_2(entry) || !isBareSourceName(entry.source)) return entry;
  let source = pluginRoot === "." ? `./${entry.source}` : `./${pluginRoot}/${entry.source}`;
  return {
    ...entry,
    source,
  };
}
//@ chunk-dcmhvw5a.js:131599-131787 layout
/**
 * 预处理 marketplace.json：metadata.pluginRoot 合法时把裸名来源（"formatter"）改写成 ./<pluginRoot>/formatter。
 */
function applyMarketplacePluginRoot(marketplace) {
  if (!isPlainObject_2(marketplace) || !Array.isArray(marketplace.plugins)) return marketplace;
  let pluginRoot = isPlainObject_2(marketplace.metadata)
    ? normalizePluginRoot(marketplace.metadata.pluginRoot)
    : undefined;
  if (pluginRoot === undefined) return marketplace;
  return {
    ...marketplace,
    plugins: marketplace.plugins.map((plugin) => resolveBareSourceUnderPluginRoot(plugin, pluginRoot)),
  };
}
//@ chunk-dcmhvw5a.js:131787-133304 fingerprint (2.1.88 match: PluginMarketplaceSchema, 0.71)
/**
 * marketplace.json schema：name、version、description、owner、plugins（逐条宽容解析）、forceRemoveDeletedPlugins、metadata.pluginRoot、allowCrossMarketplaceDependenciesOn、renames（旧名→新名/null）。
 */
var PluginMarketplaceSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PluginMarketplaceFileSchema;
deferInit("chunk-dcmhvw5a.js:131787", () => {
  PluginMarketplaceSchema = DoctorLazy(() =>
    objectSchema({
      $schema: stringSchema()
        .optional()
        .describe("JSON Schema reference for editor autocomplete/validation; ignored at load time"),
      name: MarketplaceNameStrictSchema(isImpersonatingOfficialName),
      version: stringSchema().optional().describe("Marketplace manifest version"),
      description: stringSchema().optional().describe("Human-readable description of this marketplace"),
      owner: PluginAuthorSchema().describe("Marketplace maintainer or curator information"),
      plugins: array(unknown())
        .transform(parseMarketplacePluginEntries)
        .describe("Collection of available plugins in this marketplace"),
      forceRemoveDeletedPlugins: booleanSchema()
        .optional()
        .describe(
          "When true, plugins removed from this marketplace will be automatically uninstalled and flagged for users",
        ),
      metadata: objectSchema({
        pluginRoot: stringSchema()
          .optional()
          .describe(
            'Base directory for bare plugin source names, relative to the marketplace root (e.g. "./plugins" resolves "source": "formatter" as ./plugins/formatter). Sources that already start with "./" are unaffected.',
          ),
        version: stringSchema().optional().describe("Marketplace version"),
        description: stringSchema().optional().describe("Marketplace description"),
      })
        .optional()
        .describe("Optional marketplace metadata"),
      allowCrossMarketplaceDependenciesOn: array(stringSchema())
        .optional()
        .describe(
          "Marketplace names whose plugins may be auto-installed as dependencies. Only the root marketplace's allowlist applies \u2014 no transitive trust.",
        ),
      renames: record(stringSchema(), stringSchema().nullable())
        .optional()
        .catch(undefined)
        .describe(
          "Append-only map of old plugin name \u2192 current name (or null when removed). The loader follows this on plugin-not-found and migrates user settings to the new name.",
        ),
    }),
  );
  PluginMarketplaceFileSchema = DoctorLazy(() =>
    preprocess(applyMarketplacePluginRoot, PluginMarketplaceSchema()),
  );
});
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
function getMarketplaceNameSchemaFor(existingName) {
  if (existingName !== undefined && isLookalikeButNotBlockedName(existingName)) {
    let lower = existingName.toLowerCase();
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
function getPluginMarketplaceSchemaFor(existingName) {
  if (existingName !== undefined && isLookalikeButNotBlockedName(existingName))
    return preprocess(
      applyMarketplacePluginRoot,
      PluginMarketplaceSchema().extend({
        name: getMarketplaceNameSchemaFor(existingName),
      }),
    );
  return PluginMarketplaceFileSchema();
}
//@ chunk-dcmhvw5a.js:133570-133631 layout
var PLUGIN_ID_SEGMENT_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PLUGIN_ID_SEGMENT_RE;
deferInit("chunk-dcmhvw5a.js:133570", () => {
  PLUGIN_ID_SEGMENT_PATTERN = "[A-Za-z0-9][-A-Za-z0-9._]*";
  PLUGIN_ID_SEGMENT_RE = new RegExp(`^${PLUGIN_ID_SEGMENT_PATTERN}$`);
});
//@ chunk-dcmhvw5a.js:133631-133664 layout
/**
 * 插件 ID 片段（名字或市场名）是否合法：字母数字开头，后接 -._ 与字母数字。
 */
function isValidPluginIdSegment(segment) {
  return PLUGIN_ID_SEGMENT_RE.test(segment);
}
//@ chunk-dcmhvw5a.js:133664-133711 layout
var PLUGIN_ID_RE; // deferred: uses RelativePath of its import cycle while loading; runs once the cycle is complete
var NPM_MARKETPLACE_SUFFIX;
deferInit("chunk-dcmhvw5a.js:133664", () => {
  PLUGIN_ID_RE = new RegExp(`^${PLUGIN_ID_SEGMENT_PATTERN}@${PLUGIN_ID_SEGMENT_PATTERN}$`);
  NPM_MARKETPLACE_SUFFIX = `@${pluginManifestPathSchemas}`;
});
//@ chunk-dcmhvw5a.js:133711-133777 layout
/**
 * 是否为 <npm包名>@npm 形式的插件 ID。
 */
function isNpmPluginId(pluginId) {
  return (
    pluginId.endsWith(NPM_MARKETPLACE_SUFFIX) &&
    isValidNpmPackageName(pluginId.slice(0, -NPM_MARKETPLACE_SUFFIX.length))
  );
}
//@ chunk-dcmhvw5a.js:133777-136457 fingerprint (2.1.88 match: PluginInstallationEntrySchema, 0.508)
/**
 * 插件 ID（name@marketplace 或 <package>@npm）、依赖引用（名字[@市场][@^版本]或 {name,marketplace}）以及 installed_plugins.json 的 V1/V2 schema；V2 每个插件 ID 对应一组安装条目（scope、projectPath、installPath、version、gitCommitSha、auto…）。
 */
var PluginIdSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PLUGIN_NAME_FORBIDDEN_CHARS_RE;
var INVISIBLE_CHARS_RE;
var CONTROL_OR_BIDI_CHARS_RE;
var DEP_REF_REGEX;
var DependencyRefSchema;
var InstalledPluginSchema;
var InstalledPluginsFileSchemaV1;
var PluginScopeSchema;
var PluginInstallationEntrySchema;
var InstalledPluginsFileSchemaV2;
var InstalledPluginsFileShapeV2;
deferInit("chunk-dcmhvw5a.js:133777", () => {
  PluginIdSchema = DoctorLazy(() =>
    stringSchema().refine(
      (pluginId) => PLUGIN_ID_RE.test(pluginId) || isNpmPluginId(pluginId),
      "Plugin ID must be in format: plugin@marketplace",
    ),
  );
  PLUGIN_NAME_FORBIDDEN_CHARS_RE = new RegExp(`[@:\\s/\\\\${INVISIBLE_CHAR_CLASS_SOURCE}]`, "u");
  INVISIBLE_CHARS_RE = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}]`, "u");
  CONTROL_OR_BIDI_CHARS_RE = /[\p{Cc}\u200E\u200F\u202A-\u202E\u2066-\u2069]/u;
  DEP_REF_REGEX = /^[A-Za-z0-9][-A-Za-z0-9._]*(@[A-Za-z0-9][-A-Za-z0-9._]*)?(@\^[^@]*)?$/;
  DependencyRefSchema = DoctorLazy(() =>
    union([
      stringSchema()
        .regex(DEP_REF_REGEX, "Dependency must be a plugin name, optionally qualified with @marketplace")
        .transform((ref) => ref.replace(/@\^[^@]*$/, "")),
      objectSchema({
        name: stringSchema()
          .min(1)
          .regex(/^[A-Za-z0-9][-A-Za-z0-9._]*$/),
        marketplace: stringSchema()
          .min(1)
          .regex(/^[A-Za-z0-9][-A-Za-z0-9._]*$/)
          .optional(),
      })
        .loose()
        .transform((obj) => (obj.marketplace ? `${obj.name}@${obj.marketplace}` : obj.name)),
    ]),
  );
  InstalledPluginSchema = DoctorLazy(() =>
    objectSchema({
      version: stringSchema().describe("Currently installed version"),
      installedAt: stringSchema().describe("ISO 8601 timestamp of installation"),
      lastUpdated: stringSchema().optional().describe("ISO 8601 timestamp of last update"),
      installPath: stringSchema().describe("Absolute path to the installed plugin directory"),
      gitCommitSha: stringSchema()
        .optional()
        .describe("Git commit SHA for git-based plugins (for version tracking)"),
      resolvedVersion: stringSchema()
        .optional()
        .describe(
          "Tag-derived semver this install resolved to (when fetched via a version constraint). Used by verifyAndDemote in preference to manifest.version, since the upstream may have forgotten to bump plugin.json.",
        ),
      auto: booleanSchema()
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
  InstalledPluginsFileSchemaV1 = DoctorLazy(() =>
    objectSchema({
      version: literal(1).describe("Schema version 1"),
      plugins: record(PluginIdSchema(), InstalledPluginSchema()).describe(
        "Map of plugin IDs to their installation metadata",
      ),
    }),
  );
  PluginScopeSchema = DoctorLazy(() => _enum(["managed", "user", "project", "local"]));
  PluginInstallationEntrySchema = DoctorLazy(() =>
    objectSchema({
      scope: PluginScopeSchema().describe("Installation scope"),
      projectPath: stringSchema().optional().describe("Project path (required for project/local scopes)"),
      installPath: stringSchema().describe("Absolute path to the versioned plugin directory"),
      version: stringSchema().optional().describe("Currently installed version"),
      installedAt: stringSchema().optional().describe("ISO 8601 timestamp of installation"),
      lastUpdated: stringSchema().optional().describe("ISO 8601 timestamp of last update"),
      gitCommitSha: stringSchema().optional().describe("Git commit SHA for git-based plugins"),
      resolvedVersion: stringSchema().optional().describe("Tag-derived semver this install resolved to"),
      auto: booleanSchema()
        .optional()
        .describe("True when pulled in as a dependency. Eligible for orphan sweep."),
      ...claudeaiInstallFields(),
      ...directoryInstallFields(),
      ...commandSourceInstallFields(),
      ...npmInstallFields(),
    }),
  );
  InstalledPluginsFileSchemaV2 = DoctorLazy(() =>
    objectSchema({
      version: literal(2).describe("Schema version 2"),
      plugins: record(PluginIdSchema(), array(PluginInstallationEntrySchema())).describe(
        "Map of plugin IDs to arrays of installation entries",
      ),
    }),
  );
  InstalledPluginsFileShapeV2 = DoctorLazy(() =>
    objectSchema({
      version: literal(2),
      plugins: record(stringSchema(), unknown()),
    }),
  );
});
//@ chunk-dcmhvw5a.js:136457-136838 layout
/**
 * 宽容解析 installed_plugins.json V2：ID 非法的放进 setAside、条目非法的放进 keptRaw（原样保留回写），返回合法部分与第一个错误。
 */
function parseInstalledPluginsV2Leniently(file) {
  InstalledPluginsFileShapeV2().parse(file);
  let valid = {};
  let setAside = Object.create(null);
  let keptRaw = Object.create(null);
  let firstError;
  let firstUnparseableError;
  let plugins = file.plugins;
  for (let [key, value] of Object.entries(plugins)) {
    let idResult = PluginIdSchema().safeParse(key);
    if (!idResult.success) {
      setAside[key] = value;
      firstError ??= idResult.error;
      continue;
    }
    let parseResult = array(PluginInstallationEntrySchema()).safeParse(value);
    if (parseResult.success) valid[key] = parseResult.data;
    else {
      keptRaw[key] = value;
      firstError ??= parseResult.error;
      firstUnparseableError ??= parseResult.error;
    }
  }
  return {
    file: {
      version: 2,
      plugins: valid,
    },
    setAside,
    keptRaw,
    firstError,
    firstUnparseableError,
  };
}
//@ chunk-dcmhvw5a.js:136838-137274 fingerprint (2.1.88 match: KnownMarketplaceSchema, 0.763)
/**
 * known_marketplaces.json：市场名 → {source, installLocation, lastUpdated, autoUpdate}。claude.ai 同步的市场名以 claudeai- 开头（org/default/account）。
 */
var KnownMarketplaceSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var KnownMarketplacesFileSchema;
var CLAUDEAI_MARKETPLACE_PREFIX;
var CLAUDEAI_MARKETPLACE_KINDS;
deferInit("chunk-dcmhvw5a.js:136838", () => {
  KnownMarketplaceSchema = DoctorLazy(() =>
    objectSchema({
      source: MarketplaceSourceLenientSchema().describe("Where to fetch the marketplace from"),
      installLocation: stringSchema().describe("Local cache path where marketplace manifest is stored"),
      lastUpdated: stringSchema().describe("ISO 8601 timestamp of last marketplace refresh"),
      autoUpdate: booleanSchema()
        .optional()
        .describe("Whether to automatically update this marketplace and its installed plugins on startup"),
    }),
  );
  KnownMarketplacesFileSchema = DoctorLazy(() => record(stringSchema(), KnownMarketplaceSchema()));
  CLAUDEAI_MARKETPLACE_PREFIX = "claudeai-";
  CLAUDEAI_MARKETPLACE_KINDS = ["org", "default", "account"];
});
//@ chunk-yf5m6p65.js:4323-4363 fingerprint (2.1.88 match: PluginManifestOutputStylesSchema, 0.375)
/**
 * 清掉全局缓存的输出样式（名字配错）。
 */
function clearCachedOutputStyles() {
  getPluginRegistry().outputStyles = undefined;
}
//@ chunk-bfnfj4kx.js:4629-4766 fingerprint (2.1.88 match: PluginManifestSchema, 0.355)
function PluginManifestSchema_2(cell, prior) {
  if (cell.shape === undefined) return prior === undefined ? cell.initial : prior;
  let current = prior;
  return current?.shape === cell.shape && current.value !== undefined ? current.value : cell.initial;
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
