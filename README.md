# Instagram Scraper MVP

Monorepo para una aplicación que scrapea perfiles de Instagram de agencias de viajes, analiza los posts con IA (GPT-4o Vision) y muestra los resultados en un dashboard.

## Arquitectura

- **apps/web**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **apps/api**: Express.js + TypeScript + BullMQ + Redis
- **packages/shared**: Tipos y schemas Zod compartidos
- **packages/database**: Cliente Supabase + tipos generados
- **packages/ai-provider**: Abstracción de proveedores de IA

## Requisitos

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- [Docker](https://www.docker.com/) (para Redis local)

## Primeros pasos

1. Copiar variables de entorno:
   ```bash
   cp .env.example .env
   ```

2. Instalar dependencias:
   ```bash
   pnpm install
   ```

3. Levantar Redis local:
   ```bash
   docker compose up -d
   ```

4. Correr en modo desarrollo:
   ```bash
   pnpm dev
   ```

## Scripts

| Script | Descripción |
|--------|-------------|
| `pnpm dev` | Levanta todas las apps en modo watch |
| `pnpm build` | Compila todos los paquetes y apps |
| `pnpm lint` | Ejecuta linter en todos los paquetes |
| `pnpm format` | Formatea el código con Prettier |
