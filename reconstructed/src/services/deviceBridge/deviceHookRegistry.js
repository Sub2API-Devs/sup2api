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
import { ec } from "../../utils/timerDelayClamp.js";

//@ chunk-phgcpy6c.js:661-669 placement
var y = 2;
//@ chunk-phgcpy6c.js:669-1818 placement
function createDeviceHookRegistry(i) {
  let e = null,
    l = null,
    a = 0,
    r = !1,
    s = null,
    d = 0,
    p = [],
    m = () => {
      (l?.clear(), (l = null));
    },
    v = () => {
      if ((m(), e === null)) return;
      let n = e;
      l = i.setTimer(
        () => {
          if (((l = null), e !== n)) return;
          if (i.now() < n.leaseExpiresAt) {
            v();
            return;
          }
          let o = { ...n, entries: [] };
          e = o.templates.length === 0 ? null : o;
          for (let u of [...(i.onLeaseExpired ? [i.onLeaseExpired] : []), ...p])
            try {
              u(o);
            } catch (error) {
              logForDebugging(
                `[deviceHooks] lease-expiry listener threw: ${toError(error).stack ?? String(error)}`,
                { level: "error" },
              );
            }
        },
        Math.min(ec, Math.max(0, n.leaseExpiresAt - i.now())),
      );
    };
  return {
    current: () => e,
    generation: () => d,
    recordMiss(n, o) {
      if (e === null || e.instanceId !== n || o !== d) return !1;
      if (((a += 1), !r && a >= y)) ((r = !0), (s = i.now()));
      return r;
    },
    recordHit(n) {
      if (e !== null && e.instanceId === n) a = 0;
    },
    isAway: (n) => e !== null && e.instanceId === n && r,
    awaySince: (n) => (e !== null && e.instanceId === n && r ? s : null),
    replaceOwner(n) {
      let o = e !== null && e.instanceId !== n.instanceId ? e.instanceId : void 0,
        u = e !== null && o === void 0,
        c = u && r ? s : null;
      if (((e = n), !u || c !== null)) ((a = 0), (r = !1), (s = null));
      return ((d += 1), v(), { ...(o !== void 0 && { replaced: o }), ...(c !== null && { awaySince: c }) });
    },
    removeOwner(n) {
      if (e === null || e.instanceId !== n) return !1;
      return ((e = null), (a = 0), (r = !1), (s = null), m(), !0);
    },
    clear() {
      ((e = null), (a = 0), (r = !1), (s = null), m());
    },
    onLeaseExpired(n) {
      p.push(n);
    },
  };
}
//@ chunk-phgcpy6c.js:1818-1901 placement
function productionRegistryTimer(i, e) {
  let l = setTimeout(i, e);
  return (l.unref(), { clear: () => clearTimeout(l) });
}
