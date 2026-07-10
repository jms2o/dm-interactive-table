# Asset Storage Engine

## Propósito

Registrar y resolver assets de campaña como recursos de dominio: mapas, tokens, retratos, música, sonidos y efectos.

## Responsabilidades

- Mantener una librería de assets por campaña.
- Exponer metadata estable para UI, paquetes e integraciones futuras.
- Separar el registro del asset del uso concreto en mapa, token o ambiente.
- Preparar persistencia con el modelo `Asset` de Prisma.
- Servir URLs locales bajo `/assets` cuando existan archivos en el workspace.

## Fuera de alcance inicial

- Upload binario desde navegador.
- Transcodificación de audio o imágenes.
- Deduplicación por hash.
- CDN o storage S3-compatible.
- Permisos granulares por jugador.

## Contratos

Tipos compartidos:

- `AssetLibraryItem`
- `AssetLibraryType`
- `CreateAssetRequest`
- `AssetLibraryResponse`

HTTP:

- `GET /api/campaigns/{campaignId}/assets`
- `GET /api/campaigns/{campaignId}/assets/{assetId}`
- `POST /api/campaigns/{campaignId}/assets`

## Modelo de dominio

Un asset registrado contiene:

- `id`
- `campaignId`
- `type`
- `name`
- `url`
- `provider`
- `status`
- `metadata`
- timestamps

El registro no implica que el frontend ya pueda reproducir o renderizar todos los tipos. La fase inicial garantiza trazabilidad y empaquetado consistente.

## Integración con paquetes

El Import/Export Engine consume la librería de assets para llenar `CampaignPackage.data.assets`.

- Assets registrados usan `source: "asset-storage"`.
- Cada entrada conserva `storageAssetId`.
- `apply-copy` crea copias de assets registrados para la campaña importada.
- Los assets derivados de color de token siguen como metadata auxiliar.

## Criterios de aceptación

- La campaña demo arranca con assets registrados.
- El DM puede listar y registrar assets desde `/dm`.
- La API permite listar, consultar y crear assets.
- Los paquetes exportados contienen assets provenientes del storage.
- `apply-copy` importa assets registrados hacia la nueva campaña.
- El smoke test cubre API, paquete y copia aplicada.

