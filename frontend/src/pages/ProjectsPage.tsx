import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { Project, Client } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import {
  Typography, Button, Card, CardContent, Grid, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Box, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const PROJECTS_QUERY = `query { projects { id client_id client_name name description default_rate is_active created_at updated_at } }`;
const CLIENTS_QUERY = `query { clients { id name } }`;

const emptyProject = { client_id: '', name: '', description: '', default_rate: '85' };

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyProject);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => (await gql<{ projects: Project[] }>(PROJECTS_QUERY)).projects,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await gql<{ clients: Client[] }>(CLIENTS_QUERY)).clients,
  });

  const save = useMutation({
    mutationFn: () => {
      const body = { client_id: Number(form.client_id), name: form.name, description: form.description, default_rate: Number(form.default_rate) };
      if (editingId) return gql(`mutation($id: Int!, $input: UpdateProjectInput!) { updateProject(id: $id, input: $input) { id } }`, { id: editingId, input: body });
      return gql(`mutation($input: CreateProjectInput!) { createProject(input: $input) { id } }`, { input: body });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success(editingId ? 'Project updated' : 'Project created'); resetForm(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => gql(`mutation($id: Int!) { deleteProject(id: $id) }`, { id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project deleted'); },
  });

  function resetForm() { setForm(emptyProject); setEditingId(null); setShowForm(false); }

  function startEdit(p: Project) {
    setForm({ client_id: String(p.client_id), name: p.name, description: p.description || '', default_rate: String(p.default_rate) });
    setEditingId(p.id);
    setShowForm(true);
  }

  if (isLoading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">Projects</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? 'Cancel' : 'Add Project'}
        </Button>
      </Box>

      {showForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField select fullWidth label="Client *" required value={form.client_id}
                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                    <MenuItem value="">Select Client</MenuItem>
                    {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Project Name *" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Default Rate ($/hr)" type="number" value={form.default_rate}
                    onChange={(e) => setForm({ ...form, default_rate: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Description" value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Grid>
              </Grid>
              <Box sx={{ mt: 2 }}>
                <Button type="submit" variant="contained">{editingId ? 'Update' : 'Create'}</Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      )}

      {projects.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>No projects yet.</Typography>
      ) : (
        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Project</strong></TableCell>
                <TableCell><strong>Client</strong></TableCell>
                <TableCell><strong>Rate</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{p.name}</TableCell>
                  <TableCell>{p.client_name}</TableCell>
                  <TableCell>${Number(p.default_rate).toFixed(2)}/hr</TableCell>
                  <TableCell>
                    <Chip label={p.is_active ? 'Active' : 'Inactive'} color={p.is_active ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => startEdit(p)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => setConfirmDeleteId(p.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ConfirmModal open={confirmDeleteId !== null} message="Delete this project?" confirmLabel="Delete"
        onConfirm={() => { if (confirmDeleteId !== null) remove.mutate(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)} />
    </div>
  );
}
