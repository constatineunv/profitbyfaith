# =====================================================
# PBF Scheduler Setup
# Run this ONCE as Administrator to register the task
# =====================================================

$ScriptPath = "$env:USERPROFILE\Documents\NinjaTrader 8\PBF_AutoSync.ps1"
$TaskName   = "PBF AutoSync"

# Copy the sync script next to the NT database for easy access
$SourceScript = Join-Path $PSScriptRoot "PBF_AutoSync.ps1"
if (Test-Path $SourceScript) {
    Copy-Item $SourceScript $ScriptPath -Force
    Write-Host "Copied PBF_AutoSync.ps1 to $ScriptPath"
} else {
    Write-Host "WARNING: Source script not found at $SourceScript"
    Write-Host "Manually copy PBF_AutoSync.ps1 to: $ScriptPath"
}

# Remove existing task if present
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Create the task - runs at 11:30 AM ET, Mon-Fri
$action  = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`""

$trigger = New-ScheduledTaskTrigger `
    -Weekly `
    -DaysOfWeek Monday, Tuesday, Wednesday, Thursday, Friday `
    -At "11:30AM"

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName  $TaskName `
    -Action    $action `
    -Trigger   $trigger `
    -Settings  $settings `
    -Principal $principal `
    -Force | Out-Null

Write-Host ""
Write-Host "Task '$TaskName' created successfully!"
Write-Host "Runs: Mon-Fri at 11:30 AM (your local time)"
Write-Host ""
Write-Host "To test manually right now:"
Write-Host "  powershell -File $ScriptPath -Debug"
Write-Host ""
Write-Host "To view logs:"
$logPath = "$env:USERPROFILE\Documents\NinjaTrader 8\pbf_sync_log.txt"
Write-Host "  notepad $logPath"
