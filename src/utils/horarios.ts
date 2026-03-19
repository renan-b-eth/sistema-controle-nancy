export interface Aula {
  numero: number;
  inicio: string; // HH:mm
  fim: string;    // HH:mm
}

export const GRADE_MANHA: Aula[] = [
  { numero: 1, inicio: "07:00", fim: "07:45" },
  { numero: 2, inicio: "07:45", fim: "08:30" },
  { numero: 3, inicio: "08:30", fim: "09:15" },
  { numero: 4, inicio: "09:15", fim: "10:00" },
  { numero: 5, inicio: "10:00", fim: "10:45" },
];

export const GRADE_NOTURNO: Aula[] = [
  { numero: 1, inicio: "19:00", fim: "19:45" },
  { numero: 2, inicio: "19:45", fim: "20:30" },
  { numero: 3, inicio: "20:30", fim: "21:15" },
  { numero: 4, inicio: "21:15", fim: "22:00" },
  { numero: 5, inicio: "22:00", fim: "22:45" },
];

export function getAulaAtual(data: Date = new Date()): Aula | null {
  const horas = data.getHours();
  const minutos = data.getMinutes();
  const tempoAtual = horas * 60 + minutos;

  // Decide qual grade usar com base na hora (antes das 13h é manhã, depois é noite)
  const grade = horas < 13 ? GRADE_MANHA : GRADE_NOTURNO;

  for (const aula of grade) {
    const [hInicio, mInicio] = aula.inicio.split(":").map(Number);
    const [hFim, mFim] = aula.fim.split(":").map(Number);
    
    const tempoInicio = hInicio * 60 + mInicio;
    const tempoFim = hFim * 60 + mFim;

    if (tempoAtual >= tempoInicio && tempoAtual < tempoFim) {
      return aula;
    }
  }

  return null;
}
