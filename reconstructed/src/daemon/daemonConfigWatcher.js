/**
 * daemon/daemonConfigWatcher.ts
 *
 * 2.1.316 新增：监听单个守护进程配置文件（daemon-config）的增删改，只关注目标目录与文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g3mpnrhd.js (1)
 * attribution: placement 1
 */
import { dirname, normalize, basename } from "path";
import { chokidar_default } from "../../vendor/chokidar/index.js";
import { getPlatform } from "../utils/platform.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";

//@ chunk-g3mpnrhd.js:2183-2629 placement = initialize (0.744)
/**
 * 监听单个配置文件（daemon-config）的增删改。旧版名 initialize 不准确。
 */
function initialize(r, n) {
  let i = dirname(r);
  let s = normalize(i);
  let f = basename(r);
  let a = chokidar_default.watch(i, {
    persistent: true,
    ignoreInitial: true,
    depth: 0,
    usePolling: getPlatform() === "macos",
    interval: 100,
    ignored: (c) => {
      let e = normalize(c);
      return e !== s && basename(e) !== f;
    },
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
    atomic: true,
    ignorePermissionErrors: true,
  });
  a.on("add", n);
  a.on("change", n);
  a.on("unlink", n);
  a.on("error", (dir) =>
    logForDebugging(`[daemon-config] watcher error: ${errorMessage(dir)}`, {
      level: "warn",
    }),
  );
  return () => void a.close().catch(() => {});
}
export { initialize };
