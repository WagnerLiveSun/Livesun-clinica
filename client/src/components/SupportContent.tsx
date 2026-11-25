import { Headphones, Mail, MessageCircle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SupportContent() {
  return <div className="space-y-6">
    <div className="section-header">
      <div>
        <p className="eyebrow">ESTAMOS AQUI PARA AJUDAR</p>
        <h1>Contato e suporte</h1>
        <p className="section-description">Escolha um canal para falar com a equipe LiveSun.</p>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="surface-card min-w-0">
        <CardHeader><Mail aria-hidden="true" className="mb-2 text-[var(--rose-600)]" /><CardTitle><h2>E-mail</h2></CardTitle><CardDescription>Contato direto com a equipe.</CardDescription></CardHeader>
        <CardContent><a className="break-all font-medium underline underline-offset-4 text-[var(--rose-700)]" href="mailto:suporte@livesun.com.br">suporte@livesun.com.br</a></CardContent>
      </Card>
      <Card className="surface-card min-w-0">
        <CardHeader><MessageCircle aria-hidden="true" className="mb-2 text-[var(--rose-600)]" /><CardTitle><h2>WhatsApp</h2></CardTitle><CardDescription>Converse com a equipe LiveSun.</CardDescription></CardHeader>
        <CardContent><a className="font-medium underline underline-offset-4 text-[var(--rose-700)]" href="https://wa.me/5521927891083" target="_blank" rel="noopener noreferrer">21 92789-1083 <span className="sr-only">(abre em nova aba)</span></a></CardContent>
      </Card>
      <Card className="surface-card min-w-0">
        <CardHeader><ClipboardList aria-hidden="true" className="mb-2 text-[var(--rose-600)]" /><CardTitle><h2>Solicitação de suporte</h2></CardTitle><CardDescription>Registre o seu atendimento.</CardDescription></CardHeader>
        <CardContent><Button asChild className="primary-action"><a href="https://app.pipefy.com/public/form/ETeM9Gbz" target="_blank" rel="noopener noreferrer">Abrir solicitação <span className="sr-only">(abre em nova aba)</span></a></Button></CardContent>
      </Card>
    </div>
    <Card className="surface-card">
      <CardHeader><div className="flex items-center gap-2"><Headphones aria-hidden="true" className="size-5 text-[var(--rose-600)]" /><CardTitle><h2>Como podemos ajudar?</h2></CardTitle></div></CardHeader>
      <CardContent><p className="text-sm leading-relaxed text-muted-foreground">Informe a tela, a ação realizada e a mensagem exibida. Se possível, inclua uma captura de tela e o horário do ocorrido. Não envie sua senha.</p></CardContent>
    </Card>
  </div>;
}