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
  "/dashboard/condominios",
  "/dashboard/sindicos",
  "/dashboard/fornecedores",
  "/dashboard/financeiro/lancamentos",
  "/dashboard/configuracoes/usuarios",
  "/dashboard/configuracoes/categorias",
  "/dashboard/auditoria",
];

async function main() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  const erros = [];
  page.on("pageerror", (err) => erros.push(`pageerror @ ${page.url()}: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") erros.push(`console.error @ ${page.url()}: ${msg.text().slice(0, 200)}`);
  });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "bemviverassessoria.cond@gmail.com");
  await page.fill('input[name="senha"]', SENHA_ADMIN);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 10000 });

  for (const rota of ROTAS) {
    await page.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
    // Botão de editar (ícone lápis) ou "ver detalhes" (auditoria) na primeira linha da tabela
    const botaoAcao = page.locator(
      'button[aria-label^="Editar"], button[aria-label="Ver detalhes"]'
    ).first();
    const existe = await botaoAcao.count();
    console.log(`${rota}: botão de ação encontrado = ${existe > 0}`);
    if (existe) {
      await botaoAcao.click();
      await page.waitForTimeout(500);
      const dialogVisible = await page.locator('[role="dialog"]').first().isVisible().catch(() => false);
      console.log(`   dialog aberto = ${dialogVisible}`);
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
