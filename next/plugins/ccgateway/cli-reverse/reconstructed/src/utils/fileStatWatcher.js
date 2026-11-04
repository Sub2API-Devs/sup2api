/**
 * utils/fileStatWatcher.ts
 *
 * 2.1.316 新增：文件变化监视器（fs.watch 加轮询回退、去抖）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (1)
 * attribution: placement 1
 */
import { basename, dirname } from "path";
import { watch, unwatchFile } from "fs";
import { getFsImplementation } from "./fsOperations.js";
import { errorMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { watchFileSafe } from "./fsSafety/guardedFileRead.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { logError } from "./log.js";

//@ chunk-t0gq9gyw.js:59431-61600 placement
/**
 * 文件变化监视器（fs.watch 加轮询回退、去抖）。
 */
class FileStatWatcher {
  file;
  options;
  onStat;
  watcher = undefined;
  pollListener = undefined;
  pollMs = undefined;
  lastStatMtimeMs = undefined;
  gaveUpOnEvents = false;
  settleTimer = undefined;
  arming = false;
  statting = false;
  closed = false;
  statAfterSettle = () => {
    this.settleTimer = undefined;
    this.statNow();
  };
  constructor(file, options, onStat) {
    this.file = file;
    this.options = options;
    this.onStat = onStat;
    this.arm();
  }
  close() {
    this.closed = true;
    clearTimeout(this.settleTimer);
    this.stopPolling();
    this.dropWatcher();
  }
  async arm() {
    this.arming = true;
    let file = this.file;
    try {
      file = await getFsImplementation().realpath(this.file);
    } catch {}
    this.arming = false;
    if (this.closed) return;
    let fileName = basename(file);
    try {
      let watcher = (this.options.watch ?? watch)(
        dirname(file),
        {
          persistent: false,
        },
        (eventType, changedFileName) => {
          if (this.watcher === watcher && (changedFileName === null || changedFileName === fileName))
            this.statSoon();
        },
      );
      watcher.on("error", (error) => this.pollInstead(watcher, errorMessage(error)));
      this.watcher = watcher;
    } catch (error) {
      this.pollInstead(undefined, errorMessage(error));
      return;
    }
    logForDebugging(`Watching ${dirname(file)} for changes to ${fileName}`);
    this.poll(this.options.safetyPollMs);
    this.statSoon();
  }
  poll(intervalMs) {
    this.stopPolling();
    this.pollMs = intervalMs;
    this.pollListener = watchFileSafe(
      this.file,
      {
        interval: intervalMs,
        persistent: false,
      },
      ({ mtimeMs, size }) => {
        this.onStat({
          mtimeMs,
          size,
        });
        if (this.arming) return;
        if (this.watcher === undefined) {
          if (!this.gaveUpOnEvents) this.arm();
        } else if (mtimeMs !== this.lastStatMtimeMs && this.settleTimer === undefined && !this.statting) {
          logForDiagnosticsNoPII("warn", "file_watch_missed_change");
          this.pollInstead(this.watcher, "a change went unnoticed");
        }
      },
    );
  }
  stopPolling() {
    if (this.pollListener !== undefined) {
      unwatchFile(this.file, this.pollListener);
      this.pollListener = undefined;
    }
  }
  pollInstead(watcherToDrop, reason) {
    if (watcherToDrop !== this.watcher) return;
    this.gaveUpOnEvents ||= watcherToDrop !== undefined;
    this.dropWatcher();
    if (this.pollMs !== this.options.fallbackPollMs) {
      logForDebugging(
        `Cannot watch for changes to ${this.file} (${reason}); checking it every ${this.options.fallbackPollMs}ms instead`,
        {
          level: "warn",
        },
      );
      logForDiagnosticsNoPII("warn", "file_watch_fell_back_to_polling");
      this.poll(this.options.fallbackPollMs);
      this.statSoon();
    }
  }
  statSoon() {
    if (this.closed || this.settleTimer !== undefined) return;
    this.settleTimer = setTimeout(this.statAfterSettle, this.options.settleMs);
    this.settleTimer.unref();
  }
  async statNow() {
    let stat;
    this.statting = true;
    try {
      let { mtimeMs, size } = await getFsImplementation().stat(this.file);
      stat = {
        mtimeMs,
        size,
      };
    } catch {
      stat = {
        mtimeMs: 0,
        size: 0,
      };
    }
    this.statting = false;
    if (this.closed) return;
    this.lastStatMtimeMs = stat.mtimeMs;
    try {
      this.onStat(stat);
    } catch (error) {
      logError(error);
    }
  }
  dropWatcher() {
    this.watcher = undefined;
  }
}
export { FileStatWatcher };
