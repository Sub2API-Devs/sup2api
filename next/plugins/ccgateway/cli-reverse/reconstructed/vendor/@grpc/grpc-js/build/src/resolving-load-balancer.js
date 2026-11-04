/**
 * @grpc/grpc-js/build/src/resolving-load-balancer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_load_balancer } from "./load-balancer.js";
import { require_service_config } from "./service-config.js";
import { require_connectivity_state } from "./connectivity-state.js";
import { require_resolver } from "./resolver.js";
import { require_picker } from "./picker.js";
import { require_backoff_timeout } from "./backoff-timeout.js";
import { require_constants } from "./constants.js";
import { require_metadata } from "./metadata.js";
import { require_logging } from "./logging.js";
import { require_uri_parser } from "./uri-parser.js";
import { require_load_balancer_child_handler } from "./load-balancer-child-handler.js";

//@ chunk-pwh5dx3n.js:35999-41007 cjs-fingerprint
var require_resolving_load_balancer = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ResolvingLoadBalancer = undefined;
  var load_balancer_1 = require_load_balancer();
  var service_config_1 = require_service_config();
  var connectivity_state_1 = require_connectivity_state();
  var resolver_1 = require_resolver();
  var picker_1 = require_picker();
  var backoff_timeout_1 = require_backoff_timeout();
  var constants_1 = require_constants();
  var metadata_1 = require_metadata();
  var logging = require_logging();
  var constants_2 = require_constants();
  var uri_parser_1 = require_uri_parser();
  var load_balancer_child_handler_1 = require_load_balancer_child_handler();
  var TRACER_NAME = "resolving_load_balancer";
  function trace(text) {
    logging.trace(constants_2.LogVerbosity.DEBUG, TRACER_NAME, text);
  }
  var NAME_MATCH_LEVEL_ORDER = ["SERVICE_AND_METHOD", "SERVICE", "EMPTY"];
  function hasMatchingName(service, method, methodConfig, matchLevel) {
    for (let name of methodConfig.name)
      switch (matchLevel) {
        case "EMPTY":
          if (!name.service && !name.method) return true;
          break;
        case "SERVICE":
          if (name.service === service && !name.method) return true;
          break;
        case "SERVICE_AND_METHOD":
          if (name.service === service && name.method === method) return true;
      }
    return false;
  }
  function findMatchingConfig(service, method, methodConfigs, matchLevel) {
    for (let config of methodConfigs) if (hasMatchingName(service, method, config, matchLevel)) return config;
    return null;
  }
  function getDefaultConfigSelector(serviceConfig) {
    return {
      invoke(methodName, metadata) {
        var _a;
        var _b;
        let splitName = methodName.split("/").filter((x) => x.length > 0);
        let service = (_a = splitName[0]) !== null && _a !== undefined ? _a : "";
        let method = (_b = splitName[1]) !== null && _b !== undefined ? _b : "";
        if (serviceConfig && serviceConfig.methodConfig)
          for (let matchLevel of NAME_MATCH_LEVEL_ORDER) {
            let matchingConfig = findMatchingConfig(service, method, serviceConfig.methodConfig, matchLevel);
            if (matchingConfig)
              return {
                methodConfig: matchingConfig,
                pickInformation: {},
                status: constants_1.Status.OK,
                dynamicFilterFactories: [],
              };
          }
        return {
          methodConfig: {
            name: [],
          },
          pickInformation: {},
          status: constants_1.Status.OK,
          dynamicFilterFactories: [],
        };
      },
      unref() {},
    };
  }
  class ResolvingLoadBalancer {
    constructor(target, channelControlHelper, channelOptions, onSuccessfulResolution, onFailedResolution) {
      this.target = target;
      this.channelControlHelper = channelControlHelper;
      this.channelOptions = channelOptions;
      this.onSuccessfulResolution = onSuccessfulResolution;
      this.onFailedResolution = onFailedResolution;
      this.latestChildState = connectivity_state_1.ConnectivityState.IDLE;
      this.latestChildPicker = new picker_1.QueuePicker(this);
      this.latestChildErrorMessage = null;
      this.currentState = connectivity_state_1.ConnectivityState.IDLE;
      this.previousServiceConfig = null;
      this.continueResolving = false;
      if (channelOptions["grpc.service_config"])
        this.defaultServiceConfig = service_config_1.validateServiceConfig(
          JSON.parse(channelOptions["grpc.service_config"]),
        );
      else
        this.defaultServiceConfig = {
          loadBalancingConfig: [],
          methodConfig: [],
        };
      this.updateState(connectivity_state_1.ConnectivityState.IDLE, new picker_1.QueuePicker(this), null);
      this.childLoadBalancer = new load_balancer_child_handler_1.ChildLoadBalancerHandler({
        createSubchannel: channelControlHelper.createSubchannel.bind(channelControlHelper),
        requestReresolution: () => {
          if (this.backoffTimeout.isRunning()) {
            trace(
              "requestReresolution delayed by backoff timer until " +
                this.backoffTimeout.getEndTime().toISOString(),
            );
            this.continueResolving = true;
          } else this.updateResolution();
        },
        updateState: (newState, picker, errorMessage) => {
          this.latestChildState = newState;
          this.latestChildPicker = picker;
          this.latestChildErrorMessage = errorMessage;
          this.updateState(newState, picker, errorMessage);
        },
        addChannelzChild: channelControlHelper.addChannelzChild.bind(channelControlHelper),
        removeChannelzChild: channelControlHelper.removeChannelzChild.bind(channelControlHelper),
      });
      this.innerResolver = resolver_1.createResolver(
        target,
        this.handleResolverResult.bind(this),
        channelOptions,
      );
      let backoffOptions = {
        initialDelay: channelOptions["grpc.initial_reconnect_backoff_ms"],
        maxDelay: channelOptions["grpc.max_reconnect_backoff_ms"],
      };
      this.backoffTimeout = new backoff_timeout_1.BackoffTimeout(() => {
        if (this.continueResolving) {
          this.updateResolution();
          this.continueResolving = false;
        } else this.updateState(this.latestChildState, this.latestChildPicker, this.latestChildErrorMessage);
      }, backoffOptions);
      this.backoffTimeout.unref();
    }
    handleResolverResult(endpointList, attributes, serviceConfig, resolutionNote) {
      var _a;
      var _b;
      this.backoffTimeout.stop();
      this.backoffTimeout.reset();
      let resultAccepted = true;
      let workingServiceConfig = null;
      if (serviceConfig === null) workingServiceConfig = this.defaultServiceConfig;
      else if (serviceConfig.ok) workingServiceConfig = serviceConfig.value;
      else if (this.previousServiceConfig !== null) workingServiceConfig = this.previousServiceConfig;
      else {
        resultAccepted = false;
        this.handleResolutionFailure(serviceConfig.error);
      }
      if (workingServiceConfig !== null) {
        let workingConfigList =
          (_a =
            workingServiceConfig === null || workingServiceConfig === undefined
              ? undefined
              : workingServiceConfig.loadBalancingConfig) !== null && _a !== undefined
            ? _a
            : [];
        let loadBalancingConfig = load_balancer_1.selectLbConfigFromList(workingConfigList, true);
        if (loadBalancingConfig === null) {
          resultAccepted = false;
          this.handleResolutionFailure({
            code: constants_1.Status.UNAVAILABLE,
            details: "All load balancer options in service config are not compatible",
            metadata: new metadata_1.Metadata(),
          });
        } else
          resultAccepted = this.childLoadBalancer.updateAddressList(
            endpointList,
            loadBalancingConfig,
            Object.assign(Object.assign({}, this.channelOptions), attributes),
            resolutionNote,
          );
      }
      if (resultAccepted)
        this.onSuccessfulResolution(
          workingServiceConfig,
          (_b = attributes[resolver_1.CHANNEL_ARGS_CONFIG_SELECTOR_KEY]) !== null && _b !== undefined
            ? _b
            : getDefaultConfigSelector(workingServiceConfig),
        );
      return resultAccepted;
    }
    updateResolution() {
      this.innerResolver.updateResolution();
      if (this.currentState === connectivity_state_1.ConnectivityState.IDLE)
        this.updateState(
          connectivity_state_1.ConnectivityState.CONNECTING,
          this.latestChildPicker,
          this.latestChildErrorMessage,
        );
      this.backoffTimeout.runOnce();
    }
    updateState(connectivityState, picker, errorMessage) {
      trace(
        uri_parser_1.uriToString(this.target) +
          " " +
          connectivity_state_1.ConnectivityState[this.currentState] +
          " -> " +
          connectivity_state_1.ConnectivityState[connectivityState],
      );
      if (connectivityState === connectivity_state_1.ConnectivityState.IDLE)
        picker = new picker_1.QueuePicker(this, picker);
      this.currentState = connectivityState;
      this.channelControlHelper.updateState(connectivityState, picker, errorMessage);
    }
    handleResolutionFailure(error) {
      if (this.latestChildState === connectivity_state_1.ConnectivityState.IDLE) {
        this.updateState(
          connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE,
          new picker_1.UnavailablePicker(error),
          error.details,
        );
        this.onFailedResolution(error);
      }
    }
    exitIdle() {
      if (
        this.currentState === connectivity_state_1.ConnectivityState.IDLE ||
        this.currentState === connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE
      )
        if (this.backoffTimeout.isRunning()) this.continueResolving = true;
        else this.updateResolution();
      this.childLoadBalancer.exitIdle();
    }
    updateAddressList(endpointList, lbConfig) {
      throw Error("updateAddressList not supported on ResolvingLoadBalancer");
    }
    resetBackoff() {
      this.backoffTimeout.reset();
      this.childLoadBalancer.resetBackoff();
    }
    destroy() {
      this.childLoadBalancer.destroy();
      this.innerResolver.destroy();
      this.backoffTimeout.reset();
      this.backoffTimeout.stop();
      this.latestChildState = connectivity_state_1.ConnectivityState.IDLE;
      this.latestChildPicker = new picker_1.QueuePicker(this);
      this.currentState = connectivity_state_1.ConnectivityState.IDLE;
      this.previousServiceConfig = null;
      this.continueResolving = false;
    }
    getTypeName() {
      return "resolving_load_balancer";
    }
  }
  cjsExports.ResolvingLoadBalancer = ResolvingLoadBalancer;
});
export { require_resolving_load_balancer };
