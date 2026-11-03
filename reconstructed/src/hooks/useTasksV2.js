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
import { init_react_production, qt, Se, P } from "../../vendor/react/cjs/react.production.js";
import { errorMessage, getErrnoCode, isSadFsErrno, isEnvFsErrno } from "../utils/errors.js";
import { logError } from "../utils/log.js";
import { logForDebugging } from "../utils/debug.js";
import { createSignal } from "../utils/signal.js";
import {
  isNonEmptyString,
  arraysShallowEqual,
  getTaskOutputDir,
  sanitizePathComponent,
  getTaskListId,
  listTasksForStore,
  listTasks,
  resetTaskList,
  areTaskToolsEnabled,
} from "../utils/tasks.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { onTaskListUpdated } from "../utils/swarm/teammateMessageRepair.js";
import { formatStorageError } from "../utils/storage/storageErrors.js";
import { useAppState } from "../state/AppState.js";
import { getIsRemoteMode } from "../bootstrap/state.js";
import { isTeamLead } from "../utils/teammate.js";
import { useStoreSelector } from "./useStoreSelector.js";
import { currentPolicyNoticeHolder, getPolicyNotice } from "../services/policyLimits/cacheStamp.js";

//@ chunk-0n43rj0b.js:691-695 placement
init_react_production();
//@ chunk-0n43rj0b.js:722-745 layout
var TASK_LIST_POLL_MS = 5000;
var MAX_RENDERED_TASKS = 50;
var TASK_REFRESH_MS = 5000;
//@ chunk-0n43rj0b.js:745-4964 callgraph-fingerprint = TasksV2Store (0.214)
class TasksV2Store {
  #c = undefined;
  #d = false;
  #n = null;
  #f = null;
  #i = false;
  #o = null;
  #p = false;
  #l = null;
  #t = null;
  #b = null;
  #y = createSignal();
  #g = 0;
  #a = false;
  #r;
  #s;
  #e = {
    phase: "idle",
  };
  #R = 0;
  #S = 0;
  #m = 0;
  #E;
  constructor(storageV5, i = globalThis, e = () => {}) {
    this.#r = isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined;
    this.#s = i;
    this.#E = e;
  }
  #w(s) {
    let i = this.#d;
    this.#d = s;
    if (s && !i) this.#E();
  }
  getSnapshot = () => (this.#d ? undefined : this.#c);
  subscribe = (fn) => {
    let unsubscribe = this.#y.subscribe(fn);
    this.#g++;
    if (!this.#a) {
      this.#a = true;
      this.#b = onTaskListUpdated(this.#h);
      this.#k();
    }
    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      unsubscribe();
      this.#g--;
      if (this.#g === 0) this.#L();
    };
  };
  #V() {
    this.#y.emit();
  }
  #F(s) {
    if (this.#r) {
      this.#T(this.#r, s, false);
      return;
    }
    let taskOutputDir = getTaskOutputDir(s);
    if (taskOutputDir === this.#f && this.#n !== null) return;
    this.#n?.close();
    this.#n = null;
    this.#f = taskOutputDir;
    try {
      let e = watch(taskOutputDir, this.#h);
      e.on("error", (r) => {
        logForDebugging(`Task list watcher error: ${errorMessage(r)}`, {
          level: "warn",
        });
        if (this.#n === e) {
          this.#f = null;
          this.#i = true;
          if (this.#t === null) {
            this.#t = this.#s.setTimeout(this.#h, TASK_REFRESH_MS);
            this.#t.unref();
          }
        }
      });
      e.unref();
      this.#n = e;
      this.#i = false;
    } catch {}
  }
  #T(s, i, e) {
    let r = this.#e;
    if (r.phase !== "idle" && r.listId === i && !e) return;
    if (r.phase === "live") r.subscription.unsubscribe();
    let n = ++this.#m;
    this.#e = {
      phase: "subscribing",
      listId: i,
      generation: n,
      endedEarly: false,
    };
    this.#i = true;
    this.#u();
    let h = (o, p) => {
      if (n !== this.#m) {
        o?.unsubscribe();
        return;
      }
      let c = this.#e;
      if (o && c.phase === "subscribing" && c.endedEarly) {
        o.unsubscribe();
        if (e) this.#v(i);
        else this.#T(s, i, true);
        return;
      }
      if (o) {
        this.#e = {
          phase: "live",
          listId: i,
          generation: n,
          subscription: o,
          onRetry: e,
        };
        this.#i = false;
        this.#h();
        return;
      }
      logForDebugging(`Task list subscription unavailable: ${p}`, {
        level: "warn",
      });
      if (e) {
        this.#v(i);
        return;
      }
      this.#e = {
        phase: "idle",
      };
      this.#i = true;
      this.#u();
    };
    let a;
    try {
      a = s.subscribe(
        {
          target: "scope",
          scope: {
            namespace: "task",
            listId: sanitizePathComponent(i),
          },
        },
        (o) => this.#x(o, n),
      );
    } catch (error) {
      h(null, errorMessage(error));
      return;
    }
    a.then(
      (o) => (o.ok ? h(o.value) : h(null, formatStorageError(o.error))),
      (error) => h(null, errorMessage(error)),
    );
  }
  #x(s, i) {
    let e = this.#e;
    if (e.phase === "subscribing" && e.generation === i && !s.ok) {
      e.endedEarly = true;
      return;
    }
    if (!this.#a || e.phase !== "live" || e.generation !== i) return;
    if (s.ok) {
      e.onRetry = false;
      this.#h();
      return;
    }
    logForDebugging(`Task list subscription ended: ${formatStorageError(s.error)}`, {
      level: "warn",
    });
    if (e.onRetry || !this.#r) {
      e.subscription.unsubscribe();
      this.#v(e.listId);
      return;
    }
    this.#T(this.#r, e.listId, true);
  }
  #v(listId) {
    this.#m++;
    this.#e = {
      phase: "givenUp",
      listId,
    };
    this.#i = true;
    this.#h();
  }
  #u() {
    if (!this.#a) return;
    if (this.#t) this.#s.clearTimeout(this.#t);
    this.#t = this.#s.setTimeout(this.#h, TASK_REFRESH_MS);
    this.#t.unref();
  }
  #h = () => {
    if (this.#l) this.#s.clearTimeout(this.#l);
    this.#l = this.#s.setTimeout(() => void this.#k(), MAX_RENDERED_TASKS);
    this.#l.unref();
  };
  refetch = () => this.#k();
  #k = async () => {
    let s = ++this.#R;
    let taskListId = getTaskListId();
    this.#F(taskListId);
    let e;
    try {
      e = await listTasksForStore(taskListId, this.#r);
    } catch (error) {
      logForDebugging(`Task list read failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      e = null;
    }
    if (this.#r && s < this.#S) return;
    this.#S = s;
    if (e === null) {
      if (this.#a) {
        this.#i = true;
        this.#u();
      }
      return;
    }
    if (this.#e.phase === "live") this.#i = false;
    let filtered = e.filter((a) => !a.metadata?._internal);
    if (!this.#a) return;
    let any = filtered.some((a) => a.status !== "completed");
    let h = !areTaskListsEqual(this.#c, filtered);
    if (h) this.#c = filtered;
    if (any || filtered.length === 0) {
      this.#w(filtered.length === 0);
      this.#C();
    } else if (this.#o === null && !this.#d)
      if (this.#p)
        logForDebugging("Task list reset still in flight; not arming another hide until it settles", {
          level: "verbose",
        });
      else {
        this.#o = this.#s.setTimeout(this.#B.bind(this, taskListId), TASK_LIST_POLL_MS);
        this.#o.unref();
      }
    if (h) this.#V();
    if (this.#t) {
      this.#s.clearTimeout(this.#t);
      this.#t = null;
    }
    if (any || this.#i) {
      if (this.#e.phase === "live") return;
      this.#u();
    }
  };
  #B(s) {
    this.#o = null;
    let taskListId = getTaskListId();
    if (taskListId !== s) return;
    this.#p = true;
    listTasks(taskListId, this.#r)
      .then(async (tasksToCheck) => {
        if (
          tasksToCheck.length > 0 &&
          tasksToCheck.every((t) => t.status === "completed") &&
          (await resetTaskList(taskListId, this.#r))
        ) {
          this.#c = [];
          this.#w(true);
        }
        this.#V();
      })
      .catch((error) => {
        if (this.#r) this.#u();
        if (getErrnoCode(error) === "ELOCKED") {
          logForDebugging(
            "Task list lock is busy (another session or process sharing this task list, or an in-flight task write, holds it); completed tasks stay visible and the reset is retried on the next refresh",
          );
          return;
        }
        if (isSadFsErrno(error) || isEnvFsErrno(error)) {
          logForDebugging(
            `Task list reset failed on the tasks directory and will be retried on the next refresh: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
          return;
        }
        logError(error);
      })
      .finally(() => {
        this.#p = false;
      });
  }
  #C() {
    if (this.#o) {
      this.#s.clearTimeout(this.#o);
      this.#o = null;
    }
  }
  #L() {
    this.#n?.close();
    this.#n = null;
    if (this.#e.phase === "live") this.#e.subscription.unsubscribe();
    this.#e = {
      phase: "idle",
    };
    this.#m++;
    this.#f = null;
    this.#b?.();
    this.#b = null;
    this.#C();
    if (this.#l) this.#s.clearTimeout(this.#l);
    if (this.#t) this.#s.clearTimeout(this.#t);
    this.#l = null;
    this.#t = null;
    this.#i = false;
    this.#a = false;
  }
}
//@ chunk-0n43rj0b.js:4964-4990 placement
/**
 * 导出值：同一声明里的多个绑定：taskListSignal（任务列表信号）；noopTaskListener（空实现）；位于「TasksV2Store：订阅任务列表文件变化，提供 useTasksV2 与折叠联动」模块。
 */
var taskListSignal = qt(null);
var noopTaskListener = () => {};
//@ chunk-0n43rj0b.js:4990-5228 placement
function useTasksV2StoreIfEnabled() {
  let s = Se(taskListSignal);
  let i = useAppState((r) => r.teamContext);
  if (!(areTaskToolsEnabled() && !getIsRemoteMode() && (!i || isTeamLead(i)))) return null;
  if (!s)
    throw ReferenceError(
      "useTasksV2 cannot be called outside of a TasksV2StoreContext provider (mounted by <AppStateProvider />)",
    );
  return s;
}
//@ chunk-0n43rj0b.js:5228-5258 placement
/**
 * 函数 useTaskListSnapshot（订阅任务列表）；位于「TasksV2Store：订阅任务列表文件变化，提供 useTasksV2 与折叠联动」模块。
 */
function useTaskListSnapshot() {
  return useStoreSelector(useTasksV2StoreIfEnabled());
}
//@ chunk-0n43rj0b.js:5258-5331 placement
/**
 * 函数 useTaskListSubscription（仅订阅不取值）；位于「TasksV2Store：订阅任务列表文件变化，提供 useTasksV2 与折叠联动」模块。
 */
function useTaskListSubscription() {
  let tasksV2StoreIfEnabled = useTasksV2StoreIfEnabled();
  P(() => {
    if (!tasksV2StoreIfEnabled) return;
    return tasksV2StoreIfEnabled.subscribe(noopTaskListener);
  }, [tasksV2StoreIfEnabled]);
}
//@ chunk-0n43rj0b.js:5331-5367 placement
/**
 * 函数 useHasTaskSelection（有选中任务）；位于「TasksV2Store：订阅任务列表文件变化，提供 useTasksV2 与折叠联动」模块。
 */
function useHasTaskSelection() {
  return useStoreSelector(useTasksV2StoreIfEnabled(), isNonEmptyString) ?? false;
}
//@ chunk-0n43rj0b.js:5367-5681 placement = TaskSchema (0.644)
/**
 * 两个任务数组逐字段相等（useTasksV2 避免无谓重渲染）。
 */
function areTaskListsEqual(s, i) {
  if (s === undefined || s.length !== i.length) return false;
  for (let idx = 0; idx < i.length; idx++) {
    let r = s[idx];
    let n = i[idx];
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
      return false;
  }
  return true;
}
//@ chunk-55ht3bcx.js:5347-5413 fingerprint = useTasksV2 (0.488)
var useTasksV2 = {
  subscribe: (e) => currentPolicyNoticeHolder().changed.subscribe(e),
  getSnapshot: getPolicyNotice,
};
export {
  useTaskListSubscription,
  useHasTaskSelection,
  useTaskListSnapshot,
  useTasksV2,
  TasksV2Store,
  taskListSignal,
};
