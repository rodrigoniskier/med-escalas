import React, { useState, useEffect } from 'react';
import { FormAgendamento } from './components/FormAgendamento';
import { ExportCronograma } from './components/ExportCronograma';
import { Professor, Turma, Componente } from './types';
import { supabase } from './lib/supabase';
import { Settings, User } from 'lucide-react';

export default function App() {
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [usuarioAtualId, setUsuarioAtualId] = useState<number | ''>('');

  const isSimulated = import.meta.env.VITE_SUPABASE_URL === 'YOUR_SUPABASE_URL';

  useEffect(() => {
    async function loadInitialData() {
      if (isSimulated) {
        // Fallback para simulação sem banco montado
        setProfessores([
          { id: 1, nome: 'Dr. João Medeiros' },
          { id: 2, nome: 'Dra. Maria Silva' }
        ]);
        setTurmas([
           { id: 1, nome: 'P2A' },
           { id: 2, nome: 'P2B' },
           { id: 3, nome: 'P2C' }
        ]);
        setComponentes([
          { id: 1, sigla: 'CNM', nome: 'Conhecimentos Médicos' },
          { id: 2, sigla: 'APSC-II', nome: 'Atenção Primária' },
          { id: 3, sigla: 'FCH', nome: 'Fundamentos Cirúrgicos' }
        ]);
        return;
      }

      // Conexão real caso configurada
      try {
        const [profRes, turmaRes, compRes] = await Promise.all([
          supabase.from('professores').select('*'),
          supabase.from('turmas').select('*'),
          supabase.from('componentes').select('*')
        ]);
        
        if (profRes.data) setProfessores(profRes.data);
        if (turmaRes.data) setTurmas(turmaRes.data);
        if (compRes.data) setComponentes(compRes.data);
      } catch (err) {
        console.error('Falha ao carregar dados remotos', err);
      }
    }
    loadInitialData();
  }, [isSimulated]);

  // Derivando estado atual
  const usuarioAtual = professores.find(p => p.id === usuarioAtualId) || null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans flex flex-col p-4 md:p-6">
      {/* Header/Nav */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200 overflow-hidden">
            <img src="/logo.png" alt="Logomarca" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerText = 'U'; }} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">UNIPÊ Medicina</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Gestor Acadêmico • Semestre 2026.2</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
             {/* Simulador de Login / Seletor de Usuario */}
             <select 
               className="bg-transparent border-none outline-none font-semibold text-sm text-slate-700 text-right appearance-none cursor-pointer"
               value={usuarioAtualId}
               onChange={(e) => setUsuarioAtualId(e.target.value ? Number(e.target.value) : '')}
             >
               <option value="" disabled>Selecionar perfil...</option>
               {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
             </select>
             {usuarioAtual && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold mt-0.5">DOCENTE</span>}
           </div>
           <div className="w-10 h-10 bg-slate-200 flex items-center justify-center rounded-full border-2 border-white shadow-sm overflow-hidden shrink-0">
             <User size={20} className="text-slate-400" />
           </div>
         </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-grow items-start auto-rows-min">
        
        {/* Coluna Esquerda: Agendamento Principal */}
        <div className="lg:col-span-4 flex flex-col h-full">
          {!usuarioAtual && (
             <div className="p-4 mb-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
               <p className="font-medium text-sm">Aviso: Por favor, selecione seu perfil de professor no canto superior direito para prosseguir.</p>
             </div>
          )}

          <FormAgendamento 
            usuarioAtual={usuarioAtual}
            turmas={turmas}
            componentes={componentes}
            onSuccess={() => {}}
          />
        </div>

        {/* Coluna Direita: Exportação Módulo Sidebar */}
        <div className="lg:col-span-8 flex flex-col gap-4">
           
           {/* Export Module */}
           <div className="bg-slate-900 rounded-3xl p-6 lg:p-8 text-white flex flex-col justify-between shadow-sm lg:col-span-8">
             <div>
               <h2 className="text-xl font-bold mb-1">Exportar Cronogramas</h2>
               <p className="text-slate-400 text-xs leading-relaxed mb-6">
                 Gere o cronograma oficial em formato Word (.docx) compatível com o sistema UNIPÊ, formatado automaticamente nas tabelas ABNT solicitadas pela coordenação.
               </p>
             </div>
             
             <div className="flex flex-wrap gap-3">
               {componentes.map(comp => (
                  <ExportCronograma key={comp.id} componente={comp} />
               ))}
               {componentes.length === 0 && (
                 <p className="text-sm text-slate-400 italic">Nenhum componente disponível para exportação.</p>
               )}
             </div>
           </div>

        </div>

      </main>
      
      <footer className="mt-8 text-center text-xs text-slate-400 font-medium pb-2">
        Desenvolvido por: Prof. Rodrigo Niskier (2026 - SDG)
      </footer>
    </div>
  );
}
