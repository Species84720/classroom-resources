import { build } from 'esbuild';
import { rm, mkdir, copyFile } from 'node:fs/promises';
await rm('presentations/dist', { recursive:true, force:true });
await build({ entryPoints:['presentations/src/studio.js','presentations/src/cloud.js'], outdir:'presentations/dist', bundle:true, format:'esm', splitting:true, minify:true, target:['es2022'], platform:'browser', legalComments:'linked' });
// Publish only site assets, never development dependencies or emulator files.
if(process.argv.includes('--site')){
  const { cp } = await import('node:fs/promises');
  await rm('_site',{recursive:true,force:true});await mkdir('_site');
  for(const path of ['index.html','app.js','styles.css','resources.json','resources','presentations']) await cp(path,`_site/${path}`,{recursive:true,filter:source=>!source.includes('/src')});
}
