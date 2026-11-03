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
import { hasInternetAccess, Rwr, env, p } from "./env.js";
import { CCR_TOKEN_DIR } from "./authFileDescriptor.js";
import { getFsImplementation } from "./fsOperations.js";

//@ chunk-aepeg2w5.js:752249-752299 sole-consumer
var lj = new HostScoped(() => ({ probe: void 0, outcome: void 0 }));
//@ chunk-aepeg2w5.js:752299-752384 sole-consumer
function hx() {
  let of = lj.of(getRootSession().host);
  return (of.probe ??= hasInternetAccess().then((n) => ((of.outcome = n), n)));
}
/**
 * 环境探测：是否 Docker、bubblewrap 沙箱、沙箱外 root、受限无网容器，以及据此判断内部环境门控（结果缓存）。
 */
//@ chunk-aepeg2w5.js:752384-753511 affinity
class EnvironmentProbe {
  sources;
  docker;
  containedNoInternet;
  antDspEnvGate;
  antDspEnvGateSettled;
  constructor(e) {
    this.sources = e;
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
    if (!((await this.isDocker()) || this.isBubblewrapSandbox() || this.sources.isSandboxEnvSet())) return !1;
    return !(await this.sources.hasInternetAccess());
  }
  passesAntDspEnvGate() {
    return (this.antDspEnvGate ??= this.evaluateAntDspEnvGate());
  }
  async evaluateAntDspEnvGate() {
    if (!(await this.isContainedNoInternet())) return ((this.antDspEnvGateSettled = !1), !1);
    return (
      (this.antDspEnvGateSettled =
        (await this.sources.probeInternalNetworkAccess()) === null && !this.isRootOutsideDeliberateSandbox()),
      this.antDspEnvGateSettled
    );
  }
  passesAntDspEnvGateSync() {
    return this.antDspEnvGateSettled ?? !1;
  }
}
//@ chunk-aepeg2w5.js:753511-753829 fingerprint = getIsBubblewrapSandbox (0.442)
var getIsBubblewrapSandbox = new HostScoped(
  () =>
    new EnvironmentProbe({
      platform: "linux",
      isDockerenvPresent: Rwr,
      isBubblewrapEnvSet: () => env.CLAUDE_CODE_BUBBLEWRAP,
      isSandboxEnvSet: () => process.env.IS_SANDBOX === "1",
      getuid: () => (typeof process.getuid === "function" ? process.getuid() : void 0),
      hasInternetAccess: hx,
      probeInternalNetworkAccess: () => env.probeInternalNetworkAccess(),
    }),
);
//@ chunk-aepeg2w5.js:753829-753866 layout
function gs() {
  return getIsBubblewrapSandbox.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:753866-753878 layout
var fj = null;
//@ chunk-aepeg2w5.js:753878-753901 layout
function pj() {
  return !1;
}
//@ chunk-aepeg2w5.js:753901-753924 layout
function mj() {
  return !1;
}
//@ chunk-aepeg2w5.js:753924-754397 fingerprint = getTerminalWithJetBrainsDetectionAsync (0.532)
var NON_INTERACTIVE_TERMINAL = "non-interactive",
  envDynamicProbe = {
    terminal:
      env.TERMINAL_EMULATOR === "JetBrains-JediTerm" && env.platform !== "darwin" ? "pycharm" : env.terminal,
    getIsDocker() {
      return gs().isDocker();
    },
    getIsBubblewrapSandbox() {
      return gs().isBubblewrapSandbox();
    },
    passesAntDspEnvGate() {
      return gs().passesAntDspEnvGate();
    },
    passesAntDspEnvGateCached() {
      return gs().passesAntDspEnvGateSync();
    },
    isRootOutsideDeliberateSandbox() {
      return gs().isRootOutsideDeliberateSandbox();
    },
    isMuslEnvironment: pj,
    isAndroidEnvironment: mj,
  };
//@ chunk-aepeg2w5.js:754397-754516 fingerprint = envDynamic (0.44)
async function envDynamic() {
  if (envDynamicProbe.getIsBubblewrapSandbox()) return "bubblewrap";
  if (await envDynamicProbe.getIsDocker()) return "docker";
  return;
}
/**
 * 平台与架构对应的 musl/darwin 目标三元组（如 x86_64-unknown-linux-musl），不支持时为 undefined。
 */
//@ chunk-9d1pf3s4.js:518-747 fingerprint
function muslTargetTriple(r, e) {
  let n = e === "arm64" ? "aarch64" : e === "x64" ? "x86_64" : void 0;
  if (n === void 0) return;
  switch (r) {
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
function isMuslEnvironment(e) {
  return env.platform !== "linux" && e.startsWith(`${CCR_TOKEN_DIR}/`);
}
//@ chunk-jhrww53q.js:49897-49964 fingerprint = getIsDocker (0.479)
function getIsDocker() {
  if (p()) return !1;
  return getFsImplementation().existsSync("/.dockerenv");
}

export {
  envDynamicProbe,
  getIsDocker,
  isMuslEnvironment,
  muslTargetTriple,
  envDynamic,
  NON_INTERACTIVE_TERMINAL,
};
