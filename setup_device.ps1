# Script Setup Fisik (Multi-Device) untuk Rentsync
# Harap jalankan script ini sebagai Administrator jika diperlukan.

Write-Host "===================================="
Write-Host " Setup Perangkat Cabang Rentsync "
Write-Host "===================================="

Write-Host "`nPilih Jaringan Koneksi P2P:"
Write-Host "1. ZeroTier"
Write-Host "2. Local Switch"
$networkChoice = Read-Host "Pilih (1/2)"

if ($networkChoice -eq "1") { $network = "zerotier" }
elseif ($networkChoice -eq "2") { $network = "switch" }
else { Write-Host "Pilihan tidak valid."; exit }

Write-Host "`nPilih Cabang Setup (Pastikan Anda setup Bekasi terakhir jika belum online):"
Write-Host "1. Bekasi (BKS) - Primary"
Write-Host "2. Bogor (BGR) - Secondary"
Write-Host "3. Depok (DPK) - Secondary"
Write-Host "4. Jakarta (JKT) - Secondary"
Write-Host "5. Tangerang (TGR) - Secondary"
$branchChoice = Read-Host "Pilih Cabang (1-5)"

$branchCode = ""
$branchName = ""

switch ($branchChoice) {
    "1" { $branchCode = "bks"; $branchName = "Bekasi" }
    "2" { $branchCode = "bgr"; $branchName = "Bogor" }
    "3" { $branchCode = "dpk"; $branchName = "Depok" }
    "4" { $branchCode = "jkt"; $branchName = "Jakarta" }
    "5" { $branchCode = "tgr"; $branchName = "Tangerang" }
    default { Write-Host "Pilihan cabang tidak valid."; exit }
}

# Configuration Maps
$zerotier = @{
    bks = @{ ip = '10.11.98.176'; port = 27017 }
    bgr = @{ ip = '10.11.98.80'; port = 27018 }
    dpk = @{ ip = '10.11.98.62'; port = 27019 }
    jkt = @{ ip = '10.11.98.70'; port = 27020 }
    tgr = @{ ip = '10.11.98.149'; port = 27021 }
}
$switch = @{
    bks = @{ ip = '192.168.1.3'; port = 27024 }
    bgr = @{ ip = '192.168.1.6'; port = 27022 }
    dpk = @{ ip = '192.168.1.5'; port = 27026 }
    jkt = @{ ip = '192.168.1.2'; port = 27023 }
    tgr = @{ ip = '192.168.1.4'; port = 27025 }
}

$cfg = if ($network -eq "zerotier") { $zerotier } else { $switch }
$myIp = $cfg[$branchCode].ip
$myPort = $cfg[$branchCode].port
$mongoUri = "mongodb://$($cfg['bks'].ip):$($cfg['bks'].port),$($cfg['bgr'].ip):$($cfg['bgr'].port),$($cfg['dpk'].ip):$($cfg['dpk'].port),$($cfg['jkt'].ip):$($cfg['jkt'].port),$($cfg['tgr'].ip):$($cfg['tgr'].port)/rentsync_${branchCode}?replicaSet=rsRental"

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
        Write-Host "`n[ERROR] MongoDB (mongod.exe) tidak terdeteksi di perangkat ini!" -ForegroundColor Red
        Write-Host "Pastikan MongoDB sudah di-install. Jika sudah, Anda harus menambahkannya ke 'Environment Variables (PATH)' atau biarkan script ini mencari jika di-install di lokasi default."
        exit
    }
}

Write-Host "`n[1/6] Menghentikan service mongod lama..."
Stop-Process -Name "mongod" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "`n[2/6] Membuka port 27017-27026 di Windows Firewall..."
New-NetFirewallRule -DisplayName "MongoDB Rentsync P2P" -Direction Inbound -LocalPort 27017-27026 -Protocol TCP -Action Allow -Profile Any -ErrorAction SilentlyContinue | Out-Null
Write-Host "Port 27017-27026 berhasil dibuka di semua profil firewall."

Write-Host "`n[3/6] Wiping database lokal untuk cabang $branchCode..."
$dbPath = "$PWD\data\$branchCode"
if (Test-Path $dbPath) { Remove-Item -Path $dbPath -Recurse -Force }
New-Item -ItemType Directory -Path $dbPath -Force | Out-Null

Write-Host "`n[4/6] Menyesuaikan file .env..."
$envContent = Get-Content -Path ".env.example" -Raw
$envContent = $envContent -replace "BRANCH_CODE=XYZ", "BRANCH_CODE=$($branchCode.ToUpper())"
$envContent = $envContent -replace "BRANCH_NAME=NamaCabang", "BRANCH_NAME=$branchName"
$envContent = $envContent -replace "HOST_IP=127.0.0.1", "HOST_IP=$myIp"
$envContent = $envContent -replace "MONGO_URI=.*", "MONGO_URI=$mongoUri"
Set-Content -Path ".env" -Value $envContent
Write-Host "File .env berhasil dibuat dengan API Port 4000."

Write-Host "`n[5/6] Starting mongod di background (Port: $myPort, Bind: 0.0.0.0)..."
Start-Process -WindowStyle Hidden -FilePath cmd.exe -ArgumentList "/c $mongodCmd --replSet rsRental --port $myPort --bind_ip_all --dbpath `"$dbPath`""
Write-Host "Menunggu 10 detik agar MongoDB siap..."
Start-Sleep -Seconds 10

if ($branchCode -eq "bks") {
    Write-Host "`n[*] Node Primary (Bekasi) Terdeteksi. Menginisiasi Replica Set rsRental (hanya Bekasi)..."
    $initCmd = @"
rs.initiate({
  _id: 'rsRental',
  members: [
    { _id: 0, host: '$($cfg['bks'].ip):$($cfg['bks'].port)' }
  ]
})
quit()
"@
    $initCmd | mongosh --port $myPort --quiet
    Write-Host "Menunggu Replica Set stabil (10 detik)..."
    Start-Sleep -Seconds 10
    
    while ($true) {
        $addMore = Read-Host "`n[OPTIONAL] Apakah ada cabang lain yang SUDAH ONLINE dan ingin ditambahkan ke Replica Set sekarang? (y/n)"
        if ($addMore -match "^[yY]$") {
            Write-Host "1. Bogor (BGR)`n2. Depok (DPK)`n3. Jakarta (JKT)`n4. Tangerang (TGR)"
            $addChoice = Read-Host "Pilih cabang yang SUDAH ONLINE (1-4)"
            $addCode = ""
            switch ($addChoice) {
                "1" { $addCode = "bgr" }
                "2" { $addCode = "dpk" }
                "3" { $addCode = "jkt" }
                "4" { $addCode = "tgr" }
            }
            if ($addCode) {
                Write-Host "Menambahkan $addCode ke Replica Set..."
                $addCmd = "rs.add('$($cfg[$addCode].ip):$($cfg[$addCode].port)'); quit()"
                $addCmd | mongosh --port $myPort --quiet
                Write-Host "Perintah penambahan $addCode dikirim."
            } else {
                Write-Host "Pilihan tidak valid."
            }
        } else {
            break
        }
    }
}

Write-Host "`n[6/6] Instalasi Dependencies..."
npm install

if ($branchCode -eq "bks") {
    Write-Host "`n[*] Node Primary Terdeteksi. Menjalankan Seeding..."
    $env:NETWORK_MODE = $network
    node seeders/seed.js
} else {
    Write-Host "`n[*] Node Secondary Terdeteksi. Melewati proses seeding (data otomatis tersinkronisasi dari Primary)."
}
Write-Host "`n===================================="
Write-Host " Setup Selesai Sepenuhnya! "
Write-Host "===================================="
Write-Host "Perangkat ini siap digunakan sebagai server cabang $branchName."
Write-Host "Ketik 'npm start' di terminal ini untuk menyalakan server aplikasi.`n"
