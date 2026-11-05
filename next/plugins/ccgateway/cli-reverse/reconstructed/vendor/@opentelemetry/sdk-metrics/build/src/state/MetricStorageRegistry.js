/**
 * @opentelemetry/sdk-metrics/build/src/state/MetricStorageRegistry.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_InstrumentDescriptor } from "../InstrumentDescriptor.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_RegistrationConflicts } from "../view/RegistrationConflicts.js";

//@ chunk-q87n5wsq.js:44042-45990 cjs-fingerprint
var require_MetricStorageRegistry = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MetricStorageRegistry = undefined;
  var InstrumentDescriptor_1 = require_InstrumentDescriptor();
  var api = require_api();
  var RegistrationConflicts_1 = require_RegistrationConflicts();
  class MetricStorageRegistry {
    _sharedRegistry = new Map();
    _perCollectorRegistry = new Map();
    static create() {
      return new MetricStorageRegistry();
    }
    getStorages(collector) {
      let storages = [];
      for (let metricStorages of this._sharedRegistry.values()) storages = storages.concat(metricStorages);
      let perCollectorStorages = this._perCollectorRegistry.get(collector);
      if (perCollectorStorages != null)
        for (let metricStorages of perCollectorStorages.values()) storages = storages.concat(metricStorages);
      return storages;
    }
    register(storage) {
      this._registerStorage(storage, this._sharedRegistry);
    }
    registerForCollector(collector, storage) {
      let storageMap = this._perCollectorRegistry.get(collector);
      if (storageMap == null) {
        storageMap = new Map();
        this._perCollectorRegistry.set(collector, storageMap);
      }
      this._registerStorage(storage, storageMap);
    }
    findOrUpdateCompatibleStorage(expectedDescriptor) {
      let storages = this._sharedRegistry.get(expectedDescriptor.name);
      if (storages === undefined) return null;
      return this._findOrUpdateCompatibleStorage(expectedDescriptor, storages);
    }
    findOrUpdateCompatibleCollectorStorage(collector, expectedDescriptor) {
      let storageMap = this._perCollectorRegistry.get(collector);
      if (storageMap === undefined) return null;
      let storages = storageMap.get(expectedDescriptor.name);
      if (storages === undefined) return null;
      return this._findOrUpdateCompatibleStorage(expectedDescriptor, storages);
    }
    _registerStorage(storage, storageMap) {
      let descriptor = storage.getInstrumentDescriptor();
      let storages = storageMap.get(descriptor.name);
      if (storages === undefined) {
        storageMap.set(descriptor.name, [storage]);
        return;
      }
      storages.push(storage);
    }
    _findOrUpdateCompatibleStorage(expectedDescriptor, existingStorages) {
      let compatibleStorage = null;
      for (let existingStorage of existingStorages) {
        let existingDescriptor = existingStorage.getInstrumentDescriptor();
        if (InstrumentDescriptor_1.isDescriptorCompatibleWith(existingDescriptor, expectedDescriptor)) {
          if (existingDescriptor.description !== expectedDescriptor.description) {
            if (expectedDescriptor.description.length > existingDescriptor.description.length)
              existingStorage.updateDescription(expectedDescriptor.description);
            api.diag.warn(
              "A view or instrument with the name ",
              expectedDescriptor.name,
              ` has already been registered, but has a different description and is incompatible with another registered view.
`,
              `Details:
`,
              RegistrationConflicts_1.getIncompatibilityDetails(existingDescriptor, expectedDescriptor),
              `The longer description will be used.
To resolve the conflict:`,
              RegistrationConflicts_1.getConflictResolutionRecipe(existingDescriptor, expectedDescriptor),
            );
          }
          compatibleStorage = existingStorage;
        } else
          api.diag.warn(
            "A view or instrument with the name ",
            expectedDescriptor.name,
            ` has already been registered and is incompatible with another registered view.
`,
            `Details:
`,
            RegistrationConflicts_1.getIncompatibilityDetails(existingDescriptor, expectedDescriptor),
            `To resolve the conflict:
`,
            RegistrationConflicts_1.getConflictResolutionRecipe(existingDescriptor, expectedDescriptor),
          );
      }
      return compatibleStorage;
    }
  }
  cjsExports.MetricStorageRegistry = MetricStorageRegistry;
});
export { require_MetricStorageRegistry };
