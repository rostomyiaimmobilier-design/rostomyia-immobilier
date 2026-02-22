export type UiLang = "fr" | "ar";
export type UiErrorContext = "auth" | "otp" | "submit" | "generic";

type ErrorCopy = {
  generic: string;
  auth: string;
  otp: string;
  submit: string;
  duplicateAccount: string;
  invalidCredentials: string;
  emailNotConfirmed: string;
  rateLimited: string;
  invalidOtp: string;
  network: string;
  forbidden: string;
};

const COPY: Record<UiLang, ErrorCopy> = {
  fr: {
    generic: "Une erreur est survenue. Merci de reessayer.",
    auth: "Connexion impossible. Verifiez vos informations puis reessayez.",
    otp: "Code invalide ou expire. Merci de reessayer.",
    submit: "Envoi impossible pour le moment. Merci de reessayer.",
    duplicateAccount: "Ce compte existe deja. Connectez-vous ou reinitialisez votre mot de passe.",
    invalidCredentials: "Identifiants invalides. Verifiez vos informations.",
    emailNotConfirmed: "Email non confirme. Verifiez votre boite mail puis reessayez.",
    rateLimited: "Trop de tentatives. Merci de patienter quelques minutes.",
    invalidOtp: "Code incorrect ou expire. Reessayez.",
    network: "Probleme de connexion. Verifiez internet puis reessayez.",
    forbidden: "Action non autorisee.",
  },
  ar: {
    generic: "حدث خطأ. يرجى إعادة المحاولة.",
    auth: "تعذر تسجيل الدخول. تحقق من المعلومات ثم حاول مجددا.",
    otp: "الرمز غير صالح أو منتهي. يرجى إعادة المحاولة.",
    submit: "تعذر الإرسال حاليا. يرجى إعادة المحاولة.",
    duplicateAccount: "هذا الحساب موجود بالفعل. قم بتسجيل الدخول أو استعادة كلمة المرور.",
    invalidCredentials: "بيانات الدخول غير صحيحة.",
    emailNotConfirmed: "البريد غير مؤكد. تحقق من بريدك ثم حاول مجددا.",
    rateLimited: "محاولات كثيرة. يرجى الانتظار قليلا ثم المحاولة.",
    invalidOtp: "الرمز غير صحيح أو منتهي.",
    network: "مشكلة في الاتصال. تحقق من الانترنت ثم حاول مجددا.",
    forbidden: "هذه العملية غير مسموح بها.",
  },
};

function normalizeMessage(raw: string | null | undefined) {
  return String(raw || "").toLowerCase().trim();
}

export function toUiErrorMessage(
  raw: string | null | undefined,
  {
    lang = "fr",
    context = "generic",
  }: { lang?: UiLang; context?: UiErrorContext } = {}
) {
  const m = normalizeMessage(raw);
  const t = COPY[lang];

  if (!m) {
    if (context === "auth") return t.auth;
    if (context === "otp") return t.otp;
    if (context === "submit") return t.submit;
    return t.generic;
  }

  if (
    m.includes("users_email_partial_key") ||
    m.includes("duplicate key value violates unique constraint") ||
    m.includes("already registered") ||
    m.includes("user already exists")
  ) {
    return t.duplicateAccount;
  }

  if (
    m.includes("invalid login credentials") ||
    m.includes("invalid credentials") ||
    m.includes("email or password")
  ) {
    return t.invalidCredentials;
  }

  if (m.includes("email not confirmed")) {
    return t.emailNotConfirmed;
  }

  if (
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("over_email_send_rate_limit")
  ) {
    return t.rateLimited;
  }

  if (
    m.includes("otp") ||
    m.includes("token has expired") ||
    m.includes("token is expired") ||
    m.includes("invalid token") ||
    m.includes("code verifier") ||
    m.includes("expired")
  ) {
    return t.invalidOtp;
  }

  if (
    m.includes("network request failed") ||
    m.includes("failed to fetch") ||
    m.includes("fetcherror")
  ) {
    return t.network;
  }

  if (
    m.includes("forbidden") ||
    m.includes("unauthorized") ||
    m.includes("permission denied") ||
    m.includes("row-level security") ||
    m.includes("violates row-level security policy")
  ) {
    return t.forbidden;
  }

  if (
    context === "auth" &&
    (m.includes("database error saving new user") || m.includes("database error"))
  ) {
    return t.auth;
  }

  if (context === "auth") return t.auth;
  if (context === "otp") return t.otp;
  if (context === "submit") return t.submit;
  return t.generic;
}
