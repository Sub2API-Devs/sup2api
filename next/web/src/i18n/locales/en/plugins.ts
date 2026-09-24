export default {
  colon: ': ',
  listSep: ', ',
  key: 'Key',
  publisher: 'Publisher',
  activeVersion: 'Active version',
  desiredVersion: 'Desired version',
  manifestVersion: 'Manifest version',

  builtin: 'Built-in',
  builtinHint: 'Built-in plugins ship with the system: they can be disabled but not uninstalled',

  trust: {
    official: 'Official',
    verified: 'Verified',
    community: 'Community',
    unsigned: 'Unsigned'
  },

  status: {
    awaiting_consent: 'Awaiting consent',
    installed: 'Installed',
    enabling: 'Enabling',
    enabled: 'Enabled',
    upgrading: 'Upgrading',
    disabled: 'Disabled',
    uninstalled: 'Uninstalled',
    preparing: 'Preparing',
    activating: 'Activating',
    active: 'Active',
    failed: 'Failed',
    cancelled: 'Cancelled',
    rolled_back: 'Rolled back',
    pending: 'Pending',
    ready: 'Ready',
    running: 'Running',
    starting: 'Starting',
    stopped: 'Stopped',
    crashed: 'Crashed',
    unavailable: 'Unavailable',
    ok: 'OK',
    success: 'Success',
    succeeded: 'Succeeded',
    error: 'Error',
    timeout: 'Timeout',
    approved: 'Approved',
    rejected: 'Rejected',
    granted: 'Granted',
    revoked: 'Revoked',
    unknown: 'Unknown'
  },

  risk: {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
  },

  signature: {
    valid: 'valid',
    invalid: 'INVALID',
    unsigned: 'unsigned',
    revoked: 'revoked',
    expired: 'expired',
    untrusted: 'untrusted key',
    unknown: 'unknown'
  },

  hp: {
    kv: 'KV storage',
    config: 'Configuration',
    log: 'Logging',
    routes_admin: 'Admin API routes',
    routes_user: 'User API routes',
    events: 'Event subscription',
    jobs: 'Background jobs',
    ui_menu: 'Console menus',
    ui_iframe: 'Sandboxed iframe pages',
    accounts_read: 'Read accounts',
    db_schema: 'Dedicated database schema',
    net: 'External network access',
    routes_public: 'Public API routes',
    routes_webhook: 'Webhook routes',
    gateway_hook: 'Gateway hooks',
    gateway_endpoint: 'Gateway endpoints',
    platform_register: 'Register a platform',
    scheduler_affinity: 'Scheduler affinity',
    users_read: 'Read users',
    accounts_credentials: 'Account credentials',
    ledger_credit: 'Credit user balances',
    ledger_debit: 'Debit user balances',
    ui_native: 'Native console UI',
    users_write: 'Modify users',
    db_core_views: 'Core database views'
  },

  hpWarn: {
    ui_native: 'The plugin code will run inside the console with your login identity.',
    accounts_credentials: 'The plugin can read upstream account secrets (API keys, tokens).',
    ledger_credit: 'The plugin can add balance to users.',
    ledger_debit: 'The plugin can deduct user balance.',
    users_write: 'The plugin can create and modify users.',
    db_core_views: 'The plugin can read core data through database views.'
  },

  fields: {
    model: 'model',
    prompt_text: 'prompt text',
    messages: 'messages',
    headers: 'request headers',
    body: 'request body',
    user_id: 'user ID',
    group_id: 'group ID',
    api_key_id: 'API key ID',
    metadata: 'metadata'
  },

  list: {
    title: 'Plugins',
    description: 'Installed plugins, their versions and runtime state across nodes.',
    plugin: 'Plugin',
    nodes: 'Nodes',
    upload: 'Upload plugin',
    badFile: 'Please choose a .s2plugin package.',
    uploaded: '{name} v{version} uploaded, please review the requested permissions.',
    searchPlaceholder: 'Search name, key or publisher',
    allStatuses: 'All statuses',
    empty: 'No plugins installed yet',
    review: 'Review & approve'
  },

  market: {
    title: 'Plugin market',
    description: 'Browse plugin indexes, install new plugins and check for updates.',
    source: 'Source',
    searchPlaceholder: 'Search plugins',
    noSources: 'No market source configured',
    noMatch: 'No plugin matches your search',
    empty: 'This source has no plugins',
    installedVersion: 'installed v{version}',
    installed: 'Installed',
    versions: 'Versions',
    upgrade: 'Upgrade',
    install: 'Install',
    pickTitle: 'Install {name}',
    pickHint: 'Choose a version. The package is downloaded, its sha256 and signature are verified, then you review the requested permissions.',
    latest: 'latest',
    continue: 'Download & review',
    downloaded: '{name} v{version} downloaded, please review the requested permissions.'
  },

  consent: {
    titleInstall: 'Install plugin',
    titleUpgrade: 'Upgrade plugin',
    notFound: 'Review information for this version is not available. Upload the package again or install it from the market.',
    fromCache: 'Showing the review returned at upload time.',
    signature: 'Signature',
    hostCompat: 'Host compat',
    incompatibleTitle: 'This plugin is not compatible with this host',
    incompatibleBody: 'It requires host version {range}. Installation is disabled.',
    signatureWarnTitle: 'Signature: {status}',
    signatureWarnBody: 'The package could not be verified against a trusted publisher key. Only continue if you trust where this package came from.',
    diffTitle: 'Permission changes in this version',
    diffAdded: 'New',
    diffWidened: 'Widened',
    diffRemoved: 'Removed',
    diffNone: 'No permission changes.',
    provides: 'What the plugin provides',
    gatewayEndpoints: 'Gateway endpoints',
    platform: 'Platform',
    protocols: 'Protocols',
    accountTypes: 'Account types',
    hooks: 'Gateway hooks',
    models: 'models',
    groups: 'groups',
    reads: 'Reads',
    maxPrompt: 'Prompt limit',
    timeout: 'Timeout',
    onFailure: 'On failure',
    failOpen: 'let the request through',
    failClosed: 'reject the request',
    events: 'Subscribed events',
    jobs: 'Background jobs',
    routes: 'API routes',
    menus: 'Menus',
    userPermissions: 'User permissions',
    grantToRoles: 'Grant the new permissions to roles:',
    database: 'Database',
    migrations: '{n} migration(s)',
    showMigrations: 'Show migrations',
    resources: 'Resources',
    externalServices: 'External services',
    hostPermissions: 'Host permissions requested',
    hostPermissionsHint: 'Low risk is granted automatically; high and critical risk must be ticked one by one.',
    noHostPermissions: 'This plugin requests no host permissions.',
    criticalWarn: 'Critical permission: grant only to plugins you fully trust.',
    needPermission: 'Requires {perm}, which you do not have.',
    auto: 'Automatic',
    missingRequired: 'These permissions are required by the plugin: {list}. Tick them or reject the installation.',
    blockedByPermission: 'You cannot grant required permissions: {list}. Ask an administrator with the needed permission.',
    stillRequired: '{n} required permission(s) still need to be ticked.',
    stepUpHint: 'You may be asked to confirm your password.',
    approve: 'Approve & install',
    approveUpgrade: 'Approve upgrade',
    approved: 'Permissions for {name} v{version} approved.',
    reject: 'Reject',
    rejectTitle: 'Reject this version',
    rejectConfirm: 'Reject {name} v{version}? The uploaded package will be discarded.',
    rejected: 'Version rejected'
  },

  resources: {
    memory: 'Memory',
    memoryMB: 'Memory (MB)',
    cpu: 'CPU',
    cores: '{n} cores',
    threads: 'Max threads',
    files: 'Max open files',
    item: 'Resource',
    requested: 'Requested by manifest',
    effective: 'Effective limit',
    overridden: 'overridden',
    invalid: 'Enter a non-negative number',
    saved: 'Resource limits saved; they apply the next time the plugin process starts.',
    hint: 'Leave empty to use the manifest request. Limits cannot exceed the global maximum.'
  },

  detail: {
    tabs: {
      overview: 'Overview',
      grants: 'Grants',
      nodes: 'Nodes',
      hooks: 'Hooks',
      jobs: 'Jobs',
      events: 'Events',
      egress: 'External access',
      resources: 'Resources',
      settings: 'Settings'
    },
    overview: 'Summary',
    runtime: 'Runtime',
    capabilities: 'Capabilities',
    pages: 'Pages',
    slots: 'Slots',
    rawManifest: 'Show manifest JSON',
    nodeCount: '{n} node(s)',
    notFound: 'Plugin "{key}" was not found',
    viewRollout: 'Rollout progress',
    upgrade: 'Upgrade',
    upgradeTitle: 'Upgrade {name}',
    upgradeHint: 'Currently running v{version}. Choose an approved version to roll out.',
    disableTitle: 'Disable {name}',
    disableConfirm: 'The plugin process stops on all nodes; hooks, jobs and event delivery pause. Grants, data and accounts are kept.',
    consentedBanner: 'Permissions for v{version} were approved.',
    enableNow: 'Enable now',
    upgradeNow: 'Upgrade to v{version} now',
    pendingConsent: 'Version v{version} is waiting for permission consent.'
  },

  grants: {
    permission: 'Permission',
    risk: 'Risk',
    scope: 'Scope',
    grantedBy: 'Granted by',
    grantedAt: 'Granted at',
    revoke: 'Revoke',
    revokeTitle: 'Revoke permission',
    revokeConfirm: 'Revoke "{perm}"? Plugin calls that need it will be denied.',
    revoked: 'Permission revoked'
  },

  nodes: {
    node: 'Node',
    restarts: 'Restarts',
    heartbeat: 'Heartbeat'
  },

  hooks: {
    point: 'Point',
    order: 'Order',
    stats: 'Statistics',
    calls: 'calls',
    denied: 'denied',
    timeouts: 'timeouts',
    breaker: 'breaker',
    breakerOpen: 'open',
    breakerClosed: 'closed',
    noStats: 'No stats yet'
  },

  jobs: {
    job: 'Job',
    schedule: 'Schedule',
    lastRun: 'Last run',
    duration: 'Duration',
    message: 'Message',
    next: 'next',
    never: 'Never run',
    runNow: 'Run now',
    triggered: 'Job "{id}" triggered'
  },

  events: {
    cursor: 'Cursor',
    backlog: 'Backlog',
    deadletters: 'Dead letters',
    subscribed: 'Subscribed events',
    noSubscriptions: 'This plugin does not subscribe to events.',
    event: 'Event',
    attempts: 'Attempts',
    error: 'Error'
  },

  egress: {
    policy: 'Egress policy',
    policies: {
      allow_all: 'Allow all (record only)',
      allowlist: 'Allowlist (approved domains only)'
    },
    policyHint: {
      allow_all: 'All outbound connections are allowed and recorded.',
      allowlist: 'Only domains approved through the "net" permission are reachable; other connections are denied.'
    },
    approvedDomains: 'Approved domains:',
    byDomain: 'By destination',
    details: 'Connections',
    destination: 'Destination',
    connections: 'Connections',
    traffic: 'Traffic',
    results: 'Results',
    result: 'Result',
    lastSeen: 'Last seen',
    last1h: 'Last hour',
    last24h: 'Last 24 hours',
    notAllowlisted: 'not allowlisted',
    noReadPermission: 'You need plugin:egress:read to view external access records.'
  },

  uninstall: {
    action: 'Uninstall',
    title: 'Uninstall {name}',
    body: 'Uninstalling removes the plugin package, its permissions and grants, event cursors, job records and default prices.',
    purge: 'Also delete plugin data (schema {schema}) and its accounts',
    purgeHint: 'Without this option the data is kept and restored if the plugin is installed again.',
    purgeWarn: 'Plugin data and accounts will be permanently deleted.',
    typeKey: 'Type the plugin key "{key}" to confirm',
    confirm: 'Uninstall',
    done: '{name} uninstalled'
  },

  rollout: {
    phase: 'Phase',
    actions: {
      enable: 'Enable',
      upgrade: 'Upgrade',
      disable: 'Disable'
    },
    steps: {
      migrate: 'Database migrations',
      prepare: 'Nodes prepare',
      activate: 'Activate'
    },
    stepState: {
      waiting: 'Waiting',
      running: 'In progress…',
      done: 'Done',
      failed: 'Failed',
      skipped: 'Not needed',
      cancelled: 'Cancelled'
    },
    waitingAllReady: 'Waiting for all nodes to be ready',
    noNodes: 'No node has reported yet',
    coordinator: 'coordinator',
    liveVersion: 'Live version',
    cancel: 'Cancel rollout',
    cancelTitle: 'Cancel rollout',
    cancelConfirm: 'All nodes keep running the current version.',
    cancelRequested: 'Cancellation requested',
    none: 'No rollout in progress',
    backToDetail: 'Back to plugin',
    success: {
      enable: 'Enabled v{version} on all nodes.',
      upgrade: 'Upgraded to v{version} on all nodes.',
      disable: 'Plugin disabled on all nodes.'
    },
    ended: {
      failed: 'Rollout failed. Nodes keep running v{version}.',
      cancelled: 'Rollout cancelled. Nodes keep running v{version}.',
      rolled_back: 'Rollout rolled back to v{version}.'
    }
  }
}
