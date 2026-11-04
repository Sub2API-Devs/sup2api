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
function createDeviceTreeHost(overrides = {}) {
  return {
    fs: fsPromisesModule,
    path: pathModule,
    platform: () => getPlatform(),
    ...overrides,
  };
}
//@ chunk-ama6w91h.js:340-516 placement
/**
 * 解析真实根路径；另提供设备树宿主。
 */
async function resolvedRoot(host, location) {
  return location.isRootNameExchangeable === true
    ? host.path.join(
        await host.fs.realpath(host.path.dirname(location.realRoot)),
        host.path.basename(location.realRoot),
      )
    : host.fs.realpath(location.realRoot);
}
export { createDeviceTreeHost, resolvedRoot };
