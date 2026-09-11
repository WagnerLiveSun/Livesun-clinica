import { useState } from "react";
import { Button } from "./ui/button";
import { Receipt } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ReceiptGeneratorProps {
  recebimentoId: number;
  label?: string;
  onSuccess?: () => void;
}

export function ReceiptGenerator({ recebimentoId, label, onSuccess }: ReceiptGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const utils = trpc.useUtils();

  const generateReceipt = async () => {
    setIsGenerating(true);

    try {
      const response = await utils.client.financeiro.gerarRecibo.query({ recebimentoId });
      let receiptHTML = response.html;
      const receiptNumber = response.numero;

      // O recibo é aberto via Blob URL (origem "null"), onde URLs relativas não
      // resolvem. Injetamos uma tag <base> com a origem real da aplicação para
      // que o logo (ex.: /storage/... ou /assets/logo-sunset.svg) seja carregado.
      if (/\<head\>/i.test(receiptHTML)) {
        receiptHTML = receiptHTML.replace(/\<head\>/i, `<head><base href="${window.location.origin}/">`);
      }

      // Criar blob e abrir em nova janela
      const blob = new Blob([receiptHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        newWindow.document.title = `recibo_${receiptNumber}.html`;
        if (onSuccess) onSuccess();
        toast.success("Recibo gerado com sucesso!");
      } else {
        toast.error("Não foi possível abrir a janela. Verifique se o bloqueador de pop-ups está desativado.");
      }

      // Limpar URL blob
      setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (err) {
      toast.error("Erro ao gerar recibo. Tente novamente.");
      console.error("Erro ao gerar recibo:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generateReceipt}
      disabled={isGenerating}
      className="flex items-center gap-2"
    >
      <Receipt className="h-4 w-4" />
      {isGenerating ? 'Gerando...' : 'Gerar Recibo'}
    </Button>
  );
}