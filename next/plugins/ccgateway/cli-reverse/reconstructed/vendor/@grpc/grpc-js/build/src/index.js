/**
 * @grpc/grpc-js/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_call_credentials } from "./call-credentials.js";
import { require_channel } from "./channel.js";
import { require_compression_algorithms } from "./compression-algorithms.js";
import { require_connectivity_state } from "./connectivity-state.js";
import { require_channel_credentials } from "./channel-credentials.js";
import { require_client } from "./client.js";
import { require_constants } from "./constants.js";
import { require_logging } from "./logging.js";
import { require_make_client } from "./make-client.js";
import { require_metadata } from "./metadata.js";
import { require_server } from "./server.js";
import { require_server_credentials } from "./server-credentials.js";
import { require_status_builder } from "./status-builder.js";
import { require_client_interceptors } from "./client-interceptors.js";
import { require_channelz } from "./channelz.js";
import { require_admin } from "./admin.js";
import { require_server_interceptors } from "./server-interceptors.js";
import { require_orca } from "./orca.js";
import { require_experimental } from "./experimental.js";
import { require_resolver_dns } from "./resolver-dns.js";
import { require_resolver_uds } from "./resolver-uds.js";
import { require_resolver_ip } from "./resolver-ip.js";
import { require_load_balancer_pick_first } from "./load-balancer-pick-first.js";
import { require_load_balancer_round_robin } from "./load-balancer-round-robin.js";
import { require_load_balancer_outlier_detection } from "./load-balancer-outlier-detection.js";
import { require_load_balancer_weighted_round_robin } from "./load-balancer-weighted-round-robin.js";

//@ chunk-pwh5dx3n.js:380538-385561 cjs-fingerprint
var require_grpc_js = __commonJS(function (cjsExports) {
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
  var call_credentials_1 = require_call_credentials();
  Object.defineProperty(cjsExports, "CallCredentials", {
    enumerable: true,
    get: function () {
      return call_credentials_1.CallCredentials;
    },
  });
  var channel_1 = require_channel();
  Object.defineProperty(cjsExports, "Channel", {
    enumerable: true,
    get: function () {
      return channel_1.ChannelImplementation;
    },
  });
  var compression_algorithms_1 = require_compression_algorithms();
  Object.defineProperty(cjsExports, "compressionAlgorithms", {
    enumerable: true,
    get: function () {
      return compression_algorithms_1.CompressionAlgorithms;
    },
  });
  var connectivity_state_1 = require_connectivity_state();
  Object.defineProperty(cjsExports, "connectivityState", {
    enumerable: true,
    get: function () {
      return connectivity_state_1.ConnectivityState;
    },
  });
  var channel_credentials_1 = require_channel_credentials();
  Object.defineProperty(cjsExports, "ChannelCredentials", {
    enumerable: true,
    get: function () {
      return channel_credentials_1.ChannelCredentials;
    },
  });
  var client_1 = require_client();
  Object.defineProperty(cjsExports, "Client", {
    enumerable: true,
    get: function () {
      return client_1.Client;
    },
  });
  var constants_1 = require_constants();
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
  var logging = require_logging();
  var make_client_1 = require_make_client();
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
  var metadata_1 = require_metadata();
  Object.defineProperty(cjsExports, "Metadata", {
    enumerable: true,
    get: function () {
      return metadata_1.Metadata;
    },
  });
  var server_1 = require_server();
  Object.defineProperty(cjsExports, "Server", {
    enumerable: true,
    get: function () {
      return server_1.Server;
    },
  });
  var server_credentials_1 = require_server_credentials();
  Object.defineProperty(cjsExports, "ServerCredentials", {
    enumerable: true,
    get: function () {
      return server_credentials_1.ServerCredentials;
    },
  });
  var status_builder_1 = require_status_builder();
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
  var client_interceptors_1 = require_client_interceptors();
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
  var channelz_1 = require_channelz();
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
  var admin_1 = require_admin();
  Object.defineProperty(cjsExports, "addAdminServicesToServer", {
    enumerable: true,
    get: function () {
      return admin_1.addAdminServicesToServer;
    },
  });
  var server_interceptors_1 = require_server_interceptors();
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
  var orca_1 = require_orca();
  Object.defineProperty(cjsExports, "ServerMetricRecorder", {
    enumerable: true,
    get: function () {
      return orca_1.ServerMetricRecorder;
    },
  });
  var experimental = require_experimental();
  cjsExports.experimental = experimental;
  var resolver_dns = require_resolver_dns();
  var resolver_uds = require_resolver_uds();
  var resolver_ip = require_resolver_ip();
  var load_balancer_pick_first = require_load_balancer_pick_first();
  var load_balancer_round_robin = require_load_balancer_round_robin();
  var load_balancer_outlier_detection = require_load_balancer_outlier_detection();
  var load_balancer_weighted_round_robin = require_load_balancer_weighted_round_robin();
  var channelz = require_channelz();
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
export { require_grpc_js };
