import React, { useState } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle } from 'docx';
import { supabase } from '../lib/supabase';
import { Componente } from '../types';

interface ExportCronogramaProps {
  componente: Componente;
}

export function ExportCronograma({ componente }: ExportCronogramaProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    try {
      // simulated delay if no complete backend keys are found or just to be safe
      let aulasData: any[] = [];
      
      if (import.meta.env.VITE_SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        // mock data for simulation if connection isn't set up
        aulasData = [
          { data_aula: '2026-08-04', hora_inicio: '07:00', hora_fim: '08:40', turma: { nome: 'P2A' }, professor: { nome: 'Dr. Teste' }, tema: 'Anatomia I', local: 'Lab 1' },
          { data_aula: '2026-08-11', hora_inicio: '09:30', hora_fim: '11:10', turma: { nome: 'P2C' }, professor: { nome: 'Dra. Demo' }, tema: 'Fisiologia Oculta', local: 'Lab 3' }
        ];
      } else {
        const { data, error } = await supabase
          .from('aulas')
          .select(`*, turma:turmas(nome), professor:professores(nome)`)
          .eq('componente_id', componente.id)
          .order('data_aula', { ascending: true })
          .order('hora_inicio', { ascending: true });

        if (error) throw error;
        aulasData = data || [];
      }

      if (aulasData.length === 0) {
        alert('Nenhuma aula encontrada para este componente.');
        setLoading(false);
        return;
      }

      const rows = [
        // Header Row
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Data", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Horário", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Turma", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Professor", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tema", bold: true })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Local", bold: true })] })] }),
          ],
        }),
      ];

      // Data Rows
      aulasData.forEach(aula => {
        const dateParts = aula.data_aula.split('-');
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : aula.data_aula;
        
        rows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(formattedDate)] }),
            new TableCell({ children: [new Paragraph(`${aula.hora_inicio} - ${aula.hora_fim}`)] }),
            new TableCell({ children: [new Paragraph(aula.turma?.nome || "")] }),
            new TableCell({ children: [new Paragraph(aula.professor?.nome || "")] }),
            new TableCell({ children: [new Paragraph(aula.tema || "")] }),
            new TableCell({ children: [new Paragraph(aula.local || "")] }),
          ],
        }));
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Cronograma do Componente: ${componente.sigla} - ${componente.nome}`,
                  bold: true,
                  size: 28,
                }),
              ],
              spacing: { after: 400 },
            }),
            new Table({
              rows: rows,
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "auto" },
              }
            }),
          ],
        }],
      });

      Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cronograma_${componente.sigla}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setLoading(false);
      });

    } catch (error) {
      console.error(error);
      alert('Erro ao exportar cronograma');
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={loading}
      className="bg-white text-slate-900 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors disabled:opacity-50 flex-grow"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
      DOCX ({componente.sigla})
    </button>
  );
}
