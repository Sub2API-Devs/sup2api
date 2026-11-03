/**
 * cli/update.ts
 *
 * claude update/upgrade：检测安装类型，按 native/npm/包管理器分别更新并打印结果
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/update.ts
 * pieces: chunk-rkjj4sjx.js (2)
 * attribution: fingerprint 1, sole-consumer 1
 */
import { dirname, basename } from "path";
import { env } from "../utils/env.js";
import { writeToStdout } from "../utils/process.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import { logEvent } from "../services/analytics/index.js";
import { autoUpdatesChannel } from "../utils/updateChannel.js";
import {
  getHomebrewCaskName,
  detectHomebrew,
  getDoctorDiagnostic,
  getPackageManager,
} from "../utils/doctorDiagnostic.js";
import { logForDebugging } from "../utils/debug.js";
import { sequential } from "../utils/sequential.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import {
  latestVersionFromSources,
  getLatestVersion,
  getVersionSkipReason,
  resolveMaxVersionConfig,
  isForceDowngradeActive,
  installGlobalPackage,
  getUpdateRestoreFailure,
  updateApplyErrorKey,
} from "../utils/autoUpdater.js";
import { semverGt, lt_2 as lt, semverGte } from "../utils/semver.js";
import { getInitialSettings_2, getSettingsForSource } from "../utils/settings/settings.js";
import {
  getLatestVersion as getLatestVersion_2,
  ManifestSignatureError,
} from "../utils/nativeInstaller/download.js";
import { installLatest, removeInstalledSymlink } from "../utils/nativeInstaller/installer.js";
import { regenerateCompletionCache } from "../utils/completionCache.js";
import { sanitizeVersion } from "../services/analytics/metadata.js";
import { localInstallationExists, installOrUpdateClaudePackage } from "../utils/localInstaller.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { recordUpdateResult } from "../utils/nativeInstaller/updateResult.js";
import { isServerVersionMismatch } from "../utils/daemon/daemonLock.js";
import { bgSupervisorNounCap } from "../utils/fleetGates.js";

//@ chunk-rkjj4sjx.js:12375-42648 fingerprint = update (0.63)
/**
 * claude update：检查安装方式（native/npm-local/npm-global/package-manager/development），包管理器安装只提示命令（Homebrew/winget/apk…），原生安装走 installLatest，npm 安装走全局/本地 npm；处理多重安装与配置的 installMethod 不一致。
 */
async function update(l) {
  if (env.DISABLE_UPDATES) {
    writeToStdout(`Updates are disabled by your administrator. Contact your IT team to get the latest version.
`);
    await gracefulShutdown(0);
  }
  logEvent("tengu_update_check", {});
  writeToStdout(`Current version: ${
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
    }.VERSION
  }
`);
  let y = autoUpdatesChannel();
  let homebrewCaskName = getHomebrewCaskName();
  let channelOrVersion = homebrewCaskName
    ? homebrewCaskName === "claude-code@latest"
      ? "latest"
      : "stable"
    : detectHomebrew()
      ? "stable"
      : y;
  let h = channelOrVersion === "rc" ? "slow" : channelOrVersion;
  writeToStdout(`Checking for updates to ${h} version...
`);
  logForDebugging("update: Starting update check");
  logForDebugging("update: Running diagnostic");
  let diagnostic = await getDoctorDiagnostic({
    storageV5: l,
  });
  logForDebugging(`update: Installation type: ${diagnostic.installationType}`);
  logForDebugging(`update: Config install method: ${diagnostic.configInstallMethod}`);
  if (diagnostic.multipleInstallations.length > 1) {
    writeToStdout(`
`);
    writeToStdout(
      sequential.yellow("Warning: Multiple installations found") +
        `
`,
    );
    for (let install of diagnostic.multipleInstallations) {
      let current = diagnostic.installationType === install.type ? " (currently running)" : "";
      writeToStdout(`- ${install.type} at ${install.path}${current}
`);
    }
  }
  if (diagnostic.warnings.length > 0) {
    writeToStdout(`
`);
    for (let warning of diagnostic.warnings) {
      logForDebugging(`update: Warning detected: ${warning.issue}`);
      logForDebugging(`update: Showing warning: ${warning.issue}`);
      writeToStdout(
        sequential.yellow(`Warning: ${warning.issue}
`),
      );
      writeToStdout(
        sequential.bold(`Fix: ${warning.fix.replaceAll("`", "")}
`),
      );
    }
  }
  let config = getGlobalConfig();
  if (!config.installMethod && diagnostic.installationType !== "package-manager") {
    writeToStdout(`
`);
    writeToStdout(`Updating configuration to track installation method...
`);
    let detectedMethod = "unknown";
    switch (diagnostic.installationType) {
      case "npm-local":
        detectedMethod = "local";
        break;
      case "native":
        detectedMethod = "native";
        break;
      case "npm-global":
        detectedMethod = "global";
        break;
      default:
        detectedMethod = "unknown";
    }
    saveGlobalConfig(
      (current) => ({
        ...current,
        installMethod: detectedMethod,
      }),
      l,
    );
    writeToStdout(`Installation method set to: ${detectedMethod}
`);
  }
  if (diagnostic.installationType === "development") {
    writeToStdout(`
`);
    writeToStdout(
      sequential.yellow("Warning: Cannot update development build") +
        `
`,
    );
    await gracefulShutdown(1);
  }
  if (diagnostic.installationType === "package-manager") {
    let packageManager = await getPackageManager();
    writeToStdout(`
`);
    if (packageManager === "homebrew") {
      writeToStdout(`Claude is managed by Homebrew.
`);
      let n = `brew upgrade ${homebrewCaskName ?? "claude-code"}`;
      let R = await latestVersionFromSources(homebrewCaskName ?? "claude-code", channelOrVersion);
      if (R === null) {
        writeToStdout(`Could not check for updates (network check skipped or unavailable).
`);
        writeToStdout(`To update manually, run:
`);
        writeToStdout(
          sequential.bold(`  ${n}`) +
            `
`,
        );
      } else if (
        !semverGt(
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
          }.VERSION,
          R,
        )
      ) {
        writeToStdout(`Update available: ${
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
          }.VERSION
        } \u2192 ${R}
`);
        writeToStdout(`
`);
        writeToStdout(`To update, run:
`);
        writeToStdout(
          sequential.bold(`  ${n}`) +
            `
`,
        );
      } else
        writeToStdout(`Claude is up to date!
`);
      if (homebrewCaskName !== "claude-code@latest") {
        writeToStdout(`
`);
        writeToStdout(
          sequential.dim(`Tip: For more frequent updates, use the claude-code@latest cask:
`),
        );
        writeToStdout(
          sequential.dim(
            `  brew uninstall --cask ${homebrewCaskName ?? "claude-code"} && brew install --cask claude-code@latest`,
          ) +
            `
`,
        );
      }
    } else if (packageManager === "winget") {
      writeToStdout(`Claude is managed by winget.
`);
      let latest = await getLatestVersion(channelOrVersion);
      if (latest === null) {
        writeToStdout(`Could not check for updates (npm lookup failed or returned an invalid response).
`);
        writeToStdout(`To update manually, run:
`);
        writeToStdout(
          sequential.bold("  winget upgrade Anthropic.ClaudeCode") +
            `
`,
        );
      } else if (
        !semverGt(
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
          }.VERSION,
          latest,
        )
      ) {
        writeToStdout(`Update available: ${
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
          }.VERSION
        } \u2192 ${latest}
`);
        writeToStdout(`
`);
        writeToStdout(`To update, run:
`);
        writeToStdout(
          sequential.bold("  winget upgrade Anthropic.ClaudeCode") +
            `
`,
        );
      } else
        writeToStdout(`Claude is up to date!
`);
    } else if (packageManager === "apk") {
      writeToStdout(`Claude is managed by apk.
`);
      let latest = await getLatestVersion(channelOrVersion);
      if (latest === null) {
        writeToStdout(`Could not check for updates (npm lookup failed or returned an invalid response).
`);
        writeToStdout(`To update manually, run:
`);
        writeToStdout(
          sequential.bold("  apk upgrade claude-code") +
            `
`,
        );
      } else if (
        !semverGt(
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
          }.VERSION,
          latest,
        )
      ) {
        writeToStdout(`Update available: ${
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
          }.VERSION
        } \u2192 ${latest}
`);
        writeToStdout(`
`);
        writeToStdout(`To update, run:
`);
        writeToStdout(
          sequential.bold("  apk upgrade claude-code") +
            `
`,
        );
      } else
        writeToStdout(`Claude is up to date!
`);
    } else {
      writeToStdout(`Claude is managed by a package manager.
`);
      writeToStdout(`Please use your package manager to update.
`);
    }
    await gracefulShutdown(0);
  }
  if (
    config.installMethod &&
    diagnostic.configInstallMethod !== "not set" &&
    diagnostic.installationType !== "package-manager"
  ) {
    let { installationType: runningType, configInstallMethod: configExpects } = diagnostic;
    let k =
      {
        "npm-local": "local",
        "npm-global": "global",
        native: "native",
        development: "development",
        unknown: "unknown",
      }[runningType] || runningType;
    if (k !== configExpects && configExpects !== "unknown") {
      writeToStdout(`
`);
      writeToStdout(
        sequential.yellow("Warning: Configuration mismatch") +
          `
`,
      );
      writeToStdout(`Config expects: ${configExpects} installation
`);
      writeToStdout(`Currently running: ${runningType}
`);
      writeToStdout(
        sequential.yellow(`Updating the ${runningType} installation you are currently using`) +
          `
`,
      );
      saveGlobalConfig(
        (current) => ({
          ...current,
          installMethod: k,
        }),
        l,
      );
      writeToStdout(`Config updated to reflect current installation method: ${k}
`);
    }
  }
  if (diagnostic.installationType === "native") {
    logForDebugging("update: Detected native installation, using native updater");
    if (
      getInitialSettings_2()?.minimumVersion ||
      getSettingsForSource("policySettings")?.requiredMaximumVersion
    ) {
      let e = await getLatestVersion_2(channelOrVersion).catch(() => null);
      let n = e ? getVersionSkipReason(e) : null;
      if (e && n) {
        writeToStdout(
          sequential.yellow(
            `The ${h} channel is at ${e}, which is ${n}. Staying on ${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION
            }.`,
          ) +
            `
`,
        );
        await gracefulShutdown(0);
      }
    }
    getLatestVersion_2(channelOrVersion)
      .then((latestVersion) => {
        if (
          !latestVersion ||
          latestVersion ===
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
            }.VERSION
        )
          return;
        writeToStdout(
          lt(
            latestVersion,
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
            }.VERSION,
          )
            ? `@${channelOrVersion} is at ${latestVersion} (older than ${
                {
                  ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                  PACKAGE_URL: "@anthropic-ai/claude-code",
                  README_URL: "https://code.claude.com/docs/en/overview",
                  VERSION: "2.1.316",
                  FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                  BUILD_TIME: "2026-10-30T23:28:13Z",
                  GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                  HOOKS_WORKER_URL:
                    import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                  DD_SOURCEMAP_GROUP: "default",
                }.VERSION
              })...
`
            : `Updating to ${latestVersion}...
`,
        );
      })
      .catch(() => {});
    try {
      let e = await installLatest(channelOrVersion, false, l);
      if (e.lockFailed) {
        let pidInfo = e.lockHolderPid ? ` (PID ${e.lockHolderPid})` : "";
        writeToStdout(
          sequential.yellow(
            `Another Claude process${pidInfo} is currently running. Please try again in a moment.`,
          ) +
            `
`,
        );
        await gracefulShutdown(0);
      }
      if (!e.latestVersion) {
        process.stderr.write(`Failed to check for updates
`);
        await gracefulShutdown(1);
      }
      if (
        e.wasUpdated &&
        e.latestVersion !==
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
          }.VERSION
      ) {
        writeToStdout(
          sequential.green(
            `Successfully updated from ${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION
            } to version ${e.latestVersion}`,
          ) +
            `
`,
        );
        await regenerateCompletionCache();
        await noteSupervisorRestart(e.latestVersion, l);
      } else if (e.skippedUnverifiedRelease)
        writeToStdout(
          sequential.yellow(
            `Update target ${e.latestVersion} (from @${channelOrVersion} or a server-side override) predates release-signature enforcement; staying on ${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION
            }. Run \`claude install ${e.latestVersion}\` to switch to it explicitly.`,
          ) +
            `
`,
        );
      else
        writeToStdout(
          sequential.green(
            `Claude Code is up to date (${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION
            })`,
          ) +
            `
`,
        );
      await gracefulShutdown(0);
    } catch (error) {
      process.stderr.write(`Error: Failed to install native update
`);
      process.stderr.write(
        (error instanceof ManifestSignatureError ? error.message : String(error)) +
          `
`,
      );
      process.stderr.write(`Try running "claude doctor" for diagnostics
`);
      await gracefulShutdown(1);
    }
  }
  if (config.installMethod !== "native") await removeInstalledSymlink();
  logForDebugging("update: Checking npm registry for latest version");
  logForDebugging(
    `update: Package URL: ${
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
    }`,
  );
  let npmTag = channelOrVersion === "stable" ? "stable" : "latest";
  let npmCommand = `npm view ${
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
  }@${npmTag} version`;
  logForDebugging(`update: Running: ${npmCommand}`);
  let latestVersion = await getLatestVersion(channelOrVersion);
  logForDebugging(`update: Latest version from npm: ${latestVersion || "FAILED"}`);
  if (!latestVersion) {
    logForDebugging("update: Failed to get latest version from npm registry");
    process.stderr.write(
      sequential.red("Failed to check for updates") +
        `
`,
    );
    process.stderr.write(`Unable to fetch latest version from npm registry
`);
    process.stderr.write(`
`);
    process.stderr.write(`Possible causes:
`);
    process.stderr.write(`  \u2022 Network connectivity issues
`);
    process.stderr.write(`  \u2022 npm registry is unreachable
`);
    process.stderr.write(`  \u2022 Corporate proxy/firewall blocking npm
`);
    if (
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
      }.PACKAGE_URL &&
      !{
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.PACKAGE_URL.startsWith("@anthropic")
    )
      process.stderr.write(`  \u2022 Internal/development build not published to npm
`);
    process.stderr.write(`
`);
    process.stderr.write(`Try:
`);
    process.stderr.write(`  \u2022 Check your internet connection
`);
    process.stderr.write(`  \u2022 Run with --debug flag for more details
`);
    let packageName =
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
      }.PACKAGE_URL || "@anthropic-ai/claude-code";
    process.stderr.write(`  \u2022 Manually check: npm view ${packageName} version
`);
    process.stderr.write(`  \u2022 Check if you need to login: npm whoami
`);
    await gracefulShutdown(1);
  }
  let { maxVersion, forceDowngradeEnabled } = await resolveMaxVersionConfig();
  let specificVersion = latestVersion;
  let C = false;
  if (
    forceDowngradeEnabled &&
    maxVersion &&
    isForceDowngradeActive(
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
      }.VERSION,
      maxVersion,
      "auto_updater",
    )
  ) {
    specificVersion = maxVersion;
    C = true;
  } else if (maxVersion && latestVersion && semverGte(latestVersion, maxVersion)) {
    logForDebugging(
      `update: maxVersion ${maxVersion} is set, capping update from ${latestVersion} to ${maxVersion}`,
    );
    specificVersion = semverGte(
      maxVersion,
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
      }.VERSION,
    )
      ? maxVersion
      : {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION;
  }
  let v = specificVersion ? getVersionSkipReason(specificVersion) : null;
  if (specificVersion && v) {
    let e =
      specificVersion === latestVersion
        ? `The ${h} channel is at ${specificVersion}`
        : `The update target is capped at ${specificVersion} by a server-side version policy`;
    writeToStdout(
      sequential.yellow(
        `${e}, which is ${v}. Staying on ${
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
          }.VERSION
        }.`,
      ) +
        `
`,
    );
    await gracefulShutdown(0);
  }
  if (
    specificVersion ===
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
    }.VERSION
  ) {
    writeToStdout(
      sequential.green(
        `Claude Code is up to date (${
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
          }.VERSION
        })`,
      ) +
        `
`,
    );
    await gracefulShutdown(0);
  }
  if (
    !C &&
    specificVersion &&
    lt(
      specificVersion,
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
      }.VERSION,
    )
  ) {
    writeToStdout(
      sequential.yellow(
        `You're running ${
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
          }.VERSION
        }, which is newer than the ${h} channel's ${specificVersion}. Skipping update. To switch back to the channel version, run claude install ${specificVersion}.`,
      ) +
        `
`,
    );
    await gracefulShutdown(0);
  }
  if (C) {
    logEvent("tengu_auto_updater_forced_downgrade", {
      from_version: sanitizeVersion(
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
        }.VERSION,
      ),
      to_version: sanitizeVersion(specificVersion),
    });
    writeToStdout(
      sequential.yellow(
        `Downgrading to ${specificVersion} (current: ${
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
          }.VERSION
        }) \u2014 required by a server-side version policy.`,
      ) +
        `
`,
    );
  } else
    writeToStdout(`New version available: ${specificVersion} (current: ${
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
      }.VERSION
    })
`);
  writeToStdout(`Installing update...
`);
  let c = false;
  let updateMethodName = "";
  switch (diagnostic.installationType) {
    case "npm-local":
      c = true;
      updateMethodName = "local";
      break;
    case "npm-global":
      c = false;
      updateMethodName = "global";
      break;
    case "unknown": {
      let isLocal = await localInstallationExists();
      c = isLocal;
      updateMethodName = isLocal ? "local" : "global";
      writeToStdout(
        sequential.yellow("Warning: Could not determine installation type") +
          `
`,
      );
      writeToStdout(`Attempting ${updateMethodName} update based on file detection...
`);
      break;
    }
    default:
      logFeatureBad("update_apply", "update_apply_unsupported_install_type");
      process.stderr.write(`Error: Cannot update ${diagnostic.installationType} installation
`);
      await gracefulShutdown(1);
  }
  writeToStdout(`Using ${updateMethodName} installation update method...
`);
  logForDebugging(`update: Update method determined: ${updateMethodName}`);
  logForDebugging(`update: useLocalUpdate: ${c}`);
  let p;
  let w;
  if (c) {
    logForDebugging("update: Calling installOrUpdateClaudePackage() for local update");
    p = await installOrUpdateClaudePackage(channelOrVersion, specificVersion, l);
  } else {
    logForDebugging("update: Calling installGlobalPackage() for global update");
    w = await installGlobalPackage(specificVersion, l);
    p = w.status;
  }
  logForDebugging(`update: Installation status: ${p}`);
  if (p !== "in_progress")
    await recordUpdateResult(
      {
        timestamp: new Date().toISOString(),
        path: c ? "npm-local" : "npm-global",
        outcome: p === "success" ? "success" : "failed",
        status: p,
        version_from: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        version_to: specificVersion,
        error_code:
          p === "install_failed" && getUpdateRestoreFailure()
            ? "update_apply_restore_failed"
            : updateApplyErrorKey(w?.failureHint),
      },
      l,
    );
  switch (p) {
    case "success":
      writeToStdout(
        sequential.green(
          C
            ? `Successfully downgraded from ${
                {
                  ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                  PACKAGE_URL: "@anthropic-ai/claude-code",
                  README_URL: "https://code.claude.com/docs/en/overview",
                  VERSION: "2.1.316",
                  FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                  BUILD_TIME: "2026-10-30T23:28:13Z",
                  GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                  HOOKS_WORKER_URL:
                    import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                  DD_SOURCEMAP_GROUP: "default",
                }.VERSION
              } to version ${specificVersion}`
            : `Successfully updated from ${
                {
                  ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                  PACKAGE_URL: "@anthropic-ai/claude-code",
                  README_URL: "https://code.claude.com/docs/en/overview",
                  VERSION: "2.1.316",
                  FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                  BUILD_TIME: "2026-10-30T23:28:13Z",
                  GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                  HOOKS_WORKER_URL:
                    import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                  DD_SOURCEMAP_GROUP: "default",
                }.VERSION
              } to version ${specificVersion}`,
        ) +
          `
`,
      );
      await regenerateCompletionCache();
      await noteSupervisorRestart(specificVersion, l);
      break;
    case "no_permissions":
      process.stderr.write(`Error: Insufficient permissions to install update
`);
      if (c) {
        process.stderr.write(`Try manually updating with:
`);
        process.stderr.write(`  cd ~/.claude/local && npm update ${
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
        }
`);
      } else {
        process.stderr.write(`Try running with sudo or fix npm permissions
`);
        process.stderr.write(`Or consider using native installation with: claude install
`);
      }
      await gracefulShutdown(1);
      break;
    case "install_failed": {
      let updateRestoreFailure = getUpdateRestoreFailure();
      if (!updateRestoreFailure && w?.failureHint) {
        switch (w.failureHint) {
          case "windows_running_exe_lock":
            process.stderr
              .write(`Error: Update failed because claude.exe is in use. Close other Claude Code sessions (including VS Code), then run claude update again, or run claude doctor.
`);
            break;
          case "native_binary_missing":
            process.stderr
              .write(`Error: Update failed because the native binary for this platform was not downloaded. Run claude update again, or reinstall with: npm i -g ${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.PACKAGE_URL
            }
`);
            break;
          case "registry_session_refused":
            process.stderr.write(`Error: Failed to install update
`);
            break;
        }
        await gracefulShutdown(1);
        break;
      }
      process.stderr.write(`Error: Failed to install update
`);
      if (updateRestoreFailure) {
        if (updateRestoreFailure.preservedPath) {
          process.stderr
            .write(`Your Claude Code executable could not be restored after the failed update. It was preserved at ${updateRestoreFailure.preservedPath}
`);
          if (dirname(updateRestoreFailure.preservedPath) === dirname(updateRestoreFailure.originalPath))
            process.stderr
              .write(`Rename it back to ${basename(updateRestoreFailure.originalPath)}, or reinstall with: npm i -g ${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.PACKAGE_URL
            }
`);
          else
            process.stderr
              .write(`Copy it back to ${updateRestoreFailure.originalPath}, or reinstall with: npm i -g ${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.PACKAGE_URL
            }
`);
        } else
          process.stderr
            .write(`Your Claude Code executable could not be restored after the failed update and no preserved copy was found. Reinstall with: npm i -g ${
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
          }
`);
      } else if (c) {
        process.stderr.write(`Try manually updating with:
`);
        process.stderr.write(`  cd ~/.claude/local && npm update ${
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
        }
`);
      } else
        process.stderr.write(`Or consider using native installation with: claude install
`);
      await gracefulShutdown(1);
      break;
    }
    case "in_progress":
      process.stderr.write(`Error: Another instance is currently performing an update
`);
      process.stderr.write(`Please wait and try again later
`);
      await gracefulShutdown(1);
      break;
  }
  await gracefulShutdown(0);
}
//@ chunk-rkjj4sjx.js:42648-42795 sole-consumer
async function noteSupervisorRestart(l, y) {
  if (await isServerVersionMismatch(l, y))
    writeToStdout(
      sequential.dim(
        `${bgSupervisorNounCap()} will restart on the new version shortly; background jobs continue uninterrupted`,
      ) +
        `
`,
    );
}
