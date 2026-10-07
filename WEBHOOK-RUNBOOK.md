# GitHub Webhook → Jenkins (short runbook)

**Kya hota hai:** GitHub pe push → GitHub ngrok URL pe batata hai → ngrok Jenkins tak pahunchata
hai → build apne aap chalta hai.

**ngrok kyun:** Jenkins `192.168.56.13` pe hai — ye IP sirf Mac ke andar hai, GitHub use nahi
dekh sakta. ngrok ek public URL deta hai.

`%` = Mac, `$` = docker-lab VM.

**YouTuber ne ngrok kyun nahi lagaya?** Uska Jenkins **AWS EC2** pe tha — **public IP**
(`3.19.59.251:8080`). GitHub seedha pahunch gaya, bas security group me port 8080 khola.

| | YouTuber (EC2) | Mera (Mac pe VM) |
|---|---|---|
| Jenkins IP | `3.19.59.251` — public | `192.168.56.13` — private |
| GitHub pahunch sakta? | haan, seedha | nahi → ngrok |
| Kharcha | EC2 credits | free |
| Internet pe kya khula | poora Jenkins, `http` pe | sirf `/github-webhook/`, `https` pe |
| Restart pe URL | EC2 IP badalta hai (Elastic IP ke bina) | fixed ngrok domain |

**Rule:** Jenkins ka IP **public** hai → seedha webhook. **Private** hai → ngrok (ya polling).

---

## Ek baar ka setup

### 1. Repo fork karo
Address bar me `github.com/LondheShubham153/django-notes-app` → **Fork** → owner `Tamal-141`.

### 2. ngrok install — **jahan Jenkins hai wahan** (docker-lab)
```bash
cd ~/Desktop/vms/docker-lab && vagrant ssh        # %
```
```bash
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/keyrings/ngrok.asc > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/ngrok.asc] https://ngrok-agent.s3.amazonaws.com bookworm main" | sudo tee /etc/apt/sources.list.d/ngrok.list > /dev/null
sudo apt-get update && sudo apt-get install -y ngrok
```

### 3. Authtoken
`dashboard.ngrok.com` → **Share Localhost** → **Your Authtoken** → Copy.
```bash
read -s YOUR_AUTHTOKEN                         # paste, Enter (kuch nahi dikhega)
ngrok config add-authtoken "$YOUR_AUTHTOKEN"
unset YOUR_AUTHTOKEN
```

### 4. Policy file — sirf webhook ka raasta kholo, baaki sab 404
```bash
cat > ~/webhook-only.yml <<'EOF'
on_http_request:
  - expressions:
      - "!req.url.path.startsWith('/github-webhook/')"
    actions:
      - type: deny
        config:
          status_code: 404
EOF
```

### 5. Shortcut command
```bash
echo "alias ngrok-webhook='ngrok http 8080 --traffic-policy-file ~/webhook-only.yml'" >> ~/.bashrc
source ~/.bashrc
```

### 6. Secret banao
```bash
openssl rand -hex 20                           # %  — output copy karo, 2 jagah lagega
```

### 7. Jenkins (`http://192.168.56.13:8080`)

**a. Credential:** Manage Jenkins → **Credentials** → System → Global → **Add Credentials**
- Kind: **Secret text** · Secret: step 6 wali value · ID: `github-webhook-secret`

**b. GitHub plugin ko do:** Manage Jenkins → **System** → **GitHub** → Advanced →
**Shared secrets** → wo credential chuno → Save
*(dropdown me ID nahi, Description dikhta hai)*

**c. Job:** **New Item** → `webhook-test` → **Pipeline**
- ☑ **GitHub hook trigger for GITScm polling**
- *(backup)* ☑ **Poll SCM** → `H/30 * * * *` — ngrok band ho tab bhi 30 min me pakad lega
- Pipeline script:

```groovy
pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/Tamal-141/django-notes-app.git', branch: 'main'
            }
        }
        stage('Kaunsa commit aaya?') {
            steps {
                sh 'git log -1 --oneline'
            }
        }
    }
}
```

- **Save** → **Build Now** (ek baar haath se — isse Jenkins ko repo ka pata chalta hai)

### 8. GitHub webhook
Repo → **Settings** → **Webhooks** → **Add webhook**

| Field | Value |
|---|---|
| Payload URL | `https://runway-ligament-stoop.ngrok-free.dev/github-webhook/` (end ka `/` zaroori) |
| Content type | `application/json` |
| Secret | step 6 wali **same** value |
| SSL verification | **Enable** |
| Events | **Just the push event** |

---

## Roz ka kaam

**Start:**
```bash
cd ~/Desktop/vms/docker-lab && vagrant up && vagrant ssh      # %
ngrok-webhook                                                 # $ — terminal khula rakho
```
- Jenkins khud start hota hai (service). Check: `systemctl is-active jenkins` → `active`
- ngrok khud **nahi** — har baar `ngrok-webhook`
- Screen pe `online` + `Forwarding https://runway-ligament-stoop...` dikhna chahiye
  (domain fixed hai, webhook me kuch nahi badalna)

**Test:** `main` branch pe push → Jenkins me build apne aap.

**Band:** ngrok me `Ctrl+C` → `exit` → `vagrant halt` (%).

---

## Check kaise karein

**GitHub:** Repo → Settings → Webhooks → webhook pe click → **Recent Deliveries**
→ ✅ = pahuncha · ⚠️ = fail → line pe click → **Response** code + **Redeliver** button

**Bahar se (Mac %):**
```bash
curl -s -o /dev/null -D - https://runway-ligament-stoop.ngrok-free.dev/github-webhook/ | grep -iE '^HTTP|ngrok-error|x-jenkins'
```
- `405` + `x-jenkins` → sab theek ✅
- `404` + `ngrok-error-code: ERR_NGROK_3200` → ngrok band hai

**Browser me ngrok URL kholo → 404** = sahi hai (policy ne roka). Jenkins hamesha
`192.168.56.13:8080` se use karo.

---

## Errors

| Dikha | Wajah | Fix |
|---|---|---|
| "failed to connect to host" | Payload URL me `192.168.56.13` | ngrok URL daalo |
| `404` + `ERR_NGROK_3200` (0.05 s me) | ngrok band (terminal band / Mac sleep) | `ngrok-webhook` chalao → Redeliver |
| `ERR_NGROK_3200` "xxxx… offline" | `xxxx` placeholder khola | Forwarding line ka asli URL |
| `ERR_NGROK_8012` | Jenkins band | `sudo systemctl start jenkins` |
| `302` | URL ke end me `/` nahi | `/github-webhook/` |
| `400` | GitHub aur Jenkins ka secret alag | Dono jagah same value |
| `200` par build nahi | Checkbox off / Build Now nahi kiya / push `main` pe nahi | Step 7c check |
| `accepts 1 arg(s), received 0` | `$YOUR_AUTHTOKEN` set nahi tha | Step 3 wala `read -s` tareeka |
| `ngrok-webhook: command not found` | Alias save nahi hua | Step 5 dobara, ya poori command |
| URL paste karne pe "2 results" | GitHub ke search box me paste | Chrome ka address bar |
| Build "Waiting for executor" | Koi free executor/agent nahi | Agent jodo ya built-in executors > 0 |

**Sabak:** sirf code mat dekho, **headers** dekho — `ngrok-error-code` = ngrok ne jawab diya,
`x-jenkins` = Jenkins ne, dono nahi = policy ne.
