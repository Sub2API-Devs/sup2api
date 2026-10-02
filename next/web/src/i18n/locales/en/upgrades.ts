export default {
  title: 'Core updates', description: 'Stop followers, update the primary, then restore followers in sequence.',
  maintenanceWindow: 'The whole cluster will be temporarily unavailable while the primary updates. Service resumes when the primary is ready. Followers resume local service after updating and syncing plugins.',
  sequence: 'Forward all followers to the primary and stop their cores. Update the primary, then update followers asynchronously after the primary is ready.',
  recovery: 'Fix the cause and resume this update. Database or protocol changes cannot be undone by restoring an old binary; repair the migration or restore from backup.',
  manageNode: 'Node management', disableNode: 'Disable node', enableNode: 'Allow node to rejoin', disabled: 'Disabled', stopped: 'Core stopped',
  nodes: 'Cluster status', node: 'Node', version: 'Core version', mode: 'Traffic mode', ready: 'Readiness', lastSeen: 'Last report', reason: 'Reason', primary: 'Update primary',
  serving: 'Ready', waiting: 'Not ready', stale: 'Connection interrupted. Showing the last known state; refreshing will resume when connected.', unavailable: 'Cannot reach the update service. Check that this node runs under the shell with an update control socket configured.',
  newPlan: 'Create update', independentPlugins: 'After the core plan finishes, enabled bundled plugins upgrade automatically. Nodes switch independently; disabled plugins and newer manually installed versions are preserved.', target: 'Target version', choose: 'Choose a verified release',
  noReleases: 'No releases available. Import a signed release from a trusted source first.', activePlan: 'The cluster has an unfinished update. Resolve it before creating another.', preflight: 'Check compatibility', start: 'Start update', order: 'Node order', preflightOK: 'Current checks passed. Cluster state will be checked again when starting.',
  history: 'Update history', noPlans: 'No updates yet.', status: 'Status', step: 'Step', pause: 'Pause', resume: 'Resume', rollback: 'Restore previous release', cancel: 'Cancel unstarted update',
  states: { running: 'Running', paused: 'Paused', failed: 'Failed', completed: 'Completed', cancelled: 'Cancelled', superseded: 'Replaced by recovery', pending: 'Pending', done: 'Completed' },
  actions: { prepare: 'Download and verify', redirect: 'Forward to primary', stop: 'Drain and stop core', maintenance: 'Enter cluster maintenance', 'start-primary': 'Update primary and migrate database', start: 'Start target follower core', admit: 'Check plugins and admission', local: 'Resume local service' },
  modes: { local: 'Local service', 'local-serving': 'Local service', forward: 'Forward to peer', 'forward-only': 'Forward to peer', candidate: 'Candidate', maintenance: 'Maintenance', stopped: 'Stopped' }
}
