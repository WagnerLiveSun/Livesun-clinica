export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  brevoApiKey: process.env.BREVO_API_KEY ?? "",
  brevoFromEmail: process.env.BREVO_FROM_EMAIL ?? "",
  brevoSmsSender: process.env.BREVO_SMS_SENDER ?? "",
  brevoWhatsappSender: process.env.BREVO_WHATSAPP_SENDER ?? "",
  brevoWhatsappTemplateId: process.env.BREVO_WHATSAPP_TEMPLATE_ID ?? "",
  appMasterKey: process.env.APP_MASTER_KEY ?? "",
  schedulerSecret: process.env.SCHEDULER_SECRET ?? "",
  reminderIntervalMs: Number(process.env.REMINDER_INTERVAL_MS ?? 300000),
};
