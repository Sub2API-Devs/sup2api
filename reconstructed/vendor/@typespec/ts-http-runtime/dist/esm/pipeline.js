/**
 * @typespec/ts-http-runtime/dist/esm/pipeline.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */
import { dl } from "./pipelineRequest.js";

//@ chunk-mrx6y2r5.js:32039-32071 esm-layout
function Bs(e) {
  return new dl(e);
}
//@ chunk-mrx6y2r5.js:32071-32130 esm-fingerprint
var ul = new Set(["Deserialize", "Serialize", "Retry", "Sign"]);
//@ chunk-mrx6y2r5.js:32130-34701 esm-fingerprint
class $o {
  constructor(e) {
    var t;
    ((this._policies = []),
      (this._policies =
        (t = e === null || e === void 0 ? void 0 : e.slice(0)) !== null && t !== void 0 ? t : []),
      (this._orderedPolicies = void 0));
  }
  addPolicy(e, t = {}) {
    if (t.phase && t.afterPhase) throw Error("Policies inside a phase cannot specify afterPhase.");
    if (t.phase && !ul.has(t.phase)) throw Error(`Invalid phase name: ${t.phase}`);
    if (t.afterPhase && !ul.has(t.afterPhase)) throw Error(`Invalid afterPhase name: ${t.afterPhase}`);
    (this._policies.push({ policy: e, options: t }), (this._orderedPolicies = void 0));
  }
  removePolicy(e) {
    let t = [];
    return (
      (this._policies = this._policies.filter((_policy) => {
        if ((e.name && _policy.policy.name === e.name) || (e.phase && _policy.options.phase === e.phase))
          return (t.push(_policy.policy), !1);
        else return !0;
      })),
      (this._orderedPolicies = void 0),
      t
    );
  }
  sendRequest(e, t) {
    return this.getOrderedPolicies().reduceRight(
      (o, i) => (s) => i.sendRequest(s, o),
      (o) => e.sendRequest(o),
    )(t);
  }
  getOrderedPolicies() {
    if (!this._orderedPolicies) this._orderedPolicies = this.orderPolicies();
    return this._orderedPolicies;
  }
  clone() {
    return new $o(this._policies);
  }
  static create() {
    return new $o();
  }
  orderPolicies() {
    let e = [],
      t = new Map();
    function r(p) {
      return { name: p, policies: new Set(), hasRun: !1, hasAfterPolicies: !1 };
    }
    let n = r("Serialize"),
      o = r("None"),
      i = r("Deserialize"),
      s = r("Retry"),
      a = r("Sign"),
      c = [n, o, i, s, a];
    function l(p) {
      if (p === "Retry") return s;
      else if (p === "Serialize") return n;
      else if (p === "Deserialize") return i;
      else if (p === "Sign") return a;
      else return o;
    }
    for (let _policy of this._policies) {
      let { policy: policy, options: options } = _policy,
        I = policy.name;
      if (t.has(I)) throw Error("Duplicate policy names not allowed in pipeline");
      let v = { policy: policy, dependsOn: new Set(), dependants: new Set() };
      if (options.afterPhase) ((v.afterPhase = l(options.afterPhase)), (v.afterPhase.hasAfterPolicies = !0));
      (t.set(I, v), l(options.phase).policies.add(v));
    }
    for (let _policy of this._policies) {
      let { policy: policy, options: options } = _policy,
        I = policy.name,
        v = t.get(I);
      if (!v) throw Error(`Missing node for policy ${I}`);
      if (options.afterPolicies)
        for (let afterPolicy of options.afterPolicies) {
          let B = t.get(afterPolicy);
          if (B) (v.dependsOn.add(B), B.dependants.add(v));
        }
      if (options.beforePolicies)
        for (let beforePolicy of options.beforePolicies) {
          let B = t.get(beforePolicy);
          if (B) (B.dependsOn.add(v), v.dependants.add(B));
        }
    }
    function d(p) {
      p.hasRun = !0;
      for (let policy of p.policies) {
        if (policy.afterPhase && (!policy.afterPhase.hasRun || policy.afterPhase.policies.size)) continue;
        if (policy.dependsOn.size === 0) {
          e.push(policy.policy);
          for (let dependant of policy.dependants) dependant.dependsOn.delete(policy);
          (t.delete(policy.policy.name), p.policies.delete(policy));
        }
      }
    }
    function u() {
      for (let p of c) {
        if ((d(p), p.policies.size > 0 && p !== o)) {
          if (!o.hasRun) d(o);
          return;
        }
        if (p.hasAfterPolicies) d(o);
      }
    }
    let m = 0;
    while (t.size > 0) {
      m++;
      let p = e.length;
      if ((u(), e.length <= p && m > 1))
        throw Error("Cannot satisfy policy dependencies due to requirements cycle.");
    }
    return e;
  }
}
//@ chunk-mrx6y2r5.js:34701-34734 esm-layout
function zs() {
  return $o.create();
}

export { zs, Bs };
