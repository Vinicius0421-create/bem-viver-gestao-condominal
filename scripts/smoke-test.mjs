import "dotenv/config";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
// SEG-1: nunca hardcodar a senha do usuário administrador em código
// versionado — usa a mesma variável de ambiente lida por `prisma/seed.ts`
// (SEED_ADMIN_PASSWORD), definida no `.env` local.
const SENHA_ADMIN = process.env.SEED_ADMIN_PASSWORD;
if (!SENHA_ADMIN) {
  console.error(
    "SEED_ADMIN_PASSWORD não está definida no .env — defina-a com a senha do usuário administrador local antes de rodar o smoke test."
  );
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  const erros = [];
  page.on("pageerror", (err) => erros.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") erros.push(`console.error: ${msg.text()}`);
  });

  console.log("1. Login...");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "bemviverassessoria.cond@gmail.com");
  await page.fill('input[name="senha"]', SENHA_ADMIN);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 10000 });
  const dashResp = await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  if (dashResp.status() !== 200) throw new Error(`Dashboard retornou status ${dashResp.status()}`);
  await page.waitForSelector("text=Saldo consolidado");
  console.log("   OK - logado, dashboard executivo carregado (200)");

  console.log("2. Fluxo de caixa...");
  await page.goto(`${BASE}/dashboard/financeiro/fluxo-de-caixa`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Fluxo de Caixa");
  console.log("   OK");

  console.log("3. Lista de prestação de contas...");
  await page.goto(`${BASE}/dashboard/prestacao-de-contas`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Prestação de Contas");
  console.log("   OK");

  console.log("4. Gerar nova prestação de contas (Barcelia, mês futuro)...");
  await page.click('button:has-text("Gerar prestação de contas")');
  await page.waitForSelector('text=Gerar prestação de contas', { state: "visible" });
  // Seleciona condomínio (primeiro item do select)
  await page.click('#condominioId');
  await page.waitForTimeout(300);
  await page.click('[role="option"]:has-text("Barcelia")');
  // Mes = Julho (7), ano = 2026 (defaults podem já não colidir - ajustar se necessário)
  await page.click('#competenciaMes');
  await page.waitForTimeout(300);
  await page.click('[role="option"]:has-text("Julho")');
  await page.click('#competenciaAno');
  await page.waitForTimeout(300);
  await page.click('[role="option"]:has-text("2026")');
  await page.click('button[type="submit"]:text-is("Gerar")');
  await page.waitForURL(/\/dashboard\/prestacao-de-contas\/[a-z0-9]+/, { timeout: 10000 });
  const url = page.url();
  console.log("   OK - redirecionado para", url);

  console.log("5. Verificando cards de resumo...");
  await page.waitForSelector("text=Saldo atual");
  console.log("   OK");

  console.log("6. Testando export PDF...");
  const [pdfPage] = await Promise.all([
    browser.newPage(),
  ]);
  const idMatch = url.match(/prestacao-de-contas\/([a-zA-Z0-9]+)/);
  const id = idMatch[1];
  const pdfR = await pdfPage.request.get(`${BASE}/api/prestacoes/${id}/pdf`, {
    headers: { cookie: (await page.context().cookies()).map(c => `${c.name}=${c.value}`).join("; ") },
  });
  console.log("   PDF status:", pdfR.status(), "content-type:", pdfR.headers()["content-type"], "size:", (await pdfR.body()).length, "bytes");

  console.log("7. Testando export Excel...");
  const excelR = await pdfPage.request.get(`${BASE}/api/prestacoes/${id}/excel`, {
    headers: { cookie: (await page.context().cookies()).map(c => `${c.name}=${c.value}`).join("; ") },
  });
  console.log("   Excel status:", excelR.status(), "content-type:", excelR.headers()["content-type"], "size:", (await excelR.body()).length, "bytes");

  console.log("8. Enviar para revisão...");
  await page.click('button:has-text("Enviar para revisão")');
  await page.waitForTimeout(500);
  await page.click('button:text-is("Enviar")');
  await page.waitForTimeout(1500);
  await page.waitForSelector("text=Em revisão");
  console.log("   OK - status Em revisão");

  console.log("9. Publicar...");
  await page.click('button:has-text("Publicar")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Confirmar publicação")');
  await page.waitForTimeout(1500);
  await page.waitForSelector("text=Publicada");
  console.log("   OK - status Publicada");

  console.log("10. Reabrir (ADMIN)...");
  await page.click('button:has-text("Reabrir para correção")');
  await page.waitForTimeout(300);
  await page.fill('textarea[name="motivo"]', "Teste automatizado de reabertura para validar o fluxo de exceção controlada.");
  await page.click('button:has-text("Confirmar reabertura")');
  await page.waitForTimeout(1500);
  await page.waitForSelector("text=Em revisão");
  console.log("   OK - reaberta com sucesso, voltou para Em revisão");

  console.log("\n=== ERROS DE CONSOLE/PÁGINA CAPTURADOS ===");
  if (erros.length === 0) console.log("Nenhum erro.");
  else erros.forEach((e) => console.log(" - " + e));

  await browser.close();
  console.log("\nSMOKE TEST CONCLUÍDO COM SUCESSO");
}

main().catch((err) => {
  console.error("SMOKE TEST FALHOU:", err);
  process.exit(1);
});
