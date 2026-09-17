import Dexie, { type EntityTable } from 'dexie';
import type { UsuarioLocal, OpcionRespuestaLocal, AsignacionMia } from '@/lib/types';
import type { EntradaCalculo } from '@ebr/risk-engine';

export interface SesionLocal {
  id: 1;
  accessToken: string;
  expiresAt: number;
  usuario: UsuarioLocal;
}

export interface CatalogoItemLocal {
  id: string;
  versionFichaId: string;
  idPadre: string | null;
  numeracion: string;
  titulo: string;
  nivel: number;
  orden: number;
  esEvaluable: boolean;
  peso: string | null;
  idCriticidad: string | null;
}

export interface CatalogoMetaLocal {
  id: 1;
  versionFichaId: string;
  descargadoEn: number;
  opcionesRespuesta: OpcionRespuestaLocal[];
}

export interface EvaluacionLocal {
  uuidLocal: string;
  evaluacionServerId: string;
  estado: 'borrador' | 'en_progreso' | 'finalizada' | 'sincronizada' | 'error';
  creadaEn: number;
  modificadaEn: number;
}

export interface RespuestaLocal {
  uuidLocal: string;
  evaluacionUuid: string;
  itemId: string;
  codigoOpcion: 'C' | 'CP' | 'IT' | 'N/A';
  nivelCriticidad: 'C' | 'M' | 'Me' | null;
  observacion: string;
  capturaEn: number;
}

export interface EvidenciaLocal {
  uuidLocal: string;
  evaluacionUuid: string;
  itemId: string | null;
  blob: Blob;
  nombreArchivo: string;
  comentario: string;
  capturaEn: number;
  subida: boolean;
}

export interface OperacionPendiente {
  uuidLocal: string;
  tipo: 'INICIAR_EVALUACION' | 'RESPUESTAS' | 'EVIDENCIA' | 'FINALIZAR_EVALUACION';
  payload: object;
  timestamp: number;
  intentos: number;
  estado: 'pendiente' | 'enviando' | 'error' | 'enviado';
  errorMsg?: string;
}

export type AsignacionLocal = AsignacionMia;

export interface CatalogoMotorLocal {
  id: 1;
  descargadoEn: number;
  datos: Omit<EntradaCalculo, 'respuestas'>;
}

export class EbrDatabase extends Dexie {
  sesion!: EntityTable<SesionLocal, 'id'>;
  catalogo_item!: EntityTable<CatalogoItemLocal, 'id'>;
  catalogo_meta!: EntityTable<CatalogoMetaLocal, 'id'>;
  catalogo_motor!: EntityTable<CatalogoMotorLocal, 'id'>;
  evaluacion!: EntityTable<EvaluacionLocal, 'uuidLocal'>;
  respuesta!: EntityTable<RespuestaLocal, 'uuidLocal'>;
  evidencia!: EntityTable<EvidenciaLocal, 'uuidLocal'>;
  cola_sync!: EntityTable<OperacionPendiente, 'uuidLocal'>;
  asignacion!: EntityTable<AsignacionLocal, 'id'>;

  constructor() {
    super('ebr');
    this.version(1).stores({
      sesion:         'id',
      catalogo_item:  'id, versionFichaId, idPadre',
      catalogo_meta:  'id',
      evaluacion:     'uuidLocal, evaluacionServerId, estado',
      respuesta:      'uuidLocal, evaluacionUuid, itemId',
      evidencia:      'uuidLocal, evaluacionUuid, subida',
      cola_sync:      'uuidLocal, tipo, estado, timestamp',
      asignacion:     'id, estado',
    });
    this.version(2).stores({
      catalogo_motor: 'id',
    });
  }
}
