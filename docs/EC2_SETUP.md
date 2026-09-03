# EC2 Deployment — Production Setup Guide

This document covers one-time EC2 provisioning for **EventNexus** (3 services) and how the GitHub Actions workflow deploys to it.

**Stack:** `frontend (Next.js 16 standalone :3000)` + `backend (Express :5000)` + `ai-service (FastAPI :8000)` via `docker-compose.prod.yml`, images from **GHCR**.

---

## 1) Prerequisites (you will provide)

* AWS Account + Region (e.g. `ap-south-1`, `us-east-1`)
* EC2 instance — recommended **t3.small or t3.medium** (2 vCPU, 2–4 GB RAM). `t3.micro` will OOM with 3 services + models.
* Security Group: open **22 (SSH)**, **80 (HTTP)**, **443 (HTTPS if using)**. Keep `5000`/`8000` closed — they are internal. `3000` is mapped to `80` in prod compose.
* Key pair `.pem` for SSH
* Domain (optional) for TLS

The workflow is ready — once you provide `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, pushes to `main` deploy automatically.

---

## 2) One-time EC2 provisioning (run once via SSH)

SSH in:

```bash
ssh -i your-key.pem ubuntu@<EC2_HOST>   # or ec2-user@ for Amazon Linux
```

Run:

```bash
# --- System & Docker ---
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg git

# Docker Engine (Ubuntu)
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Re-login for group to take effect: exit & ssh again
docker --version && docker compose version

# Amazon Linux alternative:
# sudo dnf update -y && sudo dnf install -y docker git && sudo systemctl enable --now docker && sudo usermod -aG docker $USER

# --- Deploy directory ---
mkdir -p ~/eventnexus
cd ~/eventnexus

# Firewall (UFW) — optional if using Ubuntu
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable || true

# --- GitHub Container Registry auth (for private images) ---
# Create a GH PAT (classic) with read:packages scope, then:
# echo <PAT> | docker login ghcr.io -u <github-username> --password-stdin
# (The deploy workflow does this automatically via secrets.GITHUB_TOKEN)
```

No need to create env files now — the workflow writes them from GitHub Secrets (see §3). For a manual test, create them as in §3.1.

Verify compose file is present after first deploy (workflow clones the repo to `~/eventnexus`).

---

## 3) GitHub Secrets & Variables

Go to **GitHub → Settings → Secrets and variables → Actions**.

### Required Secrets (deploy will fail without these)

| Secret | Example | How to get |
|--------|---------|------------|
| `EC2_HOST` | `13.233.XX.XX` or `ec2-xx-xx-xx-xx.ap-south-1.compute.amazonaws.com` | EC2 Console → Instances → Public IPv4 DNS |
| `EC2_USER` | `ubuntu` (Ubuntu) or `ec2-user` (Amazon Linux) | Depends on AMI |
| `EC2_SSH_KEY` | *(full private key contents)* `-----BEGIN RSA PRIVATE KEY-----...` | Contents of your `.pem` file (`cat your-key.pem`) |

### Optional Secrets

| Secret | Purpose |
|--------|---------|
| `EC2_SSH_PORT` | SSH port if not 22 |
| `BACKEND_ENV` | **Full contents** of `backend/.env` (see template below). If set, workflow writes `~/eventnexus/backend.env` on EC2 each deploy. |
| `AI_ENV` | Full contents of `ai-service/.env` → `~/eventnexus/ai.env` |
| `FRONTEND_ENV` | Full contents for `~/eventnexus/frontend.env` (optional) |
| `GHCR_PAT` | PAT with `read:packages` if repo is private and `GITHUB_TOKEN` login fails on EC2 |

### Repository Variables (for frontend build args)

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` | **Set to `http://<EC2_HOST>/api` or `https://your-domain/api` in prod.** Must be set as a Variable so GH Actions can bake it into the Next.js bundle at build time (Next.js inlines `NEXT_PUBLIC_*` at build). |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | — | Google OAuth client ID (must match backend `GOOGLE_CLIENT_ID`) |

> **Why two places for env?** `BACKEND_ENV`/`AI_ENV` are **runtime** secrets injected on EC2 via `env_file`. `NEXT_PUBLIC_*` are **build-time** — they must be available when the frontend Docker image is built in GH Actions, hence Variables.

---

### 3.1) Env file templates (what to paste into `BACKEND_ENV` / `AI_ENV`)

If you use the Secrets approach, copy your local `.env` files wholesale.

**`BACKEND_ENV` should contain (example):**
```env
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/eventnexus?appName=eventnexus
JWT_SECRET=replace_with_long_random_secret_48chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
QR_TOKEN_SECRET=another_long_random_secret
FRONTEND_URL=http://<EC2_HOST>
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
ADMIN_EMAILS=anjaliimiishra321@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=home1051ab@gmail.com
SMTP_PASSWORD=mqitgrbjuktocoao
EMAIL_FROM=EventNexus <noreply@eventnexus.dev>
AI_SERVICE_URL=http://ai-service:8000
GROQ_API_KEY=gsk_xxx
GROQ_MODEL=llama-3.1-8b-instant
GEMINI_API_KEY=xxx
GEMINI_MODEL=gemini-flash-latest
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NPR_USD_RATE=133
ESEWA_PRODUCT_CODE=EPAYTEST
ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q
ESEWA_FORM_URL=https://rc-epay.esewa.com.np/api/epay/main/v2/form
ESEWA_STATUS_URL=https://rc.esewa.com.np/api/epay/transaction/status/
```

**`AI_ENV` (ai-service/.env):**
```env
AI_PORT=8000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/eventnexus?appName=eventnexus
MODELS_DIR=./models
GROQ_API_KEY=gsk_xxx
GROQ_MODEL=llama-3.1-8b-instant
GEMINI_API_KEY=xxx
GEMINI_MODEL=gemini-flash-latest
```

**Alternative — manual on EC2 (if you don't want to use `BACKEND_ENV` secret):**
```bash
ssh ubuntu@<EC2_HOST>
cd ~/eventnexus
cp backend/.env.example backend.env   # then edit with real values
cp ai-service/.env.example ai.env
# Ensure files are 600:
chmod 600 backend.env ai.env
```

---

## 4) How the workflow works

**File:** `.github/workflows/deploy.yml`

```
push to main ──► build-backend ──┐
               ├─► build-frontend ─┼─► deploy (SSH to EC2)
               └─► build-ai ──────┘        │
                                           ├─ git clone/pull to ~/eventnexus
                                           ├─ write backend.env / ai.env from secrets
                                           ├─ docker login ghcr.io
                                           ├─ docker compose -f docker-compose.prod.yml pull
                                           ├─ docker compose up -d (rolling, recreate changed only)
                                           ├─ healthcheck wait + smoke curl
                                           └─ prune dangling images
```

* **Images:** `ghcr.io/<owner>/event-backend:latest` + `:<short-sha>`, same for frontend/ai. `cache-from/to` uses `buildcache` tag for fast incremental builds.
* **Zero-downtime:** `docker compose up -d` only recreates containers whose image changed; dependents wait on `service_healthy` before starting (AI → Backend → Frontend).
* **Manual redeploy:** Actions → `Build & Deploy to EC2` → `Run workflow` → check `skip_build` to only pull/restart on EC2 without rebuilding.

**CI only:** `.github/workflows/ci.yml` builds (no push) on PRs and non-main branches as a fast check.

---

## 5) Verifying a deploy

```bash
ssh ubuntu@<EC2_HOST> "cd ~/eventnexus && docker compose -f docker-compose.prod.yml ps -a && docker compose -f docker-compose.prod.yml logs --tail 50"
curl http://<EC2_HOST>/                # frontend via port 80
curl http://<EC2_HOST>:5000/api/health # backend
curl http://<EC2_HOST>:8000/health     # ai (should be blocked from internet — expect timeout; on host: curl http://127.0.0.1:8000/health)
```

---

## 6) Troubleshooting

| Symptom | Fix |
|---------|-----|
| `401 Unauthorized` pulling from GHCR on EC2 | Set `GHCR_PAT` secret (PAT with `read:packages`) or make GHCR packages public: `GHCR → Package → Settings → Change visibility`. |
| Frontend shows `localhost` API URL in prod | Set `NEXT_PUBLIC_API_URL` **Repository Variable** (not Secret) to `http://<EC2_HOST>/api` and re-push — it's baked at build time. |
| Backend crashes `MONGODB_URI missing` | Check `~/eventnexus/backend.env` on EC2 exists and is not empty; ensure `BACKEND_ENV` secret was set or file was created manually. |
| `no space left on device` | `docker system prune -a --volumes` (careful — preserves `ai-models` volume unless `--volumes` is used broadly) or add cron prune. |
| `permission denied` docker | `sudo usermod -aG docker $USER` then re-login. |
| AI models missing after redeploy | Models are stored in docker volume `eventnexus-ai-models`, not in image. First boot auto-trains if missing; force retrain via Admin → AI Training or `POST /train`. |

---

## 7) Next steps (after you provide AWS account)

1. Share `EC2_HOST`, `EC2_USER`, `SSH key` (or create instance and share connection details).
2. Add Secrets/Variables in GitHub as above.
3. Push to `main` (or manually run workflow) — first deploy clones, writes env, pulls images, starts services.
4. Point DNS / set `NEXT_PUBLIC_API_URL` to real host and redeploy if needed.

---

## 8) Useful EC2 commands

```bash
cd ~/eventnexus
docker compose -f docker-compose.prod.yml ps -a
docker compose -f docker-compose.prod.yml logs -f backend    # or frontend / ai-service
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d
docker system df && docker image ls
```

```
