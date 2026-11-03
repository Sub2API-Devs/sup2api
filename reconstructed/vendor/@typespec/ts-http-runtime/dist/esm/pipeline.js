/**
 * @typespec/ts-http-runtime/dist/esm/pipeline.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */
import { dl } from "./pipelineRequest.js";

//@ chunk-mrx6y2r5.js:32039-32071 esm-layout
function Bs(options) {
  return new dl(options);
}
//@ chunk-mrx6y2r5.js:32071-32130 esm-fingerprint
var ValidPhaseNames = new Set(["Deserialize", "Serialize", "Retry", "Sign"]);
//@ chunk-mrx6y2r5.js:32130-34701 esm-fingerprint
class HttpPipeline {
  constructor(policies) {
    var _a;
    this._policies = [];
    this._policies =
      (_a = policies === null || policies === undefined ? undefined : policies.slice(0)) !== null &&
      _a !== undefined
        ? _a
        : [];
    this._orderedPolicies = undefined;
  }
  addPolicy(policy, options = {}) {
    if (options.phase && options.afterPhase)
      throw Error("Policies inside a phase cannot specify afterPhase.");
    if (options.phase && !ValidPhaseNames.has(options.phase))
      throw Error(`Invalid phase name: ${options.phase}`);
    if (options.afterPhase && !ValidPhaseNames.has(options.afterPhase))
      throw Error(`Invalid afterPhase name: ${options.afterPhase}`);
    this._policies.push({
      policy,
      options,
    });
    this._orderedPolicies = undefined;
  }
  removePolicy(options) {
    let removedPolicies = [];
    this._policies = this._policies.filter((policyDescriptor) => {
      if (
        (options.name && policyDescriptor.policy.name === options.name) ||
        (options.phase && policyDescriptor.options.phase === options.phase)
      ) {
        removedPolicies.push(policyDescriptor.policy);
        return false;
      } else return true;
    });
    this._orderedPolicies = undefined;
    return removedPolicies;
  }
  sendRequest(httpClient, request) {
    return this.getOrderedPolicies().reduceRight(
      (next, policy) => (req) => policy.sendRequest(req, next),
      (req) => httpClient.sendRequest(req),
    )(request);
  }
  getOrderedPolicies() {
    if (!this._orderedPolicies) this._orderedPolicies = this.orderPolicies();
    return this._orderedPolicies;
  }
  clone() {
    return new HttpPipeline(this._policies);
  }
  static create() {
    return new HttpPipeline();
  }
  orderPolicies() {
    let result = [];
    let policyMap = new Map();
    function createPhase(name) {
      return {
        name,
        policies: new Set(),
        hasRun: false,
        hasAfterPolicies: false,
      };
    }
    let serializePhase = createPhase("Serialize");
    let noPhase = createPhase("None");
    let deserializePhase = createPhase("Deserialize");
    let retryPhase = createPhase("Retry");
    let signPhase = createPhase("Sign");
    let orderedPhases = [serializePhase, noPhase, deserializePhase, retryPhase, signPhase];
    function getPhase(phase) {
      if (phase === "Retry") return retryPhase;
      else if (phase === "Serialize") return serializePhase;
      else if (phase === "Deserialize") return deserializePhase;
      else if (phase === "Sign") return signPhase;
      else return noPhase;
    }
    for (let _policy of this._policies) {
      let { policy, options } = _policy;
      let policyName = policy.name;
      if (policyMap.has(policyName)) throw Error("Duplicate policy names not allowed in pipeline");
      let node = {
        policy,
        dependsOn: new Set(),
        dependants: new Set(),
      };
      if (options.afterPhase) {
        node.afterPhase = getPhase(options.afterPhase);
        node.afterPhase.hasAfterPolicies = true;
      }
      policyMap.set(policyName, node);
      getPhase(options.phase).policies.add(node);
    }
    for (let descriptor of this._policies) {
      let { policy, options } = descriptor;
      let policyName = policy.name;
      let node = policyMap.get(policyName);
      if (!node) throw Error(`Missing node for policy ${policyName}`);
      if (options.afterPolicies)
        for (let afterPolicyName of options.afterPolicies) {
          let afterNode = policyMap.get(afterPolicyName);
          if (afterNode) {
            node.dependsOn.add(afterNode);
            afterNode.dependants.add(node);
          }
        }
      if (options.beforePolicies)
        for (let beforePolicyName of options.beforePolicies) {
          let beforeNode = policyMap.get(beforePolicyName);
          if (beforeNode) {
            beforeNode.dependsOn.add(node);
            node.dependants.add(beforeNode);
          }
        }
    }
    function walkPhase(phase) {
      phase.hasRun = true;
      for (let node of phase.policies) {
        if (node.afterPhase && (!node.afterPhase.hasRun || node.afterPhase.policies.size)) continue;
        if (node.dependsOn.size === 0) {
          result.push(node.policy);
          for (let dependant of node.dependants) dependant.dependsOn.delete(node);
          policyMap.delete(node.policy.name);
          phase.policies.delete(node);
        }
      }
    }
    function walkPhases() {
      for (let phase of orderedPhases) {
        walkPhase(phase);
        if (phase.policies.size > 0 && phase !== noPhase) {
          if (!noPhase.hasRun) walkPhase(noPhase);
          return;
        }
        if (phase.hasAfterPolicies) walkPhase(noPhase);
      }
    }
    let iteration = 0;
    while (policyMap.size > 0) {
      iteration++;
      let initialResultLength = result.length;
      walkPhases();
      if (result.length <= initialResultLength && iteration > 1)
        throw Error("Cannot satisfy policy dependencies due to requirements cycle.");
    }
    return result;
  }
}
//@ chunk-mrx6y2r5.js:34701-34734 esm-layout
function createEmptyPipeline() {
  return HttpPipeline.create();
}
export { createEmptyPipeline, Bs };
