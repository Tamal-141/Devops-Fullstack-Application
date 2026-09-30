# ShopLite

A deliberately small e-commerce app whose real purpose is to exercise a full
CI/CD pipeline: Jenkins → Docker Hub → EC2 (ARM). Decisions and reasoning live in
[PLAN.md](PLAN.md).

## Branching

```
main  ← always deployable; only updated through PRs
  └── feature/<name>  ← one branch per stage/feature, PR back into main
```

- `feature/*` branches: CI only (lint, tests, build, e2e).
- `main`: CI + push images to Docker Hub + deploy to EC2.

## Build stages

The repo is built up one stage at a time, each as its own PR:

| # | Branch | Adds |
|---|---|---|
| 0 | `main` (initial commit) | docs, `.gitignore` |
| 1 | `feature/backend` | Express API, migrations, Jest tests, Dockerfile |
| 2 | `feature/ci-pipeline` | Jenkinsfile: lint → test → build (multibranch job) |
| 3 | `feature/compose-db` | MySQL + `docker-compose.yml`, health check in CI |
| 4 | `feature/frontend` | React + nginx reverse proxy |
| 5 | `feature/e2e` | Playwright E2E stage |
| 6 | `feature/deploy` | Prod compose, EC2 setup, push + deploy stages |

## CI (Jenkins)

[Jenkinsfile](Jenkinsfile) runs every stage on the `centos-agent` (label `centos`):

| Stage | What it does |
|---|---|
| Checkout | `checkout scm`, short SHA → `IMAGE_TAG`, checks Docker + buildx exist |
| Lint | `docker build --output type=cacheonly --target lint backend` |
| Unit tests | `docker build --output type=cacheonly --target test backend` |
| Build images | builds `shoplite-backend:<sha>`, then smoke-tests it: with no config it must exit 1 with `invalid configuration` |
| post | removes the build's image, deletes the workspace |

### Job setup (one time)

The job **must be a Multibranch Pipeline** — `when { branch 'main' }` in later stages
relies on `BRANCH_NAME`, which only multibranch jobs set.

1. **Credential** — GitHub fine-grained PAT, repo `Devops-Fullstack-Application` only,
   permissions *Contents: Read*, *Commit statuses: Read and write*, *Pull requests: Read*
   (Metadata: Read is added automatically). In Jenkins: *Manage Jenkins → Credentials →
   System → Global → Add*: kind **Username with password**, username `Tamal-141`,
   password = the PAT, ID **`github-pat`**.
2. **Job** — *New Item* → name `shoplite` → **Multibranch Pipeline**.
3. **Branch Sources → Add source → GitHub**: credentials `github-pat`, repository URL
   `https://github.com/Tamal-141/Devops-Fullstack-Application`. Keep the default
   behaviours (discover branches + PRs from origin).
4. **Scan Multibranch Pipeline Triggers** → *Periodically if not otherwise run* →
   **2 minutes**. This is the multibranch equivalent of Poll SCM: each scan finds new
   branches/PRs and builds whatever changed.
5. Save. Jenkins scans immediately and starts a build for each branch with a Jenkinsfile.

Why the GitHub source and not plain Git: it scans through the GitHub API from Java on
the controller, so the controller's broken native binaries are never used; the actual
`git clone` happens on the agent. It also posts ✅/❌ back onto each PR — which is why
the PAT needs *Commit statuses: write*. Authenticated API calls get 5000 requests/hour;
anonymous gets 60, which a 2-minute scan would exhaust.

## Backend (`backend/`)

Node 20 + Express 5, mysql2 pool, zod, JWT + bcrypt. On startup it waits for MySQL,
applies `migrations/*.sql` (each once, tracked in `schema_migrations`), upserts the
seed user, then listens on `:3000`.

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /api/health` | — | Runs `SELECT 1`. `200 {db:"up", version}` or `503 {db:"down"}` |
| `GET /api/products` | — | All products |
| `GET /api/products/:id` | — | One product, `404` if missing |
| `POST /api/auth/login` | — | `{email, password}` → `{token, user}`. Rate limited per IP |
| `POST /api/orders` | Bearer | `{productId, quantity}`; price is taken from the DB |

Configuration is environment-only; the process exits at startup listing any missing
or invalid variable (names only, never values):

| Variable | Required | Default |
|---|---|---|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | yes | — |
| `JWT_SECRET` | yes, ≥ 32 chars | — |
| `SEED_USER_EMAIL`, `SEED_USER_PASSWORD` | together or not at all | — |
| `DB_PORT` / `PORT` | no | `3306` / `3000` |
| `JWT_EXPIRES_IN` | no | `1h` |
| `AUTH_RATE_LIMIT_MAX` | no | `10` logins per IP per 15 min |
| `LOG_LEVEL` | no | `info` |
| `CORS_ORIGIN` | no | off (traffic is same-origin via nginx) |
| `APP_VERSION` | set at image build | `dev` |

Checks, with Node on the host or through Docker (same commands CI will use):

```bash
cd backend && npm ci && npm run lint && npm test

docker build --target lint backend
docker build --target test backend
docker build --target runtime -t shoplite-backend:dev backend
```
