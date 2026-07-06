import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import MapRoundedIcon from '@mui/icons-material/MapRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { Box, Grid, Paper, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, TextField, FormControlLabel, Switch, Alert, Chip } from '@mui/material'
import { useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import type { DashboardResponse, FulfillmentTask } from '../types'
import { optimizeFulfillment, sendFulfillmentUpdateEmail } from '../services/api'

const columns: Array<{ key: FulfillmentTask['stage']; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'completed', label: 'Completed' },
]

interface Props {
  dashboard: DashboardResponse
  onUpdateFulfillment: (task: FulfillmentTask) => void
}

export function Fulfillment({ dashboard, onUpdateFulfillment }: Props) {
  const [editingTask, setEditingTask] = useState<FulfillmentTask | null>(null)
  const [stage, setStage] = useState<FulfillmentTask['stage']>('pending')
  const [owner, setOwner] = useState('')
  const [risk, setRisk] = useState<FulfillmentTask['risk']>('low')
  const [committedDate, setCommittedDate] = useState('')
  const [qcPassed, setQcPassed] = useState(true)
  const [optimizedRoute, setOptimizedRoute] = useState('')
  const [optimizing, setOptimizing] = useState(false)
  const [optMessage, setOptMessage] = useState<string | null>(null)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  function handleOpenEdit(task: FulfillmentTask) {
    setEditingTask(task)
    setStage(task.stage)
    setOwner(task.owner)
    setRisk(task.risk)
    setCommittedDate(task.committed_date)
    setQcPassed(task.qc_passed ?? true)
    setOptimizedRoute(task.optimized_route ?? 'Standard Ground Route')
  }

  function handleSave() {
    if (!editingTask) return
    onUpdateFulfillment({
      ...editingTask,
      stage,
      owner,
      risk,
      committed_date: committedDate,
      qc_passed: qcPassed,
      optimized_route: optimizedRoute,
    })
    // Open email notification dialog
    setCustomerEmail(`ops@${editingTask.customer_name.toLowerCase().replace(/\s+/g, '')}.com`)
    setEmailDialogOpen(true)
  }

  async function handleSendEmailNotification() {
    if (!editingTask || !customerEmail) return
    setSendingEmail(true)
    setEmailStatus(null)
    try {
      const res = await sendFulfillmentUpdateEmail({
        customer_email: customerEmail,
        customer_name: editingTask.customer_name,
        po_number: editingTask.po_number,
        stage: stage,
        owner: owner,
        committed_date: committedDate,
        risk: risk,
        optimized_route: optimizedRoute,
      })
      setEmailStatus(res.status === 'sent' ? 'Notification sent!' : `Status: ${res.message}`)
      if (res.status === 'sent' || res.status === 'skipped') {
        setTimeout(() => { setEmailDialogOpen(false); setEmailStatus(null) }, 1500)
      }
    } catch (err: any) {
      setEmailStatus(`Error: ${err.message || err}`)
    } finally {
      setSendingEmail(false)
    }
  }

  async function handleOptimizeRoutes() {
    setOptimizing(true)
    setOptMessage(null)
    try {
      const res = await optimizeFulfillment()
      setOptMessage(res.message)
      if (dashboard.fulfillment.length > 0) {
        onUpdateFulfillment({
          ...dashboard.fulfillment[0],
          optimized_route: 'Optimized via GPS Matrix (Shortest Path)',
        })
      }
      setTimeout(() => setOptMessage(null), 3000)
    } catch (err: any) {
      setOptMessage(`Optimization error: ${err.message || err}`)
    } finally {
      setOptimizing(false)
    }
  }

  return (
    <Paper sx={{ p: 2.25 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <SectionHeader title="Fulfillment Scheduling & Dispatch Board" action={<LocalShippingRoundedIcon color="primary" />} />
        <Button
          variant="outlined"
          startIcon={<MapRoundedIcon />}
          onClick={handleOptimizeRoutes}
          disabled={optimizing}
          size="small"
        >
          {optimizing ? 'Optimizing Routes...' : 'Optimize Dispatch Routes'}
        </Button>
      </Box>

      {optMessage && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {optMessage}
        </Alert>
      )}

      <Grid container spacing={2}>
        {columns.map((column) => {
          const tasks = dashboard.fulfillment.filter((task) => task.stage === column.key)
          return (
            <Grid key={column.key} size={{ xs: 12, md: 6, xl: 3 }}>
              <Box sx={{ minHeight: 380, p: 1.5, borderRadius: 2, bgcolor: '#f4f7f4', border: '1px solid rgba(36,95,90,0.1)' }}>
                <Stack direction="row" sx={{ mb: 1.5, justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 760 }}>{column.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tasks.length}
                  </Typography>
                </Stack>
                <Stack spacing={1.25}>
                  {tasks.map((task) => (
                    <Paper
                      key={task.order_id}
                      onClick={() => handleOpenEdit(task)}
                      sx={{
                        p: 1.5,
                        boxShadow: 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.1s, box-shadow 0.1s',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: 2,
                        },
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ fontWeight: 760 }}>{task.po_number}</Typography>
                          <StatusChip value={task.risk} />
                        </Stack>
                        <Typography variant="body2">{task.customer_name}</Typography>
                        
                        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center', mt: 0.5 }}>
                          {task.qc_passed ? (
                            <Chip
                              label="QC PASSED"
                              size="small"
                              color="success"
                              icon={<CheckCircleRoundedIcon />}
                              sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }}
                            />
                          ) : (
                            <Chip
                              label="QC PENDING"
                              size="small"
                              color="warning"
                              sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }}
                            />
                          )}
                          <Chip
                            label={task.optimized_route || 'Standard Route'}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.62rem' }}
                          />
                        </Stack>

                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Owner: {task.owner} | Due: {task.committed_date}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </Grid>
          )
        })}
      </Grid>

      {/* Editing Dialog */}
      <Dialog open={Boolean(editingTask) && !emailDialogOpen} onClose={() => setEditingTask(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 760 }}>Edit Dispatch Task - {editingTask?.po_number}</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Stack spacing={2.5} sx={{ pt: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              Customer: {editingTask?.customer_name}
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel id="stage-select-label">Stage</InputLabel>
              <Select
                labelId="stage-select-label"
                value={stage}
                label="Stage"
                onChange={(e) => setStage(e.target.value as FulfillmentTask['stage'])}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="risk-select-label">Risk</InputLabel>
              <Select
                labelId="risk-select-label"
                value={risk}
                label="Risk"
                onChange={(e) => setRisk(e.target.value as FulfillmentTask['risk'])}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Owner / Logistics Dispatcher"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              fullWidth
              size="small"
            />

            <TextField
              label="Committed Delivery Date"
              type="date"
              value={committedDate}
              onChange={(e) => setCommittedDate(e.target.value)}
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              label="Optimized Route Details (UC-10)"
              value={optimizedRoute}
              onChange={(e) => setOptimizedRoute(e.target.value)}
              fullWidth
              size="small"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={qcPassed}
                  onChange={(e) => setQcPassed(e.target.checked)}
                />
              }
              label="Quality Control Checklist Cleared (UC-09)"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.25 }}>
          <Button onClick={() => setEditingTask(null)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save & Notify</Button>
        </DialogActions>
      </Dialog>

      {/* Email Notification Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => { setEmailDialogOpen(false); setEmailStatus(null) }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Send Fulfillment Update via Email</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Send fulfillment status update for <strong>{editingTask?.po_number}</strong> to the customer.
            </Typography>
            <TextField
              fullWidth
              label="Customer Email Address"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
            {emailStatus && (
              <Alert severity={emailStatus.includes('Error') ? 'error' : 'success'} sx={{ borderRadius: 2 }}>
                {emailStatus}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.25 }}>
          <Button onClick={() => { setEmailDialogOpen(false); setEmailStatus(null); setEditingTask(null) }}>Skip</Button>
          <Button onClick={handleSendEmailNotification} variant="contained" disabled={sendingEmail || !customerEmail}>
            {sendingEmail ? 'Sending...' : 'Send Email Notification'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}