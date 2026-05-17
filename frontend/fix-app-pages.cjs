const fs = require('fs')
const path = 'src/App.jsx'

let source = fs.readFileSync(path, 'utf8')

const brokenBlock = `    relatorios: <RelatoriosPage toast={toast} />,


  return (`

const fixedBlock = `    relatorios: <RelatoriosPage toast={toast} />,
    financeiro: <FinanceiroPage toast={toast} />,
    reservas: <ReservasPage toast={toast} />,
    portal: <PortalMorador user={user} />,
  };

  return (`

if (!source.includes(fixedBlock)) {
  if (!source.includes(brokenBlock)) {
    throw new Error('Could not find broken pages block in src/App.jsx')
  }

  source = source.replace(brokenBlock, fixedBlock)
  fs.writeFileSync(path, source)
  console.log('Patched src/App.jsx pages block for build')
} else {
  console.log('src/App.jsx pages block already patched')
}
