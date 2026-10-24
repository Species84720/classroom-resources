import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { embedPlanImages } from './powerpoint-assets.mjs';
import { deckFromPowerPointPlan, missingPowerPointDetails, validatePowerPointBrief } from '../presentations/src/ai-powerpoint.js';
import { createPPTX } from '../presentations/src/powerpoint.js';
const [input, output, flag]=process.argv.slice(2);
try {
  if(!input||!output)throw new Error('Usage: node scripts/generate-powerpoint.mjs plan.json OUTPUT_DIRECTORY [--check]');
  const plan=JSON.parse(await readFile(input,'utf8'));
  if(flag==='--check'){
    const missing=missingPowerPointDetails(plan.brief);
    if(missing.length){console.log(JSON.stringify({questions:missing},null,2));process.exitCode=2;}
    else{validatePowerPointBrief(plan.brief);console.log('Teaching brief complete.');}
  } else {
    const deck=deckFromPowerPointPlan(await embedPlanImages(plan,dirname(resolve(input))));
    const bytes=await createPPTX(deck);
    await mkdir(output,{recursive:true});
    await writeFile(join(output,'presentation.pptx'),bytes);
    await writeFile(join(output,'presentation.json'),JSON.stringify(deck,null,2)+'\n');
    console.log(`Created ${deck.slides.length} editable slides in ${output}.`);
  }
} catch(error){console.error(error.message);process.exitCode=1;}
