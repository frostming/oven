import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export default function Time({ time }: { time: string | dayjs.Dayjs }) {
  const date = dayjs(time)
  return <time dateTime={date.toISOString()} title={date.format()}>{date.fromNow()}</time>
}
