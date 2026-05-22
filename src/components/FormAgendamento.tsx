import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  XCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  Professor,
  Turma,
  Componente,
  Aula,
  GradePadrao,
  BlocoHorario,
} from "../types";
import { checkTimeOverlap } from "../utils/time";
import { ModalNegociacao } from "./ModalNegociacao";
import { ModalAgendamento } from "./ModalAgendamento";
import { getCalendarMonths } from "../utils/calendar";
import { format, isBefore, startOfDay, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const jsDayToDbDay = (date: Date) => date.getDay() + 1; // JS 0=Dom => DB 1=Dom

const mockBlocos: BlocoHorario[] = [
  { id: 1, hora_inicio: "07:00", hora_fim: "07:50" },
  { id: 2, hora_inicio: "07:50", hora_fim: "08:40" },
  { id: 3, hora_inicio: "08:40", hora_fim: "09:30" },
  { id: 4, hora_inicio: "09:30", hora_fim: "10:20" },
  { id: 5, hora_inicio: "10:20", hora_fim: "11:10" },
  { id: 6, hora_inicio: "11:10", hora_fim: "12:00" },
  { id: 7, hora_inicio: "13:00", hora_fim: "13:50" },
  { id: 8, hora_inicio: "13:50", hora_fim: "14:40" },
  { id: 9, hora_inicio: "14:40", hora_fim: "15:30" },
  { id: 10, hora_inicio: "15:30", hora_fim: "16:20" },
  { id: 11, hora_inicio: "16:20", hora_fim: "17:10" },
  { id: 12, hora_inicio: "17:10", hora_fim: "18:00" },
];

interface FormAgendamentoProps {
  usuarioAtual: Professor | null;
  turmas: Turma[];
  componentes: Componente[];
  onSuccess: () => void;
}

export function FormAgendamento({
  usuarioAtual,
  turmas,
  componentes,
  onSuccess,
}: FormAgendamentoProps) {
  const [turmaId, setTurmaId] = useState<number | "">("");
  const [componenteId, setComponenteId] = useState<number | "">("");

  const [blocosHorario, setBlocosHorario] = useState<BlocoHorario[]>([]);
  const [gradePermitida, setGradePermitida] = useState<GradePadrao[]>([]);
  const [aulasCadastradas, setAulasCadastradas] = useState<Aula[]>([]);

  // Modals state
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    bloco: BlocoHorario;
    aulaExistente?: Aula | null;
  } | null>(null);
  const [conflitoDetectado, setConflitoDetectado] = useState<
    (Aula & { professor?: Professor; turma?: { nome: string } }) | null
  >(null);
  const [showNegociacao, setShowNegociacao] = useState(false);

  // Load Blocos and initial classes
  useEffect(() => {
    async function loadBlocosAndAulas() {
      // Load blocks
      if (import.meta.env.VITE_SUPABASE_URL === "YOUR_SUPABASE_URL") {
        setBlocosHorario(mockBlocos);
        
        // Seed default scheduled classes for the simulation mode
        setAulasCadastradas([
          {
            id: 11,
            professor_id: 1, // Dr. João Medeiros
            turma_id: 1, // P2A (turmaId === 1)
            componente_id: 1, // CNM (componenteId === 1)
            data_aula: "2026-08-04", // Terça-feira (dia_semana === 3)
            hora_inicio: "07:50",
            hora_fim: "08:40",
            tema: "Anatomia do Sistema Nervoso Central",
            local: "Laboratório de Anatomia 1",
            metodologia: "Atividade Prática em Roteiro",
            recursos: "Peças anatômicas sintéticas e cadáveres",
            carga_horaria: 1,
          },
          {
            id: 12,
            professor_id: 2, // Dra. Maria Silva
            turma_id: 1, // P2A (turmaId === 1)
            componente_id: 2, // APSC-II
            data_aula: "2026-08-06", // Quinta-feira
            hora_inicio: "09:30",
            hora_fim: "10:20",
            tema: "Atendimento de Atenção Básica",
            local: "Auditório das Clínicas",
            metodologia: "TBL - Aprendizagem Baseada em Equipes",
            recursos: "Projetor e Apostilas",
            carga_horaria: 1,
          },
        ]);
        return;
      }

      const { data } = await supabase
        .from("blocos_horario")
        .select("*")
        .order("hora_inicio");
      if (data) setBlocosHorario(data);

      const { data: dataAulas } = await supabase
        .from("aulas")
        .select("*, professor:professores(nome), turma:turmas(nome)");
      if (dataAulas) setAulasCadastradas(dataAulas);
    }
    loadBlocosAndAulas();
  }, []);

  // Load Grade matrix based on Selection
  useEffect(() => {
    async function loadGrade() {
      if (!turmaId || !componenteId) {
        setGradePermitida([]);
        return;
      }
      if (import.meta.env.VITE_SUPABASE_URL === "YOUR_SUPABASE_URL") {
        setGradePermitida([
          {
            id: 1,
            turma_id: turmaId as number,
            componente_id: componenteId as number,
            dia_semana: 3, // Terça
            bloco_horario_id: 2, // 07:50
          },
          {
            id: 2,
            turma_id: turmaId as number,
            componente_id: componenteId as number,
            dia_semana: 3, // Terça
            bloco_horario_id: 3, // 08:40
          },
          {
            id: 3,
            turma_id: turmaId as number,
            componente_id: componenteId as number,
            dia_semana: 5, // Quinta
            bloco_horario_id: 4, // 09:30
          },
        ]);
        return;
      }

      const [gradeRes, aulasRes] = await Promise.all([
        supabase
          .from("grade_padrao")
          .select("*")
          .eq("turma_id", turmaId)
          .eq("componente_id", componenteId),
        supabase
          .from("aulas")
          .select("*, professor:professores(nome), turma:turmas(nome)"),
      ]);

      if (gradeRes.data) setGradePermitida(gradeRes.data);
      if (aulasRes.data) setAulasCadastradas(aulasRes.data);
    }
    loadGrade();
  }, [turmaId, componenteId]);

  const handleSaveAgendamento = async (
    tema: string,
    local: string,
    metodologia: string,
    recursos: string,
  ) => {
    if (!selectedSlot || !usuarioAtual) return;

    const dateStr = format(selectedSlot.date, "yyyy-MM-dd");

    if (selectedSlot.aulaExistente) {
      // ----------------- UPDATE MODE -----------------
      if (import.meta.env.VITE_SUPABASE_URL === "YOUR_SUPABASE_URL") {
        // Simulated local list update
        setAulasCadastradas((prev) =>
          prev.map((a) =>
            a.id === selectedSlot.aulaExistente!.id
              ? { ...a, tema, local, metodologia, recursos }
              : a,
          ),
        );
      } else {
        const { error } = await (supabase.from("aulas") as any)
          .update({
            tema,
            local,
            metodologia,
            recursos,
          })
          .eq("id", selectedSlot.aulaExistente.id);

        if (error) throw error;
      }
      alert("Agendamento atualizado com sucesso!");
    } else {
      // ----------------- INSERT MODE -----------------
      // Check for conflicts
      const conflitos = aulasCadastradas.filter((aula) => {
        const isSameDate = aula.data_aula === dateStr;
        const isSameTurmaOrProf =
          aula.turma_id === turmaId || aula.professor_id === usuarioAtual.id;
        const isOverlapping = checkTimeOverlap(
          selectedSlot.bloco.hora_inicio,
          selectedSlot.bloco.hora_fim,
          aula.hora_inicio,
          aula.hora_fim,
        );
        return isSameDate && isSameTurmaOrProf && isOverlapping;
      });

      if (conflitos.length > 0) {
        setConflitoDetectado(conflitos[0] as any);
        setSelectedSlot(null);
        return;
      }

      if (import.meta.env.VITE_SUPABASE_URL === "YOUR_SUPABASE_URL") {
        // Simulated local list insertion
        const newAula: Aula = {
          id: Date.now(),
          professor_id: usuarioAtual.id,
          turma_id: turmaId as number,
          componente_id: componenteId as number,
          data_aula: dateStr,
          hora_inicio: selectedSlot.bloco.hora_inicio,
          hora_fim: selectedSlot.bloco.hora_fim,
          tema,
          local,
          metodologia,
          recursos,
          carga_horaria: 1,
        };
        setAulasCadastradas((prev) => [...prev, newAula]);
      } else {
        const { error } = await (supabase.from("aulas") as any).insert({
          professor_id: usuarioAtual.id,
          turma_id: turmaId,
          componente_id: componenteId,
          data_aula: dateStr,
          hora_inicio: selectedSlot.bloco.hora_inicio,
          hora_fim: selectedSlot.bloco.hora_fim,
          tema,
          local,
          metodologia,
          recursos,
          carga_horaria: 1,
        });

        if (error) throw error;
      }
      alert("Aula agendada com sucesso!");
    }

    setSelectedSlot(null);
    onSuccess();

    // Re-load list of classes if not simulation
    if (import.meta.env.VITE_SUPABASE_URL !== "YOUR_SUPABASE_URL") {
      const { data: dataAulas } = await supabase
        .from("aulas")
        .select("*, professor:professores(nome), turma:turmas(nome)");
      if (dataAulas) setAulasCadastradas(dataAulas);
    }
  };

  const handleDeleteAgendamento = async () => {
    if (!selectedSlot || !selectedSlot.aulaExistente || !usuarioAtual) return;

    if (import.meta.env.VITE_SUPABASE_URL === "YOUR_SUPABASE_URL") {
      // Simulated local list deletion
      setAulasCadastradas((prev) =>
        prev.filter((a) => a.id !== selectedSlot.aulaExistente!.id),
      );
    } else {
      const { error } = await (supabase.from("aulas") as any)
        .delete()
        .eq("id", selectedSlot.aulaExistente.id);

      if (error) throw error;
    }

    alert("Aula excluída com sucesso!");
    setSelectedSlot(null);
    onSuccess();

    // Re-load list of classes if not simulation
    if (import.meta.env.VITE_SUPABASE_URL !== "YOUR_SUPABASE_URL") {
      const { data: dataAulas } = await supabase
        .from("aulas")
        .select("*, professor:professores(nome), turma:turmas(nome)");
      if (dataAulas) setAulasCadastradas(dataAulas);
    }
  };

  const meses = getCalendarMonths("2026-08-01", "2026-12-31");
  const diasSemanasLetras = ["D", "S", "T", "Q", "Q", "S", "S"];

  const getDayMetadata = (date: Date) => {
    const isAcademic =
      date >= new Date("2026-08-03T00:00:00") &&
      date <= new Date("2026-12-19T23:59:59");
    if (!isAcademic) return { valid: false, allowedBlocos: [] };

    const dbDay = jsDayToDbDay(date);
    const rules = gradePermitida.filter((g) => g.dia_semana === dbDay);
    if (rules.length === 0) return { valid: false, allowedBlocos: [] };

    return {
      valid: true,
      allowedBlocos: rules.map((r) => r.bloco_horario_id),
    };
  };

  const turmaNome = turmas.find((t) => t.id === turmaId)?.nome || "";
  const componenteNome =
    componentes.find((c) => c.id === componenteId)?.nome || "";

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col w-full h-full">
      <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
        <CalendarIcon className="w-5 h-5 text-blue-600" />
        Novo Agendamento Visual
      </h2>

      {/* Passo 1: Seleção de Turma e Componente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-100">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase">
            Turma
          </label>
          <select
            value={turmaId}
            onChange={(e) =>
              setTurmaId(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-shadow cursor-pointer"
          >
            <option value="">Selecione a turma...</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase">
            Componente Curricular
          </label>
          <select
            value={componenteId}
            onChange={(e) =>
              setComponenteId(e.target.value ? Number(e.target.value) : "")
            }
            disabled={!turmaId}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-shadow disabled:opacity-50 cursor-pointer"
          >
            <option value="">Selecione o componente...</option>
            {componentes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.sigla} - {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conflito Detectado Error State (Main Screen) */}
      {conflitoDetectado && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-5 mb-6 flex flex-col xl:flex-row items-center gap-4 animate-in fade-in zoom-in-95">
          <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-200">
            <XCircle size={24} />
          </div>
          <div className="flex-grow text-center xl:text-left">
            <h3 className="text-red-900 font-bold text-lg leading-tight">
              Choque de Horários
            </h3>
            <p className="text-red-700 text-sm mt-1 mb-3">
              Ops! O professor <b>{conflitoDetectado.professor?.nome}</b> já
              agendou a turma <b>{conflitoDetectado.turma?.nome}</b> para o dia{" "}
              {conflitoDetectado.data_aula} ({conflitoDetectado.hora_inicio} -{" "}
              {conflitoDetectado.hora_fim}).
            </p>
            <div className="flex flex-wrap justify-center xl:justify-start gap-3">
              <button
                onClick={() => setShowNegociacao(true)}
                className="bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-red-700 transition shadow-md shadow-red-200"
              >
                Negociar Troca via Chatbot
              </button>
              <button
                onClick={() => setConflitoDetectado(null)}
                className="bg-white border border-red-300 text-red-700 text-xs font-bold px-4 py-2 rounded-xl hover:bg-red-50 transition"
              >
                Voltar e Escolher Outro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passo 2: Calendário Visual */}
      {turmaId && componenteId && gradePermitida.length === 0 ? (
        <div className="bg-orange-50 border border-orange-100 text-orange-800 p-4 rounded-2xl text-sm font-medium flex items-center justify-center text-center">
          Esta combinação turma/componente não possui horários cadastrados na
          matriz (grade_padrao).
        </div>
      ) : turmaId && componenteId ? (
        <div className="flex-grow flex flex-col">
          <div className="bg-blue-50/50 rounded-2xl p-4 mb-4 border border-blue-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-blue-900 leading-none">
                Selecione uma Data no Calendário
              </h3>
              <p className="text-xs font-medium text-blue-700 mt-1 opacity-85">
                Clique sobre os chips de horários destacados abaixo para propor ou editar o agendamento de{" "}
                <b>
                  {turmaNome} ({componenteNome})
                </b>
                .
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-200"></div>{" "}
                Fora da Matriz
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white border border-blue-300"></div>{" "}
                Livre
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>{" "}
                Sua Aula
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>{" "}
                Indisponível
              </span>
            </div>
          </div>

          <div
            className="overflow-y-auto pr-2 pb-4 space-y-8 flex-grow custom-scrollbar"
            style={{ maxHeight: "600px" }}
          >
            {meses.map((mes, idx) => {
              // Preenche os espaços do inicio do mês no calendário
              const firstDayOfWeek = getDay(mes.month); // 0 = Domingo
              const emptyDays = Array.from({ length: firstDayOfWeek }).fill(
                null,
              );

              return (
                <div key={idx} className="bg-white">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    {format(mes.month, "MMMM yyyy", { locale: ptBR })}
                    <div className="h-px bg-slate-100 flex-grow ml-2"></div>
                  </h3>

                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {/* Headers (D S T Q Q S S) */}
                    {diasSemanasLetras.map((d, i) => (
                      <div
                        key={i}
                        className="text-center text-[10px] font-black text-slate-300 py-2"
                      >
                        {d}
                      </div>
                    ))}

                    {/* Empty Slots */}
                    {emptyDays.map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="p-2 border border-transparent"
                      ></div>
                    ))}

                    {/* Mes Days */}
                    {mes.days.map((dia, dIdx) => {
                      const { valid, allowedBlocos } = getDayMetadata(dia);
                      const isPast = isBefore(dia, startOfDay(new Date()));

                      if (!valid) {
                        return (
                          <div
                            key={dIdx}
                            className="aspect-square flex items-center justify-center rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/50 text-slate-300 text-sm font-medium"
                          >
                            {format(dia, "d")}
                          </div>
                        );
                      }

                      // It is valid and allowed in the matrix. Render the day block with available time chips.
                      return (
                        <div
                          key={dIdx}
                          className={`min-h-[85px] p-2.5 rounded-2xl border ${
                            isPast
                              ? "border-slate-200 bg-slate-50"
                              : "border-blue-100 bg-blue-50/20"
                          } flex flex-col gap-1.5 transition-all`}
                        >
                          <div
                            className={`text-xs ml-1 font-bold ${
                              isPast ? "text-slate-400" : "text-blue-900"
                            }`}
                          >
                            {format(dia, "d")}
                          </div>
                          <div className="flex flex-col gap-1.5 flex-grow">
                            {allowedBlocos.map((bId) => {
                              const b = blocosHorario.find((x) => x.id === bId);
                              if (!b) return null;

                              const dateStr = format(dia, "yyyy-MM-dd");
                              const aulasNoHorario = aulasCadastradas.filter(
                                (a) =>
                                  a.data_aula === dateStr &&
                                  checkTimeOverlap(
                                    a.hora_inicio,
                                    a.hora_fim,
                                    b.hora_inicio,
                                    b.hora_fim,
                                  ),
                              );

                              // 1. "Sua Aula Agendada" (camada atual: mesma turma e componente)
                              const agendadaNaCamadaAtual = aulasNoHorario.find(
                                (a) =>
                                  a.turma_id === turmaId &&
                                  a.componente_id === componenteId,
                              );

                              // 2. Conflitos de Bloqueio
                              const conflitoProfessorOutraTurma = aulasNoHorario.find(
                                (a) =>
                                  a.professor_id === usuarioAtual?.id &&
                                  a.turma_id !== turmaId,
                              );

                              const conflitoTurmaOutroPrfComp = aulasNoHorario.find(
                                (a) =>
                                  a.turma_id === turmaId &&
                                  (a.professor_id !== usuarioAtual?.id ||
                                    a.componente_id !== componenteId),
                              );

                              const isBlocked =
                                !agendadaNaCamadaAtual &&
                                (!!conflitoProfessorOutraTurma ||
                                  !!conflitoTurmaOutroPrfComp);

                              // Determine button styles based on status
                              let btnClass = "";
                              let tooltipText = "Disponível";

                              if (agendadaNaCamadaAtual) {
                                btnClass =
                                  "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-100 border border-emerald-500 scale-105";
                                tooltipText = `Sua Aula Agendada: ${agendadaNaCamadaAtual.tema || "Tema não definido"}`;
                              } else if (isBlocked) {
                                if (conflitoProfessorOutraTurma) {
                                  btnClass =
                                    "bg-rose-100 text-rose-700 border border-rose-200 cursor-not-allowed opacity-80";
                                  tooltipText = `Você já ministra aula nesta hora na turma: ${conflitoProfessorOutraTurma.turma?.nome || "Outra Turma"}`;
                                } else {
                                  const profNome =
                                    conflitoTurmaOutroPrfComp?.professor?.nome ||
                                    "Outro Professor";
                                  btnClass =
                                    "bg-rose-100 text-rose-700 border border-rose-200 cursor-not-allowed opacity-80";
                                  tooltipText = `Horário ocupado por Prof. ${profNome}`;
                                }
                              } else if (isPast) {
                                btnClass =
                                  "bg-slate-200 text-slate-500 cursor-not-allowed";
                                tooltipText = "Horário acadêmico passado";
                              } else {
                                btnClass =
                                  "bg-white text-blue-700 hover:bg-blue-650 hover:bg-blue-600 hover:text-white border border-blue-100 shadow-sm hover:shadow active:scale-95 hover:-translate-y-0.5";
                              }

                              return (
                                <button
                                  key={bId}
                                  title={tooltipText}
                                  onClick={() => {
                                    if (isPast) return;
                                    if (agendadaNaCamadaAtual) {
                                      setSelectedSlot({
                                        date: dia,
                                        bloco: b,
                                        aulaExistente: agendadaNaCamadaAtual,
                                      });
                                    } else if (!isBlocked) {
                                      setSelectedSlot({
                                        date: dia,
                                        bloco: b,
                                        aulaExistente: null,
                                      });
                                    }
                                  }}
                                  disabled={isPast || (!agendadaNaCamadaAtual && isBlocked)}
                                  className={`w-full text-center py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all ${btnClass}`}
                                >
                                  {b.hora_inicio}{" "}
                                  <span className="hidden sm:inline">
                                    - {b.hora_fim}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
          <CalendarIcon className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium text-sm max-w-sm">
            Selecione uma turma e o componente curricular da matriz padrão para
            visualizar a agenda de 2026.2 disponível para você.
          </p>
        </div>
      )}

      {/* Modal Interativo de Agendamento (Criação e Edição/Exclusão) */}
      {selectedSlot && (
        <ModalAgendamento
          dataAgendamento={selectedSlot.date}
          blocoDisponivel={selectedSlot.bloco}
          turmaNome={turmaNome}
          componenteNome={componenteNome}
          aulaExistente={selectedSlot.aulaExistente}
          onClose={() => setSelectedSlot(null)}
          onSave={handleSaveAgendamento}
          onDelete={handleDeleteAgendamento}
        />
      )}

      {/* Modal de Negociação do Chat (Conflito Server Side) */}
      {showNegociacao && conflitoDetectado && usuarioAtual && (
        <ModalNegociacao
          conflito={conflitoDetectado}
          usuarioAtualId={usuarioAtual.id}
          onClose={() => setShowNegociacao(false)}
          onSuccess={() => {
            setShowNegociacao(false);
            setConflitoDetectado(null);
          }}
        />
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `,
        }}
      />
    </div>
  );
}
