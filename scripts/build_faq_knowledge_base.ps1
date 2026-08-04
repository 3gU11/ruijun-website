param(
    [string]$SourceDirectory,
    [string]$OutputFile
)

if ([string]::IsNullOrWhiteSpace($SourceDirectory) -or [string]::IsNullOrWhiteSpace($OutputFile)) {
    throw 'SourceDirectory and OutputFile are required.'
}

$inputFiles = Get-ChildItem -LiteralPath $SourceDirectory -File -Filter '*.csv' | Sort-Object Name

$sections = [System.Collections.Generic.List[string]]::new()
$sections.Add('# Equipment Maintenance FAQ')
$sections.Add('')
$sections.Add('Use fault symptoms, alarm codes, and component names to search this FAQ.')

foreach ($file in $inputFiles) {
    $filePath = $file.FullName
    $records = Import-Csv -LiteralPath $filePath

    $sections.Add('')
    $sections.Add("## $($file.BaseName)")

    foreach ($record in $records) {
        $content = [string](($record.PSObject.Properties | Select-Object -First 1).Value)
        if ([string]::IsNullOrWhiteSpace($content)) {
            continue
        }

        # Keep each original FAQ entry intact while nesting it under its fault category.
        $content = $content.Trim() -replace '(?m)^(#{1,4})\s+', '##$1 '
        $sections.Add('')
        $sections.Add($content)
        $sections.Add('')
        $sections.Add('---')
    }
}

$outputDirectory = Split-Path -Parent $OutputFile
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
[System.IO.File]::WriteAllText($OutputFile, ($sections -join "`n"), [System.Text.UTF8Encoding]::new($true))

$entryCount = ($inputFiles | ForEach-Object {
    (Import-Csv -LiteralPath $_.FullName).Count
} | Measure-Object -Sum).Sum

Write-Output "Created $OutputFile with $entryCount FAQ entries."
