const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
	const exists = fs.existsSync(src);
	const stats = exists && fs.statSync(src);
	const isDirectory = exists && stats.isDirectory();

	if (isDirectory) {
		if (!fs.existsSync(dest)) {
			fs.mkdirSync(dest, { recursive: true });
		}
		fs.readdirSync(src).forEach((childItemName) => {
			copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
		});
	} else if (exists) {
		const ext = path.extname(src);
		if (ext === '.svg' || ext === '.json' || ext === '.png') {
			const destDir = path.dirname(dest);
			if (!fs.existsSync(destDir)) {
				fs.mkdirSync(destDir, { recursive: true });
			}
			fs.copyFileSync(src, dest);
			console.log(`Copied asset: ${src} -> ${dest}`);
		}
	}
}

const rootDir = path.resolve(__dirname, '..');
const nodesSrc = path.join(rootDir, 'nodes');
const nodesDest = path.join(rootDir, 'dist', 'nodes');

copyRecursiveSync(nodesSrc, nodesDest);

const credentialsSrc = path.join(rootDir, 'credentials');
const credentialsDest = path.join(rootDir, 'dist', 'credentials');
copyRecursiveSync(credentialsSrc, credentialsDest);

console.log('Asset copy complete.');
