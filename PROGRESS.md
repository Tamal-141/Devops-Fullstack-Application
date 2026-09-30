# ShopLite — progress aur app kaise chalayein

Ye file batati hai ki **ab tak kya bana**, **website kaise chala ke dekhein**, aur
**aage kya bacha hai**.

- Faisle aur unka "kyun" → [PLAN.md](PLAN.md)
- Technical reference (endpoints, env vars, Jenkins job setup) → [README.md](README.md)

_Last updated: 30 Sep 2026._

---

## 1. Status

| Stage | Branch | Kya bana | Status |
|---|---|---|---|
| 0 | `main` | `PLAN.md`, `.gitignore` | ✅ merged |
| 1 | `feature/backend` | Express API (health, products, login, orders), MySQL migrations, 31 Jest tests, multistage Dockerfile | ✅ merged (PR #1) |
| 2 | `feature/ci-pipeline` | Jenkinsfile: Checkout → Lint → Unit tests → Build image → smoke test | ✅ merged (PR #2) |
| 3 | `feature/compose-db` | docker-compose (MySQL + backend), low-memory MySQL config, `.env.example`, API smoke test, Jenkins Integration stage | ✅ merged (PR #3) |
| 4 | `feature/frontend` | React website + nginx (`/api` proxy, SPA fallback), compose me frontend, CI me frontend lint/build | ✅ merged (PR #4) |
| — | — | **Jenkins job + pehla asli build** | ⬜ baaki |
| 5 | `feature/e2e` | Playwright browser tests | ⬜ baaki |
| 6 | `feature/deploy` | Docker Hub push + EC2 deploy + `curl /api/health` | ⬜ baaki |

Har stage ek hi tareeke se bana: `feature/*` branch → PR → `main` me merge
("Create a merge commit", squash nahi).

---

## 2. Kya bana — short me

```
Browser ──► nginx (frontend) ──/api──► backend (Node/Express) ──► MySQL
            port 8080 (sirf yahi       port 3000                   port 3306
            bahar khula hai)           (sirf Docker network pe)    (sirf Docker network pe)
```

| Hissa | Kahan | Kya karta hai |
|---|---|---|
| **Backend** | `backend/` | 4 API endpoints. Startup pe: DB ka wait → migrations → demo user → tab traffic lena. Config galat ho to start hi nahi hota (exit 1). |
| **Database** | `backend/migrations/`, `db/my.cnf` | 3 tables (products, users, orders) + 6 products. MySQL 2 GB box ke hisaab se tuned (~140 MiB RAM). |
| **Frontend** | `frontend/` | React website: product list, product page + order, login, order confirmation. Footer me live backend version + DB status. |
| **nginx** | `frontend/nginx.conf` | Website serve karta hai, `/api` backend ko bhejta hai, refresh pe 404 nahi aane deta. |
| **Compose** | `docker-compose.yml` | Teeno containers ek command se, sahi order me (MySQL healthy → backend → frontend). |
| **Smoke test** | `scripts/api-smoke.sh` | Asli HTTP requests: page, assets, API, login, order. 12 checks. |
| **CI** | `Jenkinsfile` | Lint → tests → images build → poora stack uthake smoke test → saaf-safai. |

### "Up ≠ working" project me kahan-kahan hai

- `/api/health` asli `SELECT 1` chalata hai. DB down ho to **503** deta hai, chahe process "Up" ho.
- MySQL ka healthcheck asli login karta hai, sirf `ping` nahi.
- CI me image build hone ke baad use chala ke dekha jaata hai (smoke test). "Built" ≠ "works".

### Raaste me pakde gaye bugs

| Bug | Kaise pakda | Fix |
|---|---|---|
| Migration code folder ki har `.sql` file chala deta tha (Mac ki chhupi `._` files bhi) | Stack ko asli MySQL pe chalaya, backend crash-loop karne laga | Ab sirf `001_naam.sql` jaisi files chalti hain + test |
| Startup ke dauraan `docker stop` 10 sec atak ke 137 deta tha | Startup ke beech SIGTERM bhej ke dekha | Signal handler ab pehle hi register hota hai |
| CI ki lint/test builds har baar bekaar images chhod jaati thi | `docker images` me `<none>` images dikhi | `--output type=cacheonly` |

---

## 3. Website kaise chalayein aur dekhein

**Machine:** CentOS VM (`192.168.56.12`). Docker wahin hai. Mac pe Docker nahi hai, aur
`docker-lab` teri practice VM hai, isliye ShopLite ke liye use mat karna.

### Step 1 — VMs chalu karo (Mac, prompt `%`)

```bash
cd ~/Desktop/vms/docker-lab && vagrant halt     # agar chal rahi ho (RAM bachane ke liye)
cd ~/Desktop/vms/ubuntu && vagrant up           # Jenkins controller
cd ~/Desktop/vms/centos && vagrant up           # Jenkins agent + Docker
vagrant ssh                                     # centos folder me ho, to CentOS me jaoge
```

`vagrant ssh` usi VM me jaata hai jiske folder me tum khade ho.

### Step 2 — Code laao (CentOS, prompt `$`) — sirf pehli baar

```bash
git clone https://github.com/Tamal-141/Devops-Fullstack-Application.git shoplite
cd shoplite
```

Pehle se clone hai to: `cd ~/shoplite && git switch main && git pull`

### Step 3 — `.env` banao — sirf pehli baar

⚠️ Ye commands **ek-ek karke** paste karna. `vi` jaisa koi program beech me ho aur poora
block ek saath paste karo, to baaki lines us program me type ho jaati hain.

```bash
cp .env.example .env
```

```bash
sed -i \
  -e "s/^MYSQL_ROOT_PASSWORD=$/MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)/" \
  -e "s/^MYSQL_PASSWORD=$/MYSQL_PASSWORD=$(openssl rand -hex 16)/" \
  -e "s/^JWT_SECRET=$/JWT_SECRET=$(openssl rand -hex 32)/" \
  -e "s/^SEED_USER_PASSWORD=$/SEED_USER_PASSWORD=demo12345/" \
  .env
```

```bash
grep -E 'PASSWORD|SECRET' .env     # chaaron lines me = ke baad value honi chahiye
```

`.env` git me kabhi nahi jaata (gitignored). `demo12345` sirf local VM ke liye hai.

### Step 4 — Stack uthao

```bash
docker compose up -d --build --wait
docker compose ps                   # teeno "healthy"
```

Ye ek command: `mysql:8.4` pull karti hai, backend + frontend images build karti hai,
network + volume banati hai, aur containers sahi order me start karti hai. Pehli baar
3–5 minute; uske baad cache se jaldi.

Optional — 12 checks wala smoke test:

```bash
docker compose --profile test run --rm api-smoke
```

### Step 5 — Browser me dekho (Mac)

**http://192.168.56.12:8080**

Try karo:
1. Home pe 6 products → kisi pe click
2. **Log in to order** → `demo@shoplite.local` / `demo12345`
3. Login ke baad wapas usi product pe → quantity → **Place order**
4. "Order placed — Order #…" dikhega
5. Footer me hara dot + "database up"

### Step 6 — "Up ≠ working" khud dekho

```bash
docker compose stop mysql     # page refresh karo: footer laal, jabki nginx aur backend "Up" hain
docker compose start mysql    # wapas normal
```

### Step 7 — Band karna

```bash
docker compose down           # containers hate, data (orders) BACHA rehta hai
```

⚠️ `docker compose down -v` **DB ka saara data mita deta hai** (volume delete). Sirf tab
jab jaan-bujh ke fresh start chahiye.

### Kaam ki commands

| Kaam | Command |
|---|---|
| Status / health | `docker compose ps` |
| Backend logs | `docker compose logs -f backend` |
| nginx logs | `docker compose logs -f frontend` |
| DB me query | `docker compose exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'` |
| Code update ke baad dobara | `git pull && docker compose up -d --build --wait` |

### Naam kahan se aate hain (command me koi naam nahi diya, phir bhi)

Sab `docker-compose.yml` se:

| Cheez | Naam |
|---|---|
| Project | `shoplite` (`name:` line) |
| Images | `shoplite-backend:dev`, `shoplite-frontend:dev` (`mysql:8.4` pull hoti hai) |
| Containers | `shoplite-mysql-1`, `shoplite-backend-1`, `shoplite-frontend-1` |
| Network | `shoplite_default` |
| Volume | `shoplite_mysql-data` |

Service ka naam network pe DNS naam bhi hai — backend `mysql` naam se DB dhoondhta hai,
nginx `backend` naam se backend.

### localhost kyun nahi, IP kyun?

`localhost` = **wahi machine jahan browser chal raha hai**. Browser Mac pe hai, app CentOS
VM me — alag machine. Isliye Mac se VM ka IP likhna padta hai. CentOS ke andar
`curl localhost:8080` chal jaayega.

**Office jaisa localhost pe UI (hot reload ke saath)** — CentOS pe stack chalte hue, Mac pe:

```bash
cd ~/Projects/shoplite/frontend
npm ci
API_TARGET=http://192.168.56.12:8080 npm run dev
```

→ **http://localhost:5173**. UI Mac se, API VM ke backend se.

---

## 4. Aage kya

1. **Jenkins job banana + pehla asli build** — README ka "Job setup" section. Ab tak
   Jenkinsfile ke steps haath se chala ke test hue hain, Jenkins ke andar nahi.
2. **Stage 5 — E2E (Playwright)** — pehle CentOS ki RAM ~3 GB karni hai (abhi 1.6 GiB;
   Vagrantfile me `memsize` set nahi hai).
3. **Stage 6 — Deploy** — Docker Hub, EC2 `t4g.small` launch, prod compose, `main` pe
   auto-deploy + `curl /api/health`.

### Practice: Docker files khud se likhna

Branch `practice/docker-from-scratch` pe `Dockerfile`s, `.dockerignore`s aur
`docker-compose.yml` hata ke dobara likhna. `main` ko nahi chhedna. Original kabhi bhi:
`git show main:docker-compose.yml`.

| Round | Likhna | Pass kab |
|---|---|---|
| 1 | `backend/Dockerfile` (single-stage) | Bina env ke `docker run` → `invalid configuration` + exit 1 |
| 2 | `backend/.dockerignore` | `node_modules` build context me na jaaye |
| 3 | compose: sirf mysql | `docker compose ps` me `healthy` |
| 4 | compose: + backend | logs me `migrations up to date` → `listening` |
| 5 | backend Dockerfile multistage (`lint`/`test`/`runtime`) | `docker build --target test backend` → 31 tests pass |
| 6 | `frontend/Dockerfile` (Node build → nginx) | `nginx -t` OK |
| 7 | compose: + frontend, volume, memory limits | website + smoke test 12/12 |

Jenkinsfile target names (`lint`, `test`, `runtime`) aur service names (`mysql`,
`backend`, `frontend`) use karti hai — apna version kabhi `main` me laana ho to yahi
naam rakhna.

---

## Machines — quick reference

| Machine | IP | Kaam |
|---|---|---|
| Mac | — | Code likhna (VS Code), `git push`, `vagrant` commands |
| Ubuntu VM | `192.168.56.11` | Jenkins controller — UI: `http://192.168.56.11:8080` |
| CentOS VM | `192.168.56.12` | Jenkins agent + Docker — ShopLite yahin chalta hai |
| docker-lab VM | `192.168.56.13` | Sirf personal Docker practice |
| EC2 `t4g.small` | (har start pe naya DNS) | Production — Stage 6 me |
