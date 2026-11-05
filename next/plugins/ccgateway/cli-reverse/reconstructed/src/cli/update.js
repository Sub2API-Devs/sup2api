/**
 * cli/update.ts
 *
 * claude update/upgrade：检测安装类型，按 native/npm/包管理器分别更新并打印结果
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/update.ts
 * pieces: chunk-dmy6j4d2.js (2)
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
import { semverGt, lt, semverGte } from "../utils/semver.js";
import { getInitialSettings, getSettingsForSource } from "../utils/settings/settings.js";
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

//@ chunk-dmy6j4d2.js:13579-43852 fingerprint (2.1.88 match: update, 0.63)
/**
 * claude update：检查安装方式（native/npm-local/npm-global/package-manager/development），包管理器安装只提示命令（Homebrew/winget/apk…），原生安装走 installLatest，npm 安装走全局/本地 npm；处理多重安装与配置的 installMethod 不一致。
 */
async function update(options) {
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
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION
  }
`);
  let channel = autoUpdatesChannel();
  let homebrewCaskName = getHomebrewCaskName();
  let resolvedChannel = homebrewCaskName
    ? homebrewCaskName === "claude-code@latest"
      ? "latest"
      : "stable"
    : detectHomebrew()
      ? "stable"
      : channel;
  let targetChannel = resolvedChannel === "rc" ? "slow" : resolvedChannel;
  writeToStdout(`Checking for updates to ${targetChannel} version...
`);
  logForDebugging("update: Starting update check");
  logForDebugging("update: Running diagnostic");
  let diagnostic = await getDoctorDiagnostic({
    storageV5: options,
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
      options,
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
      let brewCommand = `brew upgrade ${homebrewCaskName ?? "claude-code"}`;
      let latest = await latestVersionFromSources(homebrewCaskName ?? "claude-code", resolvedChannel);
      if (latest === null) {
        writeToStdout(`Could not check for updates (network check skipped or unavailable).
`);
        writeToStdout(`To update manually, run:
`);
        writeToStdout(
          sequential.bold(`  ${brewCommand}`) +
            `
`,
        );
      } else if (
        !semverGt(
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
          }.VERSION,
          latest,
        )
      ) {
        writeToStdout(`Update available: ${
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
          }.VERSION
        } \u2192 ${latest}
`);
        writeToStdout(`
`);
        writeToStdout(`To update, run:
`);
        writeToStdout(
          sequential.bold(`  ${brewCommand}`) +
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
      let latest = await getLatestVersion(resolvedChannel);
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
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
      let latest = await getLatestVersion(resolvedChannel);
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
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
    let result =
      {
        "npm-local": "local",
        "npm-global": "global",
        native: "native",
        development: "development",
        unknown: "unknown",
      }[runningType] || runningType;
    if (result !== configExpects && configExpects !== "unknown") {
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
          installMethod: result,
        }),
        options,
      );
      writeToStdout(`Config updated to reflect current installation method: ${result}
`);
    }
  }
  if (diagnostic.installationType === "native") {
    logForDebugging("update: Detected native installation, using native updater");
    if (
      getInitialSettings()?.minimumVersion ||
      getSettingsForSource("policySettings")?.requiredMaximumVersion
    ) {
      let version = await getLatestVersion_2(resolvedChannel).catch(() => null);
      let skipReason = version ? getVersionSkipReason(version) : null;
      if (version && skipReason) {
        writeToStdout(
          sequential.yellow(
            `The ${targetChannel} channel is at ${version}, which is ${skipReason}. Staying on ${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
    getLatestVersion_2(resolvedChannel)
      .then((latestVersion) => {
        if (
          !latestVersion ||
          latestVersion ===
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
              VERSION: "2.1.318",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-11-03T18:52:53Z",
              GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION,
          )
            ? `@${resolvedChannel} is at ${latestVersion} (older than ${
                {
                  ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                  PACKAGE_URL: "@anthropic-ai/claude-code",
                  README_URL: "https://code.claude.com/docs/en/overview",
                  VERSION: "2.1.318",
                  FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                  BUILD_TIME: "2026-11-03T18:52:53Z",
                  GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
      let installResult = await installLatest(resolvedChannel, false, options);
      if (installResult.lockFailed) {
        let pidInfo = installResult.lockHolderPid ? ` (PID ${installResult.lockHolderPid})` : "";
        writeToStdout(
          sequential.yellow(
            `Another Claude process${pidInfo} is currently running. Please try again in a moment.`,
          ) +
            `
`,
        );
        await gracefulShutdown(0);
      }
      if (!installResult.latestVersion) {
        process.stderr.write(`Failed to check for updates
`);
        await gracefulShutdown(1);
      }
      if (
        installResult.wasUpdated &&
        installResult.latestVersion !==
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
          }.VERSION
      ) {
        writeToStdout(
          sequential.green(
            `Successfully updated from ${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION
            } to version ${installResult.latestVersion}`,
          ) +
            `
`,
        );
        await regenerateCompletionCache();
        await noteSupervisorRestart(installResult.latestVersion, options);
      } else if (installResult.skippedUnverifiedRelease)
        writeToStdout(
          sequential.yellow(
            `Update target ${installResult.latestVersion} (from @${resolvedChannel} or a server-side override) predates release-signature enforcement; staying on ${
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION
            }. Run \`claude install ${installResult.latestVersion}\` to switch to it explicitly.`,
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
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.PACKAGE_URL
    }`,
  );
  let npmTag = resolvedChannel === "stable" ? "stable" : "latest";
  let npmCommand = `npm view ${
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
  }@${npmTag} version`;
  logForDebugging(`update: Running: ${npmCommand}`);
  let latestVersion = await getLatestVersion(resolvedChannel);
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
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.PACKAGE_URL &&
      !{
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
  let candidateVersion = latestVersion;
  let updated = false;
  if (
    forceDowngradeEnabled &&
    maxVersion &&
    isForceDowngradeActive(
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
      }.VERSION,
      maxVersion,
      "auto_updater",
    )
  ) {
    candidateVersion = maxVersion;
    updated = true;
  } else if (maxVersion && latestVersion && semverGte(latestVersion, maxVersion)) {
    logForDebugging(
      `update: maxVersion ${maxVersion} is set, capping update from ${latestVersion} to ${maxVersion}`,
    );
    candidateVersion = semverGte(
      maxVersion,
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
      }.VERSION,
    )
      ? maxVersion
      : {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION;
  }
  let specificSkipReason = candidateVersion ? getVersionSkipReason(candidateVersion) : null;
  if (candidateVersion && specificSkipReason) {
    let isLatest =
      candidateVersion === latestVersion
        ? `The ${targetChannel} channel is at ${candidateVersion}`
        : `The update target is capped at ${candidateVersion} by a server-side version policy`;
    writeToStdout(
      sequential.yellow(
        `${isLatest}, which is ${specificSkipReason}. Staying on ${
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
          }.VERSION
        }.`,
      ) +
        `
`,
    );
    await gracefulShutdown(0);
  }
  if (
    candidateVersion ===
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
    }.VERSION
  ) {
    writeToStdout(
      sequential.green(
        `Claude Code is up to date (${
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
          }.VERSION
        })`,
      ) +
        `
`,
    );
    await gracefulShutdown(0);
  }
  if (
    !updated &&
    candidateVersion &&
    lt(
      candidateVersion,
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
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION
        }, which is newer than the ${targetChannel} channel's ${candidateVersion}. Skipping update. To switch back to the channel version, run claude install ${candidateVersion}.`,
      ) +
        `
`,
    );
    await gracefulShutdown(0);
  }
  if (updated) {
    logEvent("tengu_auto_updater_forced_downgrade", {
      from_version: sanitizeVersion(
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
        }.VERSION,
      ),
      to_version: sanitizeVersion(candidateVersion),
    });
    writeToStdout(
      sequential.yellow(
        `Downgrading to ${candidateVersion} (current: ${
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
          }.VERSION
        }) \u2014 required by a server-side version policy.`,
      ) +
        `
`,
    );
  } else
    writeToStdout(`New version available: ${candidateVersion} (current: ${
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
      }.VERSION
    })
`);
  writeToStdout(`Installing update...
`);
  let installed = false;
  let updateMethodName = "";
  switch (diagnostic.installationType) {
    case "npm-local":
      installed = true;
      updateMethodName = "local";
      break;
    case "npm-global":
      installed = false;
      updateMethodName = "global";
      break;
    case "unknown": {
      let isLocal = await localInstallationExists();
      installed = isLocal;
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
  logForDebugging(`update: useLocalUpdate: ${installed}`);
  let output;
  let code;
  if (installed) {
    logForDebugging("update: Calling installOrUpdateClaudePackage() for local update");
    output = await installOrUpdateClaudePackage(resolvedChannel, candidateVersion, options);
  } else {
    logForDebugging("update: Calling installGlobalPackage() for global update");
    code = await installGlobalPackage(candidateVersion, options);
    output = code.status;
  }
  logForDebugging(`update: Installation status: ${output}`);
  if (output !== "in_progress")
    await recordUpdateResult(
      {
        timestamp: new Date().toISOString(),
        path: installed ? "npm-local" : "npm-global",
        outcome: output === "success" ? "success" : "failed",
        status: output,
        version_from: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        version_to: candidateVersion,
        error_code:
          output === "install_failed" && getUpdateRestoreFailure()
            ? "update_apply_restore_failed"
            : updateApplyErrorKey(code?.failureHint),
      },
      options,
    );
  switch (output) {
    case "success":
      writeToStdout(
        sequential.green(
          updated
            ? `Successfully downgraded from ${
                {
                  ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                  PACKAGE_URL: "@anthropic-ai/claude-code",
                  README_URL: "https://code.claude.com/docs/en/overview",
                  VERSION: "2.1.318",
                  FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                  BUILD_TIME: "2026-11-03T18:52:53Z",
                  GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                  HOOKS_WORKER_URL:
                    import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                  DD_SOURCEMAP_GROUP: "default",
                }.VERSION
              } to version ${candidateVersion}`
            : `Successfully updated from ${
                {
                  ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                  PACKAGE_URL: "@anthropic-ai/claude-code",
                  README_URL: "https://code.claude.com/docs/en/overview",
                  VERSION: "2.1.318",
                  FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                  BUILD_TIME: "2026-11-03T18:52:53Z",
                  GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                  HOOKS_WORKER_URL:
                    import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                  DD_SOURCEMAP_GROUP: "default",
                }.VERSION
              } to version ${candidateVersion}`,
        ) +
          `
`,
      );
      await regenerateCompletionCache();
      await noteSupervisorRestart(candidateVersion, options);
      break;
    case "no_permissions":
      process.stderr.write(`Error: Insufficient permissions to install update
`);
      if (installed) {
        process.stderr.write(`Try manually updating with:
`);
        process.stderr.write(`  cd ~/.claude/local && npm update ${
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
      if (!updateRestoreFailure && code?.failureHint) {
        switch (code.failureHint) {
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
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
              VERSION: "2.1.318",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-11-03T18:52:53Z",
              GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.PACKAGE_URL
          }
`);
      } else if (installed) {
        process.stderr.write(`Try manually updating with:
`);
        process.stderr.write(`  cd ~/.claude/local && npm update ${
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
//@ chunk-dmy6j4d2.js:43852-43999 sole-consumer
async function noteSupervisorRestart(options, state) {
  if (await isServerVersionMismatch(options, state))
    writeToStdout(
      sequential.dim(
        `${bgSupervisorNounCap()} will restart on the new version shortly; background jobs continue uninterrupted`,
      ) +
        `
`,
    );
}
export { update };
