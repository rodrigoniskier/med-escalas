import React, { useState } from "react";
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  BookOpen,
  User,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BlocoHorario } from "../types";

interface ModalAgendamentoProps {
  dataAgendamento: Date;
  blocoDisponivel: BlocoHorario;
  turmaNome: string;
  componenteNome: string;
  onClose: () => void;
  onSave: (
    tema: string,
    local: string,
    metodologia: string,
    recursos: string,
  ) => Promise<void>;
}

export function ModalAgendamento({
  dataAgendamento,
  blocoDisponivel,
  turmaNome,
  componenteNome,
  onClose,
  onSave,
}: ModalAgendamentoProps) {
  const [tema, setTema] = useState("");
  const [local, setLocal] = useState("");
  const [metodologia, setMetodologia] = useState("");
  const [recursos, setRecursos] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const handleSave = async () => {
    if (!tema.trim()) {
      setErro("O tema da aula é obrigatório.");
      return;
    }
    setLoading(true);
    setErro("");
    try {
      await onSave(tema, local, metodologia, recursos);
    } catch (e: any) {
      setErro(e.message || "Erro ao realizar o agendamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Detalhes da Aula
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col gap-2">
            <div className="font-semibold text-blue-900 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              {format(dataAgendamento, "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-blue-800 font-medium">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 opacity-70" />{" "}
                {blocoDisponivel.hora_inicio} às {blocoDisponivel.hora_fim}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 opacity-70" /> {turmaNome}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 opacity-70" /> {componenteNome}
              </span>
            </div>
          </div>

          {erro && (
            <p className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
              {erro}
            </p>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">
                Tema Principal *
              </label>
              <input
                autoFocus
                type="text"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ex: Introdução ao Sistema Imune"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase">
                Sala / Local (Opcional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  placeholder="Ex: Sala 204 ou Laboratório 01"
                  className="w-full p-3 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase">
                  Metodologia (Opcional)
                </label>
                <input
                  type="text"
                  value={metodologia}
                  onChange={(e) => setMetodologia(e.target.value)}
                  placeholder="Ex: Expositiva, TBL..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase">
                  Recursos (Opcional)
                </label>
                <input
                  type="text"
                  value={recursos}
                  onChange={(e) => setRecursos(e.target.value)}
                  placeholder="Ex: Multimídia"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !tema.trim()}
            className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none active:scale-95"
          >
            {loading ? (
              "Verificando..."
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> Confirmar Horário
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
// placeholder components
const Users = (props: any) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    ></path>
  </svg>
);
