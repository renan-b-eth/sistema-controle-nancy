export interface Aula {
  numero: number;
  inicio: string;
  fim: string;
}

// Retorna a data atual no formato YYYY-MM-DD (Fuso de São Paulo)
export const getDataEscolar = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
};

// Retorna o horário atual no formato HH:MM:SS (Fuso de São Paulo)
export const getHorarioEscolar = () => {
  return new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

export const getAulaAtual = (): Aula | null => {
  const agora = new Date();
  const horaBrasilia = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  const horas = horaBrasilia.getHours();
  const minutos = horaBrasilia.getMinutes();
  const totalMinutos = horas * 60 + minutos;

  // 1ª Aula: 19:00 - 19:45 (1140 - 1185)
  if (totalMinutos >= 1140 && totalMinutos < 1185) return { numero: 1, inicio: '19:00', fim: '19:45' };
  
  // 2ª Aula: 19:45 - 20:30 (1185 - 1230)
  if (totalMinutos >= 1185 && totalMinutos < 1230) return { numero: 2, inicio: '19:45', fim: '20:30' };
  
  // 3ª Aula em diante
  if (totalMinutos >= 1230 && totalMinutos < 1275) return { numero: 3, inicio: '20:30', fim: '21:15' };
  if (totalMinutos >= 1275 && totalMinutos < 1320) return { numero: 4, inicio: '21:15', fim: '22:00' };
  if (totalMinutos >= 1320 && totalMinutos <= 1365) return { numero: 5, inicio: '22:00', fim: '22:45' };

  return null;
};
