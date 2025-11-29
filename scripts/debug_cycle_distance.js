import { NodeIO } from '@gltf-transform/core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const io = new NodeIO();
const glbPath = path.resolve(__dirname, '../merged/character_all_animations.glb');

async function debug() {
    const doc = await io.read(glbPath);
    const root = doc.getRoot();
    
    const walkAnim = root.listAnimations().find(a => a.getName() === '36-walk');
    if (!walkAnim) {
        console.log('❌ 36-walk animation not found');
        return;
    }
    
    console.log(`\n🔍 Debugging 36-walk animation:`);
    console.log(`Channels: ${walkAnim.listChannels().length}`);
    
    const rootOrHipsNode = root.listNodes().find(node => {
        const nodeName = node.getName().toLowerCase();
        return nodeName.includes('armature');
    });
    
    if (!rootOrHipsNode) {
        console.log('❌ CharacterArmature node not found');
        console.log('Available nodes:', root.listNodes().map(n => n.getName()).slice(0, 10));
        return;
    }
    
    console.log(`✅ Found node: ${rootOrHipsNode.getName()}`);
    
    let foundChannel = false;
    walkAnim.listChannels().forEach((channel, i) => {
        const targetNode = channel.getTargetNode();
        const targetPath = channel.getTargetPath();
        if (targetNode === rootOrHipsNode) {
            foundChannel = true;
            console.log(`\n📊 Channel ${i}:`);
            console.log(`  - Target Node: ${targetNode.getName()}`);
            console.log(`  - Target Path: ${targetPath}`);
            
            const sampler = channel.getSampler();
            if (sampler) {
                const input = sampler.getInput();
                const output = sampler.getOutput();
                if (input && output) {
                    const times = input.getArray();
                    const values = output.getArray();
                    console.log(`  - Times length: ${times?.length || 0}`);
                    console.log(`  - Values length: ${values?.length || 0}`);
                    if (times && values && times.length >= 2 && values.length >= 6) {
                        const firstZ = values[2];
                        const lastZ = values[(times.length - 1) * 3 + 2];
                        const distance = Math.abs(lastZ - firstZ);
                        console.log(`  - First Z: ${firstZ.toFixed(4)}`);
                        console.log(`  - Last Z: ${lastZ.toFixed(4)}`);
                        console.log(`  - Distance: ${distance.toFixed(4)}`);
                    }
                }
            }
        }
    });
    
    if (!foundChannel) {
        console.log('❌ No channel found for CharacterArmature');
        console.log('Available target nodes:', [...new Set(walkAnim.listChannels().map(c => c.getTargetNode()?.getName()).filter(Boolean))].slice(0, 10));
    }
}

debug().catch(console.error);

