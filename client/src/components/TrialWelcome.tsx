import { useEffect, useState } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Trial = { endsAt: string; secondsRemaining: number };

export function formatTrialDeadline(endsAt: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(endsAt));
}

export function TrialWelcomeContent({ trial, onContinue }: { trial: Trial; onContinue: () => void }) {
  const days = Math.ceil(trial.secondsRemaining / 86400);
  return <>
    <DialogHeader>
      <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-700"><Sparkles aria-hidden="true" /></div>
      <DialogTitle>Boas-vindas ao LiveSun Clínicas!</DialogTitle>
      <DialogDescription>Seu período de experiência de 7 dias está ativo.</DialogDescription>
    </DialogHeader>
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      <p>Explore a agenda, cadastre serviços e conheça as ferramentas para organizar sua clínica.</p>
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4"><strong>{days === 1 ? "Resta até 1 dia" : `Restam até ${days} dias`}</strong><p>Seu acesso de experiência termina em {formatTrialDeadline(trial.endsAt)} (horário de Brasília).</p></div>
      <p>Após esse período, a continuidade do acesso depende de uma assinatura ativa.</p>
    </div>
    <DialogFooter><Button className="primary-action" onClick={onContinue}>Começar a usar</Button></DialogFooter>
  </>;
}

export function TrialWelcome({ userId }: { userId: number }) {
  const trial = trpc.auth.trialStatus.useQuery(undefined, { refetchInterval: 60000, refetchOnWindowFocus: true, retry: false });
  const [open, setOpen] = useState(false);
  const info = trial.data;
  const key = info ? `livesun-trial-welcome:${userId}:${info.endsAt}` : null;
  useEffect(() => {
    if (!key) { setOpen(false); return; }
    try { setOpen(localStorage.getItem(key) !== "seen"); } catch { setOpen(true); }
  }, [key]);
  if (!info) return null;
  const dismiss = () => {
    if (key) try { localStorage.setItem(key, "seen"); } catch { /* a informação permanece disponível no painel */ }
    setOpen(false);
  };
  const days = Math.ceil(info.secondsRemaining / 86400);
  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-slate-800" aria-label="Período de experiência">
      <span className="flex items-center gap-2"><CalendarDays className="size-4 text-rose-700" aria-hidden="true" /><span><strong>Período de experiência</strong> · {days === 1 ? "até 1 dia restante" : `até ${days} dias restantes`} · termina em {formatTrialDeadline(info.endsAt)} (horário de Brasília)</span></span>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Saiba mais</Button>
    </div>
    <Dialog open={open} onOpenChange={value => value ? setOpen(true) : dismiss()}><DialogContent><TrialWelcomeContent trial={info} onContinue={dismiss} /></DialogContent></Dialog>
  </>;
}