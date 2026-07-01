import { Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ mb: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="h2">{title}</Typography>
      {action}
    </Stack>
  )
}
