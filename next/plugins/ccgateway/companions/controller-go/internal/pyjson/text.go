package pyjson

import (
	"errors"
	"net/netip"
	"regexp"
	"strings"
)

// IsSpace is Python's str.isspace() for one character: Unicode White_Space
// (what unicode.IsSpace covers) plus the information separators U+001C..U+001F.
func IsSpace(r rune) bool {
	switch {
	case r >= 0x09 && r <= 0x0d, r >= 0x1c && r <= 0x20, r == 0x85, r == 0xa0, r == 0x1680,
		r >= 0x2000 && r <= 0x200a, r == 0x2028, r == 0x2029, r == 0x202f, r == 0x205f, r == 0x3000:
		return true
	}
	return false
}

// HasSpace is any(c.isspace() for c in s).
func HasSpace(s string) bool {
	for _, r := range s {
		if IsSpace(r) {
			return true
		}
	}
	return false
}

// URL is the part of urllib.parse.SplitResult the controller reads.
type URL struct {
	Scheme, Netloc, Path, Query, Fragment string
}

// ErrInvalidURL is the ValueError urlsplit raises (unbalanced or invalid
// brackets). ErrNonASCIINetloc is a deliberate deviation: Python runs an NFKC
// check on a non-ASCII netloc, which needs Unicode tables outside the
// standard library; such a netloc is refused instead.
var (
	ErrInvalidURL     = errors.New("pyjson: invalid URL")
	ErrNonASCIINetloc = errors.New("pyjson: non-ASCII netloc")
)

const schemeChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-."

var ipvFuture = regexp.MustCompile(`^v[a-fA-F0-9]+\..+$`)

// URLSplit is urllib.parse.urlsplit(s) of Python 3.12 (allow_fragments=True).
func URLSplit(s string) (URL, error) {
	// lstrip of C0 controls and space, then removal of tab, CR and LF.
	i := 0
	for i < len(s) && s[i] <= ' ' {
		i++
	}
	url := s[i:]
	url = strings.NewReplacer("\t", "", "\r", "", "\n", "").Replace(url)
	var u URL
	if c := strings.IndexByte(url, ':'); c > 0 && isASCIIAlpha(url[0]) {
		ok := true
		for j := 0; j < c; j++ {
			if !strings.ContainsRune(schemeChars, rune(url[j])) {
				ok = false
				break
			}
		}
		if ok {
			u.Scheme, url = strings.ToLower(url[:c]), url[c+1:]
		}
	}
	if strings.HasPrefix(url, "//") {
		delim := len(url)
		for _, c := range "/?#" {
			if w := strings.IndexRune(url[2:], c); w >= 0 && w+2 < delim {
				delim = w + 2
			}
		}
		u.Netloc, url = url[2:delim], url[delim:]
		open, close := strings.Contains(u.Netloc, "["), strings.Contains(u.Netloc, "]")
		if open != close {
			return URL{}, ErrInvalidURL
		}
		if open && close {
			if err := checkBracketedNetloc(u.Netloc); err != nil {
				return URL{}, err
			}
		}
	}
	if f := strings.IndexByte(url, '#'); f >= 0 {
		url, u.Fragment = url[:f], url[f+1:]
	}
	if q := strings.IndexByte(url, '?'); q >= 0 {
		url, u.Query = url[:q], url[q+1:]
	}
	for k := 0; k < len(u.Netloc); k++ {
		if u.Netloc[k] >= 0x80 {
			return URL{}, ErrNonASCIINetloc
		}
	}
	u.Path = url
	return u, nil
}

func isASCIIAlpha(c byte) bool { return c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' }

func checkBracketedNetloc(netloc string) error {
	hostport := netloc
	if at := strings.LastIndexByte(netloc, '@'); at >= 0 {
		hostport = netloc[at+1:]
	}
	before, bracketed, found := strings.Cut(hostport, "[")
	if found {
		if before != "" {
			return ErrInvalidURL
		}
		host, port, _ := strings.Cut(bracketed, "]")
		if port != "" && !strings.HasPrefix(port, ":") {
			return ErrInvalidURL
		}
		return checkBracketedHost(host)
	}
	host, _, _ := strings.Cut(hostport, ":")
	return checkBracketedHost(host)
}

func checkBracketedHost(host string) error {
	if strings.HasPrefix(host, "v") {
		if !ipvFuture.MatchString(host) {
			return ErrInvalidURL
		}
		return nil
	}
	addr, err := netip.ParseAddr(host)
	if err != nil || addr.Is4() {
		return ErrInvalidURL
	}
	return nil
}

// HasUserinfo is `username is not None` (an '@' in the netloc).
func (u URL) HasUserinfo() bool { return strings.Contains(u.Netloc, "@") }

// Hostname is SplitResult.hostname: "" for None.
func (u URL) Hostname() string {
	hostinfo := u.Netloc
	if at := strings.LastIndexByte(hostinfo, '@'); at >= 0 {
		hostinfo = hostinfo[at+1:]
	}
	var host string
	if _, bracketed, found := strings.Cut(hostinfo, "["); found {
		host, _, _ = strings.Cut(bracketed, "]")
	} else {
		host, _, _ = strings.Cut(hostinfo, ":")
	}
	if host == "" {
		return ""
	}
	name, zone, hasZone := strings.Cut(host, "%")
	if hasZone {
		return strings.ToLower(name) + "%" + zone
	}
	return strings.ToLower(name)
}
