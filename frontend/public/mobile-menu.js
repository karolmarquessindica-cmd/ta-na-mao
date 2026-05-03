(function () {
  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches
  }

  function openAdminMaster() {
    const page = document.querySelector('.page')
    if (!page) return

    page.innerHTML = `
      <div class="admin-master-page">
        <div class="admin-master-hero">
          <div>
            <h1>Painel Master 🚀</h1>
            <p>Controle seus clientes, planos, limites de condomínios e status das contas do SaaS Tá na Mão.</p>
          </div>
          <div class="admin-master-badge">ADMIN MASTER</div>
        </div>

        <div class="admin-master-kpis">
          <div class="admin-master-kpi"><span>Clientes</span><strong>12</strong></div>
          <div class="admin-master-kpi"><span>Condomínios</span><strong>28</strong></div>
          <div class="admin-master-kpi"><span>Receita mensal</span><strong>R$ 8.500</strong></div>
          <div class="admin-master-kpi"><span>Contas ativas</span><strong>10</strong></div>
        </div>

        <div class="admin-master-grid">
          <div class="admin-master-card table-wrap">
            <h3>Clientes do SaaS</h3>
            <p>Controle de síndicos, planos e limite de condomínios.</p>
            <table class="admin-master-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Plano</th>
                  <th>Limite</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Karol Marques</strong><br><small>admin@horizonte.com</small></td>
                  <td><span class="admin-master-pill plan">MASTER</span></td>
                  <td>999 condomínios</td>
                  <td><span class="admin-master-pill ok">Ativo</span></td>
                  <td><div class="admin-master-actions"><button class="admin-master-btn ghost">Editar</button><button class="admin-master-btn">Acessar</button></div></td>
                </tr>
                <tr>
                  <td><strong>Síndico Cliente</strong><br><small>cliente@email.com</small></td>
                  <td><span class="admin-master-pill plan">PRO</span></td>
                  <td>5 condomínios</td>
                  <td><span class="admin-master-pill ok">Ativo</span></td>
                  <td><div class="admin-master-actions"><button class="admin-master-btn ghost">Editar</button><button class="admin-master-btn">Acessar</button></div></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="admin-master-card">
            <h3>Criar/editar plano</h3>
            <p>Defina quantos condomínios o cliente poderá cadastrar.</p>
            <div class="admin-master-form">
              <label>Nome do cliente</label>
              <input placeholder="Ex.: Síndico João" />
              <label>E-mail do usuário</label>
              <input placeholder="cliente@email.com" />
              <label>Plano</label>
              <select>
                <option>BÁSICO — 1 condomínio</option>
                <option>PRO — 5 condomínios</option>
                <option>PREMIUM — 15 condomínios</option>
                <option>MASTER — ilimitado</option>
              </select>
              <label>Limite de condomínios</label>
              <input type="number" placeholder="5" />
              <button class="admin-master-btn">Salvar plano</button>
            </div>
            <div class="admin-master-note">
              Essa tela já prepara o controle SaaS: você define o plano, o limite e o status do cliente. A próxima etapa é conectar esses campos diretamente na API de contas SaaS.
            </div>
          </div>
        </div>
      </div>
    `

    document.body.classList.remove('tnm-menu-open')
  }

  function ensureAdminMasterButton() {
    const sidebar = document.querySelector('.sidebar')
    if (!sidebar) return
    if (sidebar.querySelector('[data-admin-master="true"]')) return

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'nav-item'
    btn.dataset.adminMaster = 'true'
    btn.innerHTML = '🚀 Painel Master'
    btn.addEventListener('click', openAdminMaster)

    const nav = sidebar.querySelector('nav') || sidebar
    nav.insertBefore(btn, nav.firstChild)
  }

  function ensureMobileMenu() {
    ensureAdminMasterButton()

    if (!isMobile()) {
      document.body.classList.remove('tnm-menu-open')
      return
    }

    const sidebar = document.querySelector('.sidebar')
    if (!sidebar) return

    let toggle = document.querySelector('.tnm-menu-toggle')
    if (!toggle) {
      toggle = document.createElement('button')
      toggle.type = 'button'
      toggle.className = 'tnm-menu-toggle'
      toggle.setAttribute('aria-label', 'Abrir menu')
      toggle.innerHTML = '&#9776;'
      document.body.appendChild(toggle)
      toggle.addEventListener('click', function () {
        document.body.classList.add('tnm-menu-open')
      })
    }

    let backdrop = document.querySelector('.tnm-menu-backdrop')
    if (!backdrop) {
      backdrop = document.createElement('div')
      backdrop.className = 'tnm-menu-backdrop'
      document.body.appendChild(backdrop)
      backdrop.addEventListener('click', function () {
        document.body.classList.remove('tnm-menu-open')
      })
    }

    let close = sidebar.querySelector('.tnm-menu-close')
    if (!close) {
      close = document.createElement('button')
      close.type = 'button'
      close.className = 'tnm-menu-close'
      close.setAttribute('aria-label', 'Fechar menu')
      close.innerHTML = '&times;'
      sidebar.insertBefore(close, sidebar.firstChild)
      close.addEventListener('click', function () {
        document.body.classList.remove('tnm-menu-open')
      })
    }

    sidebar.querySelectorAll('.nav-item').forEach(function (item) {
      if (item.dataset.tnmCloseBound === 'true') return
      item.dataset.tnmCloseBound = 'true'
      item.addEventListener('click', function () {
        if (isMobile()) document.body.classList.remove('tnm-menu-open')
      })
    })
  }

  document.addEventListener('DOMContentLoaded', ensureMobileMenu)
  window.addEventListener('resize', ensureMobileMenu)

  const observer = new MutationObserver(function () {
    ensureMobileMenu()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  })
})()
