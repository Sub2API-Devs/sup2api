/**
 * open/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: open@10.2.0
 * pieces: chunk-20ppca50.js (13)
 * attribution: esm-fingerprint 10, esm-layout 3
 */
import { promisify } from "util";
import child_process from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { default as E } from "process";
import { Buffer as R } from "buffer";
import fsPromises, { constants } from "fs/promises";
import { powerShellPath } from "../wsl-utils/index.js";
import { is_wsl_default, p } from "../is-wsl/index.js";
import { defaultBrowser } from "../default-browser/index.js";
import { m } from "../default-browser-id/index.js";

//@ chunk-20ppca50.js:4541-4641 esm-fingerprint
var execFileAsync = promisify(child_process.execFile);
var dir = path.dirname(fileURLToPath(import.meta.url));
var localXdgOpenPath = path.join(dir, "xdg-open");
var { platform, arch } = E;
//@ chunk-20ppca50.js:4641-5137 esm-fingerprint
async function getWindowsDefaultBrowserFromWsl() {
  let powershellPath = await powerShellPath();
  let rawCommand = String.raw`(Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice").ProgId`;
  let encodedCommand = R.from(rawCommand, "utf16le").toString("base64");
  let { stdout } = await execFileAsync(
    powershellPath,
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodedCommand],
    {
      encoding: "utf8",
    },
  );
  let progId = stdout.trim();
  let browserMap = {
    ChromeHTML: "com.google.chrome",
    BraveHTML: "com.brave.Browser",
    MSEdgeHTM: "com.microsoft.edge",
    FirefoxURL: "org.mozilla.firefox",
  };
  return browserMap[progId]
    ? {
        id: browserMap[progId],
      }
    : {};
}
//@ chunk-20ppca50.js:5137-7294 esm-layout
var pTryEach = async (array, mapper) => {
  let latestError;
  for (let item of array)
    try {
      return await mapper(item);
    } catch (error) {
      latestError = error;
    }
  throw latestError;
};
var baseOpen = async (options) => {
  options = {
    wait: false,
    background: false,
    newInstance: false,
    allowNonzeroExitCode: false,
    ...options,
  };
  if (Array.isArray(options.app))
    return pTryEach(options.app, (singleApp) =>
      baseOpen({
        ...options,
        app: singleApp,
      }),
    );
  let { name: app, arguments: appArguments = [] } = options.app ?? {};
  appArguments = [...appArguments];
  if (Array.isArray(app))
    return pTryEach(app, (appName) =>
      baseOpen({
        ...options,
        app: {
          name: appName,
          arguments: appArguments,
        },
      }),
    );
  if (app === "browser" || app === "browserPrivate") {
    let ids = {
      "com.google.chrome": "chrome",
      "google-chrome.desktop": "chrome",
      "com.brave.Browser": "brave",
      "org.mozilla.firefox": "firefox",
      "firefox.desktop": "firefox",
      "com.microsoft.msedge": "edge",
      "com.microsoft.edge": "edge",
      "com.microsoft.edgemac": "edge",
      "microsoft-edge.desktop": "edge",
    };
    let flags = {
      chrome: "--incognito",
      brave: "--incognito",
      firefox: "--private-window",
      edge: "--inPrivate",
    };
    let browser = is_wsl_default ? await getWindowsDefaultBrowserFromWsl() : await defaultBrowser();
    if (browser.id in ids) {
      let browserName = ids[browser.id];
      if (app === "browserPrivate") appArguments.push(flags[browserName]);
      return baseOpen({
        ...options,
        app: {
          name: apps[browserName],
          arguments: appArguments,
        },
      });
    }
    throw Error(`${browser.name} is not supported as a default browser`);
  }
  let command;
  let cliArguments = [];
  let childProcessOptions = {};
  if (platform === "darwin") {
    command = "open";
    if (options.wait) cliArguments.push("--wait-apps");
    if (options.background) cliArguments.push("--background");
    if (options.newInstance) cliArguments.push("--new");
    if (app) cliArguments.push("-a", app);
  } else if (platform === "win32" || (is_wsl_default && !p() && !app)) {
    command = await powerShellPath();
    cliArguments.push("-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand");
    if (!is_wsl_default) childProcessOptions.windowsVerbatimArguments = true;
    let encodedArguments = ["Start"];
    if (options.wait) encodedArguments.push("-Wait");
    if (app) {
      encodedArguments.push(`"\`"${app}\`""`);
      if (options.target) appArguments.push(options.target);
    } else if (options.target) encodedArguments.push(`"${options.target}"`);
    if (appArguments.length > 0) {
      appArguments = appArguments.map((argument) => `"\`"${argument}\`""`);
      encodedArguments.push("-ArgumentList", appArguments.join(","));
    }
    options.target = R.from(encodedArguments.join(" "), "utf16le").toString("base64");
  } else {
    if (app) command = app;
    else {
      let isBundled = !dir || dir === "/";
      let exeLocalXdgOpen = false;
      try {
        await fsPromises.access(localXdgOpenPath, constants.X_OK);
        exeLocalXdgOpen = true;
      } catch {}
      command =
        (E.versions.electron ?? (platform === "android" || isBundled || !exeLocalXdgOpen))
          ? "xdg-open"
          : localXdgOpenPath;
    }
    if (appArguments.length > 0) cliArguments.push(...appArguments);
    if (!options.wait) {
      childProcessOptions.stdio = "ignore";
      childProcessOptions.detached = true;
    }
  }
  if (platform === "darwin" && appArguments.length > 0) cliArguments.push("--args", ...appArguments);
  if (options.target) cliArguments.push(options.target);
  let subprocess = child_process.spawn(command, cliArguments, childProcessOptions);
  if (options.wait)
    return new Promise((resolve, reject) => {
      subprocess.once("error", reject);
      subprocess.once("close", (exitCode) => {
        if (!options.allowNonzeroExitCode && exitCode > 0) {
          reject(Error(`Exited with code ${exitCode}`));
          return;
        }
        resolve(subprocess);
      });
    });
  subprocess.unref();
  return subprocess;
};
var open = (target, options) => {
  if (typeof target !== "string") throw TypeError("Expected a `target`");
  return baseOpen({
    ...options,
    target,
  });
};
//@ chunk-20ppca50.js:7294-7423 esm-fingerprint
function detectArchBinary(binary) {
  if (typeof binary === "string" || Array.isArray(binary)) return binary;
  let { [arch]: archBinary } = binary;
  if (!archBinary) throw Error(`${arch} is not supported`);
  return archBinary;
}
//@ chunk-20ppca50.js:7423-7526 esm-fingerprint
function detectPlatformBinary({ [platform]: platformBinary }, { wsl }) {
  if (wsl && is_wsl_default) return detectArchBinary(wsl);
  if (!platformBinary) throw Error(`${platform} is not supported`);
  return detectArchBinary(platformBinary);
}
//@ chunk-20ppca50.js:7526-7535 esm-layout
var apps = {};
//@ chunk-20ppca50.js:7535-7865 esm-fingerprint
m(apps, "chrome", () =>
  detectPlatformBinary(
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
m(apps, "brave", () =>
  detectPlatformBinary(
    {
      darwin: "brave browser",
      win32: "brave",
      linux: ["brave-browser", "brave"],
    },
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
m(apps, "firefox", () =>
  detectPlatformBinary(
    {
      darwin: "firefox",
      win32: String.raw`C:\Program Files\Mozilla Firefox\firefox.exe`,
      linux: "firefox",
    },
    {
      wsl: "/mnt/c/Program Files/Mozilla Firefox/firefox.exe",
    },
  ),
);
//@ chunk-20ppca50.js:8383-8562 esm-fingerprint
m(apps, "edge", () =>
  detectPlatformBinary(
    {
      darwin: "microsoft edge",
      win32: "msedge",
      linux: ["microsoft-edge", "microsoft-edge-dev"],
    },
    {
      wsl: "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    },
  ),
);
//@ chunk-20ppca50.js:8562-8591 esm-fingerprint
m(apps, "browser", () => "browser");
//@ chunk-20ppca50.js:8591-8634 esm-fingerprint
m(apps, "browserPrivate", () => "browserPrivate");
//@ chunk-20ppca50.js:8634-8644 esm-layout
var open_default = open;
