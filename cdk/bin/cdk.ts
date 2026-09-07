#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core'
import { CertificateStack } from '../lib/certificate-stack'
import { SiteStack } from '../lib/site-stack'
import { DeployRoleStack } from '../lib/deploy-role-stack'
import config from '../config'

const app = new cdk.App()

const account = process.env.CDK_DEFAULT_ACCOUNT

// ACM certificate must be in us-east-1 for CloudFront.
const certStack = new CertificateStack(app, 'FoodCbComCertificateStack', {
  env: { account, region: 'us-east-1' },
  config,
  description: 'food.charleybyrne.com — ACM certificate',
  crossRegionReferences: true
})

// Everything else — S3, OAI, CloudFront, Route 53 — in eu-west-1.
const siteStack = new SiteStack(app, 'FoodCbComSiteStack', {
  env: { account, region: 'eu-west-1' },
  config,
  cert: certStack.cert,
  description: 'food.charleybyrne.com — S3 bucket, CloudFront distribution, and Route 53 alias',
  crossRegionReferences: true
})

// IAM is global, so the role lives in its own stack in us-east-1. It reads the
// distribution ID across regions rather than hardcoding it, which means
// destroying SiteStack now requires destroying this stack first.
new DeployRoleStack(app, 'FoodCbComDeployRoleStack', {
  env: { account, region: 'us-east-1' },
  config,
  distribution: siteStack.distribution,
  description: 'food.charleybyrne.com — GitHub Actions OIDC deploy role',
  crossRegionReferences: true
})
