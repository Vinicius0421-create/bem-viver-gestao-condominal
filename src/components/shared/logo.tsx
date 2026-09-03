/**
 * Marca da Bem Viver — reconstrução vetorial (SVG) da logo oficial: moldura
 * quadrada arredondada contornando um skyline estilizado, na paleta
 * dourada já usada no restante do sistema (`--bv-gold-500` etc, ver
 * `globals.css`), sobre fundo transparente. Vetorial para renderizar nítida
 * em qualquer tamanho (sidebar, favicon, PDF), sem depender de um arquivo
 * de imagem externo.
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
      {/* Moldura quadrada arredondada */}
      <rect
        x="12"
        y="12"
        width="176"
        height="176"
        rx="58"
        ry="58"
        stroke="currentColor"
        strokeWidth="9"
      />

      {/* Skyline */}
      <g fill="currentColor">
        {/* Prédio 1 — pequeno, à esquerda */}
        <rect x="34" y="104" width="17" height="38" />

        {/* Prédio 2 — colunas finas */}
        <g>
          <rect x="56" y="84" width="4" height="58" />
          <rect x="64" y="84" width="4" height="58" />
          <rect x="72" y="84" width="4" height="58" />
        </g>

        {/* Prédio 3 — o mais alto, ao centro, com topo em ponta */}
        <path d="M84 142V70l14-14 14 14v72H84Z" />

        {/* Prédio 4 — colunas finas */}
        <g>
          <rect x="118" y="90" width="4" height="52" />
          <rect x="126" y="90" width="4" height="52" />
          <rect x="134" y="90" width="4" height="52" />
        </g>

        {/* Prédio 5 — pequeno, à direita */}
        <rect x="148" y="110" width="17" height="32" />
      </g>

      {/* Linha do horizonte, levemente curva, sob o skyline */}
      <path
        d="M26 145 Q100 132 174 145"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
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
