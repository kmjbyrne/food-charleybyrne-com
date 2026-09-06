#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core'
import { CertificateStack } from '../lib/certificate-stack'
import { SiteStack } from '../lib/site-stack'
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
new SiteStack(app, 'FoodCbComSiteStack', {
  env: { account, region: 'eu-west-1' },
  config,
  cert: certStack.cert,
  description: 'food.charleybyrne.com — S3 bucket, CloudFront distribution, and Route 53 alias',
  crossRegionReferences: true
})
