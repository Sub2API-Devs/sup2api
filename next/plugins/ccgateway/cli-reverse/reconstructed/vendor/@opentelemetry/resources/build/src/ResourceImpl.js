/**
 * @opentelemetry/resources/build/src/ResourceImpl.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../api/build/src/index.js";
import { require_core } from "../../../core/build/src/index.js";
import { require_error_3 } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_default_service_name } from "./default-service-name.js";
import { require_utils_3 } from "./utils.js";

//@ chunk-7kayq7nc.js:136614-139434 cjs-fingerprint
var require_ResourceImpl = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.defaultResource =
    cjsExports.emptyResource =
    cjsExports.resourceFromDetectedResource =
    cjsExports.resourceFromAttributes =
      undefined;
  var api_1 = require_api();
  var core_1 = require_core();
  var semantic_conventions_1 = require_error_3();
  var platform_1 = require_default_service_name();
  var utils_1 = require_utils_3();
  class ResourceImpl {
    _rawAttributes;
    _asyncAttributesPending = false;
    _schemaUrl;
    _memoizedAttributes;
    static FromAttributeList(attributes, options) {
      let res = new ResourceImpl({}, options);
      res._rawAttributes = guardedRawAttributes(attributes);
      res._asyncAttributesPending = attributes.filter(([_, val]) => utils_1.isPromiseLike(val)).length > 0;
      return res;
    }
    constructor(resource, options) {
      let attributes = resource.attributes ?? {};
      this._rawAttributes = Object.entries(attributes).map(([k, v]) => {
        if (utils_1.isPromiseLike(v)) this._asyncAttributesPending = true;
        return [k, v];
      });
      this._rawAttributes = guardedRawAttributes(this._rawAttributes);
      this._schemaUrl = validateSchemaUrl(options?.schemaUrl);
    }
    get asyncAttributesPending() {
      return this._asyncAttributesPending;
    }
    async waitForAsyncAttributes() {
      if (!this.asyncAttributesPending) return;
      for (let i = 0; i < this._rawAttributes.length; i++) {
        let [k, v] = this._rawAttributes[i];
        this._rawAttributes[i] = [k, utils_1.isPromiseLike(v) ? await v : v];
      }
      this._asyncAttributesPending = false;
    }
    get attributes() {
      if (this.asyncAttributesPending)
        api_1.diag.error("Accessing resource attributes before async attributes settled");
      if (this._memoizedAttributes) return this._memoizedAttributes;
      let attrs = {};
      for (let [k, v] of this._rawAttributes) {
        if (utils_1.isPromiseLike(v)) {
          api_1.diag.debug(`Unsettled resource attribute ${k} skipped`);
          continue;
        }
        if (v != null) attrs[k] ??= v;
      }
      if (!this._asyncAttributesPending) this._memoizedAttributes = attrs;
      return attrs;
    }
    getRawAttributes() {
      return this._rawAttributes;
    }
    get schemaUrl() {
      return this._schemaUrl;
    }
    merge(resource) {
      if (resource == null) return this;
      let mergedSchemaUrl = mergeSchemaUrl(this, resource);
      let mergedOptions = mergedSchemaUrl
        ? {
            schemaUrl: mergedSchemaUrl,
          }
        : undefined;
      return ResourceImpl.FromAttributeList(
        [...resource.getRawAttributes(), ...this.getRawAttributes()],
        mergedOptions,
      );
    }
  }
  function resourceFromAttributes(attributes, options) {
    return ResourceImpl.FromAttributeList(Object.entries(attributes), options);
  }
  cjsExports.resourceFromAttributes = resourceFromAttributes;
  function resourceFromDetectedResource(detectedResource, options) {
    return new ResourceImpl(detectedResource, options);
  }
  cjsExports.resourceFromDetectedResource = resourceFromDetectedResource;
  function emptyResource() {
    return resourceFromAttributes({});
  }
  cjsExports.emptyResource = emptyResource;
  function defaultResource() {
    return resourceFromAttributes({
      [semantic_conventions_1.ATTR_SERVICE_NAME]: platform_1.defaultServiceName(),
      [semantic_conventions_1.ATTR_TELEMETRY_SDK_LANGUAGE]:
        core_1.SDK_INFO[semantic_conventions_1.ATTR_TELEMETRY_SDK_LANGUAGE],
      [semantic_conventions_1.ATTR_TELEMETRY_SDK_NAME]:
        core_1.SDK_INFO[semantic_conventions_1.ATTR_TELEMETRY_SDK_NAME],
      [semantic_conventions_1.ATTR_TELEMETRY_SDK_VERSION]:
        core_1.SDK_INFO[semantic_conventions_1.ATTR_TELEMETRY_SDK_VERSION],
    });
  }
  cjsExports.defaultResource = defaultResource;
  function guardedRawAttributes(attributes) {
    return attributes.map(([k, v]) => {
      if (utils_1.isPromiseLike(v))
        return [
          k,
          v.catch((err) => {
            api_1.diag.debug("promise rejection for resource attribute: %s - %s", k, err);
            return;
          }),
        ];
      return [k, v];
    });
  }
  function validateSchemaUrl(schemaUrl) {
    if (typeof schemaUrl === "string" || schemaUrl === undefined) return schemaUrl;
    api_1.diag.warn("Schema URL must be string or undefined, got %s. Schema URL will be ignored.", schemaUrl);
    return;
  }
  function mergeSchemaUrl(old, updating) {
    let oldSchemaUrl = old?.schemaUrl;
    let updatingSchemaUrl = updating?.schemaUrl;
    let isOldEmpty = oldSchemaUrl === undefined || oldSchemaUrl === "";
    let isUpdatingEmpty = updatingSchemaUrl === undefined || updatingSchemaUrl === "";
    if (isOldEmpty) return updatingSchemaUrl;
    if (isUpdatingEmpty) return oldSchemaUrl;
    if (oldSchemaUrl === updatingSchemaUrl) return oldSchemaUrl;
    api_1.diag.warn(
      'Schema URL merge conflict: old resource has "%s", updating resource has "%s". Resulting resource will have undefined Schema URL.',
      oldSchemaUrl,
      updatingSchemaUrl,
    );
    return;
  }
});
export { require_ResourceImpl };
