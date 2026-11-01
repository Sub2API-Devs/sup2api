package fakeguard

import (
	"strings"

	"ccgateway/controller/internal/pyjson"
)

func strList(list []string) any {
	if list == nil {
		return nil
	}
	out := make([]any, len(list))
	for i, s := range list {
		out[i] = s
	}
	return out
}

func strDict(m map[string]string) pyjson.Ordered {
	out := pyjson.Ordered{}
	for _, k := range sortedKeys(m) {
		out = append(out, pyjson.KV{Key: k, Value: m[k]})
	}
	return out
}

// rawContainer is a Docker-shaped inspect (API 1.4x key order) of c.
func (g *Guard) rawContainer(c *container) pyjson.Ordered {
	running := c.status == "running"
	state := pyjson.Ordered{
		{Key: "Status", Value: c.status}, {Key: "Running", Value: running}, {Key: "Paused", Value: false},
		{Key: "Restarting", Value: false}, {Key: "OOMKilled", Value: false}, {Key: "Dead", Value: false},
		{Key: "Pid", Value: int64(0)}, {Key: "ExitCode", Value: int64(0)}, {Key: "Error", Value: ""},
		{Key: "StartedAt", Value: c.startedAt}, {Key: "FinishedAt", Value: "0001-01-01T00:00:00Z"},
	}
	mounts := []any{}
	for _, m := range c.mounts {
		o := pyjson.Ordered{{Key: "Type", Value: m.typ}}
		if m.typ == "volume" {
			o = append(o, pyjson.KV{Key: "Name", Value: m.name})
		}
		o = append(o, pyjson.KV{Key: "Source", Value: m.source}, pyjson.KV{Key: "Destination", Value: m.destination})
		if m.typ == "volume" {
			o = append(o, pyjson.KV{Key: "Driver", Value: m.driver})
		}
		o = append(o, pyjson.KV{Key: "Mode", Value: m.mode}, pyjson.KV{Key: "RW", Value: m.rw},
			pyjson.KV{Key: "Propagation", Value: m.propagation})
		mounts = append(mounts, o)
	}
	nets := pyjson.Ordered{}
	for _, e := range c.endpoints {
		n := g.networks[e.network]
		netID, gw, plen := "", "", int64(0)
		if n != nil {
			netID, gw, plen = n.id, n.gateway, int64(n.subnet.Bits())
		}
		nets = append(nets, pyjson.KV{Key: e.network, Value: pyjson.Ordered{
			{Key: "IPAMConfig", Value: pyjson.Ordered{{Key: "IPv4Address", Value: e.ip}}},
			{Key: "Links", Value: nil}, {Key: "Aliases", Value: nil}, {Key: "MacAddress", Value: ""},
			{Key: "DriverOpts", Value: nil}, {Key: "NetworkID", Value: netID},
			{Key: "EndpointID", Value: ""}, {Key: "Gateway", Value: gw}, {Key: "IPAddress", Value: e.ip},
			{Key: "IPPrefixLen", Value: plen}, {Key: "DNSNames", Value: nil},
		}})
	}
	var entrypoint any
	if c.path != "" {
		entrypoint = []any{c.path}
	}
	return pyjson.Ordered{
		{Key: "Id", Value: c.id},
		{Key: "Created", Value: c.created},
		{Key: "Path", Value: c.path},
		{Key: "Args", Value: strList(c.args)},
		{Key: "State", Value: state},
		{Key: "Image", Value: c.image},
		{Key: "ResolvConfPath", Value: "/var/lib/docker/containers/" + c.id + "/resolv.conf"},
		{Key: "Name", Value: "/" + c.name},
		{Key: "RestartCount", Value: int64(0)},
		{Key: "Driver", Value: "overlayfs"},
		{Key: "Platform", Value: "linux"},
		{Key: "HostConfig", Value: pyjson.Ordered{
			{Key: "NetworkMode", Value: c.networkMode},
			{Key: "CapDrop", Value: []any{"ALL"}},
			{Key: "SecurityOpt", Value: []any{"no-new-privileges:true"}},
		}},
		{Key: "Mounts", Value: mounts},
		{Key: "Config", Value: pyjson.Ordered{
			{Key: "Hostname", Value: c.id[:12]},
			{Key: "Domainname", Value: ""},
			{Key: "User", Value: c.user},
			{Key: "Env", Value: strList(c.env)},
			{Key: "Cmd", Value: strList(c.args)},
			{Key: "Image", Value: c.configImage},
			{Key: "Volumes", Value: nil},
			{Key: "WorkingDir", Value: ""},
			{Key: "Entrypoint", Value: entrypoint},
			{Key: "Labels", Value: strDict(c.labels)},
		}},
		{Key: "NetworkSettings", Value: pyjson.Ordered{{Key: "Networks", Value: nets}}},
	}
}

func (g *Guard) rawNetwork(n *network) pyjson.Ordered {
	containers := pyjson.Ordered{}
	for _, name := range sortedKeys(g.containers) {
		c := g.containers[name]
		for _, e := range c.endpoints {
			if e.network == n.name {
				containers = append(containers, pyjson.KV{Key: c.id, Value: pyjson.Ordered{
					{Key: "Name", Value: c.name}, {Key: "EndpointID", Value: ""}, {Key: "MacAddress", Value: ""},
					{Key: "IPv4Address", Value: e.ip + "/" + itoa(n.subnet.Bits())}, {Key: "IPv6Address", Value: ""},
				}})
			}
		}
	}
	return pyjson.Ordered{
		{Key: "Name", Value: n.name},
		{Key: "Id", Value: n.id},
		{Key: "Created", Value: n.created},
		{Key: "Scope", Value: "local"},
		{Key: "Driver", Value: "bridge"},
		{Key: "EnableIPv4", Value: true},
		{Key: "EnableIPv6", Value: false},
		{Key: "IPAM", Value: pyjson.Ordered{
			{Key: "Driver", Value: "default"}, {Key: "Options", Value: nil},
			{Key: "Config", Value: []any{pyjson.Ordered{{Key: "Subnet", Value: n.subnet.String()}, {Key: "Gateway", Value: n.gateway}}}},
		}},
		{Key: "Internal", Value: n.internal},
		{Key: "Attachable", Value: false},
		{Key: "Containers", Value: containers},
		{Key: "Options", Value: pyjson.Ordered{}},
		{Key: "Labels", Value: strDict(n.labels)},
	}
}

func (g *Guard) rawVolume(v *volume) pyjson.Ordered {
	var options any
	if len(v.options) > 0 {
		options = strDict(v.options)
	}
	return pyjson.Ordered{
		{Key: "CreatedAt", Value: v.created},
		{Key: "Driver", Value: v.driver},
		{Key: "Labels", Value: strDict(v.labels)},
		{Key: "Mountpoint", Value: "/var/lib/docker/volumes/" + v.name + "/_data"},
		{Key: "Name", Value: v.name},
		{Key: "Options", Value: options},
		{Key: "Scope", Value: "local"},
	}
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [20]byte
	i := len(b)
	neg := n < 0
	if neg {
		n = -n
	}
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}

// usesVolume reports whether c mounts volume name.
func (c *container) usesVolume(name string) bool {
	for _, m := range c.mounts {
		if m.typ == "volume" && m.name == name {
			return true
		}
	}
	return false
}

func (c *container) onNetwork(name string) (string, bool) {
	for _, e := range c.endpoints {
		if e.network == name {
			return e.ip, true
		}
	}
	return "", false
}

func (c *container) ended() bool {
	return c.status == "created" || c.status == "exited" || c.status == "dead"
}

func (g *Guard) isEndedHelper(c *container) bool {
	return strings.HasPrefix(c.name, g.prefix+"-oneshot-") && c.ended()
}
