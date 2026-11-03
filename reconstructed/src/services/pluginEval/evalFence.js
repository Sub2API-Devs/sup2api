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
import path, {
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
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
  readFile,
  readFile as readFile_2,
} from "fs/promises";
import os_2, { default as os_2_2, default as os_3 } from "os";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../../utils/errors.js";
import { Rm, checkRepoAuthoredPath } from "../../cli/handlers/pluginEval/mockGuards.js";
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
import { Qn } from "../../utils/pathClassification.js";
import { Ya } from "../../utils/networkPaths.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { listSubdirectories, probePathDirectories } from "./credentialExclusion.js";
import { openNoFollow_2 } from "../../utils/fsSafety/hardenedRead.js";
import { nl } from "./runToolRules.js";
import { PROXY_ENV_VARS } from "../../utils/managedEnvConstants.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { Bf } from "./childEnvironment.js";
import { regExp } from "../../utils/git/gitSafeEnv.js";

//@ chunk-qchp9vrd.js:150731-150924 placement
function describeFenceProbeFailure(e, n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `${e}: a plugin, case or version-control path could not be examined (${getErrnoCode(n) ?? "unexpected error"}) \u2014 make it readable or remove it`,
    "eval fence probe failed",
  );
}
/**
 * 解析插件、用例与 add_dirs 的真实路径，生成本次运行允许/拒绝访问的路径集合（约 14 KB）。
 */
//@ chunk-qchp9vrd.js:150924-164936 placement
async function buildEvalFence(e, n) {
  let r = `case "${Rm(e.name)}"`,
    a = e.evalDirSegments ?? [EVALS_DIR_NAME],
    s = (V, q) => toEvalPathError(V, q),
    h = (V, q) => V === q || s(V, q),
    w = async (V) => (
      await checkRepoAuthoredPath(path_15.dirname(V), path_15.basename(V), r),
      realpath_8(V).catch((q) => {
        let re = getErrnoCode(q);
        if (re === "ENOENT") return V;
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${r}: a plugin, case or add_dirs path could not be resolved (${re ?? "unexpected error"}) \u2014 make it readable or remove it`,
          "eval path unresolvable",
        );
      })
    ),
    b = async (V) =>
      lstat_11(V).then(
        (q) => q.nlink,
        (q) => {
          throw describeFenceProbeFailure(r, q);
        },
      ),
    y = nfcKeyIfEnabled,
    R = (V, q) => {
      let parts = V.split(path_15.sep);
      return (
        parts.length >= q.length && q.every((ue, ae) => y(parts[parts.length - q.length + ae]) === y(ue))
      );
    },
    S = [a, [EVALS_DIR_NAME]];
  for (let V of e.pluginDirsUnderTest) {
    let q = await readPluginManifestAdvisory({ flag: void 0, pluginRoot: V });
    if (q.ok) S.push(q.value.segments);
    S.push(...(await readManifestToFenceSuites(V)));
  }
  let T = (V) => S.some((q) => R(V, q)),
    N = (V, q) => y(V) === y(q),
    x = (V) => VCS_DIR_NAMES.some((q) => N(V, q)),
    j = async (V, q) => {
      let re;
      try {
        re = await readdir_10(V, { withFileTypes: !0 });
      } catch (error) {
        if (q && getErrnoCode(error) === "ENOENT") return [];
        return null;
      }
      for (let ue of re)
        if (ue.name.includes("\uFFFD"))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${r}: "${Rm(ue.name)}" under a plugin or eval directory is not a valid UTF-8 name (or imitates one that is not) \u2014 rename or remove it`,
            "eval tree has undecodable name",
          );
      return re;
    },
    K = (V, q) => {
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: cannot list "${Rm(path_15.relative(q, V) || ".")}" under a plugin or eval directory \u2014 make it readable or remove it`,
        "eval directory unlistable",
      );
    },
    X = async (V) => {
      let q = [],
        re = 0,
        ue = [{ dir: V, depth: 0 }];
      for (let ae = ue.pop(); ae !== void 0; ae = ue.pop()) {
        let Ot = (await j(ae.dir, ae.dir === V)) ?? K(ae.dir, V);
        for (let qe of Ot) {
          let joined = path_15.join(ae.dir, qe.name),
            Pe = await getFileKind(qe, joined, "unknown");
          if (Pe !== "dir" && Pe !== "symlink" && Pe !== "unknown") continue;
          if (++re > Nn || ae.depth >= 12) return [V];
          if (T(joined) || Pe !== "dir") q.push(joined);
          else ue.push({ dir: joined, depth: ae.depth + 1 });
        }
      }
      return q;
    },
    W = await w(e.caseDir),
    results = await Promise.all(e.pluginDirsUnderTest.map(w)),
    pluginDirsUnderTest = e.pluginDirsUnderTest,
    Z = (V, q) => {
      let re;
      for (let dir = path_15.dirname(V); q.some((ae) => h(ae, dir)); dir = path_15.dirname(dir)) {
        if (T(dir)) re = dir;
        if (dir === path_15.dirname(dir)) break;
      }
      return re;
    },
    se = Z(W, results),
    Q = Z(e.caseDir, pluginDirsUnderTest),
    Se = Q === void 0 ? void 0 : await w(Q),
    filtered = uniq([se, Se].filter((V) => V !== void 0)).filter((V) => h(V, W)),
    dir = path_15.dirname(W),
    Je = () => {
      for (let dir = path_15.dirname(W); dir !== path_15.dirname(dir); dir = path_15.dirname(dir))
        if (T(dir)) return dir;
      return;
    },
    Ee =
      filtered.find((V) => filtered.every((q) => h(V, q))) ??
      filtered[0] ??
      Je() ??
      (results.some((V) => h(V, dir)) ? dir : W),
    results_2 = await Promise.all(n.map(w));
  for (let V of results_2) {
    let q = await lstat_11(V).catch((re) => {
      if (getErrnoCode(re) === "ENOENT") return null;
      throw describeFenceProbeFailure(r, re);
    });
    if (q !== null && !q.isDirectory())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: an add_dir must name a directory, not a file`,
        "eval add_dir is not a directory",
      );
  }
  let ye = await readdir_10(W).catch((V) => {
      if (getErrnoCode(V) === "ENOENT") return [];
      throw describeFenceProbeFailure(r, V);
    }),
    je = async (V) => {
      let filtered = ye.filter((ae) => N(ae, V));
      if (filtered.length > 1)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${r}: the case directory has more than one entry named "${V}" up to letter case \u2014 keep exactly one`,
          "eval case has case-variant duplicates of a reserved directory",
        );
      let joined = path_15.join(W, filtered[0] ?? V),
        ue = await lstat_11(joined).catch((ae) => {
          if (getErrnoCode(ae) === "ENOENT") return null;
          throw describeFenceProbeFailure(r, ae);
        });
      if (ue?.isSymbolicLink())
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${r}: "${V}" must be a real directory inside the case, not a symbolic link`,
          "eval case reserved directory is a symlink",
        );
      return ue === null ? joined : w(joined);
    },
    pt = await je("graders"),
    Pt = await je("mocks"),
    ce = (V, q) => q === V || q.startsWith(V.endsWith(path_15.sep) ? V : V + path_15.sep),
    At = () => {
      let resolved = path_15.resolve(e.caseDir);
      for (let q = 0; q < 64; q++) {
        if (pathEndsWith(resolved.split(path_15.sep), a, SUPPORTED_PLATFORMS() ? "folded" : "exact"))
          return resolved;
        let dir = path_15.dirname(resolved);
        if (dir === resolved) break;
        resolved = dir;
      }
      return null;
    },
    results_3 = await Promise.all(
      (e.graders ?? []).flatMap((V) => {
        if (V.type !== "baseline") return [];
        let resolved = path_15.resolve(W, V.baseline_file);
        if (
          path_15.isAbsolute(V.baseline_file) ||
          Qn(V.baseline_file) ||
          Ya(V.baseline_file) ||
          Qn(resolved) ||
          Ya(resolved) ||
          ![e.caseDir, W, Ee, At(), ...e.pluginDirsUnderTest]
            .filter((re) => re !== null)
            .some((re) => ce(path_15.resolve(re), resolved))
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
  let ie = [...results, Ee, W],
    _e = new Set(),
    filtered_2 = results.filter((V) => s(Ee, V));
  for (let V of filtered_2)
    if (!s(W, V) || [pt, Pt].some((q) => h(V, q) || h(q, V)) || results_3.some((q) => h(V, q)))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: a plugins entry names the case directory, its graders or mocks, or a directory covering them \u2014 a plugin shipped with a case must sit in its own subdirectory`,
        "eval case plugin covers case material",
      );
  let De = [...results_2, ...filtered_2],
    he = (V) => De.some((q) => h(q, V)),
    xe = (V) => De.some((q) => s(V, q)),
    Me = [],
    Ne = [],
    ot = [],
    nt = [],
    mt = (V) => (checkPathSegmentWhitespace(V, "plugin entry"), toSandboxRulePath(V)),
    Ye = [];
  for (let V of [...e.pluginDirs, ...e.pluginDirsUnderTest]) {
    let resolved = path_15.resolve(V),
      re = await w(V);
    if (resolved !== path_15.resolve(re) && !Ye.some((ue) => ue.lexical === resolved))
      Ye.push({ canonical: re, lexical: resolved });
  }
  let lt = (V) => {
      let q = [V];
      for (let { canonical: canonical, lexical: lexical } of Ye)
        if (V === canonical || toEvalPathError(canonical, V)) q.push(lexical + V.slice(canonical.length));
      return q;
    },
    Ge = new Set(),
    Lt = (V) => {
      let q = V;
      for (;;) {
        if (il(q)) {
          if (q !== V && [...results, Ee, W].some((ue) => h(q, ue)))
            checkPathSegmentWhitespace(V, "plugin entry");
          return q;
        }
        let dir = path_15.dirname(q);
        if (dir === q) return (checkPathSegmentWhitespace(V, "plugin entry"), q);
        q = dir;
      }
    },
    _t = (V) => {
      let q = Lt(V);
      for (let re of lt(q)) {
        let ue = `tree:${path_15.normalize(re)}`;
        if (Ge.has(ue)) continue;
        (Ge.add(ue),
          ot.push(`${FILE_READ_TOOL_NAME}(${mt(re)})`, `${FILE_READ_TOOL_NAME}(${mt(re)}/**)`),
          nt.push(re));
      }
    },
    zt = (V) => {
      if (!il(V)) {
        _t(Lt(V));
        return;
      }
      let q = V;
      for (let re of lt(q)) {
        let ue = `file:${path_15.normalize(re)}`;
        if (Ge.has(ue)) continue;
        (Ge.add(ue), ot.push(`${FILE_READ_TOOL_NAME}(${mt(re)})`), nt.push(re));
      }
    },
    fn = async (V) => {
      let q = 0,
        any = filtered_2.some((ae) => h(ae, V)),
        ue = [V];
      for (let ae = ue.pop(); ae !== void 0; ae = ue.pop()) {
        let Ot = (await j(ae, ae === V)) ?? K(ae, V);
        for (let qe of Ot) {
          if (++q > Nn)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${r}: the eval directory holds more than ${Nn} entries \u2014 move large fixtures out of it`,
              "eval suite too large to screen",
            );
          let joined = path_15.join(ae, qe.name);
          if (!any && filtered_2.some((He) => h(He, joined))) continue;
          let Pe = await getFileKind(qe, joined, "unknown");
          if (Pe === "unknown")
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${r}: cannot tell what "${Rm(qe.name)}" under the eval directory is \u2014 make it readable or remove it`,
              "eval case tree entry unclassifiable",
            );
          let Xe = any ? results_2.some((He) => h(He, joined)) : he(joined);
          if (Pe === "symlink" && Xe) continue;
          if (Pe === "symlink") {
            let He = await w(joined);
            if (He === joined)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `${r}: "${Rm(qe.name)}" under the eval directory is a symbolic link whose target cannot be resolved \u2014 remove it or point it at an existing file`,
                "eval suite link unresolvable",
              );
            if (results_2.includes(He)) continue;
            let ln = await lstat_11(He).catch((L) => {
              throw describeFenceProbeFailure(r, L);
            });
            if (!ln.isDirectory()) {
              if ((zt(joined), ln.nlink > 1))
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `${r}: "${Rm(path_15.relative(V, joined))}" under the eval directory links to a file with ${ln.nlink} names \u2014 case definitions must not be reachable by another name`,
                  "eval suite links to hard-linked file",
                );
              zt(He);
              continue;
            }
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${r}: "${Rm(qe.name)}" under the eval directory is a symbolic link to a directory \u2014 case definitions must be plain files and directories`,
              "eval case tree contains a symlink",
            );
          }
          if (Pe === "dir") ue.push(joined);
          else if (Pe === "file" && (await b(joined)) > 1)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              Xe
                ? `${r}: "${Rm(path_15.relative(V, joined))}" inside an add_dir has more than one hard link \u2014 fixtures must be plain copies`
                : `${r}: "${Rm(qe.name)}" under the eval directory has more than one hard link \u2014 case definitions must not be reachable by another name`,
              Xe ? "eval add_dir file hard-linked" : "eval case file hard-linked",
            );
        }
      }
    },
    mapped = S.map((V) => V.join("/"));
  for (let V of results_3) {
    zt(V);
    let q = await lstat_11(V).catch((re) => {
      if (getErrnoCode(re) === "ENOENT") return null;
      throw describeFenceProbeFailure(r, re);
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
  let et = new Set(),
    Et = (V) => {
      _t(V);
      for (let q of lt(V)) et.add(q);
    },
    Ht = async (V, q = "plugin") => {
      let re = 0,
        ue = [V];
      for (let ae = ue.pop(); ae !== void 0; ae = ue.pop()) {
        if (h(Ee, ae) && !filtered_2.some((qe) => h(qe, ae))) continue;
        let Ot = (await j(ae, ae === V)) ?? K(ae, V);
        if (ae !== V || !results.includes(V))
          for (let qe of await readManifestToFenceSuites(ae)) {
            let joined = path_15.join(ae, ...qe),
              Pe = await w(joined);
            if (Pe !== joined && !results.some((He) => h(He, Pe)) && q === "plugin")
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `${r}: ${Rm(path_15.relative(V, joined))} is an eval-directory link that points outside the plugin \u2014 remove it`,
                "eval nested suite link escapes plugin",
              );
            let Xe = (He) => !h(Ee, He) || filtered_2.some((ln) => h(ln, He));
            for (let He of uniq([joined, Pe])) if (Xe(He)) _t(He);
            if (Pe !== joined && !results.some((He) => h(He, Pe)));
            else if (Xe(Pe))
              await fn(Pe).catch((He) => {
                if (getErrnoCode(He) === "ENOENT" || getErrnoCode(He) === "ENOTDIR") return;
                throw He;
              });
          }
        for (let qe of Ot) {
          if (++re > Nn)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              q === "plugin"
                ? `${r}: a plugin directory holds more than ${Nn} entries to check for eval directories \u2014 point the case at a smaller plugin directory`
                : `${r}: a checkout sharing the plugin's repository holds more than ${Nn} entries to check for eval directories \u2014 run from a standalone clone`,
              "eval plugin too large to screen",
            );
          let joined = path_15.join(ae, qe.name);
          if (x(qe.name)) {
            Et(joined);
            for (let Xe of await probeVcsMetadata(ae, r, ie, (He) => _e.add(He))) Et(Xe);
            continue;
          }
          let Pe = await getFileKind(qe, joined, "unknown");
          if (Pe === "unknown") {
            _t(joined);
            continue;
          }
          if (N(qe.name, "node_modules")) {
            if (Pe !== "dir") {
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
          if (Pe === "file" && Ai(qe.name)) {
            if (q === "plugin" && (await b(joined)) > 1)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `${r}: a file in the plugin has more than one name (a hard link) \u2014 case definitions must not be reachable by another name; replace it with a copy`,
                "eval plugin contains hard-linked file",
              );
            zt(joined);
            continue;
          }
          if (Pe === "symlink" && T(joined)) {
            _t(joined);
            let Xe = await w(joined);
            if (q === "plugin" && !results.some((He) => h(He, Xe)))
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `${r}: ${Rm(path_15.relative(V, joined))} is an eval-directory link that points outside the plugin \u2014 remove it`,
                "eval suite link leaves the plugin",
              );
            if (!results.some((He) => h(He, Xe))) _t(Xe);
            else if (!h(Ee, Xe) || filtered_2.some((He) => h(He, Xe))) (_t(Xe), await fn(Xe));
            continue;
          }
          if (Pe !== "dir") {
            if (Pe === "file" && (await b(joined)) > 1) {
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
          if (T(joined)) (_t(joined), await fn(joined));
          else if (await looksLikeVcsTree(joined)) _t(joined);
          else ue.push(joined);
        }
      }
    },
    lr = async (V) => {
      for (let q of V) {
        let re = 0,
          ue = [{ dir: q, depth: 0 }];
        for (let ae = ue.pop(); ae !== void 0; ae = ue.pop()) {
          if ((S.push(...(await readManifestToFenceSuites(ae.dir))), ae.depth >= bf)) continue;
          if (++re > Nn)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${r}: too many directories to examine for eval manifests \u2014 refusing to run`,
              "eval fence: manifest scan budget exceeded",
            );
          for (let Ot of await listSubdirectories(ae.dir, r)) {
            let base = path_15.basename(Ot);
            if (!x(base) && !N(base, "node_modules")) ue.push({ dir: Ot, depth: ae.depth + 1 });
          }
        }
      }
    };
  for (let V of uniq([...results, Ee, W]))
    for (let q of await probeVcsMetadata(V, r, ie, (re) => _e.add(re))) Et(q);
  let _n = new Set(),
    Xr = new Set();
  for (let V = 0; V < 8; V++) {
    let filtered = [..._e].filter((ae) => !_n.has(ae)),
      re = S.length;
    await lr(filtered);
    for (let ae of filtered) _n.add(ae);
    let ue = S.length > re;
    for (let ae of [...results, ..._e])
      if (ue || !Xr.has(ae)) (await Ht(ae, results.includes(ae) ? "plugin" : "spared"), Xr.add(ae));
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
    let q = await w(pluginDir),
      resolved = path_15.resolve(pluginDir),
      ue = (ae) => (resolved === path_15.resolve(q) ? [ae] : [ae, resolved + ae.slice(q.length)]);
    if (!h(q, Ee)) {
      Me.push(...ue(q));
      continue;
    }
    for (let ae = q; ae !== Ee;) {
      let Ot = await j(ae, ae === q);
      if (Ot === null) break;
      let qe;
      for (let Re of Ot) {
        let joined = path_15.join(ae, Re.name);
        if (h(joined, Ee)) {
          qe = joined;
          continue;
        }
        let Xe = await getFileKind(Re, joined, "other");
        if ((checkPathSegmentWhitespace(joined, "plugin entry"), x(Re.name) || T(joined) || et.has(joined)))
          continue;
        if (Xe === "dir") {
          if (await looksLikeVcsTree(joined)) continue;
          Me.push(...ue(joined));
        } else if (Xe === "symlink") Me.push(...ue(joined));
        else if (Xe === "file" && !Ai(Re.name) && (await b(joined)) === 1) Ne.push(...ue(joined));
      }
      if (qe === void 0) break;
      ae = qe;
    }
  }
  e.pluginDirsUnderTest.forEach((V, q) => {
    let re = results[q] ?? V;
    if (h(re, Ee)) {
      let joined = path_15.join(V, path_15.relative(re, Ee));
      if (joined !== Ee) _t(joined);
    }
  });
  let parts = path_15.relative(Ee, W).split(path_15.sep),
    parts_2 = path_15.resolve(e.caseDir).split(path_15.sep);
  if (
    parts.length < parts_2.length &&
    parts.every((V, q) => y(V) === y(parts_2[parts_2.length - parts.length + q] ?? ""))
  ) {
    let joined = parts_2.slice(0, parts_2.length - parts.length).join(path_15.sep);
    if (joined !== Ee && joined !== "") _t(joined);
  }
  if (SUPPORTED_PLATFORMS()) {
    let V = a,
      joined = Ee.split(path_15.sep).slice(0, -V.length).join(path_15.sep),
      joined_2 = path_15.join(joined || path_15.sep, ...V);
    if (joined_2 !== Ee && R(Ee, V)) _t(joined_2);
  }
  await fn(Ee);
  let En = De.some((V) => s(Ee, V)) ? [Ee] : [];
  if (En.length === 0) _t(Ee);
  for (let V = En.pop(); V !== void 0; V = En.pop()) {
    let q = (await j(V, V === Ee)) ?? K(V, Ee);
    for (let re of q) {
      let joined = path_15.join(V, re.name);
      if (he(joined)) continue;
      let ae = await getFileKind(re, joined, "unknown");
      if (ae === "dir" && xe(joined)) En.push(joined);
      else if (ae === "dir" || ae === "unknown") _t(joined);
      else zt(joined);
    }
  }
  for (let V of results_2) {
    if (V.split(path_15.sep).some((q) => x(q)))
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
          !q.split(path_15.sep).some((ae) => x(ae))
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
    readRoots: uniq(Me.map((V) => path_15.normalize(V))),
    readFiles: uniq(Ne.map((V) => path_15.normalize(V))),
    denies: ot,
    denyPaths: uniq(nt.map((V) => path_15.normalize(V))),
  };
}
//@ chunk-qchp9vrd.js:164936-164962 placement
var Nn = 20000,
  bf = 3,
  vf = 4096;
//@ chunk-qchp9vrd.js:164962-168518 placement
async function probeVcsMetadata(e, n = "plugin eval", r = [], a) {
  let s = (K) => {
      let X = getErrnoCode(K);
      if (X === "ENOENT" || X === "ENOTDIR") return null;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${n}: a version-control directory or one of its pointers could not be resolved (${X ?? "unexpected error"}) \u2014 make it readable or remove it`,
        "eval vcs metadata unresolvable",
      );
    },
    h = async (K) => (
      await checkRepoAuthoredPath(path_15.dirname(K), path_15.basename(K), n),
      realpath_8(K).catch(s)
    ),
    w = (await h(e)) ?? e,
    b = [path_15.join(w, ".git")],
    y = async (K, X) => (await checkRepoAuthoredPath(K, X, n), realpath_8(path_15.resolve(K, X)).catch(s)),
    R = (K) => {
      if ([w, ...r].every((X) => K !== X && !toEvalPathError(X, K) && !toEvalPathError(K, X))) b.push(K);
      else if (K !== w && !toEvalPathError(K, w)) a?.(K);
    },
    S = async (K, X = 0) => {
      await N(K, ".git");
      let joined = path_15.join(K, "objects"),
        G = (await checkGitMetadataFile(path_15.join(joined, "info", "alternates"), 4096)) ?? "";
      for (let Z of G.split(`
`)) {
        let trimmed = Z.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        let Q = await y(joined, trimmed);
        if (Q === null) continue;
        if ((b.push(Q), path_15.basename(Q) === "objects")) {
          let dir = path_15.dirname(Q);
          if ((b.push(dir), path_15.basename(dir) === ".git")) R(path_15.dirname(dir));
          if (X < 5) await S(dir, X + 1);
        }
      }
      let J = [];
      try {
        J = await readdir_10(path_15.join(K, "worktrees"), { withFileTypes: !0 });
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
        let joined = path_15.join(K, "worktrees", Z.name),
          trimmed = ((await checkGitMetadataFile(path_15.join(joined, "gitdir"), 4096)) ?? "").trim();
        if (trimmed) {
          let Se = await y(joined, trimmed);
          if (Se !== null) R(path_15.dirname(Se));
        }
      }
    },
    T = {
      ".git": ["objects", path_15.join("objects", "pack"), "lfs"],
      ".hg": ["store"],
      ".sl": ["store"],
      ".svn": ["pristine"],
      ".jj": ["repo", path_15.join("repo", "store")],
      ".bzr": ["repository"],
      _darcs: ["patches", "pristine.hashed", "inventories"],
    },
    N = async (K, X, W) => {
      for (let G of W ?? T[X] ?? []) {
        let J = await h(path_15.join(K, G));
        if (J === null) continue;
        if (J !== K && !toEvalPathError(K, J)) {
          b.push(J);
          continue;
        }
        let Z = await readdir_10(J, { withFileTypes: !0 }).catch((Q) => {
            if (getErrnoCode(Q) === "ENOENT" || getErrnoCode(Q) === "ENOTDIR") return [];
            throw describeFenceProbeFailure(n, Q);
          }),
          se = 0;
        for (let Q of Z) {
          if (++se > vf)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${n}: a version-control store holds too many top-level entries to examine \u2014 refusing to run`,
              "eval fence: vcs store too large to screen",
            );
          let Se = await getFileKind(Q, path_15.join(J, Q.name), "unknown");
          if (Se === "unknown")
            throw describeFenceProbeFailure(n, Error("unclassifiable version-control store entry"));
          if (Se !== "symlink") continue;
          let we = await h(path_15.join(J, Q.name));
          if (we !== null && !toEvalPathError(K, we)) b.push(we);
        }
      }
    },
    x = async (K, X) => {
      let W, G;
      if (X === ".hg" || X === ".sl") ((W = path_15.join(K, "sharedpath")), (G = (Q) => path_15.dirname(Q)));
      else if (X === ".jj") ((W = path_15.join(K, "repo")), (G = (Q) => path_15.dirname(path_15.dirname(Q))));
      else return;
      if (
        !(await lstat_11(W).then(
          (Q) => Q.isFile(),
          (Q) => {
            if (getErrnoCode(Q) === "ENOENT" || getErrnoCode(Q) === "ENOTDIR") return !1;
            throw describeFenceProbeFailure(n, Q);
          },
        ))
      )
        return;
      let trimmed = ((await checkGitMetadataFile(W, 4096)) ?? "").trim();
      if (trimmed === "") return;
      let se = await y(K, trimmed);
      if (se === null) return;
      (b.push(se), R(G(se)), await N(se, X, X === ".jj" ? ["store"] : void 0));
    },
    j = async (K) => {
      let X = (await checkGitMetadataFile(K, 4096)) ?? "",
        match = /^gitdir:\s*(.+)$/m.exec(X);
      if (!match?.[1]) return !1;
      let G = await y(path_15.dirname(K), match[1].trim());
      if (G === null) return !1;
      (b.push(G), await S(G));
      let trimmed = ((await checkGitMetadataFile(path_15.join(G, "commondir"), 4096)) ?? "").trim();
      if (trimmed) {
        let Z = await y(G, trimmed);
        if (Z !== null) (b.push(Z), await S(Z), R(path_15.dirname(Z)));
      }
      return lstat_11(path_15.join(G, "HEAD")).then(
        () => !0,
        (Z) => {
          if (getErrnoCode(Z) === "ENOENT") return !1;
          throw describeFenceProbeFailure(n, Z);
        },
      );
    };
  for (let K = w; ;) {
    let X = !1;
    for (let G of VCS_DIR_NAMES) {
      let J = await h(path_15.join(K, G));
      if (J === null) continue;
      if ((b.push(J), await N(J, G), G !== ".git")) {
        await x(J, G);
        continue;
      }
      let Z = await lstat_11(J).catch((se) => {
        if (getErrnoCode(se) === "ENOENT") return null;
        throw describeFenceProbeFailure(n, se);
      });
      if (Z === null) continue;
      if (Z.isFile()) X = (await j(J)) || X;
      else
        (await S(J),
          (X =
            (await lstat_11(path_15.join(J, "HEAD")).then(
              () => !0,
              (se) => {
                if (getErrnoCode(se) === "ENOENT") return !1;
                throw describeFenceProbeFailure(n, se);
              },
            )) || X));
    }
    if (X && K !== w) break;
    let dir = path_15.dirname(K);
    if (dir === K) break;
    K = dir;
  }
  return uniq(b);
}
//@ chunk-qchp9vrd.js:168518-169095 placement
async function checkGitMetadataFile(e, n) {
  let r = await openNoFollow_2(e);
  if (!r.ok) {
    if (r.error.kind === "absent") return null;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `git metadata file "${path_15.basename(e)}" is not a plain readable file`,
      "eval metadata file unreadable or not plain",
    );
  }
  let a = r.value;
  try {
    let stats = await a.stat();
    if (!stats.isFile())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `git metadata file "${path_15.basename(e)}" is not a regular file`,
        "eval metadata file is not a regular file",
      );
    if (stats.size > n)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `git metadata file "${path_15.basename(e)}" is larger than ${n} bytes`,
        "eval metadata file too large",
      );
    return (await a.readFile()).toString("utf8");
  } finally {
    await a.close();
  }
}
//@ chunk-qchp9vrd.js:169095-169201 placement
var VCS_DIR_NAMES = [".git", ".hg", ".svn", ".jj", ".sl", ".bzr", "_darcs", "CVS"],
  Il = ["aggregate-result.json", "report.html"];
//@ chunk-qchp9vrd.js:169201-169252 placement
function Ai(e) {
  return Il.includes(e.toLowerCase());
}
//@ chunk-qchp9vrd.js:169252-169534 placement
async function looksLikeVcsTree(e) {
  let n;
  try {
    n = await readdir_10(e, { withFileTypes: !0 });
  } catch {
    return !1;
  }
  if (n.some((a) => Ai(a.name))) return !0;
  let r = 0;
  for (let a of n) {
    let joined = path_15.join(e, a.name);
    if ((await getFileKind(a, joined, "other")) !== "dir" || ++r > 200) continue;
    for (let h of Il)
      try {
        return (await lstat_11(path_15.join(joined, h)), !0);
      } catch {}
  }
  return !1;
}
//@ chunk-qchp9vrd.js:169534-169593 placement
function il(e) {
  try {
    return (checkPathSegmentWhitespace(e, "probe"), !0);
  } catch {
    return !1;
  }
}
//@ chunk-qchp9vrd.js:169593-170327 placement
function checkPathSegmentWhitespace(e, n) {
  for (let a of e.split(/[\\/]/))
    if (a !== a.trim())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${n} directory name "${Rm(a)}" starts or ends with whitespace, which cannot be scoped safely in a permission rule \u2014 rename it`,
        "eval path segment has edge whitespace",
      );
  let r = getPlatform() === "windows" ? e.replaceAll("\\", "/") : e;
  if (r.startsWith("//"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${n} is on a network (UNC) path, which cannot be scoped \u2014 run the evaluation from a local checkout`,
      "eval path is UNC",
    );
  if (nl.test(r)) {
    let a = r.split("/").find((s) => nl.test(s)) ?? "";
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${n} directory name "${Rm(a)}" contains a character that cannot be scoped safely in a permission rule (one of ( ) [ ] { } * ? ! # or a backslash) \u2014 rename it`,
      "eval path unsafe for permission rule",
    );
  }
}
//@ chunk-qchp9vrd.js:170327-170415 placement
var UNIX_TEMP_DIRS = ["/tmp", "/var/tmp", "/dev/shm", "/run/shm"],
  MACOS_PRIVATE_TEMP_DIRS = ["/private/tmp", "/private/var/tmp"];
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
var GIT_METADATA_ENTRIES = ["hooks", "config", "commondir"],
  Sf = [".git", "HEAD", "objects", "refs", "commondir"],
  al = [
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
  ],
  Tf = uniq([
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
    ...PROXY_ENV_VARS.filter((e) => e !== "JAVA_TOOL_OPTIONS"),
  ]),
  ll = new Set([
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
/**
 * 解析 /proc/mounts 文本，列出网络/远程文件系统、FUSE、WSL drvfs 与 UNC 来源的挂载点（解码八进制转义）。
 */
//@ chunk-qchp9vrd.js:172243-172633 placement
function parseNetworkMounts(e) {
  let n = [];
  for (let r of e.split(`
`)) {
    let [a, s, h, w] = r.split(" ");
    if (s === void 0 || h === void 0 || !path_15.posix.isAbsolute(s)) continue;
    let b = firstLineOf(h, ".");
    if (
      ll.has(h) ||
      ll.has(b) ||
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
    },
    r =
      e ??
      (await readFile_2("/proc/mounts", "utf8").catch(() =>
        n("the WSL mount table (/proc/mounts) cannot be read"),
      )),
    a = parseNetworkMounts(r);
  if (a.length === 0) n("no Windows filesystem mount was recognized in the WSL mount table");
  return a;
}
/**
 * 返回 XDG_CONFIG_HOME（须为绝对路径），否则 ~/.config。
 */
//@ chunk-qchp9vrd.js:173070-173185 placement
function getXdgConfigHome() {
  let e = process.env.XDG_CONFIG_HOME?.trim();
  return e && path_15.isAbsolute(e) ? e : path_15.join(os_3.homedir(), ".config");
}
//@ chunk-qchp9vrd.js:173185-173597 placement
var SECRET_MOUNT_DIRS = [
    "/var/run/secrets",
    "/run/secrets",
    "/run/credentials",
    "/etc/kubernetes/pki",
    "/var/lib/kubelet/pki",
    "/var/lib/rancher/k3s/server/tls",
    "/var/kerberos/krb5/user",
  ],
  If = 4194304,
  Pf = new Set(["KUBECONFIG"]),
  $f = new Set([
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
function Jn(e) {
  return /[*?[\]]/.test(e);
}
//@ chunk-qchp9vrd.js:173636-173675 placement
function Oi(e) {
  return path_15.dirname(e) === e;
}
//@ chunk-qchp9vrd.js:173675-173726 placement
function ul(e) {
  let dir = path_15.dirname(e);
  return Oi(dir) ? e : dir;
}
/**
 * 在路径列表中补上其真实路径对应的目录（去重）。
 */
//@ chunk-qchp9vrd.js:173726-173843 placement
async function withPathDirectories(e) {
  let n = await probePathDirectories(Promise.all(e.map((r) => realpath_8(r).catch(() => r))), "a directory");
  return uniq([...e, ...n]);
}
//@ chunk-qchp9vrd.js:173843-173889 placement
function $r(e) {
  return getPlatform() === "windows" ? e : toSandboxRulePath(e);
}
/**
 * 把文件路径转换为沙箱规则路径格式（Windows 盘符转 //c/...，其他前缀 /）。
 */
//@ chunk-qchp9vrd.js:173889-174088 placement
function toSandboxRulePath(e) {
  let n = getPlatform() === "windows" ? e.replaceAll("\\", "/") : e,
    match = /^([A-Za-z]):\//.exec(n);
  if (match) {
    let [a, s = ""] = match;
    return `//${s.toLowerCase()}/${n.slice(a.length)}`;
  }
  return `/${n.startsWith("/") ? n : `/${n}`}`;
}
/**
 * 解析用例引用的文件路径，要求经链接解析后仍位于用例目录或被测插件内，且是单链接普通文件，否则抛出。
 */
//@ chunk-qchp9vrd.js:179573-179930 placement
async function resolveCaseFileInsideSuite(e, n, r) {
  let a = await Io(e, n),
    s = await getSuiteRealRoots(e),
    h = await lstat_11(a).catch(() => null);
  if (!s.some((w) => toEvalPathError(w, a)) || h === null || !h.isFile() || h.nlink > 1)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `case "${e.name}": ${r} "${n}" resolves (through a link) outside the case directory and the plugin under test, or is not a plain single-link file`,
      "eval case file escapes suite via link",
    );
  return a;
}
/**
 * 获取评测用例目录与被测插件目录的真实路径。
 */
//@ chunk-qchp9vrd.js:179930-180037 placement
async function getSuiteRealRoots(e) {
  return Promise.all([e.caseDir, ...e.pluginDirsUnderTest].map((n) => realpath_8(n).catch(() => n)));
}
//@ chunk-qchp9vrd.js:180037-180119 placement
async function Io(e, n) {
  return checkCasePathInsideRoot(e.caseDir, n, `case "${e.name}"`, "case directory");
}
//@ chunk-qchp9vrd.js:180119-180724 placement
async function checkCasePathInsideRoot(e, n, r, a) {
  await checkRepoAuthoredPath(e, n, r);
  let resolved = path_15.resolve(e, n),
    h = await realpath_8(e).catch(() => path_15.resolve(e)),
    resolved_2 = path_15.resolve(h, n);
  if (resolved_2 !== h && !toEvalPathError(h, resolved_2))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${r}: path "${n}" escapes the ${a} (\`..\` or an absolute path) \u2014 it must name something inside it`,
      "case-authored path escapes its root",
    );
  try {
    return await realpath_8(resolved);
  } catch (error) {
    let y = getErrnoCode(error);
    if (y === "ENOENT" || y === "ENOTDIR")
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${r}: path "${n}" does not exist`,
          "case-authored path does not exist",
        ),
        { code: y },
      );
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${r}: path "${n}" is unreadable (${y ?? "unknown error"})`,
        "case-authored path unreadable",
      ),
      { code: y },
    );
  }
}
//@ chunk-qchp9vrd.js:180724-180751 placement
var Uf = /^EVAL_[A-Z0-9_]*$/;
/**
 * 从环境变量对象中删除被禁止的变量（名单或正则匹配）。
 */
//@ chunk-qchp9vrd.js:180751-180856 placement
function stripBlockedEnvVars(e) {
  for (let n of Object.keys(e)) {
    let upper = n.toUpperCase();
    if (Bf.has(upper) || regExp.test(n)) delete e[n];
  }
}

export {
  toSandboxRulePath,
  buildEvalFence,
  resolveCaseFileInsideSuite,
  withPathDirectories,
  checkPathSegmentWhitespace,
  Sf,
  Oi,
  detectWslWindowsMounts,
  ul,
  getTempDirs,
  Jn,
  If,
  getXdgConfigHome,
  Pf,
  al,
  $f,
  $r,
  GIT_METADATA_ENTRIES,
  SECRET_MOUNT_DIRS,
  Tf,
  Io,
  getSuiteRealRoots,
  Uf,
  stripBlockedEnvVars,
  describeFenceProbeFailure,
  checkCasePathInsideRoot,
};
