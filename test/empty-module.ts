// Stub usado apenas pelo Vitest (ver vitest.config.ts) para substituir
// `server-only`/`client-only` — pacotes que servem só como um sinal para o
// bundler do Next.js barrar imports indevidos entre Server e Client
// Components. O Next faz essa checagem em tempo de build; fora dele (ex:
// rodando testes unitários puros com Vitest/Vite), os pacotes reais lançam
// erro incondicionalmente ao serem importados — então, aqui, viram no-op.
export {};
