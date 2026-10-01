package pluginsdk

import (
	"fmt"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func checkTaskManifest(p any, m *manifest.Manifest, declared map[string]bool) error {
	_, platform := p.(Platform)
	_, poller := p.(Poller)
	_, executor := p.(Executor)
	_, monitor := p.(TaskMonitor)
	if declared[manifest.CapPlatformExecute] && (!declared[manifest.CapPlatformAdapter] || !platform || !executor) {
		return fmt.Errorf("%s requires %s, Platform and Executor", manifest.CapPlatformExecute, manifest.CapPlatformAdapter)
	}
	if declared[manifest.CapPlatformMonitor] && (!declared[manifest.CapPlatformAdapter] || !platform || !monitor) {
		return fmt.Errorf("%s requires %s, Platform and TaskMonitor", manifest.CapPlatformMonitor, manifest.CapPlatformAdapter)
	}
	if declared[manifest.CapPlatformPoll] && (!declared[manifest.CapPlatformAdapter] || !platform || !poller) {
		return fmt.Errorf("%s requires %s, Platform and Poller", manifest.CapPlatformPoll, manifest.CapPlatformAdapter)
	}
	wanted := declared[manifest.CapPlatformTasks]
	for _, platform := range m.Platforms {
		for _, e := range platform.Endpoints {
			wanted = wanted || e.Task != nil
		}
	}
	if !wanted {
		return nil
	}
	_, parser := p.(TaskSubmissionParser)
	_, reconciler := p.(Reconciler)
	if !declared[manifest.CapPlatformTasks] || !declared[manifest.CapPlatformAdapter] || !platform || !parser || (!reconciler && !(poller && declared[manifest.CapPlatformPoll]) && !(monitor && declared[manifest.CapPlatformMonitor])) {
		return fmt.Errorf("managed tasks require %s, %s, Platform, TaskSubmissionParser and TaskMonitor (or legacy Poller/Reconciler)", manifest.CapPlatformTasks, manifest.CapPlatformAdapter)
	}
	return nil
}
