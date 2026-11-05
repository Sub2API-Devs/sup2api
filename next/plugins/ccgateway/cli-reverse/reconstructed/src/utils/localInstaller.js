/**
 * utils/localInstaller.ts
 *
 * ~/.claude/local 本地 npm 安装：检测、安装、shell 类型推断与别名
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/localInstaller.ts
 * pieces: chunk-wzyv38y8.js (8)
 * attribution: affinity 1, callgraph-fingerprint 1, fingerprint 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { writeFile, chmod, access } from "fs/promises";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { getErrnoCode } from "./errors.js";
import { getFsImplementation } from "./fsOperations.js";
import { jsonStringify } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { saveGlobalConfig } from "./config.js";
import { logError } from "./log.js";
import { env } from "./env.js";

//@ chunk-wzyv38y8.js:2605-2641 affinity (2.1.88 match: filterManagedDisabledPlugins, 1)
function filterManagedDisabledPlugins() {
  return join(getClaudeConfigDir(), "local");
}
//@ chunk-wzyv38y8.js:2641-2678 callgraph-fingerprint (2.1.88 match: getLocalClaudePath, 1)
function getLocalClaudePath() {
  return join(filterManagedDisabledPlugins(), "claude");
}
//@ chunk-wzyv38y8.js:2678-2762 fingerprint (2.1.88 match: isRunningFromLocalInstallation, 1)
/**
 * 是否从 ~/.claude/local 的本地安装运行。
 */
function isRunningFromLocalInstallation() {
  return (process.argv[1] || "").includes("/.claude/local/node_modules/");
}
//@ chunk-wzyv38y8.js:2762-2896 fingerprint (2.1.88 match: writeIfMissing, 1)
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
//@ chunk-wzyv38y8.js:2896-3247 fingerprint (2.1.88 match: ensureLocalPackageEnvironment, 0.925)
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
//@ chunk-wzyv38y8.js:3247-4342 fingerprint (2.1.88 match: installOrUpdateClaudePackage, 0.571)
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
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
//@ chunk-wzyv38y8.js:4342-4441 fingerprint (2.1.88 match: localInstallationExists, 1)
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
//@ chunk-wzyv38y8.js:4441-4593 fingerprint (2.1.88 match: getShellType, 1)
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
  localInstallationExists,
  installOrUpdateClaudePackage,
  getShellType,
  isRunningFromLocalInstallation,
  getLocalClaudePath,
};
