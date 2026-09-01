-- AlterTable
ALTER TABLE "fornecedor" ADD COLUMN     "busca_texto" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "fornecedor_empresa_id_busca_texto_idx" ON "fornecedor"("empresa_id", "busca_texto");
