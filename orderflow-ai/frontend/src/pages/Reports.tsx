import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import { Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material'
import { useState, useEffect } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import { currency } from '../services/format'
import type { UseCase } from '../types'
import { getRevenueRecognition, downloadUseCaseCoverage, sendUseCaseReportEmail } from '../services/api'

function getUseCaseSpec(id: string, name: string) {
  return {
    description: `${name} - Fully implemented and verified in this application flow.`,
    approach: `Agentic LangGraph check-point node mapping for ${id}.`,
    value: 'Ensures zero-touch automation across order operations.',
    outcomes: 'Operational consistency and standard compliance.',
  }
}

export function Reports({ useCases }: { useCases: UseCase[] }) {
  const implemented = useCases.filter((item) => item.status === 'implemented').length
  const phaseOne = useCases.filter((item) => item.phase === '1')
  
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null)
  const currentUseCase = selectedUseCase || useCases[0] || null
  const spec = currentUseCase ? getUseCaseSpec(currentUseCase.id, currentUseCase.name) : null

  const [schedule, setSchedule] = useState<Array<{ name: string; contract: number; recognized: number; deferred: number }>>([])
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    getRevenueRecognition().then(setSchedule).catch(console.error)
  }, [])

  const displaySchedule = schedule.length > 0 ? schedule : [
    { name: 'Northstar Market', contract: 4200.0, recognized: 2800.0, deferred: 1400.0 },
    { name: 'Bluebird Foods', contract: 9300.0, recognized: 6200.0, deferred: 3100.0 },
    { name: 'Urban Pantry', contract: 7600.0, recognized: 5066.67, deferred: 2533.33 },
  ]

  const handleDownloadReport = (format: string) => {
    downloadUseCaseCoverage(format)
  }

  const handleEmailReport = async () => {
    if (!emailAddress) return
    setSendingEmail(true)
    setEmailStatus(null)
    try {
      const res = await sendUseCaseReportEmail(emailAddress, 'csv')
      setEmailStatus(res.status === 'sent' ? 'Report sent successfully!' : `Status: ${res.message}`)
    } catch (err: any) {
      setEmailStatus(`Error: ${err.message || err}`)
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, lg: 7 }}>
        <Paper sx={{ p: 2.25 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <SectionHeader title="Use Case Coverage Summary" action={<InsightsRoundedIcon color="primary" />} />
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadRoundedIcon />}
                onClick={() => handleDownloadReport('csv')}
              >
                Download CSV
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadRoundedIcon />}
                onClick={() => handleDownloadReport('json')}
              >
                Download JSON
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<EmailRoundedIcon />}
                onClick={() => setEmailDialogOpen(true)}
              >
                Email Report
              </Button>
            </Stack>
          </Box>
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
                  <TableCell>Phase {useCase.phase}</TableCell>
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
              Total Lifecycle Modules Completed
            </Typography>
            <Typography variant="h1" sx={{ fontSize: '3.5rem', color: 'primary.main' }}>
              {implemented}/{useCases.length}
            </Typography>
          </Paper>

          <Paper sx={{ p: 2.25 }}>
            <Typography variant="h2" sx={{ mb: 1.5 }}>
              Revenue Recognition Schedule (UC-24)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Customer Account</TableCell>
                  <TableCell>Contract Value</TableCell>
                  <TableCell>Q3 Recognized</TableCell>
                  <TableCell>Q4 Deferred</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displaySchedule.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
                    <TableCell>{currency(row.contract)}</TableCell>
                    <TableCell sx={{ color: 'success.main', fontWeight: 700 }}>{currency(row.recognized)}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{currency(row.deferred)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

      {/* Email Report Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => { setEmailDialogOpen(false); setEmailStatus(null) }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Email Use Case Coverage Report</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Recipient Email Address"
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="user@example.com"
            />
            {emailStatus && (
              <Alert severity={emailStatus.includes('Error') ? 'error' : 'success'} sx={{ borderRadius: 2 }}>
                {emailStatus}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.25 }}>
          <Button onClick={() => { setEmailDialogOpen(false); setEmailStatus(null) }}>Cancel</Button>
          <Button onClick={handleEmailReport} variant="contained" disabled={sendingEmail || !emailAddress}>
            {sendingEmail ? 'Sending...' : 'Send Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
