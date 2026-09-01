-- CreateTable
CREATE TABLE "notificacao_lida" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "lida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacao_lida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificacao_lida_usuario_id_idx" ON "notificacao_lida"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "notificacao_lida_usuario_id_chave_key" ON "notificacao_lida"("usuario_id", "chave");

-- AddForeignKey
ALTER TABLE "notificacao_lida" ADD CONSTRAINT "notificacao_lida_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
