import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Aula, Professor } from '../types';

interface ModalNegociacaoProps {
  conflito: Aula & { professor?: Professor; turma?: { nome: string } };
  usuarioAtualId: number | '';
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalNegociacao({ conflito, usuarioAtualId, onClose, onSuccess }: ModalNegociacaoProps) {
  const [mensagem, setMensagem] = useState(`Olá, percebi que você agendou a turma ${conflito.turma?.nome || 'nesta sala/turma'} das ${conflito.hora_inicio} às ${conflito.hora_fim}. Seria possível negociarmos este horário?`);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const handleEnviar = async () => {
    setEnviando(true);
    setErro('');
    
    // Simulate send if no DB set
    if (import.meta.env.VITE_SUPABASE_URL === 'YOUR_SUPABASE_URL') {
      setTimeout(() => {
        alert('Modo Simulação: Mensagem enviada com sucesso!');
        onSuccess();
      }, 500);
      return;
    }

    try {
      const { error } = await (supabase.from('mensagens') as any).insert({
        aula_conflito_id: conflito.id,
        remetente_id: usuarioAtualId,
        destinatario_id: conflito.professor_id,
        mensagem: mensagem,
        status: 'Pendente',
      });

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setErro(err.message || 'Erro ao enviar a mensagem.');
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-slate-800">Negociar Horário</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="bg-orange-50 text-orange-800 p-3 rounded-md text-sm">
            <p><strong>Conflito com:</strong> Prof. {conflito.professor?.nome || '(Desconhecido)'}</p>
            <p><strong>Turma:</strong> {conflito.turma?.nome || '(Desconhecida)'}</p>
            <p><strong>Horário Ocupado:</strong> {conflito.data_aula} | {conflito.hora_inicio} - {conflito.hora_fim}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sua Mensagem
            </label>
            <textarea 
              rows={4}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
          <button 
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleEnviar}
            disabled={enviando || !mensagem.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {enviando ? 'Enviando...' : <><Send size={16} /> Enviar Mensagem</>}
          </button>
        </div>
      </div>
    </div>
  );
}
