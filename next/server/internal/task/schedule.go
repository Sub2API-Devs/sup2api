package task

import (
	"fmt"
	"time"

	"github.com/robfig/cron/v3"
)

// Schedule is a parsed task schedule. Every node computes the same trigger
// times from it: "@every d" slots are multiples of d since the Unix epoch and
// cron expressions are evaluated in UTC.
type Schedule interface {
	Next(time.Time) time.Time
}

var cronParser = cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow | cron.Descriptor)

// ParseSchedule parses a 5-field cron expression (evaluated in UTC unless it
// starts with CRON_TZ=) or "@every <duration>". It is the schedule syntax of
// plugin manifest jobs too (internal/job).
func ParseSchedule(spec string) (cron.Schedule, error) {
	sched, err := cronParser.Parse(spec)
	if err != nil {
		return nil, err
	}
	switch v := sched.(type) {
	case cron.ConstantDelaySchedule:
		return Every(v.Delay), nil
	case *cron.SpecSchedule:
		return utcSchedule{s: v}, nil
	}
	return sched, nil
}

// Every is an "@every" schedule aligned to multiples of the interval.
type Every time.Duration

func (e Every) Next(t time.Time) time.Time {
	d := time.Duration(e)
	return t.Truncate(d).Add(d)
}

type utcSchedule struct{ s *cron.SpecSchedule }

// Next evaluates the spec in UTC; an explicit CRON_TZ keeps its location.
func (u utcSchedule) Next(t time.Time) time.Time { return u.s.Next(t.UTC()) }

// periodReference is where MinPeriod starts sampling, fixed so every node
// derives the same period from the same cron expression.
var periodReference = time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

// MinPeriod is the shortest gap between two consecutive trigger times: the
// interval of an Every schedule, the smallest gap among the next 64 trigger
// times of a cron schedule. Cluster tasks use it as the unique period of
// their periodic runs (TASK-FRAMEWORK-DESIGN §7.3) and to pick their default
// retry count.
func MinPeriod(s Schedule) time.Duration {
	if e, ok := s.(Every); ok {
		return time.Duration(e)
	}
	prev := s.Next(periodReference)
	if prev.IsZero() {
		return 0
	}
	min := time.Duration(0)
	for range 64 {
		next := s.Next(prev)
		if next.IsZero() {
			break
		}
		if gap := next.Sub(prev); min == 0 || gap < min {
			min = gap
		}
		prev = next
	}
	return min
}

// specSchedule returns the schedule of a spec and its text as stored and
// shown ("@every 1m0s" or the cron expression); nil and "" for a cluster task
// that only runs enqueued work.
func specSchedule(every time.Duration, cronSpec string) (Schedule, string, error) {
	switch {
	case every > 0 && cronSpec != "":
		return nil, "", fmt.Errorf("Every and Cron are exclusive")
	case every > 0:
		if every%time.Second != 0 {
			return nil, "", fmt.Errorf("Every must be whole seconds")
		}
		return Every(every), "@every " + every.String(), nil
	case every < 0:
		return nil, "", fmt.Errorf("Every must not be negative")
	case cronSpec != "":
		s, err := ParseSchedule(cronSpec)
		if err != nil {
			return nil, "", fmt.Errorf("cron %q: %w", cronSpec, err)
		}
		if _, ok := s.(Every); ok {
			return nil, "", fmt.Errorf("use Every instead of Cron %q", cronSpec)
		}
		return s, cronSpec, nil
	}
	return nil, "", nil
}
