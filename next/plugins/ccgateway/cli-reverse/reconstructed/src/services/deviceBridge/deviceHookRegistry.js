/**
 * services/deviceBridge/deviceHookRegistry.ts
 *
 * 2.1.316 新增：设备钩子注册表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bgt3cm0p.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../../utils/debug.js";
import { toError } from "../../utils/errors.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";

//@ chunk-bgt3cm0p.js:745-753 placement
/**
 * 记录设备 hook 名样本时的次数上限（2）。
 */
var MAX_NAME_SAMPLES = 2;
//@ chunk-bgt3cm0p.js:753-1902 placement
function createDeviceHookRegistry(options) {
  let owner = null;
  let leaseTimer = null;
  let missCount = 0;
  let away = false;
  let awaySinceMs = null;
  let generation = 0;
  let leaseListeners = [];
  let clearLeaseTimer = () => {
    leaseTimer?.clear();
    leaseTimer = null;
  };
  let armLeaseTimer = () => {
    clearLeaseTimer();
    if (owner === null) return;
    let ownerAtArm = owner;
    leaseTimer = options.setTimer(
      () => {
        leaseTimer = null;
        if (owner !== ownerAtArm) return;
        if (options.now() < ownerAtArm.leaseExpiresAt) {
          armLeaseTimer();
          return;
        }
        let expiredOwner = {
          ...ownerAtArm,
          entries: [],
        };
        owner = expiredOwner.templates.length === 0 ? null : expiredOwner;
        for (let listener of [...(options.onLeaseExpired ? [options.onLeaseExpired] : []), ...leaseListeners])
          try {
            listener(expiredOwner);
          } catch (error) {
            logForDebugging(
              `[deviceHooks] lease-expiry listener threw: ${toError(error).stack ?? String(error)}`,
              {
                level: "error",
              },
            );
          }
      },
      Math.min(MAX_TIMER_DELAY_MS, Math.max(0, ownerAtArm.leaseExpiresAt - options.now())),
    );
  };
  return {
    current: () => owner,
    generation: () => generation,
    recordMiss(instanceId, generationAtCall) {
      if (owner === null || owner.instanceId !== instanceId || generationAtCall !== generation) return false;
      missCount += 1;
      if (!away && missCount >= MAX_NAME_SAMPLES) {
        away = true;
        awaySinceMs = options.now();
      }
      return away;
    },
    recordHit(instanceId) {
      if (owner !== null && owner.instanceId === instanceId) missCount = 0;
    },
    isAway: (instanceId) => owner !== null && owner.instanceId === instanceId && away,
    awaySince: (instanceId) =>
      owner !== null && owner.instanceId === instanceId && away ? awaySinceMs : null,
    replaceOwner(nextOwner) {
      let instanceId =
        owner !== null && owner.instanceId !== nextOwner.instanceId ? owner.instanceId : undefined;
      let keptOwner = owner !== null && instanceId === undefined;
      let previousAwaySince = keptOwner && away ? awaySinceMs : null;
      owner = nextOwner;
      if (!keptOwner || previousAwaySince !== null) {
        missCount = 0;
        away = false;
        awaySinceMs = null;
      }
      generation += 1;
      armLeaseTimer();
      return {
        ...(instanceId !== undefined && {
          replaced: instanceId,
        }),
        ...(previousAwaySince !== null && {
          awaySince: previousAwaySince,
        }),
      };
    },
    removeOwner(instanceId) {
      if (owner === null || owner.instanceId !== instanceId) return false;
      owner = null;
      missCount = 0;
      away = false;
      awaySinceMs = null;
      clearLeaseTimer();
      return true;
    },
    clear() {
      owner = null;
      missCount = 0;
      away = false;
      awaySinceMs = null;
      clearLeaseTimer();
    },
    onLeaseExpired(listener) {
      leaseListeners.push(listener);
    },
  };
}
//@ chunk-bgt3cm0p.js:1902-1985 placement
function productionRegistryTimer(fn, delayMs) {
  let timer = setTimeout(fn, delayMs);
  timer.unref();
  return {
    clear: () => clearTimeout(timer),
  };
}
export { createDeviceHookRegistry, productionRegistryTimer };
