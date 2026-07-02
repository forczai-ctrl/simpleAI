import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import NotificationImportantRoundedIcon from '@mui/icons-material/NotificationImportantRounded'
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { getExceptions, resolveException } from '../services/api'
import type { ExceptionItem } from '../types'

export function ExceptionManagement() {
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getExceptions()
      setExceptions(data)
      setError(null)
    } catch (err: any) {
      setError('Failed to fetch platform operational exceptions registry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleResolve = async (id: string) => {
    try {
      const res = await resolveException(id)
      if (res.status === 'success') {
        setSuccessMsg(`Exception ${id} resolved and dismissed successfully.`)
        loadData()
        setTimeout(() => setSuccessMsg(null), 3500)
      } else {
        setError('Failed to resolve exception.')
      }
    } catch (err) {
      setError('Failed to dispatch exception resolution pipeline.')
    }
  }

  const openCount = exceptions.filter((e) => e.status === 'open').length
  const criticalCount = exceptions.filter((e) => e.status === 'open' && e.severity === 'high').length

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Exception Management Control
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor, prioritize, and dismiss automated O2C validation or billing warnings
          </Typography>
        </Box>
        <Button startIcon={<RefreshRoundedIcon />} onClick={loadData} disabled={loading} variant="outlined">
          Refresh Issues
        </Button>
      </Box>

      {/* Top Cards */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: openCount > 0 ? 'rgba(184,121,25,0.08)' : '#f4f7f4', border: openCount > 0 ? '1px solid rgba(184,121,25,0.2)' : 'none' }}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Active Exceptions
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5, color: openCount > 0 ? 'warning.main' : 'text.primary' }}>
                    {openCount}
                  </Typography>
                </Box>
                <NotificationImportantRoundedIcon sx={{ fontSize: 44, color: openCount > 0 ? 'warning.main' : 'text.secondary', opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: criticalCount > 0 ? 'rgba(198,40,40,0.08)' : '#f4f7f4', border: criticalCount > 0 ? '1px solid rgba(198,40,40,0.2)' : 'none' }}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Critical Severity Items
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5, color: criticalCount > 0 ? 'error.main' : 'text.primary' }}>
                    {criticalCount}
                  </Typography>
                </Box>
                <ErrorOutlineRoundedIcon sx={{ fontSize: 44, color: criticalCount > 0 ? 'error.main' : 'text.secondary', opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: '#f4f7f4' }}>
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Resolved Logs
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                    {exceptions.filter((e) => e.status === 'resolved').length}
                  </Typography>
                </Box>
                <CheckCircleOutlineRoundedIcon sx={{ fontSize: 44, color: 'success.main', opacity: 0.6 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {successMsg && <Alert severity="success">{successMsg}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      <Paper sx={{ p: 2.25 }}>
        <SectionHeader title="Operational Discrepancy Queue" />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Issue ID</TableCell>
                <TableCell>Category Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Assignee / Owner</TableCell>
                <TableCell>Reference ID</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center" sx={{ width: 140 }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exceptions.map((exc) => {
                let sevColor: 'error' | 'warning' | 'info' = 'info'
                if (exc.severity === 'high') sevColor = 'error'
                else if (exc.severity === 'medium') sevColor = 'warning'

                const isResolved = exc.status === 'resolved'

                return (
                  <TableRow key={exc.id} hover sx={{ opacity: isResolved ? 0.6 : 1 }}>
                    <TableCell sx={{ fontWeight: 760, color: 'primary.main' }}>{exc.id}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{exc.type}</TableCell>
                    <TableCell>
                      <Chip
                        label={exc.severity.toUpperCase()}
                        size="small"
                        color={sevColor}
                        sx={{ fontWeight: 700, fontSize: '0.62rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{exc.owner}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      {exc.invoice_id || exc.order_id || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                      {exc.detail}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={exc.status.toUpperCase()}
                        size="small"
                        color={isResolved ? 'success' : 'warning'}
                        variant={isResolved ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {!isResolved ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleResolve(exc.id)}
                          sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                          Resolve
                        </Button>
                      ) : (
                        <Button size="small" disabled sx={{ textTransform: 'none' }}>
                          Resolved
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  )
}
