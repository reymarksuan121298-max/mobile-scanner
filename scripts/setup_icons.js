const fs = require('fs');
const path = require('path');

const srcImagePath = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\412039a4-3000-41fd-9041-f967c3099eaa\\stl_scanner_logo_1787446982194.jpg';

const targetDirs = [
  'src/assets',
  'android/app/src/main/res/drawable',
  'android/app/src/main/res/drawable-mdpi',
  'android/app/src/main/res/drawable-hdpi',
  'android/app/src/main/res/drawable-xhdpi',
  'android/app/src/main/res/drawable-xxhdpi',
  'android/app/src/main/res/drawable-xxxhdpi',
  'android/app/src/main/res/mipmap-mdpi',
  'android/app/src/main/res/mipmap-hdpi',
  'android/app/src/main/res/mipmap-xhdpi',
  'android/app/src/main/res/mipmap-xxhdpi',
  'android/app/src/main/res/mipmap-xxxhdpi',
];

const projectRoot = path.resolve(__dirname, '..');

targetDirs.forEach((dir) => {
  const fullDir = path.join(projectRoot, dir);
  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir, { recursive: true });
  }

  if (dir.includes('mipmap')) {
    fs.copyFileSync(srcImagePath, path.join(fullDir, 'ic_launcher.png'));
    fs.copyFileSync(srcImagePath, path.join(fullDir, 'ic_launcher_round.png'));
  } else if (dir.includes('drawable')) {
    fs.copyFileSync(srcImagePath, path.join(fullDir, 'ic_launcher.png'));
    fs.copyFileSync(srcImagePath, path.join(fullDir, 'logo.png'));
  } else if (dir === 'src/assets') {
    fs.copyFileSync(srcImagePath, path.join(fullDir, 'logo.png'));
    fs.copyFileSync(srcImagePath, path.join(fullDir, 'icon.png'));
  }
});

console.log('App icons and logo assets successfully copied to all directories.');
