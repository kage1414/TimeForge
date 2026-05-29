import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { gql } from "../../../api/client";
import { UserSettings } from "../../../types";
import { TFButton } from "../../../components/tf";
import ProfileView from "./Profile";

const PROFILE_FIELDS =
  "id company first_name last_name email address1 address2 city state zip phone";

const PROFILE_QUERY = `query { userSettings { ${PROFILE_FIELDS} } }`;

const UPDATE_PROFILE_MUTATION = `
  mutation($input: UpdateUserSettingsInput!) {
    updateUserSettings(input: $input) { ${PROFILE_FIELDS} }
  }
`;

const ProfileContainer: React.FC = () => {
  const qc = useQueryClient();
  const [company, setCompany] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["userSettings"],
    queryFn: async () =>
      (await gql<{ userSettings: UserSettings }>(PROFILE_QUERY)).userSettings,
  });

  useEffect(() => {
    if (!settings) return;
    setCompany(settings.company || "");
    setFirstName(settings.first_name || "");
    setLastName(settings.last_name || "");
    setEmail(settings.email || "");
    setPhone(settings.phone || "");
    setAddress1(settings.address1 || "");
    setAddress2(settings.address2 || "");
    setCity(settings.city || "");
    setState(settings.state || "");
    setZip(settings.zip || "");
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      gql(UPDATE_PROFILE_MUTATION, {
        input: {
          company: company || null,
          first_name: firstName || null,
          last_name: lastName || null,
          email: email || null,
          phone: phone || null,
          address1: address1 || null,
          address2: address2 || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userSettings"] });
      toast.success("Profile saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-6"
    >
      <ProfileView
        company={company}
        setCompany={setCompany}
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        email={email}
        setEmail={setEmail}
        phone={phone}
        setPhone={setPhone}
        address1={address1}
        setAddress1={setAddress1}
        address2={address2}
        setAddress2={setAddress2}
        city={city}
        setCity={setCity}
        state={state}
        setState={setState}
        zip={zip}
        setZip={setZip}
      />
      <TFButton type="submit" size="lg" disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save Settings"}
      </TFButton>
    </form>
  );
};

export default ProfileContainer;
