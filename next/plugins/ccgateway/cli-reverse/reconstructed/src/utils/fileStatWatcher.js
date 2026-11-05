/**
 * utils/fileStatWatcher.ts
 *
 * 2.1.316 新增：文件变化监视器（fs.watch 加轮询回退、去抖）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-85eyj5gy.js (2)
 * attribution: sole-consumer 1, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { dirname, basename } from "path";
import { watch, unwatchFile } from "fs";
import { getFsImplementation } from "./fsOperations.js";
import { errorMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { watchFileSafe } from "./fsSafety/guardedFileRead.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { logError } from "./log.js";

//@ chunk-85eyj5gy.js:59597-59704 sole-consumer
async function fileIdentity(path) {
  try {
    let { dev, ino } = await getFsImplementation().statBigint(path);
    return `${dev}:${ino}`;
  } catch {
    return "absent";
  }
}
//@ chunk-85eyj5gy.js:59704-62407 placement
/**
 * 文件变化监视器（fs.watch 加轮询回退、去抖）。
 */
class FileStatWatcher {
  file;
  options;
  onStat;
  watcher = undefined;
  watchedDirectory = undefined;
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
  async target() {
    try {
      return await getFsImplementation().realpath(this.file);
    } catch {
      return this.file;
    }
  }
  async arm() {
    this.arming = true;
    let realTarget = await this.target();
    this.watchedDirectory = await fileIdentity(dirname(realTarget));
    this.arming = false;
    if (this.closed) return;
    let fileName = basename(realTarget);
    let parentName = basename(dirname(realTarget));
    try {
      let watcher = (this.options.watch ?? watch)(
        dirname(realTarget),
        {
          persistent: false,
        },
        (eventType, changedFileName) => {
          if (this.watcher !== watcher) return;
          if (changedFileName === null || changedFileName === fileName) this.statSoon();
          else if (eventType === "rename" && changedFileName === parentName)
            this.pollInstead(watcher, "directory_event", "its directory was probably removed or renamed");
        },
      );
      watcher.on("error", (error) => this.pollInstead(watcher, "watcher_error", errorMessage(error)));
      this.watcher = watcher;
    } catch (error) {
      this.pollInstead(undefined, "cannot_watch", errorMessage(error));
      return;
    }
    logForDebugging(`Watching ${dirname(realTarget)} for changes to ${fileName}`);
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
        if (this.settleTimer !== undefined) return;
        this.onStat({
          mtimeMs,
          size,
        });
        if (this.arming) return;
        if (this.watcher === undefined) {
          if (!this.gaveUpOnEvents) this.arm();
        } else if (mtimeMs !== this.lastStatMtimeMs && !this.statting) {
          this.logMissedChange();
          this.pollInstead(this.watcher, "missed_change", "a change went unnoticed");
        }
      },
    );
  }
  async logMissedChange() {
    let dirIdentity = await fileIdentity(dirname(await this.target()));
    logForDiagnosticsNoPII("warn", "file_watch_missed_change", {
      watched: this.options.label,
      directory:
        dirIdentity === "absent"
          ? "absent"
          : dirIdentity === this.watchedDirectory
            ? "unchanged"
            : "replaced",
    });
  }
  stopPolling() {
    if (this.pollListener !== undefined) {
      unwatchFile(this.file, this.pollListener);
      this.pollListener = undefined;
    }
  }
  pollInstead(watcherToDrop, previous, next) {
    if (watcherToDrop !== this.watcher) return;
    this.gaveUpOnEvents ||= watcherToDrop !== undefined;
    this.dropWatcher();
    if (this.pollMs !== this.options.fallbackPollMs) {
      logForDebugging(
        `Cannot watch for changes to ${this.file} (${next}); checking it every ${this.options.fallbackPollMs}ms instead`,
        {
          level: "warn",
        },
      );
      logForDiagnosticsNoPII("warn", "file_watch_fell_back_to_polling", {
        watched: this.options.label,
        cause: previous,
      });
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
