/**
 * utils/fsAnchor/deviceTreeHost.ts
 *
 * 2.1.316 新增。解析真实根路径；另提供设备树宿主。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ama6w91h.js (2)
 * attribution: placement 2
 */
import * as fsPromisesModule from "fs/promises";
import * as pathModule from "path";
import { getPlatform } from "../platform.js";

//@ chunk-ama6w91h.js:279-340 placement
function createDeviceTreeHost(e = {}) {
  return { fs: fsPromisesModule, path: pathModule, platform: () => getPlatform(), ...e };
}
/**
 * 解析真实根路径；另提供设备树宿主。
 */
//@ chunk-ama6w91h.js:340-516 placement
async function resolvedRoot(e, t) {
  return t.isRootNameExchangeable === !0
    ? e.path.join(await e.fs.realpath(e.path.dirname(t.realRoot)), e.path.basename(t.realRoot))
    : e.fs.realpath(t.realRoot);
}

export { createDeviceTreeHost, resolvedRoot };
