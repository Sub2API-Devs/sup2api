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
import { H4t } from "../utils/fsWatchProbe.js";
import { jsonParse, jsonStringifyRaw } from "../utils/slowOperations.js";
import { hasAccessToIDEExtensionDiffFeature as hasAccessToIDEExtensionDiffFeature_3 } from "./compact/idleToolResultClearing.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { Ll } from "../../vendor/@opentelemetry/api-logs/build/esm/api/logs.js";

//@ chunk-e6aww6q8.js:585149-585220 placement
function getMcpClientModule() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-e6aww6q8.js:585220-585243 placement
class iDt extends ClaudeError {}
//@ chunk-e6aww6q8.js:585243-585529 layout
var DIAGNOSTICS_POLL_INTERVAL_MS = 500,
  KBe = 3,
  fgo = 2000,
  tDt = "IDE diagnostics baseline timed out",
  nDt = "IDE diagnostics fetch timed out",
  pgo = "Claude Code JetBrains Plugin",
  mgo = ["file://", "_claude_fs_right:", "_claude_fs_left:"],
  ggo = /^[\\/][A-Za-z]:[\\/]/,
  hgo = /(?:^|[\\/])([A-Za-z])(?::|%3[Aa])(?=[\\/]|%5[Cc]|%2[Ff])/;
//@ chunk-e6aww6q8.js:585529-585941 layout
function classifyDiagnosticUri(e) {
  let lower = e.toLowerCase(),
    r = lower.startsWith("file://")
      ? "file-uri"
      : lower.startsWith("_claude_fs_right:")
        ? "fs-right"
        : lower.startsWith("_claude_fs_left:")
          ? "fs-left"
          : "bare",
    included = e.includes("\\"),
    included_2 = e.includes("/"),
    y = included && included_2 ? "mixed" : included ? "back" : included_2 ? "fwd" : "none",
    S = /%[0-9A-Fa-f]{2}/.test(e) ? "pct" : "plain",
    w = hgo.exec(e)?.[1],
    L = w === void 0 ? "none" : w === w.toUpperCase() ? "upper" : "lower";
  return `scheme=${r} sep=${y} enc=${S} drive=${L}`;
}
//@ chunk-e6aww6q8.js:585941-589557 fingerprint = DiagnosticTrackingService (0.559)
class DiagnosticTrackingService {
  baseline = new Map();
  initialized = !1;
  mcpClient;
  lastProcessedTimestamps = new Map();
  rightFileDiagnosticsState = new Map();
  consecutiveBaselineTimeouts = 0;
  workspaceFetchInFlight;
  initialize(e) {
    if (this.initialized) return;
    ((this.mcpClient = e), (this.initialized = !0));
  }
  async shutdown() {
    ((this.initialized = !1),
      this.baseline.clear(),
      this.rightFileDiagnosticsState.clear(),
      this.lastProcessedTimestamps.clear(),
      (this.consecutiveBaselineTimeouts = 0),
      (this.workspaceFetchInFlight = void 0));
  }
  reset() {
    (this.baseline.clear(),
      this.rightFileDiagnosticsState.clear(),
      this.lastProcessedTimestamps.clear(),
      (this.workspaceFetchInFlight = void 0));
  }
  normalizeFileUri(e) {
    let found = mgo.find((h) => e.startsWith(h)),
      r = found ? e.slice(found.length) : e,
      s = found !== void 0 && ggo.test(r) ? r.slice(1) : r;
    return normalizePathForCompare(s);
  }
  async beforeFileEdited(e) {
    if (
      !this.initialized ||
      !this.mcpClient ||
      this.mcpClient.type !== "connected" ||
      this.mcpClient.serverInfo?.name === pgo ||
      this.consecutiveBaselineTimeouts >= KBe
    )
      return;
    let now = Date.now(),
      consecutiveBaselineTimeouts = this.consecutiveBaselineTimeouts;
    try {
      let s = await withTimeout_2(
          getMcpClientModule().callIdeRpc("getDiagnostics", { uri: `file://${e}` }, this.mcpClient),
          DIAGNOSTICS_POLL_INTERVAL_MS,
          tDt,
        ),
        h = this.parseDiagnosticResult(s)[0];
      if (h && !samePath(this.normalizeFileUri(e), this.normalizeFileUri(h.uri))) {
        (logError(
          withTelemetryMessage(
            new iDt(`Diagnostics file path mismatch: expected ${e}, got ${h.uri}`),
            `Diagnostics file path mismatch: expected ${classifyDiagnosticUri(e)}, got ${classifyDiagnosticUri(h.uri)}`,
          ),
        ),
          logFeatureSad("ide_diagnostics_baseline", "path_mismatch", {
            duration_ms: Date.now() - now,
            consecutive_timeouts: this.consecutiveBaselineTimeouts,
          }));
        return;
      }
      let normalizeFileUri = this.normalizeFileUri(e);
      (this.baseline.set(normalizeFileUri, h ? h.diagnostics : []),
        this.lastProcessedTimestamps.set(normalizeFileUri, now),
        (this.consecutiveBaselineTimeouts = 0),
        logFeatureOk("ide_diagnostics_baseline", { duration_ms: Date.now() - now }));
    } catch (error) {
      let h = classifyDiagnosticsError(error, tDt);
      if (h === "timeout" && this.consecutiveBaselineTimeouts === consecutiveBaselineTimeouts) {
        if ((this.consecutiveBaselineTimeouts++, this.consecutiveBaselineTimeouts === KBe))
          logForDebugging(`IDE diagnostics baselines disabled after ${KBe} consecutive timeouts`);
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
    if (this.workspaceFetchInFlight) return (logFeatureSad("ide_diagnostics_fetch", "in_flight"), []);
    let now = Date.now(),
      n = [];
    try {
      let callIdeRpc = getMcpClientModule().callIdeRpc("getDiagnostics", {}, this.mcpClient);
      ((this.workspaceFetchInFlight = callIdeRpc),
        callIdeRpc
          .finally(() => {
            if (this.workspaceFetchInFlight === callIdeRpc) this.workspaceFetchInFlight = void 0;
          })
          .catch(() => {}));
      let S = await withTimeout_2(callIdeRpc, fgo, nDt);
      n = this.parseDiagnosticResult(S);
    } catch (error) {
      return (
        logFeatureSad("ide_diagnostics_fetch", classifyDiagnosticsError(error, nDt), {
          duration_ms: Date.now() - now,
        }),
        []
      );
    }
    let r = [],
      s = new Map();
    for (let y of n) {
      let startsWith = y.uri.startsWith("file://");
      if (!startsWith && !y.uri.startsWith("_claude_fs_right:")) continue;
      let normalizeFileUri = this.normalizeFileUri(y.uri);
      if (!this.baseline.has(normalizeFileUri)) continue;
      if (startsWith) r.push({ file: y, normalizedPath: normalizeFileUri });
      else s.set(normalizeFileUri, y);
    }
    let h = [];
    for (let { file: file, normalizedPath: normalizedPath } of r) {
      let w = this.baseline.get(normalizedPath) || [],
        L = s.get(normalizedPath),
        G = file;
      if (L) {
        let Se = this.rightFileDiagnosticsState.get(normalizedPath);
        if (!Se || !this.areDiagnosticArraysEqual(Se, L.diagnostics)) G = L;
        this.rightFileDiagnosticsState.set(normalizedPath, L.diagnostics);
      }
      let q = new Set(w.map(formatLocation)),
        filtered = G.diagnostics.filter((diagnostic) => !q.has(formatLocation(diagnostic)));
      if (filtered.length > 0) h.push({ uri: file.uri, diagnostics: filtered });
      this.baseline.set(normalizedPath, G.diagnostics);
    }
    return h;
  }
  areDiagnosticArraysEqual(e, n) {
    if (e.length !== n.length) return !1;
    let r = new Set(e.map(formatLocation)),
      s = new Set(n.map(formatLocation));
    return r.size === s.size && H4t(r, s);
  }
  parseDiagnosticResult(e) {
    if (Array.isArray(e)) {
      let found = e.find((r) => r.type === "text");
      if (found && "text" in found) return jsonParse(found.text);
    }
    return [];
  }
  async handleQueryStart(e) {
    if (!this.initialized) {
      let n = hasAccessToIDEExtensionDiffFeature_3(e);
      if (n) this.initialize(n);
    } else this.reset();
  }
}
//@ chunk-e6aww6q8.js:589557-589585 placement
var Q2e = new SessionRootSlot(() => new DiagnosticTrackingService());
/**
 * 把诊断（message/severity/source/code/range）拼成去重键（误配名 formatLocation，属 LSP 诊断）。
 */
//@ chunk-e6aww6q8.js:589585-589731 placement = formatLocation (0.772)
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
function classifyDiagnosticsError(e, n) {
  if (hasExactErrorMessage(e, n)) return "timeout";
  return e instanceof SyntaxError ? "parse_failed" : "error";
}
//@ chunk-aepeg2w5.js:650328-650353 fingerprint = diagnosticTracker (1)
var diagnosticTracker = Ll.getInstance();

export { Q2e, diagnosticTracker };
