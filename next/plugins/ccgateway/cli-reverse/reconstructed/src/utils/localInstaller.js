/**
 * utils/localInstaller.ts
 *
 * ~/.claude/local 本地 npm 安装：检测、安装、shell 类型推断与别名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/localInstaller.ts
 * pieces: chunk-6zvphrsz.js (7)
 * attribution: callgraph-fingerprint 1, fingerprint 6
 */
import { join } from "path";
import { writeFile, chmod, access } from "fs/promises";
import { filterManagedDisabledPlugins } from "../commands/plugin/ManagePlugins.js";
import { getErrnoCode } from "./errors.js";
import { getFsImplementation } from "./fsOperations.js";
import { jsonStringify } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { saveGlobalConfig } from "./config.js";
import { logError } from "./log.js";
import { env } from "./env.js";

//@ chunk-6zvphrsz.js:2575-2612 callgraph-fingerprint = getLocalClaudePath (1)
function getLocalClaudePath() {
  return join(filterManagedDisabledPlugins(), "claude");
}
//@ chunk-6zvphrsz.js:2612-2696 fingerprint = isRunningFromLocalInstallation (1)
/**
 * 是否从 ~/.claude/local 的本地安装运行。
 */
function isRunningFromLocalInstallation() {
  return (process.argv[1] || "").includes("/.claude/local/node_modules/");
}
//@ chunk-6zvphrsz.js:2696-2830 fingerprint = writeIfMissing (1)
async function writeIfMissing(path, content, mode) {
  try {
    await writeFile(path, content, {
      encoding: "utf8",
      flag: "wx",
      mode,
    });
    return true;
  } catch (e) {
    if (getErrnoCode(e) === "EEXIST") return false;
    throw e;
  }
}
//@ chunk-6zvphrsz.js:2830-3181 fingerprint = ensureLocalPackageEnvironment (0.925)
async function ensureLocalPackageEnvironment() {
  try {
    let localInstallDir = filterManagedDisabledPlugins();
    await getFsImplementation().mkdir(localInstallDir);
    await writeIfMissing(
      join(localInstallDir, "package.json"),
      jsonStringify(
        {
          name: "claude-local",
          version: "0.0.1",
          private: true,
        },
        null,
        2,
      ),
    );
    let wrapperPath = join(localInstallDir, "claude");
    if (
      await writeIfMissing(
        wrapperPath,
        `#!/bin/sh
exec "${localInstallDir}/node_modules/.bin/claude" "$@"`,
        493,
      )
    )
      await chmod(wrapperPath, 493);
    return true;
  } catch (error) {
    logForDebugging(`Failed to set up local package environment: ${error}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-6zvphrsz.js:3181-4276 fingerprint = installOrUpdateClaudePackage (0.571)
/**
 * installOrUpdateClaudePackage：在 ~/.claude/local 下用 npm 安装（本地安装方式）。
 */
async function installOrUpdateClaudePackage(channel, specificVersion, storageV5) {
  try {
    if (!(await ensureLocalPackageEnvironment())) {
      logFeatureBad("update_apply", "update_apply_env_setup_failed");
      return "install_failed";
    }
    let versionSpec = specificVersion ? specificVersion : channel === "stable" ? "stable" : "latest";
    let result = await execFileNoThrowWithCwd(
      "npm",
      [
        "install",
        `${
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.PACKAGE_URL
        }@${versionSpec}`,
      ],
      {
        cwd: filterManagedDisabledPlugins(),
        maxBuffer: 1e6,
        useToolMemoryCgroup: false,
      },
    );
    if (result.code !== 0) {
      logFeatureBad("update_apply", "update_apply_local_npm_failed");
      logForDebugging(`Failed to install Claude CLI package: ${result.stderr}`, {
        level: "error",
      });
      return result.code === 190 ? "in_progress" : "install_failed";
    }
    await saveGlobalConfig(
      (current) => ({
        ...current,
        installMethod: "local",
      }),
      storageV5,
    );
    logFeatureOk("update_apply");
    return "success";
  } catch (error) {
    logFeatureBad("update_apply", "update_apply_local_exception");
    logError(error);
    return "install_failed";
  }
}
//@ chunk-6zvphrsz.js:4276-4375 fingerprint = localInstallationExists (1)
/**
 * 本地安装（~/.claude/local/node_modules/.bin/claude）是否存在。
 */
async function localInstallationExists() {
  try {
    await access(join(filterManagedDisabledPlugins(), "node_modules", ".bin", "claude"));
    return true;
  } catch {
    return false;
  }
}
//@ chunk-6zvphrsz.js:4375-4527 fingerprint = getShellType (1)
/**
 * 从 SHELL 推断 shell 类型（zsh/bash/fish/unknown）。
 */
function getShellType() {
  let shellPath = env.SHELL || "";
  if (shellPath.includes("zsh")) return "zsh";
  if (shellPath.includes("bash")) return "bash";
  if (shellPath.includes("fish")) return "fish";
  return "unknown";
}
export {
  getShellType,
  getLocalClaudePath,
  isRunningFromLocalInstallation,
  localInstallationExists,
  installOrUpdateClaudePackage,
};
