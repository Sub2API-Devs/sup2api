/**
 * services/pluginEval/evalFence.ts
 *
 * 2.1.316 新增：plugin eval 的路径围栏：解析插件、用例、add_dirs、版本控制目录与系统敏感目录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (29)
 * attribution: placement 29
 */
import path from "path";
import { realpath, lstat, readdir, readFile } from "fs/promises";
import os_2 from "os";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../../utils/errors.js";
import { formatGuardValueJson, checkRepoAuthoredPath } from "../../cli/handlers/pluginEval/mockGuards.js";
import {
  EVALS_DIR_NAME,
  toEvalPathError,
  readPluginManifestAdvisory,
  readManifestToFenceSuites,
  pathEndsWith,
} from "./evalDir.js";
import { nfcKeyIfEnabled } from "./runTrace.js";
import { getFileKind } from "../../utils/fileKind.js";
import { uniq } from "../../utils/collections.js";
import { SUPPORTED_PLATFORMS, getPlatform } from "../../utils/platform.js";
import { isUncOrDevicePath } from "../../utils/pathClassification.js";
import { isNetworkMountPath } from "../../utils/networkPaths.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { listSubdirectories, probePathDirectories } from "./credentialExclusion.js";
import { openNoFollow_2 } from "../../utils/fsSafety/hardenedRead.js";
import { RULE_META_CHARS_RE } from "./runToolRules.js";
import { PROXY_ENV_VARS as PROXY_ENV_VARS_2 } from "../../utils/managedEnvConstants.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { STRIPPED_GIT_ENV_SET } from "./childEnvironment.js";
import { regExp } from "../../utils/git/gitSafeEnv.js";

//@ chunk-qchp9vrd.js:150731-150924 placement
function describeFenceProbeFailure(e, error) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `${e}: a plugin, case or version-control path could not be examined (${getErrnoCode(error) ?? "unexpected error"}) \u2014 make it readable or remove it`,
    "eval fence probe failed",
  );
}
//@ chunk-qchp9vrd.js:150924-164936 placement
/**
 * 解析插件、用例与 add_dirs 的真实路径，生成本次运行允许/拒绝访问的路径集合（约 14 KB）。
 */
async function buildEvalFence(e, n) {
  let r = `case "${formatGuardValueJson(e.name)}"`;
  let a = e.evalDirSegments ?? [EVALS_DIR_NAME];
  let s = (V, q) => toEvalPathError(V, q);
  let h = (V, q) => V === q || s(V, q);
  let w = async (V) => {
    await checkRepoAuthoredPath(path.dirname(V), path.basename(V), r);
    return realpath(V).catch((error) => {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT") return V;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: a plugin, case or add_dirs path could not be resolved (${errnoCode ?? "unexpected error"}) \u2014 make it readable or remove it`,
        "eval path unresolvable",
      );
    });
  };
  let b = async (V) =>
    lstat(V).then(
      (q) => q.nlink,
      (error) => {
        throw describeFenceProbeFailure(r, error);
      },
    );
  let y = nfcKeyIfEnabled;
  let R = (V, q) => {
    let parts = V.split(path.sep);
    return parts.length >= q.length && q.every((ue, ae) => y(parts[parts.length - q.length + ae]) === y(ue));
  };
  let S = [a, [EVALS_DIR_NAME]];
  for (let V of e.pluginDirsUnderTest) {
    let pluginManifestAdvisory = await readPluginManifestAdvisory({
      flag: undefined,
      pluginRoot: V,
    });
    if (pluginManifestAdvisory.ok) S.push(pluginManifestAdvisory.value.segments);
    S.push(...(await readManifestToFenceSuites(V)));
  }
  let T = (V) => S.some((q) => R(V, q));
  let N = (V, q) => y(V) === y(q);
  let x = (V) => VCS_DIR_NAMES.some((q) => N(V, q));
  let j = async (V, q) => {
    let re;
    try {
      re = await readdir(V, {
        withFileTypes: true,
      });
    } catch (error) {
      if (q && getErrnoCode(error) === "ENOENT") return [];
      return null;
    }
    for (let ue of re)
      if (ue.name.includes("\uFFFD"))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${r}: "${formatGuardValueJson(ue.name)}" under a plugin or eval directory is not a valid UTF-8 name (or imitates one that is not) \u2014 rename or remove it`,
          "eval tree has undecodable name",
        );
    return re;
  };
  let K = (V, q) => {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: cannot list "${formatGuardValueJson(path.relative(q, V) || ".")}" under a plugin or eval directory \u2014 make it readable or remove it`,
      "eval directory unlistable",
    );
  };
  let X = async (V) => {
    let q = [];
    let re = 0;
    let ue = [
      {
        dir: V,
        depth: 0,
      },
    ];
    for (let ae = ue.pop(); ae !== undefined; ae = ue.pop()) {
      let Ot = (await j(ae.dir, ae.dir === V)) ?? K(ae.dir, V);
      for (let qe of Ot) {
        let joined = path.join(ae.dir, qe.name);
        let fileKind = await getFileKind(qe, joined, "unknown");
        if (fileKind !== "dir" && fileKind !== "symlink" && fileKind !== "unknown") continue;
        if (++re > MAX_FENCE_ENTRIES || ae.depth >= 12) return [V];
        if (T(joined) || fileKind !== "dir") q.push(joined);
        else
          ue.push({
            dir: joined,
            depth: ae.depth + 1,
          });
      }
    }
    return q;
  };
  let W = await w(e.caseDir);
  let results = await Promise.all(e.pluginDirsUnderTest.map(w));
  let pluginDirsUnderTest = e.pluginDirsUnderTest;
  let Z = (V, q) => {
    let re;
    for (let dir = path.dirname(V); q.some((ae) => h(ae, dir)); dir = path.dirname(dir)) {
      if (T(dir)) re = dir;
      if (dir === path.dirname(dir)) break;
    }
    return re;
  };
  let se = Z(W, results);
  let Q = Z(e.caseDir, pluginDirsUnderTest);
  let Se = Q === undefined ? undefined : await w(Q);
  let filtered = uniq([se, Se].filter((V) => V !== undefined)).filter((V) => h(V, W));
  let dir = path.dirname(W);
  let Je = () => {
    for (let dir = path.dirname(W); dir !== path.dirname(dir); dir = path.dirname(dir))
      if (T(dir)) return dir;
    return;
  };
  let Ee =
    filtered.find((V) => filtered.every((q) => h(V, q))) ??
    filtered[0] ??
    Je() ??
    (results.some((V) => h(V, dir)) ? dir : W);
  let results_2 = await Promise.all(n.map(w));
  for (let V of results_2) {
    let q = await lstat(V).catch((error) => {
      if (getErrnoCode(error) === "ENOENT") return null;
      throw describeFenceProbeFailure(r, error);
    });
    if (q !== null && !q.isDirectory())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: an add_dir must name a directory, not a file`,
        "eval add_dir is not a directory",
      );
  }
  let ye = await readdir(W).catch((error) => {
    if (getErrnoCode(error) === "ENOENT") return [];
    throw describeFenceProbeFailure(r, error);
  });
  let je = async (V) => {
    let filtered = ye.filter((ae) => N(ae, V));
    if (filtered.length > 1)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: the case directory has more than one entry named "${V}" up to letter case \u2014 keep exactly one`,
        "eval case has case-variant duplicates of a reserved directory",
      );
    let joined = path.join(W, filtered[0] ?? V);
    let ue = await lstat(joined).catch((error) => {
      if (getErrnoCode(error) === "ENOENT") return null;
      throw describeFenceProbeFailure(r, error);
    });
    if (ue?.isSymbolicLink())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: "${V}" must be a real directory inside the case, not a symbolic link`,
        "eval case reserved directory is a symlink",
      );
    return ue === null ? joined : w(joined);
  };
  let pt = await je("graders");
  let Pt = await je("mocks");
  let ce = (V, q) => q === V || q.startsWith(V.endsWith(path.sep) ? V : V + path.sep);
  let At = () => {
    let resolved = path.resolve(e.caseDir);
    for (let idx = 0; idx < 64; idx++) {
      if (pathEndsWith(resolved.split(path.sep), a, SUPPORTED_PLATFORMS() ? "folded" : "exact"))
        return resolved;
      let dir = path.dirname(resolved);
      if (dir === resolved) break;
      resolved = dir;
    }
    return null;
  };
  let results_3 = await Promise.all(
    (e.graders ?? []).flatMap((V) => {
      if (V.type !== "baseline") return [];
      let resolved = path.resolve(W, V.baseline_file);
      if (
        path.isAbsolute(V.baseline_file) ||
        isUncOrDevicePath(V.baseline_file) ||
        isNetworkMountPath(V.baseline_file) ||
        isUncOrDevicePath(resolved) ||
        isNetworkMountPath(resolved) ||
        ![e.caseDir, W, Ee, At(), ...e.pluginDirsUnderTest]
          .filter((re) => re !== null)
          .some((re) => ce(path.resolve(re), resolved))
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${r}: a baseline grader's baseline_file must be a relative path inside the suite or the plugin under test`,
          "eval: baseline_file not relative",
        );
      return [w(resolved)];
    }),
  );
  for (let V of results_2)
    if (
      h(V, W) ||
      h(V, Ee) ||
      results.some((re) => V === re) ||
      (s(Ee, V) && !s(W, V)) ||
      h(V, pt) ||
      h(pt, V) ||
      h(V, Pt) ||
      h(Pt, V) ||
      results_3.some((re) => s(V, re))
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: an add_dir may only name fixture directories inside this case \u2014 not the case directory itself, its graders, a sibling case, an eval directory, or the plugin root`,
        "eval add_dir covers case definitions",
      );
  let ie = [...results, Ee, W];
  let _e = new Set();
  let filtered_2 = results.filter((V) => s(Ee, V));
  for (let V of filtered_2)
    if (!s(W, V) || [pt, Pt].some((q) => h(V, q) || h(q, V)) || results_3.some((q) => h(V, q)))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: a plugins entry names the case directory, its graders or mocks, or a directory covering them \u2014 a plugin shipped with a case must sit in its own subdirectory`,
        "eval case plugin covers case material",
      );
  let De = [...results_2, ...filtered_2];
  let he = (V) => De.some((q) => h(q, V));
  let xe = (V) => De.some((q) => s(V, q));
  let Me = [];
  let Ne = [];
  let ot = [];
  let nt = [];
  let mt = (V) => {
    checkPathSegmentWhitespace(V, "plugin entry");
    return toSandboxRulePath(V);
  };
  let Ye = [];
  for (let V of [...e.pluginDirs, ...e.pluginDirsUnderTest]) {
    let resolved = path.resolve(V);
    let re = await w(V);
    if (resolved !== path.resolve(re) && !Ye.some((ue) => ue.lexical === resolved))
      Ye.push({
        canonical: re,
        lexical: resolved,
      });
  }
  let lt = (V) => {
    let q = [V];
    for (let { canonical, lexical } of Ye)
      if (V === canonical || toEvalPathError(canonical, V)) q.push(lexical + V.slice(canonical.length));
    return q;
  };
  let Ge = new Set();
  let Lt = (V) => {
    let q = V;
    for (;;) {
      if (isUsablePathSegment(q)) {
        if (q !== V && [...results, Ee, W].some((ue) => h(q, ue)))
          checkPathSegmentWhitespace(V, "plugin entry");
        return q;
      }
      let dir = path.dirname(q);
      if (dir === q) {
        checkPathSegmentWhitespace(V, "plugin entry");
        return q;
      }
      q = dir;
    }
  };
  let _t = (V) => {
    let q = Lt(V);
    for (let re of lt(q)) {
      let ue = `tree:${path.normalize(re)}`;
      if (Ge.has(ue)) continue;
      Ge.add(ue);
      ot.push(`${FILE_READ_TOOL_NAME}(${mt(re)})`, `${FILE_READ_TOOL_NAME}(${mt(re)}/**)`);
      nt.push(re);
    }
  };
  let zt = (V) => {
    if (!isUsablePathSegment(V)) {
      _t(Lt(V));
      return;
    }
    let q = V;
    for (let re of lt(q)) {
      let ue = `file:${path.normalize(re)}`;
      if (Ge.has(ue)) continue;
      Ge.add(ue);
      ot.push(`${FILE_READ_TOOL_NAME}(${mt(re)})`);
      nt.push(re);
    }
  };
  let fn = async (V) => {
    let q = 0;
    let any = filtered_2.some((ae) => h(ae, V));
    let ue = [V];
    for (let ae = ue.pop(); ae !== undefined; ae = ue.pop()) {
      let Ot = (await j(ae, ae === V)) ?? K(ae, V);
      for (let qe of Ot) {
        if (++q > MAX_FENCE_ENTRIES)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${r}: the eval directory holds more than ${MAX_FENCE_ENTRIES} entries \u2014 move large fixtures out of it`,
            "eval suite too large to screen",
          );
        let joined = path.join(ae, qe.name);
        if (!any && filtered_2.some((He) => h(He, joined))) continue;
        let fileKind = await getFileKind(qe, joined, "unknown");
        if (fileKind === "unknown")
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${r}: cannot tell what "${formatGuardValueJson(qe.name)}" under the eval directory is \u2014 make it readable or remove it`,
            "eval case tree entry unclassifiable",
          );
        let Xe = any ? results_2.some((He) => h(He, joined)) : he(joined);
        if (fileKind === "symlink" && Xe) continue;
        if (fileKind === "symlink") {
          let He = await w(joined);
          if (He === joined)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${r}: "${formatGuardValueJson(qe.name)}" under the eval directory is a symbolic link whose target cannot be resolved \u2014 remove it or point it at an existing file`,
              "eval suite link unresolvable",
            );
          if (results_2.includes(He)) continue;
          let ln = await lstat(He).catch((error) => {
            throw describeFenceProbeFailure(r, error);
          });
          if (!ln.isDirectory()) {
            zt(joined);
            if (ln.nlink > 1)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `${r}: "${formatGuardValueJson(path.relative(V, joined))}" under the eval directory links to a file with ${ln.nlink} names \u2014 case definitions must not be reachable by another name`,
                "eval suite links to hard-linked file",
              );
            zt(He);
            continue;
          }
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${r}: "${formatGuardValueJson(qe.name)}" under the eval directory is a symbolic link to a directory \u2014 case definitions must be plain files and directories`,
            "eval case tree contains a symlink",
          );
        }
        if (fileKind === "dir") ue.push(joined);
        else if (fileKind === "file" && (await b(joined)) > 1)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            Xe
              ? `${r}: "${formatGuardValueJson(path.relative(V, joined))}" inside an add_dir has more than one hard link \u2014 fixtures must be plain copies`
              : `${r}: "${formatGuardValueJson(qe.name)}" under the eval directory has more than one hard link \u2014 case definitions must not be reachable by another name`,
            Xe ? "eval add_dir file hard-linked" : "eval case file hard-linked",
          );
      }
    }
  };
  let mapped = S.map((V) => V.join("/"));
  for (let V of results_3) {
    zt(V);
    let q = await lstat(V).catch((error) => {
      if (getErrnoCode(error) === "ENOENT") return null;
      throw describeFenceProbeFailure(r, error);
    });
    if (q !== null && !q.isFile())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: a baseline grader's baseline_file must name a regular file`,
        "eval baseline reference is not a regular file",
      );
    if (q !== null && q.nlink > 1)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: a baseline grader's reference file is hard-linked (has another name) \u2014 keep a single copy`,
        "eval baseline reference is hard-linked",
      );
  }
  let et = new Set();
  let Et = (V) => {
    _t(V);
    for (let q of lt(V)) et.add(q);
  };
  let Ht = async (V, q = "plugin") => {
    let re = 0;
    let ue = [V];
    for (let ae = ue.pop(); ae !== undefined; ae = ue.pop()) {
      if (h(Ee, ae) && !filtered_2.some((qe) => h(qe, ae))) continue;
      let Ot = (await j(ae, ae === V)) ?? K(ae, V);
      if (ae !== V || !results.includes(V))
        for (let qe of await readManifestToFenceSuites(ae)) {
          let joined = path.join(ae, ...qe);
          let Pe = await w(joined);
          if (Pe !== joined && !results.some((He) => h(He, Pe)) && q === "plugin")
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${r}: ${formatGuardValueJson(path.relative(V, joined))} is an eval-directory link that points outside the plugin \u2014 remove it`,
              "eval nested suite link escapes plugin",
            );
          let Xe = (He) => !h(Ee, He) || filtered_2.some((ln) => h(ln, He));
          for (let He of uniq([joined, Pe])) if (Xe(He)) _t(He);
          if (Pe !== joined && !results.some((He) => h(He, Pe)));
          else if (Xe(Pe))
            await fn(Pe).catch((error) => {
              if (getErrnoCode(error) === "ENOENT" || getErrnoCode(error) === "ENOTDIR") return;
              throw error;
            });
        }
      for (let qe of Ot) {
        if (++re > MAX_FENCE_ENTRIES)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            q === "plugin"
              ? `${r}: a plugin directory holds more than ${MAX_FENCE_ENTRIES} entries to check for eval directories \u2014 point the case at a smaller plugin directory`
              : `${r}: a checkout sharing the plugin's repository holds more than ${MAX_FENCE_ENTRIES} entries to check for eval directories \u2014 run from a standalone clone`,
            "eval plugin too large to screen",
          );
        let joined = path.join(ae, qe.name);
        if (x(qe.name)) {
          Et(joined);
          for (let Xe of await probeVcsMetadata(ae, r, ie, (He) => _e.add(He))) Et(Xe);
          continue;
        }
        let fileKind = await getFileKind(qe, joined, "unknown");
        if (fileKind === "unknown") {
          _t(joined);
          continue;
        }
        if (N(qe.name, "node_modules")) {
          if (fileKind !== "dir") {
            _t(joined);
            continue;
          }
          for (let Xe of mapped)
            ot.push(
              `${FILE_READ_TOOL_NAME}(${mt(joined)}/**/${Xe})`,
              `${FILE_READ_TOOL_NAME}(${mt(joined)}/**/${Xe}/**)`,
            );
          for (let Xe of await X(joined)) _t(Xe);
          continue;
        }
        if (fileKind === "file" && isRunArtifactFile(qe.name)) {
          if (q === "plugin" && (await b(joined)) > 1)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${r}: a file in the plugin has more than one name (a hard link) \u2014 case definitions must not be reachable by another name; replace it with a copy`,
              "eval plugin contains hard-linked file",
            );
          zt(joined);
          continue;
        }
        if (fileKind === "symlink" && T(joined)) {
          _t(joined);
          let Xe = await w(joined);
          if (q === "plugin" && !results.some((He) => h(He, Xe)))
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${r}: ${formatGuardValueJson(path.relative(V, joined))} is an eval-directory link that points outside the plugin \u2014 remove it`,
              "eval suite link leaves the plugin",
            );
          if (!results.some((He) => h(He, Xe))) _t(Xe);
          else if (!h(Ee, Xe) || filtered_2.some((He) => h(He, Xe))) {
            _t(Xe);
            await fn(Xe);
          }
          continue;
        }
        if (fileKind !== "dir") {
          if (fileKind === "file" && (await b(joined)) > 1) {
            if (q === "spared") {
              zt(joined);
              continue;
            }
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${r}: a file in the plugin has more than one name (a hard link) \u2014 case definitions must not be reachable by another name; replace it with a copy`,
              "eval plugin contains hard-linked file",
            );
          }
          continue;
        }
        if (h(Ee, joined) && !filtered_2.some((Xe) => h(Xe, joined))) continue;
        if (T(joined)) {
          _t(joined);
          await fn(joined);
        } else if (await looksLikeVcsTree(joined)) _t(joined);
        else ue.push(joined);
      }
    }
  };
  let lr = async (V) => {
    for (let dir of V) {
      let re = 0;
      let ue = [
        {
          dir,
          depth: 0,
        },
      ];
      for (let ae = ue.pop(); ae !== undefined; ae = ue.pop()) {
        S.push(...(await readManifestToFenceSuites(ae.dir)));
        if (ae.depth >= MAX_FENCE_MANIFEST_DEPTH) continue;
        if (++re > MAX_FENCE_ENTRIES)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${r}: too many directories to examine for eval manifests \u2014 refusing to run`,
            "eval fence: manifest scan budget exceeded",
          );
        for (let Ot of await listSubdirectories(ae.dir, r)) {
          let base = path.basename(Ot);
          if (!x(base) && !N(base, "node_modules"))
            ue.push({
              dir: Ot,
              depth: ae.depth + 1,
            });
        }
      }
    }
  };
  for (let V of uniq([...results, Ee, W]))
    for (let q of await probeVcsMetadata(V, r, ie, (re) => _e.add(re))) Et(q);
  let _n = new Set();
  let Xr = new Set();
  for (let idx = 0; idx < 8; idx++) {
    let filtered = [..._e].filter((ae) => !_n.has(ae));
    let re = S.length;
    await lr(filtered);
    for (let ae of filtered) _n.add(ae);
    let ue = S.length > re;
    for (let ae of [...results, ..._e])
      if (ue || !Xr.has(ae)) {
        await Ht(ae, results.includes(ae) ? "plugin" : "spared");
        Xr.add(ae);
      }
    if ([..._e].every((ae) => _n.has(ae))) break;
  }
  if (![..._e].every((V) => _n.has(V)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: the repository layout keeps revealing further working trees \u2014 refusing to run`,
      "eval fence: spared-tree fixed point not reached",
    );
  for (let pluginDir of e.pluginDirs) {
    let q = await w(pluginDir);
    if (!filtered_2.includes(q) && nt.some((re) => h(re, q)))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: a plugin listed by the case lies inside an eval suite or another fenced directory \u2014 move it out of the suite`,
        "eval: case plugin inside a fenced suite",
      );
  }
  for (let pluginDir of e.pluginDirs) {
    let q = await w(pluginDir);
    let resolved = path.resolve(pluginDir);
    let ue = (ae) => (resolved === path.resolve(q) ? [ae] : [ae, resolved + ae.slice(q.length)]);
    if (!h(q, Ee)) {
      Me.push(...ue(q));
      continue;
    }
    for (let ae = q; ae !== Ee;) {
      let Ot = await j(ae, ae === q);
      if (Ot === null) break;
      let qe;
      for (let Re of Ot) {
        let joined = path.join(ae, Re.name);
        if (h(joined, Ee)) {
          qe = joined;
          continue;
        }
        let fileKind = await getFileKind(Re, joined, "other");
        checkPathSegmentWhitespace(joined, "plugin entry");
        if (x(Re.name) || T(joined) || et.has(joined)) continue;
        if (fileKind === "dir") {
          if (await looksLikeVcsTree(joined)) continue;
          Me.push(...ue(joined));
        } else if (fileKind === "symlink") Me.push(...ue(joined));
        else if (fileKind === "file" && !isRunArtifactFile(Re.name) && (await b(joined)) === 1)
          Ne.push(...ue(joined));
      }
      if (qe === undefined) break;
      ae = qe;
    }
  }
  e.pluginDirsUnderTest.forEach((V, q) => {
    let re = results[q] ?? V;
    if (h(re, Ee)) {
      let joined = path.join(V, path.relative(re, Ee));
      if (joined !== Ee) _t(joined);
    }
  });
  let parts = path.relative(Ee, W).split(path.sep);
  let parts_2 = path.resolve(e.caseDir).split(path.sep);
  if (
    parts.length < parts_2.length &&
    parts.every((V, q) => y(V) === y(parts_2[parts_2.length - parts.length + q] ?? ""))
  ) {
    let joined = parts_2.slice(0, parts_2.length - parts.length).join(path.sep);
    if (joined !== Ee && joined !== "") _t(joined);
  }
  if (SUPPORTED_PLATFORMS()) {
    let V = a;
    let joined = Ee.split(path.sep).slice(0, -V.length).join(path.sep);
    let joined_2 = path.join(joined || path.sep, ...V);
    if (joined_2 !== Ee && R(Ee, V)) _t(joined_2);
  }
  await fn(Ee);
  let En = De.some((V) => s(Ee, V)) ? [Ee] : [];
  if (En.length === 0) _t(Ee);
  for (let V = En.pop(); V !== undefined; V = En.pop()) {
    let q = (await j(V, V === Ee)) ?? K(V, Ee);
    for (let re of q) {
      let joined = path.join(V, re.name);
      if (he(joined)) continue;
      let fileKind = await getFileKind(re, joined, "unknown");
      if (fileKind === "dir" && xe(joined)) En.push(joined);
      else if (fileKind === "dir" || fileKind === "unknown") _t(joined);
      else zt(joined);
    }
  }
  for (let V of results_2) {
    if (V.split(path.sep).some((q) => x(q)))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: an add_dirs entry points into version-control metadata \u2014 point it at the fixtures themselves`,
        "eval add_dir inside vcs dir",
      );
    for (let q of et)
      if (V === q || toEvalPathError(q, V))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${r}: an add_dirs entry points into version-control metadata \u2014 point it at the fixtures themselves`,
          "eval add_dir inside vcs dir",
        );
    for (let q of nt) {
      let re = (ae, Ot) =>
        nfcKeyIfEnabled(ae) === nfcKeyIfEnabled(Ot) || toEvalPathError(ae, Ot, nfcKeyIfEnabled);
      if (
        !(
          re(Ee, q) &&
          !filtered_2.some((ae) => re(ae, q)) &&
          !et.has(q) &&
          !q.split(path.sep).some((ae) => x(ae))
        ) &&
        (nfcKeyIfEnabled(V) === nfcKeyIfEnabled(q) || toEvalPathError(q, V, nfcKeyIfEnabled))
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${r}: an add_dirs entry points inside a directory that holds case definitions or version-control data of a plugin under test \u2014 point it at the fixtures themselves`,
          "eval add_dir inside fenced directory",
        );
    }
  }
  return {
    readRoots: uniq(Me.map((V) => path.normalize(V))),
    readFiles: uniq(Ne.map((V) => path.normalize(V))),
    denies: ot,
    denyPaths: uniq(nt.map((V) => path.normalize(V))),
  };
}
//@ chunk-qchp9vrd.js:164936-164962 placement
/**
 * 记录的条目上限（4096）。
 */
var MAX_FENCE_ENTRIES = 20000;
var MAX_FENCE_MANIFEST_DEPTH = 3;
var MAX_FENCE_RECORDS = 4096;
//@ chunk-qchp9vrd.js:164962-168518 placement
async function probeVcsMetadata(e, n = "plugin eval", r = [], a) {
  let s = (K) => {
    let errnoCode = getErrnoCode(K);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${n}: a version-control directory or one of its pointers could not be resolved (${errnoCode ?? "unexpected error"}) \u2014 make it readable or remove it`,
      "eval vcs metadata unresolvable",
    );
  };
  let h = async (K) => {
    await checkRepoAuthoredPath(path.dirname(K), path.basename(K), n);
    return realpath(K).catch(s);
  };
  let w = (await h(e)) ?? e;
  let b = [path.join(w, ".git")];
  let y = async (K, X) => {
    await checkRepoAuthoredPath(K, X, n);
    return realpath(path.resolve(K, X)).catch(s);
  };
  let R = (K) => {
    if ([w, ...r].every((X) => K !== X && !toEvalPathError(X, K) && !toEvalPathError(K, X))) b.push(K);
    else if (K !== w && !toEvalPathError(K, w)) a?.(K);
  };
  let S = async (K, X = 0) => {
    await N(K, ".git");
    let joined = path.join(K, "objects");
    let G = (await checkGitMetadataFile(path.join(joined, "info", "alternates"), 4096)) ?? "";
    for (let line of G.split(`
`)) {
      let trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      let Q = await y(joined, trimmed);
      if (Q === null) continue;
      b.push(Q);
      if (path.basename(Q) === "objects") {
        let dir = path.dirname(Q);
        b.push(dir);
        if (path.basename(dir) === ".git") R(path.dirname(dir));
        if (X < 5) await S(dir, X + 1);
      }
    }
    let J = [];
    try {
      J = await readdir(path.join(K, "worktrees"), {
        withFileTypes: true,
      });
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT" && getErrnoCode(error) !== "ENOTDIR")
        throw describeFenceProbeFailure(n, error);
    }
    if (J.length > 200)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${n}: a git directory of the plugin registers more linked worktrees than can be screened`,
        "eval plugin git dir has too many worktrees",
      );
    for (let Z of J) {
      let joined = path.join(K, "worktrees", Z.name);
      let trimmed = ((await checkGitMetadataFile(path.join(joined, "gitdir"), 4096)) ?? "").trim();
      if (trimmed) {
        let Se = await y(joined, trimmed);
        if (Se !== null) R(path.dirname(Se));
      }
    }
  };
  let T = {
    ".git": ["objects", path.join("objects", "pack"), "lfs"],
    ".hg": ["store"],
    ".sl": ["store"],
    ".svn": ["pristine"],
    ".jj": ["repo", path.join("repo", "store")],
    ".bzr": ["repository"],
    _darcs: ["patches", "pristine.hashed", "inventories"],
  };
  let N = async (K, X, W) => {
    for (let G of W ?? T[X] ?? []) {
      let J = await h(path.join(K, G));
      if (J === null) continue;
      if (J !== K && !toEvalPathError(K, J)) {
        b.push(J);
        continue;
      }
      let Z = await readdir(J, {
        withFileTypes: true,
      }).catch((error) => {
        if (getErrnoCode(error) === "ENOENT" || getErrnoCode(error) === "ENOTDIR") return [];
        throw describeFenceProbeFailure(n, error);
      });
      let se = 0;
      for (let Q of Z) {
        if (++se > MAX_FENCE_RECORDS)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${n}: a version-control store holds too many top-level entries to examine \u2014 refusing to run`,
            "eval fence: vcs store too large to screen",
          );
        let fileKind = await getFileKind(Q, path.join(J, Q.name), "unknown");
        if (fileKind === "unknown")
          throw describeFenceProbeFailure(n, Error("unclassifiable version-control store entry"));
        if (fileKind !== "symlink") continue;
        let we = await h(path.join(J, Q.name));
        if (we !== null && !toEvalPathError(K, we)) b.push(we);
      }
    }
  };
  let x = async (K, X) => {
    let W;
    let G;
    if (X === ".hg" || X === ".sl") {
      W = path.join(K, "sharedpath");
      G = (Q) => path.dirname(Q);
    } else if (X === ".jj") {
      W = path.join(K, "repo");
      G = (Q) => path.dirname(path.dirname(Q));
    } else return;
    if (
      !(await lstat(W).then(
        (Q) => Q.isFile(),
        (error) => {
          if (getErrnoCode(error) === "ENOENT" || getErrnoCode(error) === "ENOTDIR") return false;
          throw describeFenceProbeFailure(n, error);
        },
      ))
    )
      return;
    let trimmed = ((await checkGitMetadataFile(W, 4096)) ?? "").trim();
    if (trimmed === "") return;
    let se = await y(K, trimmed);
    if (se === null) return;
    b.push(se);
    R(G(se));
    await N(se, X, X === ".jj" ? ["store"] : undefined);
  };
  let j = async (K) => {
    let X = (await checkGitMetadataFile(K, 4096)) ?? "";
    let match = /^gitdir:\s*(.+)$/m.exec(X);
    if (!match?.[1]) return false;
    let G = await y(path.dirname(K), match[1].trim());
    if (G === null) return false;
    b.push(G);
    await S(G);
    let trimmed = ((await checkGitMetadataFile(path.join(G, "commondir"), 4096)) ?? "").trim();
    if (trimmed) {
      let Z = await y(G, trimmed);
      if (Z !== null) {
        b.push(Z);
        await S(Z);
        R(path.dirname(Z));
      }
    }
    return lstat(path.join(G, "HEAD")).then(
      () => true,
      (error) => {
        if (getErrnoCode(error) === "ENOENT") return false;
        throw describeFenceProbeFailure(n, error);
      },
    );
  };
  for (let K = w; ;) {
    let X = false;
    for (let G of VCS_DIR_NAMES) {
      let J = await h(path.join(K, G));
      if (J === null) continue;
      b.push(J);
      await N(J, G);
      if (G !== ".git") {
        await x(J, G);
        continue;
      }
      let Z = await lstat(J).catch((error) => {
        if (getErrnoCode(error) === "ENOENT") return null;
        throw describeFenceProbeFailure(n, error);
      });
      if (Z === null) continue;
      if (Z.isFile()) X = (await j(J)) || X;
      else {
        await S(J);
        X =
          (await lstat(path.join(J, "HEAD")).then(
            () => true,
            (error) => {
              if (getErrnoCode(error) === "ENOENT") return false;
              throw describeFenceProbeFailure(n, error);
            },
          )) || X;
      }
    }
    if (X && K !== w) break;
    let dir = path.dirname(K);
    if (dir === K) break;
    K = dir;
  }
  return uniq(b);
}
//@ chunk-qchp9vrd.js:168518-169095 placement
async function checkGitMetadataFile(e, n) {
  let noFollow = await openNoFollow_2(e);
  if (!noFollow.ok) {
    if (noFollow.error.kind === "absent") return null;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `git metadata file "${path.basename(e)}" is not a plain readable file`,
      "eval metadata file unreadable or not plain",
    );
  }
  let a = noFollow.value;
  try {
    let stats = await a.stat();
    if (!stats.isFile())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `git metadata file "${path.basename(e)}" is not a regular file`,
        "eval metadata file is not a regular file",
      );
    if (stats.size > n)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `git metadata file "${path.basename(e)}" is larger than ${n} bytes`,
        "eval metadata file too large",
      );
    return (await a.readFile()).toString("utf8");
  } finally {
    await a.close();
  }
}
//@ chunk-qchp9vrd.js:169095-169201 placement
/**
 * 运行产物的文件名（aggregate-result.json、report.html）。
 */
var VCS_DIR_NAMES = [".git", ".hg", ".svn", ".jj", ".sl", ".bzr", "_darcs", "CVS"];
var RUN_ARTIFACT_FILENAMES = ["aggregate-result.json", "report.html"];
//@ chunk-qchp9vrd.js:169201-169252 placement
/**
 * 判断文件是否为运行产物。
 */
function isRunArtifactFile(name) {
  return RUN_ARTIFACT_FILENAMES.includes(name.toLowerCase());
}
//@ chunk-qchp9vrd.js:169252-169534 placement
async function looksLikeVcsTree(e) {
  let n;
  try {
    n = await readdir(e, {
      withFileTypes: true,
    });
  } catch {
    return false;
  }
  if (n.some((a) => isRunArtifactFile(a.name))) return true;
  let r = 0;
  for (let a of n) {
    let joined = path.join(e, a.name);
    if ((await getFileKind(a, joined, "other")) !== "dir" || ++r > 200) continue;
    for (let h of RUN_ARTIFACT_FILENAMES)
      try {
        await lstat(path.join(joined, h));
        return true;
      } catch {}
  }
  return false;
}
//@ chunk-qchp9vrd.js:169534-169593 placement
/**
 * 判断路径段是否可用（校验通过）。
 */
function isUsablePathSegment(e) {
  try {
    checkPathSegmentWhitespace(e, "probe");
    return true;
  } catch {
    return false;
  }
}
//@ chunk-qchp9vrd.js:169593-170327 placement
function checkPathSegmentWhitespace(e, n) {
  for (let a of e.split(/[\\/]/))
    if (a !== a.trim())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${n} directory name "${formatGuardValueJson(a)}" starts or ends with whitespace, which cannot be scoped safely in a permission rule \u2014 rename it`,
        "eval path segment has edge whitespace",
      );
  let r = getPlatform() === "windows" ? e.replaceAll("\\", "/") : e;
  if (r.startsWith("//"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${n} is on a network (UNC) path, which cannot be scoped \u2014 run the evaluation from a local checkout`,
      "eval path is UNC",
    );
  if (RULE_META_CHARS_RE.test(r)) {
    let a = r.split("/").find((s) => RULE_META_CHARS_RE.test(s)) ?? "";
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${n} directory name "${formatGuardValueJson(a)}" contains a character that cannot be scoped safely in a permission rule (one of ( ) [ ] { } * ? ! # or a backslash) \u2014 rename it`,
      "eval path unsafe for permission rule",
    );
  }
}
//@ chunk-qchp9vrd.js:170327-170415 placement
var UNIX_TEMP_DIRS = ["/tmp", "/var/tmp", "/dev/shm", "/run/shm"];
var MACOS_PRIVATE_TEMP_DIRS = ["/private/tmp", "/private/var/tmp"];
//@ chunk-qchp9vrd.js:170415-170515 placement = getReservedShortcuts (1)
function getTempDirs() {
  switch (getPlatform()) {
    case "windows":
      return [];
    case "macos":
      return [...UNIX_TEMP_DIRS, ...MACOS_PRIVATE_TEMP_DIRS];
    default:
      return UNIX_TEMP_DIRS;
  }
}
//@ chunk-qchp9vrd.js:170515-172243 placement
/**
 * 表示网络文件系统的类型名（drvfs、9p、cifs 等）。
 */
var GIT_METADATA_ENTRIES = ["hooks", "config", "commondir"];
var GIT_TOP_ENTRIES = [".git", "HEAD", "objects", "refs", "commondir"];
var CREDENTIAL_FILE_ENV_VARS = [
  "CLAUDE_ENV_FILE",
  "SSL_CLIENT_CERT",
  "REGISTRY_AUTH_FILE",
  "RCLONE_CONFIG",
  "SOPS_AGE_KEY_FILE",
  "ANSIBLE_VAULT_PASSWORD_FILE",
  "BOTO_CONFIG",
  "S3CMD_CONFIG",
  "HEX_HOME",
  "BUN_CONFIG_FILE",
  "GOENV",
  "HF_TOKEN_PATH",
  "HF_STORED_TOKENS_PATH",
  "HELM_REGISTRY_CONFIG",
  "HELM_REPOSITORY_CONFIG",
  "AWS_SHARED_CREDENTIALS_FILE",
  "AWS_CONFIG_FILE",
  "AWS_WEB_IDENTITY_TOKEN_FILE",
  "AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE",
  "CLOUDSDK_CONFIG",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_GHA_CREDS_PATH",
  "AZURE_CLIENT_CERTIFICATE_PATH",
  "AZURE_FEDERATED_TOKEN_FILE",
  "AZURE_CONFIG_DIR",
  "KUBECONFIG",
  "DOCKER_CONFIG",
  "DOCKER_CERT_PATH",
  "NPM_CONFIG_GLOBALCONFIG",
  "NETRC",
  "NPM_CONFIG_USERCONFIG",
  "GH_CONFIG_DIR",
  "CLAUDE_CODE_CLIENT_KEY",
  "CLAUDE_CODE_CLIENT_CERT",
  "GIT_SSL_KEY",
  "GIT_SSL_CERT",
  "PIP_CLIENT_CERT",
  "PIP_CONFIG_FILE",
  "PGPASSFILE",
  "PGSERVICEFILE",
  "PGSSLKEY",
  "VAULT_CLIENT_KEY",
  "VAULT_CLIENT_CERT",
  "CONSUL_CLIENT_KEY",
  "CONSUL_CLIENT_CERT",
  "NOMAD_CLIENT_KEY",
  "NOMAD_CLIENT_CERT",
  "CONSUL_HTTP_TOKEN_FILE",
  "TF_CLI_CONFIG_FILE",
  "WGETRC",
  "GNUPGHOME",
  "CREDENTIALS_DIRECTORY",
  "ANTHROPIC_CONFIG_DIR",
  "CLAUDE_CODE_FEDERATION_CACHE_DIR",
  "ANTHROPIC_IDENTITY_TOKEN_FILE",
  "AZURE_AUTH_LOCATION",
  "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE",
  "CLOUDSDK_AUTH_ACCESS_TOKEN_FILE",
  "CLOUDSDK_AUTH_AUTHORIZATION_TOKEN_FILE",
];
var PROXY_ENV_VARS_EXTRA = uniq([
  "HTTPS_PROXY",
  "HTTP_PROXY",
  "ALL_PROXY",
  "NO_PROXY",
  "https_proxy",
  "http_proxy",
  "all_proxy",
  "no_proxy",
  "npm_config_http_proxy",
  "NPM_CONFIG_PROXY",
  "NPM_CONFIG_HTTPS_PROXY",
  "NPM_CONFIG_HTTP_PROXY",
  "YARN_PROXY",
  ...PROXY_ENV_VARS_2.filter((e) => e !== "JAVA_TOOL_OPTIONS"),
]);
var NETWORK_FS_NAMES = new Set([
  "drvfs",
  "9p",
  "virtiofs",
  "cifs",
  "smb3",
  "smbfs",
  "nfs",
  "nfs4",
  "ntfs",
  "ntfs3",
  "fuseblk",
  "vfat",
  "exfat",
]);
//@ chunk-qchp9vrd.js:172243-172633 placement
/**
 * 解析 /proc/mounts 文本，列出网络/远程文件系统、FUSE、WSL drvfs 与 UNC 来源的挂载点（解码八进制转义）。
 */
function parseNetworkMounts(e) {
  let n = [];
  for (let line of e.split(`
`)) {
    let [a, s, h, w] = line.split(" ");
    if (s === undefined || h === undefined || !path.posix.isAbsolute(s)) continue;
    let b = firstLineOf(h, ".");
    if (
      NETWORK_FS_NAMES.has(h) ||
      NETWORK_FS_NAMES.has(b) ||
      b === "fuse" ||
      /^[A-Za-z]:/.test(a ?? "") ||
      /^(\\\\|\/\/)/.test(a ?? "") ||
      /^[^/\s]+:\//.test(a ?? "") ||
      /(^|,)aname=drvfs/.test(w ?? "")
    )
      n.push(s.replace(/\\([0-7]{3})/g, (y, R) => String.fromCharCode(parseInt(R, 8))));
  }
  return uniq(n);
}
//@ chunk-qchp9vrd.js:172633-173070 placement
async function detectWslWindowsMounts(e) {
  let n = (s) => {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `A shell tool was granted, but ${s}, so the Windows side could not be put out of the sandboxed shell's reach \u2014 the run was refused.`,
      "eval: WSL Windows-side mounts undetermined",
    );
  };
  let r =
    e ??
    (await readFile("/proc/mounts", "utf8").catch(() =>
      n("the WSL mount table (/proc/mounts) cannot be read"),
    ));
  let networkMounts = parseNetworkMounts(r);
  if (networkMounts.length === 0) n("no Windows filesystem mount was recognized in the WSL mount table");
  return networkMounts;
}
//@ chunk-qchp9vrd.js:173070-173185 placement
/**
 * 返回 XDG_CONFIG_HOME（须为绝对路径），否则 ~/.config。
 */
function getXdgConfigHome() {
  let trimmed = process.env.XDG_CONFIG_HOME?.trim();
  return trimmed && path.isAbsolute(trimmed) ? trimmed : path.join(os_2.homedir(), ".config");
}
//@ chunk-qchp9vrd.js:173185-173597 placement
/**
 * 配置目录类环境变量。
 */
var SECRET_MOUNT_DIRS = [
  "/var/run/secrets",
  "/run/secrets",
  "/run/credentials",
  "/etc/kubernetes/pki",
  "/var/lib/kubelet/pki",
  "/var/lib/rancher/k3s/server/tls",
  "/var/kerberos/krb5/user",
];
var MAX_SCANNED_FILE_BYTES = 4194304;
var KUBECONFIG_ENV = new Set(["KUBECONFIG"]);
var CONFIG_DIR_ENV_VARS = new Set([
  "GNUPGHOME",
  "HEX_HOME",
  "CLOUDSDK_CONFIG",
  "AZURE_CONFIG_DIR",
  "DOCKER_CONFIG",
  "DOCKER_CERT_PATH",
  "GH_CONFIG_DIR",
  "ANTHROPIC_CONFIG_DIR",
  "CLAUDE_CODE_FEDERATION_CACHE_DIR",
  "CREDENTIALS_DIRECTORY",
]);
//@ chunk-qchp9vrd.js:173597-173636 placement
/**
 * 判断字符串是否含通配符。
 */
function hasGlobChars(e) {
  return /[*?[\]]/.test(e);
}
//@ chunk-qchp9vrd.js:173636-173675 placement
/**
 * 判断是否为文件系统根目录。
 */
function isRootDir(e) {
  return path.dirname(e) === e;
}
//@ chunk-qchp9vrd.js:173675-173726 placement
/**
 * 取父目录（已是根时原样）。
 */
function withDirname(e) {
  let dir = path.dirname(e);
  return isRootDir(dir) ? e : dir;
}
//@ chunk-qchp9vrd.js:173726-173843 placement
/**
 * 在路径列表中补上其真实路径对应的目录（去重）。
 */
async function withPathDirectories(e) {
  let n = await probePathDirectories(Promise.all(e.map((r) => realpath(r).catch(() => r))), "a directory");
  return uniq([...e, ...n]);
}
//@ chunk-qchp9vrd.js:173843-173889 placement
/**
 * 按平台转换沙箱规则路径。
 */
function toSandboxPathForPlatform(e) {
  return getPlatform() === "windows" ? e : toSandboxRulePath(e);
}
//@ chunk-qchp9vrd.js:173889-174088 placement
/**
 * 把文件路径转换为沙箱规则路径格式（Windows 盘符转 //c/...，其他前缀 /）。
 */
function toSandboxRulePath(e) {
  let n = getPlatform() === "windows" ? e.replaceAll("\\", "/") : e;
  let match = /^([A-Za-z]):\//.exec(n);
  if (match) {
    let [a, s = ""] = match;
    return `//${s.toLowerCase()}/${n.slice(a.length)}`;
  }
  return `/${n.startsWith("/") ? n : `/${n}`}`;
}
//@ chunk-qchp9vrd.js:179573-179930 placement
/**
 * 解析用例引用的文件路径，要求经链接解析后仍位于用例目录或被测插件内，且是单链接普通文件，否则抛出。
 */
async function resolveCaseFileInsideSuite(case_, n, r) {
  let a = await checkCaseInsideRoot(case_, n);
  let suiteRealRoots = await getSuiteRealRoots(case_);
  let h = await lstat(a).catch(() => null);
  if (
    !suiteRealRoots.some((suiteRealRoot) => toEvalPathError(suiteRealRoot, a)) ||
    h === null ||
    !h.isFile() ||
    h.nlink > 1
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `case "${case_.name}": ${r} "${n}" resolves (through a link) outside the case directory and the plugin under test, or is not a plain single-link file`,
      "eval case file escapes suite via link",
    );
  return a;
}
//@ chunk-qchp9vrd.js:179930-180037 placement
/**
 * 获取评测用例目录与被测插件目录的真实路径。
 */
async function getSuiteRealRoots(e) {
  return Promise.all([e.caseDir, ...e.pluginDirsUnderTest].map((n) => realpath(n).catch(() => n)));
}
//@ chunk-qchp9vrd.js:180037-180119 placement
/**
 * 检查用例路径是否在根内。
 */
async function checkCaseInsideRoot(e, n) {
  return checkCasePathInsideRoot(e.caseDir, n, `case "${e.name}"`, "case directory");
}
//@ chunk-qchp9vrd.js:180119-180724 placement
async function checkCasePathInsideRoot(e, n, r, a) {
  await checkRepoAuthoredPath(e, n, r);
  let resolved = path.resolve(e, n);
  let h = await realpath(e).catch(() => path.resolve(e));
  let resolved_2 = path.resolve(h, n);
  if (resolved_2 !== h && !toEvalPathError(h, resolved_2))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: path "${n}" escapes the ${a} (\`..\` or an absolute path) \u2014 it must name something inside it`,
      "case-authored path escapes its root",
    );
  try {
    return await realpath(resolved);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${r}: path "${n}" does not exist`,
          "case-authored path does not exist",
        ),
        {
          code: errnoCode,
        },
      );
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: path "${n}" is unreadable (${errnoCode ?? "unknown error"})`,
        "case-authored path unreadable",
      ),
      {
        code: errnoCode,
      },
    );
  }
}
//@ chunk-qchp9vrd.js:180724-180751 placement
/**
 * 允许透传的评测环境变量名正则。
 */
var EVAL_ENV_KEY_RE = /^EVAL_[A-Z0-9_]*$/;
//@ chunk-qchp9vrd.js:180751-180856 placement
/**
 * 从环境变量对象中删除被禁止的变量（名单或正则匹配）。
 */
function stripBlockedEnvVars(e) {
  for (let key of Object.keys(e)) {
    let upper = key.toUpperCase();
    if (STRIPPED_GIT_ENV_SET.has(upper) || regExp.test(key)) delete e[key];
  }
}
export {
  toSandboxRulePath,
  buildEvalFence,
  resolveCaseFileInsideSuite,
  withPathDirectories,
  checkPathSegmentWhitespace,
  GIT_TOP_ENTRIES,
  isRootDir,
  detectWslWindowsMounts,
  withDirname,
  getTempDirs,
  hasGlobChars,
  MAX_SCANNED_FILE_BYTES,
  getXdgConfigHome,
  KUBECONFIG_ENV,
  CREDENTIAL_FILE_ENV_VARS,
  CONFIG_DIR_ENV_VARS,
  toSandboxPathForPlatform,
  GIT_METADATA_ENTRIES,
  SECRET_MOUNT_DIRS,
  PROXY_ENV_VARS_EXTRA,
  checkCaseInsideRoot,
  getSuiteRealRoots,
  EVAL_ENV_KEY_RE,
  stripBlockedEnvVars,
  describeFenceProbeFailure,
  checkCasePathInsideRoot,
};
