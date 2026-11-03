/**
 * wsl-utils/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: wsl-utils@0.1.0
 * pieces: chunk-20ppca50.js (1)
 * attribution: esm-fingerprint 1
 */
import fsPromises, { constants, constants as constants_2, default as fsPromises_2 } from "fs/promises";
import N, { default as I, default as T, default as E, default as ee, default as te } from "process";
import { c } from "../is-wsl/index.js";

//@ chunk-20ppca50.js:1182-1739 esm-fingerprint
var getWslDrivesMountPoint = (() => {
    let r;
    return async function () {
      if (r) return r;
      let o = "/etc/wsl.conf",
        n = !1;
      try {
        (await fsPromises_2.access(o, constants_2.F_OK), (n = !0));
      } catch {}
      if (!n) return "/mnt/";
      let content = await fsPromises_2.readFile(o, { encoding: "utf8" }),
        match = /(?<!#.*)root\s*=\s*(?<mountPoint>.*)/g.exec(content);
      if (!match) return "/mnt/";
      return ((r = match.groups.mountPoint.trim()), (r = r.endsWith("/") ? r : `${r}/`), r);
    };
  })(),
  V = async () => `${await getWslDrivesMountPoint()}c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`,
  v = async () => {
    if (c) return V();
    return `${I.env.SYSTEMROOT || I.env.windir || String.raw`C:\Windows`}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
  };

export { v };
