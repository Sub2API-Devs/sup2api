/**
 * daemon/daemonConfigWatcher.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g3mpnrhd.js (1)
 * attribution: placement 1
 */
import { dirname, normalize, basename } from "path";
import { Ok } from "../../vendor/chokidar/index.js";
import { getPlatform } from "../utils/platform.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";

/**
 * 监听单个配置文件（daemon-config）的增删改。旧版名 initialize 不准确。
 */
//@ chunk-g3mpnrhd.js:2183-2629 placement = initialize (0.744)
function initialize(r, n) {
  let i = dirname(r),
    s = normalize(i),
    f = basename(r),
    watch = Ok.watch(i, {
      persistent: !0,
      ignoreInitial: !0,
      depth: 0,
      usePolling: getPlatform() === "macos",
      interval: 100,
      ignored: (c) => {
        let e = normalize(c);
        return e !== s && basename(e) !== f;
      },
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
      atomic: !0,
      ignorePermissionErrors: !0,
    });
  return (
    watch.on("add", n),
    watch.on("change", n),
    watch.on("unlink", n),
    watch.on("error", (dir) =>
      logForDebugging(`[daemon-config] watcher error: ${errorMessage(dir)}`, { level: "warn" }),
    ),
    () => void watch.close().catch(() => {})
  );
}

export { initialize };
