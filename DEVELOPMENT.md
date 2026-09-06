# Development

Notes on the repository layout and the commands used day to day. For what the
site is and how to add a recipe, see [README.md](README.md).

## Workspace Layout

The repository is a pnpm workspace with two packages. The root package is the
Nuxt site. The `cdk/` package holds the AWS CDK stacks that provision the S3
bucket, the CloudFront distribution, the Route 53 alias and the ACM
certificate.

`pnpm-workspace.yaml` registers `cdk` as a workspace package, which is what
allows infrastructure commands to run from the repository root. A single
`pnpm install` at the root covers both packages, and their dependencies share
one store and one lockfile. The `cdk/` directory has no lockfile of its own.

That file also carries `onlyBuiltDependencies`, which pnpm 10 reads from the
workspace file rather than from `package.json` once a workspace exists. The
entry for `better-sqlite3` is what permits its native build step to run.

## Setup

```bash
pnpm install
```

## Site

```bash
pnpm dev
pnpm build
pnpm preview
```

The dev server runs on `http://localhost:3000`.

## Checks

```bash
pnpm lint
pnpm typecheck
```

## Infrastructure

Every CDK command runs from the repository root. There is no need to change
directory into `cdk/` first.

```bash
pnpm cdk list
pnpm cdk:synth
pnpm cdk:diff
pnpm cdk:deploy
```

The `cdk` script forwards any subcommand and its arguments through to the CDK
CLI, so anything the toolkit accepts works:

```bash
pnpm cdk deploy FoodCbComSiteStack
pnpm cdk bootstrap
```

The three `cdk:*` scripts are shorthands for the subcommands used most often.

There are two stacks. `FoodCbComCertificateStack` deploys to `us-east-1`,
because CloudFront requires its certificate in that region.
`FoodCbComSiteStack` holds everything else, the S3 bucket, the origin access
identity, the distribution and the Route 53 alias, and deploys to `eu-west-1`.
The site stack consumes the certificate across regions, so the two are linked
by `crossRegionReferences` and the certificate stack deploys first.

### How the Delegation Works

The root `cdk` script is `pnpm --filter food-cb-com-cdk exec cdk`. The
`--filter` flag sets the working directory to `cdk/` for the duration of the
command, which matters because the CDK CLI resolves `cdk.json` and the
`bin/cdk.ts` entrypoint relative to the current directory.

Note that bare `pnpm exec cdk` from the root does not work. The `aws-cdk`
package is a dependency of the `cdk` package alone, so its binary is not linked
into the root `node_modules/.bin`. Use the `pnpm cdk` script instead. Adding
`aws-cdk` to the root `devDependencies` would make the bare form work too, at
the cost of a second copy of the CLI to keep in step.

## TypeScript Versions

The two packages pin different TypeScript versions. The root uses `^6.0.3` for
Nuxt, and `cdk/` uses `~5.9.3`. pnpm's isolated layout keeps them apart, so
`tsc` inside `cdk/` resolves 5.9 while `pnpm typecheck` at the root resolves 6.
This is deliberate only in the sense that nobody has needed to align them; treat
it as a loose end rather than a decision.
