/**
 * env-paths/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: env-paths@4.0.0
 * pieces: chunk-bbtre4r8.js (2)
 * attribution: esm-fingerprint 2
 */
import os from "os";
import E from "process";
import path from "path";

//@ chunk-bbtre4r8.js:10610-11343 esm-fingerprint
var homedir = os.homedir();
var tmpdir = os.tmpdir();
var { env } = E;
var macos = (name) => {
  let library = path.join(homedir, "Library");
  return {
    data: path.join(library, "Application Support", name),
    config: path.join(library, "Preferences", name),
    cache: path.join(library, "Caches", name),
    log: path.join(library, "Logs", name),
    temp: path.join(tmpdir, name),
  };
};
var windows = (name) => {
  let appData = env.APPDATA || path.join(homedir, "AppData", "Roaming");
  let localAppData = env.LOCALAPPDATA || path.join(homedir, "AppData", "Local");
  return {
    data: path.join(localAppData, name, "Data"),
    config: path.join(appData, name, "Config"),
    cache: path.join(localAppData, name, "Cache"),
    log: path.join(localAppData, name, "Log"),
    temp: path.join(tmpdir, name),
  };
};
var linux = (name) => {
  let username = path.basename(homedir);
  return {
    data: path.join(env.XDG_DATA_HOME || path.join(homedir, ".local", "share"), name),
    config: path.join(env.XDG_CONFIG_HOME || path.join(homedir, ".config"), name),
    cache: path.join(env.XDG_CACHE_HOME || path.join(homedir, ".cache"), name),
    log: path.join(env.XDG_STATE_HOME || path.join(homedir, ".local", "state"), name),
    temp: path.join(tmpdir, username, name),
  };
};
//@ chunk-bbtre4r8.js:11343-11558 esm-fingerprint
function f(name, { suffix = "nodejs" } = {}) {
  if (typeof name !== "string") throw TypeError(`Expected a string, got ${typeof name}`);
  if (suffix) name += `-${suffix}`;
  if (E.platform === "darwin") return macos(name);
  if (E.platform === "win32") return windows(name);
  return linux(name);
}
export { f };
