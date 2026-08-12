param(
  [string]$PsdPath = '',
  [string]$OutputPath = 'D:\CURSORpj\gaunwang\website\design\about-ruijun-psd-text-layout.json'
)

$ErrorActionPreference = 'Stop'

function Get-SafeValue {
  param(
    [object]$Object,
    [string]$Property
  )
  try {
    if ($null -eq $Object) { return $null }
    $value = $Object.$Property
    if ($null -eq $value) { return $null }
    if ($value.PSObject.Properties.Name -contains 'Value') {
      try {
        $unitValue = $value.Value
        if ($null -ne $unitValue) { return [double]$unitValue }
      } catch {}
    }
    if ($value -is [ValueType]) {
      try { return [double]$value } catch {}
    }
    try { return [string]$value } catch { return $value }
  } catch {
    return $null
  }
}

function Convert-PointValue {
  param([object]$Point)
  if ($null -eq $Point) { return $null }
  $x = Get-SafeValue $Point 'Horizontal'
  $y = Get-SafeValue $Point 'Vertical'
  if ($null -eq $x) { $x = Get-SafeValue $Point 'X' }
  if ($null -eq $y) { $y = Get-SafeValue $Point 'Y' }
  if ($null -eq $x -and $null -eq $y) {
    try {
      $items = @($Point)
      if ($items.Count -ge 2) {
        $x = if ($items[0] -is [ValueType]) { [double]$items[0] } else { Get-SafeValue $items[0] 'Value' }
        $y = if ($items[1] -is [ValueType]) { [double]$items[1] } else { Get-SafeValue $items[1] 'Value' }
      }
    } catch {}
  }
  return [ordered]@{ x = $x; y = $y }
}

function Convert-BoundsValue {
  param([object]$Bounds)
  if ($null -eq $Bounds) { return $null }
  try {
    $items = @($Bounds)
    if ($items.Count -ge 4) {
      return [ordered]@{
        left = if ($items[0] -is [ValueType]) { [double]$items[0] } else { Get-SafeValue $items[0] 'Value' }
        top = if ($items[1] -is [ValueType]) { [double]$items[1] } else { Get-SafeValue $items[1] 'Value' }
        right = if ($items[2] -is [ValueType]) { [double]$items[2] } else { Get-SafeValue $items[2] 'Value' }
        bottom = if ($items[3] -is [ValueType]) { [double]$items[3] } else { Get-SafeValue $items[3] 'Value' }
      }
    }
  } catch {}
  return $null
}

function Get-PhotoshopLayerRecords {
  param(
    [object]$Layers,
    [string]$ParentPath = ''
  )
  $records = @()
  foreach ($layer in @($Layers)) {
    $name = ''
    $kind = $null
    $visible = $null
    $opacity = $null
    try { $name = [string]$layer.Name } catch {}
    try { $kind = [int]$layer.Kind } catch {}
    try { $visible = [bool]$layer.Visible } catch {}
    try { $opacity = [double]$layer.Opacity } catch {}
    $layerPath = if ($ParentPath) { "$ParentPath/$name" } else { $name }
    $childCount = 0
    try { $childCount = [int]$layer.Layers.Count } catch {}
    if ($childCount -gt 0) {
      $records += Get-PhotoshopLayerRecords $layer.Layers $layerPath
      continue
    }
    $record = [ordered]@{
      path = $layerPath
      name = $name
      kind = $kind
      visible = $visible
      opacity = $opacity
      bounds = $null
      text = $null
      font = $null
      size = $null
      leading = $null
      tracking = $null
      kerning = $null
      justification = $null
      autoLeading = $null
      position = $null
    }
    try { $record.bounds = Convert-BoundsValue $layer.Bounds } catch {}
    if ($kind -eq 2) {
      try {
        $textItem = $layer.TextItem
        $record.text = [string]$textItem.Contents
        $record.font = [string]$textItem.Font
        $record.size = Get-SafeValue $textItem 'Size'
        $record.leading = Get-SafeValue $textItem 'Leading'
        $record.tracking = Get-SafeValue $textItem 'Tracking'
        $record.kerning = Get-SafeValue $textItem 'Kerning'
        $record.justification = [string]$textItem.Justification
        $record.autoLeading = Get-SafeValue $textItem 'AutoLeading'
        $record.position = Convert-PointValue $textItem.Position
      } catch {}
    }
    $records += [PSCustomObject]$record
  }
  return $records
}

$workspaceRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if ([string]::IsNullOrWhiteSpace($PsdPath)) {
  $PsdPath = Get-ChildItem -LiteralPath $workspaceRoot -Filter '*.psd' -File |
    Where-Object { $_.Name.Length -gt 9 } |
    Sort-Object Length -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}
if ([string]::IsNullOrWhiteSpace($PsdPath) -or !(Test-Path -LiteralPath $PsdPath)) {
  throw 'Could not resolve the About Ruijun PSD. Pass -PsdPath explicitly.'
}

$photoshop = New-Object -ComObject Photoshop.Application
$photoshop.Visible = $true
$document = $null
$resolvedPsdPath = (Resolve-Path -LiteralPath $PsdPath).Path
foreach ($candidate in @($photoshop.Documents)) {
  try {
    if ([string]$candidate.FullName -eq [string]$resolvedPsdPath) {
      $document = $candidate
      break
    }
  } catch {}
}
if ($null -eq $document) {
  $document = $photoshop.Open($resolvedPsdPath)
}

$directory = Split-Path -Parent $OutputPath
if (!(Test-Path -LiteralPath $directory)) {
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
}

$allLayers = @(Get-PhotoshopLayerRecords $document.Layers)
$export = [ordered]@{
  source = $PsdPath
  document = [ordered]@{
    name = [string]$document.Name
    width = Get-SafeValue $document 'Width'
    height = Get-SafeValue $document 'Height'
    resolution = Get-SafeValue $document 'Resolution'
  }
  textLayers = @($allLayers | Where-Object { $_.kind -eq 2 })
  layers = $allLayers
  exportedAt = (Get-Date).ToString('o')
}

$export | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Output "Exported $($export.textLayers.Count) text layers to $OutputPath"
