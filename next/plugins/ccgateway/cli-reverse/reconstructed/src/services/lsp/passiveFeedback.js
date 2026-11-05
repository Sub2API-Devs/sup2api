/**
 * services/lsp/passiveFeedback.ts
 *
 * 被动诊断反馈：为每个 LSP 服务器注册 publishDiagnostics 处理器，丢弃陈旧版本，格式化后登记待投递。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/lsp/passiveFeedback.ts
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: affinity 1, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { fileURLToPath } from "url";
import { toError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logPluginScopedError } from "../../utils/plugins/pluginScopedWrite.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { registerPendingLSPDiagnostic } from "./LSPDiagnosticRegistry.js";
import { recordPluginUsage } from "../../utils/telemetry/pluginTelemetry.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";

//@ chunk-5xgkngpb.js:4746485-4746618 affinity (2.1.88 match: severityToNumber, 1)
/**
 * LSP 协议的数字严重级别 1..4 → "Error"/"Warning"/"Info"/"Hint"（未知按 Error）。
 */
function lspSeverityToName(severity) {
  switch (severity) {
    case 1:
      return "Error";
    case 2:
      return "Warning";
    case 3:
      return "Info";
    case 4:
      return "Hint";
    default:
      return "Error";
  }
}
//@ chunk-5xgkngpb.js:4746618-4747154 fingerprint (2.1.88 match: formatDiagnosticsForAttachment, 1)
/**
 * 把 publishDiagnostics 参数转成附件用的诊断文件：file:// URI 转本地路径（失败保留原 URI），严重级别转名字，code 转字符串。
 */
function formatDiagnosticsForAttachment(params) {
  let uri;
  try {
    uri = params.uri.startsWith("file://") ? fileURLToPath(params.uri) : params.uri;
  } catch (error) {
    let err = toError(error);
    logForDebugging(
      `Failed to convert URI to file path: ${params.uri}. Error: ${err.message}. Using original URI as fallback.`,
      {
        level: "error",
      },
    );
    uri = params.uri;
  }
  let diagnostics = params.diagnostics.map((diag) => ({
    message: diag.message,
    severity: lspSeverityToName(diag.severity),
    range: {
      start: {
        line: diag.range.start.line,
        character: diag.range.start.character,
      },
      end: {
        line: diag.range.end.line,
        character: diag.range.end.character,
      },
    },
    source: diag.source,
    code: diag.code !== undefined && diag.code !== null ? String(diag.code) : undefined,
  }));
  return [
    {
      uri,
      diagnostics,
    },
  ];
}
//@ chunk-5xgkngpb.js:4747154-4750272 fingerprint (2.1.88 match: registerLSPNotificationHandlers, 0.705)
/**
 * 为每个 LSP 服务器注册 textDocument/publishDiagnostics 处理器（config.diagnostics===false 的跳过并上报 tengu_lsp_diagnostics_disabled）：丢弃版本早于当前文档版本的陈旧诊断，格式化后登记到会话的诊断登记表，等下一轮由附件系统作为 lsp 诊断注入对话；连续失败 3 次告警。返回注册统计。
 */
function registerLSPNotificationHandlers(manager, context) {
  let servers = manager.getAllServers();
  let registrationErrors = [];
  let successCount = 0;
  let diagnosticFailures = new Map();
  let disabledCount = 0;
  for (let [serverName, server] of servers.entries())
    try {
      if (server?.config?.diagnostics === false) {
        logForDebugging(`Diagnostics disabled for ${serverName}, skipping`);
        disabledCount++;
        continue;
      }
      if (!server || typeof server.onNotification !== "function") {
        let errorMsg = !server
          ? "Server instance is null/undefined"
          : "Server instance has no onNotification method";
        registrationErrors.push({
          serverName,
          error: errorMsg,
        });
        logPluginScopedError(Error(`${errorMsg} for ${serverName}`), errorMsg);
        logForDebugging(`Skipping handler registration for ${serverName}: ${errorMsg}`);
        continue;
      }
      server.onNotification("textDocument/publishDiagnostics", (params) => {
        logForDebugging(
          `[PASSIVE DIAGNOSTICS] Handler invoked for ${serverName}! Params type: ${typeof params}`,
        );
        try {
          if (!params || typeof params !== "object" || !("uri" in params) || !("diagnostics" in params)) {
            logForDebugging(
              `LSP server ${serverName} sent invalid diagnostic params (missing uri or diagnostics): ${jsonStringify(params)}`,
              {
                level: "error",
              },
            );
            return;
          }
          let diagnosticParams = params;
          logForDebugging(
            `Received diagnostics from ${serverName}: ${diagnosticParams.diagnostics.length} diagnostic(s) for ${diagnosticParams.uri}`,
          );
          if (diagnosticParams.version !== undefined) {
            let documentVersion = manager.getDocumentVersion(diagnosticParams.uri);
            if (documentVersion !== undefined && diagnosticParams.version < documentVersion) {
              logForDebugging(
                `LSP Diagnostics: Dropping stale publishDiagnostics from ${serverName} for ${diagnosticParams.uri} (server v${diagnosticParams.version} < current v${documentVersion})`,
              );
              return;
            }
          }
          let diagnosticFiles = formatDiagnosticsForAttachment(diagnosticParams);
          let firstFile = diagnosticFiles[0];
          if (!firstFile || diagnosticFiles.length === 0 || firstFile.diagnostics.length === 0) {
            logForDebugging(`Skipping empty diagnostics from ${serverName} for ${diagnosticParams.uri}`);
            return;
          }
          try {
            registerPendingLSPDiagnostic(context, {
              serverName,
              files: diagnosticFiles,
            });
            logForDebugging(
              `LSP Diagnostics: Registered ${diagnosticFiles.length} diagnostic file(s) from ${serverName} for async delivery`,
            );
            diagnosticFailures.delete(serverName);
            if (server.config?.pluginSource) recordPluginUsage(server.config.pluginSource);
          } catch (error) {
            let err = toError(error);
            logPluginScopedError(err, "Error registering LSP diagnostics");
            logForDebugging(
              `Error registering LSP diagnostics from ${serverName}: URI: ${diagnosticParams.uri}, Diagnostic count: ${firstFile.diagnostics.length}, Error: ${err.message}`,
            );
            let failure = diagnosticFailures.get(serverName) || {
              count: 0,
              lastError: "",
            };
            failure.count++;
            failure.lastError = err.message;
            diagnosticFailures.set(serverName, failure);
            if (failure.count >= 3)
              logForDebugging(
                `WARNING: LSP diagnostic handler for ${serverName} has failed ${failure.count} times consecutively. Last error: ${failure.lastError}. This may indicate a problem with the LSP server or diagnostic processing. Check logs for details.`,
              );
          }
        } catch (error) {
          let err = toError(error);
          logForDebugging(`Unexpected error processing diagnostics from ${serverName}: ${err.message}`, {
            level: "error",
          });
          let failure = diagnosticFailures.get(serverName) || {
            count: 0,
            lastError: "",
          };
          failure.count++;
          failure.lastError = err.message;
          diagnosticFailures.set(serverName, failure);
          if (failure.count >= 3)
            logForDebugging(
              `WARNING: LSP diagnostic handler for ${serverName} has failed ${failure.count} times consecutively. Last error: ${failure.lastError}. This may indicate a problem with the LSP server or diagnostic processing. Check logs for details.`,
            );
        }
      });
      logForDebugging(`Registered diagnostics handler for ${serverName}`);
      successCount++;
    } catch (error) {
      let err = toError(error);
      registrationErrors.push({
        serverName,
        error: err.message,
      });
      logForDebugging(`Failed to register diagnostics handler for ${serverName}: Error: ${err.message}`, {
        level: "error",
      });
      logFeatureBad("lsp_diagnostics_register", "lsp_diagnostics_register_failed");
    }
  let totalServers = servers.size;
  if (disabledCount > 0)
    logEvent("tengu_lsp_diagnostics_disabled", {
      disabled_count: disabledCount,
      total_servers: totalServers,
    });
  if (registrationErrors.length > 0) {
    let failedServers = registrationErrors.map((e) => `${e.serverName} (${e.error})`).join(", ");
    logForDebugging(
      `LSP notification handler registration: ${successCount}/${totalServers} succeeded. Failed servers: ${failedServers}. Diagnostics from failed servers will not be delivered.`,
      {
        level: "error",
      },
    );
  } else {
    logForDebugging(`LSP notification handlers registered successfully for all ${totalServers} server(s)`);
    logFeatureOk("lsp_diagnostics_register");
  }
  return {
    totalServers,
    successCount,
    registrationErrors,
  };
}
export { registerLSPNotificationHandlers };
