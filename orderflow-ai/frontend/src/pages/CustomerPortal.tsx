import { useState } from 'react'
import { Box, Button, Card, CardContent, Divider, FormControl, Grid, IconButton, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Alert } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import { SectionHeader } from '../components/SectionHeader'
import { currency } from '../services/format'
import { runPipeline } from '../services/api'
import type { PipelineRun } from '../types'

const CUSTOMER_OPTIONS = [
  'Northstar Market',
  'Bluebird Foods',
  'Summit Distributors',
  'Emerald Retail',
]

const SKU_OPTIONS = [
  { sku: 'SKU-COFFEE-12', description: 'Wholesale coffee cartons', price: 48.00 },
  { sku: 'SKU-TEA-24', description: 'Specialty tea trays', price: 36.00 },
  { sku: 'SKU-MUG-100', description: 'Branded ceramic mugs', price: 12.50 },
]

const REGIONS = ['TX', 'CA', 'NY', 'WA', 'FL', 'IL']

interface PortalItem {
  sku: string
  quantity: number
  price: number
}

export function CustomerPortal() {
  const [customer, setCustomer] = useState(CUSTOMER_OPTIONS[0])
  const [poNumber, setPoNumber] = useState('PO-5001')
  const [region, setRegion] = useState('TX')
  const [deliveryDate, setDeliveryDate] = useState('2026-07-15')
  const [paymentTerms, setPaymentTerms] = useState('NET 30')
  const [items, setItems] = useState<PortalItem[]>([
    { sku: SKU_OPTIONS[0].sku, quantity: 10, price: SKU_OPTIONS[0].price }
  ])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PipelineRun | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAddItem = () => {
    setItems([...items, { sku: SKU_OPTIONS[0].sku, quantity: 5, price: SKU_OPTIONS[0].price }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, key: keyof PortalItem, value: any) => {
    const updated = [...items]
    if (key === 'sku') {
      const selected = SKU_OPTIONS.find(s => s.sku === value)
      updated[index] = {
        sku: value,
        quantity: updated[index].quantity,
        price: selected ? selected.price : 0
      }
    } else {
      updated[index] = {
        ...updated[index],
        [key]: value
      }
    }
    setItems(updated)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  }

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError('Please add at least one line item.')
      return
    }
    setError(null)
    setLoading(true)
    setResult(null)

    // Format fields as plain text PO
    const itemsText = items
      .map(item => `Item ${item.sku} Qty ${item.quantity} Price ${item.price.toFixed(2)}`)
      .join('\n')
    
    const rawText = `Purchase Order ${poNumber}
Customer: ${customer}
Ship To Region: ${region}
Delivery Date: ${deliveryDate}
Payment Terms: ${paymentTerms}
${itemsText}`

    try {
      const pipelineRun = await runPipeline(rawText)
      setResult(pipelineRun)
    } catch (err: any) {
      setError(`Failed to submit order: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
          Customer Purchase Order Portal
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Simulate a customer submitting a purchase order directly through a self-service web portal
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* PO Form */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3 }}>
            <SectionHeader title="Create Purchase Order" />
            <Stack spacing={2.5}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="customer-select-label">Customer Company</InputLabel>
                    <Select
                      labelId="customer-select-label"
                      value={customer}
                      label="Customer Company"
                      onChange={(e) => setCustomer(e.target.value)}
                    >
                      {CUSTOMER_OPTIONS.map(c => (
                        <MenuItem key={c} value={c}>{c}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="PO Number"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel id="region-select-label">Ship To Region</InputLabel>
                    <Select
                      labelId="region-select-label"
                      value={region}
                      label="Ship To Region"
                      onChange={(e) => setRegion(e.target.value)}
                    >
                      {REGIONS.map(r => (
                        <MenuItem key={r} value={r}>{r}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Delivery Date"
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Payment Terms"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  />
                </Grid>
              </Grid>

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Order Items
                </Typography>
                <Button
                  startIcon={<AddRoundedIcon />}
                  variant="outlined"
                  size="small"
                  onClick={handleAddItem}
                >
                  Add Line Item
                </Button>
              </Box>

              <TableContainer sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                    <TableRow>
                      <TableCell>Product SKU</TableCell>
                      <TableCell align="right" style={{ width: 100 }}>Qty</TableCell>
                      <TableCell align="right" style={{ width: 120 }}>Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="center" style={{ width: 60 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Select
                            size="small"
                            fullWidth
                            value={item.sku}
                            onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                          >
                            {SKU_OPTIONS.map(s => (
                              <MenuItem key={s.sku} value={s.sku}>
                                {s.sku} ({s.description})
                              </MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            slotProps={{ htmlInput: { min: 1 } }}
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={item.price}
                            onChange={(e) => handleItemChange(idx, 'price', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {currency(item.quantity * item.price)}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)}>
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: '#fbfdfa', borderRadius: 2, border: '1px solid rgba(36,95,90,0.1)' }}>
                <Typography variant="subtitle2" color="text.secondary">Estimated Total</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {currency(calculateTotal())}
                </Typography>
              </Box>

              {error && <Alert severity="error">{error}</Alert>}

              <Button
                variant="contained"
                startIcon={<SendRoundedIcon />}
                onClick={handleSubmit}
                disabled={loading}
                sx={{ py: 1.5, borderRadius: 2 }}
              >
                {loading ? 'Submitting Purchase Order...' : 'Submit PO to Portal'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Sync / Validation Results */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <SectionHeader title="Validation Status" />
            
            {!result && !loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', py: 8, color: 'text.secondary' }}>
                <FactCheckRoundedIcon sx={{ fontSize: 64, mb: 2, color: 'action.disabled' }} />
                <Typography variant="body1">Await submission...</Typography>
                <Typography variant="caption" sx={{ mt: 0.5 }}>Fill details and submit to see ingestion feedback</Typography>
              </Box>
            )}

            {loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', py: 8 }}>
                <Typography variant="body1">Simulating O2C Pipeline Ingestion...</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Running Intake → Validation → ERP Logging</Typography>
              </Box>
            )}

            {result && (
              <Stack spacing={2.5}>
                {result.validation.approved ? (
                  <Alert icon={<CheckCircleOutlineRoundedIcon fontSize="inherit" />} severity="success" sx={{ borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Order Ingested & Approved!</Typography>
                    <Typography variant="caption">PO synced to ERP and routed to Fulfillment.</Typography>
                  </Alert>
                ) : (
                  <Alert icon={<ErrorOutlineRoundedIcon fontSize="inherit" />} severity="error" sx={{ borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Order Exception Flagged!</Typography>
                    <Typography variant="caption">Order requires ops review due to validation check failures.</Typography>
                  </Alert>
                )}

                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                      Ingestion Details
                    </Typography>
                    <Stack spacing={1}>
                      {[
                        ['Customer Name', result.extraction.customer_name],
                        ['PO Reference', result.extraction.po_number],
                        ['Fulfillment SLA', result.extraction.delivery_date],
                        ['Total Amount', currency(result.extraction.total_amount ?? 0)],
                        ['Priority Score', `${result.validation.priority.score}/100`],
                      ].map(([label, val]) => (
                        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>{val}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Validation Rules
                </Typography>
                
                <Stack spacing={1}>
                  {result.validation.checks.map((check, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{check.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {check.detail}
                        </Typography>
                        <Box sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: check.status === 'pass' ? 'success.main' : check.status === 'warning' ? 'warning.main' : 'error.main'
                        }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  )
}
