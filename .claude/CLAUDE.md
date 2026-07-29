# mother

Read `README.md` at the repo root — what mother is, how to run it, agent context, code
style, and git conventions all live there. Then read `.agents/LESSONS.md` before starting
work.

## In-depth review

When I ask for a *thorough*, *deep*, or *in-depth* review — as opposed to a quick look —
reading is not enough. That request means:

- **Read the actual code**, not just the docs and the diff. Follow calls into the
  functions they land in and out to the callers that would break. Docs describe intent;
  the code is what ships.
- **Run it.** Tests, type checker, linter, build — whatever the app has. Report what you
  ran and what it printed.
- **Prove anything you claim is broken.** A suspected bug gets executed, reproduced, and
  reported with the failing output or the exact inputs that trigger it. If you can't
  reproduce it, say so and label it unverified rather than filing it as a finding.
- **Say what you didn't check.** Paths you skipped, things you couldn't run, assumptions
  you made. A review that hides its own gaps reads as coverage it doesn't have.

Findings go in severity order, and "no real problems found" is a valid result — don't pad
a review with style nits to look thorough.
