/**
 * utils/pasteStore.ts
 *
 * 长粘贴文本存储 <配置目录>/paste-cache/<16位hash>.txt，存取与过期清理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/pasteStore.ts
 * pieces: chunk-eg496hkq.js (1), chunk-s61vbvea.js (16)
 * attribution: fingerprint 4, layout 9, file-local 1, callgraph-fingerprint 1, sole-consumer 2
 */
import { join } from "path";
import { createHash } from "crypto";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, isDiskless } from "../bootstrap/state.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { isDisklessWithoutState } from "../services/orgMemory/memoryStores.js";
import { warnDisklessSettingsWrite } from "./settings/settingsStorage.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getFileReader } from "./fileStore.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { isENOENT } from "./errors.js";
import { readAllPages } from "./pagedRead.js";

//@ chunk-s61vbvea.js:29553-29581 fingerprint = PASTE_STORE_DIR (1)
var PASTE_STORE_DIR = "paste-cache";
var MAX_RETAINED_FAILED_CHARS = 1e7;
//@ chunk-s61vbvea.js:29581-30463 layout
class PasteStoreState {
  inFlight = new Map();
  retainedFailed = new Map();
  retainedFailedChars = 0;
  retainedCap = MAX_RETAINED_FAILED_CHARS;
  markInFlight(e, n) {
    this.inFlight.set(e, n);
  }
  settle(e) {
    this.inFlight.delete(e);
    let n = this.retainedFailed.get(e);
    if (n !== undefined) {
      this.retainedFailedChars -= n.length;
      this.retainedFailed.delete(e);
    }
  }
  retainFailed(e, n) {
    this.inFlight.delete(e);
    let r = this.retainedFailed.get(e);
    if (r !== undefined) {
      this.retainedFailedChars -= r.length;
      this.retainedFailed.delete(e);
    }
    if (n.length > this.retainedCap) return;
    this.retainedFailed.set(e, n);
    this.retainedFailedChars += n.length;
    while (this.retainedFailedChars > this.retainedCap) {
      let s = this.retainedFailed.keys().next().value;
      this.retainedFailedChars -= this.retainedFailed.get(s).length;
      this.retainedFailed.delete(s);
    }
  }
  get(e) {
    return this.inFlight.get(e) ?? this.retainedFailed.get(e);
  }
  clear() {
    this.inFlight.clear();
    this.retainedFailed.clear();
    this.retainedFailedChars = 0;
    this.retainedCap = MAX_RETAINED_FAILED_CHARS;
  }
}
//@ chunk-s61vbvea.js:30463-30488 layout
var pasteStoreStateByHost = new HostScoped(() => new PasteStoreState());
//@ chunk-s61vbvea.js:30488-30525 layout
function getPasteStoreState() {
  return pasteStoreStateByHost.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:30525-30558 layout
/**
 * 粘贴缓存目录 <配置目录>/paste-cache，内容按 16 位 hex hash 存为 <hash>.txt。
 */
function getPasteStoreDir() {
  return join(getClaudeConfigDir(), PASTE_STORE_DIR);
}
//@ chunk-s61vbvea.js:30558-30629 file-local
/**
 * 粘贴文本的 sha256 截取 16 位 hex。
 */
function hashPastedText(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}
//@ chunk-s61vbvea.js:30629-30653 layout
var PASTE_HASH_PATTERN = /^[0-9a-f]{16}$/;
//@ chunk-s61vbvea.js:30653-30725 layout
function assertValidPasteHash(e) {
  if (!PASTE_HASH_PATTERN.test(e)) throw Error("invalid paste-content hash");
}
//@ chunk-s61vbvea.js:30725-30773 layout = getPastePath (1)
function getPastePath_2(hash) {
  assertValidPasteHash(hash);
  return join(getPasteStoreDir(), `${hash}.txt`);
}
//@ chunk-s61vbvea.js:30773-30813 layout
function getPasteStorageKey(e) {
  assertValidPasteHash(e);
  return STORAGE_SPACES.paste(e);
}
//@ chunk-s61vbvea.js:30813-30882 layout
function storePastedTextQueued(e, n, r) {
  let pasteStoreState = getPasteStoreState();
  pasteStoreState.markInFlight(e, n);
  return storePastedText(e, n, r, pasteStoreState);
}
//@ chunk-s61vbvea.js:30882-31496 callgraph-fingerprint = storePastedText (0.283)
/**
 * 把长粘贴文本写入 paste-cache/<hash>.txt（diskless 时跳过）。
 */
async function storePastedText(hash, n, r, pasteStoreState) {
  try {
    if (isDisklessWithoutState(r)) {
      assertValidPasteHash(hash);
      pasteStoreState.retainFailed(hash, n);
      warnDisklessSettingsWrite("paste", join(PASTE_STORE_DIR, `${hash}.txt`));
      logFeatureSad("paste_store", "diskless_skipped");
      return;
    }
    let h = !isDiskless();
    let dir = getFileReader();
    if (h) await dir.mkdir(getPasteStoreDir());
    if (isStorageV5Enabled() && r) {
      let w = await r.write(getPasteStorageKey(hash), n, {
        publishDiscipline: "inPlace",
        mode: 384,
      });
      if (!w.ok) {
        logForDebugging(`Paste write refused: ${formatStorageError(w.error)}`);
        throw Error("paste write refused by the storage backend");
      }
    } else await dir.write(getPastePath_2(hash), n, 384);
    pasteStoreState.settle(hash);
    let S = h ? `to ${getPastePath_2(hash)}` : "in the storage backend";
    logForDebugging(`Stored paste ${hash} ${S}`);
    logFeatureOk("paste_store");
  } catch (error) {
    pasteStoreState.retainFailed(hash, n);
    logForDebugging(`Failed to store paste: ${error}`);
    logFeatureSad("paste_store", "paste_store_write_failed");
  }
}
//@ chunk-s61vbvea.js:31496-31861 fingerprint = retrievePastedText (0.703)
/**
 * 按 hash 读取 paste-cache 中的粘贴文本。
 */
async function retrievePastedText(hash, n) {
  let r = getPasteStoreState().get(hash);
  if (r !== undefined) return r;
  try {
    if (n) {
      let h = await n.read([getPasteStorageKey(hash)]);
      if (!h.ok) {
        logForDebugging(`Failed to retrieve paste ${hash}: ${formatStorageError(h.error)}`);
        return null;
      }
      let y = h.value.items[0];
      return y.found ? Buffer.from(y.value).toString("utf8") : null;
    }
    let pastePath = getPastePath_2(hash);
    return await getFileReader().read(pastePath);
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`Failed to retrieve paste ${hash}: ${error}`);
    return null;
  }
}
//@ chunk-s61vbvea.js:31861-32179 fingerprint = cleanupOldPastes (0.748)
/**
 * 删除超过保留期的旧粘贴文件。
 */
async function cleanupOldPastes(cutoffDate, n) {
  if (n !== undefined) return cleanupOldPastesViaStorage(n, cutoffDate.getTime());
  let pasteDir = getFileReader();
  let pasteStoreDir = getPasteStoreDir();
  let files;
  try {
    files = await pasteDir.list(pasteStoreDir);
  } catch {
    return;
  }
  let cutoffTime = cutoffDate.getTime();
  for (let file of files) {
    if (!file.endsWith(".txt") && !file.includes(".txt.tmp.")) continue;
    let filePath = join(pasteStoreDir, file);
    try {
      if ((await pasteDir.stat(filePath)).mtimeMs < cutoffTime) {
        await pasteDir.delete(filePath);
        logForDebugging(`Cleaned up old paste: ${filePath}`);
      }
    } catch {}
  }
}
//@ chunk-s61vbvea.js:32179-32520 sole-consumer
async function cleanupOldPastesViaStorage(e, time) {
  let r = [];
  if (
    (
      await readAllPages(
        (h) =>
          e.listEntries(
            {
              namespace: "paste",
            },
            h !== undefined
              ? {
                  cursor: h,
                }
              : undefined,
          ),
        (h) => {
          for (let y of h)
            if (
              y.kind === "key" &&
              y.key.namespace === "paste" &&
              y.mtimeMs !== undefined &&
              y.mtimeMs < time
            )
              r.push(y.key);
        },
      )
    ).status !== "error"
  ) {
    for (let h of r) if ((await e.delete(h)).ok) logForDebugging(`Cleaned up old paste: ${h.id}`);
  }
  await cleanupPasteStagingFiles(getPasteStoreDir(), time);
}
//@ chunk-s61vbvea.js:32520-32765 sole-consumer
async function cleanupPasteStagingFiles(pasteStoreDir, n) {
  let fileReader = getFileReader();
  let s;
  try {
    s = await fileReader.list(pasteStoreDir);
  } catch {
    return;
  }
  for (let h of s) {
    if (!h.includes(".txt.tmp.")) continue;
    let y = join(pasteStoreDir, h);
    try {
      if ((await fileReader.stat(y)).mtimeMs < n) {
        await fileReader.delete(y);
        logForDebugging(`Cleaned up old paste staging file: ${y}`);
      }
    } catch {}
  }
}
//@ chunk-eg496hkq.js:44035-44104 fingerprint = getPastePath (1)
function getPastePath(hash, n) {
  return `${hash}-${n.replace(/[^a-zA-Z0-9-]/g, "_")}.txt`;
}
export { retrievePastedText, hashPastedText, storePastedTextQueued, cleanupOldPastes, getPastePath };
