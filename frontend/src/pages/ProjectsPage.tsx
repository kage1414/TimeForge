import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { Project, Client } from '../types';
import {
  TFBadge,
  TFButton,
  TFCard,
  TFCheckbox,
  TFConfirm,
  TFDialog,
  TFDialogBody,
  TFDialogContent,
  TFDialogFooter,
  TFDialogHeader,
  TFDialogTitle,
  TFEmpty,
  TFField,
  TFInput,
  TFLoading,
  TFPageHeader,
  TFSelect,
  TFTable,
  TFTBody,
  TFTd,
  TFTh,
  TFTHead,
  TFTr,
} from '../components/tf';

const PROJECTS_QUERY = `query { projects { id client_id client_name name description default_rate is_active created_at updated_at } }`;
const CLIENTS_QUERY = `query { clients { id name company } }`;

interface ProjectForm {
  client_id: string;
  name: string;
  description: string;
  default_rate: string;
  is_active: boolean;
}

const emptyForm: ProjectForm = {
  client_id: '',
  name: '',
  description: '',
  default_rate: '85',
  is_active: true,
};

function EditProjectModal({
  project,
  clients,
  onClose,
}: {
  project: Project | null;
  clients: Client[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProjectForm>(
    project
      ? {
          client_id: String(project.client_id),
          name: project.name,
          description: project.description || '',
          default_rate: String(project.default_rate),
          is_active: project.is_active,
        }
      : emptyForm,
  );

  const set = <K extends keyof ProjectForm>(field: K, value: ProjectForm[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        client_id: Number(form.client_id),
        name: form.name,
        description: form.description,
        default_rate: Number(form.default_rate),
        ...(project ? { is_active: form.is_active } : {}),
      };
      if (project) {
        return gql(
          `mutation($id: Int!, $input: UpdateProjectInput!) { updateProject(id: $id, input: $input) { id } }`,
          { id: project.id, input: body },
        );
      }
      return gql(
        `mutation($input: CreateProjectInput!) { createProject(input: $input) { id } }`,
        { input: body },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success(project ? 'Project updated' : 'Project created');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <TFDialog open onOpenChange={(o) => !o && onClose()}>
      <TFDialogContent size="lg">
        <TFDialogHeader>
          <div className="flex items-center justify-between w-full">
            <TFDialogTitle>{project ? 'Edit Project' : 'New Project'}</TFDialogTitle>
            {project && (
              <button
                type="button"
                onClick={() => set('is_active', !form.is_active)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  form.is_active
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${form.is_active ? 'bg-green-500' : 'bg-gray-400'}`}
                />
                {form.is_active ? 'Active' : 'Inactive'}
              </button>
            )}
          </div>
        </TFDialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <TFDialogBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TFField label="Client" required>
                <TFSelect required value={form.client_id} onChange={(e) => set('client_id', e.target.value)}>
                  <option value="">Select Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.company}
                    </option>
                  ))}
                </TFSelect>
              </TFField>
              <TFField label="Project Name" required>
                <TFInput required value={form.name} onChange={(e) => set('name', e.target.value)} />
              </TFField>
              <TFField label="Default Rate ($/hr)">
                <TFInput
                  type="number"
                  step="1"
                  value={form.default_rate}
                  onChange={(e) => set('default_rate', e.target.value)}
                />
              </TFField>
              <TFField label="Description">
                <TFInput value={form.description} onChange={(e) => set('description', e.target.value)} />
              </TFField>
            </div>
          </TFDialogBody>
          <TFDialogFooter>
            <TFButton type="button" variant="muted" onClick={onClose}>
              Cancel
            </TFButton>
            <TFButton type="submit" disabled={save.isPending}>
              Save
            </TFButton>
          </TFDialogFooter>
        </form>
      </TFDialogContent>
    </TFDialog>
  );
}

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Project | null | undefined>(undefined);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => (await gql<{ projects: Project[] }>(PROJECTS_QUERY)).projects,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await gql<{ clients: Client[] }>(CLIENTS_QUERY)).clients,
  });

  const remove = useMutation({
    mutationFn: (id: number) => gql(`mutation($id: Int!) { deleteProject(id: $id) }`, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
    },
  });

  const visibleProjects = showInactive ? projects : projects.filter((p) => p.is_active);

  if (isLoading) return <TFLoading />;

  return (
    <div>
      <TFPageHeader
        title="Projects"
        actions={
          <>
            <TFCheckbox
              id="projects-show-inactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              label="Show inactive"
            />
            <TFButton onClick={() => setEditing(null)}>Add Project</TFButton>
          </>
        }
      />

      {visibleProjects.length === 0 ? (
        <TFEmpty>No projects.</TFEmpty>
      ) : (
        <TFCard padding="none" className="overflow-hidden">
          <TFTable>
            <TFTHead>
              <TFTr>
                <TFTh>Project</TFTh>
                <TFTh>Client</TFTh>
                <TFTh>Rate</TFTh>
                <TFTh>Status</TFTh>
                <TFTh className="text-right">Actions</TFTh>
              </TFTr>
            </TFTHead>
            <TFTBody>
              {visibleProjects.map((p) => (
                <TFTr key={p.id} className={!p.is_active ? 'opacity-50' : ''}>
                  <TFTd className="font-medium">{p.name}</TFTd>
                  <TFTd>{p.client_name}</TFTd>
                  <TFTd>${Number(p.default_rate).toFixed(2)}/hr</TFTd>
                  <TFTd>
                    <TFBadge tone={p.is_active ? 'success' : 'neutral'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </TFBadge>
                  </TFTd>
                  <TFTd className="text-right space-x-2">
                    <TFButton variant="link" size="sm" onClick={() => setEditing(p)}>
                      Edit
                    </TFButton>
                    <TFButton
                      variant="linkDanger"
                      size="sm"
                      onClick={() => setConfirmDeleteId(p.id)}
                    >
                      Delete
                    </TFButton>
                  </TFTd>
                </TFTr>
              ))}
            </TFTBody>
          </TFTable>
        </TFCard>
      )}

      {editing !== undefined && (
        <EditProjectModal project={editing} clients={clients} onClose={() => setEditing(undefined)} />
      )}

      <TFConfirm
        open={confirmDeleteId !== null}
        message="Delete this project?"
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDeleteId !== null) remove.mutate(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
