package account

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Scheduled tasks of the account module (TASK-FRAMEWORK-DESIGN.md §14.1).
const (
	AutomaticRecoveryTask  = "core.account.automatic_recovery"
	LifecycleStatusTask    = "core.account.lifecycle_status"
	PreparationCleanupTask = "core.account.preparation_cleanup"
	QuotaMirrorTask        = "core.account.quota_mirror"
)

// RegisterTasks registers the cluster tasks of the account module and keeps
// tasks for the quota mirror, which registers its node task once warm (Run).
func (s *Service) RegisterTasks(tasks core.Tasks) error {
	s.tasks.Store(&tasks)
	specs := []core.TaskSpec{{
		Name:  AutomaticRecoveryTask,
		Title: core.LocalizedText{"en": "Release expired automatic disables", "zh": "自动禁用到点恢复"},
		Description: core.LocalizedText{
			"en": "Writes accounts whose timed automatic disable expired back to enabled, with their audit row and status event. Routing already serves them once the time passes; this is the bookkeeping. Runs once when a new node takes over.",
			"zh": "把定时自动禁用已到期的账号写回启用，并写审计和状态事件。到期后调度本来就会使用它们，这里只是补记录；新主节点接手时先跑一次。",
		},
		Scope:      core.TaskCluster,
		Every:      automaticStateSweepInterval,
		Timeout:    50 * time.Second,
		RunOnStart: true,
		Handler:    s.automaticRecoveryTask,
	}, {
		Name:  LifecycleStatusTask,
		Title: core.LocalizedText{"en": "Recheck account synchronization", "zh": "回写账号同步状态"},
		Description: core.LocalizedText{
			"en": "Reads again the runtime synchronization of accounts that stayed pending or failed, so quota queries do not skip them until the snapshot goes stale.",
			"zh": "重新读取一直处于等待或失败的账号运行环境同步状态，避免额度查询在快照过期前一直跳过它们。",
		},
		Scope:   core.TaskCluster,
		Every:   lifecycleStatusSweepEvery,
		Timeout: 50 * time.Second,
		Handler: s.lifecycleStatusTask,
	}, {
		Name:  PreparationCleanupTask,
		Title: core.LocalizedText{"en": "Clean up expired account preparations", "zh": "清理过期的账号准备"},
		Description: core.LocalizedText{
			"en": "Cancels account preparations (draft runtimes of new accounts) that expired, were abandoned for 15 minutes or are being cancelled.",
			"zh": "取消已过期、15 分钟无人操作或正在取消的账号准备（新账号的草稿运行环境）。",
		},
		Scope:   core.TaskCluster,
		Every:   time.Minute,
		Timeout: 50 * time.Second,
		Handler: s.preparationCleanupTask,
	}}
	for _, spec := range specs {
		if err := tasks.Register(spec); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) automaticRecoveryTask(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
	n, err := s.SweepAutomaticState(ctx)
	if err != nil {
		return core.TaskResult{}, err
	}
	if n > 0 {
		slog.InfoContext(ctx, "account: expired automatic disables written back", "accounts", n)
		return core.TaskResult{Count: n, Message: fmt.Sprintf("enabled %d accounts", n)}, nil
	}
	return core.TaskResult{}, nil
}

func (s *Service) lifecycleStatusTask(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
	n, err := s.sweepLifecycleStatus(ctx)
	return core.TaskResult{Count: n}, err
}

func (s *Service) preparationCleanupTask(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
	n, err := s.sweepPreparations(ctx)
	return core.TaskResult{Count: n}, err
}

// runQuotaMirror warms this node's quota mirror (retrying with backoff), then
// registers the node task that reloads it every quotaMirrorReload; a
// reloadSoon then triggers that task.
func (s *Service) runQuotaMirror(ctx context.Context) {
	m := s.quotas()
	if !m.warm(ctx) || s.tasks.Load() == nil {
		return
	}
	tasks := *s.tasks.Load()
	err := tasks.Register(core.TaskSpec{
		Name:  QuotaMirrorTask,
		Title: core.LocalizedText{"en": "Reload this node's quota mirror", "zh": "刷新本节点额度镜像"},
		Description: core.LocalizedText{
			"en": "Reloads the quota snapshots this node keeps for routing by model availability; it also runs when plugins change the account types that declare it.",
			"zh": "重新加载本节点用于按模型可用性路由的额度快照；插件改变声明该能力的账号类型时也会立即运行。",
		},
		Scope:   core.TaskNode,
		Every:   quotaMirrorReload,
		Timeout: 30 * time.Second,
		Handler: m.reloadTask,
	})
	if err != nil {
		slog.ErrorContext(ctx, "account: register quota mirror task", "err", err)
		return
	}
	m.setTrigger(func() {
		tctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := tasks.Trigger(tctx, QuotaMirrorTask); err != nil {
			slog.Warn("account: trigger quota mirror reload", "err", err)
		}
	})
}
