import AddRoundedIcon from '@mui/icons-material/AddRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded'
import SyncRoundedIcon from '@mui/icons-material/SyncRounded'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import { Box, Button, Chip, Divider, Drawer, Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material'
import { useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import { currency, orderTotal } from '../services/format'
import type { Order, PipelineRun } from '../types'
import { sendOrderAckEmail, sendOrderRegistryEmail } from '../services/api'

type Props = {
  orders: Order[]
  rawText: string
  pipeline: PipelineRun | null
  loading: boolean
  onRawTextChange: (value: string) => void
  onRunPipeline: () => void
  onSyncGmailOrders: () => void
  onUploadFile: (file: File) => Promise<void>
}

export function Orders({ orders, rawText, pipeline, loading, onRawTextChange, onRunPipeline, onSyncGmailOrders, onUploadFile }: Props) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null)
  const [intakeDrawerOpen, setIntakeDrawerOpen] = useState(false)
  const [ackEmailDialogOpen, setAckEmailDialogOpen] = useState(false)
  const [registryEmailDialogOpen, setRegistryEmailDialogOpen] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order)
  }

  const handleRunIntake = async () => {
    await onRunPipeline()
    setIntakeDrawerOpen(false)
  }

  async function handleSendOrderAck() {
    if (!displayOrder || !customerEmail) return
    setSendingEmail(true)
    setEmailStatus(null)
    try {
      const res = await sendOrderAckEmail({
        customer_email: customerEmail,
        customer_name: displayOrder.customer_name,
        po_number: displayOrder.po_number,
        items: displayOrder.items.map(i => ({
          sku: i.sku,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        delivery_date: displayOrder.delivery_date,
        payment_terms: displayOrder.payment_terms,
        total_amount: displayOrder.total_amount ?? displayOrder.items.reduce((s, i) => s + i.quantity * i.unit_price, 0),
      })
      setEmailStatus(res.status === 'sent' ? 'Acknowledgement sent!' : `Status: ${res.message}`)
      if (res.status === 'sent' || res.status === 'skipped') {
        setTimeout(() => { setAckEmailDialogOpen(false); setEmailStatus(null) }, 1500)
      }
    } catch (err: any) {
      setEmailStatus(`Error: ${err.message || err}`)
    } finally {
      setSendingEmail(false)
    }
  }

  async function handleSendRegistryNotification() {
    if (!displayOrder || !customerEmail) return
    setSendingEmail(true)
    setEmailStatus(null)
    try {
      const total = displayOrder.total_amount ?? displayOrder.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
      const res = await sendOrderRegistryEmail({
        customer_email: customerEmail,
        customer_name: displayOrder.customer_name,
        po_number: displayOrder.po_number,
        status: displayOrder.status,
        total_amount: total,
        item_count: displayOrder.items.length,
      })
      setEmailStatus(res.status === 'sent' ? 'Notification sent!' : `Status: ${res.message}`)
      if (res.status === 'sent' || res.status === 'skipped') {
        setTimeout(() => { setRegistryEmailDialogOpen(false); setEmailStatus(null) }, 1500)
      }
    } catch (err: any) {
      setEmailStatus(`Error: ${err.message || err}`)
    } finally {
      setSendingEmail(false)
    }
  }

  // Update selected order if pipeline changes
  const displayOrder = pipeline?.extraction && pipeline.extraction.po_number === selectedOrder?.po_number
    ? pipeline.extraction
    : selectedOrder

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Order Registry
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Process, extract, and prioritize incoming customer purchase orders
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            startIcon={<SyncRoundedIcon />}
            variant="outlined"
            onClick={onSyncGmailOrders}
            disabled={loading}
            sx={{ py: 1, px: 2, borderRadius: 2 }}
          >
            Sync Gmail Orders
          </Button>
          <Button
            startIcon={<AddRoundedIcon />}
            variant="contained"
            onClick={() => setIntakeDrawerOpen(true)}
            sx={{ py: 1, px: 2.25, borderRadius: 2 }}
          >
            AI Order Intake
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={2.5}>
        {/* Orders Table */}
        <Grid size={{ xs: 12, lg: displayOrder ? 7 : 12 }}>
          <Paper sx={{ p: 2.25 }}>
            <SectionHeader title="Purchase Orders" action={<Chip label={`${orders.length} total`} size="small" />} />
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>PO Number</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Delivery</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => {
                    const isSelected = selectedOrder?.po_number === order.po_number
                    return (
                      <TableRow
                        key={order.po_number}
                        hover
                        selected={isSelected}
                        onClick={() => handleSelectOrder(order)}
                        sx={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                      >
                        <TableCell sx={{ fontWeight: 760, color: 'primary.main' }}>
                          {order.po_number}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {order.customer_name}
                          </Typography>
                        </TableCell>
                        <TableCell>{order.delivery_date}</TableCell>
                        <TableCell>
                          <Chip label={order.ship_to_region} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell>
                          <StatusChip value={order.status} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {currency(orderTotal(order))}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Selected Order Details */}
        {displayOrder && (
          <Grid size={{ xs: 12, lg: 5 }}>
            <Paper sx={{ p: 2.5, position: 'relative' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {displayOrder.po_number}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Intake Channel: {displayOrder.channel.toUpperCase()}
                  </Typography>
                </Box>
                <StatusChip value={displayOrder.status} />
              </Box>

              <Divider sx={{ mb: 2.25 }} />

              <Stack spacing={2.25}>
                {/* Customer Account Info */}
                <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: '#f4f7f4' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                    Customer Account: {displayOrder.customer_name}
                  </Typography>
                  <Grid container spacing={1.5}>
                    {[
                      ['Tier', displayOrder.customer_tier.toUpperCase()],
                      ['Credit Limit', currency(displayOrder.credit_limit)],
                      ['Current Balance', currency(displayOrder.current_balance)],
                    ].map(([label, value]) => (
                      <Grid key={label} size={{ xs: 4 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {label}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 760 }}>
                          {value}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                {/* Terms and region */}
                <Grid container spacing={1.5}>
                  {[
                    ['Delivery Date', displayOrder.delivery_date],
                    ['Payment Terms', displayOrder.payment_terms],
                    ['Ship-To Region', displayOrder.ship_to_region],
                    ['Total Order Value', currency(orderTotal(displayOrder))],
                  ].map(([label, value]) => (
                    <Grid key={label} size={{ xs: 6 }}>
                      <Box sx={{ p: 1.3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="caption" color="text.secondary">
                          {label}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 760 }}>
                          {value}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* Items list */}
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 1 }}>
                  Line Items
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayOrder.items.map((item) => (
                      <TableRow key={item.sku}>
                        <TableCell sx={{ fontWeight: 760 }}>{item.sku}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{currency(item.unit_price)}</TableCell>
                        <TableCell align="right">{currency(item.quantity * item.unit_price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Email Notification Buttons */}
                <Stack direction="row" spacing={1.5}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<EmailRoundedIcon />}
                    onClick={() => {
                      setCustomerEmail(`orders@${displayOrder.customer_name.toLowerCase().replace(/\s+/g, '')}.com`)
                      setAckEmailDialogOpen(true)
                    }}
                  >
                    Send Order Ack
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EmailRoundedIcon />}
                    onClick={() => {
                      setCustomerEmail(`ops@${displayOrder.customer_name.toLowerCase().replace(/\s+/g, '')}.com`)
                      setRegistryEmailDialogOpen(true)
                    }}
                  >
                    Registry Notify
                  </Button>
                </Stack>

                {/* Acknowledgement Preview if from pipeline */}
                {pipeline && pipeline.extraction.po_number === displayOrder.po_number && (
                  <Box sx={{ p: 1.6, borderRadius: 2, bgcolor: 'rgba(36,95,90,0.08)', border: '1px solid rgba(36,95,90,0.18)' }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 0.75, alignItems: 'center' }}>
                      <SendRoundedIcon color="primary" fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: 760 }}>
                        Auto-Ack: {pipeline.acknowledgement.subject}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'pre-line' }}>
                      {pipeline.acknowledgement.body}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Send Order Acknowledgement Email Dialog */}
      <Dialog open={ackEmailDialogOpen} onClose={() => { setAckEmailDialogOpen(false); setEmailStatus(null) }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Send Order Acknowledgement</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Send order acknowledgement for <strong>{displayOrder?.po_number}</strong> to the customer.
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
          <Button onClick={() => { setAckEmailDialogOpen(false); setEmailStatus(null) }}>Cancel</Button>
          <Button onClick={handleSendOrderAck} variant="contained" disabled={sendingEmail || !customerEmail}>
            {sendingEmail ? 'Sending...' : 'Send Acknowledgement'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Order Registry Notification Email Dialog */}
      <Dialog open={registryEmailDialogOpen} onClose={() => { setRegistryEmailDialogOpen(false); setEmailStatus(null) }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Send Order Registry Notification</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Send registry notification for <strong>{displayOrder?.po_number}</strong> to the operations team.
            </Typography>
            <TextField
              fullWidth
              label="Recipient Email Address"
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
          <Button onClick={() => { setRegistryEmailDialogOpen(false); setEmailStatus(null) }}>Cancel</Button>
          <Button onClick={handleSendRegistryNotification} variant="contained" disabled={sendingEmail || !customerEmail}>
            {sendingEmail ? 'Sending...' : 'Send Notification'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Extraction Drawer */}
      <Drawer
        anchor="right"
        open={intakeDrawerOpen}
        onClose={() => setIntakeDrawerOpen(false)}
      >
        <Box sx={{ width: { xs: '100vw', sm: 520 }, p: 3.5 }}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                <ShoppingBagRoundedIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  AI Order Intake
                </Typography>
              </Stack>
              <Button onClick={() => setIntakeDrawerOpen(false)} sx={{ minWidth: 40, p: 1 }}>
                <CloseRoundedIcon />
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Upload files or paste text representing purchase orders to run the O2C automation pipeline.
            </Typography>

            <Box sx={{ p: 2, border: '2px dashed rgba(36,95,90,0.3)', borderRadius: 2, textAlign: 'center', bgcolor: 'rgba(36,95,90,0.02)' }}>
              <UploadFileRoundedIcon sx={{ fontSize: 32, color: 'primary.main', mb: 0.5 }} />
              <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600 }}>
                Upload PO Document (PDF, Excel, CSV)
              </Typography>
              <Button
                variant="outlined"
                component="label"
                size="small"
                disabled={loading}
              >
                Choose File
                <input
                  type="file"
                  hidden
                  accept=".pdf,.xlsx,.xls,.csv,.txt"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      await onUploadFile(file)
                      setIntakeDrawerOpen(false)
                    }
                  }}
                />
              </Button>
            </Box>

            <Divider>
              <Typography variant="caption" color="text.secondary">OR PASTE TEXT</Typography>
            </Divider>

            <TextField
              multiline
              minRows={12}
              value={rawText}
              onChange={(event) => onRawTextChange(event.target.value)}
              fullWidth
              placeholder="Paste PO text here..."
              variant="outlined"
              sx={{ fontFamily: 'monospace' }}
            />

            <Button
              startIcon={<AutoFixHighRoundedIcon />}
              variant="contained"
              onClick={handleRunIntake}
              disabled={loading}
              fullWidth
              sx={{ py: 1.5, borderRadius: 2 }}
            >
              {loading ? 'Analyzing with AI...' : 'Extract & Run Pipeline'}
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </Stack>
  )
}
