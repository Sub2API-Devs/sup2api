/**
 * utils/envDynamic.ts
 *
 * 需要异步探测的环境信息（Docker、bubblewrap 沙箱、JetBrains 终端、musl）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/envDynamic.ts
 * pieces: chunk-9d1pf3s4.js (1), chunk-aepeg2w5.js (10), chunk-hvpfdswb.js (1), chunk-jhrww53q.js (1)
 * attribution: fingerprint 6, sole-consumer 2, affinity 1, layout 4
 */
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { hasInternetAccess_2, isDockerenvPresent, env, isDisklessEnvProbe } from "./env.js";
import { CCR_TOKEN_DIR } from "./authFileDescriptor.js";
import { getFsImplementation } from "./fsOperations.js";

//@ chunk-aepeg2w5.js:752249-752299 sole-consumer
var internetAccessProbe = new HostScoped(() => ({
  probe: undefined,
  outcome: undefined,
}));
//@ chunk-aepeg2w5.js:752299-752384 sole-consumer
function hasInternetAccess() {
  let e = internetAccessProbe.of(getRootSession().host);
  return (e.probe ??= hasInternetAccess_2().then((n) => {
    e.outcome = n;
    return n;
  }));
}
//@ chunk-aepeg2w5.js:752384-753511 affinity
/**
 * 环境探测：是否 Docker、bubblewrap 沙箱、沙箱外 root、受限无网容器，以及据此判断内部环境门控（结果缓存）。
 */
class EnvironmentProbe {
  sources;
  docker;
  containedNoInternet;
  antDspEnvGate;
  antDspEnvGateSettled;
  constructor(sources) {
    this.sources = sources;
  }
  isDocker() {
    return (this.docker ??= Promise.resolve(this.sources.isDockerenvPresent()));
  }
  isBubblewrapSandbox() {
    return this.sources.platform === "linux" && this.sources.isBubblewrapEnvSet();
  }
  isRootOutsideDeliberateSandbox() {
    return (
      this.sources.platform !== "win32" &&
      this.sources.getuid() === 0 &&
      !this.sources.isSandboxEnvSet() &&
      !this.sources.isBubblewrapEnvSet()
    );
  }
  isContainedNoInternet() {
    return (this.containedNoInternet ??= this.probeContainedNoInternet());
  }
  async probeContainedNoInternet() {
    if (!((await this.isDocker()) || this.isBubblewrapSandbox() || this.sources.isSandboxEnvSet()))
      return false;
    return !(await this.sources.hasInternetAccess());
  }
  passesAntDspEnvGate() {
    return (this.antDspEnvGate ??= this.evaluateAntDspEnvGate());
  }
  async evaluateAntDspEnvGate() {
    if (!(await this.isContainedNoInternet())) {
      this.antDspEnvGateSettled = false;
      return false;
    }
    this.antDspEnvGateSettled =
      (await this.sources.probeInternalNetworkAccess()) === null && !this.isRootOutsideDeliberateSandbox();
    return this.antDspEnvGateSettled;
  }
  passesAntDspEnvGateSync() {
    return this.antDspEnvGateSettled ?? false;
  }
}
//@ chunk-aepeg2w5.js:753511-753829 fingerprint = getIsBubblewrapSandbox (0.442)
var getIsBubblewrapSandbox_2 = new HostScoped(
  () =>
    new EnvironmentProbe({
      platform: "linux",
      isDockerenvPresent,
      isBubblewrapEnvSet: () => env.CLAUDE_CODE_BUBBLEWRAP,
      isSandboxEnvSet: () => process.env.IS_SANDBOX === "1",
      getuid: () => (typeof process.getuid === "function" ? process.getuid() : undefined),
      hasInternetAccess,
      probeInternalNetworkAccess: () => env.probeInternalNetworkAccess(),
    }),
);
//@ chunk-aepeg2w5.js:753829-753866 layout
function getIsBubblewrapSandbox() {
  return getIsBubblewrapSandbox_2.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:753866-753878 layout
var emptyHostFlag = null;
//@ chunk-aepeg2w5.js:753878-753901 layout
function isMuslEnvironment() {
  return false;
}
//@ chunk-aepeg2w5.js:753901-753924 layout
function isAndroidEnvironment() {
  return false;
}
//@ chunk-aepeg2w5.js:753924-754397 fingerprint = getTerminalWithJetBrainsDetectionAsync (0.532)
var NON_INTERACTIVE_TERMINAL = "non-interactive";
var envDynamicProbe = {
  terminal:
    env.TERMINAL_EMULATOR === "JetBrains-JediTerm" && env.platform !== "darwin" ? "pycharm" : env.terminal,
  getIsDocker() {
    return getIsBubblewrapSandbox().isDocker();
  },
  getIsBubblewrapSandbox() {
    return getIsBubblewrapSandbox().isBubblewrapSandbox();
  },
  passesAntDspEnvGate() {
    return getIsBubblewrapSandbox().passesAntDspEnvGate();
  },
  passesAntDspEnvGateCached() {
    return getIsBubblewrapSandbox().passesAntDspEnvGateSync();
  },
  isRootOutsideDeliberateSandbox() {
    return getIsBubblewrapSandbox().isRootOutsideDeliberateSandbox();
  },
  isMuslEnvironment,
  isAndroidEnvironment,
};
//@ chunk-aepeg2w5.js:754397-754516 fingerprint = envDynamic (0.44)
async function envDynamic() {
  if (envDynamicProbe.getIsBubblewrapSandbox()) return "bubblewrap";
  if (await envDynamicProbe.getIsDocker()) return "docker";
  return;
}
//@ chunk-9d1pf3s4.js:518-747 fingerprint
/**
 * 平台与架构对应的 musl/darwin 目标三元组（如 x86_64-unknown-linux-musl），不支持时为 undefined。
 */
function muslTargetTriple(platform, e) {
  let n = e === "arm64" ? "aarch64" : e === "x64" ? "x86_64" : undefined;
  if (n === undefined) return;
  switch (platform) {
    case "macos":
      return `${n}-apple-darwin`;
    case "linux":
    case "wsl":
      return `${n}-unknown-linux-musl`;
    case "windows":
    case "unknown":
      return;
  }
}
//@ chunk-hvpfdswb.js:1601-1666 fingerprint = isMuslEnvironment (1)
function isMuslEnvironment_2(e) {
  return env.platform !== "linux" && e.startsWith(`${CCR_TOKEN_DIR}/`);
}
//@ chunk-jhrww53q.js:49897-49964 fingerprint = getIsDocker (0.479)
function getIsDocker() {
  if (isDisklessEnvProbe()) return false;
  return getFsImplementation().existsSync("/.dockerenv");
}
export {
  envDynamicProbe,
  getIsDocker,
  isMuslEnvironment_2,
  muslTargetTriple,
  envDynamic,
  NON_INTERACTIVE_TERMINAL,
};
