# Infrastructure

AWS CDK stacks for the site. `FoodCbComCertificateStack` issues the ACM
certificate in `us-east-1`, which is where CloudFront requires it.
`FoodCbComSiteStack` provisions the S3 bucket, the CloudFront distribution and
the Route 53 alias in `eu-west-1`.

This is a workspace package. Run the CDK commands from the repository root
rather than from here:

```bash
pnpm cdk list
pnpm cdk:diff
pnpm cdk:deploy
```

See [DEVELOPMENT.md](../DEVELOPMENT.md) for the full set and for how the root
scripts delegate into this package.

## Local Commands

These run from within this directory and act on this package alone.

```bash
pnpm build
pnpm watch
pnpm test
```
