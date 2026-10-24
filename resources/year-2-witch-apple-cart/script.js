import { INGREDIENTS, parseConfig, createRecipe } from './config.js';
(() => {
  const $ = id => document.getElementById(id);
  let config = parseConfig(location.search), recipe, question = 0;
  let target, ingredient, items = [], history = [], won = false, audio, drag = null, suppressClick = false, celebrationTimer;
  let motion = config.motion, soundReady = false;
  const names = () => INGREDIENTS[ingredient];
  const nameFor = count => count === 1 ? names().singular : names().plural;
  const apple = () => `<span class="apple" aria-hidden="true" style="background-image:url('${names().image}')"></span>`;
  const tray = () => Array.from({length:10}, apple).join('');
  const total = () => items.reduce((a,b) => a+b, 0);
  function say(message) { $('feedback').textContent = message; }
  function tone(success) {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      (success ? [523,659,784] : [330,247]).forEach((frequency,i) => {
        const oscillator = audio.createOscillator(), gain = audio.createGain(), start = audio.currentTime+i*.14;
        oscillator.frequency.value = frequency; oscillator.type = 'sine';
        gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(.08,start+.02); gain.gain.exponentialRampToValueAtTime(.0001,start+.3);
        oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+.32);
      });
    } catch { /* Audio is optional. */ }
  }
  function neutral() {
    document.body.classList.remove('happy','sad');
    $('witch').setAttribute('aria-label',`A friendly witch waiting for ${names().plural}`);
    $('pot').setAttribute('aria-label','A bubbling magic cauldron');
    $('speech').textContent = `Please bring me ${target} ${nameFor(target)}!`;
  }
  function render() {
    const focus = document.activeElement, previousIndex = focus?.dataset.index;
    $('cargo').replaceChildren();
    items.forEach((value,index) => {
      const button = document.createElement('button');
      button.className = 'cart-item ' + (value === 10 ? 'bundle' : 'single'); button.dataset.index = index;
      button.setAttribute('aria-label',`Remove ${value === 10 ? `a tray of 10 ${names().plural}` : `one ${names().singular}`} from the cart`);
      button.disabled = won;
      button.innerHTML = value === 10 ? `<span class="tray" aria-hidden="true">${tray()}</span><span class="item-value">10</span>` : `${apple()}<span class="item-value">1</span>`;
      button.addEventListener('click', () => {
        if (won || drag) return;
        history.push([...items]); items.splice(index,1); neutral(); render();
        const remaining = $('cargo').children;
        (remaining[Math.min(index,remaining.length-1)] || $('one')).focus();
        say(`Removed ${value} ${nameFor(value)}. Count your cart again.`);
      });
      $('cargo').append(button);
    });
    if (previousIndex !== undefined && $('cargo').children[previousIndex]) $('cargo').children[previousIndex].focus();
    $('empty').hidden = items.length > 0;
    $('tens').textContent = items.filter(x=>x===10).length;
    $('ones').textContent = items.filter(x=>x===1).length;
    $('total').textContent = `${total()} ${nameFor(total())}`;
    $('submit').disabled = won;
    $('ten').disabled = won; $('one').disabled = won;
    $('undo').disabled = !history.length || won; $('clear').disabled = !items.length || won;
  }
  function add(value) {
    if (won) return;
    if (total()+value > 100) { say(`Your cart can hold 100 ${names().plural}. Take some out first.`); return; }
    history.push([...items]);items.push(value);neutral();render();
    say(`Added ${value === 10 ? `one tray of 10 ${names().plural}` : `one ${names().singular}`}. Count the tens, then the ones.`);
  }
  function endDrag(event,cancelled=false) {
    if (!drag || event.pointerId !== drag.id) return;
    const current = drag; drag = null;
    const box = $('cart').getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    current.ghost?.remove(); $('cart').classList.remove('over');
    if (current.moved) {
      suppressClick = true; setTimeout(()=>{suppressClick=false;},400);
      if (!cancelled && inside) add(current.value);
    }
  }
  for (const button of document.querySelectorAll('.supply')) {
    button.addEventListener('click', event => { if (event.detail === 0 || !suppressClick) add(Number(button.dataset.value)); });
    button.addEventListener('pointerdown', event => {
      if (won || drag || !event.isPrimary || event.button !== 0) return;
      suppressClick = false;
      drag = {id:event.pointerId,x:event.clientX,y:event.clientY,value:Number(button.dataset.value),source:button,moved:false};
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      if (!drag.moved && Math.hypot(event.clientX-drag.x,event.clientY-drag.y) > 7) {
        drag.moved = true;drag.ghost = document.createElement('div');drag.ghost.className='drag-ghost';drag.ghost.innerHTML=button.innerHTML;document.body.append(drag.ghost);
      }
      if (drag.moved) {
        drag.ghost.style.left=`${event.clientX}px`;drag.ghost.style.top=`${event.clientY}px`;
        const r=$('cart').getBoundingClientRect();$('cart').classList.toggle('over',event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom);
      }
    });
    button.addEventListener('pointerup',event=>endDrag(event));
    button.addEventListener('pointercancel',event=>endDrag(event,true));
    button.addEventListener('lostpointercapture',event=>endDrag(event,true));
  }
  $('undo').addEventListener('click', () => { if (won || !history.length) return;items=history.pop();neutral();render();say('Last change undone. Count your ingredients again.'); });
  $('clear').addEventListener('click', () => { if (won || !items.length) return;history.push([...items]);items=[];neutral();render();say('The cart is empty. Try building your number again.'); });
  $('submit').addEventListener('click', () => {
    if (won) return;
    const amount=total(); neutral();
    if (amount === target) {
      won=true;document.body.classList.add('happy');
      $('witch').setAttribute('aria-label',question===2?'The witch is happy! Her potion worked.':'The witch is happy! This ingredient is correct.');
      $('pot').setAttribute('aria-label',question===2?'The successful potion sparkles and bubbles!':'The correct ingredient is added to the bubbling potion.');
      $('speech').textContent=question === 2 ? 'Hooray! All three ingredients! My potion worked!' : 'Perfect! That ingredient can go in the pot!';
      $('submit').textContent=question === 2 ? 'Potion complete!' : 'Ingredient added!';
      $('next').disabled=false;
      $('next').textContent=question === 2 ? 'New potion →' : 'Next ingredient →';
      renderProgress();
      const tens=Math.floor(target/10), ones=target%10;
      say(`Yes! ${target} ${nameFor(target)}! ${tens} ${tens===1?'ten':'tens'} and ${ones} ${ones===1?'one':'ones'} make ${target}. Magic!`);
      if(question===2)say($('feedback').textContent+' All three ingredients are ready. Your potion is complete!');
      tone(true);render();
      speak(question === 2 ? 'Hooray! All three ingredients are correct. My potion worked!' : 'Well done! Now for my next ingredient.');
      if (motion) {
        $('confetti').replaceChildren();
        for(let i=0;i<24;i++){const star=document.createElement('span');star.className='spark';star.textContent=['✦','✨','★'][i%3];star.style.left=`${Math.random()*100}%`;star.style.setProperty('--star-delay',`${Math.random()*.8}s`);star.style.color=['#8350a3','#c28e21','#b84e61'][i%3];$('confetti').append(star);}
        clearTimeout(celebrationTimer);celebrationTimer=setTimeout(()=>$('confetti').replaceChildren(),5500);
      }
    } else {
      document.body.classList.add('sad');
      $('witch').setAttribute('aria-label','The witch is crying because the potion did not work. You can help her try again.');
      $('pot').setAttribute('aria-label','The potion fizzles into grey bubbles. Try again.');
      $('speech').textContent='Oh dear! My potion fizzled. Let’s try again!';
      say(`${amount} ${nameFor(amount)} — ${amount<target?'too few':'too many'}! We need ${target}. ${amount<target?'Add':'Take out'} some ${names().plural} and try again.`);tone(false);
      speak(`Oh dear, my potion fizzled! I need ${target} ${nameFor(target)}. Try again.`);
    }
  });
  function speak(message = `Please bring me ${target} ${nameFor(target)} for my potion.`) {
    if (!soundReady || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(message);speech.lang='en-GB';speech.rate=.9;
      const voice=speechSynthesis.getVoices().find(voice=>voice.lang==='en-GB');if(voice)speech.voice=voice;
      speechSynthesis.speak(speech);
    } catch { /* Written instructions remain visible when speech is unavailable. */ }
  }
  function unlockSound() { if (soundReady) return;soundReady=true;speak(); }
  document.addEventListener('pointerdown',unlockSound,{once:true,capture:true});
  document.addEventListener('keydown',unlockSound,{once:true,capture:true});
  $('hear').addEventListener('click',()=>{soundReady=true;speak();});
  function renderProgress() {
    $('progress').replaceChildren();
    recipe.forEach((step,index)=>{
      const li=document.createElement('li'), complete=index<question || (index===question && won);
      li.className=complete?'complete':index===question?'current':'';
      if(index===question)li.setAttribute('aria-current','step');
      const image=document.createElement('img');image.src=INGREDIENTS[step.ingredient].image;image.alt='';image.width=30;image.height=32;
      const label=document.createElement('span');label.textContent=`${complete?'✓ ':''}${index+1}. ${INGREDIENTS[step.ingredient].plural}`;
      li.append(image,label);$('progress').append(li);
    });
    $('question').textContent=won && question===2 ? 'Potion complete · 3 of 3 ingredients' : `Ingredient ${question+1} of 3`;
  }
  function setMotion(enabled) {
    motion=enabled;document.documentElement.dataset.motion=motion?'on':'off';
    $('motion').setAttribute('aria-pressed',String(motion));$('motion').textContent=motion?'Animations on':'Animations off';
    if(!motion){clearTimeout(celebrationTimer);$('confetti').replaceChildren();}
  }
  $('motion').addEventListener('click',()=>setMotion(!motion));
  function startQuestion() {
    if(drag)endDrag({pointerId:drag.id},true);
    ({target,ingredient}=recipe[question]);items=[];history=[];won=false;clearTimeout(celebrationTimer);$('confetti').replaceChildren();
    neutral();$('target').textContent=target;$('ingredient-name').textContent=nameFor(target);
    $('pick-title').textContent=`Pick your ${names().plural}`;
    $('instructions').replaceChildren(document.createTextNode(`Drag ${names().plural} from the table into the cart. A whole tray is 10 ${names().plural}!`));
    $('ten').querySelector('.tray').innerHTML=tray();
    $('ten').querySelector('small').textContent=`10 ${names().plural} together`;
    $('ten').setAttribute('aria-label',`Add a tray of 10 ${names().plural} to the cart`);
    $('one').querySelector('.apple').style.backgroundImage=`url('${names().image}')`;
    $('one').querySelector('strong').textContent=`Single ${names().singular}`;
    $('one').querySelector('small').textContent=`1 ${names().singular}`;
    $('one').setAttribute('aria-label',`Add one ${names().singular} to the cart`);
    $('cart').setAttribute('aria-label',`${names().plural} cart. Drop ingredients here.`);
    $('empty').textContent=`Drop your ${names().plural} here`;
    $('cart-help').textContent='Tap ingredients in the cart to take them out.';
    $('submit').textContent='✦ Add to the potion!';$('next').disabled=true;$('next').textContent=question===2?'Finish this ingredient':'Next ingredient →';
    renderProgress();render();say(`The potion needs ${target} ${nameFor(target)}. Count in tens, then count the ones.`);speak();
  }
  function startRecipe() { recipe=createRecipe(config);question=0;startQuestion(); }
  $('next').addEventListener('click',()=>{if(!won)return;if(question<2){question++;startQuestion();}else startRecipe();});
  $('restart').addEventListener('click',startRecipe);
  $('show-total').addEventListener('change',event=>{$('total').hidden=!event.target.checked;});
  function fillSettings() {
    $('min').value=config.min;$('max').value=config.max;$('numbers').value=config.numbers?.join(', ') || '';
    $('fixed').value=config.fixed ?? '';
    for(let i=0;i<3;i++)$('item-'+i).value=config.ingredients ? config.ingredients[i%config.ingredients.length] : 'random';
    $('settings-status').textContent=[config.fixed !== null?`Fixed target: ${config.fixed}.`:config.numbers?`Choose only from: ${config.numbers.join(', ')}.`:`Choose numbers from ${config.min} to ${config.max}.`,...config.notices].join(' ');
  }
  $('settings').addEventListener('submit',event=>{
    event.preventDefault();
    const low=Number($('min').value),high=Number($('max').value),list=$('numbers').value.trim(),fixed=$('fixed').value.trim();
    if(low>high){$('settings-status').textContent='The minimum must be no greater than the maximum.';$('min').focus();return;}
    const params=new URLSearchParams();params.set('min',low);params.set('max',high);
    if(list){const values=list.split(',').map(x=>x.trim());if(!values.every(x=>/^\d+$/.test(x)&&Number(x)>=1&&Number(x)<=100)){$('settings-status').textContent='Use a comma-separated list of whole numbers from 1 to 100.';$('numbers').focus();return;}params.set('numbers',values.join(','));}
    if(fixed)params.set('target',fixed);
    const selected=Array.from({length:3},(_,i)=>$('item-'+i).value);
    if(selected.some(x=>x!=='random'))params.set('items',selected.map(x=>x==='random'?Object.keys(INGREDIENTS)[Math.floor(Math.random()*3)]:x).join(','));
    params.set('motion',motion?'on':'off');
    config=parseConfig(params);window.history.replaceState(null,'','?'+params.toString());fillSettings();startRecipe();say('Settings applied. '+$('feedback').textContent);
  });
  setMotion(motion);fillSettings();startRecipe();
})();
