/**
 * @grpc/grpc-js/build/src/internal-channel.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_channel_credentials } from "./channel-credentials.js";
import { require_resolving_load_balancer } from "./resolving-load-balancer.js";
import { require_subchannel_pool } from "./subchannel-pool.js";
import { require_picker } from "./picker.js";
import { require_metadata } from "./metadata.js";
import { require_constants } from "./constants.js";
import { require_filter_stack } from "./filter-stack.js";
import { require_compression_filter } from "./compression-filter.js";
import { require_resolver } from "./resolver.js";
import { require_logging } from "./logging.js";
import { require_http_proxy } from "./http_proxy.js";
import { require_uri_parser } from "./uri-parser.js";
import { require_connectivity_state } from "./connectivity-state.js";
import { require_channelz } from "./channelz.js";
import { require_load_balancing_call } from "./load-balancing-call.js";
import { require_deadline } from "./deadline.js";
import { require_resolving_call } from "./resolving-call.js";
import { require_call_number } from "./call-number.js";
import { require_control_plane_status } from "./control-plane-status.js";
import { require_retrying_call } from "./retrying-call.js";
import { require_subchannel_interface } from "./subchannel-interface.js";

//@ chunk-3k21nfa0.js:264834-277418 cjs-fingerprint
var require_internal_channel = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.InternalChannel = cjsExports.SUBCHANNEL_ARGS_EXCLUDE_KEY_PREFIX = undefined;
  var channel_credentials_1 = require_channel_credentials();
  var resolving_load_balancer_1 = require_resolving_load_balancer();
  var subchannel_pool_1 = require_subchannel_pool();
  var picker_1 = require_picker();
  var metadata_1 = require_metadata();
  var constants_1 = require_constants();
  var filter_stack_1 = require_filter_stack();
  var compression_filter_1 = require_compression_filter();
  var resolver_1 = require_resolver();
  var logging_1 = require_logging();
  var http_proxy_1 = require_http_proxy();
  var uri_parser_1 = require_uri_parser();
  var connectivity_state_1 = require_connectivity_state();
  var channelz_1 = require_channelz();
  var load_balancing_call_1 = require_load_balancing_call();
  var deadline_1 = require_deadline();
  var resolving_call_1 = require_resolving_call();
  var call_number_1 = require_call_number();
  var control_plane_status_1 = require_control_plane_status();
  var retrying_call_1 = require_retrying_call();
  var subchannel_interface_1 = require_subchannel_interface();
  var MAX_TIMEOUT_TIME = 2147483647;
  var MIN_IDLE_TIMEOUT_MS = 1000;
  var DEFAULT_IDLE_TIMEOUT_MS = 1800000;
  var RETRY_THROTTLER_MAP = new Map();
  var DEFAULT_RETRY_BUFFER_SIZE_BYTES = 16777216;
  var DEFAULT_PER_RPC_RETRY_BUFFER_SIZE_BYTES = 1048576;
  class ChannelSubchannelWrapper extends subchannel_interface_1.BaseSubchannelWrapper {
    constructor(childSubchannel, channel) {
      super(childSubchannel);
      this.channel = channel;
      this.refCount = 0;
      this.subchannelStateListener = (subchannel, previousState, newState, keepaliveTime) => {
        channel.throttleKeepalive(keepaliveTime);
      };
    }
    ref() {
      if (this.refCount === 0) {
        this.child.addConnectivityStateListener(this.subchannelStateListener);
        this.channel.addWrappedSubchannel(this);
      }
      this.child.ref();
      this.refCount += 1;
    }
    unref() {
      this.child.unref();
      this.refCount -= 1;
      if (this.refCount <= 0) {
        this.child.removeConnectivityStateListener(this.subchannelStateListener);
        this.channel.removeWrappedSubchannel(this);
      }
    }
  }
  class ShutdownPicker {
    pick(pickArgs) {
      return {
        pickResultType: picker_1.PickResultType.DROP,
        status: {
          code: constants_1.Status.UNAVAILABLE,
          details: "Channel closed before call started",
          metadata: new metadata_1.Metadata(),
        },
        subchannel: null,
        onCallStarted: null,
        onCallEnded: null,
      };
    }
  }
  cjsExports.SUBCHANNEL_ARGS_EXCLUDE_KEY_PREFIX = "grpc.internal.no_subchannel";
  class ChannelzInfoTracker {
    constructor(target) {
      this.target = target;
      this.trace = new channelz_1.ChannelzTrace();
      this.callTracker = new channelz_1.ChannelzCallTracker();
      this.childrenTracker = new channelz_1.ChannelzChildrenTracker();
      this.state = connectivity_state_1.ConnectivityState.IDLE;
    }
    getChannelzInfoCallback() {
      return () => ({
        target: this.target,
        state: this.state,
        trace: this.trace,
        callTracker: this.callTracker,
        children: this.childrenTracker.getChildLists(),
      });
    }
  }
  class InternalChannel {
    constructor(target, credentials, options) {
      var _a;
      var _b;
      var _c;
      var _d;
      var _e;
      var _f;
      this.credentials = credentials;
      this.options = options;
      this.connectivityState = connectivity_state_1.ConnectivityState.IDLE;
      this.currentPicker = new picker_1.UnavailablePicker();
      this.configSelectionQueue = [];
      this.pickQueue = [];
      this.connectivityStateWatchers = [];
      this.callRefTimer = null;
      this.configSelector = null;
      this.currentResolutionError = null;
      this.wrappedSubchannels = new Set();
      this.callCount = 0;
      this.idleTimer = null;
      this.channelzEnabled = true;
      this.randomChannelId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
      if (typeof target !== "string") throw TypeError("Channel target must be a string");
      if (!(credentials instanceof channel_credentials_1.ChannelCredentials))
        throw TypeError("Channel credentials must be a ChannelCredentials object");
      if (options) {
        if (typeof options !== "object") throw TypeError("Channel options must be an object");
      }
      this.channelzInfoTracker = new ChannelzInfoTracker(target);
      let originalTargetUri = uri_parser_1.parseUri(target);
      if (originalTargetUri === null) throw Error(`Could not parse target name "${target}"`);
      let defaultSchemeMapResult = resolver_1.mapUriDefaultScheme(originalTargetUri);
      if (defaultSchemeMapResult === null)
        throw Error(`Could not find a default scheme for target name "${target}"`);
      if (this.options["grpc.enable_channelz"] === 0) this.channelzEnabled = false;
      this.channelzRef = channelz_1.registerChannelzChannel(
        target,
        this.channelzInfoTracker.getChannelzInfoCallback(),
        this.channelzEnabled,
      );
      if (this.channelzEnabled) this.channelzInfoTracker.trace.addTrace("CT_INFO", "Channel created");
      if (this.options["grpc.default_authority"])
        this.defaultAuthority = this.options["grpc.default_authority"];
      else this.defaultAuthority = resolver_1.getDefaultAuthority(defaultSchemeMapResult);
      let proxyMapResult = http_proxy_1.mapProxyName(defaultSchemeMapResult, options);
      this.target = proxyMapResult.target;
      this.options = Object.assign({}, this.options, proxyMapResult.extraOptions);
      this.subchannelPool = subchannel_pool_1.getSubchannelPool(
        ((_a = this.options["grpc.use_local_subchannel_pool"]) !== null && _a !== undefined ? _a : 0) === 0,
      );
      this.retryBufferTracker = new retrying_call_1.MessageBufferTracker(
        (_b = this.options["grpc.retry_buffer_size"]) !== null && _b !== undefined
          ? _b
          : DEFAULT_RETRY_BUFFER_SIZE_BYTES,
        (_c = this.options["grpc.per_rpc_retry_buffer_size"]) !== null && _c !== undefined
          ? _c
          : DEFAULT_PER_RPC_RETRY_BUFFER_SIZE_BYTES,
      );
      this.keepaliveTime =
        (_d = this.options["grpc.keepalive_time_ms"]) !== null && _d !== undefined ? _d : -1;
      this.idleTimeoutMs = Math.max(
        (_e = this.options["grpc.client_idle_timeout_ms"]) !== null && _e !== undefined
          ? _e
          : DEFAULT_IDLE_TIMEOUT_MS,
        MIN_IDLE_TIMEOUT_MS,
      );
      let channelControlHelper = {
        createSubchannel: (subchannelAddress, subchannelArgs) => {
          let finalSubchannelArgs = {};
          for (let [key, value] of Object.entries(subchannelArgs))
            if (!key.startsWith(cjsExports.SUBCHANNEL_ARGS_EXCLUDE_KEY_PREFIX))
              finalSubchannelArgs[key] = value;
          let subchannel = this.subchannelPool.getOrCreateSubchannel(
            this.target,
            subchannelAddress,
            finalSubchannelArgs,
            this.credentials,
          );
          subchannel.throttleKeepalive(this.keepaliveTime);
          if (this.channelzEnabled)
            this.channelzInfoTracker.trace.addTrace(
              "CT_INFO",
              "Created subchannel or used existing subchannel",
              subchannel.getChannelzRef(),
            );
          return new ChannelSubchannelWrapper(subchannel, this);
        },
        updateState: (connectivityState, picker) => {
          this.currentPicker = picker;
          let queueCopy = this.pickQueue.slice();
          this.pickQueue = [];
          if (queueCopy.length > 0) this.callRefTimerUnref();
          for (let call of queueCopy) call.doPick();
          this.updateState(connectivityState);
        },
        requestReresolution: () => {
          throw Error("Resolving load balancer should never call requestReresolution");
        },
        addChannelzChild: (child) => {
          if (this.channelzEnabled) this.channelzInfoTracker.childrenTracker.refChild(child);
        },
        removeChannelzChild: (child) => {
          if (this.channelzEnabled) this.channelzInfoTracker.childrenTracker.unrefChild(child);
        },
      };
      this.resolvingLoadBalancer = new resolving_load_balancer_1.ResolvingLoadBalancer(
        this.target,
        channelControlHelper,
        this.options,
        (serviceConfig, configSelector) => {
          var _a;
          if (serviceConfig.retryThrottling)
            RETRY_THROTTLER_MAP.set(
              this.getTarget(),
              new retrying_call_1.RetryThrottler(
                serviceConfig.retryThrottling.maxTokens,
                serviceConfig.retryThrottling.tokenRatio,
                RETRY_THROTTLER_MAP.get(this.getTarget()),
              ),
            );
          else RETRY_THROTTLER_MAP.delete(this.getTarget());
          if (this.channelzEnabled)
            this.channelzInfoTracker.trace.addTrace("CT_INFO", "Address resolution succeeded");
          if (!((_a = this.configSelector) === null || _a === undefined)) _a.unref();
          this.configSelector = configSelector;
          this.currentResolutionError = null;
          process.nextTick(() => {
            let localQueue = this.configSelectionQueue;
            this.configSelectionQueue = [];
            if (localQueue.length > 0) this.callRefTimerUnref();
            for (let call of localQueue) call.getConfig();
          });
        },
        (status) => {
          if (this.channelzEnabled)
            this.channelzInfoTracker.trace.addTrace(
              "CT_WARNING",
              "Address resolution failed with code " + status.code + ' and details "' + status.details + '"',
            );
          if (this.configSelectionQueue.length > 0)
            this.trace("Name resolution failed with calls queued for config selection");
          if (this.configSelector === null)
            this.currentResolutionError = Object.assign(
              Object.assign(
                {},
                control_plane_status_1.restrictControlPlaneStatusCode(status.code, status.details),
              ),
              {
                metadata: status.metadata,
              },
            );
          let localQueue = this.configSelectionQueue;
          this.configSelectionQueue = [];
          if (localQueue.length > 0) this.callRefTimerUnref();
          for (let call of localQueue) call.reportResolverError(status);
        },
      );
      this.filterStackFactory = new filter_stack_1.FilterStackFactory([
        new compression_filter_1.CompressionFilterFactory(this, this.options),
      ]);
      this.trace("Channel constructed with options " + JSON.stringify(options, undefined, 2));
      let error = Error();
      if (logging_1.isTracerEnabled("channel_stacktrace"))
        logging_1.trace(
          constants_1.LogVerbosity.DEBUG,
          "channel_stacktrace",
          "(" +
            this.channelzRef.id +
            `) Channel constructed 
` +
            ((_f = error.stack) === null || _f === undefined
              ? undefined
              : _f.substring(
                  error.stack.indexOf(`
`) + 1,
                )),
        );
      this.lastActivityTimestamp = new Date();
    }
    trace(text, verbosityOverride) {
      logging_1.trace(
        verbosityOverride !== null && verbosityOverride !== undefined
          ? verbosityOverride
          : constants_1.LogVerbosity.DEBUG,
        "channel",
        "(" + this.channelzRef.id + ") " + uri_parser_1.uriToString(this.target) + " " + text,
      );
    }
    callRefTimerRef() {
      var _a;
      var _b;
      var _c;
      var _d;
      if (!this.callRefTimer) this.callRefTimer = setInterval(() => {}, MAX_TIMEOUT_TIME);
      if (!((_b = (_a = this.callRefTimer).hasRef) === null || _b === undefined ? undefined : _b.call(_a))) {
        this.trace(
          "callRefTimer.ref | configSelectionQueue.length=" +
            this.configSelectionQueue.length +
            " pickQueue.length=" +
            this.pickQueue.length,
        );
        if (!((_d = (_c = this.callRefTimer).ref) === null || _d === undefined)) _d.call(_c);
      }
    }
    callRefTimerUnref() {
      var _a;
      var _b;
      var _c;
      if (
        !((_a = this.callRefTimer) === null || _a === undefined ? undefined : _a.hasRef) ||
        this.callRefTimer.hasRef()
      ) {
        this.trace(
          "callRefTimer.unref | configSelectionQueue.length=" +
            this.configSelectionQueue.length +
            " pickQueue.length=" +
            this.pickQueue.length,
        );
        if (!(
          (_c = (_b = this.callRefTimer) === null || _b === undefined ? undefined : _b.unref) === null ||
          _c === undefined
        ))
          _c.call(_b);
      }
    }
    removeConnectivityStateWatcher(watcherObject) {
      let watcherIndex = this.connectivityStateWatchers.findIndex((value) => value === watcherObject);
      if (watcherIndex >= 0) this.connectivityStateWatchers.splice(watcherIndex, 1);
    }
    updateState(newState) {
      logging_1.trace(
        constants_1.LogVerbosity.DEBUG,
        "connectivity_state",
        "(" +
          this.channelzRef.id +
          ") " +
          uri_parser_1.uriToString(this.target) +
          " " +
          connectivity_state_1.ConnectivityState[this.connectivityState] +
          " -> " +
          connectivity_state_1.ConnectivityState[newState],
      );
      if (this.channelzEnabled)
        this.channelzInfoTracker.trace.addTrace(
          "CT_INFO",
          "Connectivity state change to " + connectivity_state_1.ConnectivityState[newState],
        );
      this.connectivityState = newState;
      this.channelzInfoTracker.state = newState;
      let watchersCopy = this.connectivityStateWatchers.slice();
      for (let watcherObject of watchersCopy)
        if (newState !== watcherObject.currentState) {
          if (watcherObject.timer) clearTimeout(watcherObject.timer);
          this.removeConnectivityStateWatcher(watcherObject);
          watcherObject.callback();
        }
      if (newState !== connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE)
        this.currentResolutionError = null;
    }
    throttleKeepalive(newKeepaliveTime) {
      if (newKeepaliveTime > this.keepaliveTime) {
        this.keepaliveTime = newKeepaliveTime;
        for (let wrappedSubchannel of this.wrappedSubchannels)
          wrappedSubchannel.throttleKeepalive(newKeepaliveTime);
      }
    }
    addWrappedSubchannel(wrappedSubchannel) {
      this.wrappedSubchannels.add(wrappedSubchannel);
    }
    removeWrappedSubchannel(wrappedSubchannel) {
      this.wrappedSubchannels.delete(wrappedSubchannel);
    }
    doPick(metadata, extraPickInfo) {
      return this.currentPicker.pick({
        metadata,
        extraPickInfo,
      });
    }
    queueCallForPick(call) {
      this.pickQueue.push(call);
      this.callRefTimerRef();
    }
    getConfig(method, metadata) {
      if (this.connectivityState !== connectivity_state_1.ConnectivityState.SHUTDOWN)
        this.resolvingLoadBalancer.exitIdle();
      if (this.configSelector)
        return {
          type: "SUCCESS",
          config: this.configSelector.invoke(method, metadata, this.randomChannelId),
        };
      else if (this.currentResolutionError)
        return {
          type: "ERROR",
          error: this.currentResolutionError,
        };
      else
        return {
          type: "NONE",
        };
    }
    queueCallForConfig(call) {
      this.configSelectionQueue.push(call);
      this.callRefTimerRef();
    }
    enterIdle() {
      this.resolvingLoadBalancer.destroy();
      this.updateState(connectivity_state_1.ConnectivityState.IDLE);
      this.currentPicker = new picker_1.QueuePicker(this.resolvingLoadBalancer);
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }
      if (this.callRefTimer) {
        clearInterval(this.callRefTimer);
        this.callRefTimer = null;
      }
    }
    startIdleTimeout(timeoutMs) {
      var _a;
      var _b;
      this.idleTimer = setTimeout(() => {
        if (this.callCount > 0) {
          this.startIdleTimeout(this.idleTimeoutMs);
          return;
        }
        let timeSinceLastActivity = new Date().valueOf() - this.lastActivityTimestamp.valueOf();
        if (timeSinceLastActivity >= this.idleTimeoutMs) {
          this.trace("Idle timer triggered after " + this.idleTimeoutMs + "ms of inactivity");
          this.enterIdle();
        } else this.startIdleTimeout(this.idleTimeoutMs - timeSinceLastActivity);
      }, timeoutMs);
      if (!((_b = (_a = this.idleTimer).unref) === null || _b === undefined)) _b.call(_a);
    }
    maybeStartIdleTimer() {
      if (this.connectivityState !== connectivity_state_1.ConnectivityState.SHUTDOWN && !this.idleTimer)
        this.startIdleTimeout(this.idleTimeoutMs);
    }
    onCallStart() {
      if (this.channelzEnabled) this.channelzInfoTracker.callTracker.addCallStarted();
      this.callCount += 1;
    }
    onCallEnd(status) {
      if (this.channelzEnabled)
        if (status.code === constants_1.Status.OK) this.channelzInfoTracker.callTracker.addCallSucceeded();
        else this.channelzInfoTracker.callTracker.addCallFailed();
      this.callCount -= 1;
      this.lastActivityTimestamp = new Date();
      this.maybeStartIdleTimer();
    }
    createLoadBalancingCall(callConfig, method, host, credentials, deadline) {
      let callNumber = call_number_1.getNextCallNumber();
      this.trace("createLoadBalancingCall [" + callNumber + '] method="' + method + '"');
      return new load_balancing_call_1.LoadBalancingCall(
        this,
        callConfig,
        method,
        host,
        credentials,
        deadline,
        callNumber,
      );
    }
    createRetryingCall(callConfig, method, host, credentials, deadline) {
      let callNumber = call_number_1.getNextCallNumber();
      this.trace("createRetryingCall [" + callNumber + '] method="' + method + '"');
      return new retrying_call_1.RetryingCall(
        this,
        callConfig,
        method,
        host,
        credentials,
        deadline,
        callNumber,
        this.retryBufferTracker,
        RETRY_THROTTLER_MAP.get(this.getTarget()),
      );
    }
    createResolvingCall(method, deadline, host, parentCall, propagateFlags) {
      let callNumber = call_number_1.getNextCallNumber();
      this.trace(
        "createResolvingCall [" +
          callNumber +
          '] method="' +
          method +
          '", deadline=' +
          deadline_1.deadlineToString(deadline),
      );
      let finalOptions = {
        deadline,
        flags:
          propagateFlags !== null && propagateFlags !== undefined
            ? propagateFlags
            : constants_1.Propagate.DEFAULTS,
        host: host !== null && host !== undefined ? host : this.defaultAuthority,
        parentCall,
      };
      let call = new resolving_call_1.ResolvingCall(
        this,
        method,
        finalOptions,
        this.filterStackFactory.clone(),
        callNumber,
      );
      this.onCallStart();
      call.addStatusWatcher((status) => {
        this.onCallEnd(status);
      });
      return call;
    }
    close() {
      var _a;
      this.resolvingLoadBalancer.destroy();
      this.updateState(connectivity_state_1.ConnectivityState.SHUTDOWN);
      this.currentPicker = new ShutdownPicker();
      for (let call of this.configSelectionQueue)
        call.cancelWithStatus(constants_1.Status.UNAVAILABLE, "Channel closed before call started");
      this.configSelectionQueue = [];
      for (let call of this.pickQueue)
        call.cancelWithStatus(constants_1.Status.UNAVAILABLE, "Channel closed before call started");
      this.pickQueue = [];
      if (this.callRefTimer) clearInterval(this.callRefTimer);
      if (this.idleTimer) clearTimeout(this.idleTimer);
      if (this.channelzEnabled) channelz_1.unregisterChannelzRef(this.channelzRef);
      this.subchannelPool.unrefUnusedSubchannels();
      if (!((_a = this.configSelector) === null || _a === undefined)) _a.unref();
      this.configSelector = null;
    }
    getTarget() {
      return uri_parser_1.uriToString(this.target);
    }
    getConnectivityState(tryToConnect) {
      let connectivityState = this.connectivityState;
      if (tryToConnect) {
        this.resolvingLoadBalancer.exitIdle();
        this.lastActivityTimestamp = new Date();
        this.maybeStartIdleTimer();
      }
      return connectivityState;
    }
    watchConnectivityState(currentState, deadline, callback) {
      if (this.connectivityState === connectivity_state_1.ConnectivityState.SHUTDOWN)
        throw Error("Channel has been shut down");
      let timer = null;
      if (deadline !== 1 / 0) {
        let deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
        let now = new Date();
        if (deadline === -1 / 0 || deadlineDate <= now) {
          process.nextTick(callback, Error("Deadline passed without connectivity state change"));
          return;
        }
        timer = setTimeout(() => {
          this.removeConnectivityStateWatcher(watcherObject);
          callback(Error("Deadline passed without connectivity state change"));
        }, deadlineDate.getTime() - now.getTime());
      }
      let watcherObject = {
        currentState,
        callback,
        timer,
      };
      this.connectivityStateWatchers.push(watcherObject);
    }
    getChannelzRef() {
      return this.channelzRef;
    }
    createCall(method, deadline, host, parentCall, propagateFlags) {
      if (typeof method !== "string") throw TypeError("Channel#createCall: method must be a string");
      if (!(typeof deadline === "number" || deadline instanceof Date))
        throw TypeError("Channel#createCall: deadline must be a number or Date");
      if (this.connectivityState === connectivity_state_1.ConnectivityState.SHUTDOWN)
        throw Error("Channel has been shut down");
      return this.createResolvingCall(method, deadline, host, parentCall, propagateFlags);
    }
    getOptions() {
      return this.options;
    }
  }
  cjsExports.InternalChannel = InternalChannel;
});
export { require_internal_channel };
