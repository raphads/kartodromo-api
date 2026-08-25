-- CreateTable
CREATE TABLE "tb_pilotos" (
    "cpf_piloto" TEXT NOT NULL PRIMARY KEY,
    "nome_piloto" TEXT NOT NULL,
    "data_nasc_piloto" DATETIME NOT NULL,
    "equipe_piloto" TEXT NOT NULL,
    "idade_piloto" INTEGER NOT NULL,
    "numero_piloto" INTEGER NOT NULL,
    "foto_piloto" TEXT
);
