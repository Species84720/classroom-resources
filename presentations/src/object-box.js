const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function moveBox(box,dx,dy){return {...box,x:clamp(box.x+dx,0,960-box.width),y:clamp(box.y+dy,0,540-box.height)};}
export function resizeBox(box,handle,dx,dy){
  let left=box.x,top=box.y,right=box.x+box.width,bottom=box.y+box.height;
  if(handle.includes('w'))left=clamp(left+dx,0,right-40);
  if(handle.includes('e'))right=clamp(right+dx,left+40,960);
  if(handle.includes('n'))top=clamp(top+dy,0,bottom-30);
  if(handle.includes('s'))bottom=clamp(bottom+dy,top+30,540);
  return {...box,x:left,y:top,width:right-left,height:bottom-top};
}
export function applyObjectBox(node,box){
  Object.assign(node.style,{position:'absolute',left:`${box.x}px`,top:`${box.y}px`,width:`${box.width}px`,height:`${box.height}px`,maxWidth:'none',maxHeight:'none',margin:'0',fontSize:`${box.fontSize}px`,overflow:'hidden',boxSizing:'border-box'});
}
