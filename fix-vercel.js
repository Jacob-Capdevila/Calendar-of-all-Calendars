const fs = require('fs');
const path = require('path');

// Target the folders Vercel keeps deleting
const distAssetsNM = path.join(__dirname, 'dist', 'assets', 'node_modules');
const distAssetsVendor = path.join(__dirname, 'dist', 'assets', 'vendor_assets');

console.log('🛠️  Starting Vercel Override...');

// 1. Rename the folder to trick Vercel
if (fs.existsSync(distAssetsNM)) {
    fs.renameSync(distAssetsNM, distAssetsVendor);
    console.log('✅ Renamed restricted folder to "vendor_assets"');
} else {
    console.log('⚠️  Could not find assets/node_modules. Did you run the expo export command?');
}

// 2. Find and replace the forbidden URL in your compiled code
const jsDir = path.join(__dirname, 'dist', '_expo', 'static', 'js', 'web');
if (fs.existsSync(jsDir)) {
    fs.readdirSync(jsDir).forEach(file => {
        if (file.endsWith('.js')) {
            const filePath = path.join(jsDir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            if (content.includes('/assets/node_modules/')) {
                // Replace all mentions of node_modules with vendor_assets
                content = content.replace(/\/assets\/node_modules\//g, '/assets/vendor_assets/');
                fs.writeFileSync(filePath, content);
                console.log(`✅ Successfully tricked Vercel routing in: ${file}`);
            }
        }
    });
}

console.log('🚀 App is secured. You can now run: npx vercel');