/**
 * utils/hostAgentPolicy.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5xbkq5z7.js (5)
 * attribution: placement 5
 */
import { AsyncLocalStorage } from "async_hooks";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";

/**
 * 宿主（SDK/嵌入方）对代理与后台能力的限制开关集合：禁用后台任务、后台代理启动、远程隔离、非沙箱命令、fork 子代理等，以及安装后台启动规则、stoppedByPerson、subagentSends 钩子。
 */
//@ chunk-5xbkq5z7.js:309-2187 placement
class HostAgentPolicy {
  #e = !1;
  #s = !1;
  #r = !1;
  #a = !1;
  #i = !1;
  #d = !1;
  #u = !1;
  #l = !1;
  #n;
  #g = !1;
  #c = !1;
  #b = !1;
  #o;
  #t;
  get backgroundTasksDisabled() {
    return this.#e;
  }
  get backgroundAgentLaunchDisabled() {
    return this.#s;
  }
  get remoteAgentIsolationDisabled() {
    return this.#r;
  }
  get unsandboxedCommandsDisabled() {
    return this.#a;
  }
  get backgroundDeadlineDisabled() {
    return this.#i;
  }
  get backgroundCompletionNoticeDisabled() {
    return this.#d;
  }
  get messagingBeyondOwnAgentsDisabled() {
    return this.#u;
  }
  get forkSubagentDisabled() {
    return this.#l;
  }
  get backgroundLaunchRule() {
    return this.#n;
  }
  get backgroundLaunchByDefault() {
    return this.#g;
  }
  get foregroundAgentMovesAdmitted() {
    return this.#b;
  }
  get subagentSends() {
    return this.#t;
  }
  get stoppedByPerson() {
    return this.#o;
  }
  get backgroundShellsKeptElsewhere() {
    return this.#c;
  }
  disableBackgroundTasks() {
    this.#e = !0;
  }
  setBackgroundShellsKeptElsewhere(e) {
    this.#c = e;
  }
  disableBackgroundAgentLaunch() {
    this.#s = !0;
  }
  disableRemoteAgentIsolation() {
    this.#r = !0;
  }
  installBackgroundLaunchRule(e) {
    if (!this.#e) throw Error("A background launch rule needs background tasks disabled first");
    if (typeof e.parameterDescription !== "string")
      throw Error("A background launch rule needs parameterDescription to be a string");
    if (this.#n !== void 0) throw Error("A background launch rule is already installed");
    let n = e.admitsMoves === !0;
    if (n && typeof e.admitMove !== "function")
      throw Error("A background launch rule that admits moves needs admitMove to be a function");
    let t = e.launchesByDefault === !0;
    ((this.#n = e), (this.#g = t), (this.#b = n));
  }
  disableBackgroundDeadline() {
    this.#i = !0;
  }
  disableBackgroundCompletionNotice() {
    this.#d = !0;
  }
  disableUnsandboxedCommands() {
    this.#a = !0;
  }
  disableMessagingBeyondOwnAgents() {
    this.#u = !0;
  }
  disableForkSubagent() {
    this.#l = !0;
  }
  installStoppedByPerson(e) {
    if (this.#o !== void 0) throw Error("A stoppedByPerson question is already installed");
    this.#o = e;
  }
  installSubagentSends(e) {
    if (this.#t !== void 0) throw Error("SubagentSends is already installed");
    this.#t = e;
  }
}
/**
 * 按宿主缓存 HostAgentPolicy 实例。
 */
//@ chunk-5xbkq5z7.js:2187-2212 placement
var hostAgentPolicies = new HostScoped(() => new HostAgentPolicy());
/**
 * 取当前（ALS 覆盖的或宿主默认的）HostAgentPolicy。
 */
//@ chunk-5xbkq5z7.js:2212-2262 placement = getAgentContext (1)
function getHostAgentPolicy() {
  return hostAgentPolicyStorage.getStore() ?? hostAgentPolicies.of(getRootSession().host);
}
//@ chunk-5xbkq5z7.js:2262-2274 placement
var hostAgentPolicyStorage = new AsyncLocalStorage();
/**
 * 在指定的 HostAgentPolicy 下运行函数。
 */
//@ chunk-5xbkq5z7.js:2274-2310 placement
function runWithHostAgentPolicy(policy, fn) {
  return hostAgentPolicyStorage.run(policy, fn);
}

export { getHostAgentPolicy, runWithHostAgentPolicy, HostAgentPolicy };
