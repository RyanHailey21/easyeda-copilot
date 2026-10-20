[English](https://github.com/biosshot/easyeda-copilot/blob/main/README.md) | [简体中文](https://github.com/biosshot/easyeda-copilot/blob/main/README.zh-CN.md) | [Русский](https://github.com/biosshot/easyeda-copilot/blob/main/README.ru.md) | Español

# <img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/extension/images/logo.png" alt="" width="42"> EasyEDA Copilot

Automatización de ingeniería basada en MCP para documentos nativos de EasyEDA Pro y JLCEDA.

EasyEDA Copilot conecta agentes de IA compatibles con MCP con datos reales de esquemas y PCB. Permite generar y reorganizar esquemas, resolver componentes, colocar componentes en la PCB a partir de restricciones, rutear con transacciones respaldadas por puntos de control, inspeccionar el diseño de forma estructurada, recuperar estados anteriores y ejecutar el DRC nativo de EasyEDA.

<p align="center">
  <a href="https://github.com/biosshot/easyeda-copilot/actions/workflows/build.yml">
    <img src="https://github.com/biosshot/easyeda-copilot/actions/workflows/build.yml/badge.svg" alt="Estado de la compilación">
  </a>
  <a href="https://github.com/biosshot/easyeda-copilot/releases/latest">
    <img src="https://img.shields.io/github/v/release/biosshot/easyeda-copilot?label=release" alt="Última versión">
  </a>
  <a href="https://github.com/biosshot/easyeda-copilot/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="Licencia">
  </a>
  <a href="https://discord.gg/AXCGjTDYkq">
    <img src="https://img.shields.io/badge/Discord-7289DA?logo=discord&logoColor=white" alt="Discord">
  </a>
  <a href="https://web.tribute.tg/d/PTf">
    <img src="https://img.shields.io/badge/Support%20development-Tribute-24A1DE" alt="Apoyar el desarrollo de EasyEDA Copilot">
  </a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/banner.gif" alt="EasyEDA Copilot crea y ensambla el esquema de un LDO a partir de una especificación en texto">
</p>
<p align="center">
  <sub>Creación y ensamblado del esquema de un LDO a partir de una especificación en texto.</sub>
</p>

## Demostración principal: amplificador RF BGA2869 de 2 GHz

Un flujo de diseño RF completo dentro de EasyEDA Pro: organización del esquema, restricciones de camino de señal a nivel de pin, colocación compacta de componentes, ruteo de la PCB, planos de masa y cosido de vías.

Los puertos RF quedan en bordes opuestos de la placa, la cadena del amplificador se mantiene en orden y la red de polarización se coloca junto al MMIC. Los componentes, pistas, vías y zonas de cobre resultantes siguen siendo objetos nativos de EasyEDA editables.

<video controls preload="metadata" width="100%">
  <source src="https://github.com/user-attachments/assets/b3b3b25a-bc27-4654-8802-23775ff71735" type="video/mp4">
  <a href="https://github.com/user-attachments/assets/b3b3b25a-bc27-4654-8802-23775ff71735">Ver este vídeo</a>
</video>

[Abrir el vídeo aparte](https://github.com/user-attachments/assets/b3b3b25a-bc27-4654-8802-23775ff71735)

## Más demostraciones

Estos ejemplos muestran placas controladoras más grandes y el trabajo sobre documentos existentes. Todos los resultados siguen siendo proyectos normales y editables de EasyEDA, no maquetas renderizadas.

### Controladora ESP32-C3

Una controladora ESP32-C3 completa con conversión de alimentación, USB, CAN, RS-485, E/S de campo protegidas, conectores externos y restricciones de colocación de la antena.

El flujo muestra la generación de esquemas en varias páginas, la colocación por funciones, las restricciones de borde de placa y de antena, el ruteo de alimentación y señales, los planos de cobre, el cosido de vías, la inspección y la reparación guiada por el DRC.

<details open>
<summary><strong>Ver el flujo de la ESP32-C3 (69 segundos)</strong></summary>

<video controls preload="metadata" width="100%">
  <source src="https://github.com/user-attachments/assets/df1dd4e2-ee48-492c-badb-de2dc220ae41" type="video/mp4">
  <a href="https://github.com/user-attachments/assets/df1dd4e2-ee48-492c-badb-de2dc220ae41">Ver este vídeo</a>
</video>

[Abrir el vídeo aparte](https://github.com/user-attachments/assets/df1dd4e2-ee48-492c-badb-de2dc220ae41)

</details>

### Controladora MIMXRT1011

Un diseño denso de cuatro capas con microcontrolador que muestra la colocación y el ruteo alrededor de un MCU de muchos pines, con varias interfaces, grupos de desacoplo, conectores en el borde de la placa, taladros de montaje y restricciones de acceso mecánico.

<details open>
<summary><strong>Ver el flujo de la MIMXRT1011 (128 segundos)</strong></summary>

<video controls preload="metadata" width="100%">
  <source src="https://github.com/user-attachments/assets/757690b8-83cd-42c7-b88f-4db9ba2df010" type="video/mp4">
  <a href="https://github.com/user-attachments/assets/757690b8-83cd-42c7-b88f-4db9ba2df010">Ver este vídeo</a>
</video>

[Abrir el vídeo aparte](https://github.com/user-attachments/assets/757690b8-83cd-42c7-b88f-4db9ba2df010)

</details>

### Ordenación del esquema

EasyEDA Copilot lee un esquema existente, identifica los grupos funcionales, guarda un punto de control del documento y vuelve a montar la página en bloques con nombre, conservando su conectividad eléctrica y la identidad de los componentes.

<details open>
<summary><strong>Ver la ordenación del esquema (13 segundos)</strong></summary>

<video controls preload="metadata" width="100%">
  <source src="https://github.com/user-attachments/assets/d77218e5-4f6f-42b8-bea4-7f7240f8f7f3" type="video/mp4">
  <a href="https://github.com/user-attachments/assets/d77218e5-4f6f-42b8-bea4-7f7240f8f7f3">Ver este vídeo</a>
</video>

[Abrir el vídeo aparte](https://github.com/user-attachments/assets/d77218e5-4f6f-42b8-bea4-7f7240f8f7f3)

</details>

Hay más ejemplos editables en [OSHWLab](https://oshwlab.com/biosshot/edacopilotexamples).

## Inicio rápido

### Requisitos

- EasyEDA Pro Desktop;
- Node.js >=20.19;
- un cliente compatible con MCP, como Codex o Claude Code.

### 1. Instala la extensión de EasyEDA

Descarga el último paquete `.eext` desde [GitHub Releases](https://github.com/biosshot/easyeda-copilot/releases/latest).

En EasyEDA Pro:

1. Abre `Settings -> Extensions -> Extensions Manager`.
2. Elige `Import Extensions`.
3. Selecciona el archivo `.eext` descargado.
4. Activa `External Interactions`.

<p align="center">
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/params.png">
    <img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/params.png" alt="Activar External Interactions para EasyEDA Copilot" width="560">
  </a>
</p>

### 2. Añade el servidor MCP

Codex:

```bash
codex mcp add easyeda-copilot -- npx -y easyeda-copilot-mcp
```

Claude Code:

```bash
claude mcp add easyeda-copilot -- npx -y easyeda-copilot-mcp
```

Para una configuración MCP genérica y compilaciones locales, consulta la [documentación del paquete MCP](https://github.com/biosshot/easyeda-copilot/blob/main/mcp/README.md).

Para usar la skill independiente en lugar de configurar un cliente MCP, compílala desde este repositorio. Los archivos de la skill no se publican en Releases:

```bash
npm ci
npm run build:skill
cd skill/scripts/runtime
npm install --omit=dev
```

Después instala el directorio `skill/` generado como se explica en la [guía de instalación de la skill](https://github.com/biosshot/easyeda-copilot/blob/main/mcp/docs/install-guide.md).

### 3. Abre un proyecto

1. Inicia el cliente MCP con EasyEDA Copilot activado.
2. Abre EasyEDA Pro y el esquema o la PCB de destino.
3. Pide al agente que inspeccione el proyecto abierto en EasyEDA y empiece el flujo de diseño.

La extensión encuentra el puente MCP local de forma automática. `Copilot -> MCP` pausa o reanuda la conexión.

## Capacidades

| Área                 | Capacidades                                                                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Esquemas             | Inspeccionar la página actual, crear y completar circuitos, reorganizar esquemas existentes en bloques funcionales y numerar designadores en varias páginas                                                                       |
| Componentes          | Resolver componentes de EasyEDA por MPN del fabricante o por UUID de pieza                                                                                                                                                        |
| Colocación en PCB    | Generar la geometría de la placa y una colocación guiada por restricciones con bloques funcionales, módulos, proximidad de pines, caminos de señal ordenados, colocación en el borde, zonas excluidas, taladros de montaje, pads térmicos y objetos conservados |
| Ruteo de PCB         | Definir clases de red, redes de señal y de alimentación, planos de cobre, pares diferenciales, grupos de longitud igualada, abanicos de salida, intención de impedancia, reruteo selectivo y cosido de vías                         |
| Inspección           | Generar vistas previas de la PCB por capas, resaltar redes y componentes, e inspeccionar longitud ruteada, anchos de pista, capas, vías, pads, polígonos, componentes cercanos y conexiones sin rutear                              |
| Verificación         | Leer las reglas de DRC actuales, ejecutar el DRC nativo de EasyEDA, revisar las violaciones y decidir si se conserva, repara o restaura un resultado aplicado                                                                     |
| Control del proyecto | Inspeccionar el árbol del proyecto, crear y abrir proyectos o documentos, sincronizar editores y elegir entre varias instancias de EasyEDA conectadas                                                                             |
| Operaciones largas   | Seguir, continuar, volver a aplicar resultados ya preparados o cancelar operaciones largas de colocación y ruteo de la PCB                                                                                                         |

## Puntos de control, transacciones y recuperación

EasyEDA Copilot usa puntos de control del documento completo y límites de aplicación explícitos para proteger el trabajo de ingeniería existente. Los cambios se previsualizan, se aplican a documentos nativos de EasyEDA, se inspeccionan y después se conservan, se reparan o se restauran.

| Flujo                                     | Protección y recuperación                                                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ensamblado de esquemas desde el código fuente | Guarda un punto de control del documento completo antes de modificarlo y lo restaura automáticamente si el ensamblado falla                                |
| Ordenación del esquema                    | Guarda un punto de control antes de sustituir la página y lo restaura automáticamente si la sustitución falla                                                  |
| Numeración en varias páginas              | Guarda un punto de control por cada página afectada y deshace las páginas modificadas si la transacción de numeración falla                                    |
| Colocación en PCB                         | Genera vistas previas mecánica y final, conserva el trabajo existente en la placa y guarda un punto de control antes del ensamblado                             |
| Ruteo de PCB                              | Aplica las reglas de DRC, la sustitución de cobre seleccionada, las pistas, vías y zonas nuevas, la sincronización y el DRC nativo en una única transacción respaldada por un punto de control |
| Fallo al aplicar el ruteo                 | Restaura automáticamente el punto de control previo al ruteo                                                                                                     |
| Recuperación manual                       | Lista, guarda y restaura explícitamente puntos de control del documento actual de EasyEDA                                                                         |

Los puntos de control contienen el código fuente completo del documento de EasyEDA, no solo una lista de acciones del agente. Las pistas, vías y zonas de cobre existentes se conservan por defecto y se tratan como obstáculos fijos para el ruteo. El cobre solo se sustituye cuando un programa de ruteo selecciona expresamente las redes y los tipos de objeto afectados con `clearRouting(...)`.

Un resultado de ruteo parcial que se aplica correctamente queda disponible para inspeccionarlo y repararlo de forma acotada. Una excepción durante la aplicación restaura el punto de control previo al ruteo. La recuperación protege el documento frente a modificaciones fallidas; la revisión eléctrica y de fabricabilidad sigue formando parte del flujo de ingeniería normal.

## Flujo de esquemas

La integración con esquemas trabaja con datos estructurados de componentes, pines, redes y páginas de EasyEDA.

1. Inspecciona el proyecto y la página de esquema actuales.
2. Resuelve los componentes exactos.
3. Guarda un punto de control del documento.
4. Crea un circuito, completa un fragmento existente, sustituye componentes seleccionados o reorganiza la página en bloques funcionales con nombre.
5. Aplica el resultado al documento nativo de EasyEDA.
6. Guarda e inspecciona el resultado; después consérvalo, revísalo o restáuralo.

La ordenación del esquema abarca toda la página actual y conserva la identidad de los componentes durante el reensamblado destructivo. La numeración en varias páginas tiene dos modos: `preserve` solo corrige designadores duplicados o sin número, y `resequence` recalcula los números finales siguiendo el orden de páginas y de posición. Los componentes de varias partes se renombran juntos.

## Flujo de PCB

La colocación, el ruteo, la inspección y el DRC de la PCB se ofrecen a través de la interfaz MCP.

1. Sincroniza el esquema con su documento de PCB enlazado.
2. Inspecciona los grupos del esquema y toda la conectividad para identificar bloques funcionales provisionales y a qué bloque pertenece cada pasivo local.
3. Inspecciona el contorno actual de la placa, las huellas, la colocación, las capas de cobre y las reglas de DRC.
4. Describe la intención mecánica, funcional y eléctrica en el DSL de colocación.
5. Revisa la vista previa mecánica y la vista previa final de la colocación.
6. Ensambla la colocación aprobada en el documento de PCB abierto en EasyEDA.
7. Define en el DSL de ruteo el apilado, las reglas de ruteo, las clases de red, los planos, las redes especiales, los abanicos de salida y el cosido de vías.
8. Aplica el programa de ruteo como una única transacción respaldada por un punto de control.
9. Inspecciona las redes críticas, las conexiones pendientes, el cobre y los resultados del DRC nativo.
10. Conserva el resultado, aplica una reparación acotada o restaura el punto de control anterior.

La colocación existente se puede mantener con `preserve(...)`. El ensamblado de la colocación conserva el cobre existente y los objetos de la placa que no tienen relación. El ruteo existente se conserva salvo que el DSL de ruteo llame expresamente a `clearRouting(...)` para un ámbito seleccionado.

Las operaciones largas de colocación y ruteo devuelven un ID de operación. El cliente MCP puede esperar a que terminen, cancelarlas o reintentar la aplicación de un resultado ya preparado sin volver a ejecutar la operación.

Referencias detalladas de colocación y ruteo:

- [Instrucciones de colocación en PCB](https://github.com/biosshot/easyeda-copilot/blob/main/mcp/docs/pcb-layout/instructions.md)
- [DSL de colocación en PCB](https://github.com/biosshot/easyeda-copilot/blob/main/mcp/docs/pcb-layout/dsl.ts)
- [Validación mecánica](https://github.com/biosshot/easyeda-copilot/blob/main/mcp/docs/pcb-layout/mechanical-validation.md)
- [Instrucciones de ruteo de PCB](https://github.com/biosshot/easyeda-copilot/blob/main/mcp/docs/pcb-routing/instructions.md)
- [DSL de ruteo de PCB](https://github.com/biosshot/easyeda-copilot/blob/main/mcp/docs/pcb-routing/dsl.ts)
- [Verificación y recuperación](https://github.com/biosshot/easyeda-copilot/blob/main/mcp/docs/verification.md)

<details>
<summary><strong>Galería comparativa de PCB: EasyEDA Copilot y Quilter</strong></summary>

Ejemplos anteriores, lado a lado, de las PCB obtenidas para los mismos diseños RP2040, PICO Duck y ESPower.

#### Placa RP2040

<p align="center">
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/rp2040_copilot_top.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/rp2040_copilot_top.png" alt="PCB RP2040 hecha con EasyEDA Copilot, capa superior" width="48%"></a>
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/rp2040_quiliter_top.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/rp2040_quiliter_top.png" alt="PCB RP2040 hecha con Quilter, capa superior" width="48%"></a>
</p>
<p align="center">
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/rp2040_copilot_bot.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/rp2040_copilot_bot.png" alt="PCB RP2040 hecha con EasyEDA Copilot, capa inferior" width="48%"></a>
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/rp2040_quiliter_bot.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/rp2040_quiliter_bot.png" alt="PCB RP2040 hecha con Quilter, capa inferior" width="48%"></a>
</p>

#### Placa compacta PICO Duck

<p align="center">
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/pico_duck_copilot_top.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/pico_duck_copilot_top.png" alt="PCB PICO Duck hecha con EasyEDA Copilot, capa superior" width="48%"></a>
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/pico_duck_quilter_top.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/pico_duck_quilter_top.png" alt="PCB PICO Duck hecha con Quilter, capa superior" width="48%"></a>
</p>
<p align="center">
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/pico_duck_copilot_bot.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/pico_duck_copilot_bot.png" alt="PCB PICO Duck hecha con EasyEDA Copilot, capa inferior" width="48%"></a>
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/pico_duck_quilter_bot.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/pico_duck_quilter_bot.png" alt="PCB PICO Duck hecha con Quilter, capa inferior" width="48%"></a>
</p>

#### Placa ESPower

<p align="center">
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/espower_copilot_top.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/espower_copilot_top.png" alt="PCB ESPower hecha con EasyEDA Copilot, capa superior" width="48%"></a>
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/espower_quiliter_top.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/espower_quiliter_top.png" alt="PCB ESPower hecha con Quilter, capa superior" width="48%"></a>
</p>
<p align="center">
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/espower_copilot_bot.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/espower_copilot_bot.png" alt="PCB ESPower hecha con EasyEDA Copilot, capa inferior" width="48%"></a>
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/espower_quiliter_bot.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/pcb-examples/espower_quiliter_bot.png" alt="PCB ESPower hecha con Quilter, capa inferior" width="48%"></a>
</p>

</details>

## Compatibilidad

| Versión de EasyEDA Pro | Estado      |
| ---------------------- | ----------- |
| Desktop V3.2.149       | Verificada  |
| Desktop V2.2.47        | Verificada  |
| Desktop V2.2.45        | Verificada  |

El ensamblado de PCB, la integración del ruteo, la inspección y el DRC nativo se verifican sobre todo con EasyEDA Pro Desktop V3.2.149.

## MCP y la interfaz integrada heredada

MCP es la interfaz principal de EasyEDA Copilot y la que se desarrolla activamente. La interfaz integrada original sigue disponible por su chat integrado y su flujo de SPICE.

| Función                                   | MCP       | Interfaz integrada     |
| ----------------------------------------- | --------- | ---------------------- |
| Generar y modificar esquemas              | Sí        | Sí, flujo heredado     |
| Resolución de componentes                 | Sí        | Sí                     |
| Puntos de control y recuperación automática | Sí      | Limitada               |
| Gestión de proyectos y documentos         | Sí        | No                     |
| Colocación en PCB, vista previa y ensamblado | Sí     | No                     |
| Ruteo de PCB, inspección, capas y DRC     | Sí        | No                     |
| Varias instancias de EasyEDA conectadas   | Sí        | No                     |
| Chat integrado e interfaz de SPICE        | No        | Sí                     |
| Prioridad de desarrollo                   | Principal | Mantenimiento limitado |

Los flujos nuevos y los informes de errores deben usar MCP, salvo que el problema sea específico de la interfaz heredada.

<details>
<summary>Mostrar la interfaz integrada heredada</summary>

La interfaz original ofrece un flujo de chat integrado para generar esquemas, completar circuitos, elegir componentes y simular con SPICE. Estas demostraciones usan la interfaz heredada; para los flujos nuevos con agentes se recomienda la integración MCP.

<p align="center">
  <img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/main.png" alt="Interfaz integrada heredada de EasyEDA Copilot">
</p>

#### Completar circuitos

Lee un fragmento de esquema existente, añade los componentes que faltan y completa sus conexiones eléctricas.

<p align="center">
  <img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/circuit-compl-ex1.gif" alt="Completar un esquema existente de EasyEDA, ejemplo uno" width="48%">
  <img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/circuit-compl-ex2.gif" alt="Completar un esquema existente de EasyEDA, ejemplo dos" width="48%">
</p>

#### Elección de componentes

Busca en el catálogo de LCSC a partir de requisitos de ingeniería y compara piezas candidatas sin salir del flujo de diseño.

<p align="center">
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/comp-search-ex1.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/comp-search-ex1.png" alt="Elección de componentes a partir de una petición de ingeniería" width="32%"></a>
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/comp-search-ex2.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/comp-search-ex2.png" alt="Resultados de búsqueda de componentes de LCSC en EasyEDA Copilot" width="32%"></a>
  <a href="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/comp-search-ex3.png"><img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/comp-search-ex3.png" alt="Elegir un componente candidato en EasyEDA Copilot" width="32%"></a>
</p>

#### Simulación SPICE

Ejecuta una simulación SPICE desde la interfaz integrada e inspecciona los modelos de componente seleccionados junto con las gráficas resultantes.

<p align="center">
  <img src="https://raw.githubusercontent.com/biosshot/easyeda-copilot/main/docs/media/spice.gif" alt="Ejecución de una simulación SPICE en la interfaz integrada de EasyEDA Copilot">
</p>

</details>

## Arquitectura y tratamiento de datos

```text
Codex / Claude Code / another MCP client
                    |
                    | stdio
                    v
          easyeda-copilot-mcp
                    |
                    | WebSocket on 127.0.0.1:8787
                    v
        EasyEDA Copilot extension
                    |
                    v
          Open EasyEDA document
```

La extensión de EasyEDA, el puente MCP, la lógica de aplicación sobre documentos, el sistema de puntos de control, las herramientas de inspección y el paquete de ruteo de PCB son de código abierto. El puente MCP se comunica con la extensión de EasyEDA en local, a través de `127.0.0.1`.

La biblioteca npm independiente [`eda-copilot-backend`](https://github.com/biosshot/eda-copilot-backend) resuelve componentes mediante las API públicas de EasyEDA y genera en local los planes de esquema y de colocación en PCB. Los planes se aplican, se protegen con puntos de control, se inspeccionan y se comprueban con el DRC a través de la extensión de EasyEDA. El chat integrado heredado usa su propia configuración de servicio. El ruteo de PCB se basa en el paquete de código abierto [`eda-copilot-router`](https://github.com/biosshot/eda-copilot-router).

## Documentación

- [Paquete MCP y configuración del cliente](https://github.com/biosshot/easyeda-copilot/blob/main/mcp/README.md)
- [Flujo MCP completo](https://github.com/biosshot/easyeda-copilot/blob/main/mcp/docs/workflow.md)
- [Flujo de esquemas](https://github.com/biosshot/easyeda-copilot/blob/main/mcp/docs/schematic/workflow.md)
- [Modificaciones de circuitos en el esquema](https://github.com/biosshot/easyeda-copilot/blob/main/mcp/docs/schematic/circuit-mod.md)
- [Gestión de proyectos y páginas](https://github.com/biosshot/easyeda-copilot/blob/main/mcp/docs/schematic/project-and-pages.md)
- [Ajustes y permisos](https://github.com/biosshot/easyeda-copilot/blob/main/docs/settings.md)
- [Adjuntar circuitos a un agente de IA](https://github.com/biosshot/easyeda-copilot/blob/main/docs/attaching-circuits.md)
- [Ensamblar circuitos desde un agente de IA](https://github.com/biosshot/easyeda-copilot/blob/main/docs/assembling-circuits.md)

## Desarrollo

El código fuente de la extensión, la interfaz, los recursos y la configuración de compilación están en `extension/`; `mcp/` y `shared/` son workspaces hermanos. Los comandos de compilación y desarrollo de la raíz siguen siendo el punto de entrada. El `.eext` se genera en `build/dist/`. Consulta el [desarrollo de la extensión](https://github.com/biosshot/easyeda-copilot/blob/main/extension/README.md).

Compila la extensión y el paquete MCP desde el código fuente:

```bash
git clone https://github.com/biosshot/easyeda-copilot.git
cd easyeda-copilot
npm ci
npm run build
npm run check --workspace=mcp
```

Por defecto se instalan los paquetes publicados del backend y del router. Para desarrollarlos a la vez, cambiar de dependencias y conocer los límites de cada plataforma, consulta el [desarrollo local](https://github.com/biosshot/easyeda-copilot/blob/main/docs/local-development.md). Compilar la extensión requiere Node ^20.19.0 o >=22.12.0.

El paquete independiente de ruteo de PCB se desarrolla en [`biosshot/eda-copilot-router`](https://github.com/biosshot/eda-copilot-router).

## Apoya el proyecto

Si EasyEDA Copilot te ahorra tiempo de ingeniería, puedes [apoyar su desarrollo a través de Tribute](https://web.tribute.tg/d/PTf). Las aportaciones ayudan a mantener la extensión, la integración MCP, las herramientas de ruteo, la documentación y los nuevos flujos de diseño.

## Comunidad

Las preguntas, los informes de errores, los ejemplos de diseño y las contribuciones son bienvenidos en [GitHub Issues](https://github.com/biosshot/easyeda-copilot/issues) y en [Discord](https://discord.gg/AXCGjTDYkq).

## Licencia

EasyEDA Copilot se distribuye con la [licencia MIT](https://github.com/biosshot/easyeda-copilot/blob/main/LICENSE).
