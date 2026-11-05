
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{i}from"./chunk-xjnnz630.js";import{P}from"./chunk-bb1a67wr.js";import{homedir as r}from"os";import{join as o}from"path";function O2o(){if(P()==="windows"&&i.APPDATA)return o(i.APPDATA,"gcloud");return o(r(),".config","gcloud")}function Q7n(){return i.CLOUDSDK_CONFIG||O2o()}
export{O2o,Q7n};
