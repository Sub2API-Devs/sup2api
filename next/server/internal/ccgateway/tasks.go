package ccgateway

import "github.com/Sub2API-Devs/sup2api/next/server/internal/core"

// RegisterTasks registers the scheduled tasks of CCGateway.
func (s *Service) RegisterTasks(tasks core.Tasks) error {
	s.tasks.Store(&tasks)
	for _, spec := range []core.TaskSpec{runtimeSyncSpec(s), draftSweepSpec(s), parkRuntimesSpec(s)} {
		if err := tasks.Register(spec); err != nil {
			return err
		}
	}
	return nil
}
