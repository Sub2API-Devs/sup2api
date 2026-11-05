/**
 * env-paths/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: env-paths@4.0.0
 * pieces: chunk-my2r02mp.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import os from "os";
import E from "process";
import path from "path";

//@ chunk-my2r02mp.js:10760-11493 esm-fingerprint
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
//@ chunk-my2r02mp.js:11493-11708 esm-fingerprint
function envPaths(name, { suffix = "nodejs" } = {}) {
  if (typeof name !== "string") throw TypeError(`Expected a string, got ${typeof name}`);
  if (suffix) name += `-${suffix}`;
  if (E.platform === "darwin") return macos(name);
  if (E.platform === "win32") return windows(name);
  return linux(name);
}
export { envPaths };
