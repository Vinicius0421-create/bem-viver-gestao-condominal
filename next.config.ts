import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Central de Documentos (Sprint 4): permite upload de PDFs/fotos de
      // documentos (atas, contratos, notas fiscais) via Server Action. O
      // limite de aplicação (10MB, ver DocumentoSchema/salvarDocumento) fica
      // abaixo deste teto para sobrar margem ao overhead do multipart.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
