/**
 * wsl-utils/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: wsl-utils@0.1.0
 * pieces: chunk-j8hasev3.js (1)
 * attribution: esm-fingerprint 1
 */
import fsPromises, { constants } from "fs/promises";
import { default as E } from "process";
import { is_wsl_default } from "../is-wsl/index.js";

//@ chunk-j8hasev3.js:1182-1739 esm-fingerprint
var getWslDrivesMountPoint = (() => {
  let mountPoint;
  return async function () {
    if (mountPoint) return mountPoint;
    let configFilePath = "/etc/wsl.conf";
    let isConfigFileExists = false;
    try {
      await fsPromises.access(configFilePath, constants.F_OK);
      isConfigFileExists = true;
    } catch {}
    if (!isConfigFileExists) return "/mnt/";
    let configContent = await fsPromises.readFile(configFilePath, {
      encoding: "utf8",
    });
    let configMountPoint = /(?<!#.*)root\s*=\s*(?<mountPoint>.*)/g.exec(configContent);
    if (!configMountPoint) return "/mnt/";
    mountPoint = configMountPoint.groups.mountPoint.trim();
    mountPoint = mountPoint.endsWith("/") ? mountPoint : `${mountPoint}/`;
    return mountPoint;
  };
})();
var powerShellPathFromWsl = async () =>
  `${await getWslDrivesMountPoint()}c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`;
var powerShellPath = async () => {
  if (is_wsl_default) return powerShellPathFromWsl();
  return `${E.env.SYSTEMROOT || E.env.windir || String.raw`C:\Windows`}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
};
export { powerShellPath };
