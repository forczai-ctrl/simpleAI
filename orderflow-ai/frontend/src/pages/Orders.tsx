import AddRoundedIcon from '@mui/icons-material/AddRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded'
import { Box, Button, Chip, Divider, Drawer, Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import { currency, orderTotal } from '../services/format'
import type { Order, PipelineRun } from '../types'

type Props = {
  orders: Order[]
  rawText: string
  pipeline: PipelineRun | null
  loading: boolean
  onRawTextChange: (value: string) => void
  onRunPipeline: () => void
}

export function Orders({ orders, rawText, pipeline, loading, onRawTextChange, onRunPipeline }: Props) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null)
  const [intakeDrawerOpen, setIntakeDrawerOpen] = useState(false)

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order)
  }

  const handleRunIntake = async () => {
    await onRunPipeline()
    setIntakeDrawerOpen(false)
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
        <Button
          startIcon={<AddRoundedIcon />}
          variant="contained"
          onClick={() => setIntakeDrawerOpen(true)}
          sx={{ py: 1, px: 2.25, borderRadius: 2 }}
        >
          AI Order Intake
        </Button>
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
              Paste raw text (e.g. Email threads, PDF copy, transcoded voice notes, or standard PO layouts) to extract structured fields using the AI Order Intake Agent.
            </Typography>

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
