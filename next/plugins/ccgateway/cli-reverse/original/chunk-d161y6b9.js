
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Vr}from"./chunk-5ythzcas.js";import{i}from"./chunk-xjnnz630.js";import{EU}from"./chunk-my2r02mp.js";import{Nn}from"./chunk-5m8x0kb6.js";function t(){if(i.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)return!1;if(!Nn())return!0;return!1}function F2i(){return i.CLAUDE_CODE_ENVIRONMENT_KIND==="byoc"&&!i.CLAUDE_CODE_BYOC_ENABLE_DATADOG}function e(){return i.CLAUDE_CODE_CUSTOM_OAUTH_URL!==void 0}function HFn(){return!EU()&&!e()}function d_(){return EU()||t()||Vr()!==null||e()}function TNt(){return t()||Vr()!==null||e()}function Uue(){return i.CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL}function AX(){if(Uue())return!1;return EU()}
export{F2i,HFn,d_,TNt,Uue,AX};
