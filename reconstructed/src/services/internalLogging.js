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
import { open } from "fs/promises";
import { constants } from "fs";
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
  namespace = undefined;
  containerId = undefined;
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
  let [, major, minor] = /^(\d+)\.(\d+)/.exec(release()) ?? [];
  if (!(Number(major) > 5 || (Number(major) === 5 && Number(minor) >= 8))) return null;
  let text = await readJSONLFile("/proc/self/mountinfo", MAX_MOUNTINFO_BYTES).catch(() => null);
  return text === null || text.length >= MAX_MOUNTINFO_BYTES ? null : text;
}
//@ chunk-gjx0rh1b.js:13538-13793 sole-consumer = readJSONLFile (0.763)
async function readJSONLFile(filePath, maxBytes) {
  let handle = await open(filePath, constants.O_RDONLY | READ_LIMITS);
  try {
    let chunks = [];
    let totalBytes = 0;
    while (totalBytes < maxBytes) {
      let buf = Buffer.allocUnsafe(65536);
      let { bytesRead } = await handle.read(buf, 0, buf.length, null);
      if (bytesRead === 0) break;
      chunks.push(buf.subarray(0, bytesRead));
      totalBytes += bytesRead;
    }
    return Buffer.concat(chunks);
  } finally {
    await handle.close();
  }
}
export { PermissionContextLogState, getContainerId };
