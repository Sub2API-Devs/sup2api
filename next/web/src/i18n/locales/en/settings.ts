export default {
  description: 'System-wide billing, gateway and scheduling settings.',
  tabs: {
    notifications: 'Notifications',
    environment: 'Environment variables',
    billing: 'Billing',
    gateway: 'Gateway',
    sticky: 'Sticky sessions',
    offload: 'CPU protection'
  },
  offload: {
    nodesTitle: 'Node load',
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
  notifications: {
    channelsTitle: 'Notification channels',
    channelsHint: 'Declared and delivered by plugins (the mailer plugin provides "Email", for example). Other plugins and the core send by channel and never need to know the provider.',
    noChannels: 'No plugin provides a notification channel yet. Enable a notification plugin such as the mailer to see its channels here.',
    channel: 'Channel',
    provider: 'Provider',
    recipientFormat: 'Recipient format',
    recipient: { email: 'Email address', text: 'Text (interpreted by the plugin)' },
    testTitle: 'Send a test notification',
    testHint: 'The core sends a test notification to check a channel. See the delivery record below for the outcome.',
    recipients: 'Recipients',
    recipientsHint: 'Separate recipients with commas or spaces, at most 20.',
    sendTest: 'Send test',
    testQueued: 'Test notification queued',
    recordsTitle: 'Delivery record',
    recordsHint: 'Failed deliveries are retried with backoff, up to 8 times; records are kept for 30 days.',
    allStatuses: 'All statuses',
    source: 'Source',
    subject: 'Subject',
    attempts: 'try {n}',
    status: { pending: 'Pending', sending: 'Sending', sent: 'Sent', failed: 'Failed' },
    severity: { info: 'Info', warning: 'Warning', critical: 'Critical' }
  },
  environment: {
    title: 'Environment variables',
    subtitle: 'General runtime parameters of forwarding, declared by the core; plugins read the resolved values. Accounts and groups override these; empty follows the next layer (account → group → global → process environment variable). Changes apply to new requests on every node.',
    groupHint: 'Overrides the global environment variables; empty follows the global value.',
    accountHint: 'Overrides the group and global environment variables; empty follows the group.',
    range: 'Range {min}–{max}.',
    processSet: 'Process environment variable {name} = {value}.',
    processUnset: 'The process environment variable {name} is the fallback.',
    follow: 'Follow',
    followValue: 'Follow ({value})',
    units: { seconds: 's', minutes: 'min', mb: 'MB', count: 'times' }
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
    preConsumeTokens: 'Request reservation tokens',
    preConsumeHint: 'Minimum input tokens reserved for text requests, default 500. Larger local estimates take precedence. Zero disables the minimum. Final billing uses actual usage; video uses plugin estimates.',
    preConsumeInvalid: 'Enter an integer from 0 to 100000000',
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
