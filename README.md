# 🐾 Pawfund - Pet Rescue & Foster Relational Network

A comprehensive platform for managing rescue shelters, facilitating ACID transaction-compliant adoption workflows, and matching pets with adopters using Artificial Intelligence (Google Gemini AI).

**Live demo:** https://pet-rescue-foster-matcher.io.vn
*(The demo server runs on AWS EC2 and may be powered off outside of demo/grading hours to save cost.)*

---

## 📌 Project Overview

Pawfund is a software solution designed to optimize rescue operations, clinical care management, and pet adoption processes. Built upon a 3NF (Third Normal Form) database architecture, the system guarantees strict data integrity during concurrent adoption requests.

The platform addresses fragmented management by consolidating information across Adopters, Shelters, Pet profiles, Clinical logs, and Financial donations into a unified system.

## 👥 Authors & Contributors

This project was researched and developed by:

- 👩‍💻 **Hoang Thi Khanh Huyen** — Co-Author & Core Developer
- 👩‍💻 **Ngo Huynh Mai Khoi** — Co-Author & Core Developer

---

## 🚀 Key Features

### 1. 🤖 Smart AI Matchmaker
- Integrates Google Gemini API to analyze living environments, leisure time, and prior pet care experience of candidates.
- Evaluates and calculates percentage compatibility scores between potential adopters and individual pet characteristics.

### 2. 🛡️ ACID Transaction Management
- Manages adoption applications while strictly enforcing ACID database properties.
- Automatically updates pet status to `Adopted` and resolves competing applications upon approval.
- Integrates a simulated SMTP email engine to send automated status notifications to applicants.

### 3. 📋 Care & Clinical Logs Management
- Tracks vaccination history, deworming schedules, spay/neuter operations, and health metrics for each pet in real time.

### 4. 🏥 Shelter Management & Donations
- Monitors capacity limits and real-time pet occupancy across multiple rescue centers.
- Maintains a transparent historical record of donations from benefactors.

---

## 🛠️ Tech Stack

**Frontend**
- Framework: React, TypeScript
- Styling: Tailwind CSS, Lucide React Icons
- UI Components: Dynamic Modals, Real-time Status Badges, Data Tables

**Backend**
- Runtime: Node.js (Express Framework)
- Language: TypeScript
- RESTful API: Standardized endpoints for CRUD operations
- Authentication & Authorization: Role-Based Access Control (`Admin`, `RescueStaff`, `Adopter`)

**Database & AI**
- Database: MySQL 8 (3NF normalized) — hosted on **Aiven Cloud** in production
- AI Framework: Google Gemini API (`@google/genai`)

**Infrastructure & DevOps**
- Docker & Docker Compose
- AWS EC2 (Ubuntu) + Nginx reverse proxy + Let's Encrypt HTTPS
- GitHub Actions (CI/CD: push to `main` → auto deploy)

---

## 📐 Database Architecture (3NF Schema)

The system is engineered around core relational entities:

| Entity | Description |
|---|---|
| `USERS` | User accounts, authentication roles, and profile details |
| `SHELTERS` | Rescue center profiles and capacity tracking |
| `PETS` | Detailed pet profiles (FK: `shelter_id`) |
| `PET_IMAGES` / `PET_MEDICAL_RECORDS` | Pet photo gallery and clinical history (FK: `pet_id`) |
| `ADOPTION_APPLICATIONS` | Adoption applications (FKs: `user_id`, `pet_id`) |
| `CARE_LOGS` | Post-adoption care diary (FKs: `pet_id`, `user_id`) |
| `DONATIONS` | Sponsorship records (FK: `shelter_id`) |

The full DDL script is in `src/db/schema.sql`.

---

## 🏗️ Deployment Architecture

```
 Browser ──HTTPS──▶  Nginx (AWS EC2, :80/:443)
                        │  reverse proxy
                        ▼
                  Docker container "pawfund-app"
                  (Express + built React, 127.0.0.1:3000)
                        │  TLS (mysql2 pool, CA certificate)
                        ▼
                  MySQL on Aiven Cloud
```

- The app container listens on `127.0.0.1:3000` only. It is **not** exposed to the internet; all public traffic goes through Nginx.
- The database is **not** inside Docker. It is a managed MySQL service on Aiven, reached over TLS.

---

## ⚙️ Local Development

**Prerequisites:** Node.js v18+, MySQL Server v8.0+ (or an Aiven MySQL service), NPM.

1. Clone the repository:
   ```bash
   git clone https://github.com/delsticechl/Pet-Rescue-Foster-Matcher.git
   cd Pet-Rescue-Foster-Matcher
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the project root (never commit it):
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=pawfund_db
   ```
4. Create the database and import the schema:
   ```bash
   mysql -u root -p -e "CREATE DATABASE pawfund_db CHARACTER SET utf8mb4;"
   mysql -u root -p pawfund_db < src/db/schema.sql
   ```
5. Run in development mode:
   ```bash
   npm run dev
   ```
6. Open http://localhost:3000.

---

## ☁️ Database: MySQL on Aiven Cloud

Production uses **Aiven for MySQL** instead of a local MySQL server, so the database survives when the EC2 server is stopped or rebuilt.

### 1. Create the service
1. Sign in at https://console.aiven.io and create a project.
2. **Create service → MySQL**, choose a cloud/region close to your EC2 server (e.g. AWS Sydney `ap-southeast-2`, same as the server, to reduce latency) and a plan that fits your budget.
3. Wait until the service status is **Running**.

### 2. Get connection details
Open the service **Overview** page and note:

| Field | Example |
|---|---|
| Host | `mysql-xxxx-yourproject.a.aivencloud.com` |
| Port | a non-default port such as `12345` (not 3306) |
| User | `avnadmin` |
| Password | shown on the page (keep secret) |
| Database | `defaultdb` (or create your own, e.g. `pawfund_db`) |
| SSL mode | `REQUIRED` |

Download the **CA certificate** (`ca.pem`) from the same page. Aiven requires TLS, so the app must verify the connection with this certificate.

### 3. Restrict who can connect
Under **Allowed IP addresses**, replace the default `0.0.0.0/0` with the public IP of your EC2 server (and your own IP for the setup step below).
> If the EC2 server does not use an Elastic IP, its public IP changes every time it is stopped and started. Update the allowed IP after each start, or attach an Elastic IP.

### 4. Create the schema
From your own machine (with the MySQL client installed) or from the EC2 server:
```bash
mysql --host=<HOST> --port=<PORT> --user=avnadmin --password \
      --ssl-mode=VERIFY_CA --ssl-ca=ca.pem \
      defaultdb < src/db/schema.sql
```
Enter the password when prompted. Confirm with `SHOW TABLES;`.

### 5. Configure the app
Put the Aiven values in the `.env` file **on the server** (not in Git):
```env
NODE_ENV=production
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
DB_HOST=mysql-xxxx-yourproject.a.aivencloud.com
DB_PORT=12345
DB_USER=avnadmin
DB_PASSWORD=your_aiven_password
DB_NAME=defaultdb
```
Place `ca.pem` in the project folder at the path the code reads it from (see `src/db/mysql.ts`). The certificate is public information, but the **password and API keys are secrets**: keep them only in `.env`.

> Variable names above follow this README; if your `src/db/mysql.ts` reads different names, use those.

---

## 🚀 Deploying to AWS EC2

### 1. Launch the server
1. AWS Console → **EC2 → Launch instance**.
2. AMI: **Ubuntu Server LTS**. Type: `t3.micro` (or `t2.micro`). Storage: **20 GB gp3** (the default 8 GB fills up quickly with Docker).
3. Create a key pair (`.pem`) and keep it safe.
4. Security Group inbound rules:

   | Type | Port | Source |
   |---|---|---|
   | SSH | 22 | your IP (or `0.0.0.0/0` if you use GitHub Actions / EC2 Instance Connect) |
   | HTTP | 80 | `0.0.0.0/0` |
   | HTTPS | 443 | `0.0.0.0/0` |

   Do **not** open port 3000 or any database port to the internet.

### 2. Prepare the server
Connect via EC2 Instance Connect or `ssh -i key.pem ubuntu@<EC2_IP>`, then:
```bash
sudo apt update && sudo apt upgrade -y

# 2 GB swap: a 1 GB RAM instance runs out of memory when building Docker images
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab

# Docker (includes the Compose plugin)
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo usermod -aG docker ubuntu     # log out and back in afterwards
```

### 3. Get the code and configure
```bash
git clone https://github.com/delsticechl/Pet-Rescue-Foster-Matcher.git
cd Pet-Rescue-Foster-Matcher
nano .env            # fill in the Aiven values from the section above
# copy ca.pem into the project folder
```

### 4. Run with Docker Compose
```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail 50
curl -I http://localhost:3000        # expect HTTP 200
```
`docker-compose.yml` publishes the port as `127.0.0.1:${APP_PORT:-3000}:3000`, so the app is reachable only from the server itself (through Nginx).

### 5. Domain, Nginx and HTTPS
1. At your DNS provider, create **A records** (`@` and `www`) pointing to the EC2 public IP. If the DNS provider has a proxy/protection option, turn it off while issuing the certificate.
2. Install and configure Nginx:
   ```bash
   sudo apt install nginx -y
   sudo nano /etc/nginx/sites-available/pawfund
   ```
   ```nginx
   server {
       listen 80;
       server_name pet-rescue-foster-matcher.io.vn www.pet-rescue-foster-matcher.io.vn;
       client_max_body_size 20M;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```
   ```bash
   sudo ln -s /etc/nginx/sites-available/pawfund /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t && sudo systemctl reload nginx
   ```
3. Enable free HTTPS (auto-renewing):
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d pet-rescue-foster-matcher.io.vn -d www.pet-rescue-foster-matcher.io.vn
   sudo certbot renew --dry-run
   ```

### 6. Update the app manually
```bash
cd ~/Pet-Rescue-Foster-Matcher
git pull
docker compose up -d --build
docker image prune -f
```

---

## 🔄 CI/CD with GitHub Actions

Every push to `main` deploys automatically: GitHub connects to the EC2 server over SSH, pulls the latest code and rebuilds the container.

Workflow file: `.github/workflows/deploy.yml`

```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: SSH and deploy
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script_stop: true
          script: |
            cd ~/Pet-Rescue-Foster-Matcher
            git fetch origin main
            git reset --hard origin/main
            docker compose up -d --build
            docker image prune -f
            sleep 10
            curl -fsS -o /dev/null http://127.0.0.1:3000 && echo "App OK"
```

### One-time setup
1. Create a dedicated deploy key (no passphrase):
   ```bash
   ssh-keygen -t ed25519 -f deploy_key
   ```
2. Append the **public** key (`deploy_key.pub`) to `~/.ssh/authorized_keys` on the EC2 server.
3. In the GitHub repo: **Settings → Secrets and variables → Actions**, add:

   | Secret | Value |
   |---|---|
   | `EC2_HOST` | `pet-rescue-foster-matcher.io.vn` (or the server IP) |
   | `EC2_USER` | `ubuntu` |
   | `EC2_SSH_KEY` | full contents of the **private** key `deploy_key` |

4. Never commit `deploy_key`, `.env` or any password.

> `git reset --hard` discards any manual edits made directly on the server. Always change code in the repository, not on the server.

The workflow can also be started manually from the **Actions** tab (**Run workflow**).

---

## 💰 Cost-Saving Notes
- Stop the EC2 instance when it is not needed (**Instance state → Stop**). Compute charges stop; EBS storage is still billed.
- Without an Elastic IP, the public IP changes after every start. Update the DNS A records (and the Aiven allowed-IP list) with the new IP.
- Set a **Billing → Budgets** alert in AWS.
- The database is hosted on Aiven, so data is kept while EC2 is stopped. Check your Aiven plan for any inactivity or power-off rules.
- A push to `main` while the server is stopped makes the deploy workflow fail (it cannot reach the server). Start the server first.

---

## 🧰 Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Site times out | Security Group missing ports 80/443, or DNS points to an old IP |
| `502 Bad Gateway` | App container not running: `docker compose ps`, `docker compose logs` |
| App cannot connect to MySQL | Wrong host/port/password in `.env`, EC2 IP not in Aiven allowed-IP list, or `ca.pem` missing/wrong path |
| `ER_ACCESS_DENIED` / SSL error | Check the Aiven user/password and that TLS with `ca.pem` is configured |
| Build stops with `Killed` | Out of memory: check swap with `free -h` |
| `no space left on device` | Enlarge the EBS volume; clean with `docker builder prune -f` and `docker image prune -f` |
| Deploy workflow fails with timeout | EC2 is stopped, or its IP/DNS changed |
| `git pull` refuses (local changes) | Someone edited files on the server; commit them to the repo instead |

---

## 📡 Primary API Endpoints

Interactive documentation (Swagger UI): `/api/docs` — OpenAPI spec: `/api/openapi.json`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/pets` | Fetch pet list (supports filtering) |
| POST | `/api/applications` | Submit an adoption application |
| PUT | `/api/applications/:id/status` | Update application status (Approve/Reject via ACID transaction) |
| GET | `/api/shelters` | Fetch shelter list and occupancy statistics |
| POST | `/api/care-logs` | Add a clinical/care entry for a pet |
| POST | `/api/match-pet` | Trigger Gemini AI matching algorithm |

---

## 📄 License

Developed for academic research and technology demonstration purposes. All rights reserved by Hoang Thi Khanh Huyen and Ngo Huynh Mai Khoi.
