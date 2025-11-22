# Windows Tűzfal beállítása - Ollama (11434 port)

## Automatikus beállítás (PowerShell - Admin módban)

```powershell
# PowerShell-ben "Run as Administrator" módban
New-NetFirewallRule -DisplayName "Ollama" -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow
```

## Manuális beállítás (Grafikus felület)

### 1. lépés: Tűzfal megnyitása

1. Nyomd meg a **Windows + R** billentyűket
2. Írd be: `wf.msc` és nyomj Enter-t
3. Vagy: Vezérlőpult → Rendszer és biztonság → Windows Defender Tűzfal → Speciális beállítások

### 2. lépés: Bejövő szabály létrehozása

1. A bal oldali menüben kattints a **"Bejövő szabályok"** (Inbound Rules) elemre
2. A jobb oldali panelben kattints a **"Új szabály..."** (New Rule...) gombra

### 3. lépés: Szabály típusa

1. Válaszd ki: **"Port"** → Tovább

### 4. lépés: Protokoll és portok

1. Válaszd ki: **TCP**
2. Válaszd ki: **"Adott helyi portok"** (Specific local ports)
3. Írd be: **11434**
4. Kattints: **Tovább**

### 5. lépés: Művelet

1. Válaszd ki: **"Kapcsolat engedélyezése"** (Allow the connection)
2. Kattints: **Tovább**

### 6. lépés: Profil

1. Jelöld be mindhárom opciót:
   - ✅ **Tartomány** (Domain)
   - ✅ **Magán** (Private)
   - ✅ **Nyilvános** (Public)
2. Kattints: **Tovább**

### 7. lépés: Név és leírás

1. **Név:** `Ollama - Distributed Computing`
2. **Leírás (opcionális):** `Allows incoming connections to Ollama API on port 11434 for distributed computing`
3. Kattints: **Befejezés**

## Ellenőrzés

### PowerShell-ben:

```powershell
# Ellenőrizd, hogy a szabály létezik-e
Get-NetFirewallRule -DisplayName "Ollama"

# Részletes információk
Get-NetFirewallRule -DisplayName "Ollama" | Get-NetFirewallPortFilter
```

### Grafikus felületen:

1. Nyisd meg a Tűzfal beállításokat (`wf.msc`)
2. Bejövő szabályok → Keresd meg: **"Ollama"**
3. Ellenőrizd, hogy **"Engedélyezve"** (Enabled) állapotban van-e

## Tesztelés

### Helyi teszt:

```powershell
# Kliens gépen
curl http://localhost:11434/api/tags
```

### Hálózati teszt (másik gépről vagy szerverről):

```powershell
# Szerverről (Helsinki)
curl http://84.0.200.125:11434/api/tags
```

Ha sikeres, látnod kell:
```json
{"models":[...]}
```

## Hibaelhárítás

### Ha még mindig nem működik:

1. **Ellenőrizd a tűzfalszabályt:**
   ```powershell
   Get-NetFirewallRule -DisplayName "Ollama" | Format-List
   ```

2. **Ellenőrizd, hogy az Ollama fut-e:**
   ```powershell
   netstat -an | findstr :11434
   # Látnod kell: 0.0.0.0:11434
   ```

3. **Ellenőrizd a környezeti változót:**
   ```powershell
   [System.Environment]::GetEnvironmentVariable("OLLAMA_HOST", "Machine")
   # Látnod kell: 0.0.0.0:11434
   ```

4. **Router port forwarding:**
   - Ha NAT mögött vagy, a routerben is be kell állítani a port forwarding-et
   - Port: 11434 → Kliens gép belső IP-je

## Több port engedélyezése (ha szükséges)

Ha más portokat is használsz:

```powershell
# PowerShell-ben (Admin módban)
New-NetFirewallRule -DisplayName "Ollama-11434" -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Ollama-11435" -Direction Inbound -LocalPort 11435 -Protocol TCP -Action Allow
```

## Biztonsági megjegyzések

⚠️ **FIGYELEM:** A 11434 port megnyitása biztonsági kockázatot jelenthet. Ajánlott:

1. **VPN használata** a kliens és szerver között
2. **IP whitelist** (csak bizonyos IP-kről engedélyezett hozzáférés)
3. **TLS/SSL** használata (ha az Ollama támogatja)

## Szabály törlése (ha szükséges)

```powershell
# PowerShell-ben (Admin módban)
Remove-NetFirewallRule -DisplayName "Ollama"
```

