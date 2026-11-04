/**
 * @grpc/grpc-js/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";
import { rs } from "./call-credentials.js";
import { Ra } from "./channel.js";
import { _o } from "./compression-algorithms.js";
import { Ae } from "./connectivity-state.js";
import { Mr } from "./channel-credentials.js";
import { Ta } from "./client.js";
import { k } from "./constants.js";
import { K } from "./logging.js";
import { vs } from "./make-client.js";
import { ue } from "./metadata.js";
import { dm } from "./server.js";
import { dn } from "./server-credentials.js";
import { gm } from "./status-builder.js";
import { Ca } from "./client-interceptors.js";
import { Zt } from "./channelz.js";
import { fs } from "./admin.js";
import { zo } from "./server-interceptors.js";
import { pn } from "./orca.js";
import { Vo } from "./experimental.js";
import { Oo } from "./resolver-dns.js";
import { Hm } from "./resolver-uds.js";
import { Vm } from "./resolver-ip.js";
import { ji } from "./load-balancer-pick-first.js";
import { rv } from "./load-balancer-round-robin.js";
import { pv } from "./load-balancer-outlier-detection.js";
import { Av } from "./load-balancer-weighted-round-robin.js";

//@ chunk-pwh5dx3n.js:380538-385561 cjs-fingerprint
var Ki = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.experimental =
    cjsExports.ServerMetricRecorder =
    cjsExports.ServerInterceptingCall =
    cjsExports.ResponderBuilder =
    cjsExports.ServerListenerBuilder =
    cjsExports.addAdminServicesToServer =
    cjsExports.getChannelzHandlers =
    cjsExports.getChannelzServiceDefinition =
    cjsExports.InterceptorConfigurationError =
    cjsExports.InterceptingCall =
    cjsExports.RequesterBuilder =
    cjsExports.ListenerBuilder =
    cjsExports.StatusBuilder =
    cjsExports.getClientChannel =
    cjsExports.ServerCredentials =
    cjsExports.Server =
    cjsExports.setLogVerbosity =
    cjsExports.setLogger =
    cjsExports.load =
    cjsExports.loadObject =
    cjsExports.CallCredentials =
    cjsExports.ChannelCredentials =
    cjsExports.waitForClientReady =
    cjsExports.closeClient =
    cjsExports.Channel =
    cjsExports.makeGenericClientConstructor =
    cjsExports.makeClientConstructor =
    cjsExports.loadPackageDefinition =
    cjsExports.Client =
    cjsExports.compressionAlgorithms =
    cjsExports.propagate =
    cjsExports.connectivityState =
    cjsExports.status =
    cjsExports.logVerbosity =
    cjsExports.Metadata =
    cjsExports.credentials =
      undefined;
  var call_credentials_1 = rs();
  Object.defineProperty(cjsExports, "CallCredentials", {
    enumerable: true,
    get: function () {
      return call_credentials_1.CallCredentials;
    },
  });
  var channel_1 = Ra();
  Object.defineProperty(cjsExports, "Channel", {
    enumerable: true,
    get: function () {
      return channel_1.ChannelImplementation;
    },
  });
  var compression_algorithms_1 = _o();
  Object.defineProperty(cjsExports, "compressionAlgorithms", {
    enumerable: true,
    get: function () {
      return compression_algorithms_1.CompressionAlgorithms;
    },
  });
  var connectivity_state_1 = Ae();
  Object.defineProperty(cjsExports, "connectivityState", {
    enumerable: true,
    get: function () {
      return connectivity_state_1.ConnectivityState;
    },
  });
  var channel_credentials_1 = Mr();
  Object.defineProperty(cjsExports, "ChannelCredentials", {
    enumerable: true,
    get: function () {
      return channel_credentials_1.ChannelCredentials;
    },
  });
  var client_1 = Ta();
  Object.defineProperty(cjsExports, "Client", {
    enumerable: true,
    get: function () {
      return client_1.Client;
    },
  });
  var constants_1 = k();
  Object.defineProperty(cjsExports, "logVerbosity", {
    enumerable: true,
    get: function () {
      return constants_1.LogVerbosity;
    },
  });
  Object.defineProperty(cjsExports, "status", {
    enumerable: true,
    get: function () {
      return constants_1.Status;
    },
  });
  Object.defineProperty(cjsExports, "propagate", {
    enumerable: true,
    get: function () {
      return constants_1.Propagate;
    },
  });
  var logging = K();
  var make_client_1 = vs();
  Object.defineProperty(cjsExports, "loadPackageDefinition", {
    enumerable: true,
    get: function () {
      return make_client_1.loadPackageDefinition;
    },
  });
  Object.defineProperty(cjsExports, "makeClientConstructor", {
    enumerable: true,
    get: function () {
      return make_client_1.makeClientConstructor;
    },
  });
  Object.defineProperty(cjsExports, "makeGenericClientConstructor", {
    enumerable: true,
    get: function () {
      return make_client_1.makeClientConstructor;
    },
  });
  var metadata_1 = ue();
  Object.defineProperty(cjsExports, "Metadata", {
    enumerable: true,
    get: function () {
      return metadata_1.Metadata;
    },
  });
  var server_1 = dm();
  Object.defineProperty(cjsExports, "Server", {
    enumerable: true,
    get: function () {
      return server_1.Server;
    },
  });
  var server_credentials_1 = dn();
  Object.defineProperty(cjsExports, "ServerCredentials", {
    enumerable: true,
    get: function () {
      return server_credentials_1.ServerCredentials;
    },
  });
  var status_builder_1 = gm();
  Object.defineProperty(cjsExports, "StatusBuilder", {
    enumerable: true,
    get: function () {
      return status_builder_1.StatusBuilder;
    },
  });
  cjsExports.credentials = {
    combineChannelCredentials: (channelCredentials, ...callCredentials) =>
      callCredentials.reduce((acc, other) => acc.compose(other), channelCredentials),
    combineCallCredentials: (first, ...additional) =>
      additional.reduce((acc, other) => acc.compose(other), first),
    createInsecure: channel_credentials_1.ChannelCredentials.createInsecure,
    createSsl: channel_credentials_1.ChannelCredentials.createSsl,
    createFromSecureContext: channel_credentials_1.ChannelCredentials.createFromSecureContext,
    createFromMetadataGenerator: call_credentials_1.CallCredentials.createFromMetadataGenerator,
    createFromGoogleCredential: call_credentials_1.CallCredentials.createFromGoogleCredential,
    createEmpty: call_credentials_1.CallCredentials.createEmpty,
  };
  var closeClient = (client) => client.close();
  cjsExports.closeClient = closeClient;
  var waitForClientReady = (client, deadline, callback) => client.waitForReady(deadline, callback);
  cjsExports.waitForClientReady = waitForClientReady;
  var loadObject = (value, options) => {
    throw Error("Not available in this library. Use @grpc/proto-loader and loadPackageDefinition instead");
  };
  cjsExports.loadObject = loadObject;
  var load = (filename, format, options) => {
    throw Error("Not available in this library. Use @grpc/proto-loader and loadPackageDefinition instead");
  };
  cjsExports.load = load;
  var setLogger = (logger) => {
    logging.setLogger(logger);
  };
  cjsExports.setLogger = setLogger;
  var setLogVerbosity = (verbosity) => {
    logging.setLoggerVerbosity(verbosity);
  };
  cjsExports.setLogVerbosity = setLogVerbosity;
  var getClientChannel = (client) => client_1.Client.prototype.getChannel.call(client);
  cjsExports.getClientChannel = getClientChannel;
  var client_interceptors_1 = Ca();
  Object.defineProperty(cjsExports, "ListenerBuilder", {
    enumerable: true,
    get: function () {
      return client_interceptors_1.ListenerBuilder;
    },
  });
  Object.defineProperty(cjsExports, "RequesterBuilder", {
    enumerable: true,
    get: function () {
      return client_interceptors_1.RequesterBuilder;
    },
  });
  Object.defineProperty(cjsExports, "InterceptingCall", {
    enumerable: true,
    get: function () {
      return client_interceptors_1.InterceptingCall;
    },
  });
  Object.defineProperty(cjsExports, "InterceptorConfigurationError", {
    enumerable: true,
    get: function () {
      return client_interceptors_1.InterceptorConfigurationError;
    },
  });
  var channelz_1 = Zt();
  Object.defineProperty(cjsExports, "getChannelzServiceDefinition", {
    enumerable: true,
    get: function () {
      return channelz_1.getChannelzServiceDefinition;
    },
  });
  Object.defineProperty(cjsExports, "getChannelzHandlers", {
    enumerable: true,
    get: function () {
      return channelz_1.getChannelzHandlers;
    },
  });
  var admin_1 = fs();
  Object.defineProperty(cjsExports, "addAdminServicesToServer", {
    enumerable: true,
    get: function () {
      return admin_1.addAdminServicesToServer;
    },
  });
  var server_interceptors_1 = zo();
  Object.defineProperty(cjsExports, "ServerListenerBuilder", {
    enumerable: true,
    get: function () {
      return server_interceptors_1.ServerListenerBuilder;
    },
  });
  Object.defineProperty(cjsExports, "ResponderBuilder", {
    enumerable: true,
    get: function () {
      return server_interceptors_1.ResponderBuilder;
    },
  });
  Object.defineProperty(cjsExports, "ServerInterceptingCall", {
    enumerable: true,
    get: function () {
      return server_interceptors_1.ServerInterceptingCall;
    },
  });
  var orca_1 = pn();
  Object.defineProperty(cjsExports, "ServerMetricRecorder", {
    enumerable: true,
    get: function () {
      return orca_1.ServerMetricRecorder;
    },
  });
  var experimental = Vo();
  cjsExports.experimental = experimental;
  var resolver_dns = Oo();
  var resolver_uds = Hm();
  var resolver_ip = Vm();
  var load_balancer_pick_first = ji();
  var load_balancer_round_robin = rv();
  var load_balancer_outlier_detection = pv();
  var load_balancer_weighted_round_robin = Av();
  var channelz = Zt();
  (() => {
    resolver_dns.setup();
    resolver_uds.setup();
    resolver_ip.setup();
    load_balancer_pick_first.setup();
    load_balancer_round_robin.setup();
    load_balancer_outlier_detection.setup();
    load_balancer_weighted_round_robin.setup();
    channelz.setup();
  })();
});
export { Ki };
