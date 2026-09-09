/**
 * Marca da Bem Viver — reconstrução vetorial (SVG) da logo oficial.
 *
 * Fidelidade: reproduz o símbolo real usado nos materiais institucionais da
 * empresa (ver arquivos de referência do projeto — cartão/post oficiais):
 * moldura em "squircle" (quadrado de cantos bem arredondados) contornando um
 * conjunto de barras verticais douradas de alturas variadas (skyline
 * minimalista, sem telhados em ponta e sem linha de horizonte). As duas
 * referências oficiais disponíveis variam ligeiramente o formato da moldura
 * (arco vs. squircle fechado); optou-se pelo squircle fechado por já ser o
 * padrão usado neste sistema (favicon, PWA, cabeçalhos) e por ser o formato
 * mais próximo do "badge" oficial usado ao lado do wordmark.
 *
 * Vetorial para renderizar nítida em qualquer tamanho (sidebar, favicon,
 * PDF), sem depender de um arquivo de imagem externo.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Bem Viver Assessoria Condominial"
    >
      {/* Moldura squircle */}
      <rect
        x="12"
        y="12"
        width="176"
        height="176"
        rx="50"
        ry="50"
        stroke="currentColor"
        strokeWidth="9"
      />

      {/* Skyline — barras verticais de alturas variadas, topo reto (sem telhado em ponta, sem linha de horizonte) */}
      <g fill="currentColor">
        <rect x="38" y="118" width="16" height="28" />
        <rect x="58" y="98" width="16" height="48" />
        <rect x="80" y="82" width="20" height="64" />
        <rect x="104" y="100" width="16" height="46" />
        <rect x="124" y="116" width="18" height="30" />
      </g>
    </svg>
  );
}

/**
 * Lockup completo: marca + nome, para cabeçalhos e telas de login.
 * `variant="light"` usa dourado sobre fundo escuro (sidebar, painel do
 * login); `variant="dark"` usa o preto da marca sobre fundo claro.
 */
export function Logo({
  className,
  variant = "light",
  showTagline = false,
}: {
  className?: string;
  variant?: "light" | "dark";
  showTagline?: boolean;
}) {
  const corTexto = variant === "light" ? "text-bv-gold-300" : "text-bv-black";
  const corMarca = variant === "light" ? "text-bv-gold-400" : "text-bv-gold-500";

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark className={`h-8 w-8 shrink-0 ${corMarca}`} />
      <div className="leading-tight">
        <span className={`font-display block text-lg font-semibold ${corTexto}`}>
          Bem Viver
        </span>
        {showTagline && (
          <p
            className={
              variant === "light"
                ? "text-[11px] text-white/40"
                : "text-[11px] text-muted-foreground"
            }
          >
            Assessoria Condominial
          </p>
        )}
      </div>
    </div>
  );
}
