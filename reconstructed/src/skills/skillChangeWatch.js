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
import { ge } from "../utils/identity.js";
import { to } from "../utils/valueSlot.js";

/**
 * 按宿主保存技能变更监视状态的容器；清理时关闭正在进行的监视。
 */
//@ chunk-e6aww6q8.js:1663204-1663312 placement
var skillWatchStateByHost = ge(to(), (e) => {
  let n = e.get();
  if (n?.stage === "watching") n.watch.dispose().catch(() => {});
  e.set(void 0);
});
//@ chunk-e6aww6q8.js:1663312-1663348 placement
var KVs = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:1663348-1663398 placement
var VVs = ge(to(), (e) => {
  (e.get()?.(), e.set(void 0));
});
//@ chunk-e6aww6q8.js:1663398-1663434 placement
var D$o = ge(to(), (e) => e.set(void 0));

export { skillWatchStateByHost, KVs, VVs, D$o };
