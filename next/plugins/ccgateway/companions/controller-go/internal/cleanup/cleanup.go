package cleanup

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"sort"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
)

// MaxKeys bounds the inventory and each list of a cleanup request.
const MaxKeys = 20000

type cleaner struct{ o Options }

// New is the orphan inventory and the identity-checked keep-list cleanup.
func New(opts Options) (contract.Cleanup, error) {
	if err := opts.Defaults(); err != nil {
		return nil, err
	}
	return &cleaner{o: opts}, nil
}

// raw reads a nested value of a raw inspect (nil when absent).
func raw(o pyjson.Ordered, keys ...string) any {
	var v any = o
	for _, k := range keys {
		obj, ok := v.(pyjson.Ordered)
		if !ok {
			return nil
		}
		v, _ = obj.Get(k)
	}
	return v
}

// row is cleanup.resource_row: [kind, role, id, CreatedAt, Created, State.StartedAt].
func row(kind, role string, id any, inspect pyjson.Ordered) []any {
	return []any{kind, role, id, raw(inspect, "CreatedAt"), raw(inspect, "Created"), raw(inspect, "State", "StartedAt")}
}

// dockerResources is cleanup.docker_resources: the runtime's containers,
// networks and volume. A same-name resource of someone else is the guard's
// 409 ownership_mismatch (errs.OwnershipMismatch).
func (c *cleaner) dockerResources(ctx context.Context, aid string) ([]any, error) {
	a, err := c.o.Guard.Account(ctx, aid)
	if err != nil {
		return nil, err
	}
	var out []any
	exact := map[string]bool{}
	for _, role := range []string{"app", "egress"} {
		name := names.Name(c.o.Prefix, aid, role)
		exact[name] = true
		if ct := a.Container(c.o.Prefix, aid, role); ct != nil {
			out = append(out, row("container", role, raw(ct.Raw, "Id"), ct.Raw))
		}
	}
	// egress and uplink only exist on runtimes made before the shared
	// gateway; listing them lets those be purged too.
	for _, n := range []struct {
		role string
		net  *guardapi.Network
	}{{"net", a.Network}, {"uplink", a.Uplink}} {
		if n.net != nil {
			out = append(out, row("network", n.role, raw(n.net.Raw, "Id"), n.net.Raw))
		}
	}
	if a.Volume != nil {
		out = append(out, row("volume", "data", raw(a.Volume.Raw, "Name"), a.Volume.Raw))
	}
	// Other containers of the runtime (a rollback copy left by a manual
	// migration): a runtime with only such a container is still found.
	head := len(c.o.Prefix + "-" + aid + "-")
	others := append([]*guardapi.Container(nil), a.Others...)
	sort.Slice(others, func(i, j int) bool { return others[i].Name < others[j].Name })
	for _, ct := range others {
		if !exact[ct.Name] && names.ContainerOf(c.o.Prefix, aid, ct.Name) {
			out = append(out, row("container", ct.Name[head:], raw(ct.Raw, "Id"), ct.Raw))
		}
	}
	return out, nil
}

// file stats rel like Path.exists (following a final symlink) then
// is_symlink: nothing for an absent (or dangling) path, an error for a link.
func (c *cleaner) file(rel, what string) (store.FileInfo, error) {
	info, err := c.o.Store.Stat(rel)
	if err != nil || !info.Exists {
		return store.FileInfo{}, err
	}
	if info.IsSymlink {
		followed, err := c.o.Store.StatFollow(rel)
		if err != nil || !followed.Exists {
			return store.FileInfo{}, err
		}
		return store.FileInfo{}, errors.New("runtime " + what + " is a symlink")
	}
	return info, nil
}

func digest(b []byte) string {
	s := sha256.Sum256(b)
	return hex.EncodeToString(s[:])
}

// snapshot is cleanup.snapshot: the identity of everything of runtime aid,
// "" when nothing of it exists. The caller holds aid's account lock.
func (c *cleaner) snapshot(ctx context.Context, aid string) (string, error) {
	resources, err := c.dockerResources(ctx, aid)
	if err != nil {
		return "", err
	}
	dir, err := c.o.Store.Stat(store.AccountDir(aid))
	if err != nil {
		return "", err
	}
	if dir.IsSymlink {
		return "", errors.New("runtime directory is a symlink")
	}
	if dir.IsDir {
		resources = append(resources, []any{"directory", dir.Inode, dir.MtimeNs})
	}
	stateRel := store.AccountDir(aid) + "/" + store.StateFile
	if st, err := c.file(stateRel, "state"); err != nil {
		return "", err
	} else if st.Exists {
		data, err := c.o.Store.ReadFile(stateRel)
		if err != nil {
			return "", err
		}
		resources = append(resources, []any{"state", st.Inode, st.MtimeNs, digest(data)})
	}
	backupRel := store.BackupsDir + "/" + aid + ".json"
	if b, err := c.file(backupRel, "backup"); err != nil {
		return "", err
	} else if b.Exists {
		data, err := c.o.Store.ReadFile(backupRel)
		if err != nil {
			return "", err
		}
		resources = append(resources, []any{"backup", digest(data)})
	}
	if binding, ok := c.o.Host.SharedBinding(aid); ok {
		resources = append(resources, []any{"shared_binding", binding})
	}
	if len(resources) == 0 {
		return "", nil
	}
	b, err := pyjson.MarshalSorted(resources)
	if err != nil {
		return "", err
	}
	return digest(b), nil
}

// UnreadableIdentity is the identity of a runtime whose snapshot failed: no
// snapshot hashes to it (a snapshot is the digest of a JSON list).
func UnreadableIdentity(aid string) string { return digest([]byte("unreadable runtime " + aid)) }

// keys is the inventory's key set (X1), sorted.
func (c *cleaner) keys(ctx context.Context) ([]string, error) {
	set := map[string]bool{}
	entries, err := c.o.Store.AccountEntries()
	if err != nil {
		return nil, err
	}
	for _, e := range entries {
		if e.IsDir && !e.IsSymlink {
			set[e.Name] = true
		}
	}
	backups, err := c.o.Store.BackupKeys()
	if err != nil {
		return nil, err
	}
	for _, k := range backups {
		set[k] = true
	}
	for _, k := range c.o.Host.SharedBindingKeys() {
		if names.Key.MatchString(k) {
			set[k] = true
		}
	}
	inv, err := c.o.Guard.Inventory(ctx)
	if err != nil {
		return nil, err
	}
	for _, ct := range inv.Containers {
		k := ct.Labels[names.LabelAccount]
		if names.Key.MatchString(k) && names.ContainerOf(c.o.Prefix, k, ct.Name) {
			set[k] = true
		}
	}
	for _, n := range inv.Networks {
		k := n.Labels[names.LabelAccount]
		if names.Key.MatchString(k) && (n.Name == names.Name(c.o.Prefix, k, "net") || n.Name == names.Name(c.o.Prefix, k, "uplink")) {
			set[k] = true
		}
	}
	for _, v := range inv.Volumes {
		k := v.Labels[names.LabelAccount]
		if names.Key.MatchString(k) && v.Name == names.Name(c.o.Prefix, k, "data") {
			set[k] = true
		}
	}
	if len(set) > MaxKeys {
		return nil, errors.New("runtime inventory too large")
	}
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	sort.Strings(out)
	return out, nil
}

// Inventory is GET /runtime/cleanup (X1-X3).
func (c *cleaner) Inventory(ctx context.Context) (pyjson.Ordered, error) {
	keys, err := c.keys(ctx)
	if err != nil {
		return nil, err
	}
	rows := []any{}
	for _, aid := range keys {
		h, err := c.o.Host.Lock(ctx, aid)
		if err != nil {
			return nil, err
		}
		identity, err := c.snapshot(context.WithoutCancel(ctx), aid)
		h.Release()
		if err != nil {
			// This runtime's failure alone: listed with an identity no
			// snapshot matches, so cleanup reports it failed.
			c.o.Log.Warn("cleanup inventory key=%s: %s", aid, errs.FailureText(err))
			identity = UnreadableIdentity(aid)
		}
		if identity != "" {
			rows = append(rows, pyjson.Ordered{{Key: "key", Value: aid}, {Key: "identity", Value: identity}})
		}
	}
	return pyjson.Ordered{{Key: "runtimes", Value: rows}}, nil
}

type candidate struct{ key, identity string }

// request is X4: exactly {keep_keys, candidates}, every value checked.
func request(desired any) (map[string]bool, []candidate, error) {
	o, ok := desired.(pyjson.Ordered)
	if !ok || len(o) != 2 || !o.Has("keep_keys") || !o.Has("candidates") {
		return nil, nil, errs.New(errs.BadRequest, "complete keep list and resource inventory required")
	}
	kv, _ := o.Get("keep_keys")
	cv, _ := o.Get("candidates")
	keep, ok1 := kv.([]any)
	cands, ok2 := cv.([]any)
	if !ok1 || !ok2 || len(keep) > MaxKeys || len(cands) > MaxKeys {
		return nil, nil, errs.New(errs.BadRequest, "invalid cleanup list")
	}
	keepSet := map[string]bool{}
	for _, k := range keep {
		s, ok := k.(string)
		if !ok {
			return nil, nil, errs.New(errs.BadRequest, "invalid runtime key")
		}
		if err := names.CheckKey(s); err != nil {
			return nil, nil, err
		}
		keepSet[s] = true
	}
	if len(keepSet) != len(keep) {
		return nil, nil, errs.New(errs.BadRequest, "duplicate keep key")
	}
	seen := map[string]bool{}
	var out []candidate
	for _, item := range cands {
		r, ok := item.(pyjson.Ordered)
		if !ok || len(r) != 2 || !r.Has("key") || !r.Has("identity") {
			return nil, nil, errs.New(errs.BadRequest, "invalid cleanup candidate")
		}
		kv, _ := r.Get("key")
		iv, _ := r.Get("identity")
		key, ok := kv.(string)
		if !ok {
			return nil, nil, errs.New(errs.BadRequest, "invalid runtime key")
		}
		if err := names.CheckKey(key); err != nil {
			return nil, nil, err
		}
		identity, ok := iv.(string)
		if seen[key] || !ok || !names.SHA256Hex.MatchString(identity) {
			return nil, nil, errs.New(errs.BadRequest, "invalid cleanup identity")
		}
		seen[key] = true
		out = append(out, candidate{key, identity})
	}
	return keepSet, out, nil
}

// Cleanup is POST /runtime/cleanup (X4, X5).
func (c *cleaner) Cleanup(ctx context.Context, desired any) (pyjson.Ordered, error) {
	keep, cands, err := request(desired)
	if err != nil {
		return nil, err
	}
	results := []any{}
	deleted, failed := 0, 0
	for _, cand := range cands {
		var r pyjson.Ordered
		if keep[cand.key] {
			r = pyjson.Ordered{{Key: "key", Value: cand.key}, {Key: "status", Value: "kept"}}
		} else {
			r = c.cleanOne(ctx, cand)
		}
		switch s, _ := r.Get("status"); s {
		case "deleted":
			deleted++
		case "failed":
			failed++
		}
		results = append(results, r)
	}
	return pyjson.Ordered{{Key: "results", Value: results}, {Key: "deleted", Value: deleted}, {Key: "failed", Value: failed}}, nil
}

// cleanOne deletes one candidate when its identity is still the one listed.
func (c *cleaner) cleanOne(ctx context.Context, cand candidate) pyjson.Ordered {
	status := func(s string) pyjson.Ordered {
		return pyjson.Ordered{{Key: "key", Value: cand.key}, {Key: "status", Value: s}}
	}
	err := func() error {
		h, err := c.o.Host.Lock(ctx, cand.key)
		if err != nil {
			return err
		}
		defer h.Release()
		// Under the lock the work finishes even if the caller goes away.
		work := context.WithoutCancel(ctx)
		current, err := c.snapshot(work, cand.key)
		if err != nil {
			return err
		}
		if current == "" {
			return errAbsent
		}
		if current != cand.identity {
			return errChanged
		}
		_, err = c.o.Host.DeleteLocked(work, h, true, true)
		return err
	}()
	switch {
	case err == nil:
		return status("deleted")
	case err == errAbsent:
		return status("absent")
	case err == errChanged:
		return status("changed")
	}
	c.o.Log.Warn("cleanup key=%s failed: %s", cand.key, errs.FailureText(err))
	// A foreign user of a resource, or a foreign resource with one of its
	// names: nothing of the runtime was deleted.
	reason := "resource_cleanup_failed"
	if errs.Is(err, errs.ResourceInUse) || errs.Is(err, errs.OwnershipMismatch) {
		reason = "resource_in_use"
	}
	return append(status("failed"), pyjson.KV{Key: "reason", Value: reason})
}

var (
	errAbsent  = errors.New("absent")
	errChanged = errors.New("changed")
)
