export default {
  title: 'Usage logs',
  description: 'Every gateway request with its billing trace.',
  myTitle: 'Usage records',
  myDescription: 'Each of your requests and your balance changes.',
  statsTitle: 'Usage statistics',
  statsDescription: 'Your requests, tokens and cost over a period.',
  stats: {
    input: 'Input tokens',
    output: 'Output tokens',
    byModel: 'By model'
  },
  tabs: {
    requests: 'Requests',
    ledger: 'Balance changes'
  },
  range: {
    custom: 'Custom'
  },
  filters: {
    userId: 'User ID',
    accountId: 'Account ID',
    clientRequestId: 'Client request ID',
    clientRequestIdPlaceholder: 'Exact X-Request-Id'
  },
  success: {
    ok: 'Succeeded',
    failed: 'Failed'
  },
  summary: {
    requests: 'Requests',
    successRate: 'Success rate',
    tokens: 'Tokens',
    tokensSub: 'in {input} · out {output}',
    cost: 'Cost',
    daily: 'Daily',
    partial: 'Based on the latest {n} requests'
  },
  showDetails: 'View details',
  hideDetails: 'Hide details',
  errors: {
    model_not_allowed: 'Model unavailable',
    no_available_account: 'No available account',
    rate_limit_exceeded: 'Rate limit exceeded'
  },
  cols: {
    route: 'Group / account',
    input: 'Input',
    output: 'Output',
    cost: 'Cost',
    accountType: 'Account type',
    upstreamProtocol: 'Upstream protocol',
    clientRequestId: 'Client request ID'
  },
  filterByClientRequestId: '{id} (click to filter by this ID)',
  cacheTitle: 'cache read {r} · cache write {w}',
  cached: 'cached',
  cacheEvidence: {
    title: 'Observed upstream cache writes',
    total: 'Reported total writes',
    five: 'Reported 5-minute writes',
    hour: 'Reported 1-hour writes',
    unclassified: 'TTL not classified',
    pricing: 'Billing buckets are separate from observed TTL facts. Unclassified writes use the platform default cache-write rate; this does not establish a 5-minute TTL. Recorded charges are unchanged.',
    missing: 'This record has no usable TTL provenance. The values above are the original billing buckets, not proof of actual 5-minute usage. Recorded charges are unchanged.',
    counter: { absent: 'Not reported', null: 'Reported null', invalid: 'Invalid reported value' },
    component: { additional: 'Separate cache observations for additional usage #{index}', replacement: 'Separate cache observations for replacement usage #{index}' },
    status: {
      complete: 'The reported TTL breakdown is complete.',
      partial: 'The TTL breakdown is incomplete; reported buckets may precede the latest total.',
      unknown: 'TTL allocation is unknown. Missing buckets were not inferred.',
      inconsistent: 'Reported cache counters are inconsistent; TTL allocation cannot be determined.'
    }
  },
  converted: 'converted',
  convertedFrom: 'Converted from endpoint protocol {protocol}',
  free: 'Free',
  stream: 'stream',
  blocked: 'blocked',
  blockedBy: 'blocked by {plugin}',
  billing: {
    title: 'Billing',
    price: 'Price rule',
    tier: 'Tier',
    rules: 'Markup rules',
    matched: 'matched',
    notMatched: 'not matched',
    breakdown: 'Breakdown',
    inputs: 'Billing condition values',
    statusLabel: 'Billing status',
    ledger: 'ledger #{id}',
    freeNote: 'Requests rejected by hooks or failing upstream without usage are not billed.',
    status: {
      billed: 'Billed',
      pending: 'Pending',
      failed: 'Billing failed',
      free: 'Free'
    }
  },
  request: {
    title: 'Request',
    id: 'Request ID',
    clientId: 'Client request ID',
    clientIdNone: 'The client sent no X-Request-Id',
    endpoint: 'Endpoint',
    upstreamModel: 'Upstream model',
    apiKey: 'API key',
    statusCode: 'HTTP status',
    latency: 'Latency',
    firstToken: 'first token',
    error: 'Error'
  },
  tokens: {
    title: 'Tokens',
    cacheDefaultBucket: 'Cache writes (default billing bucket)',
    cache1hBucket: 'Cache writes (1h billing bucket)',
    knownRound: 'Known usage for round {round}',
    incompleteRounds: 'These are recorded per-round counts only. Overall usage is unconfirmed and these counts are not the request total. Missing usage is not estimated; billing status is unchanged.'
  },
  hooks: {
    title: 'Hook decisions'
  },
  sticky: {
    title: 'Sticky session',
    rule: 'Rule',
    hit: 'Binding',
    hitYes: 'hit',
    hitNo: 'miss'
  }
}
