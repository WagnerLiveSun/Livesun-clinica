import { useEffect, useState, useMemo, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { filterReceivables } from "@/lib/receivables";
import { groupScheduleByReference, type CalendarReference } from "@/lib/calendar";
import { canLoadClientPortal } from "@/lib/access";
import { formatAnamnesisAnswer } from "@/lib/anamnesis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReceiptGenerator } from "@/components/ReceiptGenerator";
import {
  Activity, CalendarDays, Check, ChevronRight, CircleDollarSign, ClipboardList,
  FilePlus2, Files, HeartPulse, ImagePlus, LayoutDashboard, LogOut, Menu,
  PackagePlus, Palette, Plus, Printer, ReceiptText, RefreshCw, Settings2, ShieldCheck, Sparkles, Stethoscope, Trash2, Users,
  WalletCards, X, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

type Section = "inicio" | "agenda" | "clientes" | "servicos" | "questionarios" | "financeiro" | "gestao";

const roleLabel: Record<string, string> = {
  master: "Consultor Master", admin: "Gestor(a)", recepcao: "Recepção", profissional: "Profissional", cliente: "Cliente", user: "Cliente",
};

const statusLabel: Record<string, string> = {
  PENDENTE: "Solicitado", AGUARDANDO_CONFIRMACAO: "Aguardando confirmação", CONFIRMADA: "Confirmada",
  EM_ATENDIMENTO: "Em atendimento", CONCLUIDA: "Realizada", CANCELADA: "Cancelada",
  NAO_COMPARECEU: "Falta", BLOQUEADA: "Bloqueada", ABERTA: "Em aberto", PAGA: "Paga",
};

const clinicColorPalette = [
  { value: "#C8627A", label: "Rosé" },
  { value: "#A0522D", label: "Terracota" },
  { value: "#CEAB50", label: "Dourado" },
  { value: "#2A8A7E", label: "Verde água" },
  { value: "#1E3A5F", label: "Azul-marinho" },
  { value: "#6B4C8A", label: "Ameixa" },
  { value: "#2D6A4F", label: "Verde-floresta" },
  { value: "#4A4A4A", label: "Grafite" },
  { value: "#E07060", label: "Coral" },
  { value: "#7B68EE", label: "Lavanda" },
];

type PaymentMethod = "DINHEIRO" | "PIX" | "CARTAO_CREDITO" | "CARTAO_DEBITO";
type PaymentLine = { tipoPagamento: PaymentMethod; valor: string; dataPrevistaLiquidacao: string };

function primaryForeground(color: string) {
  const hex = color.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "#ffffff";
  const [red, green, blue] = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.58 ? "#261f1b" : "#ffffff";
}

function normalizeClinicColor(color?: string | null) {
  const value = color?.trim() ?? "";
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toUpperCase();
  const legacyColors: Record<string, string> = {
    "bronze rosado": "#A0522D",
    bronze: "#A0522D",
    rose: "#C8627A",
    rosé: "#C8627A",
  };
  return legacyColors[value.toLowerCase()] ?? "#C8627A";
}

function currency(value: string | number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function dateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function dateOnly(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

function exportCommissionReport(rows: Array<{ profissionalNome: string; tipoComissao: "PERCENTUAL" | "VALOR_FIXO"; percentual: string; valorRegra: string; valor: string; status: string; geradaEm: Date | string }>) {
  const reportWindow = window.open("", "_blank", "width=900,height=720");
  if (!reportWindow) { toast.error("Permita a abertura de janelas para salvar o relatório em PDF."); return; }
  const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] ?? char));
  const total = rows.reduce((sum, row) => sum + Number(row.valor), 0);
  const rowsHtml = rows.map((row) => `<tr><td>${escapeHtml(row.profissionalNome)}</td><td>${dateOnly(row.geradaEm)}</td><td>${row.tipoComissao === "PERCENTUAL" ? `${escapeHtml(String(row.percentual))}% do serviço` : `${currency(row.valorRegra)} fixo`}</td><td>${escapeHtml(row.status)}</td><td>${currency(row.valor)}</td></tr>`).join("") || "<tr><td colspan='5'>Não há comissões para o período.</td></tr>";
  reportWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de comissões — SunSet</title><style>body{font-family:Arial,sans-serif;color:#2c2627;margin:40px}h1{font-family:Georgia,serif;margin:0;color:#8f3156}p{color:#6d6264}table{border-collapse:collapse;width:100%;margin-top:28px}th,td{padding:12px;border-bottom:1px solid #eadfe2;text-align:left}th{color:#8f3156;text-transform:uppercase;font-size:11px;letter-spacing:.08em}.total{margin-top:24px;font-size:18px;font-weight:700;text-align:right}@media print{body{margin:22px}}</style></head><body><p>SunSet</p><h1>Relatório de comissões</h1><p>Emitido em ${new Date().toLocaleString("pt-BR")}</p><table><thead><tr><th>Profissional</th><th>Data</th><th>Regra</th><th>Status</th><th>Valor</th></tr></thead><tbody>${rowsHtml}</tbody></table><p class="total">Total: ${currency(total)}</p></body></html>`);
  reportWindow.document.close();
  reportWindow.focus();
  window.setTimeout(() => reportWindow.print(), 150);
}

function exportFinancialReport(report: any) {
  const reportWindow = window.open("", "_blank", "width=1024,height=780");
  if (!reportWindow) { toast.error("Permita a abertura de janelas para salvar o relatório em PDF."); return; }
  const escapeHtml = (value: unknown) => String(value ?? "—").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] ?? char));
  const table = (title: string, columns: string[], rows: unknown[][]) => `<h2>${escapeHtml(title)}</h2><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${columns.length}">Nenhum lançamento no período.</td></tr>`}</tbody></table>`;
  const summary = [
    ["A receber", report.resumo.aReceber], ["Recebido", report.resumo.recebido], ["A pagar", report.resumo.aPagar],
    ["Pago", report.resumo.pago], ["Comissões pendentes", report.resumo.comissoesPendentes], ["Resultado de caixa", report.resumo.resultadoCaixa],
  ].map(([label, value]) => `<div><span>${label}</span><strong>${currency(value as string | number)}</strong></div>`).join("");
  const sections = [
    table("Contas a receber", ["Cliente", "Descrição", "Vencimento", "Status", "Valor"], report.contasReceber.map((row: any) => [row.cliente, row.descricao, row.vencimento, row.status, currency(row.valor)])),
    table("Recebimentos", ["Data", "Cliente", "Descrição", "Forma", "Valor"], report.recebimentos.map((row: any) => [dateOnly(row.data), row.cliente, row.descricao, row.tipoPagamento, currency(row.valor)])),
    table("Contas a pagar", ["Descrição", "Categoria", "Vencimento", "Status", "Valor"], report.contasPagar.map((row: any) => [row.descricao, row.categoria, row.vencimento, row.status, currency(row.valor)])),
    table("Pagamentos", ["Data", "Descrição", "Categoria", "Valor"], report.pagamentos.map((row: any) => [dateOnly(row.data), row.descricao, row.categoria, currency(row.valor)])),
    table("Comissões", ["Profissional", "Data", "Regra", "Status", "Valor"], report.comissoes.map((row: any) => [row.profissional, dateOnly(row.geradaEm), row.tipoComissao === "PERCENTUAL" ? `${row.percentual}% do serviço` : `${currency(row.valorRegra)} fixo`, row.status, currency(row.valor)])),
    table("Serviços", ["Procedimento", "Agendados", "Realizados", "Cancelados", "Previsto", "Recebido"], report.servicos.map((row: any) => [row.nome, row.agendados, row.realizados, row.cancelados, currency(row.previsto), currency(row.recebido)])),
  ].join("");
  reportWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório financeiro — SunSet</title><style>body{font-family:Arial,sans-serif;color:#2c2627;margin:40px}h1,h2{font-family:Georgia,serif;color:#8f3156}h1{margin:0}h2{margin:34px 0 10px;font-size:19px}p{color:#6d6264}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}.summary div{border:1px solid #eadfe2;padding:13px;border-radius:9px}.summary span{display:block;color:#776d70;font-size:12px}.summary strong{font-size:18px}table{border-collapse:collapse;width:100%;margin-top:10px}th,td{padding:10px;border-bottom:1px solid #eadfe2;text-align:left;font-size:13px}th{color:#8f3156;text-transform:uppercase;font-size:10px;letter-spacing:.08em}@media print{body{margin:22px}}</style></head><body><p>SunSet</p><h1>Relatório financeiro e de serviços</h1><p>Período: ${escapeHtml(report.periodo.dataInicio)} a ${escapeHtml(report.periodo.dataFim)} · Emitido em ${new Date().toLocaleString("pt-BR")}</p><div class="summary">${summary}</div>${sections}</body></html>`);
  reportWindow.document.close();
  reportWindow.focus();
  window.setTimeout(() => reportWindow.print(), 150);
}

function StatusBadge({ value }: { value: string }) {
  const className = value === "CONCLUIDA" || value === "PAGA" || value === "CONFIRMADA"
    ? "status-success" : value === "CANCELADA" || value === "NAO_COMPARECEU" ? "status-danger" : "status-neutral";
  return <span className={`status-badge ${className}`}>{statusLabel[value] ?? value}</span>;
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="section-header">
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="section-description">{description}</p>
    </div>
    {action}
  </div>;
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return <TableRow><TableCell colSpan={cols} className="h-28 text-center text-muted-foreground">{message}</TableCell></TableRow>;
}

function BrandCredit({ className = "" }: { className?: string }) {
  return <div className={`brand-credit ${className}`.trim()}>
    <span>Desenvolvido por</span>
    <img src="/assets/logo-livesun.svg" alt="Logotipo LiveSun" />
  </div>;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [section, setSection] = useState<Section>("inicio");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showQuestionnaireForm, setShowQuestionnaireForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showDataCleanupDialog, setShowDataCleanupDialog] = useState(false);
  const [cleanupPassword, setCleanupPassword] = useState("");
  const [cleanupConfirmPhrase, setCleanupConfirmPhrase] = useState("");
  const [showThemePalette, setShowThemePalette] = useState(false);
  const [selectedAgendaSession, setSelectedAgendaSession] = useState<any | null>(null);
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [showCommissionPaymentForm, setShowCommissionPaymentForm] = useState(false);
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [showSupplyForm, setShowSupplyForm] = useState(false);
  const [showProfessionalForm, setShowProfessionalForm] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ kind: "cliente" | "servico" | "equipamento" | "insumo" | "profissional"; id: number; nome: string } | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showCommissionRuleForm, setShowCommissionRuleForm] = useState(false);
  const [showFirstAccessSetup, setShowFirstAccessSetup] = useState(false);
  const [firstAccessForm, setFirstAccessForm] = useState({ clinicaNome: "", clinicaSlug: "", adminNome: "", adminEmail: "", adminSenha: "" });
  const [calendarReference, setCalendarReference] = useState<CalendarReference>("profissional");
  const [weekReference, setWeekReference] = useState(() => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
    return day.getTime();
  });
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoCategory, setPhotoCategory] = useState<"ANTES" | "DEPOIS" | "EVOLUCAO">("EVOLUCAO");
  const [clientForm, setClientForm] = useState({ nome: "", email: "", telefone: "", cpfHash: "", dataNascimento: "" });
  const [sessionForm, setSessionForm] = useState({ clienteId: "", servicoId: "", profissionalId: "", dataHoraInicio: "", duracaoMin: "60" });
  const [serviceForm, setServiceForm] = useState({ id: null as number | null, nome: "", valor: "", duracaoMin: "60", descricao: "", exigeQuestionario: true, ativo: true });
  const [questionnaireForm, setQuestionnaireForm] = useState({ codigo: "", nome: "", descricao: "", texto: "", tipoResposta: "TEXTO" as const });
  const [expenseForm, setExpenseForm] = useState({ descricao: "", categoria: "", valor: "", dataCompetencia: new Date().toISOString().slice(0, 10) });
  const [receivableFilters, setReceivableFilters] = useState({ cliente: "", situacao: "ABERTAS", etapa: "TODAS", dataInicio: "", dataFim: "" });
  const [receiptForm, setReceiptForm] = useState<{ contaReceberId: number; clienteId: number; valor: string; tipoPagamento: PaymentMethod; dataPrevistaLiquidacao: string; observacoes: string }>({ contaReceberId: 0, clienteId: 0, valor: "", tipoPagamento: "PIX", dataPrevistaLiquidacao: new Date().toISOString().slice(0, 10), observacoes: "" });
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([{ tipoPagamento: "PIX", valor: "", dataPrevistaLiquidacao: new Date().toISOString().slice(0, 10) }]);
  const [selectedAccountForReceipt, setSelectedAccountForReceipt] = useState<any | null>(null);
  const [settlementForm, setSettlementForm] = useState({ id: 0, dataLiquidacao: new Date().toISOString().slice(0, 10) });
  const [equipmentForm, setEquipmentForm] = useState({ id: null as number | null, nome: "", tipo: "", localizacao: "", descricao: "" });
  const [supplyForm, setSupplyForm] = useState({ id: null as number | null, nome: "", unidade: "un", estoqueAtual: "", estoqueMinimo: "", custoUnitario: "" });
  const [professionalForm, setProfessionalForm] = useState({ id: 0, name: "", email: "", telefone: "" });
  const [reportPeriod, setReportPeriod] = useState(() => { const today = new Date(); const toLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; return { dataInicio: toLocalDate(new Date(today.getFullYear(), today.getMonth(), 1)), dataFim: toLocalDate(today) }; });
  const [localUserForm, setLocalUserForm] = useState({ name: "", email: "", telefone: "", password: "", role: "recepcao" as "admin" | "recepcao" | "profissional" | "cliente" });
  const [commissionRuleForm, setCommissionRuleForm] = useState({ profissionalId: "", servicoId: "", tipoComissao: "PERCENTUAL" as "PERCENTUAL" | "VALOR_FIXO", comissaoPercentual: "0", comissaoValorFixo: "0", ativo: true });
  const [commissionPaymentForm, setCommissionPaymentForm] = useState({ ids: [] as number[], dataPagamento: new Date().toISOString().slice(0, 10) });
  const [recordForm, setRecordForm] = useState({ alergias: "", restricoes: "", observacoesClinicas: "" });
  const [portalQuestionnaireId, setPortalQuestionnaireId] = useState<number | null>(null);
  const [portalAnswers, setPortalAnswers] = useState<Record<number, string>>({});
  const [portalSignature, setPortalSignature] = useState("");
  const [accessMode, setAccessMode] = useState<"login" | "forgot" | "bootstrap">("login");
  const [accessEmail, setAccessEmail] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [selectedClinicColor, setSelectedClinicColor] = useState("#C8627A");
  const [messagingForm, setMessagingForm] = useState({ apiKey: "", fromEmail: "", fromName: "", replyTo: "", smsSender: "", whatsappSender: "", whatsappTemplateId: "", emailAtivo: true, smsAtivo: false, whatsappAtivo: false });
  const [resetToken] = useState(() => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("reset"));
  const utils = trpc.useUtils();

  const role = user?.role ?? "user";
  const isStaff = ["master", "admin", "recepcao", "profissional"].includes(role);
  const isManager = ["master", "admin", "recepcao"].includes(role);
  const isAdmin = role === "admin" || role === "master";
  const isClient = role === "cliente" || role === "user";
  const isMaster = role === "master";
  const clientPortalEnabled = canLoadClientPortal(user, loading);

  const statsQuery = trpc.financeiro.dashboardStats.useQuery(undefined, { enabled: isStaff });
  const clientsQuery = trpc.clientes.list.useQuery(undefined, { enabled: isStaff });
  const servicesQuery = trpc.servicos.list.useQuery(undefined, { enabled: Boolean(user) });
  const servicesAdminQuery = trpc.servicos.listAdmin.useQuery(undefined, { enabled: isAdmin });
  const sessionsQuery = trpc.sessoes.list.useQuery(undefined, { enabled: isStaff });
  const accountsQuery = trpc.financeiro.contas.useQuery(undefined, { enabled: isManager });
  const questionnairesQuery = trpc.questionarios.list.useQuery(undefined, { enabled: isStaff });
  const professionalsQuery = trpc.profissionais.list.useQuery(undefined, { enabled: isManager });
  const professionalsAdminQuery = trpc.profissionais.listAdmin.useQuery(undefined, { enabled: isAdmin });
  const expensesQuery = trpc.financeiro.despesas.useQuery(undefined, { enabled: isAdmin });
  const cashQuery = trpc.financeiro.caixa.useQuery(undefined, { enabled: isManager });
  const commissionQuery = trpc.financeiro.comissoes.useQuery(reportPeriod, { enabled: isAdmin });
  const commissionRulesQuery = trpc.profissionais.regrasComissao.useQuery(undefined, { enabled: isAdmin });
  const financialReportQuery = trpc.financeiro.relatorio.useQuery(reportPeriod, { enabled: isAdmin });
  const clientDetailQuery = trpc.clientes.get.useQuery({ id: selectedClientId ?? 0 }, { enabled: selectedClientId !== null && isStaff });
  const portalQuery = trpc.portal.resumo.useQuery(undefined, { enabled: clientPortalEnabled });
  const bookingOptionsQuery = trpc.portal.opcoesAgendamento.useQuery(undefined, { enabled: clientPortalEnabled });
  const portalQuestionnaireQuery = trpc.questionarios.get.useQuery({ id: portalQuestionnaireId ?? 0 }, { enabled: clientPortalEnabled && portalQuestionnaireId !== null });
  const usersQuery = trpc.auth.listUsers.useQuery(undefined, { enabled: isAdmin });
  const allClinicsQuery = trpc.master.listAllClinics.useQuery(undefined, { enabled: isMaster });
  const switchClinicMutation = trpc.master.switchClinic.useMutation({
    onSuccess: (result) => {
      toast.success(`Alternado para clínica: ${result.clinic.nome}`);
      // Recarregar a página para aplicar a nova clínica
      window.location.reload();
    },
    onError: (error) => toast.error(error.message),
  });
  const currentClinicQuery = trpc.master.currentClinic.useQuery(undefined, { enabled: isMaster });
  const activeClinic = currentClinicQuery.data ?? null;
  const reminderQuery = trpc.lembretes.list.useQuery(undefined, { enabled: isAdmin });
  const equipmentQuery = trpc.recursos.equipamentos.list.useQuery(undefined, { enabled: isStaff });
  const suppliesQuery = trpc.recursos.insumos.list.useQuery(undefined, { enabled: isStaff });
  const settingsQuery = trpc.settings.getAtual.useQuery(undefined, { enabled: Boolean(user) });
  const messagingQuery = trpc.settings.getMessaging.useQuery(undefined, { enabled: isAdmin });
  const filteredAccounts = filterReceivables(accountsQuery.data ?? [], receivableFilters);
  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Configurações da clínica salvas e aplicadas com sucesso!");
      utils.settings.getAtual.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMessaging = trpc.settings.updateMessaging.useMutation({
    onSuccess: async () => { setMessagingForm((form) => ({ ...form, apiKey: "" })); await utils.settings.getMessaging.invalidate(); toast.success("Configuração de comunicação salva com segurança."); },
    onError: (error) => toast.error(error.message),
  });
  const uploadClinicLogo = trpc.settings.uploadLogo.useMutation({
    onSuccess: (result) => { const input = document.getElementById("clinicaLogoUrlInput") as HTMLInputElement | null; if (input) input.value = result.url; toast.success("Logotipo carregado. Salve a personalização para aplicar."); },
    onError: (error) => toast.error(error.message),
  });
  const testMessaging = trpc.settings.testMessaging.useMutation({
    onSuccess: (result) => toast.success(`Conexão Brevo validada${result.accountEmail ? ` para ${result.accountEmail}` : ""}.`),
    onError: (error) => toast.error(error.message),
  });
  const firstAccessSetup = trpc.settings.firstAccessSetup.useMutation({
    onSuccess: (result) => {
      setShowFirstAccessSetup(false);
      toast.success("Configuração inicial concluída!");
      utils.settings.getAtual.invalidate();
      // Mostrar o novo link de agendamento
      toast.success(`Novo link de agendamento: ${window.location.origin}${result.bookingUrl}`);
    },
    onError: (error) => toast.error(error.message),
  });
  const clearOperationalData = trpc.administracaoDados.limparOperacao.useMutation({
    onSuccess: async () => {
      setShowDataCleanupDialog(false);
      setCleanupPassword("");
      setCleanupConfirmPhrase("");
      await Promise.all([
        utils.clientes.list.invalidate(), utils.clientes.get.invalidate(), utils.sessoes.list.invalidate(),
        utils.financeiro.contas.invalidate(), utils.financeiro.despesas.invalidate(), utils.financeiro.caixa.invalidate(),
        utils.financeiro.dashboardStats.invalidate(), utils.financeiro.comissoes.invalidate(), utils.financeiro.relatorio.invalidate(),
        utils.questionarios.list.invalidate(), utils.lembretes.list.invalidate(), utils.portal.resumo.invalidate(),
      ]);
      toast.success("Os dados operacionais desta clínica foram limpos. Cadastros-base e configurações foram preservados.");
    },
    onError: (error) => toast.error(error.message),
  });
  const clinicName = settingsQuery.data?.nome ?? "SunSet";
  const clinicSlug = settingsQuery.data?.slug ?? "clinica-principal";
  const bookingUrl = `${window.location.origin}/agendar?clinica=${clinicSlug}`;
  const clinicSlogan = settingsQuery.data?.slogan ?? "Seu cuidado, seu momento";
  const clinicLogo = settingsQuery.data?.logoUrl;
  const savedPrimaryColor = normalizeClinicColor(settingsQuery.data?.corPrimaria);
  const primaryColor = selectedClinicColor;

  useEffect(() => {
    setSelectedClinicColor(savedPrimaryColor);
  }, [savedPrimaryColor]);

  useEffect(() => {
    if (!messagingQuery.data) return;
    setMessagingForm((form) => ({ ...form, ...messagingQuery.data, apiKey: "" }));
  }, [messagingQuery.data]);

  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty("--primary", primaryColor);
      document.documentElement.style.setProperty("--rose-500", primaryColor);
      document.documentElement.style.setProperty("--rose-600", primaryColor);
      document.documentElement.style.setProperty("--clinic-primary-foreground", primaryForeground(primaryColor));
    }
  }, [primaryColor]);

  const createClient = trpc.clientes.create.useMutation({
    onSuccess: () => { toast.success("Cliente cadastrado e prontuário criado."); setShowClientForm(false); setClientForm({ nome: "", email: "", telefone: "", cpfHash: "", dataNascimento: "" }); utils.clientes.list.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const resetClientForm = () => { setEditingClientId(null); setClientForm({ nome: "", email: "", telefone: "", cpfHash: "", dataNascimento: "" }); };
  const updateClient = trpc.clientes.update.useMutation({ onSuccess: () => { toast.success("Cliente atualizado."); setShowClientForm(false); resetClientForm(); utils.clientes.list.invalidate(); utils.clientes.get.invalidate(); }, onError: (error) => toast.error(error.message) });
  const archiveClient = trpc.clientes.archive.useMutation({ onSuccess: () => { toast.success("Cliente arquivado."); setSelectedClientId(null); utils.clientes.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const createSession = trpc.sessoes.create.useMutation({
    onSuccess: () => { toast.success("Agendamento registrado e lembretes preparados."); setShowSessionForm(false); utils.sessoes.list.invalidate(); utils.financeiro.contas.invalidate(); utils.financeiro.dashboardStats.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const updateStatus = trpc.sessoes.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado."); utils.sessoes.list.invalidate(); utils.financeiro.dashboardStats.invalidate(); utils.financeiro.comissoes.invalidate(); utils.financeiro.relatorio.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const resetServiceForm = () => setServiceForm({ id: null, nome: "", valor: "", duracaoMin: "60", descricao: "", exigeQuestionario: true, ativo: true });
  const refreshServices = () => { utils.servicos.list.invalidate(); utils.servicos.listAdmin.invalidate(); utils.agendamentoPublico.opcoes.invalidate(); utils.portal.opcoesAgendamento.invalidate(); };
  const createService = trpc.servicos.create.useMutation({ onSuccess: () => { toast.success("Procedimento cadastrado."); setShowServiceForm(false); resetServiceForm(); refreshServices(); }, onError: (error) => toast.error(error.message) });
  const updateService = trpc.servicos.update.useMutation({ onSuccess: () => { toast.success("Serviço atualizado."); setShowServiceForm(false); resetServiceForm(); refreshServices(); }, onError: (error) => toast.error(error.message) });
  const archiveService = trpc.servicos.archive.useMutation({ onSuccess: () => { toast.success("Serviço arquivado."); refreshServices(); }, onError: (error) => toast.error(error.message) });
  const createQuestionnaire = trpc.questionarios.create.useMutation({ onSuccess: () => { toast.success("Questionário publicado como nova versão."); setShowQuestionnaireForm(false); utils.questionarios.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const receivePayment = trpc.financeiro.receber.useMutation({ onSuccess: (result) => { toast.success(result.statusLiquidacao === "PENDENTE" ? "Cartão registrado como pendente de liquidação." : "Recebimento liquidado e disponível."); setShowReceiptForm(false); utils.financeiro.contas.invalidate(); utils.financeiro.dashboardStats.invalidate(); utils.financeiro.caixa.invalidate(); utils.financeiro.comissoes.invalidate(); utils.financeiro.relatorio.invalidate(); }, onError: (error) => toast.error(error.message) });
  const settleReceipt = trpc.financeiro.liquidarRecebimento.useMutation({ onSuccess: () => { toast.success("Cartão liquidado e incluído nos valores disponíveis."); setShowSettlementForm(false); utils.financeiro.caixa.invalidate(); utils.financeiro.dashboardStats.invalidate(); utils.financeiro.comissoes.invalidate(); utils.financeiro.relatorio.invalidate(); }, onError: (error) => toast.error(error.message) });
  const createExpense = trpc.financeiro.criarDespesa.useMutation({ onSuccess: () => { toast.success("Despesa lançada."); setShowExpenseForm(false); utils.financeiro.despesas.invalidate(); }, onError: (error) => toast.error(error.message) });
  const payExpense = trpc.financeiro.marcarDespesaPaga.useMutation({ onSuccess: () => { toast.success("Despesa marcada como paga."); utils.financeiro.despesas.invalidate(); utils.financeiro.caixa.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateRecord = trpc.prontuario.update.useMutation({ onSuccess: () => { toast.success("Prontuário atualizado."); utils.clientes.get.invalidate(); }, onError: (error) => toast.error(error.message) });
  const uploadPhoto = trpc.prontuario.uploadPhoto.useMutation({ onSuccess: () => { toast.success("Foto clínica armazenada com segurança."); setPhotoFile(null); utils.clientes.get.invalidate(); }, onError: (error) => toast.error(error.message) });
  const requestBooking = trpc.portal.solicitarAgendamento.useMutation({ onSuccess: () => { toast.success("Solicitação de agendamento enviada para a clínica."); utils.portal.resumo.invalidate(); }, onError: (error) => toast.error(error.message) });
  const answerQuestionnaire = trpc.questionarios.responder.useMutation({ onSuccess: () => { toast.success("Anamnese assinada e registrada no seu histórico."); setPortalQuestionnaireId(null); setPortalAnswers({}); setPortalSignature(""); utils.portal.resumo.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateUserRole = trpc.auth.updateRole.useMutation({ onSuccess: () => { toast.success("Perfil atualizado."); utils.auth.listUsers.invalidate(); }, onError: (error) => toast.error(error.message) });
  const saveCommissionRule = trpc.profissionais.salvarRegraComissao.useMutation({ onSuccess: () => { toast.success("Regra de comissão salva."); setShowCommissionRuleForm(false); setCommissionRuleForm({ profissionalId: "", servicoId: "", tipoComissao: "PERCENTUAL", comissaoPercentual: "0", comissaoValorFixo: "0", ativo: true }); utils.profissionais.regrasComissao.invalidate(); utils.financeiro.comissoes.invalidate(); }, onError: (error) => toast.error(error.message) });
  const payCommissions = trpc.financeiro.pagarComissoes.useMutation({ onSuccess: (result, payment) => { const idsPagas = payment.ids; const dataPaga = new Date(`${payment.dataPagamento}T12:00:00.000Z`); const extra = result.jaProcessadas ? ` ${result.jaProcessadas} já estavam processada${result.jaProcessadas === 1 ? "" : "s"}.` : ""; if (result.pagas) { utils.financeiro.comissoes.setData(reportPeriod, (old) => old?.map((commission) => idsPagas.includes(commission.id) && commission.status === "PENDENTE" ? { ...commission, status: "PAGA", pagaEm: dataPaga } : commission)); utils.financeiro.relatorio.setData(reportPeriod, (old) => { if (!old) return old; const valorBaixado = old.comissoes.filter((commission) => idsPagas.includes(commission.id) && commission.status === "PENDENTE").reduce((total, commission) => total + Number(commission.valor), 0); return { ...old, comissoes: old.comissoes.map((commission) => idsPagas.includes(commission.id) && commission.status === "PENDENTE" ? { ...commission, status: "PAGA", pagaEm: dataPaga } : commission), resumo: { ...old.resumo, comissoesPendentes: old.resumo.comissoesPendentes - valorBaixado, comissoesPagas: old.resumo.comissoesPagas + valorBaixado } }; }); } toast.success(result.pagas ? `${result.pagas} comiss${result.pagas === 1 ? "ão marcada" : "ões marcadas"} como paga${result.pagas === 1 ? "" : "s"}.${extra}` : `Nenhuma comissão pendente foi encontrada.${extra}`); setShowCommissionPaymentForm(false); setCommissionPaymentForm({ ids: [], dataPagamento: new Date().toISOString().slice(0, 10) }); utils.financeiro.comissoes.invalidate(); utils.financeiro.relatorio.invalidate(); }, onError: (error) => toast.error(error.message) });
  const createLocalUser = trpc.auth.createLocalUser.useMutation({
    onSuccess: () => { toast.success("Usuário criado com credenciais locais."); setShowUserForm(false); setLocalUserForm({ name: "", email: "", telefone: "", password: "", role: "recepcao" }); utils.auth.listUsers.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const createEquipment = trpc.recursos.equipamentos.create.useMutation({ onSuccess: () => { toast.success("Equipamento cadastrado."); setShowEquipmentForm(false); setEquipmentForm({ id: null, nome: "", tipo: "", localizacao: "", descricao: "" }); utils.recursos.equipamentos.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateEquipment = trpc.recursos.equipamentos.update.useMutation({ onSuccess: () => { toast.success("Equipamento atualizado."); setShowEquipmentForm(false); setEquipmentForm({ id: null, nome: "", tipo: "", localizacao: "", descricao: "" }); utils.recursos.equipamentos.invalidate(); }, onError: (error) => toast.error(error.message) });
  const archiveEquipment = trpc.recursos.equipamentos.archive.useMutation({ onSuccess: () => { toast.success("Equipamento arquivado."); utils.recursos.equipamentos.invalidate(); }, onError: (error) => toast.error(error.message) });
  const createSupply = trpc.recursos.insumos.create.useMutation({ onSuccess: () => { toast.success("Insumo cadastrado."); setShowSupplyForm(false); setSupplyForm({ id: null, nome: "", unidade: "un", estoqueAtual: "", estoqueMinimo: "", custoUnitario: "" }); utils.recursos.insumos.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateSupply = trpc.recursos.insumos.update.useMutation({ onSuccess: () => { toast.success("Insumo atualizado."); setShowSupplyForm(false); setSupplyForm({ id: null, nome: "", unidade: "un", estoqueAtual: "", estoqueMinimo: "", custoUnitario: "" }); utils.recursos.insumos.invalidate(); }, onError: (error) => toast.error(error.message) });
  const archiveSupply = trpc.recursos.insumos.archive.useMutation({ onSuccess: () => { toast.success("Insumo arquivado."); utils.recursos.insumos.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateProfessional = trpc.profissionais.update.useMutation({ onSuccess: () => { toast.success("Profissional atualizado."); setShowProfessionalForm(false); utils.profissionais.list.invalidate(); utils.profissionais.listAdmin.invalidate(); }, onError: (error) => toast.error(error.message) });
  const archiveProfessional = trpc.profissionais.archive.useMutation({ onSuccess: () => { toast.success("Profissional arquivado."); utils.profissionais.list.invalidate(); utils.profissionais.listAdmin.invalidate(); }, onError: (error) => toast.error(error.message) });
  const login = trpc.auth.login.useMutation({
    onSuccess: async () => { setAccessPassword(""); await utils.auth.me.invalidate(); toast.success("Acesso realizado com segurança."); },
    onError: (error) => toast.error(error.message),
  });
  const requestPasswordReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => { toast.success("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha."); setAccessMode("login"); },
    onError: () => toast.success("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha."),
  });
  const bootstrapFirstManager = trpc.auth.bootstrapFirstManager.useMutation({
    onSuccess: () => { toast.success("Se este for o primeiro acesso de gestor, você receberá um link para definir a senha."); setAccessMode("login"); },
    onError: () => toast.success("Se este for o primeiro acesso de gestor, você receberá um link para definir a senha."),
  });
  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => { window.history.replaceState({}, "", "/"); setAccessPassword(""); setPasswordConfirmation(""); toast.success("Senha atualizada. Entre com suas novas credenciais."); },
    onError: (error) => toast.error(error.message),
  });

  const selectedDetail = clientDetailQuery.data;
  const clientName = selectedDetail?.client.nome ?? "";
  const upcomingSessions = useMemo(() => sessionsQuery.data?.filter((session) => new Date(session.dataHoraInicio) >= new Date() && !["CANCELADA", "NAO_COMPARECEU"].includes(session.status)).slice(0, 6) ?? [], [sessionsQuery.data]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekReference);
    day.setDate(day.getDate() + index);
    return day;
  }), [weekReference]);
  const sessionsByWeekDay = useMemo(() => weekDays.map((day) => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const daySessions = (sessionsQuery.data ?? []).filter((session) => {
      const sessionDate = new Date(session.dataHoraInicio);
      return sessionDate >= day && sessionDate < nextDay;
    });
    return groupScheduleByReference(daySessions, calendarReference);
  }), [sessionsQuery.data, weekDays, calendarReference]);
  const selectedCommissionTotal = useMemo(() => (commissionQuery.data ?? []).filter((commission) => commissionPaymentForm.ids.includes(commission.id) && commission.status === "PENDENTE").reduce((sum, commission) => sum + Number(commission.valor), 0), [commissionQuery.data, commissionPaymentForm.ids]);
  const openCommissionPayment = (ids: number[]) => {
    if (!ids.length) { toast.error("Selecione pelo menos uma comissão pendente."); return; }
    setCommissionPaymentForm({ ids, dataPagamento: new Date().toISOString().slice(0, 10) });
    setShowCommissionPaymentForm(true);
  };

  const openClient = (id: number) => {
    setSelectedClientId(id);
    const local = clientsQuery.data?.find((client) => client.id === id);
    setRecordForm({ alergias: "", restricoes: "", observacoesClinicas: local?.observacoesInternas ?? "" });
  };

  if (loading) return <div className="app-loading"><Sparkles className="animate-pulse" /> <span>Preparando sua experiência SunSet.</span></div>;

  if (!user) {
    const submitAccess = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (resetToken) {
        if (accessPassword !== passwordConfirmation) { toast.error("As senhas informadas não coincidem."); return; }
        resetPassword.mutate({ token: resetToken, password: accessPassword });
      } else if (accessMode === "forgot") {
        requestPasswordReset.mutate({ email: accessEmail });
      } else if (accessMode === "bootstrap") {
        bootstrapFirstManager.mutate({ email: accessEmail });
      } else {
        login.mutate({ email: accessEmail, password: accessPassword });
      }
    };
    const submitting = login.isPending || requestPasswordReset.isPending || bootstrapFirstManager.isPending || resetPassword.isPending;
    return <main className="login-shell"><div className="login-content"><form className="login-card" onSubmit={submitAccess}>
      <div className="brand-lockup login-brand-lockup"><div className="brand-mark">{clinicLogo ? <img src={clinicLogo} alt="Logo" className="w-full h-full object-cover rounded-full" /> : <Sparkles />}</div><div className="brand-copy"><strong>{clinicName}</strong><span>{clinicSlogan}</span></div></div><p className="eyebrow">CUIDADO, LEVEZA, PRESENÇA</p>
      <h1>{resetToken ? "Defina uma nova senha." : accessMode === "forgot" ? "Recupere seu acesso." : accessMode === "bootstrap" ? "Prepare o primeiro acesso." : `Bem-vindo(a) à ${clinicName}.`}</h1>
      <p>{resetToken ? "Crie uma senha forte para voltar ao ambiente seguro." : accessMode === "forgot" ? "Informe seu e-mail para receber o link de redefinição." : accessMode === "bootstrap" ? "Use o e-mail do gestor cadastrado para receber um link seguro de definição de senha." : "Entre com o e-mail e a senha cadastrados para o seu acesso."}</p>
      {!resetToken && <><Label htmlFor="access-email">E-mail</Label><Input id="access-email" type="email" value={accessEmail} onChange={(event) => setAccessEmail(event.target.value)} autoComplete="email" required /></>}
      {accessMode === "login" && !resetToken && <><Label htmlFor="access-password">Senha</Label><Input id="access-password" type="password" value={accessPassword} onChange={(event) => setAccessPassword(event.target.value)} autoComplete="current-password" required /></>}
      {resetToken && <><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" type="password" minLength={10} value={accessPassword} onChange={(event) => setAccessPassword(event.target.value)} autoComplete="new-password" required /><Label htmlFor="confirm-password">Confirme a nova senha</Label><Input id="confirm-password" type="password" minLength={10} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} autoComplete="new-password" required /></>}
      <Button type="submit" className="primary-action" disabled={submitting}>{resetToken ? "Atualizar senha" : accessMode === "bootstrap" ? "Enviar convite seguro" : accessMode === "forgot" ? "Enviar link" : "Entrar no sistema"} <ChevronRight /></Button>
      {!resetToken && <div className="login-links">{accessMode === "login" ? <><button type="button" className="login-link" onClick={() => setAccessMode("forgot")}>Esqueci minha senha</button><button type="button" className="login-link" onClick={() => setAccessMode("bootstrap")}>Primeiro acesso do gestor</button></> : <button type="button" className="login-link" onClick={() => setAccessMode("login")}>Voltar para o login</button>}</div>}
    </form><BrandCredit className="login-credit" /></div></main>;
  }

  if (isClient) {
    const appointments = portalQuery.data?.agendamentos ?? [];
    const options = bookingOptionsQuery.data;
    return <main className="portal-shell">
      <header className="portal-header"><div className="brand-lockup"><div className="brand-mark">{clinicLogo ? <img src={clinicLogo} alt="Logo" className="w-full h-full object-cover rounded-full" /> : <Sparkles />}</div><div className="brand-copy"><strong>{clinicName}</strong><span>{clinicSlogan}</span></div></div><div className="profile-compact"><span>Olá, {user.name?.split(" ")[0] ?? "Cliente"}</span><Button variant="ghost" size="sm" onClick={() => logout()}><LogOut /></Button></div></header>
      <section className="portal-hero"><div><p className="eyebrow">PORTAL DO CLIENTE</p><h1>Seu cuidado, sempre ao alcance.</h1><p>Confira agendamentos e solicite seu próximo atendimento diretamente à clínica.</p></div><div className="portal-stat"><CalendarDays /><strong>{appointments.filter((session) => new Date(session.dataHoraInicio) >= new Date()).length}</strong><span>próximos horários</span></div></section>
      <section className="portal-grid">
        <Card className="surface-card"><CardHeader><CardTitle>Próximos atendimentos</CardTitle><CardDescription>Confirme os detalhes com a clínica quando necessário.</CardDescription></CardHeader><CardContent className="space-y-3">{appointments.filter((session) => new Date(session.dataHoraInicio) >= new Date()).slice(0, 4).map((session) => <div className="appointment-line" key={session.id}><CalendarDays /><div><strong>{dateTime(session.dataHoraInicio)}</strong><span><StatusBadge value={session.status} /></span></div></div>)}{appointments.filter((session) => new Date(session.dataHoraInicio) >= new Date()).length === 0 && <p className="empty-copy">Você ainda não possui atendimentos futuros.</p>}</CardContent></Card>
        <Card className="surface-card"><CardHeader><CardTitle>Solicitar agendamento</CardTitle><CardDescription>Envie uma solicitação para avaliação da recepção.</CardDescription></CardHeader><CardContent className="space-y-4"><Select onValueChange={(value) => setSessionForm((form) => ({ ...form, servicoId: value, duracaoMin: String(options?.servicos.find((service) => String(service.id) === value)?.duracaoMin ?? 60) }))}><SelectTrigger><SelectValue placeholder="Escolha o procedimento" /></SelectTrigger><SelectContent>{options?.servicos.map((service) => <SelectItem key={service.id} value={String(service.id)}>{service.nome} · {currency(service.valor)}</SelectItem>)}</SelectContent></Select><Select onValueChange={(value) => setSessionForm((form) => ({ ...form, profissionalId: value }))}><SelectTrigger><SelectValue placeholder="Profissional de preferência" /></SelectTrigger><SelectContent>{options?.profissionais.map((professional) => <SelectItem key={professional.id} value={String(professional.id)}>{professional.name ?? "Profissional"}</SelectItem>)}</SelectContent></Select><Input type="datetime-local" onChange={(event) => setSessionForm((form) => ({ ...form, dataHoraInicio: event.target.value }))} /><Button className="primary-action w-full" disabled={!sessionForm.servicoId || !sessionForm.profissionalId || !sessionForm.dataHoraInicio || requestBooking.isPending} onClick={() => requestBooking.mutate({ servicoId: Number(sessionForm.servicoId), profissionalId: Number(sessionForm.profissionalId), dataHoraInicio: new Date(sessionForm.dataHoraInicio), duracaoMin: Number(sessionForm.duracaoMin), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}>Solicitar horário</Button></CardContent></Card>
        <Card className="surface-card portal-questionnaire"><CardHeader><CardTitle>Anamnese pendente</CardTitle><CardDescription>Preencha e assine os formulários solicitados para seu atendimento.</CardDescription></CardHeader><CardContent className="space-y-4">{portalQuery.data?.questionariosPendentes.map((questionnaire) => <button key={questionnaire.id} className="questionnaire-choice" onClick={() => { setPortalQuestionnaireId(questionnaire.id); setPortalAnswers({}); setPortalSignature(user.name ?? ""); }}><ClipboardList /><span><strong>{questionnaire.nome}</strong><small>Versão {questionnaire.versao}</small></span><ChevronRight /></button>)}{!portalQuery.data?.questionariosPendentes.length && <p className="empty-copy">Nenhum formulário pendente.</p>}</CardContent></Card>
        {portalQuestionnaireId && portalQuestionnaireQuery.data && <Card className="surface-card portal-answer-card"><CardHeader><div><p className="eyebrow">ANAMNESE</p><CardTitle>{portalQuestionnaireQuery.data.nome}</CardTitle><CardDescription>Preencha as respostas e confirme a declaração de veracidade.</CardDescription></div><Button variant="ghost" size="icon" onClick={() => setPortalQuestionnaireId(null)}><X /></Button></CardHeader><CardContent className="form-stack">{portalQuestionnaireQuery.data.perguntas.map((question) => <div className="field" key={question.id}><Label>{question.ordem}. {question.texto}{question.obrigatoria ? " *" : ""}</Label>{question.tipoResposta === "BOOLEAN" ? <Select value={portalAnswers[question.id ?? 0]} onValueChange={(value) => setPortalAnswers((answers) => ({ ...answers, [question.id ?? 0]: value }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="true">Sim</SelectItem><SelectItem value="false">Não</SelectItem></SelectContent></Select> : <Input type={question.tipoResposta === "DATA" ? "date" : question.tipoResposta === "NUMERO" ? "number" : "text"} value={portalAnswers[question.id ?? 0] ?? ""} onChange={(event) => setPortalAnswers((answers) => ({ ...answers, [question.id ?? 0]: event.target.value }))} />}</div>)}<div className="field"><Label>Assinatura digital (nome completo)</Label><Input value={portalSignature} onChange={(event) => setPortalSignature(event.target.value)} placeholder="Digite seu nome completo" /></div><p className="declaration-copy">Ao enviar, declaro que as informações são verdadeiras e autorizo seu registro no meu prontuário.</p><Button className="primary-action" disabled={!portalQuery.data?.clientId || portalSignature.trim().length < 4 || answerQuestionnaire.isPending} onClick={() => { const questions = portalQuestionnaireQuery.data?.perguntas ?? []; answerQuestionnaire.mutate({ clienteId: portalQuery.data!.clientId!, questionarioId: portalQuestionnaireId, declaracaoVeracidade: true, assinaturaDigital: portalSignature.trim(), respostas: questions.map((question) => question.tipoResposta === "BOOLEAN" ? { perguntaId: question.id!, respostaBoolean: portalAnswers[question.id!] === "true" } : question.tipoResposta === "NUMERO" ? { perguntaId: question.id!, respostaNumero: portalAnswers[question.id!] || "0" } : { perguntaId: question.id!, respostaTexto: portalAnswers[question.id!] ?? "" }) }); }}>Assinar e enviar</Button></CardContent></Card>}
      </section>
      <footer className="portal-footer"><BrandCredit /></footer>
    </main>;
  }

  if (isMaster && !activeClinic) {
    return <main className="login-shell"><div className="login-content"><div className="login-card master-select-card">
      <div className="brand-lockup login-brand-lockup"><div className="brand-mark"><Sparkles /></div><div className="brand-copy"><strong>Consultor Master</strong><span>{roleLabel.master}</span></div></div>
      <p className="eyebrow">ACESSO GLOBAL</p>
      <h1>Selecione o ambiente (clínica).</h1>
      <p>Como consultor você tem acesso a todas as clínicas. Escolha qual deseja operar para começar a configuração ou o suporte.</p>
      <div className="space-y-3">
        {allClinicsQuery.data?.map((clinic) => (
          <button key={clinic.id} type="button" className="login-link master-clinic-option" onClick={() => switchClinicMutation.mutate({ clinicaId: clinic.id })} disabled={switchClinicMutation.isPending}>
            <ShieldCheck /> <strong>{clinic.nome}</strong> <code>{clinic.slug}</code> <span className="status-badge status-success">{clinic.ativa ? "Ativa" : "Inativa"}</span> <ChevronRight />
          </button>
        ))}
        {!allClinicsQuery.data?.length && <p className="empty-copy">Nenhuna clínica configurada no sistema.</p>}
      </div>
      <div className="master-info"><p>Bem-vindo, {user.name ?? "consultor"}. Utilize este acesso para configurar qualquer ambiente a partir de um só lugar.</p></div>
      <button type="button" className="login-link" onClick={() => logout()}>Encerrar sessão</button>
    </div></div></main>;
  }

  const nav: { id: Section; label: string; icon: LucideIcon; visible: boolean }[] = [
    { id: "inicio", label: "Visão geral", icon: LayoutDashboard, visible: true }, { id: "agenda", label: "Agenda", icon: CalendarDays, visible: true },
    { id: "clientes", label: "Clientes", icon: Users, visible: true }, { id: "servicos", label: "Serviços", icon: Sparkles, visible: isAdmin },
    { id: "questionarios", label: "Anamnese", icon: ClipboardList, visible: true }, { id: "financeiro", label: "Financeiro", icon: WalletCards, visible: isManager },
    { id: "gestao", label: "Gestão", icon: Settings2, visible: isAdmin },
  ];

  return <div className="clinic-shell">
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><div className="brand-mark">{clinicLogo ? <img src={clinicLogo} alt="Logo" className="w-full h-full object-cover rounded-full" /> : <Sparkles />}</div><div className="brand-copy"><strong>{clinicName}</strong><span className="text-xs text-muted-foreground font-medium">Sistema SunSet</span></div><Button variant="ghost" size="icon" className="mobile-close" onClick={() => setMobileMenu(false)}><X /></Button></div>
      <nav>{nav.filter((item) => item.visible).map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => { setSection(item.id); setMobileMenu(false); }} className={`nav-item ${section === item.id ? "nav-active" : ""}`}><Icon /><span>{item.label}</span></button>; })}</nav>
      <div className="sidebar-footer"><div className="profile-card"><span className="profile-initial">{user.name?.slice(0, 1).toUpperCase() ?? "A"}</span><div><strong>{user.name ?? "Usuário"}</strong><span>{roleLabel[role]}</span></div></div><Button variant="ghost" size="sm" onClick={() => logout()} className="logout-action"><LogOut /> Sair</Button><BrandCredit className="sidebar-credit" /></div>
    </aside>
    <div className="dashboard-area">
      <header className="mobile-topbar"><Button variant="ghost" size="icon" onClick={() => setMobileMenu(true)}><Menu /></Button><div className="brand-lockup"><div className="brand-mark">{clinicLogo ? <img src={clinicLogo} alt="Logo" className="w-full h-full object-cover rounded-full" /> : <Sparkles />}</div><div className="brand-copy"><strong>{clinicName}</strong><span className="text-xs text-muted-foreground font-medium">Sistema SunSet</span></div></div></header>
      <main className="dashboard-main">
        {section === "inicio" && <>
          <SectionHeader eyebrow="PAINEL OPERACIONAL" title="Bom dia, sua clínica está em movimento." description="Acompanhe os indicadores e prioridades da operação de hoje." action={<div className="header-actions">{isManager && <Button variant="outline" onClick={() => setShowClientForm(true)}><Users /> Novo cliente</Button>}<Button className="primary-action" onClick={() => setShowSessionForm(true)}><Plus /> Agendamento</Button></div>} />
          <div className="metric-grid"><Metric icon={CircleDollarSign} label="Faturamento do mês" value={currency(statsQuery.data?.faturamentoMes)} /><Metric icon={CalendarDays} label="Agenda de hoje" value={String(statsQuery.data?.agendamentosHoje ?? 0)} /><Metric icon={Activity} label="Taxa de ocupação" value={`${statsQuery.data?.taxaOcupacao ?? 0}%`} /><Metric icon={Users} label="Clientes ativos" value={String(statsQuery.data?.clientesTotal ?? 0)} /></div>
          <div className="dashboard-grid"><Card className="surface-card large-card"><CardHeader><div><p className="eyebrow">PRÓXIMOS ATENDIMENTOS</p><CardTitle>Agenda em sequência</CardTitle></div><Button variant="outline" size="sm" onClick={() => setSection("agenda")}>Ver agenda</Button></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Horário</TableHead><TableHead>Cliente</TableHead><TableHead>Procedimento</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{upcomingSessions.map((session) => <TableRow key={session.id}><TableCell>{dateTime(session.dataHoraInicio)}</TableCell><TableCell className="font-medium">{session.clienteNome}</TableCell><TableCell>{session.servicoNome}</TableCell><TableCell><StatusBadge value={session.status} /></TableCell></TableRow>)}{upcomingSessions.length === 0 && <EmptyRow cols={4} message="Nenhum agendamento futuro encontrado." />}</TableBody></Table></CardContent></Card><Card className="surface-card"><CardHeader><p className="eyebrow">ATENÇÃO ESPECIAL</p><CardTitle>Aniversariantes de hoje</CardTitle></CardHeader><CardContent>{(statsQuery.data?.aniversariantes ?? []).length ? <ul className="simple-list">{statsQuery.data?.aniversariantes.map((name) => <li key={name}><Sparkles /> {name}</li>)}</ul> : <p className="empty-copy">Não há aniversariantes registrados para hoje.</p>}<div className="reminder-note"><ShieldCheck /><span>Os lembretes são preparados ao criar novos agendamentos.</span></div></CardContent></Card></div>
        </>}

        {section === "agenda" && <>
          <SectionHeader eyebrow="OPERAÇÃO CLÍNICA" title="Agenda e atendimentos" description="Visualize o calendário por horário e atualize o estado de cada sessão." action={<Button className="primary-action" onClick={() => setShowSessionForm(true)}><Plus /> Novo agendamento</Button>} />
          <Card className="surface-card agenda-calendar"><CardHeader><div><p className="eyebrow">CALENDÁRIO SEMANAL</p><CardTitle>Visão por {calendarReference === "profissional" ? "profissional" : calendarReference === "sala" ? "sala" : "procedimento"}</CardTitle><CardDescription>{weekDays[0]?.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} a {weekDays[6]?.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</CardDescription></div><div className="calendar-controls"><div className="calendar-nav"><Button size="sm" variant="outline" onClick={() => setWeekReference((value) => value - 7 * 24 * 60 * 60 * 1000)}>Anterior</Button><Button size="sm" variant="outline" onClick={() => { const today = new Date(); today.setHours(0, 0, 0, 0); today.setDate(today.getDate() - ((today.getDay() + 6) % 7)); setWeekReference(today.getTime()); }}>Hoje</Button><Button size="sm" variant="outline" onClick={() => setWeekReference((value) => value + 7 * 24 * 60 * 60 * 1000)}>Próxima</Button></div><Select value={calendarReference} onValueChange={(value) => setCalendarReference(value as typeof calendarReference)}><SelectTrigger className="calendar-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="profissional">Por profissional</SelectItem><SelectItem value="sala">Por sala</SelectItem><SelectItem value="procedimento">Por procedimento</SelectItem></SelectContent></Select></div></CardHeader><CardContent><div className="weekly-calendar">{weekDays.map((day, index) => <div className="calendar-day" key={day.toISOString()}><div className="calendar-day-label"><strong>{day.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</strong><span>{day.getDate()}</span></div><div className="calendar-events">{sessionsByWeekDay[index]?.map((group) => <div className="calendar-group" key={group.label}><p>{group.label}</p>{group.sessions.map((session) => <button type="button" className="calendar-event text-left" key={session.id} onClick={() => setSelectedAgendaSession(session)} aria-label={`Abrir processo de ${session.clienteNome}`}><span>{new Date(session.dataHoraInicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span><strong>{session.clienteNome}</strong><small>{session.servicoNome}</small></button>)}</div>)}{!sessionsByWeekDay[index]?.length && <p className="calendar-empty">Sem atendimentos</p>}</div></div>)}</div></CardContent></Card>
          <Card className="surface-card"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Data e horário</TableHead><TableHead>Cliente</TableHead><TableHead>Procedimento</TableHead><TableHead>Profissional</TableHead><TableHead>Sala</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{sessionsQuery.data?.map((session) => <TableRow key={session.id}><TableCell>{dateTime(session.dataHoraInicio)}</TableCell><TableCell className="font-medium">{session.clienteNome}</TableCell><TableCell>{session.servicoNome}</TableCell><TableCell>{session.profissionalNome}</TableCell><TableCell>{session.salaNome ?? "—"}</TableCell><TableCell><StatusBadge value={session.status} /></TableCell><TableCell className="text-right"><div className="inline-actions">{["PENDENTE", "AGUARDANDO_CONFIRMACAO"].includes(session.status) && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: session.id, status: "CONFIRMADA" })}>Confirmar</Button>}{["CONFIRMADA", "EM_ATENDIMENTO"].includes(session.status) && <Button size="sm" className="complete-action" onClick={() => updateStatus.mutate({ id: session.id, status: "CONCLUIDA" })}><Check /> Realizada</Button>}</div></TableCell></TableRow>)}{!sessionsQuery.data?.length && <EmptyRow cols={7} message="Nenhuma sessão registrada." />}</TableBody></Table></CardContent></Card>
        </>}

        {section === "clientes" && <>
          <SectionHeader eyebrow="RELACIONAMENTO E PRONTUÁRIO" title="Clientes" description="Cadastros, histórico clínico, evolução e registro de imagens com acesso controlado." action={isManager ? <Button className="primary-action" onClick={() => setShowClientForm(true)}><Plus /> Novo cliente</Button> : undefined} />
          <div className="clients-layout"><Card className="surface-card"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Contato</TableHead><TableHead>Cadastro</TableHead><TableHead /></TableRow></TableHeader><TableBody>{clientsQuery.data?.map((client) => <TableRow key={client.id}><TableCell><div className="client-name"><span>{client.nome.slice(0, 1)}</span><div><strong>{client.nome}</strong><small>{client.status}</small></div></div></TableCell><TableCell>{client.telefone ?? client.email ?? "—"}</TableCell><TableCell>{dateOnly(client.createdAt)}</TableCell><TableCell className="text-right"><div className="inline-actions justify-end"><Button size="sm" variant="outline" onClick={() => openClient(client.id)}>Prontuário</Button>{isManager && <Button size="icon" variant="ghost" aria-label={`Editar ${client.nome}`} onClick={() => { setEditingClientId(client.id); setClientForm({ nome: client.nome, email: client.email ?? "", telefone: client.telefone ?? "", cpfHash: "", dataNascimento: client.dataNascimento ?? "" }); setShowClientForm(true); }}><Settings2 /></Button>}{isManager && client.status === "ATIVO" && <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Arquivar ${client.nome}`} onClick={() => { setArchiveTarget({ kind: "cliente", id: client.id, nome: client.nome }); setShowArchiveDialog(true); }}><Trash2 /></Button>}</div></TableCell></TableRow>)}{!clientsQuery.data?.length && <EmptyRow cols={4} message="Nenhum cliente cadastrado." />}</TableBody></Table></CardContent></Card>
          {selectedClientId && <Card className="surface-card record-card"><CardHeader><div><p className="eyebrow">PRONTUÁRIO ELETRÔNICO</p><CardTitle>{clientName || "Carregando cliente"}</CardTitle><CardDescription>Dados clínicos e documentos protegidos por perfil de acesso.</CardDescription></div><Button variant="ghost" size="icon" onClick={() => setSelectedClientId(null)}><X /></Button></CardHeader><CardContent className="space-y-5"><div className="record-fields"><div><Label>Alergias</Label><Textarea defaultValue={selectedDetail?.record?.alergias ?? ""} onChange={(event) => setRecordForm((form) => ({ ...form, alergias: event.target.value }))} /></div><div><Label>Restrições</Label><Textarea defaultValue={selectedDetail?.record?.restricoes ?? ""} onChange={(event) => setRecordForm((form) => ({ ...form, restricoes: event.target.value }))} /></div><div className="full-row"><Label>Observações clínicas</Label><Textarea defaultValue={selectedDetail?.record?.observacoesClinicas ?? ""} onChange={(event) => setRecordForm((form) => ({ ...form, observacoesClinicas: event.target.value }))} /></div></div><Button variant="outline" onClick={() => updateRecord.mutate({ clienteId: selectedClientId, ...recordForm })} disabled={updateRecord.isPending}>Salvar prontuário</Button><div className="record-divider" /><div><h3>Anamneses respondidas</h3><p className="subtle-copy">Respostas, declaração de veracidade e assinatura registradas pelo cliente.</p><div className="anamnesis-list">{selectedDetail?.anamneses.map((anamnese) => <details className="anamnesis-entry" key={anamnese.id}><summary><span><strong>{anamnese.nome}</strong><small>Versão {anamnese.versao} · Respondida em {dateTime(anamnese.respondidoEm)}</small></span><ChevronRight /></summary><div className="anamnesis-content">{anamnese.respostas.map((item) => <div className="anamnesis-answer" key={item.perguntaId}><strong>{item.pergunta}</strong><span>{formatAnamnesisAnswer(item.resposta, dateOnly)}</span></div>)}<div className="anamnesis-signature"><ShieldCheck /><span><strong>Declaração de veracidade:</strong> {anamnese.declaracaoVeracidade ? "confirmada" : "não confirmada"}<br /><strong>Assinatura digital:</strong> {anamnese.assinaturaDigital || "Não informada"}</span></div></div></details>)}{!selectedDetail?.anamneses.length && <p className="empty-copy">Este cliente ainda não respondeu nenhuma anamnese.</p>}</div></div><div className="record-divider" /><div><h3>Registro de imagem</h3><p className="subtle-copy">A imagem fica associada exclusivamente ao prontuário deste cliente.</p><div className="photo-upload"><Select value={photoCategory} onValueChange={(value) => setPhotoCategory(value as typeof photoCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ANTES">Antes</SelectItem><SelectItem value="DEPOIS">Depois</SelectItem><SelectItem value="EVOLUCAO">Evolução</SelectItem></SelectContent></Select><Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => setPhotoFile(event.target.files?.[0] ?? null)} /><Button variant="outline" disabled={!photoFile || uploadPhoto.isPending} onClick={async () => { if (!photoFile) return; try { uploadPhoto.mutate({ clienteId: selectedClientId, categoria: photoCategory, dataUrl: await readFileAsDataUrl(photoFile) }); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível preparar a imagem."); } }}><ImagePlus /> Enviar</Button></div></div><div><h3>Histórico de sessões</h3><div className="history-list">{selectedDetail?.history.slice(0, 4).map((session) => <div key={session.id}><CalendarDays /><span>{dateTime(session.dataHoraInicio)}</span><StatusBadge value={session.status} /></div>)}{!selectedDetail?.history.length && <p className="empty-copy">Ainda não há sessões no histórico.</p>}</div></div></CardContent></Card>}</div>
        </>}

        {section === "servicos" && <>
          <SectionHeader eyebrow="CATÁLOGO CLÍNICO" title="Serviços e recursos" description="Procedimentos, duração e valor base para o agendamento e o financeiro." action={<div className="header-actions"><Button variant="outline" onClick={() => { setEquipmentForm({ id: null, nome: "", tipo: "", localizacao: "", descricao: "" }); setShowEquipmentForm(true); }}><Plus /> Equipamento</Button><Button className="primary-action" onClick={() => { resetServiceForm(); setShowServiceForm(true); }}><Plus /> Novo serviço</Button></div>} />
          <Card className="surface-card"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Procedimento</TableHead><TableHead>Duração</TableHead><TableHead>Valor</TableHead><TableHead>Questionário</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>{servicesAdminQuery.data?.map((service) => <TableRow key={service.id}><TableCell><strong>{service.nome}</strong><small className="block">{service.descricao ?? "Sem descrição complementar"}</small></TableCell><TableCell>{service.duracaoMin} min</TableCell><TableCell>{currency(service.valor)}</TableCell><TableCell>{service.exigeQuestionario ? <span className="inline-okay"><Check /> Necessário</span> : "Não exigido"}</TableCell><TableCell><span className={`status-badge ${service.ativo ? "status-success" : "status-neutral"}`}>{service.ativo ? "Ativo" : "Inativo"}</span></TableCell><TableCell className="text-right"><div className="inline-actions justify-end"><Button size="sm" variant="outline" onClick={() => { setServiceForm({ id: service.id, nome: service.nome, valor: String(service.valor), duracaoMin: String(service.duracaoMin), descricao: service.descricao ?? "", exigeQuestionario: service.exigeQuestionario, ativo: service.ativo }); setShowServiceForm(true); }}>Editar</Button>{service.ativo && <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Arquivar ${service.nome}`} onClick={() => { setArchiveTarget({ kind: "servico", id: service.id, nome: service.nome }); setShowArchiveDialog(true); }}><Trash2 /></Button>}</div></TableCell></TableRow>)}{!servicesAdminQuery.data?.length && <EmptyRow cols={6} message="Nenhum procedimento cadastrado." />}</TableBody></Table></CardContent></Card>
          <Card className="surface-card mt-5"><CardHeader><div><p className="eyebrow">RECURSOS OPERACIONAIS</p><CardTitle>Equipamentos disponíveis</CardTitle><CardDescription>Itens ativos que podem ser selecionados nos atendimentos.</CardDescription></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Equipamento</TableHead><TableHead>Tipo</TableHead><TableHead>Localização</TableHead><TableHead>Próxima manutenção</TableHead><TableHead /></TableRow></TableHeader><TableBody>{equipmentQuery.data?.map((equipment) => <TableRow key={equipment.id}><TableCell className="font-medium">{equipment.nome}</TableCell><TableCell>{equipment.tipo ?? "—"}</TableCell><TableCell>{equipment.localizacao ?? "—"}</TableCell><TableCell>{dateOnly(equipment.proximaManutencaoEm)}</TableCell><TableCell className="text-right"><div className="inline-actions justify-end"><Button size="sm" variant="outline" onClick={() => { setEquipmentForm({ id: equipment.id, nome: equipment.nome, tipo: equipment.tipo ?? "", localizacao: equipment.localizacao ?? "", descricao: equipment.descricao ?? "" }); setShowEquipmentForm(true); }}>Editar</Button><Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Arquivar ${equipment.nome}`} onClick={() => { setArchiveTarget({ kind: "equipamento", id: equipment.id, nome: equipment.nome }); setShowArchiveDialog(true); }}><Trash2 /></Button></div></TableCell></TableRow>)}{!equipmentQuery.data?.length && <EmptyRow cols={5} message="Nenhum equipamento ativo cadastrado." />}</TableBody></Table></CardContent></Card>
          <Card className="surface-card mt-5"><CardHeader><div><p className="eyebrow">EQUIPE CLÍNICA</p><CardTitle>Profissionais</CardTitle><CardDescription>Atualize os dados de contato ou arquive acessos que não fazem mais parte da operação.</CardDescription></div><Button size="sm" className="primary-action" onClick={() => { setLocalUserForm({ name: "", email: "", telefone: "", password: "", role: "profissional" }); setShowUserForm(true); }}><Plus /> Novo profissional</Button></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead>Contato</TableHead><TableHead>Situação</TableHead><TableHead /></TableRow></TableHeader><TableBody>{professionalsAdminQuery.data?.map((professional) => <TableRow key={professional.id}><TableCell className="font-medium">{professional.name ?? "Sem nome"}</TableCell><TableCell>{professional.telefone ?? professional.email ?? "—"}</TableCell><TableCell><span className={`status-badge ${professional.ativo ? "status-success" : "status-neutral"}`}>{professional.ativo ? "Ativo" : "Arquivado"}</span></TableCell><TableCell className="text-right"><div className="inline-actions justify-end"><Button size="sm" variant="outline" onClick={() => { setProfessionalForm({ id: professional.id, name: professional.name ?? "", email: professional.email ?? "", telefone: professional.telefone ?? "" }); setShowProfessionalForm(true); }}>Editar</Button>{professional.ativo && <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Arquivar ${professional.name ?? "profissional"}`} onClick={() => { setArchiveTarget({ kind: "profissional", id: professional.id, nome: professional.name ?? "Profissional" }); setShowArchiveDialog(true); }}><Trash2 /></Button>}</div></TableCell></TableRow>)}{!professionalsAdminQuery.data?.length && <EmptyRow cols={4} message="Nenhum profissional cadastrado." />}</TableBody></Table></CardContent></Card>
        </>}

        {section === "questionarios" && <>
          <SectionHeader eyebrow="ANAMNESE" title="Questionários versionados" description="Crie formulários por procedimento e preserve a assinatura registrada no histórico do cliente." action={isAdmin ? <Button className="primary-action" onClick={() => setShowQuestionnaireForm(true)}><FilePlus2 /> Novo questionário</Button> : undefined} />
          <Card className="surface-card"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Questionário</TableHead><TableHead>Código</TableHead><TableHead>Versão</TableHead><TableHead>Publicação</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{questionnairesQuery.data?.map((questionnaire) => <TableRow key={questionnaire.id}><TableCell className="font-medium">{questionnaire.nome}</TableCell><TableCell>{questionnaire.codigo ?? "—"}</TableCell><TableCell>v{questionnaire.versao}</TableCell><TableCell>{dateOnly(questionnaire.publicadoEm)}</TableCell><TableCell><StatusBadge value={questionnaire.ativo ? "CONFIRMADA" : "CANCELADA"} /></TableCell></TableRow>)}{!questionnairesQuery.data?.length && <EmptyRow cols={5} message="Nenhum questionário publicado." />}</TableBody></Table></CardContent></Card>
        </>}

        {section === "financeiro" && <>
          <SectionHeader eyebrow="GESTÃO FINANCEIRA" title="Financeiro e caixa" description="Controle recebimentos, despesas, saldo diário e comissões por profissional." action={isAdmin ? <div className="header-actions"><Button variant="outline" onClick={() => { setCommissionRuleForm({ profissionalId: "", servicoId: "", tipoComissao: "PERCENTUAL", comissaoPercentual: "0", comissaoValorFixo: "0", ativo: true }); setShowCommissionRuleForm(true); }}><Settings2 /> Configurar comissões</Button><Button variant="outline" onClick={() => { void commissionQuery.refetch(); void financialReportQuery.refetch(); }} disabled={commissionQuery.isFetching || financialReportQuery.isFetching}><RefreshCw /> Atualizar comissões</Button><Button variant="outline" onClick={() => exportCommissionReport(commissionQuery.data ?? [])}><Files /> Exportar comissões</Button><Button className="primary-action" onClick={() => setShowExpenseForm(true)}><PackagePlus /> Lançar despesa</Button></div> : undefined} />
          <div className="metric-grid"><Metric icon={CircleDollarSign} label="Caixa em dinheiro" value={currency(cashQuery.data?.entradasDinheiro)} /><Metric icon={ReceiptText} label="PIX disponível" value={currency(cashQuery.data?.entradasPix)} /><Metric icon={WalletCards} label="Cartão pendente" value={currency(cashQuery.data?.cartaoPendente)} /><Metric icon={Files} label="Liquidado hoje" value={currency(cashQuery.data?.entradasLiquidadas)} /><Metric icon={Activity} label="Saldo físico" value={currency(cashQuery.data?.saldoCalculado)} /></div>
          <div className="dashboard-grid finance-grid"><Card className="surface-card large-card"><CardHeader><div><CardTitle>Contas a receber</CardTitle><CardDescription>Por padrão, são exibidos somente títulos em aberto. Selecione o registro correto e registre o recebimento sem rolagem horizontal.</CardDescription></div></CardHeader><CardContent className="space-y-4"><div className="form-grid receivables-filters rounded-xl border border-border/70 bg-background/55 p-3"><Field label="Cliente ou ID"><Input value={receivableFilters.cliente} onChange={(event) => setReceivableFilters((filters) => ({ ...filters, cliente: event.target.value }))} placeholder="Buscar cliente ou número" /></Field><Field label="Situação"><Select value={receivableFilters.situacao} onValueChange={(situacao) => setReceivableFilters((filters) => ({ ...filters, situacao }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ABERTAS">Em aberto (total ou parcial)</SelectItem><SelectItem value="ABERTA">Em aberto total</SelectItem><SelectItem value="PARCIAL">Pagamento parcial</SelectItem><SelectItem value="TODAS">Todos os títulos</SelectItem></SelectContent></Select></Field><Field label="Atendimento"><Select value={receivableFilters.etapa} onValueChange={(etapa) => setReceivableFilters((filters) => ({ ...filters, etapa }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TODAS">Executados e confirmados</SelectItem><SelectItem value="EXECUTADOS">Serviços executados</SelectItem><SelectItem value="CONFIRMADOS">Confirmados não executados</SelectItem></SelectContent></Select></Field><Field label="Vencimento de"><Input type="date" value={receivableFilters.dataInicio} onChange={(event) => setReceivableFilters((filters) => ({ ...filters, dataInicio: event.target.value }))} /></Field><Field label="Até"><Input type="date" value={receivableFilters.dataFim} onChange={(event) => setReceivableFilters((filters) => ({ ...filters, dataFim: event.target.value }))} /></Field></div><p className="text-sm text-muted-foreground">{filteredAccounts.length} título{filteredAccounts.length === 1 ? "" : "s"} encontrado{filteredAccounts.length === 1 ? "" : "s"}.</p><div className="space-y-3">{filteredAccounts.map((account) => <div key={account.id} className="overflow-hidden rounded-xl border border-border/70 bg-background/70"><div className="grid gap-3 p-4 lg:grid-cols-[minmax(170px,1.15fr)_minmax(180px,1.2fr)_minmax(180px,1fr)_minmax(140px,.75fr)_auto] lg:items-center"><div><div className="flex items-center gap-2"><span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold">#{account.id}</span><strong>{account.clienteNome}</strong></div><small className="mt-1 block text-muted-foreground">Vencimento: {account.dataVencimento}</small></div><div><strong className="block">{account.descricao}</strong><small className="mt-1 block text-muted-foreground">{account.sessaoStatus === "CONCLUIDA" ? "Serviço executado" : account.sessaoStatus === "CONFIRMADA" ? "Atendimento confirmado" : "Atendimento agendado"}</small></div><div><strong>{currency(account.saldoRestante)} <span className="text-sm font-normal text-muted-foreground">a receber</span></strong><small className="mt-1 block text-muted-foreground">Total: {currency(account.valorFinal)} · Pago: {currency(account.totalPago)}</small></div><div className="flex flex-wrap items-center gap-2"><StatusBadge value={account.status} /></div><Button className="primary-action w-full lg:w-auto" onClick={() => { const today = new Date().toISOString().slice(0, 10); setSelectedAccountForReceipt(account); setReceiptForm({ contaReceberId: account.id, clienteId: account.clienteId, valor: String(account.saldoRestante), tipoPagamento: "PIX", dataPrevistaLiquidacao: today, observacoes: "" }); setPaymentLines([{ tipoPagamento: "PIX", valor: String(account.saldoRestante), dataPrevistaLiquidacao: today }]); setShowReceiptForm(true); }}><ReceiptText /> Registrar recebimento</Button></div>{account.pagamentos?.length > 0 && (<div className="border-t border-border/70 p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagamentos</p><div className="space-y-1.5">{account.pagamentos.map((pag) => (<div key={pag.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-sm"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-muted-foreground">#{pag.id}</span><span>{pag.tipoPagamento}</span><span className="text-xs text-muted-foreground">{dateOnly(pag.dataLiquidacao ?? pag.createdAt)}</span><span className={`status-badge ${pag.statusLiquidacao === "LIQUIDADO" ? "status-success" : "status-neutral"}`}>{pag.statusLiquidacao === "LIQUIDADO" ? "Liquidado" : "Pendente"}</span></div><div className="flex items-center gap-2"><strong>{currency(pag.valor)}</strong><ReceiptGenerator recebimentoId={pag.id} /></div></div>))}</div></div>)}</div>)}{!filteredAccounts.length && <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">Nenhum título corresponde aos filtros informados.</div>}</div></CardContent></Card><Card className="surface-card"><CardHeader><CardTitle>Despesas recentes</CardTitle><CardDescription>Somente lançamentos administrativos.</CardDescription></CardHeader><CardContent className="space-y-2">{expensesQuery.data?.slice(0, 5).map((expense) => <div className="expense-line" key={expense.id}><div><strong>{expense.descricao}</strong><span>{expense.categoria} · {expense.dataCompetencia}</span></div><div><strong>{currency(expense.valor)}</strong>{expense.status !== "PAGA" && <Button size="sm" variant="ghost" onClick={() => payExpense.mutate({ id: expense.id })}>Pagar</Button>}</div></div>)}{!expensesQuery.data?.length && <p className="empty-copy">Nenhuma despesa registrada.</p>}</CardContent></Card></div>
          {isAdmin && <Card className="surface-card mt-5"><CardHeader><div><CardTitle>Regras de comissão</CardTitle><CardDescription>Defina a comissão de cada profissional por procedimento, usando percentual sobre o valor do serviço ou valor fixo. A regra usada fica registrada quando a sessão é concluída.</CardDescription></div><Button variant="outline" size="sm" onClick={() => { setCommissionRuleForm({ profissionalId: "", servicoId: "", tipoComissao: "PERCENTUAL", comissaoPercentual: "0", comissaoValorFixo: "0", ativo: true }); setShowCommissionRuleForm(true); }}><Plus /> Nova regra</Button></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead>Procedimento</TableHead><TableHead>Regra</TableHead><TableHead>Disponibilidade</TableHead><TableHead /></TableRow></TableHeader><TableBody>{commissionRulesQuery.data?.map((rule) => <TableRow key={rule.id}><TableCell className="font-medium">{rule.profissionalNome}</TableCell><TableCell>{rule.servicoNome}<small className="block">Base: {currency(rule.servicoValor)}</small></TableCell><TableCell>{rule.tipoComissao === "PERCENTUAL" ? `${rule.comissaoPercentual}% do serviço` : `${currency(rule.comissaoValorFixo)} por sessão`}</TableCell><TableCell><span className={`status-badge ${rule.ativo ? "status-success" : "status-neutral"}`}>{rule.ativo ? "Ativa" : "Inativa"}</span></TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => { setCommissionRuleForm({ profissionalId: String(rule.profissionalId), servicoId: String(rule.servicoId), tipoComissao: rule.tipoComissao, comissaoPercentual: String(rule.comissaoPercentual), comissaoValorFixo: String(rule.comissaoValorFixo), ativo: rule.ativo }); setShowCommissionRuleForm(true); }}>Editar</Button></TableCell></TableRow>)}{!commissionRulesQuery.data?.length && <EmptyRow cols={5} message="Nenhuma regra configurada. Crie uma regra para vincular um profissional ao procedimento e calcular a comissão." />}</TableBody></Table></CardContent></Card>}
          {isAdmin && <Card className="surface-card mt-5"><CardHeader><div><CardTitle>Comissões por profissional</CardTitle><CardDescription>Comissões geradas para sessões concluídas no período selecionado. Marque as pendentes e registre a baixa na data em que o profissional recebeu.</CardDescription></div><Button size="sm" className="primary-action" disabled={!commissionPaymentForm.ids.length} onClick={() => openCommissionPayment(commissionPaymentForm.ids)}><Check /> Pagar selecionadas ({commissionPaymentForm.ids.length})</Button></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead className="w-12">Selecionar</TableHead><TableHead>Profissional</TableHead><TableHead>Data</TableHead><TableHead>Regra aplicada</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Pagamento</TableHead><TableHead /></TableRow></TableHeader><TableBody>{commissionQuery.data?.map((commission) => { const pending = commission.status === "PENDENTE"; const selected = commissionPaymentForm.ids.includes(commission.id); return <TableRow key={commission.id}><TableCell><Checkbox aria-label={`Selecionar comissão de ${commission.profissionalNome}`} checked={selected} disabled={!pending} onCheckedChange={(checked) => setCommissionPaymentForm((form) => ({ ...form, ids: checked === true ? form.ids.includes(commission.id) ? form.ids : [...form.ids, commission.id] : form.ids.filter((id) => id !== commission.id) }))} /></TableCell><TableCell className="font-medium">{commission.profissionalNome}</TableCell><TableCell>{dateOnly(commission.geradaEm)}</TableCell><TableCell>{commission.tipoComissao === "PERCENTUAL" ? `${commission.percentual}% do serviço` : `${currency(commission.valorRegra)} fixo`}</TableCell><TableCell>{currency(commission.valor)}</TableCell><TableCell><StatusBadge value={commission.status} /></TableCell><TableCell>{commission.pagaEm ? dateOnly(commission.pagaEm) : "—"}</TableCell><TableCell>{pending && <Button size="sm" variant="outline" onClick={() => openCommissionPayment([commission.id])}>Pagar</Button>}</TableCell></TableRow>; })}{!commissionQuery.data?.length && <EmptyRow cols={8} message="Nenhuma comissão gerada no período selecionado." />}</TableBody></Table></CardContent></Card>}
          {isAdmin && <Card className="surface-card mt-5" id="relatorios-financeiros"><CardHeader><div><p className="eyebrow">RELATÓRIOS POR PERÍODO</p><CardTitle>Financeiro, serviços e comissões</CardTitle><CardDescription>Valores liquidados representam disponibilidade; cartão pendente só entra após a liquidação. As comissões são consolidadas pela data de conclusão do atendimento.</CardDescription></div><div className="header-actions"><Button variant="outline" disabled={!financialReportQuery.data} onClick={() => financialReportQuery.data && exportFinancialReport(financialReportQuery.data)}><Printer /> Imprimir / PDF</Button></div></CardHeader><CardContent className="space-y-5"><div className="form-grid"><Field label="Data inicial"><Input type="date" value={reportPeriod.dataInicio} onChange={(event) => setReportPeriod((period) => ({ ...period, dataInicio: event.target.value }))} /></Field><Field label="Data final"><Input type="date" value={reportPeriod.dataFim} onChange={(event) => setReportPeriod((period) => ({ ...period, dataFim: event.target.value }))} /></Field></div>{financialReportQuery.isLoading && <p className="empty-copy">Atualizando relatório...</p>}{financialReportQuery.data && <><div className="metric-grid"><Metric icon={ReceiptText} label="A receber" value={currency(financialReportQuery.data.resumo.aReceber)} /><Metric icon={CircleDollarSign} label="Dinheiro liquidado" value={currency(financialReportQuery.data.resumo.recebidoDinheiro)} /><Metric icon={ReceiptText} label="PIX liquidado" value={currency(financialReportQuery.data.resumo.recebidoPix)} /><Metric icon={WalletCards} label="Cartão pendente" value={currency(financialReportQuery.data.resumo.cartaoPendente)} /><Metric icon={Files} label="Comissões pendentes" value={currency(financialReportQuery.data.resumo.comissoesPendentes)} /><Metric icon={Activity} label="Disponível após pagamentos" value={currency(financialReportQuery.data.resumo.resultadoDisponivel)} /></div><Card className="surface-card"><CardHeader><CardTitle>Cartões pendentes de liquidação</CardTitle><CardDescription>Esses valores não compõem o caixa nem o disponível até o repasse ser confirmado.</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Forma</TableHead><TableHead>Previsto</TableHead><TableHead>Valor</TableHead><TableHead /></TableRow></TableHeader><TableBody>{financialReportQuery.data.cartoesPendentes.map((item) => <TableRow key={item.id}><TableCell>{item.cliente}<small className="block">{item.descricao}</small></TableCell><TableCell>{item.tipoPagamento === "CARTAO_CREDITO" ? "Cartão de crédito" : "Cartão de débito"}</TableCell><TableCell>{item.previstoPara ?? "Sem previsão"}</TableCell><TableCell>{currency(item.valor)}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => { setSettlementForm({ id: item.id, dataLiquidacao: new Date().toISOString().slice(0, 10) }); setShowSettlementForm(true); }}>Liquidar</Button></TableCell></TableRow>)}{!financialReportQuery.data.cartoesPendentes.length && <EmptyRow cols={5} message="Nenhum cartão pendente no período." />}</TableBody></Table></CardContent></Card></>}</CardContent></Card>}
        </>}

          {isAdmin && financialReportQuery.data && <div className="dashboard-grid finance-grid mt-5"><Card className="surface-card"><CardHeader><CardTitle>Contas a receber em aberto</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader><TableBody>{financialReportQuery.data.contasReceber.map((item) => <TableRow key={item.id}><TableCell>{item.cliente}<small className="block">{item.descricao}</small></TableCell><TableCell>{item.vencimento}</TableCell><TableCell>{currency(item.valor)}</TableCell></TableRow>)}{!financialReportQuery.data.contasReceber.length && <EmptyRow cols={3} message="Nenhuma conta em aberto no período." />}</TableBody></Table></CardContent></Card><Card className="surface-card"><CardHeader><CardTitle>Contas a pagar em aberto</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader><TableBody>{financialReportQuery.data.contasPagar.map((item) => <TableRow key={item.id}><TableCell>{item.descricao}<small className="block">{item.categoria}</small></TableCell><TableCell>{item.vencimento}</TableCell><TableCell>{currency(item.valor)}</TableCell></TableRow>)}{!financialReportQuery.data.contasPagar.length && <EmptyRow cols={3} message="Nenhuma conta a pagar no período." />}</TableBody></Table></CardContent></Card><Card className="surface-card large-card"><CardHeader><CardTitle>Comissões no período</CardTitle><CardDescription>Separação entre comissões pendentes e já pagas, de acordo com o histórico gerado.</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead>Regra</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{financialReportQuery.data.comissoes.map((item) => <TableRow key={item.id}><TableCell>{item.profissional}</TableCell><TableCell>{item.tipoComissao === "PERCENTUAL" ? `${item.percentual}%` : `${currency(item.valorRegra)} fixo`}</TableCell><TableCell>{currency(item.valor)}</TableCell><TableCell><StatusBadge value={item.status} /></TableCell></TableRow>)}{!financialReportQuery.data.comissoes.length && <EmptyRow cols={4} message="Nenhuma comissão no período selecionado." />}</TableBody></Table></CardContent></Card><Card className="surface-card large-card"><CardHeader><CardTitle>Desempenho de serviços</CardTitle><CardDescription>Produção, valor previsto e valor efetivamente liquidado por procedimento.</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Serviço</TableHead><TableHead>Agendados</TableHead><TableHead>Realizados</TableHead><TableHead>Previsto</TableHead><TableHead>Liquidado</TableHead></TableRow></TableHeader><TableBody>{financialReportQuery.data.servicos.map((item) => <TableRow key={item.servicoId}><TableCell>{item.nome}</TableCell><TableCell>{item.agendados}</TableCell><TableCell>{item.realizados}</TableCell><TableCell>{currency(item.previsto)}</TableCell><TableCell>{currency(item.recebido)}</TableCell></TableRow>)}{!financialReportQuery.data.servicos.length && <EmptyRow cols={5} message="Nenhum serviço no período selecionado." />}</TableBody></Table></CardContent></Card></div>}
        {section === "gestao" && isAdmin && <>
          <SectionHeader eyebrow="ADMINISTRAÇÃO" title="Personalização e Gestão" description="Configure identidade visual, dados da clínica, perfis de acesso e insumos." action={<div className="header-actions"><Button variant="outline" onClick={() => setShowUserForm(true)}><Users /> Novo usuário</Button><Button className="primary-action" onClick={() => { setSupplyForm({ id: null, nome: "", unidade: "un", estoqueAtual: "", estoqueMinimo: "", custoUnitario: "" }); setShowSupplyForm(true); }}><PackagePlus /> Novo insumo</Button></div>} />
          
          <Card className="surface-card mt-5">
            <CardHeader>
              <CardTitle>Personalização da Clínica (Tenant)</CardTitle>
              <CardDescription>Defina o nome comercial, slogan, logotipo, cores e endereço que serão exibidos nos portais e relatórios.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const nome = (form.elements.namedItem("clinicaNome") as HTMLInputElement).value;
                const slogan = (form.elements.namedItem("clinicaSlogan") as HTMLInputElement).value;
                const logoUrl = (form.elements.namedItem("clinicaLogoUrl") as HTMLInputElement).value;
                const endereco = (form.elements.namedItem("clinicaEndereco") as HTMLInputElement).value;
                updateSettings.mutate({ nome, slogan, logoUrl, corPrimaria: selectedClinicColor, endereco,
                  razaoSocial: (form.elements.namedItem("clinicaRazaoSocial") as HTMLInputElement).value,
                  segmento: (form.elements.namedItem("clinicaSegmento") as HTMLInputElement).value,
                  cnpj: (form.elements.namedItem("clinicaCnpj") as HTMLInputElement).value,
                  telefone: (form.elements.namedItem("clinicaTelefone") as HTMLInputElement).value,
                  whatsapp: (form.elements.namedItem("clinicaWhatsapp") as HTMLInputElement).value,
                  emailContato: (form.elements.namedItem("clinicaEmail") as HTMLInputElement).value,
                  cep: (form.elements.namedItem("clinicaCep") as HTMLInputElement).value,
                  numero: (form.elements.namedItem("clinicaNumero") as HTMLInputElement).value,
                  complemento: (form.elements.namedItem("clinicaComplemento") as HTMLInputElement).value,
                  bairro: (form.elements.namedItem("clinicaBairro") as HTMLInputElement).value,
                  cidade: (form.elements.namedItem("clinicaCidade") as HTMLInputElement).value,
                  estado: (form.elements.namedItem("clinicaEstado") as HTMLInputElement).value.toUpperCase() });
              }} className="space-y-4">
                <div className="form-grid">
                  <Field label="Nome da Clínica">
                    <Input name="clinicaNome" defaultValue={settingsQuery.data?.nome ?? "SunSet"} required />
                  </Field>
                  <Field label="Razão social">
                    <Input name="clinicaRazaoSocial" placeholder="Razão social registrada" defaultValue={settingsQuery.data?.razaoSocial ?? ""} />
                  </Field>
                </div>
                <div className="form-grid">
                  <Field label="CNPJ"><Input name="clinicaCnpj" inputMode="numeric" placeholder="00.000.000/0000-00" defaultValue={settingsQuery.data?.cnpj ?? ""} /></Field>
                  <Field label="Segmento da clínica"><Input name="clinicaSegmento" placeholder="Ex.: Estética avançada e bem-estar" defaultValue={settingsQuery.data?.segmento ?? ""} /></Field>
                </div>
                <div className="form-grid">
                  <Field label="Telefone"><Input name="clinicaTelefone" inputMode="tel" placeholder="(00) 0000-0000" defaultValue={settingsQuery.data?.telefone ?? ""} /></Field>
                  <Field label="WhatsApp"><Input name="clinicaWhatsapp" inputMode="tel" placeholder="(00) 00000-0000" defaultValue={settingsQuery.data?.whatsapp ?? ""} /></Field>
                </div>
                <div className="form-grid">
                  <Field label="E-mail de contato"><Input name="clinicaEmail" type="email" placeholder="contato@clinica.com.br" defaultValue={settingsQuery.data?.emailContato ?? ""} /></Field>
                  <Field label="Slogan">
                    <Input name="clinicaSlogan" defaultValue={settingsQuery.data?.slogan ?? "Seu cuidado, seu momento"} required />
                  </Field>
                </div>
                <div className="form-grid">
                  <Field label="Logotipo (Arquivo ou URL S3)">
                    <div className="space-y-2">
                      <Input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadClinicLogo.isPending} onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (uploadEvent) => {
                            const result = uploadEvent.target?.result as string;
                            uploadClinicLogo.mutate({ dataUrl: result });
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                      <Input id="clinicaLogoUrlInput" name="clinicaLogoUrl" placeholder="/storage/clinic-assets/logo-clinica.svg" defaultValue={settingsQuery.data?.logoUrl ?? "/assets/logo-sunset.svg"} />
                    </div>
                  </Field>
                  <Field label="Tema visual">
                    <div className="theme-control">
                      <span className="theme-preview" style={{ backgroundColor: selectedClinicColor }} aria-hidden="true" />
                      <div><strong>{clinicColorPalette.find((color) => color.value === selectedClinicColor)?.label ?? "Tema selecionado"}</strong><p>Altera cores de botões, menus e fundo.</p></div>
                      <Button type="button" size="sm" variant="outline" onClick={() => setShowThemePalette((open) => !open)} aria-expanded={showThemePalette}><Palette /> Alterar o tema</Button>
                    </div>
                    {showThemePalette && <div className="theme-palette-popover" role="radiogroup" aria-label="Paleta de cores da clínica">
                      {clinicColorPalette.map((color) => { const selected = color.value === selectedClinicColor; return <button key={color.value} type="button" className={`theme-hex${selected ? " is-selected" : ""}`} style={{ backgroundColor: color.value, color: primaryForeground(color.value) }} role="radio" aria-checked={selected} aria-label={`Selecionar ${color.label}`} title={color.label} onClick={() => { setSelectedClinicColor(color.value); setShowThemePalette(false); }}>
                        {selected && <Check aria-hidden="true" />}<span className="sr-only">{color.label}</span>
                      </button>; })}
                    </div>}
                  </Field>
                </div>
                <Field label="Logradouro"><Input name="clinicaEndereco" placeholder="Ex.: Avenida Principal" defaultValue={settingsQuery.data?.endereco ?? ""} /></Field>
                <div className="form-grid"><Field label="Número"><Input name="clinicaNumero" placeholder="1000" defaultValue={settingsQuery.data?.numero ?? ""} /></Field><Field label="Complemento"><Input name="clinicaComplemento" placeholder="Sala, andar ou bloco" defaultValue={settingsQuery.data?.complemento ?? ""} /></Field></div>
                <div className="form-grid"><Field label="Bairro"><Input name="clinicaBairro" placeholder="Bairro" defaultValue={settingsQuery.data?.bairro ?? ""} /></Field><Field label="CEP"><Input name="clinicaCep" inputMode="numeric" placeholder="00000-000" defaultValue={settingsQuery.data?.cep ?? ""} /></Field></div>
                <div className="form-grid"><Field label="Cidade"><Input name="clinicaCidade" placeholder="Cidade" defaultValue={settingsQuery.data?.cidade ?? ""} /></Field><Field label="UF"><Input name="clinicaEstado" maxLength={2} placeholder="BA" defaultValue={settingsQuery.data?.estado ?? ""} /></Field></div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" className="primary-action">Salvar Personalização</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="surface-card mt-5">
            <CardHeader>
              <CardTitle>Link de Agendamento Público</CardTitle>
              <CardDescription>Gere e gerencie o link para agendamento online da sua clínica. Este link pode ser compartilhado publicamente.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="booking-link-display">
                  <Label>Link atual de agendamento</Label>
                  <div className="link-display">
                    <code>{bookingUrl}</code>
                    <Button size="sm" variant="outline" onClick={() => {
                      navigator.clipboard.writeText(bookingUrl);
                      toast.success("Link copiado para a área de transferência!");
                    }}>Copiar</Button>
                  </div>
                </div>
                <div className="booking-link-actions">
                  <Button variant="outline" onClick={() => {
                    setShowFirstAccessSetup(true);
                    setFirstAccessForm({
                      clinicaNome: settingsQuery.data?.nome || "",
                      clinicaSlug: "",
                      adminNome: user?.name || "",
                      adminEmail: user?.email || "",
                      adminSenha: ""
                    });
                  }}>
                    <Sparkles /> Configurar Link Personalizado
                  </Button>
                  <Button variant="outline" onClick={() => {
                    window.open(bookingUrl, "_blank");
                  }}>
                    <Activity /> Testar Link de Agendamento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isMaster && (
            <Card className="surface-card mt-5">
              <CardHeader>
                <CardTitle>Clínicas Disponíveis (Master)</CardTitle>
                <CardDescription>Como usuário master, você tem acesso visual a todas as clínicas configuradas no sistema.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="master-info">
                    <p className="text-sm text-muted-foreground">
                      <strong>Modo Master:</strong> Você tem acesso administrativo a todas as clínicas. 
                      Esta visualização mostra todas as clínicas disponíveis no sistema.
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allClinicsQuery.data?.map((clinic) => {
                        const isCurrent = activeClinic?.id === clinic.id;
                        return (
                          <TableRow key={clinic.id}>
                            <TableCell>{clinic.id}</TableCell>
                            <TableCell className="font-medium">{clinic.nome} {isCurrent && <span className="status-badge status-success">Ativa</span>}</TableCell>
                            <TableCell><code>{clinic.slug}</code></TableCell>
                            <TableCell>
                              <span className={`status-badge ${clinic.ativa ? "status-success" : "status-neutral"}`}>
                                {clinic.ativa ? "Ativa" : "Inativa"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" disabled={isCurrent || !clinic.ativa || switchClinicMutation.isPending} onClick={() => switchClinicMutation.mutate({ clinicaId: clinic.id })}>
                                {isCurrent ? "Atual" : "Abrir"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!allClinicsQuery.data?.length && (
                        <EmptyRow cols={5} message="Nenhuma clínica configurada no sistema." />
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="surface-card mt-5">
            <CardHeader>
              <CardTitle>Comunicações da clínica</CardTitle>
              <CardDescription>Configure o Brevo desta clínica. A chave de API fica criptografada no servidor e nunca é exibida novamente.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="form-stack">
                <div className="form-grid">
                  <Field label="Chave de API Brevo">
                    <Input type="password" value={messagingForm.apiKey} onChange={(event) => setMessagingForm({ ...messagingForm, apiKey: event.target.value })} placeholder={messagingQuery.data?.apiKeyConfigured ? `Configurada: ${messagingQuery.data.apiKeyMasked}` : "Informe uma nova chave"} autoComplete="new-password" />
                  </Field>
                  <Field label="E-mail remetente">
                    <Input type="email" value={messagingForm.fromEmail} onChange={(event) => setMessagingForm({ ...messagingForm, fromEmail: event.target.value })} placeholder="agenda@clinica.com.br" />
                  </Field>
                </div>
                <div className="form-grid">
                  <Field label="Nome do remetente"><Input value={messagingForm.fromName} onChange={(event) => setMessagingForm({ ...messagingForm, fromName: event.target.value })} placeholder="Nome da clínica" /></Field>
                  <Field label="E-mail para respostas"><Input type="email" value={messagingForm.replyTo} onChange={(event) => setMessagingForm({ ...messagingForm, replyTo: event.target.value })} placeholder="contato@clinica.com.br" /></Field>
                </div>
                <div className="form-grid">
                  <Field label="Remetente SMS"><Input value={messagingForm.smsSender} onChange={(event) => setMessagingForm({ ...messagingForm, smsSender: event.target.value })} placeholder="CLINICA" /></Field>
                  <Field label="Número WhatsApp"><Input value={messagingForm.whatsappSender} onChange={(event) => setMessagingForm({ ...messagingForm, whatsappSender: event.target.value })} placeholder="5511999999999" /></Field>
                </div>
                <Field label="ID do template WhatsApp"><Input inputMode="numeric" value={messagingForm.whatsappTemplateId} onChange={(event) => setMessagingForm({ ...messagingForm, whatsappTemplateId: event.target.value })} placeholder="Ex.: 12345" /></Field>
                <div className="form-grid">
                  <label className="flex items-center gap-3"><Checkbox checked={messagingForm.emailAtivo} onCheckedChange={(checked) => setMessagingForm({ ...messagingForm, emailAtivo: checked === true })} /><span>E-mail ativo</span></label>
                  <label className="flex items-center gap-3"><Checkbox checked={messagingForm.smsAtivo} onCheckedChange={(checked) => setMessagingForm({ ...messagingForm, smsAtivo: checked === true })} /><span>SMS ativo</span></label>
                  <label className="flex items-center gap-3"><Checkbox checked={messagingForm.whatsappAtivo} onCheckedChange={(checked) => setMessagingForm({ ...messagingForm, whatsappAtivo: checked === true })} /><span>WhatsApp ativo</span></label>
                </div>
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" disabled={!messagingQuery.data?.apiKeyConfigured || testMessaging.isPending} onClick={() => testMessaging.mutate()}>{testMessaging.isPending ? "Testando..." : "Testar conexão"}</Button>
                  <Button type="button" className="primary-action" disabled={updateMessaging.isPending || !messagingForm.fromEmail} onClick={() => updateMessaging.mutate(messagingForm)}>{updateMessaging.isPending ? "Salvando..." : "Salvar comunicação"}</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAdmin && <Card className="surface-card mt-5 border-red-200/80 bg-red-50/70">
            <CardHeader><div><p className="eyebrow text-red-700">ZONA DE SEGURANÇA</p><CardTitle>Limpeza de dados operacionais</CardTitle><CardDescription>Use somente ao reiniciar a operação desta clínica. Esta ação não afeta nenhuma outra clínica da plataforma.</CardDescription></div></CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-3xl text-sm text-muted-foreground">Serão removidos clientes, prontuários, agenda, fotos, respostas de anamnese, contas financeiras, recebimentos, despesas, comissões, caixa, lembretes e registros de auditoria. Usuários, serviços, profissionais, salas, equipamentos, insumos e personalização da clínica permanecem preservados.</p><Button type="button" variant="outline" className="safety-action shrink-0" onClick={() => setShowDataCleanupDialog(true)}>Limpar Dados Operacionais</Button></CardContent>
          </Card>}
          <div className="metric-grid mt-5"><Metric icon={Users} label="Usuários cadastrados" value={String(usersQuery.data?.length ?? 0)} /><Metric icon={CalendarDays} label="Lembretes pendentes" value={String(reminderQuery.data?.filter((item) => item.status === "PENDENTE").length ?? 0)} /><Metric icon={CircleDollarSign} label="Faturamento no mês" value={currency(statsQuery.data?.faturamentoMes)} /><Metric icon={Activity} label="Ocupação de hoje" value={`${statsQuery.data?.taxaOcupacao ?? 0}%`} /></div>
          <div className="dashboard-grid finance-grid mt-5"><Card className="surface-card large-card"><CardHeader><CardTitle>Permissões de acesso</CardTitle><CardDescription>Defina o perfil operacional de cada conta autenticada.</CardDescription></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>E-mail</TableHead><TableHead>Perfil</TableHead><TableHead>Ativo</TableHead></TableRow></TableHeader><TableBody>{usersQuery.data?.map((account) => <TableRow key={account.id}><TableCell className="font-medium">{account.name ?? "Sem nome"}</TableCell><TableCell>{account.email ?? "—"}</TableCell><TableCell><Select value={account.role} onValueChange={(value) => updateUserRole.mutate({ id: account.id, role: value as "user" | "admin" | "recepcao" | "profissional" | "cliente", ativo: account.ativo })}><SelectTrigger className="h-8 min-w-35"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Gestor(a)</SelectItem><SelectItem value="recepcao">Recepção</SelectItem><SelectItem value="profissional">Profissional</SelectItem><SelectItem value="cliente">Cliente</SelectItem><SelectItem value="user">Cliente (padrão)</SelectItem></SelectContent></Select></TableCell><TableCell><Button size="sm" variant={account.ativo ? "outline" : "ghost"} onClick={() => updateUserRole.mutate({ id: account.id, role: account.role, ativo: !account.ativo })}>{account.ativo ? "Ativo" : "Inativo"}</Button></TableCell></TableRow>)}{!usersQuery.data?.length && <EmptyRow cols={4} message="Nenhuma conta disponível." />}</TableBody></Table></CardContent></Card><Card className="surface-card"><CardHeader><CardTitle>Fila de lembretes</CardTitle><CardDescription>Mensagens preparadas para o canal configurado.</CardDescription></CardHeader><CardContent className="space-y-2">{reminderQuery.data?.slice(0, 6).map((reminder) => <div className="expense-line" key={reminder.id}><div><strong>{reminder.destinatario}</strong><span>{dateTime(reminder.agendadoPara)}</span></div><StatusBadge value={reminder.status === "ENVIADO" ? "CONFIRMADA" : reminder.status === "CANCELADO" ? "CANCELADA" : "PENDENTE"} /></div>)}{!reminderQuery.data?.length && <p className="empty-copy">Não há lembretes enfileirados.</p>}</CardContent></Card></div>
          <Card className="surface-card mt-5"><CardHeader><div><p className="eyebrow">ESTOQUE CLÍNICO</p><CardTitle>Insumos e alertas de reposição</CardTitle><CardDescription>Controle a disponibilidade dos itens utilizados nos procedimentos.</CardDescription></div></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Insumo</TableHead><TableHead>Estoque atual</TableHead><TableHead>Mínimo</TableHead><TableHead>Custo unitário</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>{suppliesQuery.data?.map((supply) => <TableRow key={supply.id}><TableCell className="font-medium">{supply.nome}<small className="block">Unidade: {supply.unidade}</small></TableCell><TableCell>{Number(supply.estoqueAtual).toLocaleString("pt-BR")}</TableCell><TableCell>{Number(supply.estoqueMinimo).toLocaleString("pt-BR")}</TableCell><TableCell>{currency(supply.custoUnitario)}</TableCell><TableCell><span className={`status-badge ${supply.abaixoDoMinimo ? "status-danger" : "status-success"}`}>{supply.abaixoDoMinimo ? "Repor" : "Adequado"}</span></TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => { setSupplyForm({ id: supply.id, nome: supply.nome, unidade: supply.unidade, estoqueAtual: String(supply.estoqueAtual), estoqueMinimo: String(supply.estoqueMinimo), custoUnitario: String(supply.custoUnitario) }); setShowSupplyForm(true); }}>Editar</Button></TableCell></TableRow>)}{!suppliesQuery.data?.length && <EmptyRow cols={6} message="Nenhum insumo cadastrado." />}</TableBody></Table></CardContent></Card>
        </>}
      </main>
    </div>

    <Dialog open={showDataCleanupDialog} onOpenChange={(open) => { setShowDataCleanupDialog(open); if (!open) { setCleanupPassword(""); setCleanupConfirmPhrase(""); } }}>
      <DialogContent><DialogHeader><DialogTitle>Confirmar limpeza operacional</DialogTitle><DialogDescription>Esta ação será aplicada apenas à clínica <strong>{clinicName}</strong> e não poderá ser desfeita. Revise as informações antes de confirmar.</DialogDescription></DialogHeader><div className="form-stack"><div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-950"><strong>Dados removidos:</strong> clientes, prontuários, agenda, fotos, anamneses, financeiro, caixa, comissões, lembretes e auditoria.<br /><strong>Dados preservados:</strong> usuários, configuração e identidade da clínica, serviços, profissionais, salas, equipamentos e insumos.</div><Field label="Sua senha de gestor"><Input type="password" value={cleanupPassword} onChange={(event) => setCleanupPassword(event.target.value)} autoComplete="current-password" placeholder="Informe sua senha" /></Field><Field label='Digite “LIMPAR DADOS” para confirmar'><Input value={cleanupConfirmPhrase} onChange={(event) => setCleanupConfirmPhrase(event.target.value)} autoComplete="off" placeholder="LIMPAR DADOS" /></Field></div><DialogFooter><Button variant="outline" onClick={() => setShowDataCleanupDialog(false)}>Cancelar</Button><Button type="button" className="bg-red-600 text-white hover:bg-red-700" disabled={cleanupPassword.length === 0 || cleanupConfirmPhrase !== "LIMPAR DADOS" || clearOperationalData.isPending} onClick={() => clearOperationalData.mutate({ senha: cleanupPassword, confirmacao: "LIMPAR DADOS" })}>{clearOperationalData.isPending ? "Limpando dados..." : "Confirmar limpeza"}</Button></DialogFooter></DialogContent>
    </Dialog>
    
    <Dialog open={showFirstAccessSetup} onOpenChange={(open) => { setShowFirstAccessSetup(open); if (!open) setFirstAccessForm({ clinicaNome: "", clinicaSlug: "", adminNome: "", adminEmail: "", adminSenha: "" }); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configuração Inicial da Clínica</DialogTitle>
          <DialogDescription>Personalize o nome da clínica, gere um link único para agendamento e atualize suas credenciais de administrador.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          firstAccessSetup.mutate({
            clinicaNome: firstAccessForm.clinicaNome,
            clinicaSlug: firstAccessForm.clinicaSlug || undefined,
            adminNome: firstAccessForm.adminNome,
            adminEmail: firstAccessForm.adminEmail,
            adminSenha: firstAccessForm.adminSenha,
          });
        }} className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Dados da Clínica</h3>
            <Field label="Nome da Clínica">
              <Input 
                value={firstAccessForm.clinicaNome} 
                onChange={(e) => setFirstAccessForm({ ...firstAccessForm, clinicaNome: e.target.value })}
                placeholder="Ex.: Clínica Sorriso"
                required
              />
            </Field>
            <Field label="Slug para Link (opcional)">
              <Input 
                value={firstAccessForm.clinicaSlug}
                onChange={(e) => setFirstAccessForm({ ...firstAccessForm, clinicaSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                placeholder="clinica-sorriso (deixe vazio para gerar automaticamente)"
              />
              <small className="text-muted-foreground">Se não informado, será gerado automaticamente a partir do nome da clínica.</small>
            </Field>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">Dados do Administrador</h3>
            <Field label="Seu Nome">
              <Input 
                value={firstAccessForm.adminNome}
                onChange={(e) => setFirstAccessForm({ ...firstAccessForm, adminNome: e.target.value })}
                placeholder="Seu nome completo"
                required
              />
            </Field>
            <Field label="Seu Email">
              <Input 
                type="email"
                value={firstAccessForm.adminEmail}
                onChange={(e) => setFirstAccessForm({ ...firstAccessForm, adminEmail: e.target.value })}
                placeholder="seu@email.com"
                required
              />
            </Field>
            <Field label="Nova Senha">
              <Input 
                type="password"
                value={firstAccessForm.adminSenha}
                onChange={(e) => setFirstAccessForm({ ...firstAccessForm, adminSenha: e.target.value })}
                placeholder="Mínimo 10 caracteres"
                required
              />
              <small className="text-muted-foreground">Mínimo 10 caracteres para segurança.</small>
            </Field>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowFirstAccessSetup(false)}>Cancelar</Button>
            <Button type="submit" className="primary-action" disabled={firstAccessSetup.isPending}>
              {firstAccessSetup.isPending ? "Configurando..." : "Concluir Configuração"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={showClientForm} onOpenChange={(open) => { setShowClientForm(open); if (!open) resetClientForm(); }}><DialogContent><DialogHeader><DialogTitle>{editingClientId ? "Editar cliente" : "Novo cliente"}</DialogTitle><DialogDescription>{editingClientId ? "Atualize os dados cadastrais sem alterar o histórico clínico ou financeiro." : "O cadastro cria automaticamente um prontuário clínico individual."}</DialogDescription></DialogHeader><div className="form-stack"><Field label="Nome completo"><Input value={clientForm.nome} onChange={(event) => setClientForm({ ...clientForm, nome: event.target.value })} /></Field><div className="form-grid"><Field label="Telefone"><Input value={clientForm.telefone} onChange={(event) => setClientForm({ ...clientForm, telefone: event.target.value })} /></Field><Field label="Data de nascimento"><Input type="date" value={clientForm.dataNascimento} onChange={(event) => setClientForm({ ...clientForm, dataNascimento: event.target.value })} /></Field></div><Field label="E-mail"><Input type="email" value={clientForm.email} onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })} /></Field>{!editingClientId && <Field label="CPF (referência interna)"><Input value={clientForm.cpfHash} onChange={(event) => setClientForm({ ...clientForm, cpfHash: event.target.value })} /></Field>}</div><DialogFooter><Button variant="outline" onClick={() => { setShowClientForm(false); resetClientForm(); }}>Cancelar</Button><Button className="primary-action" disabled={!clientForm.nome || createClient.isPending || updateClient.isPending} onClick={() => editingClientId ? updateClient.mutate({ id: editingClientId, nome: clientForm.nome, email: clientForm.email || undefined, telefone: clientForm.telefone || undefined, dataNascimento: clientForm.dataNascimento || undefined }) : createClient.mutate(clientForm)}>{editingClientId ? "Salvar alterações" : "Salvar cliente"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showArchiveDialog} onOpenChange={(open) => { setShowArchiveDialog(open); if (!open) setArchiveTarget(null); }}><DialogContent><DialogHeader><DialogTitle>Arquivar cadastro</DialogTitle><DialogDescription>Confirme o arquivamento de <strong>{archiveTarget?.nome}</strong>. O histórico já existente será preservado, mas o item deixará de estar disponível para novos usos.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setShowArchiveDialog(false)}>Cancelar</Button><Button className="bg-red-600 text-white hover:bg-red-700" disabled={!archiveTarget || archiveClient.isPending || archiveService.isPending || archiveEquipment.isPending || archiveSupply.isPending || archiveProfessional.isPending} onClick={() => { if (!archiveTarget) return; const target = archiveTarget; setShowArchiveDialog(false); if (target.kind === "cliente") archiveClient.mutate({ id: target.id }); if (target.kind === "servico") archiveService.mutate({ id: target.id }); if (target.kind === "equipamento") archiveEquipment.mutate({ id: target.id }); if (target.kind === "insumo") archiveSupply.mutate({ id: target.id }); if (target.kind === "profissional") archiveProfessional.mutate({ id: target.id }); }}>Arquivar</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showSessionForm} onOpenChange={setShowSessionForm}><DialogContent><DialogHeader><DialogTitle>Novo agendamento</DialogTitle><DialogDescription>A conta a receber e os lembretes são preparados automaticamente.</DialogDescription></DialogHeader><div className="form-stack"><Field label="Cliente"><Select onValueChange={(value) => setSessionForm({ ...sessionForm, clienteId: value })}><SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger><SelectContent>{clientsQuery.data?.map((client) => <SelectItem key={client.id} value={String(client.id)}>{client.nome}</SelectItem>)}</SelectContent></Select></Field><Field label="Procedimento"><Select onValueChange={(value) => { const service = servicesQuery.data?.find((item) => String(item.id) === value); setSessionForm({ ...sessionForm, servicoId: value, duracaoMin: String(service?.duracaoMin ?? 60) }); }}><SelectTrigger><SelectValue placeholder="Selecione o procedimento" /></SelectTrigger><SelectContent>{servicesQuery.data?.map((service) => <SelectItem key={service.id} value={String(service.id)}>{service.nome} · {currency(service.valor)}</SelectItem>)}</SelectContent></Select></Field>{isManager && <Field label="Profissional"><Select onValueChange={(value) => setSessionForm({ ...sessionForm, profissionalId: value })}><SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger><SelectContent>{professionalsQuery.data?.map((professional) => <SelectItem key={professional.id} value={String(professional.id)}>{professional.name ?? "Profissional"}</SelectItem>)}</SelectContent></Select></Field>}<div className="form-grid"><Field label="Data e horário"><Input type="datetime-local" value={sessionForm.dataHoraInicio} onChange={(event) => setSessionForm({ ...sessionForm, dataHoraInicio: event.target.value })} /></Field><Field label="Duração"><Input type="number" min="10" value={sessionForm.duracaoMin} onChange={(event) => setSessionForm({ ...sessionForm, duracaoMin: event.target.value })} /></Field></div></div><DialogFooter><Button variant="outline" onClick={() => setShowSessionForm(false)}>Cancelar</Button><Button className="primary-action" disabled={!sessionForm.clienteId || !sessionForm.servicoId || !sessionForm.dataHoraInicio || createSession.isPending} onClick={() => createSession.mutate({ clienteId: Number(sessionForm.clienteId), servicoId: Number(sessionForm.servicoId), profissionalId: Number(sessionForm.profissionalId || user.id), dataHoraInicio: new Date(sessionForm.dataHoraInicio), duracaoMin: Number(sessionForm.duracaoMin) })}>Agendar</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showServiceForm} onOpenChange={(open) => { setShowServiceForm(open); if (!open) resetServiceForm(); }}><DialogContent><DialogHeader><DialogTitle>{serviceForm.id ? "Editar serviço" : "Novo procedimento"}</DialogTitle><DialogDescription>{serviceForm.id ? "Corrija dados de catálogo sem alterar os vínculos, agendamentos ou histórico já registrados." : "Defina a base do serviço usada pela agenda e pelo financeiro."}</DialogDescription></DialogHeader><div className="form-stack"><Field label="Nome"><Input value={serviceForm.nome} onChange={(event) => setServiceForm({ ...serviceForm, nome: event.target.value })} /></Field><div className="form-grid"><Field label="Valor"><Input inputMode="decimal" value={serviceForm.valor} onChange={(event) => setServiceForm({ ...serviceForm, valor: event.target.value })} placeholder="0,00" /></Field><Field label="Duração (minutos)"><Input type="number" min="10" max="600" value={serviceForm.duracaoMin} onChange={(event) => setServiceForm({ ...serviceForm, duracaoMin: event.target.value })} /></Field></div><Field label="Descrição"><Textarea value={serviceForm.descricao} onChange={(event) => setServiceForm({ ...serviceForm, descricao: event.target.value })} /></Field><div className="form-grid"><div className="flex items-center gap-3"><Checkbox id="service-questionnaire" checked={serviceForm.exigeQuestionario} onCheckedChange={(checked) => setServiceForm({ ...serviceForm, exigeQuestionario: checked === true })} /><Label htmlFor="service-questionnaire">Exige anamnese</Label></div>{serviceForm.id && <div className="flex items-center gap-3"><Checkbox id="service-active" checked={serviceForm.ativo} onCheckedChange={(checked) => setServiceForm({ ...serviceForm, ativo: checked === true })} /><Label htmlFor="service-active">Serviço ativo</Label></div>}</div></div><DialogFooter><Button variant="outline" onClick={() => setShowServiceForm(false)}>Cancelar</Button><Button className="primary-action" disabled={!serviceForm.nome || !serviceForm.valor || createService.isPending || updateService.isPending} onClick={() => serviceForm.id ? updateService.mutate({ id: serviceForm.id, nome: serviceForm.nome, valor: serviceForm.valor, duracaoMin: Number(serviceForm.duracaoMin), descricao: serviceForm.descricao || undefined, exigeQuestionario: serviceForm.exigeQuestionario, ativo: serviceForm.ativo }) : createService.mutate({ nome: serviceForm.nome, valor: serviceForm.valor, duracaoMin: Number(serviceForm.duracaoMin), descricao: serviceForm.descricao || undefined, exigeQuestionario: serviceForm.exigeQuestionario })}>{serviceForm.id ? "Salvar alterações" : "Salvar procedimento"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showQuestionnaireForm} onOpenChange={setShowQuestionnaireForm}><DialogContent><DialogHeader><DialogTitle>Novo questionário de anamnese</DialogTitle><DialogDescription>Uma nova versão será publicada sob o código informado.</DialogDescription></DialogHeader><div className="form-stack"><div className="form-grid"><Field label="Código"><Input value={questionnaireForm.codigo} onChange={(event) => setQuestionnaireForm({ ...questionnaireForm, codigo: event.target.value })} placeholder="ANAMNESE-FACIAL" /></Field><Field label="Nome"><Input value={questionnaireForm.nome} onChange={(event) => setQuestionnaireForm({ ...questionnaireForm, nome: event.target.value })} /></Field></div><Field label="Descrição"><Textarea value={questionnaireForm.descricao} onChange={(event) => setQuestionnaireForm({ ...questionnaireForm, descricao: event.target.value })} /></Field><Field label="Primeira pergunta"><Textarea value={questionnaireForm.texto} onChange={(event) => setQuestionnaireForm({ ...questionnaireForm, texto: event.target.value })} placeholder="Ex.: Possui alguma alergia conhecida?" /></Field></div><DialogFooter><Button variant="outline" onClick={() => setShowQuestionnaireForm(false)}>Cancelar</Button><Button className="primary-action" disabled={!questionnaireForm.codigo || !questionnaireForm.nome || !questionnaireForm.texto || createQuestionnaire.isPending} onClick={() => createQuestionnaire.mutate({ codigo: questionnaireForm.codigo, nome: questionnaireForm.nome, descricao: questionnaireForm.descricao || undefined, perguntas: [{ texto: questionnaireForm.texto, tipoResposta: questionnaireForm.tipoResposta, obrigatoria: true }] })}>Publicar</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showEquipmentForm} onOpenChange={setShowEquipmentForm}><DialogContent><DialogHeader><DialogTitle>{equipmentForm.id ? "Editar equipamento" : "Novo equipamento"}</DialogTitle><DialogDescription>Cadastre recursos físicos para organização dos atendimentos e das manutenções.</DialogDescription></DialogHeader><div className="form-stack"><Field label="Nome"><Input value={equipmentForm.nome} onChange={(event) => setEquipmentForm({ ...equipmentForm, nome: event.target.value })} /></Field><div className="form-grid"><Field label="Tipo"><Input value={equipmentForm.tipo} onChange={(event) => setEquipmentForm({ ...equipmentForm, tipo: event.target.value })} placeholder="Ex.: Laser" /></Field><Field label="Localização"><Input value={equipmentForm.localizacao} onChange={(event) => setEquipmentForm({ ...equipmentForm, localizacao: event.target.value })} placeholder="Ex.: Sala 02" /></Field></div><Field label="Descrição"><Textarea value={equipmentForm.descricao} onChange={(event) => setEquipmentForm({ ...equipmentForm, descricao: event.target.value })} /></Field></div><DialogFooter><Button variant="outline" onClick={() => setShowEquipmentForm(false)}>Cancelar</Button><Button className="primary-action" disabled={!equipmentForm.nome || createEquipment.isPending || updateEquipment.isPending} onClick={() => equipmentForm.id ? updateEquipment.mutate({ id: equipmentForm.id, nome: equipmentForm.nome, tipo: equipmentForm.tipo || undefined, localizacao: equipmentForm.localizacao || undefined, descricao: equipmentForm.descricao || undefined }) : createEquipment.mutate({ nome: equipmentForm.nome, tipo: equipmentForm.tipo || undefined, localizacao: equipmentForm.localizacao || undefined, descricao: equipmentForm.descricao || undefined })}>{equipmentForm.id ? "Salvar alterações" : "Cadastrar equipamento"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showUserForm} onOpenChange={setShowUserForm}><DialogContent><DialogHeader><DialogTitle>Novo usuário interno</DialogTitle><DialogDescription>Crie as credenciais de acesso para gestão, recepção ou profissionais da clínica.</DialogDescription></DialogHeader><div className="form-stack"><Field label="Nome completo"><Input value={localUserForm.name} onChange={(event) => setLocalUserForm({ ...localUserForm, name: event.target.value })} autoComplete="name" /></Field><div className="form-grid"><Field label="E-mail"><Input type="email" value={localUserForm.email} onChange={(event) => setLocalUserForm({ ...localUserForm, email: event.target.value })} autoComplete="email" /></Field><Field label="Telefone"><Input value={localUserForm.telefone} onChange={(event) => setLocalUserForm({ ...localUserForm, telefone: event.target.value })} autoComplete="tel" /></Field></div><Field label="Perfil de acesso"><Select value={localUserForm.role} onValueChange={(role) => setLocalUserForm({ ...localUserForm, role: role as typeof localUserForm.role })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Gestor(a)</SelectItem><SelectItem value="recepcao">Recepção</SelectItem><SelectItem value="profissional">Profissional</SelectItem><SelectItem value="cliente">Cliente</SelectItem></SelectContent></Select></Field><Field label="Senha provisória"><Input type="password" minLength={10} value={localUserForm.password} onChange={(event) => setLocalUserForm({ ...localUserForm, password: event.target.value })} autoComplete="new-password" /><small>Use ao menos 10 caracteres. Oriente a pessoa a redefinir a senha no primeiro acesso.</small></Field></div><DialogFooter><Button variant="outline" onClick={() => setShowUserForm(false)}>Cancelar</Button><Button className="primary-action" disabled={!localUserForm.name || !localUserForm.email || localUserForm.password.length < 10 || createLocalUser.isPending} onClick={() => createLocalUser.mutate({ ...localUserForm, telefone: localUserForm.telefone || undefined })}>Criar credenciais</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showCommissionPaymentForm} onOpenChange={setShowCommissionPaymentForm}><DialogContent><DialogHeader><DialogTitle>Registrar pagamento de comissão</DialogTitle><DialogDescription>Confirme a baixa de {commissionPaymentForm.ids.length} comissão{commissionPaymentForm.ids.length === 1 ? "" : "ões"}, totalizando {currency(selectedCommissionTotal)}. A baixa altera apenas comissões que ainda estejam pendentes.</DialogDescription></DialogHeader><div className="form-stack"><Field label="Data do pagamento"><Input type="date" value={commissionPaymentForm.dataPagamento} onChange={(event) => setCommissionPaymentForm({ ...commissionPaymentForm, dataPagamento: event.target.value })} /></Field><p className="text-sm text-muted-foreground">A data fica registrada no histórico da comissão. O caixa não é alterado nesta ação, pois a forma de pagamento ao profissional não é informada neste fluxo.</p></div><DialogFooter><Button variant="outline" onClick={() => setShowCommissionPaymentForm(false)}>Cancelar</Button><Button className="primary-action" disabled={!commissionPaymentForm.ids.length || !commissionPaymentForm.dataPagamento || payCommissions.isPending} onClick={() => payCommissions.mutate(commissionPaymentForm)}>{payCommissions.isPending ? "Registrando..." : "Confirmar pagamento"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showCommissionRuleForm} onOpenChange={setShowCommissionRuleForm}><DialogContent><DialogHeader><DialogTitle>Regra de comissão</DialogTitle><DialogDescription>Configure como o profissional será remunerado por cada procedimento. A comissão é gerada ao concluir a sessão e a regra aplicada é preservada no histórico.</DialogDescription></DialogHeader><div className="form-stack"><Field label="Profissional"><Select value={commissionRuleForm.profissionalId} onValueChange={(value) => setCommissionRuleForm({ ...commissionRuleForm, profissionalId: value })}><SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger><SelectContent>{professionalsQuery.data?.filter((professional) => professional.role === "profissional").map((professional) => <SelectItem key={professional.id} value={String(professional.id)}>{professional.name ?? "Profissional"}</SelectItem>)}</SelectContent></Select></Field><Field label="Procedimento"><Select value={commissionRuleForm.servicoId} onValueChange={(value) => setCommissionRuleForm({ ...commissionRuleForm, servicoId: value })}><SelectTrigger><SelectValue placeholder="Selecione o procedimento" /></SelectTrigger><SelectContent>{servicesAdminQuery.data?.map((service) => <SelectItem key={service.id} value={String(service.id)}>{service.nome} · {currency(service.valor)}</SelectItem>)}</SelectContent></Select></Field><Field label="Modalidade"><Select value={commissionRuleForm.tipoComissao} onValueChange={(value) => setCommissionRuleForm({ ...commissionRuleForm, tipoComissao: value as typeof commissionRuleForm.tipoComissao })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PERCENTUAL">Percentual sobre o serviço</SelectItem><SelectItem value="VALOR_FIXO">Valor fixo por sessão</SelectItem></SelectContent></Select></Field>{commissionRuleForm.tipoComissao === "PERCENTUAL" ? <Field label="Percentual de comissão"><Input inputMode="decimal" value={commissionRuleForm.comissaoPercentual} onChange={(event) => setCommissionRuleForm({ ...commissionRuleForm, comissaoPercentual: event.target.value })} placeholder="Ex.: 30" /><small>Informe de 0 a 100. Ex.: 30 significa 30% do valor do procedimento.</small></Field> : <Field label="Valor fixo por sessão"><Input inputMode="decimal" value={commissionRuleForm.comissaoValorFixo} onChange={(event) => setCommissionRuleForm({ ...commissionRuleForm, comissaoValorFixo: event.target.value })} placeholder="Ex.: 80,00" /><small>Esse valor será usado para cada sessão concluída do procedimento.</small></Field>}<div className="flex items-center gap-3"><Checkbox id="commission-rule-active" checked={commissionRuleForm.ativo} onCheckedChange={(checked) => setCommissionRuleForm({ ...commissionRuleForm, ativo: checked === true })} /><Label htmlFor="commission-rule-active">Regra ativa para novas comissões</Label></div></div><DialogFooter><Button variant="outline" onClick={() => setShowCommissionRuleForm(false)}>Cancelar</Button><Button className="primary-action" disabled={!commissionRuleForm.profissionalId || !commissionRuleForm.servicoId || (commissionRuleForm.tipoComissao === "PERCENTUAL" ? !commissionRuleForm.comissaoPercentual : !commissionRuleForm.comissaoValorFixo) || saveCommissionRule.isPending} onClick={() => saveCommissionRule.mutate({ profissionalId: Number(commissionRuleForm.profissionalId), servicoId: Number(commissionRuleForm.servicoId), tipoComissao: commissionRuleForm.tipoComissao, comissaoPercentual: commissionRuleForm.comissaoPercentual, comissaoValorFixo: commissionRuleForm.comissaoValorFixo, ativo: commissionRuleForm.ativo })}>{saveCommissionRule.isPending ? "Salvando..." : "Salvar regra"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showSupplyForm} onOpenChange={setShowSupplyForm}><DialogContent><DialogHeader><DialogTitle>{supplyForm.id ? "Editar insumo" : "Novo insumo"}</DialogTitle><DialogDescription>Defina o saldo disponível e o limite mínimo que deverá disparar o alerta de reposição.</DialogDescription></DialogHeader><div className="form-stack"><div className="form-grid"><Field label="Nome"><Input value={supplyForm.nome} onChange={(event) => setSupplyForm({ ...supplyForm, nome: event.target.value })} /></Field><Field label="Unidade"><Input value={supplyForm.unidade} onChange={(event) => setSupplyForm({ ...supplyForm, unidade: event.target.value })} placeholder="un, ml, g" /></Field></div><div className="form-grid"><Field label="Estoque atual"><Input inputMode="decimal" value={supplyForm.estoqueAtual} onChange={(event) => setSupplyForm({ ...supplyForm, estoqueAtual: event.target.value })} placeholder="0,00" /></Field><Field label="Estoque mínimo"><Input inputMode="decimal" value={supplyForm.estoqueMinimo} onChange={(event) => setSupplyForm({ ...supplyForm, estoqueMinimo: event.target.value })} placeholder="0,00" /></Field></div><Field label="Custo unitário"><Input inputMode="decimal" value={supplyForm.custoUnitario} onChange={(event) => setSupplyForm({ ...supplyForm, custoUnitario: event.target.value })} placeholder="0,00" /></Field></div><DialogFooter><Button variant="outline" onClick={() => setShowSupplyForm(false)}>Cancelar</Button><Button className="primary-action" disabled={!supplyForm.nome || !supplyForm.unidade || !supplyForm.estoqueAtual || !supplyForm.estoqueMinimo || !supplyForm.custoUnitario || createSupply.isPending || updateSupply.isPending} onClick={() => supplyForm.id ? updateSupply.mutate({ id: supplyForm.id, nome: supplyForm.nome, unidade: supplyForm.unidade, estoqueAtual: supplyForm.estoqueAtual, estoqueMinimo: supplyForm.estoqueMinimo, custoUnitario: supplyForm.custoUnitario }) : createSupply.mutate({ nome: supplyForm.nome, unidade: supplyForm.unidade, estoqueAtual: supplyForm.estoqueAtual, estoqueMinimo: supplyForm.estoqueMinimo, custoUnitario: supplyForm.custoUnitario })}>{supplyForm.id ? "Salvar alterações" : "Cadastrar insumo"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showReceiptForm} onOpenChange={setShowReceiptForm}><DialogContent><DialogHeader><DialogTitle>Registrar recebimento - Conta #{selectedAccountForReceipt?.id ?? ""}</DialogTitle><DialogDescription>Cliente: <strong>{selectedAccountForReceipt?.clienteNome ?? "—"}</strong> | Procedimento: <strong>{selectedAccountForReceipt?.descricao ?? "—"}</strong></DialogDescription></DialogHeader><div className="form-stack">{selectedAccountForReceipt && <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-1 border border-border"><div className="flex justify-between"><span>Valor Total:</span><strong>{currency(selectedAccountForReceipt.valorFinal)}</strong></div><div className="flex justify-between"><span>Já Pago (Histórico):</span><span className="text-emerald-600 font-medium">{currency(selectedAccountForReceipt.totalPago)}</span></div><div className="flex justify-between font-semibold text-primary"><span>Saldo a pagar:</span><span>{currency(selectedAccountForReceipt.saldoRestante)}</span></div></div>}<div className="space-y-3"><div className="flex items-center justify-between"><strong className="text-sm">Formas de recebimento</strong><Button type="button" size="sm" variant="outline" onClick={() => setPaymentLines([...paymentLines, { tipoPagamento: "PIX", valor: "", dataPrevistaLiquidacao: new Date().toISOString().slice(0, 10) }])}>Adicionar forma</Button></div>{paymentLines.map((line, index) => <div className="rounded-lg border border-border p-3 space-y-3" key={index}><div className="form-grid"><Field label={`Valor ${index + 1} (R$)`}><Input inputMode="decimal" value={line.valor} onChange={(event) => setPaymentLines(paymentLines.map((item, itemIndex) => itemIndex === index ? { ...item, valor: event.target.value } : item))} placeholder="0,00" /></Field><Field label="Forma"><Select value={line.tipoPagamento} onValueChange={(value) => setPaymentLines(paymentLines.map((item, itemIndex) => itemIndex === index ? { ...item, tipoPagamento: value as PaymentMethod } : item))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DINHEIRO">Dinheiro</SelectItem><SelectItem value="PIX">PIX</SelectItem><SelectItem value="CARTAO_DEBITO">Cartão de débito</SelectItem><SelectItem value="CARTAO_CREDITO">Cartão de crédito</SelectItem></SelectContent></Select></Field></div>{["CARTAO_CREDITO", "CARTAO_DEBITO"].includes(line.tipoPagamento) && <Field label="Previsão de liquidação"><Input type="date" value={line.dataPrevistaLiquidacao} onChange={(event) => setPaymentLines(paymentLines.map((item, itemIndex) => itemIndex === index ? { ...item, dataPrevistaLiquidacao: event.target.value } : item))} /></Field>}{paymentLines.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => setPaymentLines(paymentLines.filter((_, itemIndex) => itemIndex !== index))}>Remover forma</Button>}</div>)}</div>{(() => { const total = paymentLines.reduce((sum, item) => sum + (Number(item.valor.replace(",", ".")) || 0), 0); const saldo = selectedAccountForReceipt?.saldoRestante ?? 0; const isOver = total > saldo + 0.001; return <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1"><div className="flex justify-between font-medium"><span>Total informado:</span><span>{currency(total)}</span></div><div className="flex justify-between text-muted-foreground"><span>Saldo após registro:</span><span className="text-primary font-semibold">{currency(Math.max(0, saldo - total))}</span></div>{isOver && <p className="text-xs text-red-500 font-semibold">A soma das formas excede o saldo a pagar ({currency(saldo)}).</p>}</div>; })()}<Field label="Observações"><Textarea value={receiptForm.observacoes} onChange={(event) => setReceiptForm({ ...receiptForm, observacoes: event.target.value })} placeholder="Ex.: sinal via PIX e saldo no cartão." /></Field></div><DialogFooter><Button variant="outline" onClick={() => setShowReceiptForm(false)}>Cancelar</Button><Button className="primary-action" disabled={receivePayment.isPending || paymentLines.some((line) => !(Number(line.valor.replace(",", ".")) > 0)) || paymentLines.reduce((sum, line) => sum + (Number(line.valor.replace(",", ".")) || 0), 0) > (selectedAccountForReceipt?.saldoRestante ?? 0) + 0.001} onClick={() => receivePayment.mutate({ contaReceberId: receiptForm.contaReceberId, clienteId: receiptForm.clienteId, pagamentos: paymentLines.map((line) => ({ ...line, dataPrevistaLiquidacao: ["CARTAO_CREDITO", "CARTAO_DEBITO"].includes(line.tipoPagamento) ? line.dataPrevistaLiquidacao : undefined })), observacoes: receiptForm.observacoes || undefined })}>Confirmar recebimento</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(selectedAgendaSession)} onOpenChange={(open) => { if (!open) setSelectedAgendaSession(null); }}><DialogContent><DialogHeader><DialogTitle>Processo do atendimento</DialogTitle><DialogDescription>Informações clínicas, agenda e financeiro vinculadas ao atendimento selecionado.</DialogDescription></DialogHeader>{selectedAgendaSession && (() => { const conta = accountsQuery.data?.find((item) => item.clienteId === selectedAgendaSession.clienteId && item.status !== "PAGA"); return <div className="form-stack"><div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm"><div className="flex justify-between gap-4"><span>Cliente</span><strong>{selectedAgendaSession.clienteNome}</strong></div><div className="flex justify-between gap-4"><span>Procedimento</span><strong>{selectedAgendaSession.servicoNome}</strong></div><div className="flex justify-between gap-4"><span>Profissional</span><strong>{selectedAgendaSession.profissionalNome ?? "Não informado"}</strong></div><div className="flex justify-between gap-4"><span>Data e horário</span><strong>{dateTime(selectedAgendaSession.dataHoraInicio)}</strong></div><div className="flex justify-between gap-4"><span>Status</span><StatusBadge value={selectedAgendaSession.status} /></div><div className="flex justify-between gap-4"><span>Financeiro</span><strong className={conta ? "text-primary" : "text-emerald-600"}>{conta ? `Saldo a pagar: ${currency(conta.saldoRestante)}` : "Sem pendências"}</strong></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setSelectedAgendaSession(null); setSection("clientes"); openClient(selectedAgendaSession.clienteId); }}>Ver prontuário</Button><Button variant="outline" disabled={!conta} onClick={() => { if (!conta) return; const today = new Date().toISOString().slice(0, 10); setSelectedAccountForReceipt(conta); setReceiptForm({ contaReceberId: conta.id, clienteId: conta.clienteId, valor: String(conta.saldoRestante), tipoPagamento: "PIX", dataPrevistaLiquidacao: today, observacoes: "" }); setPaymentLines([{ tipoPagamento: "PIX", valor: String(conta.saldoRestante), dataPrevistaLiquidacao: today }]); setSelectedAgendaSession(null); setShowReceiptForm(true); }}>Registrar recebimento</Button><Button className="primary-action" onClick={() => { setSelectedAgendaSession(null); setSessionForm({ clienteId: String(selectedAgendaSession.clienteId), servicoId: String(selectedAgendaSession.servicoId), profissionalId: String(selectedAgendaSession.profissionalId), dataHoraInicio: new Date(selectedAgendaSession.dataHoraInicio).toISOString().slice(0, 16), duracaoMin: String(selectedAgendaSession.duracaoMin) }); setShowSessionForm(true); }}>Editar agendamento</Button></div></div>; })()}</DialogContent></Dialog>
    <Dialog open={showSettlementForm} onOpenChange={setShowSettlementForm}><DialogContent><DialogHeader><DialogTitle>Liquidar recebimento de cartão</DialogTitle><DialogDescription>Confirme a data em que o repasse foi disponibilizado pela operadora.</DialogDescription></DialogHeader><Field label="Data de liquidação"><Input type="date" value={settlementForm.dataLiquidacao} onChange={(event) => setSettlementForm({ ...settlementForm, dataLiquidacao: event.target.value })} /></Field><DialogFooter><Button variant="outline" onClick={() => setShowSettlementForm(false)}>Cancelar</Button><Button className="primary-action" disabled={!settlementForm.id || settleReceipt.isPending} onClick={() => settleReceipt.mutate(settlementForm)}>Confirmar liquidação</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}><DialogContent><DialogHeader><DialogTitle>Novo lançamento de despesa</DialogTitle><DialogDescription>Registre a despesa para inclusão no caixa diário.</DialogDescription></DialogHeader><div className="form-stack"><Field label="Descrição"><Input value={expenseForm.descricao} onChange={(event) => setExpenseForm({ ...expenseForm, descricao: event.target.value })} /></Field><div className="form-grid"><Field label="Categoria"><Input value={expenseForm.categoria} onChange={(event) => setExpenseForm({ ...expenseForm, categoria: event.target.value })} /></Field><Field label="Valor"><Input value={expenseForm.valor} onChange={(event) => setExpenseForm({ ...expenseForm, valor: event.target.value })} placeholder="0,00" /></Field></div><Field label="Competência"><Input type="date" value={expenseForm.dataCompetencia} onChange={(event) => setExpenseForm({ ...expenseForm, dataCompetencia: event.target.value })} /></Field></div><DialogFooter><Button variant="outline" onClick={() => setShowExpenseForm(false)}>Cancelar</Button><Button className="primary-action" disabled={!expenseForm.descricao || !expenseForm.categoria || !expenseForm.valor || createExpense.isPending} onClick={() => createExpense.mutate(expenseForm)}>Salvar despesa</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showProfessionalForm} onOpenChange={setShowProfessionalForm}><DialogContent><DialogHeader><DialogTitle>Editar profissional</DialogTitle><DialogDescription>Atualize os dados cadastrais sem alterar os atendimentos ou comissões já registrados.</DialogDescription></DialogHeader><div className="form-stack"><Field label="Nome completo"><Input value={professionalForm.name} onChange={(event) => setProfessionalForm({ ...professionalForm, name: event.target.value })} autoComplete="name" /></Field><div className="form-grid"><Field label="E-mail"><Input type="email" value={professionalForm.email} onChange={(event) => setProfessionalForm({ ...professionalForm, email: event.target.value })} autoComplete="email" /></Field><Field label="Telefone"><Input value={professionalForm.telefone} onChange={(event) => setProfessionalForm({ ...professionalForm, telefone: event.target.value })} autoComplete="tel" /></Field></div></div><DialogFooter><Button variant="outline" onClick={() => setShowProfessionalForm(false)}>Cancelar</Button><Button className="primary-action" disabled={!professionalForm.name || !professionalForm.email || updateProfessional.isPending} onClick={() => updateProfessional.mutate(professionalForm)}>Salvar alterações</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <Card className="metric-card"><CardContent><div className="metric-icon"><Icon /></div><div><p>{label}</p><strong>{value}</strong></div></CardContent></Card>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
return <div className="field"><Label>{label}</Label>{children}</div>;
}
