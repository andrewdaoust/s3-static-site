import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
let bucketName = config.require("bucket_name");
let username = config.get("deploy_user");

// Create an AWS resource (S3 Bucket)
const bucket = new aws.s3.BucketV2(
  "s3-bucket", 
  {
    bucket: bucketName,
  }
);

new aws.s3.BucketPublicAccessBlock(
  "enable-public-access", 
  {
    bucket: bucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
  }
);

new aws.s3.BucketWebsiteConfigurationV2(
  "bucket-website-config", 
  {
    bucket: bucket.id,
    indexDocument: {
      suffix: "index.html",
    },
  }
);

const policyDocument = JSON.stringify(
  {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadGetObject",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucketName}/*`,
      },
    ],
  }
);

new aws.s3.BucketPolicy(
  "attach-policy", 
  {
    bucket: bucket.id,
    policy: policyDocument,
  }
);

let deployUser = new aws.iam.User(
  "deploy-website-user", 
  {
    name: username,
  }
);

let deployPolicyDocument = JSON.stringify(
  {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "ListBucket",
        Effect: "Allow",
        Action: ["s3:ListBucket"],
        Resource: [`arn:aws:s3:::${bucketName}`],
      },
      {
        Sid: "BucketPutAccess",
        Effect: "Allow",
        Action: ["s3:PutObject", "s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucketName}/*`],
      },
    ],
  }
);

new aws.iam.UserPolicy(
  "deploy-website-user-policy", 
  {
    user: deployUser.name,
    policy: deployPolicyDocument,
  }
);

const accessKey = new aws.iam.AccessKey(
  "deploy-website-user-access-keys", 
  {
    user: deployUser.name,
  }
);

// export access keys
export const accessKeyId = accessKey.id;
export const secretAccessKey = accessKey.secret;
