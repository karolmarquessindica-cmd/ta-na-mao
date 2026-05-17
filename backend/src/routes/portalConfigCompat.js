import { Router } from 'express'

// Router de compatibilidade para endpoints legados de configuração do portal.
// Mantido antes do condominioRouter no server para preservar ordem de resolução.
export const portalConfigCompatRouter = Router()
