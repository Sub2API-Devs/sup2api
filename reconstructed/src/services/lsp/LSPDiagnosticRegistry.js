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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { jsonStringify } from "../../utils/slowOperations.js";
import { Dc } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { logForDebugging } from "../../utils/debug.js";
import { toError } from "../../utils/errors.js";
import { Wee } from "../../utils/plugins/pluginScopedWrite.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

/**
 * 诊断投递上限：每文件 10 条、每轮合计 30 条；已投递记录 LRU 最多 500 个文件。
 */
//@ chunk-e6aww6q8.js:589869-589895 affinity
var MAX_DIAGNOSTICS_PER_FILE = 10,
  MAX_TOTAL_DIAGNOSTICS = 30,
  MAX_DELIVERED_FILES = 500;
/**
 * 诊断严重级别名 Error/Warning/Info/Hint → 1..4，用于排序（未知按 4）。
 */
//@ chunk-e6aww6q8.js:589895-590023 fingerprint = severityToNumber (1)
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
/**
 * 用 message/severity/range/source/code 拼 JSON 作为诊断去重键。
 */
//@ chunk-e6aww6q8.js:590023-590143 fingerprint = createDiagnosticKey (1)
function createDiagnosticKey(diag) {
  return jsonStringify({
    message: diag.message,
    severity: diag.severity,
    range: diag.range,
    source: diag.source || null,
    code: diag.code || null,
  });
}
/**
 * LSP 诊断登记表（每个会话根一份）。register() 暂存服务器推来的诊断；takePending() 合并未投递条目、按 URI 去重并剔除已投递过的诊断、按严重级别排序后截断（每文件 10、总 30），记录为已投递并返回 [{serverName, files}]；另有 clearPending/resetAll/clearDeliveredForFile/clearPendingForFile/pendingCount。
 */
//@ chunk-e6aww6q8.js:590143-593739 fingerprint = checkForLSPDiagnostics (0.598)
class LSPDiagnosticRegistry {
  pending = new Map();
  delivered = new Dc({ max: MAX_DELIVERED_FILES });
  register({ serverName: serverName, files: files }) {
    let registrationId = randomUUID_7();
    (logForDebugging(
      `LSP Diagnostics: Registering ${files.length} diagnostic file(s) from ${serverName} (ID: ${registrationId})`,
    ),
      this.pending.set(registrationId, {
        serverName: serverName,
        files: files,
        timestamp: Date.now(),
        attachmentSent: !1,
      }));
  }
  deduplicateDiagnosticFiles(e) {
    let byUri = new Map();
    for (let fileDiagnostics of e) {
      let entry = byUri.get(fileDiagnostics.uri);
      if (!entry)
        ((entry = {
          file: { uri: fileDiagnostics.uri, diagnostics: [] },
          seen: new Set(),
          previouslyDelivered: this.delivered.get(fileDiagnostics.uri) ?? new Set(),
        }),
          byUri.set(fileDiagnostics.uri, entry));
      let { seen: seen, file: file, previouslyDelivered: previouslyDelivered } = entry;
      for (let diagnostic of fileDiagnostics.diagnostics)
        try {
          let diagnosticKey = createDiagnosticKey(diagnostic);
          if (seen.has(diagnosticKey) || previouslyDelivered.has(diagnosticKey)) continue;
          (seen.add(diagnosticKey), file.diagnostics.push(diagnostic));
        } catch (error) {
          let q = toError(error),
            Z = diagnostic.message?.substring(0, 100) || "<no message>";
          (Wee(
            Error(
              `Failed to deduplicate diagnostic in ${fileDiagnostics.uri}: ${q.message}. Diagnostic message: ${Z}`,
            ),
            "Failed to deduplicate diagnostic",
          ),
            file.diagnostics.push(diagnostic));
        }
    }
    let r = [];
    for (let { file: file } of byUri.values()) if (file.diagnostics.length > 0) r.push(file);
    return r;
  }
  takePending() {
    logForDebugging(`LSP Diagnostics: Checking registry - ${this.pending.size} pending`);
    let allFiles = [],
      serverNames = new Set(),
      takenEntries = [];
    for (let pendingEntry of this.pending.values())
      if (!pendingEntry.attachmentSent)
        (allFiles.push(...pendingEntry.files),
          serverNames.add(pendingEntry.serverName),
          takenEntries.push(pendingEntry));
    if (allFiles.length === 0) return [];
    let dedupedFiles,
      dedupFailed = !1;
    try {
      dedupedFiles = this.deduplicateDiagnosticFiles(allFiles);
    } catch (error) {
      let Z = toError(error);
      (Wee(
        Error(`Failed to deduplicate LSP diagnostics: ${Z.message}`),
        "Failed to deduplicate LSP diagnostics",
      ),
        (dedupFailed = !0),
        (dedupedFiles = allFiles));
    }
    for (let q of takenEntries) q.attachmentSent = !0;
    for (let [q, Z] of this.pending) if (Z.attachmentSent) this.pending.delete(q);
    let reduced = allFiles.reduce((q, Z) => q + Z.diagnostics.length, 0),
      reduced_2 = dedupedFiles.reduce((q, Z) => q + Z.diagnostics.length, 0);
    if (reduced > reduced_2)
      logForDebugging(
        `LSP Diagnostics: Deduplication removed ${reduced - reduced_2} duplicate diagnostic(s)`,
      );
    let totalDelivered = 0,
      truncatedCount = 0;
    for (let file of dedupedFiles) {
      if (
        (file.diagnostics.sort((Se, ke) => severityToNumber(Se.severity) - severityToNumber(ke.severity)),
        file.diagnostics.length > MAX_DIAGNOSTICS_PER_FILE)
      )
        ((truncatedCount += file.diagnostics.length - MAX_DIAGNOSTICS_PER_FILE),
          (file.diagnostics = file.diagnostics.slice(0, MAX_DIAGNOSTICS_PER_FILE)));
      let remainingCapacity = MAX_TOTAL_DIAGNOSTICS - totalDelivered;
      if (file.diagnostics.length > remainingCapacity)
        ((truncatedCount += file.diagnostics.length - remainingCapacity),
          (file.diagnostics = file.diagnostics.slice(0, remainingCapacity)));
      totalDelivered += file.diagnostics.length;
    }
    if (((dedupedFiles = dedupedFiles.filter((q) => q.diagnostics.length > 0)), truncatedCount > 0))
      logForDebugging(
        `LSP Diagnostics: Volume limiting removed ${truncatedCount} diagnostic(s) (max ${MAX_DIAGNOSTICS_PER_FILE}/file, ${MAX_TOTAL_DIAGNOSTICS} total)`,
      );
    for (let file of dedupedFiles) {
      if (!this.delivered.has(file.uri)) this.delivered.set(file.uri, new Set());
      let Z = this.delivered.get(file.uri);
      for (let diagnostic of file.diagnostics)
        try {
          Z.add(createDiagnosticKey(diagnostic));
        } catch (error) {
          let we = toError(error),
            Ee = diagnostic.message?.substring(0, 100) || "<no message>";
          Wee(
            Error(
              `Failed to track delivered diagnostic in ${file.uri}: ${we.message}. Diagnostic message: ${Ee}`,
            ),
            "Failed to track delivered diagnostic",
          );
        }
    }
    let reduced_3 = dedupedFiles.reduce((q, Z) => q + Z.diagnostics.length, 0);
    if (reduced_3 === 0)
      return (
        logForDebugging("LSP Diagnostics: No new diagnostics to deliver (all filtered by deduplication)"),
        []
      );
    if (
      (logForDebugging(
        `LSP Diagnostics: Delivering ${dedupedFiles.length} file(s) with ${reduced_3} diagnostic(s) from ${serverNames.size} server(s)`,
      ),
      dedupFailed)
    )
      logFeatureSad("lsp_diagnostics_deliver", "lsp_diagnostics_dedup_failed");
    else logFeatureOk("lsp_diagnostics_deliver");
    return [{ serverName: Array.from(serverNames).join(", "), files: dedupedFiles }];
  }
  clearPending() {
    (logForDebugging(`LSP Diagnostics: Clearing ${this.pending.size} pending diagnostic(s)`),
      this.pending.clear());
  }
  resetAll() {
    (logForDebugging(
      `LSP Diagnostics: Resetting all state (${this.pending.size} pending, ${this.delivered.size} files tracked)`,
    ),
      this.pending.clear(),
      this.delivered.clear());
  }
  clearDeliveredForFile(fileUri) {
    if (this.delivered.has(fileUri))
      (logForDebugging(`LSP Diagnostics: Clearing delivered diagnostics for ${fileUri}`),
        this.delivered.delete(fileUri));
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
/**
 * 按 context.root 懒建 LSPDiagnosticRegistry 的 WeakMap 容器（tt.of(ctx)）；316 把旧版的模块级单例改成每会话根一份。
 */
//@ chunk-e6aww6q8.js:593739-593766 layout
var lspDiagnosticRegistryByRoot = new SessionRootSlot(() => new LSPDiagnosticRegistry());
/**
 * 把 LSP 推来的诊断登记到当前会话的诊断登记表，等待下一轮作为附件投递。
 */
//@ chunk-e6aww6q8.js:593766-593805 placement
function registerPendingLSPDiagnostic(e, n) {
  lspDiagnosticRegistryByRoot.of(e).register(n);
}
/**
 * 取出当前会话待投递的 LSP 诊断（去重、截断后）；附件系统在每轮构造 lsp 诊断附件时调用。
 */
//@ chunk-e6aww6q8.js:593805-593851 placement
function checkForLSPDiagnostics(e) {
  return lspDiagnosticRegistryByRoot.of(e).takePending();
}
/**
 * 清空当前会话待投递的 LSP 诊断。
 */
//@ chunk-e6aww6q8.js:593851-593891 placement
function clearAllLSPDiagnostics(e) {
  lspDiagnosticRegistryByRoot.of(e).clearPending();
}
/**
 * 重置当前会话的诊断登记表（待投递与已投递记录）。
 */
//@ chunk-e6aww6q8.js:593891-593927 placement
function resetAllLSPDiagnosticState(e) {
  lspDiagnosticRegistryByRoot.of(e).resetAll();
}
/**
 * 清除某文件的已投递诊断记录（文件被编辑后允许重新投递）。
 */
//@ chunk-e6aww6q8.js:593927-593979 placement
function clearDeliveredDiagnosticsForFile(e, n) {
  lspDiagnosticRegistryByRoot.of(e).clearDeliveredForFile(n);
}
/**
 * 删除待投递诊断中引用某文件的条目。
 */
//@ chunk-e6aww6q8.js:593979-594029 placement
function clearPendingDiagnosticsForFile(e, n) {
  lspDiagnosticRegistryByRoot.of(e).clearPendingForFile(n);
}

export {
  resetAllLSPDiagnosticState,
  clearDeliveredDiagnosticsForFile,
  clearPendingDiagnosticsForFile,
  checkForLSPDiagnostics,
  clearAllLSPDiagnostics,
  registerPendingLSPDiagnostic,
};
