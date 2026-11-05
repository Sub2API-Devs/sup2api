/**
 * utils/pasteStore.ts
 *
 * 长粘贴文本存储 <配置目录>/paste-cache/<16位hash>.txt，存取与过期清理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/pasteStore.ts
 * pieces: chunk-7jxyna5q.js (16)
 * attribution: fingerprint 4, layout 8, file-local 1, callgraph-fingerprint 1, sole-consumer 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { createHash } from "crypto";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, isDiskless } from "../bootstrap/state.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:30152-30180 fingerprint (2.1.88 match: PASTE_STORE_DIR, 1)
var PASTE_STORE_DIR = "paste-cache";
var MAX_RETAINED_FAILED_CHARS = 1e7;
//@ chunk-7jxyna5q.js:30180-31062 layout
class PasteStoreState {
  inFlight = new Map();
  retainedFailed = new Map();
  retainedFailedChars = 0;
  retainedCap = MAX_RETAINED_FAILED_CHARS;
  markInFlight(hash, text) {
    this.inFlight.set(hash, text);
  }
  settle(hash) {
    this.inFlight.delete(hash);
    let retained = this.retainedFailed.get(hash);
    if (retained !== undefined) {
      this.retainedFailedChars -= retained.length;
      this.retainedFailed.delete(hash);
    }
  }
  retainFailed(hash, text) {
    this.inFlight.delete(hash);
    let previous = this.retainedFailed.get(hash);
    if (previous !== undefined) {
      this.retainedFailedChars -= previous.length;
      this.retainedFailed.delete(hash);
    }
    if (text.length > this.retainedCap) return;
    this.retainedFailed.set(hash, text);
    this.retainedFailedChars += text.length;
    while (this.retainedFailedChars > this.retainedCap) {
      let oldestHash = this.retainedFailed.keys().next().value;
      this.retainedFailedChars -= this.retainedFailed.get(oldestHash).length;
      this.retainedFailed.delete(oldestHash);
    }
  }
  get(hash) {
    return this.inFlight.get(hash) ?? this.retainedFailed.get(hash);
  }
  clear() {
    this.inFlight.clear();
    this.retainedFailed.clear();
    this.retainedFailedChars = 0;
    this.retainedCap = MAX_RETAINED_FAILED_CHARS;
  }
}
//@ chunk-7jxyna5q.js:31062-31087 layout
var pasteStoreStateByHost; // deferred: uses PasteStoreState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:31062", () => {
  pasteStoreStateByHost = new HostScoped(() => new PasteStoreState());
});
//@ chunk-7jxyna5q.js:31087-31124 layout
function getPasteStoreState() {
  return pasteStoreStateByHost.of(getRootSession().host);
}
//@ chunk-7jxyna5q.js:31124-31157 layout
/**
 * 粘贴缓存目录 <配置目录>/paste-cache，内容按 16 位 hex hash 存为 <hash>.txt。
 */
function getPasteStoreDir() {
  return join(getClaudeConfigDir(), PASTE_STORE_DIR);
}
//@ chunk-7jxyna5q.js:31157-31228 file-local
/**
 * 粘贴文本的 sha256 截取 16 位 hex。
 */
function hashPastedText(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}
//@ chunk-7jxyna5q.js:31228-31252 layout
var PASTE_HASH_PATTERN = /^[0-9a-f]{16}$/;
//@ chunk-7jxyna5q.js:31252-31324 layout
function assertValidPasteHash(hash) {
  if (!PASTE_HASH_PATTERN.test(hash)) throw Error("invalid paste-content hash");
}
//@ chunk-7jxyna5q.js:31324-31372 fingerprint (2.1.88 match: getPastePath, 1)
function getPastePath(hash) {
  assertValidPasteHash(hash);
  return join(getPasteStoreDir(), `${hash}.txt`);
}
//@ chunk-7jxyna5q.js:31372-31412 layout
function getPasteStorageKey(hash) {
  assertValidPasteHash(hash);
  return STORAGE_SPACES.paste(hash);
}
//@ chunk-7jxyna5q.js:31412-31481 layout
function storePastedTextQueued(hash, text, storageV5) {
  let pasteStoreState = getPasteStoreState();
  pasteStoreState.markInFlight(hash, text);
  return storePastedText(hash, text, storageV5, pasteStoreState);
}
//@ chunk-7jxyna5q.js:31481-32094 callgraph-fingerprint (2.1.88 match: storePastedText, 0.283)
/**
 * 把长粘贴文本写入 paste-cache/<hash>.txt（diskless 时跳过）。
 */
async function storePastedText(hash, text, storageV5, pasteStoreState) {
  try {
    if (isDisklessWithoutState(storageV5)) {
      assertValidPasteHash(hash);
      pasteStoreState.retainFailed(hash, text);
      warnDisklessSettingsWrite("paste", join(PASTE_STORE_DIR, `${hash}.txt`));
      logFeatureSad("paste_store", "diskless_skipped");
      return;
    }
    let useDisk = !isDiskless();
    let dir = getFileReader();
    if (useDisk) await dir.mkdir(getPasteStoreDir());
    if (isStorageV5Enabled() && storageV5) {
      let writeResult = await storageV5.write(getPasteStorageKey(hash), text, {
        publishDiscipline: "inPlace",
        mode: 384,
      });
      if (!writeResult.ok) {
        logForDebugging(`Paste write refused: ${formatStorageError(writeResult.error)}`);
        throw Error("paste write refused by the storage backend");
      }
    } else await dir.write(getPastePath(hash), text, 384);
    pasteStoreState.settle(hash);
    let whereLabel = useDisk ? `to ${getPastePath(hash)}` : "in the storage backend";
    logForDebugging(`Stored paste ${hash} ${whereLabel}`);
    logFeatureOk("paste_store");
  } catch (error) {
    pasteStoreState.retainFailed(hash, text);
    logForDebugging(`Failed to store paste: ${error}`);
    logFeatureSad("paste_store", "paste_store_write_failed");
  }
}
//@ chunk-7jxyna5q.js:32094-32459 fingerprint (2.1.88 match: retrievePastedText, 0.703)
/**
 * 按 hash 读取 paste-cache 中的粘贴文本。
 */
async function retrievePastedText(hash, storageV5) {
  let cached = getPasteStoreState().get(hash);
  if (cached !== undefined) return cached;
  try {
    if (storageV5) {
      let readResult = await storageV5.read([getPasteStorageKey(hash)]);
      if (!readResult.ok) {
        logForDebugging(`Failed to retrieve paste ${hash}: ${formatStorageError(readResult.error)}`);
        return null;
      }
      let item = readResult.value.items[0];
      return item.found ? Buffer.from(item.value).toString("utf8") : null;
    }
    let pastePath = getPastePath(hash);
    return await getFileReader().read(pastePath);
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`Failed to retrieve paste ${hash}: ${error}`);
    return null;
  }
}
//@ chunk-7jxyna5q.js:32459-32777 fingerprint (2.1.88 match: cleanupOldPastes, 0.748)
/**
 * 删除超过保留期的旧粘贴文件。
 */
async function cleanupOldPastes(cutoffDate, storageV5) {
  if (storageV5 !== undefined) return cleanupOldPastesViaStorage(storageV5, cutoffDate.getTime());
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
//@ chunk-7jxyna5q.js:32777-33118 sole-consumer
async function cleanupOldPastesViaStorage(storage, cutoffTime) {
  let expiredKeys = [];
  if (
    (
      await readAllPages(
        (cursor) =>
          storage.listEntries(
            {
              namespace: "paste",
            },
            cursor !== undefined
              ? {
                  cursor,
                }
              : undefined,
          ),
        (entries) => {
          for (let entry of entries)
            if (
              entry.kind === "key" &&
              entry.key.namespace === "paste" &&
              entry.mtimeMs !== undefined &&
              entry.mtimeMs < cutoffTime
            )
              expiredKeys.push(entry.key);
        },
      )
    ).status !== "error"
  ) {
    for (let key of expiredKeys)
      if ((await storage.delete(key)).ok) logForDebugging(`Cleaned up old paste: ${key.id}`);
  }
  await cleanupPasteStagingFiles(getPasteStoreDir(), cutoffTime);
}
//@ chunk-7jxyna5q.js:33118-33363 sole-consumer
async function cleanupPasteStagingFiles(pasteStoreDir, cutoffTime) {
  let fileReader = getFileReader();
  let files;
  try {
    files = await fileReader.list(pasteStoreDir);
  } catch {
    return;
  }
  for (let file of files) {
    if (!file.includes(".txt.tmp.")) continue;
    let filePath = join(pasteStoreDir, file);
    try {
      if ((await fileReader.stat(filePath)).mtimeMs < cutoffTime) {
        await fileReader.delete(filePath);
        logForDebugging(`Cleaned up old paste staging file: ${filePath}`);
      }
    } catch {}
  }
}
export { retrievePastedText, hashPastedText, storePastedTextQueued, cleanupOldPastes };
