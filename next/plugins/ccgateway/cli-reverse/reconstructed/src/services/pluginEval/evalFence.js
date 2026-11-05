/**
 * services/pluginEval/evalFence.ts
 *
 * 2.1.316 新增：plugin eval 的路径围栏：解析插件、用例、add_dirs、版本控制目录与系统敏感目录
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (29)
 * attribution: placement 29
 */
import { default as path_3 } from "path";
import { realpath, lstat, readdir, readFile } from "fs/promises";
import os from "os";
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isCaseInsensitivePlatform, getPlatform } from "../../utils/platform.js";
import { isUncOrDevicePath } from "../../utils/pathClassification.js";
import { isNetworkMountPath } from "../../utils/networkPaths.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { listSubdirectories, probePathDirectories } from "./credentialExclusion.js";
import { openNoFollow_2 } from "../../utils/fsSafety/hardenedRead.js";
import { RULE_META_CHARS_RE } from "./runToolRules.js";
import { PROXY_ENV_VARS as PROXY_ENV_VARS_2 } from "../../utils/managedEnvConstants.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { STRIPPED_GIT_ENV_SET } from "./childEnvironment.js";
import { regExp } from "../../utils/git/gitSafeEnv.js";

//@ chunk-af1hzzme.js:152097-152290 placement
function describeFenceProbeFailure(label, error) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `${label}: a plugin, case or version-control path could not be examined (${getErrnoCode(error) ?? "unexpected error"}) \u2014 make it readable or remove it`,
    "eval fence probe failed",
  );
}
//@ chunk-af1hzzme.js:152290-166305 placement
/**
 * 解析插件、用例与 add_dirs 的真实路径，生成本次运行允许/拒绝访问的路径集合（约 14 KB）。
 */
async function buildEvalFence(evalCase, addDirs) {
  let caseLabel = `case "${formatGuardValueJson(evalCase.name)}"`;
  let evalDirSegments = evalCase.evalDirSegments ?? [EVALS_DIR_NAME];
  let pathWithin = (parent, child) => toEvalPathError(parent, child);
  let isSameOrWithin = (child, parent) => child === parent || pathWithin(child, parent);
  let resolveRealPath = async (targetPath) => {
    await checkRepoAuthoredPath(path_3.dirname(targetPath), path_3.basename(targetPath), caseLabel);
    return realpath(targetPath).catch((error) => {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT") return targetPath;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${caseLabel}: a plugin, case or add_dirs path could not be resolved (${errnoCode ?? "unexpected error"}) \u2014 make it readable or remove it`,
        "eval path unresolvable",
      );
    });
  };
  let hardLinkCount = async (targetPath) =>
    lstat(targetPath).then(
      (stats) => stats.nlink,
      (error) => {
        throw describeFenceProbeFailure(caseLabel, error);
      },
    );
  let foldKey = nfcKeyIfEnabled;
  let pathEndsWithSegments = (parts, suffix) => {
    let parts_2 = parts.split(path_3.sep);
    return (
      parts_2.length >= suffix.length &&
      suffix.every(
        (suffixSegment, suffixIndex) =>
          foldKey(parts_2[parts_2.length - suffix.length + suffixIndex]) === foldKey(suffixSegment),
      )
    );
  };
  let evalDirSuites = [evalDirSegments, [EVALS_DIR_NAME]];
  for (let pluginDir of evalCase.pluginDirsUnderTest) {
    let pluginManifestAdvisory = await readPluginManifestAdvisory({
      flag: undefined,
      pluginRoot: pluginDir,
    });
    if (pluginManifestAdvisory.ok) evalDirSuites.push(pluginManifestAdvisory.value.segments);
    evalDirSuites.push(...(await readManifestToFenceSuites(pluginDir)));
  }
  let isInsideEvalDir = (path) => evalDirSuites.some((segments) => pathEndsWithSegments(path, segments));
  let sameFolded = (left, right) => foldKey(left) === foldKey(right);
  let isVcsDirName = (name) => VCS_DIR_NAMES.some((vcsName) => sameFolded(name, vcsName));
  let listDirOrNull = async (dir, missingIsEmpty) => {
    let entries;
    try {
      entries = await readdir(dir, {
        withFileTypes: true,
      });
    } catch (error) {
      if (missingIsEmpty && getErrnoCode(error) === "ENOENT") return [];
      return null;
    }
    for (let entry of entries)
      if (entry.name.includes("\uFFFD"))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${caseLabel}: "${formatGuardValueJson(entry.name)}" under a plugin or eval directory is not a valid UTF-8 name (or imitates one that is not) \u2014 rename or remove it`,
          "eval tree has undecodable name",
        );
    return entries;
  };
  let throwUnlistable = (dir, root) => {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${caseLabel}: cannot list "${formatGuardValueJson(path_3.relative(root, dir) || ".")}" under a plugin or eval directory \u2014 make it readable or remove it`,
      "eval directory unlistable",
    );
  };
  let listFenceFiles = async (root) => {
    let files = [];
    let entryCount = 0;
    let pending = [
      {
        dir: root,
        depth: 0,
      },
    ];
    for (let current = pending.pop(); current !== undefined; current = pending.pop()) {
      let entries =
        (await listDirOrNull(current.dir, current.dir === root)) ?? throwUnlistable(current.dir, root);
      for (let entry of entries) {
        let joined = path_3.join(current.dir, entry.name);
        let fileKind = await getFileKind(entry, joined, "unknown");
        if (fileKind !== "dir" && fileKind !== "symlink" && fileKind !== "unknown") continue;
        if (++entryCount > MAX_FENCE_ENTRIES || current.depth >= 12) return [root];
        if (isInsideEvalDir(joined) || fileKind !== "dir") files.push(joined);
        else
          pending.push({
            dir: joined,
            depth: current.depth + 1,
          });
      }
    }
    return files;
  };
  let caseRealPath = await resolveRealPath(evalCase.caseDir);
  let results = await Promise.all(evalCase.pluginDirsUnderTest.map(resolveRealPath));
  let pluginDirsUnderTest = evalCase.pluginDirsUnderTest;
  let outermostSuite = (startPath, roots) => {
    let found;
    for (
      let dir = path_3.dirname(startPath);
      roots.some((root) => isSameOrWithin(root, dir));
      dir = path_3.dirname(dir)
    ) {
      if (isInsideEvalDir(dir)) found = dir;
      if (dir === path_3.dirname(dir)) break;
    }
    return found;
  };
  let caseSuite = outermostSuite(caseRealPath, results);
  let pluginSuite = outermostSuite(evalCase.caseDir, pluginDirsUnderTest);
  let pluginSuiteReal = pluginSuite === undefined ? undefined : await resolveRealPath(pluginSuite);
  let filtered = normalizeCaseForComparison_2(
    [caseSuite, pluginSuiteReal].filter((path) => path !== undefined),
  ).filter((path) => isSameOrWithin(path, caseRealPath));
  let dir = path_3.dirname(caseRealPath);
  let nearestEvalDir = () => {
    for (let dir = path_3.dirname(caseRealPath); dir !== path_3.dirname(dir); dir = path_3.dirname(dir))
      if (isInsideEvalDir(dir)) return dir;
    return;
  };
  let sandboxParent =
    filtered.find((path) => filtered.every((other) => isSameOrWithin(path, other))) ??
    filtered[0] ??
    nearestEvalDir() ??
    (results.some((pluginReal) => isSameOrWithin(pluginReal, dir)) ? dir : caseRealPath);
  let results_2 = await Promise.all(addDirs.map(resolveRealPath));
  for (let addDir of results_2) {
    let stats = await lstat(addDir).catch((error) => {
      if (getErrnoCode(error) === "ENOENT") return null;
      throw describeFenceProbeFailure(caseLabel, error);
    });
    if (stats !== null && !stats.isDirectory())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${caseLabel}: an add_dir must name a directory, not a file`,
        "eval add_dir is not a directory",
      );
  }
  let caseEntries = await readdir(caseRealPath).catch((error) => {
    if (getErrnoCode(error) === "ENOENT") return [];
    throw describeFenceProbeFailure(caseLabel, error);
  });
  let resolveCaseSubdir = async (name) => {
    let filtered = caseEntries.filter((entryName) => sameFolded(entryName, name));
    if (filtered.length > 1)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${caseLabel}: the case directory has more than one entry named "${name}" up to letter case \u2014 keep exactly one`,
        "eval case has case-variant duplicates of a reserved directory",
      );
    let joined = path_3.join(caseRealPath, filtered[0] ?? name);
    let stats = await lstat(joined).catch((error) => {
      if (getErrnoCode(error) === "ENOENT") return null;
      throw describeFenceProbeFailure(caseLabel, error);
    });
    if (stats?.isSymbolicLink())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${caseLabel}: "${name}" must be a real directory inside the case, not a symbolic link`,
        "eval case reserved directory is a symlink",
      );
    return stats === null ? joined : resolveRealPath(joined);
  };
  let gradersDir = await resolveCaseSubdir("graders");
  let mocksDir = await resolveCaseSubdir("mocks");
  let isWithinOrSame = (root, path) =>
    path === root || path.startsWith(root.endsWith(path_3.sep) ? root : root + path_3.sep);
  let findEvalDirAboveCase = () => {
    let resolved = path_3.resolve(evalCase.caseDir);
    for (let j = 0; j < 64; j++) {
      if (
        pathEndsWith(
          resolved.split(path_3.sep),
          evalDirSegments,
          isCaseInsensitivePlatform() ? "folded" : "exact",
        )
      )
        return resolved;
      let dir = path_3.dirname(resolved);
      if (dir === resolved) break;
      resolved = dir;
    }
    return null;
  };
  let results_3 = await Promise.all(
    (evalCase.graders ?? []).flatMap((grader) => {
      if (grader.type !== "baseline") return [];
      let path = path_3.resolve(caseRealPath, grader.baseline_file);
      if (
        path_3.isAbsolute(grader.baseline_file) ||
        isUncOrDevicePath(grader.baseline_file) ||
        isNetworkMountPath(grader.baseline_file) ||
        isUncOrDevicePath(path) ||
        isNetworkMountPath(path) ||
        ![
          evalCase.caseDir,
          caseRealPath,
          sandboxParent,
          findEvalDirAboveCase(),
          ...evalCase.pluginDirsUnderTest,
        ]
          .filter((root) => root !== null)
          .some((root) => isWithinOrSame(path_3.resolve(root), path))
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${caseLabel}: a baseline grader's baseline_file must be a relative path inside the suite or the plugin under test`,
          "eval: baseline_file not relative",
        );
      return [resolveRealPath(path)];
    }),
  );
  for (let addDirReal of results_2)
    if (
      isSameOrWithin(addDirReal, caseRealPath) ||
      isSameOrWithin(addDirReal, sandboxParent) ||
      results.some((pluginReal) => addDirReal === pluginReal) ||
      (pathWithin(sandboxParent, addDirReal) && !pathWithin(caseRealPath, addDirReal)) ||
      isSameOrWithin(addDirReal, gradersDir) ||
      isSameOrWithin(gradersDir, addDirReal) ||
      isSameOrWithin(addDirReal, mocksDir) ||
      isSameOrWithin(mocksDir, addDirReal) ||
      results_3.some((baselineReal) => pathWithin(addDirReal, baselineReal))
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${caseLabel}: an add_dir may only name fixture directories inside this case \u2014 not the case directory itself, its graders, a sibling case, an eval directory, or the plugin root`,
        "eval add_dir covers case definitions",
      );
  let pluginRoots = [...results, sandboxParent, caseRealPath];
  let vcsFilesFound = new Set();
  let filtered_2 = results.filter((pluginReal) => pathWithin(sandboxParent, pluginReal));
  for (let path of filtered_2)
    if (
      !pathWithin(caseRealPath, path) ||
      [gradersDir, mocksDir].some((dir) => isSameOrWithin(path, dir) || isSameOrWithin(dir, path)) ||
      results_3.some((baseline) => isSameOrWithin(path, baseline))
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${caseLabel}: a plugins entry names the case directory, its graders or mocks, or a directory covering them \u2014 a plugin shipped with a case must sit in its own subdirectory`,
        "eval case plugin covers case material",
      );
  let restrictedRoots = [...results_2, ...filtered_2];
  let isUnderReadable = (path) => restrictedRoots.some((root) => isSameOrWithin(root, path));
  let isUnderRestricted = (path) => restrictedRoots.some((root) => pathWithin(path, root));
  let missingPaths = [];
  let allowedPaths = [];
  let allowRules = [];
  let allowPaths = [];
  let toRulePath = (path) => {
    checkPathSegmentWhitespace(path, "plugin entry");
    return toSandboxRulePath(path);
  };
  let lexicalAliases = [];
  for (let pluginDir of [...evalCase.pluginDirs, ...evalCase.pluginDirsUnderTest]) {
    let resolved = path_3.resolve(pluginDir);
    let canonical = await resolveRealPath(pluginDir);
    if (resolved !== path_3.resolve(canonical) && !lexicalAliases.some((alias) => alias.lexical === resolved))
      lexicalAliases.push({
        canonical,
        lexical: resolved,
      });
  }
  let withAliases = (path) => {
    let variants = [path];
    for (let { canonical, lexical } of lexicalAliases)
      if (path === canonical || toEvalPathError(canonical, path))
        variants.push(lexical + path.slice(canonical.length));
    return variants;
  };
  let seenRules = new Set();
  let usableAncestor = (path) => {
    let current = path;
    for (;;) {
      if (isUsablePathSegment(current)) {
        if (
          current !== path &&
          [...results, sandboxParent, caseRealPath].some((root) => isSameOrWithin(current, root))
        )
          checkPathSegmentWhitespace(path, "plugin entry");
        return current;
      }
      let dir = path_3.dirname(current);
      if (dir === current) {
        checkPathSegmentWhitespace(path, "plugin entry");
        return current;
      }
      current = dir;
    }
  };
  let allowTree = (path) => {
    let ancestor = usableAncestor(path);
    for (let variant of withAliases(ancestor)) {
      let ruleKey = `tree:${path_3.normalize(variant)}`;
      if (seenRules.has(ruleKey)) continue;
      seenRules.add(ruleKey);
      allowRules.push(`${READ}(${toRulePath(variant)})`, `${READ}(${toRulePath(variant)}/**)`);
      allowPaths.push(variant);
    }
  };
  let allowFile = (path) => {
    if (!isUsablePathSegment(path)) {
      allowTree(usableAncestor(path));
      return;
    }
    let ancestor = path;
    for (let variant of withAliases(ancestor)) {
      let ruleKey = `file:${path_3.normalize(variant)}`;
      if (seenRules.has(ruleKey)) continue;
      seenRules.add(ruleKey);
      allowRules.push(`${READ}(${toRulePath(variant)})`);
      allowPaths.push(variant);
    }
  };
  let screenEvalTree = async (root) => {
    let entryCount = 0;
    let any = filtered_2.some((pluginReal) => isSameOrWithin(pluginReal, root));
    let pending = [root];
    for (let current = pending.pop(); current !== undefined; current = pending.pop()) {
      let entries = (await listDirOrNull(current, current === root)) ?? throwUnlistable(current, root);
      for (let entry of entries) {
        if (++entryCount > MAX_FENCE_ENTRIES)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${caseLabel}: the eval directory holds more than ${MAX_FENCE_ENTRIES} entries \u2014 move large fixtures out of it`,
            "eval suite too large to screen",
          );
        let path = path_3.join(current, entry.name);
        if (!any && filtered_2.some((pluginReal) => isSameOrWithin(pluginReal, path))) continue;
        let fileKind = await getFileKind(entry, path, "unknown");
        if (fileKind === "unknown")
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${caseLabel}: cannot tell what "${formatGuardValueJson(entry.name)}" under the eval directory is \u2014 make it readable or remove it`,
            "eval case tree entry unclassifiable",
          );
        let insideAddDir = any
          ? results_2.some((pluginReal) => isSameOrWithin(pluginReal, path))
          : isUnderReadable(path);
        if (fileKind === "symlink" && insideAddDir) continue;
        if (fileKind === "symlink") {
          let linkTarget = await resolveRealPath(path);
          if (linkTarget === path)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${caseLabel}: "${formatGuardValueJson(entry.name)}" under the eval directory is a symbolic link whose target cannot be resolved \u2014 remove it or point it at an existing file`,
              "eval suite link unresolvable",
            );
          if (results_2.includes(linkTarget)) continue;
          let targetStats = await lstat(linkTarget).catch((error) => {
            throw describeFenceProbeFailure(caseLabel, error);
          });
          if (!targetStats.isDirectory()) {
            allowFile(path);
            if (targetStats.nlink > 1)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `${caseLabel}: "${formatGuardValueJson(path_3.relative(root, path))}" under the eval directory links to a file with ${targetStats.nlink} names \u2014 case definitions must not be reachable by another name`,
                "eval suite links to hard-linked file",
              );
            allowFile(linkTarget);
            continue;
          }
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${caseLabel}: "${formatGuardValueJson(entry.name)}" under the eval directory is a symbolic link to a directory \u2014 case definitions must be plain files and directories`,
            "eval case tree contains a symlink",
          );
        }
        if (fileKind === "dir") pending.push(path);
        else if (fileKind === "file" && (await hardLinkCount(path)) > 1)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            insideAddDir
              ? `${caseLabel}: "${formatGuardValueJson(path_3.relative(root, path))}" inside an add_dir has more than one hard link \u2014 fixtures must be plain copies`
              : `${caseLabel}: "${formatGuardValueJson(entry.name)}" under the eval directory has more than one hard link \u2014 case definitions must not be reachable by another name`,
            insideAddDir ? "eval add_dir file hard-linked" : "eval case file hard-linked",
          );
      }
    }
  };
  let mapped = evalDirSuites.map((segments) => segments.join("/"));
  for (let baselinePath of results_3) {
    allowFile(baselinePath);
    let stats = await lstat(baselinePath).catch((error) => {
      if (getErrnoCode(error) === "ENOENT") return null;
      throw describeFenceProbeFailure(caseLabel, error);
    });
    if (stats !== null && !stats.isFile())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${caseLabel}: a baseline grader's baseline_file must name a regular file`,
        "eval baseline reference is not a regular file",
      );
    if (stats !== null && stats.nlink > 1)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${caseLabel}: a baseline grader's reference file is hard-linked (has another name) \u2014 keep a single copy`,
        "eval baseline reference is hard-linked",
      );
  }
  let nestedSuitePaths = new Set();
  let allowNestedSuite = (path) => {
    allowTree(path);
    for (let variant of withAliases(path)) nestedSuitePaths.add(variant);
  };
  let screenPluginDir = async (root, kind = "plugin") => {
    let entryCount = 0;
    let pending = [root];
    for (let current = pending.pop(); current !== undefined; current = pending.pop()) {
      if (
        isSameOrWithin(sandboxParent, current) &&
        !filtered_2.some((pluginReal) => isSameOrWithin(pluginReal, current))
      )
        continue;
      let entries = (await listDirOrNull(current, current === root)) ?? throwUnlistable(current, root);
      if (current !== root || !results.includes(root))
        for (let segments of await readManifestToFenceSuites(current)) {
          let joined = path_3.join(current, ...segments);
          let realPath = await resolveRealPath(joined);
          if (
            realPath !== joined &&
            !results.some((pluginReal) => isSameOrWithin(pluginReal, realPath)) &&
            kind === "plugin"
          )
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${caseLabel}: ${formatGuardValueJson(path_3.relative(root, joined))} is an eval-directory link that points outside the plugin \u2014 remove it`,
              "eval nested suite link escapes plugin",
            );
          let shouldScreen = (path) =>
            !isSameOrWithin(sandboxParent, path) ||
            filtered_2.some((pluginReal) => isSameOrWithin(pluginReal, path));
          for (let path of normalizeCaseForComparison_2([joined, realPath]))
            if (shouldScreen(path)) allowTree(path);
          if (realPath !== joined && !results.some((pluginReal) => isSameOrWithin(pluginReal, realPath)));
          else if (shouldScreen(realPath))
            await screenEvalTree(realPath).catch((error) => {
              if (getErrnoCode(error) === "ENOENT" || getErrnoCode(error) === "ENOTDIR") return;
              throw error;
            });
        }
      for (let entry of entries) {
        if (++entryCount > MAX_FENCE_ENTRIES)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            kind === "plugin"
              ? `${caseLabel}: a plugin directory holds more than ${MAX_FENCE_ENTRIES} entries to check for eval directories \u2014 point the case at a smaller plugin directory`
              : `${caseLabel}: a checkout sharing the plugin's repository holds more than ${MAX_FENCE_ENTRIES} entries to check for eval directories \u2014 run from a standalone clone`,
            "eval plugin too large to screen",
          );
        let joined = path_3.join(current, entry.name);
        if (isVcsDirName(entry.name)) {
          allowNestedSuite(joined);
          for (let vcsPath of await probeVcsMetadata(current, caseLabel, pluginRoots, (filePath) =>
            vcsFilesFound.add(filePath),
          ))
            allowNestedSuite(vcsPath);
          continue;
        }
        let fileKind = await getFileKind(entry, joined, "unknown");
        if (fileKind === "unknown") {
          allowTree(joined);
          continue;
        }
        if (sameFolded(entry.name, "node_modules")) {
          if (fileKind !== "dir") {
            allowTree(joined);
            continue;
          }
          for (let fileName of mapped)
            allowRules.push(
              `${READ}(${toRulePath(joined)}/**/${fileName})`,
              `${READ}(${toRulePath(joined)}/**/${fileName}/**)`,
            );
          for (let nestedPath of await listFenceFiles(joined)) allowTree(nestedPath);
          continue;
        }
        if (fileKind === "file" && isRunArtifactFile(entry.name)) {
          if (kind === "plugin" && (await hardLinkCount(joined)) > 1)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${caseLabel}: a file in the plugin has more than one name (a hard link) \u2014 case definitions must not be reachable by another name; replace it with a copy`,
              "eval plugin contains hard-linked file",
            );
          allowFile(joined);
          continue;
        }
        if (fileKind === "symlink" && isInsideEvalDir(joined)) {
          allowTree(joined);
          let linkTarget = await resolveRealPath(joined);
          if (kind === "plugin" && !results.some((pluginReal) => isSameOrWithin(pluginReal, linkTarget)))
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${caseLabel}: ${formatGuardValueJson(path_3.relative(root, joined))} is an eval-directory link that points outside the plugin \u2014 remove it`,
              "eval suite link leaves the plugin",
            );
          if (!results.some((pluginReal) => isSameOrWithin(pluginReal, linkTarget))) allowTree(linkTarget);
          else if (
            !isSameOrWithin(sandboxParent, linkTarget) ||
            filtered_2.some((pluginReal) => isSameOrWithin(pluginReal, linkTarget))
          ) {
            allowTree(linkTarget);
            await screenEvalTree(linkTarget);
          }
          continue;
        }
        if (fileKind !== "dir") {
          if (fileKind === "file" && (await hardLinkCount(joined)) > 1) {
            if (kind === "spared") {
              allowFile(joined);
              continue;
            }
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `${caseLabel}: a file in the plugin has more than one name (a hard link) \u2014 case definitions must not be reachable by another name; replace it with a copy`,
              "eval plugin contains hard-linked file",
            );
          }
          continue;
        }
        if (
          isSameOrWithin(sandboxParent, joined) &&
          !filtered_2.some((pluginReal) => isSameOrWithin(pluginReal, joined))
        )
          continue;
        if (isInsideEvalDir(joined)) {
          allowTree(joined);
          await screenEvalTree(joined);
        } else if (await looksLikeVcsTree(joined)) allowTree(joined);
        else pending.push(joined);
      }
    }
  };
  let scanManifestDirs = async (dirs) => {
    for (let dir of dirs) {
      let dirCount = 0;
      let pending = [
        {
          dir,
          depth: 0,
        },
      ];
      for (let current = pending.pop(); current !== undefined; current = pending.pop()) {
        evalDirSuites.push(...(await readManifestToFenceSuites(current.dir)));
        if (current.depth >= MAX_FENCE_MANIFEST_DEPTH) continue;
        if (++dirCount > MAX_FENCE_ENTRIES)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${caseLabel}: too many directories to examine for eval manifests \u2014 refusing to run`,
            "eval fence: manifest scan budget exceeded",
          );
        for (let subdir of await listSubdirectories(current.dir, caseLabel)) {
          let base = path_3.basename(subdir);
          if (!isVcsDirName(base) && !sameFolded(base, "node_modules"))
            pending.push({
              dir: subdir,
              depth: current.depth + 1,
            });
        }
      }
    }
  };
  for (let root of normalizeCaseForComparison_2([...results, sandboxParent, caseRealPath]))
    for (let vcsPath of await probeVcsMetadata(root, caseLabel, pluginRoots, (filePath) =>
      vcsFilesFound.add(filePath),
    ))
      allowNestedSuite(vcsPath);
  let scannedDirs = new Set();
  let screenedRoots = new Set();
  for (let j = 0; j < 8; j++) {
    let dirs = [...vcsFilesFound].filter((dir) => !scannedDirs.has(dir));
    let manifestCount = evalDirSuites.length;
    await scanManifestDirs(dirs);
    for (let dir of dirs) scannedDirs.add(dir);
    let foundNew = evalDirSuites.length > manifestCount;
    for (let root of [...results, ...vcsFilesFound])
      if (foundNew || !screenedRoots.has(root)) {
        await screenPluginDir(root, results.includes(root) ? "plugin" : "spared");
        screenedRoots.add(root);
      }
    if ([...vcsFilesFound].every((dir) => scannedDirs.has(dir))) break;
  }
  if (![...vcsFilesFound].every((dir) => scannedDirs.has(dir)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${caseLabel}: the repository layout keeps revealing further working trees \u2014 refusing to run`,
      "eval fence: spared-tree fixed point not reached",
    );
  for (let pluginDir of evalCase.pluginDirs) {
    let pluginReal = await resolveRealPath(pluginDir);
    if (
      !filtered_2.includes(pluginReal) &&
      allowPaths.some((denyPath) => isSameOrWithin(denyPath, pluginReal))
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${caseLabel}: a plugin listed by the case lies inside an eval suite or another fenced directory \u2014 move it out of the suite`,
        "eval: case plugin inside a fenced suite",
      );
  }
  for (let pluginDir of evalCase.pluginDirs) {
    let pluginReal = await resolveRealPath(pluginDir);
    let resolved = path_3.resolve(pluginDir);
    let aliasVariants = (path) =>
      resolved === path_3.resolve(pluginReal) ? [path] : [path, resolved + path.slice(pluginReal.length)];
    if (!isSameOrWithin(pluginReal, sandboxParent)) {
      missingPaths.push(...aliasVariants(pluginReal));
      continue;
    }
    for (let current = pluginReal; current !== sandboxParent;) {
      let entries = await listDirOrNull(current, current === pluginReal);
      if (entries === null) break;
      let nextUp;
      for (let entry of entries) {
        let repoRoot = path_3.join(current, entry.name);
        if (isSameOrWithin(repoRoot, sandboxParent)) {
          nextUp = repoRoot;
          continue;
        }
        let fileKind = await getFileKind(entry, repoRoot, "other");
        checkPathSegmentWhitespace(repoRoot, "plugin entry");
        if (isVcsDirName(entry.name) || isInsideEvalDir(repoRoot) || nestedSuitePaths.has(repoRoot)) continue;
        if (fileKind === "dir") {
          if (await looksLikeVcsTree(repoRoot)) continue;
          missingPaths.push(...aliasVariants(repoRoot));
        } else if (fileKind === "symlink") missingPaths.push(...aliasVariants(repoRoot));
        else if (
          fileKind === "file" &&
          !isRunArtifactFile(entry.name) &&
          (await hardLinkCount(repoRoot)) === 1
        )
          allowedPaths.push(...aliasVariants(repoRoot));
      }
      if (nextUp === undefined) break;
      current = nextUp;
    }
  }
  evalCase.pluginDirsUnderTest.forEach((pluginDir, index) => {
    let realDir = results[index] ?? pluginDir;
    if (isSameOrWithin(realDir, sandboxParent)) {
      let joined = path_3.join(pluginDir, path_3.relative(realDir, sandboxParent));
      if (joined !== sandboxParent) allowTree(joined);
    }
  });
  let parts = path_3.relative(sandboxParent, caseRealPath).split(path_3.sep);
  let parts_2 = path_3.resolve(evalCase.caseDir).split(path_3.sep);
  if (
    parts.length < parts_2.length &&
    parts.every(
      (part, partIndex) =>
        foldKey(part) === foldKey(parts_2[parts_2.length - parts.length + partIndex] ?? ""),
    )
  ) {
    let joined = parts_2.slice(0, parts_2.length - parts.length).join(path_3.sep);
    if (joined !== sandboxParent && joined !== "") allowTree(joined);
  }
  if (isCaseInsensitivePlatform()) {
    let suffix = evalDirSegments;
    let joined = sandboxParent.split(path_3.sep).slice(0, -suffix.length).join(path_3.sep);
    let joined_2 = path_3.join(joined || path_3.sep, ...suffix);
    if (joined_2 !== sandboxParent && pathEndsWithSegments(sandboxParent, suffix)) allowTree(joined_2);
  }
  await screenEvalTree(sandboxParent);
  let suiteQueue = restrictedRoots.some((pluginReal) => pathWithin(sandboxParent, pluginReal))
    ? [sandboxParent]
    : [];
  if (suiteQueue.length === 0) allowTree(sandboxParent);
  for (let suiteDir = suiteQueue.pop(); suiteDir !== undefined; suiteDir = suiteQueue.pop()) {
    let entries =
      (await listDirOrNull(suiteDir, suiteDir === sandboxParent)) ?? throwUnlistable(suiteDir, sandboxParent);
    for (let entry of entries) {
      let path = path_3.join(suiteDir, entry.name);
      if (isUnderReadable(path)) continue;
      let fileKind = await getFileKind(entry, path, "unknown");
      if (fileKind === "dir" && isUnderRestricted(path)) suiteQueue.push(path);
      else if (fileKind === "dir" || fileKind === "unknown") allowTree(path);
      else allowFile(path);
    }
  }
  for (let addDir of results_2) {
    if (addDir.split(path_3.sep).some((part) => isVcsDirName(part)))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${caseLabel}: an add_dirs entry points into version-control metadata \u2014 point it at the fixtures themselves`,
        "eval add_dir inside vcs dir",
      );
    for (let vcsPath of nestedSuitePaths)
      if (addDir === vcsPath || toEvalPathError(vcsPath, addDir))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${caseLabel}: an add_dirs entry points into version-control metadata \u2014 point it at the fixtures themselves`,
          "eval add_dir inside vcs dir",
        );
    for (let denyPath of allowPaths) {
      let overlaps = (left, right) =>
        nfcKeyIfEnabled(left) === nfcKeyIfEnabled(right) || toEvalPathError(left, right, nfcKeyIfEnabled);
      if (
        !(
          overlaps(sandboxParent, denyPath) &&
          !filtered_2.some((pluginReal) => overlaps(pluginReal, denyPath)) &&
          !nestedSuitePaths.has(denyPath) &&
          !denyPath.split(path_3.sep).some((part) => isVcsDirName(part))
        ) &&
        (nfcKeyIfEnabled(addDir) === nfcKeyIfEnabled(denyPath) ||
          toEvalPathError(denyPath, addDir, nfcKeyIfEnabled))
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${caseLabel}: an add_dirs entry points inside a directory that holds case definitions or version-control data of a plugin under test \u2014 point it at the fixtures themselves`,
          "eval add_dir inside fenced directory",
        );
    }
  }
  return {
    readRoots: normalizeCaseForComparison_2(missingPaths.map((root) => path_3.normalize(root))),
    readFiles: normalizeCaseForComparison_2(allowedPaths.map((file) => path_3.normalize(file))),
    denies: allowRules,
    denyPaths: normalizeCaseForComparison_2(allowPaths.map((denyPath) => path_3.normalize(denyPath))),
  };
}
//@ chunk-af1hzzme.js:166305-166331 placement
/**
 * 记录的条目上限（4096）。
 */
var MAX_FENCE_ENTRIES = 20000;
var MAX_FENCE_MANIFEST_DEPTH = 3;
var MAX_FENCE_RECORDS = 4096;
//@ chunk-af1hzzme.js:166331-169913 placement
async function probeVcsMetadata(root, label = "plugin eval", knownRoots = [], onSpared) {
  let rethrowOrNull = (error) => {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return null;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}: a version-control directory or one of its pointers could not be resolved (${errnoCode ?? "unexpected error"}) \u2014 make it readable or remove it`,
      "eval vcs metadata unresolvable",
    );
  };
  let realPathOf = async (path) => {
    await checkRepoAuthoredPath(path_3.dirname(path), path_3.basename(path), label);
    return realpath(path).catch(rethrowOrNull);
  };
  let baseReal = (await realPathOf(root)) ?? root;
  let found = [path_3.join(baseReal, ".git")];
  let realPathRelative = async (base, relativePath) => {
    await checkRepoAuthoredPath(base, relativePath, label);
    return realpath(path_3.resolve(base, relativePath)).catch(rethrowOrNull);
  };
  let addIfOutside = (path) => {
    if (
      [baseReal, ...knownRoots].every(
        (knownRoot) =>
          path !== knownRoot && !toEvalPathError(knownRoot, path) && !toEvalPathError(path, knownRoot),
      )
    )
      found.push(path);
    else if (path !== baseReal && !toEvalPathError(path, baseReal)) onSpared?.(path);
  };
  let probeGitDir = async (dir, depth = 0) => {
    await probeStore(dir, ".git");
    let joined = path_3.join(dir, "objects");
    let alternatesText = (await checkGitMetadataFile(path_3.join(joined, "info", "alternates"), 4096)) ?? "";
    for (let line of alternatesText.split(`
`)) {
      let trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      let target = await realPathRelative(joined, trimmed);
      if (target === null) continue;
      found.push(target);
      if (path_3.basename(target) === "objects") {
        let dir = path_3.dirname(target);
        found.push(dir);
        if (path_3.basename(dir) === ".git") addIfOutside(path_3.dirname(dir));
        if (depth < 5) await probeGitDir(dir, depth + 1);
      }
    }
    let worktrees = [];
    try {
      worktrees = await readdir(path_3.join(dir, "worktrees"), {
        withFileTypes: true,
      });
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT" && getErrnoCode(error) !== "ENOTDIR")
        throw describeFenceProbeFailure(label, error);
    }
    if (worktrees.length > 200)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${label}: a git directory of the plugin registers more linked worktrees than can be screened`,
        "eval plugin git dir has too many worktrees",
      );
    for (let worktree of worktrees) {
      let joined = path_3.join(dir, "worktrees", worktree.name);
      let trimmed = ((await checkGitMetadataFile(path_3.join(joined, "gitdir"), 4096)) ?? "").trim();
      if (trimmed) {
        let gitDir = await realPathRelative(joined, trimmed);
        if (gitDir !== null) addIfOutside(path_3.dirname(gitDir));
      }
    }
  };
  let storesByVcs = {
    ".git": ["objects", path_3.join("objects", "pack"), "lfs"],
    ".hg": ["store"],
    ".sl": ["store"],
    ".svn": ["pristine"],
    ".jj": ["repo", path_3.join("repo", "store")],
    ".bzr": ["repository"],
    _darcs: ["patches", "pristine.hashed", "inventories"],
  };
  let probeStore = async (dir, vcsName, subpaths) => {
    for (let subpath of subpaths ?? storesByVcs[vcsName] ?? []) {
      let real = await realPathOf(path_3.join(dir, subpath));
      if (real === null) continue;
      if (real !== dir && !toEvalPathError(dir, real)) {
        found.push(real);
        continue;
      }
      let entries = await readdir(real, {
        withFileTypes: true,
      }).catch((error) => {
        if (getErrnoCode(error) === "ENOENT" || getErrnoCode(error) === "ENOTDIR") return [];
        throw describeFenceProbeFailure(label, error);
      });
      let entryCount = 0;
      for (let entry of entries) {
        if (++entryCount > MAX_FENCE_RECORDS)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `${label}: a version-control store holds too many top-level entries to examine \u2014 refusing to run`,
            "eval fence: vcs store too large to screen",
          );
        let fileKind = await getFileKind(entry, path_3.join(real, entry.name), "unknown");
        if (fileKind === "unknown")
          throw describeFenceProbeFailure(label, Error("unclassifiable version-control store entry"));
        if (fileKind !== "symlink") continue;
        let linkTarget = await realPathOf(path_3.join(real, entry.name));
        if (linkTarget !== null && !toEvalPathError(dir, linkTarget)) found.push(linkTarget);
      }
    }
  };
  let probeSharedStore = async (dir, vcsName) => {
    let pointerPath;
    let sharedRoot;
    if (vcsName === ".hg" || vcsName === ".sl") {
      pointerPath = path_3.join(dir, "sharedpath");
      sharedRoot = (pointer) => path_3.dirname(pointer);
    } else if (vcsName === ".jj") {
      pointerPath = path_3.join(dir, "repo");
      sharedRoot = (repoPath) => path_3.dirname(path_3.dirname(repoPath));
    } else return;
    if (
      !(await lstat(pointerPath).then(
        (stats) => stats.isFile(),
        (error) => {
          if (getErrnoCode(error) === "ENOENT" || getErrnoCode(error) === "ENOTDIR") return false;
          throw describeFenceProbeFailure(label, error);
        },
      ))
    )
      return;
    let trimmed = ((await checkGitMetadataFile(pointerPath, 4096)) ?? "").trim();
    if (trimmed === "") return;
    let sharedReal = await realPathRelative(dir, trimmed);
    if (sharedReal === null) return;
    found.push(sharedReal);
    addIfOutside(sharedRoot(sharedReal));
    await probeStore(sharedReal, vcsName, vcsName === ".jj" ? ["store"] : undefined);
  };
  let probeGitFile = async (gitFilePath) => {
    let text = (await checkGitMetadataFile(gitFilePath, 4096)) ?? "";
    let match = /^gitdir:\s*(.+)$/m.exec(text);
    if (!match?.[1]) return false;
    let gitDirReal = await realPathRelative(path_3.dirname(gitFilePath), match[1].trim());
    if (gitDirReal === null) return false;
    found.push(gitDirReal);
    await probeGitDir(gitDirReal);
    let trimmed = ((await checkGitMetadataFile(path_3.join(gitDirReal, "commondir"), 4096)) ?? "").trim();
    if (trimmed) {
      let commonDir = await realPathRelative(gitDirReal, trimmed);
      if (commonDir !== null) {
        found.push(commonDir);
        await probeGitDir(commonDir);
        addIfOutside(path_3.dirname(commonDir));
      }
    }
    return lstat(path_3.join(gitDirReal, "HEAD")).then(
      () => true,
      (error) => {
        if (getErrnoCode(error) === "ENOENT") return false;
        throw describeFenceProbeFailure(label, error);
      },
    );
  };
  for (let dir = baseReal; ;) {
    let foundRepo = false;
    for (let vcsName of VCS_DIR_NAMES) {
      let vcsPath = await realPathOf(path_3.join(dir, vcsName));
      if (vcsPath === null) continue;
      found.push(vcsPath);
      await probeStore(vcsPath, vcsName);
      if (vcsName !== ".git") {
        await probeSharedStore(vcsPath, vcsName);
        continue;
      }
      let stats = await lstat(vcsPath).catch((error) => {
        if (getErrnoCode(error) === "ENOENT") return null;
        throw describeFenceProbeFailure(label, error);
      });
      if (stats === null) continue;
      if (stats.isFile()) foundRepo = (await probeGitFile(vcsPath)) || foundRepo;
      else {
        await probeGitDir(vcsPath);
        foundRepo =
          (await lstat(path_3.join(vcsPath, "HEAD")).then(
            () => true,
            (error) => {
              if (getErrnoCode(error) === "ENOENT") return false;
              throw describeFenceProbeFailure(label, error);
            },
          )) || foundRepo;
      }
    }
    if (foundRepo && dir !== baseReal) break;
    let dir_2 = path_3.dirname(dir);
    if (dir_2 === dir) break;
    dir = dir_2;
  }
  return normalizeCaseForComparison_2(found);
}
//@ chunk-af1hzzme.js:169913-170490 placement
async function checkGitMetadataFile(filePath, maxBytes) {
  let noFollow = await openNoFollow_2(filePath);
  if (!noFollow.ok) {
    if (noFollow.error.kind === "absent") return null;
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `git metadata file "${path_3.basename(filePath)}" is not a plain readable file`,
      "eval metadata file unreadable or not plain",
    );
  }
  let handle = noFollow.value;
  try {
    let stats = await handle.stat();
    if (!stats.isFile())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `git metadata file "${path_3.basename(filePath)}" is not a regular file`,
        "eval metadata file is not a regular file",
      );
    if (stats.size > maxBytes)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `git metadata file "${path_3.basename(filePath)}" is larger than ${maxBytes} bytes`,
        "eval metadata file too large",
      );
    return (await handle.readFile()).toString("utf8");
  } finally {
    await handle.close();
  }
}
//@ chunk-af1hzzme.js:170490-170596 placement
/**
 * 运行产物的文件名（aggregate-result.json、report.html）。
 */
var VCS_DIR_NAMES = [".git", ".hg", ".svn", ".jj", ".sl", ".bzr", "_darcs", "CVS"];
var RUN_ARTIFACT_FILENAMES = ["aggregate-result.json", "report.html"];
//@ chunk-af1hzzme.js:170596-170647 placement
/**
 * 判断文件是否为运行产物。
 */
function isRunArtifactFile(name) {
  return RUN_ARTIFACT_FILENAMES.includes(name.toLowerCase());
}
//@ chunk-af1hzzme.js:170647-170929 placement
async function looksLikeVcsTree(repoRoot) {
  let entries;
  try {
    entries = await readdir(repoRoot, {
      withFileTypes: true,
    });
  } catch {
    return false;
  }
  if (entries.some((entry) => isRunArtifactFile(entry.name))) return true;
  let dirCount = 0;
  for (let entry of entries) {
    let joined = path_3.join(repoRoot, entry.name);
    if ((await getFileKind(entry, joined, "other")) !== "dir" || ++dirCount > 200) continue;
    for (let fileName of RUN_ARTIFACT_FILENAMES)
      try {
        await lstat(path_3.join(joined, fileName));
        return true;
      } catch {}
  }
  return false;
}
//@ chunk-af1hzzme.js:170929-170988 placement
/**
 * 判断路径段是否可用（校验通过）。
 */
function isUsablePathSegment(segment) {
  try {
    checkPathSegmentWhitespace(segment, "probe");
    return true;
  } catch {
    return false;
  }
}
//@ chunk-af1hzzme.js:170988-171722 placement
function checkPathSegmentWhitespace(path, label) {
  for (let segment of path.split(/[\\/]/))
    if (segment !== segment.trim())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${label} directory name "${formatGuardValueJson(segment)}" starts or ends with whitespace, which cannot be scoped safely in a permission rule \u2014 rename it`,
        "eval path segment has edge whitespace",
      );
  let normalizedPath = getPlatform() === "windows" ? path.replaceAll("\\", "/") : path;
  if (normalizedPath.startsWith("//"))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label} is on a network (UNC) path, which cannot be scoped \u2014 run the evaluation from a local checkout`,
      "eval path is UNC",
    );
  if (RULE_META_CHARS_RE.test(normalizedPath)) {
    let offendingSegment =
      normalizedPath.split("/").find((segment) => RULE_META_CHARS_RE.test(segment)) ?? "";
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label} directory name "${formatGuardValueJson(offendingSegment)}" contains a character that cannot be scoped safely in a permission rule (one of ( ) [ ] { } * ? ! # or a backslash) \u2014 rename it`,
      "eval path unsafe for permission rule",
    );
  }
}
//@ chunk-af1hzzme.js:171722-171810 placement
var UNIX_TEMP_DIRS = ["/tmp", "/var/tmp", "/dev/shm", "/run/shm"];
var MACOS_PRIVATE_TEMP_DIRS = ["/private/tmp", "/private/var/tmp"];
//@ chunk-af1hzzme.js:171810-171910 placement (2.1.88 match: getReservedShortcuts, 1)
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
//@ chunk-af1hzzme.js:171910-173638 placement
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
var PROXY_ENV_VARS_EXTRA = normalizeCaseForComparison_2([
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
  ...PROXY_ENV_VARS_2.filter((name) => name !== "JAVA_TOOL_OPTIONS"),
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
//@ chunk-af1hzzme.js:173638-174028 placement
/**
 * 解析 /proc/mounts 文本，列出网络/远程文件系统、FUSE、WSL drvfs 与 UNC 来源的挂载点（解码八进制转义）。
 */
function parseNetworkMounts(mountTable) {
  let mounts = [];
  for (let line of mountTable.split(`
`)) {
    let [device, mountPoint, fsType, mountOptions] = line.split(" ");
    if (mountPoint === undefined || fsType === undefined || !path_3.posix.isAbsolute(mountPoint)) continue;
    let baseFsType = firstLineOf(fsType, ".");
    if (
      NETWORK_FS_NAMES.has(fsType) ||
      NETWORK_FS_NAMES.has(baseFsType) ||
      baseFsType === "fuse" ||
      /^[A-Za-z]:/.test(device ?? "") ||
      /^(\\\\|\/\/)/.test(device ?? "") ||
      /^[^/\s]+:\//.test(device ?? "") ||
      /(^|,)aname=drvfs/.test(mountOptions ?? "")
    )
      mounts.push(
        mountPoint.replace(/\\([0-7]{3})/g, (octalMatch, octalDigits) =>
          String.fromCharCode(parseInt(octalDigits, 8)),
        ),
      );
  }
  return normalizeCaseForComparison_2(mounts);
}
//@ chunk-af1hzzme.js:174028-174465 placement
async function detectWslWindowsMounts(mountsText) {
  let refuse = (reason) => {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `A shell tool was granted, but ${reason}, so the Windows side could not be put out of the sandboxed shell's reach \u2014 the run was refused.`,
      "eval: WSL Windows-side mounts undetermined",
    );
  };
  let text =
    mountsText ??
    (await readFile("/proc/mounts", "utf8").catch(() =>
      refuse("the WSL mount table (/proc/mounts) cannot be read"),
    ));
  let networkMounts = parseNetworkMounts(text);
  if (networkMounts.length === 0) refuse("no Windows filesystem mount was recognized in the WSL mount table");
  return networkMounts;
}
//@ chunk-af1hzzme.js:174465-174580 placement
/**
 * 返回 XDG_CONFIG_HOME（须为绝对路径），否则 ~/.config。
 */
function getXdgConfigHome() {
  let trimmed = process.env.XDG_CONFIG_HOME?.trim();
  return trimmed && path_3.isAbsolute(trimmed) ? trimmed : path_3.join(os.homedir(), ".config");
}
//@ chunk-af1hzzme.js:174580-174992 placement
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
//@ chunk-af1hzzme.js:174992-175031 placement
/**
 * 判断字符串是否含通配符。
 */
function hasGlobChars(path) {
  return /[*?[\]]/.test(path);
}
//@ chunk-af1hzzme.js:175031-175070 placement
/**
 * 判断是否为文件系统根目录。
 */
function isRootDir(path) {
  return path_3.dirname(path) === path;
}
//@ chunk-af1hzzme.js:175070-175121 placement
/**
 * 取父目录（已是根时原样）。
 */
function withDirname(path) {
  let path_2 = path_3.dirname(path);
  return isRootDir(path_2) ? path : path_2;
}
//@ chunk-af1hzzme.js:175121-175238 placement
/**
 * 在路径列表中补上其真实路径对应的目录（去重）。
 */
async function withPathDirectories(paths) {
  let realPaths = await probePathDirectories(
    Promise.all(paths.map((path) => realpath(path).catch(() => path))),
    "a directory",
  );
  return normalizeCaseForComparison_2([...paths, ...realPaths]);
}
//@ chunk-af1hzzme.js:175238-175284 placement
/**
 * 按平台转换沙箱规则路径。
 */
function toSandboxPathForPlatform(path) {
  return getPlatform() === "windows" ? path : toSandboxRulePath(path);
}
//@ chunk-af1hzzme.js:175284-175483 placement
/**
 * 把文件路径转换为沙箱规则路径格式（Windows 盘符转 //c/...，其他前缀 /）。
 */
function toSandboxRulePath(path) {
  let slashed = getPlatform() === "windows" ? path.replaceAll("\\", "/") : path;
  let match = /^([A-Za-z]):\//.exec(slashed);
  if (match) {
    let [wholeMatch, driveLetter = ""] = match;
    return `//${driveLetter.toLowerCase()}/${slashed.slice(wholeMatch.length)}`;
  }
  return `/${slashed.startsWith("/") ? slashed : `/${slashed}`}`;
}
//@ chunk-af1hzzme.js:180968-181325 placement
/**
 * 解析用例引用的文件路径，要求经链接解析后仍位于用例目录或被测插件内，且是单链接普通文件，否则抛出。
 */
async function resolveCaseFileInsideSuite(evalCase, relativePath, fieldName) {
  let resolved = await checkCaseInsideRoot(evalCase, relativePath);
  let suiteRealRoots = await getSuiteRealRoots(evalCase);
  let stats = await lstat(resolved).catch(() => null);
  if (
    !suiteRealRoots.some((suiteRealRoot) => toEvalPathError(suiteRealRoot, resolved)) ||
    stats === null ||
    !stats.isFile() ||
    stats.nlink > 1
  )
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `case "${evalCase.name}": ${fieldName} "${relativePath}" resolves (through a link) outside the case directory and the plugin under test, or is not a plain single-link file`,
      "eval case file escapes suite via link",
    );
  return resolved;
}
//@ chunk-af1hzzme.js:181325-181432 placement
/**
 * 获取评测用例目录与被测插件目录的真实路径。
 */
async function getSuiteRealRoots(evalCase) {
  return Promise.all(
    [evalCase.caseDir, ...evalCase.pluginDirsUnderTest].map((dir) => realpath(dir).catch(() => dir)),
  );
}
//@ chunk-af1hzzme.js:181432-181514 placement
/**
 * 检查用例路径是否在根内。
 */
async function checkCaseInsideRoot(evalCase, relativePath) {
  return checkCasePathInsideRoot(evalCase.caseDir, relativePath, `case "${evalCase.name}"`, "case directory");
}
//@ chunk-af1hzzme.js:181514-182119 placement
async function checkCasePathInsideRoot(root, relativePath, label, rootName) {
  await checkRepoAuthoredPath(root, relativePath, label);
  let resolved = path_3.resolve(root, relativePath);
  let realRoot = await realpath(root).catch(() => path_3.resolve(root));
  let resolved_2 = path_3.resolve(realRoot, relativePath);
  if (resolved_2 !== realRoot && !toEvalPathError(realRoot, resolved_2))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${label}: path "${relativePath}" escapes the ${rootName} (\`..\` or an absolute path) \u2014 it must name something inside it`,
      "case-authored path escapes its root",
    );
  try {
    return await realpath(resolved);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `${label}: path "${relativePath}" does not exist`,
          "case-authored path does not exist",
        ),
        {
          code: errnoCode,
        },
      );
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${label}: path "${relativePath}" is unreadable (${errnoCode ?? "unknown error"})`,
        "case-authored path unreadable",
      ),
      {
        code: errnoCode,
      },
    );
  }
}
//@ chunk-af1hzzme.js:182119-182146 placement
/**
 * 允许透传的评测环境变量名正则。
 */
var EVAL_ENV_KEY_RE = /^EVAL_[A-Z0-9_]*$/;
//@ chunk-af1hzzme.js:182146-182251 placement
/**
 * 从环境变量对象中删除被禁止的变量（名单或正则匹配）。
 */
function stripBlockedEnvVars(env) {
  for (let key of Object.keys(env)) {
    let upper = key.toUpperCase();
    if (STRIPPED_GIT_ENV_SET.has(upper) || regExp.test(key)) delete env[key];
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
