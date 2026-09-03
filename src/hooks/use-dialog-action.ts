"use client";

import { useState } from "react";
import type { ActionState } from "@/app/actions/condominios";

// Hook compartilhado para formulários dentro de diálogos que usam Server
// Actions no padrão `(prevState, formData) => ActionState`.
//
// Por que não `useActionState` + `useEffect(() => setOpen(false), [state])`:
// o React Compiler (habilitado neste projeto via eslint-plugin-react-hooks)
// proíbe setState síncrono dentro de efeitos — mesmo quando guardado por uma
// condição — porque esse padrão tende a gerar re-renderizações em cascata.
// A alternativa recomendada pela própria documentação do React ("Actions")
// é chamar a Server Action a partir de um manipulador assíncrono acionado
// pelo envio do formulário, e reagir ao resultado diretamente ali — sem
// efeito algum. Isso também simplifica o fluxo: o fechamento do diálogo
// acontece exatamente no mesmo instante em que sabemos que a ação teve
// sucesso, sem esperar um novo ciclo de renderização.
export function useDialogAction(
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>,
  onSuccess?: () => void
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function submit(formData: FormData) {
    setPending(true);
    setError(undefined);
    const result = await action(undefined, formData);
    setPending(false);
    if (result?.success) {
      onSuccess?.();
    } else {
      setError(result?.error ?? "Não foi possível concluir a ação.");
    }
  }

  return { submit, pending, error };
}
