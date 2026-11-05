/**
 * @opentelemetry/sdk-metrics/build/src/view/RegistrationConflicts.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-q87n5wsq.js:42129-44042 cjs-fingerprint
var require_RegistrationConflicts = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getConflictResolutionRecipe =
    cjsExports.getDescriptionResolutionRecipe =
    cjsExports.getTypeConflictResolutionRecipe =
    cjsExports.getUnitConflictResolutionRecipe =
    cjsExports.getValueTypeConflictResolutionRecipe =
    cjsExports.getIncompatibilityDetails =
      undefined;
  function getIncompatibilityDetails(existing, otherDescriptor) {
    let incompatibility = "";
    if (existing.unit !== otherDescriptor.unit)
      incompatibility += `	- Unit '${existing.unit}' does not match '${otherDescriptor.unit}'
`;
    if (existing.type !== otherDescriptor.type)
      incompatibility += `	- Type '${existing.type}' does not match '${otherDescriptor.type}'
`;
    if (existing.valueType !== otherDescriptor.valueType)
      incompatibility += `	- Value Type '${existing.valueType}' does not match '${otherDescriptor.valueType}'
`;
    if (existing.description !== otherDescriptor.description)
      incompatibility += `	- Description '${existing.description}' does not match '${otherDescriptor.description}'
`;
    return incompatibility;
  }
  cjsExports.getIncompatibilityDetails = getIncompatibilityDetails;
  function getValueTypeConflictResolutionRecipe(existing, otherDescriptor) {
    return `	- use valueType '${existing.valueType}' on instrument creation or use an instrument name other than '${otherDescriptor.name}'`;
  }
  cjsExports.getValueTypeConflictResolutionRecipe = getValueTypeConflictResolutionRecipe;
  function getUnitConflictResolutionRecipe(existing, otherDescriptor) {
    return `	- use unit '${existing.unit}' on instrument creation or use an instrument name other than '${otherDescriptor.name}'`;
  }
  cjsExports.getUnitConflictResolutionRecipe = getUnitConflictResolutionRecipe;
  function getTypeConflictResolutionRecipe(existing, otherDescriptor) {
    let selector = {
      name: otherDescriptor.name,
      type: otherDescriptor.type,
      unit: otherDescriptor.unit,
    };
    let selectorString = JSON.stringify(selector);
    return `	- create a new view with a name other than '${existing.name}' and InstrumentSelector '${selectorString}'`;
  }
  cjsExports.getTypeConflictResolutionRecipe = getTypeConflictResolutionRecipe;
  function getDescriptionResolutionRecipe(existing, otherDescriptor) {
    let selector = {
      name: otherDescriptor.name,
      type: otherDescriptor.type,
      unit: otherDescriptor.unit,
    };
    let selectorString = JSON.stringify(selector);
    return `	- create a new view with a name other than '${existing.name}' and InstrumentSelector '${selectorString}'
    	- OR - create a new view with the name ${existing.name} and description '${existing.description}' and InstrumentSelector ${selectorString}
    	- OR - create a new view with the name ${otherDescriptor.name} and description '${existing.description}' and InstrumentSelector ${selectorString}`;
  }
  cjsExports.getDescriptionResolutionRecipe = getDescriptionResolutionRecipe;
  function getConflictResolutionRecipe(existing, otherDescriptor) {
    if (existing.valueType !== otherDescriptor.valueType)
      return getValueTypeConflictResolutionRecipe(existing, otherDescriptor);
    if (existing.unit !== otherDescriptor.unit)
      return getUnitConflictResolutionRecipe(existing, otherDescriptor);
    if (existing.type !== otherDescriptor.type)
      return getTypeConflictResolutionRecipe(existing, otherDescriptor);
    if (existing.description !== otherDescriptor.description)
      return getDescriptionResolutionRecipe(existing, otherDescriptor);
    return "";
  }
  cjsExports.getConflictResolutionRecipe = getConflictResolutionRecipe;
});
export { require_RegistrationConflicts };
