import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { gql } from "../../../api/client";
import { UserSettings } from "../../../types";
import { TFButton } from "../../../components/tf";
import PaymentView from "./Payment";

const PAYMENT_FIELDS = "id venmo cashapp paypal zelle";

const PAYMENT_QUERY = `query { userSettings { ${PAYMENT_FIELDS} } }`;

const UPDATE_PAYMENT_MUTATION = `
  mutation($input: UpdateUserSettingsInput!) {
    updateUserSettings(input: $input) { ${PAYMENT_FIELDS} }
  }
`;

const PaymentContainer: React.FC = () => {
  const qc = useQueryClient();
  const [venmo, setVenmo] = useState("");
  const [cashapp, setCashapp] = useState("");
  const [paypal, setPaypal] = useState("");
  const [zelle, setZelle] = useState("");

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["userSettings"],
    queryFn: async () =>
      (await gql<{ userSettings: UserSettings }>(PAYMENT_QUERY)).userSettings,
  });

  useEffect(() => {
    if (!settings) return;
    setVenmo(settings.venmo || "");
    setCashapp(settings.cashapp || "");
    setPaypal(settings.paypal || "");
    setZelle(settings.zelle || "");
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      gql(UPDATE_PAYMENT_MUTATION, {
        input: {
          venmo: venmo || null,
          cashapp: cashapp || null,
          paypal: paypal || null,
          zelle: zelle || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userSettings"] });
      toast.success("Payment methods saved");
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
      <PaymentView
        venmo={venmo}
        setVenmo={setVenmo}
        cashapp={cashapp}
        setCashapp={setCashapp}
        paypal={paypal}
        setPaypal={setPaypal}
        zelle={zelle}
        setZelle={setZelle}
      />
      <TFButton type="submit" size="lg" disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save Settings"}
      </TFButton>
    </form>
  );
};

export default PaymentContainer;
