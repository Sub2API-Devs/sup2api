export default {
  title: 'Usage logs',
  description: 'Every gateway request with its billing trace.',
  myTitle: 'My usage',
  myDescription: 'Your requests and what they cost.',
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
  cols: {
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
    title: 'Tokens'
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
