/**
 * services/internalLogging.ts
 *
 * 内部（ant）日志辅助：容器 id/k8s namespace 读取，外部构建多为空实现。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/internalLogging.ts
 * pieces: chunk-5xgkngpb.js (3), chunk-sfy2wa1e.js (3)
 * attribution: sole-consumer 2, affinity 2, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { release } from "os";
import { open } from "fs/promises";
import { constants } from "fs";
import { READ_LIMITS } from "../utils/fsBoundRead.js";

//@ chunk-5xgkngpb.js:2141552-2141585 sole-consumer
async function getKubernetesNamespace() {
  return null;
}
//@ chunk-5xgkngpb.js:2141585-2141618 affinity
async function getContainerIdStub() {
  return null;
}
//@ chunk-5xgkngpb.js:2141618-2141766 fingerprint (2.1.88 match: logPermissionContextForAnts, 0.339)
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
//@ chunk-sfy2wa1e.js:13408-13423 affinity
var MAX_MOUNTINFO_BYTES = 4194304;
//@ chunk-sfy2wa1e.js:13423-13638 fingerprint (2.1.88 match: getContainerId, 0.525)
async function getContainerId() {
  let [, major, minor] = /^(\d+)\.(\d+)/.exec(release()) ?? [];
  if (!(Number(major) > 5 || (Number(major) === 5 && Number(minor) >= 8))) return null;
  let text = await readJSONLFile("/proc/self/mountinfo", MAX_MOUNTINFO_BYTES).catch(() => null);
  return text === null || text.length >= MAX_MOUNTINFO_BYTES ? null : text;
}
//@ chunk-sfy2wa1e.js:13638-13893 sole-consumer (2.1.88 match: readJSONLFile, 0.762)
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
