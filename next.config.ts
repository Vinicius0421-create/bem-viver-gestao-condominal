import type { NextConfig } from "next";

// Cabeçalhos de segurança (HawkScan / StackHawk — scan de 10/09/2026 sobre o
// Incremento 1, commit c7b22bd): a aplicação não enviava nenhum destes
// cabeçalhos, gerando 4 achados (2 Medium: CSP ausente e sem proteção
// anti-clickjacking; 2 Low: X-Powered-By expondo a stack e sem
// X-Content-Type-Options).
//
// A Content-Security-Policy em si é definida em `src/proxy.ts` (precisa de
// um nonce por requisição para permitir o script de hidratação que o
// próprio Next.js injeta inline em toda página — sem nonce, `script-src
// 'self'` quebra a aplicação inteira). Aqui ficam só os cabeçalhos que não
// dependem de nonce/requisição.
const nextConfig: NextConfig = {
  // Remove o cabeçalho "X-Powered-By: Next.js" (achado Low do HawkScan —
  // não há motivo para expor o framework em produção).
  poweredByHeader: false,

  experimental: {
    serverActions: {
      // Central de Documentos (Sprint 4): permite upload de PDFs/fotos de
      // documentos (atas, contratos, notas fiscais) via Server Action. O
      // limite de aplicação (10MB, ver DocumentoSchema/salvarDocumento) fica
      // abaixo deste teto para sobrar margem ao overhead do multipart.
      bodySizeLimit: "12mb",
    },
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Redundante com `frame-ancestors` da CSP (definida no proxy),
          // mas mantido pois navegadores mais antigos — e o próprio
          // HawkScan — ainda checam este cabeçalho separadamente para a
          // proteção anti-clickjacking.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
