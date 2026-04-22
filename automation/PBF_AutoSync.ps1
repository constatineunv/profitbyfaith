# =================================================
# PBF Auto Sync - NinjaTrader SQLite -> Google Sheets
# Runs via Task Scheduler at 11:30 AM ET Mon-Fri
# =================================================

param([switch]$DryRun, [switch]$Full)

# -- CONFIG ------------------------------------------
$APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbysPnKh_5J2axPy-PLcx0ZWoGSuDWsuHgXVnBFIhf79Spvl-ogQ51UxaIg7RwJrTCXQ/exec"
$DB_PATH         = "$env:USERPROFILE\Documents\NinjaTrader 8\db\NinjaTrader.sqlite"
$SQLITE_DLL      = "C:\Program Files\NinjaTrader 8\bin\System.Data.SQLite.dll"
$LAST_SYNC_FILE  = "$env:USERPROFILE\Documents\NinjaTrader 8\pbf_last_sync.txt"
$LOG_FILE        = "$env:USERPROFILE\Documents\NinjaTrader 8\pbf_sync_log.txt"
$COMMISSION_RT   = 5.76
$ET_ZONE         = [System.TimeZoneInfo]::FindSystemTimeZoneById("Eastern Standard Time")
# ----------------------------------------------------

function Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | $msg"
    Add-Content -Path $LOG_FILE -Value $line
    Write-Host $line
}

Log "=== PBF AutoSync starting ==="

if (-not (Test-Path $SQLITE_DLL)) { Log "ERROR: SQLite DLL not found at $SQLITE_DLL"; exit 1 }
Add-Type -Path $SQLITE_DLL

# Determine sync window
if ($Full) {
    $fromUtc = [datetime]::new(2020, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)
    Log "Full sync mode - pulling all history"
} elseif (Test-Path $LAST_SYNC_FILE) {
    $rawContent = [System.IO.File]::ReadAllText($LAST_SYNC_FILE).Trim()
    $fromUtc = [datetime]::Parse($rawContent, $null, [System.Globalization.DateTimeStyles]::RoundtripKind)
    Log "Incremental sync from $fromUtc UTC"
} else {
    $fromUtc = [datetime]::UtcNow.Date
    Log "No last sync found - pulling today only"
}

$toUtc = [datetime]::UtcNow

$connStr = "Data Source=$DB_PATH;Read Only=True;"
$conn = New-Object System.Data.SQLite.SQLiteConnection $connStr
$conn.Open()
Log "DB opened"

try {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
SELECT
    e.Time,
    a.Name  AS Account,
    m.Name  AS Instrument,
    m.PointValue,
    e.IsEntry, e.IsExit,
    e.Price, e.Quantity,
    e.Position,
    e.Name  AS ExecName
FROM Executions e
JOIN Accounts a          ON e.Account    = a.Id
JOIN Instruments i       ON e.Instrument = i.Id
JOIN MasterInstruments m ON i.MasterInstrument = m.Id
WHERE e.Time > @fromTicks AND e.Time <= @toTicks
  AND a.Name NOT LIKE '%Sim%'
  AND a.Name NOT LIKE '%Playback%'
  AND a.Name NOT LIKE '%Backtest%'
  AND a.Name NOT LIKE '%Demo%'
ORDER BY e.Account, e.Instrument, e.Time
"@
    $cmd.Parameters.AddWithValue("@fromTicks", $fromUtc.Ticks) | Out-Null
    $cmd.Parameters.AddWithValue("@toTicks",   $toUtc.Ticks)   | Out-Null

    $reader = $cmd.ExecuteReader()

    $groups = [System.Collections.Specialized.OrderedDictionary]::new()
    while ($reader.Read()) {
        $key = "$($reader['Account'])|$($reader['Instrument'])"
        if (-not $groups.Contains($key)) {
            $groups[$key] = @{
                Account    = [string]$reader['Account']
                Instrument = [string]$reader['Instrument']
                PointValue = [double]$reader['PointValue']
                Execs      = [System.Collections.Generic.List[pscustomobject]]::new()
            }
        }
        $groups[$key].Execs.Add([PSCustomObject]@{
            TimeUtc   = [datetime]::new([long]$reader['Time'], [DateTimeKind]::Utc)
            IsEntry   = ([int]$reader['IsEntry'] -eq 1)
            IsExit    = ([int]$reader['IsExit']  -eq 1)
            Price     = [double]$reader['Price']
            Qty       = [int]$reader['Quantity']
            Position  = [int]$reader['Position']
            ExecName  = [string]$reader['ExecName']
        })
    }
    $reader.Close()

    Log "Loaded $($groups.Count) account/instrument group(s)"

    $paired = [System.Collections.Generic.List[pscustomobject]]::new()
    $tradeNum = 0

    foreach ($g in $groups.Values) {
        $pv    = if ($g.PointValue -gt 1) { $g.PointValue } else { 20 }
        $queue = [System.Collections.Generic.Queue[pscustomobject]]::new()

        foreach ($ex in ($g.Execs | Sort-Object TimeUtc)) {
            if ($ex.IsEntry) {
                for ($i = 0; $i -lt $ex.Qty; $i++) { $queue.Enqueue($ex) }
            }
            elseif ($ex.IsExit) {
                for ($i = 0; $i -lt $ex.Qty; $i++) {
                    if ($queue.Count -eq 0) { break }
                    $entry  = $queue.Dequeue()
                    $isLong = $entry.Position -gt 0
                    $gross  = if ($isLong) { ($ex.Price - $entry.Price) * $pv } else { ($entry.Price - $ex.Price) * $pv }
                    $net    = [Math]::Round($gross - $COMMISSION_RT, 2)
                    $tradeNum++
                    $entryET = [System.TimeZoneInfo]::ConvertTimeFromUtc($entry.TimeUtc, $ET_ZONE)
                    $exitET  = [System.TimeZoneInfo]::ConvertTimeFromUtc($ex.TimeUtc,    $ET_ZONE)
                    $paired.Add([PSCustomObject]@{
                        tradeNum   = $tradeNum
                        instrument = $g.Instrument
                        account    = $g.Account
                        direction  = if ($isLong) { "Long" } else { "Short" }
                        qty        = 1
                        entryPrice = $entry.Price
                        exitPrice  = $ex.Price
                        entryTime  = $entryET.ToString("M/d/yyyy h:mm:ss tt")
                        exitTime   = $exitET.ToString("M/d/yyyy h:mm:ss tt")
                        entryName  = $entry.ExecName
                        exitName   = $ex.ExecName
                        profit     = $net
                        commission = $COMMISSION_RT
                    })
                }
            }
        }
    }

    Log "Paired $($paired.Count) trade(s)"

    if ($paired.Count -eq 0) {
        Log "Nothing new to sync. Done."
        [datetime]::UtcNow.ToString("o") | Out-File $LAST_SYNC_FILE -Encoding UTF8
        exit 0
    }

    if ($DryRun) {
        $paired | Format-Table tradeNum, instrument, account, direction, entryPrice, exitPrice, profit
        exit 0
    }

    $body     = @{ trades = @($paired) } | ConvertTo-Json -Depth 5 -Compress
    $response = Invoke-RestMethod -Uri $APPS_SCRIPT_URL -Method Post -Body $body `
                    -ContentType "application/json" -TimeoutSec 30
    Log "Apps Script response: $($response | ConvertTo-Json -Compress)"

    [datetime]::UtcNow.ToString("o") | Out-File $LAST_SYNC_FILE -Encoding UTF8
    Log "Sync complete. $($paired.Count) trade(s) sent."

} catch {
    Log "ERROR: $_"
    exit 1
} finally {
    $conn.Close()
    Log "DB closed"
}
