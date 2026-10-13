import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Add only the three tables required by the budget feature.
  // Deliberately do not run db push: the existing production schema contains
  // legacy tables (including GestaoAcao) that are not represented in Prisma.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OrcamentoCondominio" (
        "id" TEXT NOT NULL,
        "ano" INTEGER NOT NULL,
        "dataAssembleia" TIMESTAMP(3),
        "referenciaAta" TEXT,
        "observacoes" TEXT,
        "criadoPor" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "condominioId" TEXT NOT NULL,
        CONSTRAINT "OrcamentoCondominio_pkey" PRIMARY KEY ("id")
      )
    `);
    await tx.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OrcamentoCategoria" (
        "id" TEXT NOT NULL,
        "categoria" TEXT NOT NULL,
        "descricao" TEXT,
        "valorMensal" DECIMAL(12,2) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "orcamentoId" TEXT NOT NULL,
        CONSTRAINT "OrcamentoCategoria_pkey" PRIMARY KEY ("id")
      )
    `);
    await tx.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OrcamentoRevisao" (
        "id" TEXT NOT NULL,
        "acao" TEXT NOT NULL,
        "snapshot" JSONB NOT NULL,
        "motivo" TEXT,
        "usuarioId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "orcamentoId" TEXT NOT NULL,
        CONSTRAINT "OrcamentoRevisao_pkey" PRIMARY KEY ("id")
      )
    `);

    await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "OrcamentoCondominio_condominioId_ano_key" ON "OrcamentoCondominio"("condominioId", "ano")`);
    await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrcamentoCondominio_condominioId_ano_idx" ON "OrcamentoCondominio"("condominioId", "ano")`);
    await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "OrcamentoCategoria_orcamentoId_categoria_key" ON "OrcamentoCategoria"("orcamentoId", "categoria")`);
    await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrcamentoCategoria_orcamentoId_idx" ON "OrcamentoCategoria"("orcamentoId")`);
    await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrcamentoRevisao_orcamentoId_createdAt_idx" ON "OrcamentoRevisao"("orcamentoId", "createdAt")`);

    await tx.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrcamentoCondominio_condominioId_fkey') THEN
          ALTER TABLE "OrcamentoCondominio" ADD CONSTRAINT "OrcamentoCondominio_condominioId_fkey"
          FOREIGN KEY ("condominioId") REFERENCES "Condominio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrcamentoCategoria_orcamentoId_fkey') THEN
          ALTER TABLE "OrcamentoCategoria" ADD CONSTRAINT "OrcamentoCategoria_orcamentoId_fkey"
          FOREIGN KEY ("orcamentoId") REFERENCES "OrcamentoCondominio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrcamentoRevisao_orcamentoId_fkey') THEN
          ALTER TABLE "OrcamentoRevisao" ADD CONSTRAINT "OrcamentoRevisao_orcamentoId_fkey"
          FOREIGN KEY ("orcamentoId") REFERENCES "OrcamentoCondominio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
  });

  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('OrcamentoCondominio', 'OrcamentoCategoria', 'OrcamentoRevisao')
    ORDER BY table_name
  `;
  if (tables.length !== 3) {
    throw new Error(`Previsão Orçamentária: esperadas 3 tabelas, encontradas ${tables.length}.`);
  }
  console.log("Previsão Orçamentária: tabelas verificadas/criadas sem sincronização destrutiva do schema.");
}

main()
  .catch((error) => {
    console.error("Falha ao preparar as tabelas da Previsão Orçamentária:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
