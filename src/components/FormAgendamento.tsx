import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  BookOpen,
  AlertCircle,
  Search,
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
import { checkTimeOverlap, isValidAcademicDate } from "../utils/time";
import { ModalNegociacao } from "./ModalNegociacao";

// Funções utilitárias para conversão de dias da semana
const jsDayToDbDay = (dateStr: string) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.getDay() + 1; // JS 0=Dom => DB 1=Dom
};

const dbDayToString = (dbDay: number) => {
  const dias = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  return dias[dbDay - 1] || "";
};

// Mock fallback para ambiente de preview
const mockBlocos: BlocoHorario[] = [
  { id: "1", hora_inicio: "07:00", hora_fim: "07:50" },
  { id: "2", hora_inicio: "07:50", hora_fim: "08:40" },
  { id: "3", hora_inicio: "08:40", hora_fim: "09:30" },
  { id: "4", hora_inicio: "09:30", hora_fim: "10:20" },
  { id: "5", hora_inicio: "10:20", hora_fim: "11:10" },
  { id: "6", hora_inicio: "11:10", hora_fim: "12:00" },
  { id: "7", hora_inicio: "13:00", hora_fim: "13:50" },
  { id: "8", hora_inicio: "13:50", hora_fim: "14:40" },
  { id: "9", hora_inicio: "14:40", hora_fim: "15:30" },
  { id: "10", hora_inicio: "15:30", hora_fim: "16:20" },
  { id: "11", hora_inicio: "16:20", hora_fim: "17:10" },
  { id: "12", hora_inicio: "17:10", hora_fim: "18:00" },
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
  const [formData, setFormData] = useState({
    turma_id: "",
    componente_id: "",
    data_aula: "",
    bloco_horario_id: "",
    tema: "",
    local: "",
    metodologia: "",
    recursos: "",
    carga_horaria: 2,
  });

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Conflicting classes
  const [conflitoDetectado, setConflitoDetectado] = useState<
    (Aula & { professor?: Professor; turma?: { nome: string } }) | null
  >(null);
  const [showNegociacao, setShowNegociacao] = useState(false);

  // Tabelas da Matriz Curricular
  const [blocosHorario, setBlocosHorario] = useState<BlocoHorario[]>([]);
  const [gradePermitida, setGradePermitida] = useState<GradePadrao[]>([]);

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

  useEffect(() => {
    async function loadGrade() {
      if (!formData.turma_id || !formData.componente_id) {
        setGradePermitida([]);
        return;
      }
      if (import.meta.env.VITE_SUPABASE_URL === "YOUR_SUPABASE_URL") {
        setGradePermitida([
          {
            id: "g1",
            turma_id: formData.turma_id,
            componente_id: formData.componente_id,
            dia_semana: 3,
            bloco_horario_id: "2",
          }, // Terça 07:50
          {
            id: "g2",
            turma_id: formData.turma_id,
            componente_id: formData.componente_id,
            dia_semana: 3,
            bloco_horario_id: "3",
          }, // Terça 08:40
          {
            id: "g3",
            turma_id: formData.turma_id,
            componente_id: formData.componente_id,
            dia_semana: 5,
            bloco_horario_id: "4",
          }, // Quinta 09:30
        ]);
        return;
      }
      const { data } = await supabase
        .from("grade_padrao")
        .select("*")
        .eq("turma_id", formData.turma_id)
        .eq("componente_id", formData.componente_id);
      if (data) setGradePermitida(data);
    }
    loadGrade();
  }, [formData.turma_id, formData.componente_id]);

  const selectedDbDay = jsDayToDbDay(formData.data_aula);
  const diasPermitidosIds = Array.from(
    new Set(gradePermitida.map((g) => g.dia_semana)),
  ).sort();
  const isDataForaDaGrade =
    selectedDbDay &&
    diasPermitidosIds.length > 0 &&
    !diasPermitidosIds.includes(selectedDbDay);

  const blocosPermitidos = gradePermitida
    .filter((g) => g.dia_semana === selectedDbDay)
    .map((g) => g.bloco_horario_id);
  const horariosDisponiveis = blocosHorario.filter((b) =>
    blocosPermitidos.includes(b.id),
  );

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Resetar o horário do bloco se mudar componentes chave
      ...(name === "turma_id" ||
      name === "componente_id" ||
      name === "data_aula"
        ? { bloco_horario_id: "" }
        : {}),
    }));
    setErro(null);
    setConflitoDetectado(null);
  };

  const getHorariosByBloco = (bloco_id: string) => {
    const b = blocosHorario.find((b) => b.id === bloco_id);
    return b ? { hora_inicio: b.hora_inicio, hora_fim: b.hora_fim } : null;
  };

  const checkConflicts = async (hora_inicio: string, hora_fim: string) => {
    if (import.meta.env.VITE_SUPABASE_URL === "YOUR_SUPABASE_URL") {
      if (formData.data_aula === "2026-08-04" && hora_inicio === "07:50") {
        return {
          id: "mock_conflict_1",
          professor_id: "prof_2",
          turma_id: formData.turma_id,
          componente_id: formData.componente_id,
          data_aula: formData.data_aula,
          hora_inicio: hora_inicio,
          hora_fim: hora_fim,
          tema: "Anatomia I",
          professor: { id: "prof_2", nome: "Dra. Teste" },
          turma: {
            nome:
              turmas.find((t) => t.id === formData.turma_id)?.nome || "Turma T",
          },
        };
      }
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("aulas")
        .select(`*, professor:professores(nome), turma:turmas(nome)`)
        .eq("data_aula", formData.data_aula);

      if (error) throw error;

      if (data && data.length > 0) {
        const conflitos = data.filter((aula) => {
          const isSameTurmaOrProf =
            aula.turma_id === formData.turma_id ||
            aula.professor_id === usuarioAtual?.id;
          const isOverlapping = checkTimeOverlap(
            hora_inicio,
            hora_fim,
            aula.hora_inicio,
            aula.hora_fim,
          );
          return isSameTurmaOrProf && isOverlapping;
        });

        if (conflitos.length > 0) {
          return conflitos[0];
        }
      }
      return null;
    } catch (e: any) {
      console.error(e);
      throw new Error("Erro ao procurar conflitos.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioAtual) {
      setErro(
        "Selecione o professor atual (simulador de login) acima para agendar.",
      );
      return;
    }
    if (!isValidAcademicDate(formData.data_aula)) {
      setErro(
        "O calendário acadêmico 2026.2 só permite agendamentos entre 03/08/2026 e 19/12/2026.",
      );
      return;
    }
    if (isDataForaDaGrade) {
      setErro(
        `A matriz curricular não prevê este componente no dia selecionado. Dias permitidos: ${diasPermitidosIds.map(dbDayToString).join(", ")}.`,
      );
      return;
    }
    if (!formData.bloco_horario_id) {
      setErro("Selecione um bloco de horário disponível na grade.");
      return;
    }
    if (!formData.tema) {
      setErro('O campo "Tema" é obrigatório.');
      return;
    }

    const times = getHorariosByBloco(formData.bloco_horario_id);
    if (!times) return;

    setLoading(true);
    setErro(null);

    try {
      const conflito = await checkConflicts(times.hora_inicio, times.hora_fim);

      if (conflito) {
        setConflitoDetectado(conflito);
        setLoading(false);
        return;
      }

      if (import.meta.env.VITE_SUPABASE_URL !== "YOUR_SUPABASE_URL") {
        const { error: insertError } = await supabase.from("aulas").insert({
          professor_id: usuarioAtual.id,
          turma_id: formData.turma_id,
          componente_id: formData.componente_id,
          data_aula: formData.data_aula,
          hora_inicio: times.hora_inicio,
          hora_fim: times.hora_fim,
          tema: formData.tema,
          local: formData.local,
          metodologia: formData.metodologia,
          recursos: formData.recursos,
          carga_horaria: Number(formData.carga_horaria) || 0,
        });

        if (insertError) throw insertError;
      }

      setFormData((prev) => ({
        ...prev,
        tema: "",
        local: "",
        metodologia: "",
        recursos: "",
        bloco_horario_id: "",
      }));
      alert("Aula agendada com sucesso!");
      onSuccess();
    } catch (e: any) {
      setErro(e.message || "Ocorreu um erro ao salvar o agendamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col w-full">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        Novo Agendamento
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 flex-grow flex flex-col"
      >
        {erro && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{erro}</span>
          </div>
        )}

        {/* Info do Conflito */}
        {conflitoDetectado && (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-5 flex flex-col xl:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-200">
              <AlertCircle size={24} />
            </div>
            <div className="flex-grow text-center xl:text-left">
              <h3 className="text-red-900 font-bold text-lg leading-tight">
                Conflito de Horário
              </h3>
              <p className="text-red-700 text-sm mt-1 mb-3">
                A turma <b>{conflitoDetectado.turma?.nome}</b> já tem aula com{" "}
                <b>{conflitoDetectado.professor?.nome}</b> neste horário.
              </p>
              <div className="flex flex-wrap justify-center xl:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => setShowNegociacao(true)}
                  className="bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  Negociar Horário
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 flex-grow">
          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase">
              Turma
            </label>
            <select
              required
              name="turma_id"
              value={formData.turma_id}
              onChange={handleInputChange}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Selecione a turma...</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase">
              Componente Curricular
            </label>
            <select
              required
              name="componente_id"
              value={formData.componente_id}
              onChange={handleInputChange}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              disabled={!formData.turma_id}
            >
              <option value="">Selecione o componente...</option>
              {componentes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.sigla} - {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid grid-cols-1 gap-1.5">
              <label
                className={`text-[11px] font-bold uppercase ${isDataForaDaGrade ? "text-red-500" : "text-slate-400"}`}
              >
                Data da Aula
              </label>
              <input
                type="date"
                required
                name="data_aula"
                value={formData.data_aula}
                onChange={handleInputChange}
                min="2026-08-03"
                max="2026-12-19"
                disabled={!formData.componente_id}
                className={`w-full p-2.5 bg-slate-50 border ${isDataForaDaGrade ? "border-red-300" : "border-slate-200"} rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60`}
              />
              {isDataForaDaGrade && (
                <p className="text-[10px] text-red-600 font-medium">
                  Fora da grade! Use:{" "}
                  {diasPermitidosIds.map(dbDayToString).join(", ")}
                </p>
              )}
              {formData.componente_id &&
                !formData.data_aula &&
                gradePermitida.length > 0 && (
                  <p className="text-[10px] text-slate-500 font-medium">
                    Dias permitidos:{" "}
                    {diasPermitidosIds.map(dbDayToString).join(", ")}
                  </p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">
                Horário Permitido
              </label>
              <select
                required
                name="bloco_horario_id"
                value={formData.bloco_horario_id}
                onChange={handleInputChange}
                disabled={!formData.data_aula || isDataForaDaGrade}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              >
                <option value="">
                  {horariosDisponiveis.length === 0
                    ? "Sem horários"
                    : "Selecione o bloco..."}
                </option>
                {horariosDisponiveis.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.hora_inicio} - {b.hora_fim}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase">
              Tema da Aula *
            </label>
            <input
              type="text"
              required
              name="tema"
              value={formData.tema}
              onChange={handleInputChange}
              placeholder="Ex: Sistema Cardiovascular"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid grid-cols-1 gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">
                Sala / Local (Opc.)
              </label>
              <input
                type="text"
                name="local"
                value={formData.local}
                onChange={handleInputChange}
                placeholder="Ex: Laboratório"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">
                Metodologia (Opc.)
              </label>
              <input
                type="text"
                name="metodologia"
                value={formData.metodologia}
                onChange={handleInputChange}
                placeholder="Ex: Prática"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !!conflitoDetectado || isDataForaDaGrade}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow-md transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Verificando Disponibilidade..."
            : "Verificar e Salvar Agendamento"}
        </button>
      </form>

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
    </div>
  );
}
