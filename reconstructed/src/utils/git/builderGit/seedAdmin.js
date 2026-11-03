/**
 * utils/git/builderGit/seedAdmin.ts
 *
 * builderGit：seed-admin 私有 git 目录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (4)
 * attribution: placement 4
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
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  rm,
  rm as rm_2,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdtemp,
  realpath,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
} from "fs/promises";
import { SEED_ADMIN_REFUSALS } from "./gitDirShape.js";
import { isPathInside as isPathInside_2, HOME_ENV_VARS } from "../../permissions/protectedEnvAndGitPaths.js";
import { getPlatform as getPlatform_2 } from "../../platform.js";
import { getFileIdentity_2 } from "./gitDirIdentity.js";
import { stageSeedAdmin, procStartTag, isSkippableCopyError } from "./repoCopy.js";
import { errorMessage, getErrnoCode } from "../../errors.js";
import { getClaudeConfigDir } from "../../envUtils.js";
import { findEnvChangedBySettings } from "../../permissions/protectedSettingsPaths.js";
import { logForDebugging } from "../../debug.js";
import { UO } from "./sandboxReach.js";
import { oKt } from "./gitEnv.js";

//@ chunk-s61vbvea.js:240144-241039 placement
async function prepareSeedAdmin(e, n) {
  let r = await resolveSeedAdminRoot();
  if ("unusable" in r)
    return { kind: "failed", reason: "placement", detail: SEED_ADMIN_REFUSALS[r.unusable] };
  let { configHome: configHome, root: root } = r;
  if (
    [root, join_7(configHome, "seed-admin")].some(
      (S) =>
        isPathInside_2(e.workTree, S) || isPathInside_2(e.enclosingTree, S) || isPathInside_2(e.gitDir, S),
    )
  )
    return { kind: "failed", reason: "placement", detail: SEED_ADMIN_REFUSALS.inside_tree };
  try {
    let S = await lstat_2(root).catch(() => null);
    if (
      S !== null &&
      S.isFile() &&
      S.size === 0 &&
      S.nlink === 1 &&
      (getPlatform_2() === "windows" || S.uid === process.getuid?.())
    )
      await rm_2(root);
    await mkdir_3(root, { recursive: !0, mode: 448 });
    let w = await getFileIdentity_2(root);
    if (!isPrivateOwnedDir(await lstat_2(root)))
      return {
        kind: "failed",
        reason: "home",
        home: configHome,
        detail: `${join_7(configHome, "seed-admin")} is not a plain directory of this user`,
      };
    return (
      await stageSeedAdmin(root, w, n),
      {
        kind: "made",
        dir: await mkdtemp(
          join_7(root, `claude-seed-admin-${process.pid}-${await procStartTag(process.pid, n)}-`),
        ),
        root: root,
        configHome: configHome,
      }
    );
  } catch (error) {
    return isSkippableCopyError(error, configHome, root)
      ? { kind: "failed", reason: "home", home: configHome, detail: errorMessage(error) }
      : { kind: "failed", reason: "other", detail: errorMessage(error) };
  }
}
//@ chunk-s61vbvea.js:241039-241243 placement
async function resolveSeedAdminRoot() {
  let e = getClaudeConfigDir();
  if (!isAbsolute_6(e)) return { unusable: "relative_config_home" };
  if (findEnvChangedBySettings(HOME_ENV_VARS) !== void 0) return { unusable: "settings_moved" };
  return { configHome: e, root: join_7(await realpath_3(e).catch(() => e), "seed-admin") };
}
//@ chunk-s61vbvea.js:241243-241358 placement
function isPrivateOwnedDir(e) {
  return (
    e.isDirectory() &&
    (getPlatform_2() === "windows" || ((e.uid === process.getuid?.() || e.uid === 0) && (e.mode & 18) === 0))
  );
}
//@ chunk-s61vbvea.js:241358-242152 placement
async function sweepSeedAdmin() {
  let e = { removed: 0, errors: 0, held: 0, refused: "no" },
    n = (S, w) => (
      logForDebugging(`[builderGit] seed-admin is not swept: ${w}`, { level: "warn" }),
      { ...e, refused: S }
    ),
    r = await resolveSeedAdminRoot();
  if ("unusable" in r) return n(r.unusable, SEED_ADMIN_REFUSALS[r.unusable]);
  let s = await getFileIdentity_2(r.root),
    h = await lstat_2(r.root).catch((S) => ({ error: S }));
  if ("error" in h) {
    let S = getErrnoCode(h.error);
    if (S === "ENOENT" || S === "ENOTDIR") return e;
    return (
      logForDebugging(
        `[builderGit] sweeping ${r.root}: could not examine it (${S ?? errorMessage(h.error)})`,
        { level: "warn" },
      ),
      { ...e, errors: 1 }
    );
  }
  if (h.isFile()) return e;
  let y = UO(join_7(r.configHome, "seed-admin"), r.configHome);
  if (y !== null) return n("inside_tree", `a git checkout (${y}) holds ${r.root}`);
  return isPrivateOwnedDir(h)
    ? { ...(await stageSeedAdmin(r.root, s, () => oKt(void 0, void 0))), refused: "no" }
    : n("shared_directory", `${r.root} is a link, or another user owns it or can write to it`);
}

export { sweepSeedAdmin, prepareSeedAdmin, isPrivateOwnedDir };
