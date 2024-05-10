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
      scopes: ['https://www.googleapis.com/auth/bigquery.readonly'],
    })
  }

  async queryPackageDownloadStats(packageName: string) {
    if (!this.auth)
      return undefined
    const client = new BigQuery({ authClient: await this.auth.getClient() as JSONClient })
    const query = `WITH date_series AS (
      SELECT
        day AS period_start
      FROM
        UNNEST(GENERATE_DATE_ARRAY(DATE_SUB(CURRENT_DATE(), INTERVAL 364 DAY), DATE_SUB(CURRENT_DATE(), interval 7 day), INTERVAL 7 DAY)) AS day
    )
    SELECT
      ds.period_start as week_start_date,
      COUNT(dl.timestamp) AS downloads
    FROM
      date_series ds
      LEFT JOIN \`bigquery-public-data.pypi.file_downloads\` dl
      ON date(dl.timestamp) >= ds.period_start
      AND date(dl.timestamp) < DATE_ADD(ds.period_start, INTERVAL 7 DAY)
    where dl.project = @package
    GROUP BY
      ds.period_start
    ORDER BY ds.period_start;
    `

    const [rows] = await client.query({
      query,
      location: 'US',
      params: { package: packageName },
    })
    return rows.map(
      (row: { week_start_date: { value: string }, downloads: number }) => ({
        week_start_date: row.week_start_date.value,
        downloads: row.downloads,
      }),
    )
  }
}
