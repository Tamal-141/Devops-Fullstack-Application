# ShopLite — plan aur faisle

Ye document code se **pehle** ka hai. Isme likha hai ki kya banega, kya nahi banega,
aur **kyun**. Padhne ke baad jo samajh na aaye, wahi Google karne layak hai — niche
"Research" section me exact terms diye hain.

Status: **koi code nahi likha gaya hai abhi tak.** Sirf decisions final hue hain.

---

## 1. Ye project hai kis liye

Ye e-commerce app banane ka project **nahi** hai. Ye **deployment pipeline** seekhne ka
project hai. App sirf itni honi chahiye ki pipeline ke har hisse ko sach me test kar sake.

Isliye app jaan-bujh ke **boring aur chhoti** rakhi hai. Fayda: jab kuch tootega, to pakka
infra toota hoga — app nahi. Debugging ka time infra pe jaayega, React pe nahi.

---

## 2. Faisle jo ho chuke hain

| Faisla | Kya | Kyun |
|---|---|---|
| Scope | Trimmed — 4 features | Poora spec 2-3 hafte ka app kaam tha; pipeline ko farak nahi padta |
| EC2 | `t4g.small` (ARM, 2 GB) | ARM = native builds, koi emulation nahi. 2 GB = swap se ladna nahi padega |
| Purana box | `devops-practice` **Stopped** rahega | Uspe flask app hai jo **GitHub pe push nahi hua**. Terminate = ekmatra copy gayi |
| Jenkins | Existing Ubuntu VM + `centos-agent` | Already chal raha hai. Naya banana = wahi setup dobara seekhna |
| Build kahan | `centos-agent` pe | Controller pe `curl`/`wget` SIGILL crash karte hain (known bug) |
| Key pair | Existing `devops-key.pem` | Kam moving parts = kam debugging |
| Public IP | Abhi Elastic IP nahi | Jenkinsfile me host ek parameter hai, usse kaam chal jaayega. EIP ~$3.60/mo extra |

### ARM ka faisla sabse zaroori kyun tha

CPU do alag bhasha bolte hain — `x86_64` (Intel/AMD) aur `aarch64` (ARM). Compiled
binary ek hi bhasha me hota hai. Docker image ke andar compiled binaries hote hain
(`node`, `nginx`, `mysqld`) — isliye **image bhi ek arch ki hoti hai**.

```
Mac (Apple Silicon)  = ARM
Ubuntu VM            = ARM   (Mac ke upar chal raha hai)
CentOS VM            = ARM   (Mac ke upar chal raha hai)
t3.micro             = x86   ← mismatch
t4g.small            = ARM   ← match
```

Mismatch hone pe EC2 pe container start karte hi:

```
exec /usr/local/bin/docker-entrypoint.sh: exec format error
```

`t4g` naam me hi ishara hai: **`g` = Graviton = ARM**. Ye padhna aa gaya to AWS ki
poori instance list samajh aa jaayegi.

### Paise ka hisaab

Account pe **credit-based naya free tier** hai (purana "750 hours free" wala nahi).
Matlab har service credits se katti hai — kuch bhi "free" nahi hai.

- Remaining: **$108.88**, expiry **24 March 2027**
- `t4g.small` 24x7: ~$12.30 + 20 GB gp3 ~$1.60 + public IPv4 ~$3.60 = **~$17.50/month**

Credits expire ho rahe hain — bachane ka koi fayda nahi. Par **jab padhai na kar raha ho
to instance stop kar dena**; tab mahine ka $5-8 hi lagega.

---

## 3. Architecture

```
                         Internet
                            │
                            ▼  port 80 (sirf yahi public hai)
   ┌────────────────────────────────────────────────┐
   │          EC2  t4g.small  (ARM, 2 GB)           │
   │                                                │
   │   ┌────────────────────────────────────────┐   │
   │   │  frontend  —  nginx:alpine       :80   │   │
   │   │  • React ka static build serve karta   │   │
   │   │  • /api/* ko backend pe proxy karta    │   │
   │   └──────────────────┬─────────────────────┘   │
   │                      │ :3000                   │
   │   ┌──────────────────▼─────────────────────┐   │
   │   │  backend  —  node:20-alpine            │   │
   │   │  • Express, JWT, mysql2 pool           │   │
   │   │  • startup pe migrations chalata hai   │   │
   │   └──────────────────┬─────────────────────┘   │
   │                      │ :3306                   │
   │   ┌──────────────────▼─────────────────────┐   │
   │   │  mysql:8        [named volume]         │   │
   │   └────────────────────────────────────────┘   │
   └────────────────────────────────────────────────┘
```

**Dhyan de:** sirf nginx bahar khula hai. Backend aur MySQL ka koi port host pe publish
nahi hoga — wo sirf Docker ke internal network pe baat karenge. Yahi asli reason hai
user-defined network use karne ka.

### Build se deploy tak ka raasta

```
  Mac (ARM)         Ubuntu VM (ARM)        CentOS VM (ARM)         EC2 (ARM)
     │                     │                      │                    │
  git push ──────►  Jenkins controller ──►   centos-agent              │
                    (sirf orchestrate       build + test + push        │
                     karta hai)                    │                   │
                                                   ▼                   │
                                             Docker Hub ───────────────┤
                                                                       ▼
                                                            docker compose pull
                                                            docker compose up -d
                                                            curl /api/health
```

Poori chain ARM hai — **kahin emulation nahi**. Yahi t4g chunne ka asli fayda hai.

---

## 4. App me kya banega

| Feature | Ye kaunsa DevOps concept test karta hai |
|---|---|
| Product list + detail (DB se) | volume, migrations, healthcheck ordering, MySQL 2002/1045 |
| Login (JWT, bcrypt) | secrets — env var se aaye, commit na ho |
| Place order (ek write) | redeploy ke baad data bacha ya nahi |
| `GET /api/health` | **"Up ≠ working"** — asli DB connectivity check |

### Kya nahi banega (aur kyun)

Signup, roles, admin panel, search, filter, pagination, cart, order history.

Ye baad me add honge — **jab pipeline ready hoga**. Tab har naya feature ek poora
deploy-cycle ki practice ban jaayega: code → commit → build → test → push → deploy.
Yahi asli fayda hai, isliye inhe abhi rok raha hoon.

---

## 5. Memory budget (2 GB me)

| Cheez | Limit |
|---|---|
| mysql | 700m |
| backend | 250m |
| frontend (nginx) | 64m |
| **Containers total** | **~1014m** |
| Ubuntu OS | ~180m |
| dockerd + containerd | ~100m |
| **Grand total** | **~1.3 GB of 2 GB** |

~700 MB headroom bachega — `docker pull` aur image extract ke liye kaafi. 1 GB pe yahi
~90% bhar jaata, aur deploy ke waqt hi OOM hota.

Swap phir bhi 2 GB banayenge — safety net ke liye, rozmarra use ke liye nahi.

---

## 6. Jenkins pipeline ke stages

Sab kuch `agent { label 'centos' }` pe — controller pe kuch nahi.

| # | Stage | Kya karega |
|---|---|---|
| 1 | Checkout | git se code |
| 2 | Lint | frontend + backend |
| 3 | Unit tests | jest (backend) |
| 4 | Build images | short git SHA se tag |
| 5 | E2E | stack uthao, Playwright chalao, report publish karo |
| 6 | Push | Docker Hub (`dockerhub-creds`) — **sirf main branch** |
| 7 | Deploy | EC2 pe SSH, compose pull + up, phir `curl /api/health` |
| 8 | Post | EC2 pe image prune, workspace clean |

**Stage 7 sabse zaroori hai.** Wahan `docker compose up -d` ke baad `curl` chalega. Agar
health check fail hua to build red — kyunki *"Up" container ka matlab kaam karta app nahi
hota*. Ye tera apna sabak hai, pipeline me likha hua.

---

## 7. EC2 launch checklist

```
Instance type : t4g.small
AMI           : Ubuntu Server 24.04 LTS — 64-bit (Arm)   ← ye dropdown badalna hai
Storage       : 20 GB gp3
Key pair      : devops-key  (existing, naya mat banao)
Security group:
    SSH   22  →  My IP se hi
    HTTP  80  →  Anywhere (0.0.0.0/0)
Region        : us-east-1
```

**Traps:**

1. **AMI ka architecture dropdown.** Console default `64-bit (x86)` pe hota hai. Isko
   `64-bit (Arm)` karna *bhoolna nahi* — warna t4g pe wo AMI dikhegi hi nahi, ya galat
   chalegi. Yahi #1 galti hai.
2. **`devops-practice` ko Terminate MAT karna.** Stopped rehne do. Uspe teri flask app
   hai jo push nahi hui. Stop = data safe, Terminate = volume delete, sab gaya.
3. Naye instance ke baad **EC2 → Volumes** dekhna. Koi volume `Available` state me
   (yaani kisi instance se juda nahi) mile to wo paisa kha raha hai — delete kar dena.
4. Security group asli firewall hai. Box ke andar `ufw` chalana alag layer hai — dono ko
   ek mat samajhna.

---

## 8. Research karne layak cheezein

Padhte waqt ye terms Google kar, isi order me:

**Arch aur images**
- `docker image inspect <image> --format '{{.Architecture}}'` — chala ke dekh
- Docker "multi-arch images" / "manifest list" — ek tag me kai arch kaise aate hain
- Dockerfile me `FROM --platform=$BUILDPLATFORM` ka matlab

**Compose**
- `depends_on` ke saath `condition: service_healthy` — plain `depends_on` se farak
- `mem_limit` vs `deploy.resources.limits` — compose v2 me kaunsa kaam karta hai
- named volume vs bind mount — redeploy pe data kyun bachta hai

**Jenkins**
- `withCredentials` — secret ko log me aane se kaise rokta hai
- `--password-stdin` — `docker login -p` se behtar kyun hai
- `when { branch 'main' }` — stage conditionally kaise chalta hai

**AWS**
- Security group vs NACL vs `ufw` — teen alag layers
- gp3 vs gp2 volume
- Public IPv4 charge (Feb 2024 se sab public IP pe lagta hai)

---

## 9. Aage ka plan

1. ✅ Decisions final
2. ⬜ **Tu:** ye doc padh, research kar, `t4g.small` launch kar
3. ⬜ **Main:** repo ka saara code likhunga — backend, frontend, Dockerfiles, dono compose
   files, Jenkinsfile, `ec2-setup.sh`, Playwright e2e, README
4. ⬜ Local pe ek command se chala ke dekhna
5. ⬜ Docker Hub repos banana + Jenkins me credentials daalna
6. ⬜ Pipeline job banana aur end-to-end chalana
7. ⬜ Poll SCM trigger (webhook baad me — Jenkins host-only IP pe hai, GitHub pahunch
   nahi sakta, tab ngrok chahiye hoga)

---

## 10. Khuli hui cheezein

- **Docker Hub username** — image tags me chahiye. Hardcode nahi karunga, Jenkins env var
  se aayega. Tujhse tab poochhunga jab pipeline setup karenge.
- **GitHub repo** — is project ko push karne ke liye PAT chahiye hoga. Wahi PAT flask app
  ke liye bhi kaam aayega (pending item #6).
- **EC2 ka public DNS** — instance banne ke baad milega. Jenkinsfile me parameter hoga,
  hardcode nahi.
