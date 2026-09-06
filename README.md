# Mise

A personal recipe collection, published as a static site.

Recipes live as Markdown files in `content/recipes/`, each with frontmatter for
category, tags, timings, servings and nutrition. Nuxt Content reads them, and
the site renders a filterable index plus a full-screen cooking mode for use at
the hob.

Built with Nuxt 4, Nuxt UI and Nuxt Content. Deployed to S3 behind CloudFront
via the CDK stacks in `cdk/`.

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

The site runs on `http://localhost:3000`.

## Checks

```bash
pnpm lint
pnpm typecheck
```

## Build

```bash
pnpm build
pnpm preview
```

## Adding a recipe

Drop a Markdown file into `content/recipes/`, or into a category subdirectory
such as `content/recipes/curry/`. The frontmatter schema is defined in
`content.config.ts`.
