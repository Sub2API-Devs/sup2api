export default {
  title: 'Settings',
  description: 'System-wide billing, gateway and scheduling settings.',
  tabs: {
    billing: 'Billing',
    gateway: 'Gateway',
    sticky: 'Sticky sessions',
    offload: 'CPU protection'
  },
  offload: {
    title: 'CPU protection',
    subtitle: 'A node whose CPU is too busy hands new requests to idle nodes. Available on gateway-managed clusters only.',
    enabled: 'Enabled',
    enabledHint: 'When off, every node serves the requests of its own entrance.',
    threshold: 'CPU threshold',
    thresholdHint:
      'A node starts handing off when its CPU averaged over 10 seconds reaches this value, and stops below the threshold minus 10. Requests only go to healthy nodes of the same version below the threshold minus 10; without one they stay local. Requests in progress are not moved.',
    range: 'Range {min}–{max}.',
    unmanaged: 'This node is not managed by the gateway and has no CPU protection. Use the gateway for multi-node deployments.',
    node: 'Node',
    cpu: 'CPU',
    state: 'State',
    states: {
      serving: 'Serving locally',
      offloading: 'Handing off',
      forwarding: 'Forwarding to primary',
      unavailable: 'Not ready',
      disabled: 'Disabled'
    }
  },
  gateway: {
    title: 'Gateway',
    subtitle: 'Failover and timeouts of gateway requests. Changes apply to new requests on every node.',
    fields: {
      max_attempts: 'Max attempts',
      platform_call_timeout_ms: 'Platform call timeout',
      default_hook_timeout_ms: 'Default hook timeout',
      platform_hotpath_timeout_ms: 'Platform hot-path timeout'
    },
    hints: {
      max_attempts: 'Accounts tried per request, including the first attempt (failover).',
      platform_call_timeout_ms: 'Timeout of plugin platform calls on the request path (building the upstream request, parsing usage).',
      default_hook_timeout_ms: 'Used by hooks whose manifest sets no timeout.',
      platform_hotpath_timeout_ms:
        'Timeout of the per-request platform calls that are not hooks: resolving the model before scheduling, and reading usage after the response was sent.'
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
