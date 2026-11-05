/**
 * google-auth-library/build/src/auth/envDetect.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_gcp_metadata } from "../../../../gcp-metadata/build/src/index.js";

//@ chunk-e8d3a8an.js:84616-85733 cjs-fingerprint
var require_envDetect = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.GCPEnv = undefined;
  cjsExports.clear = clear;
  cjsExports.getEnv = getEnv;
  var gcpMetadata = require_gcp_metadata();
  var GCPEnv;
  (function (GCPEnv) {
    GCPEnv.APP_ENGINE = "APP_ENGINE";
    GCPEnv.KUBERNETES_ENGINE = "KUBERNETES_ENGINE";
    GCPEnv.CLOUD_FUNCTIONS = "CLOUD_FUNCTIONS";
    GCPEnv.COMPUTE_ENGINE = "COMPUTE_ENGINE";
    GCPEnv.CLOUD_RUN = "CLOUD_RUN";
    GCPEnv.CLOUD_RUN_JOBS = "CLOUD_RUN_JOBS";
    GCPEnv.NONE = "NONE";
  })(GCPEnv || (cjsExports.GCPEnv = GCPEnv = {}));
  var envPromise;
  function clear() {
    envPromise = undefined;
  }
  async function getEnv() {
    if (envPromise) return envPromise;
    envPromise = getEnvMemoized();
    return envPromise;
  }
  async function getEnvMemoized() {
    let env = GCPEnv.NONE;
    if (isAppEngine()) env = GCPEnv.APP_ENGINE;
    else if (isCloudFunction()) env = GCPEnv.CLOUD_FUNCTIONS;
    else if (await isComputeEngine()) {
      if (await isKubernetesEngine()) env = GCPEnv.KUBERNETES_ENGINE;
      else if (isCloudRun()) env = GCPEnv.CLOUD_RUN;
      else if (isCloudRunJob()) env = GCPEnv.CLOUD_RUN_JOBS;
      else env = GCPEnv.COMPUTE_ENGINE;
    } else env = GCPEnv.NONE;
    return env;
  }
  function isAppEngine() {
    return !!(process.env.GAE_SERVICE || process.env.GAE_MODULE_NAME);
  }
  function isCloudFunction() {
    return !!(process.env.FUNCTION_NAME || process.env.FUNCTION_TARGET);
  }
  function isCloudRun() {
    return !!process.env.K_CONFIGURATION;
  }
  function isCloudRunJob() {
    return !!process.env.CLOUD_RUN_JOB;
  }
  async function isKubernetesEngine() {
    try {
      await gcpMetadata.instance("attributes/cluster-name");
      return true;
    } catch (error) {
      return false;
    }
  }
  async function isComputeEngine() {
    return gcpMetadata.isAvailable();
  }
});
export { require_envDetect };
