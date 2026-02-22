type AgencyEmailType =
  | "agency_created_by_admin"
  | "agency_status_active"
  | "agency_status_pending"
  | "agency_status_suspended";

type SendAgencyEmailInput = {
  to: string;
  agencyName: string;
  type: AgencyEmailType;
};

type SendAgencyEmailResult = {
  sent: boolean;
  reason?: string;
};

function buildMessage(input: SendAgencyEmailInput) {
  const portalUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/agency/login`
    : "http://localhost:3000/agency/login";

  if (input.type === "agency_created_by_admin") {
    return {
      subject: "Compte agence cree - Rostomyia",
      html: `<p>Bonjour,</p><p>Votre compte agence <strong>${input.agencyName}</strong> a ete cree par l'administration.</p><p>Vous pouvez vous connecter ici: <a href="${portalUrl}">${portalUrl}</a></p>`,
      text: `Bonjour, votre compte agence ${input.agencyName} a ete cree. Connexion: ${portalUrl}`,
    };
  }

  if (input.type === "agency_status_active") {
    return {
      subject: "Compte agence active - Rostomyia",
      html: `<p>Bonjour,</p><p>Votre compte agence <strong>${input.agencyName}</strong> est maintenant <strong>active</strong>.</p><p>Connexion: <a href="${portalUrl}">${portalUrl}</a></p>`,
      text: `Votre compte agence ${input.agencyName} est active. Connexion: ${portalUrl}`,
    };
  }

  if (input.type === "agency_status_suspended") {
    return {
      subject: "Compte agence suspendu - Rostomyia",
      html: `<p>Bonjour,</p><p>Votre compte agence <strong>${input.agencyName}</strong> est actuellement <strong>suspendu</strong>.</p><p>Contactez le support pour plus d'informations.</p>`,
      text: `Votre compte agence ${input.agencyName} est suspendu. Contactez le support.`,
    };
  }

  return {
    subject: "Mise a jour du compte agence - Rostomyia",
    html: `<p>Bonjour,</p><p>Le statut de votre compte agence <strong>${input.agencyName}</strong> a ete mis a jour: <strong>pending</strong>.</p>`,
    text: `Le statut de votre compte agence ${input.agencyName} a ete mis a jour: pending.`,
  };
}

export async function sendAgencyLifecycleEmail(
  input: SendAgencyEmailInput
): Promise<SendAgencyEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL;

  if (!apiKey || !from) {
    return { sent: false, reason: "missing_email_config" };
  }

  const msg = buildMessage(input);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });

    if (!response.ok) {
      const reason = await response.text();
      return { sent: false, reason: reason || `http_${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "email_send_failed";
    return { sent: false, reason };
  }
}

