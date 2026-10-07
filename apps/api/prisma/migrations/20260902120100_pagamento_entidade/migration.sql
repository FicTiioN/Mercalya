-- Pagamento vira entidade propria.
--
-- Ate aqui a venda carregava quatro colunas de pagamento com status padrao
-- "aprovado" — a premissa de que todo pagamento ja nasce decidido. Com
-- maquininha ele nasce pendente, pode ser recusado e tentado de novo, e uma
-- venda pode ser paga por mais de um meio. Cada venda existente vira um
-- pagamento "manual" com os mesmos valores; nada e descartado.


-- CreateTable
CREATE TABLE "pagamento" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "venda_id" TEXT NOT NULL,
    "forma" "forma_pagamento_venda" NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "status" "status_pagamento" NOT NULL DEFAULT 'pendente',
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "provedor" TEXT NOT NULL DEFAULT 'manual',
    "chave_idempotencia" TEXT,
    "referencia_externa" TEXT,
    "autorizacao" TEXT NOT NULL DEFAULT '',
    "nsu" TEXT NOT NULL DEFAULT '',
    "bandeira" TEXT NOT NULL DEFAULT '',
    "ultimos_digitos" TEXT NOT NULL DEFAULT '',
    "motivo_recusa" TEXT NOT NULL DEFAULT '',
    "retorno_bruto" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "confirmado_em" TIMESTAMP(3),

    CONSTRAINT "pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pagamento_venda_id_idx" ON "pagamento"("venda_id");

-- CreateIndex
CREATE INDEX "pagamento_empresa_id_status_idx" ON "pagamento"("empresa_id", "status");

-- CreateIndex
CREATE INDEX "pagamento_empresa_id_referencia_externa_idx" ON "pagamento"("empresa_id", "referencia_externa");

-- CreateIndex
CREATE UNIQUE INDEX "pagamento_empresa_id_chave_idempotencia_key" ON "pagamento"("empresa_id", "chave_idempotencia");

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: colunas novas primeiro, para a copia abaixo ter onde gravar.
ALTER TABLE "venda"
ADD COLUMN     "chave_idempotencia" TEXT,
ADD COLUMN     "concluida_em" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'aberta';

-- CreateIndex
CREATE UNIQUE INDEX "venda_empresa_id_chave_idempotencia_key" ON "venda"("empresa_id", "chave_idempotencia");

-- Copia: cada venda existente vira um pagamento "manual" com os mesmos dados.
-- O id deriva do id da venda, entao a migracao e reexecutavel sem duplicar.
INSERT INTO "pagamento" (
    "id", "empresa_id", "venda_id", "forma", "valor", "status", "provedor",
    "criado_em", "atualizado_em", "confirmado_em"
)
SELECT
    'pag_' || substr(md5(v."id"), 1, 24),
    v."empresa_id",
    v."id",
    v."pagamento_forma",
    v."pagamento_valor",
    v."pagamento_status",
    'manual',
    COALESCE(v."pagamento_quando", v."data"),
    v."atualizado_em",
    CASE
        WHEN v."pagamento_status" IN ('aprovado', 'recusado')
        THEN COALESCE(v."pagamento_quando", v."data")
    END
FROM "venda" v
WHERE NOT EXISTS (SELECT 1 FROM "pagamento" p WHERE p."venda_id" = v."id");

-- Venda concluida teve o estoque debitado na data da venda.
UPDATE "venda" SET "concluida_em" = "data" WHERE "status" = 'concluida' AND "concluida_em" IS NULL;

-- So agora as colunas antigas saem: a copia acima ja leu tudo.
ALTER TABLE "venda"
DROP COLUMN "pagamento_forma",
DROP COLUMN "pagamento_quando",
DROP COLUMN "pagamento_status",
DROP COLUMN "pagamento_valor";
