"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Landmark,
  Wallet,
  FileSpreadsheet,
  Users,
  Truck,
  ArrowDownUp,
  ScrollText,
  Settings,
  ShieldCheck,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PapelUsuario } from "@/generated/prisma/enums";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  minPapel?: PapelUsuario;
};

type NavGroup = {
  titulo: string;
  itens: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    titulo: "Visão Geral",
    itens: [
      { href: "/dashboard", label: "Painel Executivo", icon: LayoutDashboard },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { href: "/dashboard/condominios", label: "Condomínios", icon: Building2 },
      { href: "/dashboard/sindicos", label: "Síndicos", icon: Users },
      { href: "/dashboard/fornecedores", label: "Fornecedores", icon: Truck },
    ],
  },
  {
    titulo: "Financeiro",
    itens: [
      { href: "/dashboard/financeiro/lancamentos", label: "Lançamentos", icon: ArrowDownUp },
      { href: "/dashboard/financeiro/titulos", label: "Contas a Pagar/Receber", icon: Wallet },
      { href: "/dashboard/financeiro/fluxo-de-caixa", label: "Fluxo de Caixa", icon: Landmark },
    ],
  },
  {
    titulo: "Prestação de Contas",
    itens: [
      {
        href: "/dashboard/prestacao-de-contas",
        label: "Demonstrativos",
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    titulo: "Documentos",
    itens: [
      { href: "/dashboard/documentos", label: "Central de Documentos", icon: FolderOpen },
    ],
  },
  {
    titulo: "Sistema",
    itens: [
      {
        href: "/dashboard/auditoria",
        label: "Auditoria",
        icon: ShieldCheck,
        minPapel: "GESTOR",
      },
      {
        href: "/dashboard/configuracoes/usuarios",
        label: "Usuários",
        icon: Settings,
        minPapel: "ADMIN",
      },
      {
        href: "/dashboard/configuracoes/categorias",
        label: "Categorias Financeiras",
        icon: ScrollText,
        minPapel: "GESTOR",
      },
    ],
  },
];

const HIERARQUIA: Record<PapelUsuario, number> = {
  OPERACIONAL: 1,
  GESTOR: 2,
  ADMIN: 3,
};

export function SidebarNav({ papel }: { papel: PapelUsuario }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => {
        const itensVisiveis = group.itens.filter(
          (item) => !item.minPapel || HIERARQUIA[papel] >= HIERARQUIA[item.minPapel]
        );
        if (itensVisiveis.length === 0) return null;

        return (
          <div key={group.titulo}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">
              {group.titulo}
            </p>
            <div className="flex flex-col gap-0.5">
              {itensVisiveis.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-bv-gold-500/15 text-bv-gold-300"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
