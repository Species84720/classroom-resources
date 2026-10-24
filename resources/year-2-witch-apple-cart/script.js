'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const raw = new URLSearchParams(location.search).get('target');
  const fixed = raw !== null && /^\d+$/.test(raw) && Number(raw) >= 1 && Number(raw) <= 100 ? Number(raw) : null;
  let target, items = [], history = [], won = false, sound = false, audio, drag = null, suppressClick = false, celebrationTimer;
  const apple = () => '<span class="apple" aria-hidden="true"></span>';
  const tray = () => Array.from({length:10}, apple).join('');
  $('ten').querySelector('.tray').innerHTML = tray();
  const total = () => items.reduce((a,b) => a+b, 0);
  function say(message) { $('feedback').textContent = message; }
  function tone(success) {
    if (!sound) return;
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
    $('witch').setAttribute('aria-label','A friendly witch waiting for her apples');
    $('pot').setAttribute('aria-label','A bubbling magic cauldron');
    $('speech').textContent = 'Count the tens, then the ones!';
  }
  function render() {
    const focus = document.activeElement, previousIndex = focus?.dataset.index;
    $('cargo').replaceChildren();
    items.forEach((value,index) => {
      const button = document.createElement('button');
      button.className = 'cart-item ' + (value === 10 ? 'bundle' : 'single'); button.dataset.index = index;
      button.setAttribute('aria-label',`Remove ${value === 10 ? 'a tray of 10 apples' : 'one apple'} from the cart`);
      button.disabled = won;
      button.innerHTML = value === 10 ? `<span class="tray" aria-hidden="true">${tray()}</span><span class="item-value">10</span>` : `${apple()}<span class="item-value">1</span>`;
      button.addEventListener('click', () => {
        if (won || drag) return;
        history.push([...items]); items.splice(index,1); neutral(); render();
        const remaining = $('cargo').children;
        (remaining[Math.min(index,remaining.length-1)] || $('one')).focus();
        say(`Removed ${value} ${value === 1 ? 'apple' : 'apples'}. Count your cart again.`);
      });
      $('cargo').append(button);
    });
    if (previousIndex !== undefined && $('cargo').children[previousIndex]) $('cargo').children[previousIndex].focus();
    $('empty').hidden = items.length > 0;
    $('tens').textContent = items.filter(x=>x===10).length;
    $('ones').textContent = items.filter(x=>x===1).length;
    $('total').textContent = `${total()} apples`;
    $('submit').disabled = won;
    $('ten').disabled = won; $('one').disabled = won;
    $('undo').disabled = !history.length || won; $('clear').disabled = !items.length || won;
  }
  function add(value) {
    if (won) return;
    if (total()+value > 100) { say('Your cart can hold 100 apples. Take some out first.'); return; }
    history.push([...items]);items.push(value);neutral();render();
    say(`Added ${value === 10 ? 'one tray of 10 apples' : 'one apple'}. Count the tens, then the ones.`);
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
  $('undo').addEventListener('click', () => { if (won || !history.length) return;items=history.pop();neutral();render();say('Last change undone. Count your apples again.'); });
  $('clear').addEventListener('click', () => { if (won || !items.length) return;history.push([...items]);items=[];neutral();render();say('The cart is empty. Try building your number again.'); });
  $('submit').addEventListener('click', () => {
    if (won) return;
    const amount=total(); neutral();
    if (amount === target) {
      won=true;document.body.classList.add('happy');
      $('witch').setAttribute('aria-label','The witch is happy! Her potion worked.');
      $('pot').setAttribute('aria-label','The successful potion sparkles and bubbles!');
      $('speech').textContent='Hooray! My potion worked!';
      const tens=Math.floor(target/10), ones=target%10;
      say(`Yes! ${target} apples! ${tens} ${tens===1?'ten':'tens'} and ${ones} ${ones===1?'one':'ones'} make ${target}. Magic!`);
      tone(true);render();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        $('confetti').replaceChildren();
        for(let i=0;i<24;i++){const star=document.createElement('span');star.className='spark';star.textContent=['✦','✨','★'][i%3];star.style.left=`${Math.random()*100}%`;star.style.animationDelay=`${Math.random()*.5}s`;star.style.color=['#8350a3','#c28e21','#b84e61'][i%3];$('confetti').append(star);}
        clearTimeout(celebrationTimer);celebrationTimer=setTimeout(()=>$('confetti').replaceChildren(),3200);
      }
    } else {
      document.body.classList.add('sad');
      $('witch').setAttribute('aria-label','The witch is crying because the potion did not work. You can help her try again.');
      $('pot').setAttribute('aria-label','The potion fizzles into grey bubbles. Try again.');
      $('speech').textContent='Oh dear! My potion fizzled. Let’s try again!';
      say(`${amount} apples — ${amount<target?'too few':'too many'}! We need ${target}. ${amount<target?'Add':'Take out'} some apples and try again.`);tone(false);
    }
  });
  function newRound() {
    if (drag) endDrag({pointerId:drag.id},true);
    const old=target;target=fixed ?? (Math.floor(Math.random()*100)+1);
    if (fixed===null && target===old) target=target%100+1;
    items=[];history=[];won=false;clearTimeout(celebrationTimer);$('confetti').replaceChildren();neutral();$('target').textContent=target;render();
    say(`The potion needs ${target} apples. Count in tens, then count the ones.`);
  }
  $('next').addEventListener('click',newRound);
  $('show-total').addEventListener('change',event=>{$('total').hidden=!event.target.checked;});
  $('sound').addEventListener('click',()=>{sound=!sound;$('sound').setAttribute('aria-pressed',sound);$('sound').textContent=sound?'Sound on':'Sound off';if(sound)tone(true);});
  $('url-note').textContent = raw !== null && fixed === null ? 'The URL target was invalid, so random targets are being used.' : fixed !== null ? `Fixed target: ${fixed} apples.` : 'Random targets: 1–100 apples.';
  newRound();
})();
