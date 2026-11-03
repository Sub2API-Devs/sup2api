/**
 * utils/plugins/dependencyResolver.ts
 *
 * 并入已有模块：插件依赖解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/dependencyResolver.ts
 * pieces: chunk-czx62zen.js (39), chunk-e6aww6q8.js (1)
 * attribution: placement 16, callgraph-witnessed 1, layout 17, fingerprint 6
 */
import { win32 } from "path";
import { Re } from "../../../runtime/bun-runtime.js";
import { Vy } from "../../../vendor/semver/index.js";
import { getPlatform } from "../platform.js";
import { parsePluginIdentifier, isOfficialMarketplace, canonicalPluginId } from "./pluginIdentifier.js";
import { F } from "./pluginPolicy.js";
import { INLINE_PLUGIN_MARKETPLACE, SYNCED } from "../telemetry/pluginTelemetry.js";
import { isReservedMarketplaceName } from "./schemas.js";
import { logForDebugging } from "../debug.js";
import { printableLabel, printableName } from "../printableName.js";
import { runCommandHint } from "../worktreeResumeHint.js";
import { nfcLower, plural } from "../stringUtils.js";
import { gbr } from "../settings/marketplaceSettingsAliases.js";

//@ chunk-czx62zen.js:3092-3109 placement
var P = Re(Vy(), 1);
//@ chunk-czx62zen.js:3138-3175 placement
function edr(e, n) {
  return normalizeWindowsProjectPath(e) === normalizeWindowsProjectPath(n);
}
//@ chunk-czx62zen.js:3175-3231 placement
function j(e, n, o) {
  return e.scope === n && e.projectPath === o;
}
/**
 * 安装记录 scope 相同且项目路径相同。
 */
//@ chunk-czx62zen.js:3231-3366 placement
function isSameInstallScope(e, n, o) {
  if (e.scope !== n) return !1;
  if (e.projectPath === void 0 || o === void 0) return e.projectPath === o;
  return edr(e.projectPath, o);
}
//@ chunk-czx62zen.js:3366-3414 placement
function Umi(e, n, o) {
  return !j(e, n, o) && isSameInstallScope(e, n, o);
}
//@ chunk-czx62zen.js:3414-3476 placement
function qP(e, n, o) {
  let s = findInstallationIndex(e, n, o);
  return s >= 0 ? e?.[s] : void 0;
}
/**
 * 先精确匹配、再按 scope/项目路径找安装记录下标。
 */
//@ chunk-czx62zen.js:3476-3595 placement
function findInstallationIndex(e, n, o) {
  if (e === void 0) return -1;
  let index = e.findIndex((r) => j(r, n, o));
  return index >= 0 ? index : e.findIndex((r) => isSameInstallScope(r, n, o));
}
/**
 * 精确匹配的安装记录，否则退回按 scope 匹配的一条。
 */
//@ chunk-czx62zen.js:3595-3715 placement
function findMatchingInstallations(e, n, o) {
  let filtered = (e ?? []).filter((a) => j(a, n, o));
  if (filtered.length > 0) return filtered;
  let r = qP(e, n, o);
  return r === void 0 ? [] : [r];
}
//@ chunk-czx62zen.js:3715-3983 placement
function normalizeWindowsProjectPath(e) {
  if (
    getPlatform() !== "windows" ||
    /^\/(?!\/)/.test(e) ||
    /^[\\/]{2}[?.][\\/]/.test(e) ||
    /(^|[\\/])\.{1,2}([\\/]|$)/.test(e)
  )
    return e;
  let normalized = win32.normalize(e),
    o =
      normalized.length > win32.parse(normalized).root.length
        ? normalized.replace(/[\\/]+$/, "")
        : normalized;
  return /^[a-z]:/i.test(o) ? o[0].toLowerCase() + o.slice(1) : o;
}
/**
 * 读取 manifest.dependencies 中带 version 或 sha 的条目，返回 "名@市场"→{version, sha} 映射；没有则 undefined。
 */
//@ chunk-czx62zen.js:3983-4562 placement
function readManifestDependencyPins(e) {
  if (e === null || typeof e !== "object") return;
  let n = "dependencies" in e ? e.dependencies : void 0;
  if (!Array.isArray(n)) return;
  let o = new Map();
  for (let s of n) {
    if (s === null || typeof s !== "object") continue;
    let r = "name" in s ? s.name : void 0;
    if (typeof r !== "string" || r.length === 0) continue;
    let a = "version" in s && typeof s.version === "string" ? s.version : void 0,
      c = "sha" in s && typeof s.sha === "string" ? s.sha : void 0;
    if (a === void 0 && c === void 0) continue;
    let u = "marketplace" in s && typeof s.marketplace === "string" ? s.marketplace : void 0,
      l = u ? `${r}@${u}` : r;
    o.set(l, { version: a, sha: c });
  }
  return o.size > 0 ? o : void 0;
}
/**
 * 依赖引用补全市场：不带 @marketplace 的依赖名按声明它的插件所在市场补全（inline 等保留市场除外）。
 */
//@ chunk-czx62zen.js:4562-4673 callgraph-witnessed = qualifyDependency (1)
function qualifyDependency(dep, declaringPluginId) {
  if (parsePluginIdentifier(dep).marketplace) return dep;
  let mkt = parsePluginIdentifier(declaringPluginId).marketplace;
  if (!mkt || isOfficialMarketplace(mkt)) return dep;
  return `${dep}@${mkt}`;
}
/**
 * 依赖引用是否指向给定插件（名字相同且市场一致，或 inline/同步等效 ID）。
 */
//@ chunk-czx62zen.js:4673-4834 layout
function dependencyRefMatches(e, n, o) {
  let s = canonicalPluginId(e),
    r = parsePluginIdentifier(s),
    a = parsePluginIdentifier(n);
  if (!r.marketplace) return a.name === r.name || n === F(e);
  return (
    n === s ||
    (a.name === r.name && a.marketplace === INLINE_PLUGIN_MARKETPLACE) ||
    n === toSyncedDependencyId(s, o)
  );
}
//@ chunk-czx62zen.js:4834-4989 layout
function toSyncedDependencyId(e, n) {
  let { name: o, marketplace: marketplace } = parsePluginIdentifier(e);
  if (
    marketplace === void 0 ||
    isReservedMarketplaceName(marketplace.toLowerCase()) ||
    parsePluginIdentifier(n).marketplace !== SYNCED
  )
    return;
  let r = `${o}@${SYNCED}`;
  return r === n ? void 0 : r;
}
//@ chunk-czx62zen.js:4989-5007 layout
var MAX_CONSTRAINT_LENGTH = 1024,
  MAX_CONSTRAINTS_TOTAL_LENGTH = 4096;
//@ chunk-czx62zen.js:5007-5135 layout
function tooComplexConstraint(e) {
  return (
    logForDebugging(`intersectConstraints: ${e} \u2014 treating as too complex`, { level: "warn" }),
    { ok: !1, reason: "too-complex" }
  );
}
/**
 * 求多个 semver 范围约束的交集（依赖插件的 @^x 约束），过长或过复杂视为 too-complex，无交集为 disjoint。
 */
//@ chunk-czx62zen.js:5135-5944 layout
function intersectVersionConstraints(e) {
  if (e.length === 0) return { ok: !0, range: "*" };
  let n = 0;
  for (let c of e) n += c.length;
  if (n > MAX_CONSTRAINTS_TOTAL_LENGTH)
    return tooComplexConstraint(`total input ${n} chars > ${MAX_CONSTRAINTS_TOTAL_LENGTH}`);
  let o = [];
  for (let c of e) {
    let validRange = P.validRange(c);
    if (validRange === null) return { ok: !1, reason: "invalid" };
    o.push(
      validRange
        .split("||")
        .map((l) => l.trim())
        .filter(Boolean),
    );
  }
  let s = o[0] ?? [];
  if (s.length > MAX_CONSTRAINT_LENGTH)
    return tooComplexConstraint(
      `${s.length} conjuncts after 1/${e.length} inputs > ${MAX_CONSTRAINT_LENGTH}`,
    );
  for (let c = 1; c < o.length; c++) {
    let u = o[c] ?? [],
      l = s.length * u.length;
    if (l > MAX_CONSTRAINT_LENGTH)
      return tooComplexConstraint(
        `${l} conjuncts after ${c + 1}/${e.length} inputs > ${MAX_CONSTRAINT_LENGTH}`,
      );
    let f = [];
    for (let i of s) for (let d of u) f.push(`${i} ${d}`);
    s = f;
  }
  let filtered = s.filter((c) => {
    let validRange = P.validRange(c);
    return validRange !== null && P.minVersion(validRange) !== null;
  });
  if (filtered.length === 0) return { ok: !1, reason: "disjoint" };
  let validRange = P.validRange(filtered.join(" || "));
  return validRange === null ? { ok: !1, reason: "disjoint" } : { ok: !0, range: validRange };
}
//@ chunk-czx62zen.js:5944-5954 layout
var MAX_CONSTRAINT_DISPLAY = 200;
//@ chunk-czx62zen.js:5954-6054 layout
function displayVersionRange(e) {
  return /^[\x20-\x7e]+$/.test(e) && P.validRange(e) !== null
    ? e
    : printableLabel(printableName(e, 64)) || "\u201C\u201D";
}
//@ chunk-czx62zen.js:6054-6150 layout
function displayVersion(e) {
  return /^[0-9A-Za-z][0-9A-Za-z.+-]{0,63}$/.test(e)
    ? e
    : printableLabel(printableName(e, 64)) || "\u201C\u201D";
}
//@ chunk-czx62zen.js:6150-6343 layout
function truncateForDisplay(e) {
  if (e.length <= MAX_CONSTRAINT_DISPLAY) return e;
  let sliced = e.slice(0, MAX_CONSTRAINT_DISPLAY),
    o =
      sliced.lastIndexOf("\u201C") > sliced.lastIndexOf("\u201D")
        ? sliced.slice(0, sliced.lastIndexOf("\u201C"))
        : sliced;
  return `${o}\u2026 (+${e.length - o.length} chars)`;
}
/**
 * 依赖版本约束冲突的说明文本（disjoint、too-complex、无匹配 tag 等）。
 */
//@ chunk-czx62zen.js:6343-6960 layout
function describeConstraintConflict(e, n, o, s, r, a) {
  let c = truncateForDisplay(o.map(displayVersionRange).join(", ")),
    u = quoteName(displaySafePluginId(n));
  switch (s) {
    case "disjoint":
      return `${e} ${u} has conflicting version requirements (no version satisfies all of: ${c})`;
    case "too-complex":
      return `${e} ${u} has version requirements too complex to intersect \u2014 simplify the ranges: ${c}`;
    case "invalid":
      return `${e} ${u} has an invalid version requirement among: ${c}`;
    case "installed-unsatisfied":
      return `${e} ${u} is installed at ${r === void 0 ? "an unknown version" : displayVersion(r)}, which does not satisfy: ${c}${a ? `. To look for a version in range, ${runCommandHint("plugin update", n, { fallback: "update that plugin" })}` : ""}`;
  }
}
/**
 * “插件没有满足约束的 git tag”的说明。
 */
//@ chunk-czx62zen.js:6960-7053 layout
function noMatchingTagMessage(e, n, o) {
  let s = truncateForDisplay(displayVersionRange(o));
  return `${e} ${quoteName(displaySafePluginId(n))} has no git tag satisfying ${s}`;
}
/**
 * 版本字符串（可 coerce）是否满足 semver 范围。
 */
//@ chunk-czx62zen.js:7053-7146 layout
function versionSatisfies(e, n) {
  let o = P.valid(e) ?? P.coerce(e)?.version;
  return o !== void 0 && P.satisfies(o, n);
}
/**
 * 收集所有已加载插件对某依赖 ID 的版本约束。
 */
//@ chunk-czx62zen.js:7146-7322 layout
function collectConstraintsOn(e, n) {
  let o = [];
  for (let s of n) {
    if (!s.depConstraints) continue;
    for (let [r, a] of s.depConstraints)
      if (qualifyDependency(r, s.source) === e) {
        o.push({ plugin: s, constraint: a });
        break;
      }
  }
  return o;
}
/**
 * 解析安装一个插件需要的依赖闭包（DFS）：跨市场依赖只在根市场 allowCrossMarketplaceDependenciesOn 允许时接受；检测环；已安装的跳过。返回按安装顺序的 ID 列表或错误。
 */
//@ chunk-czx62zen.js:7322-8079 fingerprint = resolveDependencyClosure (0.846)
async function resolveDependencyClosure(e, n, o, s = new Set(), r) {
  let rootMarketplace = parsePluginIdentifier(e).marketplace,
    c = [],
    visited = new Set(),
    l = [];
  async function walk(id, requiredBy) {
    if (id !== e && o.has(id) && !r?.has(id)) return null;
    let idMarketplace = parsePluginIdentifier(id).marketplace;
    if (!o.has(id) && idMarketplace !== rootMarketplace && !(idMarketplace && s.has(idMarketplace)))
      return { ok: !1, reason: "cross-marketplace", dependency: id, requiredBy: requiredBy };
    if (l.includes(id)) return { ok: !1, reason: "cycle", chain: [...l, id] };
    if (visited.has(id)) return null;
    visited.add(id);
    let entry = await n(id);
    if (!entry) {
      if (id !== e && o.has(id))
        return (
          logForDebugging(
            `resolveDependencyClosure: force-included ${id} has no catalog entry; skipping (pinner stays demoted)`,
          ),
          null
        );
      return { ok: !1, reason: "not-found", missing: id, requiredBy: requiredBy };
    }
    l.push(id);
    for (let rawDep of entry.dependencies ?? []) {
      let dep = qualifyDependency(rawDep, id),
        err = await walk(dep, id);
      if (err) return err;
    }
    return (l.pop(), c.push(id), null);
  }
  let err = await walk(e, e);
  if (err) return err;
  return { ok: !0, closure: c };
}
/**
 * 加载后的依赖校验：反复把依赖未满足（找不到、未启用、版本约束不符）的启用插件降级为禁用，直到不动点；返回被降级集合与 dependency-unsatisfied 错误。
 */
//@ chunk-czx62zen.js:8079-9787 fingerprint = verifyAndDemote (0.749)
function verifyAndDemote(plugins) {
  let known = new Set(plugins.map((i) => i.source)),
    enabled = new Set(plugins.filter((i) => i.enabled).map((i) => i.source)),
    knownByName = new Map(plugins.map((i) => [i.source, i])),
    r = new Set(plugins.map((i) => parsePluginIdentifier(i.source).name)),
    enabledByName = new Map();
  for (let id of enabled) {
    let d = parsePluginIdentifier(id).name;
    enabledByName.set(d, (enabledByName.get(d) ?? 0) + 1);
  }
  let errors = [],
    u = !0;
  while (u) {
    u = !1;
    for (let i of plugins) {
      if (!enabled.has(i.source)) continue;
      for (let rawDep of i.manifest.dependencies ?? []) {
        let g = canonicalPluginId(qualifyDependency(rawDep, i.source)),
          p = !parsePluginIdentifier(g).marketplace,
          b = p ? F(g) : void 0,
          h = p ? void 0 : `${parsePluginIdentifier(g).name}@${INLINE_PLUGIN_MARKETPLACE}`,
          S = h !== void 0 && !enabled.has(g) && enabled.has(h),
          dep = toSyncedDependencyId(g, i.source),
          w = dep !== void 0 && !enabled.has(g) && !S && enabled.has(dep),
          M = p
            ? (enabledByName.get(g) ?? 0) > 0 || (b !== void 0 && enabled.has(b))
            : enabled.has(g) || S || w,
          k;
        if (!M) {
          let m = h !== void 0 && !known.has(g) && known.has(h),
            x = dep !== void 0 && !known.has(g) && !m && known.has(dep);
          k = {
            type: "dependency-unsatisfied",
            source: i.source,
            plugin: i.name,
            dependency: m ? h : x ? dep : g,
            reason: (p ? r.has(g) || (b !== void 0 && known.has(b)) : known.has(g) || m || x)
              ? "not-enabled"
              : "not-found",
          };
        } else if (!p && !S) {
          let m = i.depConstraints?.get(rawDep)?.version;
          if (m !== void 0) {
            let x = w ? dep : g,
              v = knownByName.get(x),
              N = v?.resolvedVersion ?? v?.manifest.version;
            if (!(w && N === void 0) && !versionSatisfies(N, m))
              k = {
                type: "dependency-version-unsatisfied",
                source: i.source,
                plugin: i.name,
                dependency: x,
                required: m,
                installed: N,
              };
          }
        }
        if (k) {
          enabled.delete(i.source);
          let m = parsePluginIdentifier(i.source).name,
            x = enabledByName.get(m) ?? 0;
          if (x <= 1) enabledByName.delete(m);
          else enabledByName.set(m, x - 1);
          (errors.push(k), (u = !0));
          break;
        }
      }
    }
  }
  let demoted = new Set(plugins.filter((i) => i.enabled && !enabled.has(i.source)).map((i) => i.source)),
    f = new Map();
  for (let i of enabled) {
    let { name: d, marketplace: marketplace } = parsePluginIdentifier(i);
    if (marketplace === SYNCED) f.set(nfcLower(d), i);
  }
  return {
    demoted: demoted,
    errors: errors.map((i) => {
      if (i.type !== "dependency-unsatisfied" || i.reason !== "not-found") return i;
      let { name: d, marketplace: marketplace } = parsePluginIdentifier(i.dependency),
        p =
          marketplace === void 0 ||
          isReservedMarketplaceName(marketplace.toLowerCase()) ||
          parsePluginIdentifier(i.source).marketplace === SYNCED
            ? void 0
            : f.get(nfcLower(d));
      return p === void 0 ? i : { ...i, sameNameSyncedPlugin: p };
    }),
  };
}
/**
 * 反向依赖插件名列表。
 */
//@ chunk-czx62zen.js:9787-9836 layout
function findReverseDependentNames(e, n) {
  return findReverseDependents(e, n).map((o) => o.name);
}
/**
 * 找出依赖给定插件的已启用插件（反向依赖），用于禁用/卸载时警告。
 */
//@ chunk-czx62zen.js:9836-9971 fingerprint = findReverseDependents (0.826)
function findReverseDependents(pluginId, plugins) {
  return plugins.filter(
    (o) =>
      o.enabled &&
      o.source !== pluginId &&
      (o.manifest.dependencies ?? []).some((s) =>
        dependencyRefMatches(qualifyDependency(s, o.source), pluginId, o.source),
      ),
  );
}
/**
 * 递归收集反向依赖（深度优先，去重）。
 */
//@ chunk-czx62zen.js:9971-10110 placement
function collectTransitiveDependents(e, n) {
  let o = new Set([e]),
    s = [],
    r = (a) => {
      for (let { source: source } of findReverseDependents(a, n)) {
        if (o.has(source)) continue;
        (o.add(source), r(source), s.push(source));
      }
    };
  return (r(e), s);
}
//@ chunk-czx62zen.js:10110-10157 placement
function mO(e) {
  return e === !0 || Array.isArray(e);
}
/**
 * 在某作用域已安装插件里找"作为依赖自动安装、但已没有显式安装插件需要"的孤儿：先确认都能加载（否则返回 unloadable），再从显式安装的插件沿 manifest.dependencies 做可达性遍历。返回 {orphans, unloadable, autoCount}。
 */
//@ chunk-czx62zen.js:10267-10903 placement
function findOrphanedAutoDependencies(e, n, o, s) {
  let r = new Set(),
    a = new Set();
  for (let [d, g] of Object.entries(e)) {
    let p = qP(g, o, s);
    if (!p) continue;
    if (p.auto === !0) a.add(d);
    else r.add(d);
  }
  if (a.size === 0) return { orphans: new Set(), unloadable: [], autoCount: 0 };
  let c = new Map(n.map((d) => [d.source, d])),
    u = [];
  for (let d of [...r, ...a]) if (!c.has(d)) u.push(d);
  if (u.length > 0) return { orphans: new Set(), unloadable: u, autoCount: a.size };
  let l = new Set();
  function f(d) {
    if (l.has(d)) return;
    l.add(d);
    let g = c.get(d);
    if (!g) return;
    for (let p of g.manifest.dependencies ?? []) f(qualifyDependency(p, g.source));
  }
  for (let d of r) f(d);
  let i = new Set();
  for (let d of a) if (!l.has(d)) i.add(d);
  return { orphans: i, unloadable: [], autoCount: a.size };
}
/**
 * 生成提示 "N auto-installed dependencies no longer needed: …. Run claude plugin prune [--scope s] to remove."（最多列 5 个）。
 */
//@ chunk-czx62zen.js:10903-11225 placement
function formatOrphanedDependenciesNotice(e, n) {
  if (e.size === 0) return "";
  let mapped = [...e].map((c) => displaySafeName(parsePluginIdentifier(c).name)),
    s = 5,
    r = mapped.length <= s ? mapped.join(", ") : `${mapped.slice(0, s).join(", ")}, \u2026`,
    a = n === "user" ? "" : ` --scope ${n}`;
  return `
${e.size} auto-installed ${plural(e.size, "dependency", "dependencies")} no longer needed: ${r}. Run \`claude plugin prune${a}\` to remove.`;
}
//@ chunk-czx62zen.js:11225-11281 placement
var SAFE_DISPLAY_NAME_RE = /^[A-Za-z0-9][-A-Za-z0-9._]*$/,
  Pe = 64,
  bJr = 256,
  E = 5;
/**
 * 名字展示安全化：合规短名原样，否则截断并去掉不可见字符。
 */
//@ chunk-czx62zen.js:11281-11380 placement
function displaySafeName(e, n = Pe) {
  return e.length <= n && SAFE_DISPLAY_NAME_RE.test(e)
    ? e
    : printableLabel(printableName(e.replace(gbr, ""), 64)) || "\u201C\u201D";
}
/**
 * 插件 ID 展示安全化（name@marketplace 两段分别处理）。
 */
//@ chunk-czx62zen.js:11380-11507 layout
function displaySafePluginId(e) {
  let { name: n, marketplace: marketplace } = parsePluginIdentifier(e);
  if (marketplace === void 0) return displaySafeName(n);
  return `${n}@${marketplace}` === e
    ? `${displaySafeName(n)}@${displaySafeName(marketplace)}`
    : displaySafeName(e);
}
/**
 * 给名字加引号用于提示文案（已以弯引号开头的不重复加）。
 */
//@ chunk-czx62zen.js:11507-11564 layout
function quoteName(e) {
  return e.startsWith("\u201C") ? e : `"${e}"`;
}
/**
 * 生成“（并安装了 N 个依赖：a, b…）”后缀文本。
 */
//@ chunk-czx62zen.js:11564-11767 fingerprint = formatDependencyCountSuffix (0.804)
function formatDependencyCountSuffix(installedDeps) {
  if (installedDeps.length === 0) return "";
  let n = installedDeps.length,
    mapped = installedDeps.slice(0, E).map((r) => displaySafeName(parsePluginIdentifier(r).name)),
    s = n <= E ? mapped.join(", ") : `${mapped.join(", ")}, \u2026`;
  return ` (+ ${n} ${plural(n, "dependency", "dependencies")}: ${s})`;
}
/**
 * 依赖找不到时的提示（“marketplace X 是否已添加？”）。
 */
//@ chunk-czx62zen.js:11767-12170 layout
function missingDependenciesHint(e, n) {
  if (e.length === 0) return "";
  let o = e.length,
    found = n.map((u) => parsePluginIdentifier(u).marketplace).find((u) => u !== void 0),
    r =
      found !== void 0
        ? ` Is the ${quoteName(displaySafeName(found, bJr))} marketplace added?`
        : n.length > 0
          ? " Add the dependency's marketplace, then re-run install."
          : "",
    joined = e.slice(0, E).map(displaySafePluginId).join(", "),
    c = o <= E ? `${joined}.` : `${joined} and ${o - E} more.`;
  return ` \u2014 ${o} ${plural(o, "dependency", "dependencies")} still unresolved: ${c}${r}`;
}
/**
 * 生成“ — warning: required by …”后缀文本。
 */
//@ chunk-czx62zen.js:12170-12277 fingerprint = formatReverseDependentsSuffix (1)
function formatReverseDependentsSuffix(rdeps) {
  if (!rdeps || rdeps.length === 0) return "";
  return ` \u2014 warning: required by ${rdeps.map(displaySafePluginId).join(", ")}`;
}
/**
 * 构造把一组插件 ID 全部设为 false 的 enabledPlugins 补丁。
 */
//@ chunk-e6aww6q8.js:4320708-4320786 fingerprint = getEnabledPluginIdsForScope (0.707)
function getEnabledPluginIdsForScope(settingSource) {
  return { enabledPlugins: Object.fromEntries(settingSource.map((n) => [n, !1])) };
}

export {
  findOrphanedAutoDependencies,
  formatOrphanedDependenciesNotice,
  qP,
  isSameInstallScope,
  intersectVersionConstraints,
  describeConstraintConflict,
  noMatchingTagMessage,
  mO,
  findMatchingInstallations,
  findReverseDependentNames,
  formatReverseDependentsSuffix,
  collectTransitiveDependents,
  collectConstraintsOn,
  readManifestDependencyPins,
  verifyAndDemote,
  formatDependencyCountSuffix,
  toSyncedDependencyId,
  qualifyDependency,
  getEnabledPluginIdsForScope,
  dependencyRefMatches,
  edr,
  Umi,
  findInstallationIndex,
  displaySafePluginId,
  quoteName,
  displaySafeName,
  bJr,
  versionSatisfies,
  resolveDependencyClosure,
  missingDependenciesHint,
};
