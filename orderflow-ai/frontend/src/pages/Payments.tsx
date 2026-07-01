import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded'
import { Button, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import { currency, percent } from '../services/format'
import type { DashboardResponse, ReconciliationResult, Payment } from '../types'

type Props = {
  dashboard: DashboardResponse
  reconciliation: ReconciliationResult | null
  onReconcile: (payment: Payment) => void
}

export function Payments({ dashboard, reconciliation, onReconcile }: Props) {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  
  const currentPayment = selectedPayment || dashboard.payments[0] || null

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 2.25 }}>
        <SectionHeader
          title="Payment Reconciliation"
          action={
            <Button
              startIcon={<CompareArrowsRoundedIcon />}
              variant="contained"
              disabled={!currentPayment}
              onClick={() => currentPayment && onReconcile(currentPayment)}
            >
              Reconcile Selected
            </Button>
          }
        />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Payment</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dashboard.payments.map((payment) => (
              <TableRow
                key={payment.payment_id}
                hover
                selected={currentPayment?.payment_id === payment.payment_id}
                onClick={() => setSelectedPayment(payment)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell sx={{ fontWeight: 760 }}>{payment.payment_id}</TableCell>
                <TableCell>{payment.customer_name}</TableCell>
                <TableCell>{payment.reference}</TableCell>
                <TableCell>{payment.received_date}</TableCell>
                <TableCell align="right">{currency(payment.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {reconciliation ? (
        <Paper sx={{ p: 2.25 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between' }}>
            <Stack spacing={0.75}>
              <Typography variant="h2">Match Result for {reconciliation.payment.payment_id}</Typography>
              <Typography color="text.secondary">
                Matched to invoice: <strong style={{ color: '#245f5a' }}>{reconciliation.matched_invoice_no ?? 'manual review required'}</strong>
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <StatusChip value={reconciliation.status} />
              <Typography sx={{ fontWeight: 760 }}>{percent(reconciliation.confidence)}</Typography>
            </Stack>
          </Stack>
          <Stack spacing={0.75} sx={{ mt: 2, p: 1.5, borderRadius: 1.5, bgcolor: '#f4f7f4', border: '1px solid rgba(36,95,90,0.1)' }}>
            {reconciliation.notes.map((note) => (
              <Typography key={note} variant="body2" color="text.secondary">
                • {note}
              </Typography>
            ))}
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  )
}
