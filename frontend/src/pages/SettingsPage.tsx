import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { UserSettings, User } from '../types';
import { useAuth } from '../auth/AuthContext';
import { statusTone } from '../lib/statusTone';
import BackupSettings from '../components/BackupSettings';
import {
  TFBadge,
  TFButton,
  TFCard,
  TFCardTitle,
  TFCheckbox,
  TFEmpty,
  TFField,
  TFInput,
  TFSelect,
  TFTable,
  TFTBody,
  TFTd,
  TFTextarea,
  TFTabs,
  TFTabsContent,
  TFTabsList,
  TFTabsTrigger,
  TFTh,
  TFTHead,
  TFTr,
} from '../components/tf';

const SETTINGS_FIELDS =
  'id company first_name last_name email address1 address2 city state zip phone venmo cashapp paypal zelle default_due_days smtp_host smtp_port smtp_user smtp_pass smtp_secure smtp_from_email smtp_from_name default_email_template show_earnings_on_timer resume_window_minutes consolidate_hours';

const SETTINGS_QUERY = `query { userSettings { ${SETTINGS_FIELDS} } }`;

const UPDATE_SETTINGS_MUTATION = `
  mutation($input: UpdateUserSettingsInput!) {
    updateUserSettings(input: $input) { ${SETTINGS_FIELDS} }
  }
`;

const USERS_QUERY = `query { users { id email name role created_at } }`;

export default function SettingsPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [company, setCompany] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  const [venmo, setVenmo] = useState('');
  const [cashapp, setCashapp] = useState('');
  const [paypal, setPaypal] = useState('');
  const [zelle, setZelle] = useState('');
  const [defaultDueDays, setDefaultDueDays] = useState('30');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [showEarningsOnTimer, setShowEarningsOnTimer] = useState(false);
  const [resumeWindowMinutes, setResumeWindowMinutes] = useState('60');
  const [consolidateHours, setConsolidateHours] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ['userSettings'],
    queryFn: async () => (await gql<{ userSettings: UserSettings }>(SETTINGS_QUERY)).userSettings,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await gql<{ users: User[] }>(USERS_QUERY)).users,
    enabled: isAdmin,
  });

  useEffect(() => {
    if (settings) {
      setCompany(settings.company || '');
      setFirstName(settings.first_name || '');
      setLastName(settings.last_name || '');
      setEmail(settings.email || '');
      setAddress1(settings.address1 || '');
      setAddress2(settings.address2 || '');
      setCity(settings.city || '');
      setState(settings.state || '');
      setZip(settings.zip || '');
      setPhone(settings.phone || '');
      setVenmo(settings.venmo || '');
      setCashapp(settings.cashapp || '');
      setPaypal(settings.paypal || '');
      setZelle(settings.zelle || '');
      setDefaultDueDays(String(settings.default_due_days ?? 30));
      setSmtpHost(settings.smtp_host || '');
      setSmtpPort(String(settings.smtp_port || 587));
      setSmtpUser(settings.smtp_user || '');
      setSmtpPass(settings.smtp_pass || '');
      setSmtpSecure(settings.smtp_secure ?? true);
      setSmtpFromEmail(settings.smtp_from_email || '');
      setSmtpFromName(settings.smtp_from_name || '');
      setEmailTemplate(settings.default_email_template || '');
      setShowEarningsOnTimer(settings.show_earnings_on_timer ?? false);
      setResumeWindowMinutes(String(settings.resume_window_minutes ?? 60));
      setConsolidateHours(settings.consolidate_hours ?? false);
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      gql(UPDATE_SETTINGS_MUTATION, {
        input: {
          company: company || null,
          first_name: firstName || null,
          last_name: lastName || null,
          email: email || null,
          address1: address1 || null,
          address2: address2 || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
          phone: phone || null,
          venmo: venmo || null,
          cashapp: cashapp || null,
          paypal: paypal || null,
          zelle: zelle || null,
          default_due_days: defaultDueDays ? Number(defaultDueDays) : null,
          smtp_host: smtpHost || null,
          smtp_port: smtpPort ? Number(smtpPort) : null,
          smtp_user: smtpUser || null,
          smtp_pass: smtpPass || null,
          smtp_secure: smtpSecure,
          smtp_from_email: smtpFromEmail || null,
          smtp_from_name: smtpFromName || null,
          default_email_template: emailTemplate || null,
          show_earnings_on_timer: showEarningsOnTimer,
          resume_window_minutes: resumeWindowMinutes
            ? Math.max(1, Math.floor(Number(resumeWindowMinutes)))
            : 60,
          consolidate_hours: consolidateHours,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Settings saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testSmtp = useMutation({
    mutationFn: async () => {
      await save.mutateAsync();
      return gql(
        `mutation($host: String!, $port: Int!, $user: String!, $pass: String!, $secure: Boolean!) { testSmtp(host: $host, port: $port, user: $user, pass: $pass, secure: $secure) }`,
        {
          host: smtpHost,
          port: Number(smtpPort) || 587,
          user: smtpUser,
          pass: smtpPass,
          secure: smtpSecure,
        },
      );
    },
    onSuccess: () => toast.success('SMTP connection successful!'),
    onError: (e: Error) => toast.error(`SMTP test failed: ${e.message}`),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      gql(
        'mutation($currentPassword: String!, $newPassword: String!) { changePassword(currentPassword: $currentPassword, newPassword: $newPassword) }',
        { currentPassword, newPassword },
      ),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast.success('Password changed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    changePassword.mutate();
  };

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      gql(
        'mutation($id: Int!, $role: String!) { updateUserRole(id: $id, role: $role) { id role } }',
        { id, role },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <TFTabs defaultValue="profile">
        <TFTabsList>
          <TFTabsTrigger value="profile">Profile</TFTabsTrigger>
          <TFTabsTrigger value="payment">Payment</TFTabsTrigger>
          <TFTabsTrigger value="preferences">Preferences</TFTabsTrigger>
          <TFTabsTrigger value="email">Email</TFTabsTrigger>
          <TFTabsTrigger value="backups">Backups</TFTabsTrigger>
          <TFTabsTrigger value="password">Password</TFTabsTrigger>
          {isAdmin && <TFTabsTrigger value="users">Users</TFTabsTrigger>}
        </TFTabsList>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-6"
      >
        <TFTabsContent value="profile">
        <TFCard>
          <TFCardTitle className="mb-4">Personal Details</TFCardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TFField label="Company" className="md:col-span-2">
              <TFInput value={company} onChange={(e) => setCompany(e.target.value)} />
            </TFField>
            <TFField label="First Name">
              <TFInput value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </TFField>
            <TFField label="Last Name">
              <TFInput value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </TFField>
            <TFField label="Email">
              <TFInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </TFField>
            <TFField label="Phone">
              <TFInput value={phone} onChange={(e) => setPhone(e.target.value)} />
            </TFField>
            <TFField label="Address Line 1">
              <TFInput value={address1} onChange={(e) => setAddress1(e.target.value)} />
            </TFField>
            <TFField label="Address Line 2">
              <TFInput value={address2} onChange={(e) => setAddress2(e.target.value)} />
            </TFField>
            <TFField label="City">
              <TFInput value={city} onChange={(e) => setCity(e.target.value)} />
            </TFField>
            <TFField label="State">
              <TFInput value={state} onChange={(e) => setState(e.target.value)} />
            </TFField>
            <TFField label="Zip">
              <TFInput value={zip} onChange={(e) => setZip(e.target.value)} />
            </TFField>
          </div>
        </TFCard>
        </TFTabsContent>

        <TFTabsContent value="payment">
        <TFCard>
          <TFCardTitle className="mb-4">Online Payment Methods</TFCardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TFField label="Venmo">
              <TFInput
                placeholder="@username"
                value={venmo}
                onChange={(e) => setVenmo(e.target.value)}
              />
            </TFField>
            <TFField label="Cash App">
              <TFInput
                placeholder="$cashtag"
                value={cashapp}
                onChange={(e) => setCashapp(e.target.value)}
              />
            </TFField>
            <TFField label="PayPal">
              <TFInput
                placeholder="email or username"
                value={paypal}
                onChange={(e) => setPaypal(e.target.value)}
              />
            </TFField>
            <TFField label="Zelle">
              <TFInput
                placeholder="email or phone"
                value={zelle}
                onChange={(e) => setZelle(e.target.value)}
              />
            </TFField>
          </div>
        </TFCard>
        </TFTabsContent>

        <TFTabsContent value="preferences" className="space-y-6">
        <TFCard>
          <TFCardTitle className="mb-4">Display</TFCardTitle>
          <TFCheckbox
            id="show-earnings"
            label="Show dollar amount on running timers"
            description="Display live earnings next to the elapsed time counter based on the project rate."
            checked={showEarningsOnTimer}
            onChange={(e) => setShowEarningsOnTimer(e.target.checked)}
          />
        </TFCard>

        <TFCard>
          <TFCardTitle className="mb-4">Timer</TFCardTitle>
          <TFField
            label="Resume Window (minutes)"
            hint="How long after a time entry ends you can still resume it. Default: 60 minutes."
            className="md:max-w-xs"
          >
            <TFInput
              type="number"
              min="1"
              step="1"
              value={resumeWindowMinutes}
              onChange={(e) => setResumeWindowMinutes(e.target.value)}
            />
          </TFField>
        </TFCard>

        <TFCard>
          <TFCardTitle className="mb-4">Invoice Defaults</TFCardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TFField label="Default Due In (days)" hint='Set to 0 for "Upon Receipt"'>
              <TFInput
                type="number"
                min="0"
                value={defaultDueDays}
                onChange={(e) => setDefaultDueDays(e.target.value)}
              />
            </TFField>
          </div>
          <div className="mt-4">
            <TFCheckbox
              id="consolidate-hours"
              label="Consolidate hours"
              description="When creating an invoice, merge time entries on the same day (same project and rate) into a single line item."
              checked={consolidateHours}
              onChange={(e) => setConsolidateHours(e.target.checked)}
            />
          </div>
          <div className="mt-4">
            <TFField
              label="Default Email Template"
              hint={
                <>
                  Available variables: {'{{client_name}}'}, {'{{client_first_name}}'},{' '}
                  {'{{client_last_name}}'}, {'{{invoice_number}}'}, {'{{total}}'}, {'{{due_date}}'},{' '}
                  {'{{your_name}}'}
                </>
              }
            >
              <TFTextarea
                className="h-40 font-mono"
                value={emailTemplate}
                onChange={(e) => setEmailTemplate(e.target.value)}
                placeholder={`Hi {{client_name}},\n\nPlease find attached invoice #{{invoice_number}} for \${{total}}.\n\nPayment is due {{due_date}}.\n\nThank you for your business!\n\n{{your_name}}`}
              />
            </TFField>
          </div>
        </TFCard>
        </TFTabsContent>

        <TFTabsContent value="email">
        <TFCard>
          <div className="flex items-center justify-between mb-4">
            <TFCardTitle>Email (SMTP)</TFCardTitle>
            <TFButton
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                setSmtpHost('smtp.gmail.com');
                setSmtpPort('587');
                setSmtpSecure(false);
              }}
            >
              Use Gmail
            </TFButton>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Configure SMTP to send invoices by email. For Gmail, use an App Password (Google
            Account &rarr; Security &rarr; App Passwords).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TFField label="SMTP Host">
              <TFInput
                placeholder="smtp.gmail.com"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
              />
            </TFField>
            <TFField label="SMTP Port">
              <TFInput
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
            </TFField>
            <TFField label="Username / Email">
              <TFInput
                placeholder="you@gmail.com"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
              />
            </TFField>
            <TFField label="Password / App Password">
              <TFInput
                type="password"
                placeholder="App Password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
              />
            </TFField>
            <TFField label="From Name">
              <TFInput
                placeholder="Your Name"
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
              />
            </TFField>
            <TFField label="From Email">
              <TFInput
                placeholder="you@gmail.com"
                value={smtpFromEmail}
                onChange={(e) => setSmtpFromEmail(e.target.value)}
              />
            </TFField>
            <TFCheckbox
              id="smtp-secure"
              label="Use SSL/TLS (port 465). Uncheck for STARTTLS (port 587)."
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
            />
          </div>
          <TFButton
            type="button"
            variant="secondary"
            onClick={() => testSmtp.mutate()}
            disabled={testSmtp.isPending}
            className="mt-4"
          >
            {testSmtp.isPending ? 'Testing...' : 'Test Connection'}
          </TFButton>
        </TFCard>
        </TFTabsContent>

        <TFButton type="submit" size="lg">
          Save Settings
        </TFButton>
      </form>

      <TFTabsContent value="backups">
        <BackupSettings />
      </TFTabsContent>

      <TFTabsContent value="password">
      <form onSubmit={handleChangePassword}>
        <TFCard>
          <TFCardTitle className="mb-4">Change Password</TFCardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TFField label="Current Password" required>
              <TFInput
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </TFField>
            <TFField label="New Password" required hint="Minimum 8 characters">
              <TFInput
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </TFField>
            <TFField label="Confirm New Password" required>
              <TFInput
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </TFField>
          </div>
          <TFButton type="submit" size="lg" className="mt-4">
            Change Password
          </TFButton>
        </TFCard>
      </form>
      </TFTabsContent>

      {isAdmin && (
      <TFTabsContent value="users">
        <TFCard padding="none">
          <div className="px-4 pt-4">
            <TFCardTitle className="mb-4">User Permissions</TFCardTitle>
          </div>
          <TFTable>
            <TFTHead>
              <TFTr>
                <TFTh>Email</TFTh>
                <TFTh>Name</TFTh>
                <TFTh>Role</TFTh>
                <TFTh>Joined</TFTh>
                <TFTh>Actions</TFTh>
              </TFTr>
            </TFTHead>
            <TFTBody>
              {users.map((u) => (
                <TFTr key={u.id}>
                  <TFTd>{u.email}</TFTd>
                  <TFTd>{u.name || '-'}</TFTd>
                  <TFTd>
                    <TFBadge tone={statusTone(u.role)}>{u.role}</TFBadge>
                  </TFTd>
                  <TFTd>{new Date(u.created_at).toLocaleDateString()}</TFTd>
                  <TFTd>
                    <TFSelect
                      size="sm"
                      className="max-w-[120px]"
                      value={u.role}
                      onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value })}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </TFSelect>
                  </TFTd>
                </TFTr>
              ))}
              {users.length === 0 && (
                <TFTr>
                  <TFTd colSpan={5}>
                    <TFEmpty>No users</TFEmpty>
                  </TFTd>
                </TFTr>
              )}
            </TFTBody>
          </TFTable>
        </TFCard>
      </TFTabsContent>
      )}
      </TFTabs>
    </div>
  );
}
