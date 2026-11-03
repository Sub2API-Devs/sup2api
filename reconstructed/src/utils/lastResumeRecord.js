/**
 * utils/lastResumeRecord.ts
 *
 * 2.1.316 新增：记录最近一次恢复的结果
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a8yd8msx.js (2)
 * attribution: placement 2
 */
import { HostScoped } from "./hostScoped.js";

//@ chunk-a8yd8msx.js:226-267 placement
class e {
  last = null;
  record(s) {
    this.last = s;
  }
}
//@ chunk-a8yd8msx.js:267-292 placement
var loe = new HostScoped(() => new e());

export { loe };
