/**
 * @grpc/grpc-js/build/src/load-balancer-child-handler.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_load_balancer } from "./load-balancer.js";
import { require_connectivity_state } from "./connectivity-state.js";

//@ chunk-3k21nfa0.js:33642-35999 cjs-fingerprint
var require_load_balancer_child_handler = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ChildLoadBalancerHandler = undefined;
  var load_balancer_1 = require_load_balancer();
  var connectivity_state_1 = require_connectivity_state();
  var TYPE_NAME = "child_load_balancer_helper";
  class ChildLoadBalancerHandler {
    constructor(channelControlHelper) {
      this.channelControlHelper = channelControlHelper;
      this.currentChild = null;
      this.pendingChild = null;
      this.latestConfig = null;
      this.ChildPolicyHelper = class {
        constructor(parent) {
          this.parent = parent;
          this.child = null;
        }
        createSubchannel(subchannelAddress, subchannelArgs) {
          return this.parent.channelControlHelper.createSubchannel(subchannelAddress, subchannelArgs);
        }
        updateState(connectivityState, picker, errorMessage) {
          var _a;
          if (this.calledByPendingChild()) {
            if (connectivityState === connectivity_state_1.ConnectivityState.CONNECTING) return;
            if (!((_a = this.parent.currentChild) === null || _a === undefined)) _a.destroy();
            this.parent.currentChild = this.parent.pendingChild;
            this.parent.pendingChild = null;
          } else if (!this.calledByCurrentChild()) return;
          this.parent.channelControlHelper.updateState(connectivityState, picker, errorMessage);
        }
        requestReresolution() {
          var _a;
          let latestChild =
            (_a = this.parent.pendingChild) !== null && _a !== undefined ? _a : this.parent.currentChild;
          if (this.child === latestChild) this.parent.channelControlHelper.requestReresolution();
        }
        setChild(newChild) {
          this.child = newChild;
        }
        addChannelzChild(child) {
          this.parent.channelControlHelper.addChannelzChild(child);
        }
        removeChannelzChild(child) {
          this.parent.channelControlHelper.removeChannelzChild(child);
        }
        calledByPendingChild() {
          return this.child === this.parent.pendingChild;
        }
        calledByCurrentChild() {
          return this.child === this.parent.currentChild;
        }
      };
    }
    configUpdateRequiresNewPolicyInstance(oldConfig, newConfig) {
      return oldConfig.getLoadBalancerName() !== newConfig.getLoadBalancerName();
    }
    updateAddressList(endpointList, lbConfig, options, resolutionNote) {
      let childToUpdate;
      if (
        this.currentChild === null ||
        this.latestConfig === null ||
        this.configUpdateRequiresNewPolicyInstance(this.latestConfig, lbConfig)
      ) {
        let newHelper = new this.ChildPolicyHelper(this);
        let newChild = load_balancer_1.createLoadBalancer(lbConfig, newHelper);
        newHelper.setChild(newChild);
        if (this.currentChild === null) {
          this.currentChild = newChild;
          childToUpdate = this.currentChild;
        } else {
          if (this.pendingChild) this.pendingChild.destroy();
          this.pendingChild = newChild;
          childToUpdate = this.pendingChild;
        }
      } else if (this.pendingChild === null) childToUpdate = this.currentChild;
      else childToUpdate = this.pendingChild;
      this.latestConfig = lbConfig;
      return childToUpdate.updateAddressList(endpointList, lbConfig, options, resolutionNote);
    }
    exitIdle() {
      if (this.currentChild) {
        this.currentChild.exitIdle();
        if (this.pendingChild) this.pendingChild.exitIdle();
      }
    }
    resetBackoff() {
      if (this.currentChild) {
        this.currentChild.resetBackoff();
        if (this.pendingChild) this.pendingChild.resetBackoff();
      }
    }
    destroy() {
      if (this.currentChild) {
        this.currentChild.destroy();
        this.currentChild = null;
      }
      if (this.pendingChild) {
        this.pendingChild.destroy();
        this.pendingChild = null;
      }
    }
    getTypeName() {
      return TYPE_NAME;
    }
  }
  cjsExports.ChildLoadBalancerHandler = ChildLoadBalancerHandler;
});
export { require_load_balancer_child_handler };
