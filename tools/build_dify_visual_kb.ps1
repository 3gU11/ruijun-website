param(
    [Parameter(Mandatory = $true)][string]$SourceRoot,
    [Parameter(Mandatory = $true)][string]$OutputRoot,
    [string]$ImageBaseUrl = "http://172.21.8.85/faq-images"
)

$ErrorActionPreference = "Stop"
$markdownRoot = Join-Path $OutputRoot "markdown"
$imageRoot = Join-Path $OutputRoot "faq-images"
$entrySeparator = "`r`n`r`n<<<FAQ_ENTRY>>>`r`n`r`n"

New-Item -ItemType Directory -Force -Path $markdownRoot, $imageRoot | Out-Null

Get-ChildItem -Path $SourceRoot -Filter *.csv -File | ForEach-Object {
    $sourceFile = $_
    $rows = @(Import-Csv -LiteralPath $sourceFile.FullName)
    $columnName = $rows[0].PSObject.Properties.Name | Select-Object -First 1
    $content = $rows | ForEach-Object { $_.$columnName.Trim() }
    $markdown = "# $($sourceFile.BaseName)`r`n`r`n" + ($content -join $entrySeparator)

    if ($markdown -match '!\[\]\(images/\d+\.jpeg\)') {
        $markdown = [regex]::Replace(
            $markdown,
            '!\[\]\(images/(\d+)\.jpeg\)',
            { param($match) "![Troubleshooting diagram $($match.Groups[1].Value)]($ImageBaseUrl/step/$($match.Groups[1].Value).png)" }
        )
    }

    $destination = Join-Path $markdownRoot ("{0}.md" -f $sourceFile.BaseName)
    [System.IO.File]::WriteAllText($destination, $markdown, [System.Text.UTF8Encoding]::new($true))
}

$combinedDocuments = @(Get-ChildItem -Path $markdownRoot -Filter *.md -File | Sort-Object Name | ForEach-Object {
    Get-Content -LiteralPath $_.FullName -Raw
})
$combinedMarkdown = "# Equipment maintenance FAQ`r`n`r`n" + ($combinedDocuments -join $entrySeparator)
[System.IO.File]::WriteAllText((Join-Path $markdownRoot "FAQ_knowledge_base_visual.md"), $combinedMarkdown, [System.Text.UTF8Encoding]::new($true))

$sourceImageFolders = @(Get-ChildItem -Path $SourceRoot -Directory)
foreach ($sourceImageFolder in $sourceImageFolders) {
    $imageCount = @(Get-ChildItem -LiteralPath $sourceImageFolder.FullName -File).Count
    $targetFolder = switch ($imageCount) {
        43 { "mechanical"; break }
        22 { "step"; break }
        7 { "auto-threading"; break }
        default { "misc-$imageCount"; break }
    }
    $targetPath = Join-Path $imageRoot $targetFolder
    New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
    Get-ChildItem -LiteralPath $sourceImageFolder.FullName -File | Copy-Item -Destination $targetPath -Force
}

$unmappedImages = @()
foreach ($folder in Get-ChildItem -Path $imageRoot -Directory) {
    if ($folder.Name -ne "step") {
        $unmappedImages += Get-ChildItem -Path $folder.FullName -File | ForEach-Object {
            "- [$($folder.Name)/$($_.Name)]($ImageBaseUrl/$($folder.Name)/$($_.Name))"
        }
    }
}

$index = @(
    "# Published image index"
    ""
    "These images are hosted but are not imported for retrieval until they are mapped to specific knowledge entries."
    ""
    $unmappedImages
) -join "`r`n"
[System.IO.File]::WriteAllText((Join-Path $OutputRoot "unmapped-image-index.md"), $index, [System.Text.UTF8Encoding]::new($true))

$report = [ordered]@{
    markdown_files = @(Get-ChildItem -Path $markdownRoot -Filter *.md -File).Count
    hosted_images = @(Get-ChildItem -Path $imageRoot -Recurse -File).Count
    step_image_links = ([regex]::Matches((Get-ChildItem -Path $markdownRoot -Filter *.md | Where-Object { (Get-Content -LiteralPath $_.FullName -Raw) -match [regex]::Escape($ImageBaseUrl) } | Get-Content -Raw), [regex]::Escape($ImageBaseUrl))).Count
}
$report | ConvertTo-Json
