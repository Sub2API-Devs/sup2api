/**
 * @anthropic-ai/sdk/tools/agent-toolset/memories.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-2cw52qnf.js (9), chunk-hwmsct5x.js (2)
 * attribution: esm-layout 2, esm-fingerprint 9
 */
import * as BRt from "crypto";
import * as zp from "path";
import { pr } from "../../core/error.mjs";
import { Kn, ke } from "../../internal/tslib.mjs";
import { gXo, M8r } from "./sync-interval.mjs";
import { Tb } from "../../internal/utils/log.mjs";
import { Fe, m, Se } from "../../internal/file-store.mjs";
import { hJ } from "../../internal/utils/backoff.mjs";
import { decodeUtf8 } from "../../internal/utils/bytes.mjs";

//@ chunk-2cw52qnf.js:13458-13570 esm-layout
var u,
  I,
  ae,
  H,
  ce,
  d,
  U,
  oe,
  k,
  ze,
  se,
  Ge,
  He,
  Ee,
  Oe,
  Pe,
  We,
  be,
  Ue,
  je,
  ie,
  ne,
  Be,
  Ye,
  xt = 30000,
  j = ".anthropic-memory-store",
  Ke = 1;
//@ chunk-2cw52qnf.js:13570-13668 esm-fingerprint
function qe(r) {
  return BRt.createHash("sha256")
    .update(
      `version ${Ke}
${r}`,
      "utf-8",
    )
    .digest("hex");
}
//@ chunk-2cw52qnf.js:13668-13717 esm-fingerprint
var Dt = 30000,
  Ct = 100,
  Ft = 20,
  Pt = 16,
  Wt = 32,
  Ut = 8,
  jt = 50;
//@ chunk-2cw52qnf.js:13717-13821 esm-fingerprint
class SessionMemoryError extends pr {
  constructor(r, e) {
    super(r);
    if (((this.name = "SessionMemoryError"), e !== void 0)) this.cause = e;
  }
}
//@ chunk-2cw52qnf.js:13821-14031 esm-fingerprint
class Ve {
  constructor(r, e, t) {
    ((this.mode = r),
      (this.cap = e),
      (this.waiveWindow = t),
      (this.attempted = 0),
      (this.capped = 0),
      (this.suppressed = 0));
  }
  takeSlot() {
    if (this.attempted >= this.cap) return (this.capped++, !1);
    return (this.attempted++, !0);
  }
}
//@ chunk-2cw52qnf.js:14031-16765 esm-fingerprint
class Xe {
  constructor(r, e) {
    (u.add(this),
      I.set(this, void 0),
      ae.set(this, void 0),
      H.set(this, void 0),
      ce.set(this, void 0),
      d.set(this, void 0),
      U.set(this, void 0),
      oe.set(this, !1),
      k.set(this, []),
      Kn(this, I, r, "f"),
      Kn(this, ae, e.workdir, "f"),
      Kn(this, H, e.syncIntervalMs ?? gXo, "f"),
      M8r(ke(this, H, "f"), "syncIntervalMs"),
      Kn(this, ce, e.syncDeletions ?? "enabled", "f"),
      Kn(this, d, Tb(r), "f"),
      Kn(this, U, Date.now(), "f"));
  }
  get roots() {
    return ke(this, k, "f").map((r) => r.files.root().path);
  }
  get readOnlyRoots() {
    return ke(this, k, "f")
      .filter((r) => r.readOnly)
      .map((r) => r.files.root().path);
  }
  async download(r) {
    for (let resource of r.resources) {
      if (resource.type !== "memory_store") continue;
      let t = ke(this, u, "m", ze).call(this, resource),
        n;
      try {
        if (
          ((n = {
            memoryStoreId: resource.memory_store_id,
            files: await Fe.open(t, { utf8: !0 }),
            readOnly: resource.access === "read_only",
            baseline: new Map(),
            refusedShas: new Map(),
            pendingDeletes: new Map(),
          }),
          !n.files.root().removedOnDispose)
        )
          throw new SessionMemoryError(
            `something already exists at the memory store's path: ${t} (memory_store_id=${resource.memory_store_id}); it must not exist when the session starts`,
          );
        try {
          await n.files.createRoot();
        } catch (error) {
          if (!B(error)) throw error;
          throw new SessionMemoryError(
            `cannot create the memory store's folder: ${t} (memory_store_id=${resource.memory_store_id}): ${error}; the worker host must make this mount path writable`,
            error,
          );
        }
        (await ke(this, u, "m", Oe).call(this, n),
          ke(this, d, "f").info("downloaded memories", {
            count: n.baseline.size,
            memory_store_id: n.memoryStoreId,
            dest: n.files.root().path,
          }),
          ke(this, k, "f").push(n));
      } catch (error) {
        if (n) await n.files.dispose().catch(() => {});
        if (error instanceof SessionMemoryError) throw error;
        throw new SessionMemoryError(
          `failed to download memory store memory_store_id=${resource.memory_store_id}: ${error}`,
          error,
        );
      }
    }
    Kn(this, U, Date.now(), "f");
  }
  async finish() {
    if (ke(this, oe, "f"))
      throw new pr("finish() was already called: it is the session's last sync and runs once");
    (Kn(this, oe, !0, "f"), await this.syncAll(!0));
  }
  async syncAll(r) {
    (await Promise.all(ke(this, k, "f").map((e) => ke(this, u, "m", Ge).call(this, e, r))),
      Kn(this, U, Date.now(), "f"));
  }
  async syncIfDue() {
    if (Date.now() - ke(this, U, "f") < ke(this, H, "f")) return;
    await this.syncAll(!1);
  }
  async flushWrites(r) {
    await Promise.all(ke(this, k, "f").map((e) => ke(this, u, "m", He).call(this, e, r)));
  }
  async dispose() {
    for (let r of ke(this, k, "f")) {
      let root = r.files.root();
      try {
        let t = await ke(this, u, "m", se).call(this, r);
        if (!t.markerOk && Object.keys(t.files).length > 0) {
          ke(this, d, "f").warn(`${t.distrustReason}; leaving the memory store folder on disk`, {
            root: root.path,
            memory_store_id: r.memoryStoreId,
          });
          continue;
        }
        await r.files.dispose();
      } catch (error) {
        if (!(error instanceof m) && !B(error)) throw error;
        ke(this, d, "f").warn("failed to remove the memory store folder", {
          root: r.files.root().path,
          memory_store_id: r.memoryStoreId,
          error: String(error),
        });
        continue;
      }
      if (root.removedOnDispose)
        ke(this, d, "f").info("removed memory store dir", {
          dest: root.path,
          memory_store_id: r.memoryStoreId,
        });
    }
  }
}
//@ chunk-2cw52qnf.js:16765-26148 esm-fingerprint
((I = new WeakMap()),
  (ae = new WeakMap()),
  (H = new WeakMap()),
  (ce = new WeakMap()),
  (d = new WeakMap()),
  (U = new WeakMap()),
  (oe = new WeakMap()),
  (k = new WeakMap()),
  (u = new WeakSet()),
  (ze = function (e) {
    if (e.mount_path) {
      if (!Se(e.mount_path))
        throw new SessionMemoryError(
          `memory store mount_path is not a clean absolute path: ${JSON.stringify(e.mount_path)} (memory_store_id=${e.memory_store_id})`,
        );
      return e.mount_path;
    }
    return zp.join(ke(this, ae, "f"), "memory", e.name || e.memory_store_id);
  }),
  (se = async function (e) {
    let hashtree = await e.files.hashtree(),
      n = hashtree[j];
    if ((delete hashtree[j], n === qe(e.memoryStoreId)))
      return { files: hashtree, markerOk: !0, distrustReason: null };
    return {
      files: hashtree,
      markerOk: !1,
      distrustReason: n !== void 0 ? "the marker file does not match this store" : "the marker file is gone",
    };
  }),
  (Ge = async function (e, t) {
    try {
      let n = await ke(this, u, "m", se).call(this, e),
        files = n.files;
      if (!n.markerOk) {
        if (Object.keys(files).length > 0) {
          ke(this, d, "f").warn(
            `${n.distrustReason}; leaving the memory store folder as found and not syncing`,
            { root: e.files.root().path, memory_store_id: e.memoryStoreId },
          );
          return;
        }
        await ke(this, u, "m", Ee).call(this, e, "the folder or its marker is gone");
        return;
      }
      if (Object.keys(files).length === 0 && e.baseline.size > 1) {
        await ke(this, u, "m", Ee).call(this, e, "every memory file is gone at once");
        return;
      }
      let o = new Map();
      for await (let [c, h] of ke(this, u, "m", ie).call(this, e.memoryStoreId)) o.set(c, h);
      let s = new Ve(ke(this, ce, "f"), Math.max(Ut, Math.min(jt, Math.floor(e.baseline.size / 4))), t),
        a = [],
        l = new Map(),
        sorted = [...new Set([...o.keys(), ...Object.keys(files), ...e.baseline.keys()])].sort();
      for (let c of sorted) {
        let h = o.get(c),
          y = files[c],
          O = e.baseline.get(c),
          v;
        if (y === void 0 && O !== void 0 && h !== void 0 && h.content_sha256 === O && !e.readOnly)
          v = await ke(this, u, "m", Be).call(this, e, c, h, O, s);
        else v = await ke(this, u, "m", Pe).call(this, e, c, h, y, a);
        if (v !== void 0) l.set(c, v);
      }
      if (((e.baseline = l), await ke(this, u, "m", Ue).call(this, e, a), s.suppressed > 0))
        ke(this, d, "f").debug("remote deletes are disabled; locally deleted memories stay on the server", {
          count: s.suppressed,
          memory_store_id: e.memoryStoreId,
        });
      if (s.capped > 0)
        ke(this, d, "f").warn(
          `delete cap reached: ${s.mode === "log_only" ? "would send" : "sent"} ${s.attempted} deletes, held ${s.capped} for later syncs`,
          { memory_store_id: e.memoryStoreId },
        );
    } catch (error) {
      ke(this, d, "f").warn("memory sync failed", { memory_store_id: e.memoryStoreId, error: String(error) });
    }
  }),
  (He = async function (e, t) {
    let n = new Map(),
      i = new Set(),
      o = async () => {
        if (e.readOnly) return;
        let s = await ke(this, u, "m", se).call(this, e);
        if (!s.markerOk) {
          ke(this, d, "f").warn(`${s.distrustReason}; not uploading anything from the memory store folder`, {
            root: e.files.root().path,
            memory_store_id: e.memoryStoreId,
          });
          return;
        }
        for (let [f, c] of Object.entries(s.files))
          if (c !== e.baseline.get(f) && e.refusedShas.get(f) !== c) (n.set(f, c), i.add(f));
        if (n.size === 0 || t?.aborted) return;
        let a = new Map();
        for await (let [f, c] of ke(this, u, "m", ie).call(this, e.memoryStoreId)) {
          if (t?.aborted) return;
          a.set(f, c);
        }
        let l = [];
        for (let f of [...n.keys()].sort()) {
          let c = n.get(f),
            h = e.baseline.get(f),
            y = a.get(f);
          if (y !== void 0 && y.content_sha256 === c) {
            (e.baseline.set(f, y.content_sha256), i.delete(f));
            continue;
          }
          if (y !== void 0 && y.content_sha256 !== h) {
            (ke(this, d, "f").warn(
              "memory changed both locally and remotely; the flush leaves the remote version",
              { path: f, memory_store_id: e.memoryStoreId },
            ),
              i.delete(f));
            continue;
          }
          l.push([f, c, y]);
        }
        await ke(this, u, "m", je).call(this, e, l, i, t);
      };
    try {
      if ((await Bt(o(), t), t?.aborted && i.size > 0))
        ke(this, d, "f").warn(
          `memory flush cut off part-way; ${i.size} of ${n.size} changed files had not finished uploading`,
          { memory_store_id: e.memoryStoreId },
        );
    } catch (error) {
      ke(this, d, "f").warn("memory flush failed", {
        memory_store_id: e.memoryStoreId,
        error: String(error),
      });
    }
  }),
  (Ee = async function (e, t) {
    (ke(this, d, "f").warn(`${t}; re-downloading the memory store folder instead of syncing`, {
      root: e.files.root().path,
      memory_store_id: e.memoryStoreId,
    }),
      await e.files.createRoot(),
      await ke(this, u, "m", Oe).call(this, e));
  }),
  (Oe = async function (e) {
    ((e.baseline = new Map()),
      e.pendingDeletes.clear(),
      await e.files.put(
        j,
        `version ${Ke}
${e.memoryStoreId}`,
      ));
    for await (let [t, n] of ke(this, u, "m", ie).call(this, e.memoryStoreId, "full"))
      if (await ke(this, u, "m", be).call(this, e, t, n.content ?? "")) e.baseline.set(t, n.content_sha256);
  }),
  (Pe = async function (e, t, n, i, o) {
    let s = e.baseline.get(t);
    if (i !== void 0) e.pendingDeletes.delete(t);
    if (!n) {
      if (i === void 0) {
        e.pendingDeletes.delete(t);
        return;
      }
      if (s !== void 0) {
        if (i === s) {
          let h = await ke(this, u, "m", We).call(this, e, t, s);
          if (h === void 0) return;
          if (h === s) return s;
          i = h;
        }
        if (e.readOnly)
          ke(this, d, "f").warn(
            "memory deleted remotely but edited locally; keeping the file, which a read-only store cannot push",
            { path: t, memory_store_id: e.memoryStoreId },
          );
        else if (e.refusedShas.get(t) !== i)
          ke(this, d, "f").info("memory deleted remotely but edited locally; re-creating it from the file", {
            path: t,
            memory_store_id: e.memoryStoreId,
          });
      }
      if (e.readOnly) return;
      if (e.refusedShas.get(t) === i) return;
      return await ke(this, u, "m", ne).call(this, e, t, i, void 0);
    }
    let content_sha256 = n.content_sha256,
      l = content_sha256 !== s,
      f = i !== void 0 && i !== s && i !== content_sha256,
      c = !e.readOnly && f;
    if (i === void 0 && s !== void 0) {
      if (l)
        (ke(this, d, "f").warn("memory deleted locally but changed remotely; restoring the remote version", {
          path: t,
          memory_store_id: e.memoryStoreId,
        }),
          e.pendingDeletes.delete(t),
          o.push([t, n]));
      return s;
    }
    if (l) {
      if (i === content_sha256) return content_sha256;
      if (f)
        ke(this, d, "f").warn("memory changed both locally and remotely; keeping the remote version", {
          path: t,
          memory_store_id: e.memoryStoreId,
        });
      return (o.push([t, n]), s);
    }
    if (c) {
      if (e.refusedShas.get(t) === i) return content_sha256;
      return (await ke(this, u, "m", ne).call(this, e, t, i, n)) ?? content_sha256;
    }
    return content_sha256;
  }),
  (We = async function (e, t, n) {
    let i;
    try {
      i = await e.files.hashFile(t);
    } catch (error) {
      if (!(error instanceof m) && !B(error)) throw error;
      return n;
    }
    if (i === null) return;
    if (i !== n) return i;
    try {
      await e.files.remove(t);
    } catch (error) {
      if (!(error instanceof m) && !B(error)) throw error;
      return (
        ke(this, d, "f").warn("failed to remove memory deleted remotely", {
          path: t,
          memory_store_id: e.memoryStoreId,
          error: String(error),
        }),
        n
      );
    }
    return;
  }),
  (be = async function (e, t, n) {
    try {
      await e.files.put(t, n);
    } catch (error) {
      if (!(error instanceof m) && !B(error)) throw error;
      return (
        ke(this, d, "f").warn("failed to write memory", {
          path: t,
          memory_store_id: e.memoryStoreId,
          error: String(error),
        }),
        !1
      );
    }
    return !0;
  }),
  (Ue = async function (e, t) {
    if (t.length === 0) return;
    let n = async (s, a) => {
        let l;
        try {
          l = await ke(this, I, "f").beta.memoryStores.memories.retrieve(a.id, {
            memory_store_id: e.memoryStoreId,
            view: "full",
          });
        } catch (error) {
          if (hJ(error, 404)) return;
          ke(this, d, "f").warn("failed to fetch memory content", {
            path: s,
            memory_store_id: e.memoryStoreId,
            error: String(error),
          });
          return;
        }
        if (await ke(this, u, "m", be).call(this, e, s, l.content ?? "")) e.baseline.set(s, l.content_sha256);
      },
      i = t[Symbol.iterator](),
      o = async () => {
        for (let [s, a] of i) await n(s, a);
      };
    await Promise.all(Array.from({ length: Math.min(Pt, t.length) }, o));
  }),
  (je = async function (e, t, n, i) {
    let o = t[Symbol.iterator](),
      s = async () => {
        for (let [a, l, f] of o) {
          if (i?.aborted) return;
          let c = await ke(this, u, "m", ne).call(this, e, a, l, f);
          if ((n.delete(a), c !== void 0)) e.baseline.set(a, c);
        }
      };
    await Promise.all(Array.from({ length: Math.min(Wt, t.length) }, s));
  }),
  (ie = async function* (e, t = "basic") {
    let n = t === "basic" ? Ct : Ft;
    for await (let i of ke(this, I, "f").beta.memoryStores.memories.list(e, { view: t, limit: n })) {
      if (i.type !== "memory") continue;
      let replaced = i.path.replace(/^\/+/, "");
      if (replaced === j) {
        ke(this, d, "f").warn("the server listed the reserved marker path; skipping", {
          path: i.path,
          memory_store_id: e,
        });
        continue;
      }
      yield [replaced, i];
    }
  }),
  (ne = async function r(e, t, n, i) {
    try {
      let o = await e.files.get(t);
      if (o === null) return;
      let s = decodeUtf8(o),
        a = i
          ? await ke(this, I, "f").beta.memoryStores.memories.update(i.id, {
              memory_store_id: e.memoryStoreId,
              content: s,
              precondition: { type: "content_sha256", content_sha256: i.content_sha256 },
            })
          : await ke(this, I, "f").beta.memoryStores.memories.create(e.memoryStoreId, {
              path: "/" + t,
              content: s,
            });
      return (e.refusedShas.delete(t), a.content_sha256);
    } catch (error) {
      if (i && hJ(error, 404)) return await ke(this, u, "m", r).call(this, e, t, n, void 0);
      let s = error instanceof m || hJ(error, 400) || hJ(error, 413);
      if (i && hJ(error, 409))
        ke(this, d, "f").warn(
          "memory changed both locally and remotely; the upload was refused and the local edit loses",
          { path: t, memory_store_id: e.memoryStoreId },
        );
      else if (s && n !== void 0)
        (e.refusedShas.set(t, n),
          ke(this, d, "f").warn(
            "the server rejected this memory file, so it stays un-synced until its content changes",
            { path: t, memory_store_id: e.memoryStoreId, rejection: String(error) },
          ));
      else
        ke(this, d, "f").warn("failed to upload memory", {
          path: t,
          memory_store_id: e.memoryStoreId,
          error: String(error),
        });
      return;
    }
  }),
  (Be = async function (e, t, n, i, o) {
    if (o.mode === "disabled") return (o.suppressed++, i);
    let s = e.pendingDeletes.get(t);
    if (s === void 0) ((s = Date.now()), e.pendingDeletes.set(t, s));
    if (!o.waiveWindow && Date.now() - s < Dt) return i;
    let a, l;
    try {
      ((a = (await e.files.hashFile(j)) === qe(e.memoryStoreId)), (l = (await e.files.hashFile(t)) === null));
    } catch (error) {
      if (!(error instanceof m) && !B(error)) throw error;
      a = l = !1;
    }
    if (!a) return i;
    if (!l) return (e.pendingDeletes.delete(t), i);
    if (!o.takeSlot()) return i;
    if (o.mode === "log_only")
      return (
        ke(this, d, "f").info("log-only: sync would delete this memory on the server", {
          path: t,
          memory_store_id: e.memoryStoreId,
        }),
        i
      );
    let f = await ke(this, u, "m", Ye).call(this, e, t, n, i);
    if (f === void 0) e.pendingDeletes.delete(t);
    return f;
  }),
  (Ye = async function (e, t, n, i) {
    try {
      await ke(this, I, "f").beta.memoryStores.memories.delete(n.id, {
        memory_store_id: e.memoryStoreId,
        expected_content_sha256: i,
      });
    } catch (error) {
      if (hJ(error, 404)) return;
      if (hJ(error, 409) || hJ(error, 412))
        ke(this, d, "f").warn("memory deleted locally but changed remotely; keeping the remote version", {
          path: t,
          memory_store_id: e.memoryStoreId,
        });
      else
        ke(this, d, "f").warn("failed to delete memory", {
          path: t,
          memory_store_id: e.memoryStoreId,
          error: String(error),
        });
      return i;
    }
    ke(this, d, "f").info("propagated local deletion", { path: t, memory_store_id: e.memoryStoreId });
    return;
  }));
//@ chunk-2cw52qnf.js:26148-26225 esm-fingerprint
function B(r) {
  return typeof r === "object" && r !== null && typeof r.code === "string";
}
//@ chunk-2cw52qnf.js:26225-26431 esm-fingerprint
async function Bt(r, e) {
  if (!e) {
    await r;
    return;
  }
  let t,
    promise = new Promise((i) => {
      if (((t = i), e.aborted)) i();
    });
  e.addEventListener("abort", t, { once: !0 });
  try {
    await Promise.race([r, promise]);
  } finally {
    e.removeEventListener("abort", t);
  }
}
//@ chunk-hwmsct5x.js:17254-17270 esm-layout
function Bt_hwms(e) {}
//@ chunk-hwmsct5x.js:17270-17462 esm-fingerprint
var sleepUnlessAborted = (ms, signal) =>
  new Promise((r) => {
    if (signal?.aborted) return r();
    let s = () => {
        (clearTimeout(h), r());
      },
      h = setTimeout(() => {
        (signal?.removeEventListener("abort", s), r());
      }, ms);
    signal?.addEventListener("abort", s, { once: !0 });
  });

export { sleepUnlessAborted, Bt_hwms };
