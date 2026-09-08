import "server-only";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Camada de acesso ao bucket S3-compatível do Railway (Central de
// Documentos — Sprint 4). O bucket é privado por padrão (Railway Buckets
// não suportam bucket público): todo download passa por uma URL assinada
// de curta duração, nunca por um link direto e permanente. Ver
// /api/documentos/[id]/download.
//
// Variáveis de ambiente (definidas na Railway via Variable References
// apontando para o bucket "bemviver-documentos", mesmo padrão usado para
// o Postgres):
//   DOCUMENTOS_S3_ENDPOINT, DOCUMENTOS_S3_REGION, DOCUMENTOS_S3_BUCKET,
//   DOCUMENTOS_S3_ACCESS_KEY_ID, DOCUMENTOS_S3_SECRET_ACCESS_KEY

function getS3Client() {
  const endpoint = process.env.DOCUMENTOS_S3_ENDPOINT;
  const region = process.env.DOCUMENTOS_S3_REGION || "auto";
  const accessKeyId = process.env.DOCUMENTOS_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.DOCUMENTOS_S3_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Armazenamento de documentos não configurado (variáveis DOCUMENTOS_S3_* ausentes)."
    );
  }

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucketName() {
  const bucket = process.env.DOCUMENTOS_S3_BUCKET;
  if (!bucket) {
    throw new Error("Bucket de documentos não configurado (DOCUMENTOS_S3_BUCKET ausente).");
  }
  return bucket;
}

// Extensões/mimetypes aceitos para upload — lista de permissão (allowlist),
// não de bloqueio, para reduzir superfície de ataque de upload malicioso
// (ex: nunca aceitar .html, .js, .svg, .exe). Cobre o que a Bem Viver
// realmente usa: PDFs (a maioria), fotos de comprovantes e planilhas/Word
// ocasionais.
export const MIME_TIPOS_PERMITIDOS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

export const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10MB

// Sanitiza o nome original do arquivo apenas para fins de exibição/registro
// — a chave real no bucket usa um UUID, então mesmo um nome malicioso
// (path traversal, caracteres de controle) nunca chega a compor um path
// real no armazenamento.
function sanitizarNomeArquivo(nomeOriginal: string): string {
  const semCaminho = nomeOriginal.split(/[/\\]/).pop() ?? "arquivo";
  return semCaminho.replace(/[^\w.\-À-ÿ ]/g, "_").slice(0, 180) || "arquivo";
}

export function validarArquivoDocumento(arquivo: File): { ok: true } | { ok: false; erro: string } {
  if (arquivo.size === 0) {
    return { ok: false, erro: "Selecione um arquivo." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return { ok: false, erro: "O arquivo excede o tamanho máximo permitido (10MB)." };
  }
  if (!MIME_TIPOS_PERMITIDOS[arquivo.type]) {
    return {
      ok: false,
      erro: "Tipo de arquivo não permitido. Envie PDF, JPG, PNG, WEBP, DOC(X) ou XLS(X).",
    };
  }
  return { ok: true };
}

// Faz upload do arquivo para o bucket e retorna a chave do objeto (a ser
// salva em `Documento.arquivoUrl`) junto com metadados para exibição.
export async function enviarArquivoDocumento(params: {
  arquivo: File;
  condominioId: string | null;
}): Promise<{ chave: string; nomeOriginal: string; tipo: string; tamanhoBytes: number }> {
  const { arquivo, condominioId } = params;
  const bucket = getBucketName();
  const s3 = getS3Client();

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const nomeOriginal = sanitizarNomeArquivo(arquivo.name);
  const extensao = MIME_TIPOS_PERMITIDOS[arquivo.type] ?? "bin";
  const pasta = condominioId ? `condominios/${condominioId}` : "gerais";
  const chave = `documentos/${pasta}/${randomUUID()}.${extensao}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: chave,
      Body: buffer,
      ContentType: arquivo.type,
    })
  );

  return { chave, nomeOriginal, tipo: arquivo.type, tamanhoBytes: buffer.byteLength };
}

export async function gerarUrlDownloadDocumento(chave: string): Promise<string> {
  const bucket = getBucketName();
  const s3 = getS3Client();
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: chave }), {
    expiresIn: 300, // 5 minutos — suficiente para o navegador iniciar o download
  });
}

// Usado quando a exclusão lógica do registro é acompanhada da remoção do
// objeto físico (ver excluirDocumento) — best-effort: se o objeto já não
// existir ou o bucket estiver indisponível, não deve impedir a exclusão
// lógica do registro, que é a garantia que realmente importa para o usuário.
export async function removerArquivoDocumento(chave: string): Promise<void> {
  try {
    const bucket = getBucketName();
    const s3 = getS3Client();
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: chave }));
  } catch (error) {
    console.error("Falha ao remover objeto do bucket de documentos:", error);
  }
}
