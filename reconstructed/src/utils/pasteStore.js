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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
} from "path";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
} from "crypto";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, isDiskless } from "../bootstrap/state.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { Yie } from "../services/orgMemory/memoryStores.js";
import { warnDisklessSettingsWrite } from "./settings/settingsStorage.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { getFileReader } from "./fileStore.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { isENOENT } from "./errors.js";
import { readAllPages } from "./pagedRead.js";

//@ chunk-s61vbvea.js:29553-29581 fingerprint = PASTE_STORE_DIR (1)
var PASTE_STORE_DIR = "paste-cache",
  cm = 1e7;
//@ chunk-s61vbvea.js:29581-30463 layout
class PasteStoreState {
  inFlight = new Map();
  retainedFailed = new Map();
  retainedFailedChars = 0;
  retainedCap = cm;
  markInFlight(e, n) {
    this.inFlight.set(e, n);
  }
  settle(e) {
    this.inFlight.delete(e);
    let n = this.retainedFailed.get(e);
    if (n !== void 0) ((this.retainedFailedChars -= n.length), this.retainedFailed.delete(e));
  }
  retainFailed(e, n) {
    this.inFlight.delete(e);
    let r = this.retainedFailed.get(e);
    if (r !== void 0) ((this.retainedFailedChars -= r.length), this.retainedFailed.delete(e));
    if (n.length > this.retainedCap) return;
    (this.retainedFailed.set(e, n), (this.retainedFailedChars += n.length));
    while (this.retainedFailedChars > this.retainedCap) {
      let s = this.retainedFailed.keys().next().value;
      ((this.retainedFailedChars -= this.retainedFailed.get(s).length), this.retainedFailed.delete(s));
    }
  }
  get(e) {
    return this.inFlight.get(e) ?? this.retainedFailed.get(e);
  }
  clear() {
    (this.inFlight.clear(),
      this.retainedFailed.clear(),
      (this.retainedFailedChars = 0),
      (this.retainedCap = cm));
  }
}
//@ chunk-s61vbvea.js:30463-30488 layout
var pasteStoreStateByHost = new HostScoped(() => new PasteStoreState());
//@ chunk-s61vbvea.js:30488-30525 layout
function getPasteStoreState() {
  return pasteStoreStateByHost.of(getRootSession().host);
}
/**
 * 粘贴缓存目录 <配置目录>/paste-cache，内容按 16 位 hex hash 存为 <hash>.txt。
 */
//@ chunk-s61vbvea.js:30525-30558 layout
function getPasteStoreDir() {
  return join_2(getClaudeConfigDir(), PASTE_STORE_DIR);
}
/**
 * 粘贴文本的 sha256 截取 16 位 hex。
 */
//@ chunk-s61vbvea.js:30558-30629 file-local
function hashPastedText(content) {
  return createHash_2("sha256").update(content).digest("hex").slice(0, 16);
}
//@ chunk-s61vbvea.js:30629-30653 layout
var PASTE_HASH_PATTERN = /^[0-9a-f]{16}$/;
//@ chunk-s61vbvea.js:30653-30725 layout
function assertValidPasteHash(e) {
  if (!PASTE_HASH_PATTERN.test(e)) throw Error("invalid paste-content hash");
}
//@ chunk-s61vbvea.js:30725-30773 layout = getPastePath (1)
function getPastePath_2(hash) {
  return (assertValidPasteHash(hash), join_2(getPasteStoreDir(), `${hash}.txt`));
}
//@ chunk-s61vbvea.js:30773-30813 layout
function getPasteStorageKey(e) {
  return (assertValidPasteHash(e), STORAGE_SPACES.paste(e));
}
//@ chunk-s61vbvea.js:30813-30882 layout
function storePastedTextQueued(e, n, r) {
  let s = getPasteStoreState();
  return (s.markInFlight(e, n), storePastedText(e, n, r, s));
}
/**
 * 把长粘贴文本写入 paste-cache/<hash>.txt（diskless 时跳过）。
 */
//@ chunk-s61vbvea.js:30882-31496 callgraph-fingerprint = storePastedText (0.283)
async function storePastedText(e, n, r, s) {
  try {
    if (Yie(r)) {
      (assertValidPasteHash(e),
        s.retainFailed(e, n),
        warnDisklessSettingsWrite("paste", join_2(PASTE_STORE_DIR, `${e}.txt`)),
        logFeatureSad("paste_store", "diskless_skipped"));
      return;
    }
    let h = !isDiskless(),
      dir = getFileReader();
    if (h) await dir.mkdir(getPasteStoreDir());
    if (isStorageV5Enabled() && r) {
      let write = await r.write(getPasteStorageKey(e), n, { publishDiscipline: "inPlace", mode: 384 });
      if (!write.ok)
        throw (
          logForDebugging(`Paste write refused: ${formatStorageError(write.error)}`),
          Error("paste write refused by the storage backend")
        );
    } else await dir.write(getPastePath_2(e), n, 384);
    s.settle(e);
    let S = h ? `to ${getPastePath_2(e)}` : "in the storage backend";
    (logForDebugging(`Stored paste ${e} ${S}`), logFeatureOk("paste_store"));
  } catch (error) {
    (s.retainFailed(e, n),
      logForDebugging(`Failed to store paste: ${error}`),
      logFeatureSad("paste_store", "paste_store_write_failed"));
  }
}
/**
 * 按 hash 读取 paste-cache 中的粘贴文本。
 */
//@ chunk-s61vbvea.js:31496-31861 fingerprint = retrievePastedText (0.703)
async function retrievePastedText(e, n) {
  let r = getPasteStoreState().get(e);
  if (r !== void 0) return r;
  try {
    if (n) {
      let read = await n.read([getPasteStorageKey(e)]);
      if (!read.ok)
        return (logForDebugging(`Failed to retrieve paste ${e}: ${formatStorageError(read.error)}`), null);
      let y = read.value.items[0];
      return y.found ? Buffer.from(y.value).toString("utf8") : null;
    }
    let pastePath = getPastePath_2(e);
    return await getFileReader().read(pastePath);
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`Failed to retrieve paste ${e}: ${error}`);
    return null;
  }
}
/**
 * 删除超过保留期的旧粘贴文件。
 */
//@ chunk-s61vbvea.js:31861-32179 fingerprint = cleanupOldPastes (0.748)
async function cleanupOldPastes(e, n) {
  if (n !== void 0) return cleanupOldPastesViaStorage(n, e.getTime());
  let pasteDir = getFileReader(),
    s = getPasteStoreDir(),
    files;
  try {
    files = await pasteDir.list(s);
  } catch {
    return;
  }
  let cutoffTime = e.getTime();
  for (let file of files) {
    if (!file.endsWith(".txt") && !file.includes(".txt.tmp.")) continue;
    let filePath = join_2(s, file);
    try {
      if ((await pasteDir.stat(filePath)).mtimeMs < cutoffTime)
        (await pasteDir.delete(filePath), logForDebugging(`Cleaned up old paste: ${filePath}`));
    } catch {}
  }
}
//@ chunk-s61vbvea.js:32179-32520 sole-consumer
async function cleanupOldPastesViaStorage(e, n) {
  let r = [];
  if (
    (
      await readAllPages(
        (h) => e.listEntries({ namespace: "paste" }, h !== void 0 ? { cursor: h } : void 0),
        (h) => {
          for (let y of h)
            if (y.kind === "key" && y.key.namespace === "paste" && y.mtimeMs !== void 0 && y.mtimeMs < n)
              r.push(y.key);
        },
      )
    ).status !== "error"
  ) {
    for (let h of r) if ((await e.delete(h)).ok) logForDebugging(`Cleaned up old paste: ${h.id}`);
  }
  await cleanupPasteStagingFiles(getPasteStoreDir(), n);
}
//@ chunk-s61vbvea.js:32520-32765 sole-consumer
async function cleanupPasteStagingFiles(e, n) {
  let r = getFileReader(),
    s;
  try {
    s = await r.list(e);
  } catch {
    return;
  }
  for (let h of s) {
    if (!h.includes(".txt.tmp.")) continue;
    let y = join_2(e, h);
    try {
      if ((await r.stat(y)).mtimeMs < n)
        (await r.delete(y), logForDebugging(`Cleaned up old paste staging file: ${y}`));
    } catch {}
  }
}
//@ chunk-eg496hkq.js:44035-44104 fingerprint = getPastePath (1)
function getPastePath(e, n) {
  return `${e}-${n.replace(/[^a-zA-Z0-9-]/g, "_")}.txt`;
}

export { retrievePastedText, hashPastedText, storePastedTextQueued, cleanupOldPastes, getPastePath };
