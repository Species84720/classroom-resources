import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';

// Resolve project illustrations before the browser-independent deck validator runs.
// Paths are relative to the plan, and the delivered PPTX/backup embed the bytes.
export async function embedPlanImages(plan, directory) {
  const result=structuredClone(plan), root=await realpath(directory), cache=new Map();
  async function embed(object) {
    if(object.imagePrompt && !object.imagePath && !object.image)throw new Error('Generate the requested illustration first, then set imagePath to its local PNG or JPEG file.');
    if(!object.imagePath)return;
    if(object.image)throw new Error('Choose imagePath or embedded image data for each picture.');
    if(typeof object.imagePath!=='string'||/^[a-z][a-z0-9+.-]*:/i.test(object.imagePath)||isAbsolute(object.imagePath))throw new Error('Use an imagePath relative to the PowerPoint plan.');
    if(typeof object.imageAlt!=='string'||!object.imageAlt.trim())throw new Error('Add imageAlt describing each illustration.');
    const path=await realpath(resolve(root,object.imagePath)), child=relative(root,path);
    if(child==='..'||child.startsWith('../')||isAbsolute(child))throw new Error('Keep illustration files inside the plan directory.');
    if(!cache.has(path)){
      const info=await stat(path);
      if(!info.isFile()||info.size>300000)throw new Error('Resize or compress the illustration to under 300 KB before embedding.');
      const bytes=await readFile(path);
      const mime=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':null;
      if(!mime)throw new Error('Use a PNG or JPEG illustration.');
      cache.set(path,`data:${mime};base64,${bytes.toString('base64')}`);
    }
    object.image=cache.get(path);
    delete object.imagePath;delete object.imagePrompt;
  }
  for(const slide of result.slides||[]){
    await embed(slide);
    if(slide.image && slide.layout==null)slide.layout='split';
    for(const object of slide.elements||[])await embed(object);
  }
  return result;
}
