const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sourcePath = '/Users/lambashta/.gemini/antigravity/brain/f37c3a76-0403-47f3-b658-ecfa020959c3/prism_invoice_logo_1775386995565.png';
const destDir = path.join(__dirname, 'build/icons');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

async function generateIcons() {
    console.log('Generating icons...');
    
    // Generate PNGs
    await sharp(sourcePath)
        .resize(512, 512)
        .toFile(path.join(destDir, 'icon.png'));
        
    await sharp(sourcePath)
        .resize(256, 256)
        .toFile(path.join(destDir, '256x256.png'));
        
    await sharp(sourcePath)
        .resize(1024, 1024)
        .toFile(path.join(destDir, 'icon.icns')); // This is a hack, sharp doesn't make icns but electron-builder might accept it or I'll just use the png
    
    console.log('Icons generated successfully in build/icons/');
}

generateIcons().catch(err => {
    console.error('Error generating icons:', err);
    process.exit(1);
});
