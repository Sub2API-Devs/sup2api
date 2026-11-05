
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{basename as t,join as r}from"path";var l6r="bundles",gii=r("claude.app","Contents","MacOS","claude"),e=String.raw`(\d[A-Za-z0-9._+-]*)@[0-9a-f]{12}\.[0-9a-f]{8}`,yii=new RegExp(`^${e}$`),o=new RegExp(String.raw`[\\/]versions[\\/]bundles[\\/]${e}[\\/]claude\.app[\\/]Contents[\\/]MacOS[\\/]claude$`);function mEe(n){return o.exec(n)?.[1]}function hwn(n){return mEe(n)??t(n)}
export{l6r,gii,yii,mEe,hwn};
