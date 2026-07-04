(()=>{
  if(!location.search.includes('portal=')) return;

  const digits = (value='') => String(value).replace(/\D/g,'');
  const fmtPhone = (value='') => {
    const d = digits(value);
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return String(value || '');
  };
  const iconFor = (text='') => {
    const t = String(text).toLowerCase();
    if (t.includes('portaria') || t.includes('porteiro')) return '🚪';
    if (t.includes('bombeiro') || t.includes('193')) return '🔥';
    if (t.includes('policia') || t.includes('polícia') || t.includes('190')) return '🚓';
    if (t.includes('samu') || t.includes('ambul') || t.includes('192')) return '🚑';
    if (t.includes('sind')) return '👷';
    if (t.includes('admin')) return '🏢';
    if (t.includes('manut') || t.includes('zelador')) return '🛠️';
    return '📞';
  };
  const isExactContactsTitle = (el) => {
    const t = (el.textContent || '').trim().toLowerCase();
    return t === 'contatos úteis' || t === 'contatos uteis' || t === 'contatos / colaboradores';
  };
  const phoneRegex = /(?:\+?55\s*)?\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}|\b\d{3}\b/;

  function button(href, text, primary=false){
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    a.target = primary ? '_blank' : '_self';
    a.rel = 'noopener noreferrer';
    a.style.cssText = primary
      ? 'display:flex;align-items:center;justify-content:center;text-decoration:none;color:#fff;background:#22C55E;border-radius:14px;padding:11px 9px;font-size:13px;font-weight:900;box-shadow:0 10px 22px rgba(34,197,94,.22);'
      : 'display:flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid #DDE7DE;color:#0B6B3A;background:#fff;border-radius:14px;padding:11px 9px;font-size:13px;font-weight:900;';
    return a;
  }

  function formatCard(card){
    if(card.dataset.tnmContactCard === '1') return;
    const raw = card.innerText || '';
    const lines = raw.split('\n').map(x=>x.trim()).filter(Boolean);
    if(!lines.length) return;
    const phoneMatch = raw.match(phoneRegex);
    const phone = phoneMatch ? phoneMatch[0] : '';
    if(!phone) return;
    const d = digits(phone);
    const name = lines[0] || 'Contato';
    const role = lines.find(x => x !== name && !phoneRegex.test(x) && !x.includes('@')) || 'Contato do condomínio';
    const email = lines.find(x => x.includes('@')) || '';
    const wa = d.length > 3 ? (d.startsWith('55') ? d : '55' + d) : '';

    card.dataset.tnmContactCard = '1';
    card.innerHTML = '';
    card.style.cssText += ';padding:17px!important;border-radius:22px!important;background:#fff!important;box-shadow:0 16px 36px rgba(1,23,12,.16)!important;border:1px solid #E6EEE4!important;';

    const top = document.createElement('div');
    top.style.cssText = 'display:grid;grid-template-columns:56px 1fr;gap:13px;align-items:center;margin-bottom:13px;';

    const ic = document.createElement('div');
    ic.textContent = iconFor(name + ' ' + role + ' ' + phone);
    ic.style.cssText = 'width:56px;height:56px;border-radius:20px;background:#DCFCE7;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9);';

    const info = document.createElement('div');
    info.innerHTML = `<div style="font-family:Sora,sans-serif;font-size:15px;font-weight:900;color:#0C140D;line-height:1.15">${name}</div><div style="font-size:12px;color:#68766D;margin-top:5px">${role}</div>`;
    top.append(ic, info);
    card.appendChild(top);

    const tel = document.createElement('div');
    tel.textContent = '📞 ' + fmtPhone(phone);
    tel.style.cssText = 'font-size:13px;color:#26342A;background:#F5F8F3;border:1px solid #E4ECE2;border-radius:13px;padding:9px 11px;margin-bottom:10px;font-weight:800;';
    card.appendChild(tel);

    if(email){
      const em = document.createElement('div');
      em.textContent = '✉️ ' + email;
      em.style.cssText = 'font-size:12px;color:#68766D;margin:-2px 0 12px;word-break:break-word;';
      card.appendChild(em);
    }

    const actions = document.createElement('div');
    actions.style.cssText = `display:grid;grid-template-columns:${wa ? '1fr 1fr' : '1fr'};gap:8px;margin-top:8px;`;
    actions.appendChild(button('tel:' + d, '📞 Ligar'));
    if(wa) actions.appendChild(button(['https://wa','.me/'].join('') + wa, '💬 WhatsApp', true));
    card.appendChild(actions);
  }

  function run(){
    const title = [...document.querySelectorAll('h1,h2,h3')].find(isExactContactsTitle);
    if(!title) return;
    const area = title.parentElement;
    if(!area) return;
    const cards = [...area.querySelectorAll('.card')].filter(card => (card.innerText || '').trim().length > 4);
    cards.forEach(formatCard);
  }

  setInterval(run, 500);
  document.addEventListener('DOMContentLoaded', () => setTimeout(run, 300));
  document.addEventListener('click', () => setTimeout(run, 100), true);
})();
