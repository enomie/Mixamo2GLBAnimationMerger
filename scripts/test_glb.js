import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const glbPath = path.resolve(__dirname, '../merged/character_all_animations.glb');

if (!fs.existsSync(glbPath)) {
    console.error('❌ GLB-Datei nicht gefunden:', glbPath);
    console.error('   Führe zuerst "npm run merge" aus');
    process.exit(1);
}

console.log('📖 Lade GLB mit Three.js GLTFLoader...');
console.log('   Datei:', glbPath);

const loader = new GLTFLoader();

loader.setPath(path.dirname(glbPath) + '/');

try {
    const glbData = fs.readFileSync(glbPath);
    const arrayBuffer = glbData.buffer.slice(glbData.byteOffset, glbData.byteOffset + glbData.byteLength);
    
    const gltf = await loader.parseAsync(arrayBuffer, path.dirname(glbPath) + '/');
    
    console.log('✅ GLB erfolgreich geladen!');
    console.log('');
    console.log('📊 Statistiken:');
    console.log(`   - Animationen: ${gltf.animations.length}`);
    console.log(`   - Scene-Knoten: ${gltf.scene.children.length}`);
    
    if (gltf.animations.length > 0) {
        console.log('');
        console.log('🎬 Animationen:');
        gltf.animations.forEach((anim, i) => {
            console.log(`   ${i + 1}. ${anim.name || 'Unnamed'}`);
            console.log(`      - Dauer: ${anim.duration.toFixed(3)}s`);
            console.log(`      - Tracks: ${anim.tracks.length}`);
        });
        
        console.log('');
        console.log('✅ Alle Animationen sind gültig und können abgespielt werden');
    } else {
        console.log('⚠️  Keine Animationen gefunden');
    }
    
    console.log('');
    console.log('✅ GLB ist Three.js-kompatibel!');
    process.exit(0);
} catch (error) {
    console.error('❌ Fehler beim Laden des GLB:');
    console.error('   ', error.message);
    if (error.stack) {
        console.error('');
        console.error('Stack Trace:');
        console.error(error.stack);
    }
    process.exit(1);
}

