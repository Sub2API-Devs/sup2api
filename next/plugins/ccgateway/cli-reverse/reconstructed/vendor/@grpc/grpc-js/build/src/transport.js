/**
 * @grpc/grpc-js/build/src/transport.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_channelz } from "./channelz.js";
import { require_constants } from "./constants.js";
import { require_http_proxy } from "./http_proxy.js";
import { require_logging } from "./logging.js";
import { require_resolver } from "./resolver.js";
import { require_subchannel_address } from "./subchannel-address.js";
import { require_uri_parser } from "./uri-parser.js";
import { require_subchannel_call } from "./subchannel-call.js";
import { require_call_number } from "./call-number.js";
import { require_package } from "../../package.json.js";

//@ chunk-pwh5dx3n.js:224816-236314 cjs-fingerprint
var require_transport = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Http2SubchannelConnector = undefined;
  var http2 = importMetaRequire("http2");
  var tls_1 = importMetaRequire("tls");
  var channelz_1 = require_channelz();
  var constants_1 = require_constants();
  var http_proxy_1 = require_http_proxy();
  var logging = require_logging();
  var resolver_1 = require_resolver();
  var subchannel_address_1 = require_subchannel_address();
  var uri_parser_1 = require_uri_parser();
  var net = importMetaRequire("net");
  var subchannel_call_1 = require_subchannel_call();
  var call_number_1 = require_call_number();
  var TRACER_NAME = "transport";
  var FLOW_CONTROL_TRACER_NAME = "transport_flowctrl";
  var clientVersion = require_package().version;
  var {
    HTTP2_HEADER_AUTHORITY,
    HTTP2_HEADER_CONTENT_TYPE,
    HTTP2_HEADER_METHOD,
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_TE,
    HTTP2_HEADER_USER_AGENT,
  } = http2.constants;
  var KEEPALIVE_TIMEOUT_MS = 20000;
  var tooManyPingsData = Buffer.from("too_many_pings", "ascii");
  class Http2Transport {
    constructor(session, subchannelAddress, options, remoteName) {
      this.session = session;
      this.options = options;
      this.remoteName = remoteName;
      this.keepaliveTimer = null;
      this.pendingSendKeepalivePing = false;
      this.activeCalls = new Set();
      this.disconnectListeners = [];
      this.disconnectHandled = false;
      this.channelzEnabled = true;
      this.keepalivesSent = 0;
      this.messagesSent = 0;
      this.messagesReceived = 0;
      this.lastMessageSentTimestamp = null;
      this.lastMessageReceivedTimestamp = null;
      this.subchannelAddressString = subchannel_address_1.subchannelAddressToString(subchannelAddress);
      if (options["grpc.enable_channelz"] === 0) {
        this.channelzEnabled = false;
        this.streamTracker = new channelz_1.ChannelzCallTrackerStub();
      } else this.streamTracker = new channelz_1.ChannelzCallTracker();
      this.channelzRef = channelz_1.registerChannelzSocket(
        this.subchannelAddressString,
        () => this.getChannelzInfo(),
        this.channelzEnabled,
      );
      this.userAgent = [
        options["grpc.primary_user_agent"],
        `grpc-node-js/${clientVersion}`,
        options["grpc.secondary_user_agent"],
      ]
        .filter((e) => e)
        .join(" ");
      if ("grpc.keepalive_time_ms" in options) this.keepaliveTimeMs = options["grpc.keepalive_time_ms"];
      else this.keepaliveTimeMs = -1;
      if ("grpc.keepalive_timeout_ms" in options)
        this.keepaliveTimeoutMs = options["grpc.keepalive_timeout_ms"];
      else this.keepaliveTimeoutMs = KEEPALIVE_TIMEOUT_MS;
      if ("grpc.keepalive_permit_without_calls" in options)
        this.keepaliveWithoutCalls = options["grpc.keepalive_permit_without_calls"] === 1;
      else this.keepaliveWithoutCalls = false;
      session.once("close", () => {
        this.trace("session closed");
        this.handleDisconnect();
      });
      session.once("goaway", (errorCode, lastStreamID, opaqueData) => {
        let tooManyPings = false;
        if (
          errorCode === http2.constants.NGHTTP2_ENHANCE_YOUR_CALM &&
          opaqueData &&
          opaqueData.equals(tooManyPingsData)
        )
          tooManyPings = true;
        this.trace(
          "connection closed by GOAWAY with code " +
            errorCode +
            " and data " +
            (opaqueData === null || opaqueData === undefined ? undefined : opaqueData.toString()),
        );
        this.reportDisconnectToOwner(tooManyPings);
      });
      session.once("error", (error) => {
        this.trace("connection closed with error " + error.message);
        this.handleDisconnect();
      });
      session.socket.once("close", (hadError) => {
        this.trace("connection closed. hadError=" + hadError);
        this.handleDisconnect();
      });
      if (logging.isTracerEnabled(TRACER_NAME)) {
        session.on("remoteSettings", (settings) => {
          this.trace(
            "new settings received" +
              (this.session !== session ? " on the old connection" : "") +
              ": " +
              JSON.stringify(settings),
          );
        });
        session.on("localSettings", (settings) => {
          this.trace(
            "local settings acknowledged by remote" +
              (this.session !== session ? " on the old connection" : "") +
              ": " +
              JSON.stringify(settings),
          );
        });
      }
      if (this.keepaliveWithoutCalls) this.maybeStartKeepalivePingTimer();
      if (session.socket instanceof tls_1.TLSSocket)
        this.authContext = {
          transportSecurityType: "ssl",
          sslPeerCertificate: session.socket.getPeerCertificate(),
        };
      else this.authContext = {};
    }
    getChannelzInfo() {
      var _a;
      var _b;
      var _c;
      let sessionSocket = this.session.socket;
      let remoteAddress = sessionSocket.remoteAddress
        ? subchannel_address_1.stringToSubchannelAddress(
            sessionSocket.remoteAddress,
            sessionSocket.remotePort,
          )
        : null;
      let localAddress = sessionSocket.localAddress
        ? subchannel_address_1.stringToSubchannelAddress(sessionSocket.localAddress, sessionSocket.localPort)
        : null;
      let tlsInfo;
      if (this.session.encrypted) {
        let tlsSocket = sessionSocket;
        let cipherInfo = tlsSocket.getCipher();
        let certificate = tlsSocket.getCertificate();
        let peerCertificate = tlsSocket.getPeerCertificate();
        tlsInfo = {
          cipherSuiteStandardName: (_a = cipherInfo.standardName) !== null && _a !== undefined ? _a : null,
          cipherSuiteOtherName: cipherInfo.standardName ? null : cipherInfo.name,
          localCertificate: certificate && "raw" in certificate ? certificate.raw : null,
          remoteCertificate: peerCertificate && "raw" in peerCertificate ? peerCertificate.raw : null,
        };
      } else tlsInfo = null;
      return {
        remoteAddress,
        localAddress,
        security: tlsInfo,
        remoteName: this.remoteName,
        streamsStarted: this.streamTracker.callsStarted,
        streamsSucceeded: this.streamTracker.callsSucceeded,
        streamsFailed: this.streamTracker.callsFailed,
        messagesSent: this.messagesSent,
        messagesReceived: this.messagesReceived,
        keepAlivesSent: this.keepalivesSent,
        lastLocalStreamCreatedTimestamp: this.streamTracker.lastCallStartedTimestamp,
        lastRemoteStreamCreatedTimestamp: null,
        lastMessageSentTimestamp: this.lastMessageSentTimestamp,
        lastMessageReceivedTimestamp: this.lastMessageReceivedTimestamp,
        localFlowControlWindow:
          (_b = this.session.state.localWindowSize) !== null && _b !== undefined ? _b : null,
        remoteFlowControlWindow:
          (_c = this.session.state.remoteWindowSize) !== null && _c !== undefined ? _c : null,
      };
    }
    trace(text) {
      logging.trace(
        constants_1.LogVerbosity.DEBUG,
        TRACER_NAME,
        "(" + this.channelzRef.id + ") " + this.subchannelAddressString + " " + text,
      );
    }
    keepaliveTrace(text) {
      logging.trace(
        constants_1.LogVerbosity.DEBUG,
        "keepalive",
        "(" + this.channelzRef.id + ") " + this.subchannelAddressString + " " + text,
      );
    }
    flowControlTrace(text) {
      logging.trace(
        constants_1.LogVerbosity.DEBUG,
        FLOW_CONTROL_TRACER_NAME,
        "(" + this.channelzRef.id + ") " + this.subchannelAddressString + " " + text,
      );
    }
    internalsTrace(text) {
      logging.trace(
        constants_1.LogVerbosity.DEBUG,
        "transport_internals",
        "(" + this.channelzRef.id + ") " + this.subchannelAddressString + " " + text,
      );
    }
    reportDisconnectToOwner(tooManyPings) {
      if (this.disconnectHandled) return;
      this.disconnectHandled = true;
      this.disconnectListeners.forEach((listener) => listener(tooManyPings));
    }
    handleDisconnect() {
      this.clearKeepaliveTimeout();
      this.reportDisconnectToOwner(false);
      for (let call of this.activeCalls) call.onDisconnect();
      setImmediate(() => {
        this.session.destroy();
      });
    }
    addDisconnectListener(listener) {
      this.disconnectListeners.push(listener);
    }
    canSendPing() {
      return (
        !this.session.destroyed &&
        this.keepaliveTimeMs > 0 &&
        (this.keepaliveWithoutCalls || this.activeCalls.size > 0)
      );
    }
    maybeSendPing() {
      var _a;
      var _b;
      if (!this.canSendPing()) {
        this.pendingSendKeepalivePing = true;
        return;
      }
      if (this.keepaliveTimer) {
        console.error("keepaliveTimeout is not null");
        return;
      }
      if (this.channelzEnabled) this.keepalivesSent += 1;
      this.keepaliveTrace("Sending ping with timeout " + this.keepaliveTimeoutMs + "ms");
      this.keepaliveTimer = setTimeout(() => {
        this.keepaliveTimer = null;
        this.keepaliveTrace("Ping timeout passed without response");
        this.handleDisconnect();
      }, this.keepaliveTimeoutMs);
      if (!((_b = (_a = this.keepaliveTimer).unref) === null || _b === undefined)) _b.call(_a);
      let pingSendError = "";
      try {
        if (
          !this.session.ping((err, duration, payload) => {
            this.clearKeepaliveTimeout();
            if (err) {
              this.keepaliveTrace("Ping failed with error " + err.message);
              this.handleDisconnect();
            } else {
              this.keepaliveTrace("Received ping response");
              this.maybeStartKeepalivePingTimer();
            }
          })
        )
          pingSendError = "Ping returned false";
      } catch (e) {
        pingSendError = (e instanceof Error ? e.message : "") || "Unknown error";
      }
      if (pingSendError) {
        this.keepaliveTrace("Ping send failed: " + pingSendError);
        this.handleDisconnect();
      }
    }
    maybeStartKeepalivePingTimer() {
      var _a;
      var _b;
      if (!this.canSendPing()) return;
      if (this.pendingSendKeepalivePing) {
        this.pendingSendKeepalivePing = false;
        this.maybeSendPing();
      } else if (!this.keepaliveTimer) {
        this.keepaliveTrace("Starting keepalive timer for " + this.keepaliveTimeMs + "ms");
        this.keepaliveTimer = setTimeout(() => {
          this.keepaliveTimer = null;
          this.maybeSendPing();
        }, this.keepaliveTimeMs);
        if (!((_b = (_a = this.keepaliveTimer).unref) === null || _b === undefined)) _b.call(_a);
      }
    }
    clearKeepaliveTimeout() {
      if (this.keepaliveTimer) {
        clearTimeout(this.keepaliveTimer);
        this.keepaliveTimer = null;
      }
    }
    removeActiveCall(call) {
      this.activeCalls.delete(call);
      if (this.activeCalls.size === 0) this.session.unref();
    }
    addActiveCall(call) {
      this.activeCalls.add(call);
      if (this.activeCalls.size === 1) {
        this.session.ref();
        if (!this.keepaliveWithoutCalls) this.maybeStartKeepalivePingTimer();
      }
    }
    createCall(metadata, host, method, listener, subchannelCallStatsTracker) {
      let headers = metadata.toHttp2Headers();
      headers[HTTP2_HEADER_AUTHORITY] = host;
      headers[HTTP2_HEADER_USER_AGENT] = this.userAgent;
      headers[HTTP2_HEADER_CONTENT_TYPE] = "application/grpc";
      headers[HTTP2_HEADER_METHOD] = "POST";
      headers[HTTP2_HEADER_PATH] = method;
      headers[HTTP2_HEADER_TE] = "trailers";
      let http2Stream;
      try {
        http2Stream = this.session.request(headers);
      } catch (e) {
        this.handleDisconnect();
        throw e;
      }
      this.flowControlTrace(
        "local window size: " +
          this.session.state.localWindowSize +
          " remote window size: " +
          this.session.state.remoteWindowSize,
      );
      this.internalsTrace(
        "session.closed=" +
          this.session.closed +
          " session.destroyed=" +
          this.session.destroyed +
          " session.socket.destroyed=" +
          this.session.socket.destroyed,
      );
      let eventTracker;
      let call;
      if (this.channelzEnabled) {
        this.streamTracker.addCallStarted();
        eventTracker = {
          addMessageSent: () => {
            var _a;
            this.messagesSent += 1;
            this.lastMessageSentTimestamp = new Date();
            if (!((_a = subchannelCallStatsTracker.addMessageSent) === null || _a === undefined))
              _a.call(subchannelCallStatsTracker);
          },
          addMessageReceived: () => {
            var _a;
            this.messagesReceived += 1;
            this.lastMessageReceivedTimestamp = new Date();
            if (!((_a = subchannelCallStatsTracker.addMessageReceived) === null || _a === undefined))
              _a.call(subchannelCallStatsTracker);
          },
          onCallEnd: (status) => {
            var _a;
            if (!((_a = subchannelCallStatsTracker.onCallEnd) === null || _a === undefined))
              _a.call(subchannelCallStatsTracker, status);
            this.removeActiveCall(call);
          },
          onStreamEnd: (success) => {
            var _a;
            if (success) this.streamTracker.addCallSucceeded();
            else this.streamTracker.addCallFailed();
            if (!((_a = subchannelCallStatsTracker.onStreamEnd) === null || _a === undefined))
              _a.call(subchannelCallStatsTracker, success);
          },
        };
      } else
        eventTracker = {
          addMessageSent: () => {
            var _a;
            if (!((_a = subchannelCallStatsTracker.addMessageSent) === null || _a === undefined))
              _a.call(subchannelCallStatsTracker);
          },
          addMessageReceived: () => {
            var _a;
            if (!((_a = subchannelCallStatsTracker.addMessageReceived) === null || _a === undefined))
              _a.call(subchannelCallStatsTracker);
          },
          onCallEnd: (status) => {
            var _a;
            if (!((_a = subchannelCallStatsTracker.onCallEnd) === null || _a === undefined))
              _a.call(subchannelCallStatsTracker, status);
            this.removeActiveCall(call);
          },
          onStreamEnd: (success) => {
            var _a;
            if (!((_a = subchannelCallStatsTracker.onStreamEnd) === null || _a === undefined))
              _a.call(subchannelCallStatsTracker, success);
          },
        };
      call = new subchannel_call_1.Http2SubchannelCall(
        http2Stream,
        eventTracker,
        listener,
        this,
        call_number_1.getNextCallNumber(),
      );
      this.addActiveCall(call);
      return call;
    }
    getChannelzRef() {
      return this.channelzRef;
    }
    getPeerName() {
      return this.subchannelAddressString;
    }
    getOptions() {
      return this.options;
    }
    getAuthContext() {
      return this.authContext;
    }
    shutdown() {
      this.session.close();
      channelz_1.unregisterChannelzRef(this.channelzRef);
    }
  }
  class Http2SubchannelConnector {
    constructor(channelTarget) {
      this.channelTarget = channelTarget;
      this.session = null;
      this.isShutdown = false;
    }
    trace(text) {
      logging.trace(
        constants_1.LogVerbosity.DEBUG,
        TRACER_NAME,
        uri_parser_1.uriToString(this.channelTarget) + " " + text,
      );
    }
    createSession(secureConnectResult, address, options) {
      if (this.isShutdown) return Promise.reject();
      if (secureConnectResult.socket.closed)
        return Promise.reject("Connection closed before starting HTTP/2 handshake");
      return new Promise((resolve, reject) => {
        var _a;
        var _b;
        var _c;
        var _d;
        var _e;
        var _f;
        var _g;
        var _h;
        let remoteName = null;
        let realTarget = this.channelTarget;
        if ("grpc.http_connect_target" in options) {
          let parsedTarget = uri_parser_1.parseUri(options["grpc.http_connect_target"]);
          if (parsedTarget) {
            realTarget = parsedTarget;
            remoteName = uri_parser_1.uriToString(parsedTarget);
          }
        }
        let scheme = secureConnectResult.secure ? "https" : "http";
        let targetPath = resolver_1.getDefaultAuthority(realTarget);
        let closeHandler = () => {
          var _a;
          if (!((_a = this.session) === null || _a === undefined)) _a.destroy();
          this.session = null;
          setImmediate(() => {
            if (!reportedError) {
              reportedError = true;
              reject(`${errorMessage.trim()} (${new Date().toISOString()})`);
            }
          });
        };
        let errorHandler = (error) => {
          var _a;
          if (!((_a = this.session) === null || _a === undefined)) _a.destroy();
          errorMessage = error.message;
          this.trace("connection failed with error " + errorMessage);
          if (!reportedError) {
            reportedError = true;
            reject(`${errorMessage} (${new Date().toISOString()})`);
          }
        };
        let sessionOptions = {
          createConnection: (authority, option) => secureConnectResult.socket,
          settings: {
            initialWindowSize:
              (_d =
                (_a = options["grpc-node.flow_control_window"]) !== null && _a !== undefined
                  ? _a
                  : (_c =
                        (_b = http2.getDefaultSettings) === null || _b === undefined
                          ? undefined
                          : _b.call(http2)) === null || _c === undefined
                    ? undefined
                    : _c.initialWindowSize) !== null && _d !== undefined
                ? _d
                : 65535,
          },
          maxSendHeaderBlockLength: Number.MAX_SAFE_INTEGER,
          maxSessionMemory:
            (_e = options["grpc-node.max_session_memory"]) !== null && _e !== undefined
              ? _e
              : Number.MAX_SAFE_INTEGER,
        };
        let session = http2.connect(`${scheme}://${targetPath}`, sessionOptions);
        let defaultWin =
          (_h =
            (_g =
              (_f = http2.getDefaultSettings) === null || _f === undefined ? undefined : _f.call(http2)) ===
              null || _g === undefined
              ? undefined
              : _g.initialWindowSize) !== null && _h !== undefined
            ? _h
            : 65535;
        let connWin = options["grpc-node.flow_control_window"];
        this.session = session;
        let errorMessage = "Failed to connect";
        let reportedError = false;
        session.unref();
        session.once("remoteSettings", () => {
          var _a;
          if (connWin && connWin > defaultWin)
            try {
              session.setLocalWindowSize(connWin);
            } catch (_b) {
              let delta =
                connWin -
                ((_a = session.state.localWindowSize) !== null && _a !== undefined ? _a : defaultWin);
              if (delta > 0) session.incrementWindowSize(delta);
            }
          session.removeAllListeners();
          secureConnectResult.socket.removeListener("close", closeHandler);
          secureConnectResult.socket.removeListener("error", errorHandler);
          resolve(new Http2Transport(session, address, options, remoteName));
          this.session = null;
        });
        session.once("close", closeHandler);
        session.once("error", errorHandler);
        secureConnectResult.socket.once("close", closeHandler);
        secureConnectResult.socket.once("error", errorHandler);
      });
    }
    tcpConnect(address, options) {
      return http_proxy_1.getProxiedConnection(address, options).then((proxiedSocket) => {
        if (proxiedSocket) return proxiedSocket;
        else
          return new Promise((resolve, reject) => {
            let closeCallback = () => {
              reject(Error("Socket closed"));
            };
            let errorCallback = (error) => {
              reject(error);
            };
            let socket = net.connect(address, () => {
              socket.removeListener("close", closeCallback);
              socket.removeListener("error", errorCallback);
              resolve(socket);
            });
            socket.once("close", closeCallback);
            socket.once("error", errorCallback);
          });
      });
    }
    async connect(address, secureConnector, options) {
      if (this.isShutdown) return Promise.reject();
      let tcpConnection = null;
      let secureConnectResult = null;
      let addressString = subchannel_address_1.subchannelAddressToString(address);
      try {
        this.trace(addressString + " Waiting for secureConnector to be ready");
        await secureConnector.waitForReady();
        this.trace(addressString + " secureConnector is ready");
        tcpConnection = await this.tcpConnect(address, options);
        tcpConnection.setNoDelay();
        this.trace(addressString + " Established TCP connection");
        secureConnectResult = await secureConnector.connect(tcpConnection);
        this.trace(addressString + " Established secure connection");
        return this.createSession(secureConnectResult, address, options);
      } catch (e) {
        if (!(tcpConnection === null || tcpConnection === undefined)) tcpConnection.destroy();
        if (!(secureConnectResult === null || secureConnectResult === undefined))
          secureConnectResult.socket.destroy();
        throw e;
      }
    }
    shutdown() {
      var _a;
      this.isShutdown = true;
      if (!((_a = this.session) === null || _a === undefined)) _a.close();
      this.session = null;
    }
  }
  cjsExports.Http2SubchannelConnector = Http2SubchannelConnector;
});
export { require_transport };
