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
import { currentPolicyNoticeHolder, getPolicyNotice } from "../services/policyLimits/cacheStamp.js";
import {
  init_react_production,
  createContext,
  useContext,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-55ht3bcx.js:5347-5413 fingerprint (2.1.88 match: useTasksV2, 0.488)
var useTasksV2 = {
  subscribe: (listener) => currentPolicyNoticeHolder().changed.subscribe(listener),
  getSnapshot: getPolicyNotice,
};
//@ chunk-0n43rj0b.js:691-695 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0n43rj0b.js:691", () => {
  init_react_production();
});
//@ chunk-0n43rj0b.js:722-745 layout
var TASK_LIST_POLL_MS = 5000;
var MAX_RENDERED_TASKS = 50;
var TASK_REFRESH_MS = 5000;
//@ chunk-0n43rj0b.js:745-4964 callgraph-fingerprint (2.1.88 match: TasksV2Store, 0.214)
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
  constructor(storageV5, globals = globalThis, onHiddenChange = () => {}) {
    this.#r = isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined;
    this.#s = globals;
    this.#E = onHiddenChange;
  }
  #w(hidden) {
    let wasHidden = this.#d;
    this.#d = hidden;
    if (hidden && !wasHidden) this.#E();
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
  #F(taskListId) {
    if (this.#r) {
      this.#T(this.#r, taskListId, false);
      return;
    }
    let taskOutputDir = getTaskOutputDir(taskListId);
    if (taskOutputDir === this.#f && this.#n !== null) return;
    this.#n?.close();
    this.#n = null;
    this.#f = taskOutputDir;
    try {
      let watcher = watch(taskOutputDir, this.#h);
      watcher.on("error", (error) => {
        logForDebugging(`Task list watcher error: ${errorMessage(error)}`, {
          level: "warn",
        });
        if (this.#n === watcher) {
          this.#f = null;
          this.#i = true;
          if (this.#t === null) {
            this.#t = this.#s.setTimeout(this.#h, TASK_REFRESH_MS);
            this.#t.unref();
          }
        }
      });
      watcher.unref();
      this.#n = watcher;
      this.#i = false;
    } catch {}
  }
  #T(storageV5, listId, isRetry) {
    let current = this.#e;
    if (current.phase !== "idle" && current.listId === listId && !isRetry) return;
    if (current.phase === "live") current.subscription.unsubscribe();
    let generation = ++this.#m;
    this.#e = {
      phase: "subscribing",
      listId,
      generation,
      endedEarly: false,
    };
    this.#i = true;
    this.#u();
    let settle = (subscription, error) => {
      if (generation !== this.#m) {
        subscription?.unsubscribe();
        return;
      }
      let current = this.#e;
      if (subscription && current.phase === "subscribing" && current.endedEarly) {
        subscription.unsubscribe();
        if (isRetry) this.#v(listId);
        else this.#T(storageV5, listId, true);
        return;
      }
      if (subscription) {
        this.#e = {
          phase: "live",
          listId,
          generation,
          subscription,
          onRetry: isRetry,
        };
        this.#i = false;
        this.#h();
        return;
      }
      logForDebugging(`Task list subscription unavailable: ${error}`, {
        level: "warn",
      });
      if (isRetry) {
        this.#v(listId);
        return;
      }
      this.#e = {
        phase: "idle",
      };
      this.#i = true;
      this.#u();
    };
    let pending;
    try {
      pending = storageV5.subscribe(
        {
          target: "scope",
          scope: {
            namespace: "task",
            listId: sanitizePathComponent(listId),
          },
        },
        (change) => this.#x(change, generation),
      );
    } catch (error) {
      settle(null, errorMessage(error));
      return;
    }
    pending.then(
      (result) => (result.ok ? settle(result.value) : settle(null, formatStorageError(result.error))),
      (error) => settle(null, errorMessage(error)),
    );
  }
  #x(change, generation) {
    let current = this.#e;
    if (current.phase === "subscribing" && current.generation === generation && !change.ok) {
      current.endedEarly = true;
      return;
    }
    if (!this.#a || current.phase !== "live" || current.generation !== generation) return;
    if (change.ok) {
      current.onRetry = false;
      this.#h();
      return;
    }
    logForDebugging(`Task list subscription ended: ${formatStorageError(change.error)}`, {
      level: "warn",
    });
    if (current.onRetry || !this.#r) {
      current.subscription.unsubscribe();
      this.#v(current.listId);
      return;
    }
    this.#T(this.#r, current.listId, true);
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
    let generation = ++this.#R;
    let taskListId = getTaskListId();
    this.#F(taskListId);
    let tasks;
    try {
      tasks = await listTasksForStore(taskListId, this.#r);
    } catch (error) {
      logForDebugging(`Task list read failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      tasks = null;
    }
    if (this.#r && generation < this.#S) return;
    this.#S = generation;
    if (tasks === null) {
      if (this.#a) {
        this.#i = true;
        this.#u();
      }
      return;
    }
    if (this.#e.phase === "live") this.#i = false;
    let filtered = tasks.filter((task) => !task.metadata?._internal);
    if (!this.#a) return;
    let any = filtered.some((task) => task.status !== "completed");
    let changed = !areTaskListsEqual(this.#c, filtered);
    if (changed) this.#c = filtered;
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
    if (changed) this.#V();
    if (this.#t) {
      this.#s.clearTimeout(this.#t);
      this.#t = null;
    }
    if (any || this.#i) {
      if (this.#e.phase === "live") return;
      this.#u();
    }
  };
  #B(expectedListId) {
    this.#o = null;
    let taskListId = getTaskListId();
    if (taskListId !== expectedListId) return;
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
var taskListSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var noopTaskListener;
deferInit("chunk-0n43rj0b.js:4964", () => {
  taskListSignal = createContext(null);
  noopTaskListener = () => {};
});
//@ chunk-0n43rj0b.js:4990-5228 placement
function useTasksV2StoreIfEnabled() {
  let store = useContext(taskListSignal);
  let teamContext = useAppState((appState) => appState.teamContext);
  if (!(areTaskToolsEnabled() && !getIsRemoteMode() && (!teamContext || isTeamLead(teamContext))))
    return null;
  if (!store)
    throw ReferenceError(
      "useTasksV2 cannot be called outside of a TasksV2StoreContext provider (mounted by <AppStateProvider />)",
    );
  return store;
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
  useEffect(() => {
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
//@ chunk-0n43rj0b.js:5367-5681 placement (2.1.88 match: TaskSchema, 0.644)
/**
 * 两个任务数组逐字段相等（useTasksV2 避免无谓重渲染）。
 */
function areTaskListsEqual(previous, next) {
  if (previous === undefined || previous.length !== next.length) return false;
  for (let idx = 0; idx < next.length; idx++) {
    let a = previous[idx];
    let b = next[idx];
    if (
      a.id !== b.id ||
      a.status !== b.status ||
      a.subject !== b.subject ||
      a.activeForm !== b.activeForm ||
      a.owner !== b.owner ||
      a.description !== b.description ||
      !arraysShallowEqual(a.blockedBy, b.blockedBy) ||
      !arraysShallowEqual(a.blocks, b.blocks)
    )
      return false;
  }
  return true;
}
export {
  useTaskListSubscription,
  useHasTaskSelection,
  useTaskListSnapshot,
  useTasksV2,
  TasksV2Store,
  taskListSignal,
};
