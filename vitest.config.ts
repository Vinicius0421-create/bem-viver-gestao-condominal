import { defineConfig } from "vitest/config";
import path from "node:path";

// QA-4: configuração mínima do Vitest — só o necessário para rodar testes
// unitários de funções puras de `src/lib` (ex: a hierarquia de perfis em
// `dal.ts`). Não inclui ambiente de DOM/jsdom porque, por enquanto, os
// testes cobrem apenas lógica de servidor sem renderização de componentes.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only`/`client-only`: fora do bundler do Next.js (que os
      // intercepta em tempo de build), o pacote real lança erro só de ser
      // importado — ver test/empty-module.ts.
      "server-only": path.resolve(__dirname, "./test/empty-module.ts"),
      "client-only": path.resolve(__dirname, "./test/empty-module.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
