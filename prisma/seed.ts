import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

// ============================================================================
// SEED — dados iniciais do sistema Bem Viver
//
// Popula:
//  1. Usuário administrador inicial (Sabrina Vieira)
//  2. Plano de contas financeiro padrão (categorias de receita/despesa)
//  3. Os dois condomínios já geridos (Barcelia e Montreal), com os
//     lançamentos financeiros reais de Junho/2026, reconstruídos a partir
//     das planilhas "PRESTAÇÃO DE CONTAS" fornecidas pela empresa.
//  4. A Prestação de Contas de Junho/2026 de cada condomínio, já publicada,
//     demonstrando o módulo principal do sistema funcionando de ponta a
//     ponta com dados reais.
//
// NOTA IMPORTANTE SOBRE A MIGRAÇÃO DOS DADOS:
// As planilhas originais misturavam, na mesma lista de "receitas", tanto
// o saldo que sobrou do mês anterior quanto as receitas de fato geradas no
// mês corrente. O novo modelo separa essas duas naturezas (`saldoAnterior`
// vs. lançamentos de receita do período), que é a prática contábil correta
// e evita que o valor do "saldo herdado" seja contado como receita nova
// todo santo mês. Os asserts abaixo confirmam que o saldo final recalculado
// bate exatamente com o saldo que já constava nas planilhas originais —
// ou seja, a reorganização não muda nenhum valor, só a forma como ele é
// registrado.
// ============================================================================

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Iniciando seed...");

  // --------------------------------------------------------------------
  // 1. Usuário administrador
  // --------------------------------------------------------------------
  const senhaProvisoria = "BemViver@2026";
  const admin = await prisma.usuario.upsert({
    where: { email: "bemviverassessoria.cond@gmail.com" },
    update: {},
    create: {
      nome: "Sabrina Vieira",
      email: "bemviverassessoria.cond@gmail.com",
      senhaHash: await hashPassword(senhaProvisoria),
      papel: "ADMIN",
    },
  });
  console.log(`Usuário administrador: ${admin.email} (senha provisória: ${senhaProvisoria})`);

  // --------------------------------------------------------------------
  // 2. Categorias financeiras padrão
  // --------------------------------------------------------------------
  type CategoriaSeed = {
    nome: string;
    tipo: "RECEITA" | "DESPESA";
    natureza: "FIXA" | "EXTRA" | "BANCARIA" | "REPASSE";
  };

  const categorias: CategoriaSeed[] = [
    { nome: "Taxa de Condomínio", tipo: "RECEITA", natureza: "FIXA" },
    { nome: "Multas e Juros", tipo: "RECEITA", natureza: "EXTRA" },
    { nome: "Repasse de Cobrança/Terceiros", tipo: "RECEITA", natureza: "REPASSE" },
    { nome: "Resgate de Aplicação Financeira", tipo: "RECEITA", natureza: "EXTRA" },
    { nome: "Aluguel de Área Comum", tipo: "RECEITA", natureza: "EXTRA" },
    { nome: "Outras Receitas", tipo: "RECEITA", natureza: "EXTRA" },

    { nome: "Energia Elétrica", tipo: "DESPESA", natureza: "FIXA" },
    { nome: "Água e Esgoto", tipo: "DESPESA", natureza: "FIXA" },
    { nome: "Internet/Telefonia", tipo: "DESPESA", natureza: "FIXA" },
    { nome: "Limpeza e Conservação", tipo: "DESPESA", natureza: "FIXA" },
    { nome: "Honorários Bem Viver", tipo: "DESPESA", natureza: "FIXA" },
    { nome: "Pagamento Síndico", tipo: "DESPESA", natureza: "FIXA" },
    { nome: "Financiamento/Obra", tipo: "DESPESA", natureza: "FIXA" },
    { nome: "Tarifa Bancária", tipo: "DESPESA", natureza: "BANCARIA" },
    { nome: "Manutenção e Reparos", tipo: "DESPESA", natureza: "EXTRA" },
    { nome: "Serviços Cartorários/Jurídicos", tipo: "DESPESA", natureza: "EXTRA" },
    { nome: "Seguro Predial", tipo: "DESPESA", natureza: "EXTRA" },
    { nome: "Sinalização e Segurança", tipo: "DESPESA", natureza: "EXTRA" },
    { nome: "Outras Despesas", tipo: "DESPESA", natureza: "EXTRA" },
  ];

  const catId = new Map<string, string>();
  for (const c of categorias) {
    const rec = await prisma.categoriaFinanceira.upsert({
      where: { nome_tipo: { nome: c.nome, tipo: c.tipo } },
      update: {},
      create: { ...c, padraoSistema: true },
    });
    catId.set(`${c.tipo}:${c.nome}`, rec.id);
  }
  console.log(`${categorias.length} categorias financeiras padrão criadas.`);

  // --------------------------------------------------------------------
  // 3. Fornecedores identificados nos documentos originais
  // --------------------------------------------------------------------
  const fornecedores = [
    { nome: "CEMIG", categoria: "Concessionária de Energia" },
    { nome: "SAAE", categoria: "Concessionária de Água e Esgoto" },
    { nome: "Vivo", categoria: "Telefonia" },
    { nome: "Sicoob", categoria: "Instituição Financeira" },
    { nome: "Confiança - Garantidora", categoria: "Cobrança/Terceirização" },
  ];
  const fornId = new Map<string, string>();
  for (const f of fornecedores) {
    const rec = await prisma.fornecedor.upsert({
      where: { id: `seed-${f.nome.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `seed-${f.nome.toLowerCase().replace(/\s+/g, "-")}`,
        nome: f.nome,
        categoria: f.categoria,
      },
    });
    fornId.set(f.nome, rec.id);
  }
  console.log(`${fornecedores.length} fornecedores cadastrados.`);

  // --------------------------------------------------------------------
  // 4. Síndica profissional (Sabrina Vieira) — consta como assinante
  //    no demonstrativo original da Barcelia.
  // --------------------------------------------------------------------
  const sindicaSabrina = await prisma.sindico.upsert({
    where: { id: "seed-sindica-sabrina" },
    update: {},
    create: {
      id: "seed-sindica-sabrina",
      nome: "Sabrina Vieira",
      tipo: "PROFISSIONAL",
    },
  });

  // --------------------------------------------------------------------
  // 5. Condomínios
  // --------------------------------------------------------------------
  const barcelia = await prisma.condominio.upsert({
    where: { id: "seed-condominio-barcelia" },
    update: {},
    create: {
      id: "seed-condominio-barcelia",
      nome: "Residencial Barcelia",
      status: "ATIVO",
      sindicoId: sindicaSabrina.id,
      valorHonorarios: 200,
      observacoes:
        "Dados iniciais migrados da planilha 'PRESTAÇÃO DE CONTAS BARCELIA JUNHO'.",
    },
  });

  const montreal = await prisma.condominio.upsert({
    where: { id: "seed-condominio-montreal" },
    update: {},
    create: {
      id: "seed-condominio-montreal",
      nome: "Residencial Montreal",
      status: "ATIVO",
      banco: "Sicoob 756",
      agencia: "4101",
      conta: "14.607.001-01",
      valorHonorarios: 3300,
      observacoes:
        "Dados iniciais migrados da planilha 'PRESTAÇÃO DE CONTAS MONTREAL JUNHO'. Síndico responsável ainda não identificado na fonte original — cadastrar em Síndicos.",
    },
  });
  console.log("Condomínios Barcelia e Montreal criados.");

  // --------------------------------------------------------------------
  // 6. Lançamentos financeiros de Junho/2026
  // --------------------------------------------------------------------
  const DATA_REF = new Date("2026-06-30T12:00:00.000Z");
  const MES = 6;
  const ANO = 2026;

  type LancamentoSeed = {
    condominioId: string;
    categoriaKey: string;
    fornecedorNome?: string;
    tipo: "RECEITA" | "DESPESA";
    descricao: string;
    valor: number;
  };

  const lancamentos: LancamentoSeed[] = [
    // ---- BARCELIA — receitas do período (exclui o saldo herdado do mês
    // anterior, agora registrado como `saldoAnterior` na Prestação de Contas)
    {
      condominioId: barcelia.id,
      categoriaKey: "RECEITA:Repasse de Cobrança/Terceiros",
      tipo: "RECEITA",
      descricao: "Repasse recebido — Stanley",
      valor: 1725.57,
    },
    {
      condominioId: barcelia.id,
      categoriaKey: "RECEITA:Taxa de Condomínio",
      tipo: "RECEITA",
      descricao: "Taxa de condomínio — unidade comercial (loja/restaurante)",
      valor: 280.14,
    },
    // ---- BARCELIA — despesas fixas
    { condominioId: barcelia.id, categoriaKey: "DESPESA:Energia Elétrica", fornecedorNome: "CEMIG", tipo: "DESPESA", descricao: "Energia elétrica — áreas comuns", valor: 48.46 },
    { condominioId: barcelia.id, categoriaKey: "DESPESA:Água e Esgoto", fornecedorNome: "SAAE", tipo: "DESPESA", descricao: "Água e esgoto", valor: 571.63 },
    { condominioId: barcelia.id, categoriaKey: "DESPESA:Internet/Telefonia", tipo: "DESPESA", descricao: "Internet", valor: 59.99 },
    { condominioId: barcelia.id, categoriaKey: "DESPESA:Limpeza e Conservação", tipo: "DESPESA", descricao: "Limpeza das áreas comuns", valor: 400 },
    { condominioId: barcelia.id, categoriaKey: "DESPESA:Honorários Bem Viver", tipo: "DESPESA", descricao: "Honorários — Bem Viver Assessoria Administrativa", valor: 200 },
    // ---- BARCELIA — despesas extras
    { condominioId: barcelia.id, categoriaKey: "DESPESA:Seguro Predial", tipo: "DESPESA", descricao: "Seguro do prédio — última parcela", valor: 264.08 },
    { condominioId: barcelia.id, categoriaKey: "DESPESA:Manutenção e Reparos", tipo: "DESPESA", descricao: "Limpeza da caixa d'água", valor: 600 },
    { condominioId: barcelia.id, categoriaKey: "DESPESA:Serviços Cartorários/Jurídicos", tipo: "DESPESA", descricao: "Troca de titularidade — CNPJ", valor: 150 },
    { condominioId: barcelia.id, categoriaKey: "DESPESA:Serviços Cartorários/Jurídicos", tipo: "DESPESA", descricao: "Registro de ata", valor: 110.73 },

    // ---- MONTREAL — receita do período (repasse da administradora de
    // cobrança; saldo em conta antes do repasse vira `saldoAnterior`)
    {
      condominioId: montreal.id,
      categoriaKey: "RECEITA:Repasse de Cobrança/Terceiros",
      fornecedorNome: "Confiança - Garantidora",
      tipo: "RECEITA",
      descricao: "Repasse da Confiança - Garantidora",
      valor: 9688.66,
    },
    // ---- MONTREAL — despesas bancárias
    { condominioId: montreal.id, categoriaKey: "DESPESA:Tarifa Bancária", fornecedorNome: "Sicoob", tipo: "DESPESA", descricao: "Tarifa da conta (mensal)", valor: 59.9 },
    // ---- MONTREAL — despesas fixas
    { condominioId: montreal.id, categoriaKey: "DESPESA:Energia Elétrica", fornecedorNome: "CEMIG", tipo: "DESPESA", descricao: "Energia dos blocos (débito automático)", valor: 977.3 },
    { condominioId: montreal.id, categoriaKey: "DESPESA:Água e Esgoto", fornecedorNome: "SAAE", tipo: "DESPESA", descricao: "Abastecimento de água (débito automático)", valor: 32.03 },
    { condominioId: montreal.id, categoriaKey: "DESPESA:Internet/Telefonia", fornecedorNome: "Vivo", tipo: "DESPESA", descricao: "Chip do interfone", valor: 43.47 },
    { condominioId: montreal.id, categoriaKey: "DESPESA:Limpeza e Conservação", tipo: "DESPESA", descricao: "Faxineira — limpeza dos prédios e áreas comuns (via Pix)", valor: 1621 },
    { condominioId: montreal.id, categoriaKey: "DESPESA:Pagamento Síndico", tipo: "DESPESA", descricao: "Pagamento síndico", valor: 1621 },
    { condominioId: montreal.id, categoriaKey: "DESPESA:Honorários Bem Viver", tipo: "DESPESA", descricao: "Honorários — Bem Viver Assessoria Administrativa (via Pix)", valor: 3300 },
    { condominioId: montreal.id, categoriaKey: "DESPESA:Financiamento/Obra", tipo: "DESPESA", descricao: "Financiamento mãos à obra", valor: 729.5 },
    // ---- MONTREAL — despesas extras
    { condominioId: montreal.id, categoriaKey: "DESPESA:Manutenção e Reparos", tipo: "DESPESA", descricao: "Substituição da mola mecânica — portão social", valor: 380 },
    { condominioId: montreal.id, categoriaKey: "DESPESA:Sinalização e Segurança", tipo: "DESPESA", descricao: "Placas de sinalização dos portões", valor: 159.6 },
  ];

  const lancamentoIds: Record<string, string[]> = { [barcelia.id]: [], [montreal.id]: [] };

  for (const l of lancamentos) {
    const categoriaId = catId.get(l.categoriaKey);
    if (!categoriaId) throw new Error(`Categoria não encontrada: ${l.categoriaKey}`);
    const rec = await prisma.lancamentoFinanceiro.create({
      data: {
        condominioId: l.condominioId,
        categoriaId,
        fornecedorId: l.fornecedorNome ? fornId.get(l.fornecedorNome) : undefined,
        tipo: l.tipo,
        descricao: l.descricao,
        valor: l.valor,
        competenciaMes: MES,
        competenciaAno: ANO,
        dataMovimento: DATA_REF,
        criadoPorId: admin.id,
      },
    });
    lancamentoIds[l.condominioId].push(rec.id);
  }
  console.log(`${lancamentos.length} lançamentos financeiros de Junho/2026 criados.`);

  // --------------------------------------------------------------------
  // 7. Prestação de Contas — Junho/2026 (gerada e publicada)
  // --------------------------------------------------------------------
  async function gerarPrestacao(condominioId: string, saldoAnterior: number, saldoEsperado: number) {
    const itens = await prisma.lancamentoFinanceiro.findMany({
      where: { condominioId, competenciaMes: MES, competenciaAno: ANO },
    });
    const totalReceitas = itens
      .filter((i) => i.tipo === "RECEITA")
      .reduce((acc, i) => acc + Number(i.valor), 0);
    const totalDespesas = itens
      .filter((i) => i.tipo === "DESPESA")
      .reduce((acc, i) => acc + Number(i.valor), 0);
    const saldoAtual = saldoAnterior + totalReceitas - totalDespesas;

    // Verificação de integridade: o valor recalculado deve bater com o saldo
    // que já constava na planilha original (evita erro de transcrição).
    if (Math.abs(saldoAtual - saldoEsperado) > 0.01) {
      throw new Error(
        `Divergência ao migrar dados do condomínio ${condominioId}: saldo recalculado ${saldoAtual.toFixed(2)} ≠ saldo original ${saldoEsperado.toFixed(2)}`
      );
    }

    const prestacao = await prisma.prestacaoContas.upsert({
      where: {
        condominioId_competenciaMes_competenciaAno: {
          condominioId,
          competenciaMes: MES,
          competenciaAno: ANO,
        },
      },
      update: {},
      create: {
        condominioId,
        competenciaMes: MES,
        competenciaAno: ANO,
        saldoAnterior,
        totalReceitas,
        totalDespesas,
        saldoAtual,
        status: "PUBLICADA",
        publicadoPorId: admin.id,
        publicadoEm: DATA_REF,
      },
    });

    for (const item of itens) {
      await prisma.prestacaoContasItem.upsert({
        where: {
          prestacaoContasId_lancamentoId: {
            prestacaoContasId: prestacao.id,
            lancamentoId: item.id,
          },
        },
        update: {},
        create: {
          prestacaoContasId: prestacao.id,
          lancamentoId: item.id,
          valorConsiderado: item.valor,
        },
      });
    }

    return prestacao;
  }

  await gerarPrestacao(barcelia.id, 216.5, -182.68);
  await gerarPrestacao(montreal.id, 473.36, 1238.22);

  console.log("Prestações de contas de Junho/2026 geradas e publicadas (saldos conferidos ✓).");
  console.log("Seed concluído com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
