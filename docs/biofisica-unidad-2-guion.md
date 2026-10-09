# Biofísica · Unidad 2 — Biofísica cardiovascular y respiratoria

*Guion de las lecciones interactivas B.1–B.4 de Scratch Physics, en español.*
Fuente: presentaciones *Biofísica 6, 7 y 8* (Universidad del Norte, Medicina,
segundo semestre; semanas 7–11). Implementación: `src/lesson/bio/`.

La unidad se divide en **cuatro lecciones**, una por bloque de contenidos. Cada
una dura unos 50–60 minutos, que es lo que el curso dedica a cada tema entre
clase magistral y horas complementarias.

| Lección | Tema | Semanas | Enlace |
| --- | --- | --- | --- |
| B.1 | Presión en los fluidos y presión arterial | 7 (1.ª parte) | `#presion` |
| B.2 | La pared del vaso: rigidez vascular | 7 (2.ª parte) | `#pared` |
| B.3 | Flujo: caudal, continuidad, Bernoulli, Reynolds y viscosidad | 8–9 | `#flujo` |
| B.4 | Resistencia hidráulica y ley de Poiseuille (y Boyle) | 10–11 | `#poiseuille` |

---

## 1. Cómo está construida cada lección

Cada idea pasa por las mismas cinco etapas. Esto es lo que convierte una
presentación de 40 diapositivas en una hora de aprendizaje real:

| Etapa | En la lección | Por qué (evidencia) |
| --- | --- | --- |
| Presentar (*ver*) | Una idea por escena, con dibujo técnico animado | Mayer: segmentación, señalización, coherencia |
| Explorar (*hacer*) | Arrastrar, inflar, estrechar, acostar al paciente… | Schwartz y Bransford, *A time for telling* |
| Predecir antes de ver | "Si el radio se reduce a la mitad, el flujo…" | Predecir–observar–explicar (POE) |
| Ejemplo resuelto | Paso a paso, con pausa en cada paso y panel de trabajo | Sweller; Renkl (ejemplos resueltos) |
| Práctica guiada | El estudiante calcula; cada error frecuente tiene su retroalimentación | Renkl y Atkinson (desvanecimiento) |
| Práctica con dominio | Problemas generados hasta acertar 4 seguidos | Bloom (*mastery learning*); Rohrer (intercalado) |

**Convenciones**

- Números con coma decimal (1,30 m) y espacio de miles (101 325 Pa), como en las diapositivas.
- *g* = 9,8 m/s²; *ρ*<sub>sangre</sub> = 1060 kg/m³; 1 mmHg = 133,3 Pa; 1 atm = 760 mmHg = 101 325 Pa.
- Presión **manométrica** (la que mide un tensiómetro) = presión absoluta − *P*<sub>0</sub>.
- Las respuestas numéricas aceptan coma o punto y un error relativo de alrededor del 2 %.

---

## 2. Lección B.1 — Presión en los fluidos

### Objetivos (de las diapositivas)

1. Comprender cómo la presión en un fluido cambia a medida que aumenta la profundidad.
2. Aplicar la ley de Pascal: la presión aplicada a un fluido encerrado se transmite por igual en todas las direcciones.
3. Comprender cómo la posición del cuerpo afecta la presión arterial.
4. Interpretar las presiones sistólica, diastólica, de pulso y media, y su medición.

### Recorrido

| Cap. | Escena | Tipo | Qué hace el estudiante |
| --- | --- | --- | --- |
| 1 Presión | Bloque de 600 N sobre el suelo | ver | Ve que el peso se reparte sobre el área: *P* = *F*/*A* |
| | Mismo bloque, ancho variable | hacer | Lo hace angosto y ancho; lee *P* en Pa |
| | Manómetros: 120 mmHg y 1 atm | ver | Unidades: Pa, mmHg, atm |
| | Conversión | número | 120 mmHg → **16,0 kPa** |
| 2 Densidad | Tres cubos de igual volumen | ver | Aire (1,2), sangre (1060), hueso (≈ 1900 kg/m³); atenuación en rayos X |
| | Masa de 1 L de sangre | elección | **1,06 kg** |
| 3 Profundidad | Columna de líquido sobre un área *A* | ver | *W* = *ρgAh* → *P* = *P*<sub>0</sub> + *ρgh* |
| | Absoluta frente a manométrica | ver | "120 mmHg" es manométrica |
| | Sensor a distintas profundidades | hacer | Cada posición deja un punto: la gráfica *P*–*h* es una recta |
| | Paradoja hidrostática | elección | Tres recipientes de forma distinta: **igual presión** |
| | Ejemplo: tímpano a 4 m | ejemplo (3 pasos) | *F* ≈ 11,8 N |
| | Tanque petróleo/agua salada | número ×2 | *P*<sub>1</sub> = 156,2 kPa; *P*<sub>fondo</sub> = 206,4 kPa |
| 4 Pascal | Tubo en U con agua y aceite | ver | *ρ*<sub>1</sub>*h*<sub>1</sub> = *ρ*<sub>2</sub>*h*<sub>2</sub> |
| | Altura de agua que equilibra 10 cm de aceite | número | **7 cm** |
| | Prensa hidráulica | ver | *F*<sub>1</sub>/*A*<sub>1</sub> = *F*<sub>2</sub>/*A*<sub>2</sub>: 20 N → 1000 N |
| | El manguito del tensiómetro | ver | Presión ≠ fuerza; manguito inadecuado → error |
| 5 Postura | Paciente de pie, nivel del corazón | ver | Δ*P* = *ρg*Δ*h* respecto al corazón |
| | Sensor de la cabeza a los pies; acostar | hacer | De pie ≈ 70 (cabeza) y 200 mmHg (tobillo); acostado ≈ 100 en todo el cuerpo |
| | Caso 01: corazón → tobillo, 1,30 m | ejemplo (3 pasos) | Δ*P* = 13 504 Pa ≈ 101 mmHg |
| | PAM en la cabeza (0,40 m sobre el corazón) | número | **≈ 69 mmHg** |
| | Caso 1: hipotensión ortostática | elección | Acumulación venosa en las piernas |
| 6 Presión arterial | Onda de presión en tres latidos | ver | Sistólica, diastólica, presión de pulso |
| | PAM | ver | PAM ≈ PAD + ⅓(PAS − PAD) |
| | PAM para 150/90 | número | **110 mmHg** |
| | Presión a lo largo del circuito | ver | La mayor caída está en las arteriolas; la circulación pulmonar es ≈ 25/10 |
| | ¿Dónde cae más la presión? | elección | **Arteriolas** |
| | Medición con manguito: ruidos de Korotkoff | ver | 1.er ruido = PAS; silencio = PAD |
| | Error frecuente al medir | elección | **Desinflar muy rápido** |
| 7 Práctica | Problemas generados | dominio | Ver §6 |

### Ejemplos resueltos

**Tímpano a 4 m de profundidad** (*A* ≈ 3 cm²)

1. Presión manométrica: *ρgh* = 1000 · 9,8 · 4 = 39 200 Pa.
2. Área en m²: 3 cm² = 3 × 10⁻⁴ m².
3. Fuerza: *F* = *P* · *A* = 39 200 · 3 × 10⁻⁴ ≈ **11,8 N**, el peso de unos 1,2 kg. Por eso duele bucear sin compensar el oído medio.

**Tanque de petróleo** (*h*<sub>1</sub> = 8,00 m de petróleo a 700 kg/m³ sobre *h*<sub>2</sub> = 5,00 m de agua salada a 1025 kg/m³; tanque abierto)

1. En la interfase: *P*<sub>1</sub> = *P*<sub>0</sub> + *ρ*<sub>1</sub>*gh*<sub>1</sub> = 101 325 + 700 · 9,8 · 8 = 156 205 Pa.
2. En el fondo: *P*<sub>fondo</sub> = *P*<sub>1</sub> + *ρ*<sub>2</sub>*gh*<sub>2</sub> = 156 205 + 1025 · 9,8 · 5 = **206 430 Pa ≈ 2 atm**.

**Caso 01 — presión hidrostática y postura** (de pie, corazón–tobillo 1,30 m)

1. Δ*P* = 1060 · 9,8 · 1,30 = 13 504 Pa.
2. 13 504 / 133,3 ≈ **101 mmHg**.
3. PAM en el tobillo ≈ 100 + 101 ≈ 200 mmHg. Lo mismo ocurre en las venas, lo que favorece el edema maleolar y la insuficiencia venosa.

### Errores frecuentes trabajados

| Error | Dónde aparece la retroalimentación |
| --- | --- |
| Dividir entre 133,3 en lugar de multiplicar | Conversión mmHg → kPa |
| Creer que más líquido (o un fondo más ancho) da más presión | Paradoja hidrostática |
| Olvidar *P*<sub>0</sub> cuando se pide presión absoluta | Tanque de petróleo |
| Usar una sola densidad para dos capas | Tanque de petróleo |
| Invertir la proporción del tubo en U | Tubo en U |
| Sumar Δ*P* por encima del corazón | PAM en la cabeza |
| Calcular la PAM como el promedio simple | PAM 150/90 |
| Atribuir el mareo ortostático a la presión atmosférica | Caso 1 |

---

## 3. Lección B.2 — La pared del vaso

### Objetivos

1. Comprender los principios físicos que rigen la presión y la rigidez vascular y su aplicación en la fisiología y la patología cardiovascular.
2. Distinguir módulo de elasticidad, extensibilidad, compliance y distensibilidad.
3. Explicar la función amortiguadora de la aorta y el efecto de la rigidez sobre la presión de pulso.
4. Aplicar la ley de Laplace a los aneurismas y la velocidad de onda de pulso a la rigidez arterial.

### Recorrido

| Cap. | Escena | Tipo | Qué hace el estudiante |
| --- | --- | --- | --- |
| 1 Elasticidad | Tira de pared arterial | ver | *σ* = *F*/*A*, *ε* = Δ*L*/*L*<sub>0</sub>, *E* = *σ*/*ε* |
| | Estirar pared sana y pared rígida | hacer | Puntos en la gráfica *σ*–*ε*: la rígida tiene pendiente 4 veces mayor |
| 2 Compliance | Segmento que se infla; curvas *P*–*V* | ver | *C* = Δ*V*/Δ*P*; arterias empinadas, venas casi planas (Guyton) |
| | Inflar arteria y vena | hacer | Las venas son el reservorio (≈ 24 veces más compliantes) |
| | Distensibilidad | ver | *D* = Δ*V*/(*V*<sub>0</sub>Δ*P*); *C* = *D* · *V* |
| | Caso 02: aorta 1000 → 1070 mL, +10 mmHg | ejemplo (3 pasos) | *C* = 7 mL/mmHg; *D* = 0,7 %/mmHg |
| | Vena: 300 mL, +60 mL, +5 mmHg | número ×2 | *C* = **12 mL/mmHg**; *D* = **4 %/mmHg** |
| 3 Amortiguador | Modelo de Windkessel animado | ver | La aorta guarda volumen en la sístole y lo devuelve en la diástole |
| | Compliance variable | hacer | Rígida → PAS ↑, PAD ↓, presión de pulso ↑ (≈ 150/55) |
| | Paciente de 70 años con 160/80 | elección | Pérdida de elasticidad arterial |
| 4 Laplace | Corte transversal: presión y tensión | ver | *T* = *P r*; *σ* = *P r*/*h* |
| | Aneurisma que crece | hacer | *T* ∝ *r*: círculo vicioso |
| | Caso 03: 1,0 → 2,5 mm | ejemplo (3 pasos) | La tensión se multiplica por **2,5** |
| | Además, la pared se adelgaza a la mitad | número | El esfuerzo se multiplica por **5** |
| 5 VOP | Onda de pulso de la carótida a la femoral | ver | VOP = *d*/Δ*t*; *c* ∝ √(*Eh*/*ρr*) |
| | Caso 04: paciente A y paciente B | número ×2, elección | A = **8 m/s**, B = **6 m/s**; A es más rígido; CAVI ≥ 9 |
| 6 Relacionar | Actividad de la clase (7 conceptos, 7 definiciones) | emparejar | Ver tabla abajo |
| 7 Práctica | Problemas generados | dominio | Ver §6 |

### Modelo de Windkessel (cap. 3)

*C* · d*P*/d*t* = *Q*(*t*) − *P*/*R*, con eyección semisinusoidal de 70 mL en 0,3 s
cada 0,8 s y *R* = 1,12 mmHg·s/mL. Valores que produce:

| *C* (mL/mmHg) | PAS/PAD (mmHg) | Presión de pulso |
| --- | --- | --- |
| 1,1 (joven) | ≈ 119/78 | ≈ 41 |
| 0,7 | ≈ 132/68 | ≈ 64 |
| 0,45 (rígida) | ≈ 152/54 | ≈ 98 |

El modelo de dos elementos exagera la caída diastólica, pero reproduce la
tendencia clínica: con la edad sube la sistólica y se ensancha la presión de pulso.

### Relaciona conceptos (respuestas)

| Concepto | Definición |
| --- | --- |
| 1 Extensibilidad | C · Capacidad del vaso para estirarse ante una fuerza |
| 2 Módulo de elasticidad | E · Relación entre tensión mecánica y deformación |
| 3 Distensibilidad | F · Cambio relativo de volumen ante variaciones de presión |
| 4 Compliance | A · Cambio de volumen por cada cambio de presión |
| 5 Velocidad de onda de pulso | G · Rapidez de propagación de la onda de presión arterial |
| 6 Índice CAVI | D · Índice de rigidez desde el corazón hasta el tobillo |
| 7 Ley de Laplace | B · Relación entre tensión de pared, presión y radio vascular |

### Errores frecuentes trabajados

| Error | Dónde |
| --- | --- |
| Confundir compliance (absoluta) con distensibilidad (relativa) | Vena: *C* y *D* |
| Usar el volumen total en lugar de Δ*V* | Vena: *C* |
| Olvidar el efecto del adelgazamiento de la pared | Aneurisma, *σ* = *Pr*/*h* |
| Invertir *d*/Δ*t* | VOP |
| Creer que una onda lenta indica rigidez | Caso 04 |

---

## 4. Lección B.3 — Flujo: caudal, continuidad y Bernoulli

### Objetivos

1. Describir el flujo con el modelo de fluido ideal (estacionario, incompresible, irrotacional y no viscoso), sus líneas y tubos de flujo.
2. Calcular el caudal *Q* = Δ*V*/Δ*t* = *A v* y aplicar la ecuación de continuidad.
3. Aplicar el teorema de Bernoulli a estenosis y aneurismas.
4. Predecir el régimen (laminar o turbulento) con el número de Reynolds y relacionarlo con los soplos.
5. Explicar la viscosidad de la sangre y sus determinantes.

### Recorrido

| Cap. | Escena | Tipo | Qué hace el estudiante |
| --- | --- | --- | --- |
| 1 Fluido ideal | Tubo con líneas de flujo y células | ver | Cuatro condiciones del fluido ideal; tubo de flujo |
| | ¿Se cruzan las líneas de flujo? | elección | **No** |
| 2 Caudal | Plano de sección y cilindro *v*Δ*t* | ver | *Q* = *A v*; gasto cardíaco ≈ 5 L/min |
| | Velocidad variable | hacer | *Q* ∝ *v* a área constante |
| | 5 L/min en mL/s | número | **83,3 mL/s** |
| 3 Continuidad | Estrechamiento con células | ver | *A*<sub>1</sub>*v*<sub>1</sub> = *A*<sub>2</sub>*v*<sub>2</sub> |
| | Estrechar o ensanchar | hacer | *v* ∝ 1/*A* |
| | Velocidad en la aorta (83 mL/s, 4 cm²) | número | **≈ 21 cm/s** |
| | Del árbol arterial a los capilares | ver | Área total ≈ 2500 cm² → *v* ≈ 0,3 mm/s: tiempo para el intercambio |
| 4 Bernoulli | Tubo de Venturi con piezómetros | ver | *P* + ½*ρv*² + *ρgy* = constante |
| | Estrechar la garganta | hacer | Más rápido → menos presión lateral (∝ *v*²) |
| | Estenosis: *v*<sub>1</sub> = 0,30 m/s, *A*<sub>1</sub>/*A*<sub>2</sub> = 3 | ejemplo (3 pasos) | Δ*P* ≈ 382 Pa ≈ 2,9 mmHg |
| | Aneurisma | elección | *v* ↓ y *P* ↑; con Laplace, la dilatación progresa |
| 5 Reynolds | De laminar a turbulento | ver | *Re* = *ρvD*/*η*; ≈ 2000 como límite |
| | Aumentar la velocidad | hacer | Aparecen remolinos: soplos, Korotkoff |
| | *Re* en la aorta | número | **≈ 1990** |
| 6 Viscosidad | Perfil parabólico | ver | Agua ≈ 0,7; plasma ≈ 1,2; sangre ≈ 3–4 mPa·s |
| | Anemia, normal, policitemia | hacer | *η* ≈ 1,2 · e<sup>2,5 Hct</sup> mPa·s |
| | Paciente deshidratado | elección | Hematocrito ↑ → viscosidad ↑ |
| 7 Práctica | Problemas generados | dominio | Ver §6 |

### Ejemplo resuelto: estenosis horizontal

1. Continuidad: *v*<sub>2</sub> = *v*<sub>1</sub> · *A*<sub>1</sub>/*A*<sub>2</sub> = 0,30 · 3 = 0,90 m/s.
2. Bernoulli a la misma altura: *P*<sub>1</sub> − *P*<sub>2</sub> = ½*ρ*(*v*<sub>2</sub>² − *v*<sub>1</sub>²).
3. ½ · 1060 · (0,81 − 0,09) = **382 Pa ≈ 2,9 mmHg**.

Combinando continuidad y Bernoulli (diapositiva de la clase):
*v*<sub>2</sub> = *A*<sub>1</sub> √[2(*P*<sub>1</sub> − *P*<sub>2</sub>) / (*ρ*(*A*<sub>1</sub>² − *A*<sub>2</sub>²))].

### Caso clínico: cómo explicar un aneurisma

*"Si ya fueran médicos y quisieran explicar a un paciente con aneurisma por qué su
arteria puede romperse…"* La lección lo construye en tres pasos:

1. **Continuidad**: en la parte dilatada el área es mayor, así que la sangre se frena.
2. **Bernoulli**: al frenarse, su presión lateral aumenta.
3. **Laplace** (B.2): con más radio y más presión, la tensión de la pared crece (*T* = *P r*, *σ* = *P r*/*h*); la pared cede más y el ciclo se repite.

---

## 5. Lección B.4 — Resistencia y ley de Poiseuille

### Objetivos

1. Relacionar flujo, presión y resistencia: *Q* = Δ*P*/*R*; la URP.
2. Aplicar la ley de Poiseuille y explicar por qué el radio es el regulador más potente.
3. Resolver los casos clínicos de asma, estenosis carotídea, estenosis coronaria, policitemia y shock hipovolémico.
4. Combinar resistencias en serie y en paralelo.
5. Explicar la entrada de aire a los pulmones con la ley de Boyle–Mariotte (puente a la semana 11).

### Recorrido

| Cap. | Escena | Tipo | Qué hace el estudiante |
| --- | --- | --- | --- |
| 1 *Q* = Δ*P*/*R* | Tubo con flujo; analogía con Ohm | ver | El corazón genera Δ*P*; las arteriolas regulan *R*; 1 URP = 1 mmHg·s/mL |
| | Resistencia periférica total | número | 100 mmHg / 100 mL/s = **1 URP** |
| 2 Poiseuille | Fórmula y perfil parabólico | ver | *Q* = *πr*⁴Δ*P*/(8*ηL*); *R* = 8*ηL*/(*πr*⁴) |
| | Predicción: mitad del radio | elección | **1/16** |
| | Estrechar el vaso; curva *Q*–*r* | hacer | Con el 80 % del radio queda el 41 % del flujo |
| 3 Casos *r*⁴ | Caso 1: asma, radio a la mitad | número | **16 veces** menos flujo |
| | Caso 4: estenosis carotídea, −70 % del radio | número | **≈ 0,8 %** del flujo |
| | Estenosis coronaria (55 años, angina) | ejemplo (3 pasos) | Reducción del **93,75 %** |
| | Placa incipiente, −20 % del radio | número | Queda el **41 %** |
| 4 Regulación | Caso 2: policitemia vera | elección | *η* ↑ → *R* ↑ → trabajo cardíaco ↑ |
| | Órganos en paralelo; hemorragia | ver | Cae el gasto, cae la PAM, cae el flujo a todos |
| | Caso 3: vasoconstricción selectiva | hacer | Sube *R*<sub>total</sub>, se recupera la PAM y se protegen cerebro y corazón |
| 5 Serie y paralelo | Redes de resistencias | ver | Serie: se suman; paralelo: se suman las inversas |
| | Tres capilares de 6 en paralelo | número | **2** |
| 6 Respiración | Modelo de tórax con diafragma | ver | Boyle: *P*<sub>1</sub>*V*<sub>1</sub> = *P*<sub>2</sub>*V*<sub>2</sub> |
| | 3,00 → 3,05 L a 760 mmHg | número | **≈ 747,5 mmHg** |
| 7 Práctica | Problemas generados | dominio | Ver §6 |

### Ejemplo resuelto: estenosis coronaria

Datos: Δ*P* = 20 mmHg = 2666 Pa; *η* = 0,004 Pa·s; *L* = 3 cm; radio normal 2 mm; con estenosis, 1 mm.

1. *Q*<sub>0</sub> = *π* · (0,002)⁴ · 2666 / (8 · 0,004 · 0,03) ≈ 1,4 × 10⁻⁴ m³/s.
2. Con la mitad del radio: *Q* = *Q*<sub>0</sub> · (½)⁴ = *Q*<sub>0</sub>/16 ≈ 8,7 × 10⁻⁶ m³/s.
3. Reducción: 1 − 1/16 = **93,75 %**.

*Nota:* el modelo ideal sobreestima el valor absoluto (el flujo coronario real es
de pocos mL/s); lo robusto es la proporción.

### Modelo del shock (cap. 4)

Seis lechos en paralelo (cerebro, corazón, riñones, intestino, piel, músculo).
La PAM es *P* = gasto · *R*<sub>total</sub> y cada órgano recibe *Q*<sub>i</sub> = *P*/*R*<sub>i</sub>.

| Situación | Gasto | PAM | Flujo cerebral |
| --- | --- | --- | --- |
| Normal | 83 mL/s | ≈ 86 mmHg | ≈ 13 mL/s (≈ 800 mL/min) |
| Hemorragia, sin compensar | 50 mL/s | ≈ 52 mmHg | ≈ 8 mL/s |
| Vasoconstricción selectiva (×1,8 en lechos no vitales) | 50 mL/s | ≈ 80 mmHg | ≈ 12 mL/s |

---

## 6. Banco de problemas de práctica (generados)

Cada sesión de práctica genera problemas nuevos (con semilla fija por lección).
Los primeros cubren cada tipo una vez (intercalado) y después se mezclan. En el
primer error aparece una pista; en el segundo, la solución completa en el panel y
un problema nuevo. El dominio se alcanza con **4 aciertos seguidos**.

| Lección | Tipo | Fórmula | Rango de datos |
| --- | --- | --- | --- |
| B.1 | Presión a una profundidad | *ρgh* | agua, agua salada o sangre; 0,5–6 m |
| | Fuerza sobre una membrana | *F* = *ρgh* · *A* | 2–8 m; 0,5–3 cm² |
| | Postura | 100 ± *ρg*Δ*h*/133,3 | 0,3–1,3 m sobre o bajo el corazón |
| | PAM | PAD + ⅓(PAS − PAD) | de 90/60 a 160/100 |
| | Pascal | *F*<sub>2</sub> = *F*<sub>1</sub> *A*<sub>2</sub>/*A*<sub>1</sub> | 10–50 N; ×10–80 |
| | Tubo en U | *h*<sub>1</sub> = *ρ*<sub>2</sub>*h*<sub>2</sub>/*ρ*<sub>1</sub> | aceites de 700–900 kg/m³ |
| | Unidades | mmHg → kPa | 80–160 mmHg |
| B.2 | Compliance | Δ*V*/Δ*P* | — |
| | Distensibilidad | Δ*V*/(*V*<sub>0</sub>Δ*P*), en % | — |
| | Laplace | *r*<sub>2</sub>/*r*<sub>1</sub> (× 2 si la pared se adelgaza a la mitad) | — |
| | VOP | *d*/Δ*t* | 0,5–0,7 m; 0,05–0,12 s |
| | Módulo de elasticidad | *σ*/*ε* | — |
| | ¿Quién es más rígido? | mayor VOP | — |
| B.3 | Gasto cardíaco | L/min → mL/s | — |
| | Caudal | *π r*² *v* | — |
| | Continuidad | *v*<sub>2</sub> = *v*<sub>1</sub>*A*<sub>1</sub>/*A*<sub>2</sub> (por área o por diámetro) | — |
| | Bernoulli | ½*ρ*(*v*<sub>2</sub>² − *v*<sub>1</sub>²) | — |
| | Reynolds | *ρvD*/*η* | — |
| | Régimen | *Re* ⋚ 2000 | — |
| B.4 | Cociente de radios | (*r*<sub>1</sub>/*r*<sub>2</sub>)⁴ | — |
| | Porcentaje tras una estenosis | (1 − reducción)⁴ | 10–70 % |
| | Resistencia periférica | Δ*P*/*Q* | — |
| | Serie / paralelo | Σ*R*; *R*/*N* | — |
| | Viscosidad | Δ*P* ∝ *η* a igual *Q* | — |
| | Boyle | *P*<sub>2</sub> = *P*<sub>1</sub>*V*<sub>1</sub>/*V*<sub>2</sub> | — |

---

## 7. Preguntas de reflexión y análisis (tipo examen), con respuesta biofísica

Tomadas de las diapositivas; las lecciones las preparan explícitamente.

1. **¿Qué representan la presión sistólica y la diastólica?** La sistólica es el máximo de presión arterial, generado por la fuerza del ventrículo izquierdo sobre la columna de sangre. La diastólica es el mínimo, determinado por la resistencia hidráulica (Poiseuille) y la elasticidad de la pared (Hooke). *(B.1 cap. 6, B.2 cap. 3)*
2. **140/95 mmHg: ¿qué se sospecha?** Hipertensión arterial grado I: aumento de la resistencia vascular (Poiseuille) y menor distensibilidad arterial. *(B.1, B.2)*
3. **Shock hemorrágico con 70/40 mmHg: ¿qué indica la diastólica baja?** Menor volumen sanguíneo efectivo y menor resistencia periférica: cae la presión en un sistema cerrado que pierde líquido. *(B.4 cap. 4)*
4. **¿Qué significa una presión diferencial aumentada en la insuficiencia aórtica?** La energía almacenada en la pared durante la sístole no se conserva en la diástole: menor compliance y regurgitación. *(B.2 cap. 3)*
5. **Error frecuente al medir la presión.** Desinflar muy rápido (se pierde el instante en que la presión externa iguala la interna, Pascal), usar un manguito inadecuado o colocar el brazo fuera del nivel del corazón (*ρgh*). *(B.1 caps. 4–6)*
6. **¿Por qué medir en ambos brazos en la primera consulta?** Una diferencia mayor de 15 mmHg sugiere una alteración del flujo (estenosis, coartación de la aorta): más resistencia en un lado. *(B.4)*
7. **De decúbito a de pie, 85/60 mmHg: ¿qué se sospecha?** Hipotensión ortostática: la presión hidrostática aumenta en las venas de las piernas, baja el retorno venoso y el volumen sistólico. *(B.1 cap. 5)*
8. **Ruidos de Korotkoff.** Primer ruido = presión sistólica (el flujo, al vencer la presión externa, es turbulento); desaparición = presión diastólica (el flujo vuelve a ser laminar). *(B.1 cap. 6, B.3 cap. 5)*
9. **De 120/80 a 140/85 tras el ejercicio.** Aumenta el gasto cardíaco (*Q* en Poiseuille) y sube la sistólica; la diastólica se mantiene por la elasticidad arterial y la regulación de la resistencia periférica. *(B.2, B.4)*
10. **Fístula arteriovenosa o linfedema post-mastectomía.** No medir en ese brazo: la presión externa del manguito altera el flujo y la resistencia local (presión transmural) y puede causar complicaciones. *(B.1)*

**Pregunta final de la unidad:** *si tuvieran que explicarle a un paciente por qué
debe controlar su hipertensión o dejar de fumar, ¿cómo usarían Q ∝ r⁴?*
Hipertensión y tabaco dañan el endotelio y estrechan el vaso; como el flujo depende
de la cuarta potencia del radio, "un pequeño estrechamiento del vaso puede reducir
mucho el paso de sangre". Prevenir el daño vascular protege la perfusión de los
órganos vitales.

---

## 8. Casos clínicos de la unidad

| Caso | Física | Lección |
| --- | --- | --- |
| Hombre de 65 años, HTA crónica, mareo al incorporarse | Rigidez + *ρgh* (ortostatismo) | B.1, B.2 |
| Caso 1: 75 años, 130/85 → 90/60 de pie | Hipotensión ortostática | B.1 |
| Caso 2: hipertensión con hematocrito elevado por deshidratación | Viscosidad | B.3, B.4 |
| Caso 3: hemorragia aguda, 70/40, taquicardia, piel fría | *Q* = Δ*P*/*R*, vasoconstricción selectiva | B.4 |
| Caso 4: deportista, 115/75 → 150/80 tras el ejercicio | Gasto cardíaco y elasticidad | B.1, B.2 |
| Caso 01: corazón–tobillo 1,30 m | *ρgh* | B.1 |
| Caso 02: aorta 1000 → 1070 mL, +10 mmHg | Compliance y distensibilidad | B.2 |
| Caso 03: aneurisma cerebral 1,0 → 2,5 mm | Laplace | B.2 |
| Caso 04: VOP 0,60 m en 0,075 s frente a 0,10 s | Velocidad de onda de pulso | B.2 |
| Asma bronquial: radio bronquiolar a la mitad | Poiseuille en vías aéreas | B.4 |
| Policitemia vera | *Q* ∝ 1/*η* | B.3, B.4 |
| Estenosis carotídea del 70 % | *Q* ∝ *r*⁴ | B.4 |
| Estenosis coronaria y angina de esfuerzo | Poiseuille con números | B.4 |
| Aneurisma: por qué puede romperse | Continuidad + Bernoulli + Laplace | B.3 |

---

## 9. Formulario

| Magnitud | Ecuación | Unidades |
| --- | --- | --- |
| Presión | *P* = *F*/*A* | Pa = N/m²; 1 mmHg = 133,3 Pa |
| Densidad | *ρ* = *m*/*V* | kg/m³ |
| Fluido abierto | *P* = *P*<sub>0</sub> + *ρgh* | Pa |
| Tubo en U | *ρ*<sub>1</sub>*h*<sub>1</sub> = *ρ*<sub>2</sub>*h*<sub>2</sub> | — |
| Pascal (fluido cerrado) | *F*<sub>1</sub>/*A*<sub>1</sub> = *F*<sub>2</sub>/*A*<sub>2</sub>; *A*<sub>2</sub>/*A*<sub>1</sub> = Δ*x*<sub>1</sub>/Δ*x*<sub>2</sub> | — |
| Presión arterial media | PAM ≈ PAD + ⅓(PAS − PAD) | mmHg |
| Módulo de elasticidad | *E* = *σ*/*ε* | Pa |
| Compliance | *C* = Δ*V*/Δ*P* | mL/mmHg |
| Distensibilidad | *D* = Δ*V*/(*V*<sub>0</sub>Δ*P*) | 1/mmHg |
| Laplace | *T* = *P r*; *σ* = *P r*/*h* (las diapositivas también usan *T* = *P r*/2*h*) | — |
| Velocidad de onda de pulso | VOP = *d*/Δ*t* | m/s |
| Caudal | *Q* = *m*/Δ*t* (másico); *Q* = Vol/Δ*t* = *A v* (volumétrico) | kg/s; m³/s, mL/s |
| Continuidad | *A*<sub>1</sub>*v*<sub>1</sub> = *A*<sub>2</sub>*v*<sub>2</sub> | — |
| Bernoulli | *P* + ½*ρv*² + *ρgy* = constante | Pa |
| Reynolds | *Re* = *ρvD*/*η* | adimensional |
| Hemodinámica | *Q* = Δ*P*/*R* | 1 URP = 1 mmHg·s/mL |
| Poiseuille | *Q* = *π r*⁴Δ*P*/(8*ηL*); *R*<sub>h</sub> = 8*ηL*/(*π r*⁴) | — |
| Serie / paralelo | *R*<sub>t</sub> = Σ*R*<sub>i</sub>; 1/*R*<sub>t</sub> = Σ1/*R*<sub>i</sub> | — |
| Boyle–Mariotte | *P*<sub>1</sub>*V*<sub>1</sub> = *P*<sub>2</sub>*V*<sub>2</sub> (T constante) | — |

---

## 10. Referencias (las del curso)

- W. C. Parke, *Biophysics: A Student's Guide to the Physics of the Life Sciences and Medicine*. Springer, 2020.
- R. Serway y C. Vuille, *Fundamentos de Física*, vol. 1, 9.ª ed. Cengage Learning, 2012.
- O. Hernández Bustos, *Fundamentos de biofísica médica*. Editorial Universidad del Norte, 2019.
- Curvas presión–volumen de los sistemas arterial y venoso: Guyton y Hall, *Tratado de fisiología médica*.

## 11. Pendiente

- Semana 11 completa: elastancia y distensibilidad pulmonar, volúmenes y presiones (intrapleural, alveolar), estabilidad alveolar (tensión superficial, surfactante, Laplace en el alvéolo) e intercambio gaseoso en la membrana alvéolo-capilar. La lección B.4 solo introduce Boyle.
- Taller de lectura 2 (plasma, proteínas plasmáticas, pH y soluciones amortiguadoras): contenido de lectura, no se modela.
