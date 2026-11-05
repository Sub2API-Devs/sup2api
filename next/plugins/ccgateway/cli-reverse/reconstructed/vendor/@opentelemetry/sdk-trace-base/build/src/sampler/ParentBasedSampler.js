/**
 * @opentelemetry/sdk-trace-base/build/src/sampler/ParentBasedSampler.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-3wgj3rdg.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { require_core } from "../../../../core/build/src/index.js";
import { AlwaysOnSampler } from "../../esm/sampler/AlwaysOnSampler.js";
import { AlwaysOffSampler } from "../../esm/sampler/AlwaysOffSampler.js";

//@ chunk-3wgj3rdg.js:11718-11745 esm-layout
var import_api_5 = __toESM(require_api());
var import_core_7 = __toESM(require_core());
//@ chunk-3wgj3rdg.js:11745-13005 esm-fingerprint
class ParentBasedSampler {
  _root;
  _remoteParentSampled;
  _remoteParentNotSampled;
  _localParentSampled;
  _localParentNotSampled;
  constructor(config) {
    this._root = config.root;
    if (!this._root) {
      import_core_7.globalErrorHandler(Error("ParentBasedSampler must have a root sampler configured"));
      this._root = new AlwaysOnSampler();
    }
    this._remoteParentSampled = config.remoteParentSampled ?? new AlwaysOnSampler();
    this._remoteParentNotSampled = config.remoteParentNotSampled ?? new AlwaysOffSampler();
    this._localParentSampled = config.localParentSampled ?? new AlwaysOnSampler();
    this._localParentNotSampled = config.localParentNotSampled ?? new AlwaysOffSampler();
  }
  shouldSample(context, traceId, spanName, spanKind, attributes, links) {
    let parentContext = import_api_5.trace.getSpanContext(context);
    if (!parentContext || !import_api_5.isSpanContextValid(parentContext))
      return this._root.shouldSample(context, traceId, spanName, spanKind, attributes, links);
    if (parentContext.isRemote) {
      if (parentContext.traceFlags & import_api_5.TraceFlags.SAMPLED)
        return this._remoteParentSampled.shouldSample(
          context,
          traceId,
          spanName,
          spanKind,
          attributes,
          links,
        );
      return this._remoteParentNotSampled.shouldSample(
        context,
        traceId,
        spanName,
        spanKind,
        attributes,
        links,
      );
    }
    if (parentContext.traceFlags & import_api_5.TraceFlags.SAMPLED)
      return this._localParentSampled.shouldSample(context, traceId, spanName, spanKind, attributes, links);
    return this._localParentNotSampled.shouldSample(context, traceId, spanName, spanKind, attributes, links);
  }
  toString() {
    return `ParentBased{root=${this._root.toString()}, remoteParentSampled=${this._remoteParentSampled.toString()}, remoteParentNotSampled=${this._remoteParentNotSampled.toString()}, localParentSampled=${this._localParentSampled.toString()}, localParentNotSampled=${this._localParentNotSampled.toString()}}`;
  }
}
export { ParentBasedSampler };
