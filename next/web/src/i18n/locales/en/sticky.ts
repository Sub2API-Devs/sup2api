export default {
  title: 'Sticky sessions',
  description: 'Route consecutive requests of a conversation to the same account to keep upstream caches warm.',
  newRule: 'New rule',
  any: 'any',
  seconds: 'seconds',
  ttlValue: '{n}s',
  ttlDefault: 'default',
  copyAsAdmin: 'Copy as admin rule',
  flush: 'Flush bindings',
  flushConfirm: 'Delete all current bindings of rule "{name}"? The next requests will be scheduled normally.',
  flushed: 'Bindings flushed',
  flushedN: '{n} binding(s) flushed',
  statsLine: '{hits} hits · {misses} misses · {rebinds} rebinds',
  source: {
    admin: 'Admin',
    plugin_default: 'Plugin default'
  },
  cols: {
    priority: 'Priority',
    match: 'Match',
    binding: 'Binding',
    stats: 'Hit rate',
    keySources: 'Key',
    ttl: 'TTL',
    keyIncludes: 'Key includes',
    onFailure: 'On failure'
  },
  keyTypes: {
    body: 'Body field',
    header: 'Header',
    api_key: 'API key',
    user: 'User',
    plugin: 'Plugin'
  },
  keyTypeHint: {
    api_key: 'the API key making the request',
    user: 'the user owning the API key'
  },
  includes: {
    group: 'group',
    model: 'model',
    rule: 'rule'
  },
  onFailure: {
    failover: 'Failover',
    stick: 'Stick'
  },
  onFailureHint: {
    failover: 'When the bound account fails, switch accounts as usual and rebind on success.',
    stick: 'Never switch; return the error instead (protects the upstream cache).'
  },
  settings: {
    title: 'Global settings',
    enabled: 'Sticky sessions',
    enabledHint: 'Master switch for all rules',
    defaultTtl: 'Default TTL',
    defaultTtlHint: 'Used by rules without their own TTL',
    ttlInvalid: 'Enter a positive number of seconds',
    keepOnDisabled: 'Keep bindings of disabled accounts',
    keepOnDisabledHint: 'By default bindings are deleted when their account is disabled'
  },
  modal: {
    createTitle: 'New sticky rule',
    editTitle: 'Edit rule · {name}',
    copyTitle: 'Copy as admin rule',
    limitedHint: 'Default rule of plugin {plugin}: only enabled, priority and TTL can be changed. Copy it as an admin rule to change the rest.',
    priorityHint: 'Higher is checked first',
    match: 'Match',
    protocols: 'Protocols',
    models: 'Models',
    modelsHint: 'Wildcards allowed; empty = any',
    ua: 'User-Agent contains',
    emptyAny: 'Empty = any',
    keySources: 'Session key sources',
    keySourcesHint: 'Tried in order; the first non-empty value is used.',
    needsPlaceholder: 'inputs the plugin needs (body, headers…)',
    valueRegex: 'Value regex',
    valueRegexHint: 'Optional; the first capture group (or whole match) of the value is used',
    ttlHint: '0 = use the default TTL',
    keyIncludesHint: 'Dimensions added to the session key',
    needSource: 'Add at least one key source',
    needPath: 'Enter the body field path',
    needHeader: 'Enter the header name',
    badRegex: 'Invalid regular expression',
    badTtl: 'Enter a whole number of seconds (0 or more)'
  }
}
