/**
 * utils/plugins/validate/validatePluginDirectory.ts
 *
 * 2.1.316 新增：插件目录校验入口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5aas12zq.js (14)
 * attribution: placement 14
 */
import * as pathModule from "path";
import { readdir } from "fs/promises";
import { HOOK_EVENTS } from "../../../entrypoints/sdk/coreSchemas.js";
import {
  readPluginFileSafe,
  preferPwdSpelling,
  locateGitRepository,
  makeFinding,
  appendAll,
  checkNonAsciiName,
  isSkillsOnlyFolder,
  quoteForDisplay,
  checkDerivedName,
  trimmedStringField,
  extractToolInputForTelemetry,
  dedupeFindings,
  compareSeverity,
} from "./helpers.js";
import { ONE_MIB } from "../schemas.js";
import { detectJsonEncodingProblem, checkComponentFiles } from "./componentFiles.js";
import { jsonParse } from "../../slowOperations.js";
import { stripBom } from "../../json.js";
import { isPlainObject } from "../../isPlainObject.js";
import { readFirstDoc, describeLinkedReadme } from "./directoryName.js";
import {
  findFileCaseInsensitive,
  checkReadmeRenderable,
  checkPluginIcon,
  checkListingUrls,
  checkScreenshotUrls,
} from "./readmeAndListing.js";
import { copyDir_2 } from "../pluginLoader.js";
import { plural } from "../../stringUtils.js";
import { findOsMetadataFiles } from "./archiveChecks.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { checkUnreachableRules } from "../../doctorContextWarnings.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-5aas12zq.js:1524-6260 placement
/**
 * 插件目录校验的常量组（38 个绑定）：Pe 是问题码表（码 → title/severity/hold/fix，g() 以 Pe[code] 取值）；R 是清单相对路径 .claude-plugin/plugin.json；ae/nn 是 README 候选名与根级子集；tn LICENSE 候选；rn 图标候选；ee 是 README 最少词数 40；sn/ge 是插件名 kebab-case 与图标格式错误的说明文案；ne README 字节上限 262144；me 图标体积上限 2097152；ye/Se/Ee/we/Ae/on/ie 分别是列表嵌套、缩进列数、分隔符段数、分隔符字符数、方括号数、截图条数、系统文件展示条数的上限；an/ln/dn/X/ke/$e/j/K/Y/un/cn 是系统文件集合、目录名、说明文案、扫描条数/深度/父目录层数、路径截断长度、MCP+hooks 文件数 16、逐条列出的路径数 20、hooks 事件名集合、列名前几条 3；xe/fn/hn/pn/gn/mn/yn/Sn/En/wn/An 是列表空白字符与各类识别正则。
 */
var PLUGIN_VALIDATION_ISSUES; // deferred: uses HOOK_EVENTS (../../../entrypoints/sdk/coreSchemas.js) of its import cycle while loading; runs once the cycle is complete
var PLUGIN_MANIFEST_PATH;
var manifestRelativePath;
var ROOT_MANIFEST_PATHS;
var README_CANDIDATES;
var README_ROOT_CANDIDATES;
var LICENSE_CANDIDATES;
var ICON_CANDIDATES;
var ICON_INVALID_MESSAGE;
var MAX_README_BYTES;
var MAX_ICON_BYTES;
var MAX_LIST_NESTING;
var MAX_INDENT_COLUMNS;
var MAX_DELIMITER_RUNS;
var MAX_DELIMITER_CHARS;
var MAX_BRACKET_CELLS;
var MAX_SCREENSHOTS;
var MAX_LISTED_SYSTEM_FILES;
var SYSTEM_FILE_NAMES;
var MACOSX_METADATA_DIR;
var SYSTEM_FILES_FOUND_NOTE;
var MAX_SCAN_ENTRIES;
var MAX_SCAN_DEPTH;
var MAX_REPO_ROOT_PARENTS;
var MAX_PATH_DISPLAY_CHARS;
var MAX_LISTED_MODULE_FILES;
var MAX_LISTED_TRAVERSALS;
var HOOK_EVENT_NAMES;
var MAX_LISTED_NAMES;
var LISTING_WHITESPACE_CHARS;
var LISTING_WHITESPACE_RE;
var URL_PATTERN;
var URL_PATTERN_GLOBAL;
var PRIVACY_WORD_RE;
var SUPPORT_WORD_RE;
var TERMS_WORD_RE;
var DOCS_WORD_RE;
var UNSAFE_SVG_ELEMENT_RE;
var SVG_EVENT_HANDLER_RE;
var SVG_EXTERNAL_REF_RE;
deferInit("chunk-5aas12zq.js:1524", () => {
  PLUGIN_VALIDATION_ISSUES = {
    README_MISSING: {
      title: "README missing",
      severity: "error",
      hold: false,
      fix: "Add a README.md to the plugin folder describing what the plugin does, how to use it, and any setup it needs, in at least 40 words. A README at the repository root also counts for a plugin in a sub-folder.",
    },
    README_TRIVIAL: {
      title: "README too short or couldn\u2019t be read",
      severity: "error",
      hold: false,
      fix: null,
    },
    README_NOT_RENDERED: {
      title: "README not shown in the listing preview",
      severity: "warning",
      hold: false,
      fix: null,
    },
    LICENSE_MISSING: {
      title: "License missing",
      severity: "error",
      hold: false,
      fix: "Add a LICENSE file to the plugin folder, or set `license` (an SPDX id) in plugin.json. A LICENSE at the repository root also counts for a plugin in a sub-folder.",
    },
    ICON_MISSING: {
      title: "No icon",
      severity: "warning",
      hold: false,
      fix: "Add a square PNG to the plugin folder at .claude-plugin/icon.png, or set `icon` in plugin.json to the path of a square PNG or JPEG in the plugin: 512 to 2048 px on each side, under 2 MB. SVG and WebP are not accepted. That file may become the listing icon only once: the first time the plugin is saved or submitted in the developer portal. Adding or changing it later does not change the icon.",
    },
    ICON_INVALID: {
      title: "Icon can\u2019t be used",
      severity: "warning",
      hold: false,
      fix: null,
    },
    PRIVACY_URL_MISSING: {
      title: "No privacy policy URL",
      severity: "warning",
      hold: false,
      fix: "Set `privacyPolicyUrl` in plugin.json.",
    },
    LISTING_URL_SCHEME: {
      title: "Listing link or icon path not accepted",
      severity: "warning",
      hold: false,
      fix: null,
    },
    PATH_TRAVERSAL: {
      title: "Path climbs out of the plugin",
      severity: "error",
      hold: false,
      fix: "Reference the file by its plain plugin-relative path (./servers.json).",
    },
    MANIFEST_NOT_FOUND: {
      title: null,
      severity: "info",
      hold: false,
      fix: "Add .claude-plugin/plugin.json to choose the plugin's name, description and version yourself.",
    },
    MANIFEST_NAME_FORMAT: {
      title: null,
      severity: "error",
      hold: false,
      fix: 'Add .claude-plugin/plugin.json with a valid "name", or rename the folder.',
    },
    MANIFEST_NAME_NOT_KEBAB: {
      title: null,
      severity: "warning",
      hold: false,
      fix: 'Add .claude-plugin/plugin.json with a kebab-case "name", or rename the folder.',
    },
    IDENTIFIER_NON_ASCII: {
      title: null,
      severity: "error",
      hold: false,
      fix: null,
    },
    MCP_FILE_UNREAD: {
      title: null,
      severity: "error",
      hold: false,
      fix: null,
    },
    HOOKS_FILE_UNREAD: {
      title: null,
      severity: "error",
      hold: false,
      fix: null,
    },
    MCPJSON_UNPARSEABLE: {
      title: null,
      severity: "error",
      hold: false,
      fix: null,
    },
    MANIFEST_INVALID_JSON: {
      title: null,
      severity: "error",
      hold: false,
      fix: null,
    },
    HOOKS_JSON_INVALID: {
      title: null,
      severity: "error",
      hold: false,
      fix: null,
    },
    HOOKS_MISSING_WRAPPER: {
      title: null,
      severity: "error",
      hold: false,
      fix: null,
    },
    HOOKS_SCHEMA_INVALID: {
      title: null,
      severity: "error",
      hold: false,
      fix: null,
    },
    ARCHIVE_OS_METADATA_FILE: {
      title: "macOS or Windows system file in the plugin",
      severity: "warning",
      hold: false,
      fix: null,
    },
  };
  PLUGIN_MANIFEST_PATH = ".claude-plugin/plugin.json";
  manifestRelativePath = [
    "README.md",
    "readme.md",
    "Readme.md",
    "README.markdown",
    "README",
    "README.txt",
    "docs/README.md",
  ];
  ROOT_MANIFEST_PATHS = manifestRelativePath.filter((path) => !path.includes("/")).toSorted();
  README_CANDIDATES = [
    "LICENSE",
    "LICENSE.md",
    "LICENSE.txt",
    "LICENCE",
    "LICENCE.md",
    "COPYING",
    "COPYING.md",
    "LICENSE-MIT",
    "LICENSE-APACHE",
  ];
  README_ROOT_CANDIDATES = [
    ".claude-plugin/icon.svg",
    ".claude-plugin/icon.png",
    "icon.svg",
    "icon.png",
    "assets/icon.svg",
    "assets/icon.png",
    "assets/logo.svg",
    "assets/logo.png",
    "images/icon.png",
    "images/icon.svg",
  ];
  LICENSE_CANDIDATES = 40;
  ICON_CANDIDATES = 'Plugin name cannot contain spaces. Use kebab-case (e.g., "my-plugin")';
  ICON_INVALID_MESSAGE =
    "Icon file is not a usable SVG/PNG (unrecognised format, or an SVG with script, event handlers, foreignObject, animation, style or non-fragment references).";
  MAX_README_BYTES = 262144;
  MAX_ICON_BYTES = 2097152;
  MAX_LIST_NESTING = 32;
  MAX_INDENT_COLUMNS = 128;
  MAX_DELIMITER_RUNS = 20000;
  MAX_DELIMITER_CHARS = 1e5;
  MAX_BRACKET_CELLS = 40000;
  MAX_SCREENSHOTS = 20;
  MAX_LISTED_SYSTEM_FILES = 20;
  SYSTEM_FILE_NAMES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);
  MACOSX_METADATA_DIR = "__MACOSX";
  SYSTEM_FILES_FOUND_NOTE =
    "System files: this command reads the folder on disk. A plugin submitted from a git repository holds only what is committed there. For each file a finding names, run `git ls-files <file>`. If it prints nothing, the file is not committed and so is not submitted with the plugin; add its name to .gitignore. If it prints the file, remove it as the finding says. In CI, run --profile directory --strict on a fresh checkout; --strict also fails on the directory's other warnings.";
  MAX_SCAN_ENTRIES = 20000;
  MAX_SCAN_DEPTH = 32;
  MAX_REPO_ROOT_PARENTS = 32;
  MAX_PATH_DISPLAY_CHARS = 4096;
  MAX_LISTED_MODULE_FILES = 16;
  MAX_LISTED_TRAVERSALS = 20;
  HOOK_EVENT_NAMES = new Set(HOOK_EVENTS);
  MAX_LISTED_NAMES = 3;
  LISTING_WHITESPACE_CHARS = `	
\v\f\r \x85\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000`;
  LISTING_WHITESPACE_RE = /[\t\n\v\f\r \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/;
  URL_PATTERN = /https?:\/\/[^ \t\n\f\r)<>"']+/;
  URL_PATTERN_GLOBAL = /https?:\/\/[^ \t\n\f\r)<>"']+/g;
  PRIVACY_WORD_RE = /privacy/i;
  SUPPORT_WORD_RE = /\b(support|issues|bug reports?|contact)\b/i;
  TERMS_WORD_RE = /\b(terms of service|terms of use|terms)\b/i;
  DOCS_WORD_RE = /\b(documentation|docs)\b/i;
  UNSAFE_SVG_ELEMENT_RE =
    /<\s*(?:script|foreignobject|animate|animatemotion|animatetransform|set|discard|style|iframe|embed|object)\b/i;
  SVG_EVENT_HANDLER_RE = /\son[a-z]+\s*=/i;
  SVG_EXTERNAL_REF_RE = /href\s*=\s*(?:["']\s*)?[^"'#\s>]/i;
});
//@ chunk-5aas12zq.js:6260-6384 placement
/**
 * 校验用的插件根（无 manifest 且不在全局 .claude 时取解析路径）。
 */
function getEffectivePluginRoot(result) {
  if (result.pluginRoot !== null) return result.pluginRoot;
  return result.manifest === null && !isInGlobalClaudeFolder(result.resolvedPath)
    ? result.resolvedPath
    : null;
}
//@ chunk-5aas12zq.js:6384-6432 placement (2.1.88 match: isInGlobalClaudeFolder, 0.775)
function isInGlobalClaudeFolder(filePath) {
  return pathModule.basename(filePath) === ".claude";
}
//@ chunk-5aas12zq.js:6432-12701 placement
/**
 * 校验插件目录：读取清单、检查 README/许可、组件文件与目录名，返回问题列表。
 */
async function validatePluginDirectory(inputDir) {
  let resolved = pathModule.resolve(inputDir);
  let pluginFile = await readPluginFileSafe(resolved, PLUGIN_MANIFEST_PATH, ONE_MIB);
  let manifestEncodingProblem =
    pluginFile.found && pluginFile.bytes !== undefined
      ? detectJsonEncodingProblem(pluginFile.bytes)
      : undefined;
  let manifestJson;
  try {
    manifestJson =
      !pluginFile.found || pluginFile.bytes === undefined
        ? undefined
        : jsonParse(stripBom(pluginFile.bytes.toString("utf-8")));
  } catch {
    manifestJson = undefined;
  }
  let findings = [];
  let notes = [];
  let displayPath = await preferPwdSpelling(resolved);
  let repositoryCache;
  let getRepository = () => (repositoryCache ??= locateGitRepository(displayPath));
  let manifest;
  let derivedName;
  if (isPlainObject(manifestJson)) {
    manifest = manifestJson;
    if (manifestEncodingProblem !== undefined)
      findings.push({
        ...makeFinding(
          "MANIFEST_INVALID_JSON",
          PLUGIN_MANIFEST_PATH,
          "json",
          `Invalid JSON syntax: ${manifestEncodingProblem.error}`,
        ),
        fix: manifestEncodingProblem.fix,
      });
    appendAll(findings, checkNonAsciiName(manifest.name, "written"));
  } else if (await isSkillsOnlyFolder(resolved)) {
    derivedName = (await getRepository()).kind === "parent" ? pathModule.basename(displayPath) : "";
    manifest =
      derivedName === ""
        ? {}
        : {
            name: derivedName,
          };
    findings.push(
      makeFinding(
        "MANIFEST_NOT_FOUND",
        PLUGIN_MANIFEST_PATH,
        "file",
        "No .claude-plugin/plugin.json. This folder holds a skills tree (skills/<name>/SKILL.md), which Claude Code loads without a manifest, so the directory accepts it as a plugin; anything else in it (agents/, commands/, hooks/, \u2026) is validated and loads with it." +
          (derivedName === ""
            ? ""
            : ` It is listed as ${quoteForDisplay(derivedName)}, the name of its folder, repository or marketplace entry.`),
      ),
    );
    appendAll(findings, checkDerivedName(derivedName));
  } else return null;
  let hasDerivedName = derivedName === "";
  if (
    (derivedName === undefined
      ? await readdir(pathModule.join(resolved, ".claude-plugin"), {
          withFileTypes: true,
        }).catch(() => [])
      : []
    ).some((dirent) => dirent.name === "marketplace.json" && dirent.isFile())
  )
    notes.push(MARKETPLACE_FOLDER_NOTE);
  let firstDoc = await readFirstDoc(resolved, manifestRelativePath, false);
  let licenseMissing =
    trimmedStringField(manifest, "license") === "" && (await findFileCaseInsensitive(resolved)) === undefined;
  let repository =
    firstDoc === undefined || licenseMissing || derivedName !== undefined ? await getRepository() : undefined;
  let dir = repository?.kind === "parent" ? repository.dir : undefined;
  let readmeLink = firstDoc === undefined ? await copyDir_2(resolved) : undefined;
  let readme =
    firstDoc ??
    (dir === undefined || readmeLink !== undefined
      ? undefined
      : await readFirstDoc(dir, ROOT_MANIFEST_PATHS, true));
  let licenseAtRoot = licenseMissing && dir !== undefined ? await findFileCaseInsensitive(dir) : undefined;
  if (readmeLink !== undefined)
    notes.push(
      `${extractToolInputForTelemetry(readmeLink, 200)} in this folder is a symbolic link. These checks do not follow links and the directory drops them, so it does not count as the plugin's README, and a README at the repository root does not stand in for it. Replace the link with a regular file.`,
    );
  appendAll(
    notes,
    describeLinkedReadme(repository, pathModule.basename(displayPath), derivedName, {
      used: [
        ...(readme?.fromRepositoryRoot === true ? [readme.displayPath] : []),
        ...(licenseAtRoot === undefined ? [] : [licenseAtRoot]),
      ],
      notFound: [
        ...(readme === undefined && readmeLink === undefined ? ["README"] : []),
        ...(licenseMissing && licenseAtRoot === undefined ? ["license file"] : []),
      ],
    }),
  );
  if (readme === undefined)
    findings.push(
      makeFinding(
        "README_MISSING",
        "README.md",
        "",
        "This plugin has no README.md. People who install it and the directory's automated review read the README to learn what it does; the first line of a README in the plugin folder also stands in as the listing summary when plugin.json has no description.",
      ),
    );
  else {
    let readmeLabel = readme.fromRepositoryRoot
      ? "The repository-root README (this plugin folder has none of its own)"
      : "README";
    if (readme.unread === "too-large") {
      let sizeLimitText = formatByteSize(ONE_MIB);
      findings.push({
        ...makeFinding(
          "README_TRIVIAL",
          readme.displayPath,
          "",
          `${readmeLabel} is larger than the ${sizeLimitText} size limit and was not read, so the listing has no usable description.`,
        ),
        fix: `Cut the README to under ${sizeLimitText}; move long reference material into other files and link to them.`,
      });
    } else if (readme.unread === "unreadable")
      findings.push({
        ...makeFinding(
          "README_TRIVIAL",
          readme.displayPath,
          "",
          `${readmeLabel} was found but could not be opened or read, so the listing has no usable description.`,
        ),
        fix: "Check that the README is an ordinary, readable file and submit again.",
      });
    else {
      if (readme.words < LICENSE_CANDIDATES)
        findings.push({
          ...makeFinding(
            "README_TRIVIAL",
            readme.displayPath,
            "",
            `${readmeLabel} has ${readme.words} words; at least ${LICENSE_CANDIDATES} are required so the listing has a usable description.`,
          ),
          fix: `Add a few sentences on what the plugin does, how to use it and any setup it needs: at least ${LICENSE_CANDIDATES} words in all.`,
        });
      let renderProblem = checkReadmeRenderable(readme.text);
      if (renderProblem !== undefined)
        findings.push({
          ...makeFinding(
            "README_NOT_RENDERED",
            readme.displayPath,
            "",
            `README was not rendered for the listing preview: ${renderProblem.why}.`,
          ),
          fix: renderProblem.fix,
        });
    }
  }
  if (licenseMissing && licenseAtRoot === undefined)
    findings.push(
      makeFinding(
        "LICENSE_MISSING",
        "LICENSE",
        "",
        "This plugin has no LICENSE file and plugin.json has no `license`. The directory requires one of them.",
      ),
    );
  appendAll(findings, await checkPluginIcon(resolved, manifest));
  let privacy = checkListingUrls(manifest, readme?.text, findings);
  appendAll(findings, checkScreenshotUrls(manifest, notes));
  let components = await checkComponentFiles(resolved, manifest, findings);
  let groupedUnusable = groupFindingsByFileReason(components.unusable);
  let hasLeftOutComponents = components.leftOut.mcp.length > 0 || components.leftOut.hooks.length > 0;
  let privacyUndecided =
    (hasLeftOutComponents || groupedUnusable.length > 0) &&
    !components.connectsToRemote &&
    privacy.url === undefined;
  let relevantRules = [
    ...(components.leftOut.mcp.length > 0 ? ["MCP_FILE_UNREAD", "MCPJSON_UNPARSEABLE"] : []),
    ...(components.leftOut.hooks.length > 0 ? ["HOOKS_FILE_UNREAD"] : []),
    ...(hasLeftOutComponents && privacyUndecided ? ["PRIVACY_URL_MISSING"] : []),
  ];
  let undecidedRules = [...relevantRules];
  for (let { rules } of groupedUnusable)
    for (let rule of rules) if (!undecidedRules.includes(rule)) undecidedRules.push(rule);
  if (privacyUndecided && !undecidedRules.includes("PRIVACY_URL_MISSING"))
    undecidedRules.push("PRIVACY_URL_MISSING");
  for (let [categoryLabel, skippedCount] of [
    ["MCP servers", components.traversalsNotListed.mcp],
    ["hooks", components.traversalsNotListed.hooks],
  ])
    if (skippedCount > 0)
      notes.push(
        `${skippedCount} more ${plural(skippedCount, "path")} that plugin.json lists for ${categoryLabel} ${skippedCount === 1 ? "contains" : "contain"} ".." and ${skippedCount === 1 ? "is" : "are"} not shown one by one.`,
      );
  let privacyHint = "set `privacyPolicyUrl` in plugin.json if the plugin connects to a remote service";
  if (hasLeftOutComponents)
    notes.push(
      `These checks read at most ${MAX_LISTED_MODULE_FILES} of the files that plugin.json lists for MCP servers and ${MAX_LISTED_MODULE_FILES} of those it lists for hooks. Not checked at all: ${[formatIssuesSummary(components.leftOut.mcp, "MCP servers"), formatIssuesSummary(components.leftOut.hooks, "hooks")].filter((summary) => summary !== "").join("; ")}. For the files left out these directory rules are undecided: ${relevantRules.join(", ")}. List at most ${MAX_LISTED_MODULE_FILES} files of each kind, or --profile directory fails the run${privacyUndecided ? `; and ${privacyHint}` : ""}.`,
    );
  for (let { file, reason, todo, rules } of groupedUnusable)
    notes.push(
      `${extractToolInputForTelemetry(file, 100)} ${reason}. The directory refuses a plugin with such a file (${rules.join(", ")}). ${todo}`,
    );
  if (privacyUndecided && !hasLeftOutComponents)
    notes.push(
      `No remote service was seen in what these checks could read, and plugin.json sets no privacy policy URL that they accept, so the directory's privacy warning (PRIVACY_URL_MISSING) cannot be ruled out until the ${groupedUnusable.length === 1 ? "file" : "files"} named above can be read in full. Fix that first, or ${privacyHint}.`,
    );
  if (components.hooksModuleFiles.length > 0) {
    let mapped = components.hooksModuleFiles.map((hooksModuleFile) =>
      extractToolInputForTelemetry(hooksModuleFile, 100),
    );
    let lastName = mapped.pop() ?? "";
    let moduleNote =
      mapped.length === 0
        ? `${lastName} names a hooks module`
        : `${mapped.join(", ")} and ${lastName} each name a hooks module`;
    notes.push(
      `${moduleNote} (a code file listed under \`modules\`). The plugin directory has rules of its own for such code, and these checks apply none of them, so passing here does not mean the directory accepts the plugin. The developer portal's own validation applies those rules.`,
    );
  }
  if (components.connectsToRemote && privacy.url === undefined)
    findings.push(
      makeFinding(
        "PRIVACY_URL_MISSING",
        PLUGIN_MANIFEST_PATH,
        "privacyPolicyUrl",
        "This plugin connects to a remote MCP server or HTTP hook but declares no privacy policy URL (plugin.json `privacyPolicyUrl`, or a 'Privacy' link in README).",
      ),
    );
  else if (components.connectsToRemote && privacy.fromReadme)
    findings.push({
      ...makeFinding(
        "PRIVACY_URL_MISSING",
        PLUGIN_MANIFEST_PATH,
        "privacyPolicyUrl",
        `Privacy policy URL taken from README (${extractToolInputForTelemetry(privacy.url ?? "", 1000)}); set \`privacyPolicyUrl\` in plugin.json to make it explicit.`,
      ),
      title: null,
      severity: "info",
      blocking: false,
      fix: null,
    });
  let osMetadataFiles = await findOsMetadataFiles(resolved, notes);
  appendAll(findings, osMetadataFiles.findings);
  return {
    findings: dedupeFindings(findings).toSorted(compareSeverity),
    notes,
    undecided: undecidedRules,
    incomplete:
      undecidedRules.length > 0 ||
      osMetadataFiles.notSearched ||
      hasDerivedName ||
      components.hooksModuleFiles.length > 0,
  };
}
//@ chunk-5aas12zq.js:12701-12887 placement
function groupFindingsByFileReason(unusable) {
  let byFileAndReason = new Map();
  for (let { rule, ...rest } of unusable) {
    let key = `${rest.file}
${rest.reason}`;
    let grouped = byFileAndReason.get(key) ?? {
      ...rest,
      rules: [],
    };
    if (!grouped.rules.includes(rule)) grouped.rules.push(rule);
    byFileAndReason.set(key, grouped);
  }
  return [...byFileAndReason.values()];
}
//@ chunk-5aas12zq.js:12887-13011 placement (2.1.88 match: formatFailureDetails, 0.777)
function formatFailureDetails(items) {
  let mapped = items.slice(0, MAX_LISTED_NAMES).map((item) => extractToolInputForTelemetry(item, 100));
  let remaining = items.length - mapped.length;
  return `${mapped.join(", ")}${remaining > 0 ? ` and ${remaining} more` : ""}`;
}
//@ chunk-5aas12zq.js:13011-13092 placement
function formatIssuesSummary(items, label) {
  return items.length === 0 ? "" : `${items.length} listed for ${label} (${formatFailureDetails(items)})`;
}
//@ chunk-5aas12zq.js:13092-13217 placement
/**
 * 保留会导致失败的问题码（error，strict 时含 warning）。
 */
function filterBlockingIssueCodes(codes, strict) {
  return codes.filter((code) => {
    let issue = PLUGIN_VALIDATION_ISSUES[code];
    return !issue.hold && (issue.severity === "error" || (strict.strict && issue.severity === "warning"));
  });
}
//@ chunk-5aas12zq.js:13217-13310 placement
function hasBlockingInvalidIssue(findings, strict) {
  return findings.some(
    (finding) => !finding.hold && (finding.blocking || (strict.strict && finding.severity === "warning")),
  );
}
//@ chunk-5aas12zq.js:13310-13672 placement
/**
 * 文件夹同时有市场 manifest 的说明与内部错误说明。
 */
var MARKETPLACE_FOLDER_NOTE =
  "This folder also holds a marketplace manifest. The plugin directory treats such a folder as a plugin, so these checks cover only the plugin in this folder. To check another plugin that the marketplace lists, run validate on that plugin's folder.";
var INTERNAL_CHECK_FAILURE_NOTE =
  "The plugin directory checks did not run because of a problem inside this command, not in your plugin.";
//@ chunk-5aas12zq.js:13672-13835 placement
function formatDirectoryChecksHeading(dirPath) {
  return `Plugin directory checks for ${extractToolInputForTelemetry(dirPath, MAX_PATH_DISPLAY_CHARS)}. The plugin directory is the catalog that plugins are submitted to; this is a subset of what it runs.`;
}
//@ chunk-5aas12zq.js:13835-13890 placement
function directoryChecksHeaderLines(dirPath) {
  return [
    formatDirectoryChecksHeading(dirPath),
    "",
    `${figures_default.cross} ${INTERNAL_CHECK_FAILURE_NOTE}`,
    "",
  ];
}
//@ chunk-5aas12zq.js:13890-15043 placement
/**
 * 把插件目录检查结果格式化为多行文字：分别列出会导致目录拒绝提交的问题、警告与提示，附“关于这些检查”的说明； 没有发现时给出完成提示；这些检查不影响最终结果时提示如何启用严格模式。
 */
function formatDirectoryCheckReport(pluginName, result, strictCommand) {
  let lines = [formatDirectoryChecksHeading(pluginName), ""];
  let pushSection = (heading, findings) => {
    if (findings.length === 0) return;
    lines.push(heading, "");
    for (let finding of findings) appendAll(lines, checkUnreachableRules(finding));
    lines.push("");
  };
  let findings = result.findings.filter((finding) => finding.blocking);
  let findings_2 = result.findings.filter((finding) => !finding.blocking && finding.severity !== "info");
  let findings_3 = result.findings.filter((finding) => finding.severity === "info");
  pushSection(
    `${figures_default.cross} Found ${findings.length} ${plural(findings.length, "problem")} the plugin directory refuses a submission for:`,
    findings,
  );
  pushSection(
    `${figures_default.warning} Found ${findings_2.length} plugin directory ${plural(findings_2.length, "warning")}:`,
    findings_2,
  );
  pushSection(
    `${figures_default.info} Found ${findings_3.length} plugin directory ${plural(findings_3.length, "note")}:`,
    findings_3,
  );
  if (result.notes.length > 0) {
    lines.push("About these checks:", "");
    for (let note of result.notes) lines.push(`  ${figures_default.pointer} ${note}`);
    lines.push("");
  }
  if (result.findings.length === 0)
    lines.push(
      result.incomplete
        ? "These checks found nothing to report in what they looked at. The notes above say what they did not look at or apply."
        : `${figures_default.tick} These checks found nothing to report`,
      "",
    );
  else if (strictCommand !== null)
    lines.push(
      "These plugin directory checks do not change the result below." +
        (findings.length > 0
          ? ` To fail on problems the directory refuses a submission for, run ${strictCommand}.`
          : ""),
      "",
    );
  lines.push("The directory also runs a safety scan and a policy review that this command does not.", "");
  return lines;
}
//@ chunk-5aas12zq.js:24816-24938 placement
function formatByteSize(size) {
  if (size > 0 && size % 1048576 === 0) return `${size / 1048576} MiB`;
  if (size > 0 && size % 1024 === 0) return `${size / 1024} KiB`;
  return `${size} bytes`;
}
export {
  manifestRelativePath,
  PLUGIN_VALIDATION_ISSUES,
  LISTING_WHITESPACE_CHARS,
  MAX_SCAN_ENTRIES,
  PLUGIN_MANIFEST_PATH,
  ICON_CANDIDATES,
  MAX_REPO_ROOT_PARENTS,
  MAX_PATH_DISPLAY_CHARS,
  URL_PATTERN_GLOBAL,
  LISTING_WHITESPACE_RE,
  URL_PATTERN,
  MAX_README_BYTES,
  MAX_BRACKET_CELLS,
  MAX_DELIMITER_CHARS,
  MAX_DELIMITER_RUNS,
  MAX_INDENT_COLUMNS,
  MAX_LIST_NESTING,
  README_CANDIDATES,
  PRIVACY_WORD_RE,
  SUPPORT_WORD_RE,
  TERMS_WORD_RE,
  DOCS_WORD_RE,
  MAX_SCREENSHOTS,
  README_ROOT_CANDIDATES,
  MAX_ICON_BYTES,
  ICON_INVALID_MESSAGE,
  UNSAFE_SVG_ELEMENT_RE,
  SVG_EVENT_HANDLER_RE,
  SVG_EXTERNAL_REF_RE,
  MAX_LISTED_MODULE_FILES,
  MAX_LISTED_TRAVERSALS,
  HOOK_EVENT_NAMES,
  MACOSX_METADATA_DIR,
  MAX_SCAN_DEPTH,
  SYSTEM_FILE_NAMES,
  formatFailureDetails,
  SYSTEM_FILES_FOUND_NOTE,
  MAX_LISTED_SYSTEM_FILES,
  INTERNAL_CHECK_FAILURE_NOTE,
  getEffectivePluginRoot,
  hasBlockingInvalidIssue,
  directoryChecksHeaderLines,
  formatDirectoryCheckReport,
  isInGlobalClaudeFolder,
  validatePluginDirectory,
  filterBlockingIssueCodes,
};
