/**
 * cli/handlers/mcpServe.ts
 *
 * 2.1.316 新增：claude mcp serve 子命令（stdio/http 传输、端口、隧道、工作区根）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4x781459.js (1)
 * attribution: placement 1
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

//@ chunk-4x781459.js:3775-7783 placement
/**
 * claude mcp serve：校验 --transport/--port/--tunnel、启动 MCP 服务器（约 4 KB）。
 */
async function mcpServeHandler({ debug, verbose, transport, port, resultFormat, sessionTunnel }, w) {
  let s = cwd();
  let i = isRemoteMcpServeHost() ? (transport ?? "stdio") : "stdio";
  let S = isRemoteMcpServeHost() ? (resultFormat ?? "raw") : "raw";
  await logEventAsync("tengu_mcp_start", {
    transport: fromEnum(i),
  });
  let p = 0;
  if (port !== undefined) {
    if (i !== "http") {
      await logFeatureBadAsync("cli_mcp_serve", "cli_mcp_serve_bad_port");
      return cliErrorAfterAnalyticsFlush("Error: --port only applies to --transport http");
    }
    p = /^\d+$/.test(port) ? Number(port) : NaN;
    if (Number.isNaN(p) || p > 65535) {
      await logFeatureBadAsync("cli_mcp_serve", "cli_mcp_serve_bad_port");
      return cliErrorAfterAnalyticsFlush(
        `Error: --port must be an integer between 0 and 65535, got '${port}'`,
      );
    }
  }
  if (i === "http" && !isHttpMcpServeInvocation()) {
    await logFeatureBadAsync("cli_mcp_serve", "cli_mcp_serve_http_spelling");
    return cliErrorAfterAnalyticsFlush(
      'Error: --transport http must come right after "claude mcp serve", followed only by --port, --result-format, --session-tunnel, --debug or --verbose',
    );
  }
  let T;
  if (sessionTunnel) {
    let { EX_CONFIG } = await import("./chunk-e6a6pbbv.js");
    let { dialingLauncherFrom } = await import("./chunk-e5sh0ze5.js");
    let o = await dialingLauncherFrom({
      transport: i,
      port: p,
      line: takeSessionTunnelInput(),
    });
    if ("refusal" in o) {
      await logFeatureBadAsync("cli_mcp_serve", "cli_mcp_serve_bad_tunnel");
      printCliError(`Error: ${o.refusal}`);
      return exitAfterAnalyticsFlush(EX_CONFIG);
    }
    T = o;
  }
  let n = isRemoteMcpServeHost()
    ? (await import("./chunk-87nrc1a5.js")).takeLaunchSettings()
    : {
        kind: "absent",
      };
  let d =
    i === "http"
      ? await (await import("./chunk-qkxfkqxj.js")).applyLaunchPlugins()
      : {
          kind: "absent",
        };
  let m =
    i === "http" && isRemoteMcpServeHost()
      ? await (await import("./chunk-hegc6e59.js")).takeWorkspaceRoot()
      : {
          kind: "absent",
        };
  if (m.kind === "invalid") {
    let e = `CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT is ignored (${m.fault}): only a folder below this server's own can be registered.`;
    logForDebugging(`mcp serve: ${e}`, {
      level: "error",
    });
    process.stderr.write(`
\u26A0 ${e}

`);
  }
  try {
    await stat(s);
  } catch (error) {
    if (isFsInaccessible(error)) {
      await logFeatureBadAsync("cli_mcp_serve", "cli_mcp_serve_cwd_missing");
      return cliErrorAfterAnalyticsFlush(`Error: Directory ${s} does not exist`);
    }
    throw error;
  }
  try {
    let { awaitPolicyLimitsColdStart } = await import("./chunk-qchbrsbw.js");
    await awaitPolicyLimitsColdStart();
    let { setup } = await import("./chunk-fhdzwff4.js");
    await setup(s, "default", false, false, undefined, false, undefined, undefined, undefined, w);
    if (i === "http") {
      applyConfigEnvironmentVariables();
      let { initializeGrowthBook } = await import("./chunk-6df1d6re.js");
      initializeGrowthBook().catch(logError);
    }
    let { enforceOrgConfigGateAtStartup } = await import("./chunk-np0e9bed.js");
    await enforceOrgConfigGateAtStartup({
      interactive: false,
    });
    let { SandboxManager } = await import("./chunk-y0my07fj.js");
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
      let { warnOfDeniesOnAnotherHostOnStderr } = await import("./chunk-vf7xwvf8.js");
      warnOfDeniesOnAnotherHostOnStderr();
    }
    if (i === "http") {
      await removeCredentialFile();
      let { startMCPServerHttp } = await import("./chunk-k26nnqnx.js");
      let { takeToolServerLauncher } = await import("./chunk-e5sh0ze5.js");
      await startMCPServerHttp(s, {
        port: p,
        debug: debug ?? false,
        verbose: verbose ?? false,
        storageV5: w,
        resultFormat: S,
        launchSettings: n,
        launcher: takeToolServerLauncher(T),
        workspaceRoot: m,
      });
    } else {
      let { startMCPServer } = await import("./chunk-axz11cz2.js");
      await startMCPServer(s, debug ?? false, verbose ?? false, w, S, n);
    }
    if (isRemoteMcpServeHost()) {
      let r = {
        launched_with_rules: n.kind === "parsed",
        malformed_rules: n.kind === "parsed" ? n.malformedRules : 0,
        launch_plugins_enabled: d.kind === "named" ? d.enabled : 0,
        launch_plugins_dropped: d.kind === "named" ? d.dropped : 0,
      };
      if (n.kind === "unreadable") await logFeatureBadAsync("cli_mcp_serve", "unreadable_launch_settings");
      else if (m.kind === "invalid")
        await logFeatureSadAsync("cli_mcp_serve", "invalid_workspace_root", {
          fault: fromEnum(m.fault),
        });
      else if (d.kind === "unreadable")
        await logFeatureSadAsync("cli_mcp_serve", "unreadable_launch_plugins", r);
      else await logFeatureOkAsync("cli_mcp_serve", r);
    } else await logFeatureOkAsync("cli_mcp_serve");
  } catch (error) {
    await logFeatureBadAsync("cli_mcp_serve", "cli_mcp_serve_start_failed");
    if (sessionTunnel) {
      let { EX_UNAVAILABLE, ToolServerPortTakenError } = await import("./chunk-e6a6pbbv.js");
      if (error instanceof ToolServerPortTakenError) {
        printCliError(`Error: Failed to start MCP server: ${error.message}`);
        return exitAfterAnalyticsFlush(EX_UNAVAILABLE);
      }
    }
    return cliErrorAfterAnalyticsFlush(`Error: Failed to start MCP server: ${error}`);
  }
}
