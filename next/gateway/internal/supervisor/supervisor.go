// Package supervisor manages one core process. It never force kills a core when
// drain exceeds its deadline, and never adopts an unverified orphan process.
package supervisor

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

type Spec struct {
	Executable     string
	Args, Env      []string
	Dir            string
	BootID         string
	Stdout, Stderr io.Writer
}
type State struct {
	PID        int    `json:"pid"`
	StartID    string `json:"start_id"`
	BootID     string `json:"boot_id"`
	Executable string `json:"executable"`
	Running    bool   `json:"running"`
	Starting   bool   `json:"starting"`
	ExitError  string `json:"exit_error,omitempty"`
}
type Control interface {
	Drain(context.Context, rc.DrainRequest) error
	Status(context.Context) (rc.Status, error)
	Shutdown(context.Context) error
}
type Manager struct {
	mu    sync.Mutex
	root  string
	lock  *os.File
	cmd   *exec.Cmd
	done  chan struct{}
	state State
}

// New holds an OS process lock until Close. A surviving old process blocks
// startup, requiring explicit operator reconciliation instead of double start.
func New(root string) (*Manager, error) {
	if err := configureSupervisor(); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(root, 0700); err != nil {
		return nil, err
	}
	f, err := lockProcess(filepath.Join(root, "supervisor.lock"))
	if err != nil {
		return nil, err
	}
	m := &Manager{root: root, lock: f}
	b, err := os.ReadFile(filepath.Join(root, "process.json"))
	if err == nil {
		if err = json.Unmarshal(b, &m.state); err != nil {
			unlockProcess(f)
			return nil, err
		}
		if m.state.Starting {
			unlockProcess(f)
			return nil, errors.New("core launch was interrupted before PID registration; reconcile processes before restarting")
		}
		if m.state.Running && sameProcess(m.state.PID, m.state.StartID) {
			unlockProcess(f)
			return nil, fmt.Errorf("previous core PID %d is still alive; reconcile before restart", m.state.PID)
		}
		if m.state.PID > 0 && !groupGone(m.state.PID) {
			unlockProcess(f)
			return nil, fmt.Errorf("previous core process group %d still has live members; reconcile before restart", m.state.PID)
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		unlockProcess(f)
		return nil, err
	}
	m.state.Running = false
	return m, nil
}
func (m *Manager) Start(ctx context.Context, s Spec) (State, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := ctx.Err(); err != nil {
		return State{}, err
	}
	if m.lock == nil {
		return State{}, errors.New("supervisor closed")
	}
	if m.state.Running {
		return State{}, errors.New("core already running")
	}
	if m.cmd != nil && !groupGone(m.cmd.Process.Pid) {
		return State{}, errors.New("old core process group still alive")
	}
	if !filepath.IsAbs(s.Executable) {
		return State{}, errors.New("core executable must be absolute")
	}
	cmd := exec.Command(s.Executable, s.Args...)
	cmd.Dir = s.Dir
	cmd.Env = coreEnvironment(os.Environ(), s.Env)
	cmd.Stdout = s.Stdout
	cmd.Stderr = s.Stderr
	configureProcess(cmd)
	id := make([]byte, 24)
	if _, err := rand.Read(id); err != nil {
		return State{}, err
	}
	bootID := s.BootID
	if bootID == "" {
		bootID = hex.EncodeToString(id)
	}
	m.state = State{Starting: true, BootID: bootID, Executable: s.Executable}
	if err := m.persist(); err != nil {
		return State{}, err
	}
	if err := cmd.Start(); err != nil {
		m.state.Starting = false
		_ = m.persist()
		return State{}, err
	}
	startID, err := processStartID(cmd.Process.Pid)
	m.cmd = cmd
	m.done = make(chan struct{})
	m.state = State{PID: cmd.Process.Pid, StartID: startID, BootID: bootID, Executable: s.Executable, Running: true}
	if err == nil {
		err = m.persist()
	}
	// Always reap asynchronously, including a failed state write. A core may
	// take its entire drain budget to exit after SIGTERM; Start must not block
	// forever while holding the supervisor mutex on that error path.
	go func() {
		err := cmd.Wait()
		m.mu.Lock()
		m.state.Running = false
		if err != nil {
			m.state.ExitError = err.Error()
		}
		_ = m.persist()
		close(m.done)
		m.mu.Unlock()
	}()
	if err != nil {
		_ = terminateGroup(cmd.Process.Pid)
		return m.state, err
	}
	return m.state, nil
}

// Shell node credentials must never enter a core or its plugin descendants.
func coreEnvironment(inherited, explicit []string) []string {
	out := make([]string, 0, len(inherited)+len(explicit))
	for _, entries := range [][]string{inherited, explicit} {
		for _, entry := range entries {
			key, _, _ := strings.Cut(entry, "=")
			if !strings.EqualFold(key, "SUB2API_PEER_AUTH_KEY") {
				out = append(out, entry)
			}
		}
	}
	return out
}
func (m *Manager) Status() State { m.mu.Lock(); defer m.mu.Unlock(); return m.state }
func (m *Manager) Wait(ctx context.Context) error {
	m.mu.Lock()
	done := m.done
	cmd := m.cmd
	m.mu.Unlock()
	if done != nil {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-done:
		}
	}
	if cmd == nil {
		return nil
	}
	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()
	for {
		reapGroup(cmd.Process.Pid)
		if groupGone(cmd.Process.Pid) {
			// A child can become a zombie between the first non-blocking
			// reap and the /proc scan. It is no longer executing, but this
			// subreaper still owns its exit status and must collect it.
			reapGroup(cmd.Process.Pid)
			return nil
		}
		select {
		case <-ctx.Done():
			return fmt.Errorf("core exited but process group remains: %w", ctx.Err())
		case <-ticker.C:
		}
	}
}
func (m *Manager) DrainStop(ctx context.Context, control Control, operation string) error {
	deadline, ok := ctx.Deadline()
	if !ok {
		return errors.New("drain requires a deadline")
	}
	if err := control.Drain(ctx, rc.DrainRequest{OperationID: operation, Deadline: deadline}); err != nil {
		return err
	}
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()
	for {
		status, err := control.Status(ctx)
		if err != nil {
			return err
		}
		if status.DrainComplete {
			break
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
		}
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	if err := control.Shutdown(ctx); err != nil {
		return err
	}
	return m.Wait(ctx)
}

// Terminate requests normal SIGTERM shutdown, for host/container termination.
// It is deliberately separate from rollout drain and never sends SIGKILL.
func (m *Manager) Terminate(ctx context.Context) error {
	m.mu.Lock()
	cmd := m.cmd
	running := m.state.Running
	m.mu.Unlock()
	if cmd != nil && !groupGone(cmd.Process.Pid) {
		// The core owns plugin draining. Signaling all plugins at once would
		// interrupt work before the core can persist its terminal receipts.
		var err error
		if running {
			err = terminateProcess(cmd.Process.Pid)
		} else {
			err = terminateGroup(cmd.Process.Pid)
		}
		if err != nil {
			return err
		}
	}
	return m.Wait(ctx)
}
func (m *Manager) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.state.Running || (m.cmd != nil && !groupGone(m.cmd.Process.Pid)) {
		return errors.New("cannot close supervisor while core process group exists")
	}
	if m.lock == nil {
		return nil
	}
	err := unlockProcess(m.lock)
	m.lock = nil
	return err
}
func (m *Manager) persist() error {
	b, err := json.Marshal(m.state)
	if err != nil {
		return err
	}
	f, err := os.CreateTemp(m.root, ".process-")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	if _, err = f.Write(b); err == nil {
		err = f.Sync()
	}
	ce := f.Close()
	if err == nil {
		err = ce
	}
	if err != nil {
		return err
	}
	if err = os.Rename(f.Name(), filepath.Join(m.root, "process.json")); err != nil {
		return err
	}
	return syncProcessDir(m.root)
}
