import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded'
import { Box, Grid, Paper, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material'
import { useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import type { DashboardResponse, FulfillmentTask } from '../types'

const columns: Array<{ key: FulfillmentTask['stage']; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'completed', label: 'Completed' },
]

export function Fulfillment({ dashboard, onUpdateFulfillment }: { dashboard: DashboardResponse; onUpdateFulfillment: (task: FulfillmentTask) => void }) {
  const [editingTask, setEditingTask] = useState<FulfillmentTask | null>(null)
  const [stage, setStage] = useState<FulfillmentTask['stage']>('pending')
  const [owner, setOwner] = useState('')
  const [risk, setRisk] = useState<FulfillmentTask['risk']>('low')
  const [committedDate, setCommittedDate] = useState('')

  function handleOpenEdit(task: FulfillmentTask) {
    setEditingTask(task)
    setStage(task.stage)
    setOwner(task.owner)
    setRisk(task.risk)
    setCommittedDate(task.committed_date)
  }

  function handleSave() {
    if (!editingTask) return
    onUpdateFulfillment({
      ...editingTask,
      stage,
      owner,
      risk,
      committed_date: committedDate,
    })
    setEditingTask(null)
  }

  return (
    <Paper sx={{ p: 2.25 }}>
      <SectionHeader title="Fulfillment Board" action={<LocalShippingRoundedIcon color="primary" />} />
      <Grid container spacing={2}>
        {columns.map((column) => {
          const tasks = dashboard.fulfillment.filter((task) => task.stage === column.key)
          return (
            <Grid key={column.key} size={{ xs: 12, md: 6, xl: 3 }}>
              <Box sx={{ minHeight: 360, p: 1.5, borderRadius: 2, bgcolor: '#f4f7f4', border: '1px solid rgba(36,95,90,0.1)' }}>
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
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                          <Typography sx={{ fontWeight: 760 }}>{task.po_number}</Typography>
                          <StatusChip value={task.risk} />
                        </Stack>
                        <Typography variant="body2">{task.customer_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {task.owner} - {task.committed_date}
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
      <Dialog open={Boolean(editingTask)} onClose={() => setEditingTask(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 760 }}>Edit Fulfillment Task - {editingTask?.po_number}</DialogTitle>
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
              label="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              fullWidth
              size="small"
            />

            <TextField
              label="Committed Date"
              type="date"
              value={committedDate}
              onChange={(e) => setCommittedDate(e.target.value)}
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.25 }}>
          <Button onClick={() => setEditingTask(null)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
