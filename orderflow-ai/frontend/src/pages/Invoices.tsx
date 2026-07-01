import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import { Box, Button, Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import { currency } from '../services/format'
import type { DashboardResponse, PipelineRun, Invoice } from '../types'

type Props = {
  dashboard: DashboardResponse
  pipeline: PipelineRun | null
  onUpdateInvoice: (invoice: Invoice) => void
}

export function Invoices({ dashboard, pipeline, onUpdateInvoice }: Props) {
  const latest = pipeline?.invoice_validation.invoice
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const currentInvoice = selectedInvoice || latest || dashboard.invoices[0] || null

  const allInvoices = [...(latest ? [latest] : []), ...dashboard.invoices]

  function handleSend() {
    if (!currentInvoice) return
    const updated = { ...currentInvoice, status: 'sent' as const }
    onUpdateInvoice(updated)
    setSelectedInvoice(updated)
  }

  function handleDownload() {
    if (!currentInvoice) return
    const text = `INVOICE: ${currentInvoice.invoice_no}
========================================
Customer:     ${currentInvoice.customer_name}
Invoice Date: ${currentInvoice.invoice_date}
Due Date:     ${currentInvoice.due_date}
Status:       ${currentInvoice.status.toUpperCase()}
----------------------------------------
Subtotal:     ${currency(currentInvoice.subtotal)}
Tax:          ${currency(currentInvoice.tax)}
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
          <SectionHeader title="Invoices" action={<ReceiptLongRoundedIcon color="primary" />} />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Invoice</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Due</TableCell>
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
                  <TableCell>{invoice.due_date}</TableCell>
                  <TableCell>
                    <StatusChip value={invoice.status} />
                  </TableCell>
                  <TableCell align="right">{currency(invoice.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Paper sx={{ p: 2.25, minHeight: 390 }}>
          <SectionHeader title={currentInvoice ? currentInvoice.invoice_no : 'Invoice Preview'} />
          {currentInvoice ? (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Customer
                </Typography>
                <Typography variant="h2">{currentInvoice.customer_name}</Typography>
              </Box>
              <Grid container spacing={1.5}>
                <Grid size={4}>
                  <Typography variant="caption" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography sx={{ fontWeight: 760 }}>{currency(currentInvoice.subtotal)}</Typography>
                </Grid>
                <Grid size={4}>
                  <Typography variant="caption" color="text.secondary">
                    Tax
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
              <Box sx={{ p: 1.5, border: '1px dashed rgba(36,95,90,0.2)', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Invoice Date: {currentInvoice.invoice_date} | Due Date: {currentInvoice.due_date}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5}>
                <Button
                  startIcon={<MarkEmailReadRoundedIcon />}
                  variant="contained"
                  onClick={handleSend}
                  disabled={currentInvoice.status === 'sent' || currentInvoice.status === 'paid'}
                >
                  {currentInvoice.status === 'sent' ? 'Sent' : currentInvoice.status === 'paid' ? 'Paid' : 'Send'}
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
    </Grid>
  )
}
