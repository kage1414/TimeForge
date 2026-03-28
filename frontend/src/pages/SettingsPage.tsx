import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gql } from '../api/client';
import { UserSettings } from '../types';

const SETTINGS_FIELDS = 'id company first_name last_name email address1 address2 city state zip phone venmo cashapp paypal zelle';

const SETTINGS_QUERY = `query { userSettings { ${SETTINGS_FIELDS} } }`;

const UPDATE_SETTINGS_MUTATION = `
  mutation($input: UpdateUserSettingsInput!) {
    updateUserSettings(input: $input) { ${SETTINGS_FIELDS} }
  }
`;

export default function SettingsPage() {
  const qc = useQueryClient();
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

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ['userSettings'],
    queryFn: async () => (await gql<{ userSettings: UserSettings }>(SETTINGS_QUERY)).userSettings,
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
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Settings saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4">Personal Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input className="border rounded p-2 w-full" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input className="border rounded p-2 w-full" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input className="border rounded p-2 w-full" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input className="border rounded p-2 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="border rounded p-2 w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              <input className="border rounded p-2 w-full" value={address1} onChange={(e) => setAddress1(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
              <input className="border rounded p-2 w-full" value={address2} onChange={(e) => setAddress2(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input className="border rounded p-2 w-full" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input className="border rounded p-2 w-full" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
              <input className="border rounded p-2 w-full" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4">Online Payment Methods</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venmo</label>
              <input className="border rounded p-2 w-full" placeholder="@username" value={venmo} onChange={(e) => setVenmo(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cash App</label>
              <input className="border rounded p-2 w-full" placeholder="$cashtag" value={cashapp} onChange={(e) => setCashapp(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PayPal</label>
              <input className="border rounded p-2 w-full" placeholder="email or username" value={paypal} onChange={(e) => setPaypal(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zelle</label>
              <input className="border rounded p-2 w-full" placeholder="email or phone" value={zelle} onChange={(e) => setZelle(e.target.value)} />
            </div>
          </div>
        </div>

        <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700">
          Save Settings
        </button>
      </form>
    </div>
  );
}
