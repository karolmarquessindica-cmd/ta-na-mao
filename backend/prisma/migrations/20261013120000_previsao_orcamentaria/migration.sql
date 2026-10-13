CREATE TABLE "OrcamentoCondominio" (
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
);

CREATE TABLE "OrcamentoCategoria" (
  "id" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "descricao" TEXT,
  "valorMensal" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "orcamentoId" TEXT NOT NULL,
  CONSTRAINT "OrcamentoCategoria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrcamentoRevisao" (
  "id" TEXT NOT NULL,
  "acao" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "motivo" TEXT,
  "usuarioId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "orcamentoId" TEXT NOT NULL,
  CONSTRAINT "OrcamentoRevisao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrcamentoCondominio_condominioId_ano_key"
  ON "OrcamentoCondominio"("condominioId", "ano");
CREATE INDEX "OrcamentoCondominio_condominioId_ano_idx"
  ON "OrcamentoCondominio"("condominioId", "ano");
CREATE UNIQUE INDEX "OrcamentoCategoria_orcamentoId_categoria_key"
  ON "OrcamentoCategoria"("orcamentoId", "categoria");
CREATE INDEX "OrcamentoCategoria_orcamentoId_idx"
  ON "OrcamentoCategoria"("orcamentoId");
CREATE INDEX "OrcamentoRevisao_orcamentoId_createdAt_idx"
  ON "OrcamentoRevisao"("orcamentoId", "createdAt");

ALTER TABLE "OrcamentoCondominio"
  ADD CONSTRAINT "OrcamentoCondominio_condominioId_fkey"
  FOREIGN KEY ("condominioId") REFERENCES "Condominio"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrcamentoCategoria"
  ADD CONSTRAINT "OrcamentoCategoria_orcamentoId_fkey"
  FOREIGN KEY ("orcamentoId") REFERENCES "OrcamentoCondominio"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrcamentoRevisao"
  ADD CONSTRAINT "OrcamentoRevisao_orcamentoId_fkey"
  FOREIGN KEY ("orcamentoId") REFERENCES "OrcamentoCondominio"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
