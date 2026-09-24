export default {
  title: 'Settings',
  description: 'System-wide billing and scheduling settings.',
  tabs: {
    billing: 'Billing',
    sticky: 'Sticky sessions'
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
