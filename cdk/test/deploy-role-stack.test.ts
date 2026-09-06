import * as cdk from 'aws-cdk-lib/core'
import { Template, Match } from 'aws-cdk-lib/assertions'
import { DeployRoleStack } from '../lib/deploy-role-stack'
import type { InfraConfig } from '../config'

const testConfig: InfraConfig = {
  domainName: 'food.charleybyrne.com',
  hostedZoneName: 'charleybyrne.com',
  bucketName: 'food-charleybyrne-com',
  distributionId: 'E1234567890ABC',
  githubRepo: 'kmjbyrne/food-charleybyrne-com',
  deployBranch: 'main'
}

function buildTemplate(config: InfraConfig = testConfig): Template {
  const app = new cdk.App()
  const stack = new DeployRoleStack(app, 'TestDeployRoleStack', {
    env: { account: '123456789012', region: 'us-east-1' },
    config
  })
  return Template.fromStack(stack)
}

describe('DeployRoleStack', () => {
  it('restricts the trust policy to one repo and branch', () => {
    buildTemplate().hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
              },
              StringLike: {
                'token.actions.githubusercontent.com:sub':
                  'repo:kmjbyrne/food-charleybyrne-com:ref:refs/heads/main'
              }
            }
          })
        ]
      }
    })
  })

  it('grants only the actions s3 sync and an invalidation need', () => {
    const statements = buildTemplate()
      .findResources('AWS::IAM::Policy')
    const actions = Object.values(statements)
      .flatMap((p: any) => p.Properties.PolicyDocument.Statement)
      .flatMap((s: any) => (Array.isArray(s.Action) ? s.Action : [s.Action]))
      .sort()

    expect(actions).toEqual([
      'cloudfront:CreateInvalidation',
      's3:DeleteObject',
      's3:GetObject',
      's3:ListBucket',
      's3:PutObject'
    ])
  })

  it('scopes every grant to the site bucket and one distribution', () => {
    const resources = Object.values(buildTemplate().findResources('AWS::IAM::Policy'))
      .flatMap((p: any) => p.Properties.PolicyDocument.Statement)
      .map((s: any) => s.Resource)

    expect(resources).toEqual([
      'arn:aws:s3:::food-charleybyrne-com/*',
      'arn:aws:s3:::food-charleybyrne-com',
      'arn:aws:cloudfront::123456789012:distribution/E1234567890ABC'
    ])
    expect(resources).not.toContain('*')
  })
})
