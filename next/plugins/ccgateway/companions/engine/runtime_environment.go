package engine

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// Account language and timezone (account settings locale/timezone). Docker
// cannot change the environment of an existing container and account
// containers are never recreated for this, so the controller pushes the values
// to PUT /admin/environment. They are persisted in the data directory and
// applied to every CLI process started afterwards; running processes keep
// the environment they started with.

const environmentFile = "environment.json"

var errEnvironmentSave = errors.New("cannot save environment")

var (
	environmentLocale   = regexp.MustCompile(`^[A-Za-z]{2,3}([_-][A-Za-z0-9]{2,8}){0,2}(\.[Uu][Tt][Ff]-?8)?$`)
	environmentTimezone = regexp.MustCompile(`^[A-Za-z_]+(/[A-Za-z0-9_+-]+)*$`)
	// Without system zone data every lookup fails; only the pattern applies then.
	zoneDataAvailable = sync.OnceValue(func() bool {
		_, err := time.LoadLocation("America/New_York")
		return err == nil
	})
)

type environmentOverride struct {
	Locale   string `json:"locale"`
	Timezone string `json:"timezone"`
}

func (o environmentOverride) validate() error {
	if o.Locale != "" && (len(o.Locale) > 35 || !environmentLocale.MatchString(o.Locale)) {
		return errors.New("invalid locale")
	}
	if o.Timezone != "" {
		if len(o.Timezone) > 64 || !environmentTimezone.MatchString(o.Timezone) || o.Timezone == "Local" {
			return errors.New("invalid timezone")
		}
		if _, err := time.LoadLocation(o.Timezone); err != nil && zoneDataAvailable() {
			return errors.New("invalid timezone")
		}
	}
	return nil
}

// values maps the override to process variables. Same rule as the controller
// uses for a new container: a locale without an encoding gets ".UTF-8".
func (o environmentOverride) values() map[string]string {
	values := map[string]string{}
	if o.Locale != "" {
		lang := o.Locale
		if !strings.Contains(lang, ".") {
			lang += ".UTF-8"
		}
		values["LANG"], values["LC_ALL"] = lang, lang
	}
	if o.Timezone != "" {
		values["TZ"] = o.Timezone
	}
	return values
}

// EnvironmentOverrides holds the locale/timezone applied to new CLI processes.
// A nil store applies nothing.
type EnvironmentOverrides struct {
	mu      sync.RWMutex
	path    string
	current environmentOverride
}

// NewEnvironmentOverrides loads dir/environment.json. A missing or invalid
// file means no override: the container environment applies.
func NewEnvironmentOverrides(dir string) *EnvironmentOverrides {
	s := &EnvironmentOverrides{path: filepath.Join(dir, environmentFile)}
	data, err := os.ReadFile(s.path)
	if err != nil || len(data) > 4096 {
		return s
	}
	var saved environmentOverride
	if json.Unmarshal(data, &saved) == nil && saved.validate() == nil {
		s.current = saved
	}
	return s
}

func (s *EnvironmentOverrides) get() environmentOverride {
	if s == nil {
		return environmentOverride{}
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.current
}

// Apply returns base with LANG, LC_ALL and TZ replaced by the configured
// values; an empty value keeps the inherited variable.
func (s *EnvironmentOverrides) Apply(base []string) []string {
	values := s.get().values()
	if len(values) == 0 {
		return append([]string(nil), base...)
	}
	return envWith(base, values)
}

// View reports the stored override and what a new CLI process receives.
func (s *EnvironmentOverrides) View(base []string) Object {
	current := s.get()
	env := s.Apply(base)
	return Object{"locale": current.Locale, "timezone": current.Timezone, "effective": Object{
		"LANG": environmentValue(env, "LANG"), "LC_ALL": environmentValue(env, "LC_ALL"), "TZ": environmentValue(env, "TZ")}}
}

// Update validates and atomically persists the override before using it.
func (s *EnvironmentOverrides) Update(next environmentOverride) error {
	if err := next.validate(); err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	data, _ := json.Marshal(next)
	f, err := os.CreateTemp(filepath.Dir(s.path), ".environment-*")
	if err != nil {
		return errEnvironmentSave
	}
	temp := f.Name()
	defer os.Remove(temp)
	if err = f.Chmod(0600); err == nil {
		_, err = f.Write(append(data, '\n'))
	}
	if err == nil {
		err = f.Sync()
	}
	if closeErr := f.Close(); err == nil {
		err = closeErr
	}
	if err == nil {
		err = os.Rename(temp, s.path)
	}
	if err != nil {
		return errEnvironmentSave
	}
	s.current = next
	return nil
}

// serve handles GET and PUT /admin/environment (management key already checked).
func (s *EnvironmentOverrides) serve(w http.ResponseWriter, r *http.Request, base []string) {
	if s == nil {
		apiError(w, 503, "api_error", "Environment configuration is disabled")
		return
	}
	switch r.Method {
	case http.MethodGet:
	case http.MethodPut:
		var body environmentOverride
		d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096))
		d.DisallowUnknownFields()
		if d.Decode(&body) != nil || d.Decode(new(any)) != io.EOF {
			apiError(w, 400, "invalid_request_error", "Invalid environment configuration")
			return
		}
		if err := s.Update(body); errors.Is(err, errEnvironmentSave) {
			apiError(w, 500, "api_error", err.Error())
			return
		} else if err != nil {
			apiError(w, 400, "invalid_request_error", err.Error())
			return
		}
	default:
		apiError(w, 405, "invalid_request_error", "Method not allowed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(s.View(base))
}
