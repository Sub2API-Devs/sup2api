/**
 * gcp-metadata/build/src/gcp-residency.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: gcp-metadata@7.0.0..8.1.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";

//@ chunk-na3pph4p.js:43354-44278 cjs-fingerprint
var require_gcp_residency = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.GCE_LINUX_BIOS_PATHS = undefined;
  cjsExports.isGoogleCloudServerless = isGoogleCloudServerless;
  cjsExports.isGoogleComputeEngineLinux = isGoogleComputeEngineLinux;
  cjsExports.isGoogleComputeEngineMACAddress = isGoogleComputeEngineMACAddress;
  cjsExports.isGoogleComputeEngine = isGoogleComputeEngine;
  cjsExports.detectGCPResidency = detectGCPResidency;
  var fs_1 = importMetaRequire("fs");
  var os_1 = importMetaRequire("os");
  cjsExports.GCE_LINUX_BIOS_PATHS = {
    BIOS_DATE: "/sys/class/dmi/id/bios_date",
    BIOS_VENDOR: "/sys/class/dmi/id/bios_vendor",
  };
  var GCE_MAC_ADDRESS_REGEX = /^42:01/;
  function isGoogleCloudServerless() {
    return !!(process.env.CLOUD_RUN_JOB || process.env.FUNCTION_NAME || process.env.K_SERVICE);
  }
  function isGoogleComputeEngineLinux() {
    if (os_1.platform() !== "linux") return false;
    try {
      fs_1.statSync(cjsExports.GCE_LINUX_BIOS_PATHS.BIOS_DATE);
      let biosVendor = fs_1.readFileSync(cjsExports.GCE_LINUX_BIOS_PATHS.BIOS_VENDOR, "utf8");
      return /Google/.test(biosVendor);
    } catch {
      return false;
    }
  }
  function isGoogleComputeEngineMACAddress() {
    let interfaces = os_1.networkInterfaces();
    for (let item of Object.values(interfaces)) {
      if (!item) continue;
      for (let { mac } of item) if (GCE_MAC_ADDRESS_REGEX.test(mac)) return true;
    }
    return false;
  }
  function isGoogleComputeEngine() {
    return isGoogleComputeEngineLinux() || isGoogleComputeEngineMACAddress();
  }
  function detectGCPResidency() {
    return isGoogleCloudServerless() || isGoogleComputeEngine();
  }
});
export { require_gcp_residency };
