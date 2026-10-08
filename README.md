# KAYA Certificados

Software corporativo para emisión de certificados de instalación de KAYA SAFETY LATINOAMÉRICA.

## Objetivo

Generar certificados editables y exportables/impresos desde navegador para instalaciones de sistemas de seguridad en alturas.

## Identidad

- KAYA SAFETY LATINOAMÉRICA
- Departamento de Proyectos e Ingeniería
- Colores corporativos: naranja, blanco y gris técnico
- Documento sin referencias externas ni marcas no corporativas

## Funciones

- Consecutivo automático editable
- Datos de cliente, instalación, responsable técnico e instalador
- País de emisión y bandera visual
- Validación documental antes de la emisión definitiva
- Estado de aprobación con chulo corporativo y firma autorizada solo al emitir
- Código QR con la información y el estado del documento
- Vista previa tipo certificado
- Impresión / Guardar como PDF desde el navegador
- Botón para limpiar formulario y crear un nuevo certificado

## Uso

Abrir `index.html` en el navegador o publicar el repositorio en GitHub Pages / Netlify.

### Emitir un certificado definitivo

1. Complete consecutivo, fecha, país, ciudad, cliente, proyecto/ubicación, tipo de sistema, referencia/modelo, descripción técnica e instalador. El nombre y cargo del firmante permanecen vinculados a la firma corporativa disponible de Ing. Gerardo Montañez.
2. Declare **todas** las cantidades. Un campo vacío no equivale a cero. Use `0` si no se instaló esa referencia. Las piezas requieren enteros no negativos; el cable LL-200A se declara en metros con hasta dos decimales. Se exige al menos una cantidad mayor que cero. No hay cantidades precargadas, incluidos ANB 100 A y las dos referencias EA-200.
3. Identifique el soporte de verificación técnica y documental revisado (informe, memoria, plano o acta, con referencia y fecha).
4. Confirme expresamente las cantidades, la revisión técnica/documental y la aprobación de la instalación. No se selecciona ninguna confirmación al iniciar.
5. Use **Emitir certificado / PDF definitivo** y elija «Guardar como PDF» en la impresión del navegador. Si falta información, se muestra una lista de errores con enlaces a los campos y no se abre la impresión.

El documento definitivo conserva logos, firma, colores y las dos hojas corporativas. Se comprueba nuevamente el formulario después de cargar las imágenes y antes de imprimir. Si no se cargan el logo, la bandera o el QR, la emisión definitiva se bloquea para evitar un PDF incompleto. La aplicación no registra que el usuario haya guardado el PDF: el diálogo del navegador puede cancelarse.

### Borradores y revisión de datos

- **Imprimir borrador / PDF** permite imprimir datos incompletos. Ambas hojas muestran `BORRADOR · NO VÁLIDO COMO CERTIFICADO DE APROBACIÓN`, una marca de agua de borrador y firma pendiente. El texto de conformidad y la firma autorizada quedan reservados al definitivo.
- **Ctrl+P** y el menú de impresión del navegador producen borradores. La emisión definitiva se solicita mediante el botón validado.
- El QR incluye el estado de borrador o de emisión definitiva; el anexo incluye consecutivo y fecha para vincular ambas hojas.
- Si la impresión directa ocurre mientras un QR cambia o carga, ese QR se oculta en la impresión del borrador para evitar reutilizar una imagen del estado anterior.
- Cualquier edición de los datos o cantidades revoca las tres confirmaciones. Deben revisarse y confirmarse nuevamente.
- Los borradores se guardan localmente, incluidos los creados con versiones anteriores, pero ninguna aprobación guardada se restaura al abrirlos. Las cantidades antiguas se recuperan como datos pendientes de confirmación.
- **Nuevo certificado** limpia datos particulares, soporte, cantidades y confirmaciones, y sugiere el siguiente consecutivo. La aplicación no garantiza la unicidad del consecutivo entre dispositivos.
- Sin JavaScript, el documento inicial permanece identificado como borrador y la emisión definitiva está deshabilitada.

### Alcance de la validación

Los controles comprueban la integridad del documento, el formato de las cantidades y las declaraciones expresas del responsable. La casilla de revisión y el soporte identifican una revisión realizada por una persona; el software no verifica el contenido del archivo citado ni calcula la resistencia de la instalación. No deduce mínimos de anclajes, absorbedores, carros o cable, ni la compatibilidad de la configuración a partir de las cantidades. Estas comprobaciones corresponden al responsable técnico conforme al fabricante y a la memoria/plano del proyecto.

El QR contiene datos declarados y no constituye una firma digital ni consulta un registro de certificados. Las imágenes de bandera y QR usan los servicios externos ya presentes (`flagcdn.com` y `quickchart.io`); para generar esos QR, la información incluida en ellos se envía a QuickChart. Se requiere conexión para cargar estas imágenes.

## Pruebas e integración

Requiere Node.js 22 o posterior para las pruebas; el sitio publicado no necesita Node.js ni dependencias npm.

```bash
npm ci
npm test
npx playwright install --with-deps chromium
npm run test:browser
# O ejecutar ambas suites:
npm run test:all
```

Si se utiliza un Chromium instalado por separado, puede indicar su ruta con la variable `KAYA_TEST_CHROMIUM_EXECUTABLE` al ejecutar la suite del navegador.

Las pruebas unitarias cubren cada campo obligatorio, fechas inválidas, confirmaciones ausentes, cantidades negativas/vacías/no numéricas/fraccionarias, ceros explícitos, ausencia de componentes y coherencia del firmante. Las pruebas en Chromium cubren el formulario real, borradores antiguos, recarga, cambios después de confirmar, bloqueo de emisión, fallos de imágenes, cambios durante la carga, impresión directa y generación de PDFs de dos páginas. Los servicios externos se simulan de forma determinista: se comprueba el contenido del payload del QR, no el algoritmo ni la disponibilidad del proveedor.

Los PDFs de prueba usan datos ficticios y se guardan en `test-results/` (excluido de git y de publicación). El workflow ejecuta las pruebas en cada PR y antes de publicar `main`. Si las pruebas fallan, el despliegue no se ejecuta. Solo se publican `index.html` y `assets/`.

## Estructura

```text
index.html
assets/css/styles.css
assets/js/app.js
assets/js/validation.js
tests/
package.json
package-lock.json
```

## Notas

El sitio es estático y funciona al abrir el archivo local, con guardado de borradores si el navegador permite almacenamiento local. La exportación mantiene el diálogo de impresión del navegador; las banderas y el QR requieren conexión a sus proveedores.
