/**
 * services/api/sessionFlags.ts
 *
 * 2.1.316 新增：会话标志合并与权限模式同步
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vn3g7zt8.js:259740-259762 placement
/**
 * 按宿主保存的会话标志读取器集合与会话标志持有者（合并、清空）。
 */
class SessionFlagsReaders {
  readers = null;
}
//@ chunk-vn3g7zt8.js:259762-259787 placement
var sessionFlagReadersSlot; // deferred: uses SessionFlagsReaders of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-vn3g7zt8.js:259762", () => {
  sessionFlagReadersSlot = new HostScoped(() => new SessionFlagsReaders());
});
//@ chunk-vn3g7zt8.js:259787-259824 placement
function sessionFlagReaders() {
  return sessionFlagReadersSlot.of(getRootSession().host);
}
//@ chunk-vn3g7zt8.js:259824-259858 placement
function getSessionFlagReaders() {
  return sessionFlagReaders().readers;
}
//@ chunk-vn3g7zt8.js:259858-259889 placement
/**
 * 导出函数 `setSessionFlagReaders`：参数 e。
 */
function setSessionFlagReaders(readers) {
  sessionFlagReaders().readers = readers;
}
//@ chunk-vn3g7zt8.js:259889-260009 placement
class SessionFlagsHolder {
  context = null;
  get() {
    return this.context;
  }
  merge(flags) {
    this.context = {
      ...this.context,
      ...flags,
    };
  }
  clear() {
    this.context = null;
  }
}
//@ chunk-vn3g7zt8.js:260009-260034 placement
var sessionFlagsSlot; // deferred: uses SessionFlagsHolder of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-vn3g7zt8.js:260009", () => {
  sessionFlagsSlot = new HostScoped(() => new SessionFlagsHolder());
});
//@ chunk-vn3g7zt8.js:260034-260071 placement
function sessionFlags() {
  return sessionFlagsSlot.of(getRootSession().host);
}
//@ chunk-vn3g7zt8.js:260071-260134 placement
function mergeSessionFlags(source) {
  if (source === null) {
    sessionFlags().clear();
    return;
  }
  sessionFlags().merge(source);
}
//@ chunk-vn3g7zt8.js:260134-260167 placement
function getSessionFlags() {
  return sessionFlags().get();
}
//@ chunk-vn3g7zt8.js:260167-260189 placement
/**
 * 导出函数 `noopSyncPermissionMode`。
 */
function noopSyncPermissionMode() {
  return;
}
//@ chunk-vn3g7zt8.js:260189-260206 placement
/**
 * 导出函数 `noopMergeSessionFlags`：参数 e。
 */
function noopMergeSessionFlags(target) {}
//@ chunk-vn3g7zt8.js:260206-260291 placement
function syncSessionPermissionMode(currentPermissionMode) {
  if (!sessionFlags().get()?.permissionMode) return;
  mergeSessionFlags({
    currentPermissionMode,
  });
}
export {
  syncSessionPermissionMode,
  getSessionFlags,
  mergeSessionFlags,
  setSessionFlagReaders,
  noopSyncPermissionMode,
  noopMergeSessionFlags,
  getSessionFlagReaders,
};
