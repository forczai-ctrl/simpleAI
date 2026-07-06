import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded'
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import SettingsBackupRestoreRoundedIcon from '@mui/icons-material/SettingsBackupRestoreRounded'
import { Button, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, Chip, Alert, Box } from '@mui/material'
import { useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import { currency, percent } from '../services/format'
import type { DashboardResponse, ReconciliationResult, Payment } from '../types'
import { retryPayment, refundPayment, closePeriod } from '../services/api'

type Props = {
  dashboard: DashboardResponse
  reconciliation: ReconciliationResult | null
  onReconcile: (payment: Payment) => void
  onRefresh: () => Promise<void>
}

export function Payments({ dashboard, reconciliation, onReconcile, onRefresh }: Props) {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const currentPayment = selectedPayment || dashboard.payments[0] || null

  async function handleRetry(paymentId: string) {
    setLoading(true)
    setError(null)
    setFeedback(null)
    try {
      const res = await retryPayment(paymentId)
      setFeedback(res.message)
      await onRefresh()
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleRefund(paymentId: string) {
    setLoading(true)
    setError(null)
    setFeedback(null)
    try {
      const res = await refundPayment(paymentId)
      setFeedback(res.message)
      await onRefresh()
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleClosePeriod() {
    setLoading(true)
    setError(null)
    setFeedback(null)
    try {
      const res = await closePeriod()
      setFeedback(res.message)
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 2.25 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <SectionHeader
            title="Payment Ingestion & Matching Center"
            action={
              <Stack direction="row" spacing={1.5}>
                <Button
                  startIcon={<AccountBalanceWalletRoundedIcon />}
                  variant="outlined"
                  onClick={handleClosePeriod}
                  disabled={loading}
                >
                  Automate Financial Close
                </Button>
                <Button
                  startIcon={<CompareArrowsRoundedIcon />}
                  variant="contained"
                  disabled={!currentPayment || loading}
                  onClick={() => currentPayment && onReconcile(currentPayment)}
                >
                  Reconcile Selected
                </Button>
              </Stack>
            }
          />
        </Box>

        {feedback && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setFeedback(null)}>
            {feedback}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Payment ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>Received Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dashboard.payments.map((payment) => {
              const payStatus = payment.status || 'succeeded'
              const statusColor = payStatus === 'succeeded' ? 'success' : payStatus === 'failed' ? 'error' : 'warning'
              
              return (
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
                  <TableCell>
                    <Chip
                      label={payStatus.toUpperCase()}
                      size="small"
                      color={statusColor}
                      variant="outlined"
                      sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem' }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {currency(payment.amount)}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
                      {payStatus === 'failed' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<AutorenewRoundedIcon />}
                          onClick={() => handleRetry(payment.payment_id)}
                          disabled={loading}
                          sx={{ py: 0.25, fontSize: '0.7rem' }}
                        >
                          Retry Payment
                        </Button>
                      )}
                      {payStatus === 'succeeded' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          startIcon={<SettingsBackupRestoreRoundedIcon />}
                          onClick={() => handleRefund(payment.payment_id)}
                          disabled={loading}
                          sx={{ py: 0.25, fontSize: '0.7rem' }}
                        >
                          Issue Refund
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            })}
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
