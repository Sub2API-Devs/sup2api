/**
 * @anthropic-ai/sdk/tools/agent-toolset/memories.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-2cw52qnf.js (9), chunk-hwmsct5x.js (2)
 * attribution: esm-layout 2, esm-fingerprint 9
 */
import * as BRt from "crypto";
import * as zp from "path";
import { AnthropicError } from "../../core/error.mjs";
import { __classPrivateFieldSet, __classPrivateFieldGet } from "../../internal/tslib.mjs";
import { DEFAULT_MEMORY_SYNC_INTERVAL_MS, checkMemorySyncInterval } from "./sync-interval.mjs";
import { loggerFor } from "../../internal/utils/log.mjs";
import { FileStore_default, FileStoreError, isPathLegal } from "../../internal/file-store.mjs";
import { isStatus } from "../../internal/utils/backoff.mjs";
import { decodeUtf8 } from "../../internal/utils/bytes.mjs";

//@ chunk-hwmsct5x.js:17254-17270 esm-layout
function sleepWithAbort(delta) {}
//@ chunk-hwmsct5x.js:17270-17462 esm-fingerprint
var sleepUnlessAborted = (ms, signal) =>
  new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    let onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    let timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, {
      once: true,
    });
  });
//@ chunk-2cw52qnf.js:13458-13570 esm-layout
var _SessionMemoryStores_instances;
var _SessionMemoryStores_client;
var _SessionMemoryStores_workdir;
var _SessionMemoryStores_syncIntervalMs;
var _SessionMemoryStores_syncDeletions;
var _SessionMemoryStores_log;
var _SessionMemoryStores_lastSyncAt;
var _SessionMemoryStores_finished;
var _SessionMemoryStores_stores;
var _SessionMemoryStores_storeRoot;
var _SessionMemoryStores_scanMarker;
var _SessionMemoryStores_syncStore;
var _SessionMemoryStores_flushStore;
var _SessionMemoryStores_recover;
var _SessionMemoryStores_stampAndPull;
var _SessionMemoryStores_syncPath;
var _SessionMemoryStores_removeLocal;
var _SessionMemoryStores_write;
var _SessionMemoryStores_pullAll;
var _SessionMemoryStores_uploadAll;
var _SessionMemoryStores_listMemories;
var _SessionMemoryStores_upload;
var _SessionMemoryStores_corroboratedDelete;
var _SessionMemoryStores_deleteRemote;
var MEMORY_FLUSH_TIMEOUT_MS = 30000;
var MARKER_PATH = ".anthropic-memory-store";
var MARKER_VERSION = 1;
//@ chunk-2cw52qnf.js:13570-13668 esm-fingerprint
function markerSha(memoryStoreId) {
  return BRt.createHash("sha256")
    .update(
      `version ${MARKER_VERSION}
${memoryStoreId}`,
      "utf-8",
    )
    .digest("hex");
}
//@ chunk-2cw52qnf.js:13668-13717 esm-fingerprint
var DELETE_CORROBORATION_MS = 30000;
var LIST_PAGE_SIZE = 100;
var FULL_LIST_PAGE_SIZE = 20;
var FETCH_CONCURRENCY = 16;
var UPLOAD_CONCURRENCY = 32;
var DELETE_CAP_FLOOR = 8;
var DELETE_CAP_CEILING = 50;
//@ chunk-2cw52qnf.js:13717-13821 esm-fingerprint
class SessionMemoryError extends AnthropicError {
  constructor(message, cause) {
    super(message);
    this.name = "SessionMemoryError";
    if (cause !== undefined) this.cause = cause;
  }
}
//@ chunk-2cw52qnf.js:13821-14031 esm-fingerprint
class DeletePass {
  constructor(mode, cap, waiveWindow) {
    this.mode = mode;
    this.cap = cap;
    this.waiveWindow = waiveWindow;
    this.attempted = 0;
    this.capped = 0;
    this.suppressed = 0;
  }
  takeSlot() {
    if (this.attempted >= this.cap) {
      this.capped++;
      return false;
    }
    this.attempted++;
    return true;
  }
}
//@ chunk-2cw52qnf.js:14031-16765 esm-fingerprint
class SessionMemoryStores {
  constructor(client, opts) {
    _SessionMemoryStores_instances.add(this);
    _SessionMemoryStores_client.set(this, undefined);
    _SessionMemoryStores_workdir.set(this, undefined);
    _SessionMemoryStores_syncIntervalMs.set(this, undefined);
    _SessionMemoryStores_syncDeletions.set(this, undefined);
    _SessionMemoryStores_log.set(this, undefined);
    _SessionMemoryStores_lastSyncAt.set(this, undefined);
    _SessionMemoryStores_finished.set(this, false);
    _SessionMemoryStores_stores.set(this, []);
    __classPrivateFieldSet(this, _SessionMemoryStores_client, client, "f");
    __classPrivateFieldSet(this, _SessionMemoryStores_workdir, opts.workdir, "f");
    __classPrivateFieldSet(
      this,
      _SessionMemoryStores_syncIntervalMs,
      opts.syncIntervalMs ?? DEFAULT_MEMORY_SYNC_INTERVAL_MS,
      "f",
    );
    checkMemorySyncInterval(
      __classPrivateFieldGet(this, _SessionMemoryStores_syncIntervalMs, "f"),
      "syncIntervalMs",
    );
    __classPrivateFieldSet(this, _SessionMemoryStores_syncDeletions, opts.syncDeletions ?? "enabled", "f");
    __classPrivateFieldSet(this, _SessionMemoryStores_log, loggerFor(client), "f");
    __classPrivateFieldSet(this, _SessionMemoryStores_lastSyncAt, Date.now(), "f");
  }
  get roots() {
    return __classPrivateFieldGet(this, _SessionMemoryStores_stores, "f").map((s) => s.files.root().path);
  }
  get readOnlyRoots() {
    return __classPrivateFieldGet(this, _SessionMemoryStores_stores, "f")
      .filter((s) => s.readOnly)
      .map((s) => s.files.root().path);
  }
  async download(session) {
    for (let resource of session.resources) {
      if (resource.type !== "memory_store") continue;
      let root = __classPrivateFieldGet(
        this,
        _SessionMemoryStores_instances,
        "m",
        _SessionMemoryStores_storeRoot,
      ).call(this, resource);
      let store;
      try {
        store = {
          memoryStoreId: resource.memory_store_id,
          files: await FileStore_default.open(root, {
            utf8: true,
          }),
          readOnly: resource.access === "read_only",
          baseline: new Map(),
          refusedShas: new Map(),
          pendingDeletes: new Map(),
        };
        if (!store.files.root().removedOnDispose)
          throw new SessionMemoryError(
            `something already exists at the memory store's path: ${root} (memory_store_id=${resource.memory_store_id}); it must not exist when the session starts`,
          );
        try {
          await store.files.createRoot();
        } catch (e) {
          if (!isErrno(e)) throw e;
          throw new SessionMemoryError(
            `cannot create the memory store's folder: ${root} (memory_store_id=${resource.memory_store_id}): ${e}; the worker host must make this mount path writable`,
            e,
          );
        }
        await __classPrivateFieldGet(
          this,
          _SessionMemoryStores_instances,
          "m",
          _SessionMemoryStores_stampAndPull,
        ).call(this, store);
        __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").info("downloaded memories", {
          count: store.baseline.size,
          memory_store_id: store.memoryStoreId,
          dest: store.files.root().path,
        });
        __classPrivateFieldGet(this, _SessionMemoryStores_stores, "f").push(store);
      } catch (e) {
        if (store) await store.files.dispose().catch(() => {});
        if (e instanceof SessionMemoryError) throw e;
        throw new SessionMemoryError(
          `failed to download memory store memory_store_id=${resource.memory_store_id}: ${e}`,
          e,
        );
      }
    }
    __classPrivateFieldSet(this, _SessionMemoryStores_lastSyncAt, Date.now(), "f");
  }
  async finish() {
    if (__classPrivateFieldGet(this, _SessionMemoryStores_finished, "f"))
      throw new AnthropicError("finish() was already called: it is the session's last sync and runs once");
    __classPrivateFieldSet(this, _SessionMemoryStores_finished, true, "f");
    await this.syncAll(true);
  }
  async syncAll(final) {
    await Promise.all(
      __classPrivateFieldGet(this, _SessionMemoryStores_stores, "f").map((store) =>
        __classPrivateFieldGet(
          this,
          _SessionMemoryStores_instances,
          "m",
          _SessionMemoryStores_syncStore,
        ).call(this, store, final),
      ),
    );
    __classPrivateFieldSet(this, _SessionMemoryStores_lastSyncAt, Date.now(), "f");
  }
  async syncIfDue() {
    if (
      Date.now() - __classPrivateFieldGet(this, _SessionMemoryStores_lastSyncAt, "f") <
      __classPrivateFieldGet(this, _SessionMemoryStores_syncIntervalMs, "f")
    )
      return;
    await this.syncAll(false);
  }
  async flushWrites(signal) {
    await Promise.all(
      __classPrivateFieldGet(this, _SessionMemoryStores_stores, "f").map((store) =>
        __classPrivateFieldGet(
          this,
          _SessionMemoryStores_instances,
          "m",
          _SessionMemoryStores_flushStore,
        ).call(this, store, signal),
      ),
    );
  }
  async dispose() {
    for (let store of __classPrivateFieldGet(this, _SessionMemoryStores_stores, "f")) {
      let root = store.files.root();
      try {
        let scan = await __classPrivateFieldGet(
          this,
          _SessionMemoryStores_instances,
          "m",
          _SessionMemoryStores_scanMarker,
        ).call(this, store);
        if (!scan.markerOk && Object.keys(scan.files).length > 0) {
          __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
            `${scan.distrustReason}; leaving the memory store folder on disk`,
            {
              root: root.path,
              memory_store_id: store.memoryStoreId,
            },
          );
          continue;
        }
        await store.files.dispose();
      } catch (e) {
        if (!(e instanceof FileStoreError) && !isErrno(e)) throw e;
        __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
          "failed to remove the memory store folder",
          {
            root: store.files.root().path,
            memory_store_id: store.memoryStoreId,
            error: String(e),
          },
        );
        continue;
      }
      if (root.removedOnDispose)
        __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").info("removed memory store dir", {
          dest: root.path,
          memory_store_id: store.memoryStoreId,
        });
    }
  }
}
//@ chunk-2cw52qnf.js:16765-26148 esm-fingerprint
_SessionMemoryStores_client = new WeakMap();
_SessionMemoryStores_workdir = new WeakMap();
_SessionMemoryStores_syncIntervalMs = new WeakMap();
_SessionMemoryStores_syncDeletions = new WeakMap();
_SessionMemoryStores_log = new WeakMap();
_SessionMemoryStores_lastSyncAt = new WeakMap();
_SessionMemoryStores_finished = new WeakMap();
_SessionMemoryStores_stores = new WeakMap();
_SessionMemoryStores_instances = new WeakSet();
_SessionMemoryStores_storeRoot = function (resource) {
  if (resource.mount_path) {
    if (!isPathLegal(resource.mount_path))
      throw new SessionMemoryError(
        `memory store mount_path is not a clean absolute path: ${JSON.stringify(resource.mount_path)} (memory_store_id=${resource.memory_store_id})`,
      );
    return resource.mount_path;
  }
  return zp.join(
    __classPrivateFieldGet(this, _SessionMemoryStores_workdir, "f"),
    "memory",
    resource.name || resource.memory_store_id,
  );
};
_SessionMemoryStores_scanMarker = async function (store) {
  let local = await store.files.hashtree();
  let marker = local[MARKER_PATH];
  delete local[MARKER_PATH];
  if (marker === markerSha(store.memoryStoreId))
    return {
      files: local,
      markerOk: true,
      distrustReason: null,
    };
  return {
    files: local,
    markerOk: false,
    distrustReason:
      marker !== undefined ? "the marker file does not match this store" : "the marker file is gone",
  };
};
_SessionMemoryStores_syncStore = async function (store, final) {
  try {
    let scan = await __classPrivateFieldGet(
      this,
      _SessionMemoryStores_instances,
      "m",
      _SessionMemoryStores_scanMarker,
    ).call(this, store);
    let local = scan.files;
    if (!scan.markerOk) {
      if (Object.keys(local).length > 0) {
        __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
          `${scan.distrustReason}; leaving the memory store folder as found and not syncing`,
          {
            root: store.files.root().path,
            memory_store_id: store.memoryStoreId,
          },
        );
        return;
      }
      await __classPrivateFieldGet(
        this,
        _SessionMemoryStores_instances,
        "m",
        _SessionMemoryStores_recover,
      ).call(this, store, "the folder or its marker is gone");
      return;
    }
    if (Object.keys(local).length === 0 && store.baseline.size > 1) {
      await __classPrivateFieldGet(
        this,
        _SessionMemoryStores_instances,
        "m",
        _SessionMemoryStores_recover,
      ).call(this, store, "every memory file is gone at once");
      return;
    }
    let remote = new Map();
    for await (let [rel, item] of __classPrivateFieldGet(
      this,
      _SessionMemoryStores_instances,
      "m",
      _SessionMemoryStores_listMemories,
    ).call(this, store.memoryStoreId))
      remote.set(rel, item);
    let deletes = new DeletePass(
      __classPrivateFieldGet(this, _SessionMemoryStores_syncDeletions, "f"),
      Math.max(DELETE_CAP_FLOOR, Math.min(DELETE_CAP_CEILING, Math.floor(store.baseline.size / 4))),
      final,
    );
    let pulls = [];
    let baseline = new Map();
    let paths = [...new Set([...remote.keys(), ...Object.keys(local), ...store.baseline.keys()])].sort();
    for (let rel of paths) {
      let remoteItem = remote.get(rel);
      let localSha = local[rel];
      let baseSha = store.baseline.get(rel);
      let sha;
      if (
        localSha === undefined &&
        baseSha !== undefined &&
        remoteItem !== undefined &&
        remoteItem.content_sha256 === baseSha &&
        !store.readOnly
      )
        sha = await __classPrivateFieldGet(
          this,
          _SessionMemoryStores_instances,
          "m",
          _SessionMemoryStores_corroboratedDelete,
        ).call(this, store, rel, remoteItem, baseSha, deletes);
      else
        sha = await __classPrivateFieldGet(
          this,
          _SessionMemoryStores_instances,
          "m",
          _SessionMemoryStores_syncPath,
        ).call(this, store, rel, remoteItem, localSha, pulls);
      if (sha !== undefined) baseline.set(rel, sha);
    }
    store.baseline = baseline;
    await __classPrivateFieldGet(
      this,
      _SessionMemoryStores_instances,
      "m",
      _SessionMemoryStores_pullAll,
    ).call(this, store, pulls);
    if (deletes.suppressed > 0)
      __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").debug(
        "remote deletes are disabled; locally deleted memories stay on the server",
        {
          count: deletes.suppressed,
          memory_store_id: store.memoryStoreId,
        },
      );
    if (deletes.capped > 0)
      __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
        `delete cap reached: ${deletes.mode === "log_only" ? "would send" : "sent"} ${deletes.attempted} deletes, held ${deletes.capped} for later syncs`,
        {
          memory_store_id: store.memoryStoreId,
        },
      );
  } catch (e) {
    __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn("memory sync failed", {
      memory_store_id: store.memoryStoreId,
      error: String(e),
    });
  }
};
_SessionMemoryStores_flushStore = async function (store, signal) {
  let dirty = new Map();
  let unsent = new Set();
  let push = async () => {
    if (store.readOnly) return;
    let scan = await __classPrivateFieldGet(
      this,
      _SessionMemoryStores_instances,
      "m",
      _SessionMemoryStores_scanMarker,
    ).call(this, store);
    if (!scan.markerOk) {
      __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
        `${scan.distrustReason}; not uploading anything from the memory store folder`,
        {
          root: store.files.root().path,
          memory_store_id: store.memoryStoreId,
        },
      );
      return;
    }
    for (let [rel, sha] of Object.entries(scan.files))
      if (sha !== store.baseline.get(rel) && store.refusedShas.get(rel) !== sha) {
        dirty.set(rel, sha);
        unsent.add(rel);
      }
    if (dirty.size === 0 || signal?.aborted) return;
    let remote = new Map();
    for await (let [rel, item] of __classPrivateFieldGet(
      this,
      _SessionMemoryStores_instances,
      "m",
      _SessionMemoryStores_listMemories,
    ).call(this, store.memoryStoreId)) {
      if (signal?.aborted) return;
      remote.set(rel, item);
    }
    let uploads = [];
    for (let rel of [...dirty.keys()].sort()) {
      let localSha = dirty.get(rel);
      let baseSha = store.baseline.get(rel);
      let existing = remote.get(rel);
      if (existing !== undefined && existing.content_sha256 === localSha) {
        store.baseline.set(rel, existing.content_sha256);
        unsent.delete(rel);
        continue;
      }
      if (existing !== undefined && existing.content_sha256 !== baseSha) {
        __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
          "memory changed both locally and remotely; the flush leaves the remote version",
          {
            path: rel,
            memory_store_id: store.memoryStoreId,
          },
        );
        unsent.delete(rel);
        continue;
      }
      uploads.push([rel, localSha, existing]);
    }
    await __classPrivateFieldGet(
      this,
      _SessionMemoryStores_instances,
      "m",
      _SessionMemoryStores_uploadAll,
    ).call(this, store, uploads, unsent, signal);
  };
  try {
    await settledOrAborted(push(), signal);
    if (signal?.aborted && unsent.size > 0)
      __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
        `memory flush cut off part-way; ${unsent.size} of ${dirty.size} changed files had not finished uploading`,
        {
          memory_store_id: store.memoryStoreId,
        },
      );
  } catch (e) {
    __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn("memory flush failed", {
      memory_store_id: store.memoryStoreId,
      error: String(e),
    });
  }
};
_SessionMemoryStores_recover = async function (store, reason) {
  __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
    `${reason}; re-downloading the memory store folder instead of syncing`,
    {
      root: store.files.root().path,
      memory_store_id: store.memoryStoreId,
    },
  );
  await store.files.createRoot();
  await __classPrivateFieldGet(
    this,
    _SessionMemoryStores_instances,
    "m",
    _SessionMemoryStores_stampAndPull,
  ).call(this, store);
};
_SessionMemoryStores_stampAndPull = async function (store) {
  store.baseline = new Map();
  store.pendingDeletes.clear();
  await store.files.put(
    MARKER_PATH,
    `version ${MARKER_VERSION}
${store.memoryStoreId}`,
  );
  for await (let [rel, item] of __classPrivateFieldGet(
    this,
    _SessionMemoryStores_instances,
    "m",
    _SessionMemoryStores_listMemories,
  ).call(this, store.memoryStoreId, "full"))
    if (
      await __classPrivateFieldGet(
        this,
        _SessionMemoryStores_instances,
        "m",
        _SessionMemoryStores_write,
      ).call(this, store, rel, item.content ?? "")
    )
      store.baseline.set(rel, item.content_sha256);
};
_SessionMemoryStores_syncPath = async function (store, rel, remote, localSha, pulls) {
  let baseSha = store.baseline.get(rel);
  if (localSha !== undefined) store.pendingDeletes.delete(rel);
  if (!remote) {
    if (localSha === undefined) {
      store.pendingDeletes.delete(rel);
      return;
    }
    if (baseSha !== undefined) {
      if (localSha === baseSha) {
        let fresh = await __classPrivateFieldGet(
          this,
          _SessionMemoryStores_instances,
          "m",
          _SessionMemoryStores_removeLocal,
        ).call(this, store, rel, baseSha);
        if (fresh === undefined) return;
        if (fresh === baseSha) return baseSha;
        localSha = fresh;
      }
      if (store.readOnly)
        __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
          "memory deleted remotely but edited locally; keeping the file, which a read-only store cannot push",
          {
            path: rel,
            memory_store_id: store.memoryStoreId,
          },
        );
      else if (store.refusedShas.get(rel) !== localSha)
        __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").info(
          "memory deleted remotely but edited locally; re-creating it from the file",
          {
            path: rel,
            memory_store_id: store.memoryStoreId,
          },
        );
    }
    if (store.readOnly) return;
    if (store.refusedShas.get(rel) === localSha) return;
    return await __classPrivateFieldGet(
      this,
      _SessionMemoryStores_instances,
      "m",
      _SessionMemoryStores_upload,
    ).call(this, store, rel, localSha, undefined);
  }
  let remoteSha = remote.content_sha256;
  let remoteChanged = remoteSha !== baseSha;
  let locallyEdited = localSha !== undefined && localSha !== baseSha && localSha !== remoteSha;
  let localChanged = !store.readOnly && locallyEdited;
  if (localSha === undefined && baseSha !== undefined) {
    if (remoteChanged) {
      __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
        "memory deleted locally but changed remotely; restoring the remote version",
        {
          path: rel,
          memory_store_id: store.memoryStoreId,
        },
      );
      store.pendingDeletes.delete(rel);
      pulls.push([rel, remote]);
    }
    return baseSha;
  }
  if (remoteChanged) {
    if (localSha === remoteSha) return remoteSha;
    if (locallyEdited)
      __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
        "memory changed both locally and remotely; keeping the remote version",
        {
          path: rel,
          memory_store_id: store.memoryStoreId,
        },
      );
    pulls.push([rel, remote]);
    return baseSha;
  }
  if (localChanged) {
    if (store.refusedShas.get(rel) === localSha) return remoteSha;
    return (
      (await __classPrivateFieldGet(
        this,
        _SessionMemoryStores_instances,
        "m",
        _SessionMemoryStores_upload,
      ).call(this, store, rel, localSha, remote)) ?? remoteSha
    );
  }
  return remoteSha;
};
_SessionMemoryStores_removeLocal = async function (store, rel, expectSha) {
  let freshSha;
  try {
    freshSha = await store.files.hashFile(rel);
  } catch (e) {
    if (!(e instanceof FileStoreError) && !isErrno(e)) throw e;
    return expectSha;
  }
  if (freshSha === null) return;
  if (freshSha !== expectSha) return freshSha;
  try {
    await store.files.remove(rel);
  } catch (e) {
    if (!(e instanceof FileStoreError) && !isErrno(e)) throw e;
    __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
      "failed to remove memory deleted remotely",
      {
        path: rel,
        memory_store_id: store.memoryStoreId,
        error: String(e),
      },
    );
    return expectSha;
  }
  return;
};
_SessionMemoryStores_write = async function (store, rel, content) {
  try {
    await store.files.put(rel, content);
  } catch (e) {
    if (!(e instanceof FileStoreError) && !isErrno(e)) throw e;
    __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn("failed to write memory", {
      path: rel,
      memory_store_id: store.memoryStoreId,
      error: String(e),
    });
    return false;
  }
  return true;
};
_SessionMemoryStores_pullAll = async function (store, pulls) {
  if (pulls.length === 0) return;
  let pullOne = async (rel, listed) => {
    let item;
    try {
      item = await __classPrivateFieldGet(
        this,
        _SessionMemoryStores_client,
        "f",
      ).beta.memoryStores.memories.retrieve(listed.id, {
        memory_store_id: store.memoryStoreId,
        view: "full",
      });
    } catch (e) {
      if (isStatus(e, 404)) return;
      __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn("failed to fetch memory content", {
        path: rel,
        memory_store_id: store.memoryStoreId,
        error: String(e),
      });
      return;
    }
    if (
      await __classPrivateFieldGet(
        this,
        _SessionMemoryStores_instances,
        "m",
        _SessionMemoryStores_write,
      ).call(this, store, rel, item.content ?? "")
    )
      store.baseline.set(rel, item.content_sha256);
  };
  let queue = pulls[Symbol.iterator]();
  let worker = async () => {
    for (let [rel, listed] of queue) await pullOne(rel, listed);
  };
  await Promise.all(
    Array.from(
      {
        length: Math.min(FETCH_CONCURRENCY, pulls.length),
      },
      worker,
    ),
  );
};
_SessionMemoryStores_uploadAll = async function (store, uploads, unsent, signal) {
  let queue = uploads[Symbol.iterator]();
  let worker = async () => {
    for (let [rel, localSha, existing] of queue) {
      if (signal?.aborted) return;
      let sha = await __classPrivateFieldGet(
        this,
        _SessionMemoryStores_instances,
        "m",
        _SessionMemoryStores_upload,
      ).call(this, store, rel, localSha, existing);
      unsent.delete(rel);
      if (sha !== undefined) store.baseline.set(rel, sha);
    }
  };
  await Promise.all(
    Array.from(
      {
        length: Math.min(UPLOAD_CONCURRENCY, uploads.length),
      },
      worker,
    ),
  );
};
_SessionMemoryStores_listMemories = async function* (memoryStoreId, view = "basic") {
  let limit = view === "basic" ? LIST_PAGE_SIZE : FULL_LIST_PAGE_SIZE;
  for await (let item of __classPrivateFieldGet(
    this,
    _SessionMemoryStores_client,
    "f",
  ).beta.memoryStores.memories.list(memoryStoreId, {
    view,
    limit,
  })) {
    if (item.type !== "memory") continue;
    let rel = item.path.replace(/^\/+/, "");
    if (rel === MARKER_PATH) {
      __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
        "the server listed the reserved marker path; skipping",
        {
          path: item.path,
          memory_store_id: memoryStoreId,
        },
      );
      continue;
    }
    yield [rel, item];
  }
};
_SessionMemoryStores_upload = async function _SessionMemoryStores_upload(store, rel, localSha, existing) {
  try {
    let data = await store.files.get(rel);
    if (data === null) return;
    let content = decodeUtf8(data);
    let item = existing
      ? await __classPrivateFieldGet(
          this,
          _SessionMemoryStores_client,
          "f",
        ).beta.memoryStores.memories.update(existing.id, {
          memory_store_id: store.memoryStoreId,
          content,
          precondition: {
            type: "content_sha256",
            content_sha256: existing.content_sha256,
          },
        })
      : await __classPrivateFieldGet(
          this,
          _SessionMemoryStores_client,
          "f",
        ).beta.memoryStores.memories.create(store.memoryStoreId, {
          path: "/" + rel,
          content,
        });
    store.refusedShas.delete(rel);
    return item.content_sha256;
  } catch (e) {
    if (existing && isStatus(e, 404))
      return await __classPrivateFieldGet(
        this,
        _SessionMemoryStores_instances,
        "m",
        _SessionMemoryStores_upload,
      ).call(this, store, rel, localSha, undefined);
    let permanent = e instanceof FileStoreError || isStatus(e, 400) || isStatus(e, 413);
    if (existing && isStatus(e, 409))
      __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
        "memory changed both locally and remotely; the upload was refused and the local edit loses",
        {
          path: rel,
          memory_store_id: store.memoryStoreId,
        },
      );
    else if (permanent && localSha !== undefined) {
      store.refusedShas.set(rel, localSha);
      __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
        "the server rejected this memory file, so it stays un-synced until its content changes",
        {
          path: rel,
          memory_store_id: store.memoryStoreId,
          rejection: String(e),
        },
      );
    } else
      __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn("failed to upload memory", {
        path: rel,
        memory_store_id: store.memoryStoreId,
        error: String(e),
      });
    return;
  }
};
_SessionMemoryStores_corroboratedDelete = async function (store, rel, remote, baseSha, deletes) {
  if (deletes.mode === "disabled") {
    deletes.suppressed++;
    return baseSha;
  }
  let firstAbsent = store.pendingDeletes.get(rel);
  if (firstAbsent === undefined) {
    firstAbsent = Date.now();
    store.pendingDeletes.set(rel, firstAbsent);
  }
  if (!deletes.waiveWindow && Date.now() - firstAbsent < DELETE_CORROBORATION_MS) return baseSha;
  let markerOk;
  let stillAbsent;
  try {
    markerOk = (await store.files.hashFile(MARKER_PATH)) === markerSha(store.memoryStoreId);
    stillAbsent = (await store.files.hashFile(rel)) === null;
  } catch (e) {
    if (!(e instanceof FileStoreError) && !isErrno(e)) throw e;
    markerOk = stillAbsent = false;
  }
  if (!markerOk) return baseSha;
  if (!stillAbsent) {
    store.pendingDeletes.delete(rel);
    return baseSha;
  }
  if (!deletes.takeSlot()) return baseSha;
  if (deletes.mode === "log_only") {
    __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").info(
      "log-only: sync would delete this memory on the server",
      {
        path: rel,
        memory_store_id: store.memoryStoreId,
      },
    );
    return baseSha;
  }
  let sha = await __classPrivateFieldGet(
    this,
    _SessionMemoryStores_instances,
    "m",
    _SessionMemoryStores_deleteRemote,
  ).call(this, store, rel, remote, baseSha);
  if (sha === undefined) store.pendingDeletes.delete(rel);
  return sha;
};
_SessionMemoryStores_deleteRemote = async function (store, rel, remote, baseSha) {
  try {
    await __classPrivateFieldGet(this, _SessionMemoryStores_client, "f").beta.memoryStores.memories.delete(
      remote.id,
      {
        memory_store_id: store.memoryStoreId,
        expected_content_sha256: baseSha,
      },
    );
  } catch (e) {
    if (isStatus(e, 404)) return;
    if (isStatus(e, 409) || isStatus(e, 412))
      __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn(
        "memory deleted locally but changed remotely; keeping the remote version",
        {
          path: rel,
          memory_store_id: store.memoryStoreId,
        },
      );
    else
      __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").warn("failed to delete memory", {
        path: rel,
        memory_store_id: store.memoryStoreId,
        error: String(e),
      });
    return baseSha;
  }
  __classPrivateFieldGet(this, _SessionMemoryStores_log, "f").info("propagated local deletion", {
    path: rel,
    memory_store_id: store.memoryStoreId,
  });
  return;
};
//@ chunk-2cw52qnf.js:26148-26225 esm-fingerprint
function isErrno(e) {
  return typeof e === "object" && e !== null && typeof e.code === "string";
}
//@ chunk-2cw52qnf.js:26225-26431 esm-fingerprint
async function settledOrAborted(p, signal) {
  if (!signal) {
    await p;
    return;
  }
  let onAbort;
  let aborted = new Promise((resolve) => {
    onAbort = resolve;
    if (signal.aborted) resolve();
  });
  signal.addEventListener("abort", onAbort, {
    once: true,
  });
  try {
    await Promise.race([p, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
export {
  sleepUnlessAborted,
  sleepWithAbort,
  MEMORY_FLUSH_TIMEOUT_MS,
  SessionMemoryError,
  SessionMemoryStores,
};
