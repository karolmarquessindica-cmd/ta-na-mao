const fs = require('fs')
const appPath = 'src/App.jsx'
let source = fs.readFileSync(appPath, 'utf8')

source = source.replace(
  '    if (!docFile || !docForm.titulo) return;',
  '    if (!docFile) return;\n    const resolvedTitle = docForm.titulo || (docFile.name || "Documento").split(".").slice(0, -1).join(".") || docFile.name || "Documento";'
)

source = source.replace(
  '      Object.entries(docForm).forEach(([key,value]) => fd.append(key, value));',
  '      Object.entries({ ...docForm, titulo: resolvedTitle }).forEach(([key,value]) => fd.append(key, value));'
)

source = source.replace(
  'disabled={busy || !docForm.titulo || !docFile}',
  'disabled={busy || !docFile}'
)

fs.writeFileSync(appPath, source)
console.log('Portal document upload title patch applied')
