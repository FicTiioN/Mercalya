-- CreateEnum
CREATE TYPE "papel_usuario" AS ENUM ('administrador');

-- CreateEnum
CREATE TYPE "unidade_medida" AS ENUM ('un', 'kg', 'g', 'l', 'ml', 'cx', 'pct', 'fd');

-- CreateEnum
CREATE TYPE "status_produto" AS ENUM ('ativo', 'inativo');

-- CreateEnum
CREATE TYPE "controle_validade" AS ENUM ('nao-controlar', 'por-lote', 'obrigatorio');

-- CreateEnum
CREATE TYPE "status_fornecedor" AS ENUM ('ativo', 'inativo');

-- CreateEnum
CREATE TYPE "status_compra" AS ENUM ('rascunho', 'confirmada', 'cancelada');

-- CreateEnum
CREATE TYPE "forma_pagamento" AS ENUM ('boleto', 'pix', 'dinheiro', 'cartao', 'prazo');

-- CreateEnum
CREATE TYPE "tipo_local" AS ENUM ('central', 'loja');

-- CreateEnum
CREATE TYPE "tipo_movimentacao" AS ENUM ('ENTRADA', 'TRANSFERENCIA', 'VENDA', 'PERDA', 'AJUSTE', 'DEVOLUCAO');

-- CreateEnum
CREATE TYPE "status_movimentacao" AS ENUM ('concluida', 'cancelada');

-- CreateEnum
CREATE TYPE "status_abastecimento" AS ENUM ('concluido', 'cancelado');

-- CreateEnum
CREATE TYPE "motivo_perda" AS ENUM ('vencimento', 'quebra', 'avaria', 'roubo', 'erro-operacional', 'outros');

-- CreateEnum
CREATE TYPE "status_venda" AS ENUM ('concluida', 'cancelada');

-- CreateEnum
CREATE TYPE "forma_pagamento_venda" AS ENUM ('pix', 'dinheiro', 'cartao-debito', 'cartao-credito');

-- CreateEnum
CREATE TYPE "status_pagamento" AS ENUM ('aprovado', 'pendente', 'recusado');

-- CreateTable
CREATE TABLE "empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "papel" "papel_usuario" NOT NULL DEFAULT 'administrador',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loja" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "condominio" TEXT NOT NULL DEFAULT '',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_estoque" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "tipo_local" NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "loja_id" TEXT,

    CONSTRAINT "local_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#087F73',
    "emoji" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marca" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "marca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produto" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ean" TEXT,
    "sku" TEXT,
    "categoria_id" TEXT NOT NULL,
    "marca_id" TEXT,
    "unidade" "unidade_medida" NOT NULL DEFAULT 'un',
    "conteudo" TEXT NOT NULL DEFAULT '',
    "preco_sugerido" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "custo_medio" DECIMAL(14,4),
    "ponto_compra" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "estoque_maximo_central" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "controle_validade" "controle_validade" NOT NULL DEFAULT 'nao-controlar',
    "validade_padrao_dias" INTEGER,
    "localizacao_padrao" TEXT NOT NULL DEFAULT '',
    "fornecedor_principal_id" TEXT,
    "observacoes" TEXT NOT NULL DEFAULT '',
    "imagem" TEXT NOT NULL DEFAULT '',
    "status" "status_produto" NOT NULL DEFAULT 'ativo',
    "ultima_venda_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracao_produto_loja" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "preco_venda" DECIMAL(12,2) NOT NULL,
    "estoque_minimo" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "estoque_ideal" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_produto_loja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedor" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_fantasia" TEXT NOT NULL DEFAULT '',
    "documento" TEXT,
    "categoria_principal_id" TEXT,
    "contato_nome" TEXT NOT NULL DEFAULT '',
    "contato_cargo" TEXT NOT NULL DEFAULT '',
    "contato_telefone" TEXT NOT NULL DEFAULT '',
    "contato_whatsapp" TEXT NOT NULL DEFAULT '',
    "contato_email" TEXT NOT NULL DEFAULT '',
    "endereco_cep" TEXT NOT NULL DEFAULT '',
    "endereco_logradouro" TEXT NOT NULL DEFAULT '',
    "endereco_numero" TEXT NOT NULL DEFAULT '',
    "endereco_complemento" TEXT NOT NULL DEFAULT '',
    "endereco_bairro" TEXT NOT NULL DEFAULT '',
    "endereco_cidade" TEXT NOT NULL DEFAULT '',
    "endereco_uf" TEXT NOT NULL DEFAULT '',
    "prazo_entrega_dias" INTEGER NOT NULL DEFAULT 0,
    "condicao_pagamento" TEXT NOT NULL DEFAULT '',
    "desconto_padrao" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "observacoes" TEXT NOT NULL DEFAULT '',
    "status" "status_fornecedor" NOT NULL DEFAULT 'ativo',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "fornecedor_id" TEXT NOT NULL,
    "nota_fiscal" TEXT NOT NULL DEFAULT '',
    "data_emissao" TIMESTAMP(3),
    "data_entrada" TIMESTAMP(3),
    "condicao_pagamento" TEXT NOT NULL DEFAULT '',
    "forma_pagamento" "forma_pagamento",
    "data_vencimento" TIMESTAMP(3),
    "observacoes" TEXT NOT NULL DEFAULT '',
    "frete" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "local_destino_id" TEXT NOT NULL,
    "status" "status_compra" NOT NULL DEFAULT 'rascunho',
    "confirmada_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_compra" (
    "id" TEXT NOT NULL,
    "compra_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" DECIMAL(14,3) NOT NULL,
    "unidade" "unidade_medida" NOT NULL DEFAULT 'un',
    "custo_unitario" DECIMAL(14,4) NOT NULL,
    "validade" TIMESTAMP(3),
    "lote" TEXT NOT NULL DEFAULT '',
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "item_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lote" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "compra_id" TEXT,
    "custo_unitario" DECIMAL(14,4) NOT NULL,
    "validade" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldo_estoque" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "lote_id" TEXT,
    "local_id" TEXT NOT NULL,
    "quantidade" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reservado" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saldo_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacao_estoque" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo" "tipo_movimentacao" NOT NULL,
    "produto_id" TEXT NOT NULL,
    "lote_id" TEXT,
    "quantidade" DECIMAL(14,3) NOT NULL,
    "origem_id" TEXT,
    "origem_label" TEXT NOT NULL DEFAULT '',
    "destino_id" TEXT,
    "destino_label" TEXT NOT NULL DEFAULT '',
    "usuario" TEXT NOT NULL DEFAULT '',
    "observacao" TEXT NOT NULL DEFAULT '',
    "documento" TEXT NOT NULL DEFAULT '',
    "custo_unitario" DECIMAL(14,4),
    "valor_total" DECIMAL(14,2),
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "status_movimentacao" NOT NULL DEFAULT 'concluida',

    CONSTRAINT "movimentacao_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abastecimento" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "origem_id" TEXT NOT NULL,
    "destino_id" TEXT NOT NULL,
    "total_produtos" INTEGER NOT NULL DEFAULT 0,
    "total_itens" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "status" "status_abastecimento" NOT NULL DEFAULT 'concluido',
    "usuario" TEXT NOT NULL DEFAULT '',
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abastecimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_abastecimento" (
    "id" TEXT NOT NULL,
    "abastecimento_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "lote_id" TEXT,
    "quantidade" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "item_abastecimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perda_estoque" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "lote_id" TEXT,
    "local_id" TEXT NOT NULL,
    "motivo" "motivo_perda" NOT NULL,
    "quantidade" DECIMAL(14,3) NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "observacao" TEXT NOT NULL DEFAULT '',
    "registrado_por" TEXT NOT NULL DEFAULT '',
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perda_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cliente" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT,
    "documento" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "observacoes" TEXT NOT NULL DEFAULT '',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venda" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "cliente_nome" TEXT NOT NULL DEFAULT '',
    "operador" TEXT NOT NULL DEFAULT '',
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "acrescimo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "troco" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pagamento_forma" "forma_pagamento_venda" NOT NULL,
    "pagamento_valor" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pagamento_status" "status_pagamento" NOT NULL DEFAULT 'aprovado',
    "pagamento_quando" TIMESTAMP(3),
    "tipo_venda" TEXT NOT NULL DEFAULT '',
    "canal" TEXT NOT NULL DEFAULT '',
    "observacao" TEXT NOT NULL DEFAULT '',
    "status" "status_venda" NOT NULL DEFAULT 'concluida',
    "cancelada_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_venda" (
    "id" TEXT NOT NULL,
    "venda_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "produto_nome" TEXT NOT NULL,
    "ean" TEXT NOT NULL DEFAULT '',
    "imagem" TEXT NOT NULL DEFAULT '',
    "quantidade" DECIMAL(14,3) NOT NULL,
    "preco_unitario" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "custo_unitario" DECIMAL(14,4),

    CONSTRAINT "item_venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequencia" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sequencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_documento_key" ON "empresa"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_empresa_id_idx" ON "usuario"("empresa_id");

-- CreateIndex
CREATE INDEX "loja_empresa_id_idx" ON "loja"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "loja_empresa_id_nome_key" ON "loja"("empresa_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "local_estoque_loja_id_key" ON "local_estoque"("loja_id");

-- CreateIndex
CREATE INDEX "local_estoque_empresa_id_tipo_idx" ON "local_estoque"("empresa_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_empresa_id_nome_key" ON "categoria"("empresa_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "marca_empresa_id_nome_key" ON "marca"("empresa_id", "nome");

-- CreateIndex
CREATE INDEX "produto_empresa_id_status_idx" ON "produto"("empresa_id", "status");

-- CreateIndex
CREATE INDEX "produto_empresa_id_categoria_id_idx" ON "produto"("empresa_id", "categoria_id");

-- CreateIndex
CREATE UNIQUE INDEX "produto_empresa_id_ean_key" ON "produto"("empresa_id", "ean");

-- CreateIndex
CREATE UNIQUE INDEX "produto_empresa_id_sku_key" ON "produto"("empresa_id", "sku");

-- CreateIndex
CREATE INDEX "configuracao_produto_loja_loja_id_ativo_idx" ON "configuracao_produto_loja"("loja_id", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "configuracao_produto_loja_produto_id_loja_id_key" ON "configuracao_produto_loja"("produto_id", "loja_id");

-- CreateIndex
CREATE INDEX "fornecedor_empresa_id_status_idx" ON "fornecedor"("empresa_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedor_empresa_id_documento_key" ON "fornecedor"("empresa_id", "documento");

-- CreateIndex
CREATE INDEX "compra_empresa_id_status_idx" ON "compra"("empresa_id", "status");

-- CreateIndex
CREATE INDEX "compra_empresa_id_fornecedor_id_idx" ON "compra"("empresa_id", "fornecedor_id");

-- CreateIndex
CREATE UNIQUE INDEX "compra_empresa_id_numero_key" ON "compra"("empresa_id", "numero");

-- CreateIndex
CREATE INDEX "item_compra_compra_id_idx" ON "item_compra"("compra_id");

-- CreateIndex
CREATE INDEX "item_compra_produto_id_idx" ON "item_compra"("produto_id");

-- CreateIndex
CREATE INDEX "lote_empresa_id_produto_id_idx" ON "lote"("empresa_id", "produto_id");

-- CreateIndex
CREATE INDEX "lote_produto_id_validade_idx" ON "lote"("produto_id", "validade");

-- CreateIndex
CREATE INDEX "saldo_estoque_empresa_id_produto_id_idx" ON "saldo_estoque"("empresa_id", "produto_id");

-- CreateIndex
CREATE INDEX "saldo_estoque_local_id_idx" ON "saldo_estoque"("local_id");

-- CreateIndex
CREATE UNIQUE INDEX "saldo_estoque_local_id_produto_id_lote_id_key" ON "saldo_estoque"("local_id", "produto_id", "lote_id");

-- CreateIndex
CREATE INDEX "movimentacao_estoque_empresa_id_data_idx" ON "movimentacao_estoque"("empresa_id", "data");

-- CreateIndex
CREATE INDEX "movimentacao_estoque_empresa_id_tipo_idx" ON "movimentacao_estoque"("empresa_id", "tipo");

-- CreateIndex
CREATE INDEX "movimentacao_estoque_produto_id_data_idx" ON "movimentacao_estoque"("produto_id", "data");

-- CreateIndex
CREATE INDEX "abastecimento_empresa_id_data_idx" ON "abastecimento"("empresa_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "abastecimento_empresa_id_numero_key" ON "abastecimento"("empresa_id", "numero");

-- CreateIndex
CREATE INDEX "item_abastecimento_abastecimento_id_idx" ON "item_abastecimento"("abastecimento_id");

-- CreateIndex
CREATE INDEX "perda_estoque_empresa_id_data_idx" ON "perda_estoque"("empresa_id", "data");

-- CreateIndex
CREATE INDEX "cliente_empresa_id_idx" ON "cliente"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_empresa_id_documento_key" ON "cliente"("empresa_id", "documento");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_empresa_id_telefone_key" ON "cliente"("empresa_id", "telefone");

-- CreateIndex
CREATE INDEX "venda_empresa_id_data_idx" ON "venda"("empresa_id", "data");

-- CreateIndex
CREATE INDEX "venda_empresa_id_status_idx" ON "venda"("empresa_id", "status");

-- CreateIndex
CREATE INDEX "venda_loja_id_data_idx" ON "venda"("loja_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "venda_empresa_id_numero_key" ON "venda"("empresa_id", "numero");

-- CreateIndex
CREATE INDEX "item_venda_venda_id_idx" ON "item_venda"("venda_id");

-- CreateIndex
CREATE INDEX "item_venda_produto_id_idx" ON "item_venda"("produto_id");

-- CreateIndex
CREATE UNIQUE INDEX "sequencia_empresa_id_chave_key" ON "sequencia"("empresa_id", "chave");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loja" ADD CONSTRAINT "loja_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_estoque" ADD CONSTRAINT "local_estoque_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_estoque" ADD CONSTRAINT "local_estoque_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marca" ADD CONSTRAINT "marca_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "marca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "produto_fornecedor_principal_id_fkey" FOREIGN KEY ("fornecedor_principal_id") REFERENCES "fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracao_produto_loja" ADD CONSTRAINT "configuracao_produto_loja_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracao_produto_loja" ADD CONSTRAINT "configuracao_produto_loja_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fornecedor" ADD CONSTRAINT "fornecedor_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fornecedor" ADD CONSTRAINT "fornecedor_categoria_principal_id_fkey" FOREIGN KEY ("categoria_principal_id") REFERENCES "categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra" ADD CONSTRAINT "compra_local_destino_id_fkey" FOREIGN KEY ("local_destino_id") REFERENCES "local_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_compra" ADD CONSTRAINT "item_compra_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_compra" ADD CONSTRAINT "item_compra_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lote" ADD CONSTRAINT "lote_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lote" ADD CONSTRAINT "lote_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lote" ADD CONSTRAINT "lote_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo_estoque" ADD CONSTRAINT "saldo_estoque_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo_estoque" ADD CONSTRAINT "saldo_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo_estoque" ADD CONSTRAINT "saldo_estoque_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldo_estoque" ADD CONSTRAINT "saldo_estoque_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "local_estoque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_origem_id_fkey" FOREIGN KEY ("origem_id") REFERENCES "local_estoque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "local_estoque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimento" ADD CONSTRAINT "abastecimento_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimento" ADD CONSTRAINT "abastecimento_origem_id_fkey" FOREIGN KEY ("origem_id") REFERENCES "local_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimento" ADD CONSTRAINT "abastecimento_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "local_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_abastecimento" ADD CONSTRAINT "item_abastecimento_abastecimento_id_fkey" FOREIGN KEY ("abastecimento_id") REFERENCES "abastecimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_abastecimento" ADD CONSTRAINT "item_abastecimento_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_abastecimento" ADD CONSTRAINT "item_abastecimento_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perda_estoque" ADD CONSTRAINT "perda_estoque_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perda_estoque" ADD CONSTRAINT "perda_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perda_estoque" ADD CONSTRAINT "perda_estoque_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perda_estoque" ADD CONSTRAINT "perda_estoque_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "local_estoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venda" ADD CONSTRAINT "venda_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venda" ADD CONSTRAINT "venda_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venda" ADD CONSTRAINT "venda_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_venda" ADD CONSTRAINT "item_venda_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_venda" ADD CONSTRAINT "item_venda_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequencia" ADD CONSTRAINT "sequencia_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
