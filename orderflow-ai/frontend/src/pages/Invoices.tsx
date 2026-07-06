import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import GavelRoundedIcon from '@mui/icons-material/GavelRounded'
import { Box, Button, Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, Chip, Alert, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import { useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import { currency } from '../services/format'
import type { DashboardResponse, PipelineRun, Invoice } from '../types'
import { disputeInvoice, sendInvoiceEmail } from '../services/api'

type Props = {
  dashboard: DashboardResponse
  pipeline: PipelineRun | null
  onUpdateInvoice: (invoice: Invoice) => void
  onRefresh: () => Promise<void>
}

export function Invoices({ dashboard, pipeline, onUpdateInvoice, onRefresh }: Props) {
  const latest = pipeline?.invoice_validation.invoice
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [triaging, setTriaging] = useState(false)
  const [disputeActions, setDisputeActions] = useState<string[]>([])

  const currentInvoice = selectedInvoice || latest || dashboard.invoices[0] || null

  const allInvoices = latest
    ? [latest, ...dashboard.invoices.filter((inv) => inv.invoice_no !== latest.invoice_no)]
    : dashboard.invoices

  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')
  const [sendEmailStatus, setSendEmailStatus] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  function handleSendClick() {
    if (!currentInvoice) return
    setCustomerEmail(`accounts.payable@${currentInvoice.customer_name.toLowerCase().replace(/\s+/g, '')}.com`)
    setSendEmailDialogOpen(true)
  }

  async function handleSendWithEmail() {
    if (!currentInvoice || !customerEmail) return
    setSendingEmail(true)
    setSendEmailStatus(null)
    try {
      const res = await sendInvoiceEmail({
        customer_email: customerEmail,
        customer_name: currentInvoice.customer_name,
        invoice_no: currentInvoice.invoice_no,
        po_number: currentInvoice.po_number,
        invoice_date: currentInvoice.invoice_date,
        due_date: currentInvoice.due_date,
        subtotal: currentInvoice.subtotal,
        tax: currentInvoice.tax,
        total: currentInvoice.total,
        lines: currentInvoice.lines.map(l => ({
          sku: l.sku,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          amount: l.amount,
        })),
      })
      if (res.status === 'sent' || res.status === 'skipped') {
        const updated = { ...currentInvoice, status: 'sent' as const }
        onUpdateInvoice(updated)
        setSelectedInvoice(updated)
        setSendEmailDialogOpen(false)
        setSendEmailStatus(null)
      } else {
        setSendEmailStatus(`Email issue: ${res.message}`)
      }
    } catch (err: any) {
      setSendEmailStatus(`Error: ${err.message || err}`)
    } finally {
      setSendingEmail(false)
    }
  }

  async function handleDisputeToggle() {
    if (!currentInvoice) return
    setTriaging(true)
    try {
      const nextDisputed = !currentInvoice.disputed
      const res = await disputeInvoice(currentInvoice.invoice_no, nextDisputed)
      await onRefresh()
      // Update local state copy to render instantly
      setSelectedInvoice({
        ...currentInvoice,
        disputed: nextDisputed,
        status: nextDisputed ? 'disputed' : 'validated'
      })
      if (nextDisputed && res.actions) {
        setDisputeActions(res.actions)
      } else {
        setDisputeActions([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setTriaging(false)
    }
  }

  function handleDownload() {
    if (!currentInvoice) return
    const text = `INVOICE: ${currentInvoice.invoice_no}
========================================
Customer:     ${currentInvoice.customer_name}
Invoice Date: ${currentInvoice.invoice_date}
Due Date:     ${currentInvoice.due_date}
Status:       ${currentInvoice.status.toUpperCase()}
Billing Type: ${currentInvoice.billing_type === 'recurring' ? 'Recurring Monthly' : 'One-Time'}
----------------------------------------
Subtotal:     ${currency(currentInvoice.subtotal)}
Tax (TX 8.25%): ${currency(currentInvoice.tax)}
Total Amount: ${currency(currentInvoice.total)}
========================================`
    
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${currentInvoice.invoice_no}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, lg: 7 }}>
        <Paper sx={{ p: 2.25 }}>
          <SectionHeader title="Billing & Invoices Registry" action={<ReceiptLongRoundedIcon color="primary" />} />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Invoice ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Billing Type</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allInvoices.map((invoice) => (
                <TableRow
                  key={invoice.invoice_no}
                  hover
                  selected={currentInvoice?.invoice_no === invoice.invoice_no}
                  onClick={() => setSelectedInvoice(invoice)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ fontWeight: 760 }}>{invoice.invoice_no}</TableCell>
                  <TableCell>{invoice.customer_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.billing_type === 'recurring' ? 'RECURRING' : 'ONE-TIME'}
                      size="small"
                      variant="outlined"
                      sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell>{invoice.due_date}</TableCell>
                  <TableCell>
                    <StatusChip value={invoice.status} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {currency(invoice.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Paper sx={{ p: 2.25, minHeight: 410 }}>
          <SectionHeader title={currentInvoice ? currentInvoice.invoice_no : 'Invoice Preview'} />
          {currentInvoice ? (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Customer
                </Typography>
                <Typography variant="h2">{currentInvoice.customer_name}</Typography>
              </Box>

              {currentInvoice.disputed && (
                <Alert severity="error" icon={<WarningAmberRoundedIcon />} sx={{ borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Disputed Invoice (UC-20)</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>Triaged for validation corrections.</Typography>
                  {disputeActions.length > 0 && (
                    <Box sx={{ mt: 1, pl: 1.5, borderLeft: '2px solid rgba(211,47,47,0.3)' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>Triage Action Items:</Typography>
                      {disputeActions.map((act, i) => (
                        <Typography key={i} variant="caption" sx={{ display: 'block' }}>• {act}</Typography>
                      ))}
                    </Box>
                  )}
                </Alert>
              )}

              <Grid container spacing={1.5}>
                <Grid size={4}>
                  <Typography variant="caption" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography sx={{ fontWeight: 760 }}>{currency(currentInvoice.subtotal)}</Typography>
                </Grid>
                <Grid size={4}>
                  <Typography variant="caption" color="text.secondary">
                    Tax (TX 8.25%)
                  </Typography>
                  <Typography sx={{ fontWeight: 760 }}>{currency(currentInvoice.tax)}</Typography>
                </Grid>
                <Grid size={4}>
                  <Typography variant="caption" color="text.secondary">
                    Total
                  </Typography>
                  <Typography sx={{ fontWeight: 760 }}>{currency(currentInvoice.total)}</Typography>
                </Grid>
              </Grid>

              <Box sx={{ p: 1.5, border: '1px dashed rgba(36,95,90,0.2)', borderRadius: 1.5, bgcolor: 'rgba(36,95,90,0.02)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  <strong>Billing Type:</strong> {currentInvoice.billing_type === 'recurring' ? 'Recurring Monthly Subscription (UC-14)' : 'One-Time Delivery Order'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  <strong>Tax compliance:</strong> Texas regional sales tax calculated at rate 8.25% (UC-15)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Invoice Date: {currentInvoice.invoice_date} | Due Date: {currentInvoice.due_date}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5}>
                <Button
                  startIcon={<MarkEmailReadRoundedIcon />}
                  variant="contained"
                  onClick={handleSendClick}
                  disabled={currentInvoice.status === 'sent' || currentInvoice.status === 'paid' || currentInvoice.status === 'disputed'}
                >
                  {currentInvoice.status === 'sent' ? 'Sent' : currentInvoice.status === 'paid' ? 'Paid' : 'Send'}
                </Button>

                <Button
                  startIcon={<GavelRoundedIcon />}
                  variant="outlined"
                  color={currentInvoice.disputed ? 'success' : 'error'}
                  onClick={handleDisputeToggle}
                  disabled={triaging}
                >
                  {currentInvoice.disputed ? 'Resolve Dispute' : 'Dispute Invoice'}
                </Button>

                <Button startIcon={<DownloadRoundedIcon />} variant="outlined" onClick={handleDownload}>
                  Download
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Box sx={{ minHeight: 280, display: 'grid', placeItems: 'center' }}>
              <Typography color="text.secondary">No invoices available.</Typography>
            </Box>
          )}
        </Paper>
      </Grid>

      {/* Send Invoice Email Dialog */}
      <Dialog open={sendEmailDialogOpen} onClose={() => { setSendEmailDialogOpen(false); setSendEmailStatus(null) }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Send Invoice via Email</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Send invoice <strong>{currentInvoice?.invoice_no}</strong> to the customer's accounts payable email.
            </Typography>
            <TextField
              fullWidth
              label="Customer Email Address"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
            {sendEmailStatus && (
              <Alert severity={sendEmailStatus.includes('Error') ? 'error' : 'success'} sx={{ borderRadius: 2 }}>
                {sendEmailStatus}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.25 }}>
          <Button onClick={() => { setSendEmailDialogOpen(false); setSendEmailStatus(null) }}>Cancel</Button>
          <Button onClick={handleSendWithEmail} variant="contained" disabled={sendingEmail || !customerEmail}>
            {sendingEmail ? 'Sending...' : 'Send Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
