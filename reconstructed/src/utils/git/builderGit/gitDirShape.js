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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
} from "path";
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
} from "fs/promises";
import { readCommonDirFile, probePathKind, getFileIdentity_2, resolveCommonDir } from "./gitDirIdentity.js";
import { VP } from "./gitConfigAudit.js";
import { getErrnoCode, errorMessage } from "../../errors.js";
import { u6o } from "../../windowsPathNames.js";

//@ chunk-s61vbvea.js:234296-234349 placement
async function LNe(e, n) {
  return (await Pyn(e, n)) === null;
}
//@ chunk-s61vbvea.js:234349-234401 placement
async function Pyn(e, n) {
  return (await inspectGitDirShape(e, n)).fault;
}
//@ chunk-s61vbvea.js:234401-235968 placement
async function inspectGitDirShape(e, n, r = () => () => {}) {
  let s = { "git-dir-look-objects": 0, "git-dir-look-refs": 0 },
    h = async (re, he) => {
      let Se = r(re);
      try {
        return await he((ce) => {
          s[re] += ce;
        });
      } finally {
        Se();
      }
    },
    { gitDir: gitDir, commonDir: commonDir } = e,
    [w, R, x, P, j, G, L, q, Q, ...Z] = await Promise.all([
      readCommonDirFile(gitDir),
      probeEntryKind(join_7(commonDir, "refs")),
      probeEntryKind(join_7(commonDir, "objects")),
      probeEntryKind(join_7(commonDir, "reftable")),
      probePathKind(commonDir, ["packed-refs"]),
      h("git-dir-look-objects", (re) => inspectObjectsDir(commonDir, re)),
      h("git-dir-look-refs", (re) => areRefDirsEmpty(commonDir, re)),
      probeEntryKind(join_7(gitDir, "HEAD")),
      Promise.all([
        probePathKind(gitDir, ["logs", "HEAD"]),
        ...n.map((re) => probePathKind(commonDir, ["logs", ...re.split("/")])),
      ]),
      ...["info", "pack"].map((re) =>
        probeEntryKind(join_7(commonDir, "objects", re)).then((he) =>
          he === "directory" ? "absent" : "other",
        ),
      ),
      hasAlternates(commonDir).then((re) => (re ? "other" : "absent")),
      ...n.map((re) => probePathKind(commonDir, re.split("/"))),
    ]),
    ee = e.storeStamps === void 0 ? void 0 : await objectsDirFingerprint(commonDir),
    ae = (re) => re === "absent" || re === "file";
  return {
    fault:
      [
        ["work_tree_replaced", !(await VP(e))],
        [
          "git_dir_replaced",
          (e.gitDirId === void 0 || e.gitDirId === (await getFileIdentity_2(gitDir))) &&
            (e.commonDirId === void 0 || e.commonDirId === (await getFileIdentity_2(commonDir))) &&
            (ee === void 0 || ee.objects === e.storeStamps?.objects),
        ],
        ["git_dir_head_not_plain", q === "file"],
        ["git_dir_packed_refs_not_plain", ae(j)],
        ["git_dir_refs_not_plain", L],
        ["git_dir_logs_not_plain", Q.every(ae)],
        [
          "git_dir_tampered",
          resolveCommonDir(w, gitDir) === commonDir &&
            R === "directory" &&
            x === "directory" &&
            P === "absent" &&
            Z.every(ae),
        ],
        ["git_dir_objects_not_plain", G],
        [
          "git_dir_objects_changed",
          ee === void 0 ||
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
var xVo = 4096;
//@ chunk-s61vbvea.js:235981-236024 placement
function yd(e) {
  return e.includes("\uFFFD");
}
//@ chunk-s61vbvea.js:236024-236746 placement
async function inspectObjectsDir(e, n) {
  let r = async (s, h) => {
    let y = await readdir_3(s).catch((w) => (getErrnoCode(w) === "ENOENT" ? [] : null));
    if (y === null || y.some(yd)) return !1;
    return (
      n(y.length),
      (
        await Promise.all(
          y.map((w) =>
            lstat_2(join_7(s, w)).then(
              (R) =>
                R.isFile() || (R.isDirectory() && (h || w === "multi-pack-index.d")) ? "file" : "other",
              (R) => (getErrnoCode(R) === "ENOENT" ? "absent" : "other"),
            ),
          ),
        )
      ).every((w) => w !== "other")
    );
  };
  try {
    let s = await readdir_3(join_7(e, "objects"));
    n(s.length);
    let results = await Promise.all(s.map((w) => probeEntryKind(join_7(e, "objects", w))));
    if (s.some(yd) || !results.every((w) => w === "directory" || w === "file" || w === "absent")) return !1;
    let filtered = s.filter((w, R) => results[R] === "directory");
    if (filtered.length > xVo) return !1;
    return (
      await Promise.all(filtered.map((w) => r(join_7(e, "objects", w), !/^(?:pack|[0-9a-f]{2})$/i.test(w))))
    ).every(Boolean);
  } catch {
    return !1;
  }
}
//@ chunk-s61vbvea.js:236746-236989 placement
async function statFingerprint(e) {
  let results = await Promise.all(
    e.map((r) =>
      stat_5(r, { bigint: !0 }).then(
        (s) => `${s.dev}:${s.ino}:${s.ctimeNs}:${s.mtimeNs}:${s.size}`,
        (s) => (["ENOENT", "ENOTDIR"].includes(getErrnoCode(s) ?? "") ? "absent" : null),
      ),
    ),
  );
  return results.includes(null) ? null : results.join(" ");
}
/**
 * objects、info、pack 与 alternates 文件的指纹。
 */
//@ chunk-s61vbvea.js:236989-237354 placement
async function objectsDirFingerprint(e) {
  let n = (...R) => lstat_2(join_7(e, "objects", ...R), { bigint: !0 }),
    r = (...R) =>
      n(...R).then(
        (x) => `${x.dev}:${x.ino}:${x.ctimeNs}:${x.mtimeNs}:${x.size}`,
        () => "absent",
      ),
    [s, h, y, S, w] = await Promise.all([
      n().then(
        (R) => `${R.dev}:${R.ino}`,
        () => "absent",
      ),
      r("info"),
      r("pack"),
      r("info", bd[0]),
      r("info", bd[1]),
    ]);
  return { objects: s, info: h, pack: y, alternates: S, httpAlternates: w };
}
//@ chunk-s61vbvea.js:237354-237754 placement
var SEED_ADMIN_REFUSALS = {
  relative_config_home: "the configuration home (CLAUDE_CONFIG_DIR) is not an absolute path",
  settings_moved:
    "where your own settings are found (CLAUDE_CONFIG_DIR, the HOME it defaults from, or the cowork settings switch) changed after Claude Code started: set it in the shell, not a settings file, and restart",
  inside_tree: "~/.claude/seed-admin lies inside this working tree or its repository",
};
//@ chunk-s61vbvea.js:237754-237829 placement
function XP(e, n) {
  return e.some(({ value: r, origin: origin }) => r === "reftable" && n(origin));
}
//@ chunk-s61vbvea.js:237829-237869 placement
var bd = ["alternates", "http-alternates"];
/**
 * reftable 或借用对象（alternates）的仓库布局。
 */
//@ chunk-s61vbvea.js:237869-237992 placement
async function detectUnsupportedLayout(e) {
  if ((await probeEntryKind(join_7(e, "reftable"))) !== "absent") return "reftable";
  return (await hasAlternates(e)) ? "borrowed_objects" : null;
}
//@ chunk-s61vbvea.js:237992-238259 placement
async function hasAlternates(e) {
  return (
    await Promise.all(
      bd.map(async (r) => {
        let s = await probePathKind(e, ["objects", "info", r]);
        if (s !== "file") return s !== "absent";
        let h = await lstat_2(join_7(e, "objects", "info", r)).catch(() => null);
        return !(h !== null && h.isFile() && h.nlink === 1 && h.size === 0);
      }),
    )
  ).some(Boolean);
}
/**
 * git 仓库 refs/heads|tags|remotes 是否都为空或缺失。名字配错。
 */
//@ chunk-s61vbvea.js:238259-238476 placement
async function areRefDirsEmpty(e, n) {
  return (
    await Promise.all(
      ["heads", "tags", "remotes"].map(async (s) => {
        let h = await probeEntryKind(join_7(e, "refs", s));
        return (
          h === "absent" ||
          h === "file" ||
          (h === "directory" && (await normalizeSource_2(join_7(e, "refs", s), n)))
        );
      }),
    )
  ).every(Boolean);
}
//@ chunk-s61vbvea.js:238476-238713 placement = normalizeSource (1)
async function normalizeSource_2(source, projectRoot) {
  let r = await listDirRawNames(source);
  if (r === null) return !1;
  return (
    projectRoot(r.length),
    (
      await Promise.all(
        r.map(async (h) => {
          let y = await probeEntryKind(h);
          return y === "file" || (y === "absent" && typeof h === "string")
            ? !0
            : y === "directory"
              ? normalizeSource_2(h, projectRoot)
              : !1;
        }),
      )
    ).every(Boolean)
  );
}
/**
 * 列目录项（含非 UTF-8 名字时用 Buffer）。
 */
//@ chunk-s61vbvea.js:238713-239019 placement
async function listDirRawNames(e) {
  try {
    if (typeof e === "string") {
      let r = await readdir_3(e).catch((s) => (getErrnoCode(s) === "ENOENT" ? [] : null));
      if (r === null || !r.some(yd)) return r?.map((s) => join_7(e, s)) ?? null;
    }
    let buffer = Buffer.concat([Buffer.from(e), Buffer.from(sep_5)]);
    return (await readdir_3(e, { encoding: "buffer" })).map((r) => Buffer.concat([buffer, r]));
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:239019-239209 placement
async function probeEntryKind(e) {
  try {
    let n = await lstat_2(e);
    return n.isDirectory() ? "directory" : n.isFile() && n.nlink === 1 ? "file" : "other";
  } catch (error) {
    let r = getErrnoCode(error);
    return r === "ENOENT" || r === "ENOTDIR" ? "absent" : "other";
  }
}
//@ chunk-s61vbvea.js:239209-239490 placement
async function statDotGit(e) {
  try {
    let n = await lstat_2(join_7(e, ".git"), { bigint: !0 });
    return n.isDirectory()
      ? { kind: "directory", id: `${n.dev}:${n.ino}`, born: u6o(n) }
      : { kind: "not_a_directory" };
  } catch (error) {
    let r = getErrnoCode(error);
    return r === "ENOENT" || r === "ENOTDIR"
      ? { kind: "not_a_directory" }
      : { kind: "unreadable", detail: errorMessage(error) };
  }
}

export {
  LNe,
  detectUnsupportedLayout,
  Pyn,
  xVo,
  statDotGit,
  objectsDirFingerprint,
  statFingerprint,
  XP,
  SEED_ADMIN_REFUSALS,
  probeEntryKind,
};
