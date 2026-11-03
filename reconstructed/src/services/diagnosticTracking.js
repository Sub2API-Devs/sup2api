/**
 * services/diagnosticTracking.ts
 *
 * IDE 诊断跟踪服务：编辑前后从 IDE（VS Code/JetBrains MCP）取诊断基线与新诊断并比对；本段还混入了 @opentelemetry/api-logs 的 ProxyLogger 等第三方代码
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/diagnosticTracking.ts
 * pieces: chunk-aepeg2w5.js (1), chunk-e6aww6q8.js (8)
 * attribution: fingerprint 2, placement 5, layout 2
 */
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
import { Ll } from "../../vendor/@opentelemetry/api-logs/build/esm/api/logs.js";

//@ chunk-e6aww6q8.js:585149-585220 placement
function getMcpClientModule() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-e6aww6q8.js:585220-585243 placement
/**
 * IDE 诊断文件路径不匹配时抛出的错误类型。
 */
class DiagnosticsPathMismatchError extends ClaudeError {}
//@ chunk-e6aww6q8.js:585243-585529 layout
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
//@ chunk-e6aww6q8.js:585529-585941 layout
function classifyDiagnosticUri(e) {
  let lower = e.toLowerCase();
  let r = lower.startsWith("file://")
    ? "file-uri"
    : lower.startsWith("_claude_fs_right:")
      ? "fs-right"
      : lower.startsWith("_claude_fs_left:")
        ? "fs-left"
        : "bare";
  let included = e.includes("\\");
  let included_2 = e.includes("/");
  let y = included && included_2 ? "mixed" : included ? "back" : included_2 ? "fwd" : "none";
  let S = /%[0-9A-Fa-f]{2}/.test(e) ? "pct" : "plain";
  let w = DRIVE_LETTER_IN_URI_RE.exec(e)?.[1];
  let L = w === undefined ? "none" : w === w.toUpperCase() ? "upper" : "lower";
  return `scheme=${r} sep=${y} enc=${S} drive=${L}`;
}
//@ chunk-e6aww6q8.js:585941-589557 fingerprint = DiagnosticTrackingService (0.559)
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
  normalizeFileUri(e) {
    let found = URI_PREFIXES.find((h) => e.startsWith(h));
    let r = found ? e.slice(found.length) : e;
    let s = found !== undefined && WINDOWS_DRIVE_PATH_RE.test(r) ? r.slice(1) : r;
    return normalizePathForCompare(s);
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
      let h = classifyDiagnosticsError(error, BASELINE_TIMEOUT_MESSAGE);
      if (h === "timeout" && this.consecutiveBaselineTimeouts === consecutiveBaselineTimeouts) {
        this.consecutiveBaselineTimeouts++;
        if (this.consecutiveBaselineTimeouts === MAX_BASELINE_TIMEOUTS)
          logForDebugging(
            `IDE diagnostics baselines disabled after ${MAX_BASELINE_TIMEOUTS} consecutive timeouts`,
          );
      }
      logFeatureSad("ide_diagnostics_baseline", h, {
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
    let n = [];
    try {
      let y = getMcpClientModule().callIdeRpc("getDiagnostics", {}, this.mcpClient);
      this.workspaceFetchInFlight = y;
      y.finally(() => {
        if (this.workspaceFetchInFlight === y) this.workspaceFetchInFlight = undefined;
      }).catch(() => {});
      let S = await withTimeout_2(y, IDE_DIAGNOSTICS_TIMEOUT_MS, FETCH_TIMEOUT_MESSAGE);
      n = this.parseDiagnosticResult(S);
    } catch (error) {
      logFeatureSad("ide_diagnostics_fetch", classifyDiagnosticsError(error, FETCH_TIMEOUT_MESSAGE), {
        duration_ms: Date.now() - now,
      });
      return [];
    }
    let r = [];
    let s = new Map();
    for (let y of n) {
      let S = y.uri.startsWith("file://");
      if (!S && !y.uri.startsWith("_claude_fs_right:")) continue;
      let w = this.normalizeFileUri(y.uri);
      if (!this.baseline.has(w)) continue;
      if (S)
        r.push({
          file: y,
          normalizedPath: w,
        });
      else s.set(w, y);
    }
    let newDiagnosticFiles = [];
    for (let { file, normalizedPath } of r) {
      let w = this.baseline.get(normalizedPath) || [];
      let claudeFsRightFile = s.get(normalizedPath);
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
      let q = new Set(w.map(formatLocation));
      let filtered = fileToUse.diagnostics.filter((Se) => !q.has(formatLocation(Se)));
      if (filtered.length > 0)
        newDiagnosticFiles.push({
          uri: file.uri,
          diagnostics: filtered,
        });
      this.baseline.set(normalizedPath, fileToUse.diagnostics);
    }
    return newDiagnosticFiles;
  }
  areDiagnosticArraysEqual(e, n) {
    if (e.length !== n.length) return false;
    let r = new Set(e.map(formatLocation));
    let s = new Set(n.map(formatLocation));
    return r.size === s.size && isSubsetOf(r, s);
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
//@ chunk-e6aww6q8.js:589557-589585 placement
/**
 * 按会话根保存的 IDE 诊断跟踪服务。
 */
var diagnosticTrackingSlot = new SessionRootSlot(() => new DiagnosticTrackingService());
//@ chunk-e6aww6q8.js:589585-589731 placement = formatLocation (0.772)
/**
 * 把诊断（message/severity/source/code/range）拼成去重键（误配名 formatLocation，属 LSP 诊断）。
 */
function formatLocation(e) {
  let range = e.range;
  return jsonStringifyRaw([
    e.message,
    e.severity,
    e.source,
    e.code,
    range?.start?.line,
    range?.start?.character,
    range?.end?.line,
    range?.end?.character,
  ]);
}
//@ chunk-e6aww6q8.js:589731-589831 placement
function classifyDiagnosticsError(error, n) {
  if (hasExactErrorMessage(error, n)) return "timeout";
  return error instanceof SyntaxError ? "parse_failed" : "error";
}
//@ chunk-aepeg2w5.js:650328-650353 fingerprint = diagnosticTracker (1)
var diagnosticTracker = Ll.getInstance();
export { diagnosticTrackingSlot, diagnosticTracker };
