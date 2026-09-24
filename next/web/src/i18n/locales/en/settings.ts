export default {
  title: 'Settings',
  description: 'System-wide billing, gateway and scheduling settings.',
  tabs: {
    billing: 'Billing',
    gateway: 'Gateway',
    sticky: 'Sticky sessions'
  },
  gateway: {
    title: 'Gateway',
    subtitle: 'Failover and timeouts of gateway requests. Changes apply to new requests on every node.',
    fields: {
      max_attempts: 'Max attempts',
      platform_call_timeout_ms: 'Platform call timeout',
      default_hook_timeout_ms: 'Default hook timeout'
    },
    hints: {
      max_attempts: 'Accounts tried per request, including the first attempt (failover).',
      platform_call_timeout_ms: 'Timeout of plugin platform calls on the request path (building the upstream request, parsing usage).',
      default_hook_timeout_ms: 'Used by hooks whose manifest sets no timeout.'
    },
    range: 'Range {min}–{max}.',
    notInteger: 'Enter a whole number'
  },
  billing: {
    title: 'Billing',
    missingPolicy: 'When a model has no price',
    policy: {
      reject: 'Reject the request',
      free: 'Allow for free'
    },
    policyHint: {
      reject: 'Return 403 model_price_not_configured. Recommended: nothing is served without a price.',
      free: 'Serve the request and record it with billing status "free".'
    },
    minBalance: 'Minimum balance',
    minBalanceHint: 'Requests are rejected with 402 when the balance is at or below this value (default 0).',
    bigCost: 'High-cost warning threshold',
    bigCostHint: 'Saving a price that costs more than this for 1M input tokens requires confirmation.',
    decimalInvalid: 'Enter a number with at most 8 decimals'
  }
}
