/**
 * @grpc/grpc-js/build/src/channel-credentials.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_call_credentials } from "./call-credentials.js";
import { require_tls_helpers } from "./tls-helpers.js";
import { require_uri_parser } from "./uri-parser.js";
import { require_resolver } from "./resolver.js";
import { require_logging } from "./logging.js";
import { require_constants } from "./constants.js";

//@ chunk-3k21nfa0.js:12568-19811 cjs-fingerprint
var require_channel_credentials = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ChannelCredentials = undefined;
  cjsExports.createCertificateProviderChannelCredentials = createCertificateProviderChannelCredentials;
  var tls_1 = importMetaRequire("tls");
  var call_credentials_1 = require_call_credentials();
  var tls_helpers_1 = require_tls_helpers();
  var uri_parser_1 = require_uri_parser();
  var resolver_1 = require_resolver();
  var logging_1 = require_logging();
  var constants_1 = require_constants();
  function verifyIsBufferOrNull(obj, friendlyName) {
    if (obj && !(obj instanceof Buffer)) throw TypeError(`${friendlyName}, if provided, must be a Buffer.`);
  }
  class ChannelCredentials {
    compose(callCredentials) {
      return new ComposedChannelCredentialsImpl(this, callCredentials);
    }
    static createSsl(rootCerts, privateKey, certChain, verifyOptions) {
      var _a;
      verifyIsBufferOrNull(rootCerts, "Root certificate");
      verifyIsBufferOrNull(privateKey, "Private key");
      verifyIsBufferOrNull(certChain, "Certificate chain");
      if (privateKey && !certChain)
        throw Error("Private key must be given with accompanying certificate chain");
      if (!privateKey && certChain)
        throw Error("Certificate chain must be given with accompanying private key");
      let secureContext = tls_1.createSecureContext({
        ca:
          (_a =
            rootCerts !== null && rootCerts !== undefined
              ? rootCerts
              : tls_helpers_1.getDefaultRootsData()) !== null && _a !== undefined
            ? _a
            : undefined,
        key: privateKey !== null && privateKey !== undefined ? privateKey : undefined,
        cert: certChain !== null && certChain !== undefined ? certChain : undefined,
        ciphers: tls_helpers_1.CIPHER_SUITES,
      });
      return new SecureChannelCredentialsImpl(
        secureContext,
        verifyOptions !== null && verifyOptions !== undefined ? verifyOptions : {},
      );
    }
    static createFromSecureContext(secureContext, verifyOptions) {
      return new SecureChannelCredentialsImpl(
        secureContext,
        verifyOptions !== null && verifyOptions !== undefined ? verifyOptions : {},
      );
    }
    static createInsecure() {
      return new InsecureChannelCredentialsImpl();
    }
  }
  cjsExports.ChannelCredentials = ChannelCredentials;
  class InsecureChannelCredentialsImpl extends ChannelCredentials {
    constructor() {
      super();
    }
    compose(callCredentials) {
      throw Error("Cannot compose insecure credentials");
    }
    _isSecure() {
      return false;
    }
    _equals(other) {
      return other instanceof InsecureChannelCredentialsImpl;
    }
    _createSecureConnector(channelTarget, options, callCredentials) {
      return {
        connect(socket) {
          return Promise.resolve({
            socket,
            secure: false,
          });
        },
        waitForReady: () => Promise.resolve(),
        getCallCredentials: () =>
          callCredentials !== null && callCredentials !== undefined
            ? callCredentials
            : call_credentials_1.CallCredentials.createEmpty(),
        destroy() {},
      };
    }
  }
  function getConnectionOptions(secureContext, verifyOptions, channelTarget, options) {
    var _a;
    var _b;
    let connectionOptions = {
      secureContext,
    };
    let realTarget = channelTarget;
    if ("grpc.http_connect_target" in options) {
      let parsedTarget = uri_parser_1.parseUri(options["grpc.http_connect_target"]);
      if (parsedTarget) realTarget = parsedTarget;
    }
    let targetPath = resolver_1.getDefaultAuthority(realTarget);
    let hostPort = uri_parser_1.splitHostPort(targetPath);
    let remoteHost =
      (_a = hostPort === null || hostPort === undefined ? undefined : hostPort.host) !== null &&
      _a !== undefined
        ? _a
        : targetPath;
    connectionOptions.host = remoteHost;
    if (verifyOptions.checkServerIdentity)
      connectionOptions.checkServerIdentity = verifyOptions.checkServerIdentity;
    if (verifyOptions.rejectUnauthorized !== undefined)
      connectionOptions.rejectUnauthorized = verifyOptions.rejectUnauthorized;
    connectionOptions.ALPNProtocols = ["h2"];
    if (options["grpc.ssl_target_name_override"]) {
      let sslTargetNameOverride = options["grpc.ssl_target_name_override"];
      let originalCheckServerIdentity =
        (_b = connectionOptions.checkServerIdentity) !== null && _b !== undefined
          ? _b
          : tls_1.checkServerIdentity;
      connectionOptions.checkServerIdentity = (host, cert) =>
        originalCheckServerIdentity(sslTargetNameOverride, cert);
      connectionOptions.servername = sslTargetNameOverride;
    } else connectionOptions.servername = remoteHost;
    if (options["grpc-node.tls_enable_trace"]) connectionOptions.enableTrace = true;
    return connectionOptions;
  }
  class SecureConnectorImpl {
    constructor(connectionOptions, callCredentials) {
      this.connectionOptions = connectionOptions;
      this.callCredentials = callCredentials;
    }
    connect(socket) {
      let tlsConnectOptions = Object.assign(
        {
          socket,
        },
        this.connectionOptions,
      );
      return new Promise((resolve, reject) => {
        let tlsSocket = tls_1.connect(tlsConnectOptions, () => {
          var _a;
          if (
            ((_a = this.connectionOptions.rejectUnauthorized) !== null && _a !== undefined ? _a : true) &&
            !tlsSocket.authorized
          ) {
            reject(tlsSocket.authorizationError);
            return;
          }
          resolve({
            socket: tlsSocket,
            secure: true,
          });
        });
        tlsSocket.on("error", (error) => {
          reject(error);
        });
      });
    }
    waitForReady() {
      return Promise.resolve();
    }
    getCallCredentials() {
      return this.callCredentials;
    }
    destroy() {}
  }
  class SecureChannelCredentialsImpl extends ChannelCredentials {
    constructor(secureContext, verifyOptions) {
      super();
      this.secureContext = secureContext;
      this.verifyOptions = verifyOptions;
    }
    _isSecure() {
      return true;
    }
    _equals(other) {
      if (this === other) return true;
      if (other instanceof SecureChannelCredentialsImpl)
        return (
          this.secureContext === other.secureContext &&
          this.verifyOptions.checkServerIdentity === other.verifyOptions.checkServerIdentity
        );
      else return false;
    }
    _createSecureConnector(channelTarget, options, callCredentials) {
      let connectionOptions = getConnectionOptions(
        this.secureContext,
        this.verifyOptions,
        channelTarget,
        options,
      );
      return new SecureConnectorImpl(
        connectionOptions,
        callCredentials !== null && callCredentials !== undefined
          ? callCredentials
          : call_credentials_1.CallCredentials.createEmpty(),
      );
    }
  }
  class CertificateProviderChannelCredentialsImpl extends ChannelCredentials {
    constructor(caCertificateProvider, identityCertificateProvider, verifyOptions) {
      super();
      this.caCertificateProvider = caCertificateProvider;
      this.identityCertificateProvider = identityCertificateProvider;
      this.verifyOptions = verifyOptions;
      this.refcount = 0;
      this.latestCaUpdate = undefined;
      this.latestIdentityUpdate = undefined;
      this.caCertificateUpdateListener = this.handleCaCertificateUpdate.bind(this);
      this.identityCertificateUpdateListener = this.handleIdentityCertitificateUpdate.bind(this);
      this.secureContextWatchers = [];
    }
    _isSecure() {
      return true;
    }
    _equals(other) {
      var _a;
      var _b;
      if (this === other) return true;
      if (other instanceof CertificateProviderChannelCredentialsImpl)
        return (
          this.caCertificateProvider === other.caCertificateProvider &&
          this.identityCertificateProvider === other.identityCertificateProvider &&
          ((_a = this.verifyOptions) === null || _a === undefined ? undefined : _a.checkServerIdentity) ===
            ((_b = other.verifyOptions) === null || _b === undefined ? undefined : _b.checkServerIdentity)
        );
      else return false;
    }
    ref() {
      var _a;
      if (this.refcount === 0) {
        this.caCertificateProvider.addCaCertificateListener(this.caCertificateUpdateListener);
        if (!((_a = this.identityCertificateProvider) === null || _a === undefined))
          _a.addIdentityCertificateListener(this.identityCertificateUpdateListener);
      }
      this.refcount += 1;
    }
    unref() {
      var _a;
      this.refcount -= 1;
      if (this.refcount === 0) {
        this.caCertificateProvider.removeCaCertificateListener(this.caCertificateUpdateListener);
        if (!((_a = this.identityCertificateProvider) === null || _a === undefined))
          _a.removeIdentityCertificateListener(this.identityCertificateUpdateListener);
      }
    }
    _createSecureConnector(channelTarget, options, callCredentials) {
      this.ref();
      return new CertificateProviderChannelCredentialsImpl.SecureConnectorImpl(
        this,
        channelTarget,
        options,
        callCredentials !== null && callCredentials !== undefined
          ? callCredentials
          : call_credentials_1.CallCredentials.createEmpty(),
      );
    }
    maybeUpdateWatchers() {
      if (this.hasReceivedUpdates()) {
        for (let watcher of this.secureContextWatchers) watcher(this.getLatestSecureContext());
        this.secureContextWatchers = [];
      }
    }
    handleCaCertificateUpdate(update) {
      this.latestCaUpdate = update;
      this.maybeUpdateWatchers();
    }
    handleIdentityCertitificateUpdate(update) {
      this.latestIdentityUpdate = update;
      this.maybeUpdateWatchers();
    }
    hasReceivedUpdates() {
      if (this.latestCaUpdate === undefined) return false;
      if (this.identityCertificateProvider && this.latestIdentityUpdate === undefined) return false;
      return true;
    }
    getSecureContext() {
      if (this.hasReceivedUpdates()) return Promise.resolve(this.getLatestSecureContext());
      else
        return new Promise((resolve) => {
          this.secureContextWatchers.push(resolve);
        });
    }
    getLatestSecureContext() {
      var _a;
      var _b;
      if (!this.latestCaUpdate) return null;
      if (this.identityCertificateProvider !== null && !this.latestIdentityUpdate) return null;
      try {
        return tls_1.createSecureContext({
          ca: this.latestCaUpdate.caCertificate,
          key: (_a = this.latestIdentityUpdate) === null || _a === undefined ? undefined : _a.privateKey,
          cert: (_b = this.latestIdentityUpdate) === null || _b === undefined ? undefined : _b.certificate,
          ciphers: tls_helpers_1.CIPHER_SUITES,
        });
      } catch (e) {
        logging_1.log(
          constants_1.LogVerbosity.ERROR,
          "Failed to createSecureContext with error " + e.message,
        );
        return null;
      }
    }
  }
  CertificateProviderChannelCredentialsImpl.SecureConnectorImpl = class {
    constructor(parent, channelTarget, options, callCredentials) {
      this.parent = parent;
      this.channelTarget = channelTarget;
      this.options = options;
      this.callCredentials = callCredentials;
    }
    connect(socket) {
      return new Promise((resolve, reject) => {
        let secureContext = this.parent.getLatestSecureContext();
        if (!secureContext) {
          reject(Error("Failed to load credentials"));
          return;
        }
        if (socket.closed) reject(Error("Socket closed while loading credentials"));
        let connnectionOptions = getConnectionOptions(
          secureContext,
          this.parent.verifyOptions,
          this.channelTarget,
          this.options,
        );
        let tlsConnectOptions = Object.assign(
          {
            socket,
          },
          connnectionOptions,
        );
        let closeCallback = () => {
          reject(Error("Socket closed"));
        };
        let errorCallback = (error) => {
          reject(error);
        };
        let tlsSocket = tls_1.connect(tlsConnectOptions, () => {
          var _a;
          tlsSocket.removeListener("close", closeCallback);
          tlsSocket.removeListener("error", errorCallback);
          if (
            ((_a = this.parent.verifyOptions.rejectUnauthorized) !== null && _a !== undefined ? _a : true) &&
            !tlsSocket.authorized
          ) {
            reject(tlsSocket.authorizationError);
            return;
          }
          resolve({
            socket: tlsSocket,
            secure: true,
          });
        });
        tlsSocket.once("close", closeCallback);
        tlsSocket.once("error", errorCallback);
      });
    }
    async waitForReady() {
      await this.parent.getSecureContext();
    }
    getCallCredentials() {
      return this.callCredentials;
    }
    destroy() {
      this.parent.unref();
    }
  };
  function createCertificateProviderChannelCredentials(
    caCertificateProvider,
    identityCertificateProvider,
    verifyOptions,
  ) {
    return new CertificateProviderChannelCredentialsImpl(
      caCertificateProvider,
      identityCertificateProvider,
      verifyOptions !== null && verifyOptions !== undefined ? verifyOptions : {},
    );
  }
  class ComposedChannelCredentialsImpl extends ChannelCredentials {
    constructor(channelCredentials, callCredentials) {
      super();
      this.channelCredentials = channelCredentials;
      this.callCredentials = callCredentials;
      if (!channelCredentials._isSecure()) throw Error("Cannot compose insecure credentials");
    }
    compose(callCredentials) {
      let combinedCallCredentials = this.callCredentials.compose(callCredentials);
      return new ComposedChannelCredentialsImpl(this.channelCredentials, combinedCallCredentials);
    }
    _isSecure() {
      return true;
    }
    _equals(other) {
      if (this === other) return true;
      if (other instanceof ComposedChannelCredentialsImpl)
        return (
          this.channelCredentials._equals(other.channelCredentials) &&
          this.callCredentials._equals(other.callCredentials)
        );
      else return false;
    }
    _createSecureConnector(channelTarget, options, callCredentials) {
      let combinedCallCredentials = this.callCredentials.compose(
        callCredentials !== null && callCredentials !== undefined
          ? callCredentials
          : call_credentials_1.CallCredentials.createEmpty(),
      );
      return this.channelCredentials._createSecureConnector(channelTarget, options, combinedCallCredentials);
    }
  }
});
export { require_channel_credentials };
