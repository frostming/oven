import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

interface IDownloadChartProps {
  data: {
    week_start_date: string
    downloads: number
  }[]
}

function numberWithCommas(x: number) {
  return x.toFixed().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function DownloadChart({ data }: IDownloadChartProps) {
  const average = numberWithCommas(data.length ? data.reduce((acc, curr) => acc + curr.downloads, 0) / data.length : 0)
  return (
    <div className="h-32 relative">
      <p className="absolute left-0 top-0">{average}</p>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <XAxis dataKey="week_start_date" hide />
          <Tooltip wrapperStyle={{ fontSize: '0.75rem' }} />
          <Area type="monotone" dataKey="downloads" stroke="#8884d8" fill="#8884d8" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
