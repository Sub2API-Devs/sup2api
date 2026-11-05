/**
 * @grpc/grpc-js/build/src/load-balancer.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_logging } from "./logging.js";
import { require_constants } from "./constants.js";

//@ chunk-3k21nfa0.js:19811-21748 cjs-fingerprint
var require_load_balancer = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createChildChannelControlHelper = createChildChannelControlHelper;
  cjsExports.registerLoadBalancerType = registerLoadBalancerType;
  cjsExports.registerDefaultLoadBalancerType = registerDefaultLoadBalancerType;
  cjsExports.createLoadBalancer = createLoadBalancer;
  cjsExports.isLoadBalancerNameRegistered = isLoadBalancerNameRegistered;
  cjsExports.parseLoadBalancingConfig = parseLoadBalancingConfig;
  cjsExports.getDefaultConfig = getDefaultConfig;
  cjsExports.selectLbConfigFromList = selectLbConfigFromList;
  var logging_1 = require_logging();
  var constants_1 = require_constants();
  function createChildChannelControlHelper(parent, overrides) {
    var _a;
    var _b;
    var _c;
    var _d;
    var _e;
    var _f;
    var _g;
    var _h;
    var _j;
    var _k;
    return {
      createSubchannel:
        (_b =
          (_a = overrides.createSubchannel) === null || _a === undefined ? undefined : _a.bind(overrides)) !==
          null && _b !== undefined
          ? _b
          : parent.createSubchannel.bind(parent),
      updateState:
        (_d = (_c = overrides.updateState) === null || _c === undefined ? undefined : _c.bind(overrides)) !==
          null && _d !== undefined
          ? _d
          : parent.updateState.bind(parent),
      requestReresolution:
        (_f =
          (_e = overrides.requestReresolution) === null || _e === undefined
            ? undefined
            : _e.bind(overrides)) !== null && _f !== undefined
          ? _f
          : parent.requestReresolution.bind(parent),
      addChannelzChild:
        (_h =
          (_g = overrides.addChannelzChild) === null || _g === undefined ? undefined : _g.bind(overrides)) !==
          null && _h !== undefined
          ? _h
          : parent.addChannelzChild.bind(parent),
      removeChannelzChild:
        (_k =
          (_j = overrides.removeChannelzChild) === null || _j === undefined
            ? undefined
            : _j.bind(overrides)) !== null && _k !== undefined
          ? _k
          : parent.removeChannelzChild.bind(parent),
    };
  }
  var registeredLoadBalancerTypes = {};
  var defaultLoadBalancerType = null;
  function registerLoadBalancerType(typeName, loadBalancerType, loadBalancingConfigType) {
    registeredLoadBalancerTypes[typeName] = {
      LoadBalancer: loadBalancerType,
      LoadBalancingConfig: loadBalancingConfigType,
    };
  }
  function registerDefaultLoadBalancerType(typeName) {
    defaultLoadBalancerType = typeName;
  }
  function createLoadBalancer(config, channelControlHelper) {
    let typeName = config.getLoadBalancerName();
    if (typeName in registeredLoadBalancerTypes)
      return new registeredLoadBalancerTypes[typeName].LoadBalancer(channelControlHelper);
    else return null;
  }
  function isLoadBalancerNameRegistered(typeName) {
    return typeName in registeredLoadBalancerTypes;
  }
  function parseLoadBalancingConfig(rawConfig) {
    let keys = Object.keys(rawConfig);
    if (keys.length !== 1) throw Error("Provided load balancing config has multiple conflicting entries");
    let typeName = keys[0];
    if (typeName in registeredLoadBalancerTypes)
      try {
        return registeredLoadBalancerTypes[typeName].LoadBalancingConfig.createFromJson(rawConfig[typeName]);
      } catch (e) {
        throw Error(`${typeName}: ${e.message}`);
      }
    else throw Error(`Unrecognized load balancing config name ${typeName}`);
  }
  function getDefaultConfig() {
    if (!defaultLoadBalancerType) throw Error("No default load balancer type registered");
    return new registeredLoadBalancerTypes[defaultLoadBalancerType].LoadBalancingConfig();
  }
  function selectLbConfigFromList(configs, fallbackTodefault = false) {
    for (let config of configs)
      try {
        return parseLoadBalancingConfig(config);
      } catch (e) {
        logging_1.log(constants_1.LogVerbosity.DEBUG, "Config parsing failed with error", e.message);
        continue;
      }
    if (fallbackTodefault) {
      if (defaultLoadBalancerType)
        return new registeredLoadBalancerTypes[defaultLoadBalancerType].LoadBalancingConfig();
      else return null;
    } else return null;
  }
});
export { require_load_balancer };
