import { newDeck, newSlide, validateDeck, THEMES, MAX_SLIDES } from './model.js';
export function downloadJSON(deck) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(validateDeck(deck),null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`${safeName(deck.title)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const safeName = title => title.replace(/[^a-z0-9 -]/gi,'').trim().slice(0,80)||'presentation';
export async function exportPPTX(deck) {
  const { default:PptxGenJS }=await import('pptxgenjs');
  const pptx = new PptxGenJS(); pptx.layout='LAYOUT_WIDE'; pptx.title=deck.title; pptx.subject=deck.description; pptx.author='Classroom Resources'; pptx.lang='en-GB';
  const colours=THEMES[deck.theme];
  for(const s of deck.slides){
    const positioned=(key,fallback)=>{const b=s.boxes?.[key];return b?{...fallback,x:b.x/72,y:b.y/72,w:b.width/72,h:b.height/72,fontSize:b.fontSize*.75,margin:0}:fallback;};
    const slide=pptx.addSlide();slide.background={color:colours.background.slice(1)};
    slide.addText(s.title,positioned('title',{x:.65,y:.5,w:12,h:1.35,fontSize:32,bold:true,color:colours.ink.slice(1),fontFace:'Aptos',breakLine:false,fit:'shrink',align:s.layout==='title'?'center':'left'}));
    const hasImage=!!s.image, imageWidth=s.layout==='image'?7:5.4, textWidth=hasImage?11.5-imageWidth:12;
    slide.addText(s.body,positioned('body',{x:.65,y:2,w:textWidth,h:4.75,fontSize:24,color:colours.ink.slice(1),fontFace:'Aptos',fit:'shrink',valign:'mid',align:s.layout==='title'?'center':'left'}));
    if(hasImage){const box=positioned('image',{x:13.33-imageWidth-.65,y:2,w:imageWidth,h:4.6});slide.addImage({data:s.image,...box,sizing:{type:'contain',w:box.w,h:box.h},altText:s.imageAlt});}
    for(const object of s.elements||[]){
      const box={x:object.x/72,y:object.y/72,w:object.width/72,h:object.height/72};
      if(object.type==='text')slide.addText(object.text,{...box,fontSize:object.fontSize*.75,color:colours.ink.slice(1),fontFace:'Aptos',fit:'shrink',margin:0,breakLine:false});
      else if(object.image)slide.addImage({data:object.image,...box,sizing:{type:'contain',w:box.w,h:box.h},altText:object.imageAlt});
    }
    if(s.notes)slide.addNotes(s.notes);
  }
  await pptx.writeFile({fileName:`${safeName(deck.title)}.pptx`});
}
function xml(source){
  const doc=new DOMParser().parseFromString(source,'application/xml');
  if(doc.getElementsByTagName('parsererror').length)throw new Error('This PowerPoint contains invalid XML.');return doc;
}
const nodes=(root,local)=>[...root.getElementsByTagNameNS('*',local)];
async function xmlFile(zip,path){const f=zip.file(path);return f?xml(await f.async('string')):null;}
function resolvePath(base,target){
  const result=target.startsWith('/')?[]:base.split('/').slice(0,-1);
  for(const part of target.replace(/^\//,'').split('/')){if(part==='..')result.pop();else if(part!=='.')result.push(part);}return result.join('/');
}
export async function importPresentation(file){
  if(file.size>15*1024*1024)throw new Error('Choose a file smaller than 15 MB.');
  if(file.name.toLowerCase().endsWith('.json'))return {deck:validateDeck(JSON.parse(await file.text())),warning:''};
  if(!file.name.toLowerCase().endsWith('.pptx'))throw new Error('Choose a .pptx file or a studio .json backup.');
  const {default:JSZip}=await import('jszip');const zip=await JSZip.loadAsync(await file.arrayBuffer());
  // Bound decompression before reading ZIP members.
  let expanded=0;
  for(const entry of Object.values(zip.files)){expanded+=entry._data?.uncompressedSize||0;if(expanded>50*1024*1024)throw new Error('PowerPoint is too large when expanded.');}
  const presentation=await xmlFile(zip,'ppt/presentation.xml'), rels=await xmlFile(zip,'ppt/_rels/presentation.xml.rels');
  if(!presentation||!rels)throw new Error('This is not a supported PowerPoint presentation.');
  const relationships=new Map(nodes(rels,'Relationship').filter(r=>r.getAttribute('TargetMode')!=='External').map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
  const paths=nodes(presentation,'sldId').map(s=>relationships.get(s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'))).filter(Boolean).map(p=>resolvePath('ppt/presentation.xml',p));
  if(!paths.length||paths.length>MAX_SLIDES)throw new Error('Import a PowerPoint containing 1–40 slides.');
  const deck=newDeck('blank');deck.title=file.name.replace(/\.pptx$/i,'').slice(0,120);deck.slides=[];
  let imageBudget=0;
  for(const path of paths){
    const source=await xmlFile(zip,path);if(!source)throw new Error('A slide is missing from the PowerPoint.');
    const paragraphs=nodes(source,'p').map(p=>nodes(p,'t').map(t=>t.textContent).join('')).filter(Boolean);
    const s=newSlide((paragraphs.shift()||'Untitled slide').slice(0,180),paragraphs.join('\n').slice(0,2500));
    const relPath=path.replace(/([^/]+)$/,'_rels/$1.rels'), slideRels=await xmlFile(zip,relPath);
    const firstPicture=nodes(source,'pic')[0], imageId=firstPicture&&nodes(firstPicture,'blip')[0]?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed');
    if(slideRels&&imageId){
      const relationship=nodes(slideRels,'Relationship').find(r=>r.getAttribute('Id')===imageId&&r.getAttribute('TargetMode')!=='External');
      const imagePath=relationship&&resolvePath(path,relationship.getAttribute('Target')), imageFile=imagePath&&zip.file(imagePath);
      if(imageFile&&/\.(png|jpe?g|webp)$/i.test(imagePath)){
        const bytes=await imageFile.async('uint8array');
        const mime=/\.png$/i.test(imagePath)?'image/png':/\.webp$/i.test(imagePath)?'image/webp':'image/jpeg';
        const data=await compressImage(new Blob([bytes],{type:mime}));
        if(imageBudget+data.length<480000){s.image=data;imageBudget+=data.length;s.imageAlt=nodes(firstPicture,'cNvPr')[0]?.getAttribute('descr')?.slice(0,200)||'';}
      }
    }
    deck.slides.push(s);
  }
  return {deck:validateDeck(deck),warning:'Imported as editable simple slides. Text and one picture per slide are supported; complex layouts, extra pictures, charts, audio, video and original animations are not preserved. Check the slides before saving.'};
}
export async function compressImage(file){
  if(file.size>10*1024*1024)throw new Error('Choose an image smaller than 10 MB.');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PNG, JPEG or WebP image.');
  const bitmap=await createImageBitmap(file);const scale=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  let quality=.8,data=canvas.toDataURL('image/webp',quality);
  while(data.length>120000&&quality>.25){quality-=.15;data=canvas.toDataURL('image/webp',quality);}
  if(data.length>250000)throw new Error('This picture is too detailed. Use a smaller picture.');
  // JPEG has broader compatibility in PowerPoint than WebP.
  const ctx=canvas.getContext('2d');ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  data=canvas.toDataURL('image/jpeg',Math.max(.3,quality));return data;
}
