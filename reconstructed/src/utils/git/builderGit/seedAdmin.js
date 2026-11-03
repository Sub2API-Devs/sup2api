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
import { join, isAbsolute } from "path";
import { lstat, rm, mkdir, mkdtemp, realpath } from "fs/promises";
import { SEED_ADMIN_REFUSALS } from "./gitDirShape.js";
import { isPathInside as isPathInside_2, HOME_ENV_VARS } from "../../permissions/protectedEnvAndGitPaths.js";
import { getPlatform as getPlatform_2 } from "../../platform.js";
import { getFileIdentity_2 } from "./gitDirIdentity.js";
import { stageSeedAdmin, procStartTag, isSkippableCopyError } from "./repoCopy.js";
import { errorMessage, getErrnoCode } from "../../errors.js";
import { getClaudeConfigDir } from "../../envUtils.js";
import { findEnvChangedBySettings } from "../../permissions/protectedSettingsPaths.js";
import { logForDebugging } from "../../debug.js";
import { outermostRepoAncestor } from "./sandboxReach.js";
import { buildGitEnvForReach } from "./gitEnv.js";

//@ chunk-s61vbvea.js:240144-241039 placement
async function prepareSeedAdmin(e, n) {
  let seedAdminRoot = await resolveSeedAdminRoot();
  if ("unusable" in seedAdminRoot)
    return {
      kind: "failed",
      reason: "placement",
      detail: SEED_ADMIN_REFUSALS[seedAdminRoot.unusable],
    };
  let { configHome, root } = seedAdminRoot;
  if (
    [root, join(configHome, "seed-admin")].some(
      (S) =>
        isPathInside_2(e.workTree, S) || isPathInside_2(e.enclosingTree, S) || isPathInside_2(e.gitDir, S),
    )
  )
    return {
      kind: "failed",
      reason: "placement",
      detail: SEED_ADMIN_REFUSALS.inside_tree,
    };
  try {
    let S = await lstat(root).catch(() => null);
    if (
      S !== null &&
      S.isFile() &&
      S.size === 0 &&
      S.nlink === 1 &&
      (getPlatform_2() === "windows" || S.uid === process.getuid?.())
    )
      await rm(root);
    await mkdir(root, {
      recursive: true,
      mode: 448,
    });
    let fileIdentity = await getFileIdentity_2(root);
    if (!isPrivateOwnedDir(await lstat(root)))
      return {
        kind: "failed",
        reason: "home",
        home: configHome,
        detail: `${join(configHome, "seed-admin")} is not a plain directory of this user`,
      };
    await stageSeedAdmin(root, fileIdentity, n);
    return {
      kind: "made",
      dir: await mkdtemp(
        join(root, `claude-seed-admin-${process.pid}-${await procStartTag(process.pid, n)}-`),
      ),
      root,
      configHome,
    };
  } catch (error) {
    return isSkippableCopyError(error, configHome, root)
      ? {
          kind: "failed",
          reason: "home",
          home: configHome,
          detail: errorMessage(error),
        }
      : {
          kind: "failed",
          reason: "other",
          detail: errorMessage(error),
        };
  }
}
//@ chunk-s61vbvea.js:241039-241243 placement
async function resolveSeedAdminRoot() {
  let claudeConfigDir = getClaudeConfigDir();
  if (!isAbsolute(claudeConfigDir))
    return {
      unusable: "relative_config_home",
    };
  if (findEnvChangedBySettings(HOME_ENV_VARS) !== undefined)
    return {
      unusable: "settings_moved",
    };
  return {
    configHome: claudeConfigDir,
    root: join(await realpath(claudeConfigDir).catch(() => claudeConfigDir), "seed-admin"),
  };
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
  let e = {
    removed: 0,
    errors: 0,
    held: 0,
    refused: "no",
  };
  let n = (refused, w) => {
    logForDebugging(`[builderGit] seed-admin is not swept: ${w}`, {
      level: "warn",
    });
    return {
      ...e,
      refused,
    };
  };
  let seedAdminRoot = await resolveSeedAdminRoot();
  if ("unusable" in seedAdminRoot)
    return n(seedAdminRoot.unusable, SEED_ADMIN_REFUSALS[seedAdminRoot.unusable]);
  let fileIdentity = await getFileIdentity_2(seedAdminRoot.root);
  let h = await lstat(seedAdminRoot.root).catch((error) => ({
    error,
  }));
  if ("error" in h) {
    let errnoCode = getErrnoCode(h.error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return e;
    logForDebugging(
      `[builderGit] sweeping ${seedAdminRoot.root}: could not examine it (${errnoCode ?? errorMessage(h.error)})`,
      {
        level: "warn",
      },
    );
    return {
      ...e,
      errors: 1,
    };
  }
  if (h.isFile()) return e;
  let y = outermostRepoAncestor(join(seedAdminRoot.configHome, "seed-admin"), seedAdminRoot.configHome);
  if (y !== null) return n("inside_tree", `a git checkout (${y}) holds ${seedAdminRoot.root}`);
  return isPrivateOwnedDir(h)
    ? {
        ...(await stageSeedAdmin(seedAdminRoot.root, fileIdentity, () =>
          buildGitEnvForReach(undefined, undefined),
        )),
        refused: "no",
      }
    : n("shared_directory", `${seedAdminRoot.root} is a link, or another user owns it or can write to it`);
}
export { sweepSeedAdmin, prepareSeedAdmin, isPrivateOwnedDir };
