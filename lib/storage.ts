import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

const BUCKET = process.env.S3_BUCKET!;

let _client: S3Client | null = null;

function s3() {
  if (!_client) {
    _client = new S3Client({
      region: process.env.AWS_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

/** Build the S3 key for a screen's HTML */
export function screenKey(userId: string, projectId: string, screenId: string): string {
  return `${userId}/${projectId}/screens/${screenId}.html`;
}

/** Upload screen HTML to S3 */
export async function uploadScreenHtml(
  userId: string,
  projectId: string,
  screenId: string,
  html: string
): Promise<string> {
  const key = screenKey(userId, projectId, screenId);
  await s3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: html,
      ContentType: "text/html; charset=utf-8",
    })
  );
  return key;
}

/** Download screen HTML from S3 */
export async function getScreenHtml(storageKey: string): Promise<string> {
  const { Body } = await s3().send(
    new GetObjectCommand({ Bucket: BUCKET, Key: storageKey })
  );
  if (!Body) throw new Error("Empty S3 response");
  return await Body.transformToString("utf-8");
}

/** Delete a single screen file */
export async function deleteScreenFile(storageKey: string): Promise<void> {
  await s3().send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey })
  );
}

/** Delete all files for a project (screens/, src/, assets/, etc.) */
export async function deleteProjectFiles(userId: string, projectId: string): Promise<void> {
  const prefix = `${userId}/${projectId}/`;
  let continuationToken: string | undefined;

  do {
    const list = await s3().send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );

    const objects = list.Contents?.map((o) => ({ Key: o.Key! }));
    if (objects && objects.length > 0) {
      await s3().send(
        new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: objects },
        })
      );
    }

    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);
}
