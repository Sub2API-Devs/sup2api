package engine

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type cliInstallLease struct {
	token   string
	target  string
	before  string
	done    chan struct{}
	mu      sync.Mutex
	closed  bool
	expires time.Time
}

func (r *Runtime) beginCLIInstall(ctx context.Context) (result Object, err error) {
	m := r.cliManagement
	m.mu.Lock()
	if m.updating {
		m.mu.Unlock()
		return nil, fmt.Errorf("CLI maintenance is busy")
	}
	m.updating, m.result, m.failure = true, "running", ""
	m.mu.Unlock()
	err = r.lockCLIInstall(ctx)
	if err != nil {
		m.mu.Lock()
		m.updating, m.result, m.failure = false, "failed", err.Error()
		m.mu.Unlock()
		return nil, err
	}
	keep := false
	defer func() {
		if !keep {
			r.unlockCLIInstall()
			m.mu.Lock()
			m.updating = false
			if err != nil {
				m.result, m.failure = "failed", err.Error()
			}
			m.mu.Unlock()
		}
	}()
	if err := r.checkCLIRelease(ctx); err != nil {
		return nil, err
	}
	before, err := r.catalog.check(ctx)
	if err != nil {
		return nil, err
	}
	m.mu.Lock()
	target := m.latest
	m.mu.Unlock()
	if !newerCLIVersion(target, before) {
		if err := r.catalog.refresh(ctx); err != nil {
			return nil, err
		}
		m.mu.Lock()
		m.result = "complete"
		m.mu.Unlock()
		return Object{"needed": false}, nil
	}
	lease := &cliInstallLease{token: uuid() + uuid(), before: before, target: target, done: make(chan struct{}), expires: time.Now().Add(5 * time.Minute)}
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		return nil, fmt.Errorf("worker is closing")
	}
	r.active.Add(1)
	r.mu.Unlock()
	m.mu.Lock()
	m.install = lease
	m.mu.Unlock()
	keep = true
	go func() {
		defer r.active.Done()
		timer := time.NewTimer(5 * time.Minute)
		defer timer.Stop()
		for {
			select {
			case <-lease.done:
				return
			case <-r.life.Done():
				_ = r.finishCLIInstall(lease.token, false)
				return
			case <-timer.C:
				m.mu.Lock()
				remaining := time.Until(lease.expires)
				m.mu.Unlock()
				if remaining > 0 {
					timer.Reset(remaining)
					continue
				}
				_ = r.finishCLIInstall(lease.token, false)
				return
			}
		}
	}()
	return Object{"needed": true, "lease": lease.token, "target_version": target, "previous_version": before, "cli_path": r.gateway.Runner.CLI}, nil
}

func (r *Runtime) lockCLIInstall(ctx context.Context) error {
	if !r.cliGate.TryLock() {
		return fmt.Errorf("CLI is busy; retry after active requests finish")
	}
	if !r.admin.mu.TryLock() {
		r.cliGate.Unlock()
		return fmt.Errorf("CLI authorization is busy")
	}
	if r.admin.pending() != nil {
		r.admin.mu.Unlock()
		r.cliGate.Unlock()
		return fmt.Errorf("CLI authorization is in progress")
	}
	select {
	case r.catalog.lock <- struct{}{}:
		return nil
	case <-ctx.Done():
		r.admin.mu.Unlock()
		r.cliGate.Unlock()
		return ctx.Err()
	}
}

func (r *Runtime) unlockCLIInstall() {
	<-r.catalog.lock
	r.admin.mu.Unlock()
	r.cliGate.Unlock()
}

func (r *Runtime) finishCLIInstall(token string, installed bool) error {
	m := r.cliManagement
	m.mu.Lock()
	lease := m.install
	m.mu.Unlock()
	if lease == nil || lease.token != token {
		return fmt.Errorf("CLI installation lease is not active")
	}
	lease.mu.Lock()
	defer lease.mu.Unlock()
	if lease.closed {
		return fmt.Errorf("CLI installation lease has completed")
	}
	ctx, cancel := context.WithTimeout(r.life, 2*time.Minute)
	defer cancel()
	result := r.catalog.refresh(ctx)
	if result == nil && (!installed || lease.target != r.CLIVersion()) {
		result = fmt.Errorf("CLI update was interrupted, rolled back, or did not reach the target; see the rechecked installed and catalog versions")
	}
	m.mu.Lock()
	m.result = "complete"
	if result != nil {
		m.result, m.failure = "failed", result.Error()
	}
	if installed && result != nil {
		m.result = "rollback_pending"
		m.mu.Unlock()
		return result
	}
	m.install, m.updating = nil, false
	m.mu.Unlock()
	lease.closed = true
	r.unlockCLIInstall()
	close(lease.done)
	return result
}
