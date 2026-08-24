-- =====================================================================
-- Archivo 04 de 05 — Seed: Matriz de Riesgo de Alimentos
-- Generado desde Matriz_Riesgo_Alimentos.xlsx
-- 17 categorías · 111 subcategorías
-- Defecto D-03: 5 subcategorías sin nivel de riesgo en el archivo fuente
-- Defecto D-06: 1 categoría(s) declarada(s) sin subcategorías
-- =====================================================================
SET search_path TO ebr, public;

-- Niveles de riesgo. Reconcilia las dos escalas del dominio:
--   puntaje_matriz  (2/4/8) — Matriz de Riesgo de Alimentos, fórmula IFS col. D
--   puntaje_rp      (1/2/3) — Hoja Frecuencia Inspección, filas 14-16
INSERT INTO nivel_riesgo (codigo, nombre, puntaje_matriz, puntaje_rp, color_hex, orden) VALUES
  ('BAJO',  'Riesgo bajo',  2.00, 1.00, '#2E7D32', 1),
  ('MEDIO', 'Riesgo medio', 4.00, 2.00, '#F9A825', 2),
  ('ALTO',  'Riesgo alto',  8.00, 3.00, '#C62828', 3);

-- Categorías de alimento (17 registros extraídos de 110 filas con el nombre repetido)
INSERT INTO categoria_alimento (nombre, orden) VALUES
  ('Productos lácteos', 1),
  ('Grasas y aceites y emulsiones grasas', 2),
  ('Hielos comestibles incluidos sorbetes', 3),
  ('Frutas y Hortalizas', 4),
  ('Confitería', 5),
  ('Cereales y productos a base de cereales, derivados de granos de cereales, de raíces y tubérculos, legumbres, leguminosas y médula o corazón blando de palmera, excluidos los productos de panadería', 6),
  ('Productos de panadería', 7),
  ('Carne y productos cárnicos, incluidos los de aves de corral y Pescados y productos pesqueros', 8),
  ('Huevos y productos a base de huevo', 9),
  ('Edulcorantes, incluida la miel', 10),
  ('Sales, especias, sopas, salsas, y productos proteínicos', 11),
  ('Productos alimenticios para usos nutricionales especiales', 12),
  ('Bebidas alcohólicas y no alcohólicas, excluidos los productos lácteos', 13),
  ('Aperitivos listos para el consumo', 14),
  ('Postres', 15),
  ('Pescado y productos pesqueros, incluidos moluscos, crustáceos y equinodermos', 16),
  ('Alimentos preparados', 17);

-- Subcategorías, enlazadas a su categoría por nombre
INSERT INTO subcategoria_alimento (categoria_id, nombre, nivel_riesgo_microbiologico_id, nivel_riesgo_quimico_id, requiere_revision, nota_revision)
SELECT c.id, x.nombre, nm.id, nq.id,
       (x.micro IS NULL AND x.quimico IS NULL) OR x.huerfana,
       CASE WHEN x.huerfana
            THEN 'Categoria declarada sin subcategorias en el archivo fuente; subcategoria homonima creada (defecto D-06)'
            WHEN x.micro IS NULL AND x.quimico IS NULL
            THEN 'Sin nivel de riesgo en el archivo fuente (defecto D-03)' END
  FROM (VALUES
   ('Productos lácteos', 'Productos lácteos líquidos no fermentados, proceso de pasteurización y UHT', 'BAJO', NULL, FALSE),
   ('Productos lácteos', 'Productos lácteos fermentados', 'BAJO', NULL, FALSE),
   ('Productos lácteos', 'Grasa láctea', 'BAJO', NULL, FALSE),
   ('Productos lácteos', 'Queso fresco pasteurizado (madurado menos menos de 60 días)', 'MEDIO', NULL, FALSE),
   ('Productos lácteos', 'Queso madurado pasteurizado (madurado más de 60 días)', 'BAJO', NULL, FALSE),
   ('Productos lácteos', 'Queso elaborado, fundido, procesado', 'BAJO', NULL, FALSE),
   ('Productos lácteos', 'Queso fresco pasteurizado (con ingredientes añadidos)', 'MEDIO', NULL, FALSE),
   ('Productos lácteos', 'Productos lácteos en polvo', 'BAJO', NULL, FALSE),
   ('Productos lácteos', 'Helados', 'BAJO', NULL, FALSE),
   ('Productos lácteos', 'Dulces', 'BAJO', NULL, FALSE),
   ('Productos lácteos', 'Mantequilla no pasteurizada', 'ALTO', NULL, FALSE),
   ('Productos lácteos', 'Queso fresco no pasteurizado', 'ALTO', NULL, FALSE),
   ('Productos lácteos', 'Queso madurado (>60 días ) no pasteurizado', 'MEDIO', NULL, FALSE),
   ('Grasas y aceites y emulsiones grasas', 'Grasas y aceites (aw muy baja: <0.6)', 'BAJO', NULL, FALSE),
   ('Grasas y aceites y emulsiones grasas', 'Emulsiones grasas, principalmente del tipo agua en aceite', 'BAJO', NULL, FALSE),
   ('Grasas y aceites y emulsiones grasas', 'Emulsiones grasas, principalmente del tipo agua en aceite, incluidos los productos a base de emulsiones grasas mezcladas y/o aromatizados', 'BAJO', NULL, FALSE),
   ('Hielos comestibles incluidos sorbetes', 'Helados a base de agua elaborados con grasas vegetales.', 'BAJO', NULL, FALSE),
   ('Frutas y Hortalizas', 'Frutas congeladas', 'ALTO', NULL, FALSE),
   ('Frutas y Hortalizas', 'Frutas desecadas', 'BAJO', NULL, FALSE),
   ('Frutas y Hortalizas', 'Frutas en vinagre, aceite o salmuera', 'BAJO', NULL, FALSE),
   ('Frutas y Hortalizas', 'Frutas en conserva, enlatadas o en frascos (pasteurizadas)', 'BAJO', 'MEDIO', FALSE),
   ('Frutas y Hortalizas', 'Confituras, jaleas, mermeladas', 'BAJO', NULL, FALSE),
   ('Frutas y Hortalizas', 'Hortalizas, algas marinas, nueces y semillas congeladas', 'MEDIO', NULL, FALSE),
   ('Frutas y Hortalizas', 'Hortalizas, algas marinas, nueces y semillas desecadas', 'BAJO', NULL, FALSE),
   ('Frutas y Hortalizas', 'Hortalizas, algas marinas, nueces y semillas en vinagre, aceite, salmuera o salsa de soja', 'BAJO', NULL, FALSE),
   ('Frutas y Hortalizas', 'Hortalizas, algas marinas, nueces y semillas en conserva, en latas o frascos (pasteurizadas) o en bolsas de esterilización', 'BAJO', NULL, FALSE),
   ('Frutas y Hortalizas', 'Purés y preparados para untar elaborados con hortalizas (incluidos hongos y setas, raíces y tubérculos, legumbres y leguminosas, incluyendo el maní).', NULL, NULL, FALSE),
   ('Frutas y Hortalizas', 'Pulpas y preparados de hortalizas', NULL, NULL, FALSE),
   ('Frutas y Hortalizas', 'Productos a base de hortalizas fermentadas, excluidos los productos fermentados de soja', NULL, NULL, FALSE),
   ('Confitería', 'Productos de cacao y chocolate, incluidos los productos de imitación y los sucedáneos del chocolate', 'BAJO', NULL, FALSE),
   ('Confitería', 'Dulces incluidos los caramelos duros y blandos, los turrones, etc.', 'BAJO', NULL, FALSE),
   ('Confitería', 'Goma de mascar', 'BAJO', NULL, FALSE),
   ('Confitería', 'Decoraciones (p. ej. para productos de pastelería fina), revestimientos (que no sean de fruta) y salsas dulces', 'BAJO', NULL, FALSE),
   ('Cereales y productos a base de cereales, derivados de granos de cereales, de raíces y tubérculos, legumbres, leguminosas y médula o corazón blando de palmera, excluidos los productos de panadería', 'Granos enteros, triturados o en copos, incluido el arroz', 'BAJO', NULL, FALSE),
   ('Cereales y productos a base de cereales, derivados de granos de cereales, de raíces y tubérculos, legumbres, leguminosas y médula o corazón blando de palmera, excluidos los productos de panadería', 'Harinas y almidones', 'BAJO', NULL, FALSE),
   ('Cereales y productos a base de cereales, derivados de granos de cereales, de raíces y tubérculos, legumbres, leguminosas y médula o corazón blando de palmera, excluidos los productos de panadería', 'Cereales para el desayuno, incluidos los copos de avena', 'BAJO', NULL, FALSE),
   ('Cereales y productos a base de cereales, derivados de granos de cereales, de raíces y tubérculos, legumbres, leguminosas y médula o corazón blando de palmera, excluidos los productos de panadería', 'Pastas y fideos frescos y productos análogos', 'BAJO', NULL, FALSE),
   ('Cereales y productos a base de cereales, derivados de granos de cereales, de raíces y tubérculos, legumbres, leguminosas y médula o corazón blando de palmera, excluidos los productos de panadería', 'Pastas y fideos deshidratados y productos análogos', 'BAJO', NULL, FALSE),
   ('Cereales y productos a base de cereales, derivados de granos de cereales, de raíces y tubérculos, legumbres, leguminosas y médula o corazón blando de palmera, excluidos los productos de panadería', 'Pastas y fideos precocidos y productos análogos', 'BAJO', NULL, FALSE),
   ('Cereales y productos a base de cereales, derivados de granos de cereales, de raíces y tubérculos, legumbres, leguminosas y médula o corazón blando de palmera, excluidos los productos de panadería', 'Mezclas batidas para rebozar (p. ej. para empanar o rebozar pescado o carne de aves de corral)', 'BAJO', NULL, FALSE),
   ('Cereales y productos a base de cereales, derivados de granos de cereales, de raíces y tubérculos, legumbres, leguminosas y médula o corazón blando de palmera, excluidos los productos de panadería', 'Productos a base de arroz precocidos o elaborados, incluidas las tortas de arroz (sólo del tipo oriental)', 'BAJO', NULL, FALSE),
   ('Cereales y productos a base de cereales, derivados de granos de cereales, de raíces y tubérculos, legumbres, leguminosas y médula o corazón blando de palmera, excluidos los productos de panadería', 'Productos a base de soja (excluidos aderezos y condimentos a base de soja)', 'BAJO', NULL, FALSE),
   ('Cereales y productos a base de cereales, derivados de granos de cereales, de raíces y tubérculos, legumbres, leguminosas y médula o corazón blando de palmera, excluidos los productos de panadería', 'Cuajada de soja deshidratada', NULL, NULL, FALSE),
   ('Cereales y productos a base de cereales, derivados de granos de cereales, de raíces y tubérculos, legumbres, leguminosas y médula o corazón blando de palmera, excluidos los productos de panadería', 'Soja fermentada', NULL, NULL, FALSE),
   ('Productos de panadería', 'Pan y productos de panadería ordinaria', 'BAJO', NULL, FALSE),
   ('Productos de panadería', 'Productos de panadería fina (dulces, salados, aromatizados) y mezclas', 'BAJO', NULL, FALSE),
   ('Carne y productos cárnicos, incluidos los de aves de corral y Pescados y productos pesqueros', 'Crudo no intacto', 'ALTO', 'ALTO', FALSE),
   ('Carne y productos cárnicos, incluidos los de aves de corral y Pescados y productos pesqueros', 'Crudo intacto', 'ALTO', 'ALTO', FALSE),
   ('Carne y productos cárnicos, incluidos los de aves de corral y Pescados y productos pesqueros', 'Procesado térmicamente - Comercialmente estéril', 'BAJO', NULL, FALSE),
   ('Carne y productos cárnicos, incluidos los de aves de corral y Pescados y productos pesqueros', 'No tratado térmicamente - Estable a temperatura ambiente', 'MEDIO', NULL, FALSE),
   ('Carne y productos cárnicos, incluidos los de aves de corral y Pescados y productos pesqueros', 'Tratado térmicamente - Estable a temperatura ambiente', 'BAJO', NULL, FALSE),
   ('Carne y productos cárnicos, incluidos los de aves de corral y Pescados y productos pesqueros', 'Completamente cocido - No estable a temperatura ambiente', 'BAJO', NULL, FALSE),
   ('Carne y productos cárnicos, incluidos los de aves de corral y Pescados y productos pesqueros', 'Tratado térmico parcial (sin alcanzar la letalidad) - No estable a temperatura ambiente', 'MEDIO', NULL, FALSE),
   ('Huevos y productos a base de huevo', 'Huevos frescos', 'ALTO', NULL, FALSE),
   ('Huevos y productos a base de huevo', 'Productos líquidos a base de huevo pasteurizado', 'BAJO', NULL, FALSE),
   ('Huevos y productos a base de huevo', 'Productos congelados a base de huevo pasteurizado', 'BAJO', NULL, FALSE),
   ('Huevos y productos a base de huevo', 'Productos a base de huevo en polvo y/o cuajados por calor', 'BAJO', NULL, FALSE),
   ('Huevos y productos a base de huevo', 'Huevos en conserva, incluidos los huevos en álcali, salados y envasados', 'MEDIO', NULL, FALSE),
   ('Edulcorantes, incluida la miel', 'Azúcares refinados y en bruto', 'BAJO', NULL, FALSE),
   ('Edulcorantes, incluida la miel', 'Soluciones azucaradas y jarabes, también azúcares (parcialmente) invertidos, incluida la melaza', 'BAJO', NULL, FALSE),
   ('Edulcorantes, incluida la miel', 'Otros azúcares y jarabes (por ej. xilosa, jarabe de arce y revestimientos de azúcar)', 'BAJO', NULL, FALSE),
   ('Edulcorantes, incluida la miel', 'Miel', 'BAJO', NULL, FALSE),
   ('Edulcorantes, incluida la miel', 'Edulcorantes de mesa, incluidos los que contienen edulcorantes de gran intensidad', 'BAJO', NULL, FALSE),
   ('Sales, especias, sopas, salsas, y productos proteínicos', 'Sal y sucedáneos de la sal', 'BAJO', NULL, FALSE),
   ('Sales, especias, sopas, salsas, y productos proteínicos', 'Hierbas aromáticas, especias, aderezos y condimentos (p. ej. el aderezo para fideos instantáneos)', 'BAJO', NULL, FALSE),
   ('Sales, especias, sopas, salsas, y productos proteínicos', 'Vinagres', 'BAJO', NULL, FALSE),
   ('Sales, especias, sopas, salsas, y productos proteínicos', 'Mostazas', 'BAJO', NULL, FALSE),
   ('Sales, especias, sopas, salsas, y productos proteínicos', 'Sopas y caldos', 'BAJO', NULL, FALSE),
   ('Sales, especias, sopas, salsas, y productos proteínicos', 'Salsas y productos análogos', 'BAJO', NULL, FALSE),
   ('Sales, especias, sopas, salsas, y productos proteínicos', 'Levadura y productos similares', 'BAJO', NULL, FALSE),
   ('Sales, especias, sopas, salsas, y productos proteínicos', 'Aderezos y condimentos a base de soja', 'BAJO', NULL, FALSE),
   ('Sales, especias, sopas, salsas, y productos proteínicos', 'Productos proteínicos distintos a los de soja', 'BAJO', NULL, FALSE),
   ('Productos alimenticios para usos nutricionales especiales', 'Preparados para lactantes líquidos', 'ALTO', NULL, FALSE),
   ('Productos alimenticios para usos nutricionales especiales', 'Preparados para lactantes en polvo', 'ALTO', NULL, FALSE),
   ('Productos alimenticios para usos nutricionales especiales', 'Preparados de continuación líquidos', 'ALTO', NULL, FALSE),
   ('Productos alimenticios para usos nutricionales especiales', 'Preparados de continuación en polvo', 'ALTO', NULL, FALSE),
   ('Productos alimenticios para usos nutricionales especiales', 'Preparados para usos medicinales específicos destinados a los lactantes líquidos', 'BAJO', NULL, FALSE),
   ('Productos alimenticios para usos nutricionales especiales', 'Preparados para usos medicinales específicos destinados a los lactantes en polvo', 'BAJO', NULL, FALSE),
   ('Productos alimenticios para usos nutricionales especiales', 'Alimentos complementarios para lactantes y niños pequeños sólidos (polvos y granulados)', 'BAJO', NULL, FALSE),
   ('Productos alimenticios para usos nutricionales especiales', 'Alimentos complementarios para lactantes y niños pequeños semisólidos (compotas)', 'BAJO', NULL, FALSE),
   ('Productos alimenticios para usos nutricionales especiales', 'Alimentos dietéticos para usos medicinales especiales (excluidos los productos de preparados para lactantes, preparados de continuación y preparados para usos medicinales especiales destinados a los lactantes)', 'BAJO', NULL, FALSE),
   ('Productos alimenticios para usos nutricionales especiales', 'Preparados dietéticos para adelgazamiento y control del peso', 'ALTO', NULL, FALSE),
   ('Productos alimenticios para usos nutricionales especiales', 'Alimentos dietéticos (complementos alimenticios para usos dietéticos), excluidos los indicados en las categorías previas', 'ALTO', NULL, FALSE),
   ('Bebidas alcohólicas y no alcohólicas, excluidos los productos lácteos', 'Aguas', 'BAJO', NULL, FALSE),
   ('Bebidas alcohólicas y no alcohólicas, excluidos los productos lácteos', 'Jugos y néctares de frutas y hortalizas tratados térmicamente', 'BAJO', NULL, FALSE),
   ('Bebidas alcohólicas y no alcohólicas, excluidos los productos lácteos', 'Jugos artesanales (no tratados térmicamente)', 'ALTO', NULL, FALSE),
   ('Bebidas alcohólicas y no alcohólicas, excluidos los productos lácteos', 'Bebidas a base de agua aromatizadas, incluidas las bebidas para deportistas, bebidas electrolíticas y bebidas con partículas añadidas', 'BAJO', NULL, FALSE),
   ('Bebidas alcohólicas y no alcohólicas, excluidos los productos lácteos', 'Café, sucedáneos del café, té, infusiones de hierbas y otras bebidas calientes a base de cereales y granos, excluido el cacao', 'BAJO', NULL, FALSE),
   ('Bebidas alcohólicas y no alcohólicas, excluidos los productos lácteos', 'Cerveza y bebidas a base de malta', 'BAJO', NULL, FALSE),
   ('Bebidas alcohólicas y no alcohólicas, excluidos los productos lácteos', 'Sidra y sidra de pera', 'BAJO', NULL, FALSE),
   ('Bebidas alcohólicas y no alcohólicas, excluidos los productos lácteos', 'Vinos de uva', 'BAJO', NULL, FALSE),
   ('Bebidas alcohólicas y no alcohólicas, excluidos los productos lácteos', 'Vinos (distintos de los de uva)', 'BAJO', NULL, FALSE),
   ('Bebidas alcohólicas y no alcohólicas, excluidos los productos lácteos', 'Aguamiel', 'BAJO', NULL, FALSE),
   ('Bebidas alcohólicas y no alcohólicas, excluidos los productos lácteos', 'Licores destilados que contengan más de un 15 por ciento de alcohol', 'BAJO', NULL, FALSE),
   ('Bebidas alcohólicas y no alcohólicas, excluidos los productos lácteos', 'Bebidas alcohólicas aromatizadas (p. ej. cerveza, vino y bebidas espirituosas tipo refresco, refrescos con bajo contenido de alcohol)', 'BAJO', NULL, FALSE),
   ('Aperitivos listos para el consumo', 'Aperitivos a base de patatas (papas), cereales, harina o almidón (derivados de raíces y tubérculos, legumbres y leguminosas)', 'BAJO', NULL, FALSE),
   ('Aperitivos listos para el consumo', 'Nueces elaboradas, incluidas las nueces revestidas y mezclas de nueces (p. ej. con frutas secas)', 'BAJO', NULL, FALSE),
   ('Postres', 'Postres a base de leche', 'BAJO', NULL, FALSE),
   ('Postres', 'Postres a base de huevo', 'BAJO', NULL, FALSE),
   ('Postres', 'Postres a base de grasas, excluidos los postres lácteos (como pudines, yogur aromatizado o con fruta)', 'BAJO', NULL, FALSE),
   ('Postres', 'Postres a base de cereales y almidón (p. ej. pudines de arroz, pudines de yuca)', 'BAJO', NULL, FALSE),
   ('Pescado y productos pesqueros, incluidos moluscos, crustáceos y equinodermos', 'Pescado, filetes de pescado y productos pesqueros congelados, incluidos moluscos, crustáceos y equinodermos', 'MEDIO', NULL, FALSE),
   ('Pescado y productos pesqueros, incluidos moluscos, crustáceos y equinodermos', 'Pescado, filetes de pescado y productos pesqueros rebozados congelados, incluidos moluscos, crustáceos y equinodermos', 'MEDIO', NULL, FALSE),
   ('Pescado y productos pesqueros, incluidos moluscos, crustáceos y equinodermos', 'Productos pesqueros picados, amalgamados (mezclados) y congelados, incluidos moluscos, crustáceos y equinodermos', 'MEDIO', NULL, FALSE),
   ('Pescado y productos pesqueros, incluidos moluscos, crustáceos y equinodermos', 'Pescado y productos pesqueros cocidos, incluidos moluscos, crustáceos y equinodermos', 'BAJO', NULL, FALSE),
   ('Pescado y productos pesqueros, incluidos moluscos, crustáceos y equinodermos', 'p', 'BAJO', NULL, FALSE),
   ('Pescado y productos pesqueros, incluidos moluscos, crustáceos y equinodermos', 'Pescado y productos pesqueros ahumados, desecados, fermentados y/o salados, incluidos moluscos, crustáceos y equinodermos', 'MEDIO', NULL, FALSE),
   ('Pescado y productos pesqueros, incluidos moluscos, crustáceos y equinodermos', 'Pescado y productos pesqueros marinados y/o en gelatina, incluidos moluscos, crustáceos y equinodermos', 'MEDIO', NULL, FALSE),
   ('Pescado y productos pesqueros, incluidos moluscos, crustáceos y equinodermos', 'Sucedáneos de salmón, caviar y otros productos pesqueros a base de huevas', 'MEDIO', NULL, FALSE),
   ('Pescado y productos pesqueros, incluidos moluscos, crustáceos y equinodermos', 'Pescado y productos pesqueros (incluidos los moluscos, crustáceos y equinodermos) en conserva, con inclusión de los enlatados y fermentados', 'BAJO', NULL, FALSE),
   ('Alimentos preparados', 'Alimentos preparados', 'BAJO', NULL, TRUE)
  ) AS x(categoria, nombre, micro, quimico, huerfana)
  JOIN categoria_alimento c ON c.nombre = x.categoria
  LEFT JOIN nivel_riesgo nm ON nm.codigo = x.micro
  LEFT JOIN nivel_riesgo nq ON nq.codigo = x.quimico;

-- Riesgo total = promedio de los puntajes disponibles (desnormalización D-04)
UPDATE subcategoria_alimento s SET riesgo_total_calculado = (
  SELECT ROUND(AVG(p), 2) FROM (
    SELECT nm.puntaje_matriz AS p FROM nivel_riesgo nm WHERE nm.id = s.nivel_riesgo_microbiologico_id
    UNION ALL
    SELECT nq.puntaje_matriz     FROM nivel_riesgo nq WHERE nq.id = s.nivel_riesgo_quimico_id
  ) t)
WHERE s.nivel_riesgo_microbiologico_id IS NOT NULL OR s.nivel_riesgo_quimico_id IS NOT NULL;

DO $$ DECLARE c INT; s INT; sr INT; BEGIN
  SELECT COUNT(*) INTO c FROM categoria_alimento;
  SELECT COUNT(*) INTO s FROM subcategoria_alimento;
  SELECT COUNT(*) INTO sr FROM subcategoria_alimento WHERE requiere_revision;
  RAISE NOTICE 'Matriz de alimentos: % categorias, % subcategorias, % requieren revision', c, s, sr;
  IF c <> 17 OR s <> 111 THEN RAISE EXCEPTION 'Conteo incorrecto'; END IF;
END $$;