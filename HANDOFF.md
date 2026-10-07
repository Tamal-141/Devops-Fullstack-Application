# ShopLite — session handoff (for a new Claude Code chat)

Written 7 Oct 2026, end of a long session (25 Sep → 7 Oct). Start the new chat **inside
`~/Projects/shoplite`** so `CLAUDE.md` loads automatically. Passwords/credentials are only in
`CLAUDE.md` (gitignored) — never copy them into tracked files.

**First message to paste in the new chat:**

> Pichhle session ka poora handoff `HANDOFF.md` me hai. CLAUDE.md, HANDOFF.md, PROGRESS.md aur
> CONCEPTS.md padho, phir mujhe 5 line me batao ki project kahan hai aur agla kaam kya hai.
> Code ya VMs ko abhi kuch mat chhedna.

---

## 1. The user and how to work with them

- Learning DevOps from zero (TrainWithShubham / LondheShubham153 YouTube). QA background,
  comfortable in a terminal, new to Linux internals. Goal: **understand concepts**, not copy
  commands. Explain the "why", correct wrong mental models.
- **Reply in Hinglish**, short and simple. When they say "in short" — really short. Tables work
  well. Go long only where a concept needs it.
- Observed patterns — design answers around them:
  - **Placeholders get pasted literally** (`xxxx`, `<ngrok-address>`, `$YOUR_AUTHTOKEN`). Always
    give the real value when known; otherwise say clearly "ye placeholder hai, `< >` samet hatao".
  - Types into **search boxes** instead of the address bar / "+ Add" buttons.
  - Pastes multi-line blocks that include **interactive programs** (`vi`) → give one command per
    block around such programs.
  - Often on the **wrong machine** → always mark commands `%` (Mac) or `$` (VM) and name the VM.
  - Tutorials show **older UIs** (e.g. Jenkins Role Strategy plugin renamed "Manage and Assign
    Roles" → "Role Management"). Map old → new.
  - Shares screenshots/terminal output — read them closely, the answer is usually in there
    (response headers, prompts, error codes).
- Wants revision notes: **update `CONCEPTS.md` after every new concept/incident** (each concept
  + "project me kahan dikha" + debugging-log row). Runbooks: short and simple.
- Currently in **learning mode**: watching the TrainWithShubham "DevOps Mega Project" (Terraform,
  Jenkins + Trivy/OWASP/SonarQube/Mail, EKS, ArgoCD, Prometheus/Grafana). They want doubts
  cleared **using ShopLite examples**; implementation in ShopLite comes later.

## 2. Machines (details + credentials in CLAUDE.md)

| Machine | IP | Role | Notes |
|---|---|---|---|
| Mac | — | code, git push, `vagrant` | arm64, 8 GB → **max 2 VMs at once**. No Docker. Node 22 available |
| `ubuntu` VM | .56.11 | Jenkins **controller** (ShopLite) | 20.04, ~714 MiB RAM (no `memsize` in Vagrantfile), curl/wget SIGILL |
| `centos` VM | .56.12 | Jenkins **agent** + Docker (ShopLite build/test) | 1.6 GiB RAM; `/home` small partition; `vagrant` user now in `docker` group |
| `docker-lab` VM | .56.13 | user's **personal practice** (Docker + practice Jenkins 2.580.1) | **Claude must not run anything here** (explicit user instruction) |
| `docker-lab-agent` VM | .56.14 | practice Jenkins agent | Vagrantfile written by Claude (1.5 GB, blank Ubuntu 24.04); user sets it up by hand |

- Claude's Bash sandbox **cannot reach `192.168.56.x`** directly. Reach a VM via
  `vagrant ssh-config > file` + `ssh -F file default`; for browser checks use `ssh -L` tunnels +
  headless Chrome (`--user-data-dir` in scratchpad; never name a zsh variable `path`).
- Public internet (GitHub API, Docker Hub API, ngrok URL) **is** reachable from the sandbox.
- Old EC2 `devops-practice` — stopped, **never terminate**. New ShopLite EC2 — **not launched yet**.

## 3. ShopLite — goal and fixed decisions

Small e-commerce app whose real purpose is to learn a full CI/CD pipeline
(Jenkins → Docker Hub → EC2 ARM). Decisions in `PLAN.md` / `CLAUDE.md` — **don't reopen them**.
Don't suggest app features (signup, cart, search…) until the pipeline is done.

## 4. What is built — `main` = `4b7dd9a`

PRs #1–#6 all merged ("Create a merge commit"), no open PRs, only `main` on the remote.

| PR | Branch | Content |
|---|---|---|
| #1 | feature/backend | Express 5 API: `/api/health` (real `SELECT 1`, 503 if DB down, returns `version`), products, login (JWT HS256 + bcryptjs, per-IP rate limit, `trust proxy 1`), orders (price from DB). zod 4 env config, fail-fast, names-only errors. Migrations run on startup, tracked in `schema_migrations`, `GET_LOCK`, **only `NNN_name.sql`**. Seed user from `SEED_USER_*`. 31 Jest tests (fake pool). Dockerfile targets `base/dev-deps/lint/test/prod-deps/runtime`, `USER node`, exec-form CMD, SIGTERM handler registered before startup |
| #2 | feature/ci-pipeline | Jenkinsfile (Multibranch, every stage `agent { label 'centos' }`) |
| #3 | feature/compose-db | `docker-compose.yml`: `mysql:8.4` + `db/my.cnf` (128M buffer pool, perf schema off, 50 conns), TCP-login healthcheck, named volume, backend no ports, `${VAR:?}` for secrets, `api-smoke` service (profile `test`, `curlimages/curl:8.22.0`, `scripts/api-smoke.sh`). `.env.example` |
| #4 | feature/frontend | React 19 + Vite 8 + React Router **7** (v8 needs Node 22) + Tailwind 4 → `nginx:1.30-alpine`. nginx: `/api/` proxy via `resolver 127.0.0.11` + variable `proxy_pass` (survives backend IP change), SPA fallback, hashed-asset caching, `/healthz`. Frontend is the only published port (`FRONTEND_PORT`, default 8080, CI uses `0`) |
| #5 | docs/progress | `PROGRESS.md` (status + run-it-locally steps, Hinglish) |
| #6 | feature/ui-refresh | Gradient design + 6 SVG product illustrations `frontend/src/assets/products/<slug>.svg` |

**Jenkinsfile stages now:** Checkout (`IMAGE_TAG` = short SHA, `COMPOSE_PROJECT_NAME` =
`shoplite-ci-<branch>`, tool checks) → Lint (`--output type=cacheonly`, backend + frontend) →
Unit tests → Build images (backend smoke: must exit 1 with `invalid configuration`; frontend
`nginx -t`) → Integration (random `.env` via `openssl`, `set +x`, `compose up --no-build --wait`,
api-smoke 12 checks through nginx, `compose.log` archived) → post (`down -v` **only** for
`shoplite-ci-*`, remove images, `deleteDir()`).
**Not yet:** E2E, Push, Deploy.

**Verification so far:** Jenkinsfile `sh` steps were extracted and run in order on docker-lab
(before the ban) — all passed; headless Chrome screenshots looked right. **No build has ever run
inside real Jenkins.** User ran the stack on CentOS and saw it at `http://192.168.56.12:8080`.

## 5. Docs in the repo

| File | Tracked? | Content |
|---|---|---|
| `PLAN.md` | yes | decisions + reasons |
| `README.md` | yes | endpoints, env vars, CI table, Jenkins job setup, run-locally |
| `PROGRESS.md` | yes | status + run steps (Hinglish) |
| `CONCEPTS.md` | yes (PR `docs/notes`) | revision notes + debugging log — keep updating |
| `WEBHOOK-RUNBOOK.md` | yes (PR `docs/notes`) | GitHub webhook → Jenkins with ngrok, short steps + errors |
| `HANDOFF.md` | yes (PR `docs/notes`) | this file |
| `CLAUDE.md` | gitignored | context + credentials |

## 6. Jenkins practice done on docker-lab (by the user, guided)

- Jenkins via apt with the **2026** signing key (`jenkins.io-2026.key`; tutorials' 2023 key fails).
- **GitHub webhook working end-to-end** (7 Oct) on fork `Tamal-141/django-notes-app`:
  ngrok 3.39.11, fixed free domain `runway-ligament-stoop.ngrok-free.dev`, traffic policy
  `~/webhook-only.yml` (only `/github-webhook/` passes, rest 404 — user kept a weak password, so
  this is the protection), alias `ngrok-webhook`, shared-secret credential ID
  `github-webhook-secret` (description "practice"), job `webhook-test` (inline pipeline,
  `agent any`). ngrok dies with the SSH session → `ERR_NGROK_3200`.
- Fork's own Jenkinsfile needs `@Library('Shared')` + `label 'dev-server'` — not configured.
- **Role-based Authorization Strategy** installed ("Role Management"). Roles: `admin`, `viewer`
  (Overall/Read + Job/Read), `Test` (had Administer — advised to delete). Users Test/Test123.
  `viewer` was assigned to `authenticated` **and `anonymous`** — advised to remove from anonymous.
- Concepts covered: polling vs webhook (+ both together), private vs public IP (why the YouTuber
  needed no ngrok — EC2 public IP), least privilege / least exposure, `docker login
  --password-stdin` + access token, `read -s`, `history -d`, apt signing keys, user vs group.

## 7. Git / GitHub workflow

- Repo `Tamal-141/Devops-Fullstack-Application`. Identity set **locally** in this repo.
  Remote URL includes `Tamal-141@`; push from **Terminal.app** (VS Code is logged into another
  GitHub account); keychain holds the PAT. `GIT_TERMINAL_PROMPT=0 git push` works from Claude.
- `gh` is **not** logged in → give prefilled PR links:
  `https://github.com/Tamal-141/Devops-Fullstack-Application/compare/main...<branch>?expand=1&title=…&body=…`
- One `feature/*` branch per stage → PR → merge commit → delete branch. Commit messages end with
  the Co-Authored-By attribution line.
- Docker Hub username **`tamal143`** (no repos yet). Push will use credential `dockerhub-creds`
  (username + access token), username read from the credential, never hardcoded.

## 8. Next steps (in order)

1. **Now:** learning mode — clear doubts from the Mega Project tutorial using ShopLite examples.
2. Make sure the `docs/notes` PR (CONCEPTS.md + WEBHOOK-RUNBOOK.md + HANDOFF.md) is merged;
   then `git switch main && git pull` and delete the local branch.
3. **ShopLite Jenkins job** on the Ubuntu controller: Multibranch, GitHub branch source,
   credential `github-pat`, periodic scan 2 min (polling — controller is host-only). First real
   CI build. Check CLAUDE.md "Jenkins env gotchas" first (boot CentOS before Ubuntu, clock skew,
   small `/home`).
4. **Stage 5 — E2E:** Playwright in `mcr.microsoft.com/playwright:v1.63.0-noble` (version must
   match `@playwright/test`), copy reports out with `docker cp` (not bind mounts → root-owned
   files), publishHTML + junit. **Before:** raise CentOS RAM to ~3 GB (`vmware.vmx["memsize"]`).
5. **Stage 6 — Deploy:** launch EC2 `t4g.small` (arm64 AMI!), `docker-compose.prod.yml`,
   `scripts/ec2-setup.sh` (Docker, 2 GB swap, `.env` with random secrets), Push stage
   (`when { branch 'main' }`), Deploy stage (`EC2_HOST` parameter, SSH, compose pull/up,
   external `curl /api/health` must return the new `version`), image prune.
6. Later (Mega Project order): DevSecOps stages in ShopLite (Trivy → OWASP Dependency-Check →
   SonarQube → mail) → Terraform for the EC2 → local k3s → ArgoCD → Prometheus/Grafana → EKS for
   one day then `terraform destroy`. **EKS ≈ $0.10/hr (~$73/month) vs $108 credits**; SonarQube
   ~2 GB RAM — one heavy tool at a time on the Mac.
7. Optional: `practice/docker-from-scratch` — user rewrites Dockerfiles/compose in 7 rounds
   (table in `PROGRESS.md`).

## 9. Hard rules

- **Never run anything in docker-lab** (user's practice VM).
- Never terminate the old EC2. Warn before destructive commands (`down -v`, `volume rm`,
  `vagrant destroy`, repo delete).
- No secrets in tracked files. CLAUDE.md stays gitignored.
- Don't mention the user's day-job repos.
- Code must actually work — no placeholders/TODOs. Verify before claiming.
- Versions move: check current docs before giving install commands (Jenkins apt key rotated in
  2026, ngrok free domains are `.dev`, Jenkins plugin UIs renamed). Don't trust tutorial
  commands blindly.
- Prune commands (`docker system/network prune`) remove **everything** unused — remove only your
  own resources, by name.
