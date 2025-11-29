import { NodeIO } from '@gltf-transform/core';
import { dedup, unpartition, prune, reorder } from '@gltf-transform/functions';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basePath = path.resolve(__dirname, '../converted/base/character.glb');
const animDir = path.resolve(__dirname, '../converted/animations/');
const outputPath = path.resolve(__dirname, '../merged/character_all_animations.glb');

if (!fs.existsSync(basePath)) {
    console.error('❌ Base-Datei nicht gefunden:', basePath);
    process.exit(1);
}

if (!fs.existsSync(animDir)) {
    console.error('❌ Animations-Ordner nicht gefunden:', animDir);
    process.exit(1);
}

const io = new NodeIO();

async function mergeAnimations() {
    console.log('📖 Lade Base-Modell...');
    const baseDoc = await io.read(basePath);
    const root = baseDoc.getRoot();

    // 0. Sanitize Base Node Names (Remove dots to avoid Three.js PropertyBinding issues)
    root.listNodes().forEach(node => {
        const oldName = node.getName();
        const newName = oldName.replace(/\./g, ''); // Index4.L -> Index4L
        if (oldName !== newName) {
            node.setName(newName);
            // console.log(`Renamed: ${oldName} -> ${newName}`);
        }
    });

    // 1. Index Base Nodes with fuzzy matching support
    const baseNodeMap = new Map();
    const normalize = (name) => name.replace(/_\d+$/, '').replace(/\./g, '').toLowerCase();

    root.listNodes().forEach(node => {
        baseNodeMap.set(node.getName(), node);
        baseNodeMap.set(normalize(node.getName()), node);
    });
    
    const baseAnimations = root.listAnimations();
    baseAnimations.forEach(anim => {
        const animName = anim.getName();
        if (animName === 'mixamo.com' || !animName || animName === '(unnamed)') {
            console.log(`🗑️  Entferne Base-Animation: "${animName}"`);
            anim.dispose();
        }
    });
    
    console.log(`ℹ️  Base Model Nodes: ${root.listNodes().length} (Map size: ${baseNodeMap.size})`);

    const animFiles = fs.readdirSync(animDir).filter(f => f.endsWith('.glb'));
    if (animFiles.length === 0) {
        console.error('❌ Keine GLB-Animationen gefunden in:', animDir);
        process.exit(1);
    }

    console.log(`📖 Lade und verarbeite ${animFiles.length} Animation(en)...`);

    for (const file of animFiles) {
        const animPath = path.join(animDir, file);
        const animDoc = await io.read(animPath);
        const animRoot = animDoc.getRoot();
        const baseName = path.basename(file, '.glb');

        // 2. Tag Animation Nodes with Original Name
        animRoot.listNodes().forEach(node => {
            node.setExtras({ ...node.getExtras(), originalName: node.getName() });
        });

        // 3. Prepare Animation
        const animations = animRoot.listAnimations();
        animations.forEach(clip => {
            clip.setName(baseName);
        });

        // 4. Merge
        baseDoc.merge(animDoc);

        // 5. Retarget Animation Tracks
        const mergedAnim = root.listAnimations().find(a => a.getName() === baseName);

        if (mergedAnim) {
            let retargetedCount = 0;
            let removedCount = 0;

            mergedAnim.listChannels().forEach(channel => {
                const targetNode = channel.getTargetNode();
                if (!targetNode) return;

                const originalName = targetNode.getExtras()?.originalName;

                if (originalName) {
                    // Try exact match first, then normalized
                    let baseNode = baseNodeMap.get(originalName);
                    if (!baseNode) {
                        baseNode = baseNodeMap.get(normalize(originalName));
                    }

                    if (baseNode) {
                        channel.setTargetNode(baseNode);
                        retargetedCount++;
                    } else {
                        // Log failure
                        console.warn(`      ⚠️  Failed to retarget: ${originalName} (Norm: ${normalize(originalName)})`);
                        channel.dispose();
                        removedCount++;
                    }
                } else {
                    console.warn(`    ⚠️  Track has no originalName`);
                }
            });
            console.log(`  ✅ Merged: ${baseName} (Retargeted: ${retargetedCount}, Pruned: ${removedCount})`);
        }
    }

    console.log('🔄 Bereinige Szene (Prune & Dedup)...');

    // 6. Cleanup
    // Remove all Scenes except the first one (Base Scene)
    // The merge likely added new scenes for each animation file.
    const scenes = root.listScenes();
    scenes.forEach((scene, index) => {
        if (index > 0) scene.dispose();
    });

    // Run optimization to remove the now-orphaned nodes (the duplicate skeletons)
    await baseDoc.transform(
        unpartition(),
        prune(),
        dedup()
    );

    // Verify cleanup
    const finalNodeCount = root.listNodes().length;
    console.log(`📊 Nodes nach Bereinigung: ${finalNodeCount} (Original: ${baseNodeMap.size})`);

    if (finalNodeCount > baseNodeMap.size + 10) { // Tolerance for some extra nodes
        console.warn('⚠️  Warnung: Es scheinen noch duplizierte Nodes vorhanden zu sein.');
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    console.log('💾 Schreibe GLB-Datei...');
    await io.write(outputPath, baseDoc);
    console.log('✅ GLB-Datei geschrieben:', outputPath);

    const finalAnims = root.listAnimations();
    console.log(`✅ Fertig! ${finalAnims.length} Animationen im sauberen Modell.`);

    const docPath = path.resolve(__dirname, '../merged/character_all_animations.md');
    console.log('📝 Erstelle Animationen-Dokumentation...');
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    let md = `# Animationen Dokumentation\n\n`;
    md += `**System & Programmiersprachen:** Node.js, glTF, glTF-Transform\n\n`;
    md += `**Erstellt:** ${dateStr}\n\n`;
    md += `**Gesamt:** ${finalAnims.length} Animation(en)\n\n`;
    md += `## Animationen Liste\n\n`;
    md += `| Name | Dauer (s) | Channels | Samplers |\n`;
    md += `|------|-----------|----------|----------|\n`;
    
    const animDetails = [];
    finalAnims.forEach(anim => {
        const name = anim.getName();
        const channels = anim.listChannels();
        const samplers = anim.listSamplers();
        
        let maxDuration = 0;
        samplers.forEach(sampler => {
            const input = sampler.getInput();
            if (input) {
                const times = input.getArray();
                if (times && times.length > 0) {
                    const lastTime = times[times.length - 1];
                    if (lastTime > maxDuration) {
                        maxDuration = lastTime;
                    }
                }
            }
        });
        
        md += `| ${name} | ${maxDuration.toFixed(3)} | ${channels.length} | ${samplers.length} |\n`;
        
        animDetails.push({
            name,
            duration: maxDuration,
            channels: channels.length,
            samplers: samplers.length
        });
    });
    
    md += `\n## Details\n\n`;
    
    animDetails.forEach(anim => {
        md += `### ${anim.name}\n\n`;
        md += `- **Dauer:** ${anim.duration.toFixed(3)}s\n`;
        md += `- **Channels:** ${anim.channels}\n`;
        md += `- **Samplers:** ${anim.samplers}\n\n`;
    });
    
    fs.writeFileSync(docPath, md, 'utf8');
    console.log(`✅ Dokumentation erstellt: ${docPath}`);
}

mergeAnimations().catch(err => {
    console.error('❌ Fehler:', err);
    process.exit(1);
});
