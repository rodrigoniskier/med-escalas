export type Professor = {
  id: number;
  nome: string;
};

export type Turma = {
  id: number;
  nome: string;
};

export type Componente = {
  id: number;
  sigla: string;
  nome: string;
};

export type Aula = {
  id: number;
  professor_id: number;
  turma_id: number;
  componente_id: number;
  data_aula: string; // YYYY-MM-DD
  hora_inicio: string; // HH:mm
  hora_fim: string; // HH:mm
  tema: string;
  local?: string;
  metodologia?: string;
  recursos?: string;
  carga_horaria?: number;
};

export type Mensagem = {
  id: number;
  aula_conflito_id: number;
  remetente_id: number;
  destinatario_id: number;
  mensagem: string;
  status: string; // 'Pendente' | 'Respondida'
};

export type BlocoHorario = {
  id: number;
  hora_inicio: string; // HH:mm
  hora_fim: string; // HH:mm
};

export type GradePadrao = {
  id: number;
  turma_id: number;
  dia_semana: number; // 1=Dom, 2=Seg, 3=Ter, 4=Qua, 5=Qui, 6=Sex, 7=Sab
  bloco_horario_id: number;
  componente_id: number;
};

export type Database = {
  public: {
    Tables: {
      professores: { Row: Professor; Insert: Omit<Professor, 'id'> };
      turmas: { Row: Turma; Insert: Omit<Turma, 'id'> };
      componentes: { Row: Componente; Insert: Omit<Componente, 'id'> };
      aulas: { Row: Aula; Insert: Omit<Aula, 'id'> };
      mensagens: { Row: Mensagem; Insert: Omit<Mensagem, 'id'> };
      blocos_horario: { Row: BlocoHorario; Insert: Omit<BlocoHorario, 'id'> };
      grade_padrao: { Row: GradePadrao; Insert: Omit<GradePadrao, 'id'> };
    };
  };
};
