import "dotenv/config";
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
// SEG-1: ver comentário equivalente em scripts/smoke-test.mjs.
const SENHA_ADMIN = process.env.SEED_ADMIN_PASSWORD;
if (!SENHA_ADMIN) {
  console.error(
    "SEED_ADMIN_PASSWORD não está definida no .env — defina-a com a senha do usuário administrador local antes de rodar o smoke test."
  );
  process.exit(1);
}
const ROTAS = [
  "/dashboard",
  "/dashboard/condominios",
  "/dashboard/sindicos",
  "/dashboard/fornecedores",
  "/dashboard/financeiro/lancamentos",
  "/dashboard/financeiro/titulos",
  "/dashboard/financeiro/fluxo-de-caixa",
  "/dashboard/prestacao-de-contas",
  "/dashboard/auditoria",
  "/dashboard/configuracoes/usuarios",
  "/dashboard/configuracoes/categorias",
];

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  const erros = [];
  page.on("pageerror", (err) => erros.push(`pageerror @ ${page.url()}: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") erros.push(`console.error @ ${page.url()}: ${msg.text()}`);
  });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "bemviverassessoria.cond@gmail.com");
  await page.fill('input[name="senha"]', SENHA_ADMIN);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 10000 });

  for (const rota of ROTAS) {
    const resp = await page.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
    const status = resp ? resp.status() : "?";
    console.log(`${status === 200 ? "OK " : "FAIL"} ${status}  ${rota}`);
    if (status !== 200) erros.push(`rota ${rota} retornou status ${status}`);

    // Abre diálogos de "novo registro" quando existirem, para garantir que
    // renderizam sem erro (isso testa exatamente o trecho refatorado).
    const botaoNovo = page.locator('button:has-text("Novo"), button:has-text("Gerar")').first();
    if (await botaoNovo.count()) {
      await botaoNovo.click();
      await page.waitForTimeout(400);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }
  }

  console.log("\n=== ERROS CAPTURADOS ===");
  if (erros.length === 0) console.log("Nenhum.");
  else erros.forEach((e) => console.log(" - " + e));

  await browser.close();
  if (erros.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("FALHOU:", err);
  process.exit(1);
});
