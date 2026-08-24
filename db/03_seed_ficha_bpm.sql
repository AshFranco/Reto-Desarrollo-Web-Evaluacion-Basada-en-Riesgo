-- =====================================================================
-- Archivo 03 de 05 — Seed: Ficha de Inspección BPM
-- Generado desde Ficha_Inspección_BPM_Revisión_Final_23-09-24.xlsx
-- 90 nodos totales · 45 criterios evaluables · profundidad máxima 5
--
-- NOTA DE MODELADO: en el Excel la fórmula de calificación IFS() está en las
-- filas de criterio (a, b, c), no en los ítems numerados. Los ítems numerados
-- son agrupadores con SUB TOTAL. Por eso los criterios se cargan como nodos
-- hoja del mismo árbol, con es_evaluable = TRUE.
-- =====================================================================
SET search_path TO ebr, public;

INSERT INTO version_ficha (numero_version, nombre, fecha_vigencia_desde, estado,
       total_items_evaluables, puntaje_total_posible,
       porcentaje_minimo_aprobacion, max_nc_criticas, max_nc_mayores, porcentaje_permiso_sanitario)
VALUES ('2024.10', 'Ficha de Inspección BPM — Revisión Final 23-09-24 (rev. FSP-FD oct-2024)',
        DATE '2024-10-01', 'PUBLICADA', 45, 45.00, 60, 1, 5, 81);

INSERT INTO nivel_criticidad (codigo, nombre, orden) VALUES
  ('C',  'No Conformidad Crítica', 1),
  ('M',  'No Conformidad Mayor',   2),
  ('Me', 'No Conformidad Menor',   3);

-- Escala de respuesta. Fuente: IFS(P="Si",1, Q="Si",0.5, R="Si",0, S="Si","N/A")
INSERT INTO opcion_respuesta (version_ficha_id, codigo, nombre, valor, excluye_del_calculo, genera_nc, color_hex, orden)
SELECT v.id, x.codigo, x.nombre, x.valor, x.excluye, x.nc, x.color, x.orden
  FROM version_ficha v,
  (VALUES ('C',   'Cumple',               1.00, FALSE, FALSE, '#2E7D32', 1),
          ('CP',  'Cumplimiento parcial', 0.50, FALSE, TRUE,  '#F9A825', 2),
          ('IT',  'Incumplimiento total', 0.00, FALSE, TRUE,  '#C62828', 3),
          ('N/A', 'No aplica',            0.00, TRUE,  FALSE, '#757575', 4))
   AS x(codigo, nombre, valor, excluye, nc, color, orden)
 WHERE v.numero_version = '2024.10';

-- Criterios de calificación. Fuente: Ficha Inspección BPM, filas 198-201
INSERT INTO rango_calificacion (version_ficha_id, limite_inferior, limite_superior, incluye_inferior, incluye_superior, descripcion, accion, orden)
SELECT v.id, x.li, x.ls, x.ii, x.isup, x.d, x.a, x.orden
  FROM version_ficha v,
  (VALUES (0.00,   60.00, TRUE,  TRUE, 'Condiciones inaceptables', 'Considerar cierre', 1),
          (60.00,  70.00, FALSE, TRUE, 'Condiciones deficientes',  'Urge corregir', 2),
          (70.00,  80.00, FALSE, TRUE, 'Condiciones regulares',    'Necesario hacer correcciones', 3),
          (80.00, 100.00, FALSE, TRUE, 'Buenas condiciones',       'Hacer algunas correcciones', 4))
   AS x(li, ls, ii, isup, d, a, orden)
 WHERE v.numero_version = '2024.10';

-- ---------------------------------------------------------------------
-- Árbol de la ficha — pasada 1: todos los nodos con id_padre NULL
-- ---------------------------------------------------------------------
INSERT INTO item_ficha (version_ficha_id, id_padre, numeracion, titulo, nivel, orden, es_evaluable, peso)
SELECT v.id, NULL, x.numeracion, x.titulo, x.nivel, x.orden, x.evaluable, 1.00
  FROM version_ficha v,
  (VALUES
   ('1', 'ESTABLECIMIENTO - DISEÑO DE LAS INSTALACIONES Y EQUIPO', 1, 1, FALSE),
   ('1.1', 'Ubicación y estructura', 2, 2, FALSE),
   ('1.1.1', 'Ubicación del establecimiento', 3, 3, FALSE),
   ('1.1.1.a', 'Ubicación adecuada', 4, 4, TRUE),
   ('1.1.1.b', 'Alrededores limpios', 4, 5, TRUE),
   ('1.1.1.c', 'Ausencia de focos de contaminación', 4, 6, TRUE),
   ('1.1.2', 'Diseño y disposición del establecimiento', 3, 7, FALSE),
   ('1.1.2.a', 'El diseño y la disposición del establecimiento permite la limpieza y el mantenimiento de manera adecuada.', 4, 8, TRUE),
   ('1.1.2.b', 'La disposición de las áreas y el flujo de las operaciones evitan o reducen al mínimo la contaminación cruzada.', 4, 9, TRUE),
   ('1.1.3', 'Estructuras internas y accesorios', 3, 10, FALSE),
   ('1.1.3.1', 'Paredes', 4, 11, FALSE),
   ('1.1.3.1.a', 'Las paredes deben tener una superficie lisa adecuada a las actividades que se realicen, construídas con materiales impermeables de fácil limpieza y, cuando sea necesario, de fácil desinfección.', 5, 12, TRUE),
   ('1.1.3.2', 'Pisos', 4, 13, FALSE),
   ('1.1.3.2.a', 'Construidos con materiales impermeables de fácil limpieza sin grietas, uniones redondeadas con las paredes y que faciliten el drenaje.', 5, 14, TRUE),
   ('1.1.3.3', 'Techos', 4, 15, FALSE),
   ('1.1.3.3.a', 'Construidos de manera que reduzcan al mínimo la acumulación de suciedad y de condensación, así como el desprendimiento de partículas.', 5, 16, TRUE),
   ('1.1.3.4', 'Ventanas', 4, 17, FALSE),
   ('1.1.3.4.a', 'Fáciles de limpiar y construídas de modo que se reduzca al mínimo la acumulación de suciedad.', 5, 18, TRUE),
   ('1.1.3.4.b', 'Provistas de malla contra insectos fácil de desmontar y limpiar.', 5, 19, TRUE),
   ('1.1.3.5', 'Puertas', 4, 20, FALSE),
   ('1.1.3.5.a', 'Tienen una superficie lisa y no absorbente, son fáciles de limpiar y, cuando sea necesario, de desinfectar.', 5, 21, TRUE),
   ('1.1.3.6', 'Superficies en contacto con los alimentos', 4, 22, FALSE),
   ('1.1.3.6.a', 'Deben estar construídos con materiales inertes, en buenas condiciones, ser duraderas y fáciles de limpiar, mantener y desinfectar.', 5, 23, TRUE),
   ('1.2', 'Instalaciones', 2, 24, FALSE),
   ('1.2.1', 'Drenaje y eliminación de residuos', 3, 25, FALSE),
   ('1.2.1.a', 'El sistema de drenaje está diseñado y construído de manera que se evite la contaminación de los alimentos o del suministro de agua potable.', 4, 26, TRUE),
   ('1.2.1.b', 'Los residuos sólidos son recogidos y eliminados por personal calificado y deben ser depositados en contenedores debidamente identificados, construidos con material impermeable, ubicados en áreas que eviten la infestación por plagas y cuando corresponda, se podrán cerrar con llave para evitar la contaminación accidental o intencionada de los alimentos.', 4, 27, TRUE),
   ('1.2.2', 'Instalaciones de limpieza', 3, 28, FALSE),
   ('1.2.2.a', 'La planta cuenta con estaciones separadas para el lavado y desinfección de alimentos, equipos, utensilios y manos, al igual que para el lavado de los equipos utilizados en la limpieza de los servicios sanitarios, los drenajes y contenedores, todas dotadas con suficiente agua potable.', 4, 29, TRUE),
   ('1.2.3', 'Instalaciones para la higiene personal y servicios sanitarios', 3, 30, FALSE),
   ('1.2.3.a', 'Los establecimientos cuentan con un filtro sanitario a la entrada del área de producción.', 4, 31, TRUE),
   ('1.2.3.b', 'Servicios sanitarios separados por sexo, con suficientes lavamanos, inodoros, urinales y duchas.', 4, 32, TRUE),
   ('1.2.3.c', 'Cuando sea necesario, vestidores con casilleros y espejos debidamente ubicados.', 4, 33, TRUE),
   ('1.2.4', 'Temperatura', 3, 34, FALSE),
   ('1.2.4.a', 'El establecimiento cuenta con instalaciones adecuadas para el calentamiento, enfriamiento, cocción, refrigeración o congelamiento y para el almacenamiento de alimentos refrigerados o congelados dependiendo de las operaciones que realiza,', 4, 35, TRUE),
   ('1.2.4.b', 'El establecimiento cuenta con la capacidad para controlar la temperatura ambiente de acuerdo a la naturaleza del prouducto, con el objeto de garantizar la inocuidad y la idoneidad de los alimentos.', 4, 36, TRUE),
   ('1.2.5', 'Calidad del aire y ventilación', 3, 37, FALSE),
   ('1.2.5.a', 'El establecimiento cuenta con medios adecuados de ventilación natural o mecánica, diseñados y construídos de manera que el aire no circule de zonas contaminadas a zonas limpias y que se facilite su mantenimiento y limpieza.', 4, 38, TRUE),
   ('1.2.6', 'Iluminación', 3, 39, FALSE),
   ('1.2.6.a', 'Se dispone de iluminación natural o artificial adecuada que permita a la empresa realizar las actividades alimentarias de manera higiénica.', 4, 40, TRUE),
   ('1.2.6.b', 'La intensidad debe ser suficiente para la naturaleza de la actividad que se realice.', 4, 41, TRUE),
   ('1.2.6.c', 'Las luminarias están protegidas, cuando corresponda, para garantizar que los alimentos no se contaminen en caso de rotura de los elementos de iluminación.', 4, 42, TRUE),
   ('1.2.7', 'Almacenamiento', 3, 43, FALSE),
   ('1.2.7.a', 'El establecimieno cuenta con instalaciones separadas y adecuadas para el almacenamiento de los productos terminados, materias primas, material de empaque, productos de limpieza, lubricantes y combustibles.', 4, 44, TRUE),
   ('1.3', 'Equipo', 2, 45, FALSE),
   ('1.3.a', 'El equipo y los recipientes que estan en contacto con los alimentos deben ser aptos para el contacto con los alimentos, estar diseñados, fabricados y ubicados de manera que se puedan limpiar, desinfectar y mantener adecuadamente para evitar la contaminación de los alimentos.', 3, 46, TRUE),
   ('2', 'CAPACITACIÓN Y COMPETENCIA', 1, 47, FALSE),
   ('2.1', 'Conocimiento y responsabilidades', 2, 48, FALSE),
   ('2.1.a', 'El personal debe tener conocimiento de su función y responsabilidad en cuanto a la protección de los alimentos contra la contaminación o el deterioro.', 3, 49, TRUE),
   ('2.2', 'Programas de capacitación', 2, 50, FALSE),
   ('2.2.a', 'El establecimiento cuenta con un programa escrito de capacitación, principalmente en higiene y manipulación de alimentos, BPM e higiene personal.', 3, 51, TRUE),
   ('2.3', 'Instrucción y supervisión', 2, 52, FALSE),
   ('2.3.a', 'Los encargados, supervisores y los operarios cuentan con los conocimientos suficientes sobre los principios y prácticas de higiene de los alimentos para poder identificar las desviaciones y adoptar las medidas necesarias que correspondan a su puesto.', 3, 53, TRUE),
   ('3', 'MANTENIMIENTO, LIMPIEZA, DESINFECCIÓN Y CONTROL DE PLAGAS EN EL ESTABLECIMIENTO', 1, 54, FALSE),
   ('3.1', 'Mantenimiento y limpieza', 2, 55, FALSE),
   ('3.1.1', 'Consideraciones generales', 3, 56, FALSE),
   ('3.1.1.a', 'Se utilizan equipos y utensilios de limpieza adecuadamente diseñados para las diferentes áreas, se conservan limpios, reciben mantenimiento y se sustituyen periódicamente a fin de que no se conviertan en una fuente de contaminación para las superficies o los alimentos.', 4, 57, TRUE),
   ('3.1.2', 'Métodos y procedimientos de limpieza y desinfección', 3, 58, FALSE),
   ('3.1.2.a', 'Los procedimientos de limpieza y desinfección garantizan que todas las partes del establecimiento están adecuadamente limpias y cuando corresponda desinfectadas.', 4, 59, TRUE),
   ('3.1.3', 'Monitoreo/seguimiento de la eficacia', 3, 60, FALSE),
   ('3.1.3.a', 'Se realiza el seguimiento de la eficacia de la aplicación de los procedimientos de limpieza y desinfección y se verifica que se han aplicado adecuadamente.', 4, 61, TRUE),
   ('3.2', 'Sistemas de control de plagas', 2, 62, FALSE),
   ('3.2.a', 'El establecimiento cuenta con un Programa escrito para el control de plagas y con las barreras físicas necesarias para impedir que penetren a la planta.', 3, 63, TRUE),
   ('4', 'HIGIENE PERSONAL', 1, 64, FALSE),
   ('4.a', 'La empresa tiene establecidas políticas y procedimientos adecuados en materia de higiene personal.', 2, 65, TRUE),
   ('5', '. CONTROL DE LAS OPERACIONES', 1, 66, FALSE),
   ('5.1', 'Descripción de los productos y procesos', 2, 67, FALSE),
   ('5.1.1', 'Descripción del producto', 3, 68, FALSE),
   ('5.1.1.a', 'El establecimiento describe sus productos de manera individual o por grupo de alimentos de manera adecuada.', 4, 69, TRUE),
   ('5.1.2', 'Descripción fases del proceso', 3, 70, FALSE),
   ('5.1.2.a', 'El establecimiento tiene elaborado los diagramas de flujo de los productos y líneas de productos actualizados.', 4, 71, TRUE),
   ('5.1.3', 'Monitoreo/seguimiento, medidas correctivas y verificación', 3, 72, FALSE),
   ('5.1.3.a', 'El establecimiento cuenta con procedimintos escritos sobre el monitoreo de las prácticas de higiene y realiza actividades de verificación de su efectividad.', 4, 73, TRUE),
   ('5.2', 'Aspectos fundamentales de las BPM', 2, 74, FALSE),
   ('5.2.1', 'Especificaciones microbiológicas, físicas, químicas y de alérgenos', 3, 75, FALSE),
   ('5.2.1.a', 'Las especificaciones microbiológicas, físicas, químicas y de alérgenos del producto están definidas en base a las normas oficiales y contribuyen a la inocuidad del producto.', 4, 76, TRUE),
   ('5.2.2', 'Materiales y materias primas', 3, 77, FALSE),
   ('5.2.2.a', 'El establecimiento mantiene un sistema de control para asegurar que las materias primas y otros ingredientes a ser utilizados en la elaboración de alimentos son conformes con las especificaciones de calidad e inocuidad establecidas en las espcificaciones.', 4, 78, TRUE),
   ('5.2.3', 'Envasado', 3, 79, FALSE),
   ('5.2.3.a', 'El diseño y los materiales utilizados para envasar los alimentos son inocuos y adecuados para proteger el producto contra la contaminación.', 4, 80, TRUE),
   ('5.3', 'Agua', 2, 81, FALSE),
   ('5.3.a', 'El establecimiento cuenta con suficiente abastecimiento de agua potable y con instalaciones apropiadas para su almacenamiento y distribución.', 3, 82, TRUE),
   ('5.4', 'Procedimientos de retiro del mercado', 2, 83, FALSE),
   ('5.4.a', 'El establecimiento cuenta con los procedimientos adecuados de retiro de alimentos del mercado.', 3, 84, TRUE),
   ('5.4.b', 'Los productos devueltos o retirados del mercado se mantienen en condiciones seguras de almacenamiento según lo estipulado en los procedimeintos.', 3, 85, TRUE),
   ('6', 'INFORMACIÓN SOBRE LOS PRODUCTOS Y SENSIBILIZACIÓN DEL CONSUMIDOR', 1, 86, FALSE),
   ('6.1', 'Etiquetado de los productos', 2, 87, FALSE),
   ('6.1.a', 'Los productos eleborados cumplen a cabalidad con la NORDOM 53, Etiquetado general de los productos previamente envasados (pre-envasados)', 3, 88, TRUE),
   ('7', 'TRANSPORTE', 1, 89, FALSE),
   ('7.a', 'Los medios de transporte son adecuados a la naturaleza de los productos que transportan y permiten, cuando procede, el control de temperatura, el grado de humedad, el aire y otras condiciones necesarias para proteger los alimentos contra la proliferación de microorganismos nocicos y el deterioro.', 2, 90, TRUE)
  ) AS x(numeracion, titulo, nivel, orden, evaluable)
 WHERE v.numero_version = '2024.10';

-- Pasada 2: resolver la jerarquía derivando el padre de la numeración
-- (el padre de "1.1.3.2" es "1.1.3"; el de "1.1.1.a" es "1.1.1")
UPDATE item_ficha h SET id_padre = p.id
  FROM item_ficha p
 WHERE h.version_ficha_id = p.version_ficha_id
   AND POSITION('.' IN h.numeracion) > 0
   AND p.numeracion = LEFT(h.numeracion, LENGTH(h.numeracion) - POSITION('.' IN REVERSE(h.numeracion)));

-- Verificación de integridad del seed
DO $$ DECLARE n INT; e INT; raices INT; huerf INT; BEGIN
  SELECT COUNT(*) INTO n FROM item_ficha;
  SELECT COUNT(*) INTO e FROM item_ficha WHERE es_evaluable;
  SELECT COUNT(*) INTO raices FROM item_ficha WHERE id_padre IS NULL;
  SELECT COUNT(*) INTO huerf FROM item_ficha WHERE id_padre IS NULL AND POSITION('.' IN numeracion) > 0;
  RAISE NOTICE 'Ficha BPM: % nodos, % evaluables, % raices, % huerfanos', n, e, raices, huerf;
  IF e <> 45 THEN RAISE EXCEPTION 'Se esperaban 45 criterios evaluables, hay %', e; END IF;
  IF huerf > 0 THEN RAISE EXCEPTION 'Hay % nodos con numeracion compuesta sin padre resuelto', huerf; END IF;
  RAISE NOTICE 'Seed de la ficha verificado correctamente';
END $$;