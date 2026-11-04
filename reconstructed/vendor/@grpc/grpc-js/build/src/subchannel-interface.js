/**
 * @grpc/grpc-js/build/src/subchannel-interface.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:263230-264834 cjs-fingerprint
var Bi = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.BaseSubchannelWrapper = undefined;
  class BaseSubchannelWrapper {
    constructor(child) {
      this.child = child;
      this.healthy = true;
      this.healthListeners = new Set();
      this.refcount = 0;
      this.dataWatchers = new Set();
      child.addHealthStateWatcher((childHealthy) => {
        if (this.healthy) this.updateHealthListeners();
      });
    }
    updateHealthListeners() {
      for (let listener of this.healthListeners) listener(this.isHealthy());
    }
    getConnectivityState() {
      return this.child.getConnectivityState();
    }
    addConnectivityStateListener(listener) {
      this.child.addConnectivityStateListener(listener);
    }
    removeConnectivityStateListener(listener) {
      this.child.removeConnectivityStateListener(listener);
    }
    startConnecting() {
      this.child.startConnecting();
    }
    getAddress() {
      return this.child.getAddress();
    }
    throttleKeepalive(newKeepaliveTime) {
      this.child.throttleKeepalive(newKeepaliveTime);
    }
    ref() {
      this.child.ref();
      this.refcount += 1;
    }
    unref() {
      this.child.unref();
      this.refcount -= 1;
      if (this.refcount === 0) this.destroy();
    }
    destroy() {
      for (let watcher of this.dataWatchers) watcher.destroy();
    }
    getChannelzRef() {
      return this.child.getChannelzRef();
    }
    isHealthy() {
      return this.healthy && this.child.isHealthy();
    }
    addHealthStateWatcher(listener) {
      this.healthListeners.add(listener);
    }
    removeHealthStateWatcher(listener) {
      this.healthListeners.delete(listener);
    }
    addDataWatcher(dataWatcher) {
      dataWatcher.setSubchannel(this.getRealSubchannel());
      this.dataWatchers.add(dataWatcher);
    }
    setHealthy(healthy) {
      if (healthy !== this.healthy) {
        this.healthy = healthy;
        if (this.child.isHealthy()) this.updateHealthListeners();
      }
    }
    getRealSubchannel() {
      return this.child.getRealSubchannel();
    }
    realSubchannelEquals(other) {
      return this.getRealSubchannel() === other.getRealSubchannel();
    }
    getCallCredentials() {
      return this.child.getCallCredentials();
    }
    getChannel() {
      return this.child.getChannel();
    }
  }
  cjsExports.BaseSubchannelWrapper = BaseSubchannelWrapper;
});
export { Bi };
