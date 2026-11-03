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

//@ chunk-5aas12zq.js:1524-6260 placement
/**
 * PLUGIN_VALIDATION_ISSUES：插件目录校验的问题码表；manifestRelativePath：插件清单相对路径；README_CANDIDATES：README 候选文件名（同一声明共 38 个绑定）。
 */
var PLUGIN_VALIDATION_ISSUES_2 = {
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
var PLUGIN_VALIDATION_ISSUES = ".claude-plugin/plugin.json";
var manifestRelativePath = [
  "README.md",
  "readme.md",
  "Readme.md",
  "README.markdown",
  "README",
  "README.txt",
  "docs/README.md",
];
var nn = manifestRelativePath.filter((e) => !e.includes("/")).toSorted();
var README_CANDIDATES = [
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
var README_ROOT_CANDIDATES = [
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
var LICENSE_CANDIDATES = 40;
var ICON_CANDIDATES = 'Plugin name cannot contain spaces. Use kebab-case (e.g., "my-plugin")';
var MIN_README_WORDS =
  "Icon file is not a usable SVG/PNG (unrecognised format, or an SVG with script, event handlers, foreignObject, animation, style or non-fragment references).";
var PLUGIN_NAME_SPACE_MESSAGE = 262144;
var ICON_INVALID_MESSAGE = 2097152;
var MAX_ICON_BYTES = 32;
var MAX_SCREENSHOT_BYTES = 128;
var MAX_NAME_SUGGESTION_COUNT = 20000;
var MAX_DESCRIPTION_LENGTH = 1e5;
var MAX_README_CHARS = 40000;
var MAX_LISTING_CHARS = 20;
var MAX_URL_LENGTH = 20;
var MAX_SCREENSHOT_COUNT = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);
var MAX_LINK_CHECK_COUNT = "__MACOSX";
var MAX_ISSUE_ROWS =
  "System files: this command reads the folder on disk. A plugin submitted from a git repository holds only what is committed there. For each file a finding names, run `git ls-files <file>`. If it prints nothing, the file is not committed and so is not submitted with the plugin; add its name to .gitignore. If it prints the file, remove it as the finding says. In CI, run --profile directory --strict on a fresh checkout; --strict also fails on the directory's other warnings.";
var ARCHIVE_OS_METADATA_NAMES = 20000;
var MACOS_METADATA_DIR = 32;
var SYSTEM_FILE_GIT_NOTE = 32;
var MAX_FIELD_CHARS = 4096;
var MAX_HOOK_SUGGESTIONS = 16;
var MAX_COMMAND_LENGTH = 20;
var HOOK_EVENT_NAME_SET = new Set(HOOK_EVENTS);
var MAX_NAME_SUGGESTION_DISTANCE = 3;
var LISTING_WHITESPACE_CHARS = `	
\v\f\r \x85\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000`;
var LISTING_WHITESPACE_RE = /[\t\n\v\f\r \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/;
var URL_PATTERN = /https?:\/\/[^ \t\n\f\r)<>"']+/;
var URL_PATTERN_GLOBAL = /https?:\/\/[^ \t\n\f\r)<>"']+/g;
var PRIVACY_WORD_RE = /privacy/i;
var SUPPORT_WORD_RE = /\b(support|issues|bug reports?|contact)\b/i;
var TERMS_WORD_RE = /\b(terms of service|terms of use|terms)\b/i;
var DOCS_WORD_RE = /\b(documentation|docs)\b/i;
var UNSAFE_SVG_ELEMENT_RE =
  /<\s*(?:script|foreignobject|animate|animatemotion|animatetransform|set|discard|style|iframe|embed|object)\b/i;
var SVG_EVENT_HANDLER_RE = /\son[a-z]+\s*=/i;
var SVG_EXTERNAL_REF_RE = /href\s*=\s*(?:["']\s*)?[^"'#\s>]/i;
//@ chunk-5aas12zq.js:6260-6384 placement
/**
 * 校验用的插件根（无 manifest 且不在全局 .claude 时取解析路径）。
 */
function getEffectivePluginRoot(e) {
  if (e.pluginRoot !== null) return e.pluginRoot;
  return e.manifest === null && !isInGlobalClaudeFolder(e.resolvedPath) ? e.resolvedPath : null;
}
//@ chunk-5aas12zq.js:6384-6432 placement = isInGlobalClaudeFolder (0.775)
function isInGlobalClaudeFolder(filePath) {
  return pathModule.basename(filePath) === ".claude";
}
//@ chunk-5aas12zq.js:6432-12701 placement
/**
 * 校验插件目录：读取清单、检查 README/许可、组件文件与目录名，返回问题列表。
 */
async function validatePluginDirectory(e) {
  let cwd = pathModule.resolve(e);
  let pluginFile = await readPluginFileSafe(cwd, PLUGIN_VALIDATION_ISSUES, ONE_MIB);
  let r =
    pluginFile.found && pluginFile.bytes !== undefined
      ? detectJsonEncodingProblem(pluginFile.bytes)
      : undefined;
  let s;
  try {
    s =
      !pluginFile.found || pluginFile.bytes === undefined
        ? undefined
        : jsonParse(stripBom(pluginFile.bytes.toString("utf-8")));
  } catch {
    s = undefined;
  }
  let o = [];
  let a = [];
  let l = await preferPwdSpelling(cwd);
  let d;
  let f = () => (d ??= locateGitRepository(l));
  let p;
  let S;
  if (isPlainObject(s)) {
    p = s;
    if (r !== undefined)
      o.push({
        ...makeFinding(
          "MANIFEST_INVALID_JSON",
          PLUGIN_VALIDATION_ISSUES,
          "json",
          `Invalid JSON syntax: ${r.error}`,
        ),
        fix: r.fix,
      });
    appendAll(o, checkNonAsciiName(p.name, "written"));
  } else if (await isSkillsOnlyFolder(cwd)) {
    S = (await f()).kind === "parent" ? pathModule.basename(l) : "";
    p =
      S === ""
        ? {}
        : {
            name: S,
          };
    o.push(
      makeFinding(
        "MANIFEST_NOT_FOUND",
        PLUGIN_VALIDATION_ISSUES,
        "file",
        "No .claude-plugin/plugin.json. This folder holds a skills tree (skills/<name>/SKILL.md), which Claude Code loads without a manifest, so the directory accepts it as a plugin; anything else in it (agents/, commands/, hooks/, \u2026) is validated and loads with it." +
          (S === ""
            ? ""
            : ` It is listed as ${quoteForDisplay(S)}, the name of its folder, repository or marketplace entry.`),
      ),
    );
    appendAll(o, checkDerivedName(S));
  } else return null;
  let b = S === "";
  if (
    (S === undefined
      ? await readdir(pathModule.join(cwd, ".claude-plugin"), {
          withFileTypes: true,
        }).catch(() => [])
      : []
    ).some((w) => w.name === "marketplace.json" && w.isFile())
  )
    a.push(MARKETPLACE_FOLDER_NOTE);
  let firstDoc = await readFirstDoc(cwd, manifestRelativePath, false);
  let L = trimmedStringField(p, "license") === "" && (await findFileCaseInsensitive(cwd)) === undefined;
  let C = firstDoc === undefined || L || S !== undefined ? await f() : undefined;
  let dir = C?.kind === "parent" ? C.dir : undefined;
  let x = firstDoc === undefined ? await copyDir_2(cwd) : undefined;
  let c = firstDoc ?? (dir === undefined || x !== undefined ? undefined : await readFirstDoc(dir, nn, true));
  let h = L && dir !== undefined ? await findFileCaseInsensitive(dir) : undefined;
  if (x !== undefined)
    a.push(
      `${extractToolInputForTelemetry(x, 200)} in this folder is a symbolic link. These checks do not follow links and the directory drops them, so it does not count as the plugin's README, and a README at the repository root does not stand in for it. Replace the link with a regular file.`,
    );
  appendAll(
    a,
    describeLinkedReadme(C, pathModule.basename(l), S, {
      used: [...(c?.fromRepositoryRoot === true ? [c.displayPath] : []), ...(h === undefined ? [] : [h])],
      notFound: [
        ...(c === undefined && x === undefined ? ["README"] : []),
        ...(L && h === undefined ? ["license file"] : []),
      ],
    }),
  );
  if (c === undefined)
    o.push(
      makeFinding(
        "README_MISSING",
        "README.md",
        "",
        "This plugin has no README.md. People who install it and the directory's automated review read the README to learn what it does; the first line of a README in the plugin folder also stands in as the listing summary when plugin.json has no description.",
      ),
    );
  else {
    let w = c.fromRepositoryRoot
      ? "The repository-root README (this plugin folder has none of its own)"
      : "README";
    if (c.unread === "too-large") {
      let E = formatByteSize(ONE_MIB);
      o.push({
        ...makeFinding(
          "README_TRIVIAL",
          c.displayPath,
          "",
          `${w} is larger than the ${E} size limit and was not read, so the listing has no usable description.`,
        ),
        fix: `Cut the README to under ${E}; move long reference material into other files and link to them.`,
      });
    } else if (c.unread === "unreadable")
      o.push({
        ...makeFinding(
          "README_TRIVIAL",
          c.displayPath,
          "",
          `${w} was found but could not be opened or read, so the listing has no usable description.`,
        ),
        fix: "Check that the README is an ordinary, readable file and submit again.",
      });
    else {
      if (c.words < LICENSE_CANDIDATES)
        o.push({
          ...makeFinding(
            "README_TRIVIAL",
            c.displayPath,
            "",
            `${w} has ${c.words} words; at least ${LICENSE_CANDIDATES} are required so the listing has a usable description.`,
          ),
          fix: `Add a few sentences on what the plugin does, how to use it and any setup it needs: at least ${LICENSE_CANDIDATES} words in all.`,
        });
      let E = checkReadmeRenderable(c.text);
      if (E !== undefined)
        o.push({
          ...makeFinding(
            "README_NOT_RENDERED",
            c.displayPath,
            "",
            `README was not rendered for the listing preview: ${E.why}.`,
          ),
          fix: E.fix,
        });
    }
  }
  if (L && h === undefined)
    o.push(
      makeFinding(
        "LICENSE_MISSING",
        "LICENSE",
        "",
        "This plugin has no LICENSE file and plugin.json has no `license`. The directory requires one of them.",
      ),
    );
  appendAll(o, await checkPluginIcon(cwd, p));
  let y = checkListingUrls(p, c?.text, o);
  appendAll(o, checkScreenshotUrls(p, a));
  let m = await checkComponentFiles(cwd, p, o);
  let v = groupFindingsByFileReason(m.unusable);
  let J = m.leftOut.mcp.length > 0 || m.leftOut.hooks.length > 0;
  let W = (J || v.length > 0) && !m.connectsToRemote && y.url === undefined;
  let fe = [
    ...(m.leftOut.mcp.length > 0 ? ["MCP_FILE_UNREAD", "MCPJSON_UNPARSEABLE"] : []),
    ...(m.leftOut.hooks.length > 0 ? ["HOOKS_FILE_UNREAD"] : []),
    ...(J && W ? ["PRIVACY_URL_MISSING"] : []),
  ];
  let U = [...fe];
  for (let { rules } of v) for (let rule of rules) if (!U.includes(rule)) U.push(rule);
  if (W && !U.includes("PRIVACY_URL_MISSING")) U.push("PRIVACY_URL_MISSING");
  for (let [w, E] of [
    ["MCP servers", m.traversalsNotListed.mcp],
    ["hooks", m.traversalsNotListed.hooks],
  ])
    if (E > 0)
      a.push(
        `${E} more ${plural(E, "path")} that plugin.json lists for ${w} ${E === 1 ? "contains" : "contain"} ".." and ${E === 1 ? "is" : "are"} not shown one by one.`,
      );
  let he = "set `privacyPolicyUrl` in plugin.json if the plugin connects to a remote service";
  if (J)
    a.push(
      `These checks read at most ${MAX_HOOK_SUGGESTIONS} of the files that plugin.json lists for MCP servers and ${MAX_HOOK_SUGGESTIONS} of those it lists for hooks. Not checked at all: ${[formatIssuesSummary(m.leftOut.mcp, "MCP servers"), formatIssuesSummary(m.leftOut.hooks, "hooks")].filter((w) => w !== "").join("; ")}. For the files left out these directory rules are undecided: ${fe.join(", ")}. List at most ${MAX_HOOK_SUGGESTIONS} files of each kind, or --profile directory fails the run${W ? `; and ${he}` : ""}.`,
    );
  for (let { file, reason, todo, rules } of v)
    a.push(
      `${extractToolInputForTelemetry(file, 100)} ${reason}. The directory refuses a plugin with such a file (${rules.join(", ")}). ${todo}`,
    );
  if (W && !J)
    a.push(
      `No remote service was seen in what these checks could read, and plugin.json sets no privacy policy URL that they accept, so the directory's privacy warning (PRIVACY_URL_MISSING) cannot be ruled out until the ${v.length === 1 ? "file" : "files"} named above can be read in full. Fix that first, or ${he}.`,
    );
  if (m.hooksModuleFiles.length > 0) {
    let mapped = m.hooksModuleFiles.map((hooksModuleFile) =>
      extractToolInputForTelemetry(hooksModuleFile, 100),
    );
    let E = mapped.pop() ?? "";
    let Z =
      mapped.length === 0
        ? `${E} names a hooks module`
        : `${mapped.join(", ")} and ${E} each name a hooks module`;
    a.push(
      `${Z} (a code file listed under \`modules\`). The plugin directory has rules of its own for such code, and these checks apply none of them, so passing here does not mean the directory accepts the plugin. The developer portal's own validation applies those rules.`,
    );
  }
  if (m.connectsToRemote && y.url === undefined)
    o.push(
      makeFinding(
        "PRIVACY_URL_MISSING",
        PLUGIN_VALIDATION_ISSUES,
        "privacyPolicyUrl",
        "This plugin connects to a remote MCP server or HTTP hook but declares no privacy policy URL (plugin.json `privacyPolicyUrl`, or a 'Privacy' link in README).",
      ),
    );
  else if (m.connectsToRemote && y.fromReadme)
    o.push({
      ...makeFinding(
        "PRIVACY_URL_MISSING",
        PLUGIN_VALIDATION_ISSUES,
        "privacyPolicyUrl",
        `Privacy policy URL taken from README (${extractToolInputForTelemetry(y.url ?? "", 1000)}); set \`privacyPolicyUrl\` in plugin.json to make it explicit.`,
      ),
      title: null,
      severity: "info",
      blocking: false,
      fix: null,
    });
  let osMetadataFiles = await findOsMetadataFiles(cwd, a);
  appendAll(o, osMetadataFiles.findings);
  return {
    findings: dedupeFindings(o).toSorted(compareSeverity),
    notes: a,
    undecided: U,
    incomplete: U.length > 0 || osMetadataFiles.notSearched || b || m.hooksModuleFiles.length > 0,
  };
}
//@ chunk-5aas12zq.js:12701-12887 placement
function groupFindingsByFileReason(unusable) {
  let n = new Map();
  for (let { rule, ...r } of unusable) {
    let s = `${r.file}
${r.reason}`;
    let o = n.get(s) ?? {
      ...r,
      rules: [],
    };
    if (!o.rules.includes(rule)) o.rules.push(rule);
    n.set(s, o);
  }
  return [...n.values()];
}
//@ chunk-5aas12zq.js:12887-13011 placement = formatFailureDetails (0.777)
function formatFailureDetails(e) {
  let mapped = e.slice(0, MAX_NAME_SUGGESTION_DISTANCE).map((r) => extractToolInputForTelemetry(r, 100));
  let remaining = e.length - mapped.length;
  return `${mapped.join(", ")}${remaining > 0 ? ` and ${remaining} more` : ""}`;
}
//@ chunk-5aas12zq.js:13011-13092 placement
function formatIssuesSummary(e, n) {
  return e.length === 0 ? "" : `${e.length} listed for ${n} (${formatFailureDetails(e)})`;
}
//@ chunk-5aas12zq.js:13092-13217 placement
/**
 * 保留会导致失败的问题码（error，strict 时含 warning）。
 */
function filterBlockingIssueCodes(e, n) {
  return e.filter((t) => {
    let r = PLUGIN_VALIDATION_ISSUES_2[t];
    return !r.hold && (r.severity === "error" || (n.strict && r.severity === "warning"));
  });
}
//@ chunk-5aas12zq.js:13217-13310 placement
function hasBlockingInvalidIssue(e, n) {
  return e.some((t) => !t.hold && (t.blocking || (n.strict && t.severity === "warning")));
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
function formatDirectoryChecksHeading(e) {
  return `Plugin directory checks for ${extractToolInputForTelemetry(e, MAX_FIELD_CHARS)}. The plugin directory is the catalog that plugins are submitted to; this is a subset of what it runs.`;
}
//@ chunk-5aas12zq.js:13835-13890 placement
function directoryChecksHeaderLines(e) {
  return [formatDirectoryChecksHeading(e), "", `${figures_default.cross} ${INTERNAL_CHECK_FAILURE_NOTE}`, ""];
}
//@ chunk-5aas12zq.js:13890-15043 placement
/**
 * 把插件目录检查结果格式化为多行文字：分别列出会导致目录拒绝提交的问题、警告与提示，附“关于这些检查”的说明； 没有发现时给出完成提示；这些检查不影响最终结果时提示如何启用严格模式。
 */
function formatDirectoryCheckReport(pluginName, result, strictCommand) {
  let lines = [formatDirectoryChecksHeading(pluginName), ""];
  let s = (d, f) => {
    if (f.length === 0) return;
    lines.push(d, "");
    for (let p of f) appendAll(lines, checkUnreachableRules(p));
    lines.push("");
  };
  let filtered = result.findings.filter((finding) => finding.blocking);
  let filtered_2 = result.findings.filter((finding) => !finding.blocking && finding.severity !== "info");
  let filtered_3 = result.findings.filter((finding) => finding.severity === "info");
  s(
    `${figures_default.cross} Found ${filtered.length} ${plural(filtered.length, "problem")} the plugin directory refuses a submission for:`,
    filtered,
  );
  s(
    `${figures_default.warning} Found ${filtered_2.length} plugin directory ${plural(filtered_2.length, "warning")}:`,
    filtered_2,
  );
  s(
    `${figures_default.info} Found ${filtered_3.length} plugin directory ${plural(filtered_3.length, "note")}:`,
    filtered_3,
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
        (filtered.length > 0
          ? ` To fail on problems the directory refuses a submission for, run ${strictCommand}.`
          : ""),
      "",
    );
  lines.push("The directory also runs a safety scan and a policy review that this command does not.", "");
  return lines;
}
//@ chunk-5aas12zq.js:24816-24938 placement
function formatByteSize(e) {
  if (e > 0 && e % 1048576 === 0) return `${e / 1048576} MiB`;
  if (e > 0 && e % 1024 === 0) return `${e / 1024} KiB`;
  return `${e} bytes`;
}
export {
  manifestRelativePath,
  PLUGIN_VALIDATION_ISSUES_2,
  LISTING_WHITESPACE_CHARS,
  ARCHIVE_OS_METADATA_NAMES,
  PLUGIN_VALIDATION_ISSUES,
  ICON_CANDIDATES,
  SYSTEM_FILE_GIT_NOTE,
  MAX_FIELD_CHARS,
  URL_PATTERN_GLOBAL,
  LISTING_WHITESPACE_RE,
  URL_PATTERN,
  PLUGIN_NAME_SPACE_MESSAGE,
  MAX_README_CHARS,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_SUGGESTION_COUNT,
  MAX_SCREENSHOT_BYTES,
  MAX_ICON_BYTES,
  README_CANDIDATES,
  PRIVACY_WORD_RE,
  SUPPORT_WORD_RE,
  TERMS_WORD_RE,
  DOCS_WORD_RE,
  MAX_LISTING_CHARS,
  README_ROOT_CANDIDATES,
  ICON_INVALID_MESSAGE,
  MIN_README_WORDS,
  UNSAFE_SVG_ELEMENT_RE,
  SVG_EVENT_HANDLER_RE,
  SVG_EXTERNAL_REF_RE,
  MAX_HOOK_SUGGESTIONS,
  MAX_COMMAND_LENGTH,
  HOOK_EVENT_NAME_SET,
  MAX_LINK_CHECK_COUNT,
  MACOS_METADATA_DIR,
  MAX_SCREENSHOT_COUNT,
  formatFailureDetails,
  MAX_ISSUE_ROWS,
  MAX_URL_LENGTH,
};
