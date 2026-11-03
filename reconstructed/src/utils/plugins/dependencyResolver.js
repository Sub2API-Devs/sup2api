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
import { require_semver_3 } from "../../../vendor/semver/index.js";
import { getPlatform } from "../platform.js";
import { parsePluginIdentifier, isOfficialMarketplace, canonicalPluginId } from "./pluginIdentifier.js";
import { builtinQualifiedId } from "./pluginPolicy.js";
import { INLINE_PLUGIN_MARKETPLACE, SYNCED } from "../telemetry/pluginTelemetry.js";
import { isReservedMarketplaceName } from "./schemas.js";
import { logForDebugging } from "../debug.js";
import { printableLabel, printableName } from "../printableName.js";
import { runCommandHint } from "../worktreeResumeHint.js";
import { nfcLower, plural } from "../stringUtils.js";
import { LEADING_INVISIBLE_TEXT_RE } from "../settings/marketplaceSettingsAliases.js";

//@ chunk-czx62zen.js:3092-3109 placement
var semverModule = Re(require_semver_3(), 1);
//@ chunk-czx62zen.js:3138-3175 placement
/**
 * isSameNormalizedProjectPath：Windows 项目路径规范化后相同。
 */
function isSameNormalizedProjectPath(projectPath, n) {
  return normalizeWindowsProjectPath(projectPath) === normalizeWindowsProjectPath(n);
}
//@ chunk-czx62zen.js:3175-3231 placement
function isSameInstallTarget(e, n, o) {
  return e.scope === n && e.projectPath === o;
}
//@ chunk-czx62zen.js:3231-3366 placement
/**
 * 安装记录 scope 相同且项目路径相同。
 */
function isSameInstallScope(e, n, o) {
  if (e.scope !== n) return false;
  if (e.projectPath === undefined || o === undefined) return e.projectPath === o;
  return isSameNormalizedProjectPath(e.projectPath, o);
}
//@ chunk-czx62zen.js:3366-3414 placement
/**
 * isStaleInstallTarget：作用域相同但记录不同。
 */
function isStaleInstallTarget(e, scope, originalCwd) {
  return !isSameInstallTarget(e, scope, originalCwd) && isSameInstallScope(e, scope, originalCwd);
}
//@ chunk-czx62zen.js:3414-3476 placement
/**
 * installationAtTarget：取某作用域/项目的安装记录。
 */
function installationAtTarget(e, n, o) {
  let installationIndex = findInstallationIndex(e, n, o);
  return installationIndex >= 0 ? e?.[installationIndex] : undefined;
}
//@ chunk-czx62zen.js:3476-3595 placement
/**
 * 先精确匹配、再按 scope/项目路径找安装记录下标。
 */
function findInstallationIndex(e, n, o) {
  if (e === undefined) return -1;
  let index = e.findIndex((r) => isSameInstallTarget(r, n, o));
  return index >= 0 ? index : e.findIndex((r) => isSameInstallScope(r, n, o));
}
//@ chunk-czx62zen.js:3595-3715 placement
/**
 * 精确匹配的安装记录，否则退回按 scope 匹配的一条。
 */
function findMatchingInstallations(e, n, o) {
  let filtered = (e ?? []).filter((a) => isSameInstallTarget(a, n, o));
  if (filtered.length > 0) return filtered;
  let r = installationAtTarget(e, n, o);
  return r === undefined ? [] : [r];
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
  let normalized = win32.normalize(e);
  let o =
    normalized.length > win32.parse(normalized).root.length ? normalized.replace(/[\\/]+$/, "") : normalized;
  return /^[a-z]:/i.test(o) ? o[0].toLowerCase() + o.slice(1) : o;
}
//@ chunk-czx62zen.js:3983-4562 placement
/**
 * 读取 manifest.dependencies 中带 version 或 sha 的条目，返回 "名@市场"→{version, sha} 映射；没有则 undefined。
 */
function readManifestDependencyPins(rawCandidate) {
  if (rawCandidate === null || typeof rawCandidate !== "object") return;
  let dependencies = "dependencies" in rawCandidate ? rawCandidate.dependencies : undefined;
  if (!Array.isArray(dependencies)) return;
  let o = new Map();
  for (let dependency of dependencies) {
    if (dependency === null || typeof dependency !== "object") continue;
    let r = "name" in dependency ? dependency.name : undefined;
    if (typeof r !== "string" || r.length === 0) continue;
    let version =
      "version" in dependency && typeof dependency.version === "string" ? dependency.version : undefined;
    let sha = "sha" in dependency && typeof dependency.sha === "string" ? dependency.sha : undefined;
    if (version === undefined && sha === undefined) continue;
    let marketplace =
      "marketplace" in dependency && typeof dependency.marketplace === "string"
        ? dependency.marketplace
        : undefined;
    let l = marketplace ? `${r}@${marketplace}` : r;
    o.set(l, {
      version,
      sha,
    });
  }
  return o.size > 0 ? o : undefined;
}
//@ chunk-czx62zen.js:4562-4673 callgraph-witnessed = qualifyDependency (1)
/**
 * 依赖引用补全市场：不带 @marketplace 的依赖名按声明它的插件所在市场补全（inline 等保留市场除外）。
 */
function qualifyDependency(dep, declaringPluginId) {
  if (parsePluginIdentifier(dep).marketplace) return dep;
  let mkt = parsePluginIdentifier(declaringPluginId).marketplace;
  if (!mkt || isOfficialMarketplace(mkt)) return dep;
  return `${dep}@${mkt}`;
}
//@ chunk-czx62zen.js:4673-4834 layout
/**
 * 依赖引用是否指向给定插件（名字相同且市场一致，或 inline/同步等效 ID）。
 */
function dependencyRefMatches(e, n, source) {
  let s = canonicalPluginId(e);
  let pluginIdentifier = parsePluginIdentifier(s);
  let pluginIdentifier_2 = parsePluginIdentifier(n);
  if (!pluginIdentifier.marketplace)
    return pluginIdentifier_2.name === pluginIdentifier.name || n === builtinQualifiedId(e);
  return (
    n === s ||
    (pluginIdentifier_2.name === pluginIdentifier.name &&
      pluginIdentifier_2.marketplace === INLINE_PLUGIN_MARKETPLACE) ||
    n === toSyncedDependencyId(s, source)
  );
}
//@ chunk-czx62zen.js:4834-4989 layout
function toSyncedDependencyId(e, n) {
  let { name: o, marketplace } = parsePluginIdentifier(e);
  if (
    marketplace === undefined ||
    isReservedMarketplaceName(marketplace.toLowerCase()) ||
    parsePluginIdentifier(n).marketplace !== SYNCED
  )
    return;
  let r = `${o}@${SYNCED}`;
  return r === n ? undefined : r;
}
//@ chunk-czx62zen.js:4989-5007 layout
var MAX_CONSTRAINT_LENGTH = 1024;
var MAX_CONSTRAINTS_TOTAL_LENGTH = 4096;
//@ chunk-czx62zen.js:5007-5135 layout
function tooComplexConstraint(e) {
  logForDebugging(`intersectConstraints: ${e} \u2014 treating as too complex`, {
    level: "warn",
  });
  return {
    ok: false,
    reason: "too-complex",
  };
}
//@ chunk-czx62zen.js:5135-5944 layout
/**
 * 求多个 semver 范围约束的交集（依赖插件的 @^x 约束），过长或过复杂视为 too-complex，无交集为 disjoint。
 */
function intersectVersionConstraints(e) {
  if (e.length === 0)
    return {
      ok: true,
      range: "*",
    };
  let n = 0;
  for (let c of e) n += c.length;
  if (n > MAX_CONSTRAINTS_TOTAL_LENGTH)
    return tooComplexConstraint(`total input ${n} chars > ${MAX_CONSTRAINTS_TOTAL_LENGTH}`);
  let o = [];
  for (let c of e) {
    let u = semverModule.validRange(c);
    if (u === null)
      return {
        ok: false,
        reason: "invalid",
      };
    o.push(
      u
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
  for (let k = 1; k < o.length; k++) {
    let u = o[k] ?? [];
    let l = s.length * u.length;
    if (l > MAX_CONSTRAINT_LENGTH)
      return tooComplexConstraint(
        `${l} conjuncts after ${k + 1}/${e.length} inputs > ${MAX_CONSTRAINT_LENGTH}`,
      );
    let f = [];
    for (let i of s) for (let d of u) f.push(`${i} ${d}`);
    s = f;
  }
  let filtered = s.filter((c) => {
    let u = semverModule.validRange(c);
    return u !== null && semverModule.minVersion(u) !== null;
  });
  if (filtered.length === 0)
    return {
      ok: false,
      reason: "disjoint",
    };
  let a = semverModule.validRange(filtered.join(" || "));
  return a === null
    ? {
        ok: false,
        reason: "disjoint",
      }
    : {
        ok: true,
        range: a,
      };
}
//@ chunk-czx62zen.js:5944-5954 layout
var MAX_CONSTRAINT_DISPLAY = 200;
//@ chunk-czx62zen.js:5954-6054 layout
function displayVersionRange(e) {
  return /^[\x20-\x7e]+$/.test(e) && semverModule.validRange(e) !== null
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
  let sliced = e.slice(0, MAX_CONSTRAINT_DISPLAY);
  let o =
    sliced.lastIndexOf("\u201C") > sliced.lastIndexOf("\u201D")
      ? sliced.slice(0, sliced.lastIndexOf("\u201C"))
      : sliced;
  return `${o}\u2026 (+${e.length - o.length} chars)`;
}
//@ chunk-czx62zen.js:6343-6960 layout
/**
 * 依赖版本约束冲突的说明文本（disjoint、too-complex、无匹配 tag 等）。
 */
function describeConstraintConflict(e, n, ranges, s, installed, suggestDependencyUpdate) {
  let c = truncateForDisplay(ranges.map(displayVersionRange).join(", "));
  let u = quoteName(displaySafePluginId(n));
  switch (s) {
    case "disjoint":
      return `${e} ${u} has conflicting version requirements (no version satisfies all of: ${c})`;
    case "too-complex":
      return `${e} ${u} has version requirements too complex to intersect \u2014 simplify the ranges: ${c}`;
    case "invalid":
      return `${e} ${u} has an invalid version requirement among: ${c}`;
    case "installed-unsatisfied":
      return `${e} ${u} is installed at ${installed === undefined ? "an unknown version" : displayVersion(installed)}, which does not satisfy: ${c}${
        suggestDependencyUpdate
          ? `. To look for a version in range, ${runCommandHint("plugin update", n, {
              fallback: "update that plugin",
            })}`
          : ""
      }`;
  }
}
//@ chunk-czx62zen.js:6960-7053 layout
/**
 * “插件没有满足约束的 git tag”的说明。
 */
function noMatchingTagMessage(e, n, range) {
  let s = truncateForDisplay(displayVersionRange(range));
  return `${e} ${quoteName(displaySafePluginId(n))} has no git tag satisfying ${s}`;
}
//@ chunk-czx62zen.js:7053-7146 layout
/**
 * 版本字符串（可 coerce）是否满足 semver 范围。
 */
function versionSatisfies(e, n) {
  let o = semverModule.valid(e) ?? semverModule.coerce(e)?.version;
  return o !== undefined && semverModule.satisfies(o, n);
}
//@ chunk-czx62zen.js:7146-7322 layout
/**
 * 收集所有已加载插件对某依赖 ID 的版本约束。
 */
function collectConstraintsOn(e, n) {
  let o = [];
  for (let s of n) {
    if (!s.depConstraints) continue;
    for (let [r, a] of s.depConstraints)
      if (qualifyDependency(r, s.source) === e) {
        o.push({
          plugin: s,
          constraint: a,
        });
        break;
      }
  }
  return o;
}
//@ chunk-czx62zen.js:7322-8079 fingerprint = resolveDependencyClosure (0.846)
/**
 * 解析安装一个插件需要的依赖闭包（DFS）：跨市场依赖只在根市场 allowCrossMarketplaceDependenciesOn 允许时接受；检测环；已安装的跳过。返回按安装顺序的 ID 列表或错误。
 */
async function resolveDependencyClosure(
  rootId,
  lookup,
  alreadyEnabled,
  allowedCrossMarketplaces = new Set(),
  r,
) {
  let rootMarketplace = parsePluginIdentifier(rootId).marketplace;
  let closure = [];
  let visited = new Set();
  let stack = [];
  async function walk(id, requiredBy) {
    if (id !== rootId && alreadyEnabled.has(id) && !r?.has(id)) return null;
    let idMarketplace = parsePluginIdentifier(id).marketplace;
    if (
      !alreadyEnabled.has(id) &&
      idMarketplace !== rootMarketplace &&
      !(idMarketplace && allowedCrossMarketplaces.has(idMarketplace))
    )
      return {
        ok: false,
        reason: "cross-marketplace",
        dependency: id,
        requiredBy,
      };
    if (stack.includes(id))
      return {
        ok: false,
        reason: "cycle",
        chain: [...stack, id],
      };
    if (visited.has(id)) return null;
    visited.add(id);
    let entry = await lookup(id);
    if (!entry) {
      if (id !== rootId && alreadyEnabled.has(id)) {
        logForDebugging(
          `resolveDependencyClosure: force-included ${id} has no catalog entry; skipping (pinner stays demoted)`,
        );
        return null;
      }
      return {
        ok: false,
        reason: "not-found",
        missing: id,
        requiredBy,
      };
    }
    stack.push(id);
    for (let rawDep of entry.dependencies ?? []) {
      let dep = qualifyDependency(rawDep, id);
      let err = await walk(dep, id);
      if (err) return err;
    }
    stack.pop();
    closure.push(id);
    return null;
  }
  let err = await walk(rootId, rootId);
  if (err) return err;
  return {
    ok: true,
    closure,
  };
}
//@ chunk-czx62zen.js:8079-9787 fingerprint = verifyAndDemote (0.749)
/**
 * 加载后的依赖校验：反复把依赖未满足（找不到、未启用、版本约束不符）的启用插件降级为禁用，直到不动点；返回被降级集合与 dependency-unsatisfied 错误。
 */
function verifyAndDemote(plugins) {
  let known = new Set(plugins.map((plugin) => plugin.source));
  let enabled = new Set(plugins.filter((plugin) => plugin.enabled).map((plugin) => plugin.source));
  let knownByName = new Map(plugins.map((plugin) => [plugin.source, plugin]));
  let knownByName_2 = new Set(plugins.map((plugin) => parsePluginIdentifier(plugin.source).name));
  let enabledByName = new Map();
  for (let id of enabled) {
    let n = parsePluginIdentifier(id).name;
    enabledByName.set(n, (enabledByName.get(n) ?? 0) + 1);
  }
  let errors = [];
  let u = true;
  while (u) {
    u = false;
    for (let plugin of plugins) {
      if (!enabled.has(plugin.source)) continue;
      for (let rawDep of plugin.manifest.dependencies ?? []) {
        let g = canonicalPluginId(qualifyDependency(rawDep, plugin.source));
        let p = !parsePluginIdentifier(g).marketplace;
        let b = p ? builtinQualifiedId(g) : undefined;
        let h = p ? undefined : `${parsePluginIdentifier(g).name}@${INLINE_PLUGIN_MARKETPLACE}`;
        let S = h !== undefined && !enabled.has(g) && enabled.has(h);
        let dep = toSyncedDependencyId(g, plugin.source);
        let w = dep !== undefined && !enabled.has(g) && !S && enabled.has(dep);
        let satisfied = p
          ? (enabledByName.get(g) ?? 0) > 0 || (b !== undefined && enabled.has(b))
          : enabled.has(g) || S || w;
        let k;
        if (!satisfied) {
          let m = h !== undefined && !known.has(g) && known.has(h);
          let x = dep !== undefined && !known.has(g) && !m && known.has(dep);
          k = {
            type: "dependency-unsatisfied",
            source: plugin.source,
            plugin: plugin.name,
            dependency: m ? h : x ? dep : g,
            reason: (p ? knownByName_2.has(g) || (b !== undefined && known.has(b)) : known.has(g) || m || x)
              ? "not-enabled"
              : "not-found",
          };
        } else if (!p && !S) {
          let version = plugin.depConstraints?.get(rawDep)?.version;
          if (version !== undefined) {
            let x = w ? dep : g;
            let v = knownByName.get(x);
            let N = v?.resolvedVersion ?? v?.manifest.version;
            if (!(w && N === undefined) && !versionSatisfies(N, version))
              k = {
                type: "dependency-version-unsatisfied",
                source: plugin.source,
                plugin: plugin.name,
                dependency: x,
                required: version,
                installed: N,
              };
          }
        }
        if (k) {
          enabled.delete(plugin.source);
          let m = parsePluginIdentifier(plugin.source).name;
          let x = enabledByName.get(m) ?? 0;
          if (x <= 1) enabledByName.delete(m);
          else enabledByName.set(m, x - 1);
          errors.push(k);
          u = true;
          break;
        }
      }
    }
  }
  let demoted = new Set(
    plugins.filter((plugin) => plugin.enabled && !enabled.has(plugin.source)).map((plugin) => plugin.source),
  );
  let f = new Map();
  for (let i of enabled) {
    let { name: d, marketplace } = parsePluginIdentifier(i);
    if (marketplace === SYNCED) f.set(nfcLower(d), i);
  }
  return {
    demoted,
    errors: errors.map((error) => {
      if (error.type !== "dependency-unsatisfied" || error.reason !== "not-found") return error;
      let { name: d, marketplace } = parsePluginIdentifier(error.dependency);
      let p =
        marketplace === undefined ||
        isReservedMarketplaceName(marketplace.toLowerCase()) ||
        parsePluginIdentifier(error.source).marketplace === SYNCED
          ? undefined
          : f.get(nfcLower(d));
      return p === undefined
        ? error
        : {
            ...error,
            sameNameSyncedPlugin: p,
          };
    }),
  };
}
//@ chunk-czx62zen.js:9787-9836 layout
/**
 * 反向依赖插件名列表。
 */
function findReverseDependentNames(pluginId, plugins) {
  return findReverseDependents(pluginId, plugins).map((o) => o.name);
}
//@ chunk-czx62zen.js:9836-9971 fingerprint = findReverseDependents (0.826)
/**
 * 找出依赖给定插件的已启用插件（反向依赖），用于禁用/卸载时警告。
 */
function findReverseDependents(pluginId, plugins) {
  return plugins.filter(
    (plugin) =>
      plugin.enabled &&
      plugin.source !== pluginId &&
      (plugin.manifest.dependencies ?? []).some((s) =>
        dependencyRefMatches(qualifyDependency(s, plugin.source), pluginId, plugin.source),
      ),
  );
}
//@ chunk-czx62zen.js:9971-10110 placement
/**
 * 递归收集反向依赖（深度优先，去重）。
 */
function collectTransitiveDependents(e, plugins) {
  let o = new Set([e]);
  let s = [];
  let r = (pluginId) => {
    for (let { source } of findReverseDependents(pluginId, plugins)) {
      if (o.has(source)) continue;
      o.add(source);
      r(source);
      s.push(source);
    }
  };
  r(e);
  return s;
}
//@ chunk-czx62zen.js:10110-10157 placement
/**
 * isDependencyAutoInstallState：依赖自动安装标记或记录数组。
 */
function isDependencyAutoInstallState(e) {
  return e === true || Array.isArray(e);
}
//@ chunk-czx62zen.js:10267-10903 placement
/**
 * 在某作用域已安装插件里找"作为依赖自动安装、但已没有显式安装插件需要"的孤儿：先确认都能加载（否则返回 unloadable），再从显式安装的插件沿 manifest.dependencies 做可达性遍历。返回 {orphans, unloadable, autoCount}。
 */
function findOrphanedAutoDependencies(plugins, n, o, projectPathForScope) {
  let r = new Set();
  let a = new Set();
  for (let [key, value] of Object.entries(plugins)) {
    let p = installationAtTarget(value, o, projectPathForScope);
    if (!p) continue;
    if (p.auto === true) a.add(key);
    else r.add(key);
  }
  if (a.size === 0)
    return {
      orphans: new Set(),
      unloadable: [],
      autoCount: 0,
    };
  let c = new Map(n.map((d) => [d.source, d]));
  let u = [];
  for (let d of [...r, ...a]) if (!c.has(d)) u.push(d);
  if (u.length > 0)
    return {
      orphans: new Set(),
      unloadable: u,
      autoCount: a.size,
    };
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
  return {
    orphans: i,
    unloadable: [],
    autoCount: a.size,
  };
}
//@ chunk-czx62zen.js:10903-11225 placement
/**
 * 生成提示 "N auto-installed dependencies no longer needed: …. Run claude plugin prune [--scope s] to remove."（最多列 5 个）。
 */
function formatOrphanedDependenciesNotice(orphans, n) {
  if (orphans.size === 0) return "";
  let mapped = [...orphans].map((c) => displaySafeName(parsePluginIdentifier(c).name));
  let s = 5;
  let r = mapped.length <= s ? mapped.join(", ") : `${mapped.slice(0, s).join(", ")}, \u2026`;
  let a = n === "user" ? "" : ` --scope ${n}`;
  return `
${orphans.size} auto-installed ${plural(orphans.size, "dependency", "dependencies")} no longer needed: ${r}. Run \`claude plugin prune${a}\` to remove.`;
}
//@ chunk-czx62zen.js:11225-11281 placement
/**
 * SAFE_DISPLAY_NAME_RE：可安全展示的插件名；MAX_DISPLAY_NAME_LENGTH：展示名长度上限；MAX_DISPLAY_NAME_SEGMENTS：展示名段数上限（同一声明共 3 个绑定）。
 */
var SAFE_DISPLAY_NAME_RE_2 = /^[A-Za-z0-9][-A-Za-z0-9._]*$/;
var SAFE_DISPLAY_NAME_RE = 64;
var MAX_DISPLAY_NAME_LENGTH = 256;
var MAX_DISPLAY_NAME_SEGMENTS = 5;
//@ chunk-czx62zen.js:11281-11380 placement
/**
 * 名字展示安全化：合规短名原样，否则截断并去掉不可见字符。
 */
function displaySafeName(e, n = SAFE_DISPLAY_NAME_RE) {
  return e.length <= n && SAFE_DISPLAY_NAME_RE_2.test(e)
    ? e
    : printableLabel(printableName(e.replace(LEADING_INVISIBLE_TEXT_RE, ""), 64)) || "\u201C\u201D";
}
//@ chunk-czx62zen.js:11380-11507 layout
/**
 * 插件 ID 展示安全化（name@marketplace 两段分别处理）。
 */
function displaySafePluginId(e) {
  let { name: n, marketplace } = parsePluginIdentifier(e);
  if (marketplace === undefined) return displaySafeName(n);
  return `${n}@${marketplace}` === e
    ? `${displaySafeName(n)}@${displaySafeName(marketplace)}`
    : displaySafeName(e);
}
//@ chunk-czx62zen.js:11507-11564 layout
/**
 * 给名字加引号用于提示文案（已以弯引号开头的不重复加）。
 */
function quoteName(e) {
  return e.startsWith("\u201C") ? e : `"${e}"`;
}
//@ chunk-czx62zen.js:11564-11767 fingerprint = formatDependencyCountSuffix (0.804)
/**
 * 生成“（并安装了 N 个依赖：a, b…）”后缀文本。
 */
function formatDependencyCountSuffix(installedDeps) {
  if (installedDeps.length === 0) return "";
  let n = installedDeps.length;
  let mapped = installedDeps
    .slice(0, MAX_DISPLAY_NAME_SEGMENTS)
    .map((installedDep) => displaySafeName(parsePluginIdentifier(installedDep).name));
  let s = n <= MAX_DISPLAY_NAME_SEGMENTS ? mapped.join(", ") : `${mapped.join(", ")}, \u2026`;
  return ` (+ ${n} ${plural(n, "dependency", "dependencies")}: ${s})`;
}
//@ chunk-czx62zen.js:11767-12170 layout
/**
 * 依赖找不到时的提示（“marketplace X 是否已添加？”）。
 */
function missingDependenciesHint(e, marketplaceMissing) {
  if (e.length === 0) return "";
  let o = e.length;
  let found = marketplaceMissing
    .map((u) => parsePluginIdentifier(u).marketplace)
    .find((u) => u !== undefined);
  let r =
    found !== undefined
      ? ` Is the ${quoteName(displaySafeName(found, MAX_DISPLAY_NAME_LENGTH))} marketplace added?`
      : marketplaceMissing.length > 0
        ? " Add the dependency's marketplace, then re-run install."
        : "";
  let joined = e.slice(0, MAX_DISPLAY_NAME_SEGMENTS).map(displaySafePluginId).join(", ");
  let c =
    o <= MAX_DISPLAY_NAME_SEGMENTS ? `${joined}.` : `${joined} and ${o - MAX_DISPLAY_NAME_SEGMENTS} more.`;
  return ` \u2014 ${o} ${plural(o, "dependency", "dependencies")} still unresolved: ${c}${r}`;
}
//@ chunk-czx62zen.js:12170-12277 fingerprint = formatReverseDependentsSuffix (1)
/**
 * 生成“ — warning: required by …”后缀文本。
 */
function formatReverseDependentsSuffix(rdeps) {
  if (!rdeps || rdeps.length === 0) return "";
  return ` \u2014 warning: required by ${rdeps.map(displaySafePluginId).join(", ")}`;
}
//@ chunk-e6aww6q8.js:4320708-4320786 fingerprint = getEnabledPluginIdsForScope (0.707)
/**
 * 构造把一组插件 ID 全部设为 false 的 enabledPlugins 补丁。
 */
function getEnabledPluginIdsForScope(settingSource) {
  return {
    enabledPlugins: Object.fromEntries(settingSource.map((n) => [n, false])),
  };
}
export {
  findOrphanedAutoDependencies,
  formatOrphanedDependenciesNotice,
  installationAtTarget,
  isSameInstallScope,
  intersectVersionConstraints,
  describeConstraintConflict,
  noMatchingTagMessage,
  isDependencyAutoInstallState,
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
  isSameNormalizedProjectPath,
  isStaleInstallTarget,
  findInstallationIndex,
  displaySafePluginId,
  quoteName,
  displaySafeName,
  MAX_DISPLAY_NAME_LENGTH,
  versionSatisfies,
  resolveDependencyClosure,
  missingDependenciesHint,
};
