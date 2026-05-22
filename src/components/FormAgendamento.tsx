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
import { format, isSameMonth, isBefore, startOfDay, getDay } from "date-fns";
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
  } | null>(null);
  const [conflitoDetectado, setConflitoDetectado] = useState<
    (Aula & { professor?: Professor; turma?: { nome: string } }) | null
  >(null);
  const [showNegociacao, setShowNegociacao] = useState(false);

  // Load Blocos
  useEffect(() => {
    async function loadBlocos() {
      if (import.meta.env.VITE_SUPABASE_URL === "YOUR_SUPABASE_URL") {
        setBlocosHorario(mockBlocos);
        return;
      }
      const { data } = await supabase
        .from("blocos_horario")
        .select("*")
        .order("hora_inicio");
      if (data) setBlocosHorario(data);
    }
    loadBlocos();
  }, []);

  // Load Grade & Aulas based on Selection
  useEffect(() => {
    async function loadGrade() {
      if (!turmaId || !componenteId) {
        setGradePermitida([]);
        setAulasCadastradas([]);
        return;
      }
      if (import.meta.env.VITE_SUPABASE_URL === "YOUR_SUPABASE_URL") {
        setGradePermitida([
          {
            id: 1,
            turma_id: turmaId as number,
            componente_id: componenteId as number,
            dia_semana: 3,
            bloco_horario_id: 2,
          }, // Terça 07:50
          {
            id: 2,
            turma_id: turmaId as number,
            componente_id: componenteId as number,
            dia_semana: 3,
            bloco_horario_id: 3,
          }, // Terça 08:40
          {
            id: 3,
            turma_id: turmaId as number,
            componente_id: componenteId as number,
            dia_semana: 5,
            bloco_horario_id: 4,
          }, // Quinta 09:30
        ]);
        setAulasCadastradas([]); // Add mock conflicting aula here if needed
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

  const onSelectSlot = (date: Date, blocoId: number) => {
    if (!usuarioAtual) {
      alert(
        "Selecione seu perfil de professor no topo da página antes de agendar.",
      );
      return;
    }
    const bloco = blocosHorario.find((b) => b.id === blocoId);
    if (bloco) setSelectedSlot({ date, bloco });
  };

  const handleSaveAgendamento = async (
    tema: string,
    local: string,
    metodologia: string,
    recursos: string,
  ) => {
    if (!selectedSlot || !usuarioAtual) return;

    const dateStr = format(selectedSlot.date, "yyyy-MM-dd");

    // 1. Check for Conflicts
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
      setSelectedSlot(null); // Close the agendamento modal
      return; // Force stop. ModalAgendamento catches standard errors, but conflitos is special.
    }

    // 2. Insert into DB
    if (import.meta.env.VITE_SUPABASE_URL !== "YOUR_SUPABASE_URL") {
      const { error } = await supabase.from("aulas").insert({
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
        carga_horaria: 1, // Ou baseado na diferenca de tempo
      });

      if (error) throw error;
    }

    alert("Aula agendada com sucesso!");
    setSelectedSlot(null);
    onSuccess();
    // Refresh aulas
    const [aulasRes] = await Promise.all([
      supabase
        .from("aulas")
        .select("*, professor:professores(nome), turma:turmas(nome)"),
    ]);
    if (aulasRes.data) setAulasCadastradas(aulasRes.data);
  };

  const periodoInicio = new Date("2026-08-01T00:00:00");
  const periodoFim = new Date("2026-12-31T23:59:59");
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
            onChange={(e) => setTurmaId(e.target.value ? Number(e.target.value) : "")}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-shadow"
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
            onChange={(e) => setComponenteId(e.target.value ? Number(e.target.value) : "")}
            disabled={!turmaId}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-shadow disabled:opacity-50"
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
                className="bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-red-700 transition"
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
                Selecione uma Data
              </h3>
              <p className="text-xs font-medium text-blue-700 mt-1 opacity-80">
                A matriz limitou as datas e horários abaixo para{" "}
                <b>
                  {turmaNome} ({componenteNome})
                </b>
                .
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-200"></div>{" "}
                Fora da Matriz
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-100 border border-blue-300"></div>{" "}
                Horário Livre
              </span>
            </div>
          </div>

          <div
            className="overflow-y-auto pr-2 pb-4 space-y-8 flex-grow custom-scrollbar"
            style={{ maxHeight: "600px" }}
          >
            {meses.map((mes, idx) => {
              // Preenche os espaços no inicio do mês no calendário
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
                          className={`min-h-[80px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border ${isPast ? "border-slate-200 bg-slate-50" : "border-blue-200 bg-blue-50"} flex flex-col gap-1 transition-all`}
                        >
                          <div
                            className={`text-xs ml-1 font-bold ${isPast ? "text-slate-400" : "text-blue-900"}`}
                          >
                            {format(dia, "d")}
                          </div>
                          <div className="flex flex-col gap-1 flex-grow">
                            {allowedBlocos.map((bId) => {
                              const b = blocosHorario.find((x) => x.id === bId);
                              if (!b) return null;

                              const dateStr = format(dia, "yyyy-MM-dd");
                              // Verifica se ESTE horário já foi agendado para esta turma (ou professor)
                              const agendadoParaMim = aulasCadastradas.find(
                                (a) =>
                                  a.data_aula === dateStr &&
                                  checkTimeOverlap(
                                    a.hora_inicio,
                                    a.hora_fim,
                                    b.hora_inicio,
                                    b.hora_fim,
                                  ),
                              );

                              const isBlocked = !!agendadoParaMim;

                              return (
                                <button
                                  key={bId}
                                  title={
                                    isBlocked
                                      ? `Agendado por ${agendadoParaMim?.professor?.nome}`
                                      : "Disponível"
                                  }
                                  onClick={() =>
                                    !isPast &&
                                    !isBlocked &&
                                    onSelectSlot(dia, b.id)
                                  }
                                  disabled={isPast || isBlocked} // Cannot book in the past or if already block
                                  className={`w-full text-center py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all ${
                                    isBlocked
                                      ? "bg-red-100 text-red-600 cursor-not-allowed opacity-80"
                                      : isPast
                                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                        : "bg-white text-blue-700 shadow-sm hover:shadow hover:-translate-y-0.5 hover:bg-blue-600 hover:text-white border border-blue-100"
                                  }`}
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
            Selecione sua turma e o componente curricular da matriz para
            visualizar a agenda de 2026.2 disponível para você.
          </p>
        </div>
      )}

      {/* Modal Interativo de Conclusão do Agendamento */}
      {selectedSlot && (
        <ModalAgendamento
          dataAgendamento={selectedSlot.date}
          blocoDisponivel={selectedSlot.bloco}
          turmaNome={turmaNome}
          componenteNome={componenteNome}
          onClose={() => setSelectedSlot(null)}
          onSave={handleSaveAgendamento}
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
