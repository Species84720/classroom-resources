import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig, createRecipe } from '../resources/year-2-witch-apple-cart/config.js';

test('default recipe contains three different ingredients and three numbers from 1 to 100', () => {
  const recipe=createRecipe(parseConfig(''));
  assert.equal(recipe.length,3);assert.equal(new Set(recipe.map(x=>x.ingredient)).size,3);
  assert.equal(new Set(recipe.map(x=>x.target)).size,3);
  assert(recipe.every(x=>x.target>=1&&x.target<=100));
});
test('range includes both boundaries, and a single-number range is playable', () => {
  assert.deepEqual(createRecipe(parseConfig('?min=22&max=22')).map(x=>x.target),[22,22,22]);
  const recipe=createRecipe(parseConfig('?min=43&max=45'),()=>0);
  assert.deepEqual(recipe.map(x=>x.target).sort(),[43,44,45]);
});
test('number list overrides range and is sampled without repeats before exhaustion', () => {
  const recipe=createRecipe(parseConfig('?min=1&max=2&numbers=43,22,64'));
  assert.deepEqual(recipe.map(x=>x.target).sort((a,b)=>a-b),[22,43,64]);
  const tiny=createRecipe(parseConfig('?numbers=8,9,8'));
  assert.equal(new Set(tiny.slice(0,2).map(x=>x.target)).size,2);
  assert(tiny.every(x=>[8,9].includes(x.target)));
});
test('legacy target overrides list and range', () => {
  assert.deepEqual(createRecipe(parseConfig('?target=32&numbers=43,22,64&min=1&max=2')).map(x=>x.target),[32,32,32]);
});
test('explicit ingredient order and repeated single ingredient are respected', () => {
  assert.deepEqual(createRecipe(parseConfig('?items=eggs,frogs,apples')).map(x=>x.ingredient),['eggs','frogs','apples']);
  assert.deepEqual(createRecipe(parseConfig('?items=purple-frogs')).map(x=>x.ingredient),['frogs','frogs','frogs']);
});
test('invalid parameters fall back safely with an explanation', () => {
  for(const query of ['?min=60&max=20','?min=0','?max=101','?min=3.5','?numbers=43,,22','?numbers=NaN','?items=snakes','?items=apples,eggs,frogs,apples','?target=0']) {
    const config=parseConfig(query);assert(config.notices.length>0,query);
    assert(createRecipe(config).every(x=>x.target>=1&&x.target<=100));
  }
  const validFallback=parseConfig('?numbers=no&min=20&max=30');
  assert(createRecipe(validFallback).every(x=>x.target>=20&&x.target<=30));
});
test('motion defaults on for the requested desktop animations, with an explicit off option', () => {
  assert.equal(parseConfig('').motion,true);assert.equal(parseConfig('?motion=off').motion,false);
});
