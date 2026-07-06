import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded'
import PriorityHighRoundedIcon from '@mui/icons-material/PriorityHighRounded'
import { Box, Button, Grid, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { MetricCard } from '../components/MetricCard'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import type { PageKey } from '../layouts/AppShell'
import { currency, orderTotal } from '../services/format'
import type { DashboardResponse } from '../types'

type Props = {
  dashboard: DashboardResponse
  onNavigate: (page: PageKey) => void
}

export function Dashboard({ dashboard, onNavigate }: Props) {
  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        {dashboard.metrics.map((metric) => {
          let targetPage: PageKey | undefined = undefined
          if (metric.label.toLowerCase().includes('orders')) targetPage = 'orders'
          else if (metric.label.toLowerCase().includes('revenue')) targetPage = 'invoices'
          else if (metric.label.toLowerCase().includes('outstanding')) targetPage = 'collections'
          else if (metric.label.toLowerCase().includes('sla')) targetPage = 'fulfillment'

          return (
            <Grid key={metric.label} size={{ xs: 12, sm: 6, lg: 3 }}>
              <MetricCard metric={metric} onClick={targetPage ? () => onNavigate(targetPage) : undefined} />
            </Grid>
          )
        })}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2.25 }}>
            <SectionHeader
              title="Recent Orders"
              action={
                <Button startIcon={<PriorityHighRoundedIcon />} onClick={() => onNavigate('validation')} variant="outlined">
                  Review
                </Button>
              }
            />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>PO</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Delivery</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboard.orders.map((order) => (
                  <TableRow key={order.po_number} hover>
                    <TableCell sx={{ fontWeight: 760 }}>{order.po_number}</TableCell>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell>{order.delivery_date}</TableCell>
                    <TableCell>
                      <StatusChip value={order.status} />
                    </TableCell>
                    <TableCell align="right">{currency(orderTotal(order))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2.25, height: '100%' }}>
            <SectionHeader title="Cash Signals" action={<AccountBalanceWalletRoundedIcon color="primary" />} />
            <Stack spacing={2}>
              <Box>
                <Stack direction="row" sx={{ mb: 0.75, justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    DSO target progress
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 760 }}>
                    72%
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={72} sx={{ height: 9, borderRadius: 5 }} />
              </Box>
              {dashboard.exceptions.map((exception) => (
                <Box key={`${exception.type}-${exception.detail}`} sx={{ p: 1.4, borderRadius: 2, bgcolor: 'rgba(184,121,25,0.08)', border: '1px solid rgba(184,121,25,0.22)' }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 0.75, alignItems: 'center' }}>
                    <StatusChip value={exception.severity} />
                    <Typography sx={{ fontWeight: 760 }}>{exception.type}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {exception.detail}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  )
}
