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
  N,
  checkNonAsciiName,
  isSkillsOnlyFolder,
  quoteForDisplay,
  checkDerivedName,
  He,
  extractToolInputForTelemetry,
  dedupeFindings,
  vn,
} from "./helpers.js";
import { ONE_MIB } from "../schemas.js";
import { detectJsonEncodingProblem, checkComponentFiles } from "./componentFiles.js";
import { jsonParse } from "../../slowOperations.js";
import { Wo } from "../../json.js";
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
import { re as re_2 } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { checkUnreachableRules } from "../../doctorContextWarnings.js";

//@ chunk-5aas12zq.js:1524-6260 placement
var PLUGIN_VALIDATION_ISSUES = {
    README_MISSING: {
      title: "README missing",
      severity: "error",
      hold: !1,
      fix: "Add a README.md to the plugin folder describing what the plugin does, how to use it, and any setup it needs, in at least 40 words. A README at the repository root also counts for a plugin in a sub-folder.",
    },
    README_TRIVIAL: {
      title: "README too short or couldn\u2019t be read",
      severity: "error",
      hold: !1,
      fix: null,
    },
    README_NOT_RENDERED: {
      title: "README not shown in the listing preview",
      severity: "warning",
      hold: !1,
      fix: null,
    },
    LICENSE_MISSING: {
      title: "License missing",
      severity: "error",
      hold: !1,
      fix: "Add a LICENSE file to the plugin folder, or set `license` (an SPDX id) in plugin.json. A LICENSE at the repository root also counts for a plugin in a sub-folder.",
    },
    ICON_MISSING: {
      title: "No icon",
      severity: "warning",
      hold: !1,
      fix: "Add a square PNG to the plugin folder at .claude-plugin/icon.png, or set `icon` in plugin.json to the path of a square PNG or JPEG in the plugin: 512 to 2048 px on each side, under 2 MB. SVG and WebP are not accepted. That file may become the listing icon only once: the first time the plugin is saved or submitted in the developer portal. Adding or changing it later does not change the icon.",
    },
    ICON_INVALID: { title: "Icon can\u2019t be used", severity: "warning", hold: !1, fix: null },
    PRIVACY_URL_MISSING: {
      title: "No privacy policy URL",
      severity: "warning",
      hold: !1,
      fix: "Set `privacyPolicyUrl` in plugin.json.",
    },
    LISTING_URL_SCHEME: {
      title: "Listing link or icon path not accepted",
      severity: "warning",
      hold: !1,
      fix: null,
    },
    PATH_TRAVERSAL: {
      title: "Path climbs out of the plugin",
      severity: "error",
      hold: !1,
      fix: "Reference the file by its plain plugin-relative path (./servers.json).",
    },
    MANIFEST_NOT_FOUND: {
      title: null,
      severity: "info",
      hold: !1,
      fix: "Add .claude-plugin/plugin.json to choose the plugin's name, description and version yourself.",
    },
    MANIFEST_NAME_FORMAT: {
      title: null,
      severity: "error",
      hold: !1,
      fix: 'Add .claude-plugin/plugin.json with a valid "name", or rename the folder.',
    },
    MANIFEST_NAME_NOT_KEBAB: {
      title: null,
      severity: "warning",
      hold: !1,
      fix: 'Add .claude-plugin/plugin.json with a kebab-case "name", or rename the folder.',
    },
    IDENTIFIER_NON_ASCII: { title: null, severity: "error", hold: !1, fix: null },
    MCP_FILE_UNREAD: { title: null, severity: "error", hold: !1, fix: null },
    HOOKS_FILE_UNREAD: { title: null, severity: "error", hold: !1, fix: null },
    MCPJSON_UNPARSEABLE: { title: null, severity: "error", hold: !1, fix: null },
    MANIFEST_INVALID_JSON: { title: null, severity: "error", hold: !1, fix: null },
    HOOKS_JSON_INVALID: { title: null, severity: "error", hold: !1, fix: null },
    HOOKS_MISSING_WRAPPER: { title: null, severity: "error", hold: !1, fix: null },
    HOOKS_SCHEMA_INVALID: { title: null, severity: "error", hold: !1, fix: null },
    ARCHIVE_OS_METADATA_FILE: {
      title: "macOS or Windows system file in the plugin",
      severity: "warning",
      hold: !1,
      fix: null,
    },
  },
  R = ".claude-plugin/plugin.json",
  ae = ["README.md", "readme.md", "Readme.md", "README.markdown", "README", "README.txt", "docs/README.md"],
  toSorted = ae.filter((e) => !e.includes("/")).toSorted(),
  tn = [
    "LICENSE",
    "LICENSE.md",
    "LICENSE.txt",
    "LICENCE",
    "LICENCE.md",
    "COPYING",
    "COPYING.md",
    "LICENSE-MIT",
    "LICENSE-APACHE",
  ],
  rn = [
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
  ],
  ee = 40,
  sn = 'Plugin name cannot contain spaces. Use kebab-case (e.g., "my-plugin")',
  ge =
    "Icon file is not a usable SVG/PNG (unrecognised format, or an SVG with script, event handlers, foreignObject, animation, style or non-fragment references).",
  ne = 262144,
  me = 2097152,
  ye = 32,
  Se = 128,
  Ee = 20000,
  we = 1e5,
  Ae = 40000,
  on = 20,
  ie = 20,
  an = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]),
  ln = "__MACOSX",
  dn =
    "System files: this command reads the folder on disk. A plugin submitted from a git repository holds only what is committed there. For each file a finding names, run `git ls-files <file>`. If it prints nothing, the file is not committed and so is not submitted with the plugin; add its name to .gitignore. If it prints the file, remove it as the finding says. In CI, run --profile directory --strict on a fresh checkout; --strict also fails on the directory's other warnings.",
  X = 20000,
  ke = 32,
  $e = 32,
  j = 4096,
  K = 16,
  Y = 20,
  un = new Set(HOOK_EVENTS),
  cn = 3,
  xe = `	
\v\f\r \x85\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000`,
  fn = /[\t\n\v\f\r \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/,
  hn = /https?:\/\/[^ \t\n\f\r)<>"']+/,
  pn = /https?:\/\/[^ \t\n\f\r)<>"']+/g,
  gn = /privacy/i,
  mn = /\b(support|issues|bug reports?|contact)\b/i,
  yn = /\b(terms of service|terms of use|terms)\b/i,
  Sn = /\b(documentation|docs)\b/i,
  En =
    /<\s*(?:script|foreignobject|animate|animatemotion|animatetransform|set|discard|style|iframe|embed|object)\b/i,
  wn = /\son[a-z]+\s*=/i,
  An = /href\s*=\s*(?:["']\s*)?[^"'#\s>]/i;
/**
 * 校验用的插件根（无 manifest 且不在全局 .claude 时取解析路径）。
 */
//@ chunk-5aas12zq.js:6260-6384 placement
function getEffectivePluginRoot(e) {
  if (e.pluginRoot !== null) return e.pluginRoot;
  return e.manifest === null && !isInGlobalClaudeFolder(e.resolvedPath) ? e.resolvedPath : null;
}
//@ chunk-5aas12zq.js:6384-6432 placement = isInGlobalClaudeFolder (0.775)
function isInGlobalClaudeFolder(filePath) {
  return pathModule.basename(filePath) === ".claude";
}
/**
 * 校验插件目录：读取清单、检查 README/许可、组件文件与目录名，返回问题列表。
 */
//@ chunk-5aas12zq.js:6432-12701 placement
async function validatePluginDirectory(e) {
  let resolved = pathModule.resolve(e),
    t = await readPluginFileSafe(resolved, R, ONE_MIB),
    r = t.found && t.bytes !== void 0 ? detectJsonEncodingProblem(t.bytes) : void 0,
    s;
  try {
    s = !t.found || t.bytes === void 0 ? void 0 : jsonParse(Wo(t.bytes.toString("utf-8")));
  } catch {
    s = void 0;
  }
  let o = [],
    a = [],
    l = await preferPwdSpelling(resolved),
    d,
    f = () => (d ??= locateGitRepository(l)),
    p,
    S;
  if (isPlainObject(s)) {
    if (((p = s), r !== void 0))
      o.push({
        ...makeFinding("MANIFEST_INVALID_JSON", R, "json", `Invalid JSON syntax: ${r.error}`),
        fix: r.fix,
      });
    N(o, checkNonAsciiName(p.name, "written"));
  } else if (await isSkillsOnlyFolder(resolved))
    ((S = (await f()).kind === "parent" ? pathModule.basename(l) : ""),
      (p = S === "" ? {} : { name: S }),
      o.push(
        makeFinding(
          "MANIFEST_NOT_FOUND",
          R,
          "file",
          "No .claude-plugin/plugin.json. This folder holds a skills tree (skills/<name>/SKILL.md), which Claude Code loads without a manifest, so the directory accepts it as a plugin; anything else in it (agents/, commands/, hooks/, \u2026) is validated and loads with it." +
            (S === ""
              ? ""
              : ` It is listed as ${quoteForDisplay(S)}, the name of its folder, repository or marketplace entry.`),
        ),
      ),
      N(o, checkDerivedName(S)));
  else return null;
  let b = S === "";
  if (
    (S === void 0
      ? await readdir(pathModule.join(resolved, ".claude-plugin"), { withFileTypes: !0 }).catch(() => [])
      : []
    ).some((w) => w.name === "marketplace.json" && w.isFile())
  )
    a.push(MARKETPLACE_FOLDER_NOTE);
  let M = await readFirstDoc(resolved, ae, !1),
    L = He(p, "license") === "" && (await findFileCaseInsensitive(resolved)) === void 0,
    C = M === void 0 || L || S !== void 0 ? await f() : void 0,
    P = C?.kind === "parent" ? C.dir : void 0,
    x = M === void 0 ? await copyDir_2(resolved) : void 0,
    c = M ?? (P === void 0 || x !== void 0 ? void 0 : await readFirstDoc(P, toSorted, !0)),
    h = L && P !== void 0 ? await findFileCaseInsensitive(P) : void 0;
  if (x !== void 0)
    a.push(
      `${extractToolInputForTelemetry(x, 200)} in this folder is a symbolic link. These checks do not follow links and the directory drops them, so it does not count as the plugin's README, and a README at the repository root does not stand in for it. Replace the link with a regular file.`,
    );
  if (
    (N(
      a,
      describeLinkedReadme(C, pathModule.basename(l), S, {
        used: [...(c?.fromRepositoryRoot === !0 ? [c.displayPath] : []), ...(h === void 0 ? [] : [h])],
        notFound: [
          ...(c === void 0 && x === void 0 ? ["README"] : []),
          ...(L && h === void 0 ? ["license file"] : []),
        ],
      }),
    ),
    c === void 0)
  )
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
      if (c.words < ee)
        o.push({
          ...makeFinding(
            "README_TRIVIAL",
            c.displayPath,
            "",
            `${w} has ${c.words} words; at least ${ee} are required so the listing has a usable description.`,
          ),
          fix: `Add a few sentences on what the plugin does, how to use it and any setup it needs: at least ${ee} words in all.`,
        });
      let E = checkReadmeRenderable(c.text);
      if (E !== void 0)
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
  if (L && h === void 0)
    o.push(
      makeFinding(
        "LICENSE_MISSING",
        "LICENSE",
        "",
        "This plugin has no LICENSE file and plugin.json has no `license`. The directory requires one of them.",
      ),
    );
  N(o, await checkPluginIcon(resolved, p));
  let y = checkListingUrls(p, c?.text, o);
  N(o, checkScreenshotUrls(p, a));
  let m = await checkComponentFiles(resolved, p, o),
    v = groupFindingsByFileReason(m.unusable),
    J = m.leftOut.mcp.length > 0 || m.leftOut.hooks.length > 0,
    W = (J || v.length > 0) && !m.connectsToRemote && y.url === void 0,
    fe = [
      ...(m.leftOut.mcp.length > 0 ? ["MCP_FILE_UNREAD", "MCPJSON_UNPARSEABLE"] : []),
      ...(m.leftOut.hooks.length > 0 ? ["HOOKS_FILE_UNREAD"] : []),
      ...(J && W ? ["PRIVACY_URL_MISSING"] : []),
    ],
    U = [...fe];
  for (let { rules: rules } of v) for (let E of rules) if (!U.includes(E)) U.push(E);
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
      `These checks read at most ${K} of the files that plugin.json lists for MCP servers and ${K} of those it lists for hooks. Not checked at all: ${[Re(m.leftOut.mcp, "MCP servers"), Re(m.leftOut.hooks, "hooks")].filter((w) => w !== "").join("; ")}. For the files left out these directory rules are undecided: ${fe.join(", ")}. List at most ${K} files of each kind, or --profile directory fails the run${W ? `; and ${he}` : ""}.`,
    );
  for (let { file: file, reason: reason, todo: todo, rules: rules } of v)
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
      ),
      E = mapped.pop() ?? "",
      Z =
        mapped.length === 0
          ? `${E} names a hooks module`
          : `${mapped.join(", ")} and ${E} each name a hooks module`;
    a.push(
      `${Z} (a code file listed under \`modules\`). The plugin directory has rules of its own for such code, and these checks apply none of them, so passing here does not mean the directory accepts the plugin. The developer portal's own validation applies those rules.`,
    );
  }
  if (m.connectsToRemote && y.url === void 0)
    o.push(
      makeFinding(
        "PRIVACY_URL_MISSING",
        R,
        "privacyPolicyUrl",
        "This plugin connects to a remote MCP server or HTTP hook but declares no privacy policy URL (plugin.json `privacyPolicyUrl`, or a 'Privacy' link in README).",
      ),
    );
  else if (m.connectsToRemote && y.fromReadme)
    o.push({
      ...makeFinding(
        "PRIVACY_URL_MISSING",
        R,
        "privacyPolicyUrl",
        `Privacy policy URL taken from README (${extractToolInputForTelemetry(y.url ?? "", 1000)}); set \`privacyPolicyUrl\` in plugin.json to make it explicit.`,
      ),
      title: null,
      severity: "info",
      blocking: !1,
      fix: null,
    });
  let pe = await findOsMetadataFiles(resolved, a);
  return (
    N(o, pe.findings),
    {
      findings: dedupeFindings(o).toSorted(vn),
      notes: a,
      undecided: U,
      incomplete: U.length > 0 || pe.notSearched || b || m.hooksModuleFiles.length > 0,
    }
  );
}
//@ chunk-5aas12zq.js:12701-12887 placement
function groupFindingsByFileReason(e) {
  let n = new Map();
  for (let { rule: rule, ...r } of e) {
    let s = `${r.file}
${r.reason}`,
      o = n.get(s) ?? { ...r, rules: [] };
    if (!o.rules.includes(rule)) o.rules.push(rule);
    n.set(s, o);
  }
  return [...n.values()];
}
//@ chunk-5aas12zq.js:12887-13011 placement = formatFailureDetails (0.777)
function formatFailureDetails(e) {
  let mapped = e.slice(0, cn).map((r) => extractToolInputForTelemetry(r, 100)),
    remaining = e.length - mapped.length;
  return `${mapped.join(", ")}${remaining > 0 ? ` and ${remaining} more` : ""}`;
}
//@ chunk-5aas12zq.js:13011-13092 placement
function Re(e, n) {
  return e.length === 0 ? "" : `${e.length} listed for ${n} (${formatFailureDetails(e)})`;
}
/**
 * 保留会导致失败的问题码（error，strict 时含 warning）。
 */
//@ chunk-5aas12zq.js:13092-13217 placement
function filterBlockingIssueCodes(e, n) {
  return e.filter((t) => {
    let r = PLUGIN_VALIDATION_ISSUES[t];
    return !r.hold && (r.severity === "error" || (n.strict && r.severity === "warning"));
  });
}
//@ chunk-5aas12zq.js:13217-13310 placement
function Ht(e, n) {
  return e.some((t) => !t.hold && (t.blocking || (n.strict && t.severity === "warning")));
}
/**
 * 文件夹同时有市场 manifest 的说明与内部错误说明。
 */
//@ chunk-5aas12zq.js:13310-13672 placement
var MARKETPLACE_FOLDER_NOTE =
    "This folder also holds a marketplace manifest. The plugin directory treats such a folder as a plugin, so these checks cover only the plugin in this folder. To check another plugin that the marketplace lists, run validate on that plugin's folder.",
  INTERNAL_CHECK_FAILURE_NOTE =
    "The plugin directory checks did not run because of a problem inside this command, not in your plugin.";
//@ chunk-5aas12zq.js:13672-13835 placement
function formatDirectoryChecksHeading(e) {
  return `Plugin directory checks for ${extractToolInputForTelemetry(e, j)}. The plugin directory is the catalog that plugins are submitted to; this is a subset of what it runs.`;
}
//@ chunk-5aas12zq.js:13835-13890 placement
function Bt(e) {
  return [formatDirectoryChecksHeading(e), "", `${re_2.cross} ${INTERNAL_CHECK_FAILURE_NOTE}`, ""];
}
/**
 * 把插件目录检查结果格式化为多行文字：分别列出会导致目录拒绝提交的问题、警告与提示，附“关于这些检查”的说明； 没有发现时给出完成提示；这些检查不影响最终结果时提示如何启用严格模式。
 */
//@ chunk-5aas12zq.js:13890-15043 placement
function formatDirectoryCheckReport(pluginName, result, strictCommand) {
  let lines = [formatDirectoryChecksHeading(pluginName), ""],
    s = (d, f) => {
      if (f.length === 0) return;
      lines.push(d, "");
      for (let p of f) N(lines, checkUnreachableRules(p));
      lines.push("");
    },
    filtered = result.findings.filter((finding) => finding.blocking),
    filtered_2 = result.findings.filter((finding) => !finding.blocking && finding.severity !== "info"),
    filtered_3 = result.findings.filter((finding) => finding.severity === "info");
  if (
    (s(
      `${re_2.cross} Found ${filtered.length} ${plural(filtered.length, "problem")} the plugin directory refuses a submission for:`,
      filtered,
    ),
    s(
      `${re_2.warning} Found ${filtered_2.length} plugin directory ${plural(filtered_2.length, "warning")}:`,
      filtered_2,
    ),
    s(
      `${re_2.info} Found ${filtered_3.length} plugin directory ${plural(filtered_3.length, "note")}:`,
      filtered_3,
    ),
    result.notes.length > 0)
  ) {
    lines.push("About these checks:", "");
    for (let note of result.notes) lines.push(`  ${re_2.pointer} ${note}`);
    lines.push("");
  }
  if (result.findings.length === 0)
    lines.push(
      result.incomplete
        ? "These checks found nothing to report in what they looked at. The notes above say what they did not look at or apply."
        : `${re_2.tick} These checks found nothing to report`,
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
  return (
    lines.push("The directory also runs a safety scan and a policy review that this command does not.", ""),
    lines
  );
}
//@ chunk-5aas12zq.js:24816-24938 placement
function formatByteSize(e) {
  if (e > 0 && e % 1048576 === 0) return `${e / 1048576} MiB`;
  if (e > 0 && e % 1024 === 0) return `${e / 1024} KiB`;
  return `${e} bytes`;
}

export {
  ae,
  PLUGIN_VALIDATION_ISSUES,
  xe,
  X,
  R,
  sn,
  $e,
  j,
  pn,
  fn,
  hn,
  ne,
  Ae,
  we,
  Ee,
  Se,
  ye,
  tn,
  gn,
  mn,
  yn,
  Sn,
  on,
  rn,
  me,
  ge,
  En,
  wn,
  An,
  K,
  Y,
  un,
  ln,
  ke,
  an,
  formatFailureDetails,
  dn,
  ie,
};
