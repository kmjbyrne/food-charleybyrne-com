import * as cdk from 'aws-cdk-lib/core'
import { Template, Match } from 'aws-cdk-lib/assertions'
import { CertificateStack } from '../lib/certificate-stack'
import { SiteStack } from '../lib/site-stack'
import type { InfraConfig } from '../config'

const testConfig: InfraConfig = {
  domainName: 'food.charleybyrne.com',
  hostedZoneName: 'charleybyrne.com',
  bucketName: 'food-charleybyrne-com',
  distributionId: 'E1234567890ABC',
  githubRepo: 'kmjbyrne/food-charleybyrne-com',
  deployBranch: 'main'
}

function buildStacks(): { certTemplate: Template, siteTemplate: Template } {
  const app = new cdk.App()

  const certStack = new CertificateStack(app, 'TestCertStack', {
    env: { account: '123456789012', region: 'us-east-1' },
    config: testConfig,
    crossRegionReferences: true
  })

  const siteStack = new SiteStack(app, 'TestSiteStack', {
    env: { account: '123456789012', region: 'eu-west-1' },
    config: testConfig,
    cert: certStack.cert,
    crossRegionReferences: true
  })

  return {
    certTemplate: Template.fromStack(certStack),
    siteTemplate: Template.fromStack(siteStack)
  }
}

describe('CertificateStack (us-east-1)', () => {
  let certTemplate: Template

  beforeAll(() => {
    ;({ certTemplate } = buildStacks())
  })

  test('creates an ACM certificate', () => {
    certTemplate.resourceCountIs('AWS::CertificateManager::Certificate', 1)
  })

  test('certificate covers the correct domain', () => {
    certTemplate.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'food.charleybyrne.com'
    })
  })
})

describe('SiteStack (eu-west-1)', () => {
  let siteTemplate: Template

  beforeAll(() => {
    ;({ siteTemplate } = buildStacks())
  })

  test('creates a private S3 bucket with website configuration', () => {
    siteTemplate.hasResourceProperties('AWS::S3::Bucket', {
      WebsiteConfiguration: {
        IndexDocument: 'index.html',
        ErrorDocument: 'index.html'
      }
    })
  })

  test('creates an OAI', () => {
    siteTemplate.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1)
  })

  test('S3 bucket policy grants OAI read access', () => {
    siteTemplate.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:GetObject',
            Effect: 'Allow'
          })
        ])
      }
    })
  })

  test('creates a CloudFront distribution with the correct domain alias', () => {
    siteTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Aliases: ['food.charleybyrne.com']
      }
    })
  })

  test('creates a Route 53 alias A record pointing at CloudFront', () => {
    siteTemplate.hasResourceProperties('AWS::Route53::RecordSet', {
      Type: 'A',
      Name: 'food.charleybyrne.com.',
      AliasTarget: Match.objectLike({
        DNSName: Match.anyValue(),
        HostedZoneId: Match.anyValue()
      })
    })
  })

  test('produces the expected stack outputs', () => {
    const outputs = siteTemplate.findOutputs('*')
    // BucketName + DistributionId + DistributionDomainName + SiteUrl
    expect(Object.keys(outputs).length).toBe(4)
  })
})
