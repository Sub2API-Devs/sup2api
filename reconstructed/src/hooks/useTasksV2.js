/**
 * hooks/useTasksV2.ts
 *
 * TasksV2Store：订阅任务列表文件变化，提供 useTasksV2 与折叠联动。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTasksV2.ts
 * pieces: chunk-0n43rj0b.js (9), chunk-55ht3bcx.js (1)
 * attribution: placement 7, layout 1, callgraph-fingerprint 1, fingerprint 1
 */
import { watch } from "fs";
import { j, qt, Se, P } from "../../vendor/react/cjs/react.production.js";
import { errorMessage, getErrnoCode, isSadFsErrno, isEnvFsErrno } from "../utils/errors.js";
import { logError } from "../utils/log.js";
import { logForDebugging } from "../utils/debug.js";
import { createSignal } from "../utils/signal.js";
import {
  S,
  arraysShallowEqual,
  getTaskOutputDir,
  sanitizePathComponent,
  getTaskListId,
  Iii,
  listTasks,
  resetTaskList,
  Wue,
} from "../utils/tasks.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { onTaskListUpdated } from "../utils/swarm/teammateMessageRepair.js";
import { formatStorageError } from "../utils/storage/storageErrors.js";
import { useAppState } from "../state/AppState.js";
import { getIsRemoteMode } from "../bootstrap/state.js";
import { isTeamLead } from "../utils/teammate.js";
import { useStoreSelector } from "./useStoreSelector.js";
import { w, DRt } from "../services/policyLimits/cacheStamp.js";

//@ chunk-0n43rj0b.js:691-695 placement
j();
//@ chunk-0n43rj0b.js:722-745 layout
var g = 5000,
  T = 50,
  f = 5000;
//@ chunk-0n43rj0b.js:745-4964 callgraph-fingerprint = TasksV2Store (0.214)
class TasksV2Store {
  #c = void 0;
  #d = !1;
  #n = null;
  #f = null;
  #i = !1;
  #o = null;
  #p = !1;
  #l = null;
  #t = null;
  #b = null;
  #y = createSignal();
  #g = 0;
  #a = !1;
  #r;
  #s;
  #e = { phase: "idle" };
  #R = 0;
  #S = 0;
  #m = 0;
  #E;
  constructor(s, i = globalThis, e = () => {}) {
    ((this.#r = isStorageV5Enabled() && s !== void 0 ? s : void 0), (this.#s = i), (this.#E = e));
  }
  #w(s) {
    let i = this.#d;
    if (((this.#d = s), s && !i)) this.#E();
  }
  getSnapshot = () => (this.#d ? void 0 : this.#c);
  subscribe = (s) => {
    let subscribe = this.#y.subscribe(s);
    if ((this.#g++, !this.#a)) ((this.#a = !0), (this.#b = onTaskListUpdated(this.#h)), this.#k());
    let e = !1;
    return () => {
      if (e) return;
      if (((e = !0), subscribe(), this.#g--, this.#g === 0)) this.#L();
    };
  };
  #V() {
    this.#y.emit();
  }
  #F(s) {
    if (this.#r) {
      this.#T(this.#r, s, !1);
      return;
    }
    let i = getTaskOutputDir(s);
    if (i === this.#f && this.#n !== null) return;
    (this.#n?.close(), (this.#n = null), (this.#f = i));
    try {
      let e = watch(i, this.#h);
      (e.on("error", (r) => {
        if (
          (logForDebugging(`Task list watcher error: ${errorMessage(r)}`, { level: "warn" }), this.#n === e)
        ) {
          if (((this.#f = null), (this.#i = !0), this.#t === null))
            ((this.#t = this.#s.setTimeout(this.#h, f)), this.#t.unref());
        }
      }),
        e.unref(),
        (this.#n = e),
        (this.#i = !1));
    } catch {}
  }
  #T(s, i, e) {
    let r = this.#e;
    if (r.phase !== "idle" && r.listId === i && !e) return;
    if (r.phase === "live") r.subscription.unsubscribe();
    let n = ++this.#m;
    ((this.#e = { phase: "subscribing", listId: i, generation: n, endedEarly: !1 }),
      (this.#i = !0),
      this.#u());
    let h = (o, p) => {
        if (n !== this.#m) {
          o?.unsubscribe();
          return;
        }
        let c = this.#e;
        if (o && c.phase === "subscribing" && c.endedEarly) {
          if ((o.unsubscribe(), e)) this.#v(i);
          else this.#T(s, i, !0);
          return;
        }
        if (o) {
          ((this.#e = { phase: "live", listId: i, generation: n, subscription: o, onRetry: e }),
            (this.#i = !1),
            this.#h());
          return;
        }
        if ((logForDebugging(`Task list subscription unavailable: ${p}`, { level: "warn" }), e)) {
          this.#v(i);
          return;
        }
        ((this.#e = { phase: "idle" }), (this.#i = !0), this.#u());
      },
      a;
    try {
      a = s.subscribe(
        { target: "scope", scope: { namespace: "task", listId: sanitizePathComponent(i) } },
        (o) => this.#x(o, n),
      );
    } catch (error) {
      h(null, errorMessage(error));
      return;
    }
    a.then(
      (o) => (o.ok ? h(o.value) : h(null, formatStorageError(o.error))),
      (o) => h(null, errorMessage(o)),
    );
  }
  #x(s, i) {
    let e = this.#e;
    if (e.phase === "subscribing" && e.generation === i && !s.ok) {
      e.endedEarly = !0;
      return;
    }
    if (!this.#a || e.phase !== "live" || e.generation !== i) return;
    if (s.ok) {
      ((e.onRetry = !1), this.#h());
      return;
    }
    if (
      (logForDebugging(`Task list subscription ended: ${formatStorageError(s.error)}`, { level: "warn" }),
      e.onRetry || !this.#r)
    ) {
      (e.subscription.unsubscribe(), this.#v(e.listId));
      return;
    }
    this.#T(this.#r, e.listId, !0);
  }
  #v(s) {
    (this.#m++, (this.#e = { phase: "givenUp", listId: s }), (this.#i = !0), this.#h());
  }
  #u() {
    if (!this.#a) return;
    if (this.#t) this.#s.clearTimeout(this.#t);
    ((this.#t = this.#s.setTimeout(this.#h, f)), this.#t.unref());
  }
  #h = () => {
    if (this.#l) this.#s.clearTimeout(this.#l);
    ((this.#l = this.#s.setTimeout(() => void this.#k(), T)), this.#l.unref());
  };
  refetch = () => this.#k();
  #k = async () => {
    let s = ++this.#R,
      i = getTaskListId();
    this.#F(i);
    let e;
    try {
      e = await Iii(i, this.#r);
    } catch (error) {
      (logForDebugging(`Task list read failed: ${errorMessage(error)}`, { level: "warn" }), (e = null));
    }
    if (this.#r && s < this.#S) return;
    if (((this.#S = s), e === null)) {
      if (this.#a) ((this.#i = !0), this.#u());
      return;
    }
    if (this.#e.phase === "live") this.#i = !1;
    let filtered = e.filter((a) => !a.metadata?._internal);
    if (!this.#a) return;
    let any = filtered.some((a) => a.status !== "completed"),
      h = !areTaskListsEqual(this.#c, filtered);
    if (h) this.#c = filtered;
    if (any || filtered.length === 0) (this.#w(filtered.length === 0), this.#C());
    else if (this.#o === null && !this.#d)
      if (this.#p)
        logForDebugging("Task list reset still in flight; not arming another hide until it settles", {
          level: "verbose",
        });
      else ((this.#o = this.#s.setTimeout(this.#B.bind(this, i), g)), this.#o.unref());
    if (h) this.#V();
    if (this.#t) (this.#s.clearTimeout(this.#t), (this.#t = null));
    if (any || this.#i) {
      if (this.#e.phase === "live") return;
      this.#u();
    }
  };
  #B(s) {
    this.#o = null;
    let i = getTaskListId();
    if (i !== s) return;
    ((this.#p = !0),
      listTasks(i, this.#r)
        .then(async (e) => {
          if (e.length > 0 && e.every((n) => n.status === "completed") && (await resetTaskList(i, this.#r)))
            ((this.#c = []), this.#w(!0));
          this.#V();
        })
        .catch((e) => {
          if (this.#r) this.#u();
          if (getErrnoCode(e) === "ELOCKED") {
            logForDebugging(
              "Task list lock is busy (another session or process sharing this task list, or an in-flight task write, holds it); completed tasks stay visible and the reset is retried on the next refresh",
            );
            return;
          }
          if (isSadFsErrno(e) || isEnvFsErrno(e)) {
            logForDebugging(
              `Task list reset failed on the tasks directory and will be retried on the next refresh: ${errorMessage(e)}`,
              { level: "warn" },
            );
            return;
          }
          logError(e);
        })
        .finally(() => {
          this.#p = !1;
        }));
  }
  #C() {
    if (this.#o) (this.#s.clearTimeout(this.#o), (this.#o = null));
  }
  #L() {
    if ((this.#n?.close(), (this.#n = null), this.#e.phase === "live")) this.#e.subscription.unsubscribe();
    if (
      ((this.#e = { phase: "idle" }),
      this.#m++,
      (this.#f = null),
      this.#b?.(),
      (this.#b = null),
      this.#C(),
      this.#l)
    )
      this.#s.clearTimeout(this.#l);
    if (this.#t) this.#s.clearTimeout(this.#t);
    ((this.#l = null), (this.#t = null), (this.#i = !1), (this.#a = !1));
  }
}
//@ chunk-0n43rj0b.js:4964-4990 placement
var fRr = qt(null),
  v = () => {};
//@ chunk-0n43rj0b.js:4990-5228 placement
function useTasksV2StoreIfEnabled() {
  let s = Se(fRr),
    i = useAppState((r) => r.teamContext);
  if (!(Wue() && !getIsRemoteMode() && (!i || isTeamLead(i)))) return null;
  if (!s)
    throw ReferenceError(
      "useTasksV2 cannot be called outside of a TasksV2StoreContext provider (mounted by <AppStateProvider />)",
    );
  return s;
}
//@ chunk-0n43rj0b.js:5228-5258 placement
function gye() {
  return useStoreSelector(useTasksV2StoreIfEnabled());
}
//@ chunk-0n43rj0b.js:5258-5331 placement
function C_o() {
  let s = useTasksV2StoreIfEnabled();
  P(() => {
    if (!s) return;
    return s.subscribe(v);
  }, [s]);
}
//@ chunk-0n43rj0b.js:5331-5367 placement
function QPs() {
  return useStoreSelector(useTasksV2StoreIfEnabled(), S) ?? !1;
}
/**
 * 两个任务数组逐字段相等（useTasksV2 避免无谓重渲染）。
 */
//@ chunk-0n43rj0b.js:5367-5681 placement = TaskSchema (0.644)
function areTaskListsEqual(s, i) {
  if (s === void 0 || s.length !== i.length) return !1;
  for (let e = 0; e < i.length; e++) {
    let r = s[e],
      n = i[e];
    if (
      r.id !== n.id ||
      r.status !== n.status ||
      r.subject !== n.subject ||
      r.activeForm !== n.activeForm ||
      r.owner !== n.owner ||
      r.description !== n.description ||
      !arraysShallowEqual(r.blockedBy, n.blockedBy) ||
      !arraysShallowEqual(r.blocks, n.blocks)
    )
      return !1;
  }
  return !0;
}
//@ chunk-55ht3bcx.js:5347-5413 fingerprint = useTasksV2 (0.488)
var useTasksV2 = { subscribe: (e) => w().changed.subscribe(e), getSnapshot: DRt };

export { C_o, QPs, gye, useTasksV2, TasksV2Store, fRr };
