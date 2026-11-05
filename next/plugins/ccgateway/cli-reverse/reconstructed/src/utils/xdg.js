/**
 * utils/xdg.ts
 *
 * XDG 目录（XDG_STATE_HOME/CACHE_HOME/DATA_HOME，~/.local/bin）与原生安装版本目录 ~/.local/share/claude/versions。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/xdg.ts
 * pieces: chunk-5jjtf7jy.js (6)
 * attribution: fingerprint 5, layout 1
 */
import { homedir } from "os";
import { join } from "path";
import { env } from "./env.js";

//@ chunk-5jjtf7jy.js:283-358 fingerprint (2.1.88 match: resolveOptions, 1)
function resolveOptions(options) {
  return {
    env: options?.env ?? process.env,
    home: options?.homedir ?? env.HOME ?? homedir(),
  };
}
//@ chunk-5jjtf7jy.js:358-444 fingerprint (2.1.88 match: getXDGStateHome, 1)
/**
 * $XDG_STATE_HOME 或 ~/.local/state。
 */
function getXDGStateHome(options) {
  let { env, home } = resolveOptions(options);
  return env.XDG_STATE_HOME ?? join(home, ".local", "state");
}
//@ chunk-5jjtf7jy.js:444-522 fingerprint (2.1.88 match: getXDGCacheHome, 1)
function getXDGCacheHome(options) {
  let { env, home } = resolveOptions(options);
  return env.XDG_CACHE_HOME ?? join(home, ".cache");
}
//@ chunk-5jjtf7jy.js:522-607 fingerprint (2.1.88 match: getXDGDataHome, 1)
function getXDGDataHome(options) {
  let { env, home } = resolveOptions(options);
  return env.XDG_DATA_HOME ?? join(home, ".local", "share");
}
//@ chunk-5jjtf7jy.js:607-660 layout
function getNativeVersionsDir(options) {
  return join(getXDGDataHome(options), "claude", "versions");
}
//@ chunk-5jjtf7jy.js:660-719 fingerprint (2.1.88 match: getUserBinDir, 1)
function getUserBinDir(options) {
  let { home } = resolveOptions(options);
  return join(home, ".local", "bin");
}
export { getNativeVersionsDir, getXDGCacheHome, getUserBinDir, getXDGDataHome, getXDGStateHome };
