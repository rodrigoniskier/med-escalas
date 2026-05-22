export type Professor = {
  id: string;
  nome: string;
};

export type Turma = {
  id: string;
  nome: string;
};

export type Componente = {
  id: string;
  sigla: string;
  nome: string;
};

export type Aula = {
  id: string;
  professor_id: string;
  turma_id: string;
  componente_id: string;
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
  id: string;
  aula_conflito_id: string;
  remetente_id: string;
  destinatario_id: string;
  mensagem: string;
  status: string; // 'Pendente' | 'Respondida'
};

export type BlocoHorario = {
  id: string;
  hora_inicio: string; // HH:mm
  hora_fim: string; // HH:mm
};

export type GradePadrao = {
  id: string;
  turma_id: string;
  dia_semana: number; // 1=Dom, 2=Seg, 3=Ter, 4=Qua, 5=Qui, 6=Sex, 7=Sab
  bloco_horario_id: string;
  componente_id: string;
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
