/**
 * skills/skillChangeWatch.ts
 *
 * 2.1.316 新增：技能目录变化监视
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { identity as identity_2 } from "../utils/identity.js";
import { createValueSlot } from "../utils/valueSlot.js";

//@ chunk-e6aww6q8.js:1663204-1663312 placement
/**
 * 按宿主保存技能变更监视状态的容器；清理时关闭正在进行的监视。
 */
var skillWatchStateByHost = identity_2(createValueSlot(), (slot) => {
  let state = slot.get();
  if (state?.stage === "watching") state.watch.dispose().catch(() => {});
  slot.set(undefined);
});
//@ chunk-e6aww6q8.js:1663312-1663348 placement
/**
 * 按 host 保存的技能监视状态（重置时置空）。
 */
var skillWatchStateSlot = identity_2(createValueSlot(), (slot) => slot.set(undefined));
//@ chunk-e6aww6q8.js:1663348-1663398 placement
/**
 * 技能监视状态的重置插槽（先清理当前值再置空）。
 */
var skillWatchStateResetSlot = identity_2(createValueSlot(), (slot) => {
  slot.get()?.();
  slot.set(undefined);
});
//@ chunk-e6aww6q8.js:1663398-1663434 placement
/**
 * 技能监视状态的清空插槽。
 */
var skillWatchStateClearSlot = identity_2(createValueSlot(), (slot) => slot.set(undefined));
export { skillWatchStateByHost, skillWatchStateSlot, skillWatchStateResetSlot, skillWatchStateClearSlot };
