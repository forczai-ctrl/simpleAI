import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import KeyRoundedIcon from '@mui/icons-material/KeyRounded'
import LockPersonRoundedIcon from '@mui/icons-material/LockPersonRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import { Box, Button, Card, CardContent, Chip, Divider, Grid, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { SectionHeader } from '../components/SectionHeader'

type Role = 'clerk' | 'manager' | 'finance' | 'admin'

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  clerk: ['orders.read', 'orders.write', 'validation.read'],
  manager: ['orders.read', 'orders.write', 'validation.read', 'validation.approve', 'fulfillment.write', 'inventory.write', 'vendors.write'],
  finance: ['invoices.read', 'invoices.write', 'payments.reconcile', 'collections.write', 'reports.read'],
  admin: ['*'],
}

export function Authentication() {
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [role, setRole] = useState<Role>('manager')
  const [realm, setRealm] = useState('OrderFlow-Ops')
  const [clientId, setClientId] = useState('operations-console')
  const [tokenVersion, setTokenVersion] = useState(1)

  const handleLoginToggle = () => {
    setIsLoggedIn(!isLoggedIn)
  }

  const handleRotateSecret = () => {
    setTokenVersion((prev) => prev + 1)
  }

  const mockJwtHeader = {
    alg: 'RS256',
    typ: 'JWT',
    kid: `key-ops-v${tokenVersion}`,
  }

  const mockJwtPayload = {
    iss: 'https://keycloak.orderflow-ai.internal/realms/OrderFlow-Ops',
    sub: 'usr_0843291048',
    aud: 'operations-console',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    preferred_username: 'ops_specialist',
    email: 'ops.specialist@orderflow.com',
    resource_access: {
      'operations-console': {
        roles: [role],
      },
    },
    scope: ROLE_PERMISSIONS[role].join(' '),
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Identity & Access Management (IAM)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Simulate Keycloak Single Sign-On, manage OAuth client profiles, and test role-based access control (RBAC)
          </Typography>
        </Box>
        <Chip
          icon={<SecurityRoundedIcon />}
          label={isLoggedIn ? 'Authenticated via SSO' : 'Session Expired'}
          color={isLoggedIn ? 'success' : 'default'}
          sx={{ fontWeight: 700, px: 1 }}
        />
      </Box>

      {!isLoggedIn ? (
        <Grid container sx={{ justifyContent: 'center', py: 4 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <LockPersonRoundedIcon color="primary" sx={{ fontSize: 56, mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                Keycloak Identity Provider
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                The operations console is secured by Keycloak SSO. Click below to sign in using the simulated authentication provider.
              </Typography>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleLoginToggle}
                sx={{ py: 1.5, borderRadius: 2 }}
              >
                Sign In with SSO
              </Button>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {/* Keycloak Realm and OAuth settings */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <Stack spacing={3}>
              <Paper sx={{ p: 3 }}>
                <SectionHeader title="Keycloak Client Profile" action={<KeyRoundedIcon color="primary" />} />
                <Stack spacing={2.25} sx={{ mt: 1 }}>
                  <TextField
                    label="SSO Keycloak Realm"
                    value={realm}
                    onChange={(e) => setRealm(e.target.value)}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Client Client ID"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    fullWidth
                    size="small"
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>
                      RBAC Active User Persona
                    </Typography>
                    <Select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="clerk">Operations Clerk (Intake & Read-only)</MenuItem>
                      <MenuItem value="manager">Operations Manager (Full validation / approval)</MenuItem>
                      <MenuItem value="finance">Finance Controller (Invoice, matching & collections)</MenuItem>
                      <MenuItem value="admin">Platform Administrator (Global access)</MenuItem>
                    </Select>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Active Role Scopes
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {ROLE_PERMISSIONS[role].map((perm) => (
                        <Chip
                          key={perm}
                          label={perm}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 700, fontFamily: 'monospace' }}
                        />
                      ))}
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Button variant="outlined" color="error" fullWidth onClick={handleLoginToggle}>
                      Simulate Logout
                    </Button>
                    <Button variant="contained" fullWidth onClick={handleRotateSecret} startIcon={<RefreshRoundedIcon />}>
                      Rotate Keys
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              <Card sx={{ bgcolor: 'rgba(36,95,90,0.06)', border: '1px solid rgba(36,95,90,0.18)' }}>
                <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <AdminPanelSettingsRoundedIcon color="primary" sx={{ fontSize: 32, mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Keycloak Gatekeeper Status
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      SSO Realm signature validated against public key registry. Session expiration refreshed.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* JWT Token Decoder Visualizer */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <SectionHeader title="JWT Bearer Token Decoded" action={<CheckCircleRoundedIcon color="success" />} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Inspect the OpenID Connect (OIDC) JWT token supplied to authorize calls to FastAPI endpoints:
              </Typography>

              <Stack spacing={2}>
                {/* Header block */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>
                    HEADER (Algorithm & Token Type)
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: '#fcf6f6',
                      border: '1px solid #f2d1d1',
                      overflowX: 'auto',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      mt: 0.5,
                    }}
                  >
                    {JSON.stringify(mockJwtHeader, null, 2)}
                  </Box>
                </Box>

                {/* Payload block */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    PAYLOAD (Decoded JWT Claims)
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(36,95,90,0.03)',
                      border: '1px solid rgba(36,95,90,0.18)',
                      overflowX: 'auto',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      mt: 0.5,
                    }}
                  >
                    {JSON.stringify(mockJwtPayload, null, 2)}
                  </Box>
                </Box>

                {/* Signature block */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    VERIFY SIGNATURE (RSA SHA-256)
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      p: 1.25,
                      borderRadius: 1.5,
                      bgcolor: '#f4f4f4',
                      border: '1px solid rgba(0,0,0,0.08)',
                      overflowX: 'auto',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace',
                      color: 'text.secondary',
                      mt: 0.5,
                    }}
                  >
                    {`HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  "key-ops-private-key-rsa-sha256-signature-keycloak-token"
) [Signature Verified]`}
                  </Box>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Stack>
  )
}
