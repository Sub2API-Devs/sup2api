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
async function isGitLayoutUntampered(layout, n) {
  return (await gitLayoutFaultOf(layout, n)) === null;
}
//@ chunk-s61vbvea.js:234349-234401 placement
/**
 * 取 git 目录布局检查的 fault 原因。
 */
async function gitLayoutFaultOf(layout, n) {
  return (await inspectGitDirShape(layout, n)).fault;
}
//@ chunk-s61vbvea.js:234401-235968 placement
async function inspectGitDirShape(e, n, r = () => () => {}) {
  let s = {
    "git-dir-look-objects": 0,
    "git-dir-look-refs": 0,
  };
  let h = async (re, he) => {
    let Se = r(re);
    try {
      return await he((ce) => {
        s[re] += ce;
      });
    } finally {
      Se();
    }
  };
  let { gitDir, commonDir } = e;
  let [commonDirFile, R, x, P, j, G, L, q, Q, ...Z] = await Promise.all([
    readCommonDirFile(gitDir),
    probeEntryKind(join(commonDir, "refs")),
    probeEntryKind(join(commonDir, "objects")),
    probeEntryKind(join(commonDir, "reftable")),
    probePathKind(commonDir, ["packed-refs"]),
    h("git-dir-look-objects", (re) => inspectObjectsDir(commonDir, re)),
    h("git-dir-look-refs", (re) => areRefDirsEmpty(commonDir, re)),
    probeEntryKind(join(gitDir, "HEAD")),
    Promise.all([
      probePathKind(gitDir, ["logs", "HEAD"]),
      ...n.map((re) => probePathKind(commonDir, ["logs", ...re.split("/")])),
    ]),
    ...["info", "pack"].map((re) =>
      probeEntryKind(join(commonDir, "objects", re)).then((he) => (he === "directory" ? "absent" : "other")),
    ),
    hasAlternates(commonDir).then((re) => (re ? "other" : "absent")),
    ...n.map((re) => probePathKind(commonDir, re.split("/"))),
  ]);
  let ee = e.storeStamps === undefined ? undefined : await objectsDirFingerprint(commonDir);
  let ae = (re) => re === "absent" || re === "file";
  return {
    fault:
      [
        ["work_tree_replaced", !(await workTreeReplacedSinceRecorded(e))],
        [
          "git_dir_replaced",
          (e.gitDirId === undefined || e.gitDirId === (await getFileIdentity_2(gitDir))) &&
            (e.commonDirId === undefined || e.commonDirId === (await getFileIdentity_2(commonDir))) &&
            (ee === undefined || ee.objects === e.storeStamps?.objects),
        ],
        ["git_dir_head_not_plain", q === "file"],
        ["git_dir_packed_refs_not_plain", ae(j)],
        ["git_dir_refs_not_plain", L],
        ["git_dir_logs_not_plain", Q.every(ae)],
        [
          "git_dir_tampered",
          resolveCommonDir(commonDirFile, gitDir) === commonDir &&
            R === "directory" &&
            x === "directory" &&
            P === "absent" &&
            Z.every(ae),
        ],
        ["git_dir_objects_not_plain", G],
        [
          "git_dir_objects_changed",
          ee === undefined ||
            (ee.info === e.storeStamps?.info &&
              ee.pack === e.storeStamps?.pack &&
              ee.alternates === e.storeStamps?.alternates &&
              ee.httpAlternates === e.storeStamps?.httpAlternates),
        ],
      ].find(([, re]) => !re)?.[0] ?? null,
    objectEntries: s["git-dir-look-objects"],
    refEntries: s["git-dir-look-refs"],
  };
}
//@ chunk-s61vbvea.js:235968-235981 placement
/**
 * 读取放置文件的字节上限。
 */
var MAX_PLACEMENT_FILE_BYTES = 4096;
//@ chunk-s61vbvea.js:235981-236024 placement
function hasReplacementChar(e) {
  return e.includes("\uFFFD");
}
//@ chunk-s61vbvea.js:236024-236746 placement
async function inspectObjectsDir(commonDir, n) {
  let r = async (s, h) => {
    let y = await readdir(s).catch((error) => (getErrnoCode(error) === "ENOENT" ? [] : null));
    if (y === null || y.some(hasReplacementChar)) return false;
    n(y.length);
    return (
      await Promise.all(
        y.map((w) =>
          lstat(join(s, w)).then(
            (R) => (R.isFile() || (R.isDirectory() && (h || w === "multi-pack-index.d")) ? "file" : "other"),
            (error) => (getErrnoCode(error) === "ENOENT" ? "absent" : "other"),
          ),
        ),
      )
    ).every((w) => w !== "other");
  };
  try {
    let s = await readdir(join(commonDir, "objects"));
    n(s.length);
    let results = await Promise.all(s.map((w) => probeEntryKind(join(commonDir, "objects", w))));
    if (
      s.some(hasReplacementChar) ||
      !results.every((w) => w === "directory" || w === "file" || w === "absent")
    )
      return false;
    let filtered = s.filter((w, R) => results[R] === "directory");
    if (filtered.length > MAX_PLACEMENT_FILE_BYTES) return false;
    return (
      await Promise.all(
        filtered.map((w) => r(join(commonDir, "objects", w), !/^(?:pack|[0-9a-f]{2})$/i.test(w))),
      )
    ).every(Boolean);
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:236746-236989 placement
async function statFingerprint(e) {
  let results = await Promise.all(
    e.map((r) =>
      stat(r, {
        bigint: true,
      }).then(
        (s) => `${s.dev}:${s.ino}:${s.ctimeNs}:${s.mtimeNs}:${s.size}`,
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
  let n = (...R) =>
    lstat(join(commonDir, "objects", ...R), {
      bigint: true,
    });
  let r = (...R) =>
    n(...R).then(
      (x) => `${x.dev}:${x.ino}:${x.ctimeNs}:${x.mtimeNs}:${x.size}`,
      () => "absent",
    );
  let [s, h, y, S, w] = await Promise.all([
    n().then(
      (R) => `${R.dev}:${R.ino}`,
      () => "absent",
    ),
    r("info"),
    r("pack"),
    r("info", ALTERNATES_FILE_NAMES[0]),
    r("info", ALTERNATES_FILE_NAMES[1]),
  ]);
  return {
    objects: s,
    info: h,
    pack: y,
    alternates: S,
    httpAlternates: w,
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
function hasReftableOrigin(e, n) {
  return e.some(({ value: r, origin }) => r === "reftable" && n(origin));
}
//@ chunk-s61vbvea.js:237829-237869 placement
var ALTERNATES_FILE_NAMES = ["alternates", "http-alternates"];
//@ chunk-s61vbvea.js:237869-237992 placement
/**
 * reftable 或借用对象（alternates）的仓库布局。
 */
async function detectUnsupportedLayout(e) {
  if ((await probeEntryKind(join(e, "reftable"))) !== "absent") return "reftable";
  return (await hasAlternates(e)) ? "borrowed_objects" : null;
}
//@ chunk-s61vbvea.js:237992-238259 placement
async function hasAlternates(e) {
  return (
    await Promise.all(
      ALTERNATES_FILE_NAMES.map(async (r) => {
        let s = await probePathKind(e, ["objects", "info", r]);
        if (s !== "file") return s !== "absent";
        let h = await lstat(join(e, "objects", "info", r)).catch(() => null);
        return !(h !== null && h.isFile() && h.nlink === 1 && h.size === 0);
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
      ["heads", "tags", "remotes"].map(async (s) => {
        let h = await probeEntryKind(join(commonDir, "refs", s));
        return (
          h === "absent" ||
          h === "file" ||
          (h === "directory" && (await normalizeSource_2(join(commonDir, "refs", s), projectRoot)))
        );
      }),
    )
  ).every(Boolean);
}
//@ chunk-s61vbvea.js:238476-238713 placement = normalizeSource (1)
async function normalizeSource_2(source, projectRoot) {
  let r = await listDirRawNames(source);
  if (r === null) return false;
  projectRoot(r.length);
  return (
    await Promise.all(
      r.map(async (h) => {
        let y = await probeEntryKind(h);
        return y === "file" || (y === "absent" && typeof h === "string")
          ? true
          : y === "directory"
            ? normalizeSource_2(h, projectRoot)
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
      let r = await readdir(source).catch((error) => (getErrnoCode(error) === "ENOENT" ? [] : null));
      if (r === null || !r.some(hasReplacementChar)) return r?.map((s) => join(source, s)) ?? null;
    }
    let buffer = Buffer.concat([Buffer.from(source), Buffer.from(sep)]);
    return (
      await readdir(source, {
        encoding: "buffer",
      })
    ).map((r) => Buffer.concat([buffer, r]));
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:239019-239209 placement
async function probeEntryKind(e) {
  try {
    let n = await lstat(e);
    return n.isDirectory() ? "directory" : n.isFile() && n.nlink === 1 ? "file" : "other";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "other";
  }
}
//@ chunk-s61vbvea.js:239209-239490 placement
async function statDotGit(e) {
  try {
    let n = await lstat(join(e, ".git"), {
      bigint: true,
    });
    return n.isDirectory()
      ? {
          kind: "directory",
          id: `${n.dev}:${n.ino}`,
          born: birthTimeSalt(n),
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
