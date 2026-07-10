# Módulos del Motor

Cada módulo debe tener documento de diseño antes de implementación relevante. Esta carpeta define responsabilidades, límites y criterios de aceptación iniciales.

## Lista de módulos

- [Core Engine](Core-Engine.md)
- [Map Engine](Map-Engine.md)
- [Combat Engine](Combat-Engine.md)
- [Dice Engine](Dice-Engine.md)
- [NPC Engine](NPC-Engine.md)
- [Campaign Engine](Campaign-Engine.md)
- [Ruleset Engine](Ruleset-Engine.md)
- [Import/Export Engine](Import-Export-Engine.md)
- [Asset Storage Engine](Asset-Storage-Engine.md)
- [AI Engine](AI-Engine.md)
- [Audio, Lighting and Effects Engine](Audio-Lighting-Effects-Engine.md)

## Regla de trabajo

Antes de tocar código de un módulo:

1. Revisar este documento y el SRS.
2. Completar secciones faltantes del documento específico.
3. Definir tipos compartidos, endpoints y eventos.
4. Implementar la versión mínima verificable.
5. Actualizar pruebas y documentación.
