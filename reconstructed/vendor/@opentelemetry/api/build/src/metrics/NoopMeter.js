/**
 * @opentelemetry/api/build/src/metrics/NoopMeter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:35747-37680 cjs-fingerprint
var require_NoopMeter = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createNoopMeter =
    cjsExports.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC =
    cjsExports.NOOP_OBSERVABLE_GAUGE_METRIC =
    cjsExports.NOOP_OBSERVABLE_COUNTER_METRIC =
    cjsExports.NOOP_UP_DOWN_COUNTER_METRIC =
    cjsExports.NOOP_HISTOGRAM_METRIC =
    cjsExports.NOOP_GAUGE_METRIC =
    cjsExports.NOOP_COUNTER_METRIC =
    cjsExports.NOOP_METER =
    cjsExports.NoopObservableUpDownCounterMetric =
    cjsExports.NoopObservableGaugeMetric =
    cjsExports.NoopObservableCounterMetric =
    cjsExports.NoopObservableMetric =
    cjsExports.NoopHistogramMetric =
    cjsExports.NoopGaugeMetric =
    cjsExports.NoopUpDownCounterMetric =
    cjsExports.NoopCounterMetric =
    cjsExports.NoopMetric =
    cjsExports.NoopMeter =
      undefined;
  class NoopMeter {
    constructor() {}
    createGauge(_name, _options) {
      return cjsExports.NOOP_GAUGE_METRIC;
    }
    createHistogram(_name, _options) {
      return cjsExports.NOOP_HISTOGRAM_METRIC;
    }
    createCounter(_name, _options) {
      return cjsExports.NOOP_COUNTER_METRIC;
    }
    createUpDownCounter(_name, _options) {
      return cjsExports.NOOP_UP_DOWN_COUNTER_METRIC;
    }
    createObservableGauge(_name, _options) {
      return cjsExports.NOOP_OBSERVABLE_GAUGE_METRIC;
    }
    createObservableCounter(_name, _options) {
      return cjsExports.NOOP_OBSERVABLE_COUNTER_METRIC;
    }
    createObservableUpDownCounter(_name, _options) {
      return cjsExports.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
    }
    addBatchObservableCallback(_callback, _observables) {}
    removeBatchObservableCallback(_callback) {}
  }
  cjsExports.NoopMeter = NoopMeter;
  class NoopMetric {}
  cjsExports.NoopMetric = NoopMetric;
  class NoopCounterMetric extends NoopMetric {
    add(_value, _attributes) {}
  }
  cjsExports.NoopCounterMetric = NoopCounterMetric;
  class NoopUpDownCounterMetric extends NoopMetric {
    add(_value, _attributes) {}
  }
  cjsExports.NoopUpDownCounterMetric = NoopUpDownCounterMetric;
  class NoopGaugeMetric extends NoopMetric {
    record(_value, _attributes) {}
  }
  cjsExports.NoopGaugeMetric = NoopGaugeMetric;
  class NoopHistogramMetric extends NoopMetric {
    record(_value, _attributes) {}
  }
  cjsExports.NoopHistogramMetric = NoopHistogramMetric;
  class NoopObservableMetric {
    addCallback(_callback) {}
    removeCallback(_callback) {}
  }
  cjsExports.NoopObservableMetric = NoopObservableMetric;
  class NoopObservableCounterMetric extends NoopObservableMetric {}
  cjsExports.NoopObservableCounterMetric = NoopObservableCounterMetric;
  class NoopObservableGaugeMetric extends NoopObservableMetric {}
  cjsExports.NoopObservableGaugeMetric = NoopObservableGaugeMetric;
  class NoopObservableUpDownCounterMetric extends NoopObservableMetric {}
  cjsExports.NoopObservableUpDownCounterMetric = NoopObservableUpDownCounterMetric;
  cjsExports.NOOP_METER = new NoopMeter();
  cjsExports.NOOP_COUNTER_METRIC = new NoopCounterMetric();
  cjsExports.NOOP_GAUGE_METRIC = new NoopGaugeMetric();
  cjsExports.NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
  cjsExports.NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
  cjsExports.NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
  cjsExports.NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
  cjsExports.NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
  function createNoopMeter() {
    return cjsExports.NOOP_METER;
  }
  cjsExports.createNoopMeter = createNoopMeter;
});
export { require_NoopMeter };
