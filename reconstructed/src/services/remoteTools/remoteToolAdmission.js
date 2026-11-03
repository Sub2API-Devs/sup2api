/**
 * services/remoteTools/remoteToolAdmission.ts
 *
 * 2.1.316 新增：远程工具准入判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3qz57b12.js (6)
 * attribution: placement 6
 */
import { ensureDeviceSandboxPosture } from "../../remote/tools/deviceSandboxPosture.js";
import { isAbortError } from "../../utils/errors.js";

//@ chunk-3qz57b12.js:264-274 placement
/**
 * 远端工具默认的并发在飞上限。
 */
var DEFAULT_MAX_IN_FLIGHT = 4;
//@ chunk-3qz57b12.js:274-383 placement
/**
 * 创建简单的并发计数器：tryAcquire 在未满时占位并返回只能调用一次的释放函数。
 */
function createConcurrencyLimiter(e) {
  let o = 0;
  return {
    limit: e,
    tryAcquire() {
      if (o >= e) return;
      o++;
      let r = false;
      return () => {
        if (!r) {
          r = true;
          o--;
        }
      };
    },
  };
}
//@ chunk-3qz57b12.js:383-1090 placement
/**
 * 设备工具调用的准入：检查会话、设备绑定与模式是否有效，占用并发槽位，确认沙箱真正限制（文件系统与网络）后再执行；拒绝时生成说明，中止时返回 cancelled。
 */
function createAdmissionGate(options) {
  let readPosture = options.readPosture ?? ensureDeviceSandboxPosture;
  return {
    async admitWithoutSlot(toolName, s, t) {
      try {
        if (s.signal.aborted) return t.cancelled();
        let reason = admissionRefusal(options, s);
        if (reason !== undefined) return t.refuse(reason, admissionRefusalText(toolName, options, reason));
        return await t.serve();
      } catch (error) {
        return s.signal.aborted || isAbortError(error) ? t.cancelled() : t.fail(error);
      }
    },
    async run(toolName, s, t) {
      let n = (reason) => t.refuse(reason, admissionRefusalText(toolName, options, reason));
      let a;
      try {
        if (s.signal.aborted) return t.cancelled();
        let i = admissionRefusal(options, s);
        if (i !== undefined) return n(i);
        a = options.limiter.tryAcquire();
        if (a === undefined) return n("too_many_concurrent");
        let posture = await readPosture();
        if (!posture.confined) return n(posture.reason);
        let u = admissionRefusal(options, s);
        if (u !== undefined) return n(u);
        if (s.signal.aborted) return t.cancelled();
        return await t.serve();
      } catch (error) {
        return s.signal.aborted || isAbortError(error) ? t.cancelled() : t.fail(error);
      } finally {
        a?.();
      }
    },
  };
}
//@ chunk-3qz57b12.js:1090-1244 placement
function admissionRefusal(options, o) {
  if (o.sessionId === undefined) return "no_session";
  if (!options.getDeviceId()) return "unbound_device";
  if (!options.isModeCurrent()) return "mode_withdrawn";
  return;
}
//@ chunk-3qz57b12.js:1244-4682 placement
/**
 * 按准入拒绝原因（无会话、设备未绑定、模式已撤回、并发过多、沙箱未开启/不支持/启动失败/不够严格/被削弱/允许 Unix socket/缺 seccomp/注入凭证）生成给模型的说明。
 */
function admissionRefusalText(toolName, { limiter }, reason) {
  switch (reason) {
    case "no_session":
      return `${toolName} refused: no server-asserted session.`;
    case "unbound_device":
      return `${toolName} refused: this device is not bound to the session (it registered without a device id). Start the cloud session from this machine with claude --cloud so it registers as a bound device.`;
    case "mode_withdrawn":
      return `${toolName} refused: the user has since changed this directory's sync setting on their machine, so its files are no longer served through device tools in this session, and nothing was done. Tell the user; do not retry in a loop.`;
    case "too_many_concurrent":
      return `${toolName} refused: too many concurrent device tool calls on this device connection (limit ${limiter.limit}); retry after one finishes.`;
    case "sandbox_unavailable":
      return `${toolName} refused: sandboxing is not enabled on this device, and device tools are only served from a machine whose Claude Code sandbox is on. Ask the user to set "sandbox": {"enabled": true} in Claude Code settings on the device (check with /sandbox); do not retry until they have.`;
    case "sandbox_unsupported":
      return `${toolName} refused: sandboxing is enabled in settings on this device but unavailable here (an unsupported platform, or one excluded by an enabledPlatforms policy), so this device serves no device tools. Tell the user; do not retry in a loop.`;
    case "sandbox_failed_to_start":
      return `${toolName} refused: sandboxing is enabled on this device but failed to start. Ask the user to run /sandbox on the device to see why, fix it, and restart Claude Code there; retrying before that will keep failing.`;
    case "sandbox_unconfined":
      return `${toolName} refused: the sandbox on this device is not fully confining (filesystem and network). Ask the user to set "sandbox": {"enabled": true, "filesystem": {"disabled": false}} in Claude Code settings on the device and not to run it in subprocess-env-scrub mode; do not retry until they have.`;
    case "sandbox_weakened":
      return `${toolName} refused: the sandbox on this device is configured with a setting that weakens its isolation (sandbox.allowAppleEvents, sandbox.allowNestedUserNamespaces, sandbox.enableWeakerNestedSandbox, sandbox.enableWeakerNetworkIsolation, sandbox.network.allowLocalBinding, sandbox.network.allowMachLookup, or a sandbox.ripgrep override outside managed policy settings), so this device serves no device tools. Tell the user; do not retry in a loop.`;
    case "sandbox_allows_unix_sockets":
      return `${toolName} refused: the sandbox on this device allows connections to Unix sockets (sandbox.network.allowAllUnixSockets or allowUnixSockets), through which a command could reach services running outside the sandbox, so this device serves no device tools. Tell the user; do not retry in a loop.`;
    case "sandbox_seccomp_unavailable":
      return `${toolName} refused: the sandbox on this device cannot block connections to Unix sockets because the sandbox runtime found no seccomp filter helper it could run, so a command could reach services running outside the sandbox, and this device serves no device tools. Ask the user to open /sandbox on the device (its Dependencies tab shows the seccomp filter's status) and restart Claude Code there once it is fixed; do not retry until they have.`;
    case "sandbox_injects_credentials":
      return `${toolName} refused: this device's sandbox is configured to inject real credentials into sandboxed network requests (sandbox.credentials entries with mode "mask"), so this device serves no device tools. Tell the user; do not retry in a loop.`;
  }
}
//@ chunk-3qz57b12.js:4682-4738 placement
var CORE = "core";
var REMOTE_TOOLS = "remote-tools";
var MCP_PASSTHROUGH = "mcp-passthrough";
export {
  createConcurrencyLimiter,
  DEFAULT_MAX_IN_FLIGHT,
  createAdmissionGate,
  REMOTE_TOOLS,
  MCP_PASSTHROUGH,
  CORE,
};
