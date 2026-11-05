/**
 * @grpc/grpc-js/build/src/server-credentials.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_tls_helpers } from "./tls-helpers.js";

//@ chunk-3k21nfa0.js:281874-287451 cjs-fingerprint
var require_server_credentials = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ServerCredentials = undefined;
  cjsExports.createCertificateProviderServerCredentials = createCertificateProviderServerCredentials;
  cjsExports.createServerCredentialsWithInterceptors = createServerCredentialsWithInterceptors;
  var tls_helpers_1 = require_tls_helpers();
  class ServerCredentials {
    constructor(serverConstructorOptions, contextOptions) {
      this.serverConstructorOptions = serverConstructorOptions;
      this.watchers = new Set();
      this.latestContextOptions = null;
      this.latestContextOptions =
        contextOptions !== null && contextOptions !== undefined ? contextOptions : null;
    }
    _addWatcher(watcher) {
      this.watchers.add(watcher);
    }
    _removeWatcher(watcher) {
      this.watchers.delete(watcher);
    }
    getWatcherCount() {
      return this.watchers.size;
    }
    updateSecureContextOptions(options) {
      this.latestContextOptions = options;
      for (let watcher of this.watchers) watcher(this.latestContextOptions);
    }
    _isSecure() {
      return this.serverConstructorOptions !== null;
    }
    _getSecureContextOptions() {
      return this.latestContextOptions;
    }
    _getConstructorOptions() {
      return this.serverConstructorOptions;
    }
    _getInterceptors() {
      return [];
    }
    static createInsecure() {
      return new InsecureServerCredentials();
    }
    static createSsl(rootCerts, keyCertPairs, checkClientCertificate = false) {
      var _a;
      if (rootCerts !== null && !Buffer.isBuffer(rootCerts))
        throw TypeError("rootCerts must be null or a Buffer");
      if (!Array.isArray(keyCertPairs)) throw TypeError("keyCertPairs must be an array");
      if (typeof checkClientCertificate !== "boolean")
        throw TypeError("checkClientCertificate must be a boolean");
      let cert = [];
      let key = [];
      for (let i = 0; i < keyCertPairs.length; i++) {
        let pair = keyCertPairs[i];
        if (pair === null || typeof pair !== "object") throw TypeError(`keyCertPair[${i}] must be an object`);
        if (!Buffer.isBuffer(pair.private_key))
          throw TypeError(`keyCertPair[${i}].private_key must be a Buffer`);
        if (!Buffer.isBuffer(pair.cert_chain))
          throw TypeError(`keyCertPair[${i}].cert_chain must be a Buffer`);
        cert.push(pair.cert_chain);
        key.push(pair.private_key);
      }
      return new SecureServerCredentials(
        {
          requestCert: checkClientCertificate,
          ciphers: tls_helpers_1.CIPHER_SUITES,
        },
        {
          ca:
            (_a =
              rootCerts !== null && rootCerts !== undefined
                ? rootCerts
                : tls_helpers_1.getDefaultRootsData()) !== null && _a !== undefined
              ? _a
              : undefined,
          cert,
          key,
        },
      );
    }
  }
  cjsExports.ServerCredentials = ServerCredentials;
  class InsecureServerCredentials extends ServerCredentials {
    constructor() {
      super(null);
    }
    _getSettings() {
      return null;
    }
    _equals(other) {
      return other instanceof InsecureServerCredentials;
    }
  }
  class SecureServerCredentials extends ServerCredentials {
    constructor(constructorOptions, contextOptions) {
      super(constructorOptions, contextOptions);
      this.options = Object.assign(Object.assign({}, constructorOptions), contextOptions);
    }
    _equals(other) {
      if (this === other) return true;
      if (!(other instanceof SecureServerCredentials)) return false;
      if (Buffer.isBuffer(this.options.ca) && Buffer.isBuffer(other.options.ca)) {
        if (!this.options.ca.equals(other.options.ca)) return false;
      } else if (this.options.ca !== other.options.ca) return false;
      if (Array.isArray(this.options.cert) && Array.isArray(other.options.cert)) {
        if (this.options.cert.length !== other.options.cert.length) return false;
        for (let i_2 = 0; i_2 < this.options.cert.length; i_2++) {
          let thisCert = this.options.cert[i_2];
          let otherCert = other.options.cert[i_2];
          if (Buffer.isBuffer(thisCert) && Buffer.isBuffer(otherCert)) {
            if (!thisCert.equals(otherCert)) return false;
          } else if (thisCert !== otherCert) return false;
        }
      } else if (this.options.cert !== other.options.cert) return false;
      if (Array.isArray(this.options.key) && Array.isArray(other.options.key)) {
        if (this.options.key.length !== other.options.key.length) return false;
        for (let i_2 = 0; i_2 < this.options.key.length; i_2++) {
          let thisKey = this.options.key[i_2];
          let otherKey = other.options.key[i_2];
          if (Buffer.isBuffer(thisKey) && Buffer.isBuffer(otherKey)) {
            if (!thisKey.equals(otherKey)) return false;
          } else if (thisKey !== otherKey) return false;
        }
      } else if (this.options.key !== other.options.key) return false;
      if (this.options.requestCert !== other.options.requestCert) return false;
      return true;
    }
  }
  class CertificateProviderServerCredentials extends ServerCredentials {
    constructor(identityCertificateProvider, caCertificateProvider, requireClientCertificate) {
      super({
        requestCert: caCertificateProvider !== null,
        rejectUnauthorized: requireClientCertificate,
        ciphers: tls_helpers_1.CIPHER_SUITES,
      });
      this.identityCertificateProvider = identityCertificateProvider;
      this.caCertificateProvider = caCertificateProvider;
      this.requireClientCertificate = requireClientCertificate;
      this.latestCaUpdate = null;
      this.latestIdentityUpdate = null;
      this.caCertificateUpdateListener = this.handleCaCertificateUpdate.bind(this);
      this.identityCertificateUpdateListener = this.handleIdentityCertitificateUpdate.bind(this);
    }
    _addWatcher(watcher) {
      var _a;
      if (this.getWatcherCount() === 0) {
        if (!((_a = this.caCertificateProvider) === null || _a === undefined))
          _a.addCaCertificateListener(this.caCertificateUpdateListener);
        this.identityCertificateProvider.addIdentityCertificateListener(
          this.identityCertificateUpdateListener,
        );
      }
      super._addWatcher(watcher);
    }
    _removeWatcher(watcher) {
      var _a;
      super._removeWatcher(watcher);
      if (this.getWatcherCount() === 0) {
        if (!((_a = this.caCertificateProvider) === null || _a === undefined))
          _a.removeCaCertificateListener(this.caCertificateUpdateListener);
        this.identityCertificateProvider.removeIdentityCertificateListener(
          this.identityCertificateUpdateListener,
        );
      }
    }
    _equals(other) {
      if (this === other) return true;
      if (!(other instanceof CertificateProviderServerCredentials)) return false;
      return (
        this.caCertificateProvider === other.caCertificateProvider &&
        this.identityCertificateProvider === other.identityCertificateProvider &&
        this.requireClientCertificate === other.requireClientCertificate
      );
    }
    calculateSecureContextOptions() {
      var _a;
      if (this.latestIdentityUpdate === null) return null;
      if (this.caCertificateProvider !== null && this.latestCaUpdate === null) return null;
      return {
        ca: (_a = this.latestCaUpdate) === null || _a === undefined ? undefined : _a.caCertificate,
        cert: [this.latestIdentityUpdate.certificate],
        key: [this.latestIdentityUpdate.privateKey],
      };
    }
    finalizeUpdate() {
      let secureContextOptions = this.calculateSecureContextOptions();
      this.updateSecureContextOptions(secureContextOptions);
    }
    handleCaCertificateUpdate(update) {
      this.latestCaUpdate = update;
      this.finalizeUpdate();
    }
    handleIdentityCertitificateUpdate(update) {
      this.latestIdentityUpdate = update;
      this.finalizeUpdate();
    }
  }
  function createCertificateProviderServerCredentials(
    caCertificateProvider,
    identityCertificateProvider,
    requireClientCertificate,
  ) {
    return new CertificateProviderServerCredentials(
      caCertificateProvider,
      identityCertificateProvider,
      requireClientCertificate,
    );
  }
  class InterceptorServerCredentials extends ServerCredentials {
    constructor(childCredentials, interceptors) {
      super({});
      this.childCredentials = childCredentials;
      this.interceptors = interceptors;
    }
    _isSecure() {
      return this.childCredentials._isSecure();
    }
    _equals(other) {
      if (!(other instanceof InterceptorServerCredentials)) return false;
      if (!this.childCredentials._equals(other.childCredentials)) return false;
      if (this.interceptors.length !== other.interceptors.length) return false;
      for (let i = 0; i < this.interceptors.length; i++)
        if (this.interceptors[i] !== other.interceptors[i]) return false;
      return true;
    }
    _getInterceptors() {
      return this.interceptors;
    }
    _addWatcher(watcher) {
      this.childCredentials._addWatcher(watcher);
    }
    _removeWatcher(watcher) {
      this.childCredentials._removeWatcher(watcher);
    }
    _getConstructorOptions() {
      return this.childCredentials._getConstructorOptions();
    }
    _getSecureContextOptions() {
      return this.childCredentials._getSecureContextOptions();
    }
  }
  function createServerCredentialsWithInterceptors(credentials, interceptors) {
    return new InterceptorServerCredentials(credentials, interceptors);
  }
});
export { require_server_credentials };
