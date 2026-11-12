// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { hoyBogota } from '@/lib/reglas/fechas';
import { detectarTipoImagen } from '@/lib/reglas/imagen';
import {
  calcularEdad,
  calcularRacha,
  ejercicioFavorito,
  esCumpleanos,
  nombreParaMostrar,
  recordsPersonales,
  totalesEntrenamiento,
  type EjercicioConHistorial,
} from '@/lib/reglas/perfil';

describe('edad y cumpleaños', () => {
  it('calcula la edad según si ya pasó el cumpleaños', () => {
    expect(calcularEdad('2010-06-15', '2026-06-14')).toBe(15);
    expect(calcularEdad('2010-06-15', '2026-06-15')).toBe(16);
    expect(calcularEdad('2010-06-15', '2026-12-31')).toBe(16);
  });

  it('reconoce el cumpleaños solo ese día', () => {
    expect(esCumpleanos('1995-11-11', '2026-11-11')).toBe(true);
    expect(esCumpleanos('1995-11-11', '2026-11-12')).toBe(false);
  });

  it('quien nació un 29 de febrero lo celebra el 28 en los años no bisiestos', () => {
    expect(esCumpleanos('2004-02-29', '2027-02-28')).toBe(true);
    expect(esCumpleanos('2004-02-29', '2027-03-01')).toBe(false);
    expect(esCumpleanos('2004-02-29', '2028-02-28')).toBe(false);
    expect(esCumpleanos('2004-02-29', '2028-02-29')).toBe(true);
    expect(calcularEdad('2004-02-29', '2027-02-27')).toBe(22);
    expect(calcularEdad('2004-02-29', '2027-02-28')).toBe(23);
  });

  it('usa la fecha de Colombia: a las 11 p. m. del 10 aún no es el 11', () => {
    // 2026-11-11 03:00 UTC = 2026-11-10 22:00 en Bogotá.
    const hoy = hoyBogota(new Date('2026-11-11T03:00:00Z'));
    expect(hoy).toBe('2026-11-10');
    expect(esCumpleanos('1995-11-11', hoy)).toBe(false);
  });

  it('saluda con el apodo o, sin apodo, con el primer nombre', () => {
    expect(nombreParaMostrar('Santiago Carbono', 'Santi')).toBe('Santi');
    expect(nombreParaMostrar('Santiago Carbono', null)).toBe('Santiago');
  });
});

describe('racha sin domingos', () => {
  // Noviembre de 2026: el domingo 8 y el domingo 15. Lunes 9 a sábado 14.
  it('cuenta días seguidos de lunes a sábado y los domingos no la rompen', () => {
    const fechas = ['2026-11-06', '2026-11-07', '2026-11-09', '2026-11-10'];
    expect(calcularRacha(fechas, '2026-11-10')).toMatchObject({ actual: 4, mejor: 4 });
  });

  it('entrenar un domingo no suma', () => {
    const fechas = ['2026-11-07', '2026-11-08', '2026-11-09'];
    expect(calcularRacha(fechas, '2026-11-09').actual).toBe(2);
  });

  it('si hoy aún no entrena, la racha sigue viva desde ayer', () => {
    expect(calcularRacha(['2026-11-09', '2026-11-10'], '2026-11-11').actual).toBe(2);
  });

  it('el lunes sin entrenar cuenta desde el sábado', () => {
    expect(calcularRacha(['2026-11-06', '2026-11-07'], '2026-11-09').actual).toBe(2);
    expect(calcularRacha(['2026-11-06', '2026-11-07'], '2026-11-08').actual).toBe(2); // domingo
  });

  it('se rompe si falta un día hábil', () => {
    expect(calcularRacha(['2026-11-05', '2026-11-07'], '2026-11-07')).toMatchObject({ actual: 1, mejor: 1 });
    expect(calcularRacha(['2026-11-09'], '2026-11-11').actual).toBe(0);
  });

  it('cruza cambios de mes y de año', () => {
    // 2026-10-31 es sábado y 2026-11-01 domingo.
    expect(calcularRacha(['2026-10-30', '2026-10-31', '2026-11-02'], '2026-11-02').actual).toBe(3);
    // 2026-12-31 es jueves.
    expect(calcularRacha(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'], '2027-01-02').actual).toBe(4);
  });

  it('guarda la mejor racha histórica', () => {
    const fechas = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-11-10'];
    expect(calcularRacha(fechas, '2026-11-10')).toMatchObject({ actual: 1, mejor: 4 });
  });

  it('sin sesiones la racha es cero', () => {
    expect(calcularRacha([], '2026-11-10')).toMatchObject({ actual: 0, mejor: 0 });
  });
});

const press: EjercicioConHistorial = {
  id: 'e1',
  nombre: 'Press de banca',
  tipo: 'peso',
  nivel: null,
  archivado: false,
  sesiones: [
    { fecha: '2026-10-01', series: [{ reps: 10, pesoGramos: 50000 }, { reps: 15, pesoGramos: 70000, tipoSerie: 'aproximacion' }] },
    { fecha: '2026-11-08', series: [{ reps: 8, pesoGramos: 55000 }, { reps: 6, pesoGramos: 55000 }] },
  ],
};
const dominadas: EjercicioConHistorial = {
  id: 'e2',
  nombre: 'Dominadas',
  tipo: 'calistenia',
  nivel: 'Estricta',
  archivado: true,
  sesiones: [
    { fecha: '2026-09-01', series: [{ reps: 12, pesoGramos: null }] },
    { fecha: '2026-09-03', series: [{ reps: 12, pesoGramos: null }] },
  ],
};

describe('récords personales', () => {
  it('en peso: el mayor peso con sus repeticiones y el mejor 1RM, sin contar la aproximación', () => {
    const [record] = recordsPersonales([press], '2026-11-10');
    expect(record).toMatchObject({
      tipo: 'peso',
      mayorPeso: { valor: 55000, reps: 8, fecha: '2026-11-08', nuevo: true },
    });
    // 55 kg × 8 → 69,7 kg; 50 kg × 10 → 66,7 kg. La aproximación de 70 kg no cuenta.
    expect(record?.tipo === 'peso' && record.mejor1RM).toMatchObject({ valor: 69667, fecha: '2026-11-08', nuevo: true });
  });

  it('en calistenia: el máximo de repeticiones (la primera vez que se logró) y la variante', () => {
    const [record] = recordsPersonales([dominadas], '2026-11-10');
    expect(record).toMatchObject({ tipo: 'calistenia', maxReps: { valor: 12, fecha: '2026-09-01', nuevo: false }, variante: 'Estricta' });
  });

  it('marca "Nuevo" solo los de los últimos 7 días', () => {
    expect(recordsPersonales([press], '2026-11-15')[0]).toMatchObject({ mayorPeso: { nuevo: false } });
  });
});

describe('favorito y totales', () => {
  it('el favorito es el de más sesiones, incluidos los archivados, y el empate lo decide la más reciente', () => {
    expect(ejercicioFavorito([press, dominadas])).toEqual({ ejercicioId: 'e1', nombre: 'Press de banca', sesiones: 2 });
    expect(ejercicioFavorito([{ ...dominadas, sesiones: [...dominadas.sesiones, { fecha: '2026-09-05', series: [] }] }, press])?.ejercicioId).toBe('e2');
    expect(ejercicioFavorito([])).toBeNull();
  });

  it('suma sesiones, series y volumen (kg × reps) sin la aproximación', () => {
    // 50×10 + 55×8 + 55×6 = 500 + 440 + 330 = 1270 kg.
    expect(totalesEntrenamiento([press, dominadas])).toEqual({ sesiones: 4, series: 6, volumenKg: 1270 });
  });
});

describe('detectarTipoImagen', () => {
  it('reconoce JPEG, PNG y WebP por sus bytes y rechaza lo demás', () => {
    expect(detectarTipoImagen(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectarTipoImagen(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectarTipoImagen(new TextEncoder().encode('RIFF0000WEBPVP8 '))).toBe('image/webp');
    expect(detectarTipoImagen(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(detectarTipoImagen(new TextEncoder().encode('GIF89a'))).toBeNull();
  });
});
