import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { Client } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import {
  Typography, Button, Card, CardContent, Grid, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, Box, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const CLIENTS_QUERY = `query { clients { id name company email address1 address2 city state zip phone created_at updated_at } }`;

export default function ClientsPage() {
  const qc = useQueryClient();
  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await gql<{ clients: Client[] }>(CLIENTS_QUERY)).clients,
  });

  const [editing, setEditing] = useState<Partial<Client> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const save = useMutation({
    mutationFn: (c: Partial<Client>) => {
      const input = { name: c.name, company: c.company || null, email: c.email || null, address1: c.address1 || null, address2: c.address2 || null, city: c.city || null, state: c.state || null, zip: c.zip || null, phone: c.phone || null };
      if (c.id) {
        return gql(`mutation($id: Int!, $input: UpdateClientInput!) { updateClient(id: $id, input: $input) { id } }`, { id: c.id, input });
      }
      return gql(`mutation($input: CreateClientInput!) { createClient(input: $input) { id } }`, { input });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setEditing(null); toast.success('Client saved'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => gql(`mutation($id: Int!) { deleteClient(id: $id) }`, { id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client deleted'); },
  });

  if (isLoading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Clients</Typography>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => setEditing({ name: '', company: '', email: '', address1: '', address2: '', city: '', state: '', zip: '', phone: '' })}>
          Add Client
        </Button>
      </Box>

      {editing && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>{editing.id ? 'Edit' : 'New'} Client</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Name *" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Company" value={editing.company || ''} onChange={(e) => setEditing({ ...editing, company: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Email" type="email" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Phone" value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Address Line 1" value={editing.address1 || ''} onChange={(e) => setEditing({ ...editing, address1: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Address Line 2" value={editing.address2 || ''} onChange={(e) => setEditing({ ...editing, address2: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label="City" value={editing.city || ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label="State" value={editing.state || ''} onChange={(e) => setEditing({ ...editing, state: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth label="Zip" value={editing.zip || ''} onChange={(e) => setEditing({ ...editing, zip: e.target.value })} />
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button variant="contained" onClick={() => save.mutate(editing)}>Save</Button>
              <Button variant="outlined" onClick={() => setEditing(null)}>Cancel</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Phone</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => setEditing(c)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => setConfirmDeleteId(c.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No clients yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <ConfirmModal open={confirmDeleteId !== null} message="Delete this client?" confirmLabel="Delete"
        onConfirm={() => { if (confirmDeleteId !== null) remove.mutate(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)} />
    </div>
  );
}
