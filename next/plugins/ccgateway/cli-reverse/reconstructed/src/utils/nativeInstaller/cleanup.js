/**
 * utils/nativeInstaller/cleanup.ts
 *
 * 原生安装目录清理：按 staging/failed/版本目录的年龄与归属校验删除旧产物，保护 launcher 链接与当前运行的版本（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e5z7dpjd.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, sep } from "path";
import { lstat, readdir, realpath, stat, rm } from "fs/promises";
import { BUNDLES_DIR, BUNDLE_NAME_RE, MACOS_APP_PATH } from "./bundlePaths.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, isPathAbsent } from "../errors.js";

//@ chunk-e5z7dpjd.js:18631-18736 placement
var STAGING_MAX_AGE_MS = 3600000;
var FAILED_MAX_AGE_MS = 86400000;
var STAGING_NAME_RE = /^\.staging-[A-Za-z0-9]+$/;
var FAILED_NAME_RE = /^\.failed-\d[A-Za-z0-9._+-]*@[0-9a-f]{12}$/;
//@ chunk-e5z7dpjd.js:18736-20005 placement
/**
 * 清理落盘目录：只删归本用户所有且无组/其他写权限的目录里的旧版本与 failed/staging 产物，保护 launcher 与运行中的版本；installer 调用。
 */
async function cleanUpBundles(versions, launcher) {
  let bundlesDir = join(versions, BUNDLES_DIR);
  let entries;
  let bundlesStat;
  try {
    bundlesStat = await lstat(bundlesDir);
    if (
      !bundlesStat.isDirectory() ||
      bundlesStat.uid !== process.getuid?.() ||
      (bundlesStat.mode & 18) !== 0
    ) {
      logForDebugging(
        `Not cleaning up ${bundlesDir}: it must be a real folder that you own and only you can write`,
        {
          level: "warn",
        },
      );
      return "refused";
    }
    entries = await readdir(bundlesDir);
  } catch (error) {
    logForDebugging(`Could not list ${bundlesDir} to clean it up: ${errorMessage(error)}`);
    return isPathAbsent(error) ? 0 : "unreadable";
  }
  let launcherTarget = "";
  let launcherMissing = true;
  if (launcher !== undefined)
    try {
      launcherTarget = await realpath(launcher.launcherPath);
    } catch (error) {
      launcherMissing = isPathAbsent(error);
      if (!launcherMissing)
        logForDebugging(
          `Keeping every app bundle in this cleanup: could not follow the launcher link ${launcher.launcherPath}: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
    }
  let now = Date.now();
  let removedCount = 0;
  for (let entryName of entries) {
    let versionOfStagingDir = BUNDLE_NAME_RE.exec(entryName)?.[1];
    let matches = FAILED_NAME_RE.test(entryName);
    if (versionOfStagingDir === undefined && !matches && !STAGING_NAME_RE.test(entryName)) continue;
    let entryPath = join(bundlesDir, entryName);
    try {
      let entryStat = await lstat(entryPath);
      if (
        (matches ? !entryStat.isFile() : !entryStat.isDirectory()) ||
        now - entryStat.mtimeMs <= (matches ? FAILED_MAX_AGE_MS : STAGING_MAX_AGE_MS)
      )
        continue;
      if (versionOfStagingDir !== undefined) {
        if (
          launcher === undefined ||
          !launcherMissing ||
          process.execPath.includes(sep + entryName + sep) ||
          launcherTarget.includes(sep + entryName + sep)
        )
          continue;
        try {
          await stat(join(versions, versionOfStagingDir));
          continue;
        } catch (error) {
          if (!isPathAbsent(error)) throw error;
        }
        if (await launcher.isVersionLockActive(join(entryPath, MACOS_APP_PATH))) continue;
      }
      let bundlesStatAgain = await lstat(bundlesDir);
      if (bundlesStatAgain.dev !== bundlesStat.dev || bundlesStatAgain.ino !== bundlesStat.ino) {
        logForDebugging(`Stopped cleaning up ${bundlesDir}: it is no longer the folder that was checked`, {
          level: "warn",
        });
        return "refused";
      }
      await rm(entryPath, {
        recursive: true,
        force: true,
      });
      removedCount++;
      logForDebugging(`Cleaned up ${entryName} in ${bundlesDir}`);
    } catch (error) {
      logForDebugging(`Could not clean up ${entryName} in ${bundlesDir}: ${errorMessage(error)}`);
    }
  }
  return removedCount;
}
export { cleanUpBundles };
