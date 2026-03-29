import { useQuery } from '@tanstack/react-query';
import { gql } from '../api/client';
import { Dashboard } from '../types';
import { Link } from 'react-router-dom';
import {
  Typography, Card, CardContent, Grid, Table, TableHead, TableRow,
  TableCell, TableBody, Chip, Box, CircularProgress,
} from '@mui/material';

const DASHBOARD_QUERY = `
  query {
    dashboard {
      total_clients
      active_projects
      running_timers { id project_name description start_time }
      unbilled_hours
      unbilled_amount
      recent_invoices { id invoice_number client_name total status }
      outstanding_amount
    }
  }
`;

const statusColors: Record<string, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
  draft: 'default',
  sent: 'info',
  paid: 'success',
  overdue: 'error',
  cancelled: 'warning',
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery<Dashboard>({
    queryKey: ['dashboard'],
    queryFn: async () => (await gql<{ dashboard: Dashboard }>(DASHBOARD_QUERY)).dashboard,
    refetchInterval: 30000,
  });

  if (isLoading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;
  if (!data) return null;

  const stats = [
    { label: 'Clients', value: data.total_clients },
    { label: 'Active Projects', value: data.active_projects },
    { label: 'Unbilled Hours', value: data.unbilled_hours },
    { label: 'Unbilled Amount', value: `$${data.unbilled_amount.toFixed(2)}` },
    { label: 'Outstanding', value: `$${data.outstanding_amount.toFixed(2)}` },
    { label: 'Running Timers', value: data.running_timers.length },
  ];

  return (
    <div>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>Dashboard</Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 6, sm: 4, md: 2 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ mt: 0.5 }}>{s.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {data.running_timers.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Running Timers</Typography>
            {data.running_timers.map((t) => (
              <Box key={t.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                <div>
                  <Typography component="span" fontWeight="medium">{t.project_name}</Typography>
                  {t.description && <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>- {t.description}</Typography>}
                </div>
                <Chip label="Running" color="success" size="small" variant="outlined" />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Recent Invoices</Typography>
            <Link to="/invoices" style={{ color: '#4f46e5', fontSize: 14 }}>View all</Link>
          </Box>
          {data.recent_invoices.length === 0 ? (
            <Typography color="text.secondary">No invoices yet</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Number</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.recent_invoices.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell>
                      <Link to={`/invoices/${inv.id}`} style={{ color: '#4f46e5' }}>{inv.invoice_number}</Link>
                    </TableCell>
                    <TableCell>{inv.client_name}</TableCell>
                    <TableCell>${Number(inv.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip label={inv.status} color={statusColors[inv.status] || 'default'} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
