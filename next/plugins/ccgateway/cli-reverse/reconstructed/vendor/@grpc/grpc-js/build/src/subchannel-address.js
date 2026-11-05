/**
 * @grpc/grpc-js/build/src/subchannel-address.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";

//@ chunk-3k21nfa0.js:42367-44332 cjs-fingerprint
var require_subchannel_address = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.EndpointMap = undefined;
  cjsExports.isTcpSubchannelAddress = isTcpSubchannelAddress;
  cjsExports.subchannelAddressEqual = subchannelAddressEqual;
  cjsExports.subchannelAddressToString = subchannelAddressToString;
  cjsExports.stringToSubchannelAddress = stringToSubchannelAddress;
  cjsExports.endpointEqual = endpointEqual;
  cjsExports.endpointToString = endpointToString;
  cjsExports.endpointHasAddress = endpointHasAddress;
  var net_1 = importMetaRequire("net");
  function isTcpSubchannelAddress(address) {
    return "port" in address;
  }
  function subchannelAddressEqual(address1, address2) {
    if (!address1 && !address2) return true;
    if (!address1 || !address2) return false;
    if (isTcpSubchannelAddress(address1))
      return (
        isTcpSubchannelAddress(address2) && address1.host === address2.host && address1.port === address2.port
      );
    else return !isTcpSubchannelAddress(address2) && address1.path === address2.path;
  }
  function subchannelAddressToString(address) {
    if (isTcpSubchannelAddress(address)) {
      if (net_1.isIPv6(address.host)) return "[" + address.host + "]:" + address.port;
      else return address.host + ":" + address.port;
    } else return address.path;
  }
  var DEFAULT_PORT = 443;
  function stringToSubchannelAddress(addressString, port) {
    if (net_1.isIP(addressString))
      return {
        host: addressString,
        port: port !== null && port !== undefined ? port : DEFAULT_PORT,
      };
    else
      return {
        path: addressString,
      };
  }
  function endpointEqual(endpoint1, endpoint2) {
    if (endpoint1.addresses.length !== endpoint2.addresses.length) return false;
    for (let i = 0; i < endpoint1.addresses.length; i++)
      if (!subchannelAddressEqual(endpoint1.addresses[i], endpoint2.addresses[i])) return false;
    return true;
  }
  function endpointToString(endpoint) {
    return "[" + endpoint.addresses.map(subchannelAddressToString).join(", ") + "]";
  }
  function endpointHasAddress(endpoint, expectedAddress) {
    for (let address of endpoint.addresses) if (subchannelAddressEqual(address, expectedAddress)) return true;
    return false;
  }
  function endpointEqualUnordered(endpoint1, endpoint2) {
    if (endpoint1.addresses.length !== endpoint2.addresses.length) return false;
    for (let address1 of endpoint1.addresses) {
      let matchFound = false;
      for (let address2 of endpoint2.addresses)
        if (subchannelAddressEqual(address1, address2)) {
          matchFound = true;
          break;
        }
      if (!matchFound) return false;
    }
    return true;
  }
  class EndpointMap {
    constructor() {
      this.map = new Set();
    }
    get size() {
      return this.map.size;
    }
    getForSubchannelAddress(address) {
      for (let entry of this.map) if (endpointHasAddress(entry.key, address)) return entry.value;
      return;
    }
    deleteMissing(endpoints) {
      let removedValues = [];
      for (let entry of this.map) {
        let foundEntry = false;
        for (let endpoint of endpoints) if (endpointEqualUnordered(endpoint, entry.key)) foundEntry = true;
        if (!foundEntry) {
          removedValues.push(entry.value);
          this.map.delete(entry);
        }
      }
      return removedValues;
    }
    get(endpoint) {
      for (let entry of this.map) if (endpointEqualUnordered(endpoint, entry.key)) return entry.value;
      return;
    }
    set(endpoint, mapEntry) {
      for (let entry of this.map)
        if (endpointEqualUnordered(endpoint, entry.key)) {
          entry.value = mapEntry;
          return;
        }
      this.map.add({
        key: endpoint,
        value: mapEntry,
      });
    }
    delete(endpoint) {
      for (let entry of this.map)
        if (endpointEqualUnordered(endpoint, entry.key)) {
          this.map.delete(entry);
          return;
        }
    }
    has(endpoint) {
      for (let entry of this.map) if (endpointEqualUnordered(endpoint, entry.key)) return true;
      return false;
    }
    clear() {
      this.map.clear();
    }
    *keys() {
      for (let entry of this.map) yield entry.key;
    }
    *values() {
      for (let entry of this.map) yield entry.value;
    }
    *entries() {
      for (let entry of this.map) yield [entry.key, entry.value];
    }
  }
  cjsExports.EndpointMap = EndpointMap;
});
export { require_subchannel_address };
