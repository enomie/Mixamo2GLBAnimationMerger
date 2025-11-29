import { NodeIO } from '@gltf-transform/core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const io = new NodeIO();

async function inspect(filePath) {
    console.log(`\n--- Inspecting: ${path.basename(filePath)} ---`);
    const doc = await io.read(filePath);
    const root = doc.getRoot();

    const meshes = root.listMeshes();
    console.log(`Total Meshes: ${meshes.length}`);
    meshes.forEach((mesh, index) => {
        console.log(`  Mesh ${index}: "${mesh.getName()}"`);
        mesh.listPrimitives().forEach((prim, pIndex) => {
            const semantics = prim.listSemantics();
            console.log(`    Primitive ${pIndex}: mode=${prim.getMode()}, material="${prim.getMaterial()?.getName()}"`);
            console.log(`      Attributes: ${semantics.join(', ')}`);
        });
    });

    console.log('Nodes:');
    let meshNodes = 0;
    root.listNodes().forEach(node => {
        const mesh = node.getMesh();
        const meshInfo = mesh ? ` [Has Mesh: "${mesh.getName()}"]` : '';
        if (mesh) meshNodes++;
        console.log(`  - "${node.getName()}"${meshInfo}`);
    });
    console.log(`Total Nodes with Meshes: ${meshNodes}`);

    console.log('Animations:');
    root.listAnimations().forEach(anim => {
        console.log(`  - "${anim.getName()}"`);
        // Just print first few distinct targets to avoid spam
        const targets = new Set(anim.listChannels().map(c => c.getTargetNode()?.getName()));
        console.log(`    Targets: ${Array.from(targets).join(', ')}`);
    });
}

async function main() {
    await inspect(path.resolve(__dirname, '../merged/character_all_animations.glb'));
}

main();
