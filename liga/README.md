# Liga 100% Familiar — Prototipo Fase 1 (Categoría Quinta)

Prototipo funcional del sistema de la liga. **No necesita servidor ni internet**:
abre `liga/index.html` en el navegador (celular o compu) y funciona.

## Qué hace hoy
- **Tabla de posiciones automática** con las reglas de la liga: 2 ganar / 1 empatar / 0 perder,
  el default como 2 pts + 1 gol, y los puntos base de la J25 tal cual la hoja (con sus ajustes ✓/X).
- **Selector de jornada**: ve cómo iba la tabla tras la J26, 27, 28, 29… o la 30 pendiente.
- **Goleadores** (top 10).
- **Captura de resultados**: escribes los marcadores de una jornada y la tabla se recalcula sola.
  Se guarda en tu navegador (localStorage); el botón "Restaurar datos" vuelve a los originales.
- **Imágenes para WhatsApp**: PNG de la tabla, de resultados, de goleadores y del rol,
  con la zona de clasificación marcada y el **patrocinador al pie** (editable).
- **Admin**: gestiona **todos los equipos** (agregar al inicio de temporada, borrar),
  **ve y descarga el rol** completo (.txt) y **genera un rol** de todos contra todos
  (round-robin) que reinicia la temporada en 0.
- **Plantillas**: registra los **jugadores de cada equipo** (nombre + número) desde el
  inicio del torneo, con imagen de la plantilla para compartir. Base para perfiles de
  jugador, goleadores ligados y el pedido de uniformes de la tienda (Fase 2).
- **Mi equipo** (para el jugador): elige tu equipo y ve tu **posición**, un **escenario de
  clasificación** ("¿qué necesita? · a cuántos puntos del corte · si ganas tu próximo, ¿a qué
  puesto subes?"), tu **próximo partido** (rival, local/visita, hora, campo), tu **forma** y tu plantilla.

## Cómo probarlo
1. Abre `liga/index.html`.
2. Cambia el selector a **Jornada 30** y captura los 5 partidos pendientes
   (Sparta vs América es el que define el 7º lugar). Guarda y mira la tabla moverse.
3. Pon el nombre de tu tienda en "Patrocinador" y genera la imagen.

## Archivos
- `data.js` — todos los datos (equipos, base J25, jornadas, goleadores, patrocinador). **Lo único que se edita.**
- `liga.js` — motor de cálculo, captura y generador de imagen. No depende de librerías.
- `index.html` / `styles.css` — la interfaz.

## Siguiente (Fase 2)
Mover los datos a Supabase para multiusuario y persistencia real, y conectar la **tienda**
(pedido de uniforme por equipo reutilizando el roster). Ver la propuesta completa.
