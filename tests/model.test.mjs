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
