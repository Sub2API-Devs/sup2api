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
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
} from "path";
import { watch, unwatchFile, unwatchFile as unwatchFile_2 } from "fs";
import { getFsImplementation } from "./fsOperations.js";
import { errorMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { NMn } from "./fsSafety/guardedFileRead.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { logError } from "./log.js";

/**
 * 文件变化监视器（fs.watch 加轮询回退、去抖）。
 */
//@ chunk-t0gq9gyw.js:59431-61600 placement
class FileStatWatcher {
  file;
  options;
  onStat;
  watcher = void 0;
  pollListener = void 0;
  pollMs = void 0;
  lastStatMtimeMs = void 0;
  gaveUpOnEvents = !1;
  settleTimer = void 0;
  arming = !1;
  statting = !1;
  closed = !1;
  statAfterSettle = () => {
    ((this.settleTimer = void 0), this.statNow());
  };
  constructor(e, n, r) {
    ((this.file = e), (this.options = n), (this.onStat = r), this.arm());
  }
  close() {
    ((this.closed = !0), clearTimeout(this.settleTimer), this.stopPolling(), this.dropWatcher());
  }
  async arm() {
    this.arming = !0;
    let file = this.file;
    try {
      file = await getFsImplementation().realpath(this.file);
    } catch {}
    if (((this.arming = !1), this.closed)) return;
    let n = basename_6(file);
    try {
      let r = (this.options.watch ?? watch)(dirname_8(file), { persistent: !1 }, (o, s) => {
        if (this.watcher === r && (s === null || s === n)) this.statSoon();
      });
      (r.on("error", (o) => this.pollInstead(r, errorMessage(o))), (this.watcher = r));
    } catch (error) {
      this.pollInstead(void 0, errorMessage(error));
      return;
    }
    (logForDebugging(`Watching ${dirname_8(file)} for changes to ${n}`),
      this.poll(this.options.safetyPollMs),
      this.statSoon());
  }
  poll(e) {
    (this.stopPolling(),
      (this.pollMs = e),
      (this.pollListener = NMn(
        this.file,
        { interval: e, persistent: !1 },
        ({ mtimeMs: mtimeMs, size: size }) => {
          if ((this.onStat({ mtimeMs: mtimeMs, size: size }), this.arming)) return;
          if (this.watcher === void 0) {
            if (!this.gaveUpOnEvents) this.arm();
          } else if (mtimeMs !== this.lastStatMtimeMs && this.settleTimer === void 0 && !this.statting)
            (logForDiagnosticsNoPII("warn", "file_watch_missed_change"),
              this.pollInstead(this.watcher, "a change went unnoticed"));
        },
      )));
  }
  stopPolling() {
    if (this.pollListener !== void 0)
      (unwatchFile_2(this.file, this.pollListener), (this.pollListener = void 0));
  }
  pollInstead(e, n) {
    if (e !== this.watcher) return;
    if (
      ((this.gaveUpOnEvents ||= e !== void 0),
      this.dropWatcher(),
      this.pollMs !== this.options.fallbackPollMs)
    )
      (logForDebugging(
        `Cannot watch for changes to ${this.file} (${n}); checking it every ${this.options.fallbackPollMs}ms instead`,
        { level: "warn" },
      ),
        logForDiagnosticsNoPII("warn", "file_watch_fell_back_to_polling"),
        this.poll(this.options.fallbackPollMs),
        this.statSoon());
  }
  statSoon() {
    if (this.closed || this.settleTimer !== void 0) return;
    ((this.settleTimer = setTimeout(this.statAfterSettle, this.options.settleMs)), this.settleTimer.unref());
  }
  async statNow() {
    let e;
    this.statting = !0;
    try {
      let { mtimeMs: mtimeMs, size: size } = await getFsImplementation().stat(this.file);
      e = { mtimeMs: mtimeMs, size: size };
    } catch {
      e = { mtimeMs: 0, size: 0 };
    }
    if (((this.statting = !1), this.closed)) return;
    this.lastStatMtimeMs = e.mtimeMs;
    try {
      this.onStat(e);
    } catch (error) {
      logError(error);
    }
  }
  dropWatcher() {
    this.watcher = void 0;
  }
}

export { FileStatWatcher };
