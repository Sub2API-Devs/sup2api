/**
 * services/deviceBridge/deviceHookRegistry.ts
 *
 * 2.1.316 新增：设备钩子注册表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-phgcpy6c.js (3)
 * attribution: placement 3
 */
import { logForDebugging } from "../../utils/debug.js";
import { toError } from "../../utils/errors.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";

//@ chunk-phgcpy6c.js:661-669 placement
/**
 * 记录设备 hook 名样本时的次数上限（2）。
 */
var MAX_NAME_SAMPLES = 2;
//@ chunk-phgcpy6c.js:669-1818 placement
function createDeviceHookRegistry(i) {
  let e = null;
  let l = null;
  let a = 0;
  let r = false;
  let s = null;
  let d = 0;
  let p = [];
  let m = () => {
    l?.clear();
    l = null;
  };
  let v = () => {
    m();
    if (e === null) return;
    let n = e;
    l = i.setTimer(
      () => {
        l = null;
        if (e !== n) return;
        if (i.now() < n.leaseExpiresAt) {
          v();
          return;
        }
        let o = {
          ...n,
          entries: [],
        };
        e = o.templates.length === 0 ? null : o;
        for (let u of [...(i.onLeaseExpired ? [i.onLeaseExpired] : []), ...p])
          try {
            u(o);
          } catch (error) {
            logForDebugging(
              `[deviceHooks] lease-expiry listener threw: ${toError(error).stack ?? String(error)}`,
              {
                level: "error",
              },
            );
          }
      },
      Math.min(MAX_TIMER_DELAY_MS, Math.max(0, n.leaseExpiresAt - i.now())),
    );
  };
  return {
    current: () => e,
    generation: () => d,
    recordMiss(n, o) {
      if (e === null || e.instanceId !== n || o !== d) return false;
      a += 1;
      if (!r && a >= MAX_NAME_SAMPLES) {
        r = true;
        s = i.now();
      }
      return r;
    },
    recordHit(n) {
      if (e !== null && e.instanceId === n) a = 0;
    },
    isAway: (n) => e !== null && e.instanceId === n && r,
    awaySince: (n) => (e !== null && e.instanceId === n && r ? s : null),
    replaceOwner(n) {
      let instanceId = e !== null && e.instanceId !== n.instanceId ? e.instanceId : undefined;
      let u = e !== null && instanceId === undefined;
      let c = u && r ? s : null;
      e = n;
      if (!u || c !== null) {
        a = 0;
        r = false;
        s = null;
      }
      d += 1;
      v();
      return {
        ...(instanceId !== undefined && {
          replaced: instanceId,
        }),
        ...(c !== null && {
          awaySince: c,
        }),
      };
    },
    removeOwner(n) {
      if (e === null || e.instanceId !== n) return false;
      e = null;
      a = 0;
      r = false;
      s = null;
      m();
      return true;
    },
    clear() {
      e = null;
      a = 0;
      r = false;
      s = null;
      m();
    },
    onLeaseExpired(n) {
      p.push(n);
    },
  };
}
//@ chunk-phgcpy6c.js:1818-1901 placement
function productionRegistryTimer(i, e) {
  let timer = setTimeout(i, e);
  timer.unref();
  return {
    clear: () => clearTimeout(timer),
  };
}
