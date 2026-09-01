-- AlterTable
ALTER TABLE "produto" ADD COLUMN     "busca_texto" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "produto_empresa_id_busca_texto_idx" ON "produto"("empresa_id", "busca_texto");
