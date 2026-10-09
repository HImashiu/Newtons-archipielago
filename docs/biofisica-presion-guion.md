# Biofísica · Bloque «Presión» (Semana 7) — guion de las lecciones 1.1–1.5

*Reemplaza a la lección B.1, que comprimía todo el bloque en una sola lección y
servía más para repasar que para aprender.* Implementación:
`src/lesson/bio/p1-presion.js` … `p5-arterial.js`. Fuente: presentaciones
*Biofísica 6 y 7* (Universidad del Norte, Medicina, 2.º semestre).

## Por qué cinco lecciones en lugar de una

La versión anterior presentaba una idea por pantalla, anunciaba cada fórmula y
preguntaba si el estudiante la recordaba. Eso es un repaso. Para **enseñar**,
cada idea necesita tiempo y actividad propia del estudiante. En este bloque se
aplican cinco reglas:

1. **Empezar por una pregunta, no por una definición.** Cada lección abre con
   un fenómeno que el estudiante no sabe explicar todavía (la aguja que entra y
   el dedo que no, el dolor de oídos al bucear, el mareo al levantarse).
2. **Las fórmulas se construyen, no se anuncian.** *P = F/A* sale de un
   experimento con una tabla que anota el propio estudiante; *P = P₀ + ρgh*
   sale de una derivación hecha pregunta a pregunta; 1 mmHg = 133,3 Pa sale de
   rehacer el experimento de Torricelli.
3. **Predecir antes de ver.** Las predicciones se guardan y se contrastan más
   tarde, sin castigo (predecir–observar–explicar).
4. **Desvanecimiento.** Ejemplo resuelto → ejemplo semi-resuelto (falta el
   último paso) → problema independiente → práctica generada con dominio
   (4 seguidos).
5. **El estudiante marca el ritmo.** Ninguna pantalla avanza sola: todas
   esperan «Continuar» (`pauseAll` en el reproductor).

Cada lección dura unos 25–30 minutos y termina con una práctica que genera
problemas nuevos hasta acertar cuatro seguidos.

| Lección | Pregunta de partida | Lo que el estudiante construye | Enlace |
| --- | --- | --- | --- |
| 1.1 ¿Qué es la presión? | ¿Por qué entra la aguja y el dedo no, con la misma fuerza? | *P = F/A* a partir de su propia tabla de mediciones | `#presion` |
| 1.2 Presión y profundidad | ¿Por qué duelen más los oídos cuanto más se baja? | *P = P₀ + ρgh* pieza a pieza; la pendiente ρg | `#profundidad` |
| 1.3 Medir la presión | ¿Por qué la presión arterial se mide en mm de mercurio? | 760 mm, 10,3 m de agua y 1 mmHg = 133,3 Pa; manómetro; Pascal; el manguito | `#manometros` |
| 1.4 La sangre y la gravedad | ¿Por qué se marea un paciente al ponerse de pie? | ≈ 78 mmHg por metro de sangre; error del brazo colgando; la cadena causal | `#gravedad` |
| 1.5 Presión arterial | ¿Qué significan los dos números de «120/80»? | PAS, PAD y presión de pulso en la onda; PAM por equilibrio de áreas; una lectura con manguito | `#arterial` |

---

## 1.1 ¿Qué es la presión?

**Objetivo.** Distinguir fuerza de presión; usar *P = F/A* y sus unidades; aplicarlo a
un caso clínico.

| Cap. | Actividad | Tipo | Idea que se construye |
| --- | --- | --- | --- |
| 1 Una pregunta | Dedo y aguja con 5 N cada uno | predecir (elección) | Importa el área, no solo la fuerza |
| 2 Experimento | Bloque sobre espuma: el estudiante pulsa «Anotar» | experimento | Duplicar *F* duplica el hundimiento (área fija) |
| | Mismo peso, mitad de área | experimento | Mitad de *A* duplica el hundimiento |
| | «Según tu tabla, el hundimiento depende de…» | elección razonada | *F/A*; las respuestas falsas se refutan con las filas de su tabla |
| | Tabla con la columna *F/A* | ver | Filas con igual *F/A*, igual hundimiento |
| | **Reto:** con 200 N, igualar la huella de 600 N sobre 0,60 m² | arrastrar | Hay que razonar: un tercio de la fuerza, un tercio del área (0,20 m²) |
| 3 La aguja | Ejemplo resuelto en 3 pasos | ejemplo | Dedo 50 kPa, aguja 50 MPa: 1000 veces más |
| | Tacón de 2 cm², persona de 700 N | número | 3500 kPa; con zapato plano, 175 kPa |
| 4 Unidades | 1 Pa = manzana sobre 1 m²; el aire = 10 t por m² | ver | 1 Pa es muy poco; *P₀* ≈ 101 325 Pa |
| | «¿Por qué no nos aplasta?» | elección razonada | La presión en un fluido empuja en todas direcciones: importan las **diferencias** |
| | Manométrica frente a absoluta; tabla de unidades | ver | Pa, kPa, mmHg, cmH₂O, atm |
| | 120 mmHg → kPa | número | 16,0 kPa |
| 5 Úlceras | Paciente encamado: diagrama de presión de apoyo | ver | Picos de presión en sacro y talones |
| | 150 N sobre 30 cm² (sacro) | número | ≈ 375 mmHg |
| | ¿Por qué aparece la úlcera? | elección razonada | 375 mmHg » 30 mmHg capilar: isquemia; cambios de posición cada 2 h |
| 6 Práctica | *P*, *F* o *A*; comparar; conversiones; absoluta | dominio | — |

**Errores frecuentes trabajados:** confundir fuerza con presión; *F·A* en lugar de *F/A*;
olvidar pasar cm² a m²; dividir entre 133,3 en lugar de multiplicar; creer que el
aire «no pesa».

---

## 1.2 Presión y profundidad

**Objetivo.** Deducir y usar *P = P₀ + ρgh*; distinguir presión absoluta y
manométrica; resolver problemas con capas.

| Cap. | Actividad | Tipo | Idea |
| --- | --- | --- | --- |
| 1 Al bucear | El buzo baja y le duelen los oídos | ver | — |
| | Predicción: a 4 m, ¿la presión extra es ½, igual, el doble o 4× que a 2 m? | predicción guardada | — |
| 2 La fórmula | Columna de agua sobre un área *A* | ver | — |
| | ¿Qué sostiene la columna? | elección | El agua de abajo empuja con *P·A* |
| | Volumen → masa → peso | 3 elecciones | *V = Ah*, *m = ρAh*, *W = ρgAh* |
| | Equilibrio y división entre *A* | ver (panel) | *P·A = P₀·A + ρgAh* → *P = P₀ + ρgh* |
| | ¿Depende del área elegida? | elección | No: *A* se cancela |
| 3 Medir | Sensor + «Anotar» en 4 profundidades | experimento | Recta que pasa por el origen |
| | ¿Cuántos kPa por metro? | número | 9,8 kPa/m = ρg |
| | Contraste con la predicción | ver | Doble profundidad, doble presión |
| | ¿Cuántos mmHg por metro de sangre? | número | ≈ 78 mmHg/m (se usa en 1.4) |
| 4 La forma | Tres recipientes | elección | Paradoja hidrostática |
| | Las paredes sostienen o empujan | ver | Explica la paradoja |
| 5 Ejemplos | Tímpano a 4 m | ejemplo (3 pasos) | *F* ≈ 11,8 N |
| | Tímpano a 10 m: falta el último paso | semi-resuelto | *F* ≈ 29 N |
| | Tanque de petróleo y agua salada | independiente (2 números) | 156,2 kPa; 206,4 kPa |
| 6 Práctica | Profundidad, proporción, absoluta, forma, fuerza, despejar *h* | dominio | — |

**Errores frecuentes trabajados:** creer que más agua (o un fondo más grande) da
más presión; olvidar *P₀* en la absoluta; usar una sola densidad para dos capas;
confundir presión con fuerza en el tímpano.

---

## 1.3 Medir la presión

**Objetivo.** Entender de dónde vienen el mmHg y su equivalencia; usar
manómetros y el tubo en U; aplicar Pascal y comprender el manguito.

| Cap. | Actividad | Tipo | Idea |
| --- | --- | --- | --- |
| 1 Torricelli | El tubo invertido se detiene a 76 cm | ver | — |
| | ¿Qué sostiene la columna? | elección razonada | El aire, a través de la superficie de la cubeta: *P₀ = ρgh* |
| | Altura con mercurio | número (semi-resuelto) | 0,760 m |
| | Altura con agua | número | ≈ 10,3 m: por eso se usa mercurio |
| | ¿Cuántos Pa es 1 mmHg? | número | 13 600·9,8·0,001 ≈ 133,3 Pa |
| 2 Tubo en U | Niveles iguales con un solo líquido | ver | Misma altura, misma presión |
| | Manómetro: subir la presión de un gas | arrastrar | Δ*P = ρg*Δ*h* |
| | Agua y aceite | número | *ρ₁h₁ = ρ₂h₂* → 7 cm |
| 3 Pascal | Tres manómetros suben igual | ver | La presión se transmite a todo el fluido |
| | **Reto:** levantar 1000 N con 20 N | arrastrar | *A₂* ≥ 50 *A₁* |
| | ¿Cuánto baja el émbolo pequeño? | número | 50 cm: se gana fuerza, se paga recorrido |
| 4 Tensiómetro | Corte del brazo con manguito | ver | Pascal a través de los tejidos |
| | Inflar hasta cerrar la arteria | arrastrar | Por encima de la sistólica la arteria se cierra |
| | Manguito estrecho | elección | Sobreestima la presión |
| 5 Práctica | Columnas, manómetro, tubo en U, prensa, recorrido, cmH₂O | dominio | — |

---

## 1.4 La sangre y la gravedad

**Objetivo.** Aplicar *ΔP = ρgΔh* al cuerpo; explicar los efectos de la postura,
el error de medición por la posición del brazo, la hipotensión ortostática y el
papel de las venas.

| Cap. | Actividad | Tipo | Idea |
| --- | --- | --- | --- |
| 1 El caso | 65 años: 130/85 sentado, 90/60 de pie, mareo | ver | Pregunta que se resuelve al final |
| | ¿Dónde es mayor la PAM de pie? | predicción | Tobillos |
| 2 Medir | Sensor: anotar cabeza, corazón y tobillo | experimento | ≈ 70, 100 y 190 mmHg |
| | Caso 01: corazón–tobillo 1,30 m | número | ≈ 101 mmHg (78 mmHg/m de 1.2) |
| | Cerebro 0,40 m por encima | número | ≈ 69 mmHg |
| 3 Medición | Acostar al paciente | interacción | Δ*h* ≈ 0: presión uniforme |
| | Brazo colgando 25 cm bajo el corazón | número | Lee ≈ 140 en lugar de 120: falsa hipertensión |
| 4 El mareo | **Cadena causal** en 7 eslabones | ordenar | de pie → *ρgh* en venas → venas distendidas → ↓ retorno venoso → ↓ volumen sistólico → ↓ PA → ↓ flujo cerebral |
| | ¿Cumple el criterio (≥ 20 sistólica / ≥ 10 diastólica)? | elección | Sí: −40/−25 |
| 5 Venas | Quieto frente a caminando | interacción | Vena del tobillo 90 → 25 mmHg (válvulas y bomba muscular) |
| | El soldado que se desmaya | elección razonada | Sin bomba muscular, acumulación venosa |
| | Edema maleolar | elección razonada | Presión capilar alta de pie |
| 6 Práctica | Nivel, brazo, criterio ortostático, despejar Δ*h*, acostado | dominio | — |

---

## 1.5 Presión arterial

**Objetivo.** Leer la onda de presión; calcular presión de pulso y PAM;
explicar dónde cae la presión; medir con el método auscultatorio y reconocer
errores; interpretar los casos clínicos de la clase.

| Cap. | Actividad | Tipo | Idea |
| --- | --- | --- | --- |
| 1 La onda | Cursor sobre la onda: encontrar máximo y mínimo | arrastrar | PAS ≈ 120, PAD ≈ 80 |
| | ¿Qué hace el corazón en el máximo? | elección razonada | Sístole (eyección); la incisura dícrota no es el máximo |
| | Presión de pulso | número | 40 mmHg |
| 2 PAM | **Equilibrar áreas** con una línea horizontal | arrastrar | La media (≈ 91) no es el promedio simple (100) |
| | Regla PAD + ⅓(PAS − PAD) | ver | La diástole ocupa ≈ ⅔ del ciclo |
| | 150/90 | número | 110 mmHg |
| 3 El circuito | Predecir dónde cae más la presión | predicción guardada | — |
| | Revelar la curva | ver | Arteriolas: resistencia periférica |
| | ¿Por qué ahí? | elección razonada | Radio pequeño → mucha resistencia (puente a Poiseuille) |
| 4 Medir | Método auscultatorio y ruidos de Korotkoff | ver | Turbulencia entre PAS y PAD |
| | **Simulador:** desinflado a 3 mmHg/s; marcar primer ruido y silencio | medir | Lectura dentro de ± 5 mmHg de 120/80 |
| | Desinflado a 15 mmHg/s | medir | El primer ruido llega tarde: error de hasta 12 mmHg |
| 5 Casos | Caso 2 (HTA + hematocrito alto), caso 3 (hemorragia, 70/40), caso 4 (deportista) | elección razonada | Viscosidad, volumen, gasto cardíaco |
| 6 Práctica | PAM, lectura de ruidos, presión de pulso, clasificación, casos | dominio | — |

---

## Soluciones de referencia

| Problema | Resultado |
| --- | --- |
| Dedo (5 N, 1 cm²) / aguja (5 N, 0,1 mm²) | 50 kPa / 50 MPa |
| Tacón: 700 N sobre 2 cm² | 3500 kPa |
| 120 mmHg | 16,0 kPa |
| Sacro: 150 N sobre 30 cm² | 50 000 Pa ≈ 375 mmHg |
| Pendiente en agua / en sangre | 9,8 kPa/m / ≈ 78 mmHg/m |
| Tímpano a 4 m / a 10 m (3 cm²) | 11,8 N / 29,4 N |
| Tanque: *P₁* / *P*<sub>fondo</sub> | 156,2 kPa / 206,4 kPa |
| Torricelli con Hg / con agua | 0,760 m / 10,3 m |
| 1 mmHg | 133,3 Pa |
| Tubo en U (700 kg/m³, 10 cm) | 7 cm |
| Prensa 20 N → 1000 N; recorrido para subir 1 cm | *A₂* = 50 *A₁*; 50 cm |
| Corazón–tobillo 1,30 m | 13 504 Pa ≈ 101 mmHg |
| Cerebro 0,40 m sobre el corazón | ≈ 69 mmHg |
| Brazo 25 cm bajo el corazón (real 120) | ≈ 140 mmHg |
| Presión de pulso 120/80 | 40 mmHg |
| PAM 150/90 | 110 mmHg |

## Pendiente

Las lecciones B.2 (pared del vaso), B.3 (flujo) y B.4 (Poiseuille) siguen en su
versión breve; se rehacen con este mismo método después de validar este bloque.
