import process from 'node:process'
import { Buffer } from 'node:buffer'
import { GoogleAuth } from 'google-auth-library'
import { BigQuery } from '@google-cloud/bigquery'
import type { JSONClient } from 'google-auth-library/build/src/auth/googleauth'

export class BigQueryClient {
  private auth: GoogleAuth

  constructor() {
    this.auth = this.getGoogleAuth()
  }

  private getGoogleAuth() {
    const credentials = Buffer.from(process.env.GOOGLE_CREDENTIALS as string, 'base64').toString('utf-8')
    const decodedCredentials = JSON.parse(credentials)
    return new GoogleAuth({
      credentials: decodedCredentials,
      scopes: ['https://www.googleapis.com/auth/bigquery.readonly'],
    })
  }

  async queryPackageDownloadStats(packageName: string) {
    const client = new BigQuery({ authClient: await this.auth.getClient() as JSONClient })
    const query = `SELECT
      date_trunc(date(timestamp), week) AS week_start_date,
      COUNT(*) AS downloads
    FROM \`bigquery-public-data.pypi.file_downloads\`
    WHERE
      date(timestamp) >= date_sub(current_date(), INTERVAL 1 year)
      and project = @package
    GROUP BY \`week_start_date\`
    ORDER BY \`week_start_date\` ASC
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
