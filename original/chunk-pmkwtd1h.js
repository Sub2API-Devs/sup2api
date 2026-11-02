
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{i}from"./chunk-jhrww53q.js";import{I}from"./chunk-znrryf4y.js";import{homedir as r}from"os";import{join as o}from"path";function rMo(){if(I()==="windows"&&i.APPDATA)return o(i.APPDATA,"gcloud");return o(r(),".config","gcloud")}function PVn(){return i.CLOUDSDK_CONFIG||rMo()}
export{rMo,PVn};
