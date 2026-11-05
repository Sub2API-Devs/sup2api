/**
 * cli/handlers/mcpServe.ts
 *
 * 2.1.316 新增：claude mcp serve 子命令（stdio/http 传输、端口、隧道、工作区根）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6ywqythx.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { cwd } from "process";
import { stat } from "fs/promises";
import { isRemoteMcpServeHost, isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { logEventAsync } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  logFeatureBadAsync,
  logFeatureSadAsync,
  logFeatureOkAsync,
} from "../../services/analytics/featureTelemetry.js";
import { cliErrorAfterAnalyticsFlush, printCliError, exitAfterAnalyticsFlush } from "../exit.js";
import { takeSessionTunnelInput } from "../../entrypoints/sessionTunnelInput.js";
import { logForDebugging } from "../../utils/debug.js";
import { isFsInaccessible } from "../../utils/errors.js";
import { applyConfigEnvironmentVariables } from "../../utils/managedEnvApply.js";
import { logError } from "../../utils/log.js";
import { removeCredentialFile } from "../../utils/authFileDescriptor.js";

//@ chunk-6ywqythx.js:4111-8119 placement
/**
 * claude mcp serve：校验 --transport/--port/--tunnel、启动 MCP 服务器（约 4 KB）。
 */
async function mcpServeHandler({ debug, verbose, transport, port, resultFormat, sessionTunnel }, storage) {
  let serveCwd = cwd();
  let transportKind = isRemoteMcpServeHost() ? (transport ?? "stdio") : "stdio";
  let resultFormatKind = isRemoteMcpServeHost() ? (resultFormat ?? "raw") : "raw";
  await logEventAsync("tengu_mcp_start", {
    transport: fromEnum(transportKind),
  });
  let portNumber = 0;
  if (port !== undefined) {
    if (transportKind !== "http") {
      await logFeatureBadAsync("cli_mcp_serve", "cli_mcp_serve_bad_port");
      return cliErrorAfterAnalyticsFlush("Error: --port only applies to --transport http");
    }
    portNumber = /^\d+$/.test(port) ? Number(port) : NaN;
    if (Number.isNaN(portNumber) || portNumber > 65535) {
      await logFeatureBadAsync("cli_mcp_serve", "cli_mcp_serve_bad_port");
      return cliErrorAfterAnalyticsFlush(
        `Error: --port must be an integer between 0 and 65535, got '${port}'`,
      );
    }
  }
  if (transportKind === "http" && !isHttpMcpServeInvocation()) {
    await logFeatureBadAsync("cli_mcp_serve", "cli_mcp_serve_http_spelling");
    return cliErrorAfterAnalyticsFlush(
      'Error: --transport http must come right after "claude mcp serve", followed only by --port, --result-format, --session-tunnel, --debug or --verbose',
    );
  }
  let launcher;
  if (sessionTunnel) {
    let { EX_CONFIG } = await import("./EX_CONFIG.lazy.js");
    let { dialingLauncherFrom } = await import("../../entrypoints/mcpServe/sessionTunnelLauncher.js");
    let launcherResult = await dialingLauncherFrom({
      transport: transportKind,
      port: portNumber,
      line: takeSessionTunnelInput(),
    });
    if ("refusal" in launcherResult) {
      await logFeatureBadAsync("cli_mcp_serve", "cli_mcp_serve_bad_tunnel");
      printCliError(`Error: ${launcherResult.refusal}`);
      return exitAfterAnalyticsFlush(EX_CONFIG);
    }
    launcher = launcherResult;
  }
  let launchSettings = isRemoteMcpServeHost()
    ? (await import("../../entrypoints/takeLaunchSettings.lazy.js")).takeLaunchSettings()
    : {
        kind: "absent",
      };
  let launchPlugins =
    transportKind === "http"
      ? await (await import("../../entrypoints/applyLaunchPlugins.lazy.js")).applyLaunchPlugins()
      : {
          kind: "absent",
        };
  let workspaceRoot =
    transportKind === "http" && isRemoteMcpServeHost()
      ? await (await import("../../entrypoints/mcpServe/takeWorkspaceRoot.lazy.js")).takeWorkspaceRoot()
      : {
          kind: "absent",
        };
  if (workspaceRoot.kind === "invalid") {
    let warning = `CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT is ignored (${workspaceRoot.fault}): only a folder below this server's own can be registered.`;
    logForDebugging(`mcp serve: ${warning}`, {
      level: "error",
    });
    process.stderr.write(`
\u26A0 ${warning}

`);
  }
  try {
    await stat(serveCwd);
  } catch (error) {
    if (isFsInaccessible(error)) {
      await logFeatureBadAsync("cli_mcp_serve", "cli_mcp_serve_cwd_missing");
      return cliErrorAfterAnalyticsFlush(`Error: Directory ${serveCwd} does not exist`);
    }
    throw error;
  }
  try {
    let { awaitPolicyLimitsColdStart } =
      await import("../../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js");
    await awaitPolicyLimitsColdStart();
    let { setup } = await import("../../isDesktopEntrypointExempted.lazy.js");
    await setup(
      serveCwd,
      "default",
      false,
      false,
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      storage,
    );
    if (transportKind === "http") {
      applyConfigEnvironmentVariables();
      let { initializeGrowthBook } = await import("../../services/analytics/ATIS_REQUEST_HEADER.lazy.js");
      initializeGrowthBook().catch(logError);
    }
    let { enforceOrgConfigGateAtStartup } = await import("../../services/policyLimits/orgConfigStartup.js");
    await enforceOrgConfigGateAtStartup({
      interactive: false,
    });
    let { SandboxManager } = await import("../../utils/sandbox/REFUSED_UNTIL_RESTART.lazy.js");
    let sandboxUnavailableReason = SandboxManager.getSandboxUnavailableReason();
    if (sandboxUnavailableReason) {
      if (SandboxManager.isSandboxRequired()) {
        await logFeatureBadAsync("cli_mcp_serve", "cli_mcp_serve_sandbox_required_unavailable");
        return cliErrorAfterAnalyticsFlush(
          `Error: sandbox required but unavailable: ${sandboxUnavailableReason}
` + "  sandbox.failIfUnavailable is set \u2014 refusing to start without a working sandbox.",
        );
      }
      process.stderr.write(`
\u26A0 Sandbox disabled: ${sandboxUnavailableReason}
  Commands will run WITHOUT sandboxing. Network and filesystem restrictions will NOT be enforced.

`);
    } else {
      if (SandboxManager.canMaskCredentialWarningFire()) SandboxManager.checkDependencies();
      let maskCredentialWarning = SandboxManager.getMaskCredentialWarning();
      if (maskCredentialWarning)
        process.stderr.write(`
\u26A0 ${maskCredentialWarning}

`);
      let { warnOfDeniesOnAnotherHostOnStderr } = await import("../../utils/sandbox/deniesOnAnotherHost.js");
      warnOfDeniesOnAnotherHostOnStderr();
    }
    if (transportKind === "http") {
      await removeCredentialFile();
      let { startMCPServerHttp } = await import("../../entrypoints/startMCPServerHttp.lazy.js");
      let { takeToolServerLauncher } = await import("../../entrypoints/mcpServe/sessionTunnelLauncher.js");
      await startMCPServerHttp(serveCwd, {
        port: portNumber,
        debug: debug ?? false,
        verbose: verbose ?? false,
        storageV5: storage,
        resultFormat: resultFormatKind,
        launchSettings,
        launcher: takeToolServerLauncher(launcher),
        workspaceRoot,
      });
    } else {
      let { startMCPServer } = await import("../../entrypoints/mcp.js");
      await startMCPServer(
        serveCwd,
        debug ?? false,
        verbose ?? false,
        storage,
        resultFormatKind,
        launchSettings,
      );
    }
    if (isRemoteMcpServeHost()) {
      let telemetryFields = {
        launched_with_rules: launchSettings.kind === "parsed",
        malformed_rules: launchSettings.kind === "parsed" ? launchSettings.malformedRules : 0,
        launch_plugins_enabled: launchPlugins.kind === "named" ? launchPlugins.enabled : 0,
        launch_plugins_dropped: launchPlugins.kind === "named" ? launchPlugins.dropped : 0,
      };
      if (launchSettings.kind === "unreadable")
        await logFeatureBadAsync("cli_mcp_serve", "unreadable_launch_settings");
      else if (workspaceRoot.kind === "invalid")
        await logFeatureSadAsync("cli_mcp_serve", "invalid_workspace_root", {
          fault: fromEnum(workspaceRoot.fault),
        });
      else if (launchPlugins.kind === "unreadable")
        await logFeatureSadAsync("cli_mcp_serve", "unreadable_launch_plugins", telemetryFields);
      else await logFeatureOkAsync("cli_mcp_serve", telemetryFields);
    } else await logFeatureOkAsync("cli_mcp_serve");
  } catch (error) {
    await logFeatureBadAsync("cli_mcp_serve", "cli_mcp_serve_start_failed");
    if (sessionTunnel) {
      let { EX_UNAVAILABLE, ToolServerPortTakenError } = await import("./EX_CONFIG.lazy.js");
      if (error instanceof ToolServerPortTakenError) {
        printCliError(`Error: Failed to start MCP server: ${error.message}`);
        return exitAfterAnalyticsFlush(EX_UNAVAILABLE);
      }
    }
    return cliErrorAfterAnalyticsFlush(`Error: Failed to start MCP server: ${error}`);
  }
}
export { mcpServeHandler };
