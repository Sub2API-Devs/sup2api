/**
 * open/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: open@10.2.0
 * pieces: chunk-20ppca50.js (13)
 * attribution: esm-fingerprint 10, esm-layout 3
 */
import {
  promisify,
  promisify as promisify_2,
  promisify as promisify_3,
  promisify as promisify_4,
  promisify as promisify_5,
} from "util";
import child_process from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import N, { default as I, default as T, default as E, default as ee, default as te } from "process";
import { Buffer as R } from "buffer";
import fsPromises, { constants, constants as constants_2, default as fsPromises_2 } from "fs/promises";
import { v } from "../wsl-utils/index.js";
import { c, p } from "../is-wsl/index.js";
import { B } from "../default-browser/index.js";
import { m } from "../default-browser-id/index.js";

//@ chunk-20ppca50.js:4541-4641 esm-fingerprint
var execFileAsync = promisify(child_process.execFile),
  dir = path.dirname(fileURLToPath(import.meta.url)),
  joined = path.join(dir, "xdg-open"),
  { platform: platform, arch: arch } = N;
//@ chunk-20ppca50.js:4641-5137 esm-fingerprint
async function ve() {
  let e = await v(),
    r = String.raw`(Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice").ProgId`,
    str = R.from(r, "utf16le").toString("base64"),
    { stdout: stdout } = await execFileAsync(
      e,
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", str],
      { encoding: "utf8" },
    ),
    trimmed = stdout.trim(),
    s = {
      ChromeHTML: "com.google.chrome",
      BraveHTML: "com.brave.Browser",
      MSEdgeHTM: "com.microsoft.edge",
      FirefoxURL: "org.mozilla.firefox",
    };
  return s[trimmed] ? { id: s[trimmed] } : {};
}
//@ chunk-20ppca50.js:5137-7294 esm-layout
var _ = async (e, r) => {
    let o;
    for (let n of e)
      try {
        return await r(n);
      } catch (error) {
        o = error;
      }
    throw o;
  },
  w = async (e) => {
    if (
      ((e = { wait: !1, background: !1, newInstance: !1, allowNonzeroExitCode: !1, ...e }),
      Array.isArray(e.app))
    )
      return _(e.app, (i) => w({ ...e, app: i }));
    let { name: r, arguments: o = [] } = e.app ?? {};
    if (((o = [...o]), Array.isArray(r))) return _(r, (i) => w({ ...e, app: { name: i, arguments: o } }));
    if (r === "browser" || r === "browserPrivate") {
      let i = {
          "com.google.chrome": "chrome",
          "google-chrome.desktop": "chrome",
          "com.brave.Browser": "brave",
          "org.mozilla.firefox": "firefox",
          "firefox.desktop": "firefox",
          "com.microsoft.msedge": "edge",
          "com.microsoft.edge": "edge",
          "com.microsoft.edgemac": "edge",
          "microsoft-edge.desktop": "edge",
        },
        a = { chrome: "--incognito", brave: "--incognito", firefox: "--private-window", edge: "--inPrivate" },
        f = c ? await ve() : await B();
      if (f.id in i) {
        let C = i[f.id];
        if (r === "browserPrivate") o.push(a[C]);
        return w({ ...e, app: { name: l[C], arguments: o } });
      }
      throw Error(`${f.name} is not supported as a default browser`);
    }
    let n,
      t = [],
      s = {};
    if (platform === "darwin") {
      if (((n = "open"), e.wait)) t.push("--wait-apps");
      if (e.background) t.push("--background");
      if (e.newInstance) t.push("--new");
      if (r) t.push("-a", r);
    } else if (platform === "win32" || (c && !p() && !r)) {
      if (
        ((n = await v()),
        t.push("-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand"),
        !c)
      )
        s.windowsVerbatimArguments = !0;
      let i = ["Start"];
      if (e.wait) i.push("-Wait");
      if (r) {
        if ((i.push(`"\`"${r}\`""`), e.target)) o.push(e.target);
      } else if (e.target) i.push(`"${e.target}"`);
      if (o.length > 0) ((o = o.map((a) => `"\`"${a}\`""`)), i.push("-ArgumentList", o.join(",")));
      e.target = R.from(i.join(" "), "utf16le").toString("base64");
    } else {
      if (r) n = r;
      else {
        let i = !dir || dir === "/",
          a = !1;
        try {
          (await fsPromises.access(joined, constants.X_OK), (a = !0));
        } catch {}
        n = (N.versions.electron ?? (platform === "android" || i || !a)) ? "xdg-open" : joined;
      }
      if (o.length > 0) t.push(...o);
      if (!e.wait) ((s.stdio = "ignore"), (s.detached = !0));
    }
    if (platform === "darwin" && o.length > 0) t.push("--args", ...o);
    if (e.target) t.push(e.target);
    let child = child_process.spawn(n, t, s);
    if (e.wait)
      return new Promise((i, a) => {
        (child.once("error", a),
          child.once("close", (f) => {
            if (!e.allowNonzeroExitCode && f > 0) {
              a(Error(`Exited with code ${f}`));
              return;
            }
            i(child);
          }));
      });
    return (child.unref(), child);
  },
  Se = (e, r) => {
    if (typeof e !== "string") throw TypeError("Expected a `target`");
    return w({ ...r, target: e });
  };
//@ chunk-20ppca50.js:7294-7423 esm-fingerprint
function U(e) {
  if (typeof e === "string" || Array.isArray(e)) return e;
  let { [arch]: r } = e;
  if (!r) throw Error(`${arch} is not supported`);
  return r;
}
//@ chunk-20ppca50.js:7423-7526 esm-fingerprint
function g({ [platform]: e }, { wsl: wsl }) {
  if (wsl && c) return U(wsl);
  if (!e) throw Error(`${platform} is not supported`);
  return U(e);
}
//@ chunk-20ppca50.js:7526-7535 esm-layout
var l = {};
//@ chunk-20ppca50.js:7535-7865 esm-fingerprint
m(l, "chrome", () =>
  g(
    {
      darwin: "google chrome",
      win32: "chrome",
      linux: ["google-chrome", "google-chrome-stable", "chromium"],
    },
    {
      wsl: {
        ia32: "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        x64: [
          "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
          "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        ],
      },
    },
  ),
);
//@ chunk-20ppca50.js:7865-8206 esm-fingerprint
m(l, "brave", () =>
  g(
    { darwin: "brave browser", win32: "brave", linux: ["brave-browser", "brave"] },
    {
      wsl: {
        ia32: "/mnt/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe",
        x64: [
          "/mnt/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
          "/mnt/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe",
        ],
      },
    },
  ),
);
//@ chunk-20ppca50.js:8206-8383 esm-fingerprint
m(l, "firefox", () =>
  g(
    { darwin: "firefox", win32: String.raw`C:\Program Files\Mozilla Firefox\firefox.exe`, linux: "firefox" },
    { wsl: "/mnt/c/Program Files/Mozilla Firefox/firefox.exe" },
  ),
);
//@ chunk-20ppca50.js:8383-8562 esm-fingerprint
m(l, "edge", () =>
  g(
    { darwin: "microsoft edge", win32: "msedge", linux: ["microsoft-edge", "microsoft-edge-dev"] },
    { wsl: "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" },
  ),
);
//@ chunk-20ppca50.js:8562-8591 esm-fingerprint
m(l, "browser", () => "browser");
//@ chunk-20ppca50.js:8591-8634 esm-fingerprint
m(l, "browserPrivate", () => "browserPrivate");
//@ chunk-20ppca50.js:8634-8644 esm-layout
var hr = Se;
