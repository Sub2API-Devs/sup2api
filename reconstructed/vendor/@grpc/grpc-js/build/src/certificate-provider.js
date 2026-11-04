/**
 * @grpc/grpc-js/build/src/certificate-provider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x, importMetaRequire as Be } from "../../../../../runtime/bun-runtime.js";
import { K } from "./logging.js";
import { k } from "./constants.js";

//@ chunk-pwh5dx3n.js:346338-349343 cjs-fingerprint
var Im = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.FileWatcherCertificateProvider = undefined;
  var fs = Be("fs");
  var logging = K();
  var constants_1 = k();
  var util_1 = Be("util");
  var TRACER_NAME = "certificate_provider";
  function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
  }
  var readFilePromise = util_1.promisify(fs.readFile);
  class FileWatcherCertificateProvider {
    constructor(config) {
      this.config = config;
      this.refreshTimer = null;
      this.fileResultPromise = null;
      this.latestCaUpdate = undefined;
      this.caListeners = new Set();
      this.latestIdentityUpdate = undefined;
      this.identityListeners = new Set();
      this.lastUpdateTime = null;
      if ((config.certificateFile === undefined) !== (config.privateKeyFile === undefined))
        throw Error("certificateFile and privateKeyFile must be set or unset together");
      if (config.certificateFile === undefined && config.caCertificateFile === undefined)
        throw Error("At least one of certificateFile and caCertificateFile must be set");
      trace("File watcher constructed with config " + JSON.stringify(config));
    }
    updateCertificates() {
      if (this.fileResultPromise) return;
      this.fileResultPromise = Promise.allSettled([
        this.config.certificateFile ? readFilePromise(this.config.certificateFile) : Promise.reject(),
        this.config.privateKeyFile ? readFilePromise(this.config.privateKeyFile) : Promise.reject(),
        this.config.caCertificateFile ? readFilePromise(this.config.caCertificateFile) : Promise.reject(),
      ]);
      this.fileResultPromise.then(([certificateResult, privateKeyResult, caCertificateResult]) => {
        if (!this.refreshTimer) return;
        trace(
          "File watcher read certificates certificate " +
            certificateResult.status +
            ", privateKey " +
            privateKeyResult.status +
            ", CA certificate " +
            caCertificateResult.status,
        );
        this.lastUpdateTime = new Date();
        this.fileResultPromise = null;
        if (certificateResult.status === "fulfilled" && privateKeyResult.status === "fulfilled")
          this.latestIdentityUpdate = {
            certificate: certificateResult.value,
            privateKey: privateKeyResult.value,
          };
        else this.latestIdentityUpdate = null;
        if (caCertificateResult.status === "fulfilled")
          this.latestCaUpdate = {
            caCertificate: caCertificateResult.value,
          };
        else this.latestCaUpdate = null;
        for (let listener of this.identityListeners) listener(this.latestIdentityUpdate);
        for (let listener of this.caListeners) listener(this.latestCaUpdate);
      });
      trace("File watcher initiated certificate update");
    }
    maybeStartWatchingFiles() {
      if (!this.refreshTimer) {
        let timeSinceLastUpdate = this.lastUpdateTime
          ? new Date().getTime() - this.lastUpdateTime.getTime()
          : 1 / 0;
        if (timeSinceLastUpdate > this.config.refreshIntervalMs) this.updateCertificates();
        if (timeSinceLastUpdate > this.config.refreshIntervalMs * 2) {
          this.latestCaUpdate = undefined;
          this.latestIdentityUpdate = undefined;
        }
        this.refreshTimer = setInterval(() => this.updateCertificates(), this.config.refreshIntervalMs);
        trace("File watcher started watching");
      }
    }
    maybeStopWatchingFiles() {
      if (this.caListeners.size === 0 && this.identityListeners.size === 0) {
        this.fileResultPromise = null;
        if (this.refreshTimer) {
          clearInterval(this.refreshTimer);
          this.refreshTimer = null;
        }
      }
    }
    addCaCertificateListener(listener) {
      this.caListeners.add(listener);
      this.maybeStartWatchingFiles();
      if (this.latestCaUpdate !== undefined) process.nextTick(listener, this.latestCaUpdate);
    }
    removeCaCertificateListener(listener) {
      this.caListeners.delete(listener);
      this.maybeStopWatchingFiles();
    }
    addIdentityCertificateListener(listener) {
      this.identityListeners.add(listener);
      this.maybeStartWatchingFiles();
      if (this.latestIdentityUpdate !== undefined) process.nextTick(listener, this.latestIdentityUpdate);
    }
    removeIdentityCertificateListener(listener) {
      this.identityListeners.delete(listener);
      this.maybeStopWatchingFiles();
    }
  }
  cjsExports.FileWatcherCertificateProvider = FileWatcherCertificateProvider;
});
export { Im };
