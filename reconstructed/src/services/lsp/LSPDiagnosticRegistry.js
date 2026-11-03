/**
 * services/lsp/LSPDiagnosticRegistry.ts
 *
 * LSP 诊断登记表：按会话根暂存服务器推来的诊断，跨轮去重、按严重级别排序截断后交给附件系统注入对话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/lsp/LSPDiagnosticRegistry.ts
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: affinity 1, fingerprint 3, layout 1, placement 6
 */
import { randomUUID } from "crypto";
import { jsonStringify } from "../../utils/slowOperations.js";
import { LRUCache } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { logForDebugging } from "../../utils/debug.js";
import { toError } from "../../utils/errors.js";
import { logPluginScopedError } from "../../utils/plugins/pluginScopedWrite.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-e6aww6q8.js:589869-589895 affinity
/**
 * 诊断投递上限：每文件 10 条、每轮合计 30 条；已投递记录 LRU 最多 500 个文件。
 */
var MAX_DIAGNOSTICS_PER_FILE = 10;
var MAX_TOTAL_DIAGNOSTICS = 30;
var MAX_DELIVERED_FILES = 500;
//@ chunk-e6aww6q8.js:589895-590023 fingerprint = severityToNumber (1)
/**
 * 诊断严重级别名 Error/Warning/Info/Hint → 1..4，用于排序（未知按 4）。
 */
function severityToNumber(severity) {
  switch (severity) {
    case "Error":
      return 1;
    case "Warning":
      return 2;
    case "Info":
      return 3;
    case "Hint":
      return 4;
    default:
      return 4;
  }
}
//@ chunk-e6aww6q8.js:590023-590143 fingerprint = createDiagnosticKey (1)
/**
 * 用 message/severity/range/source/code 拼 JSON 作为诊断去重键。
 */
function createDiagnosticKey(diag) {
  return jsonStringify({
    message: diag.message,
    severity: diag.severity,
    range: diag.range,
    source: diag.source || null,
    code: diag.code || null,
  });
}
//@ chunk-e6aww6q8.js:590143-593739 fingerprint = checkForLSPDiagnostics (0.598)
/**
 * LSP 诊断登记表（每个会话根一份）。register() 暂存服务器推来的诊断；takePending() 合并未投递条目、按 URI 去重并剔除已投递过的诊断、按严重级别排序后截断（每文件 10、总 30），记录为已投递并返回 [{serverName, files}]；另有 clearPending/resetAll/clearDeliveredForFile/clearPendingForFile/pendingCount。
 */
class LSPDiagnosticRegistry {
  pending = new Map();
  delivered = new LRUCache({
    max: MAX_DELIVERED_FILES,
  });
  register({ serverName, files }) {
    let registrationId = randomUUID();
    logForDebugging(
      `LSP Diagnostics: Registering ${files.length} diagnostic file(s) from ${serverName} (ID: ${registrationId})`,
    );
    this.pending.set(registrationId, {
      serverName,
      files,
      timestamp: Date.now(),
      attachmentSent: false,
    });
  }
  deduplicateDiagnosticFiles(allFiles) {
    let byUri = new Map();
    for (let fileDiagnostics of allFiles) {
      let entry = byUri.get(fileDiagnostics.uri);
      if (!entry) {
        entry = {
          file: {
            uri: fileDiagnostics.uri,
            diagnostics: [],
          },
          seen: new Set(),
          previouslyDelivered: this.delivered.get(fileDiagnostics.uri) ?? new Set(),
        };
        byUri.set(fileDiagnostics.uri, entry);
      }
      let { seen: seenDiagnostics, file, previouslyDelivered } = entry;
      for (let diag of fileDiagnostics.diagnostics)
        try {
          let diagnosticKey = createDiagnosticKey(diag);
          if (seenDiagnostics.has(diagnosticKey) || previouslyDelivered.has(diagnosticKey)) continue;
          seenDiagnostics.add(diagnosticKey);
          file.diagnostics.push(diag);
        } catch (error) {
          let err = toError(error);
          let truncatedMessage = diag.message?.substring(0, 100) || "<no message>";
          logPluginScopedError(
            Error(
              `Failed to deduplicate diagnostic in ${fileDiagnostics.uri}: ${err.message}. Diagnostic message: ${truncatedMessage}`,
            ),
            "Failed to deduplicate diagnostic",
          );
          file.diagnostics.push(diag);
        }
    }
    let r = [];
    for (let { file } of byUri.values()) if (file.diagnostics.length > 0) r.push(file);
    return r;
  }
  takePending() {
    logForDebugging(`LSP Diagnostics: Checking registry - ${this.pending.size} pending`);
    let allFiles = [];
    let serverNames = new Set();
    let takenEntries = [];
    for (let pendingEntry of this.pending.values())
      if (!pendingEntry.attachmentSent) {
        allFiles.push(...pendingEntry.files);
        serverNames.add(pendingEntry.serverName);
        takenEntries.push(pendingEntry);
      }
    if (allFiles.length === 0) return [];
    let dedupedFiles;
    let dedupFailed = false;
    try {
      dedupedFiles = this.deduplicateDiagnosticFiles(allFiles);
    } catch (error) {
      let err = toError(error);
      logPluginScopedError(
        Error(`Failed to deduplicate LSP diagnostics: ${err.message}`),
        "Failed to deduplicate LSP diagnostics",
      );
      dedupFailed = true;
      dedupedFiles = allFiles;
    }
    for (let diagnostic of takenEntries) diagnostic.attachmentSent = true;
    for (let [id, diagnostic] of this.pending) if (diagnostic.attachmentSent) this.pending.delete(id);
    let originalCount = allFiles.reduce((sum, file) => sum + file.diagnostics.length, 0);
    let dedupedCount = dedupedFiles.reduce((sum, dedupedFile) => sum + dedupedFile.diagnostics.length, 0);
    if (originalCount > dedupedCount)
      logForDebugging(
        `LSP Diagnostics: Deduplication removed ${originalCount - dedupedCount} duplicate diagnostic(s)`,
      );
    let totalDelivered = 0;
    let truncatedCount = 0;
    for (let file of dedupedFiles) {
      file.diagnostics.sort((Se, ke) => severityToNumber(Se.severity) - severityToNumber(ke.severity));
      if (file.diagnostics.length > MAX_DIAGNOSTICS_PER_FILE) {
        truncatedCount += file.diagnostics.length - MAX_DIAGNOSTICS_PER_FILE;
        file.diagnostics = file.diagnostics.slice(0, MAX_DIAGNOSTICS_PER_FILE);
      }
      let remainingCapacity = MAX_TOTAL_DIAGNOSTICS - totalDelivered;
      if (file.diagnostics.length > remainingCapacity) {
        truncatedCount += file.diagnostics.length - remainingCapacity;
        file.diagnostics = file.diagnostics.slice(0, remainingCapacity);
      }
      totalDelivered += file.diagnostics.length;
    }
    dedupedFiles = dedupedFiles.filter((dedupedFile) => dedupedFile.diagnostics.length > 0);
    if (truncatedCount > 0)
      logForDebugging(
        `LSP Diagnostics: Volume limiting removed ${truncatedCount} diagnostic(s) (max ${MAX_DIAGNOSTICS_PER_FILE}/file, ${MAX_TOTAL_DIAGNOSTICS} total)`,
      );
    for (let file of dedupedFiles) {
      if (!this.delivered.has(file.uri)) this.delivered.set(file.uri, new Set());
      let delivered = this.delivered.get(file.uri);
      for (let diag of file.diagnostics)
        try {
          delivered.add(createDiagnosticKey(diag));
        } catch (error) {
          let err = toError(error);
          let truncatedMessage = diag.message?.substring(0, 100) || "<no message>";
          logPluginScopedError(
            Error(
              `Failed to track delivered diagnostic in ${file.uri}: ${err.message}. Diagnostic message: ${truncatedMessage}`,
            ),
            "Failed to track delivered diagnostic",
          );
        }
    }
    let finalCount = dedupedFiles.reduce((sum, dedupedFile) => sum + dedupedFile.diagnostics.length, 0);
    if (finalCount === 0) {
      logForDebugging("LSP Diagnostics: No new diagnostics to deliver (all filtered by deduplication)");
      return [];
    }
    logForDebugging(
      `LSP Diagnostics: Delivering ${dedupedFiles.length} file(s) with ${finalCount} diagnostic(s) from ${serverNames.size} server(s)`,
    );
    if (dedupFailed) logFeatureSad("lsp_diagnostics_deliver", "lsp_diagnostics_dedup_failed");
    else logFeatureOk("lsp_diagnostics_deliver");
    return [
      {
        serverName: Array.from(serverNames).join(", "),
        files: dedupedFiles,
      },
    ];
  }
  clearPending() {
    logForDebugging(`LSP Diagnostics: Clearing ${this.pending.size} pending diagnostic(s)`);
    this.pending.clear();
  }
  resetAll() {
    logForDebugging(
      `LSP Diagnostics: Resetting all state (${this.pending.size} pending, ${this.delivered.size} files tracked)`,
    );
    this.pending.clear();
    this.delivered.clear();
  }
  clearDeliveredForFile(fileUri) {
    if (this.delivered.has(fileUri)) {
      logForDebugging(`LSP Diagnostics: Clearing delivered diagnostics for ${fileUri}`);
      this.delivered.delete(fileUri);
    }
  }
  clearPendingForFile(fileUri) {
    let purgedCount = 0;
    for (let [r, pendingEntry] of this.pending) {
      let filtered = pendingEntry.files.filter((file) => file.uri !== fileUri);
      if (filtered.length === pendingEntry.files.length) continue;
      if (filtered.length === 0) this.pending.delete(r);
      else pendingEntry.files = filtered;
      purgedCount++;
    }
    if (purgedCount > 0)
      logForDebugging(`LSP Diagnostics: Purged ${purgedCount} pending entry(ies) referencing ${fileUri}`);
  }
  pendingCount() {
    return this.pending.size;
  }
}
//@ chunk-e6aww6q8.js:593739-593766 layout
/**
 * 按 context.root 懒建 LSPDiagnosticRegistry 的 WeakMap 容器（tt.of(ctx)）；316 把旧版的模块级单例改成每会话根一份。
 */
var lspDiagnosticRegistryByRoot = new SessionRootSlot(() => new LSPDiagnosticRegistry());
//@ chunk-e6aww6q8.js:593766-593805 placement
/**
 * 把 LSP 推来的诊断登记到当前会话的诊断登记表，等待下一轮作为附件投递。
 */
function registerPendingLSPDiagnostic(context, n) {
  lspDiagnosticRegistryByRoot.of(context).register(n);
}
//@ chunk-e6aww6q8.js:593805-593851 placement
/**
 * 取出当前会话待投递的 LSP 诊断（去重、截断后）；附件系统在每轮构造 lsp 诊断附件时调用。
 */
function checkForLSPDiagnostics(e) {
  return lspDiagnosticRegistryByRoot.of(e).takePending();
}
//@ chunk-e6aww6q8.js:593851-593891 placement
/**
 * 清空当前会话待投递的 LSP 诊断。
 */
function clearAllLSPDiagnostics(e) {
  lspDiagnosticRegistryByRoot.of(e).clearPending();
}
//@ chunk-e6aww6q8.js:593891-593927 placement
/**
 * 重置当前会话的诊断登记表（待投递与已投递记录）。
 */
function resetAllLSPDiagnosticState(e) {
  lspDiagnosticRegistryByRoot.of(e).resetAll();
}
//@ chunk-e6aww6q8.js:593927-593979 placement
/**
 * 清除某文件的已投递诊断记录（文件被编辑后允许重新投递）。
 */
function clearDeliveredDiagnosticsForFile(session, absolutePath) {
  lspDiagnosticRegistryByRoot.of(session).clearDeliveredForFile(absolutePath);
}
//@ chunk-e6aww6q8.js:593979-594029 placement
/**
 * 删除待投递诊断中引用某文件的条目。
 */
function clearPendingDiagnosticsForFile(session, absolutePath) {
  lspDiagnosticRegistryByRoot.of(session).clearPendingForFile(absolutePath);
}
export {
  resetAllLSPDiagnosticState,
  clearDeliveredDiagnosticsForFile,
  clearPendingDiagnosticsForFile,
  checkForLSPDiagnostics,
  clearAllLSPDiagnostics,
  registerPendingLSPDiagnostic,
};
