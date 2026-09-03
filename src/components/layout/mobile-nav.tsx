"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Logo } from "@/components/shared/logo";
import type { PapelUsuario } from "@/generated/prisma/enums";

export function MobileNav({ papel }: { papel: PapelUsuario }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <DialogContent className="left-0 top-0 h-full max-h-full w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-0 bg-bv-black p-0 data-[state=open]:slide-in-from-left-full data-[state=closed]:slide-out-to-left-full">
        <DialogTitle className="sr-only">Menu de navegação</DialogTitle>
        <div className="flex h-full flex-col" onClick={() => setOpen(false)}>
          <div className="px-5 py-5">
            <Logo variant="light" />
          </div>
          <SidebarNav papel={papel} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
