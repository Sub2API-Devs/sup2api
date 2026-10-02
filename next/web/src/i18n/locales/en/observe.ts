export default {
  topology: 'Node topology', shell: 'Shell', core: 'Core', plugins: 'Plugins',
  forwarding: 'Forward to primary', offload: 'CPU offload candidates', legend: 'Solid: forward to primary. Dashed: eligible receivers inferred from current heartbeats and CPU threshold, not actual request paths.',
  partial: 'Shell information unavailable; showing cores and plugins.', unavailable: 'Data temporarily unavailable; showing the last snapshot.', empty: 'No nodes',
  fallback: 'Still serving the previous version', standby: 'Standby', instances: 'Instances', restarts: 'Restarts',
  noReport: 'No plugin report from the current core yet', unknown: 'Unknown', running: 'Running', stopped: 'Stopped',
  progress: 'Overall progress', lanes: 'Node steps', reconnect: 'Connection interrupted during upgrade. Reconnecting automatically; showing the last progress.',
  related: 'Plugin releases since this plan was created', relatedHint: 'Listed by time; may include manual releases. Plugins progress independently.',
  history: 'Release history', timeline: 'Node and release events', cluster: 'Cluster', noHistory: 'No history yet',
  previous: 'Previous', next: 'Next', allEvents: 'All events', latest: 'Latest release', page: 'Page {page}, {total} records',
  audit: 'Audit logs', auditHint: 'Administrator actions and automatic system changes.', time: 'Time', action: 'Action', actor: 'Actor', target: 'Target', detail: 'Details', system: 'System', filter: 'Action (exact match)', search: 'Search',
  offloading: 'Offloading', notOffloading: 'Not offloading', offloadState: 'CPU offload', local: 'Local', seconds: '{n} seconds', unknownDuration: 'Timing unavailable', boot: 'Boot ID',
}
