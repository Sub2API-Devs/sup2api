package accounts

import (
	"context"
	"sort"
	"strings"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/keylock"
	"ccgateway/controller/internal/names"
)

// deletion is _deletion_plan's result (D2, D3): nothing is changed yet.
type deletion struct {
	containers []string // names, sorted
	networks   []string // roles: net, uplink
	volume     bool
}

// Delete is DELETE /accounts/<key> (D1-D7). Drafts always; an account
// runtime only when the caller says so (account); purge also removes the
// volume and the backup.
func (m *Manager) Delete(ctx context.Context, aid string, account, purge bool) (*contract.DeleteResult, error) {
	if err := names.CheckKey(aid); err != nil {
		return nil, err
	}
	if !names.IsDraft(aid) && !account {
		return nil, errs.New(errs.NotDraft, "only draft runtimes can be deleted")
	}
	h, err := m.Lock(ctx, aid)
	if err != nil {
		return nil, err
	}
	defer h.Release()
	return m.DeleteLocked(ctx, h, account, purge)
}

// DeleteLocked is delete(aid, account, purge) with the lock already held (K10).
func (m *Manager) DeleteLocked(ctx context.Context, h *keylock.Held, account, purge bool) (*contract.DeleteResult, error) {
	aid := h.Key()
	h.Check(aid)
	if !names.IsDraft(aid) && !account {
		return nil, errs.New(errs.NotDraft, "only draft runtimes can be deleted")
	}
	removeVolume := !account || purge
	p, err := m.deletionPlan(ctx, aid, removeVolume)
	if err != nil {
		return nil, err
	}
	if err := m.detachShared(ctx, aid); err != nil {
		return nil, err
	}
	if account && !purge {
		data, err := m.st.StateBytes(aid)
		if err != nil {
			return nil, err
		}
		if data != nil {
			if err := m.st.WriteBackup(aid, data); err != nil {
				return nil, err
			}
		}
	}
	m.dropReadiness(aid)
	removed, err := m.removeResources(ctx, aid, p)
	if err != nil {
		return nil, err
	}
	// The containers are gone: nothing uses the user any more. Its keys
	// expire on their own (TTL).
	if st, err := m.State(aid); err == nil {
		m.delStateUser(ctx, aid, st)
	}
	if err := m.st.RemoveAccountDir(aid); err != nil {
		return nil, err
	}
	if purge {
		if err := m.st.RemoveBackup(aid); err != nil {
			return nil, err
		}
	}
	return removed, nil
}

// deletionPlan (D2, D3): a same-name resource of someone else is
// OwnershipMismatch (the guard's 409); a container outside the runtime on
// its network, or on the volume to be removed, is ResourceInUse. The
// guard leaves the ended one-shot helpers out of both lists and removes them
// with the network or the volume (R15).
func (m *Manager) deletionPlan(ctx context.Context, aid string, removeVolume bool) (*deletion, error) {
	acct, err := m.g.Account(ctx, aid)
	if err != nil {
		return nil, err
	}
	p := &deletion{}
	ours := map[string]bool{}
	for _, c := range append([]*guardapi.Container{acct.App}, acct.Others...) {
		if c == nil || c.Labels[names.LabelAccount] != aid || !names.ContainerOf(m.prefix, aid, c.Name) {
			continue
		}
		ours[c.ID] = true
		p.containers = append(p.containers, c.Name)
	}
	sort.Strings(p.containers)
	if acct.Network != nil {
		p.networks = append(p.networks, "net")
	}
	if acct.Uplink != nil {
		p.networks = append(p.networks, "uplink")
	}
	p.volume = removeVolume && acct.Volume != nil
	foreign := map[string]bool{}
	for _, ref := range acct.NetworkForeign {
		if !ours[ref.ID] {
			foreign[refName(ref)] = true
		}
	}
	if p.volume {
		for _, ref := range acct.VolumeUsers {
			if !ours[ref.ID] {
				foreign[refName(ref)] = true
			}
		}
	}
	if len(foreign) > 0 {
		list := make([]string, 0, len(foreign))
		for n := range foreign {
			list = append(list, n)
		}
		return nil, errs.InUse(list)
	}
	return p, nil
}

func refName(r guardapi.ContainerRef) string {
	if r.Name != "" {
		return r.Name
	}
	return r.ID
}

// removeResources is _remove_resources (D5, D6): containers first, then the
// networks (the guard takes the gateway off first), then the volume when
// planned. What is gone already is skipped; a failure stops here (D7).
func (m *Manager) removeResources(ctx context.Context, aid string, p *deletion) (*contract.DeleteResult, error) {
	out := &contract.DeleteResult{Containers: []string{}, Networks: []string{}}
	head := m.prefix + "-" + aid + "-"
	for _, name := range p.containers {
		err := m.g.DeleteContainer(ctx, aid, strings.TrimPrefix(name, head))
		switch {
		case err == nil:
			m.log.Info("delete key=%s removed container %s", aid, name)
			out.Containers = append(out.Containers, name)
		case guardapi.IsNotFound(err):
		default:
			return nil, err
		}
	}
	for _, role := range p.networks {
		err := m.g.DeleteNetwork(ctx, aid, role)
		switch {
		case err == nil:
			out.Networks = append(out.Networks, m.name(aid, role))
		case guardapi.IsNotFound(err):
		default:
			return nil, err
		}
	}
	if p.volume {
		err := m.g.DeleteVolume(ctx, aid)
		switch {
		case err == nil:
			out.Volume = true
		case guardapi.IsNotFound(err):
		default:
			return nil, err
		}
	}
	return out, nil
}

// detachShared is _detach_shared (G13): this controller's gateway leaves the
// account's network, the binding goes with it.
func (m *Manager) detachShared(ctx context.Context, aid string) error {
	gw, err := m.g.Gateway(ctx)
	if err != nil && !errs.Is(err, errs.OwnershipMismatch) {
		return err
	}
	if err == nil && gw.Container != nil {
		if err := m.g.DisconnectGateway(ctx, aid); err != nil {
			return err
		}
	}
	return m.shared.remove(ctx, aid, true)
}
