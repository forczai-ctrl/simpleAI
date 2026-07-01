import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import { Box, Button, Grid, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { SectionHeader } from '../components/SectionHeader'
import { StatusChip } from '../components/StatusChip'
import { currency, orderTotal } from '../services/format'
import type { PipelineRun } from '../types'

type Props = {
  rawText: string
  pipeline: PipelineRun | null
  loading: boolean
  onRawTextChange: (value: string) => void
  onRunPipeline: () => void
}

export function OrderIntake({ rawText, pipeline, loading, onRawTextChange, onRunPipeline }: Props) {
  const order = pipeline?.extraction

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, lg: 5 }}>
        <Paper sx={{ p: 2.25 }}>
          <SectionHeader title="Order Intake" />
          <Stack spacing={2}>
            <TextField multiline minRows={13} value={rawText} onChange={(event) => onRawTextChange(event.target.value)} fullWidth label="Incoming order text" />
            <Button startIcon={<AutoFixHighRoundedIcon />} variant="contained" onClick={onRunPipeline} disabled={loading}>
              {loading ? 'Extracting' : 'Extract with AI'}
            </Button>
          </Stack>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <Paper sx={{ p: 2.25, minHeight: 470 }}>
          <SectionHeader title="Structured Order" action={pipeline ? <StatusChip value={pipeline.validation.approved ? 'validated' : 'exception'} /> : undefined} />
          {order ? (
            <Stack spacing={2.25}>
              <Grid container spacing={1.5}>
                {[
                  ['Customer', order.customer_name],
                  ['PO Number', order.po_number],
                  ['Delivery', order.delivery_date],
                  ['Terms', order.payment_terms],
                  ['Region', order.ship_to_region],
                  ['Value', currency(orderTotal(order))],
                ].map(([label, value]) => (
                  <Grid key={label} size={{ xs: 6, md: 4 }}>
                    <Box sx={{ p: 1.3, borderRadius: 2, bgcolor: '#f4f7f4', minHeight: 72 }}>
                      <Typography variant="caption" color="text.secondary">
                        {label}
                      </Typography>
                      <Typography sx={{ fontWeight: 760 }}>{value}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SKU</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell sx={{ fontWeight: 760 }}>{item.sku}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{currency(item.unit_price)}</TableCell>
                      <TableCell align="right">{currency(item.line_total ?? item.quantity * item.unit_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ p: 1.6, borderRadius: 2, bgcolor: 'rgba(36,95,90,0.08)' }}>
                <Stack direction="row" spacing={1} sx={{ mb: 0.75, alignItems: 'center' }}>
                  <SendRoundedIcon color="primary" fontSize="small" />
                  <Typography sx={{ fontWeight: 760 }}>{pipeline.acknowledgement.subject}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {pipeline.acknowledgement.body}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Box sx={{ minHeight: 370, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>
              <Typography>Run extraction to populate the order record.</Typography>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  )
}
