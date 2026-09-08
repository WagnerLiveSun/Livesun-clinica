import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CalendarDays, Check, ChevronRight, Clock3, HeartPulse, Mail, MessageCircle, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type ContactChannel = "EMAIL" | "WHATSAPP" | "SMS";
type AnswerValue = string | boolean | string[];

const channelCopy: Record<ContactChannel, { label: string; description: string; icon: typeof Mail }> = {
  EMAIL: { label: "E-mail", description: "Confirmações no seu e-mail", icon: Mail },
  WHATSAPP: { label: "WhatsApp", description: "Preferência registrada; por enquanto, envio por e-mail", icon: MessageCircle },
  SMS: { label: "SMS", description: "Preferência registrada; por enquanto, envio por e-mail", icon: MessageCircle },
};

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function money(value: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

function parseOptions(value: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [] as string[];
  }
}

function BrandCredit() {
  return <div className="brand-credit booking-credit"><span>Desenvolvido por</span><img src="/assets/logo-livesun.svg" alt="Logotipo LiveSun" /></div>;
}

function BookingProgress({ step }: { step: number }) {
  const items = ["Cadastro", "Anamnese", "Agendamento", "Solicitação"];
  return <ol className="booking-progress" aria-label="Etapas do autoagendamento">
    {items.map((item, index) => {
      const number = index + 1;
      return <li key={item} className={number === step ? "is-current" : number < step ? "is-done" : ""}>
        <span>{number < step ? <Check aria-hidden="true" /> : number}</span><strong>{item}</strong>
      </li>;
    })}
  </ol>;
}

function readClinicaParam(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("clinica")?.trim().toLowerCase();
  return value || null;
}

export default function Booking() {
  const clinicaSlug = useMemo(readClinicaParam, []);
  const bookingStorageKey = `sunset-public-booking-token:${clinicaSlug ?? ""}`;
  const [step, setStep] = useState(() => (clinicaSlug ? (typeof window !== "undefined" && sessionStorage.getItem(`sunset-public-booking-token:${clinicaSlug}`) ? 2 : 1) : 1));
  const [bookingToken, setBookingToken] = useState(() => (clinicaSlug && typeof window !== "undefined" ? sessionStorage.getItem(`sunset-public-booking-token:${clinicaSlug}`) : null));
  const [registration, setRegistration] = useState({ nome: "", email: "", telefone: "", canalPreferido: "EMAIL" as ContactChannel, consentimentoDados: false, optInComunicacao: false });
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [signature, setSignature] = useState("");
  const [questionnaireIndex, setQuestionnaireIndex] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedTime, setSelectedTime] = useState("");

  const clinicSettingsQuery = trpc.settings.get.useQuery({ clinicaSlug: clinicaSlug ?? "" }, { enabled: Boolean(clinicaSlug) });
  const optionsQuery = trpc.agendamentoPublico.opcoes.useQuery({ clinicaSlug: clinicaSlug ?? "" }, { enabled: Boolean(clinicaSlug) });
  const questionnairesQuery = trpc.agendamentoPublico.questionarios.useQuery({ token: bookingToken ?? "" }, { enabled: Boolean(bookingToken) });
  const availabilityQuery = trpc.agendamentoPublico.disponibilidade.useQuery(
    { clinicaSlug: clinicaSlug ?? "", profissionalId: Number(selectedProfessionalId || 0), servicoId: Number(selectedServiceId || 0), data: selectedDate },
    { enabled: Boolean(clinicaSlug) && Boolean(selectedProfessionalId) && Boolean(selectedServiceId) && Boolean(selectedDate) },
  );
  const register = trpc.agendamentoPublico.cadastro.useMutation({
    onSuccess: (result) => {
      sessionStorage.setItem(bookingStorageKey, result.token);
      setBookingToken(result.token);
      setSignature(registration.nome);
      setStep(2);
      toast.success("Cadastro concluído. Agora preencha sua anamnese.");
    },
    onError: (error) => toast.error(error.message),
  });
  const answerQuestionnaire = trpc.agendamentoPublico.responderAnamnese.useMutation({
    onSuccess: () => {
      const next = questionnaireIndex + 1;
      if (next >= pendingQuestionnaires.length) {
        setStep(3);
        toast.success("Anamnese registrada com sucesso.");
      } else {
        setQuestionnaireIndex(next);
        setAnswers({});
        toast.success("Anamnese registrada. Continue para o próximo formulário.");
      }
    },
    onError: (error) => toast.error(error.message),
  });
  const requestBooking = trpc.agendamentoPublico.solicitar.useMutation({
    onSuccess: () => {
      sessionStorage.removeItem(bookingStorageKey);
      setStep(4);
      toast.success("Solicitação enviada para confirmação da clínica.");
    },
    onError: (error) => toast.error(error.message),
  });

  const pendingQuestionnaires = useMemo(() => (questionnairesQuery.data ?? []).filter((item) => !item.respondido), [questionnairesQuery.data]);
  const questionnaire = pendingQuestionnaires[questionnaireIndex];
  const services = optionsQuery.data?.servicos ?? [];
  const professionals = optionsQuery.data?.profissionais ?? [];
  const selectedService = services.find((service) => service.id === Number(selectedServiceId));
  const clinicName = clinicSettingsQuery.data?.nome ?? "SunSet";
  const clinicSlogan = clinicSettingsQuery.data?.slogan ?? "Seu cuidado, seu momento";
  const clinicLogo = clinicSettingsQuery.data?.logoUrl;
  const enabledProfessionalIds = useMemo(() => {
    const links = optionsQuery.data?.vinculosProfissionais ?? [];
    if (!selectedServiceId || !links.length) return new Set(professionals.map((professional) => professional.id));
    return new Set(links.filter((link) => link.servicoId === Number(selectedServiceId)).map((link) => link.profissionalId));
  }, [optionsQuery.data?.vinculosProfissionais, professionals, selectedServiceId]);
  const availableProfessionals = professionals.filter((professional) => enabledProfessionalIds.has(professional.id));
  const professionalsUnavailable = Boolean(selectedServiceId && !optionsQuery.isLoading && !optionsQuery.isError && availableProfessionals.length === 0);
  const appointmentStart = useMemo(() => selectedDate && selectedTime ? new Date(`${selectedDate}T${selectedTime}:00`) : null, [selectedDate, selectedTime]);
  const appointmentEnd = useMemo(() => appointmentStart && selectedService ? new Date(appointmentStart.getTime() + selectedService.duracaoMin * 60_000) : null, [appointmentStart, selectedService]);
  const availableSlots = availabilityQuery.data?.slots ?? [];
  const selectedTimeUnavailable = Boolean(selectedTime && !availableSlots.some((slot) => slot.hora === selectedTime));

  useEffect(() => {
    const primaryColor = clinicSettingsQuery.data?.corPrimaria;
    if (!primaryColor) return;
    document.documentElement.style.setProperty("--primary", primaryColor);
    document.documentElement.style.setProperty("--rose-500", primaryColor);
    document.documentElement.style.setProperty("--rose-600", primaryColor);
  }, [clinicSettingsQuery.data?.corPrimaria]);

  useEffect(() => {
    if (selectedProfessionalId && !enabledProfessionalIds.has(Number(selectedProfessionalId))) setSelectedProfessionalId("");
  }, [enabledProfessionalIds, selectedProfessionalId]);

  useEffect(() => {
    if (selectedTimeUnavailable) setSelectedTime("");
  }, [selectedTimeUnavailable]);

  useEffect(() => {
    if (bookingToken && questionnairesQuery.isSuccess && pendingQuestionnaires.length === 0) setStep((current) => current === 2 ? 3 : current);
  }, [bookingToken, pendingQuestionnaires.length, questionnairesQuery.isSuccess]);

  function updateAnswer(questionId: number, value: AnswerValue) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function submitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clinicaSlug) return;
    register.mutate({ ...registration, clinicaSlug });
  }

  function submitQuestionnaire(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookingToken || !questionnaire) return;
    const normalizedAnswers = questionnaire.perguntas.map((question) => {
      const value = answers[question.id];
      if (question.tipoResposta === "BOOLEAN" || question.tipoResposta === "TERMO_ACEITE") return { perguntaId: question.id, respostaBoolean: value === true };
      if (question.tipoResposta === "NUMERO") return { perguntaId: question.id, respostaNumero: typeof value === "string" ? value : undefined };
      if (question.tipoResposta === "DATA") return { perguntaId: question.id, respostaData: typeof value === "string" ? value : undefined };
      if (question.tipoResposta === "SELECAO_MULTIPLA") return { perguntaId: question.id, respostaJson: Array.isArray(value) ? JSON.stringify(value) : undefined };
      return { perguntaId: question.id, respostaTexto: typeof value === "string" ? value : undefined };
    });
    answerQuestionnaire.mutate({ token: bookingToken, questionarioId: questionnaire.id, declaracaoVeracidade: true, assinaturaDigital: signature, respostas: normalizedAnswers });
  }

  function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bookingToken || !appointmentStart || !selectedServiceId || !selectedProfessionalId) return;
    if (selectedTimeUnavailable) { toast.error("Esse horário não está mais disponível. Escolha outra opção."); return; }
    requestBooking.mutate({ token: bookingToken, servicoId: Number(selectedServiceId), profissionalId: Number(selectedProfessionalId), dataHoraInicio: appointmentStart, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  }

  if (!clinicaSlug) {
    return <main className="booking-shell">
      <header className="booking-header">
        <Link href="/" className="booking-back"><ArrowLeft aria-hidden="true" /> Área da clínica</Link>
        <span className="booking-secure"><ShieldCheck aria-hidden="true" /> Dados protegidos</span>
      </header>
      <section className="booking-layout">
        <Card className="booking-card">
          <CardHeader>
            <div className="success-icon" aria-hidden="true"><HeartPulse /></div>
            <CardTitle>Link de agendamento inválido</CardTitle>
            <CardDescription>
              Este endereço não corresponde a uma clínica válida. Use o link completo de agendamento enviado pela clínica
              (no formato <code>/agendar?clinica=nome-da-clinica</code>) ou entre em contato diretamente com a equipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/"><Button variant="outline">Voltar ao início</Button></Link>
          </CardContent>
        </Card>
      </section>
      <footer className="portal-footer"><BrandCredit /></footer>
    </main>;
  }

  return <main className="booking-shell">
    <header className="booking-header">
      <Link href="/" className="booking-back"><ArrowLeft aria-hidden="true" /> Área da clínica</Link>
      <div className="brand-lockup"><div className="brand-mark">{clinicLogo ? <img className="booking-clinic-logo" src={clinicLogo} alt="" /> : <Sparkles aria-hidden="true" />}</div><div className="brand-copy"><strong>{clinicName}</strong><span>Sistema SunSet · {clinicSlogan}</span></div></div>
      <span className="booking-secure"><ShieldCheck aria-hidden="true" /> Dados protegidos</span>
    </header>

    <section className="booking-hero">
      <div><p className="eyebrow">Autoagendamento</p><h1>Seu cuidado começa com uma escolha simples.</h1><p>Cadastre-se, responda à anamnese e envie sua solicitação de horário em poucos passos.</p></div>
      <div className="booking-hero-symbol" aria-hidden="true"><HeartPulse /></div>
    </section>

    <section className="booking-layout">
      <aside className="booking-sidebar"><BookingProgress step={step} /><div className="booking-help"><Clock3 aria-hidden="true" /><div><strong>Leveza em cada etapa</strong><span>O horário é solicitado e confirmado pela clínica após a análise da agenda.</span></div></div></aside>
      <div className="booking-content">
        {step === 1 && <Card className="booking-card">
          <CardHeader><p className="eyebrow">Etapa 1 de 4</p><CardTitle>Vamos criar seu cadastro</CardTitle><CardDescription>Usaremos apenas os dados necessários para identificar você, registrar a anamnese e enviar atualizações do seu atendimento.</CardDescription></CardHeader>
          <CardContent><form className="booking-form" onSubmit={submitRegistration}>
            <div className="booking-field full"><Label htmlFor="booking-name">Nome completo</Label><Input id="booking-name" value={registration.nome} onChange={(event) => setRegistration((current) => ({ ...current, nome: event.target.value }))} autoComplete="name" required /></div>
            <div className="booking-field"><Label htmlFor="booking-email">E-mail</Label><Input id="booking-email" type="email" value={registration.email} onChange={(event) => setRegistration((current) => ({ ...current, email: event.target.value }))} autoComplete="email" required /><small>Obrigatório para garantir o recebimento enquanto WhatsApp e SMS não estiverem ativos.</small></div>
            <div className="booking-field"><Label htmlFor="booking-phone">Celular com DDD</Label><Input id="booking-phone" inputMode="tel" value={registration.telefone} onChange={(event) => setRegistration((current) => ({ ...current, telefone: event.target.value }))} autoComplete="tel" required={registration.canalPreferido !== "EMAIL"} /></div>
            <fieldset className="booking-field full"><legend>Como você prefere receber atualizações?</legend><div className="channel-grid">{(Object.keys(channelCopy) as ContactChannel[]).map((channel) => { const copy = channelCopy[channel]; const Icon = copy.icon; return <label className={`channel-choice ${registration.canalPreferido === channel ? "is-selected" : ""}`} key={channel}><input type="radio" name="channel" value={channel} checked={registration.canalPreferido === channel} onChange={() => setRegistration((current) => ({ ...current, canalPreferido: channel }))} /><Icon aria-hidden="true" /><span><strong>{copy.label}</strong><small>{copy.description}</small></span></label>; })}</div><small className="channel-notice">O e-mail é o canal ativo no momento. Se você registrar WhatsApp ou SMS como preferência, a confirmação e o lembrete serão enviados por e-mail até que a clínica ative esses canais.</small></fieldset>
            <div className="booking-consents full"><label><Checkbox checked={registration.consentimentoDados} onCheckedChange={(checked) => setRegistration((current) => ({ ...current, consentimentoDados: checked === true }))} /><span>Li e autorizo o tratamento dos meus dados para cadastro, anamnese e gestão do atendimento.</span></label><label><Checkbox checked={registration.optInComunicacao} onCheckedChange={(checked) => setRegistration((current) => ({ ...current, optInComunicacao: checked === true }))} /><span>Autorizo comunicações sobre este agendamento pelo canal escolhido.</span></label></div>
            <Button type="submit" className="primary-action booking-submit" disabled={register.isPending}>{register.isPending ? "Criando cadastro..." : <>Continuar para a anamnese <ChevronRight aria-hidden="true" /></>}</Button>
          </form></CardContent>
        </Card>}

        {step === 2 && <Card className="booking-card">
          <CardHeader><p className="eyebrow">Etapa 2 de 4</p><CardTitle>Anamnese obrigatória</CardTitle><CardDescription>Suas respostas são registradas no prontuário e ajudam a equipe a conduzir o atendimento com segurança.</CardDescription></CardHeader>
          <CardContent>{questionnairesQuery.isLoading ? <p className="booking-loading">Carregando anamnese...</p> : questionnaire ? <form className="booking-form" onSubmit={submitQuestionnaire}><div className="questionnaire-heading"><span>{questionnaireIndex + 1} de {pendingQuestionnaires.length}</span><h2>{questionnaire.nome}</h2>{questionnaire.descricao && <p>{questionnaire.descricao}</p>}</div>{questionnaire.perguntas.map((question) => <QuestionField key={question.id} question={question} value={answers[question.id]} onChange={(value) => updateAnswer(question.id, value)} />)}<div className="booking-field full"><Label htmlFor="booking-signature">Assinatura digital</Label><Input id="booking-signature" value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="Digite seu nome completo" required /><small>Ao confirmar, você declara que as respostas são verdadeiras.</small></div><Button type="submit" className="primary-action booking-submit" disabled={answerQuestionnaire.isPending}>{answerQuestionnaire.isPending ? "Registrando..." : <>Confirmar anamnese <ChevronRight aria-hidden="true" /></>}</Button></form> : <div className="booking-empty"><ShieldCheck aria-hidden="true" /><h2>Não há anamnese pendente</h2><p>Você pode seguir para escolher o serviço e o horário.</p><Button className="primary-action" onClick={() => setStep(3)}>Continuar para o agendamento <ChevronRight aria-hidden="true" /></Button></div>}</CardContent>
        </Card>}

        {step === 3 && <Card className="booking-card">
          <CardHeader><p className="eyebrow">Etapa 3 de 4</p><CardTitle>Escolha sua solicitação</CardTitle><CardDescription>Selecione o serviço, o profissional e a melhor data e hora. A confirmação final é feita pela equipe SunSet.</CardDescription></CardHeader>
          <CardContent><form className="booking-form" onSubmit={submitBooking}>
            <div className="booking-field full"><Label>Serviço</Label><Select value={selectedServiceId} onValueChange={setSelectedServiceId}><SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger><SelectContent>{services.map((service) => <SelectItem key={service.id} value={String(service.id)}>{service.nome} · {service.duracaoMin} min · {money(service.valor)}</SelectItem>)}</SelectContent></Select>{selectedService && <small>{selectedService.descricao || `Duração prevista: ${selectedService.duracaoMin} minutos.`}</small>}</div>
            <div className="booking-field"><Label>Profissional</Label><Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId} disabled={!selectedServiceId || optionsQuery.isLoading || optionsQuery.isError || professionalsUnavailable}><SelectTrigger aria-describedby="booking-professional-help"><SelectValue placeholder={!selectedServiceId ? "Escolha primeiro o serviço" : optionsQuery.isLoading ? "Carregando equipe..." : optionsQuery.isError ? "Equipe indisponível" : professionalsUnavailable ? "Nenhum profissional disponível" : "Selecione o profissional"} /></SelectTrigger><SelectContent>{availableProfessionals.map((professional) => <SelectItem key={professional.id} value={String(professional.id)}>{professional.nome || "Profissional não identificado"}</SelectItem>)}</SelectContent></Select><small id="booking-professional-help" className={professionalsUnavailable || optionsQuery.isError ? "booking-selection-warning" : undefined}>{!selectedServiceId ? "Escolha um serviço para visualizar a equipe disponível." : optionsQuery.isLoading ? "Carregando profissionais habilitados para este serviço." : optionsQuery.isError ? "Não foi possível carregar a equipe. Atualize a página e tente novamente." : professionalsUnavailable ? "Ainda não há profissional ativo vinculado a este serviço. A clínica deve cadastrar um usuário com o perfil Profissional e vinculá-lo ao serviço antes de publicar horários." : "Selecione quem realizará o atendimento."}</small></div>
            <div className="booking-field"><Label htmlFor="booking-date">Data preferida</Label><Input id="booking-date" type="date" min={today()} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} required /></div>
            <div className="booking-field"><Label>Horário disponível</Label><Select value={selectedTime} onValueChange={setSelectedTime} disabled={!selectedProfessionalId || availabilityQuery.isFetching || availabilityQuery.isError || availableSlots.length === 0}><SelectTrigger><SelectValue placeholder={!selectedProfessionalId ? "Escolha um profissional" : availabilityQuery.isFetching ? "Buscando horários..." : availableSlots.length ? "Selecione um horário" : "Sem horários livres"} /></SelectTrigger><SelectContent>{availableSlots.map((slot) => <SelectItem key={slot.hora} value={slot.hora}>{slot.hora}</SelectItem>)}</SelectContent></Select><small>São exibidos horários sem conflito para a duração deste serviço.</small></div>
            <div className="booking-field booking-availability"><Label>Disponibilidade</Label><div className={`availability-note ${availabilityQuery.isFetching ? "is-loading" : availabilityQuery.isError || (!availabilityQuery.isFetching && selectedProfessionalId && availableSlots.length === 0) ? "is-busy" : ""}`}>{!selectedProfessionalId ? "Escolha um profissional para consultar a agenda." : availabilityQuery.isFetching ? "Buscando horários disponíveis..." : availabilityQuery.isError ? "Não foi possível consultar a agenda. Tente novamente." : availableSlots.length ? `${availableSlots.length} horários sem conflito nesta data.` : "Não há horários sem conflito nesta data."}</div></div>
            <Button type="submit" className="primary-action booking-submit" disabled={requestBooking.isPending || !selectedServiceId || !selectedProfessionalId || !selectedTime || selectedTimeUnavailable}>{requestBooking.isPending ? "Enviando solicitação..." : <>Solicitar agendamento <CalendarDays aria-hidden="true" /></>}</Button>
          </form></CardContent>
        </Card>}

        {step === 4 && <Card className="booking-card booking-success"><CardContent><div className="success-icon"><Check aria-hidden="true" /></div><p className="eyebrow">Solicitação registrada</p><h1>Recebemos seu pedido de agendamento.</h1><p>A equipe SunSet verificará a agenda e enviará a confirmação pelo canal que você escolheu. Se precisar ajustar alguma informação, entre em contato diretamente com a clínica.</p><Link href={`/agendar?clinica=${clinicaSlug}`}><Button variant="outline" onClick={() => { setStep(1); setBookingToken(null); setQuestionnaireIndex(0); }}>Fazer novo agendamento</Button></Link></CardContent></Card>}
      </div>
    </section>
    <footer className="booking-footer"><BrandCredit /></footer>
  </main>;
}

function QuestionField({ question, value, onChange }: { question: { id: number; texto: string; tipoResposta: string; opcoesJson: string | null; obrigatoria: boolean }; value: AnswerValue | undefined; onChange: (value: AnswerValue) => void }) {
  const options = parseOptions(question.opcoesJson);
  const label = <Label htmlFor={`question-${question.id}`}>{question.texto}{question.obrigatoria && <span className="required-mark"> *</span>}</Label>;
  if (question.tipoResposta === "TEXTO") return <div className="booking-field full">{label}<Textarea id={`question-${question.id}`} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} required={question.obrigatoria} /></div>;
  if (question.tipoResposta === "DATA") return <div className="booking-field">{label}<Input id={`question-${question.id}`} type="date" value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} required={question.obrigatoria} /></div>;
  if (question.tipoResposta === "NUMERO") return <div className="booking-field">{label}<Input id={`question-${question.id}`} type="number" inputMode="decimal" value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} required={question.obrigatoria} /></div>;
  if (question.tipoResposta === "SELECAO_UNICA") return <div className="booking-field full">{label}<Select value={typeof value === "string" ? value : ""} onValueChange={onChange} required={question.obrigatoria}><SelectTrigger id={`question-${question.id}`}><SelectValue placeholder="Selecione uma opção" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>;
  if (question.tipoResposta === "SELECAO_MULTIPLA") { const selected = Array.isArray(value) ? value : []; return <fieldset className="booking-field full"><legend>{question.texto}{question.obrigatoria && <span className="required-mark"> *</span>}</legend><div className="check-options">{options.map((option) => <label key={option}><Checkbox checked={selected.includes(option)} onCheckedChange={(checked) => onChange(checked === true ? [...selected, option] : selected.filter((item) => item !== option))} />{option}</label>)}</div></fieldset>; }
  const current = value === true ? "yes" : value === false ? "no" : "";
  return <fieldset className="booking-field full"><legend>{question.texto}{question.obrigatoria && <span className="required-mark"> *</span>}</legend><div className="radio-options"><label><input type="radio" name={`question-${question.id}`} value="yes" checked={current === "yes"} onChange={() => onChange(true)} required={question.obrigatoria} /> Sim</label><label><input type="radio" name={`question-${question.id}`} value="no" checked={current === "no"} onChange={() => onChange(false)} /> Não</label></div></fieldset>;
}
