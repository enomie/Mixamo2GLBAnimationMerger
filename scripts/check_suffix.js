import { NodeIO } from '@gltf-transform/core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const io = new NodeIO();
const glbPath = path.resolve(__dirname, '../merged/character_all_animations.glb');

async function check() {
    console.log(`Checking ${glbPath}...`);
    const doc = await io.read(glbPath);
    const root = doc.getRoot();

    let found = false;
    root.listAnimations().forEach(anim => {
        anim.listChannels().forEach(channel => {
            const target = channel.getTargetNode();
            if (target && target.getName().includes('_17')) {
                console.log(`FOUND _17: Animation "${anim.getName()}" -> Node "${target.getName()}"`);
                found = true;
            }
        });
    });

    if (!found) {
        console.log('✅ No track targets with "_17" found in the file.');
    } else {
        console.log('❌ Found track targets with "_17"!');
    }
}

check().catch(console.error);
