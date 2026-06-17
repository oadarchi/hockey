# 🏒 AA Dīķa Čempionāts

Hokeja treniņu app ar reālu datubāzi. Node.js + Express + SQLite.

---

## Ātrā uzstādīšana

```bash
# 1. Klonē projektu
git clone <repo-url> dike-app
cd dike-app

# 2. Instalē servera atkarības
npm install

# 3. Instalē un uzbūvē klientu
cd client
npm install
npm run build
cd ..

# 4. Palaid
npm start
```

App pieejama: **http://localhost:3001**

---

## Izstrādes režīms (2 termināļi)

```bash
# Terminālis 1 — serveris
npm run dev

# Terminālis 2 — klients ar hot reload
cd client && npm run dev
# → http://localhost:5173 (ar proxy uz :3001)
```

---

## Failu struktūra

```
dike-app/
├── server/
│   ├── index.js     ← Express server ar visiem API routes
│   └── db.js        ← SQLite schema + seed dati (47 spēlētāji, sezona 2026)
├── client/
│   ├── src/
│   │   ├── App.jsx          ← Pilna React app (visi skati)
│   │   ├── main.jsx
│   │   └── utils/
│   │       ├── api.js       ← Visi API fetch izsaukumi
│   │       └── helpers.js   ← autoSplit, fmt, POS_META
│   ├── index.html
│   └── vite.config.js
├── data/
│   └── dike.db      ← SQLite datubāze (auto-izveidota pirmajā palaišanā)
├── package.json
└── README.md
```

---

## API

| Metode | URL | Apraksts |
|--------|-----|----------|
| POST | `/api/auth/login` | Admin pieteikšanās |
| POST | `/api/auth/logout` | Izrakstīšanās |
| GET | `/api/auth/status` | Vai pieteicies? |
| GET | `/api/seasons` | Visas sezonas |
| POST | `/api/seasons` | Jauna sezona (admin) |
| GET | `/api/seasons/:id/standings` | Sezonas tabula |
| GET | `/api/players?season_id=X` | Spēlētāji ar statistiku |
| POST | `/api/players` | Jauns spēlētājs |
| PATCH | `/api/players/:id` | Rediģē spēlētāju |
| GET | `/api/games?season_id=X` | Spēļu saraksts |
| GET | `/api/games/:id` | Spēle ar komandām |
| PATCH | `/api/games/:id` | Atcelt / pārcelt |
| POST | `/api/games/:id/teams` | Saglabāt komandu sastāvu |
| POST | `/api/games/:id/result` | Rezultāts + punktu piešķiršana |

---

## Vides mainīgie (.env)

```env
PORT=3001
ADMIN_PASSWORD=volvo2026
SUPERADMIN_PASSWORD=developer2026
SESSION_SECRET=mains-slepens-teksts-2026
DB_PATH=./data/dike.db
NODE_ENV=production
```

**Lomas:** parastais admins (`ADMIN_PASSWORD`) kārto spēļu dienas, rezultātus un sezonas. Superadmins (`SUPERADMIN_PASSWORD`) papildus rediģē spēlētāju **skill** reitingus un drīkst **dzēst** spēlētājus/sezonas.

Izveido `.env` failu projekta saknē un Node.js to nolasīs.

---

## Hostings (VPS / Railway / Render)

### Railway (vienkāršākais)

Projektā jau ir `railway.json` (build/start) un `.nvmrc` (Node 22) — Railway tos nolasa automātiski.

**1. Aizpush uz GitHub**
```bash
git init && git add -A && git commit -m "Railway deploy"
git branch -M main
git remote add origin <tavs-github-repo>
git push -u origin main
```

**2. Railway → New Project → Deploy from GitHub repo**
Railway pats palaiž: `npm install` → `npm run build` (uzbūvē klientu) → `npm start`.

**3. ⚠️ Pievieno Volume (KRITISKI — citādi dati pazūd katrā deployā)**
- Service → **Variables** → New Volume
- Mount path: `/data`
- Tas dod pastāvīgu disku SQLite failam.

**4. Pievieno vides mainīgos** (Service → Variables):

| Mainīgais | Vērtība |
|-----------|---------|
| `DB_PATH` | `/data/dike.db` ← norāda DB uz volume |
| `ADMIN_PASSWORD` | parastā admina parole |
| `SUPERADMIN_PASSWORD` | superadmina parole (skill + dzēšana) |
| `SESSION_SECRET` | garš nejaušs teksts |
| `NODE_ENV` | `production` |

`PORT` **nav jāuzliek** — Railway to iedod automātiski, un serveris lasa `process.env.PORT`.

**5. Generate Domain**
Settings → Networking → Generate Domain → publiskais URL.

> **Piezīme par sesijām:** lietotne lieto `MemoryStore`, tāpēc pēc katra deploya/restarta admins tiek izlogots (jāpiesakās no jauna). Mazai lietotnei tas ir OK. Ja gribi noturīgas sesijas, var pievienot `connect-sqlite3` (sesijas tajā pašā volume DB) — pasaki, un sataisīšu.

### VPS (Ubuntu)
```bash
# Instalē Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Klonē un uzbūvē
git clone <repo> /var/www/dike
cd /var/www/dike
npm install
cd client && npm install && npm run build && cd ..

# PM2 (process manager)
sudo npm install -g pm2
pm2 start server/index.js --name dike
pm2 startup && pm2 save
```

### Nginx konfigurācija
```nginx
server {
    listen 80;
    server_name dike.tavs-domens.lv;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Logo pievienošana

`App.jsx` sākumā:
```js
const LOGO = "data:image/png;base64,<ielīmē base64>";
```

Vai pārvērt ar:
```bash
python3 -c "import base64; print(base64.b64encode(open('logo.png','rb').read()).decode())"
```

---

## Parole maiņa

`server/index.js` vai `.env`:
```
ADMIN_PASSWORD=jaunaparole2027
```

---

## Jaunas sezonas sākšana

1. Admin → Sezonas → Ieraksti nosaukumu, sākumu, beigas
2. App automātiski ģenerē visas trešdienas šajā periodā
3. Iepriekšējā sezona saglabājas Arhīvā

---

## Problēmu novēršana

**`better-sqlite3` kompilācijas kļūda:**
```bash
npm install --build-from-source better-sqlite3
```

**Ports jau aizņemts:**
```bash
PORT=3002 npm start
```

**Datubāze bojāta:**
```bash
rm data/dike.db && npm start  # atjauno no sākuma
```
