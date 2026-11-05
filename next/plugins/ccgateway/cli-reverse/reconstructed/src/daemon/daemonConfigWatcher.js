/**
 * daemon/daemonConfigWatcher.ts
 *
 * 2.1.316 新增：监听单个守护进程配置文件（daemon-config）的增删改，只关注目标目录与文件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-s24mfyjz.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { dirname, normalize, basename } from "path";
import { chokidar_default } from "../../vendor/chokidar/index.js";
import { getPlatform } from "../utils/platform.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";

//@ chunk-s24mfyjz.js:2216-2662 placement (2.1.88 match: initialize, 0.744)
/**
 * 监听单个配置文件（daemon-config）的增删改。旧版名 initialize 不准确。
 */
function initialize(configPath, onChange) {
  let configDir = dirname(configPath);
  let normalizedDir = normalize(configDir);
  let configFileName = basename(configPath);
  let watcher = chokidar_default.watch(configDir, {
    persistent: true,
    ignoreInitial: true,
    depth: 0,
    usePolling: getPlatform() === "macos",
    interval: 100,
    ignored: (watchPath) => {
      let normalizedPath = normalize(watchPath);
      return normalizedPath !== normalizedDir && basename(normalizedPath) !== configFileName;
    },
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
    atomic: true,
    ignorePermissionErrors: true,
  });
  watcher.on("add", onChange);
  watcher.on("change", onChange);
  watcher.on("unlink", onChange);
  watcher.on("error", (dir) =>
    logForDebugging(`[daemon-config] watcher error: ${errorMessage(dir)}`, {
      level: "warn",
    }),
  );
  return () => void watcher.close().catch(() => {});
}
export { initialize };
