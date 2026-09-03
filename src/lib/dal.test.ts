import { describe, it, expect } from "vitest";
import { papelAtendeMinimo } from "@/lib/dal";
import type { PapelUsuario } from "@/generated/prisma/enums";

// QA-4 (auditoria de julho/2026): a hierarquia de perfis OPERACIONAL <
// GESTOR < ADMIN é o alicerce de todo o controle de acesso do sistema —
// toda Server Action e rota protegida depende de `papelAtendeMinimo`
// devolver o resultado certo. Antes desta suíte, essa função não tinha
// nenhum teste automatizado: uma regressão nela (ex: inverter a ordem da
// comparação, ou um typo na tabela HIERARQUIA) só seria percebida em
// produção, potencialmente liberando uma ação para um perfil sem
// permissão — ou, na direção oposta, bloqueando o ADMIN de agir.

const PAPEIS: PapelUsuario[] = ["OPERACIONAL", "GESTOR", "ADMIN"];

describe("papelAtendeMinimo — hierarquia de perfis", () => {
  it("um perfil sempre atende a si mesmo como mínimo exigido", () => {
    for (const papel of PAPEIS) {
      expect(papelAtendeMinimo(papel, papel)).toBe(true);
    }
  });

  it("OPERACIONAL não atende a nenhum nível acima do próprio", () => {
    expect(papelAtendeMinimo("OPERACIONAL", "GESTOR")).toBe(false);
    expect(papelAtendeMinimo("OPERACIONAL", "ADMIN")).toBe(false);
  });

  it("GESTOR atende ao mínimo OPERACIONAL, mas não ao ADMIN", () => {
    expect(papelAtendeMinimo("GESTOR", "OPERACIONAL")).toBe(true);
    expect(papelAtendeMinimo("GESTOR", "GESTOR")).toBe(true);
    expect(papelAtendeMinimo("GESTOR", "ADMIN")).toBe(false);
  });

  it("ADMIN atende a qualquer nível mínimo — é o topo da hierarquia", () => {
    for (const minimo of PAPEIS) {
      expect(papelAtendeMinimo("ADMIN", minimo)).toBe(true);
    }
  });

  it("a ordem estrita OPERACIONAL < GESTOR < ADMIN é respeitada em todos os pares", () => {
    // Verificação exaustiva: para cada par (papel, mínimo), o resultado
    // deve bater exatamente com a posição relativa na lista ordenada
    // PAPEIS — nenhuma combinação escapa da hierarquia esperada.
    for (let i = 0; i < PAPEIS.length; i++) {
      for (let j = 0; j < PAPEIS.length; j++) {
        const papel = PAPEIS[i];
        const minimo = PAPEIS[j];
        const esperado = i >= j;
        expect(papelAtendeMinimo(papel, minimo)).toBe(esperado);
      }
    }
  });
});
