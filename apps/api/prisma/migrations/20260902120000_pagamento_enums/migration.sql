-- Valores novos de enum ficam numa migracao propria: o Postgres exige que
-- estejam commitados antes de qualquer uso ("unsafe use of new value").

-- AlterEnum
ALTER TYPE "status_pagamento" ADD VALUE 'cancelado';
ALTER TYPE "status_pagamento" ADD VALUE 'estornado';
ALTER TYPE "status_pagamento" ADD VALUE 'expirado';

-- AlterEnum
ALTER TYPE "status_venda" ADD VALUE 'aberta';
