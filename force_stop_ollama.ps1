# Ollama kényszerített leallitasa

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Ollama kényszerített leallitasa" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ollama folyamatok keresese
Write-Host "1. Ollama folyamatok keresese..." -ForegroundColor Yellow
$ollamaProcesses = Get-Process -Name "ollama" -ErrorAction SilentlyContinue

if ($ollamaProcesses) {
    Write-Host "   Talalt Ollama folyamatok: $($ollamaProcesses.Count)" -ForegroundColor White
    foreach ($process in $ollamaProcesses) {
        Write-Host "   - PID: $($process.Id), Name: $($process.Name), Path: $($process.Path)" -ForegroundColor White
    }
} else {
    Write-Host "   Nincs futó Ollama folyamat" -ForegroundColor Green
}

# 2. Port foglaltsag ellenorzes
Write-Host ""
Write-Host "2. Port 11434 foglaltsag ellenorzes..." -ForegroundColor Yellow
$portListeners = netstat -ano | findstr :11434
if ($portListeners) {
    Write-Host "   Port 11434 foglalt:" -ForegroundColor White
    Write-Host $portListeners -ForegroundColor White
    
    # PID kinyerese
    $pids = $portListeners | ForEach-Object {
        if ($_ -match '\s+(\d+)\s*$') {
            $matches[1]
        }
    } | Select-Object -Unique
    
    if ($pids) {
        Write-Host "   Talalt PID-ek: $($pids -join ', ')" -ForegroundColor White
    }
} else {
    Write-Host "   Port 11434 szabad" -ForegroundColor Green
}

# 3. Kényszerített leallitas
Write-Host ""
Write-Host "3. Kényszerített leallitas..." -ForegroundColor Yellow

# Eloszor taskkill
Write-Host "   taskkill /F /IM ollama.exe futtatasa..." -ForegroundColor Cyan
$taskkillResult = cmd /c "taskkill /F /IM ollama.exe 2>&1"
Write-Host $taskkillResult -ForegroundColor White

Start-Sleep -Seconds 3

# Ellenorzes
$remainingProcesses = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if ($remainingProcesses) {
    Write-Host ""
    Write-Host "   Meg mindig fut Ollama folyamat!" -ForegroundColor Red
    Write-Host "   Probáljuk meg PID alapján leallitani..." -ForegroundColor Yellow
    
    foreach ($process in $remainingProcesses) {
        Write-Host "   Leallitas PID: $($process.Id)..." -ForegroundColor Cyan
        try {
            Stop-Process -Id $process.Id -Force -ErrorAction Stop
            Write-Host "   OK: PID $($process.Id) leallitva" -ForegroundColor Green
        } catch {
            Write-Host "   ERROR: Nem sikerult leallitani PID $($process.Id): $_" -ForegroundColor Red
        }
    }
    
    Start-Sleep -Seconds 2
}

# 4. Végleges ellenorzes
Write-Host ""
Write-Host "4. Végleges ellenorzes..." -ForegroundColor Yellow
$finalCheck = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
$portCheck = netstat -ano | findstr :11434

if ($finalCheck) {
    Write-Host "   FIGYELMEZTETES: Meg mindig fut Ollama folyamat!" -ForegroundColor Red
    Write-Host "   PID-ek: $($finalCheck.Id -join ', ')" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Probáld meg manuálisan:" -ForegroundColor Yellow
    foreach ($proc in $finalCheck) {
        Write-Host "   Stop-Process -Id $($proc.Id) -Force" -ForegroundColor White
    }
} else {
    Write-Host "   OK: Nincs futó Ollama folyamat" -ForegroundColor Green
}

if ($portCheck) {
    Write-Host "   FIGYELMEZTETES: Port 11434 meg mindig foglalt!" -ForegroundColor Red
    Write-Host "   Valoszinu masik folyamat hasznalja" -ForegroundColor Yellow
} else {
    Write-Host "   OK: Port 11434 szabad" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
if (-not $finalCheck -and -not $portCheck) {
    Write-Host "OK: Ollama leallitva, port szabad!" -ForegroundColor Green
    Write-Host "Most mar elindithatod: ollama serve" -ForegroundColor Cyan
} else {
    Write-Host "FIGYELMEZTETES: Ollama vagy port meg mindig foglalt!" -ForegroundColor Red
}
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

