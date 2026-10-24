// URL settings are parsed independently so invalid input never creates an unplayable recipe.
const ingredientKeys = ['apples', 'eggs', 'frogs'];
export const INGREDIENTS = {
  apples: { singular:'apple', plural:'apples', image:'assets/apple.webp' },
  eggs: { singular:'dragon egg', plural:'dragon eggs', image:'assets/dragon-egg.webp' },
  frogs: { singular:'purple frog', plural:'purple frogs', image:'assets/purple-frog.webp' }
};
function whole(raw) {
  return raw !== null && /^\d+$/.test(raw.trim()) && Number(raw) >= 1 && Number(raw) <= 100 ? Number(raw) : null;
}
export function parseConfig(search) {
  const params = new URLSearchParams(search), notices = [];
  let min = whole(params.get('min')) ?? 1, max = whole(params.get('max')) ?? 100;
  if ((params.has('min') && whole(params.get('min')) === null) || (params.has('max') && whole(params.get('max')) === null) || min > max) {
    min = 1; max = 100; notices.push('Invalid range: using 1–100.');
  }
  let numbers = null;
  if (params.has('numbers')) {
    const tokens = params.get('numbers').split(',').map(x=>x.trim()), values = tokens.map(whole);
    if (values.length && values.every(x=>x !== null)) numbers = [...new Set(values)];
    else notices.push('Invalid number list: using the range instead.');
  }
  const fixed = whole(params.get('target'));
  if (params.has('target') && fixed === null) notices.push('Invalid fixed target: using the list or range instead.');
  let ingredients = null;
  if (params.has('items') && params.get('items') !== 'random') {
    const aliases = {apple:'apples',egg:'eggs','dragon-eggs':'eggs',frog:'frogs','purple-frogs':'frogs'};
    const tokens = params.get('items').split(',').map(x=>x.trim().toLowerCase()).map(x=>aliases[x] || x);
    if (tokens.length >= 1 && tokens.length <= 3 && tokens.every(x=>ingredientKeys.includes(x))) ingredients=tokens;
    else notices.push('Invalid ingredients: using a random recipe.');
  }
  return {min,max,numbers,fixed,ingredients,motion:params.get('motion') !== 'off',notices};
}
function shuffle(values, random) {
  const result=[...values];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function createRecipe(config, random=Math.random) {
  const pool = config.fixed !== null ? [config.fixed] : config.numbers ?? Array.from({length:config.max-config.min+1},(_,i)=>config.min+i);
  let bag=[];
  const ingredients=config.ingredients || shuffle(ingredientKeys,random);
  return Array.from({length:3},(_,i)=>{
    if(!bag.length) bag=shuffle(pool,random);
    return {target:bag.pop(),ingredient:ingredients[i%ingredients.length]};
  });
}
