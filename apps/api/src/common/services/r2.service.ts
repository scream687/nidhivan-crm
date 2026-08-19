import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { extname } from 'path';

/**
 * Object storage on Cloudflare R2, via its S3-compatible API.
 *
 * Uploads used to go to local disk under public/uploads. That only works while
 * the API owns a persistent filesystem — on Workers/Containers, and on most
 * managed Node hosts, disk is wiped whenever the instance restarts, so every
 * uploaded image and generated booking letter would silently disappear.
 *
 * Unlike CacheService, this does NOT degrade quietly when unconfigured: losing
 * a customer's document without telling anyone is worse than a loud failure.
 */
@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client | null = null;
  private readonly bucket: string;
  /** Optional r2.dev or custom domain. When unset, reads go through signed URLs. */
  private readonly publicBaseUrl: string | null;

  constructor(config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('R2_BUCKET', '');
    this.publicBaseUrl =
      config.get<string>('R2_PUBLIC_BASE_URL')?.replace(/\/$/, '') || null;

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
      this.logger.warn(
        'R2 is not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET) — upload and document routes will fail until it is.',
      );
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Collision-resistant key. `prefix` is caller-controlled (e.g. a project id),
   * so it is sanitised here rather than trusting every call site — the old
   * diskStorage had to strip `../` for exactly this reason.
   */
  buildKey(prefix: string, originalName: string, label = 'file'): string {
    const safePrefix = prefix
      .replace(/\.\.(\/|\\)/g, '')
      .replace(/^\/+/, '')
      .replace(/[^a-zA-Z0-9/_-]/g, '');
    const unique =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ext = extname(originalName).toLowerCase();
    return `${safePrefix}/${label}-${unique}${ext}`;
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    const client = this.requireClient();
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  /**
   * A URL the browser can load. Falls back to a time-limited signed URL when no
   * public domain is bound to the bucket.
   */
  async urlFor(key: string, expiresInSeconds = 3600): Promise<string> {
    if (this.publicBaseUrl) return `${this.publicBaseUrl}/${key}`;
    const client = this.requireClient();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async delete(key: string): Promise<void> {
    const client = this.requireClient();
    await client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'File storage is not configured on this server',
      );
    }
    return this.client;
  }
}
