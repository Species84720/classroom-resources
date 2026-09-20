import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newDeck, validateDeck, moveSlide, canEdit } from '../presentations/src/model.js';
test('templates are valid and retain the required year group',()=>{for(const template of ['blank','lesson','quiz'])assert.equal(validateDeck(newDeck(template)).year_group,'Year 2');});
test('rejects executable image sources, corrupt import types and oversized decks',()=>{
  for(const image of ['javascript:alert(1)','https://tracker.test/photo.png','data:image/svg+xml;base64,AAAA']){const d=newDeck();d.slides[0].image=image;assert.throws(()=>validateDeck(d));}
  const d=newDeck();d.slides=[];assert.throws(()=>validateDeck(d));d.slides=Array(41).fill({});assert.throws(()=>validateDeck(d));
  assert.throws(()=>validateDeck({...newDeck(),title:''}));assert.throws(()=>validateDeck({...newDeck(),theme:'bad'}));
});
test('reordering retains every slide and rejects out-of-bounds moves',()=>{const slides=['a','b','c'];assert.equal(moveSlide(slides,0,2),2);assert.deepEqual(slides,['b','c','a']);assert.equal(moveSlide(slides,0,-1),0);assert.deepEqual(slides,['b','c','a']);});
test('only creator can edit; a login alone is insufficient',()=>{assert.equal(canEdit({ownerId:'alice'},{uid:'alice'}),true);assert.equal(canEdit({ownerId:'alice'},{uid:'bob'}),false);assert.equal(canEdit({ownerId:'alice'},null),false);});

import { newSlide, nestedDemoDeck } from '../presentations/src/model.js';
import { framesFor, removeSlide, clickSteps, defaultAnimation } from '../presentations/src/features.js';
test('old presentations migrate without changing content or requiring a resave',()=>{
  const old=newDeck();old.slides=old.slides.map(({title,body,image,imageAlt,layout,animation,notes})=>({title,body,image,imageAlt,layout,animation,notes}));
  const migrated=validateDeck(old);assert.equal(migrated.slides[0].title,old.slides[0].title);assert.equal(migrated.slides[0].animations.title.effect,'none');assert.equal(migrated.slides[1].canvas.x,1150);assert.equal(validateDeck(migrated).slides[0].id,migrated.slides[0].id);
});
test('nested frames compose positions and sizes; reordering preserves relationships',()=>{
  const deck=nestedDemoDeck(),[root,child,detail]=deck.slides,frames=framesFor(deck.slides);
  assert.equal(frames.get(detail.id).scale,.32*.3);assert.equal(frames.get(detail.id).x,-230+170*.32);
  moveSlide(deck.slides,2,0);assert.deepEqual(framesFor(deck.slides).get(detail.id),frames.get(detail.id));assert.equal(deck.slides[0].parentId,child.id);
});
test('nested cycles, missing parents, duplicate IDs and excessive depth are rejected',()=>{
  const deck=nestedDemoDeck();deck.slides[0].parentId=deck.slides[2].id;deck.slides[0].canvas.scale=.3;assert.throws(()=>validateDeck(deck),/nested inside/);
  const missing=newDeck();missing.slides[0].parentId='missing';missing.slides[0].canvas={x:0,y:0,scale:.3};assert.throws(()=>validateDeck(missing),/missing/);
  const duplicate=newDeck();duplicate.slides[1].id=duplicate.slides[0].id;assert.throws(()=>validateDeck(duplicate),/Duplicate slide/);
  const deep=newDeck('blank');for(let i=0;i<5;i++){const child=newSlide();child.parentId=deep.slides.at(-1).id;deep.slides.push(child);}assert.throws(()=>validateDeck(deep),/four levels/);
});
test('deleting a parent promotes its children while keeping world geometry',()=>{
  const deck=nestedDemoDeck(),detail=deck.slides[2],before=framesFor(deck.slides).get(detail.id);removeSlide(deck.slides,1);const after=framesFor(deck.slides).get(detail.id);
  assert.equal(detail.parentId,deck.slides[0].id);assert.equal(after.x,before.x);assert.equal(after.y,before.y);assert.equal(after.scale,before.scale);assert.doesNotThrow(()=>validateDeck(deck));
});
test('click steps group simultaneous objects and validate animation values',()=>{
  const deck=newDeck('blank'),s=deck.slides[0];s.image='data:image/png;base64,AAAA';s.animations={title:{...defaultAnimation(),trigger:'click',order:5},body:{...defaultAnimation(),trigger:'click',order:2},image:{...defaultAnimation(),trigger:'click',order:2}};
  assert.deepEqual(clickSteps(s),[2,5]);s.animations.title.duration=-1;assert.throws(()=>validateDeck(deck),/Duration/);
});
test('object geometry, IDs and images cannot bypass validation',()=>{
  const deck=newDeck('blank');const e={id:'extra',type:'image',text:'',image:'javascript:alert(1)',imageAlt:'',x:0,y:0,width:100,height:100,fontSize:24,animation:defaultAnimation()};deck.slides[0].elements=[e];assert.throws(()=>validateDeck(deck),/raster/);e.image='';e.x=950;assert.throws(()=>validateDeck(deck),/Object X/);e.x=0;deck.slides[0].elements.push({...e});assert.throws(()=>validateDeck(deck),/Duplicate object/);
});
