/**
 * utils/git/builderGit/seedAdmin.ts
 *
 * builderGit：seed-admin 私有 git 目录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fepf8jp6.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, isAbsolute } from "path";
import { lstat, rm, mkdir, mkdtemp, realpath } from "fs/promises";
import { SEED_ADMIN_REFUSALS } from "./gitDirShape.js";
import { isPathInside, HOME_ENV_VARS } from "../../permissions/protectedEnvAndGitPaths.js";
import { getPlatform } from "../../platform.js";
import { getFileIdentity_2 } from "./gitDirIdentity.js";
import { stageSeedAdmin, procStartTag, isSkippableCopyError } from "./repoCopy.js";
import { errorMessage, getErrnoCode } from "../../errors.js";
import { getClaudeConfigDir } from "../../markdownConfigLoader.js";
import { findEnvChangedBySettings } from "../../permissions/protectedSettingsPaths.js";
import { logForDebugging } from "../../debug.js";
import { outermostRepoAncestor } from "./sandboxReach.js";
import { buildGitEnvForReach } from "./gitEnv.js";

//@ chunk-fepf8jp6.js:34358-35248 placement
async function prepareSeedAdmin(treeInfo, gitEnvForReach) {
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
      (candidateRoot) =>
        isPathInside(treeInfo.workTree, candidateRoot) ||
        isPathInside(treeInfo.enclosingTree, candidateRoot) ||
        isPathInside(treeInfo.gitDir, candidateRoot),
    )
  )
    return {
      kind: "failed",
      reason: "placement",
      detail: SEED_ADMIN_REFUSALS.inside_tree,
    };
  try {
    let existing = await lstat(root).catch(() => null);
    if (
      existing !== null &&
      existing.isFile() &&
      existing.size === 0 &&
      existing.nlink === 1 &&
      (getPlatform() === "windows" || existing.uid === process.getuid?.())
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
    await stageSeedAdmin(root, fileIdentity, gitEnvForReach);
    return {
      kind: "made",
      dir: await mkdtemp(
        join(root, `claude-seed-admin-${process.pid}-${await procStartTag(process.pid, gitEnvForReach)}-`),
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
//@ chunk-fepf8jp6.js:35248-35450 placement
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
//@ chunk-fepf8jp6.js:35450-35565 placement
function isPrivateOwnedDir(stats) {
  return (
    stats.isDirectory() &&
    (getPlatform() === "windows" ||
      ((stats.uid === process.getuid?.() || stats.uid === 0) && (stats.mode & 18) === 0))
  );
}
//@ chunk-fepf8jp6.js:35565-36356 placement
async function sweepSeedAdmin() {
  let totals = {
    removed: 0,
    errors: 0,
    held: 0,
    refused: "no",
  };
  let refuse = (refused, reason) => {
    logForDebugging(`[builderGit] seed-admin is not swept: ${reason}`, {
      level: "warn",
    });
    return {
      ...totals,
      refused,
    };
  };
  let seedAdminRoot = await resolveSeedAdminRoot();
  if ("unusable" in seedAdminRoot)
    return refuse(seedAdminRoot.unusable, SEED_ADMIN_REFUSALS[seedAdminRoot.unusable]);
  let fileIdentity = await getFileIdentity_2(seedAdminRoot.root);
  let rootStats = await lstat(seedAdminRoot.root).catch((error) => ({
    error,
  }));
  if ("error" in rootStats) {
    let errnoCode = getErrnoCode(rootStats.error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return totals;
    logForDebugging(
      `[builderGit] sweeping ${seedAdminRoot.root}: could not examine it (${errnoCode ?? errorMessage(rootStats.error)})`,
      {
        level: "warn",
      },
    );
    return {
      ...totals,
      errors: 1,
    };
  }
  if (rootStats.isFile()) return totals;
  let repoAncestor = outermostRepoAncestor(
    join(seedAdminRoot.configHome, "seed-admin"),
    seedAdminRoot.configHome,
  );
  if (repoAncestor !== null)
    return refuse("inside_tree", `a git checkout (${repoAncestor}) holds ${seedAdminRoot.root}`);
  return isPrivateOwnedDir(rootStats)
    ? {
        ...(await stageSeedAdmin(seedAdminRoot.root, fileIdentity, () =>
          buildGitEnvForReach(undefined, undefined),
        )),
        refused: "no",
      }
    : refuse(
        "shared_directory",
        `${seedAdminRoot.root} is a link, or another user owns it or can write to it`,
      );
}
export { sweepSeedAdmin, prepareSeedAdmin, isPrivateOwnedDir };
