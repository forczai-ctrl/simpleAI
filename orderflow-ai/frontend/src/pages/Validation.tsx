import RuleRoundedIcon from '@mui/icons-material/RuleRounded'
import { Box, Grid, LinearProgress, Paper, Stack, Typography } from '@mui/material'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import type { PipelineRun } from '../types'

export function Validation({ pipeline }: { pipeline: PipelineRun | null }) {
  const validation = pipeline?.validation

  if (!validation) {
    return (
      <Paper sx={{ p: 3, minHeight: 360, display: 'grid', placeItems: 'center' }}>
        <Typography color="text.secondary">Extract an order to view validation results.</Typography>
      </Paper>
    )
  }

  const weights = [
    ['Customer tier', validation.priority.tier_weight],
    ['Revenue', validation.priority.revenue_weight],
    ['Deadline', validation.priority.deadline_weight],
    ['Complexity', validation.priority.complexity_weight],
  ] as const

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, lg: 7 }}>
        <Paper sx={{ p: 2.25 }}>
          <SectionHeader title="Validation Results" action={<StatusChip value={validation.approved ? 'pass' : 'fail'} />} />
          <Stack spacing={1.25}>
            {validation.checks.map((check) => (
              <Box key={`${check.name}-${check.detail}`} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fbfcfa', border: '1px solid rgba(36,95,90,0.1)' }}>
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 760 }}>{check.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {check.detail}
                    </Typography>
                  </Box>
                  <StatusChip value={check.status} />
                </Stack>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Paper sx={{ p: 2.25 }}>
          <SectionHeader title="Priority Score" action={<RuleRoundedIcon color="primary" />} />
          <Typography variant="h1" sx={{ fontSize: '4rem', color: 'primary.main', lineHeight: 1 }}>
            {validation.priority.score}
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {weights.map(([label, value]) => (
              <Box key={label}>
                <Stack direction="row" sx={{ mb: 0.5, justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 760 }}>
                    {value}
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={value} sx={{ height: 8, borderRadius: 5 }} />
              </Box>
            ))}
          </Stack>
          <Stack spacing={0.75} sx={{ mt: 2.25 }}>
            {validation.priority.rationale.map((reason) => (
              <Typography key={reason} variant="body2" color="text.secondary">
                {reason}
              </Typography>
            ))}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  )
}
