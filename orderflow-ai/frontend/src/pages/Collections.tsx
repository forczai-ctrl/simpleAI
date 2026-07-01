import ForwardToInboxRoundedIcon from '@mui/icons-material/ForwardToInboxRounded'
import { Box, Button, Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import { currency } from '../services/format'
import type { CollectionReminder, DashboardResponse, Invoice } from '../types'

type Props = {
  dashboard: DashboardResponse
  reminder: CollectionReminder | null
  onGenerateReminder: (invoice: Invoice) => void
}

export function Collections({ dashboard, reminder, onGenerateReminder }: Props) {
  const overdue = dashboard.invoices.filter((invoice) => invoice.status === 'overdue')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const currentInvoice = selectedInvoice || overdue[0] || null

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, lg: 7 }}>
        <Paper sx={{ p: 2.25 }}>
          <SectionHeader
            title="Outstanding Accounts"
            action={
              <Button
                startIcon={<ForwardToInboxRoundedIcon />}
                variant="contained"
                disabled={!currentInvoice}
                onClick={() => currentInvoice && onGenerateReminder(currentInvoice)}
              >
                Generate Reminder
              </Button>
            }
          />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Invoice</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Due</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overdue.map((invoice) => (
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
              {overdue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary" variant="body2">
                      No overdue accounts found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Paper sx={{ p: 2.25, minHeight: 340 }}>
          <SectionHeader title={reminder && reminder.invoice_no === currentInvoice?.invoice_no ? `Reminder Draft - ${reminder.invoice_no}` : 'Reminder Draft'} action={reminder && reminder.invoice_no === currentInvoice?.invoice_no ? <StatusChip value={reminder.tone} /> : undefined} />
          {reminder && reminder.invoice_no === currentInvoice?.invoice_no ? (
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 760 }}>{reminder.subject}</Typography>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f4f7f4', border: '1px solid rgba(36,95,90,0.1)' }}>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {reminder.body}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 760 }}>
                Recommended: {reminder.recommended_action}
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
              <Typography color="text.secondary">
                {currentInvoice ? `Select "Generate Reminder" to draft a collection letter for ${currentInvoice.invoice_no}.` : 'Generate a reminder for the overdue account.'}
              </Typography>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  )
}
