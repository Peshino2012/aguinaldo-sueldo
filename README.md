# Aguinaldo y Sueldo AR

Calculadora de aguinaldo (SAC), sueldo neto y vacaciones para trabajadores en
relación de dependencia en Argentina, según la Ley de Contrato de Trabajo.
App web instalable (PWA) pensada para publicarse en Microsoft Store con
PWABuilder. No usa internet: todo se calcula y se guarda en el equipo.

- Aguinaldo: 50% del mejor sueldo del semestre (LCT arts. 121-122); proporcional
  por días trabajados, sobre los días reales del semestre o sobre 180.
- Sueldo neto: aportes de ley (11% + 3% + 3%) y aporte sindical opcional.
  No incluye ganancias ni tope de base imponible.
- Vacaciones: 14/21/28/35 días según antigüedad al 31/12 (art. 150); 1 día cada
  20 trabajados si fue menos de medio año (art. 153); valor sueldo ÷ 25 (art. 155).

Tests: `npm test`.

## Publicar
1. Este repo se publica con GitHub Pages (rama `main`, raíz) en `https://peshino2012.github.io/aguinaldo-sueldo/`.
2. Partner Center → nueva app → reservar el nombre → copiar Package ID, Publisher y Publisher display name.
3. pwabuilder.com → URL de Pages → Package for stores → Windows → completar esos 3 datos → descargar.
4. Subir el `.msixbundle` y el `.classic.appxbundle`, completar la ficha con `store/ficha-store.md` y enviar.
