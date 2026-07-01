import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import { Chip } from '@mui/material'

type Props = {
  value: string
  size?: 'small' | 'medium'
}

const colorByValue: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  pass: 'success',
  good: 'success',
  matched: 'success',
  paid: 'success',
  completed: 'success',
  validated: 'success',
  sent: 'info',
  scheduled: 'info',
  in_progress: 'info',
  warning: 'warning',
  medium: 'warning',
  partial: 'warning',
  overdue: 'warning',
  pending: 'warning',
  fail: 'error',
  high: 'error',
  critical: 'error',
  exception: 'error',
  unmatched: 'error',
}

export function StatusChip({ value, size = 'small' }: Props) {
  const normalized = value.toLowerCase()
  const color = colorByValue[normalized] ?? 'default'
  const icon =
    color === 'success' ? (
      <CheckCircleRoundedIcon />
    ) : color === 'warning' ? (
      <WarningAmberRoundedIcon />
    ) : color === 'error' ? (
      <ErrorRoundedIcon />
    ) : (
      <ScheduleRoundedIcon />
    )

  return <Chip icon={icon} color={color} size={size} label={value.replace('_', ' ')} sx={{ textTransform: 'capitalize' }} />
}

