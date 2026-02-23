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

type SendAgencyVisitValidatedEmailInput = {
  to: string;
  agencyName: string;
  propertyRef: string;
  propertyTitle?: string | null;
  propertyLocation?: string | null;
  propertyPrice?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  clientMessage?: string | null;
  validatedStatus: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function formatField(value: string | null | undefined, fallback = "-") {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
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

export async function sendAgencyVisitValidatedEmail(
  input: SendAgencyVisitValidatedEmailInput
): Promise<SendAgencyEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL;

  if (!apiKey || !from) {
    return { sent: false, reason: "missing_email_config" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const propertyUrl = `${siteUrl}/biens/${encodeURIComponent(input.propertyRef)}`;

  const propertyTitle = formatField(input.propertyTitle);
  const propertyLocation = formatField(input.propertyLocation);
  const propertyPrice = formatField(input.propertyPrice);
  const clientName = formatField(input.clientName);
  const clientPhone = formatField(input.clientPhone);
  const preferredDate = formatField(input.preferredDate);
  const preferredTime = formatField(input.preferredTime);
  const clientMessage = formatField(input.clientMessage);
  const statusLabel = formatField(input.validatedStatus);

  const subject = `Nouvelle visite validee - ${input.propertyRef}`;
  const html = [
    `<p>Bonjour ${escapeHtml(formatField(input.agencyName, "Agence"))},</p>`,
    "<p>Une nouvelle demande de visite a ete validee par l'administration.</p>",
    "<h3>Bien concerne</h3>",
    `<ul><li><strong>Ref:</strong> ${escapeHtml(input.propertyRef)}</li><li><strong>Titre:</strong> ${escapeHtml(propertyTitle)}</li><li><strong>Localisation:</strong> ${escapeHtml(propertyLocation)}</li><li><strong>Prix:</strong> ${escapeHtml(propertyPrice)}</li></ul>`,
    "<h3>Informations visite</h3>",
    `<ul><li><strong>Statut:</strong> ${escapeHtml(statusLabel)}</li><li><strong>Client:</strong> ${escapeHtml(clientName)}</li><li><strong>Telephone:</strong> ${escapeHtml(clientPhone)}</li><li><strong>Date souhaitee:</strong> ${escapeHtml(preferredDate)}</li><li><strong>Heure souhaitee:</strong> ${escapeHtml(preferredTime)}</li><li><strong>Message:</strong> ${escapeHtml(clientMessage)}</li></ul>`,
    `<p>Voir le bien: <a href="${escapeHtml(propertyUrl)}">${escapeHtml(propertyUrl)}</a></p>`,
  ].join("");

  const text = [
    `Bonjour ${formatField(input.agencyName, "Agence")},`,
    "",
    "Une nouvelle demande de visite a ete validee par l'administration.",
    "",
    "Bien concerne:",
    `- Ref: ${input.propertyRef}`,
    `- Titre: ${propertyTitle}`,
    `- Localisation: ${propertyLocation}`,
    `- Prix: ${propertyPrice}`,
    "",
    "Informations visite:",
    `- Statut: ${statusLabel}`,
    `- Client: ${clientName}`,
    `- Telephone: ${clientPhone}`,
    `- Date souhaitee: ${preferredDate}`,
    `- Heure souhaitee: ${preferredTime}`,
    `- Message: ${clientMessage}`,
    "",
    `Voir le bien: ${propertyUrl}`,
  ].join("\n");

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
        subject,
        html,
        text,
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
