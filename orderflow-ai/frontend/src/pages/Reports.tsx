import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import { Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, Box } from '@mui/material'
import { useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import type { UseCase } from '../types'

function getUseCaseSpec(_id: string, name: string) {
  return {
    description: `${name} - Use case details will be loaded dynamically from the backend.`,
    approach: 'This use case is part of the OrderFlow AI agentic workflow.',
    value: 'Contributes to automated order-to-cash operations.',
    outcomes: 'Automated processing and orchestration.',
  }
}

export function Reports({ useCases }: { useCases: UseCase[] }) {
  const implemented = useCases.filter((item) => item.status === 'implemented').length
  const phaseOne = useCases.filter((item) => item.phase === '1')
  
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null)
  const currentUseCase = selectedUseCase || useCases[0] || null
  const spec = currentUseCase ? getUseCaseSpec(currentUseCase.id, currentUseCase.name) : null

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, lg: 7 }}>
        <Paper sx={{ p: 2.25 }}>
          <SectionHeader title="Use Case Coverage" action={<InsightsRoundedIcon color="primary" />} />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Use Case</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Phase</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {useCases.map((useCase) => (
                <TableRow
                  key={useCase.id}
                  hover
                  selected={currentUseCase?.id === useCase.id}
                  onClick={() => setSelectedUseCase(useCase)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ fontWeight: 760 }}>{useCase.id}</TableCell>
                  <TableCell>{useCase.name}</TableCell>
                  <TableCell>{useCase.phase}</TableCell>
                  <TableCell>
                    <StatusChip value={useCase.status === 'implemented' ? 'pass' : 'pending'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Stack spacing={2.5}>
          {currentUseCase && spec ? (
            <Paper sx={{ p: 2.25 }}>
              <SectionHeader title={`${currentUseCase.id} Details`} action={<StatusChip value={currentUseCase.status === 'implemented' ? 'pass' : 'pending'} />} />
              <Stack spacing={2.25} sx={{ mt: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    USE CASE NAME
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 760, mt: 0.25 }}>
                    {currentUseCase.name}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    PROBLEM STATEMENT & DESCRIPTION
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {spec.description}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    TECHNICAL AGENTIC APPROACH
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, p: 1.25, borderRadius: 1, bgcolor: '#f4f7f4', borderLeft: '3px solid #245f5a' }}>
                    {spec.approach}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    BUSINESS VALUE
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {spec.value}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    DESIRED OUTCOME
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700, color: 'primary.main' }}>
                    {spec.outcomes}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          ) : null}

          <Paper sx={{ p: 2.25 }}>
            <Typography color="text.secondary" variant="body2">
              Implemented
            </Typography>
            <Typography variant="h1" sx={{ fontSize: '3.5rem', color: 'primary.main' }}>
              {implemented}/{useCases.length}
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 2.25 }}>
            <Typography variant="h2" sx={{ mb: 1.5 }}>
              Phase 1 Use Cases
            </Typography>
            <Stack spacing={1}>
              {phaseOne.map((item) => (
                <Stack key={item.id} direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2">{item.id}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 760 }}>
                    {item.name}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </Grid>
    </Grid>
  )
}
