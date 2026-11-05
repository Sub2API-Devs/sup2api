/**
 * @grpc/grpc-js/build/src/load-balancer-weighted-round-robin.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_connectivity_state } from "./connectivity-state.js";
import { require_constants } from "./constants.js";
import { require_duration } from "./duration.js";
import { require_load_balancer } from "./load-balancer.js";
import { require_load_balancer_pick_first } from "./load-balancer-pick-first.js";
import { require_logging } from "./logging.js";
import { require_orca } from "./orca.js";
import { require_picker } from "./picker.js";
import { require_priority_queue } from "./priority-queue.js";
import { require_subchannel_address } from "./subchannel-address.js";

//@ chunk-3k21nfa0.js:372594-380538 cjs-fingerprint
var require_load_balancer_weighted_round_robin = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.WeightedRoundRobinLoadBalancingConfig = undefined;
  cjsExports.setup = setup;
  var connectivity_state_1 = require_connectivity_state();
  var constants_1 = require_constants();
  var duration_1 = require_duration();
  var load_balancer_1 = require_load_balancer();
  var load_balancer_pick_first_1 = require_load_balancer_pick_first();
  var logging = require_logging();
  var orca_1 = require_orca();
  var picker_1 = require_picker();
  var priority_queue_1 = require_priority_queue();
  var subchannel_address_1 = require_subchannel_address();
  var TRACER_NAME = "weighted_round_robin";
  function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
  }
  var TYPE_NAME = "weighted_round_robin";
  var DEFAULT_OOB_REPORTING_PERIOD_MS = 1e4;
  var DEFAULT_BLACKOUT_PERIOD_MS = 1e4;
  var DEFAULT_WEIGHT_EXPIRATION_PERIOD_MS = 180000;
  var DEFAULT_WEIGHT_UPDATE_PERIOD_MS = 1000;
  var DEFAULT_ERROR_UTILIZATION_PENALTY = 1;
  function validateFieldType(obj, fieldName, expectedType) {
    if (fieldName in obj && obj[fieldName] !== undefined && typeof obj[fieldName] !== expectedType)
      throw Error(
        `weighted round robin config ${fieldName} parse error: expected ${expectedType}, got ${typeof obj[fieldName]}`,
      );
  }
  function parseDurationField(obj, fieldName) {
    if (fieldName in obj && obj[fieldName] !== undefined && obj[fieldName] !== null) {
      let durationObject;
      if (duration_1.isDuration(obj[fieldName])) durationObject = obj[fieldName];
      else if (duration_1.isDurationMessage(obj[fieldName]))
        durationObject = duration_1.durationMessageToDuration(obj[fieldName]);
      else if (typeof obj[fieldName] === "string") {
        let parsedDuration = duration_1.parseDuration(obj[fieldName]);
        if (!parsedDuration)
          throw Error(
            `weighted round robin config ${fieldName}: failed to parse duration string ${obj[fieldName]}`,
          );
        durationObject = parsedDuration;
      } else
        throw Error(
          `weighted round robin config ${fieldName}: expected duration, got ${typeof obj[fieldName]}`,
        );
      return duration_1.durationToMs(durationObject);
    }
    return null;
  }
  class WeightedRoundRobinLoadBalancingConfig {
    constructor(
      enableOobLoadReport,
      oobLoadReportingPeriodMs,
      blackoutPeriodMs,
      weightExpirationPeriodMs,
      weightUpdatePeriodMs,
      errorUtilizationPenalty,
    ) {
      this.enableOobLoadReport =
        enableOobLoadReport !== null && enableOobLoadReport !== undefined ? enableOobLoadReport : false;
      this.oobLoadReportingPeriodMs =
        oobLoadReportingPeriodMs !== null && oobLoadReportingPeriodMs !== undefined
          ? oobLoadReportingPeriodMs
          : DEFAULT_OOB_REPORTING_PERIOD_MS;
      this.blackoutPeriodMs =
        blackoutPeriodMs !== null && blackoutPeriodMs !== undefined
          ? blackoutPeriodMs
          : DEFAULT_BLACKOUT_PERIOD_MS;
      this.weightExpirationPeriodMs =
        weightExpirationPeriodMs !== null && weightExpirationPeriodMs !== undefined
          ? weightExpirationPeriodMs
          : DEFAULT_WEIGHT_EXPIRATION_PERIOD_MS;
      this.weightUpdatePeriodMs = Math.max(
        weightUpdatePeriodMs !== null && weightUpdatePeriodMs !== undefined
          ? weightUpdatePeriodMs
          : DEFAULT_WEIGHT_UPDATE_PERIOD_MS,
        100,
      );
      this.errorUtilizationPenalty =
        errorUtilizationPenalty !== null && errorUtilizationPenalty !== undefined
          ? errorUtilizationPenalty
          : DEFAULT_ERROR_UTILIZATION_PENALTY;
    }
    getLoadBalancerName() {
      return TYPE_NAME;
    }
    toJsonObject() {
      return {
        enable_oob_load_report: this.enableOobLoadReport,
        oob_load_reporting_period: duration_1.durationToString(
          duration_1.msToDuration(this.oobLoadReportingPeriodMs),
        ),
        blackout_period: duration_1.durationToString(duration_1.msToDuration(this.blackoutPeriodMs)),
        weight_expiration_period: duration_1.durationToString(
          duration_1.msToDuration(this.weightExpirationPeriodMs),
        ),
        weight_update_period: duration_1.durationToString(duration_1.msToDuration(this.weightUpdatePeriodMs)),
        error_utilization_penalty: this.errorUtilizationPenalty,
      };
    }
    static createFromJson(obj) {
      validateFieldType(obj, "enable_oob_load_report", "boolean");
      validateFieldType(obj, "error_utilization_penalty", "number");
      if (obj.error_utilization_penalty < 0)
        throw Error("weighted round robin config error_utilization_penalty < 0");
      return new WeightedRoundRobinLoadBalancingConfig(
        obj.enable_oob_load_report,
        parseDurationField(obj, "oob_load_reporting_period"),
        parseDurationField(obj, "blackout_period"),
        parseDurationField(obj, "weight_expiration_period"),
        parseDurationField(obj, "weight_update_period"),
        obj.error_utilization_penalty,
      );
    }
    getEnableOobLoadReport() {
      return this.enableOobLoadReport;
    }
    getOobLoadReportingPeriodMs() {
      return this.oobLoadReportingPeriodMs;
    }
    getBlackoutPeriodMs() {
      return this.blackoutPeriodMs;
    }
    getWeightExpirationPeriodMs() {
      return this.weightExpirationPeriodMs;
    }
    getWeightUpdatePeriodMs() {
      return this.weightUpdatePeriodMs;
    }
    getErrorUtilizationPenalty() {
      return this.errorUtilizationPenalty;
    }
  }
  cjsExports.WeightedRoundRobinLoadBalancingConfig = WeightedRoundRobinLoadBalancingConfig;
  class WeightedRoundRobinPicker {
    constructor(children, metricsHandler) {
      this.metricsHandler = metricsHandler;
      this.queue = new priority_queue_1.PriorityQueue((a, b) => a.deadline < b.deadline);
      let positiveWeight = children.filter((picker) => picker.weight > 0);
      let averageWeight;
      if (positiveWeight.length < 2) averageWeight = 1;
      else {
        let weightSum = 0;
        for (let { weight } of positiveWeight) weightSum += weight;
        averageWeight = weightSum / positiveWeight.length;
      }
      for (let child of children) {
        let period = child.weight > 0 ? 1 / child.weight : averageWeight;
        this.queue.push({
          endpointName: child.endpointName,
          picker: child.picker,
          period,
          deadline: Math.random() * period,
        });
      }
    }
    pick(pickArgs) {
      let entry = this.queue.pop();
      this.queue.push(
        Object.assign(Object.assign({}, entry), {
          deadline: entry.deadline + entry.period,
        }),
      );
      let childPick = entry.picker.pick(pickArgs);
      if (childPick.pickResultType === picker_1.PickResultType.COMPLETE) {
        if (this.metricsHandler)
          return Object.assign(Object.assign({}, childPick), {
            onCallEnded: orca_1.createMetricsReader(
              (loadReport) => this.metricsHandler(loadReport, entry.endpointName),
              childPick.onCallEnded,
            ),
          });
        else {
          let subchannelWrapper = childPick.subchannel;
          return Object.assign(Object.assign({}, childPick), {
            subchannel: subchannelWrapper.getWrappedSubchannel(),
          });
        }
      } else return childPick;
    }
  }
  class WeightedRoundRobinLoadBalancer {
    constructor(channelControlHelper) {
      this.channelControlHelper = channelControlHelper;
      this.latestConfig = null;
      this.children = new Map();
      this.currentState = connectivity_state_1.ConnectivityState.IDLE;
      this.updatesPaused = false;
      this.lastError = null;
      this.weightUpdateTimer = null;
    }
    countChildrenWithState(state) {
      let count = 0;
      for (let entry of this.children.values()) if (entry.child.getConnectivityState() === state) count += 1;
      return count;
    }
    updateWeight(entry, loadReport) {
      var _a;
      var _b;
      let { rps_fractional: qps, application_utilization: utilization } = loadReport;
      if (utilization > 0 && qps > 0)
        utilization +=
          (loadReport.eps / qps) *
          ((_b =
            (_a = this.latestConfig) === null || _a === undefined
              ? undefined
              : _a.getErrorUtilizationPenalty()) !== null && _b !== undefined
            ? _b
            : 0);
      let newWeight = utilization === 0 ? 0 : qps / utilization;
      if (newWeight === 0) return;
      let now = new Date();
      if (entry.nonEmptySince === null) entry.nonEmptySince = now;
      entry.lastUpdated = now;
      entry.weight = newWeight;
    }
    getWeight(entry) {
      if (!this.latestConfig) return 0;
      let now = new Date().getTime();
      if (now - entry.lastUpdated.getTime() >= this.latestConfig.getWeightExpirationPeriodMs()) {
        entry.nonEmptySince = null;
        return 0;
      }
      let blackoutPeriod = this.latestConfig.getBlackoutPeriodMs();
      if (
        blackoutPeriod > 0 &&
        (entry.nonEmptySince === null || now - entry.nonEmptySince.getTime() < blackoutPeriod)
      )
        return 0;
      return entry.weight;
    }
    calculateAndUpdateState() {
      if (this.updatesPaused || !this.latestConfig) return;
      if (this.countChildrenWithState(connectivity_state_1.ConnectivityState.READY) > 0) {
        let weightedPickers = [];
        for (let [endpoint, entry] of this.children) {
          if (entry.child.getConnectivityState() !== connectivity_state_1.ConnectivityState.READY) continue;
          weightedPickers.push({
            endpointName: endpoint,
            picker: entry.child.getPicker(),
            weight: this.getWeight(entry),
          });
        }
        trace(
          "Created picker with weights: " +
            weightedPickers.map((entry) => entry.endpointName + ":" + entry.weight).join(","),
        );
        let metricsHandler;
        if (!this.latestConfig.getEnableOobLoadReport())
          metricsHandler = (loadReport, endpointName) => {
            let childEntry = this.children.get(endpointName);
            if (childEntry) this.updateWeight(childEntry, loadReport);
          };
        else metricsHandler = null;
        this.updateState(
          connectivity_state_1.ConnectivityState.READY,
          new WeightedRoundRobinPicker(weightedPickers, metricsHandler),
          null,
        );
      } else if (this.countChildrenWithState(connectivity_state_1.ConnectivityState.CONNECTING) > 0)
        this.updateState(
          connectivity_state_1.ConnectivityState.CONNECTING,
          new picker_1.QueuePicker(this),
          null,
        );
      else if (this.countChildrenWithState(connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE) > 0) {
        let errorMessage = `weighted_round_robin: No connection established. Last error: ${this.lastError}`;
        this.updateState(
          connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE,
          new picker_1.UnavailablePicker({
            details: errorMessage,
          }),
          errorMessage,
        );
      } else
        this.updateState(connectivity_state_1.ConnectivityState.IDLE, new picker_1.QueuePicker(this), null);
      for (let { child } of this.children.values())
        if (child.getConnectivityState() === connectivity_state_1.ConnectivityState.IDLE) child.exitIdle();
    }
    updateState(newState, picker, errorMessage) {
      trace(
        connectivity_state_1.ConnectivityState[this.currentState] +
          " -> " +
          connectivity_state_1.ConnectivityState[newState],
      );
      this.currentState = newState;
      this.channelControlHelper.updateState(newState, picker, errorMessage);
    }
    updateAddressList(maybeEndpointList, lbConfig, options, resolutionNote) {
      var _a;
      var _b;
      if (!(lbConfig instanceof WeightedRoundRobinLoadBalancingConfig)) return false;
      if (!maybeEndpointList.ok) {
        if (this.children.size === 0)
          this.updateState(
            connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE,
            new picker_1.UnavailablePicker(maybeEndpointList.error),
            maybeEndpointList.error.details,
          );
        return true;
      }
      if (maybeEndpointList.value.length === 0) {
        let errorMessage = `No addresses resolved. Resolution note: ${resolutionNote}`;
        this.updateState(
          connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE,
          new picker_1.UnavailablePicker({
            details: errorMessage,
          }),
          errorMessage,
        );
        return false;
      }
      trace("Connect to endpoint list " + maybeEndpointList.value.map(subchannel_address_1.endpointToString));
      let now = new Date();
      let seenEndpointNames = new Set();
      this.updatesPaused = true;
      this.latestConfig = lbConfig;
      for (let endpoint of maybeEndpointList.value) {
        let name = subchannel_address_1.endpointToString(endpoint);
        seenEndpointNames.add(name);
        let entry = this.children.get(name);
        if (!entry) {
          entry = {
            child: new load_balancer_pick_first_1.LeafLoadBalancer(
              endpoint,
              load_balancer_1.createChildChannelControlHelper(this.channelControlHelper, {
                updateState: (connectivityState, picker, errorMessage) => {
                  if (
                    this.currentState === connectivity_state_1.ConnectivityState.READY &&
                    connectivityState !== connectivity_state_1.ConnectivityState.READY
                  )
                    this.channelControlHelper.requestReresolution();
                  if (connectivityState === connectivity_state_1.ConnectivityState.READY)
                    entry.nonEmptySince = null;
                  if (errorMessage) this.lastError = errorMessage;
                  this.calculateAndUpdateState();
                },
                createSubchannel: (subchannelAddress, subchannelArgs) => {
                  let subchannel = this.channelControlHelper.createSubchannel(
                    subchannelAddress,
                    subchannelArgs,
                  );
                  if (entry === null || entry === undefined ? undefined : entry.oobMetricsListener)
                    return new orca_1.OrcaOobMetricsSubchannelWrapper(
                      subchannel,
                      entry.oobMetricsListener,
                      this.latestConfig.getOobLoadReportingPeriodMs(),
                    );
                  else return subchannel;
                },
              }),
              options,
              resolutionNote,
            ),
            lastUpdated: now,
            nonEmptySince: null,
            weight: 0,
            oobMetricsListener: null,
          };
          this.children.set(name, entry);
        }
        if (lbConfig.getEnableOobLoadReport())
          entry.oobMetricsListener = (loadReport) => {
            this.updateWeight(entry, loadReport);
          };
        else entry.oobMetricsListener = null;
      }
      for (let [endpointName, entry] of this.children)
        if (seenEndpointNames.has(endpointName)) entry.child.startConnecting();
        else {
          entry.child.destroy();
          this.children.delete(endpointName);
        }
      this.updatesPaused = false;
      this.calculateAndUpdateState();
      if (this.weightUpdateTimer) clearInterval(this.weightUpdateTimer);
      this.weightUpdateTimer =
        (_b = (_a = setInterval(() => {
          if (this.currentState === connectivity_state_1.ConnectivityState.READY)
            this.calculateAndUpdateState();
        }, lbConfig.getWeightUpdatePeriodMs())).unref) === null || _b === undefined
          ? undefined
          : _b.call(_a);
      return true;
    }
    exitIdle() {}
    resetBackoff() {}
    destroy() {
      for (let entry of this.children.values()) entry.child.destroy();
      this.children.clear();
      if (this.weightUpdateTimer) clearInterval(this.weightUpdateTimer);
    }
    getTypeName() {
      return TYPE_NAME;
    }
  }
  function setup() {
    load_balancer_1.registerLoadBalancerType(
      TYPE_NAME,
      WeightedRoundRobinLoadBalancer,
      WeightedRoundRobinLoadBalancingConfig,
    );
  }
});
export { require_load_balancer_weighted_round_robin };
