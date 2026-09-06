import * as cdk from 'aws-cdk-lib/core'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import type * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as targets from 'aws-cdk-lib/aws-route53-targets'
import type { Construct } from 'constructs'
import type { InfraConfig } from '../config'

export interface SiteStackProps extends cdk.StackProps {
  readonly config: InfraConfig
  readonly cert: acm.Certificate
}

export class SiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props)

    const { config, cert } = props

    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: config.hostedZoneName
    })

    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: config.domainName.replace(/\./g, '-'),
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      accessControl: s3.BucketAccessControl.PRIVATE
    })

    // S3 stores prerendered routes as /path/index.html, but the browser asks
    // for /path. Without this rewrite S3 returns 403, CloudFront swallows it,
    // and every deep link lands on the homepage.
    const rewriteFunction = new cloudfront.Function(this, 'RewriteFunction', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request
  var uri = request.uri

  // Legacy paths from before recipes and categories shared one namespace.
  if (uri.indexOf('/recipes/') === 0 || uri.indexOf('/c/') === 0) {
    var target = uri.replace(/^\\/(recipes|c)/, '')
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: target || '/' } }
    }
  }

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html'
  } else if (!uri.includes('.')) {
    request.uri = uri + '/index.html'
  }

  return request
}
      `)
    })

    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [{
          function: rewriteFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST
        }]
      },
      domainNames: [config.domainName],
      certificate: cert,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultRootObject: 'index.html',
      // A genuine miss should say so rather than silently serving the homepage.
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html'
        },
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/404.html'
        }
      ]
    })

    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: config.domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
    })

    new cdk.CfnOutput(this, 'BucketName', {
      value: siteBucket.bucketName,
      description: 'S3 bucket name — deploy built Nuxt output here'
    })

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID — invalidate after each deploy'
    })

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront domain name'
    })

    new cdk.CfnOutput(this, 'SiteUrl', {
      value: `https://${config.domainName}`,
      description: 'Public URL of the site'
    })
  }
}
