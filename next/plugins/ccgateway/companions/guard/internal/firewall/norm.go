package firewall

import (
	"sort"
	"strings"
)

// Normalize turns one rule (arguments after "-A <chain>", as written by
// the guard or printed by `iptables -S`) into a canonical string (03
// §7.9): basic matches in a fixed order, addresses with /32, one unit per
// match module with its options sorted (and comma lists such as --ctstate
// sorted), options of -p tcp/udp without an explicit -m attached to that
// protocol's module, then the target.
func Normalize(args []string) string {
	type unit struct {
		name string
		opts []string
	}
	basic := map[string]string{}
	var mods []*unit
	var target []string
	var cur *unit
	proto := ""
	neg := false
	inTarget := false
	for i := 0; i < len(args); i++ {
		a := args[i]
		if a == "!" {
			neg = true
			continue
		}
		prefix := ""
		if neg {
			prefix = "! "
			neg = false
		}
		switch a {
		case "-s", "-d", "-i", "-o", "-p", "--source", "--destination", "--in-interface", "--out-interface", "--protocol":
			if i+1 >= len(args) {
				return "invalid"
			}
			v := args[i+1]
			i++
			key := map[string]string{"--source": "-s", "--destination": "-d", "--in-interface": "-i",
				"--out-interface": "-o", "--protocol": "-p"}[a]
			if key == "" {
				key = a
			}
			if (key == "-s" || key == "-d") && !strings.Contains(v, "/") {
				v += "/32"
			}
			if key == "-p" {
				proto = v
			}
			basic[key] = prefix + v
			cur = nil
			continue
		case "-m", "--match":
			if i+1 >= len(args) {
				return "invalid"
			}
			name := args[i+1]
			i++
			cur = nil
			for _, m := range mods {
				if m.name == name {
					cur = m
				}
			}
			if cur == nil {
				cur = &unit{name: name}
				mods = append(mods, cur)
			}
			inTarget = false
			continue
		case "-j", "--jump":
			if i+1 >= len(args) {
				return "invalid"
			}
			target = append(target, "-j", args[i+1])
			i++
			inTarget = true
			cur = nil
			continue
		}
		if !strings.HasPrefix(a, "--") {
			return "invalid"
		}
		opt := prefix + a
		if i+1 < len(args) && !strings.HasPrefix(args[i+1], "-") && args[i+1] != "!" {
			v := args[i+1]
			i++
			if a == "--ctstate" || a == "--state" {
				parts := strings.Split(v, ",")
				sort.Strings(parts)
				v = strings.Join(parts, ",")
			}
			if a == "--comment" {
				v = strings.Trim(v, `"`)
			}
			opt += " " + v
		}
		if inTarget {
			target = append(target, opt)
			continue
		}
		if cur == nil {
			if proto == "" {
				return "invalid"
			}
			for _, m := range mods {
				if m.name == proto {
					cur = m
				}
			}
			if cur == nil {
				cur = &unit{name: proto}
				mods = append(mods, cur)
			}
		}
		cur.opts = append(cur.opts, opt)
	}
	var out []string
	for _, k := range []string{"-s", "-d", "-i", "-o", "-p"} {
		if v, ok := basic[k]; ok {
			if strings.HasPrefix(v, "! ") {
				out = append(out, "! "+k+" "+strings.TrimPrefix(v, "! "))
			} else {
				out = append(out, k+" "+v)
			}
		}
	}
	ms := make([]string, 0, len(mods))
	for _, m := range mods {
		sort.Strings(m.opts)
		ms = append(ms, strings.TrimSpace("-m "+m.name+" "+strings.Join(m.opts, " ")))
	}
	sort.Strings(ms)
	out = append(out, ms...)
	out = append(out, strings.Join(target, " "))
	return strings.Join(out, " ")
}

// Tokens splits an `iptables -S` line; double quoted values (comments with
// spaces) stay one token.
func Tokens(line string) []string {
	var out []string
	var b strings.Builder
	inQ := false
	has := false
	for _, r := range line {
		switch {
		case r == '"':
			inQ = !inQ
			has = true
		case r == ' ' && !inQ:
			if has {
				out = append(out, b.String())
				b.Reset()
				has = false
			}
		default:
			b.WriteRune(r)
			has = true
		}
	}
	if has {
		out = append(out, b.String())
	}
	return out
}

// ParseChain extracts the rules of chain from `iptables -S` output.
func ParseChain(out, chain string) []Rule {
	var rules []Rule
	for _, line := range strings.Split(out, "\n") {
		t := Tokens(strings.TrimSpace(line))
		if len(t) >= 2 && t[0] == "-A" && t[1] == chain {
			rules = append(rules, Rule(t[2:]))
		}
	}
	return rules
}

// Diff compares two rule lists after normalization. ordered compares
// position by position (the CONTROL chains: DROP last); otherwise as
// multisets. It returns lines prefixed with "-" (only in have) and "+"
// (only in want).
func Diff(want, have []Rule, ordered bool) []string {
	w := make([]string, len(want))
	for i, r := range want {
		w[i] = Normalize(r)
	}
	h := make([]string, len(have))
	for i, r := range have {
		h[i] = Normalize(r)
	}
	var out []string
	if ordered {
		n := len(w)
		if len(h) > n {
			n = len(h)
		}
		for i := 0; i < n; i++ {
			switch {
			case i >= len(w):
				out = append(out, "- "+h[i])
			case i >= len(h):
				out = append(out, "+ "+w[i])
			case w[i] != h[i]:
				out = append(out, "- "+h[i], "+ "+w[i])
			}
		}
		return out
	}
	count := map[string]int{}
	for _, s := range w {
		count[s]++
	}
	for _, s := range h {
		count[s]--
	}
	keys := make([]string, 0, len(count))
	for k := range count {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		for c := count[k]; c > 0; c-- {
			out = append(out, "+ "+k)
		}
		for c := count[k]; c < 0; c++ {
			out = append(out, "- "+k)
		}
	}
	return out
}
