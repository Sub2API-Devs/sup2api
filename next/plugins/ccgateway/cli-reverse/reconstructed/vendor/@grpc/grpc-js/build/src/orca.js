/**
 * @grpc/grpc-js/build/src/orca.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_make_client } from "./make-client.js";
import { require_duration } from "./duration.js";
import { require_channel_credentials } from "./channel-credentials.js";
import { require_subchannel_interface } from "./subchannel-interface.js";
import { require_constants } from "./constants.js";
import { require_backoff_timeout } from "./backoff-timeout.js";
import { require_connectivity_state } from "./connectivity-state.js";
import { require_proto_loader } from "../../../proto-loader/build/src/index.js";

//@ chunk-pwh5dx3n.js:288349-293534 cjs-fingerprint
var require_orca = __commonJS(function (cjsExports) {
  var __dirname_2 =
    "/home/runner/work/claude-cli-internal/claude-cli-internal/node_modules/@grpc/grpc-js/build/src";
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OrcaOobMetricsSubchannelWrapper =
    cjsExports.GRPC_METRICS_HEADER =
    cjsExports.ServerMetricRecorder =
    cjsExports.PerRequestMetricRecorder =
      undefined;
  cjsExports.createOrcaClient = createOrcaClient;
  cjsExports.createMetricsReader = createMetricsReader;
  var make_client_1 = require_make_client();
  var duration_1 = require_duration();
  var channel_credentials_1 = require_channel_credentials();
  var subchannel_interface_1 = require_subchannel_interface();
  var constants_1 = require_constants();
  var backoff_timeout_1 = require_backoff_timeout();
  var connectivity_state_1 = require_connectivity_state();
  var loadedOrcaProto = null;
  function loadOrcaProto() {
    if (loadedOrcaProto) return loadedOrcaProto;
    let loaderLoadSync = require_proto_loader().loadSync;
    let loadedProto = loaderLoadSync("xds/service/orca/v3/orca.proto", {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [`${__dirname_2}/../../proto/xds`, `${__dirname_2}/../../proto/protoc-gen-validate`],
    });
    return make_client_1.loadPackageDefinition(loadedProto);
  }
  class PerRequestMetricRecorder {
    constructor() {
      this.message = {};
    }
    recordRequestCostMetric(name, value) {
      if (!this.message.request_cost) this.message.request_cost = {};
      this.message.request_cost[name] = value;
    }
    recordUtilizationMetric(name, value) {
      if (!this.message.utilization) this.message.utilization = {};
      this.message.utilization[name] = value;
    }
    recordNamedMetric(name, value) {
      if (!this.message.named_metrics) this.message.named_metrics = {};
      this.message.named_metrics[name] = value;
    }
    recordCPUUtilizationMetric(value) {
      this.message.cpu_utilization = value;
    }
    recordMemoryUtilizationMetric(value) {
      this.message.mem_utilization = value;
    }
    recordApplicationUtilizationMetric(value) {
      this.message.application_utilization = value;
    }
    recordQpsMetric(value) {
      this.message.rps_fractional = value;
    }
    recordEpsMetric(value) {
      this.message.eps = value;
    }
    serialize() {
      return loadOrcaProto().xds.data.orca.v3.OrcaLoadReport.serialize(this.message);
    }
  }
  cjsExports.PerRequestMetricRecorder = PerRequestMetricRecorder;
  var DEFAULT_REPORT_INTERVAL_MS = 30000;
  class ServerMetricRecorder {
    constructor() {
      this.message = {};
      this.serviceImplementation = {
        StreamCoreMetrics: (call) => {
          let reportInterval = call.request.report_interval
            ? duration_1.durationToMs(duration_1.durationMessageToDuration(call.request.report_interval))
            : DEFAULT_REPORT_INTERVAL_MS;
          let reportTimer = setInterval(() => {
            call.write(this.message);
          }, reportInterval);
          call.on("cancelled", () => {
            clearInterval(reportTimer);
          });
        },
      };
    }
    putUtilizationMetric(name, value) {
      if (!this.message.utilization) this.message.utilization = {};
      this.message.utilization[name] = value;
    }
    setAllUtilizationMetrics(metrics) {
      this.message.utilization = Object.assign({}, metrics);
    }
    deleteUtilizationMetric(name) {
      var _a;
      if (!((_a = this.message.utilization) === null || _a === undefined)) delete _a[name];
    }
    setCpuUtilizationMetric(value) {
      this.message.cpu_utilization = value;
    }
    deleteCpuUtilizationMetric() {
      delete this.message.cpu_utilization;
    }
    setApplicationUtilizationMetric(value) {
      this.message.application_utilization = value;
    }
    deleteApplicationUtilizationMetric() {
      delete this.message.application_utilization;
    }
    setQpsMetric(value) {
      this.message.rps_fractional = value;
    }
    deleteQpsMetric() {
      delete this.message.rps_fractional;
    }
    setEpsMetric(value) {
      this.message.eps = value;
    }
    deleteEpsMetric() {
      delete this.message.eps;
    }
    addToServer(server) {
      let serviceDefinition = loadOrcaProto().xds.service.orca.v3.OpenRcaService.service;
      server.addService(serviceDefinition, this.serviceImplementation);
    }
  }
  cjsExports.ServerMetricRecorder = ServerMetricRecorder;
  function createOrcaClient(channel) {
    return new (loadOrcaProto().xds.service.orca.v3.OpenRcaService)(
      "unused",
      channel_credentials_1.ChannelCredentials.createInsecure(),
      {
        channelOverride: channel,
      },
    );
  }
  cjsExports.GRPC_METRICS_HEADER = "endpoint-load-metrics-bin";
  var PARSED_LOAD_REPORT_KEY = "grpc_orca_load_report";
  function createMetricsReader(listener, previousOnCallEnded) {
    return (code, details, metadata) => {
      let parsedLoadReport = metadata.getOpaque(PARSED_LOAD_REPORT_KEY);
      if (parsedLoadReport) listener(parsedLoadReport);
      else {
        let serializedLoadReport = metadata.get(cjsExports.GRPC_METRICS_HEADER);
        if (serializedLoadReport.length > 0) {
          parsedLoadReport = loadOrcaProto().xds.data.orca.v3.OrcaLoadReport.deserialize(
            serializedLoadReport[0],
          );
          listener(parsedLoadReport);
          metadata.setOpaque(PARSED_LOAD_REPORT_KEY, parsedLoadReport);
        }
      }
      if (previousOnCallEnded) previousOnCallEnded(code, details, metadata);
    };
  }
  var DATA_PRODUCER_KEY = "orca_oob_metrics";
  class OobMetricsDataWatcher {
    constructor(metricsListener, intervalMs) {
      this.metricsListener = metricsListener;
      this.intervalMs = intervalMs;
      this.dataProducer = null;
    }
    setSubchannel(subchannel) {
      let producer = subchannel.getOrCreateDataProducer(DATA_PRODUCER_KEY, createOobMetricsDataProducer);
      this.dataProducer = producer;
      producer.addDataWatcher(this);
    }
    destroy() {
      var _a;
      if (!((_a = this.dataProducer) === null || _a === undefined)) _a.removeDataWatcher(this);
    }
    getInterval() {
      return this.intervalMs;
    }
    onMetricsUpdate(metrics) {
      this.metricsListener(metrics);
    }
  }
  class OobMetricsDataProducer {
    constructor(subchannel) {
      this.subchannel = subchannel;
      this.dataWatchers = new Set();
      this.orcaSupported = true;
      this.metricsCall = null;
      this.currentInterval = 1 / 0;
      this.backoffTimer = new backoff_timeout_1.BackoffTimeout(() => this.updateMetricsSubscription());
      this.subchannelStateListener = () => this.updateMetricsSubscription();
      let channel = subchannel.getChannel();
      this.client = createOrcaClient(channel);
      subchannel.addConnectivityStateListener(this.subchannelStateListener);
    }
    addDataWatcher(dataWatcher) {
      this.dataWatchers.add(dataWatcher);
      this.updateMetricsSubscription();
    }
    removeDataWatcher(dataWatcher) {
      var _a;
      this.dataWatchers.delete(dataWatcher);
      if (this.dataWatchers.size === 0) {
        this.subchannel.removeDataProducer(DATA_PRODUCER_KEY);
        if (!((_a = this.metricsCall) === null || _a === undefined)) _a.cancel();
        this.metricsCall = null;
        this.client.close();
        this.subchannel.removeConnectivityStateListener(this.subchannelStateListener);
      } else this.updateMetricsSubscription();
    }
    updateMetricsSubscription() {
      var _a;
      if (
        this.dataWatchers.size === 0 ||
        !this.orcaSupported ||
        this.subchannel.getConnectivityState() !== connectivity_state_1.ConnectivityState.READY
      )
        return;
      let newInterval = Math.min(...Array.from(this.dataWatchers).map((watcher) => watcher.getInterval()));
      if (!this.metricsCall || newInterval !== this.currentInterval) {
        if (!((_a = this.metricsCall) === null || _a === undefined)) _a.cancel();
        this.currentInterval = newInterval;
        let metricsCall = this.client.streamCoreMetrics({
          report_interval: duration_1.msToDuration(newInterval),
        });
        this.metricsCall = metricsCall;
        metricsCall.on("data", (report) => {
          this.dataWatchers.forEach((watcher) => {
            watcher.onMetricsUpdate(report);
          });
        });
        metricsCall.on("error", (error) => {
          this.metricsCall = null;
          if (error.code === constants_1.Status.UNIMPLEMENTED) {
            this.orcaSupported = false;
            return;
          }
          if (error.code === constants_1.Status.CANCELLED) return;
          this.backoffTimer.runOnce();
        });
      }
    }
  }
  class OrcaOobMetricsSubchannelWrapper extends subchannel_interface_1.BaseSubchannelWrapper {
    constructor(child, metricsListener, intervalMs) {
      super(child);
      this.addDataWatcher(new OobMetricsDataWatcher(metricsListener, intervalMs));
    }
    getWrappedSubchannel() {
      return this.child;
    }
  }
  cjsExports.OrcaOobMetricsSubchannelWrapper = OrcaOobMetricsSubchannelWrapper;
  function createOobMetricsDataProducer(subchannel) {
    return new OobMetricsDataProducer(subchannel);
  }
});
export { require_orca };
