/**
 * @grpc/grpc-js/build/src/load-balancer-outlier-detection.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_connectivity_state } from "./connectivity-state.js";
import { require_constants } from "./constants.js";
import { require_duration } from "./duration.js";
import { require_experimental } from "./experimental.js";
import { require_load_balancer } from "./load-balancer.js";
import { require_load_balancer_child_handler } from "./load-balancer-child-handler.js";
import { require_picker } from "./picker.js";
import { require_subchannel_address } from "./subchannel-address.js";
import { require_subchannel_interface } from "./subchannel-interface.js";
import { require_logging } from "./logging.js";

//@ chunk-3k21nfa0.js:360044-371590 cjs-fingerprint
var require_load_balancer_outlier_detection = __commonJS(function (cjsExports) {
  var _a;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OutlierDetectionLoadBalancer = cjsExports.OutlierDetectionLoadBalancingConfig = undefined;
  cjsExports.setup = setup;
  var connectivity_state_1 = require_connectivity_state();
  var constants_1 = require_constants();
  var duration_1 = require_duration();
  var experimental_1 = require_experimental();
  var load_balancer_1 = require_load_balancer();
  var load_balancer_child_handler_1 = require_load_balancer_child_handler();
  var picker_1 = require_picker();
  var subchannel_address_1 = require_subchannel_address();
  var subchannel_interface_1 = require_subchannel_interface();
  var logging = require_logging();
  var TRACER_NAME = "outlier_detection";
  function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
  }
  var TYPE_NAME = "outlier_detection";
  var OUTLIER_DETECTION_ENABLED =
    ((_a = process.env.GRPC_EXPERIMENTAL_ENABLE_OUTLIER_DETECTION) !== null && _a !== undefined
      ? _a
      : "true") === "true";
  var defaultSuccessRateEjectionConfig = {
    stdev_factor: 1900,
    enforcement_percentage: 100,
    minimum_hosts: 5,
    request_volume: 100,
  };
  var defaultFailurePercentageEjectionConfig = {
    threshold: 85,
    enforcement_percentage: 100,
    minimum_hosts: 5,
    request_volume: 50,
  };
  function validateFieldType(obj, fieldName, expectedType, objectName) {
    if (fieldName in obj && obj[fieldName] !== undefined && typeof obj[fieldName] !== expectedType) {
      let fullFieldName = objectName ? `${objectName}.${fieldName}` : fieldName;
      throw Error(
        `outlier detection config ${fullFieldName} parse error: expected ${expectedType}, got ${typeof obj[fieldName]}`,
      );
    }
  }
  function validatePositiveDuration(obj, fieldName, objectName) {
    let fullFieldName = objectName ? `${objectName}.${fieldName}` : fieldName;
    if (fieldName in obj && obj[fieldName] !== undefined) {
      if (!duration_1.isDuration(obj[fieldName]))
        throw Error(
          `outlier detection config ${fullFieldName} parse error: expected Duration, got ${typeof obj[fieldName]}`,
        );
      if (!(
        obj[fieldName].seconds >= 0 &&
        obj[fieldName].seconds <= 315576000000 &&
        obj[fieldName].nanos >= 0 &&
        obj[fieldName].nanos <= 999999999
      ))
        throw Error(
          `outlier detection config ${fullFieldName} parse error: values out of range for non-negative Duaration`,
        );
    }
  }
  function validatePercentage(obj, fieldName, objectName) {
    let fullFieldName = objectName ? `${objectName}.${fieldName}` : fieldName;
    validateFieldType(obj, fieldName, "number", objectName);
    if (fieldName in obj && obj[fieldName] !== undefined && !(obj[fieldName] >= 0 && obj[fieldName] <= 100))
      throw Error(
        `outlier detection config ${fullFieldName} parse error: value out of range for percentage (0-100)`,
      );
  }
  class OutlierDetectionLoadBalancingConfig {
    constructor(
      intervalMs,
      baseEjectionTimeMs,
      maxEjectionTimeMs,
      maxEjectionPercent,
      successRateEjection,
      failurePercentageEjection,
      childPolicy,
    ) {
      this.childPolicy = childPolicy;
      if (childPolicy.getLoadBalancerName() === "pick_first")
        throw Error("outlier_detection LB policy cannot have a pick_first child policy");
      this.intervalMs = intervalMs !== null && intervalMs !== undefined ? intervalMs : 1e4;
      this.baseEjectionTimeMs =
        baseEjectionTimeMs !== null && baseEjectionTimeMs !== undefined ? baseEjectionTimeMs : 30000;
      this.maxEjectionTimeMs =
        maxEjectionTimeMs !== null && maxEjectionTimeMs !== undefined ? maxEjectionTimeMs : 300000;
      this.maxEjectionPercent =
        maxEjectionPercent !== null && maxEjectionPercent !== undefined ? maxEjectionPercent : 10;
      this.successRateEjection = successRateEjection
        ? Object.assign(Object.assign({}, defaultSuccessRateEjectionConfig), successRateEjection)
        : null;
      this.failurePercentageEjection = failurePercentageEjection
        ? Object.assign(Object.assign({}, defaultFailurePercentageEjectionConfig), failurePercentageEjection)
        : null;
    }
    getLoadBalancerName() {
      return TYPE_NAME;
    }
    toJsonObject() {
      var _a;
      var _b;
      return {
        outlier_detection: {
          interval: duration_1.msToDuration(this.intervalMs),
          base_ejection_time: duration_1.msToDuration(this.baseEjectionTimeMs),
          max_ejection_time: duration_1.msToDuration(this.maxEjectionTimeMs),
          max_ejection_percent: this.maxEjectionPercent,
          success_rate_ejection:
            (_a = this.successRateEjection) !== null && _a !== undefined ? _a : undefined,
          failure_percentage_ejection:
            (_b = this.failurePercentageEjection) !== null && _b !== undefined ? _b : undefined,
          child_policy: [this.childPolicy.toJsonObject()],
        },
      };
    }
    getIntervalMs() {
      return this.intervalMs;
    }
    getBaseEjectionTimeMs() {
      return this.baseEjectionTimeMs;
    }
    getMaxEjectionTimeMs() {
      return this.maxEjectionTimeMs;
    }
    getMaxEjectionPercent() {
      return this.maxEjectionPercent;
    }
    getSuccessRateEjectionConfig() {
      return this.successRateEjection;
    }
    getFailurePercentageEjectionConfig() {
      return this.failurePercentageEjection;
    }
    getChildPolicy() {
      return this.childPolicy;
    }
    static createFromJson(obj) {
      var _a;
      validatePositiveDuration(obj, "interval");
      validatePositiveDuration(obj, "base_ejection_time");
      validatePositiveDuration(obj, "max_ejection_time");
      validatePercentage(obj, "max_ejection_percent");
      if ("success_rate_ejection" in obj && obj.success_rate_ejection !== undefined) {
        if (typeof obj.success_rate_ejection !== "object")
          throw Error("outlier detection config success_rate_ejection must be an object");
        validateFieldType(obj.success_rate_ejection, "stdev_factor", "number", "success_rate_ejection");
        validatePercentage(obj.success_rate_ejection, "enforcement_percentage", "success_rate_ejection");
        validateFieldType(obj.success_rate_ejection, "minimum_hosts", "number", "success_rate_ejection");
        validateFieldType(obj.success_rate_ejection, "request_volume", "number", "success_rate_ejection");
      }
      if ("failure_percentage_ejection" in obj && obj.failure_percentage_ejection !== undefined) {
        if (typeof obj.failure_percentage_ejection !== "object")
          throw Error("outlier detection config failure_percentage_ejection must be an object");
        validatePercentage(obj.failure_percentage_ejection, "threshold", "failure_percentage_ejection");
        validatePercentage(
          obj.failure_percentage_ejection,
          "enforcement_percentage",
          "failure_percentage_ejection",
        );
        validateFieldType(
          obj.failure_percentage_ejection,
          "minimum_hosts",
          "number",
          "failure_percentage_ejection",
        );
        validateFieldType(
          obj.failure_percentage_ejection,
          "request_volume",
          "number",
          "failure_percentage_ejection",
        );
      }
      if (!("child_policy" in obj) || !Array.isArray(obj.child_policy))
        throw Error("outlier detection config child_policy must be an array");
      let childPolicy = load_balancer_1.selectLbConfigFromList(obj.child_policy);
      if (!childPolicy)
        throw Error("outlier detection config child_policy: no valid recognized policy found");
      return new OutlierDetectionLoadBalancingConfig(
        obj.interval ? duration_1.durationToMs(obj.interval) : null,
        obj.base_ejection_time ? duration_1.durationToMs(obj.base_ejection_time) : null,
        obj.max_ejection_time ? duration_1.durationToMs(obj.max_ejection_time) : null,
        (_a = obj.max_ejection_percent) !== null && _a !== undefined ? _a : null,
        obj.success_rate_ejection,
        obj.failure_percentage_ejection,
        childPolicy,
      );
    }
  }
  cjsExports.OutlierDetectionLoadBalancingConfig = OutlierDetectionLoadBalancingConfig;
  class OutlierDetectionSubchannelWrapper extends subchannel_interface_1.BaseSubchannelWrapper {
    constructor(childSubchannel, mapEntry) {
      super(childSubchannel);
      this.mapEntry = mapEntry;
      this.refCount = 0;
    }
    ref() {
      this.child.ref();
      this.refCount += 1;
    }
    unref() {
      this.child.unref();
      this.refCount -= 1;
      if (this.refCount <= 0) {
        if (this.mapEntry) {
          let index = this.mapEntry.subchannelWrappers.indexOf(this);
          if (index >= 0) this.mapEntry.subchannelWrappers.splice(index, 1);
        }
      }
    }
    eject() {
      this.setHealthy(false);
    }
    uneject() {
      this.setHealthy(true);
    }
    getMapEntry() {
      return this.mapEntry;
    }
    getWrappedSubchannel() {
      return this.child;
    }
  }
  function createEmptyBucket() {
    return {
      success: 0,
      failure: 0,
    };
  }
  class CallCounter {
    constructor() {
      this.activeBucket = createEmptyBucket();
      this.inactiveBucket = createEmptyBucket();
    }
    addSuccess() {
      this.activeBucket.success += 1;
    }
    addFailure() {
      this.activeBucket.failure += 1;
    }
    switchBuckets() {
      this.inactiveBucket = this.activeBucket;
      this.activeBucket = createEmptyBucket();
    }
    getLastSuccesses() {
      return this.inactiveBucket.success;
    }
    getLastFailures() {
      return this.inactiveBucket.failure;
    }
  }
  class OutlierDetectionPicker {
    constructor(wrappedPicker, countCalls) {
      this.wrappedPicker = wrappedPicker;
      this.countCalls = countCalls;
    }
    pick(pickArgs) {
      let wrappedPick = this.wrappedPicker.pick(pickArgs);
      if (wrappedPick.pickResultType === picker_1.PickResultType.COMPLETE) {
        let subchannelWrapper = wrappedPick.subchannel;
        let mapEntry = subchannelWrapper.getMapEntry();
        if (mapEntry) {
          let onCallEnded = wrappedPick.onCallEnded;
          if (this.countCalls)
            onCallEnded = (statusCode, details, metadata) => {
              var _a;
              if (statusCode === constants_1.Status.OK) mapEntry.counter.addSuccess();
              else mapEntry.counter.addFailure();
              if (!((_a = wrappedPick.onCallEnded) === null || _a === undefined))
                _a.call(wrappedPick, statusCode, details, metadata);
            };
          return Object.assign(Object.assign({}, wrappedPick), {
            subchannel: subchannelWrapper.getWrappedSubchannel(),
            onCallEnded,
          });
        } else
          return Object.assign(Object.assign({}, wrappedPick), {
            subchannel: subchannelWrapper.getWrappedSubchannel(),
          });
      } else return wrappedPick;
    }
  }
  class OutlierDetectionLoadBalancer {
    constructor(channelControlHelper) {
      this.entryMap = new subchannel_address_1.EndpointMap();
      this.latestConfig = null;
      this.timerStartTime = null;
      this.childBalancer = new load_balancer_child_handler_1.ChildLoadBalancerHandler(
        experimental_1.createChildChannelControlHelper(channelControlHelper, {
          createSubchannel: (subchannelAddress, subchannelArgs) => {
            let originalSubchannel = channelControlHelper.createSubchannel(subchannelAddress, subchannelArgs);
            let mapEntry = this.entryMap.getForSubchannelAddress(subchannelAddress);
            let subchannelWrapper = new OutlierDetectionSubchannelWrapper(originalSubchannel, mapEntry);
            if (
              (mapEntry === null || mapEntry === undefined
                ? undefined
                : mapEntry.currentEjectionTimestamp) !== null
            )
              subchannelWrapper.eject();
            if (!(mapEntry === null || mapEntry === undefined))
              mapEntry.subchannelWrappers.push(subchannelWrapper);
            return subchannelWrapper;
          },
          updateState: (connectivityState, picker, errorMessage) => {
            if (connectivityState === connectivity_state_1.ConnectivityState.READY)
              channelControlHelper.updateState(
                connectivityState,
                new OutlierDetectionPicker(picker, this.isCountingEnabled()),
                errorMessage,
              );
            else channelControlHelper.updateState(connectivityState, picker, errorMessage);
          },
        }),
      );
      this.ejectionTimer = setInterval(() => {}, 0);
      clearInterval(this.ejectionTimer);
    }
    isCountingEnabled() {
      return (
        this.latestConfig !== null &&
        (this.latestConfig.getSuccessRateEjectionConfig() !== null ||
          this.latestConfig.getFailurePercentageEjectionConfig() !== null)
      );
    }
    getCurrentEjectionPercent() {
      let ejectionCount = 0;
      for (let mapEntry of this.entryMap.values())
        if (mapEntry.currentEjectionTimestamp !== null) ejectionCount += 1;
      return (ejectionCount * 100) / this.entryMap.size;
    }
    runSuccessRateCheck(ejectionTimestamp) {
      if (!this.latestConfig) return;
      let successRateConfig = this.latestConfig.getSuccessRateEjectionConfig();
      if (!successRateConfig) return;
      trace("Running success rate check");
      let targetRequestVolume = successRateConfig.request_volume;
      let addresesWithTargetVolume = 0;
      let successRates = [];
      for (let [endpoint, mapEntry] of this.entryMap.entries()) {
        let successes = mapEntry.counter.getLastSuccesses();
        let failures = mapEntry.counter.getLastFailures();
        trace(
          "Stats for " +
            subchannel_address_1.endpointToString(endpoint) +
            ": successes=" +
            successes +
            " failures=" +
            failures +
            " targetRequestVolume=" +
            targetRequestVolume,
        );
        if (successes + failures >= targetRequestVolume) {
          addresesWithTargetVolume += 1;
          successRates.push(successes / (successes + failures));
        }
      }
      trace(
        "Found " +
          addresesWithTargetVolume +
          " success rate candidates; currentEjectionPercent=" +
          this.getCurrentEjectionPercent() +
          " successRates=[" +
          successRates +
          "]",
      );
      if (addresesWithTargetVolume < successRateConfig.minimum_hosts) return;
      let successRateMean = successRates.reduce((a, b) => a + b) / successRates.length;
      let successRateDeviationSum = 0;
      for (let rate of successRates) {
        let deviation = rate - successRateMean;
        successRateDeviationSum += deviation * deviation;
      }
      let successRateVariance = successRateDeviationSum / successRates.length;
      let successRateStdev = Math.sqrt(successRateVariance);
      let ejectionThreshold = successRateMean - successRateStdev * (successRateConfig.stdev_factor / 1000);
      trace("stdev=" + successRateStdev + " ejectionThreshold=" + ejectionThreshold);
      for (let [address, mapEntry] of this.entryMap.entries()) {
        if (this.getCurrentEjectionPercent() >= this.latestConfig.getMaxEjectionPercent()) break;
        let successes = mapEntry.counter.getLastSuccesses();
        let failures = mapEntry.counter.getLastFailures();
        if (successes + failures < targetRequestVolume) continue;
        let successRate = successes / (successes + failures);
        trace("Checking candidate " + address + " successRate=" + successRate);
        if (successRate < ejectionThreshold) {
          let randomNumber = Math.random() * 100;
          trace(
            "Candidate " +
              address +
              " randomNumber=" +
              randomNumber +
              " enforcement_percentage=" +
              successRateConfig.enforcement_percentage,
          );
          if (randomNumber < successRateConfig.enforcement_percentage) {
            trace("Ejecting candidate " + address);
            this.eject(mapEntry, ejectionTimestamp);
          }
        }
      }
    }
    runFailurePercentageCheck(ejectionTimestamp) {
      if (!this.latestConfig) return;
      let failurePercentageConfig = this.latestConfig.getFailurePercentageEjectionConfig();
      if (!failurePercentageConfig) return;
      trace(
        "Running failure percentage check. threshold=" +
          failurePercentageConfig.threshold +
          " request volume threshold=" +
          failurePercentageConfig.request_volume,
      );
      let addressesWithTargetVolume = 0;
      for (let mapEntry of this.entryMap.values()) {
        let successes = mapEntry.counter.getLastSuccesses();
        let failures = mapEntry.counter.getLastFailures();
        if (successes + failures >= failurePercentageConfig.request_volume) addressesWithTargetVolume += 1;
      }
      if (addressesWithTargetVolume < failurePercentageConfig.minimum_hosts) return;
      for (let [address, mapEntry] of this.entryMap.entries()) {
        if (this.getCurrentEjectionPercent() >= this.latestConfig.getMaxEjectionPercent()) break;
        let successes = mapEntry.counter.getLastSuccesses();
        let failures = mapEntry.counter.getLastFailures();
        trace("Candidate successes=" + successes + " failures=" + failures);
        if (successes + failures < failurePercentageConfig.request_volume) continue;
        if ((failures * 100) / (failures + successes) > failurePercentageConfig.threshold) {
          let randomNumber = Math.random() * 100;
          trace(
            "Candidate " +
              address +
              " randomNumber=" +
              randomNumber +
              " enforcement_percentage=" +
              failurePercentageConfig.enforcement_percentage,
          );
          if (randomNumber < failurePercentageConfig.enforcement_percentage) {
            trace("Ejecting candidate " + address);
            this.eject(mapEntry, ejectionTimestamp);
          }
        }
      }
    }
    eject(mapEntry, ejectionTimestamp) {
      mapEntry.currentEjectionTimestamp = new Date();
      mapEntry.ejectionTimeMultiplier += 1;
      for (let subchannelWrapper of mapEntry.subchannelWrappers) subchannelWrapper.eject();
    }
    uneject(mapEntry) {
      mapEntry.currentEjectionTimestamp = null;
      for (let subchannelWrapper of mapEntry.subchannelWrappers) subchannelWrapper.uneject();
    }
    switchAllBuckets() {
      for (let mapEntry of this.entryMap.values()) mapEntry.counter.switchBuckets();
    }
    startTimer(delayMs) {
      var _a;
      var _b;
      this.ejectionTimer = setTimeout(() => this.runChecks(), delayMs);
      if (!((_b = (_a = this.ejectionTimer).unref) === null || _b === undefined)) _b.call(_a);
    }
    runChecks() {
      let ejectionTimestamp = new Date();
      trace("Ejection timer running");
      this.switchAllBuckets();
      if (!this.latestConfig) return;
      this.timerStartTime = ejectionTimestamp;
      this.startTimer(this.latestConfig.getIntervalMs());
      this.runSuccessRateCheck(ejectionTimestamp);
      this.runFailurePercentageCheck(ejectionTimestamp);
      for (let [address, mapEntry] of this.entryMap.entries())
        if (mapEntry.currentEjectionTimestamp === null) {
          if (mapEntry.ejectionTimeMultiplier > 0) mapEntry.ejectionTimeMultiplier -= 1;
        } else {
          let baseEjectionTimeMs = this.latestConfig.getBaseEjectionTimeMs();
          let maxEjectionTimeMs = this.latestConfig.getMaxEjectionTimeMs();
          let returnTime = new Date(mapEntry.currentEjectionTimestamp.getTime());
          returnTime.setMilliseconds(
            returnTime.getMilliseconds() +
              Math.min(
                baseEjectionTimeMs * mapEntry.ejectionTimeMultiplier,
                Math.max(baseEjectionTimeMs, maxEjectionTimeMs),
              ),
          );
          if (returnTime < new Date()) {
            trace("Unejecting " + address);
            this.uneject(mapEntry);
          }
        }
    }
    updateAddressList(endpointList, lbConfig, options, resolutionNote) {
      if (!(lbConfig instanceof OutlierDetectionLoadBalancingConfig)) return false;
      trace("Received update with config: " + JSON.stringify(lbConfig.toJsonObject(), undefined, 2));
      if (endpointList.ok) {
        for (let endpoint of endpointList.value)
          if (!this.entryMap.has(endpoint)) {
            trace("Adding map entry for " + subchannel_address_1.endpointToString(endpoint));
            this.entryMap.set(endpoint, {
              counter: new CallCounter(),
              currentEjectionTimestamp: null,
              ejectionTimeMultiplier: 0,
              subchannelWrappers: [],
            });
          }
        this.entryMap.deleteMissing(endpointList.value);
      }
      let childPolicy = lbConfig.getChildPolicy();
      this.childBalancer.updateAddressList(endpointList, childPolicy, options, resolutionNote);
      if (lbConfig.getSuccessRateEjectionConfig() || lbConfig.getFailurePercentageEjectionConfig()) {
        if (this.timerStartTime) {
          trace("Previous timer existed. Replacing timer");
          clearTimeout(this.ejectionTimer);
          let remainingDelay =
            lbConfig.getIntervalMs() - (new Date().getTime() - this.timerStartTime.getTime());
          this.startTimer(remainingDelay);
        } else {
          trace("Starting new timer");
          this.timerStartTime = new Date();
          this.startTimer(lbConfig.getIntervalMs());
          this.switchAllBuckets();
        }
      } else {
        trace("Counting disabled. Cancelling timer.");
        this.timerStartTime = null;
        clearTimeout(this.ejectionTimer);
        for (let mapEntry of this.entryMap.values()) {
          this.uneject(mapEntry);
          mapEntry.ejectionTimeMultiplier = 0;
        }
      }
      this.latestConfig = lbConfig;
      return true;
    }
    exitIdle() {
      this.childBalancer.exitIdle();
    }
    resetBackoff() {
      this.childBalancer.resetBackoff();
    }
    destroy() {
      clearTimeout(this.ejectionTimer);
      this.childBalancer.destroy();
    }
    getTypeName() {
      return TYPE_NAME;
    }
  }
  cjsExports.OutlierDetectionLoadBalancer = OutlierDetectionLoadBalancer;
  function setup() {
    if (OUTLIER_DETECTION_ENABLED)
      experimental_1.registerLoadBalancerType(
        TYPE_NAME,
        OutlierDetectionLoadBalancer,
        OutlierDetectionLoadBalancingConfig,
      );
  }
});
export { require_load_balancer_outlier_detection };
