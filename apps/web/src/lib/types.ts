export interface UsuarioLocal {
  id: string;
  nombreCompleto: string;
  rol: string;
  empresaId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  usuario: UsuarioLocal;
}

export interface NodoCatalogo {
  id: string;
  idPadre: string | null;
  numeracion: string;
  titulo: string;
  nivel: number;
  orden: number;
  esEvaluable: boolean;
  peso: number;
  idCriticidad: string | null;
  hijos: NodoCatalogo[];
}

export interface OpcionRespuestaLocal {
  id: string;
  codigo: string;
  nombre: string;
  valor: number;
  excluyeDelCalculo: boolean;
  generaNc: boolean;
}

export interface FormularioVigenteResponse {
  id: string;
  secciones: NodoCatalogo[];
  opcionesRespuesta: OpcionRespuestaLocal[];
}
