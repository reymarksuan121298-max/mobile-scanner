Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Administrator\.gemini\antigravity-ide\brain\412039a4-3000-41fd-9041-f967c3099eaa\stl_scanner_logo_1787446982194.jpg"
$baseDir = "C:\Users\Administrator\Desktop\mobile-scanner"

$srcImage = [System.Drawing.Image]::FromFile($srcPath)

function Save-Resized-PNG($image, $targetPath, $width, $height) {
    $targetDir = [System.IO.Path]::GetDirectoryName($targetPath)
    if (!(Test-Path $targetDir)) {
        New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    }
    if (Test-Path $targetPath) {
        Remove-Item -Force $targetPath
    }
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($image, 0, 0, $width, $height)
    $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "Saved: $targetPath ($($width)x$($height))"
}

# Android mipmap densities
Save-Resized-PNG $srcImage "$baseDir\android\app\src\main\res\mipmap-mdpi\ic_launcher.png" 48 48
Save-Resized-PNG $srcImage "$baseDir\android\app\src\main\res\mipmap-mdpi\ic_launcher_round.png" 48 48

Save-Resized-PNG $srcImage "$baseDir\android\app\src\main\res\mipmap-hdpi\ic_launcher.png" 72 72
Save-Resized-PNG $srcImage "$baseDir\android\app\src\main\res\mipmap-hdpi\ic_launcher_round.png" 72 72

Save-Resized-PNG $srcImage "$baseDir\android\app\src\main\res\mipmap-xhdpi\ic_launcher.png" 96 96
Save-Resized-PNG $srcImage "$baseDir\android\app\src\main\res\mipmap-xhdpi\ic_launcher_round.png" 96 96

Save-Resized-PNG $srcImage "$baseDir\android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png" 144 144
Save-Resized-PNG $srcImage "$baseDir\android\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.png" 144 144

Save-Resized-PNG $srcImage "$baseDir\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png" 192 192
Save-Resized-PNG $srcImage "$baseDir\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png" 192 192

# Drawable folders
Save-Resized-PNG $srcImage "$baseDir\android\app\src\main\res\drawable\ic_launcher.png" 192 192
Save-Resized-PNG $srcImage "$baseDir\android\app\src\main\res\drawable\logo.png" 192 192

# Clean any duplicate/conflicting files in drawable subfolders if any
$drawableSubdirs = @("drawable-mdpi", "drawable-hdpi", "drawable-xhdpi", "drawable-xxhdpi", "drawable-xxxhdpi")
foreach ($sub in $drawableSubdirs) {
    $dirPath = "$baseDir\android\app\src\main\res\$sub"
    if (Test-Path $dirPath) {
        Remove-Item -Recurse -Force $dirPath
    }
}

# Assets folder for JS Image components
Save-Resized-PNG $srcImage "$baseDir\src\assets\logo.png" 512 512
Save-Resized-PNG $srcImage "$baseDir\src\assets\icon.png" 512 512

$srcImage.Dispose()
Write-Host "All icons converted to true PNG format successfully!"
