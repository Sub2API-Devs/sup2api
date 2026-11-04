/**
 * utils/git/builderGit/gitDirShape.ts
 *
 * builderGit：git 目录结构检查（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (18)
 * attribution: placement 18
 */
import { join, sep } from "path";
import { readdir, lstat, stat } from "fs/promises";
import { readCommonDirFile, probePathKind, getFileIdentity_2, resolveCommonDir } from "./gitDirIdentity.js";
import { workTreeReplacedSinceRecorded } from "./gitConfigAudit.js";
import { getErrnoCode, errorMessage } from "../../errors.js";
import { birthTimeSalt } from "../../windowsPathNames.js";

//@ chunk-s61vbvea.js:234296-234349 placement
/**
 * 判断 git 目录布局未被篡改（无 fault）。
 */
async function isGitLayoutUntampered(layout, probes) {
  return (await gitLayoutFaultOf(layout, probes)) === null;
}
//@ chunk-s61vbvea.js:234349-234401 placement
/**
 * 取 git 目录布局检查的 fault 原因。
 */
async function gitLayoutFaultOf(layout, probes) {
  return (await inspectGitDirShape(layout, probes)).fault;
}
//@ chunk-s61vbvea.js:234401-235968 placement
async function inspectGitDirShape(layout, probePaths, span = () => () => {}) {
  let counters = {
    "git-dir-look-objects": 0,
    "git-dir-look-refs": 0,
  };
  let withSpan = async (spanName, fn) => {
    let endSpan = span(spanName);
    try {
      return await fn((count) => {
        counters[spanName] += count;
      });
    } finally {
      endSpan();
    }
  };
  let { gitDir, commonDir } = layout;
  let [
    commonDirFile,
    refsKind,
    objectsKind,
    reftableKind,
    packedRefsKind,
    objectsPlain,
    refDirsEmpty,
    headKind,
    logsKinds,
    ...probeKinds
  ] = await Promise.all([
    readCommonDirFile(gitDir),
    probeEntryKind(join(commonDir, "refs")),
    probeEntryKind(join(commonDir, "objects")),
    probeEntryKind(join(commonDir, "reftable")),
    probePathKind(commonDir, ["packed-refs"]),
    withSpan("git-dir-look-objects", (count) => inspectObjectsDir(commonDir, count)),
    withSpan("git-dir-look-refs", (count) => areRefDirsEmpty(commonDir, count)),
    probeEntryKind(join(gitDir, "HEAD")),
    Promise.all([
      probePathKind(gitDir, ["logs", "HEAD"]),
      ...probePaths.map((probePath) => probePathKind(commonDir, ["logs", ...probePath.split("/")])),
    ]),
    ...["info", "pack"].map((dirName) =>
      probeEntryKind(join(commonDir, "objects", dirName)).then((kind) =>
        kind === "directory" ? "absent" : "other",
      ),
    ),
    hasAlternates(commonDir).then((hasAlternates) => (hasAlternates ? "other" : "absent")),
    ...probePaths.map((probePath) => probePathKind(commonDir, probePath.split("/"))),
  ]);
  let storeStamps = layout.storeStamps === undefined ? undefined : await objectsDirFingerprint(commonDir);
  let isPlain = (kind) => kind === "absent" || kind === "file";
  return {
    fault:
      [
        ["work_tree_replaced", !(await workTreeReplacedSinceRecorded(layout))],
        [
          "git_dir_replaced",
          (layout.gitDirId === undefined || layout.gitDirId === (await getFileIdentity_2(gitDir))) &&
            (layout.commonDirId === undefined ||
              layout.commonDirId === (await getFileIdentity_2(commonDir))) &&
            (storeStamps === undefined || storeStamps.objects === layout.storeStamps?.objects),
        ],
        ["git_dir_head_not_plain", headKind === "file"],
        ["git_dir_packed_refs_not_plain", isPlain(packedRefsKind)],
        ["git_dir_refs_not_plain", refDirsEmpty],
        ["git_dir_logs_not_plain", logsKinds.every(isPlain)],
        [
          "git_dir_tampered",
          resolveCommonDir(commonDirFile, gitDir) === commonDir &&
            refsKind === "directory" &&
            objectsKind === "directory" &&
            reftableKind === "absent" &&
            probeKinds.every(isPlain),
        ],
        ["git_dir_objects_not_plain", objectsPlain],
        [
          "git_dir_objects_changed",
          storeStamps === undefined ||
            (storeStamps.info === layout.storeStamps?.info &&
              storeStamps.pack === layout.storeStamps?.pack &&
              storeStamps.alternates === layout.storeStamps?.alternates &&
              storeStamps.httpAlternates === layout.storeStamps?.httpAlternates),
        ],
      ].find(([, ok]) => !ok)?.[0] ?? null,
    objectEntries: counters["git-dir-look-objects"],
    refEntries: counters["git-dir-look-refs"],
  };
}
//@ chunk-s61vbvea.js:235968-235981 placement
/**
 * 读取放置文件的字节上限。
 */
var MAX_PLACEMENT_FILE_BYTES = 4096;
//@ chunk-s61vbvea.js:235981-236024 placement
function hasReplacementChar(text) {
  return text.includes("\uFFFD");
}
//@ chunk-s61vbvea.js:236024-236746 placement
async function inspectObjectsDir(commonDir, countDir) {
  let scanDir = async (dirPath, allowDirs) => {
    let names = await readdir(dirPath).catch((error) => (getErrnoCode(error) === "ENOENT" ? [] : null));
    if (names === null || names.some(hasReplacementChar)) return false;
    countDir(names.length);
    return (
      await Promise.all(
        names.map((name) =>
          lstat(join(dirPath, name)).then(
            (stats) =>
              stats.isFile() || (stats.isDirectory() && (allowDirs || name === "multi-pack-index.d"))
                ? "file"
                : "other",
            (error) => (getErrnoCode(error) === "ENOENT" ? "absent" : "other"),
          ),
        ),
      )
    ).every((kind) => kind !== "other");
  };
  try {
    let names = await readdir(join(commonDir, "objects"));
    countDir(names.length);
    let results = await Promise.all(names.map((name) => probeEntryKind(join(commonDir, "objects", name))));
    if (
      names.some(hasReplacementChar) ||
      !results.every((kind) => kind === "directory" || kind === "file" || kind === "absent")
    )
      return false;
    let filtered = names.filter((name, index) => results[index] === "directory");
    if (filtered.length > MAX_PLACEMENT_FILE_BYTES) return false;
    return (
      await Promise.all(
        filtered.map((name) =>
          scanDir(join(commonDir, "objects", name), !/^(?:pack|[0-9a-f]{2})$/i.test(name)),
        ),
      )
    ).every(Boolean);
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:236746-236989 placement
async function statFingerprint(paths) {
  let results = await Promise.all(
    paths.map((path) =>
      stat(path, {
        bigint: true,
      }).then(
        (stats) => `${stats.dev}:${stats.ino}:${stats.ctimeNs}:${stats.mtimeNs}:${stats.size}`,
        (error) => (["ENOENT", "ENOTDIR"].includes(getErrnoCode(error) ?? "") ? "absent" : null),
      ),
    ),
  );
  return results.includes(null) ? null : results.join(" ");
}
//@ chunk-s61vbvea.js:236989-237354 placement
/**
 * objects、info、pack 与 alternates 文件的指纹。
 */
async function objectsDirFingerprint(commonDir) {
  let statObjectsEntry = (...segments) =>
    lstat(join(commonDir, "objects", ...segments), {
      bigint: true,
    });
  let fingerprint = (...segments) =>
    statObjectsEntry(...segments).then(
      (stats) => `${stats.dev}:${stats.ino}:${stats.ctimeNs}:${stats.mtimeNs}:${stats.size}`,
      () => "absent",
    );
  let [objects, info, pack, alternates, httpAlternates] = await Promise.all([
    statObjectsEntry().then(
      (stats) => `${stats.dev}:${stats.ino}`,
      () => "absent",
    ),
    fingerprint("info"),
    fingerprint("pack"),
    fingerprint("info", ALTERNATES_FILE_NAMES[0]),
    fingerprint("info", ALTERNATES_FILE_NAMES[1]),
  ]);
  return {
    objects,
    info,
    pack,
    alternates,
    httpAlternates,
  };
}
//@ chunk-s61vbvea.js:237354-237754 placement
var SEED_ADMIN_REFUSALS = {
  relative_config_home: "the configuration home (CLAUDE_CONFIG_DIR) is not an absolute path",
  settings_moved:
    "where your own settings are found (CLAUDE_CONFIG_DIR, the HOME it defaults from, or the cowork settings switch) changed after Claude Code started: set it in the shell, not a settings file, and restart",
  inside_tree: "~/.claude/seed-admin lies inside this working tree or its repository",
};
//@ chunk-s61vbvea.js:237754-237829 placement
/**
 * 判断配置项中是否有来自 reftable 后端的取值。
 */
function hasReftableOrigin(entries, isOwnConfig) {
  return entries.some(({ value, origin }) => value === "reftable" && isOwnConfig(origin));
}
//@ chunk-s61vbvea.js:237829-237869 placement
var ALTERNATES_FILE_NAMES = ["alternates", "http-alternates"];
//@ chunk-s61vbvea.js:237869-237992 placement
/**
 * reftable 或借用对象（alternates）的仓库布局。
 */
async function detectUnsupportedLayout(commonDir) {
  if ((await probeEntryKind(join(commonDir, "reftable"))) !== "absent") return "reftable";
  return (await hasAlternates(commonDir)) ? "borrowed_objects" : null;
}
//@ chunk-s61vbvea.js:237992-238259 placement
async function hasAlternates(commonDir) {
  return (
    await Promise.all(
      ALTERNATES_FILE_NAMES.map(async (fileName) => {
        let kind = await probePathKind(commonDir, ["objects", "info", fileName]);
        if (kind !== "file") return kind !== "absent";
        let stats = await lstat(join(commonDir, "objects", "info", fileName)).catch(() => null);
        return !(stats !== null && stats.isFile() && stats.nlink === 1 && stats.size === 0);
      }),
    )
  ).some(Boolean);
}
//@ chunk-s61vbvea.js:238259-238476 placement
/**
 * git 仓库 refs/heads|tags|remotes 是否都为空或缺失。名字配错。
 */
async function areRefDirsEmpty(commonDir, projectRoot) {
  return (
    await Promise.all(
      ["heads", "tags", "remotes"].map(async (refDir) => {
        let kind = await probeEntryKind(join(commonDir, "refs", refDir));
        return (
          kind === "absent" ||
          kind === "file" ||
          (kind === "directory" && (await normalizeSource_2(join(commonDir, "refs", refDir), projectRoot)))
        );
      }),
    )
  ).every(Boolean);
}
//@ chunk-s61vbvea.js:238476-238713 placement = normalizeSource (1)
async function normalizeSource_2(source, projectRoot) {
  let entries = await listDirRawNames(source);
  if (entries === null) return false;
  projectRoot(entries.length);
  return (
    await Promise.all(
      entries.map(async (entryPath) => {
        let kind = await probeEntryKind(entryPath);
        return kind === "file" || (kind === "absent" && typeof entryPath === "string")
          ? true
          : kind === "directory"
            ? normalizeSource_2(entryPath, projectRoot)
            : false;
      }),
    )
  ).every(Boolean);
}
//@ chunk-s61vbvea.js:238713-239019 placement
/**
 * 列目录项（含非 UTF-8 名字时用 Buffer）。
 */
async function listDirRawNames(source) {
  try {
    if (typeof source === "string") {
      let names = await readdir(source).catch((error) => (getErrnoCode(error) === "ENOENT" ? [] : null));
      if (names === null || !names.some(hasReplacementChar))
        return names?.map((name) => join(source, name)) ?? null;
    }
    let buffer = Buffer.concat([Buffer.from(source), Buffer.from(sep)]);
    return (
      await readdir(source, {
        encoding: "buffer",
      })
    ).map((name) => Buffer.concat([buffer, name]));
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:239019-239209 placement
async function probeEntryKind(filePath) {
  try {
    let stats = await lstat(filePath);
    return stats.isDirectory() ? "directory" : stats.isFile() && stats.nlink === 1 ? "file" : "other";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "other";
  }
}
//@ chunk-s61vbvea.js:239209-239490 placement
async function statDotGit(launchDir) {
  try {
    let stats = await lstat(join(launchDir, ".git"), {
      bigint: true,
    });
    return stats.isDirectory()
      ? {
          kind: "directory",
          id: `${stats.dev}:${stats.ino}`,
          born: birthTimeSalt(stats),
        }
      : {
          kind: "not_a_directory",
        };
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR"
      ? {
          kind: "not_a_directory",
        }
      : {
          kind: "unreadable",
          detail: errorMessage(error),
        };
  }
}
export {
  isGitLayoutUntampered,
  detectUnsupportedLayout,
  gitLayoutFaultOf,
  MAX_PLACEMENT_FILE_BYTES,
  statDotGit,
  objectsDirFingerprint,
  statFingerprint,
  hasReftableOrigin,
  SEED_ADMIN_REFUSALS,
  probeEntryKind,
};
