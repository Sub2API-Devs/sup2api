/**
 * services/diagnosticTracking.ts
 *
 * IDE 诊断跟踪服务：编辑前后从 IDE（VS Code/JetBrains MCP）取诊断基线与新诊断并比对；本段还混入了 @opentelemetry/api-logs 的 ProxyLogger 等第三方代码
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/diagnosticTracking.ts
 * pieces: chunk-5xgkngpb.js (8), chunk-exfmq47h.js (1)
 * attribution: placement 5, layout 2, fingerprint 2
 */
import { LogsAPI } from "../../vendor/@opentelemetry/api-logs/build/esm/api/logs.js";
import { ClaudeError, withTelemetryMessage, hasExactErrorMessage } from "../utils/errors.js";
import { normalizePathForCompare, samePath } from "../utils/file.js";
import { withTimeout as withTimeout_2 } from "../utils/sleep.js";
import { logError } from "../utils/log.js";
import { logFeatureSad, logFeatureOk } from "./analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { isSubsetOf } from "../utils/fsWatchProbe.js";
import { jsonParse, jsonStringifyRaw } from "../utils/slowOperations.js";
import { hasAccessToIDEExtensionDiffFeature as hasAccessToIDEExtensionDiffFeature_3 } from "./compact/idleToolResultClearing.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:662934-662959 fingerprint (2.1.88 match: diagnosticTracker, 1)
var diagnosticTracker; // deferred: uses LogsAPI (../../vendor/@opentelemetry/api-logs/build/esm/api/logs.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:662934", () => {
  diagnosticTracker = LogsAPI.getInstance();
});
//@ chunk-5xgkngpb.js:593989-594060 placement
function getMcpClientModule() {
  return require("./mcp/emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-5xgkngpb.js:594060-594083 placement
/**
 * IDE 诊断文件路径不匹配时抛出的错误类型。
 */
let DiagnosticsPathMismatchError; // deferred: uses ClaudeError (../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:594060", () => {
  DiagnosticsPathMismatchError = class DiagnosticsPathMismatchError extends ClaudeError {};
});
//@ chunk-5xgkngpb.js:594083-594369 layout
/**
 * 从 URI 中提取盘符的正则。
 */
var DIAGNOSTICS_POLL_INTERVAL_MS = 500;
var MAX_BASELINE_TIMEOUTS = 3;
var IDE_DIAGNOSTICS_TIMEOUT_MS = 2000;
var BASELINE_TIMEOUT_MESSAGE = "IDE diagnostics baseline timed out";
var FETCH_TIMEOUT_MESSAGE = "IDE diagnostics fetch timed out";
var JETBRAINS_PLUGIN_NAME = "Claude Code JetBrains Plugin";
var URI_PREFIXES = ["file://", "_claude_fs_right:", "_claude_fs_left:"];
var WINDOWS_DRIVE_PATH_RE = /^[\\/][A-Za-z]:[\\/]/;
var DRIVE_LETTER_IN_URI_RE = /(?:^|[\\/])([A-Za-z])(?::|%3[Aa])(?=[\\/]|%5[Cc]|%2[Ff])/;
//@ chunk-5xgkngpb.js:594369-594781 layout
function classifyDiagnosticUri(uri) {
  let lower = uri.toLowerCase();
  let scheme = lower.startsWith("file://")
    ? "file-uri"
    : lower.startsWith("_claude_fs_right:")
      ? "fs-right"
      : lower.startsWith("_claude_fs_left:")
        ? "fs-left"
        : "bare";
  let included = uri.includes("\\");
  let included_2 = uri.includes("/");
  let separators = included && included_2 ? "mixed" : included ? "back" : included_2 ? "fwd" : "none";
  let encoding = /%[0-9A-Fa-f]{2}/.test(uri) ? "pct" : "plain";
  let driveLetter = DRIVE_LETTER_IN_URI_RE.exec(uri)?.[1];
  let driveCase =
    driveLetter === undefined ? "none" : driveLetter === driveLetter.toUpperCase() ? "upper" : "lower";
  return `scheme=${scheme} sep=${separators} enc=${encoding} drive=${driveCase}`;
}
//@ chunk-5xgkngpb.js:594781-598400 fingerprint (2.1.88 match: DiagnosticTrackingService, 0.56)
class DiagnosticTrackingService {
  baseline = new Map();
  initialized = false;
  mcpClient;
  lastProcessedTimestamps = new Map();
  rightFileDiagnosticsState = new Map();
  consecutiveBaselineTimeouts = 0;
  workspaceFetchInFlight;
  initialize(mcpClient) {
    if (this.initialized) return;
    this.mcpClient = mcpClient;
    this.initialized = true;
  }
  async shutdown() {
    this.initialized = false;
    this.baseline.clear();
    this.rightFileDiagnosticsState.clear();
    this.lastProcessedTimestamps.clear();
    this.consecutiveBaselineTimeouts = 0;
    this.workspaceFetchInFlight = undefined;
  }
  reset() {
    this.baseline.clear();
    this.rightFileDiagnosticsState.clear();
    this.lastProcessedTimestamps.clear();
    this.workspaceFetchInFlight = undefined;
  }
  normalizeFileUri(uri) {
    let found = URI_PREFIXES.find((prefix) => uri.startsWith(prefix));
    let rest = found ? uri.slice(found.length) : uri;
    let trimmed = found !== undefined && WINDOWS_DRIVE_PATH_RE.test(rest) ? rest.slice(1) : rest;
    return normalizePathForCompare(trimmed);
  }
  async beforeFileEdited(filePath) {
    if (
      !this.initialized ||
      !this.mcpClient ||
      this.mcpClient.type !== "connected" ||
      this.mcpClient.serverInfo?.name === JETBRAINS_PLUGIN_NAME ||
      this.consecutiveBaselineTimeouts >= MAX_BASELINE_TIMEOUTS
    )
      return;
    let now = Date.now();
    let consecutiveBaselineTimeouts = this.consecutiveBaselineTimeouts;
    try {
      let result = await withTimeout_2(
        getMcpClientModule().callIdeRpc(
          "getDiagnostics",
          {
            uri: `file://${filePath}`,
          },
          this.mcpClient,
        ),
        DIAGNOSTICS_POLL_INTERVAL_MS,
        BASELINE_TIMEOUT_MESSAGE,
      );
      let diagnosticFile = this.parseDiagnosticResult(result)[0];
      if (
        diagnosticFile &&
        !samePath(this.normalizeFileUri(filePath), this.normalizeFileUri(diagnosticFile.uri))
      ) {
        logError(
          withTelemetryMessage(
            new DiagnosticsPathMismatchError(
              `Diagnostics file path mismatch: expected ${filePath}, got ${diagnosticFile.uri}`,
            ),
            `Diagnostics file path mismatch: expected ${classifyDiagnosticUri(filePath)}, got ${classifyDiagnosticUri(diagnosticFile.uri)}`,
          ),
        );
        logFeatureSad("ide_diagnostics_baseline", "path_mismatch", {
          duration_ms: Date.now() - now,
          consecutive_timeouts: this.consecutiveBaselineTimeouts,
        });
        return;
      }
      let normalizedPath = this.normalizeFileUri(filePath);
      this.baseline.set(normalizedPath, diagnosticFile ? diagnosticFile.diagnostics : []);
      this.lastProcessedTimestamps.set(normalizedPath, now);
      this.consecutiveBaselineTimeouts = 0;
      logFeatureOk("ide_diagnostics_baseline", {
        duration_ms: Date.now() - now,
      });
    } catch (error) {
      let failureKind = classifyDiagnosticsError(error, BASELINE_TIMEOUT_MESSAGE);
      if (failureKind === "timeout" && this.consecutiveBaselineTimeouts === consecutiveBaselineTimeouts) {
        this.consecutiveBaselineTimeouts++;
        if (this.consecutiveBaselineTimeouts === MAX_BASELINE_TIMEOUTS)
          logForDebugging(
            `IDE diagnostics baselines disabled after ${MAX_BASELINE_TIMEOUTS} consecutive timeouts`,
          );
      }
      logFeatureSad("ide_diagnostics_baseline", failureKind, {
        duration_ms: Date.now() - now,
        consecutive_timeouts: this.consecutiveBaselineTimeouts,
      });
    }
  }
  async getNewDiagnostics() {
    if (!this.initialized || !this.mcpClient || this.mcpClient.type !== "connected") return [];
    if (this.baseline.size === 0) return [];
    if (this.workspaceFetchInFlight) {
      logFeatureSad("ide_diagnostics_fetch", "in_flight");
      return [];
    }
    let now = Date.now();
    let files = [];
    try {
      let fetchPromise = getMcpClientModule().callIdeRpc("getDiagnostics", {}, this.mcpClient);
      this.workspaceFetchInFlight = fetchPromise;
      fetchPromise
        .finally(() => {
          if (this.workspaceFetchInFlight === fetchPromise) this.workspaceFetchInFlight = undefined;
        })
        .catch(() => {});
      let rawResult = await withTimeout_2(fetchPromise, IDE_DIAGNOSTICS_TIMEOUT_MS, FETCH_TIMEOUT_MESSAGE);
      files = this.parseDiagnosticResult(rawResult);
    } catch (error) {
      logFeatureSad("ide_diagnostics_fetch", classifyDiagnosticsError(error, FETCH_TIMEOUT_MESSAGE), {
        duration_ms: Date.now() - now,
      });
      return [];
    }
    let fileUris = [];
    let rightFileByPath = new Map();
    for (let file of files) {
      let isFileUri = file.uri.startsWith("file://");
      if (!isFileUri && !file.uri.startsWith("_claude_fs_right:")) continue;
      let normalizedPath = this.normalizeFileUri(file.uri);
      if (!this.baseline.has(normalizedPath)) continue;
      if (isFileUri)
        fileUris.push({
          file,
          normalizedPath,
        });
      else rightFileByPath.set(normalizedPath, file);
    }
    let newDiagnosticFiles = [];
    for (let { file, normalizedPath } of fileUris) {
      let previousDiagnostics = this.baseline.get(normalizedPath) || [];
      let claudeFsRightFile = rightFileByPath.get(normalizedPath);
      let fileToUse = file;
      if (claudeFsRightFile) {
        let previousRightDiagnostics = this.rightFileDiagnosticsState.get(normalizedPath);
        if (
          !previousRightDiagnostics ||
          !this.areDiagnosticArraysEqual(previousRightDiagnostics, claudeFsRightFile.diagnostics)
        )
          fileToUse = claudeFsRightFile;
        this.rightFileDiagnosticsState.set(normalizedPath, claudeFsRightFile.diagnostics);
      }
      let previousLocations = new Set(previousDiagnostics.map(formatLocation));
      let filtered = fileToUse.diagnostics.filter(
        (diagnostic) => !previousLocations.has(formatLocation(diagnostic)),
      );
      if (filtered.length > 0)
        newDiagnosticFiles.push({
          uri: file.uri,
          diagnostics: filtered,
        });
      this.baseline.set(normalizedPath, fileToUse.diagnostics);
    }
    return newDiagnosticFiles;
  }
  areDiagnosticArraysEqual(left, right) {
    if (left.length !== right.length) return false;
    let leftLocations = new Set(left.map(formatLocation));
    let rightLocations = new Set(right.map(formatLocation));
    return leftLocations.size === rightLocations.size && isSubsetOf(leftLocations, rightLocations);
  }
  parseDiagnosticResult(result) {
    if (Array.isArray(result)) {
      let textBlock = result.find((block) => block.type === "text");
      if (textBlock && "text" in textBlock) return jsonParse(textBlock.text);
    }
    return [];
  }
  async handleQueryStart(clients) {
    if (!this.initialized) {
      let connectedIdeClient = hasAccessToIDEExtensionDiffFeature_3(clients);
      if (connectedIdeClient) this.initialize(connectedIdeClient);
    } else this.reset();
  }
}
//@ chunk-5xgkngpb.js:598400-598428 placement
/**
 * 按会话根保存的 IDE 诊断跟踪服务。
 */
var diagnosticTrackingSlot; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:598400", () => {
  diagnosticTrackingSlot = new SessionRootSlot(() => new DiagnosticTrackingService());
});
//@ chunk-5xgkngpb.js:598428-598574 placement (2.1.88 match: formatLocation, 0.771)
/**
 * 把诊断（message/severity/source/code/range）拼成去重键（误配名 formatLocation，属 LSP 诊断）。
 */
function formatLocation(location) {
  let range = location.range;
  return jsonStringifyRaw([
    location.message,
    location.severity,
    location.source,
    location.code,
    range?.start?.line,
    range?.start?.character,
    range?.end?.line,
    range?.end?.character,
  ]);
}
//@ chunk-5xgkngpb.js:598574-598674 placement
function classifyDiagnosticsError(error, timeoutMessage) {
  if (hasExactErrorMessage(error, timeoutMessage)) return "timeout";
  return error instanceof SyntaxError ? "parse_failed" : "error";
}
export { diagnosticTrackingSlot, diagnosticTracker };
