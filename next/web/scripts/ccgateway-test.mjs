import assert from 'node:assert/strict'
import { isTrustedAuthorizationURL, sessionExpired } from '../src/views/ccgateway/validation.ts'
for(const value of ['https://claude.ai/oauth/authorize','https://console.anthropic.com/oauth']) assert.equal(isTrustedAuthorizationURL(value),true)
for(const value of ['http://claude.ai/oauth','https://claude.ai.evil.test','https://user:secret@claude.ai','javascript:alert(1)','https://claude.ai:444/','']) assert.equal(isTrustedAuthorizationURL(value),false,value)
assert.equal(sessionExpired('invalid'),true)
assert.equal(sessionExpired('2020-01-01T00:00:00Z'),true)
assert.equal(sessionExpired('2100-01-01T00:00:00Z'),false)
console.log('CCGateway authorization URL and session validation passed')
import zh from '../src/i18n/locales/zh/ccgateway.ts'
import en from '../src/i18n/locales/en/ccgateway.ts'
function keys(value,prefix=''){return Object.entries(value).flatMap(([key,item])=>typeof item==='object'?keys(item,prefix+key+'.'):[prefix+key]).sort()}
assert.deepEqual(keys(zh),keys(en))
console.log('CCGateway zh/en locale keys match')
