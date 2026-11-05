/**
 * @opentelemetry/sdk-trace-base/build/src/BasicTracerProvider.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-3wgj3rdg.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { import_core_3, import_resources_2 } from "../esm/enums.js";
import { loadDefaultConfig } from "./config.js";
import { configureDefaultLimits } from "./utility.js";
import { MultiSpanProcessor } from "./MultiSpanProcessor.js";
import { Tracer } from "./Tracer.js";
import { ForceFlushState } from "../esm/BasicTracerProvider.js";

//@ chunk-3wgj3rdg.js:22575-23700 esm-fingerprint
class BasicTracerProvider {
  _config;
  _tracers = new Map();
  _resource;
  _activeSpanProcessor;
  constructor(config = {}) {
    let mergedConfig = import_core_3.merge({}, loadDefaultConfig(), configureDefaultLimits(config));
    this._resource = mergedConfig.resource ?? import_resources_2.defaultResource();
    this._config = Object.assign({}, mergedConfig, {
      resource: this._resource,
    });
    let spanProcessors = [];
    if (config.spanProcessors?.length) spanProcessors.push(...config.spanProcessors);
    this._activeSpanProcessor = new MultiSpanProcessor(spanProcessors);
  }
  getTracer(name, version, options) {
    let key = `${name}@${version || ""}:${options?.schemaUrl || ""}`;
    if (!this._tracers.has(key))
      this._tracers.set(
        key,
        new Tracer(
          {
            name,
            version,
            schemaUrl: options?.schemaUrl,
          },
          this._config,
          this._resource,
          this._activeSpanProcessor,
        ),
      );
    return this._tracers.get(key);
  }
  forceFlush() {
    let timeout = this._config.forceFlushTimeoutMillis;
    let promises = this._activeSpanProcessor._spanProcessors.map(
      (spanProcessor) =>
        new Promise((resolve) => {
          let state;
          let timeoutInterval = setTimeout(() => {
            resolve(Error(`Span processor did not completed within timeout period of ${timeout} ms`));
            state = ForceFlushState.timeout;
          }, timeout);
          spanProcessor
            .forceFlush()
            .then(() => {
              clearTimeout(timeoutInterval);
              if (state !== ForceFlushState.timeout) {
                state = ForceFlushState.resolved;
                resolve(state);
              }
            })
            .catch((error) => {
              clearTimeout(timeoutInterval);
              state = ForceFlushState.error;
              resolve(error);
            });
        }),
    );
    return new Promise((resolve, reject) => {
      Promise.all(promises)
        .then((results) => {
          let errors = results.filter((result) => result !== ForceFlushState.resolved);
          if (errors.length > 0) reject(errors);
          else resolve();
        })
        .catch((error) => reject([error]));
    });
  }
  shutdown() {
    return this._activeSpanProcessor.shutdown();
  }
}
export { BasicTracerProvider };
