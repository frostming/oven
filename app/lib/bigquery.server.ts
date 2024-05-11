import process from 'node:process'
import { Buffer } from 'node:buffer'
import { GoogleAuth } from 'google-auth-library'
import { BigQuery } from '@google-cloud/bigquery'
import type { JSONClient } from 'google-auth-library/build/src/auth/googleauth'

export class BigQueryClient {
  private auth?: GoogleAuth

  constructor() {
    this.auth = this.getGoogleAuth()
  }

  isEnabled() {
    return !!this.auth
  }

  private getGoogleAuth() {
    if (!process.env.GOOGLE_CREDENTIALS)
      return undefined
    const credentials = Buffer.from(process.env.GOOGLE_CREDENTIALS as string, 'base64').toString('utf-8')
    const decodedCredentials = JSON.parse(credentials)
    return new GoogleAuth({
      credentials: decodedCredentials,
      scopes: ['https://www.googleapis.com/auth/bigquery'],
    })
  }

  async queryPackageDownloadStats(packageName: string): Promise<[{ week_start_date: string, downloads: number }[], Error | undefined]> {
    if (!this.auth)
      return [[], new Error('Download stats are not available')]
    const client = new BigQuery({ authClient: await this.auth.getClient() as JSONClient })
    const query = `SELECT
    date_trunc(date(timestamp), week) as week_start_date,
    COUNT(*) AS downloads
  FROM
    \`bigquery-public-data.pypi.file_downloads\`
  WHERE project = @package
    AND
      date(timestamp) between
      date_sub(date_trunc(current_date(), week), interval 364 day)
      and date_sub(date_trunc(current_date(), week), interval 1 day)
  GROUP BY
    week_start_date
  ORDER BY week_start_date;
    `
    try {
      const [rows] = await client.query({
        query,
        location: 'US',
        params: { package: packageName },
        jobTimeoutMs: 5000,
      })
      return [rows.map(
        (row: { week_start_date: { value: string }, downloads: number }) => ({
          week_start_date: row.week_start_date.value,
          downloads: row.downloads,
        }),
      ), undefined]
    }
    catch (error) {
      return [[], error as Error]
    }
  }
}
