/**
 * services/plugins/pluginReadmeAdvice.ts
 *
 * 2.1.316 新增：插件 README 安装命令检查建议
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ca06bv0t.js (23)
 * attribution: placement 23
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  dirname,
  dirname as dirname_2,
  basename,
} from "path";
import { readdir } from "fs/promises";
import { isGithubDotCom } from "../../utils/git/githubUrl.js";
import { FF, ZB, readPluginFileSafe } from "../../utils/plugins/safeFileRead.js";
import { computeRemoteUrl_2 } from "../../utils/git/gitFilesystem.js";
import { parseGitRemote } from "../../utils/detectRepository.js";
import {
  memoizeInMap,
  MAX_PLUGIN_NAME_LENGTH,
  VALIDATE_MARKETPLACE_HINT,
  REPLACE_OWNER_REPO_HINT,
  README_SCAN_BYTES,
  readmeMissingInstallLine,
  OWNER_REPO_PLACEHOLDER,
} from "./pluginTag.js";
import { csn, sanitizeForDisplay, $Or } from "../../utils/plugins/validatePlugin.js";
import { isValidPluginIdSegment, PluginMarketplaceFileSchema } from "../../utils/plugins/schemas.js";
import { formatMarketplaceInstallCommand } from "../../commands/plugin/parseArgs.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { Wo } from "../../utils/json.js";
import { isFsInaccessible, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";

//@ chunk-ca06bv0t.js:17085-17211 placement = getCurrentRepoHttpsUrl (0.765)
function getCurrentRepoHttpsUrl({ host: host, owner: owner, name: i }) {
  let parsed = isGithubDotCom(host),
    included = host.includes(":");
  return parsed ? `${owner}/${i}` : included ? void 0 : `https://${host}/${owner}/${i}.git`;
}
//@ chunk-ca06bv0t.js:17211-17420 placement
async function repoHttpsUrlOf(r) {
  let n = join_4(r, ".git"),
    a = (await FF(n))
      ? await ZB(join_4(n, "config")).catch(() => {
          return;
        })
      : void 0,
    s = computeRemoteUrl_2(a ?? ""),
    p = /^(https|ssh):\/\//i.test(s) || !s.includes("://") ? parseGitRemote(s) : null;
  return p === null ? void 0 : getCurrentRepoHttpsUrl(p);
}
//@ chunk-ca06bv0t.js:17420-17559 placement
function trimPunctuation(r) {
  let mapped = r.split("").map((i) => !"`'\"()<>[]*.,;:!?".includes(i));
  return r.slice(mapped.findIndex(Boolean), mapped.findLastIndex(Boolean) + 1);
}
//@ chunk-ca06bv0t.js:17559-17611 placement
var ne = (r, n) => r.byName.has(n) || r.bySource.has(trimPunctuation(n));
//@ chunk-ca06bv0t.js:17679-17825 placement
var hasConcreteMarketplaceArg = (r) =>
  r.some((n, i) =>
    n.startsWith("--marketplace=")
      ? /^--marketplace=[^<>]+$/.test(n)
      : n === "--marketplace" && /^[^-<>][^<>]*$/.test(r[i + 1] ?? ""),
  );
//@ chunk-ca06bv0t.js:17825-17879 placement
var Ae = (r) =>
  r
    .split(/\s+/)
    .map(trimPunctuation)
    .filter((n) => n !== "");
//@ chunk-ca06bv0t.js:17879-17977 placement
var freeze = Object.freeze(["--marketplace", "--scope", "-s", "--config", "--accept-command", "--registry"]);
//@ chunk-ca06bv0t.js:17977-18053 placement
var Me = (r) => r.find((n, i) => !n.startsWith("-") && !freeze.includes(r[i - 1] ?? "")) ?? "";
//@ chunk-ca06bv0t.js:18053-18187 placement
function pluginNameFromSpec(r) {
  let n = r.find((s) => s.lastIndexOf("@") > 0) ?? "",
    index = n.indexOf("@");
  return index > 0 && n.length > index + 1 && !/[<>]/.test(n) ? n.slice(0, index) : "";
}
//@ chunk-ca06bv0t.js:18187-18368 placement
function readmeInstallCommands(r) {
  let mapped = r
    .split(
      `
`,
    )
    .flatMap((i) => i.split(/plugin[ \t]+(?:install|i)[ \t]+/).slice(1))
    .map(Ae);
  return {
    bySource: new Set(mapped.filter(hasConcreteMarketplaceArg).map(Me)),
    byName: new Set(mapped.map(pluginNameFromSpec)),
  };
}
//@ chunk-ca06bv0t.js:18368-18719 placement
async function listReadmeFiles(r) {
  let filtered = (await readdir(r, { withFileTypes: !0 }).catch(() => []))
      .filter((f) => f.isFile())
      .map((f) => f.name)
      .filter((f) => /^readme(\.[a-z0-9.-]+)?$/i.test(f)),
    i = filtered.find((f) => f.toLowerCase() === "readme.md") ?? filtered.toSorted()[0],
    a =
      i === void 0
        ? void 0
        : await ZB(join_5(r, i)).catch(() => {
            return;
          });
  return i !== void 0 && a !== void 0 ? { file: join_5(r, i), installs: readmeInstallCommands(a) } : void 0;
}
//@ chunk-ca06bv0t.js:18719-19025 placement
async function readmeAdviceForPlugin({ root: root, name: n, listing: listing }, a) {
  let s = await memoizeInMap(a.readmes, root, listReadmeFiles),
    f = listing?.entry !== void 0 && !csn(listing.root, root),
    p = f && listing.marketplace.plugins.length === 1,
    c = s !== void 0 && !ne(s.installs, n),
    h = f && (p || c) ? await memoizeInMap(a.readmes, listing.root, listReadmeFiles) : void 0;
  return [s, h].some((b) => b !== void 0 && ne(b.installs, n)) ? void 0 : (s ?? (p ? h : void 0));
}
//@ chunk-ca06bv0t.js:19025-19345 placement
async function pluginReadmeAdvice(r, n) {
  let { name: i, listing: listing } = r,
    f =
      i.length <= MAX_PLUGIN_NAME_LENGTH && isValidPluginIdSegment(i)
        ? await readmeAdviceForPlugin(r, n)
        : void 0;
  if (f === void 0) return [];
  let p = listing === void 0,
    c = p ? void 0 : await memoizeInMap(n.sources, listing.root, repoHttpsUrlOf),
    h = p ? [VALIDATE_MARKETPLACE_HINT] : c !== void 0 ? [] : [REPLACE_OWNER_REPO_HINT];
  return [
    {
      file: sanitizeForDisplay(f.file, README_SCAN_BYTES),
      message: sanitizeForDisplay([readmeMissingInstallLine(r), ...h].join(" "), README_SCAN_BYTES),
      installLine: sanitizeForDisplay(
        formatMarketplaceInstallCommand({ plugin: i, marketplaceSource: c ?? OWNER_REPO_PLACEHOLDER }),
        README_SCAN_BYTES,
      ),
    },
  ];
}
//@ chunk-ca06bv0t.js:19345-19531 placement
function formatAdviceLines(r) {
  return r.length === 0
    ? []
    : [
        `${re.info} Advice (does not change the verdict):`,
        "",
        ...r.flatMap((i) => [`  ${re.pointer} ${i.file}: ${i.message}`, `      ${i.installLine}`]),
        "",
      ];
}
//@ chunk-ca06bv0t.js:19531-19617 placement
var De = (r, n) =>
  r.reduce(async (i, a) => [...(await i), ...(await pluginReadmeAdvice(a, n))], Promise.resolve([]));
//@ chunk-ca06bv0t.js:19707-19802 placement
async function K(r, n) {
  let i = join_6(r, ".claude-plugin");
  return (await FF(i)) ? ((await ZB(join_6(i, n))) ?? "") : "";
}
//@ chunk-ca06bv0t.js:19802-19940 placement
async function readPluginJsonName(r) {
  try {
    let safeParse = u({ name: o() }).safeParse(jsonParse(Wo(await K(r, "plugin.json"))));
    return safeParse.success ? safeParse.data.name : void 0;
  } catch {
    return;
  }
}
//@ chunk-ca06bv0t.js:19972-19982 placement
var Te = 64;
//@ chunk-ca06bv0t.js:19982-20113 placement
async function readMarketplaceJson(r) {
  try {
    let safeParse = PluginMarketplaceFileSchema().safeParse(jsonParse(Wo(await K(r, "marketplace.json"))));
    return safeParse.success ? safeParse.data : void 0;
  } catch {
    return;
  }
}
/**
 * 读取 marketplace.json 下各插件的 README，检查是否给出了正确的安装命令，生成不影响结论的建议。
 */
//@ chunk-ca06bv0t.js:20113-20655 placement
async function marketplaceReadmeAdvice(r) {
  let n = await readMarketplaceJson(r),
    results = await Promise.all(
      (n?.plugins ?? [])
        .filter((p) => typeof p.source === "string")
        .slice(0, Te)
        .map(async (p) => {
          let { source: source } = p;
          return n !== void 0 &&
            typeof source === "string" &&
            !source.split(/[\\/]/).includes("..") &&
            (await readPluginFileSafe(r, resolve_3(r, source))) === "ok"
            ? [{ root: resolve_3(r, source), name: p.name, listing: { root: r, marketplace: n, entry: p } }]
            : [];
        }),
    ),
    a = (await readPluginJsonName(r)) ?? "",
    s = n?.plugins.find((p) => $Or(p, r, { root: r, name: a }));
  return n !== void 0 && !results.flat().some((p) => p.root === resolve_3(r))
    ? [...results.flat(), { root: r, name: s?.name ?? a, listing: { root: r, marketplace: n, entry: s } }]
    : results.flat();
}
//@ chunk-ca06bv0t.js:20655-20931 placement
async function collectReadmeAdvice(r, n, i) {
  let a = dirname_2(n?.filePath ?? ""),
    s = dirname_2(a),
    f = basename(a) === ".claude-plugin" && [n, ...i].every((h) => h?.errors.length === 0),
    p = f && n?.fileType === "plugin",
    m = f && n?.fileType === "marketplace" && csn(resolve_2(r), s) ? await marketplaceReadmeAdvice(s) : [];
  return p ? [{ root: s, name: (await readPluginJsonName(s)) ?? "", listing: void 0 }] : m;
}
//@ chunk-ca06bv0t.js:20931-20999 placement
function Ge(r) {
  return (isFsInaccessible(r) ? logForDebugging(`No install advice: ${errorMessage(r)}`) : logError(r), []);
}
//@ chunk-ca06bv0t.js:20999-21087 placement
var readmeAdviceFor = (r, n, i) =>
  collectReadmeAdvice(r, n, i)
    .then((a) => De(a, { readmes: new Map(), sources: new Map() }))
    .catch(Ge);

export { readmeAdviceFor, formatAdviceLines };
