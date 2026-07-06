import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded'
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded'
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded'
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded'
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded'
import { AppBar, Avatar, Box, Button, Divider, Drawer, Stack, Toolbar, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material'
import type { ReactNode } from 'react'

export type PageKey = 
  | 'dashboard' 
  | 'orders' 
  | 'validation' 
  | 'fulfillment' 
  | 'inventory' 
  | 'vendors' 
  | 'invoices' 
  | 'payments' 
  | 'collections' 
  | 'reports' 
  | 'exceptions' 
  | 'auth'
  | 'customer_portal'
  | 'erp_integration'

type NavigationItem = {
  key: PageKey
  label: string
  icon: ReactNode
}

const navigation: NavigationItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <DashboardRoundedIcon /> },
  { key: 'orders', label: 'Orders', icon: <ShoppingBagRoundedIcon /> },
  { key: 'customer_portal', label: 'Customer Portal', icon: <DevicesRoundedIcon /> },
  { key: 'validation', label: 'Validation', icon: <FactCheckRoundedIcon /> },
  { key: 'fulfillment', label: 'Fulfillment', icon: <EventAvailableRoundedIcon /> },
  { key: 'inventory', label: 'Inventory', icon: <Inventory2RoundedIcon /> },
  { key: 'vendors', label: 'Vendors', icon: <BusinessRoundedIcon /> },
  { key: 'invoices', label: 'Invoices', icon: <ReceiptLongRoundedIcon /> },
  { key: 'payments', label: 'Payments', icon: <PaymentsRoundedIcon /> },
  { key: 'collections', label: 'Collections', icon: <RequestQuoteRoundedIcon /> },
  { key: 'erp_integration', label: 'Integrations Hub', icon: <TerminalRoundedIcon /> },
  { key: 'reports', label: 'Reports', icon: <TimelineRoundedIcon /> },
  { key: 'exceptions', label: 'Exceptions', icon: <WarningRoundedIcon /> },
  { key: 'auth', label: 'Authentication', icon: <ShieldRoundedIcon /> },
]

type Props = {
  activePage: PageKey
  onNavigate: (page: PageKey) => void
  children: ReactNode
}

export function AppShell({ activePage, onNavigate, children }: Props) {
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('md'))
  const drawerWidth = 268

  const nav = (
    <Stack spacing={0.75} sx={{ p: 1.5 }}>
      {navigation.map((item) => (
        <Tooltip key={item.key} title={compact ? item.label : ''} placement="right">
          <Button
            startIcon={item.icon}
            onClick={() => onNavigate(item.key)}
            fullWidth
            variant={activePage === item.key ? 'contained' : 'text'}
            color={activePage === item.key ? 'primary' : 'inherit'}
            sx={{
              justifyContent: 'flex-start',
              minHeight: 44,
              px: 1.5,
              color: activePage === item.key ? 'primary.contrastText' : 'text.primary',
            }}
          >
            {item.label}
          </Button>
        </Tooltip>
      ))}
    </Stack>
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ borderBottom: '1px solid rgba(36,95,90,0.12)' }}>
        <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, ml: { md: `${drawerWidth}px` }, gap: 2 }}>
          <Avatar
            src="/logo.svg"
            alt="OrderFlow AI"
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              flex: '0 0 auto',
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h1" sx={{ fontSize: { xs: '1.28rem', sm: '1.55rem' }, lineHeight: 1.1 }}>
              OrderFlow AI
            </Typography>
            <Typography color="text.secondary" variant="body2" noWrap>
              Agentic order-to-cash operations
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <AssignmentTurnedInRoundedIcon sx={{ color: 'primary.main', display: { xs: 'none', sm: 'block' } }} />
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            borderRight: '1px solid rgba(36,95,90,0.12)',
            bgcolor: '#fbfcfa',
          },
        }}
      >
        <Toolbar sx={{ minHeight: 72 }} />
        <Divider />
        {nav}
      </Drawer>

      <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'sticky', top: 64, zIndex: 9, bgcolor: 'background.default', borderBottom: '1px solid rgba(36,95,90,0.1)' }}>
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', px: 1.5, py: 1 }}>
          {navigation.map((item) => (
            <Tooltip key={item.key} title={item.label}>
              <Button
                onClick={() => onNavigate(item.key)}
                variant={activePage === item.key ? 'contained' : 'outlined'}
                color={activePage === item.key ? 'primary' : 'inherit'}
                sx={{ minWidth: 48, px: 1.25 }}
              >
                {item.icon}
              </Button>
            </Tooltip>
          ))}
        </Stack>
      </Box>

      <Box component="main" sx={{ ml: { md: `${drawerWidth}px` }, pt: { xs: 9.5, md: 11 }, px: { xs: 1.5, sm: 2.5, lg: 4 }, pb: 5 }}>
        {children}
      </Box>
    </Box>
  )
}

