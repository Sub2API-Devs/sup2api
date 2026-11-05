/**
 * utils/lastResumeRecord.ts
 *
 * 2.1.316 新增：记录最近一次恢复的结果
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qkfwfsdh.js (2)
 * attribution: placement 2
 */
import { HostScoped } from "./hostScoped.js";

//@ chunk-qkfwfsdh.js:226-267 placement
class LastResumeRecord {
  last = null;
  record(last) {
    this.last = last;
  }
}
//@ chunk-qkfwfsdh.js:267-292 placement
/**
 * 宿主隔离的"最近一次恢复结果"记录器。
 */
var lastResumeRecordRegistry = new HostScoped(() => new LastResumeRecord());
export { lastResumeRecordRegistry };
