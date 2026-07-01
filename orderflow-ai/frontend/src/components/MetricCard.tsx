import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import { Box, Paper, Stack, Typography } from '@mui/material'
import type { DashboardMetric } from '../types'

const accentByTone = {
  good: '#2f7d51',
  warning: '#b87919',
  critical: '#b84242',
  neutral: '#245f5a',
}

export function MetricCard({ metric, onClick }: { metric: DashboardMetric; onClick?: () => void }) {
  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2.25,
        minHeight: 132,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
        '&:hover': onClick ? {
          boxShadow: 3,
          transform: 'translateY(-2px)'
        } : {}
      }}
    >
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="text.secondary" variant="body2">
            {metric.label}
          </Typography>
          <Typography variant="h1" sx={{ mt: 0.75, fontSize: '2.2rem' }}>
            {metric.value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            color: accentByTone[metric.tone],
            bgcolor: `${accentByTone[metric.tone]}16`,
          }}
        >
          <ArrowOutwardRoundedIcon fontSize="small" />
        </Box>
      </Stack>
      <Typography variant="body2" sx={{ mt: 1.25, color: accentByTone[metric.tone], fontWeight: 700 }}>
        {metric.change}
      </Typography>
    </Paper>
  )
}
