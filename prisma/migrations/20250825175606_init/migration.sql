-- CreateTable
CREATE TABLE "public"."Mensalidades" (
    "id_mensalidade" SERIAL NOT NULL,
    "parcela" INTEGER NOT NULL,
    "data_emissao" TIMESTAMP(3) NOT NULL,
    "vencimento" DATE NOT NULL,
    "cobranca" DATE NOT NULL,
    "data_pgto" DATE,
    "hora_pgto" TEXT,
    "valor_principal" DECIMAL(15,2) NOT NULL,
    "valor_pago" DECIMAL(15,2),
    "status" CHAR(1) NOT NULL,
    "referencia" VARCHAR(5) NOT NULL,
    "form_pagto" VARCHAR(20),

    CONSTRAINT "Mensalidades_pkey" PRIMARY KEY ("id_mensalidade")
);

-- CreateTable
CREATE TABLE "public"."Acordo" (
    "id_acordo" SERIAL NOT NULL,
    "data_prevista" TIMESTAMPTZ NOT NULL,
    "metodo_pag" TEXT,
    "status" TEXT,
    "descricao" TEXT,
    "total_acordo" DECIMAL(65,30),
    "realizado_por" TEXT,
    "dt_criacao" TIMESTAMP(3) NOT NULL,
    "dt_pgto" TIMESTAMP(3),

    CONSTRAINT "Acordo_pkey" PRIMARY KEY ("id_acordo")
);

-- CreateTable
CREATE TABLE "public"."AcordoMensalidade" (
    "id_acordo" INTEGER NOT NULL,
    "id_mensalidade" INTEGER NOT NULL,

    CONSTRAINT "AcordoMensalidade_pkey" PRIMARY KEY ("id_acordo","id_mensalidade")
);

-- AddForeignKey
ALTER TABLE "public"."AcordoMensalidade" ADD CONSTRAINT "AcordoMensalidade_id_acordo_fkey" FOREIGN KEY ("id_acordo") REFERENCES "public"."Acordo"("id_acordo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AcordoMensalidade" ADD CONSTRAINT "AcordoMensalidade_id_mensalidade_fkey" FOREIGN KEY ("id_mensalidade") REFERENCES "public"."Mensalidades"("id_mensalidade") ON DELETE RESTRICT ON UPDATE CASCADE;
