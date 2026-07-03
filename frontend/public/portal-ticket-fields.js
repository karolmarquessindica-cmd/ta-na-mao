(() => {
  if (!location.search.includes('portal=')) return;
  const dados = { nome: '', whatsapp: '', apartamento: '', bloco: '' };

  function createInput(label, key, placeholder) {
    const wrap = document.createElement('div');
    wrap.className = 'fg';
    const lab = document.createElement('label');
    lab.textContent = label;
    const input = document.createElement('input');
    input.placeholder = placeholder;
    input.addEventListener('input', () => { dados[key] = input.value.trim(); });
    wrap.appendChild(lab);
    wrap.appendChild(input);
    return wrap;
  }

  function setTextareaValue(textarea, value) {
    const proto = Object.getPrototypeOf(textarea);
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor && descriptor.set) descriptor.set.call(textarea, value);
    else textarea.value = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function beforeSend(modal) {
    const textarea = modal.querySelector('textarea');
    if (!textarea) return;
    const linhas = [];
    if (dados.nome) linhas.push('Nome: ' + dados.nome);
    if (dados.whatsapp) linhas.push('WhatsApp: ' + dados.whatsapp);
    if (dados.apartamento) linhas.push('Apartamento: ' + dados.apartamento);
    if (dados.bloco) linhas.push('Bloco: ' + dados.bloco);
    if (!linhas.length) return;
    const current = textarea.value || '';
    if (current.includes('Dados do morador:')) return;
    setTextareaValue(textarea, (current + '\n\nDados do morador:\n' + linhas.join('\n')).trim());
  }

  function inject() {
    const modal = Array.from(document.querySelectorAll('.modal')).find(el => (el.textContent || '').includes('Abrir Chamado'));
    if (!modal || modal.querySelector('[data-ticket-resident-fields]')) return;
    const labels = Array.from(modal.querySelectorAll('label'));
    const categoriaLabel = labels.find(el => (el.textContent || '').trim().toLowerCase() === 'categoria');
    const categoriaBlock = categoriaLabel && categoriaLabel.closest('.fg');
    if (!categoriaBlock || !categoriaBlock.parentNode) return;

    const box = document.createElement('div');
    box.setAttribute('data-ticket-resident-fields', '1');
    box.style.background = '#F2FAF1';
    box.style.border = '1px solid #DDE7DE';
    box.style.borderRadius = '14px';
    box.style.padding = '12px';
    box.style.marginBottom = '12px';

    const title = document.createElement('div');
    title.textContent = 'Dados do morador';
    title.style.fontWeight = '900';
    title.style.color = '#003B24';
    title.style.fontSize = '13px';
    title.style.marginBottom = '9px';
    box.appendChild(title);

    const row1 = document.createElement('div');
    row1.className = 'row2';
    row1.appendChild(createInput('Nome', 'nome', 'Nome do morador'));
    row1.appendChild(createInput('WhatsApp', 'whatsapp', '(85) 99999-9999'));
    box.appendChild(row1);

    const row2 = document.createElement('div');
    row2.className = 'row2';
    row2.appendChild(createInput('Apartamento', 'apartamento', 'Ex: 101'));
    row2.appendChild(createInput('Bloco', 'bloco', 'Ex: A'));
    box.appendChild(row2);

    categoriaBlock.parentNode.insertBefore(box, categoriaBlock);

    Array.from(modal.querySelectorAll('button')).forEach(btn => {
      if ((btn.textContent || '').includes('Enviar chamado')) {
        btn.addEventListener('pointerdown', () => beforeSend(modal), true);
        btn.addEventListener('click', () => beforeSend(modal), true);
      }
    });
  }

  setInterval(inject, 800);
  document.addEventListener('click', () => setTimeout(inject, 150), true);
})();
