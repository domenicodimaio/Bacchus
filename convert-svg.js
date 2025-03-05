const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

// Function to convert SVG to PNG
async function convertSvgToPng(svgPath, pngPath, width, height) {
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    await sharp(svgBuffer)
      .resize(width, height)
      .png()
      .toFile(pngPath);
    
    console.log(`Successfully converted ${svgPath} to ${pngPath}`);
  } catch (error) {
    console.error(`Error converting ${svgPath}:`, error);
  }
}

// Convert icon
convertSvgToPng(
  path.join(__dirname, 'assets/new/icon.svg'),
  path.join(__dirname, 'assets/new/icon.png'),
  1024,
  1024
);

// Convert splash
convertSvgToPng(
  path.join(__dirname, 'assets/new/splash.svg'),
  path.join(__dirname, 'assets/new/splash.png'),
  2048,
  2048
);

// Create adaptive icon (same as regular icon for now)
convertSvgToPng(
  path.join(__dirname, 'assets/new/icon.svg'),
  path.join(__dirname, 'assets/new/adaptive-icon.png'),
  1024,
  1024
);

// Create favicon (smaller version of icon)
convertSvgToPng(
  path.join(__dirname, 'assets/new/icon.svg'),
  path.join(__dirname, 'assets/new/favicon.png'),
  196,
  196
); 