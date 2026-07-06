# Script Setup Local Development (5 Cabang di 1 PC)
# ==============================================================

# Enforce Administrator (Optional for local, tapi bagus untuk konsistensi)
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "`n[WARNING] Disarankan menjalankan script ini sebagai Administrator (opsional, namun disarankan)." -ForegroundColor Yellow
}

Write-Host "==============================================="
Write-Host " Setup Local Development Lingkungan Rentsync"
Write-Host "==============================================="

$baseDir = (Get-Item -Path ".\").FullName

# Cek ketersediaan MongoDB
$mongodCmd = "mongod"
if (-not (Get-Command $mongodCmd -ErrorAction SilentlyContinue)) {
    $found = $false
    $possiblePaths = @(
        "C:\Program Files\MongoDB\Server\*\bin\mongod.exe",
        "C:\Program Files (x86)\MongoDB\Server\*\bin\mongod.exe"
    )
    foreach ($p in $possiblePaths) {
        $resolved = Resolve-Path $p -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path -First 1
        if ($resolved) {
            $mongodCmd = "`"$resolved`""
            $found = $true
            break
        }
    }
    if (-not $found) {
        Write-Host "`n[ERROR] MongoDB (mongod.exe) tidak terdeteksi!" -ForegroundColor Red
        exit
    }
}

Write-Host "`n[1/6] Menghentikan semua proses mongod..."
$mongodProcesses = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
if ($mongodProcesses) {
    Write-Host "Membunuh proses mongod lama..."
    Stop-Process -Name "mongod" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    # Double kill with taskkill just to be absolutely sure
    taskkill /F /IM mongod.exe 2> $null
    Start-Sleep -Seconds 2
} else {
    Write-Host "Tidak ada proses mongod yang berjalan."
}

$branches = @(
    @{ code = "bks"; name = "Bekasi"; port = 27017; api = 4005 },
    @{ code = "bgr"; name = "Bogor"; port = 27018; api = 4002 },
    @{ code = "dpk"; name = "Depok"; port = 27019; api = 4003 },
    @{ code = "jkt"; name = "Jakarta"; port = 27020; api = 4001 },
    @{ code = "tgr"; name = "Tangerang"; port = 27021; api = 4004 }
)

$replicaSetUri = "mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019,127.0.0.1:27020,127.0.0.1:27021"

Write-Host "`n[2/6] Mempersiapkan direktori database dan menyalakan MongoDB..."
foreach ($b in $branches) {
    $dbPath = "$baseDir\data\local_$($b.code)"
    if (Test-Path $dbPath) { Remove-Item -Path $dbPath -Recurse -Force }
    New-Item -ItemType Directory -Path $dbPath -Force | Out-Null
    
    Start-Process -WindowStyle Hidden -FilePath cmd.exe -ArgumentList "/c $mongodCmd --replSet rsRental --port $($b.port) --bind_ip_all --dbpath `"$dbPath`""
}

Write-Host "Menunggu 10 detik agar MongoDB siap..."
Start-Sleep -Seconds 10

Write-Host "`n[3/6] Menginisiasi Replica Set (rsRental)..."
$initCmd = @"
rs.initiate({
  _id: 'rsRental',
  members: [
    { _id: 0, host: '127.0.0.1:27017' },
    { _id: 1, host: '127.0.0.1:27018' },
    { _id: 2, host: '127.0.0.1:27019' },
    { _id: 3, host: '127.0.0.1:27020' },
    { _id: 4, host: '127.0.0.1:27021' }
  ]
})
quit()
"@
$initCmd | mongosh --port 27017 --quiet
Write-Host "Menunggu Replica Set stabil (10 detik)..."
Start-Sleep -Seconds 10

Write-Host "`n[4/6] Membuat file konfigurasi .env masing-masing cabang..."
$envTemplate = Get-Content -Path ".env.example" -Raw
foreach ($b in $branches) {
    $envContent = $envTemplate -replace "BRANCH_CODE=XYZ", "BRANCH_CODE=$($b.code.ToUpper())"
    $envContent = $envContent -replace "BRANCH_NAME=NamaCabang", "BRANCH_NAME=$($b.name)"
    $envContent = $envContent -replace "HOST_IP=.*", "HOST_IP=127.0.0.1"
    $envContent = $envContent -replace "PORT=4000", "PORT=$($b.api)"
    $envContent = $envContent -replace "MONGO_URI=.*", "MONGO_URI=$replicaSetUri/rentsync_$($b.code)?replicaSet=rsRental"
    
    Set-Content -Path ".env.$($b.code)" -Value $envContent
}

Write-Host "`n[5/6] Instalasi Dependencies (jika belum)..."
npm install

Write-Host "`n[6/6] Menjalankan Seeding Database Lokal..."
node .\local-development\seed-local.js

Write-Host "`n======================================================="
Write-Host " SETUP LOKAL SELESAI!" -ForegroundColor Green
Write-Host "======================================================="
Write-Host "Gunakan file 'local-development/start_servers.ps1' untuk"
Write-Host "menjalankan ke-5 server API (Node.js) secara bersamaan."
