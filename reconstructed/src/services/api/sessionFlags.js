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
class Ef {
  readers = null;
}
//@ chunk-hwmsct5x.js:254668-254693 placement
var py = new HostScoped(() => new Ef());
//@ chunk-hwmsct5x.js:254693-254730 placement
function vf() {
  return py.of(getRootSession().host);
}
//@ chunk-hwmsct5x.js:254730-254764 placement
function Rf() {
  return vf().readers;
}
//@ chunk-hwmsct5x.js:254764-254795 placement
function Lci(e) {
  vf().readers = e;
}
//@ chunk-hwmsct5x.js:254795-254915 placement
class SessionFlagsHolder {
  context = null;
  get() {
    return this.context;
  }
  merge(e) {
    this.context = { ...this.context, ...e };
  }
  clear() {
    this.context = null;
  }
}
//@ chunk-hwmsct5x.js:254915-254940 placement
var hy = new HostScoped(() => new SessionFlagsHolder());
//@ chunk-hwmsct5x.js:254940-254977 placement
function ki() {
  return hy.of(getRootSession().host);
}
//@ chunk-hwmsct5x.js:254977-255040 placement
function mergeSessionFlags(e) {
  if (e === null) {
    ki().clear();
    return;
  }
  ki().merge(e);
}
//@ chunk-hwmsct5x.js:255040-255073 placement
function getSessionFlags() {
  return ki().get();
}
//@ chunk-hwmsct5x.js:255073-255095 placement
function Hci() {
  return;
}
//@ chunk-hwmsct5x.js:255095-255112 placement
function KXo(e) {}
//@ chunk-hwmsct5x.js:255112-255197 placement
function syncSessionPermissionMode(e) {
  if (!ki().get()?.permissionMode) return;
  mergeSessionFlags({ currentPermissionMode: e });
}

export { syncSessionPermissionMode, Hci, KXo, mergeSessionFlags, Lci, getSessionFlags, Rf };
