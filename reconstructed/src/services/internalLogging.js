/**
 * services/internalLogging.ts
 *
 * 内部（ant）日志辅助：容器 id/k8s namespace 读取，外部构建多为空实现。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/internalLogging.ts
 * pieces: chunk-e6aww6q8.js (3), chunk-gjx0rh1b.js (3)
 * attribution: sole-consumer 2, affinity 2, fingerprint 2
 */
import { release } from "os";
import {
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
} from "fs/promises";
import { constants, constants as constants_2, constants as constants_3 } from "fs";
import { READ_LIMITS } from "../utils/fsBoundRead.js";

//@ chunk-e6aww6q8.js:2084953-2084986 sole-consumer
async function getKubernetesNamespace() {
  return null;
}
//@ chunk-e6aww6q8.js:2084986-2085019 affinity
async function getContainerIdStub() {
  return null;
}
//@ chunk-e6aww6q8.js:2085019-2085167 fingerprint = logPermissionContextForAnts (0.339)
class PermissionContextLogState {
  namespace = void 0;
  containerId = void 0;
  kubernetesNamespace() {
    return (this.namespace ??= getKubernetesNamespace());
  }
  ociContainerId() {
    return (this.containerId ??= getContainerIdStub());
  }
}
//@ chunk-gjx0rh1b.js:13308-13323 affinity
var MAX_MOUNTINFO_BYTES = 4194304;
//@ chunk-gjx0rh1b.js:13323-13538 fingerprint = getContainerId (0.524)
async function getContainerId() {
  let [, e, n] = /^(\d+)\.(\d+)/.exec(release()) ?? [];
  if (!(Number(e) > 5 || (Number(e) === 5 && Number(n) >= 8))) return null;
  let r = await readJSONLFile("/proc/self/mountinfo", MAX_MOUNTINFO_BYTES).catch(() => null);
  return r === null || r.length >= MAX_MOUNTINFO_BYTES ? null : r;
}
//@ chunk-gjx0rh1b.js:13538-13793 sole-consumer = readJSONLFile (0.763)
async function readJSONLFile(e, n) {
  let r = await open_5(e, constants.O_RDONLY | READ_LIMITS);
  try {
    let o = [],
      s = 0;
    while (s < n) {
      let buf = Buffer.allocUnsafe(65536),
        { bytesRead: bytesRead } = await r.read(buf, 0, buf.length, null);
      if (bytesRead === 0) break;
      (o.push(buf.subarray(0, bytesRead)), (s += bytesRead));
    }
    return Buffer.concat(o);
  } finally {
    await r.close();
  }
}

export { PermissionContextLogState, getContainerId };
