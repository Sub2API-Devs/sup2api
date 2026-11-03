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
var homedir = os.homedir(),
  tmpdir = os.tmpdir(),
  { env: env } = E,
  k = (t) => {
    let joined = path.join(homedir, "Library");
    return {
      data: path.join(joined, "Application Support", t),
      config: path.join(joined, "Preferences", t),
      cache: path.join(joined, "Caches", t),
      log: path.join(joined, "Logs", t),
      temp: path.join(tmpdir, t),
    };
  },
  G = (t) => {
    let e = env.APPDATA || path.join(homedir, "AppData", "Roaming"),
      r = env.LOCALAPPDATA || path.join(homedir, "AppData", "Local");
    return {
      data: path.join(r, t, "Data"),
      config: path.join(e, t, "Config"),
      cache: path.join(r, t, "Cache"),
      log: path.join(r, t, "Log"),
      temp: path.join(tmpdir, t),
    };
  },
  v = (t) => {
    let base = path.basename(homedir);
    return {
      data: path.join(env.XDG_DATA_HOME || path.join(homedir, ".local", "share"), t),
      config: path.join(env.XDG_CONFIG_HOME || path.join(homedir, ".config"), t),
      cache: path.join(env.XDG_CACHE_HOME || path.join(homedir, ".cache"), t),
      log: path.join(env.XDG_STATE_HOME || path.join(homedir, ".local", "state"), t),
      temp: path.join(tmpdir, base, t),
    };
  };
//@ chunk-bbtre4r8.js:11343-11558 esm-fingerprint
function f(t, { suffix: e = "nodejs" } = {}) {
  if (typeof t !== "string") throw TypeError(`Expected a string, got ${typeof t}`);
  if (e) t += `-${e}`;
  if (E.platform === "darwin") return k(t);
  if (E.platform === "win32") return G(t);
  return v(t);
}

export { f };
