/**
 * utils/hostAgentPolicy.ts
 *
 * 2.1.316 新增：宿主（SDK/嵌入方）对代理与后台能力的限制开关集合，以及按宿主/异步上下文存取策略。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5xbkq5z7.js (5)
 * attribution: placement 5
 */
import { AsyncLocalStorage } from "async_hooks";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";

//@ chunk-5xbkq5z7.js:309-2187 placement
/**
 * 宿主（SDK/嵌入方）对代理与后台能力的限制开关集合：禁用后台任务、后台代理启动、远程隔离、非沙箱命令、fork 子代理等，以及安装后台启动规则、stoppedByPerson、subagentSends 钩子。
 */
class HostAgentPolicy {
  #e = false;
  #s = false;
  #r = false;
  #a = false;
  #i = false;
  #d = false;
  #u = false;
  #l = false;
  #n;
  #g = false;
  #c = false;
  #b = false;
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
    this.#e = true;
  }
  setBackgroundShellsKeptElsewhere(e) {
    this.#c = e;
  }
  disableBackgroundAgentLaunch() {
    this.#s = true;
  }
  disableRemoteAgentIsolation() {
    this.#r = true;
  }
  installBackgroundLaunchRule(e) {
    if (!this.#e) throw Error("A background launch rule needs background tasks disabled first");
    if (typeof e.parameterDescription !== "string")
      throw Error("A background launch rule needs parameterDescription to be a string");
    if (this.#n !== undefined) throw Error("A background launch rule is already installed");
    let n = e.admitsMoves === true;
    if (n && typeof e.admitMove !== "function")
      throw Error("A background launch rule that admits moves needs admitMove to be a function");
    let t = e.launchesByDefault === true;
    this.#n = e;
    this.#g = t;
    this.#b = n;
  }
  disableBackgroundDeadline() {
    this.#i = true;
  }
  disableBackgroundCompletionNotice() {
    this.#d = true;
  }
  disableUnsandboxedCommands() {
    this.#a = true;
  }
  disableMessagingBeyondOwnAgents() {
    this.#u = true;
  }
  disableForkSubagent() {
    this.#l = true;
  }
  installStoppedByPerson(e) {
    if (this.#o !== undefined) throw Error("A stoppedByPerson question is already installed");
    this.#o = e;
  }
  installSubagentSends(e) {
    if (this.#t !== undefined) throw Error("SubagentSends is already installed");
    this.#t = e;
  }
}
//@ chunk-5xbkq5z7.js:2187-2212 placement
/**
 * 按宿主缓存 HostAgentPolicy 实例。
 */
var hostAgentPolicies = new HostScoped(() => new HostAgentPolicy());
//@ chunk-5xbkq5z7.js:2212-2262 placement = getAgentContext (1)
/**
 * 取当前（ALS 覆盖的或宿主默认的）HostAgentPolicy。
 */
function getHostAgentPolicy() {
  return hostAgentPolicyStorage.getStore() ?? hostAgentPolicies.of(getRootSession().host);
}
//@ chunk-5xbkq5z7.js:2262-2274 placement
var hostAgentPolicyStorage = new AsyncLocalStorage();
//@ chunk-5xbkq5z7.js:2274-2310 placement
/**
 * 在指定的 HostAgentPolicy 下运行函数。
 */
function runWithHostAgentPolicy(policy, fn) {
  return hostAgentPolicyStorage.run(policy, fn);
}
export { getHostAgentPolicy, runWithHostAgentPolicy, HostAgentPolicy };
