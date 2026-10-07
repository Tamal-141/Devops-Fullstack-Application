# Concepts — revision notes

ShopLite banate waqt jo concepts aaye, unka short note + **is project me kahan dikha**.
Free time me revise karne ke liye. Har naye stage ke saath isme jodte rahenge.

- Project status → [PROGRESS.md](PROGRESS.md)
- Faisle aur "kyun" → [PLAN.md](PLAN.md)
- GitHub webhook → Jenkins, step-by-step + errors → [WEBHOOK-RUNBOOK.md](WEBHOOK-RUNBOOK.md)

_Last updated: 2 Oct 2026._

---

## 1. Git

### Branch = sirf ek label

Branch code ki copy **nahi** hai — ek naam jo kisi commit ki taraf ishaara karta hai.
PR merge hone ke baad branch ka kaam `main` me aa jaata hai; branch delete karne se code
nahi jaata, sirf label hatta hai. (Galti se hataya → PR page pe "Restore branch".)

> Project me: 6 merged branches GitHub pe padi thi. Jenkins Multibranch har branch ka job
> banata — isliye Jenkins setup se pehle delete ki.

### Staging area (index) — `git commit` POORA index commit karta hai

`git add X` index me X jodta hai; jo pehle se staged hai wo bhi wahin rehta hai.
`git commit` sab kuch le leta hai — sirf abhi wali files nahi.

> Project me: `git add .` ke baad CLAUDE.md (password ke saath) staged tha. Baad me
> `git add .gitignore PLAN.md` kiya → commit me phir bhi 32 files gayi.
> **Aadat:** `git add` me file ke naam do, commit se pehle `git status` dekho.

### `.gitignore` sirf **untracked** files pe lagta hai

Jo file ek baar track (index me) ho gayi, uspe ignore rule nahi lagta. Pehle
`git rm --cached <file>` (index se nikalo, disk pe rehti hai), tab ignore kaam karega.

### Pehle commit se pehle sab undo — `git reset`

Branch par abhi koi commit nahi ("unborn") ho to `git reset` poora index khaali kar deta
hai, files disk pe safe. `git rm -r --cached .` yahan fail ho sakta hai — agar koi file
`AM` (staged + baad me modified) ho, git use data loss maan ke **saari** files pe mana
kar deta hai (atomic).

### `fetch` vs `pull` vs `switch`

| Command | Kya karta hai | Files badalti hain? |
|---|---|---|
| `git fetch` | GitHub se naye commits/branches **download** (`origin/*` update) | Nahi |
| `git switch X` | Folder ki files X branch ke version se badlo | Haan |
| `git pull` | fetch + current branch me merge | Haan |

Clone ek **snapshot** hai — git khud GitHub se sync nahi karta. Clone ke baad bani branch
pe `switch` karne se pehle `fetch` zaroori (`fatal: invalid reference` warna).
`git branch -r` = local repo ko GitHub ki kaunsi branches pata hain.

### Merge commit vs squash, revert vs reset

- **Merge commit** — branch ke commits jaise ke taise `main` me + ek merge commit. Stacked
  branches (ek branch dusri ke upar bani) ke saath yahi safe hai.
- **Squash** — saare commits ek naye commit me; stacked branch ka diff kharab ho jaata hai.
- **Revert** — naya commit jo pichhla change ulta karta hai. History safe. Tab karo jab
  `main` me kuch **toota** ho.
- **Reset** — history ko peeche le jaata hai. Pushed branch pe mat karna.

### Identity: `--global` vs local

`git config user.email` (bina `--global`) = sirf is repo ke liye. Office aur personal
repos ki identity alag rakhne ka yahi tareeka. GitHub commit ko **email** se account se
jodta hai, `user.name` sirf label hai.

> Gotcha: `git config user.emai` (typo) ya `user.name"X"` (space missing) → **koi error
> nahi**, bas khaali output. Khaali output ≠ "set nahi hai".

### Branching strategy: `feature/*` → `main`

Office me qa/dev/main isliye hote hain kyunki **har branch ke peeche alag server** hota
hai. Ek hi environment ho to extra branches = bas extra merge.
**Build once, promote:** jo image test hui, wahi exact image (same git SHA tag) deploy
ho — har branch pe dobara build karne se tested aur deployed cheez alag ho jaati hai.

### GitHub auth

- Push ke liye password nahi, **PAT** (fine-grained, sirf zaroori repo + permission).
- Remote URL me username (`https://Tamal-141@github.com/...`) → keychain usi account ka
  credential deta hai, dusre account ka nahi.
- VS Code ka terminal VS Code ke logged-in account ka token de deta hai — galat account ho
  to Mac ka normal Terminal use karo.
- **Secret ek baar push hua to history me hamesha ke liye** — file baad me hatane se nahi
  jaata. Push se pehle pakdo.

---

## 2. Linux & shell

### Kaunsi machine pe ho? Prompt dekho

`%` = Mac (zsh), `$` = Linux VM. `vagrant` commands Mac pe, VM ke folder me.

### Groups aur `docker.sock`

Docker ka socket sirf root + `docker` group ke liye. `permission denied ... docker.sock`
= user group me nahi.
`sudo usermod -aG docker <user>` — **`-a` zaroori** (warna baaki groups hat jaate hain).
Naya group sirf **naye login/process** ko milta hai → logout/login, ya service restart.
⚠️ docker group = root ke barabar (`docker run -v /:/host`).

> Project me: CentOS pe `jenkins` user group me tha, `vagrant` nahi → `vagrant` se
> `docker compose ps` pe permission denied.

### Interactive program wala block paste mat karo

Block me `vi`, `mysql`, `vagrant ssh` jaisa kuch ho to uske baad ki lines **us program me**
type ho jaati hain. vi me har akshar command hai → ajeeb windows (`E11`).
Bahar: `Ctrl+C`, phir `:q!` (save kiye bina quit).

### Placeholders — "yahan apni value daalo"

Docs/instructions me `xxxx`, `<ngrok-address>`, `<token>`, `$YOUR_AUTHTOKEN` = asli value
ki jagah ishaara. `< >` samet hatao. `$BADE_AKSHAR` = shell variable — set nahi kiya to
**khaali** ban jaata hai (`ngrok ... $YOUR_AUTHTOKEN` → "accepts 1 arg, received 0").
`xxxx.ngrok-free.app` kholo to ngrok bolega "endpoint offline" (`ERR_NGROK_3200`).

### `systemctl`

`start` / `stop` / `restart` / `status` (pager — `q` se bahar) / `enable` (boot pe auto-start)
/ `disable`. `vagrant halt` = graceful shutdown → systemd har service ko khud band karta hai.

### `localhost` = wahi machine jahan command/browser chal raha hai

Browser Mac pe, app VM me → Mac se VM ka IP. VM ke andar `curl localhost:8080` chalega.
Container ke andar `localhost` = wahi container.

### zsh gotcha

zsh me `path` variable `PATH` se juda hai — `path=/x` likha to `rm`, `sleep` jaise
commands milna band. Variable ka naam `path` mat rakho.

---

## 3. VMs, Vagrant, networking

```
Mac (asli hardware)
└── VMware Fusion
    ├── ubuntu      192.168.56.11  Jenkins controller
    ├── centos      192.168.56.12  Jenkins agent + Docker (ShopLite)
    ├── docker-lab  192.168.56.13  practice
    └── docker-lab-agent .14       practice agent
```

- Har VM **alag computer**, alag IP. Isliye do VMs me same port (8080) chal sakta hai.
- **Host-only network** (`192.168.56.x`) sirf Mac ke andar hai — dusre laptop se nahi khulega.
- **Private vs public IP:** `192.168.x.x`, `10.x.x.x`, `172.16–31.x.x` = private (internet
  se nahi dikhta). EC2 ka `3.19.59.251` jaisa = public. GitHub webhook ko **public** chahiye
  — isliye VM pe ngrok, EC2 pe seedha.
- Folder = VM. `vagrant up/halt/ssh` usi VM pe jiske folder me khade ho.
- `halt` = shutdown (data safe). `destroy` = VM ki disk delete ⚠️.
- Vagrantfile me `memsize` na ho to VM ko **box author ki default RAM** milti hai
  (Ubuntu VM ko isi wajah se sirf ~714 MiB mila).
- Mac 8 GB → ek waqt pe max 2 VMs.
- Container ke liye **Linux kernel** chahiye (namespaces + cgroups). Mac pe Docker Desktop
  bhi andar ek Linux VM chalata hai. Folder sirf files rakhta hai, commands VM chalati hai.

---

## 4. Docker

### Image vs container

Image = template (class), container = chalta hua roop (object). Image build hoti hai
(Dockerfile se) ya pull (Docker Hub se). ShopLite: 2 build (backend, frontend) + 1 pull
(`mysql:8.4`) → 3 containers.

### Build context aur `.dockerignore`

`docker build backend` → `backend/` folder poora daemon ko jaata hai. `.dockerignore`
se bahar rakho:
- `node_modules` — Mac ke darwin binaries Linux image me chale jaate
- `.env` — secret image layer me hamesha ke liye
- `._*`, `.DS_Store` — Mac metadata

> Project me: Mac ke `tar` ne `._001_init.sql` banaya; image me gaya; backend ne use SQL
> samajh ke chalaya → `ER_PARSE_ERROR`, crash-loop. Fix: migrations sirf `NNN_name.sql`.

### Multistage + `--target`

Ek Dockerfile, kai stages: `lint`, `test`, `runtime`. BuildKit sirf wahi stages banata
hai jo target ke liye zaroori — `--target runtime` pe lint/test chalte hi nahi.
Frontend: Node stage me build, final image me sirf nginx + `dist/` — Node ship nahi hota.

`--output type=cacheonly` — sirf pass/fail chahiye to image mat banao (warna har build
`<none>` images chhodta hai).

### Layer cache

Pehle `package.json` + lockfile copy, phir `npm ci`, phir baaki code → code badla to
`npm ci` cache se. `ARG APP_VERSION` sabse **end** me — har commit pe badalta hai, uske
baad ki har layer rebuild hoti hai.

### PID 1 aur signals

`CMD ["node", "src/server.js"]` (exec form) → node PID 1 → SIGTERM seedha milta hai.
`npm start` beech me ho to signal theek se nahi pahunchta.
PID 1 ka **koi default signal handling nahi** — app me SIGTERM handler chahiye, warna
`docker stop` 10 sec wait karke SIGKILL → exit **137**. Graceful = **143/0**.

> Project me: handler `listen()` ke baad register hota tha → DB ke wait ke dauraan stop
> pe 137. Fix: handler sabse pehle.

### Architecture + native modules

Image arch-specific. Lockfile me Alpine ARM ke native bindings (`linux-arm64-musl`) hone
chahiye (rolldown, lightningcss, tailwind oxide) — warna Mac pe `npm ci` chalega, image
me fail. Pure-JS packages (`bcryptjs`) ye jhanjhat hi nahi laate.

### `docker login` bina password dikhaye

Password nahi, **Docker Hub access token** (sirf Docker ke liye, kabhi bhi revoke).

```bash
read -s DOCKERHUB_TOKEN                                   # paste, screen/history me nahi
echo "$DOCKERHUB_TOKEN" | docker login -u <user> --password-stdin
unset DOCKERHUB_TOKEN
```

- `docker login -p <token>` ❌ — shell history + `ps aux` me sabko dikhta hai.
- `--password-stdin` — token pipe se jaata hai, command line me nahi.
- Login ke baad `~/.docker/config.json` me token **sirf base64** hai (encrypted nahi) →
  kaam khatam, `docker logout`.
- Jenkins: `withCredentials` + **single-quoted** `sh '...'` — double quotes me Groovy
  secret ko command me bhar deta ("insecure interpolation" warning). Log me `****`.

### Chhoti baatein

- `USER node` — container root na ho.
- Chalte container ki image delete nahi hoti (`docker images` me `U` = in use).
- `docker system prune`, `network prune` — **sab** unused cheezein, sirf tumhari nahi.
  Naam se hatao.

---

## 5. Docker Compose

### Naam file se aate hain

`name: shoplite` + service `backend` → container `shoplite-backend-1`, network
`shoplite_default`, volume `shoplite_mysql-data`. Service ka naam = network pe **DNS naam**
(`DB_HOST: mysql`, nginx → `http://backend:3000`).
`COMPOSE_PROJECT_NAME` env var `name:` se upar — CI me har branch ka alag project.

### `.env` aur interpolation

- `${VAR:?message}` — VAR khaali/missing → compose **start hi nahi hota**. Khaali password
  wala MySQL chupchaap start ho, usse behtar.
- `${VAR:-default}` — default value.
- `$$` = container ke shell ke liye literal `$` (warna compose `.env` se bhar deta).

### `depends_on` + healthcheck

`condition: service_healthy` → MySQL healthy → backend → frontend.

> Trap: MySQL image pehli baar ek **temporary server** (networking off) chalata hai users
> banane ke liye. `mysqladmin ping` socket pe usi waqt pass → healthy bahut jaldi. Isliye
> healthcheck = **TCP (`127.0.0.1`) pe asli login** app ke user se.

### Volumes aur data

- `docker compose down` → containers hate, **data bacha**.
- `docker compose down -v` → volume delete, **data gaya** ⚠️.
- `MYSQL_*` env vars **sirf pehli baar** (khaali volume) lagte hain. Baad me password
  badla → DB me purana hi → backend **1045**.

### Ports

Sirf nginx publish (`8080:80`). Backend/MySQL sirf compose network pe.
`"0:80"` → Docker koi bhi free port de deta hai (CI me do builds ka takraav nahi).

### Kaam ke flags

`up -d --build --wait` (healthy hone tak ruko), `--no-build` (wahi image test karo jo
bani), `--profile test` (optional services jaise `api-smoke`).

### Memory

`mem_limit` + Node ke liye `NODE_OPTIONS=--max-old-space-size=160` — V8 heap limit se
neeche rahe, kernel OOM-kill (137) se pehle GC kare.

---

## 6. nginx

- **Reverse proxy:** `/api/` → backend. Browser ko backend ka pata hi nahi; same origin →
  CORS nahi.
- **`resolver 127.0.0.11` + variable `proxy_pass`:** nginx har request pe `backend` resolve
  kare. Fixed naam se startup pe ek baar IP leta hai → backend recreate (naya IP) → **502**.
- **SPA fallback:** `try_files $uri $uri/ /index.html` — `/products/3` file nahi hai;
  bina iske refresh pe 404.
- **Caching:** hashed `/assets/*` 1 saal, `index.html` kabhi nahi.
- **`/healthz`:** container healthcheck, access log se bahar.
- `nginx -t` — config test; CI me deploy se pehle pakdo.

---

## 7. App ke concepts jo DevOps ke liye zaroori

### "Up ≠ working"

- `/api/health` asli `SELECT 1` → DB down = **503**, chahe process Up ho.
- `docker compose stop mysql` → backend "Up", page ka footer laal.
- CI: image banne ke baad chala ke dekho ("Built ≠ works").

### Config sirf env se, fail fast

Missing/galat var → startup pe exit 1 + **sirf naam** batao, value kabhi nahi (secret ho
sakti hai).

### Retry vs fatal

`ECONNREFUSED` (MySQL abhi start ho raha) → retry. `1045` (galat password) → retry
bekaar, turant fail + hint.

### Migrations

Har file ek baar, `schema_migrations` me record → har startup pe chalana safe
(idempotent). `GET_LOCK` — do backend ek saath start hon to dono na chalayein. MySQL DDL
auto-commit → aadhi file fail hui to rollback nahi.

### Logs

JSON, ek line per event, stdout pe. `X-Request-Id` nginx → backend: ek request dono logs me
dhoondh sakte ho. Healthcheck wali requests debug level pe (noise).

### Security basics

- Password bcrypt hash me; JWT algorithm pin (`HS256`).
- Unknown email pe bhi bcrypt compare (timing se pata na chale kaunsa email exist karta hai).
- Price DB se, request se kabhi nahi.
- Rate limit per IP — `trust proxy 1` ke bina sab users nginx ka IP lagte.

---

## 8. Jenkins / CI

### Multibranch Pipeline

Har branch/PR ka apna job. `BRANCH_NAME` sirf yahi set karta hai → `when { branch 'main' }`
sirf yahin kaam karta hai (normal Pipeline job me chupchaap skip).

### Image tag = short git SHA

`shoplite-backend:e4a9b0b` → har image exact code tak trace. `:latest` akela kabhi nahi.

### Lint/test Docker ke andar

Agent pe Node install nahi; workspace me root-owned `node_modules` nahi (warna
`deleteDir()` fail).

### CI ke secrets

Har build fresh random (`openssl rand`), `set +x` taaki log me na aaye. Asli secrets
Jenkins credentials me, `withCredentials` se — log me `****`.

### Cleanup

`post { always { ... } }` — fail ho tab bhi. `down -v` sirf `shoplite-ci-*` project pe
(guard) — project name unset hua to compose local stack ka data uda deta.
`archiveArtifacts` — logs/reports build ke saath save.

### GitHub se jodna

GitHub branch source (Java API se scan — controller ki toot-phoot wali binaries use nahi).
PAT permissions: Contents read, Commit statuses write (PR pe ✅/❌), Pull requests read.
Anonymous API = 60 req/hour → scan khatam kar deta; PAT = 5000.
Trigger: webhook nahi pahunch sakta (host-only IP) → **periodic scan** (Poll SCM jaisa).

### Agents

- Controller orchestrate kare, builds agent pe. Built-in node executors = **0**.
- SSH agent: private key Jenkins credential me, public key agent ke `authorized_keys` me.
- **Host key verification:** "Manually trusted" = pehli baar approve, phir sirf wahi key.
  "Non verifying" = koi bhi agent ban ke controller ko bewakoof bana sakta hai.
- Agent ka Java controller jitna naya hona chahiye.

### Polling vs webhook

Polling = Jenkins har N minute GitHub se poochta hai (pull). Webhook = push hote hi
GitHub Jenkins ko batata hai (push) — par **GitHub ko Jenkins tak pahunchna padta hai**.

| | Poll SCM | Webhook |
|---|---|---|
| Delay | interval jitna | turant |
| Jenkins internet pe chahiye? | nahi | haan (ngrok / public URL) |
| Jenkins band tha tab push | agla poll pakad lega | chhoot gaya — haath se Redeliver |

- **Faisla:** Jenkins tak internet pahunch sakta hai? Nahi (ShopLite, host-only) → polling.
  Haan (company) → webhook. **Best: dono** — webhook main + dheema poll (30–60 min)
  safety net.
- "GitHub hook trigger for GITScm **polling**" — webhook aane pe Jenkins turant ek
  **poll** karta hai (sach me naya commit?) → isliye job ka **pehla manual build**
  zaroori: usi se Jenkins ko pata chalta hai job kaunsa repo use karta hai.
- Cron `H/5 * * * *` — `H` = har job ka minute alag (sab ek saath GitHub pe na tootein).
- ✅ 7 Oct 2026: docker-lab Jenkins + ngrok + policy + shared secret — push → build
  apne aap chala.
Host-only IP (`192.168.56.x`) internet se dikhta hi nahi → **ngrok**: VM khud bahar ki
taraf tunnel kholta hai, ngrok public URL deta hai, GitHub → ngrok → tunnel → Jenkins.

- Payload URL: `https://<domain>/github-webhook/` — **aakhri `/` zaroori** (warna 302).
- Job me "GitHub hook trigger for GITScm polling" tick.
- **Shared secret:** GitHub aur Jenkins dono ke paas ek secret; GitHub har payload ki
  HMAC signature bhejta hai (`X-Hub-Signature-256`), Jenkins milata hai → nakli webhook
  reject. (apt signing key jaisa idea: "sach me usi ne bheja".)
- ngrok chalu = Jenkins **poore internet pe** khula. **Least exposure:** ngrok traffic
  policy se sirf `/github-webhook/` kholo, baaki sab 404 — login page internet se dikhta
  hi nahi (strong password se bhi behtar):
  ```yaml
  on_http_request:
    - expressions:
        - "!req.url.path.startsWith('/github-webhook/')"
      actions:
        - type: deny
          config:
            status_code: 404
  ```
  `ngrok http 8080 --traffic-policy-file ~/webhook-only.yml`. Kaam khatam → `Ctrl+C`.
- Debug: GitHub → Webhooks → **Recent Deliveries** → response code (200 ✅, 302 slash
  missing, 404 plugin/URL, timeout = ngrok/Jenkins band).

### Role-based access (users ko kam/zyada permission)

Default "Logged-in users can do anything" = sab barabar. Company me **least privilege**:
jitna kaam, utni permission.

- Plugin: **Role-based Authorization Strategy** (built-in nahi). Install → Manage Jenkins →
  Security → Authorization → **Role-Based Strategy** → Save.
- Naye version me naam **"Role Management"** (tutorial me "Manage and Assign Roles") — UI
  alag, kaam wahi. Option na mile → description padh ke milta-julta dhoondho.
- **Do kadam:**
  1. **Roles** → **+ Add Role** — role kya kar sakta hai (`viewer` = Overall/Read + Job/Read)
  2. **Assign Roles** → **+ Add User or Group** — kis user ko (User ID, Full Name nahi)

  Role banana ≠ dena. Sirf step 1 kiya → user ko kuch nahi milta.
- **Overall/Read** = Jenkins ka gate pass. Iske bina login ke baad
  *"missing the Overall/Read permission"*, chahe Job/Read ho.
- **Groups:** `authenticated` = har logged-in user, `anonymous` = bina login wala koi bhi.
  `anonymous` ko **kabhi** role mat do (bina login sab logs padh lega).
- User ko **apne roles + apne groups ke roles** — sab jud ke milte hain.
- ⚠️ Strategy on karte hi apne `admin` user ko `admin` role confirm karo — warna khud lock.
  Recovery: Jenkins stop → `config.xml` me authorization wapas → start.
- Test: **incognito window** me naye user se login.
- 🔍 search box = dhoondhna, **+ Add** = banana.

### Jenkins install (apt)

Repo **signing key** time-time pe badalti hai (ab `jenkins.io-2026.key`). Tutorial ki
purani key → `NO_PUBKEY`. `signed-by=` = is repo ke packages sirf isi key se verify.
`debian-stable` = LTS.

---

## 9. Debugging log — jo sach me toota

| Symptom | Asli wajah | Fix / sabak |
|---|---|---|
| Commit me password chala gaya | `git add .` + `.gitignore` tracked file pe nahi lagta | Push se pehle pakda, commit undo; CLAUDE.md gitignored |
| `git rm --cached` ne kuch nahi hataya | Ek file `AM` thi → git ne saari files pe mana kiya | `git reset` |
| VS Code "Create Fork?" popup | VS Code dusre GitHub account se logged in | Terminal app + URL me username |
| Backend crash-loop, `ER_PARSE_ERROR` | `._001_init.sql` (Mac metadata) migration samjha | Migration filename pattern + `.dockerignore` |
| `docker stop` 10 sec atak ke 137 | SIGTERM handler startup ke baad register | Handler pehle |
| `permission denied ... docker.sock` | User docker group me nahi | `usermod -aG` + re-login |
| vi me ajeeb window, `E11` | Block paste kiya, baaki lines vi me type hui | Ek-ek command paste |
| `mysql:8.4` delete nahi hui | Container us image se chal raha tha | Pehle container hatao |
| Ubuntu VM me sirf 714 MiB | Vagrantfile me `memsize` nahi | `vmware.vmx["memsize"]` |
| GitHub webhook → **404 in 0.05 s**, header `ngrok-error-code: ERR_NGROK_3200` | ngrok tunnel band — `vagrant ssh` session khatam (terminal band / Mac sleep) → SIGHUP → ngrok mara | ngrok dobara chalao; response headers padho — jawab kisne diya (ngrok vs Jenkins) wahi batata hai. Long-term: `ngrok service install` |
| GitHub webhook "failed to connect to host" | Payload URL me `192.168.56.13` — host-only IP internet se dikhta nahi | ngrok public URL |
| "Test123 is missing the Overall/Read permission" (role me Administer bhi tha) | Role bana, par user ko **assign** nahi hua | Assign Roles → Add User → role ☑ |
| Role search me "No matching roles" | Naam **search box** me likha | **+ Add Role** button |
| Tutorial ka "Manage and Assign Roles" nahi mila | Plugin ka naya version — naam "Role Management" | Description padh ke pehchano |
