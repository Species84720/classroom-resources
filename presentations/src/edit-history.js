// Session-local history. Saving does not discard it; opening another deck resets it.
export class EditHistory {
  constructor(limit=60,maxBytes=16000000){this.limit=limit;this.maxBytes=maxBytes;this.reset(null);}
  reset(state){this.past=[];this.future=[];this.current=state?structuredClone(state):null;this.breakGroup();}
  key(state){return JSON.stringify({deck:state.deck,published:state.published});}
  context(selected,objectId){if(this.current){this.current.selected=selected;this.current.objectId=objectId;}}
  breakGroup(){this.group=null;this.time=0;}
  record(state,group=null,now=Date.now()){
    if(!this.current){this.reset(state);return false;}
    if(this.key(this.current)===this.key(state))return false;
    if(!group||group!==this.group||now-this.time>900)this.past.push(this.current);
    this.current=structuredClone(state);this.future=[];this.group=group;this.time=now;
    let bytes=this.key(this.current).length;for(let i=this.past.length-1;i>=0;i--){bytes+=this.key(this.past[i]).length;if(bytes>this.maxBytes){this.past.splice(0,i+1);break;}}
    if(this.past.length>this.limit)this.past.splice(0,this.past.length-this.limit);return true;
  }
  undo(){if(!this.past.length)return null;this.future.push(this.current);this.current=this.past.pop();this.breakGroup();return structuredClone(this.current);}
  redo(){if(!this.future.length)return null;this.past.push(this.current);this.current=this.future.pop();this.breakGroup();return structuredClone(this.current);}
}
