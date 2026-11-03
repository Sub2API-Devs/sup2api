/**
 * services/api/sessionFlags.ts
 *
 * 2.1.316 新增：会话标志合并与权限模式同步
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (13)
 * attribution: placement 13
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-hwmsct5x.js:254646-254668 placement
/**
 * 按宿主保存的会话标志读取器集合与会话标志持有者（合并、清空）。
 */
class SessionFlagsReaders {
  readers = null;
}
//@ chunk-hwmsct5x.js:254668-254693 placement
var sessionFlagReadersSlot = new HostScoped(() => new SessionFlagsReaders());
//@ chunk-hwmsct5x.js:254693-254730 placement
function sessionFlagReaders() {
  return sessionFlagReadersSlot.of(getRootSession().host);
}
//@ chunk-hwmsct5x.js:254730-254764 placement
function getSessionFlagReaders() {
  return sessionFlagReaders().readers;
}
//@ chunk-hwmsct5x.js:254764-254795 placement
/**
 * 导出函数 `setSessionFlagReaders`：参数 e。
 */
function setSessionFlagReaders(readers) {
  sessionFlagReaders().readers = readers;
}
//@ chunk-hwmsct5x.js:254795-254915 placement
class SessionFlagsHolder {
  context = null;
  get() {
    return this.context;
  }
  merge(e) {
    this.context = {
      ...this.context,
      ...e,
    };
  }
  clear() {
    this.context = null;
  }
}
//@ chunk-hwmsct5x.js:254915-254940 placement
var sessionFlagsSlot = new HostScoped(() => new SessionFlagsHolder());
//@ chunk-hwmsct5x.js:254940-254977 placement
function sessionFlags() {
  return sessionFlagsSlot.of(getRootSession().host);
}
//@ chunk-hwmsct5x.js:254977-255040 placement
function mergeSessionFlags(e) {
  if (e === null) {
    sessionFlags().clear();
    return;
  }
  sessionFlags().merge(e);
}
//@ chunk-hwmsct5x.js:255040-255073 placement
function getSessionFlags() {
  return sessionFlags().get();
}
//@ chunk-hwmsct5x.js:255073-255095 placement
/**
 * 导出函数 `noopSyncPermissionMode`。
 */
function noopSyncPermissionMode() {
  return;
}
//@ chunk-hwmsct5x.js:255095-255112 placement
/**
 * 导出函数 `noopMergeSessionFlags`：参数 e。
 */
function noopMergeSessionFlags(e) {}
//@ chunk-hwmsct5x.js:255112-255197 placement
function syncSessionPermissionMode(currentPermissionMode) {
  if (!sessionFlags().get()?.permissionMode) return;
  mergeSessionFlags({
    currentPermissionMode,
  });
}
export {
  syncSessionPermissionMode,
  noopSyncPermissionMode,
  noopMergeSessionFlags,
  mergeSessionFlags,
  setSessionFlagReaders,
  getSessionFlags,
  getSessionFlagReaders,
};
